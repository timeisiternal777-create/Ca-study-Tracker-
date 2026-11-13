// Touch and celebration effects.
//
//  * A soft ripple grows from your fingertip on buttons, chips, tabs and cards (classic interface; the iOS one presses the control in instead).
//  * Tiny sparks pop when you tick something off or save, and XP orbs fly to your rank pill when you collect a quest.
//
// Everything is drawn in one fixed, click-through layer and animated with the Web Animations API using only
// transform and opacity, so it runs on the GPU and never forces the page to re-layout while it plays.
// Nothing here runs when "Reduce motion" is on or the device asks for less motion.

import { sfx, type SfxName } from './sfx';
import { isIos } from './ui';

const reduced = () =>
  document.documentElement.dataset.reduceMotion === 'true' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

let layer: HTMLDivElement | null = null;
function host(): HTMLDivElement {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ───────────────────────── ripple ─────────────────────────

/** Things that should ripple. Small icons and chart parts are skipped by size, switches animate themselves. */
const RIPPLE = 'button, [role="button"], [role="tab"], a[href], summary, .card--interactive';
const NO_RIPPLE = '[data-ink="none"], :disabled, [aria-disabled="true"], .switch, .range, .bl-fab, input, select, textarea';

function toneOf(el: Element): 'accent' | 'light' | 'rose' {
  if (el.classList.contains('btn--primary')) return 'light';
  if (el.classList.contains('btn--danger-solid')) return 'light';
  if (el.classList.contains('btn--danger')) return 'rose';
  return 'accent';
}

let rippling = 0;
function ripple(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect();
  if (r.width < 28 || r.height < 28 || r.width > window.innerWidth * 0.98 || rippling > 6) return;
  const px = x - r.left, py = y - r.top;
  const reach = Math.hypot(Math.max(px, r.width - px), Math.max(py, r.height - py));
  const box = document.createElement('div');
  box.className = 'fx-ink';
  box.dataset.tone = toneOf(el);
  box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:${getComputedStyle(el).borderTopLeftRadius}`;
  const dot = document.createElement('i');
  dot.style.cssText = `left:${px - reach}px;top:${py - reach}px;width:${reach * 2}px;height:${reach * 2}px`;
  box.appendChild(dot);
  host().appendChild(box);
  rippling++;
  const done = () => { rippling--; box.remove(); };
  const a = dot.animate(
    [{ transform: 'scale(0.08)', opacity: 1 }, { opacity: 0.7, offset: 0.4 }, { transform: 'scale(1)', opacity: 0 }],
    { duration: 620, easing: 'cubic-bezier(0.22, 0.7, 0.25, 1)', fill: 'both' },
  );
  a.onfinish = done;
  a.oncancel = done;
}

// ───────────────────────── sparks ─────────────────────────

const SPARK_COLORS = ['var(--a)', 'var(--c-gold)', 'var(--c-mint)', 'var(--a2)'];
let sparks = 0;

/** A small burst of sparks centred on a point. */
export function burst(x: number, y: number, o: { count?: number; power?: number; colors?: string[] } = {}) {
  if (reduced() || document.hidden || sparks > 80) return;
  const n = Math.min(o.count ?? 10, 16), power = o.power ?? 1;
  const colors = o.colors ?? SPARK_COLORS;
  const h = host();
  for (let i = 0; i < n; i++) {
    const size = rand(3.5, 6.5);
    const p = document.createElement('b');
    p.className = 'fx-spark';
    p.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]}`;
    h.appendChild(p);
    sparks++;
    const ang = (i / n) * Math.PI * 2 + rand(-0.35, 0.35), d = rand(34, 78) * power;
    const dx = Math.cos(ang) * d, dy = Math.sin(ang) * d - 12 * power;
    const a = p.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(0.4)', opacity: 1 },
        { transform: `translate3d(${dx * 0.72}px, ${dy * 0.72}px, 0) scale(1)`, opacity: 1, offset: 0.4 },
        { transform: `translate3d(${dx}px, ${dy + 26 * power}px, 0) scale(0.2)`, opacity: 0 },
      ],
      { duration: rand(560, 820), easing: 'cubic-bezier(0.18, 0.7, 0.3, 1)', fill: 'both' },
    );
    const done = () => { sparks--; p.remove(); };
    a.onfinish = done;
    a.oncancel = done;
  }
}

