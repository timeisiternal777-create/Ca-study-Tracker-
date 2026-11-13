// The living sky: one canvas behind the whole app that draws two drifting pools of light, twinkling stars, four-pointed sparkles,
// floating dust and, now and then, a shooting star.
//
// Why one canvas and not forty animated elements. Every moving element becomes a layer the browser has to keep, blend and (on weak
// hardware) redraw across the screen on every frame, and anything painted above it has to be split into layers too. One canvas is one
// layer that never moves. It also lets the sky run at the rate its motion needs: everything here drifts slower than a pixel per step,
// so it is redrawn about twenty times a second (calm: eight), which the eye cannot tell from sixty but costs a third of the energy.
// The shooting star is the one fast thing: only while it crosses does the sky draw every frame.
//
// The canvas is opaque and also paints the still backdrop (the deep colour, three soft pools of light and a fine dust of stars), so the browser
// has exactly one full-screen layer behind the app and never has to blend a stack of them. The still part is painted once into a spare canvas
// and copied in on every redraw.
//
// The sky never starts a frame loop of its own while hidden, and the level (full / calm / still) comes from the motion governor.

export type SkyLevel = 'full' | 'calm' | 'still';
/** Paints an extra still picture into the backdrop. Called with the backdrop's own context and size whenever the backdrop is painted (so on resize too). */
export type StillPainter = (g: CanvasRenderingContext2D, width: number, height: number) => void;
export interface Sky {
  setLevel(level: SkyLevel): void;
  /** Adds (or, with null, removes) a still picture to the backdrop, painted once with the rest of it and so free on every later frame. Lanternfell's castle. */
  setStill(paint: StillPainter | null): void;
  /** Re-read the accent colours (call after the theme changes). */
  refresh(): void;
  destroy(): void;
}

type RGB = [number, number, number];
const TAU = Math.PI * 2;
/** Milliseconds between redraws. */
const STEP_MS = { full: 50, calm: 125 } as const;

