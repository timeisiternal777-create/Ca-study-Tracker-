// Paints the wallpaper (the colours come from wallpaper.ts). Only the canvas drawing calls are used, so the same code serves the app's canvas
// (lib/sky.ts) and the colour lab that is used to choose the skies.

import { POOL_A, POOL_B, POOL_STOPS, css, type Rgb, type SkyColours } from './wallpaper';

/** How strong the grain is: the opacity of the strongest speck. Enough to break up the steps of a dark gradient, too little to read as texture. */
export const GRAIN = 0.032;

/** A square tile of fine grain, light and dark specks, tiled over the wallpaper so a smooth gradient does not show bands. */
export function makeGrain(size = 160, seed = 7): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  let s = seed;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < size * size; i++) {
    const v = rnd(), light = v > 0.5;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = light ? 255 : 0;
    img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 255 * GRAIN);
  }
  g.putImageData(img, 0, 0);
  return c;
}

const rgba = (c: Rgb, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
/** How the corners darken, as (distance from the centre as a fraction of 0.78 of the screen, share of the vignette). It matches colourAt() in wallpaper.ts. */
const VIGNETTE_STOPS: readonly (readonly [number, number])[] = [[0, 0], [0.25, 0.0375], [0.5, 0.15], [0.75, 0.3375], [1, 0.6]];

/**
 * Lays the whole wallpaper down on a W x H canvas: the gradient, the horizon if the sky has one, the two pools of light, the soft dark corners and the grain.
 * `grain` may be null (the fallback copy in the stylesheet has none).
 */
export function paintWallpaper(g: CanvasRenderingContext2D, W: number, H: number, s: SkyColours, grain: CanvasImageSource | null) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';

  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, css(s.top)); base.addColorStop(0.5, css(s.mid)); base.addColorStop(1, css(s.bot));
  g.fillStyle = base; g.fillRect(0, 0, W, H);

  // The sea: the water below the horizon is a little deeper than the sky above it, and a soft glow lies along the line where they meet. No hard line: a
  // line would run through every card that crosses it.
  if (s.horizon > 0) {
    const y = s.horizon * H;
    const water = g.createLinearGradient(0, y, 0, H);
    water.addColorStop(0, 'rgba(1,14,20,0.30)'); water.addColorStop(0.6, 'rgba(1,14,20,0.12)'); water.addColorStop(1, 'rgba(1,14,20,0)');
    g.fillStyle = water; g.fillRect(0, y, W, H - y);
    const glow = g.createLinearGradient(0, y - H * 0.12, 0, y + H * 0.08);
    glow.addColorStop(0, 'rgba(120,214,206,0)'); glow.addColorStop(0.6, 'rgba(120,214,206,0.075)'); glow.addColorStop(1, 'rgba(120,214,206,0)');
    g.fillStyle = glow; g.fillRect(0, y - H * 0.12, W, H * 0.2);
  }

  const pool = (col: Rgb, a: number, cx: number, cy: number, r: { rx: number; ry: number }) => {
    if (a <= 0.001) return;
    g.save(); g.translate(cx * W, cy * H); g.scale(r.rx * W, r.ry * H);
    const k = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [d, v] of POOL_STOPS) k.addColorStop(d, rgba(col, a * v));
    g.fillStyle = k; g.fillRect(-1, -1, 2, 2); g.restore();
  };
  pool(s.a, s.aa, s.ax, s.ay, POOL_A);
  pool(s.b, s.ba, s.bx, s.by, POOL_B);

  if (s.vignette > 0.001) {
    g.save(); g.translate(W / 2, H / 2); g.scale(0.78 * W, 0.78 * H);
    const k = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [d, v] of VIGNETTE_STOPS) k.addColorStop(d, `rgba(0,0,0,${(s.vignette * v).toFixed(4)})`);
    g.fillStyle = k; g.fillRect(-1.3, -1.3, 2.6, 2.6); g.restore();
  }

  if (grain) {
    const p = g.createPattern(grain, 'repeat');
    if (p) { g.fillStyle = p; g.fillRect(0, 0, W, H); }
  }
  g.restore();
}