/** One expanding ring: a quiet "done" mark. */
export function ring(x: number, y: number, color = 'var(--a)') {
  if (reduced() || document.hidden) return;
  const el = document.createElement('i');
  el.className = 'fx-ring';
  el.style.cssText = `left:${x - 22}px;top:${y - 22}px;border-color:${color}`;
  host().appendChild(el);
  const a = el.animate([{ transform: 'scale(0.3)', opacity: 0.9 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'both' });
  a.onfinish = a.oncancel = () => el.remove();
}

/** XP orbs that fly from a point to an element (the rank pill) along a curve. */
export function flyOrbs(x: number, y: number, to: Element | null, count = 6) {
  if (reduced() || document.hidden || !to) return;
  const t = to.getBoundingClientRect();
  if (!t.width) return;
  const tx = t.left + t.width * 0.28, ty = t.top + t.height / 2;
  const h = host();
  for (let i = 0; i < Math.min(count, 10); i++) {
    const delay = i * 55 + rand(0, 40), dur = rand(640, 820);
    const sx = x + rand(-18, 18), sy = y + rand(-10, 10);
    // The outer element travels sideways, the inner one travels up and down with a different curve. Together they arc.
    const outer = document.createElement('div');
    outer.className = 'fx-orb';
    const inner = document.createElement('b');
    outer.appendChild(inner);
    h.appendChild(outer);
    const ax = outer.animate([{ transform: `translate3d(${sx}px, 0, 0)` }, { transform: `translate3d(${tx}px, 0, 0)` }], { duration: dur, delay, easing: 'cubic-bezier(0.45, 0.05, 0.35, 1)', fill: 'both' });
    inner.animate(
      [{ transform: `translate3d(0, ${sy}px, 0) scale(0.5)`, opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: `translate3d(0, ${ty}px, 0) scale(1)`, opacity: 1, offset: 0.9 }, { transform: `translate3d(0, ${ty}px, 0) scale(0.2)`, opacity: 0 }],
      { duration: dur, delay, easing: 'cubic-bezier(0.55, 0, 0.7, 0.95)', fill: 'both' },
    );
    ax.onfinish = ax.oncancel = () => outer.remove();
    if (i === Math.min(count, 10) - 1) window.setTimeout(() => catchPulse(to), delay + dur - 60);
  }
}

let flareTimer = 0;
/** The glow behind everything wakes up for a moment. One-shot, so it costs nothing while the app is idle. */
export function flare() {
  if (reduced() || document.hidden) return;
  const bg = document.querySelector<HTMLElement>('.bg');
  if (!bg) return;
  bg.classList.remove('is-flare');
  void bg.offsetWidth;
  bg.classList.add('is-flare');
  window.clearTimeout(flareTimer);
  flareTimer = window.setTimeout(() => bg.classList.remove('is-flare'), 1600);
}

function catchPulse(el: Element) {
  el.classList.remove('fx-catch');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('fx-catch');
  window.setTimeout(() => el.classList.remove('fx-catch'), 600);
}

// ───────────────────────── wiring ─────────────────────────

let pointer = { x: 0, y: 0, at: -1e9 };

/** Where the last tap was, or the middle of the focused control after a key press. Null when it was long ago. */
function recentSpot(): { x: number; y: number } | null {
  const now = performance.now();
  if (now - pointer.at < 1800) return pointer;
  const el = document.activeElement;
  if (el && el !== document.body) {
    const r = el.getBoundingClientRect();
    if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

function onSound(name: SfxName) {
  if (name === 'quest' || name === 'rank' || name === 'goal' || name === 'week' || name === 'badge') flare();
  const spot = recentSpot();
  if (!spot) return;
  switch (name) {
    case 'checkOn': burst(spot.x, spot.y, { count: 7, power: 0.7, colors: ['var(--c-mint)', 'var(--a)'] }); break;
    case 'save': ring(spot.x, spot.y, 'var(--c-mint)'); burst(spot.x, spot.y, { count: 9, power: 0.85 }); break;
    case 'quest': burst(spot.x, spot.y, { count: 8, power: 0.8, colors: ['var(--c-gold)', '#fff3b0'] }); flyOrbs(spot.x, spot.y, document.querySelector('.xp-pill'), 6); break;
    case 'copy': ring(spot.x, spot.y); break;
    default: break;
  }
}

let installed = false;
/** Call once at start-up. */
export function installFx() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  // iOS Safari only shows :active styles when a touch listener exists somewhere.
  document.addEventListener('touchstart', () => undefined, { passive: true });

  let wait: { id: number; el: HTMLElement; x: number; y: number; timer: number } | null = null;
  const clear = () => { if (wait) { window.clearTimeout(wait.timer); wait = null; } };

  document.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted) return;
    pointer = { x: e.clientX, y: e.clientY, at: performance.now() };
    // The iOS interface answers a touch by pressing the control in (a spring), not with a ripple.
    if (e.button !== 0 || reduced() || isIos()) return;
    const el = (e.target instanceof Element ? e.target.closest<HTMLElement>(RIPPLE) : null);
    if (!el || el.matches(NO_RIPPLE) || el.closest('[data-ink="none"]')) return;
    clear();
    if (e.pointerType === 'mouse') { ripple(el, e.clientX, e.clientY); return; }
    // On touch the same gesture might become a scroll. Wait a moment, and skip the ripple if it does.
    const id = e.pointerId, x = e.clientX, y = e.clientY;
    wait = { id, el, x, y, timer: window.setTimeout(() => { if (wait && wait.id === id) { ripple(el, x, y); wait = null; } }, 70) };
  }, { capture: true, passive: true });

  document.addEventListener('pointerup', (e) => {
    if (wait && wait.id === e.pointerId) { const w = wait; clear(); ripple(w.el, w.x, w.y); }
  }, { capture: true, passive: true });
  document.addEventListener('pointercancel', clear, { capture: true, passive: true });
  document.addEventListener('pointermove', (e) => { if (wait && wait.id === e.pointerId && Math.hypot(e.clientX - wait.x, e.clientY - wait.y) > 10) clear(); }, { capture: true, passive: true });

  sfx.listen(onSound);
}