/** Small seeded generator, so the sky looks the same every time the app opens. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintSprite(size: number, paint: (g: CanvasRenderingContext2D, s: number) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d')!, size);
  return c;
}

const glowSprite = (rgb: RGB) => paintSprite(256, (g, s) => {
  const k = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  k.addColorStop(0, `rgba(${rgb},1)`); k.addColorStop(0.56, `rgba(${rgb},0.33)`); k.addColorStop(0.74, `rgba(${rgb},0)`); k.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = k; g.fillRect(0, 0, s, s);
});
const starSprite = () => paintSprite(48, (g, s) => {
  const c = s / 2, k = g.createRadialGradient(c, c, 0, c, c, c);
  k.addColorStop(0, 'rgba(255,255,255,1)'); k.addColorStop(0.12, 'rgba(227,235,255,0.95)'); k.addColorStop(0.3, 'rgba(170,195,255,0.28)'); k.addColorStop(1, 'rgba(170,195,255,0)');
  g.fillStyle = k; g.fillRect(0, 0, s, s);
});
const sparkSprite = () => paintSprite(96, (g, s) => {
  const c = s / 2, line = (x0: number, y0: number, x1: number, y1: number, w: number, h: number, x: number, y: number) => {
    const k = g.createLinearGradient(x0, y0, x1, y1);
    k.addColorStop(0, 'rgba(255,255,255,0)'); k.addColorStop(0.5, 'rgba(255,255,255,1)'); k.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = k; g.fillRect(x, y, w, h);
  };
  line(0, 0, s, 0, s, 5, 0, c - 2.5);
  line(0, 0, 0, s, 5, s, c - 2.5, 0);
  const k = g.createRadialGradient(c, c, 0, c, c, c * 0.3);
  k.addColorStop(0, 'rgba(255,255,255,0.9)'); k.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = k; g.fillRect(0, 0, s, s);
});
const dustSprite = () => paintSprite(64, (g, s) => {
  const c = s / 2, k = g.createRadialGradient(c, c, 0, c, c, c);
  k.addColorStop(0, 'rgba(214,228,255,1)'); k.addColorStop(0.45, 'rgba(214,228,255,0.5)'); k.addColorStop(1, 'rgba(214,228,255,0)');
  g.fillStyle = k; g.fillRect(0, 0, s, s);
});

function readPalette(): { a: RGB; a2: RGB; bg: string } {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: RGB): RGB => {
    const p = cs.getPropertyValue(name).trim().split(/[\s,]+/).map(Number);
    return p.length >= 3 && p.slice(0, 3).every(Number.isFinite) ? [p[0], p[1], p[2]] : fallback;
  };
  return { a: get('--a-rgb', [77, 216, 232]), a2: get('--a2-rgb', [156, 140, 255]), bg: cs.getPropertyValue('--bg-0').trim() || '#060913' };
}

interface Star { x: number; y: number; d: number; w: number; ph: number; base: number; amp: number }
interface Spark { x: number; y: number; d: number; period: number; ph: number }
interface Dust { x: number; d: number; speed: number; ph: number; sway: number; w: number; a: number }
interface Orb { cx: number; cy: number; ax: number; ay: number; wx: number; wy: number; ws: number; px: number; py: number; ps: number; r: number; alpha: number; img: 0 | 1 }

function buildScene() {
  const rnd = rng(20261101);
  // A few hand-placed stars so the sky has a recognisable shape, then more scattered towards the top (the painted star field fades out below).
  const placed: [number, number, number][] = [[6, 9, 2], [14, 31, 1.6], [23, 14, 2.4], [31, 52, 1.5], [38, 7, 2], [47, 24, 1.6], [55, 11, 2.6], [62, 38, 1.5], [69, 5, 2],
    [76, 27, 2.4], [83, 14, 1.6], [90, 44, 2], [94, 8, 2.6], [11, 63, 1.5], [27, 78, 1.6], [58, 71, 1.5], [81, 66, 2], [43, 88, 1.5]];
  const stars: Star[] = placed.map(([x, y, s]) => ({ x: x / 100, y: y / 100, d: s * 8, w: TAU / (4.6 + rnd() * 5), ph: rnd() * TAU, base: 0.12, amp: 0.83 }));
  for (let i = 0; i < 26; i++) {
    const s = 1.2 + rnd() * 1.4;
    stars.push({ x: rnd(), y: Math.pow(rnd(), 1.5) * 0.9, d: s * 8, w: TAU / (3.6 + rnd() * 6), ph: rnd() * TAU, base: 0.08, amp: 0.5 + rnd() * 0.35 });
  }
  const sparks: Spark[] = ([[19, 20, 20, 9.4], [71, 17, 24, 11.8], [88, 33, 18, 8.6], [48, 41, 20, 12.6]] as const)
    .map(([x, y, d, period]) => ({ x: x / 100, y: y / 100, d, period, ph: rnd() * period }));
  const dust: Dust[] = [];
  for (let i = 0; i < 14; i++) dust.push({ x: (i + 0.5 + (rnd() - 0.5) * 0.7) / 14, d: 6 + rnd() * 14, speed: 9 + rnd() * 7, ph: rnd() * 120, sway: 8 + rnd() * 20, w: TAU / (14 + rnd() * 16), a: 0.1 + rnd() * 0.2 });
  // Two slow pools of light. Fractions of the screen; radii in vmin.
  const orbs: Orb[] = [
    { cx: 0.93, cy: 0.05, ax: 0.05, ay: 0.06, wx: TAU / 48, wy: TAU / 61, ws: TAU / 37, px: 0.4, py: 2.1, ps: 1.2, r: 26, alpha: 0.21, img: 0 },
    { cx: 0.03, cy: 0.97, ax: 0.06, ay: 0.07, wx: TAU / 60, wy: TAU / 47, ws: TAU / 43, px: 3.3, py: 0.7, ps: 4.1, r: 24, alpha: 0.18, img: 1 },
  ];
  // Fine dust: tiny fixed stars, thickest at the top and gone by about two thirds of the way down.
  const fine: [number, number, number][] = [];
  for (let i = 0; i < 130; i++) { const y = Math.pow(rnd(), 1.25) * 0.7; fine.push([rnd(), y, (0.22 + rnd() * 0.36) * (1 - y / 0.7)]); }
  return { stars, sparks, dust, orbs, fine };
}

export function createSky(canvas: HTMLCanvasElement): Sky {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { setLevel() {}, setStill() {}, refresh() {}, destroy() {} };

  const scene = buildScene();
  const star = starSprite(), spark = sparkSprite(), dust = dustSprite();
  let glows: [HTMLCanvasElement, HTMLCanvasElement];
  let palette = readPalette();
  /** The still backdrop, painted once per size or colour change and copied under every frame. */
  const base = document.createElement('canvas');
  const baseCtx = base.getContext('2d')!;
  const makeGlows = () => { palette = readPalette(); glows = [glowSprite(palette.a2), glowSprite(palette.a)]; paintBase(); };

  let level: SkyLevel = 'full';
  let still: StillPainter | null = null;
  let W = 0, H = 0, vmin = 0;
  let running = false;
  let timer = 0, raf = 0;
  const t0 = performance.now();
  /** The shooting star that is crossing right now, if any. */
  let shot: { at: number; dur: number } | null = null;
  let nextShot = 9;

  function paintBase() {
    if (!W || !H) return;
    const g = baseCtx;
    base.width = W; base.height = H;
    g.fillStyle = palette.bg; g.fillRect(0, 0, W, H);
    // Three soft pools of light (the same ones the stylesheet paints behind the sky if scripts are off).
    const pool = (rgb: RGB, a: number, rx: number, ry: number, cx: number, cy: number, stop: number) => {
      g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
      const k = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      k.addColorStop(0, `rgba(${rgb},${a})`); k.addColorStop(stop, `rgba(${rgb},0)`); k.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = k; g.fillRect(-cx, -cy * (rx / ry), W, H * (rx / ry)); g.restore();
    };
    pool(palette.a2, 0.21, 980, 680, W * 0.88, -H * 0.12, 0.64);
    pool(palette.a, 0.16, 820, 600, -W * 0.08, H * 1.08, 0.64);
    pool(palette.a, 0.05, 560, 400, W * 0.55, H * 0.42, 0.7);
    g.fillStyle = '#fff';
    for (const [x, y, a] of scene.fine) { g.globalAlpha = a; g.fillRect(Math.round(x * W), Math.round(y * H), 1, 1); }
    g.globalAlpha = 1;
    if (still) { g.save(); still(g, W, H); g.restore(); }
  }

  function layout() {
    const q = (v: number) => Math.max(64, Math.ceil(v / 32) * 32);
    const w = q(window.innerWidth), h = q(window.innerHeight);
    if (w === W && h === H) return false;
    W = w; H = h; vmin = Math.min(W, H) / 100;
    canvas.width = W; canvas.height = H;
    paintBase();
    return true;
  }

  function drawStars(t: number, still: boolean) {
    for (const s of scene.stars) {
      const k = still ? 0.45 : 0.5 + 0.5 * Math.sin(t * s.w + s.ph);
      const d = s.d * (0.78 + 0.34 * k);
      ctx!.globalAlpha = s.base + s.amp * k;
      ctx!.drawImage(star, s.x * W - d / 2, s.y * H - d / 2, d, d);
    }
  }

  function draw(now: number) {
    const t = (now - t0) / 1000;
    const g = ctx!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(base, 0, 0);

    if (level === 'full') {
      for (const o of scene.orbs) {
        const x = (o.cx + Math.sin(t * o.wx + o.px) * o.ax) * W, y = (o.cy + Math.cos(t * o.wy + o.py) * o.ay) * H;
        const r = o.r * vmin * (1 + 0.05 * Math.sin(t * o.ws + o.ps));
        g.globalAlpha = o.alpha;
        g.drawImage(glows[o.img], x - r, y - r, r * 2, r * 2);
      }
      const span = H + 90;
      for (const m of scene.dust) {
        const p = ((t + m.ph) * m.speed / span) % 1;
        const fade = Math.min(1, p / 0.12, (1 - p) / 0.12);
        g.globalAlpha = m.a * fade;
        g.drawImage(dust, m.x * W + Math.sin(t * m.w + m.ph) * m.sway - m.d / 2, H + 45 - p * span - m.d / 2, m.d, m.d);
      }
    }

    drawStars(t, level === 'still');

    if (level === 'full') {
      for (const k of scene.sparks) {
        const p = ((t + k.ph) / k.period) % 1;
        // Quiet for most of the cycle, then a quick flash that turns a little as it fades.
        const env = p < 0.6 ? 0 : p < 0.76 ? (p - 0.6) / 0.16 : p < 0.88 ? 1 - ((p - 0.76) / 0.12) * 0.8 : 0.2 * (1 - (p - 0.88) / 0.12);
        if (env < 0.02) continue;
        const rot = ((p - 0.6) / 0.4) * 1.4, sc = 0.45 + 0.55 * Math.min(1, env * 1.2), cs = Math.cos(rot) * sc, sn = Math.sin(rot) * sc;
        g.globalAlpha = env;
        g.setTransform(cs, sn, -sn, cs, k.x * W, k.y * H);
        g.drawImage(spark, -k.d / 2, -k.d / 2, k.d, k.d);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);

      if (!shot && t >= nextShot) shot = { at: t, dur: 1.6 };
      if (shot) {
        const p = (t - shot.at) / shot.dur;
        if (p >= 1) { shot = null; nextShot = t + 38 + Math.random() * 34; }
        else {
          const x0 = W * 0.08, y0 = H * 0.07, dx = W * 0.52, dy = W * 0.22, hx = x0 + dx * p, hy = y0 + dy * p;
          const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, tail = 150;
          const a = Math.min(1, p / 0.06, (1 - p) / 0.1);
          const k = g.createLinearGradient(hx - ux * tail, hy - uy * tail, hx, hy);
          k.addColorStop(0, 'rgba(255,255,255,0)'); k.addColorStop(0.55, 'rgba(255,255,255,0.22)'); k.addColorStop(1, 'rgba(255,255,255,0.95)');
          g.globalAlpha = a; g.strokeStyle = k; g.lineWidth = 2; g.lineCap = 'round';
          g.beginPath(); g.moveTo(hx - ux * tail, hy - uy * tail); g.lineTo(hx, hy); g.stroke();
          g.drawImage(star, hx - 11, hy - 11, 22, 22);
        }
      }
    }
    g.globalAlpha = 1;
  }

  let ready = false;
  /** After the first picture is in, fade the canvas in and let the stylesheet's own backdrop (the fallback) step aside. */
  function markReady() {
    if (ready) return;
    ready = true;
    canvas.parentElement?.setAttribute('data-sky', 'on');
    requestAnimationFrame(() => canvas.classList.add('is-ready'));
  }

  function frame() {
    timer = 0; raf = 0;
    if (!running) return;
    draw(performance.now());
    markReady();
    schedule();
  }
  function schedule() {
    if (!running) return;
    if (level === 'full' && shot) raf = requestAnimationFrame(frame);
    else if (level !== 'still') timer = window.setTimeout(frame, STEP_MS[level]);
  }
  function stop() { running = false; window.clearTimeout(timer); cancelAnimationFrame(raf); timer = raf = 0; }
  function start() {
    stop();
    if (document.visibilityState !== 'visible') return;
    if (level === 'still') { draw(performance.now()); markReady(); return; }
    running = true;
    frame();
  }

  makeGlows();
  layout();
  let resizeTimer = 0;
  const onResize = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { if (layout()) start(); }, 140); };
  const onVisible = () => { if (document.visibilityState === 'visible') start(); else stop(); };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisible);
  // The accent colours live on <html data-accent>; follow them.
  const watch = new MutationObserver(() => { makeGlows(); if (!running) start(); });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-accent', 'data-world', 'data-house'] });

  return {
    setLevel(next) { if (next === level && (running || next === 'still')) return; level = next; start(); },
    setStill(paint) { still = paint; paintBase(); if (!running) start(); },
    refresh() { makeGlows(); if (!running) start(); },
    destroy() { stop(); canvas.parentElement?.removeAttribute('data-sky'); window.clearTimeout(resizeTimer); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisible); watch.disconnect(); },
  };
}
