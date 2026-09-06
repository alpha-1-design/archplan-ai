import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import type { Point, Wall, Door, Window, Room, Dimension } from '../../types';

const GRID_SIZE = 20;
const SNAP_TO_GRID = true;

const HOLD_COMPLETE_TIME = 700; // ms before orb activates

const snapToGrid = (value: number): number => {
  if (!SNAP_TO_GRID) return value;
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

const calculateDistance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const calculatePolygonArea = (points: Point[]): number => {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2) / (GRID_SIZE * GRID_SIZE);
};

export function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [roomPoints, setRoomPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

  const {
    currentTool,
    plan,
    showGrid,
    addWall,
    addDoor,
    addWindow,
    addRoom,
    addDimension,
    removeWall,
    selectElement,
    zoom,
    pan,
    holdPhase,
    holdProgress,
    startHold,
    advanceHold,
    completeHold,
    cancelHold,
    activateVoice,
  } = useAppStore();

  // Resize handler
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Get canvas coordinates from mouse event
  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: snapToGrid((e.clientX - rect.left - pan.x) / zoom),
      y: snapToGrid((e.clientY - rect.top - pan.y) / zoom),
    };
  }, [zoom, pan]);

  // Tap-and-hold (or drag-hold) anywhere on the canvas summons the orb.
  // A short tap falls through to normal drawing semantics.
  const holdStartRef = useRef<number | null>(null);
  const holdRAFRef = useRef<number | null>(null);
  const holdFiredRef = useRef(false);

  const stopHoldLoop = useCallback(() => {
    if (holdRAFRef.current != null) {
      cancelAnimationFrame(holdRAFRef.current);
      holdRAFRef.current = null;
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    holdStartRef.current = Date.now();
    holdFiredRef.current = false;
    startHold();

    const tick = () => {
      if (holdStartRef.current == null) return;
      const p = Math.min(1, (Date.now() - holdStartRef.current) / HOLD_COMPLETE_TIME);
      advanceHold(p);
      if (p >= 1) {
        holdFiredRef.current = true;
        completeHold();
        cancelHold();
        activateVoice();
        return;
      }
      holdRAFRef.current = requestAnimationFrame(tick);
    };
    holdRAFRef.current = requestAnimationFrame(tick);
  }, [getCanvasPoint, startHold, advanceHold, completeHold, cancelHold, activateVoice]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    setMousePos(point);

    if (isDrawing && startPoint) {
      setCurrentPoint(point);
    }
  }, [isDrawing, startPoint, getCanvasPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const heldMs = holdStartRef.current ? Date.now() - holdStartRef.current : 0;
    holdStartRef.current = null;
    stopHoldLoop();

    // The orb fired mid-hold — swallow everything after it.
    if (holdFiredRef.current) {
      holdFiredRef.current = false;
      cancelHold();
      return;
    }
    cancelHold();

    // Long-hold released just after activation: also treat as summon.
    if (heldMs >= HOLD_COMPLETE_TIME) {
      activateVoice();
      return;
    }

    const point = getCanvasPoint(e);

    // Wall / dimension use a press-drag-release lifecycle.
    if (currentTool === 'wall' || currentTool === 'dimension') {
      if (isDrawing && startPoint && currentPoint) {
        const distance = calculateDistance(startPoint, currentPoint);
        if (currentTool === 'wall' && distance > GRID_SIZE) {
          addWall({
            start: startPoint,
            end: currentPoint,
            thickness: 0.2,
            height: 2.8,
            material: 'concrete',
          });
        } else if (currentTool === 'dimension' && distance > GRID_SIZE) {
          const label = `${(distance / GRID_SIZE).toFixed(1)}m`;
          addDimension({
            start: startPoint,
            end: currentPoint,
            label,
            offset: 20,
          });
        }
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
      } else {
        setIsDrawing(true);
        setStartPoint(point);
        setCurrentPoint(point);
      }
      return;
    }

    // Remaining tools act on a short tap.
    if (currentTool === 'room') {
      setRoomPoints((prev) => [...prev, point]);
    } else if (currentTool === 'door') {
      addDoor({
        position: point,
        width: 0.9,
        height: 2.1,
        rotation: 0,
        wallId: '',
      });
    } else if (currentTool === 'window') {
      addWindow({
        position: point,
        width: 1.2,
        height: 1.0,
        rotation: 0,
        wallId: '',
        sillHeight: 0.9,
      });
    } else if (currentTool === 'select') {
      const clickedWall = plan.walls.find((w) => {
        const dist = pointToLineDistance(point, w.start, w.end);
        return dist < 10;
      });
      if (clickedWall) {
        selectElement(clickedWall.id);
      } else {
        selectElement(null);
      }
    } else if (currentTool === 'erase') {
      const target = plan.walls.find((w) => pointToLineDistance(point, w.start, w.end) < 10);
      if (target) removeWall(target.id);
    }
  }, [getCanvasPoint, stopHoldLoop, cancelHold, activateVoice, currentTool, addDoor, addWindow, addWall, addDimension, removeWall, selectElement, plan.walls, isDrawing, startPoint, currentPoint]);

  useEffect(() => {
    return () => {
      if (holdRAFRef.current != null) {
        cancelAnimationFrame(holdRAFRef.current);
        holdRAFRef.current = null;
      }
    };
  }, []);

  // Complete room on double click
  const handleDoubleClick = useCallback(() => {
    if (currentTool === 'room' && roomPoints.length >= 3) {
      const area = calculatePolygonArea(roomPoints);
      addRoom({
        points: roomPoints,
        label: `Room ${plan.rooms.length + 1}`,
        area,
        color: `hsl(${(plan.rooms.length * 60) % 360}, 50%, 20%)`,
      });
      setRoomPoints([]);
    }
  }, [currentTool, roomPoints, addRoom, plan.rooms.length]);

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context for transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvas.width / zoom, canvas.height / zoom);
    }

    // Draw dimensions
    plan.dimensions.forEach((dim) => {
      drawDimension(ctx, dim);
    });

    // Draw rooms
    plan.rooms.forEach((room) => {
      drawRoom(ctx, room);
    });

    // Draw walls
    plan.walls.forEach((wall) => {
      drawWall(ctx, wall);
    });

    // Draw doors
    plan.doors.forEach((door) => {
      drawDoor(ctx, door);
    });

    // Draw windows
    plan.windows.forEach((window) => {
      drawWindow(ctx, window);
    });

    // Draw room being created
    if (currentTool === 'room' && roomPoints.length > 0) {
      drawRoomPreview(ctx, roomPoints, mousePos);
    }

    // Draw current wall being created
    if (isDrawing && startPoint && currentPoint) {
      drawWallPreview(ctx, startPoint, currentPoint);
    }

    // Draw crosshair at mouse position
    drawCrosshair(ctx, mousePos);

    ctx.restore();
  }, [plan, showGrid, isDrawing, startPoint, currentPoint, roomPoints, mousePos, zoom, pan, currentTool, holdPhase, holdProgress]);

  return (
    <motion.div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Coordinate display */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-1.5 text-[10px] font-mono text-cyan/70">
        X: {(mousePos.x / GRID_SIZE).toFixed(1)}m | Y: {(mousePos.y / GRID_SIZE).toFixed(1)}m
      </div>

      {/* Tool hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass rounded-lg px-4 py-2 text-xs text-gray-300">
        {getToolHint(currentTool)}
      </div>
    </motion.div>
  );
}

// Drawing functions
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
  ctx.lineWidth = 0.5;

  // Small grid
  for (let x = 0; x < width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Large grid
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += GRID_SIZE * 5) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += GRID_SIZE * 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawWall(ctx: CanvasRenderingContext2D, wall: Wall) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const thickness = wall.thickness * GRID_SIZE;

  ctx.save();
  ctx.translate(wall.start.x, wall.start.y);
  ctx.rotate(angle);

  // Wall fill
  ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
  ctx.fillRect(0, -thickness / 2, length, thickness);

  // Wall outline
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -thickness / 2, length, thickness);

  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, door: Door) {
  const { position, width, rotation } = door;
  const doorWidth = width * GRID_SIZE;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  // Door opening
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(-doorWidth / 2, -2, doorWidth, 4);

  // Door arc
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-doorWidth / 2, 0, doorWidth, -Math.PI / 2, 0);
  ctx.stroke();

  ctx.restore();
}

function drawWindow(ctx: CanvasRenderingContext2D, window: Window) {
  const { position, width, rotation } = window;
  const windowWidth = width * GRID_SIZE;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  // Window opening
  ctx.fillStyle = 'rgba(14, 165, 233, 0.3)';
  ctx.fillRect(-windowWidth / 2, -3, windowWidth, 6);

  // Window outline
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.strokeRect(-windowWidth / 2, -3, windowWidth, 6);

  // Window cross
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, 3);
  ctx.stroke();

  ctx.restore();
}

function drawRoom(ctx: CanvasRenderingContext2D, room: Room) {
  if (room.points.length < 3) return;

  ctx.fillStyle = room.color + '44';
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(room.points[0].x, room.points[0].y);
  room.points.forEach((point, i) => {
    if (i > 0) ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Room label
  const centerX = room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length;
  const centerY = room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length;
  
  ctx.fillStyle = '#00d4ff';
  ctx.font = '12px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.fillText(room.label, centerX, centerY - 8);
  ctx.fillStyle = '#ffffff88';
  ctx.font = '10px JetBrains Mono';
  ctx.fillText(`${room.area.toFixed(1)} m²`, centerX, centerY + 8);
}

function drawDimension(ctx: CanvasRenderingContext2D, dim: Dimension) {
  const dx = dim.end.x - dim.start.x;
  const dy = dim.end.y - dim.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const offset = dim.offset;

  ctx.save();
  ctx.translate(dim.start.x, dim.start.y);
  ctx.rotate(angle);

  // Dimension line
  ctx.strokeStyle = '#ffb800';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, -offset);
  ctx.lineTo(length, -offset);
  ctx.stroke();
  ctx.setLineDash([]);

  // Extension lines
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -offset - 5);
  ctx.moveTo(length, 0);
  ctx.lineTo(length, -offset - 5);
  ctx.stroke();

  // Dimension text
  ctx.fillStyle = '#ffb800';
  ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.fillText(dim.label, length / 2, -offset - 8);

  ctx.restore();
}

function drawWallPreview(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Distance preview
  const distance = calculateDistance(start, end);
  const label = `${(distance / GRID_SIZE).toFixed(1)}m`;
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 12px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.fillText(label, centerX, centerY - 15);
}

function drawRoomPreview(ctx: CanvasRenderingContext2D, points: Point[], current: Point) {
  if (points.length === 0) return;

  ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(current.x, current.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw points
  points.forEach((point, i) => {
    ctx.fillStyle = i === 0 ? '#2ed573' : '#00d4ff';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCrosshair(ctx: CanvasRenderingContext2D, point: Point) {
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
  ctx.lineWidth = 1;

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(point.x - 15, point.y);
  ctx.lineTo(point.x + 15, point.y);
  ctx.stroke();

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - 15);
  ctx.lineTo(point.x, point.y + 15);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = '#00d4ff';
  ctx.beginPath();
  ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
  ctx.fill();
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) return calculateDistance(point, lineStart);
  
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return calculateDistance(point, { x: projX, y: projY });
}

function getToolHint(tool: string): string {
  const hints: Record<string, string> = {
    select: 'Click to select elements',
    wall: 'Click and drag to draw walls',
    room: 'Click corners, double-click to complete',
    door: 'Click on a wall to place door',
    window: 'Click on a wall to place window',
    dimension: 'Click and drag to measure',
    erase: 'Click elements to delete',
  };
  return hints[tool] || '';
}
