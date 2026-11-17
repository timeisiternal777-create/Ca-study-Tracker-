// The colour engine behind the wallpaper. It has no DOM in it, so the tests can run every hour of the day through it.
//
// The wallpaper is a calm field of colour: one vertical gradient and two soft pools of light, fine grain on top. Nothing on it moves and nothing on it is
// small enough to be mistaken for content (the old sky had stars, dust and sparkles, and they showed through every card). What it does do is follow the
// day: Everyday turns from night indigo through first light, morning, daylight, golden hour and dusk, the way a weather app's sky does. The two story
// worlds keep one sky each (the sea at night, the school at night).
//
// Everything that is drawn on the wallpaper is dark enough that the text colours in the stylesheet stay legible on a card laid over ANY part of it, at any
// hour. scripts/test.mjs checks that by sampling this module, so a colour change here cannot quietly break reading.

export type Rgb = readonly [number, number, number];
export type WallWorld = 'default' | 'voyage' | 'academy';
export type SkyMode = 'day' | 'night';

export interface SkyColours {
  /** What the sky is called right now ("Golden hour"). */
  name: string;
  /** The vertical gradient, top to bottom. */
  top: Rgb; mid: Rgb; bot: Rgb;
  /** Pool A (low, towards the menu side) and pool B (high, on the far side), with their strength (0 to 1). */
  a: Rgb; aa: number; ax: number; ay: number;
  b: Rgb; ba: number; bx: number; by: number;
  /** Where the horizon sits as a fraction of the height, or 0 for none (the sea has one). */
  horizon: number;
  /** How much the corners are darkened (0 to 1). */
  vignette: number;
}

export const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const css = (c: Rgb): string => `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`;
export const toHex = (c: Rgb): string => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ───────────────────────── legibility maths ─────────────────────────

const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
/** WCAG relative luminance. */
export const luminance = (c: Rgb): number => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
/** WCAG contrast ratio between two opaque colours (1 to 21). */
export function contrast(x: Rgb, y: Rgb): number {
  const a = luminance(x), b = luminance(y);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
/** `fg` laid over `bg` at `alpha`. */
export const over = (fg: Rgb, alpha: number, bg: Rgb): Rgb => mixRgb(bg, fg, Math.max(0, Math.min(1, alpha)));

// ───────────────────────── the skies ─────────────────────────

interface Key { h: number; name: string; top: string; mid: string; bot: string; a: string; aa: number; ba: number }

/** The Everyday sky through the day. Hours are local time; 24 repeats 0 so the day wraps without a seam. */
const DAY: Key[] = [
  { h: 0, name: 'Night', top: '#070915', mid: '#0c1024', bot: '#151b3c', a: '#4256d0', aa: 0.38, ba: 0.25 },
  { h: 5, name: 'Night', top: '#070915', mid: '#0c1024', bot: '#151b3c', a: '#4256d0', aa: 0.38, ba: 0.25 },
  { h: 6.25, name: 'First light', top: '#0e0b20', mid: '#1a1230', bot: '#2c1a3b', a: '#dc5f7e', aa: 0.34, ba: 0.22 },
  { h: 8.5, name: 'Morning', top: '#09111f', mid: '#0d1f38', bot: '#123052', a: '#3f8fd0', aa: 0.32, ba: 0.22 },
  { h: 12.5, name: 'Daylight', top: '#0a1426', mid: '#10284a', bot: '#18406a', a: '#5599e0', aa: 0.33, ba: 0.22 },
  { h: 16.25, name: 'Daylight', top: '#0a1426', mid: '#10284a', bot: '#18406a', a: '#5599e0', aa: 0.33, ba: 0.22 },
  { h: 17.75, name: 'Golden hour', top: '#0e0c20', mid: '#1f1527', bot: '#34202a', a: '#ee9f44', aa: 0.36, ba: 0.22 },
  { h: 19.25, name: 'Dusk', top: '#0d0a21', mid: '#1c1032', bot: '#321742', a: '#de4f98', aa: 0.34, ba: 0.23 },
  { h: 21.25, name: 'Night', top: '#070915', mid: '#0c1024', bot: '#151b3c', a: '#4256d0', aa: 0.38, ba: 0.25 },
  { h: 24, name: 'Night', top: '#070915', mid: '#0c1024', bot: '#151b3c', a: '#4256d0', aa: 0.38, ba: 0.25 },
];

/** The names the Settings screen can show, in the order of the day. */
export const SKY_NAMES = ['Night', 'First light', 'Morning', 'Daylight', 'Golden hour', 'Dusk'] as const;

const SEA: SkyColours = {
  name: 'Night at sea', top: hex('#03111a'), mid: hex('#06242f'), bot: hex('#0a3a47'),
  a: hex('#1db3a4'), aa: 0.32, ax: 0.08, ay: 1.02, b: hex('#f2c25c'), ba: 0.17, bx: 0.1, by: -0.04, horizon: 0.74, vignette: 0.34,
};
const SCHOOL: SkyColours = {
  name: 'Night at the school', top: hex('#080720'), mid: hex('#120c2e'), bot: hex('#231242'),
  a: hex('#f6b25a'), aa: 0.28, ax: 0.08, ay: 1.02, b: hex('#a99cff'), ba: 0.22, bx: 0.94, by: -0.04, horizon: 0, vignette: 0.34,
};

const nearest = (hour: number): Key => {
  let best = DAY[0], d = 99;
  for (const k of DAY) { const x = Math.abs(k.h - hour); if (x < d) { d = x; best = k; } }
  return best;
};

/**
 * The sky for a world at an hour (0 to 24, fractions allowed). `b` is the second pool's colour: the accent's partner colour in Everyday and the
 * student's house colour in the school. `mode: 'night'` pins Everyday to its night sky.
 */
export function skyAt(hour: number, world: WallWorld, b: Rgb, mode: SkyMode = 'day'): SkyColours {
  if (world === 'voyage') return { ...SEA };
  if (world === 'academy') return { ...SCHOOL, b };
  const h = mode === 'night' ? 0 : ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < DAY.length - 2 && h >= DAY[i + 1].h) i++;
  const k0 = DAY[i], k1 = DAY[i + 1];
  const t = k1.h === k0.h ? 0 : (h - k0.h) / (k1.h - k0.h);
  // Ease the blend so the sky lingers on its named moments and changes in between.
  const e = t * t * (3 - 2 * t);
  const m = (p: 'top' | 'mid' | 'bot' | 'a') => mixRgb(hex(k0[p]), hex(k1[p]), e);
  return {
    name: nearest(h).name,
    top: m('top'), mid: m('mid'), bot: m('bot'),
    a: m('a'), aa: lerp(k0.aa, k1.aa, e), ax: 0.08, ay: 1.02,
    b, ba: lerp(k0.ba, k1.ba, e), bx: 0.94, by: -0.04,
    horizon: 0, vignette: 0.34,
  };
}

