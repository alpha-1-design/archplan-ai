import type { GeneratedPlan, Material, VoiceCommand } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import type { LlmProvider } from '../types';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are ARCH, a Jarvis-grade AI building design assistant inside ARCHPLAN AI.
You can design any building — ancient, classic, modern, or futuristic — plan layouts, run engineering calculations, and browse the web.
Be concise, precise, and use real architectural and engineering terminology. When asked to design, describe the design briefly and mention you can generate the plan.`;

// ---------------------------------------------------------------------------
// BYOK provider dispatch — Gemini / OpenAI / Anthropic / Groq / OpenRouter
// ---------------------------------------------------------------------------

const activeLlmKey = (): string => {
  const s = useSettingsStore.getState();
  switch (s.llmProvider) {
    case 'gemini': return s.geminiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
    case 'openai': return s.openaiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
    case 'anthropic': return s.anthropicKey || import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    case 'groq': return s.groqKey || import.meta.env.VITE_GROQ_API_KEY || '';
    case 'openrouter': return s.openrouterKey || import.meta.env.VITE_OPENROUTER_API_KEY || '';
    default: return '';
  }
};

/** True when the currently selected LLM provider has a usable key. */
export const isGeminiConfigured = (): boolean => !!activeLlmKey();

const providerLabel = (p: LlmProvider): string =>
  ({ gemini: 'Gemini', openai: 'OpenAI', anthropic: 'Claude', groq: 'Groq', openrouter: 'OpenRouter' })[p] || p;

async function chatWithProvider(
  provider: LlmProvider,
  key: string,
  user: string,
  system: string = SYSTEM_PROMPT,
): Promise<string> {
  if (!key) {
    return `I'm ready to think, but my ${providerLabel(provider)} key is missing. Drop it in Settings (⚙) and I'll wake up fully.`;
  }

  switch (provider) {
    case 'gemini':
      return geminiChat(key, user, system);
    case 'openai':
      return openAiStyleChat('https://api.openai.com/v1/chat/completions', key, {
        model: 'gpt-4.1-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
    case 'groq':
      return openAiStyleChat('https://api.groq.com/openai/v1/chat/completions', key, {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
    case 'openrouter':
      return openAiStyleChat('https://openrouter.ai/api/v1/chat/completions', key, {
        model: 'openai/gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
    case 'anthropic':
      return anthropicChat(key, user, system);
    default:
      return `I don't know how to talk to provider "${provider}" yet. Pick another in Settings.`;
  }
}

// Gemini: browser SDK-style REST call (keeps one code path for web + APK).
async function geminiChat(key: string, user: string, system: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.7 },
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    console.error('Gemini error', res.status, data.error?.message);
    return 'I hit an error talking to my core model. Check your key in Settings — or try me again.';
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? '';
  return text || 'My core model returned nothing. Try again.';
}

// OpenAI-compatible (OpenAI, Groq, OpenRouter)
async function openAiStyleChat(
  url: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    console.error('LLM provider error', res.status, data.error?.message);
    return 'I hit an error talking to my core model. Check your key in Settings — or try again.';
  }
  return data.choices?.[0]?.message?.content || 'My core model returned nothing. Try again.';
}

// Anthropic Messages API
async function anthropicChat(key: string, user: string, system: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    content?: { type: string; text?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    console.error('Anthropic error', res.status, data.error?.message);
    return 'I hit an error talking to my core model. Check your key in Settings — or try again.';
  }
  return data.content?.filter((b) => b.type === 'text').map((b) => b.text || '').join('') || 'My core model returned nothing. Try again.';
}

// ---------------------------------------------------------------------------
// Public chat API
// ---------------------------------------------------------------------------

export const chatWithAI = async (message: string, context?: string): Promise<string> => {
  const s = useSettingsStore.getState();
  const user = context ? `${message}\n\n[Web search context]\n${context}` : message;
  try {
    return await chatWithProvider(s.llmProvider, activeLlmKey(), user);
  } catch (error) {
    console.error('chatWithAI error:', error);
    return 'I hit a snag reaching my core model. Check your connection and key in Settings.';
  }
};

// -------------------------------------------------------- Command parsing

