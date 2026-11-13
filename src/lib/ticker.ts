// One shared clock for everything that shows the running timer.
//
// The timer's value is worked out from timestamps (see lib/timer.ts); this file only decides *when to look again*.
// It ticks once per second of timer time (not wall-clock time), so the digits change at the moment the timer's own
// seconds change. Nothing is scheduled while the timer is idle, paused or when nothing is showing it.

import { useSyncExternalStore } from 'react';

export interface Reading { ms: number; running: boolean }

let read: () => Reading = () => ({ ms: 0, running: false });
let seconds = 0;
let handle = 0;
const subs = new Set<() => void>();

function schedule() {
  window.clearTimeout(handle); handle = 0;
  if (!subs.size) return;
  const r = read();
  if (!r.running) return;
  handle = window.setTimeout(refresh, Math.max(30, 1000 - (r.ms % 1000) + 6));
}

/** Look at the timer again now (after a start, pause, stop, or when the tab comes back). */
export function refresh() {
  const s = Math.floor(read().ms / 1000);
  if (s !== seconds) { seconds = s; subs.forEach((f) => f()); }
  schedule();
}

/** Tell the clock where to read the timer from. Called once by the timer provider. */
export function attach(fn: () => Reading) { read = fn; refresh(); }

export function subscribe(f: () => void): () => void {
  subs.add(f); schedule();
  return () => { subs.delete(f); if (!subs.size) { window.clearTimeout(handle); handle = 0; } };
}

export const getSeconds = () => seconds;

/** Whole seconds on the timer. Re-renders the component once per second while the timer runs. */
export function useElapsedSeconds(): number {
  return useSyncExternalStore(subscribe, getSeconds, getSeconds);
}

/** Like useElapsedSeconds, but re-renders only when the time crosses a bucket (e.g. every 120 s). Cheap for things that move slowly. */
export function useElapsedBucket(bucketSeconds: number): number {
  const snap = () => Math.floor(seconds / bucketSeconds);
  return useSyncExternalStore(subscribe, snap, snap);
}
