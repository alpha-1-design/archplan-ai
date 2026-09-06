import type { CalculationResult } from '../types';

const g = 9.81; // m/s²

const genId = () => Math.random().toString(36).substr(2, 9);

/** Extract first N numbers from a string, in order. */
const nums = (s: string): number[] => (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

const fmt = (n: number, digits = 2): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits }) as string;

// ---------------------------------------------------------------- Structural

/** Simply-supported beam with uniform load: M = wL²/8, σ = Mc/I, δ = 5wL⁴/(384EI) */
export function beamAnalysis(inputs: string, b = 0.3, h = 0.6): CalculationResult {
  const found = nums(inputs);
  const span = found[0] || 6; // m
  const w = found[1] || 20; // kN/m uniform load
  const E = 30e9; // Pa, C30 concrete
  const I = (b * Math.pow(h, 3)) / 12; // m⁴
  const M = (w * 1000 * span * span) / 8; // N·m
  const sigma = (M * (h / 2)) / I; // Pa
  const delta = (5 * w * 1000 * Math.pow(span, 4)) / (384 * E * I); // m
  const allowable = 10e6; // 10 MPa typical flexural capacity
  const safe = sigma < allowable;

  return {
    id: genId(),
    title: 'Beam — Bending & Deflection',
    category: 'structural',
    formula: 'M = wL²/8 · σ = Mc/I · δ = 5wL⁴/(384EI)',
    inputs: [
      { label: 'Span (L)', value: `${fmt(span)} m` },
      { label: 'Uniform load (w)', value: `${fmt(w)} kN/m` },
      { label: 'Section b × h', value: `${b} × ${h} m` },
    ],
    outputs: [
      { label: 'Bending moment', value: fmt(M / 1000), unit: 'kN·m' },
      { label: 'Section modulus I', value: fmt(I * 1e9), unit: '×10⁹ mm⁴' },
      { label: 'Max bending stress', value: fmt(sigma / 1e6), unit: 'MPa' },
      { label: 'Max deflection', value: `${fmt(delta * 1000)} mm (L/${fmt(span / delta)})`, unit: '' },
      { label: 'Status', value: safe ? 'SAFE' : 'OVER-STRESSED', unit: safe ? '≤ 10 MPa' : '> 10 MPa' },
    ],
    summary: `A ${fmt(span)} m span carrying ${fmt(w)} kN/m develops ${fmt(M / 1000)} kN·m. Max stress ${fmt(sigma / 1e6)} MPa — ${safe ? 'within' : 'exceeding'} the 10 MPa flexural allowance.`,
  };
}

/** Euler column buckling: Pcr = π²EI/(KL)² */
export function columnBuckling(inputs: string, b = 0.3, h = 0.3): CalculationResult {
  const found = nums(inputs);
  const L = found[0] || 3; // m
  const P = found[1] || 200; // kN applied
  const E = 30e9;
  const I = (b * Math.pow(h, 3)) / 12;
  const K = 1; // pinned-pinned
  const Pcr = (Math.PI * Math.PI * E * I) / Math.pow(K * L, 2);
  const safe = P * 1000 < Pcr * 0.6; // 0.6 safety factor

  return {
    id: genId(),
    title: 'Column — Euler Buckling',
    category: 'structural',
    formula: 'Pcr = π²EI/(KL)²',
    inputs: [
      { label: 'Column height', value: `${fmt(L)} m` },
      { label: 'Axial load (P)', value: `${fmt(P)} kN` },
      { label: 'Section b × h', value: `${b} × ${h} m` },
    ],
    outputs: [
      { label: 'Critical load Pcr', value: fmt(Pcr / 1000), unit: 'kN' },
      { label: 'Utilization (P/Pcr)', value: `${fmt((P * 1000) / Pcr * 100)}%`, unit: '' },
      { label: 'Status', value: safe ? 'SAFE' : 'BUCKLING RISK', unit: safe ? '≤ 60% Pcr' : '> 60% Pcr' },
    ],
    summary: `A ${fmt(L)} m column with ${b}×${h} m section buckles at ${fmt(Pcr / 1000)} kN. Your ${fmt(P)} kN load is ${fmt((P * 1000) / Pcr * 100)}% of critical — ${safe ? 'stable' : 'increase the section or add bracing'}.`,
  };
}

