import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useMedia';

/** Animated number. Writes straight to the DOM node each frame, so it never re-renders React. */
export function CountUp({ value, decimals = 0, duration = 900, prefix = '', suffix = '', locale = false, className }: {
  value: number; decimals?: number; duration?: number; prefix?: string; suffix?: string; locale?: boolean; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const reduced = useReducedMotion();
  const fmt = (n: number) => prefix + (locale ? n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals)) + suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    const to = Number.isFinite(value) ? value : 0;
    if (reduced || from === to || duration <= 0) { el.textContent = fmt(to); shown.current = to; return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 4);
      shown.current = from + (to - from) * e;
      el.textContent = fmt(shown.current);
      if (p < 1) raf = requestAnimationFrame(tick); else shown.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, duration, prefix, suffix, locale, reduced]);

  // The child never changes, so React never overwrites the text we animate.
  return <span ref={ref} className={className ?? 'count-up'}>{fmt(0)}</span>;
}