export const parseVoiceCommand = async (text: string): Promise<VoiceCommand> => {
  const lower = text.toLowerCase();

  // Build / design intent (highest priority)
  if (
    lower.includes('build') ||
    lower.includes('design') ||
    lower.includes('create') ||
    lower.includes('generate') ||
    lower.includes('draw') ||
    lower.includes('make me') ||
    lower.includes('construct')
  ) {
    if (lower.includes('wall')) {
      return {
        intent: 'create',
        action: 'add_wall',
        params: { direction: lower.includes('horizontal') || lower.includes('east') || lower.includes('west') ? 'horizontal' : 'vertical' },
        rawText: text,
      };
    }
    if (lower.includes('door')) return { intent: 'create', action: 'add_door', params: {}, rawText: text };
    if (lower.includes('window') || lower.includes('glass')) return { intent: 'create', action: 'add_window', params: {}, rawText: text };
    return { intent: 'build', action: 'generate_plan', params: { requirements: text }, rawText: text };
  }

  // Calculations (real math)
  if (
    lower.includes('calculate') ||
    lower.includes('computation') ||
    lower.includes('math') ||
    lower.includes('rocket') ||
    lower.includes('launch') ||
    lower.includes('thrust') ||
    lower.includes('beam') ||
    lower.includes('column') ||
    lower.includes('bend') ||
    lower.includes('wind load') ||
    lower.includes('how much') ||
    lower.includes('fall') ||
    lower.includes('impact') ||
    lower.includes('cost estimate') ||
    lower.includes('budget') ||
    lower.includes('takeoff')
  ) {
    return { intent: 'calculate', action: 'run_calculation', params: { request: text }, rawText: text };
  }

  // Web search
  if (
    lower.includes('search') ||
    lower.includes('look up') ||
    lower.includes('google') ||
    lower.includes('what is') ||
    lower.includes('who is') ||
    lower.includes('latest') ||
    lower.includes('find out') ||
    lower.includes('research')
  ) {
    return {
      intent: 'search',
      action: 'web_search',
      params: { query: text.replace(/search|look up|google|for|find out|please|about/gi, '').trim() || text },
      rawText: text,
    };
  }

  // Test
  if (lower.includes('test') || lower.includes('stress') || lower.includes('structural')) {
    return { intent: 'test', action: 'run_test', params: {}, rawText: text };
  }

  // Navigation
  if (lower.includes('show plan') || lower.includes('floor plan') || lower.includes('2d') || lower.includes('blueprint')) {
    return { intent: 'navigate', action: 'show_plan', params: {}, rawText: text };
  }
  if (lower.includes('show 3d') || lower.includes('3d model') || lower.includes('see it') || lower.includes('view it') || lower.includes('model it')) {
    return { intent: 'navigate', action: 'show_3d', params: {}, rawText: text };
  }

  return { intent: 'unknown', action: 'unknown', params: {}, rawText: text };
};

// ------------------------------------------------------ Plan generation

const PLAN_JSON_SCHEMA = `{
  "name": "string",
  "style": "string",
  "era": "ancient" | "classic" | "modern" | "futuristic",
  "wallMaterial": "concrete" | "brick" | "wood" | "glass" | "steel",
  "wallHeight": number (meters),
  "rooms": [{ "label": "string", "x": number, "y": number, "width": number, "depth": number }],
  "doors": [{ "roomA": "string", "roomB": "string" }],
  "windows": [{ "room": "string", "count": number }]
}`;

export const generatePlan = async (requirements: string): Promise<GeneratedPlan> => {
  const key = activeLlmKey();
  if (key) {
    try {
      const s = useSettingsStore.getState();
      const prompt = `${SYSTEM_PROMPT}

Generate a complete building plan for: "${requirements}"

Rules:
- Rooms must be axis-aligned rectangles on a shared grid, aligned edges (integer or half-meter positions only).
- Use realistic room sizes in meters.
- Every room must connect to at least one other via a door (rooms are labeled, so connect by labels).
- Put windows on exterior rooms only.
- Match the era: ancient = stone-like brick walls; classic = brick; modern = concrete & glass; futuristic = steel & glass, taller walls, unusual proportions.
- Return ONLY valid JSON, no markdown, matching exactly:
${PLAN_JSON_SCHEMA}`;

      const raw = await chatWithProvider(s.llmProvider, key, prompt, 'Return only valid JSON matching the requested schema. No markdown, no commentary.');
      const json = extractJson(raw);
      if (json) return sanitizePlan(json, requirements);
      console.warn('LLM plan did not return parseable JSON; using deterministic fallback.');
    } catch (error) {
      console.error('Plan generation error:', error);
    }
  }
  return fallbackPlan(requirements);
};

/** Pull the first JSON object out of a model response. */
const extractJson = (raw: string): GeneratedPlan | null => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as GeneratedPlan;
  } catch {
    return null;
  }
};

/** Snap floats to 0.5 m grid so shared edges line up exactly. */
const snap = (v: number): number => Math.round(v * 2) / 2;

