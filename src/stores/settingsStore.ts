import { create } from 'zustand';
import type { AppSettings, LlmProvider, SearchProvider } from '../types';

const STORAGE_KEY = 'archplan_settings';

type StoredSettings = {
  geminiKey?: string;
  exaKey?: string;
  llmProvider?: LlmProvider;
  openaiKey?: string;
  anthropicKey?: string;
  groqKey?: string;
  openrouterKey?: string;
  searchProvider?: SearchProvider;
  tavilyKey?: string;
  braveKey?: string;
};

const envLlmKey = (provider: LlmProvider): string => {
  switch (provider) {
    case 'gemini': return import.meta.env.VITE_GOOGLE_API_KEY || '';
    case 'openai': return import.meta.env.VITE_OPENAI_API_KEY || '';
    case 'anthropic': return import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    case 'groq': return import.meta.env.VITE_GROQ_API_KEY || '';
    case 'openrouter': return import.meta.env.VITE_OPENROUTER_API_KEY || '';
  }
};

const envSearchKey = (provider: SearchProvider): string => {
  switch (provider) {
    case 'exa': return import.meta.env.VITE_EXA_API_KEY || '';
    case 'tavily': return import.meta.env.VITE_TAVILY_API_KEY || '';
    case 'brave': return import.meta.env.VITE_BRAVE_API_KEY || '';
  }
};

const loadStored = (): StoredSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSettings;
      // Only trust fields that are actually present
      const out: StoredSettings = {};
      if (parsed.geminiKey !== undefined) out.geminiKey = parsed.geminiKey;
      if (parsed.exaKey !== undefined) out.exaKey = parsed.exaKey;
      if (parsed.llmProvider !== undefined) out.llmProvider = parsed.llmProvider;
      if (parsed.openaiKey !== undefined) out.openaiKey = parsed.openaiKey;
      if (parsed.anthropicKey !== undefined) out.anthropicKey = parsed.anthropicKey;
      if (parsed.groqKey !== undefined) out.groqKey = parsed.groqKey;
      if (parsed.openrouterKey !== undefined) out.openrouterKey = parsed.openrouterKey;
      if (parsed.searchProvider !== undefined) out.searchProvider = parsed.searchProvider;
      if (parsed.tavilyKey !== undefined) out.tavilyKey = parsed.tavilyKey;
      if (parsed.braveKey !== undefined) out.braveKey = parsed.braveKey;
      return out;
    }
  } catch {
    // ignore malformed storage
  }
  return {};
};

interface SettingsStore extends AppSettings {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setGeminiKey: (key: string) => void;
  setExaKey: (key: string) => void;
  setLlmProvider: (provider: LlmProvider) => void;
  setOpenaiKey: (key: string) => void;
  setAnthropicKey: (key: string) => void;
  setGroqKey: (key: string) => void;
  setOpenrouterKey: (key: string) => void;
  setSearchProvider: (provider: SearchProvider) => void;
  setTavilyKey: (key: string) => void;
  setBraveKey: (key: string) => void;
}

function getDefaults(): AppSettings {
  const stored = loadStored();
  return {
    geminiKey: stored.geminiKey ?? envLlmKey('gemini'),
    exaKey: stored.exaKey ?? envSearchKey('exa'),
    llmProvider: stored.llmProvider ?? 'gemini',
    openaiKey: stored.openaiKey ?? envLlmKey('openai'),
    anthropicKey: stored.anthropicKey ?? envLlmKey('anthropic'),
    groqKey: stored.groqKey ?? envLlmKey('groq'),
    openrouterKey: stored.openrouterKey ?? envLlmKey('openrouter'),
    searchProvider: stored.searchProvider ?? 'exa',
    tavilyKey: stored.tavilyKey ?? envSearchKey('tavily'),
    braveKey: stored.braveKey ?? envSearchKey('brave'),
  };
}

function persist(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable
  }
}

const initial = getDefaults();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  geminiKey: initial.geminiKey,
  exaKey: initial.exaKey,
  llmProvider: initial.llmProvider,
  openaiKey: initial.openaiKey,
  anthropicKey: initial.anthropicKey,
  groqKey: initial.groqKey,
  openrouterKey: initial.openrouterKey,
  searchProvider: initial.searchProvider,
  tavilyKey: initial.tavilyKey,
  braveKey: initial.braveKey,
  isSettingsOpen: false,

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  setGeminiKey: (key) => {
    const next = { ...get(), geminiKey: key };
    persist(next);
    set(next);
  },
  setExaKey: (key) => {
    const next = { ...get(), exaKey: key };
    persist(next);
    set(next);
  },
  setLlmProvider: (provider) => {
    const next = { ...get(), llmProvider: provider };
    persist(next);
    set(next);
  },
  setOpenaiKey: (key) => {
    const next = { ...get(), openaiKey: key };
    persist(next);
    set(next);
  },
  setAnthropicKey: (key) => {
    const next = { ...get(), anthropicKey: key };
    persist(next);
    set(next);
  },
  setGroqKey: (key) => {
    const next = { ...get(), groqKey: key };
    persist(next);
    set(next);
  },
  setOpenrouterKey: (key) => {
    const next = { ...get(), openrouterKey: key };
    persist(next);
    set(next);
  },
  setSearchProvider: (provider) => {
    const next = { ...get(), searchProvider: provider };
    persist(next);
    set(next);
  },
  setTavilyKey: (key) => {
    const next = { ...get(), tavilyKey: key };
    persist(next);
    set(next);
  },
  setBraveKey: (key) => {
    const next = { ...get(), braveKey: key };
    persist(next);
    set(next);
  },
}));
