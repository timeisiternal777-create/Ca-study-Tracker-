import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True below the sidebar breakpoint (phones and tablet portrait). */
export const useCompact = () => useMediaQuery('(max-width: 1100px)');
export const usePhone = () => useMediaQuery('(max-width: 640px)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
