import { useEffect, useRef, type RefObject } from 'react';
import { SPRINGS, Velocity, rubber, springAt, springCurve } from '../lib/spring';
import { sfx } from '../lib/sfx';

// Drag a sheet down to dismiss it, the way iOS sheets work.
//
//  * The sheet follows your finger one to one. Pull it up and it stretches with growing resistance (a rubber band).
//  * Let go fast, or past a third of its height, and it carries on out of the screen at the speed of your finger.
//  * Let go slowly and it springs back, starting with the speed you had when you let go. Grab it again mid-spring and it
//    is in your hand again (the motion is interruptible).
//  * The dimmed backdrop fades in step with the sheet.
//
// Where a drag can start: the grabber, the header and the footer, and the body when its content fits (so nothing inside needs to
// scroll). A tall sheet that scrolls keeps its body for scrolling. Text fields and sliders never start one.

const NO_DRAG = 'input, textarea, select, [contenteditable="true"], [role="slider"], [data-no-sheet-drag]';
const START_ZONES = '.modal-head, .modal-grab, .modal-foot';
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export interface SheetDragOptions {
  sheet: RefObject<HTMLElement | null>;
  scrim: RefObject<HTMLElement | null>;
  /** Only while the sheet is on screen, in the iOS interface. */
  active: boolean;
  /** A sheet that must be answered cannot be dragged away. */
  dismissible: boolean;
  /** Called when the sheet has been flicked out of the screen. */
  onDismiss: () => void;
}

export function useSheetDrag({ sheet, scrim, active, dismissible, onDismiss }: SheetDragOptions) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const el = sheet.current;
    const bg = scrim.current;
    if (!active || !dismissible || !el || !bg) return;

    let pid = -1, startY = 0, startX = 0, base = 0, offset = 0;
    let dragging = false, swallowUntil = 0, raf = 0, leaving: Animation | null = null, gone = false;
    const vel = new Velocity();

    const paint = (y: number) => {
      offset = y;
      el.style.transform = `translate3d(0, ${y}px, 0)`;
      const h = Math.max(1, el.offsetHeight);
      bg.style.setProperty('--scrim-o', String(clamp(1 - Math.max(0, y) / (h * 1.1), 0, 1)));
    };
    const rest = () => {
      cancelAnimationFrame(raf); raf = 0;
      el.style.transform = ''; bg.style.removeProperty('--scrim-o'); el.classList.remove('is-dragging');
    };

    // Where the sheet is right now, even in the middle of its entrance or a spring back.
    const currentOffset = () => {
      const m = getComputedStyle(el).transform;
      if (!m || m === 'none') return 0;
      try { return new DOMMatrixReadOnly(m).m42; } catch { return 0; }
    };

    const startable = (t: EventTarget | null) => {
      if (!(t instanceof Element) || t.closest(NO_DRAG)) return false;
      if (t.closest(START_ZONES)) return true;
      const body = t.closest<HTMLElement>('.modal-body');
      return !!body && body.dataset.scroll === 'no';
    };

    const onDown = (e: PointerEvent) => {
      if (leaving || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || !startable(e.target)) return;
      pid = e.pointerId; startY = e.clientY; startX = e.clientX; dragging = false;
      vel.reset(); vel.push(e.clientY);
      // Caught mid-spring: take over from wherever it is.
      if (raf) { cancelAnimationFrame(raf); raf = 0; base = currentOffset(); dragging = true; el.classList.add('is-dragging'); }
      else base = 0;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const dy = e.clientY - startY, dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dy) < 7 && Math.abs(dx) < 7) return;
        // Sideways, or upwards before anything has moved: not for the sheet.
        if (Math.abs(dx) > Math.abs(dy) || dy < 0) { detach(); return; }
        dragging = true; base = currentOffset();
        // Stop the entrance if it is still running. Cancelling (rather than turning the animation off in CSS) means it cannot start over later.
        el.getAnimations().forEach((a) => a.cancel());
        el.classList.add('is-dragging');
        try { el.setPointerCapture(pid); } catch { /* the pointer is already gone */ }
        sfx.haptic('select');
      }
      const raw = base + dy;
      paint(raw >= 0 ? raw : -rubber(-raw, el.offsetHeight));
      vel.push(e.clientY);
    };

    const detach = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      pid = -1;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const wasDragging = dragging;
      const v = vel.get(); // px per ms, positive = downwards
      detach();
      dragging = false;
      if (!wasDragging) return;
      swallowUntil = performance.now() + 350; // the tap that ends a drag must not press a button
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      const h = Math.max(1, el.offsetHeight);
      const away = e.type !== 'pointercancel' && v > -0.3 && (offset > h * 0.32 || (v > 0.5 && offset > 24));
      if (away) flick(v); else springBack(v);
    };

    // Out of the screen, at the speed of the finger (never slower than a gentle glide).
    const flick = (v: number) => {
      const top = el.getBoundingClientRect().top;
      const dist = Math.max(40, window.innerHeight - top + 12);
      const ms = clamp(dist / Math.max(0.9, v), 170, 380);
      const from = offset;
      sfx.haptic('light');
      el.style.transform = `translate3d(0, ${from + dist}px, 0)`;
      leaving = el.animate([{ transform: `translate3d(0, ${from}px, 0)` }, { transform: `translate3d(0, ${from + dist}px, 0)` }], { duration: ms, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' });
      bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards', pseudoElement: '::before' });
      gone = true;
      leaving.onfinish = () => {
        dismissRef.current();
        // If the owner did not close the sheet after all (for example it asked "discard changes?"), bring it back.
        window.setTimeout(() => {
          if (!el.isConnected || el.closest('[data-closing]')) return;
          gone = false; leaving = null;
          // Bring the dimmed backdrop back too (its fade-out runs on the ::before layer).
          document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target === bg).forEach((a) => a.cancel());
          el.classList.add('is-dragging');
          paint(from + dist);
          springBack(0);
        }, 160);
      };
    };

    // Back to rest on a spring that starts with the speed of the finger.
    const springBack = (v: number) => {
      const from = offset;
      const dist = Math.abs(from);
      if (dist < 1.5) { rest(); return; }
      const toward = from > 0 ? -v : v; // finger speed in the direction of the rest position, px/ms
      const v0 = clamp((toward * 1000) / dist, -8, 14);
      const dur = springCurve(SPRINGS.snappy, v0, 24).duration;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = (now - t0) / 1000;
        if (t * 1000 >= dur) { rest(); return; }
        paint(from * (1 - springAt(SPRINGS.snappy, t, v0)));
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
      // A sheet that has been flicked away stays where it went until it is removed; putting it back would flash it on screen.
      if (!gone) { leaving?.cancel(); rest(); }
    };
  }, [active, dismissible, sheet, scrim]);
}
