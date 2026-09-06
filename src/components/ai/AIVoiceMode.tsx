import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { parseVoiceCommand, generatePlan, chatWithAI, isGeminiConfigured } from '../../lib/gemini';
import { webSearch } from '../../lib/exa';
import { performCalculation } from '../../lib/calculations';
import { applyGeneratedPlan } from '../../lib/builder';
import { speakText, stopSpeaking } from '../../lib/speech';
import { BlueprintPreview } from './BlueprintPreview';
import { CalculationPanel } from './CalculationPanel';
import { SearchResultsPanel } from './SearchResultsPanel';

const ORB_SIZE = 200;

/** Live mic volume 0..1 via Web Audio; simulated fallback when unavailable. */
function useMicVolume(active: boolean): number {
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!active) {
      setVolume(0);
      return;
    }
    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;
    let simulated = 0;

    const tick = (getLevel: () => number) => {
      if (cancelled) return;
      const level = getLevel();
      // smooth
      setVolume((prev) => prev * 0.6 + level * 1.8);
      raf = requestAnimationFrame(() => tick(getLevel));
    };

    // Simulation fallback (works without mic permission)
    let analyser: AnalyserNode | null = null;
    let data: Uint8Array<ArrayBuffer> | null = null;
    const simGet = () => {
      simulated += 0.12;
      return 0.22 + Math.abs(Math.sin(simulated)) * 0.4 + Math.random() * 0.12;
    };

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          if (cancelled) return;
          stream = s;
          audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(s);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          data = new Uint8Array(analyser.frequencyBinCount);
          const getLevel = () => {
            if (!analyser || !data) return 0;
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            return sum / data.length / 255;
          };
          tick(getLevel);
        })
        .catch(() => {
          if (cancelled) return;
          tick(simGet);
        });
    } else {
      tick(simGet);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.setTimeout(() => {
        audioCtx?.close().catch(() => undefined);
        stream?.getTracks().forEach((t) => t.stop());
      }, 100);
    };
  }, [active]);

  return Math.min(1, Math.max(0, volume));
}

