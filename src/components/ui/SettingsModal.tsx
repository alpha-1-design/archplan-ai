import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import type { LlmProvider, SearchProvider } from '../../types';

const INPUT_CLASS =
  'w-full bg-blueprint/60 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan/60 transition-colors font-mono';

const LLM_PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Claude' },
  { value: 'groq', label: 'Groq' },
  { value: 'openrouter', label: 'OpenRouter' },
];

const SEARCH_PROVIDERS: { value: SearchProvider; label: string }[] = [
  { value: 'exa', label: 'Exa' },
  { value: 'tavily', label: 'Tavily' },
  { value: 'brave', label: 'Brave' },
];

const LLM_HELP: Record<LlmProvider, string> = {
  gemini: 'Voice intelligence & plan generation — the fastest built-in option.',
  openai: 'GPT-class reasoning for plans, calculations, and answers.',
  anthropic: 'Claude-class long-context reasoning and critique.',
  groq: 'Ultra-low-latency inference on open models.',
  openrouter: 'One key that routes across hundreds of models.',
};

const SEARCH_HELP: Record<SearchProvider, string> = {
  exa: 'Semantic search with real citations for grounding.',
  tavily: 'AI-optimized search with clean result fields.',
  brave: 'Independent web index, privacy-first.',
};

function ProviderChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all ${
        active
          ? 'border-cyan/70 bg-cyan/10 text-cyan shadow-[0_0_12px_rgba(0,212,255,0.15)]'
          : 'border-glass-border bg-blueprint/40 text-gray-300 hover:border-glass-border/80'
      }`}
    >
      {label}
      {active && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">✓</span>}
    </button>
  );
}

function KeyField({
  label,
  value,
  onChange,
  placeholder,
  linkHref,
  envProvided,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  linkHref: string;
  envProvided: boolean;
  help: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</label>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            value ? 'border-green/40 text-green' : 'border-glass-border text-gray-500'
          }`}
        >
          {value ? (envProvided ? 'ENV PROVIDED' : 'CONNECTED') : 'NOT SET'}
        </span>
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={INPUT_CLASS}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.trim())}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan text-[10px] font-mono uppercase"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <p className="text-[10px] text-gray-500 leading-relaxed">{help}</p>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>Stored locally in your browser — never uploaded.</span>
        <a href={linkHref} target="_blank" rel="noreferrer" className="text-cyan hover:underline">
          Get a key →
        </a>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useSettingsStore();

  // LLM slice
  const llmProvider = useSettingsStore((s) => s.llmProvider);
  const setLlmProvider = useSettingsStore((s) => s.setLlmProvider);
  const geminiKey = useSettingsStore((s) => s.geminiKey);
  const setGeminiKey = useSettingsStore((s) => s.setGeminiKey);
  const openaiKey = useSettingsStore((s) => s.openaiKey);
  const setOpenaiKey = useSettingsStore((s) => s.setOpenaiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicKey);
  const setAnthropicKey = useSettingsStore((s) => s.setAnthropicKey);
  const groqKey = useSettingsStore((s) => s.groqKey);
  const setGroqKey = useSettingsStore((s) => s.setGroqKey);
  const openrouterKey = useSettingsStore((s) => s.openrouterKey);
  const setOpenrouterKey = useSettingsStore((s) => s.setOpenrouterKey);

  // Search slice
  const searchProvider = useSettingsStore((s) => s.searchProvider);
  const setSearchProvider = useSettingsStore((s) => s.setSearchProvider);
  const exaKey = useSettingsStore((s) => s.exaKey);
  const setExaKey = useSettingsStore((s) => s.setExaKey);
  const tavilyKey = useSettingsStore((s) => s.tavilyKey);
  const setTavilyKey = useSettingsStore((s) => s.setTavilyKey);
  const braveKey = useSettingsStore((s) => s.braveKey);
  const setBraveKey = useSettingsStore((s) => s.setBraveKey);

  const llmKeyMap: Record<LlmProvider, { value: string; set: (v: string) => void; env: boolean; href: string; placeholder: string }> = {
    gemini: {
      value: geminiKey, set: setGeminiKey, env: !!import.meta.env.VITE_GOOGLE_API_KEY,
      href: 'https://aistudio.google.com/apikey', placeholder: 'AIza...',
    },
    openai: {
      value: openaiKey, set: setOpenaiKey, env: !!import.meta.env.VITE_OPENAI_API_KEY,
      href: 'https://platform.openai.com/api-keys', placeholder: 'sk-...',
    },
    anthropic: {
      value: anthropicKey, set: setAnthropicKey, env: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
      href: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-...',
    },
    groq: {
      value: groqKey, set: setGroqKey, env: !!import.meta.env.VITE_GROQ_API_KEY,
      href: 'https://console.groq.com/keys', placeholder: 'gsk_...',
    },
    openrouter: {
      value: openrouterKey, set: setOpenrouterKey, env: !!import.meta.env.VITE_OPENROUTER_API_KEY,
      href: 'https://openrouter.ai/keys', placeholder: 'sk-or-v1-...',
    },
  };

  const searchKeyMap: Record<SearchProvider, { value: string; set: (v: string) => void; env: boolean; href: string; placeholder: string }> = {
    exa: {
      value: exaKey, set: setExaKey, env: !!import.meta.env.VITE_EXA_API_KEY,
      href: 'https://dashboard.exa.ai/api-keys', placeholder: 'exa_...',
    },
    tavily: {
      value: tavilyKey, set: setTavilyKey, env: !!import.meta.env.VITE_TAVILY_API_KEY,
      href: 'https://app.tavily.com/', placeholder: 'tvly-...',
    },
    brave: {
      value: braveKey, set: setBraveKey, env: !!import.meta.env.VITE_BRAVE_API_KEY,
      href: 'https://api.search.brave.com/', placeholder: 'BSA...',
    },
  };

  const llm = llmKeyMap[llmProvider];
  const search = searchKeyMap[searchProvider];

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeSettings}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="glass-strong rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl shadow-black/50 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <p className="text-xs text-gray-400">Bring your own keys — ARCH runs on any stack you choose</p>
              </div>
              <button
                onClick={closeSettings}
                className="w-8 h-8 rounded-lg bg-blueprint-light border border-glass-border text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-gray-400">AI Model (LLM)</label>
                <div className="grid grid-cols-2 gap-2">
                  {LLM_PROVIDERS.map((p) => (
                    <ProviderChip
                      key={p.value}
                      active={llmProvider === p.value}
                      label={p.label}
                      onClick={() => setLlmProvider(p.value)}
                    />
                  ))}
                </div>
              </div>

              <KeyField
                label={`${llmProvider === 'anthropic' ? 'Anthropic' : llmProvider === 'gemini' ? 'Gemini' : llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1)} API Key`}
                value={llm.value}
                onChange={llm.set}
                placeholder={llm.placeholder}
                linkHref={llm.href}
                envProvided={llm.env}
                help={LLM_HELP[llmProvider]}
              />

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-gray-400">Web Search</label>
                <div className="grid grid-cols-3 gap-2">
                  {SEARCH_PROVIDERS.map((p) => (
                    <ProviderChip
                      key={p.value}
                      active={searchProvider === p.value}
                      label={p.label}
                      onClick={() => setSearchProvider(p.value)}
                    />
                  ))}
                </div>
              </div>

              <KeyField
                label={`${searchProvider.charAt(0).toUpperCase() + searchProvider.slice(1)} Search Key`}
                value={search.value}
                onChange={search.set}
                placeholder={search.placeholder}
                linkHref={search.href}
                envProvided={search.env}
                help={SEARCH_HELP[searchProvider]}
              />
            </div>

            <div className="rounded-xl bg-cyan/5 border border-cyan/20 p-3 text-[11px] text-gray-300 leading-relaxed">
              <span className="text-cyan font-medium">How it works:</span>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Pick any provider you already have a key for — ARCH routes to it automatically.</li>
                <li>Switch providers anytime; each keeps its own key.</li>
                <li>No keys? ARCH still builds plans, runs real calculations, and draws — just without the live LLM/search layer.</li>
              </ul>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={closeSettings}
              className="w-full py-3 rounded-xl bg-cyan/20 border border-cyan/40 text-cyan font-medium text-sm hover:bg-cyan/30 transition-colors"
            >
              Done
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
