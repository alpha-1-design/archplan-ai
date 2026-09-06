import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { GRID_SIZE } from '../../lib/builder';

interface BlueprintPreviewProps {
  onOpen2D: () => void;
  onOpen3D: () => void;
}

const cyan = '#00d4ff';

export function BlueprintPreview({ onOpen2D, onOpen3D }: BlueprintPreviewProps) {
  const plan = useAppStore((s) => s.plan);
  const lastGeneratedPlan = useAppStore((s) => s.lastGeneratedPlan);
  const modelSettings = useAppStore((s) => s.modelSettings);

  const { viewBox, walls, rooms, doors, windows, totalArea } = useMemo(() => {
    const toM = (v: number) => v / GRID_SIZE;
    const pts = plan.walls.flatMap((w) => [w.start, w.end]);
    let minX = 0, minY = 0, maxX = 10, maxY = 10;
    if (pts.length > 0) {
      minX = Math.min(...pts.map((p) => p.x));
      minY = Math.min(...pts.map((p) => p.y));
      maxX = Math.max(...pts.map((p) => p.x));
      maxY = Math.max(...pts.map((p) => p.y));
    }
    const pad = 1.2;
    const area = plan.rooms.reduce((s, r) => s + r.area, 0);
    return {
      viewBox: `${toM(minX) - pad} ${toM(minY) - pad} ${toM(maxX - minX) + pad * 2} ${toM(maxY - minY) + pad * 2}`,
      walls: plan.walls,
      rooms: plan.rooms,
      doors: plan.doors,
      windows: plan.windows,
      totalArea: Math.round(area * 10) / 10,
    };
  }, [plan]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      className="glass-strong rounded-2xl border border-cyan/30 shadow-[0_0_60px_rgba(0,212,255,0.15)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-glass-border flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-cyan/70 tracking-widest uppercase">Floor Plan · Generated</p>
          <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
          <span className="px-2 py-0.5 rounded-full border border-glass-border">
            {plan.rooms.length} rooms
          </span>
          <span className="px-2 py-0.5 rounded-full border border-glass-border">
            {totalArea} m²
          </span>
          <span className="px-2 py-0.5 rounded-full border border-glass-border uppercase">
            {lastGeneratedPlan?.style || modelSettings.defaultMaterial}
          </span>
        </div>
      </div>

      {/* Blueprint */}
      <div className="relative flex-1 min-h-[220px] bg-[#0a0f1a] m-3 rounded-xl border border-glass-border overflow-hidden">
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
          {/* Rooms */}
          {rooms.map((room) => (
            <g key={room.id}>
              <polygon
                points={room.points.map((p) => `${p.x / GRID_SIZE},${p.y / GRID_SIZE}`).join(' ')}
                fill="rgba(0,212,255,0.05)"
                stroke="rgba(0,212,255,0.12)"
              />
              <text
                x={room.points.reduce((s, p) => s + p.x, 0) / room.points.length / GRID_SIZE}
                y={room.points.reduce((s, p) => s + p.y, 0) / room.points.length / GRID_SIZE - 0.25}
                textAnchor="middle"
                fill={cyan}
                fontSize="0.34"
                fontFamily="JetBrains Mono, monospace"
              >
                {room.label}
              </text>
              <text
                x={room.points.reduce((s, p) => s + p.x, 0) / room.points.length / GRID_SIZE}
                y={room.points.reduce((s, p) => s + p.y, 0) / room.points.length / GRID_SIZE + 0.25}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize="0.26"
                fontFamily="JetBrains Mono, monospace"
              >
                {room.area.toFixed(1)} m²
              </text>
            </g>
          ))}

          {/* Walls */}
          {walls.map((w) => {
            const x1 = w.start.x / GRID_SIZE, y1 = w.start.y / GRID_SIZE;
            const x2 = w.end.x / GRID_SIZE, y2 = w.end.y / GRID_SIZE;
            return (
              <line
                key={w.id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={cyan}
                strokeWidth={Math.max(0.16, w.thickness)}
                strokeLinecap="round"
              />
            );
          })}

          {/* Doors */}
          {doors.map((d) => {
            const r = Math.cos(d.rotation);
            const s = Math.sin(d.rotation);
            const half = d.width / 2;
            // opening on the wall line
            const x1 = d.position.x / GRID_SIZE - r * half;
            const y1 = d.position.y / GRID_SIZE - s * half;
            const x2 = d.position.x / GRID_SIZE + r * half;
            const y2 = d.position.y / GRID_SIZE + s * half;
            return (
              <g key={d.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0a0f1a" strokeWidth={0.32} strokeLinecap="round" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.35)" strokeWidth={0.06} />
              </g>
            );
          })}

          {/* Windows */}
          {windows.map((win) => {
            const r = Math.cos(win.rotation);
            const s = Math.sin(win.rotation);
            const half = win.width / 2;
            const x1 = win.position.x / GRID_SIZE - r * half;
            const y1 = win.position.y / GRID_SIZE - s * half;
            const x2 = win.position.x / GRID_SIZE + r * half;
            const y2 = win.position.y / GRID_SIZE + s * half;
            return (
              <line key={win.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38bdf8" strokeWidth={0.14} strokeLinecap="round" />
            );
          })}
        </svg>

        {/* HUD overlays */}
        <div className="absolute top-2 left-2 text-[9px] font-mono text-cyan/50">
          SCALE: 1:50 · WALL H {modelSettings.wallHeight.toFixed(1)}m · T {modelSettings.wallThickness.toFixed(1)}m
        </div>
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-cyan/40">
          ARCHPLAN GENERATIVE ENGINE
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-glass-border flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-400 hidden sm:block">
          Built with real walls, rooms, doors &amp; windows — fully editable.
        </p>
        <div className="flex gap-2 ml-auto">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpen2D}
            className="px-4 py-2 rounded-lg bg-blueprint-light border border-glass-border text-gray-300 text-xs font-medium hover:border-cyan/50 hover:text-white transition-colors"
          >
            📐 Open in 2D
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpen3D}
            className="px-4 py-2 rounded-lg bg-cyan/20 border border-cyan/40 text-cyan text-xs font-medium hover:bg-cyan/30 transition-colors"
          >
            🏗️ Open in 3D
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}