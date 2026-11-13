import { useSyncExternalStore } from 'react';

// The title of the screen on show. PageHeader (ui/Misc.tsx) publishes it, and the top bar shows it small in the middle once the
// large title has scrolled away, the way iOS navigation bars do.

let title = '';
const subs = new Set<() => void>();

export function setPageTitle(next: string) {
  if (next === title) return;
  title = next;
  subs.forEach((f) => f());
}

export function usePageTitle(): string {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => title, () => '');
}
