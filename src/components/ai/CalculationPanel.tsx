import { motion } from 'framer-motion';
import type { CalculationResult } from '../../types';

const categoryLabel: Record<CalculationResult['category'], string> = {
  structural: 'STRUCTURAL ANALYSIS',
  physics: 'PHYSICS ENGINE',
  cost: 'COST MODEL',
};

const categoryColor: Record<CalculationResult['category'], string> = {
  structural: 'text-cyan',
  physics: 'text-amber',
  cost: 'text-green',
};

const statusColor = (label: string): string => {
  if (/SAFE|WITHIN|STABLE|pass/i.test(label)) return 'text-green';
  if (/RISK|OVER|exceed|not enough/i.test(label)) return 'text-red';
  return 'text-gray-200';
};

interface CalculationPanelProps {
  calc: CalculationResult;
  onClose: () => void;
}

export function CalculationPanel({ calc, onClose }: CalculationPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      className="glass-strong rounded-2xl border border-amber/30 shadow-[0_0_60px_rgba(255,184,0,0.12)] flex flex-col overflow-hidden w-full max-w-lg"
    >
      <div className="px-5 py-3 border-b border-glass-border flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-mono tracking-widest uppercase ${categoryColor[calc.category]}`}>
            {categoryLabel[calc.category]}
          </p>
          <h3 className="text-sm font-semibold text-white">{calc.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-blueprint-light border border-glass-border text-gray-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Formula */}
      <div className="px-5 pt-3">
        <p className="text-[10px] font-mono uppercase text-gray-500 mb-1">Formula</p>
        <div className="rounded-lg bg-blueprint/60 border border-glass-border px-3 py-2 font-mono text-[11px] text-cyan">
          {calc.formula}
        </div>
      </div>

      {/* Inputs + outputs */}
      <div className="px-5 py-3 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase text-gray-500">Inputs</p>
          {calc.inputs.map((i) => (
            <div key={i.label} className="flex justify-between text-[11px]">
              <span className="text-gray-400">{i.label}</span>
              <span className="text-gray-200 font-mono">{i.value}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase text-gray-500">Results</p>
          {calc.outputs.map((o) => (
            <div key={o.label} className="flex justify-between text-[11px]">
              <span className="text-gray-400">{o.label}</span>
              <span className={`font-mono ${statusColor(o.value)}`}>
                {o.value} <span className="text-gray-500">{o.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[10px] font-mono uppercase text-gray-500 mb-1.5">Verdict</p>
        <p className="text-xs text-gray-300 leading-relaxed">{calc.summary}</p>
      </div>
    </motion.div>
  );
}