/** Wind load: q = ½ρv², F = q·Cd·A */
export function windLoad(inputs: string, A = 10): CalculationResult {
  const found = nums(inputs);
  const v = found[0] || 30; // m/s
  const rho = found[1] || 1.225; // kg/m³
  const Cd = (found[2] || 1.2) / 10; // drag coefficient (0.1–2.0)
  const q = 0.5 * rho * v * v;
  const F = q * Cd * A;

  return {
    id: genId(),
    title: 'Wind Load on Façade',
    category: 'structural',
    formula: 'q = ½ρv² · F = q·Cd·A',
    inputs: [
      { label: 'Wind speed (v)', value: `${fmt(v)} m/s (${fmt(v * 3.6)} km/h)` },
      { label: 'Air density (ρ)', value: `${fmt(rho)} kg/m³` },
      { label: 'Drag coeff. (Cd)', value: `${fmt(Cd)}` },
      { label: 'Façade area (A)', value: `${fmt(A)} m²` },
    ],
    outputs: [
      { label: 'Dynamic pressure q', value: fmt(q), unit: 'Pa' },
      { label: 'Total wind force', value: fmt(F / 1000), unit: 'kN' },
      { label: 'Force per m²', value: fmt(q * Cd), unit: 'Pa' },
    ],
    summary: `At ${fmt(v * 3.6)} km/h the dynamic pressure is ${fmt(q)} Pa. Your ${fmt(A)} m² façade experiences ${fmt(F / 1000)} kN of total wind force.`,
  };
}

// ------------------------------------------------------------------- Physics

/** Tsiolkovsky rocket equation: Δv = ve·ln(m0/m1), plus thrust & accel */
export function rocketLaunch(inputs: string): CalculationResult {
  const found = nums(inputs);
  const m0 = found[0] || 500; // kg total (wet)
  const mf = found[1] || 120; // kg dry
  const ve = found[2] || 2500; // m/s exhaust velocity
  const mdot = found[3] || 12; // kg/s mass flow
  const F = mdot * ve;
  const dv = ve * Math.log(m0 / mf);
  const a0 = F / m0 - g;
  // Burn time (constant flow)
  const tb = (m0 - mf) / mdot;
  const escapeV = Math.sqrt(2 * 6.674e-11 * 5.972e24 / 6371000) / 1000; // km/s

  return {
    id: genId(),
    title: 'Rocket Launch — Tsiolkovsky',
    category: 'physics',
    formula: 'Δv = ve·ln(m0/m1) · F = ṁ·ve',
    inputs: [
      { label: 'Wet mass (m0)', value: `${fmt(m0)} kg` },
      { label: 'Dry mass (m1)', value: `${fmt(mf)} kg` },
      { label: 'Exhaust velocity (ve)', value: `${fmt(ve)} m/s` },
      { label: 'Mass flow (ṁ)', value: `${fmt(mdot)} kg/s` },
    ],
    outputs: [
      { label: 'Thrust', value: fmt(F / 1000), unit: 'kN' },
      { label: 'Δv capability', value: fmt(dv / 1000, 1), unit: 'km/s' },
      { label: 'Liftoff accel', value: `${fmt(a0)} (${fmt(a0 / g)} g)`, unit: 'm/s²' },
      { label: 'Burn time', value: fmt(tb), unit: 's' },
      { label: 'Earth escape velocity', value: fmt(escapeV, 1), unit: 'km/s' },
    ],
    summary: `This rocket delivers ${fmt(F / 1000)} kN thrust and Δv of ${fmt(dv / 1000, 1)} km/s — ${dv / 1000 >= escapeV ? 'enough to escape Earth gravity' : 'not enough to reach escape velocity (' + fmt(escapeV, 1) + ' km/s needed)'}. Liftoff acceleration ${fmt(a0 / g)} g.`,
  };
}

/** Free-fall & impact: t = √(2h/g), v = √(2gh) */
export function freeFall(inputs: string): CalculationResult {
  const found = nums(inputs);
  const h = found[0] || 10;
  const t = Math.sqrt((2 * h) / g);
  const v = Math.sqrt(2 * g * h);

  return {
    id: genId(),
    title: 'Free Fall — Drop Impact',
    category: 'physics',
    formula: 't = √(2h/g) · v = √(2gh)',
    inputs: [{ label: 'Height (h)', value: `${fmt(h)} m` }],
    outputs: [
      { label: 'Fall time', value: fmt(t), unit: 's' },
      { label: 'Impact velocity', value: `${fmt(v)} m/s (${fmt(v * 3.6)} km/h)`, unit: '' },
      { label: 'Impact energy (per kg)', value: `${fmt(g * h)} J/kg`, unit: '' },
    ],
    summary: `Dropping from ${fmt(h)} m hits the ground at ${fmt(v)} m/s (${fmt(v * 3.6)} km/h) after ${fmt(t)} s — equivalent to a ${fmt(g * h)} J/kg impact.`,
  };
}

