// The motion governor.
//
// The app is allowed to keep moving all the time (drifting light, twinkling stars, sheens, flowing progress). To make sure that
// never costs smoothness, `<html data-motion>` says how much is allowed right now:
//
//   full  everything: the sky drifts, twinkles and has dust and the odd shooting star (lib/sky.ts), and every small loop runs
//   calm  the sky keeps only its stars, the big soft glows rest; small loops (flames, shimmer, breathing) stay
//   still no endless loops at all (one-shot feedback such as a button press still plays); the sky is one still picture
//
// "Auto" watches real frame times in short bursts and steps the level down when the device cannot keep up, and back up when it can.
// It never runs a permanent animation-frame loop: a burst is about a second, every twenty seconds, and only while the app is visible
// and the person is not touching it. Reduce motion (the setting or the device preference) always means "still".

import { useSyncExternalStore } from 'react';

export type MotionLevel = 'full' | 'calm' | 'still';
export type MotionPref = 'auto' | 'full' | 'calm';

const ORDER: MotionLevel[] = ['full', 'calm', 'still'];
const KEY = 'ca_motion_auto';

/** Below about 52 fps (median) a window counts as bad; at 57 fps or better, and few long frames, it counts as good. */
export const BAD_MEDIAN_MS = 19;
export const BAD_P90_MS = 28;
export const GOOD_MEDIAN_MS = 17.5;
export const GOOD_P90_MS = 22;

export interface Sample { n: number; median: number; p90: number; fps: number }
export type Verdict = 'bad' | 'good' | 'ok';

/** Pure: turn a list of frame gaps (ms) into numbers. Gaps over 250 ms are a hidden tab or a blocked thread, not rendering cost. */
export function summarise(gaps: number[]): Sample | null {
  const g = gaps.filter((x) => x > 0 && x < 250).sort((a, b) => a - b);
  if (g.length < 20) return null;
  const median = g[Math.floor(g.length / 2)];
  const p90 = g[Math.min(g.length - 1, Math.floor(g.length * 0.9))];
  return { n: g.length, median, p90, fps: 1000 / median };
}

export function verdictOf(s: Sample): Verdict {
  if (s.median > BAD_MEDIAN_MS || s.p90 > BAD_P90_MS) return 'bad';
  if (s.median <= GOOD_MEDIAN_MS && s.p90 <= GOOD_P90_MS) return 'good';
  return 'ok';
}

/** Pure state machine for the automatic level, so the stepping rules can be tested without a browser. */
export interface Gov { level: MotionLevel; bad: number; good: number; needGood: number; raised: boolean }
export const newGov = (level: MotionLevel = 'full'): Gov => ({ level, bad: 0, good: 0, needGood: 3, raised: false });
export function judge(g: Gov, v: Verdict): Gov {
  const i = ORDER.indexOf(g.level);
  if (v === 'bad') {
    const bad = g.bad + 1;
    if (bad >= 2 && i < ORDER.length - 1) {
      // After having stepped up once and fallen again, ask for more proof before trying again.
      return { level: ORDER[i + 1], bad: 0, good: 0, needGood: g.raised ? Math.min(g.needGood * 2, 12) : g.needGood, raised: g.raised };
    }
    return { ...g, bad, good: 0 };
  }
  if (v === 'good') {
    const good = g.good + 1;
    if (good >= g.needGood && i > 0) return { ...g, level: ORDER[i - 1], bad: 0, good: 0, raised: true };
    return { ...g, bad: 0, good };
  }
  return { ...g, bad: 0, good: 0 };
}

// ───────────────────────── runtime ─────────────────────────

interface Cfg { pref: MotionPref; reduce: boolean }
let cfg: Cfg = { pref: 'auto', reduce: false };
let gov: Gov = newGov(readAuto());
let current: MotionLevel = 'full';
let started = false;
let timer = 0;
let lastInput = 0;
const subs = new Set<() => void>();

function readAuto(): MotionLevel {
  try { const v = sessionStorage.getItem(KEY); if (v === 'full' || v === 'calm' || v === 'still') return v; } catch { /* private mode */ }
  return 'full';
}
const osReduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function levelNow(): MotionLevel {
  if (cfg.reduce || osReduce()) return 'still';
  return cfg.pref === 'auto' ? gov.level : cfg.pref;
}

function apply() {
  const next = levelNow();
  if (typeof document !== 'undefined') document.documentElement.dataset.motion = next;
  if (next === current) return;
  current = next;
  subs.forEach((f) => f());
}

export const getMotionLevel = (): MotionLevel => current;
export function subscribeMotion(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
export const useMotionLevel = (): MotionLevel => useSyncExternalStore(subscribeMotion, getMotionLevel, () => 'full');
/** What Auto has decided (even while a fixed choice is set). */
export const autoLevel = (): MotionLevel => gov.level;

export function configureMotion(next: Partial<Cfg>) {
  cfg = { ...cfg, ...next };
  apply();
  if (started) schedule(1500);
}

// ───────────────────────── measuring ─────────────────────────

const watchesAuto = () => cfg.pref === 'auto' && !cfg.reduce && !osReduce();

function measure(ms: number): Promise<Sample | null> {
  return new Promise((resolve) => {
    const gaps: number[] = [];
    const t0 = performance.now();
    let last = 0;
    const step = (now: number) => {
      if (document.visibilityState !== 'visible') { resolve(null); return; }
      // Frames while the person is touching the screen say nothing about the idle cost of the background.
      if (last && now - lastInput > 450) gaps.push(now - last);
      last = now;
      if (now - t0 < ms) requestAnimationFrame(step); else resolve(summarise(gaps));
    };
    requestAnimationFrame(step);
  });
}

function schedule(delay: number) {
  window.clearTimeout(timer);
  if (!watchesAuto() || document.visibilityState !== 'visible') return;
  timer = window.setTimeout(run, delay);
}

async function run() {
  if (!watchesAuto() || document.visibilityState !== 'visible') return;
  const s = await measure(1300);
  if (!s) { schedule(4000); return; }
  const before = gov.level;
  gov = judge(gov, verdictOf(s));
  if (gov.level !== before) {
    try { sessionStorage.setItem(KEY, gov.level); } catch { /* ignore */ }
    apply();
    schedule(3000);
  } else {
    schedule(gov.bad > 0 ? 2500 : 20000);
  }
}

/** Call once at start. Sets the first level straight away and begins watching. */
export function startMotion() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const note = () => { lastInput = performance.now(); };
  for (const t of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart', 'touchmove', 'scroll']) window.addEventListener(t, note, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(3000); else window.clearTimeout(timer); });
  if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => { apply(); schedule(1500); });
  apply();
  // The first window runs a little after the first screen has settled.
  schedule(2600);
}
