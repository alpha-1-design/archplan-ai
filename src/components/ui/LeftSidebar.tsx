import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import type { Tool } from '../../types';

const tools: { id: Tool; label: string; icon: React.ReactElement; shortcut: string }[] = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'V',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
  },
  {
    id: 'wall',
    label: 'Wall',
    shortcut: 'W',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'room',
    label: 'Room',
    shortcut: 'R',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'door',
    label: 'Door',
    shortcut: 'D',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2zm5 4v8" />
      </svg>
    ),
  },
  {
    id: 'window',
    label: 'Window',
    shortcut: 'N',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 0v16M4 12h16" />
      </svg>
    ),
  },
  {
    id: 'dimension',
    label: 'Dimension',
    shortcut: 'M',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  { id: 'erase', label: 'Erase', shortcut: 'E', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )},
];

export function LeftSidebar() {
  const { currentTool, setCurrentTool, showGrid, toggleGrid } = useAppStore();

  return (
    <motion.aside
      className="w-16 glass-strong flex flex-col items-center py-4 gap-2 z-40"
      initial={{ x: -64 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      {/* Tools */}
      <div className="flex flex-col gap-1 flex-1">
        {tools.map((tool) => (
          <motion.button
            key={tool.id}
            onClick={() => setCurrentTool(tool.id)}
            className={`
              relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
              transition-all duration-200 group
              ${currentTool === tool.id 
                ? 'bg-cyan/20 border border-cyan/40 text-cyan' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {currentTool === tool.id && (
              <motion.div
                layoutId="activeTool"
                className="absolute inset-0 rounded-xl bg-cyan/10 border border-cyan/30"
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              />
            )}
            <span className="relative">{tool.icon}</span>
            <span className="relative text-[9px] font-medium">{tool.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-8 h-px bg-glass-border my-2" />

      {/* Grid toggle */}
      <motion.button
        onClick={toggleGrid}
        className={`
          w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
          transition-all duration-200
          ${showGrid ? 'text-cyan/70' : 'text-gray-500'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Toggle Grid"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <span className="text-[9px] font-medium">Grid</span>
      </motion.button>

      {/* Keyboard shortcuts hint */}
      <div className="mt-2 text-center">
        <p className="text-[8px] text-gray-500 font-mono">SHORTCUTS</p>
        <p className="text-[8px] text-gray-600 font-mono">VIEW-ONLY</p>
      </div>
    </motion.aside>
  );
}