// --------------------------------------------------------------------- Cost

/** Material takeoff — slab + walls, concrete, rebar, brick, cost */
export function costEstimate(inputs: string): CalculationResult {
  const found = nums(inputs);
  const L = found[0] || 10;
  const W = found[1] || 8;
  const floors = found[2] || 1;
  const slabT = 0.15;
  const wallH = 2.8;
  const wallT = 0.2;
  const perimeter = 2 * (L + W);
  const slabVol = L * W * slabT * floors;
  const wallVol = perimeter * wallH * wallT * floors;
  const concreteVol = slabVol + wallVol;
  const rebarKg = concreteVol * 90; // ~90 kg rebar per m³ concrete
  const brickCount = Math.ceil(wallVol / (0.0069)); // ~0.23×0.11×0.075 m bricks (~6.9 L per brick incl mortar)
  const concreteCost = concreteVol * 180000; // $/m³ → local unit (NGN-ish rate)
  const rebarCost = rebarKg * 850;
  const brickCost = brickCount * 450;
  const total = concreteCost + rebarCost + brickCost;

  return {
    id: genId(),
    title: 'Material Takeoff & Cost',
    category: 'cost',
    formula: 'V = L·W·t + P·H·t · Rebar ≈ 90 kg/m³ · Bricks ≈ V/6.9L',
    inputs: [
      { label: 'Footprint (L × W)', value: `${L} × ${W} m` },
      { label: 'Floors', value: `${floors}` },
      { label: 'Wall height', value: `${wallH} m` },
    ],
    outputs: [
      { label: 'Slab concrete', value: fmt(slabVol), unit: 'm³' },
      { label: 'Wall concrete', value: fmt(wallVol), unit: 'm³' },
      { label: 'Total concrete', value: fmt(concreteVol), unit: 'm³' },
      { label: 'Rebar', value: fmt(rebarKg), unit: 'kg' },
      { label: 'Bricks', value: fmt(brickCount), unit: 'pcs' },
      { label: 'Est. cost', value: `₦${fmt(total / 1e6, 2)}M`, unit: '' },
    ],
    summary: `${floors}-storey ${L}×${W} m building needs ${fmt(concreteVol)} m³ concrete (${fmt(rebarKg)} kg rebar, ${fmt(brickCount)} bricks). Estimated cost ₦${fmt(total / 1e6, 2)}M at current rates.`,
  };
}

// ----------------------------------------------------------------- Dispatch

const CATEGORY_HINTS: { keys: string[]; fn: (s: string) => CalculationResult }[] = [
  { keys: ['beam', 'bend', 'floor slab', 'slab'], fn: beamAnalysis },
  { keys: ['column', 'buckl', 'pillar'], fn: columnBuckling },
  { keys: ['wind'], fn: windLoad },
  { keys: ['rocket', 'launch', 'thrust', 'delta v', 'tsiolkovsky'], fn: rocketLaunch },
  { keys: ['fall', 'drop', 'impact', 'gravity'], fn: freeFall },
  { keys: ['cost', 'price', 'estimate', 'budget', 'material takeoff', 'quote', 'nair'], fn: costEstimate },
];

/** Detect what to calculate from free text and run the real math. */
export const performCalculation = (request: string): CalculationResult | null => {
  const lower = request.toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.keys.some((k) => lower.includes(k))) {
      return hint.fn(request);
    }
  }
  return null;
};

/** Run the full structural sweep across all elements (used by stress test). */
export const runStructuralSweep = (wallCount: number, maxSpan: number, loadPerMeter: number) => {
  const base = beamAnalysis(String(maxSpan) + ' ' + String(loadPerMeter), 0.3, 0.5);
  const totalForce = maxSpan * loadPerMeter;
  const safetyFactor = totalForce > 0 ? (totalForce * 1.4) / maxSpan : 0;
  return { base, totalForce, safetyFactor, wallCount };
};