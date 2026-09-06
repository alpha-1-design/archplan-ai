import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ViewMode } from '../../types';

const modes: { id: ViewMode; label: string; icon: string }[] = [
  { id: '2d', label: '2D Plan', icon: '📐' },
  { id: '3d', label: '3D Model', icon: '🏗️' },
  { id: 'test', label: 'Stress Test', icon: '⚡' },
  { id: 'ai', label: 'AI Orb', icon: '✦' },
];

export function TopBar() {
  const { viewMode, setViewMode, plan, isListening, setIsListening, setOrbState } = useAppStore();
  const openSettings = useSettingsStore((s) => s.openSettings);

  const handleVoiceClick = () => {
    if (viewMode !== 'ai') {
      setIsListening(true);
      setOrbState('listening');
      // App switches viewMode to 'ai' on isListening
    } else {
      setIsListening(!isListening);
    }
  };

  return (
    <motion.header 
      className="h-14 glass-strong flex items-center justify-between px-4 z-50"
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan/20 flex items-center justify-center glow-cyan">
          <span className="text-cyan font-bold text-sm">AP</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white tracking-wide">ARCHPLAN</h1>
          <p className="text-[10px] text-cyan/70 font-mono">AI BUILDING STUDIO</p>
        </div>
      </div>

      {/* Mode Switcher */}
      <nav className="flex items-center gap-1 p-1 rounded-xl bg-blueprint/50 border border-glass-border">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              if (mode.id !== 'ai') {
                setViewMode(mode.id);
                setIsListening(false);
                setOrbState('idle');
              } else {
                setViewMode('ai');
                setIsListening(false);
                setOrbState('idle');
              }
            }}
            className={`
              relative px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${viewMode === mode.id 
                ? 'text-white' 
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
          >
            {viewMode === mode.id && (
              <motion.div
                layoutId="activeMode"
                className="absolute inset-0 bg-cyan/20 border border-cyan/40 rounded-lg"
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </span>
          </button>
        ))}
      </nav>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Project name */}
        <div className="text-right mr-4 hidden md:block">
          <p className="text-xs text-gray-400">Project</p>
          <p className="text-sm font-medium text-white">{plan.name}</p>
        </div>

        {/* Voice Button */}
        <motion.button
          onClick={handleVoiceClick}
          className={`
            relative w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isListening && viewMode === 'ai'
              ? 'bg-cyan/30 border-2 border-cyan glow-cyan' 
              : viewMode === 'ai'
                ? 'bg-cyan/10 border border-cyan/40'
                : 'bg-blueprint-light border border-glass-border hover:border-cyan/50'
            }
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Voice — say “build a 3 bedroom house”"
        >
          {isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-cyan"
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-cyan"
                animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              />
            </>
          )}
          <svg 
            className={`w-5 h-5 ${isListening || viewMode === 'ai' ? 'text-cyan' : 'text-gray-400'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
        </motion.button>

        {/* Settings */}
        <button
          onClick={openSettings}
          className="w-10 h-10 rounded-full bg-blueprint-light border border-glass-border flex items-center justify-center hover:border-cyan/50 transition-colors"
          title="Settings — API keys"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </motion.header>
  );
}