import type { SearchOutput } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

/** Resolve the key for the currently selected search provider. */
const activeSearchKey = (): string => {
  const s = useSettingsStore.getState();
  switch (s.searchProvider) {
    case 'exa': return s.exaKey || import.meta.env.VITE_EXA_API_KEY || '';
    case 'tavily': return s.tavilyKey || import.meta.env.VITE_TAVILY_API_KEY || '';
    case 'brave': return s.braveKey || import.meta.env.VITE_BRAVE_API_KEY || '';
    default: return '';
  }
};

/** Web search dispatch — routes to the user's chosen provider + key. */
export const webSearch = async (query: string): Promise<SearchOutput> => {
  const key = activeSearchKey();
  if (!key) throw new Error('SEARCH_KEY_MISSING');

  const provider = useSettingsStore.getState().searchProvider;
  switch (provider) {
    case 'exa': return searchExa(key, query);
    case 'tavily': return searchTavily(key, query);
    case 'brave': return searchBrave(key, query);
    default: throw new Error('SEARCH_KEY_MISSING');
  }
};

export const isSearchConfigured = (): boolean => !!activeSearchKey();

// Exa — semantic web search with citation-backed results.
async function searchExa(key: string, query: string): Promise<SearchOutput> {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify({
      query,
      numResults: 5,
      type: 'auto',
      contents: { text: { maxCharacters: 400 } },
    }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('SEARCH_KEY_INVALID');
    throw new Error('SEARCH_FAILED');
  }

  const data = (await res.json()) as { results?: { title?: string; url?: string; text?: string }[] };
  const results = (data.results || [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title || 'Untitled',
      url: r.url || '#',
      snippet: (r.text || '').replace(/\s+/g, ' ').slice(0, 300),
      source: 'Exa',
    }));

  return { query, results };
}

// Tavily — AI-optimized search with clean result fields.
async function searchTavily(key: string, query: string): Promise<SearchOutput> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query, max_results: 5, include_answer: false }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('SEARCH_KEY_INVALID');
    throw new Error('SEARCH_FAILED');
  }

  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  const results = (data.results || [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title || 'Untitled',
      url: r.url || '#',
      snippet: (r.content || '').replace(/\s+/g, ' ').slice(0, 300),
      source: 'Tavily',
    }));

  return { query, results };
}

// Brave Search API — independent web index, privacy-first.
async function searchBrave(key: string, query: string): Promise<SearchOutput> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Brave-Api-Key': key,
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('SEARCH_KEY_INVALID');
    throw new Error('SEARCH_FAILED');
  }

  const data = (await res.json()) as { web?: { results?: { title?: string; url?: string; description?: string }[] } };
  const results = (data.web?.results || [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title || 'Untitled',
      url: r.url || '#',
      snippet: (r.description || '').replace(/\s+/g, ' ').slice(0, 300),
      source: 'Brave',
    }));

  return { query, results };
}
