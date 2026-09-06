// Drawing tool types
export type Tool = 'select' | 'wall' | 'door' | 'window' | 'room' | 'dimension' | 'erase';

// View modes
export type ViewMode = '2d' | '3d' | 'test' | 'ai';

// Material types for 3D
export type Material = 'concrete' | 'brick' | 'wood' | 'glass' | 'steel';

// 2D Point
export interface Point {
  x: number;
  y: number;
}

// Wall element
export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  height: number;
  material: Material;
}

// Door element
export interface Door {
  id: string;
  position: Point;
  width: number;
  height: number;
  rotation: number;
  wallId: string;
}

// Window element
export interface Window {
  id: string;
  position: Point;
  width: number;
  height: number;
  rotation: number;
  wallId: string;
  sillHeight: number;
}

// Room definition
export interface Room {
  id: string;
  points: Point[];
  label: string;
  area: number;
  color: string;
}

// Dimension line
export interface Dimension {
  id: string;
  start: Point;
  end: Point;
  label: string;
  offset: number;
}

// Complete building plan
export interface BuildingPlan {
  id: string;
  name: string;
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  dimensions: Dimension[];
  createdAt: Date;
  updatedAt: Date;
}

// 3D Model settings
export interface ModelSettings {
  wallHeight: number;
  wallThickness: number;
  defaultMaterial: Material;
  roofEnabled: boolean;
  roofStyle: 'flat' | 'gable' | 'hipped';
  floorEnabled: boolean;
}

// Stress test result
export interface StressResult {
  elementId: string;
  stressLevel: number; // 0-1, where 0 is safe, 1 is critical
  displacement: number;
  recommendation: string;
}

// Voice command
export interface VoiceCommand {
  intent: 'create' | 'modify' | 'test' | 'navigate' | 'build' | 'calculate' | 'search' | 'unknown';
  action: string;
  params: Record<string, unknown>;
  rawText: string;
}

// AI orb speaking state
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'showingPlan';

// Calculation result (real math, not mock)
export interface CalculationResult {
  id: string;
  title: string;
  category: 'structural' | 'physics' | 'cost';
  formula: string;
  inputs: { label: string; value: string }[];
  outputs: { label: string; value: string; unit: string }[];
  summary: string;
}

// Web search result
export interface SearchOutput {
  query: string;
  results: { title: string; url: string; snippet: string; source?: string }[];
}

// App settings (stored in localStorage, no backend)
export type LlmProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter';
export type SearchProvider = 'exa' | 'tavily' | 'brave';

export interface AppSettings {
  geminiKey: string;
  exaKey: string;
  llmProvider: LlmProvider;
  openaiKey: string;
  anthropicKey: string;
  groqKey: string;
  openrouterKey: string;
  searchProvider: SearchProvider;
  tavilyKey: string;
  braveKey: string;
}

// AI-generated plan structure (parsed from the LLM output)
export interface GeneratedPlan {
  name: string;
  style: string;
  era: 'ancient' | 'classic' | 'modern' | 'futuristic';
  wallMaterial: Material;
  wallHeight: number;
  rooms: {
    label: string;
    x: number;
    y: number;
    width: number;
    depth: number;
  }[];
  doors: { roomA: string; roomB: string; position?: string }[];
  windows: { room: string; count: number }[];
}

// Orb summon gesture (tap-and-hold anywhere)
export type HoldPhase = 'inactive' | 'charging' | 'held';

// AI chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// App state
export interface AppState {
  viewMode: ViewMode;
  currentTool: Tool;
  plan: BuildingPlan;
  modelSettings: ModelSettings;
  selectedElementId: string | null;
  isListening: boolean;
  orbState: OrbState;
  stressResults: StressResult[];
  chatHistory: ChatMessage[];
  showGrid: boolean;
  zoom: number;
  pan: Point;
  calculations: CalculationResult[];
  searchOutput: SearchOutput | null;
  lastGeneratedPlan: GeneratedPlan | null;
}
