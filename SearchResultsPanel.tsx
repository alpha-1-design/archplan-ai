import { motion } from 'framer-motion';
import type { SearchOutput } from '../../types';

interface SearchResultsPanelProps {
  output: SearchOutput;
  onClose: () => void;
}

export function SearchResultsPanel({ output, onClose }: SearchResultsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      className="glass-strong rounded-2xl border border-cyan/30 shadow-[0_0_60px_rgba(0,212,255,0.12)] flex flex-col overflow-hidden w-full max-w-lg"
    >
      <div className="px-5 py-3 border-b border-glass-border flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-cyan/70 tracking-widest uppercase">Live Web Search · Exa</p>
          <h3 className="text-sm font-semibold text-white truncate">“{output.query}”</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 shrink-0 rounded-lg bg-blueprint-light border border-glass-border text-gray-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-2 overflow-y-auto max-h-72">
        {output.results.length === 0 && (
          <p className="text-xs text-gray-400">No results found.</p>
        )}
        {output.results.map((r, i) => (
          <a
            key={r.url + i}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl bg-blueprint/50 border border-glass-border p-3 hover:border-cyan/40 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono text-cyan/60 bg-cyan/10 rounded px-1.5 py-0.5">
                [{i + 1}]
              </span>
              <span className="text-xs font-medium text-white group-hover:text-cyan transition-colors line-clamp-1">
                {r.title}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">{r.snippet}</p>
            <p className="text-[10px] font-mono text-cyan/50 mt-1 truncate">{r.url}</p>
          </a>
        ))}
      </div>

      <div className="px-5 py-2.5 border-t border-glass-border text-[10px] font-mono text-gray-500">
        {output.results.length} results · neural search · citations backed by Exa
      </div>
    </motion.div>
  );
}