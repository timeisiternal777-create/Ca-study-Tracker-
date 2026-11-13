// How the school grounds follow the study data, as plain functions. One building per paper; one window per chapter-lantern.
import type { Level } from '../../types';
import { clamp } from '../../lib/format';
import { NEGLECT_DAYS } from '../voyage/progress';
import type { LandmarkId } from './art/landmarks/types';

/** The three parts of the school, one for each level. */
export const YEAR_NAME: Record<Level, string> = { foundation: 'The Lower Court', inter: 'The Upper Grounds', final: 'The High Keep' };
export const YEAR_SHORT: Record<Level, string> = { foundation: 'Lower Court', inter: 'Upper Grounds', final: 'High Keep' };

/** The stage the map is drawn on, in map units. The layers are placed in percentages of it, so it scales to its container. */
export const GROUNDS = { w: 1200, h: 680, rowA: 316, rowB: 556, horizon: 190, lane: 648 } as const;
/** The lamp lane along the bottom edge, where your best week and this week walk side by side. */
export const LANE = { x0: 150, x1: 1070, y: GROUNDS.lane } as const;

export const LANDMARK_ORDER: LandmarkId[] = ['counting', 'statute', 'orrery', 'market', 'tithe', 'toll', 'foundry', 'watch', 'vault', 'maptower'];

/** Which building each paper of the ICAI scheme gets. The picture is chosen for what the paper is about. */
const BY_SUBJECT: Record<string, LandmarkId> = {
  'f-accounts': 'counting', 'inter-accounts': 'counting', 'fin-fr': 'counting',
  'f-laws': 'statute', 'inter-laws': 'statute',
  'f-qa': 'orrery', 'fin-sfm': 'orrery',
  'f-eco': 'market',
  'inter-idt': 'tithe', 'fin-idt': 'tithe',
  'inter-dt': 'toll', 'fin-dt': 'toll',
  'inter-costing': 'foundry',
  'inter-audit': 'watch', 'fin-audit': 'watch',
  'inter-fm': 'vault',
  'inter-sm': 'maptower', 'fin-ibs': 'maptower',
};

/** A paper that is not part of the scheme (a custom subject) still gets a building: by its paper number. */
export function landmarkIdFor(subjectId: string, paperNumber: number): LandmarkId {
  return BY_SUBJECT[subjectId] ?? LANDMARK_ORDER[(Math.max(1, Math.floor(paperNumber) || 1) - 1) % LANDMARK_ORDER.length];
}

// ───────────────────────────── windows ─────────────────────────────

/**
 * How many of a building's windows are lit for a paper with `lit` of `total` lanterns. Never zero once anything is done, and never every
 * window until the paper really is finished.
 */
export function windowsLit(lit: number, total: number, slots: number): number {
  if (!(total > 0) || !(slots > 0)) return 0;
  let n = Math.round((clamp(lit, 0, total) / total) * slots);
  if (lit > 0 && n === 0) n = 1;
  if (lit < total && n >= slots) n = slots - 1;
  return clamp(n, 0, slots);
}

/** A fixed shuffle of 0..slots-1 for one building. Windows light in this order, so progress looks scattered rather than ruled, yet earlier windows never go out. */
export function slotOrder(seed: number, slots: number): number[] {
  let a = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const order = Array.from({ length: slots }, (_, i) => i);
  for (let i = slots - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}

/** Which window slots are lit, as the buildings' art expects it. */
export function litFlags(seed: number, n: number, slots: number): boolean[] {
  const flags = Array<boolean>(slots).fill(false);
  slotOrder(seed, slots).slice(0, clamp(n, 0, slots)).forEach((i) => { flags[i] = true; });
  return flags;
}

// ───────────────────────────── where things stand on the map ─────────────────────────────

export interface Spot { x: number; y: number; scale: number }

/** The widest building is about this many units across at full size (the Foundry). */
const WIDEST = 344;

/**
 * Two staggered rows, centred. x is the middle of the building, y is its ground line. The scale suits how many buildings there are, and
 * when there are many it shrinks until every building has room in its row and the whole school fits between the gate and the far edge.
 */
export function groundsLayout(count: number): Spot[] {
  if (count <= 0) return [];
  const cols = Math.ceil(count / 2);
  const wantStep = count >= 7 ? 250 : count >= 5 ? 300 : 330;
  let scale = count <= 4 ? 0.66 : count <= 6 ? 0.6 : 0.56;
  // with both rows full, the last building of the second row sticks out half a step beyond the first row's
  const extra = count % 2 === 0 ? 0.5 : 0;
  const room = GROUNDS.w - 150;
  let step = wantStep;
  for (let k = 0; k < 4; k++) {
    const span = cols - 1 + extra;
    step = span > 0 ? Math.min(wantStep, (room - WIDEST * scale) / span) : wantStep;
    if (step >= WIDEST * scale + 14) break;
    scale = Math.max(0.3, (step - 14) / WIDEST);
  }
  const raw = Array.from({ length: count }, (_, i) => Math.floor(i / 2) * step + (i % 2 ? step / 2 : 0));
  const shift = GROUNDS.w / 2 - (Math.min(...raw) + Math.max(...raw)) / 2;
  return raw.map((x, i) => ({ x: Math.round(x + shift), y: i % 2 ? GROUNDS.rowB : GROUNDS.rowA, scale }));
}

/** How far the ivy and dust have crept over a building that has not been visited for a while: 0 (none) to 1 (thick). */
export function neglectAmount(daysSince: number | null, neglected: boolean): number {
  if (!neglected || daysSince === null) return 0;
  return clamp((daysSince - NEGLECT_DAYS + 4) / 26, 0.18, 1);
}
