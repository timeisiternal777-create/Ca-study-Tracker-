// Real spring physics for the iOS feel.
//
// A spring is described the way SwiftUI does it: `response` (seconds for one natural swing) and `damping` (1 = glides in with no
// overshoot, lower = bounces). From that we solve the motion exactly (no frame-by-frame simulation), which gives two things:
//
//   * `linear()` curves for CSS transitions (the tokens in styles/ios.css were generated from these specs), and
//   * curves for gestures that start with the speed of your finger: let go of a sheet at a given velocity and it carries on at that
//     speed before it settles, instead of restarting from rest the way a fixed easing curve does.

export interface SpringSpec {
  /** Seconds for one natural oscillation. Smaller is stiffer and quicker. */
  response: number;
  /** 1 settles with no overshoot; below 1 it overshoots and rings. */
  damping: number;
}

/** The named springs the interface uses. styles/ios.css carries the same numbers as CSS tokens. */
export const SPRINGS = {
  /** Sheets, big layout moves: glides in, never bounces. */
  smooth: { response: 0.44, damping: 1 },
  /** Switches, sliding highlights, small controls: quick with a hint of overshoot. */
  snappy: { response: 0.34, damping: 0.82 },
  /** Playful pops (toasts, badges). */
  bouncy: { response: 0.46, damping: 0.62 },
  /** A pressed control springing back. */
  press: { response: 0.3, damping: 0.7 },
} as const satisfies Record<string, SpringSpec>;

export type SpringName = keyof typeof SPRINGS;

/**
 * Progress of a spring at time `t` seconds: 0 at the start, 1 when it has arrived (it may pass 1 on the way).
 * `v0` is the starting speed towards the target, measured in "whole distances per second" (a finger covering a fifth of the
 * remaining distance every tenth of a second is 2).
 */
export function springAt(spec: SpringSpec, t: number, v0 = 0): number {
  if (t <= 0) return 0;
  const w = (2 * Math.PI) / Math.max(0.01, spec.response);
  const z = Math.max(0.05, spec.damping);
  // Displacement from the target, starting at 1 (the whole way to go) and heading towards 0.
  const u0 = 1, du0 = -v0;
  let u: number;
  if (z >= 0.9999) {
    const c2 = du0 + w * u0;
    u = (u0 + c2 * t) * Math.exp(-w * t);
  } else {
    const wd = w * Math.sqrt(1 - z * z);
    const c2 = (du0 + z * w * u0) / wd;
    u = Math.exp(-z * w * t) * (u0 * Math.cos(wd * t) + c2 * Math.sin(wd * t));
  }
  return 1 - u;
}

/** How many samples each CSS token in styles/ios.css has: smooth enough to look like the real curve, few enough to keep the stylesheet small. */
export const TOKEN_POINTS = 44;

export interface SpringCurve {
  /** `linear(...)` easing, ready for a CSS transition or `element.animate`. */
  easing: string;
  /** Milliseconds until the spring has settled (use as the duration alongside `easing`). */
  duration: number;
  /** The sampled values (0 to 1, may exceed 1 when it overshoots). */
  values: number[];
}

const fmt = (n: number) => { const s = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''); return s === '-0' ? '0' : s; };

/** Samples a spring into a `linear()` curve. The duration is the moment it stays within 0.2 % of the target for good. */
export function springCurve(spec: SpringSpec, v0 = 0, points = 56): SpringCurve {
  // Find when it settles: the last instant it is further than epsilon from 1 (scan in 4 ms steps, cap at 3 s).
  const EPS = 0.002;
  let last = 0;
  for (let ms = 0; ms <= 3000; ms += 4) if (Math.abs(springAt(spec, ms / 1000, v0) - 1) > EPS) last = ms;
  const duration = Math.max(120, Math.ceil((last + 4) / 10) * 10);
  const n = Math.max(8, points);
  const values: number[] = [];
  for (let i = 0; i < n; i++) values.push(i === n - 1 ? 1 : springAt(spec, (duration * i) / (n - 1) / 1000, v0));
  return { easing: `linear(${values.map(fmt).join(', ')})`, duration, values };
}

/** The largest value the spring reaches (1 means no overshoot). */
export const overshootOf = (spec: SpringSpec, v0 = 0) => springCurve(spec, v0, 200).values.reduce((m, v) => Math.max(m, v), 0);

// ───────────────────────── rubber band ─────────────────────────

/**
 * The stretch you get when you pull past an edge: follows your finger at first, then gets harder and harder to pull
 * (the formula UIScrollView uses). `over` is how far past the edge the finger is, `dim` the size of the thing being pulled.
 */
export function rubber(over: number, dim: number, c = 0.55): number {
  if (over <= 0) return 0;
  const d = Math.max(1, dim);
  return (1 - 1 / ((over * c) / d + 1)) * d;
}

// ───────────────────────── finger speed ─────────────────────────

/** Remembers the last few pointer positions so the speed at the moment of release can be read. */
export class Velocity {
  private s: { t: number; v: number }[] = [];
  push(v: number, t = performance.now()) { this.s.push({ t, v }); while (this.s.length > 2 && t - this.s[0].t > 120) this.s.shift(); }
  reset() { this.s = []; }
  /** Pixels per millisecond over the last ~100 ms (positive = increasing). Zero if the finger stopped before letting go. */
  get(now = performance.now()): number {
    const s = this.s;
    if (s.length < 2) return 0;
    const a = s[0], b = s[s.length - 1];
    if (now - b.t > 90) return 0;
    const dt = b.t - a.t;
    return dt > 0 ? (b.v - a.v) / dt : 0;
  }
}
