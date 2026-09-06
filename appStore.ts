import { create } from 'zustand';
import type {
  AppState,
  Tool,
  ViewMode,
  Wall,
  Door,
  Window,
  Room,
  Dimension,
  Material,
  StressResult,
  ChatMessage,
  Point,
  OrbState,
  CalculationResult,
  SearchOutput,
  GeneratedPlan,
  HoldPhase,
} from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultPlan = {
  id: generateId(),
  name: 'Untitled Project',
  walls: [] as Wall[],
  doors: [] as Door[],
  windows: [] as Window[],
  rooms: [] as Room[],
  dimensions: [] as Dimension[],
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface AppStore extends AppState {
  // View mode
  setViewMode: (mode: ViewMode) => void;
  
  // Tool
  setCurrentTool: (tool: Tool) => void;

  // Tap-and-hold summon
  holdPhase: HoldPhase;
  holdProgress: number;
  startHold: () => void;
  advanceHold: (progress: number) => void;
  completeHold: () => void;
  cancelHold: () => void;
  activateVoice: () => void;
  
  // Plan operations
  addWall: (wall: Omit<Wall, 'id'>) => string;
  removeWall: (id: string) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  
  addDoor: (door: Omit<Door, 'id'>) => void;
  removeDoor: (id: string) => void;
  updateDoor: (id: string, updates: Partial<Door>) => void;
  
  addWindow: (window: Omit<Window, 'id'>) => void;
  removeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<Window>) => void;
  
  addRoom: (room: Omit<Room, 'id'>) => void;
  removeRoom: (id: string) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  
  addDimension: (dim: Omit<Dimension, 'id'>) => void;
  removeDimension: (id: string) => void;
  
  // Selection
  selectElement: (id: string | null) => void;
  
  // Voice
  setIsListening: (listening: boolean) => void;
  setOrbState: (state: OrbState) => void;
  
  // Stress results
  setStressResults: (results: StressResult[]) => void;
  
  // AI outputs
  addCalculation: (calc: CalculationResult) => void;
  removeCalculation: (id: string) => void;
  setSearchOutput: (output: SearchOutput | null) => void;
  setLastGeneratedPlan: (plan: GeneratedPlan | null) => void;
  
  // Chat
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  
  // Grid & view
  toggleGrid: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  
  // Model settings
  setWallHeight: (height: number) => void;
  setWallThickness: (thickness: number) => void;
  setDefaultMaterial: (material: Material) => void;
  
  // Project
  setProjectName: (name: string) => void;
  clearPlan: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  viewMode: '2d',
  currentTool: 'select',
  plan: defaultPlan,
  modelSettings: {
    wallHeight: 2.8,
    wallThickness: 0.2,
    defaultMaterial: 'concrete' as Material,
    roofEnabled: true,
    roofStyle: 'flat',
    floorEnabled: true,
  },
  selectedElementId: null,
  isListening: false,
  orbState: 'idle' as OrbState,
  stressResults: [],
  calculations: [],
  searchOutput: null,
  lastGeneratedPlan: null,
  chatHistory: [],
  showGrid: true,
  zoom: 1,
  pan: { x: 0, y: 0 },

  // Tap-and-hold summon state
  holdPhase: 'inactive' as HoldPhase,
  holdProgress: 0,
  startHold: () => set({ holdPhase: 'charging', holdProgress: 0 }),
  advanceHold: (p: number) => set({ holdProgress: p }),
  completeHold: () => set({ holdPhase: 'held', holdProgress: 1 }),
  cancelHold: () => set({ holdPhase: 'inactive', holdProgress: 0 }),
  activateVoice: () => set({ viewMode: 'ai', isListening: true, orbState: 'listening' as OrbState, holdPhase: 'inactive' as HoldPhase, holdProgress: 0 }),

  
  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  
  addWall: (wall) => {
    const id = generateId();
    set((state) => ({
      plan: {
        ...state.plan,
        walls: [...state.plan.walls, { ...wall, id }],
        updatedAt: new Date(),
      },
    }));
    return id;
  },
  
  removeWall: (id) => set((state) => ({
    plan: {
      ...state.plan,
      walls: state.plan.walls.filter((w) => w.id !== id),
      updatedAt: new Date(),
    },
  })),
  
  updateWall: (id, updates) => set((state) => ({
    plan: {
      ...state.plan,
      walls: state.plan.walls.map((w) => w.id === id ? { ...w, ...updates } : w),
      updatedAt: new Date(),
    },
  })),
  
  addDoor: (door) => set((state) => ({
    plan: {
      ...state.plan,
      doors: [...state.plan.doors, { ...door, id: generateId() }],
      updatedAt: new Date(),
    },
  })),
  
  removeDoor: (id) => set((state) => ({
    plan: {
      ...state.plan,
      doors: state.plan.doors.filter((d) => d.id !== id),
      updatedAt: new Date(),
    },
  })),
  
  updateDoor: (id, updates) => set((state) => ({
    plan: {
      ...state.plan,
      doors: state.plan.doors.map((d) => d.id === id ? { ...d, ...updates } : d),
      updatedAt: new Date(),
    },
  })),
  
  addWindow: (window) => set((state) => ({
    plan: {
      ...state.plan,
      windows: [...state.plan.windows, { ...window, id: generateId() }],
      updatedAt: new Date(),
    },
  })),
  
  removeWindow: (id) => set((state) => ({
    plan: {
      ...state.plan,
      windows: state.plan.windows.filter((w) => w.id !== id),
      updatedAt: new Date(),
    },
  })),
  
  updateWindow: (id, updates) => set((state) => ({
    plan: {
      ...state.plan,
      windows: state.plan.windows.map((w) => w.id === id ? { ...w, ...updates } : w),
      updatedAt: new Date(),
    },
  })),
  
  addRoom: (room) => set((state) => ({
    plan: {
      ...state.plan,
      rooms: [...state.plan.rooms, { ...room, id: generateId() }],
      updatedAt: new Date(),
    },
  })),
  
  removeRoom: (id) => set((state) => ({
    plan: {
      ...state.plan,
      rooms: state.plan.rooms.filter((r) => r.id !== id),
      updatedAt: new Date(),
    },
  })),
  
  updateRoom: (id, updates) => set((state) => ({
    plan: {
      ...state.plan,
      rooms: state.plan.rooms.map((r) => r.id === id ? { ...r, ...updates } : r),
      updatedAt: new Date(),
    },
  })),
  
  addDimension: (dim) => set((state) => ({
    plan: {
      ...state.plan,
      dimensions: [...state.plan.dimensions, { ...dim, id: generateId() }],
    },
  })),
  
  removeDimension: (id) => set((state) => ({
    plan: {
      ...state.plan,
      dimensions: state.plan.dimensions.filter((d) => d.id !== id),
    },
  })),
  
  selectElement: (id) => set({ selectedElementId: id }),
  
  setIsListening: (listening) => set({ isListening: listening }),
  setOrbState: (state) => set({ orbState: state }),
  
  setStressResults: (results) => set({ stressResults: results }),
  
  addCalculation: (calc) => set((state) => ({
    calculations: [calc, ...state.calculations].slice(0, 20),
  })),
  
  removeCalculation: (id) => set((state) => ({
    calculations: state.calculations.filter((c) => c.id !== id),
  })),
  
  setSearchOutput: (output) => set({ searchOutput: output }),
  
  setLastGeneratedPlan: (plan) => set({ lastGeneratedPlan: plan }),
  
  addChatMessage: (message) => set((state) => ({
    chatHistory: [
      ...state.chatHistory,
      { ...message, id: generateId(), timestamp: new Date() },
    ],
  })),
  
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  
  setWallHeight: (height) => set((state) => ({
    modelSettings: { ...state.modelSettings, wallHeight: height },
  })),
  
  setWallThickness: (thickness) => set((state) => ({
    modelSettings: { ...state.modelSettings, wallThickness: thickness },
  })),
  
  setDefaultMaterial: (material) => set((state) => ({
    modelSettings: { ...state.modelSettings, defaultMaterial: material },
  })),
  
  setProjectName: (name) => set((state) => ({
    plan: { ...state.plan, name, updatedAt: new Date() },
  })),
  
  clearPlan: () => set({ plan: defaultPlan, selectedElementId: null }),
}));
