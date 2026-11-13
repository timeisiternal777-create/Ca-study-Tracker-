import { useLayoutEffect, useRef, useState } from 'react';

export interface SliderBox { x: number; y: number; w: number; h: number }

/**
 * Measures the active item of a menu so one highlight can glide between items instead of jumping.
 * The container needs `position: relative`; the active item is found with `selector`.
 */
export function useSlider<T extends HTMLElement>(deps: unknown[], selector = '[aria-current="page"], [aria-selected="true"]') {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<SliderBox | null>(null);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const a = el.querySelector<HTMLElement>(selector);
      if (!a) { setBox(null); return; }
      setBox((p) => (p && p.x === a.offsetLeft && p.y === a.offsetTop && p.w === a.offsetWidth && p.h === a.offsetHeight ? p : { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // After the first measurement, later moves are animated.
    const id = requestAnimationFrame(() => setReady(true));
    return () => { ro.disconnect(); cancelAnimationFrame(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, box, ready };
}
