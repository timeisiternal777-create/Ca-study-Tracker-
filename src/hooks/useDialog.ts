import { useEffect, useRef, type RefObject } from 'react';

let lockCount = 0;
export function useLockScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount++;
    document.documentElement.style.overflow = 'hidden';
    return () => { if (--lockCount <= 0) { lockCount = 0; document.documentElement.style.overflow = ''; } };
  }, [active]);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Traps Tab inside `ref`, focuses the first control on open and restores focus on close. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escRef = useRef(onEscape); escRef.current = onEscape;
  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? root.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); escRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const a = items[0]; const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    root.addEventListener('keydown', onKey);
    return () => { root.removeEventListener('keydown', onKey); previous?.focus?.({ preventScroll: true }); };
  }, [active, ref]);
}
