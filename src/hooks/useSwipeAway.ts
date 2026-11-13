import { useEffect, useRef, type RefObject } from 'react';
import { SPRINGS, Velocity, rubber, springAt, springCurve } from '../lib/spring';
import { sfx } from '../lib/sfx';

// Swipe a banner (a toast) away, the way iOS notifications go.
//
//  * It follows the finger: sideways in either direction, or down. Pulled the other way it stretches with growing resistance.
//  * A flick, or a long enough pull, sends it off the edge at the speed of the finger.
//  * Anything less and it springs back, starting with the speed the finger had when it let go.
//  * While a finger is on it the banner stays (`onHold`), so it never leaves from under your thumb.

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const NO_SWIPE = 'button, a, input, textarea, select, [data-no-swipe]';

export interface SwipeAwayOptions {
  /** Only while the banner is on screen, in the iOS interface. */
  active: boolean;
  /** Called once the banner has been swiped off the screen. */
  onGone: () => void;
  /** A finger came down on the banner (true) or let go of it (false). */
  onHold?: (holding: boolean) => void;
}

export function useSwipeAway(ref: RefObject<HTMLElement | null>, { active, onGone, onHold }: SwipeAwayOptions) {
  const goneRef = useRef(onGone);
  goneRef.current = onGone;
  const holdRef = useRef(onHold);
  holdRef.current = onHold;

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    let pid = -1, x0 = 0, y0 = 0, x = 0, y = 0;
    let axis: 'x' | 'y' | null = null, dragging = false, raf = 0, swallowUntil = 0, gone = false, leaving: Animation | null = null;
    const vx = new Velocity(), vy = new Velocity();

    const paint = (px: number, py: number) => {
      x = px; y = py;
      el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      el.style.opacity = String(clamp(1 - Math.hypot(px, Math.max(0, py)) / (Math.max(1, el.offsetWidth) * 0.95), 0.12, 1));
    };
    const rest = () => {
      cancelAnimationFrame(raf); raf = 0;
      el.style.transform = ''; el.style.opacity = ''; el.classList.remove('is-dragging');
    };
    const detach = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      pid = -1;
    };

    const onDown = (e: PointerEvent) => {
      if (leaving || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.target instanceof Element && e.target.closest(NO_SWIPE)) return;
      // Caught while springing back: pick it up again from where it is.
      if (raf) { cancelAnimationFrame(raf); raf = 0; x0 = e.clientX - x; y0 = e.clientY - y; dragging = true; } else { x0 = e.clientX; y0 = e.clientY; x = 0; y = 0; dragging = false; }
      pid = e.pointerId; axis = null;
      vx.reset(); vy.reset(); vx.push(e.clientX); vy.push(e.clientY);
      holdRef.current?.(true);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (!dragging) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        // Upwards is not a way out: leave the gesture to the page.
        if (Math.abs(dy) >= Math.abs(dx) && dy < 0) { detach(); holdRef.current?.(false); return; }
        dragging = true;
        el.getAnimations().forEach((a) => a.cancel());
        el.classList.add('is-dragging');
        try { el.setPointerCapture(pid); } catch { /* the pointer is already gone */ }
        sfx.haptic('select');
      }
      if (!axis) axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') paint(dx, 0);
      else paint(0, dy >= 0 ? dy : -rubber(-dy, 220));
      vx.push(e.clientX); vy.push(e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const was = dragging;
      const sx = vx.get(), sy = vy.get(); // px per ms
      detach();
      dragging = false;
      holdRef.current?.(false);
      if (!was) return;
      swallowUntil = performance.now() + 350; // the tap that ends a swipe must not press a button
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      const cancelled = e.type === 'pointercancel';
      const horizontal = axis === 'x';
      const away = !cancelled && (horizontal ? Math.abs(x) > 90 || (Math.abs(sx) > 0.55 && Math.abs(x) > 24 && Math.sign(sx) === Math.sign(x))
        : y > 54 || (sy > 0.5 && y > 16));
      if (away) fling(horizontal ? sx : sy, horizontal); else springBack(sx, sy);
    };

    const fling = (v: number, horizontal: boolean) => {
      const r = el.getBoundingClientRect();
      const dir = horizontal ? (x >= 0 ? 1 : -1) : 1;
      const dist = horizontal
        ? (dir > 0 ? window.innerWidth - r.left : r.right) + 24
        : window.innerHeight - r.top + 24;
      const ms = clamp(dist / Math.max(0.9, Math.abs(v)), 150, 300);
      const from = { x, y };
      const to = horizontal ? { x: from.x + dir * dist, y: 0 } : { x: 0, y: from.y + dist };
      const fade = Number(el.style.opacity || 1);
      sfx.haptic('light');
      el.style.transform = `translate3d(${to.x}px, ${to.y}px, 0)`;
      el.style.opacity = '0';
      gone = true;
      leaving = el.animate(
        [{ transform: `translate3d(${from.x}px, ${from.y}px, 0)`, opacity: fade }, { transform: `translate3d(${to.x}px, ${to.y}px, 0)`, opacity: 0 }],
        { duration: ms, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
      );
      leaving.onfinish = () => goneRef.current();
    };

    const springBack = (sx: number, sy: number) => {
      const fx = x, fy = y;
      const dist = Math.hypot(fx, fy);
      if (dist < 1.5) { rest(); return; }
      // How fast the finger was moving back toward the rest position when it let go (px/ms), as the spring's starting speed.
      const toward = -((sx * fx + sy * fy) / dist);
      const v0 = clamp((toward * 1000) / dist, -8, 14);
      const dur = springCurve(SPRINGS.snappy, v0, 24).duration;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = (now - t0) / 1000;
        if (t * 1000 >= dur) { rest(); return; }
        const k = 1 - springAt(SPRINGS.snappy, t, v0);
        paint(fx * k, fy * k);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const swallow = (e: MouseEvent) => { if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); } };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', swallow, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', swallow, true);
      detach();
      // A banner that has been swiped away stays where it went until it is removed; putting it back would flash it on screen.
      if (!gone) { leaving?.cancel(); rest(); holdRef.current?.(false); }
    };
  }, [active, ref]);
}
