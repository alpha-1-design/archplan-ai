import * as THREE from 'three';
import type { Material } from '../types';

const SIZE = 256;

const makeCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
};

/** Concrete — speckled grey with subtle cracks and stains. */
function concreteTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#6d7278';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // aggregate speckles
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const r = Math.random() * 2.2 + 0.3;
    const shade = 90 + Math.random() * 70;
    ctx.fillStyle = `rgba(${shade},${shade},${shade + 4},${0.25 + Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // darker stains
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(40,44,52,${0.05 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * SIZE, Math.random() * SIZE, 18 + Math.random() * 30, 10 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // hairline cracks
  ctx.strokeStyle = 'rgba(30,32,36,0.35)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = Math.random() * SIZE;
    let y = Math.random() * SIZE;
    ctx.moveTo(x, y);
    const segs = 4 + Math.floor(Math.random() * 5);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * 50;
      y += (Math.random() - 0.5) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Brick — running bond with mortar joints and per-brick tonal variation. */
function brickTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#3a3a3a'; // mortar
  ctx.fillRect(0, 0, SIZE, SIZE);
  const bw = 64; // brick width
  const bh = 28; // brick height
  for (let row = 0; row < Math.ceil(SIZE / bh); row++) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col < Math.ceil(SIZE / bw) + 1; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const base = 128 + Math.random() * 36;
      const r = base + 14 + Math.random() * 30;
      const gr = base - 12 + Math.random() * 24;
      const bl = base - 22 + Math.random() * 20;
      ctx.fillStyle = `rgb(${Math.min(200, r)},${Math.max(60, gr)},${Math.max(40, bl)})`;
      ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      // brick texture grain
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0,${Math.random() * 0.08})`;
        ctx.fillRect(x + 2 + Math.random() * (bw - 4), y + 2 + Math.random() * (bh - 4), 1.5, 1.5);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Wood — warm grain with plank seams. */
function woodTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#7c5a34';
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * SIZE;
    const len = 40 + Math.random() * 200;
    const width = 0.5 + Math.random() * 1.6;
    ctx.strokeStyle = `rgba(${70 + Math.random() * 60},${45 + Math.random() * 40},${20 + Math.random() * 30},${0.25 + Math.random() * 0.5})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 20 - 10, y);
    ctx.bezierCurveTo(SIZE * 0.3, y + (Math.random() - 0.5) * 12, SIZE * 0.6, y + (Math.random() - 0.5) * 12, SIZE * 0.3 + len, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }
  // plank seams
  ctx.strokeStyle = 'rgba(40,26,12,0.5)';
  ctx.lineWidth = 2;
  for (let y = 0; y < SIZE; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Steel — brushed finish with vertical machining lines. */
function steelTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, '#7a8494');
  grad.addColorStop(0.5, '#99a4b4');
  grad.addColorStop(1, '#7a8494');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const bright = Math.random() > 0.4;
    ctx.strokeStyle = bright ? `rgba(255,255,255,${0.05 + Math.random() * 0.12})` : `rgba(30,36,46,${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 60, y + 30 + Math.random() * 40);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Floor — large polished concrete with panel lines. */
function floorTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, '#232b38');
  grad.addColorStop(1, '#1a212e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 2000; i++) {
    const shade = 120 + Math.random() * 90;
    ctx.fillStyle = `rgba(${shade},${shade},${shade + 6},${0.10 + Math.random() * 0.3})`;
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1.6, 1.6);
  }
  // panel joints
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  const panel = 64;
  for (let x = 0; x <= SIZE; x += panel) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke();
  }
  for (let y = 0; y <= SIZE; y += panel) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const cache = new Map<Material, THREE.CanvasTexture>();

/** Get (and cache) the procedural texture for a material. */
export function getMaterialTexture(material: Material): THREE.CanvasTexture {
  let tex = cache.get(material);
  if (!tex) {
    switch (material) {
      case 'concrete': tex = concreteTexture(); break;
      case 'brick': tex = brickTexture(); break;
      case 'wood': tex = woodTexture(); break;
      case 'steel': tex = steelTexture(); break;
      case 'glass':
        // subtle glass sheen
        tex = steelTexture();
        break;
    }
    cache.set(material, tex);
  }
  return tex;
}

export function getFloorTexture(): THREE.CanvasTexture {
  return floorTexture();
}