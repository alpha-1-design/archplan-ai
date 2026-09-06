import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from './stores/appStore';
import { TopBar } from './components/ui/TopBar';
import { LeftSidebar } from './components/ui/LeftSidebar';
import { RightSidebar } from './components/ui/RightSidebar';
import { StatusBar } from './components/ui/StatusBar';
import { SettingsModal } from './components/ui/SettingsModal';
import { Canvas2D } from './components/canvas/Canvas2D';
import { Viewport3D } from './components/viewport/Viewport3D';
import { StressTestView } from './components/viewport/StressTestView';
import { AIVoiceMode } from './components/ai/AIVoiceMode';
import { HoldToSummon } from './components/ai/HoldToSummon';
import { buildDemoHouse } from './lib/builder';

function App() {
  const { viewMode, isListening, setViewMode, setOrbState } = useAppStore();
  const [isLoaded, setIsLoaded] = useState(false);

  // Show loading animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Seed a demo house so the 3D view has something to show on first visit
  useEffect(() => {
    const { plan } = useAppStore.getState();
    if (plan.walls.length === 0) {
      buildDemoHouse();
    }
  }, []);

  // Any trigger of listening anywhere in the app journeys to the AI orb
  useEffect(() => {
    if (isListening) {
      setViewMode('ai');
    }
  }, [isListening, setViewMode]);

  const exitAiMode = useCallback(() => {
    setViewMode('2d');
    setOrbState('idle');
  }, [setViewMode, setOrbState]);

  return (
    <div className="h-screen w-screen flex flex-col bg-blueprint overflow-hidden">
      {/* Loading screen */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            className="fixed inset-0 z-[60] bg-blueprint flex items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-cyan/20 border border-cyan/40 flex items-center justify-center mb-6"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 212, 255, 0.2)',
                    '0 0 40px rgba(0, 212, 255, 0.4)',
                    '0 0 20px rgba(0, 212, 255, 0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  className="w-8 h-8 rounded-full"
                  style={{ background: 'radial-gradient(circle at 34% 30%, rgba(120,220,255,0.95), rgba(0,100,160,0.3))' }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
              <motion.h1
                className="text-xl font-semibold text-white mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                ARCHPLAN AI
              </motion.h1>
              <motion.p
                className="text-sm text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Building Design Studio · Voice Core
              </motion.p>
              <motion.div
                className="mt-6 flex justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-cyan"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'ai' ? (
        <AnimatePresence mode="wait">
          <AIVoiceMode key="ai" onExit={exitAiMode} />
        </AnimatePresence>
      ) : (
        <>
          <TopBar />

          <div className="flex-1 flex overflow-hidden">
            <LeftSidebar />

            <main className="flex-1 flex flex-col overflow-hidden relative">
              <AnimatePresence mode="wait">
                {viewMode === '2d' && (
                  <motion.div
                    key="2d"
                    className="flex-1 flex"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Canvas2D />
                  </motion.div>
                )}

                {viewMode === '3d' && (
                  <motion.div
                    key="3d"
                    className="flex-1 flex"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Viewport3D />
                  </motion.div>
                )}

                {viewMode === 'test' && (
                  <motion.div
                    key="test"
                    className="flex-1 flex"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <StressTestView />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <RightSidebar />
          </div>

          <StatusBar />
        </>
      )}

      {/* Settings modal (available everywhere) */}
      <SettingsModal />

      {/* Tap-and-hold anywhere → summon the AI orb */}
      <HoldToSummon />

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}

// Keyboard shortcuts handler
function KeyboardShortcuts() {
  const { setCurrentTool, setViewMode, setIsListening, setOrbState } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setCurrentTool('select');
          break;
        case 'w':
          setCurrentTool('wall');
          break;
        case 'r':
          setCurrentTool('room');
          break;
        case 'd':
          setCurrentTool('door');
          break;
        case 'n':
          setCurrentTool('window');
          break;
        case 'm':
          setCurrentTool('dimension');
          break;
        case 'e':
          setCurrentTool('erase');
          break;
        case '1':
          setViewMode('2d');
          setOrbState('idle');
          break;
        case '2':
          setViewMode('3d');
          setOrbState('idle');
          break;
        case '3':
          setViewMode('test');
          setOrbState('idle');
          break;
        case '4':
          setViewMode('ai');
          setOrbState('idle');
          break;
        case ' ':
          // Space toggles voice listening → enters AI orb
          if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            setIsListening(true);
            setOrbState('listening');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTool, setViewMode, setIsListening, setOrbState]);

  return null;
}

export default App;