const sanitizePlan = (p: Partial<GeneratedPlan>, requirements: string): GeneratedPlan => {
  const era = (['ancient', 'classic', 'modern', 'futuristic'] as const).includes(p.era as GeneratedPlan['era'])
    ? (p.era as GeneratedPlan['era'])
    : detectEra(requirements);
  const base = ERA_PRESETS[era];
  const rooms = (p.rooms || [])
    .filter((r) => r.width > 0 && r.depth > 0)
    .slice(0, 14)
    .map((r) => ({
      label: r.label || 'Room',
      x: snap(r.x),
      y: snap(r.y),
      width: Math.max(1, snap(r.width)),
      depth: Math.max(1, snap(r.depth)),
    }));

  if (rooms.length === 0) return fallbackPlan(requirements);

  const labels = rooms.map((r) => r.label);
  const doors = (p.doors || [])
    .filter((d) => labels.includes(d.roomA) && labels.includes(d.roomB))
    .slice(0, 20);
  const windows = (p.windows || [])
    .filter((w) => labels.includes(w.room) && w.count > 0)
    .slice(0, 20)
    .map((w) => ({ room: w.room, count: Math.min(4, Math.floor(w.count)) }));

  return {
    name: p.name || `${titleCase(era)} Residence`,
    style: p.style || titleCase(era),
    era,
    wallMaterial: (['concrete', 'brick', 'wood', 'glass', 'steel'] as Material[]).includes(p.wallMaterial as Material)
      ? (p.wallMaterial as Material)
      : base.material,
    wallHeight: typeof p.wallHeight === 'number' && p.wallHeight > 1.5 && p.wallHeight < 30 ? snap(p.wallHeight) : base.height,
    rooms,
    doors,
    windows,
  };
};

// ----------------------------------------------------- Fallback generator

export const ERA_PRESETS: Record<
  GeneratedPlan['era'],
  { material: Material; height: number; label: string; roof: 'flat' | 'gable' | 'hipped' }
> = {
  ancient: { material: 'brick', height: 3.2, label: 'Ancient Villa', roof: 'gable' },
  classic: { material: 'brick', height: 2.8, label: 'Classic Residence', roof: 'hipped' },
  modern: { material: 'concrete', height: 3.0, label: 'Modern House', roof: 'flat' },
  futuristic: { material: 'steel', height: 3.6, label: 'Futuristic Structure', roof: 'flat' },
};

export const detectEra = (text: string): GeneratedPlan['era'] => {
  const lower = text.toLowerCase();
  if (/(futur|space|sci[- ]?fi|glass tower|dome|cyber)/.test(lower)) return 'futuristic';
  if (/(modern|contemporary|minimal)/.test(lower)) return 'modern';
  if (/(ancient|greek|roman|medieval|castle|villa|stone|temple)/.test(lower)) return 'ancient';
  if (/(classic|bungalow|colonial|traditional|family)/.test(lower)) return 'classic';
  return 'modern';
};

const ROOM_LABELS = [
  'Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom', 'Bathroom',
  'Dining Room', 'Study', 'Guest Room', 'Garage', 'Laundry',
];

/** Deterministic grid plan generator — always produces a buildable, aligned layout. */
const fallbackPlan = (requirements: string): GeneratedPlan => {
  const era = detectEra(requirements);
  const preset = ERA_PRESETS[era];

  const lower = requirements.toLowerCase();
  let count = 3;
  const countMatch = lower.match(/(\d+)[-\s]?(?:bedroom|room|bed|storey|floor)/);
  if (countMatch) {
    count = Math.min(14, Math.max(1, parseInt(countMatch[1], 10)));
  } else {
    const wordCounts: [string, number][] = [['four', 4], ['three', 3], ['two', 2], ['five', 5], ['six', 6], ['seven', 7], ['eight', 8]];
    for (const [word, num] of wordCounts) {
      if (lower.includes(word)) { count = num; break; }
    }
  }

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cell = era === 'futuristic' ? 5 : 4;
  const rooms: GeneratedPlan['rooms'] = [];
  const doors: GeneratedPlan['doors'] = [];
  const windows: GeneratedPlan['windows'] = [];

  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const label = ROOM_LABELS[i % ROOM_LABELS.length];
    rooms.push({ label, x: c * cell, y: r * cell, width: cell, depth: cell });

    if (c > 0) {
      doors.push({ roomA: label, roomB: ROOM_LABELS[(r * cols + c - 1) % ROOM_LABELS.length] });
    }
    if (r > 0) {
      doors.push({ roomA: label, roomB: ROOM_LABELS[((r - 1) * cols + c) % ROOM_LABELS.length] });
    }
    const isExterior = c === 0 || c === cols - 1 || r === 0 || r === rows - 1;
    if (isExterior) windows.push({ room: label, count: 1 + (i % 2) });
  }

  return {
    name: `${preset.label} — ${count} ${count === 1 ? 'Room' : 'Rooms'}`,
    style: preset.label,
    era,
    wallMaterial: preset.material,
    wallHeight: preset.height,
    rooms,
    doors,
    windows,
  };
};

const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// ----------------------------------------------------- Materials helpers

export const materialLabel: Record<Material, string> = {
  concrete: 'Concrete',
  brick: 'Brick',
  wood: 'Wood',
  glass: 'Glass',
  steel: 'Steel',
};
