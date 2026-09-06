import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';

export function StatusBar() {
  const { viewMode, plan, zoom, currentTool } = useAppStore();

  return (
    <motion.footer
      className="h-8 glass-strong flex items-center justify-between px-4 text-[10px] font-mono text-gray-400 z-50"
      initial={{ y: 32 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span>Ready</span>
        </span>
        <span className="text-glass-border">|</span>
        <span>Tool: <span className="text-cyan">{currentTool.toUpperCase()}</span></span>
        <span className="text-glass-border">|</span>
        <span>Mode: <span className="text-cyan">{viewMode.toUpperCase()}</span></span>
      </div>

      {/* Center section */}
      <div className="flex items-center gap-4">
        <span>Zoom: <span className="text-cyan">{Math.round(zoom * 100)}%</span></span>
        <span className="text-glass-border">|</span>
        <span>Elements: <span className="text-cyan">{plan.walls.length + plan.doors.length + plan.windows.length + plan.rooms.length}</span></span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <span>ARCHPLAN AI v1.0</span>
        <span className="text-glass-border">|</span>
        <span className="text-cyan/70">© 2026</span>
      </div>
    </motion.footer>
  );
}