/** Blend two skies (for the slow change between hours, or when the world or accent changes). */
export function mixSky(x: SkyColours, y: SkyColours, t: number): SkyColours {
  return {
    name: t < 0.5 ? x.name : y.name,
    top: mixRgb(x.top, y.top, t), mid: mixRgb(x.mid, y.mid, t), bot: mixRgb(x.bot, y.bot, t),
    a: mixRgb(x.a, y.a, t), aa: lerp(x.aa, y.aa, t), ax: lerp(x.ax, y.ax, t), ay: lerp(x.ay, y.ay, t),
    b: mixRgb(x.b, y.b, t), ba: lerp(x.ba, y.ba, t), bx: lerp(x.bx, y.bx, t), by: lerp(x.by, y.by, t),
    horizon: lerp(x.horizon, y.horizon, t), vignette: lerp(x.vignette, y.vignette, t),
  };
}

/** How a pool of light fades from its centre (0) to its edge (1). The painter and the sampler below both use these stops, so the tests see what the screen shows. */
export const POOL_STOPS: readonly (readonly [number, number])[] = [[0, 1], [0.22, 0.74], [0.5, 0.36], [0.76, 0.1], [1, 0]];
export const poolAt = (d: number): number => {
  if (d >= 1) return 0;
  for (let i = 1; i < POOL_STOPS.length; i++) {
    const [d1, v1] = POOL_STOPS[i], [d0, v0] = POOL_STOPS[i - 1];
    if (d <= d1) return lerp(v0, v1, (d - d0) / (d1 - d0));
  }
  return 0;
};
/** The pools' size: radii as a fraction of the width and of the height. */
export const POOL_A = { rx: 0.78, ry: 0.95 } as const;
export const POOL_B = { rx: 0.62, ry: 0.8 } as const;

/** The colour of the wallpaper at a point (fractions of the width and height), as the painter lays it down, grain not included. */
export function colourAt(s: SkyColours, fx: number, fy: number): Rgb {
  const y = Math.max(0, Math.min(1, fy));
  let c = y < 0.5 ? mixRgb(s.top, s.mid, y / 0.5) : mixRgb(s.mid, s.bot, (y - 0.5) / 0.5);
  const pool = (col: Rgb, a: number, cx: number, cy: number, r: { rx: number; ry: number }) => {
    const d = Math.hypot((fx - cx) / r.rx, (fy - cy) / r.ry);
    c = mixRgb(c, col, a * poolAt(d));
  };
  pool(s.a, s.aa, s.ax, s.ay, POOL_A);
  pool(s.b, s.ba, s.bx, s.by, POOL_B);
  // the corners are darkened (a radial fall-off from the centre of the screen)
  const dc = Math.min(1, Math.hypot(fx - 0.5, fy - 0.5) / 0.78);
  return mixRgb(c, [0, 0, 0], s.vignette * dc * dc * 0.6);
}

/** The lightest the wallpaper gets anywhere, as a luminance (for the legibility tests). */
export function brightest(s: SkyColours): { lum: number; at: [number, number] } {
  let best = { lum: -1, at: [0, 0] as [number, number] };
  for (let ix = 0; ix <= 12; ix++) for (let iy = 0; iy <= 8; iy++) {
    const fx = ix / 12, fy = iy / 8, l = luminance(colourAt(s, fx, fy));
    if (l > best.lum) best = { lum: l, at: [fx, fy] };
  }
  return best;
}

// ───────────────────────── glass (the Clear to Tinted slider, as in iOS 27) ─────────────────────────

export interface GlassLook {
  /** Strength of the tint over what is behind the glass (0 clear, 1 solid). */
  bg: number; bgSolid: number; panel: number;
  /** Blur radius in px and colour boost. */
  blur: number; saturate: number;
}
/** 0 is "clear" (a light tint, more of the wallpaper coming through), 100 is "tinted" (a deeper tint that keeps text crisp). */
export function glassLook(level: number): GlassLook {
  const k = Math.max(0, Math.min(100, Number.isFinite(level) ? level : 55)) / 100;
  return {
    bg: 0.34 + 0.56 * k, bgSolid: 0.62 + 0.36 * k, panel: 0.3 + 0.54 * k,
    blur: 14 + 16 * k, saturate: 1.85 - 0.5 * k,
  };
}
export const GLASS_DEFAULT = 55;
export const normaliseGlass = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : GLASS_DEFAULT);

/** The hour as a fraction (14:30 is 14.5). */
export const hourOf = (d: Date): number => d.getHours() + d.getMinutes() / 60;
