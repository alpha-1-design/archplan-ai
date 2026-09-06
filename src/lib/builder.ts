import type { GeneratedPlan, Point } from '../types';
import { useAppStore } from '../stores/appStore';

export const GRID_SIZE = 20; // canvas units per meter

interface RectEdge {
  a: Point; // meters
  b: Point; // meters
  key: string;
  rectIndex: number;
}

const edgeKey = (a: Point, b: Point): string => {
  const p1 = a.x < b.x || (a.x === b.x && a.y <= b.y) ? a : b;
  const p2 = p1 === a ? b : a;
  return `${p1.x},${p1.y}|${p2.x},${p2.y}`;
};

const rectEdges = (r: { x: number; y: number; width: number; depth: number }, index: number): RectEdge[] => {
  const { x, y, width: w, depth: d } = r;
  const corners: Point[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ];
  return corners.map((c, i) => {
    const a = c;
    const b = corners[(i + 1) % 4];
    return { a, b, key: edgeKey(a, b), rectIndex: index };
  });
};

const toCanvas = (p: Point): Point => ({ x: Math.round(p.x * GRID_SIZE), y: Math.round(p.y * GRID_SIZE) });

const angleOf = (a: Point, b: Point): number => Math.atan2(b.y - a.y, b.x - a.x);

export interface BuildSummary {
  walls: number;
  rooms: number;
  doors: number;
  windows: number;
  totalArea: number;
  name: string;
  material: string;
}

/**
 * Turn an AI-generated plan into real elements in the plan store.
 * Shared edges between rooms dedupe into a single wall; doors land on
 * shared walls, windows land on exterior walls.
 */
export const applyGeneratedPlan = (plan: GeneratedPlan): BuildSummary => {
  const store = useAppStore.getState();

  // Reset the plan
  store.clearPlan();
  store.setProjectName(plan.name);
  store.setWallHeight(plan.wallHeight);
  store.setDefaultMaterial(plan.wallMaterial);

  // 1. Build edges + unique walls (dedupe shared edges)
  const allEdges = plan.rooms.flatMap((r, i) => rectEdges(r, i));
  const unique = new Map<string, RectEdge>();
  for (const edge of allEdges) {
    if (!unique.has(edge.key)) unique.set(edge.key, edge);
  }

  const wallByKey = new Map<string, string>();
  for (const edge of unique.values()) {
    const a = toCanvas(edge.a);
    const b = toCanvas(edge.b);
    const id = store.addWall({
      start: a,
      end: b,
      thickness: 0.2,
      height: plan.wallHeight,
      material: plan.wallMaterial,
    });
    wallByKey.set(edge.key, id);
  }

  // 2. Rooms
  for (const room of plan.rooms) {
    const corners: Point[] = [
      { x: room.x, y: room.y },
      { x: room.x + room.width, y: room.y },
      { x: room.x + room.width, y: room.y + room.depth },
      { x: room.x, y: room.y + room.depth },
    ];
    store.addRoom({
      points: corners.map(toCanvas),
      label: room.label,
      area: Math.round(room.width * room.depth * 10) / 10,
      color: `hsl(${Math.abs(hashCode(room.label)) % 360}, 50%, 25%)`,
    });
  }

  // 3. Doors on shared edges
  const roomEdgesByIndex = plan.rooms.map((_, i) =>
    allEdges.filter((e) => e.rectIndex === i).map((e) => e.key)
  );
  for (const door of plan.doors) {
    const idxA = plan.rooms.findIndex((r) => r.label === door.roomA);
    const idxB = plan.rooms.findIndex((r) => r.label === door.roomB);
    if (idxA === -1 || idxB === -1) continue;

    const shared = roomEdgesByIndex[idxA].find((key) => roomEdgesByIndex[idxB].includes(key));
    if (!shared) continue;

    const wallId = wallByKey.get(shared);
    const edge = allEdges.find((e) => e.key === shared);
    if (!edge || !wallId) continue;

    const mid = toCanvas({ x: (edge.a.x + edge.b.x) / 2, y: (edge.a.y + edge.b.y) / 2 });
    store.addDoor({
      position: mid,
      width: 0.9,
      height: 2.1,
      rotation: angleOf(edge.a, edge.b),
      wallId,
    });
  }

  // 4. Windows on exterior edges
  const allKeys = new Set(allEdges.map((e) => e.key));
  for (const spec of plan.windows) {
    const idx = plan.rooms.findIndex((r) => r.label === spec.room);
    if (idx === -1) continue;

    const exteriorEdges = roomEdgesByIndex[idx].filter((key) => {
      let occurrences = 0;
      for (const k of allKeys) if (k === key) occurrences++;
      return occurrences === 1;
    });

    const edges = allEdges.filter((e) => e.rectIndex === idx);
    const chosen = exteriorEdges.length > 0
      ? edges.filter((e) => exteriorEdges.includes(e.key))
      : edges;

    const count = Math.max(0, Math.min(spec.count || 0, chosen.length));
    for (let i = 0; i < count; i++) {
      const edge = chosen[i];
      const mid = toCanvas({ x: (edge.a.x + edge.b.x) / 2, y: (edge.a.y + edge.b.y) / 2 });
      const wallId = wallByKey.get(edge.key);
      store.addWindow({
        position: mid,
        width: 1.2,
        height: 1.0,
        rotation: angleOf(edge.a, edge.b),
        wallId: wallId || '',
        sillHeight: 0.9,
      });
    }
  }

  const totalArea = Math.round(plan.rooms.reduce((s, r) => s + r.width * r.depth, 0) * 10) / 10;
  return {
    walls: unique.size,
    rooms: plan.rooms.length,
    doors: plan.doors.length,
    windows: plan.windows.length,
    totalArea,
    name: plan.name,
    material: plan.wallMaterial,
  };
};

const hashCode = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Build a demo house instantly (used at first visit so there's something to see). */
export const buildDemoHouse = (): BuildSummary =>
  applyGeneratedPlan({
    name: 'Demo Residence',
    style: 'Modern',
    era: 'modern',
    wallMaterial: 'concrete',
    wallHeight: 3.0,
    rooms: [
      { label: 'Living Room', x: 0, y: 0, width: 5, depth: 4 },
      { label: 'Kitchen', x: 5, y: 0, width: 4, depth: 4 },
      { label: 'Master Bedroom', x: 0, y: 4, width: 5, depth: 4 },
      { label: 'Study', x: 5, y: 4, width: 4, depth: 2 },
      { label: 'Bathroom', x: 5, y: 6, width: 4, depth: 2 },
    ],
    doors: [
      { roomA: 'Living Room', roomB: 'Kitchen' },
      { roomA: 'Living Room', roomB: 'Master Bedroom' },
      { roomA: 'Master Bedroom', roomB: 'Study' },
      { roomA: 'Study', roomB: 'Bathroom' },
    ],
    windows: [
      { room: 'Living Room', count: 2 },
      { room: 'Master Bedroom', count: 1 },
      { room: 'Kitchen', count: 1 },
      { room: 'Bathroom', count: 1 },
    ],
  });