/** Animated particle field for the background. */
function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        duration: 4 + Math.random() * 8,
        delay: Math.random() * 6,
        drift: Math.random() * 40 - 20,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
          animate={{ y: [0, p.drift, 0], opacity: [0.1, 0.6, 0.1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

interface AIVoiceModeProps {
  onExit: () => void;
}

type ContentKind = 'plan' | 'calc' | 'search' | null;

export function AIVoiceMode({ onExit }: AIVoiceModeProps) {
  const {
    isListening, setIsListening,
    orbState, setOrbState,
    setViewMode,
    addChatMessage, chatHistory,
    calculations, addCalculation,
    searchOutput, setSearchOutput,
    setLastGeneratedPlan,
  } = useAppStore();
  const { openSettings } = useSettingsStore();
  const searchStatus = useSettingsStore((s) =>
    s.searchProvider === 'exa'
      ? !!s.exaKey
      : s.searchProvider === 'tavily'
        ? !!s.tavilyKey
        : !!s.braveKey
  );

  const [cornered, setCornered] = useState(false);
  const [content, setContent] = useState<ContentKind>(null);
  const [transcript, setTranscript] = useState('');
  const [input, setInput] = useState('');
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const processingRef = useRef(false);
  const volume = useMicVolume(isListening && orbState === 'listening');

  const speak = useCallback((text: string) => {
    setOrbState('speaking');
    speakText(text, {
      onStart: () => setOrbState('speaking'),
      onEnd: () => setOrbState('idle'),
      onError: () => setOrbState('idle'),
    });
  }, [setOrbState]);

  // Keep handleCommand's closure fresh without restarting recognition
  const speakRef = useRef(speak);
  speakRef.current = speak;

  // Track viewport size for orb corner positioning
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---------------------------------------------------------- processing
  const handleCommand = useCallback(async (text: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setIsListening(false);
    stopSpeaking();
    setTranscript('');
    addChatMessage({ role: 'user', content: text });

    try {
      setOrbState('thinking');
      const command = await parseVoiceCommand(text);

      switch (command.intent) {
        case 'build': {
          const generated = await generatePlan(text);
          setLastGeneratedPlan(generated);
          const summary = applyGeneratedPlan(generated);
          setContent('plan');
          setCornered(true);
          addChatMessage({
            role: 'assistant',
            content: `Designed a ${generated.style.toLowerCase()} plan — ${summary.rooms} rooms, ${summary.totalArea} m², ${summary.walls} walls built. ${summary.doors} doors and ${summary.windows} windows placed automatically.`,
          });
          speakRef.current(`Designed a ${generated.style.toLowerCase()} plan. ${summary.rooms} rooms, ${summary.totalArea} square meters. Walls, doors and windows are placed — take a look.`);
          break;
        }
        case 'calculate': {
          const calc = performCalculation(text);
          if (calc) {
            addCalculation(calc);
            setContent('calc');
            setCornered(true);
            addChatMessage({ role: 'assistant', content: `Ran the numbers: ${calc.summary}` });
            speakRef.current(`Ran the numbers. ${calc.summary}`);            } else {
              const reply = await chatWithAI(text);
              addChatMessage({ role: 'assistant', content: reply });
              speakRef.current(reply);
            }
          break;
        }
        case 'search': {
          setOrbState('thinking');
          try {
            const output = await webSearch(command.params.query as string || text);
            setSearchOutput(output);
            setContent('search');
            setCornered(true);
            const topSnippets = output.results.slice(0, 3).map((r) => `${r.title}: ${r.snippet}`).join('\n');
            if (isGeminiConfigured()) {
              const reply = await chatWithAI(text, topSnippets);
              addChatMessage({ role: 'assistant', content: reply });
              speak(reply);
            } else {
              const reply = `Found ${output.results.length} results about "${output.query}". Tap one to open it — or add a Gemini key so I can summarize them for you.`;
              addChatMessage({ role: 'assistant', content: reply });
              speakRef.current(`Found ${output.results.length} results. Tap one to open it, or add a Gemini key so I can summarize them.`);
            }
          } catch (err) {
            const code = err instanceof Error ? err.message : '';
            const missingKey = code === 'SEARCH_KEY_MISSING';
            const invalidKey = code === 'SEARCH_KEY_INVALID';
            const reply = missingKey
              ? 'I need a search key to browse the web. Open Settings (⚙), pick Exa, Tavily or Brave and paste the key in.'
              : invalidKey
                ? 'That search key was rejected. Double-check it in Settings (⚙).'
                : 'Web search is having trouble right now. Try again in a moment.';
            addChatMessage({ role: 'assistant', content: reply });
            speakRef.current(reply);
          }
          break;
        }
        case 'test': {
          setOrbState('idle');
          addChatMessage({ role: 'assistant', content: 'Heading to the stress test lab.' });
          speakRef.current('Heading to the stress test lab.');
          window.setTimeout(() => {
            setViewMode('test');
            onExit();
          }, 900);
          break;
        }
        case 'navigate': {
          const next = command.action === 'show_3d' ? '3d' : '2d';
          setOrbState('idle');
          addChatMessage({ role: 'assistant', content: `Opening the ${next === '3d' ? '3D model' : 'floor plan'} view.` });
          speakRef.current(`Opening the ${next === '3d' ? '3D model' : 'floor plan'} view.`);
          window.setTimeout(() => {
            setViewMode(next);
            onExit();
          }, 900);
          break;
        }
        case 'create': {
          const targets: Record<string, '2d'> = { add_wall: '2d', add_room: '2d', add_door: '2d', add_window: '2d' };
          const replyMap: Record<string, string> = {
            add_wall: 'Switch to 2D and draw your wall — click and drag on the canvas.',
            add_room: 'Use the room tool in 2D — click corners, then double-click to complete.',
            add_door: 'Select the door tool in 2D and click a wall to place it.',
            add_window: 'Select the window tool in 2D and click a wall to place it.',
          };
          const reply = replyMap[command.action] || 'Use the 2D tools to place that element.';
          addChatMessage({ role: 'assistant', content: reply });
          speakRef.current(reply);
          window.setTimeout(() => {
            setViewMode(targets[command.action] || '2d');
            onExit();
          }, 900);
          break;
        }
        default: {
          const reply = await chatWithAI(text);
          addChatMessage({ role: 'assistant', content: reply });
          speakRef.current(reply);
        }
      }
    } catch (error) {
      const reply = 'I hit a snag processing that. Try again, or type it instead.';
      addChatMessage({ role: 'assistant', content: reply });
      speakRef.current(reply);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      if (useAppStore.getState().orbState !== 'speaking') {
        setOrbState('idle');
      }
    }
  }, [addChatMessage, addCalculation, onExit, setIsListening, setLastGeneratedPlan, setOrbState, setSearchOutput, setViewMode]);

  // ------------------------------------------------------- speech recognition
  useEffect(() => {
    if (isListening && orbState === 'listening') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
          const result = event.results[event.resultIndex];
          setTranscript(result[0].transcript);
          if (result.isFinal) {
            handleCommand(result[0].transcript);
          }
        };
        recognition.onerror = (e) => {
          if (e.error !== 'aborted') setIsListening(false);
        };
        recognition.onend = () => {
          // restart if we're still supposed to be listening
          if (useAppStore.getState().isListening && useAppStore.getState().orbState === 'listening') {
            try { recognition.start(); } catch { /* already started */ }
          }
        };
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch { /* already started */ }
        return () => {
          recognition.stop();
          recognitionRef.current = null;
        };
      }
    }
    return undefined;
  }, [isListening, orbState, handleCommand, setIsListening]);

  // Esc exits AI mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsListening(false);
        stopSpeaking();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, setIsListening]);

  // Orb position: center, or top-right corner when showing content
  const orbX = cornered ? viewport.w - ORB_SIZE - 40 : viewport.w / 2 - ORB_SIZE / 2;
  const orbY = cornered ? 74 : viewport.h / 2 - ORB_SIZE / 2 - 40;
  const orbScale = cornered ? 0.42 : 1 + (isListening && orbState === 'listening' ? volume * 0.4 : orbState === 'speaking' ? 1 : 0);
  const orbGlow = isListening && orbState === 'listening' ? volume : 0;

  const closeContent = () => {
    setCornered(false);
    setContent(null);
  };

  const submitInput = () => {
    if (input.trim()) {
      handleCommand(input.trim());
      setInput('');
    }
  };

  const visibleHistory = chatHistory.slice(-6);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,212,255,0.07), transparent 70%), radial-gradient(ellipse 120% 90% at 50% 110%, rgba(0,60,90,0.25), transparent 60%), #070b12',
      }}
    >
      {/* animated grid overlay */}
      <div
        className="absolute inset-0 grid-pattern-large opacity-40"
        style={{ maskImage: 'radial-gradient(ellipse 90% 80% at 50% 45%, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 45%, black 30%, transparent 75%)' }}
      />
      <Particles />

      {/* Top controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
        <button
          onClick={openSettings}
          className="w-9 h-9 rounded-xl bg-blueprint-light/80 border border-glass-border flex items-center justify-center text-gray-400 hover:text-cyan hover:border-cyan/50 transition-all"
          title="Settings"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={() => { setIsListening(false); stopSpeaking(); handleCommand('show me the 3D model'); }}
          className="h-9 px-3 rounded-xl bg-blueprint-light/80 border border-glass-border text-xs text-gray-400 hover:text-cyan hover:border-cyan/50 transition-all"
        >
          🏗️ See model
        </button>
        <button
          onClick={() => { setIsListening(false); stopSpeaking(); onExit(); }}
          className="h-9 px-3 rounded-xl bg-blueprint-light/80 border border-glass-border text-xs text-gray-400 hover:text-white hover:border-white/30 transition-all"
        >
          Exit AI ✕
        </button>
      </div>

      {/* Status chip */}
      {!cornered && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
        >
          <span className="text-[10px] font-mono tracking-[0.3em] text-cyan/60 uppercase">Arch · AI Core</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-cyan animate-pulse' : 'bg-gray-600'}`} />
        </motion.div>
      )}

      {/* Collapsed chat history (bottom-left) */}
      <div className="absolute bottom-5 left-4 right-4 md:right-auto md:max-w-sm space-y-2 z-10 pointer-events-none">
        <AnimatePresence>
          {visibleHistory.slice(-4).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`glass rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed ${
                msg.role === 'user' ? 'text-gray-300' : 'text-cyan/90'
              }`}
            >
              <span className="font-mono text-[9px] opacity-60 uppercase mr-2">
                {msg.role === 'user' ? 'You' : 'Arch'}
              </span>
              {msg.content}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Hologram content area (when orb is cornered) */}
      <div className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 z-10 max-h-[78vh] overflow-y-auto pr-2"
           style={{ width: Math.max(240, Math.min(viewport.w - 280, 560)) }}>
        <AnimatePresence mode="wait">
          {cornered && content === 'plan' && (
            <BlueprintPreview
              key="plan"
              onOpen2D={() => { setViewMode('2d'); onExit(); }}
              onOpen3D={() => { setViewMode('3d'); onExit(); }}
            />
          )}
          {cornered && content === 'calc' && calculations[0] && (
            <CalculationPanel key="calc" calc={calculations[0]} onClose={closeContent} />
          )}
          {cornered && content === 'search' && searchOutput && (
            <SearchResultsPanel key="search" output={searchOutput} onClose={closeContent} />
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------ ORB */}
      <motion.div
        className="absolute z-20"
        initial={{ left: viewport.w / 2 - ORB_SIZE / 2, top: viewport.h / 2 - ORB_SIZE / 2 - 40 }}
        animate={{ left: orbX, top: orbY }}
        transition={{ type: 'spring', damping: 22, stiffness: 120, mass: 0.9 }}
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
      >
        {/* pulse rings */}
        {isListening && orbState === 'listening' && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-cyan/40"
                animate={{ scale: [1, 2.6 + volume * 1.4], opacity: [0.5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.45, ease: 'easeOut' }}
              />
            ))}
          </>
        )}

        {/* waveform ring */}
        {isListening && orbState === 'listening' && (
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 28 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[2px] rounded-full bg-cyan/70"
                style={{
                  height: 18,
                  transform: `rotate(${i * (360 / 28)}deg) translateY(-${ORB_SIZE / 2 + 16}px)`,
                  transformOrigin: 'center',
                }}
                animate={{ opacity: [0.2, 0.9, 0.2], scaleY: [0.5, 1 + volume, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.02 }}
              />
            ))}
          </div>
        )}

        {/* thinking arcs */}
        {orbState === 'thinking' && (
          <>
            <motion.div
              className="absolute -inset-3 rounded-full border border-dashed border-cyan/40"
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute -inset-6 rounded-full border border-dashed border-cyan/20"
              animate={{ rotate: -360 }}
              transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute -inset-8 rounded-full border border-cyan/10" />
          </>
        )}

        {/* orb body — black glass with cyan energy core */}
        <motion.div
          className="absolute inset-0 rounded-full cursor-pointer"
          onClick={() => {
            if (orbState === 'listening' || isListening) {
              setIsListening(false);
            } else if (!isProcessing) {
              setOrbState('listening');
              setIsListening(true);
            }
          }}
          animate={{ scale: orbScale }}
          transition={{ type: 'spring', damping: 16, stiffness: 200 }}
          whileHover={{ scale: orbScale * 1.05 }}
        >
          {/* black-glass shell */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 34% 30%, #23262e 0%, #101319 34%, #05070b 62%, #000 82%)',
              boxShadow:
                orbState === 'speaking'
                  ? `0 0 ${30 + volume * 70}px rgba(0,212,255,${0.2 + volume * 0.5}), inset 0 0 34px rgba(0,0,0,0.92), inset 0 1px 1px rgba(255,255,255,0.10)`
                  : `0 0 ${34 + orbGlow * 80}px rgba(0,212,255,${0.18 + orbGlow * 0.5}), 0 24px 60px rgba(0,0,0,0.75), inset 0 0 30px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.09)`,
              border: '1px solid rgba(255,255,255,0.07)',
              transition: 'box-shadow 0.25s ease',
            }}
          />
          {/* energy ring — reacts to mic while listening and voice while speaking */}
          <div className="absolute inset-[7%] rounded-full pointer-events-none">
            <motion.div
              className="w-full h-full rounded-full"
              style={{
                background: 'conic-gradient(from 140deg, transparent 0deg, rgba(0,212,255,0.9) 55deg, transparent 130deg, transparent 200deg, rgba(0,212,255,0.45) 250deg, transparent 310deg)',
                maskImage: 'radial-gradient(circle, transparent 62%, black 66%, black 78%, transparent 82%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 66%, black 78%, transparent 82%)',
                filter: 'blur(0.5px) drop-shadow(0 0 6px rgba(0,212,255,0.7))',
              }}
              animate={{
                rotate: orbState === 'speaking' ? [0, 360] : 0,
                scale: orbState === 'speaking' ? [1, 1.06, 1] : orbState === 'listening' ? [1, 1 + orbGlow * 0.25, 1] : 1,
                opacity: orbState === 'idle' && !isProcessing ? 0.45 : 0.95,
              }}
              transition={
                orbState === 'speaking'
                  ? { duration: 1.6, repeat: Infinity, ease: 'linear' }
                  : orbState === 'listening'
                    ? { duration: 0.35, repeat: Infinity }
                    : { duration: 0.4 }
              }
            />
          </div>
          {/* specular highlight (kept subtle on black) */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: '30%',
              height: '18%',
              left: '20%',
              top: '14%',
              background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.20), transparent 70%)',
              filter: 'blur(2px)',
            }}
          />
          {/* inner core — molten cyan on black, breathes while speaking, spikes with mic */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: '44%',
              height: '44%',
              left: '28%',
              top: '28%',
              background: 'radial-gradient(circle at 45% 40%, rgba(235,252,255,0.98) 0%, rgba(140,235,255,0.9) 18%, rgba(0,190,240,0.65) 45%, rgba(0,80,120,0.25) 68%, transparent 82%)',
              filter: 'blur(1px)',
              boxShadow: `0 0 ${24 + orbGlow * 60}px rgba(0,212,255,${0.4 + orbGlow * 0.45}), 0 0 ${60 + orbGlow * 90}px rgba(0,140,190,0.35)`,
            }}
            animate={{
              scale:
                orbState === 'listening'
                  ? [0.92 + orbGlow * 0.2, 1.08 + orbGlow * 0.3, 0.92 + orbGlow * 0.2]
                  : orbState === 'speaking'
                    ? [1, 1.14, 1.05, 1.16, 1]
                    : 1,
              opacity: orbState === 'idle' && !isProcessing ? 0.85 : 1,
            }}
            transition={
              orbState === 'speaking'
                ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                : orbState === 'listening'
                  ? { duration: 0.4, repeat: Infinity }
                  : { duration: 0.3 }
            }
          />
          {/* status glyph */}
          <div className="absolute inset-0 flex items-center justify-center">
            {orbState === 'thinking' ? (
              <motion.div
                className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <svg
                className={`w-9 h-9 ${orbState === 'speaking' ? 'text-white/80' : 'text-cyan/85'}`}
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.65))' }}
              >
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM5.08 11a1 1 0 00-2 0A9 9 0 0011 19.93V22H8a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07A9 9 0 0021 11a1 1 0 10-2 0 7 7 0 01-14 0z" />
              </svg>
            )}
          </div>
        </motion.div>

        {/* caption under orb */}
        {!cornered && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 text-center"
            style={{ top: ORB_SIZE + 18, width: ORB_SIZE * 2.2, marginLeft: -ORB_SIZE * 0.6 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={orbState + String(isProcessing)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`text-sm font-medium ${orbState === 'speaking' ? 'text-gray-300' : 'text-cyan'}`}
              >
                {isProcessing ? 'Engaging...' :
                  orbState === 'speaking' ? 'Speaking' :
                  orbState === 'thinking' ? 'Thinking' :
                  isListening ? 'Listening — speak to me' :
                  'Tap the orb to speak'}
              </motion.p>
            </AnimatePresence>
            <p className="text-[10px] font-mono text-gray-500 mt-1">
              {isGeminiConfigured() ? 'Core model online' : 'Built-in engine'} · {searchStatus ? 'Web search ready' : 'No search key'}
            </p>
          </motion.div>
        )}

        {/* live transcript */}
        {isListening && transcript && !cornered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2.5 text-sm text-white max-w-md w-[calc(100vw-32px)]"
            style={{ top: ORB_SIZE + 110, marginLeft: '-50%' }}
          >
            <span className="font-mono text-[9px] text-cyan/70 uppercase mr-2">Heard</span>
            “{transcript}”
          </motion.div>
        )}
      </motion.div>

      {/* Bottom command bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 w-[min(560px,calc(100vw-24px))]"
      >
        <div className="flex-1 flex items-center gap-2 glass-strong rounded-2xl px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitInput()}
            placeholder="Type a command…  e.g. “build a 4 bedroom futuristic house”"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          <button
            onClick={submitInput}
            className="w-8 h-8 rounded-lg bg-cyan/20 border border-cyan/40 text-cyan flex items-center justify-center hover:bg-cyan/30 transition-colors shrink-0"
            title="Send"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <motion.button
          onClick={() => {
            if (isListening && orbState === 'listening') {
              setIsListening(false);
            } else if (!isProcessing) {
              setOrbState('listening');
              setIsListening(true);
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all ${
            isListening && orbState === 'listening'
              ? 'bg-cyan/30 border-2 border-cyan glow-cyan'
              : orbState === 'speaking'
                ? 'bg-[#05070c] border-2 border-gray-700'
                : 'bg-cyan/20 border border-cyan/50'
          }`}
          title="Toggle voice"
        >
          {isListening && orbState === 'listening' && (
            <>
              <motion.div className="absolute w-14 h-14 rounded-full border-2 border-cyan"
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <motion.div className="absolute w-14 h-14 rounded-full border-2 border-cyan"
                animate={{ scale: [1, 2.2], opacity: [0.3, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }} />
            </>
          )}
          <svg className={`w-6 h-6 ${isListening && orbState === 'listening' ? 'text-cyan' : orbState === 'speaking' ? 'text-gray-400' : 'text-cyan'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}