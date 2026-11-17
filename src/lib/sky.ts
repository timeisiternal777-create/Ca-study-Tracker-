// The wallpaper: one canvas behind the whole app, painted rarely.
//
// It used to be a living sky (drifting light, twinkling stars, dust, shooting stars) redrawn twenty times a second. That made every card look like it
// floated over noise, and everything that sat on top of it had to be blended again each time it moved. The wallpaper is now what an iOS wallpaper is:
// a calm field of colour, painted once per size or colour change, with fine grain to keep dark gradients from banding (lib/wallpaperPaint.ts). The
// only thing that ever changes on it is its colour, and that changes slowly: Everyday follows the hour of the day (lib/wallpaper.ts), and when the
// colours change (the hour, the accent, the world, the house) the canvas eases from the old picture to the new one over about a second.
//
// A world may add a still picture on top (Lanternfell's school); it is painted into the same canvas, so it costs nothing per frame either.
// The motion level only decides whether the colour change is eased (full, calm) or instant (still, and Reduce motion).

import { hex, hourOf, mixSky, skyAt, toHex, type Rgb, type SkyColours, type SkyMode, type WallWorld } from './wallpaper';
import { makeGrain, paintWallpaper } from './wallpaperPaint';

export type SkyLevel = 'full' | 'calm' | 'still';
/** Paints an extra still picture onto the wallpaper. Called with the canvas's own context and size whenever the wallpaper is painted. */
export type StillPainter = (g: CanvasRenderingContext2D, width: number, height: number) => void;
export interface Sky {
  setLevel(level: SkyLevel): void;
  /** Adds (or, with null, removes) a still picture on the wallpaper. Lanternfell's school. */
  setStill(paint: StillPainter | null): void;
  /** Re-read the world, accent, house and wallpaper mode (call after any of them changes). */
  refresh(): void;
  destroy(): void;
}

const root = () => document.documentElement;
const readWorld = (): WallWorld => { const w = root().getAttribute('data-world'); return w === 'voyage' || w === 'academy' ? w : 'default'; };
const readMode = (): SkyMode => (root().getAttribute('data-wallpaper') === 'night' ? 'night' : 'day');

/** The second pool of light takes the accent's partner colour (the house colour in the school). */
function readPartner(): Rgb {
  const p = getComputedStyle(root()).getPropertyValue('--a2-rgb').trim().split(/[\s,]+/).map(Number);
  return p.length >= 3 && p.slice(0, 3).every(Number.isFinite) ? [p[0], p[1], p[2]] : hex('#9c8cff');
}

/** The sky to show now. */
export function currentSky(): SkyColours { return skyAt(hourOf(new Date()), readWorld(), readPartner(), readMode()); }

/**
 * Puts the sky's colours on <html> as custom properties, which the stylesheet's own copy of the wallpaper uses until the canvas has painted
 * (and when scripts are slow), and sets the browser's theme colour to the top of the sky.
 */
export function applySkyVars(s: SkyColours) {
  const st = root().style, rgb = (c: Rgb) => `${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])}`;
  st.setProperty('--wp-top', `rgb(${rgb(s.top)})`); st.setProperty('--wp-mid', `rgb(${rgb(s.mid)})`); st.setProperty('--wp-bot', `rgb(${rgb(s.bot)})`);
  st.setProperty('--wp-a-rgb', rgb(s.a)); st.setProperty('--wp-aa', String(s.aa.toFixed(3)));
  st.setProperty('--wp-b-rgb', rgb(s.b)); st.setProperty('--wp-ba', String(s.ba.toFixed(3)));
  st.setProperty('--wp-name', `"${s.name}"`);
  try { document.querySelector('meta[name="theme-color"]')?.setAttribute('content', toHex(s.top)); } catch { /* no meta tag */ }
}

/** How far apart two skies are, in the biggest single colour step (0 to 255). Under about 1.5 the eye cannot tell them apart. */
function distance(x: SkyColours, y: SkyColours): number {
  let d = 0;
  for (const k of ['top', 'mid', 'bot', 'a', 'b'] as const) for (let i = 0; i < 3; i++) d = Math.max(d, Math.abs(x[k][i] - y[k][i]));
  return Math.max(d, Math.abs(x.aa - y.aa) * 255, Math.abs(x.ba - y.ba) * 255, Math.abs(x.horizon - y.horizon) * 255);
}

export function createSky(canvas: HTMLCanvasElement): Sky {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { setLevel() {}, setStill() {}, refresh() {}, destroy() {} };

  const grain = makeGrain(160, 7);
  let level: SkyLevel = 'full';
  let still: StillPainter | null = null;
  /** CSS size of the wallpaper (rounded up to 32, so a browser bar sliding in and out does not repaint it) and the backing scale. */
  let W = 0, H = 0, scale = 1;
  let shown: SkyColours = currentSky();
  let target: SkyColours = shown;
  let raf = 0, timer = 0, resizeTimer = 0;
  let ready = false;

  function paint(s: SkyColours) {
    if (!W || !H) return;
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    paintWallpaper(ctx!, canvas.width, canvas.height, s, grain);
    if (still) { ctx!.save(); still(ctx!, canvas.width, canvas.height); ctx!.restore(); }
    if (!ready) {
      ready = true;
      canvas.parentElement?.setAttribute('data-sky', 'on');
      requestAnimationFrame(() => canvas.classList.add('is-ready'));
    }
  }

  function layout(): boolean {
    const q = (v: number) => Math.max(64, Math.ceil(v / 32) * 32);
    const w = q(window.innerWidth), h = q(window.innerHeight);
    const sc = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === W && h === H && sc === scale) return false;
    W = w; H = h; scale = sc;
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    return true;
  }

  function stopTween() { cancelAnimationFrame(raf); raf = 0; }

  /** Ease from what is on screen to `to`, or jump there. */
  function go(to: SkyColours, instant: boolean) {
    stopTween();
    target = to;
    applySkyVars(to);
    if (instant || level === 'still' || !ready || distance(shown, to) < 1) { shown = to; paint(to); return; }
    const from = shown, t0 = performance.now(), dur = 1100;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur), e = p * p * (3 - 2 * p);
      shown = p >= 1 ? to : mixSky(from, to, e);
      paint(shown);
      raf = p >= 1 ? 0 : requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /** Look at the world, the accent, the hour: if the sky has really changed, move to it. */
  function retarget(instant = false) {
    const next = currentSky();
    if (!instant && distance(next, target) < 1.2 && next.horizon === target.horizon) return;
    go(next, instant);
  }

  layout();
  applySkyVars(shown);
  paint(shown);

  const onResize = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { if (layout()) { stopTween(); paint(shown); } }, 140); };
  const onVisible = () => { if (document.visibilityState === 'visible') retarget(); };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisible);
  // The hour drifts on: look again every minute, repaint only when the colours have moved enough to see.
  timer = window.setInterval(() => { if (document.visibilityState === 'visible') retarget(); }, 60000);
  const watch = new MutationObserver(() => retarget());
  watch.observe(root(), { attributes: true, attributeFilter: ['data-accent', 'data-world', 'data-house', 'data-wallpaper'] });

  return {
    setLevel(next) { level = next; if (next === 'still') { stopTween(); go(target, true); } },
    setStill(paintStill) { still = paintStill; stopTween(); shown = target; paint(shown); },
    refresh() { retarget(); },
    destroy() {
      stopTween(); window.clearInterval(timer); window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisible); watch.disconnect();
      canvas.parentElement?.removeAttribute('data-sky');
    },
  };
}
