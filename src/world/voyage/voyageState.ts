import { useCallback, useSyncExternalStore } from 'react';
import type { Level } from '../../types';
import { readJSON, writeJSON } from '../../lib/storage';
import { isValidYmd } from '../../lib/date';

/**
 * Everything the Voyage world remembers that cannot be worked out from the logs: the ship's name, the seas the student
 * has marked as cleared, whether the ending has been seen, and how the captain looks.
 * Stored under one key (it travels with backups because it starts with `ca_`).
 */
export const VOYAGE_KEY = 'ca_voyage_v1';

export interface Captain {
  /** Index into the lists in world/crew (skin tones, hair styles, hair colours, coat colours, accessories). */
  skin: number; hair: number; hairColor: number; coat: number; accessory: number;
}
export const CAPTAIN_CHOICES: Record<keyof Captain, number> = { skin: 6, hair: 4, hairColor: 7, coat: 6, accessory: 4 };
export const DEFAULT_CAPTAIN: Captain = { skin: 2, hair: 1, hairColor: 0, coat: 0, accessory: 1 };
export const DEFAULT_SHIP = 'The Double Entry';
export const SHIP_NAME_MAX = 26;

export interface VoyageState {
  v: 1;
  shipName: string;
  /** The day (YYYY-MM-DD) the student marked each sea as cleared. Nothing is cleared automatically. */
  cleared: Partial<Record<Level, string>>;
  /** The ending has played once, so it does not take over the screen again. */
  finaleSeen: boolean;
  captain: Captain;
}

export const EMPTY_VOYAGE: VoyageState = { v: 1, shipName: DEFAULT_SHIP, cleared: {}, finaleSeen: false, captain: DEFAULT_CAPTAIN };

const LEVEL_IDS: Level[] = ['foundation', 'inter', 'final'];
const pick = (v: unknown, count: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 && n < count ? n : fallback;
};

/** Turns whatever is in storage (old, hand-edited or damaged) into a valid state. */
export function normaliseVoyage(raw: unknown): VoyageState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cleared: Partial<Record<Level, string>> = {};
  const rc = (r.cleared && typeof r.cleared === 'object' ? r.cleared : {}) as Record<string, unknown>;
  for (const l of LEVEL_IDS) if (isValidYmd(rc[l])) cleared[l] = rc[l] as string;
  const rcap = (r.captain && typeof r.captain === 'object' ? r.captain : {}) as Record<string, unknown>;
  const captain: Captain = {
    skin: pick(rcap.skin, CAPTAIN_CHOICES.skin, DEFAULT_CAPTAIN.skin),
    hair: pick(rcap.hair, CAPTAIN_CHOICES.hair, DEFAULT_CAPTAIN.hair),
    hairColor: pick(rcap.hairColor, CAPTAIN_CHOICES.hairColor, DEFAULT_CAPTAIN.hairColor),
    coat: pick(rcap.coat, CAPTAIN_CHOICES.coat, DEFAULT_CAPTAIN.coat),
    accessory: pick(rcap.accessory, CAPTAIN_CHOICES.accessory, DEFAULT_CAPTAIN.accessory),
  };
  const name = typeof r.shipName === 'string' ? r.shipName.replace(/\s+/g, ' ').trim().slice(0, SHIP_NAME_MAX) : '';
  return { v: 1, shipName: name || DEFAULT_SHIP, cleared, finaleSeen: r.finaleSeen === true, captain };
}

// ───────────── a tiny shared store, so the Sea chart, the dashboard card and Settings always agree ─────────────

let cache: VoyageState = normaliseVoyage(readJSON<unknown>(VOYAGE_KEY, null));
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function reload() { cache = normaliseVoyage(readJSON<unknown>(VOYAGE_KEY, null)); emit(); }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === VOYAGE_KEY || e.key === null) reload(); });
  window.addEventListener('ca_data_restored', reload);
}

export const getVoyage = () => cache;
export function setVoyage(next: (s: VoyageState) => VoyageState) {
  cache = normaliseVoyage(next(cache));
  writeJSON(VOYAGE_KEY, cache);
  emit();
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function useVoyage() {
  const state = useSyncExternalStore(subscribe, getVoyage, getVoyage);
  const patch = useCallback((p: Partial<VoyageState>) => setVoyage((s) => ({ ...s, ...p })), []);
  const setCaptain = useCallback((p: Partial<Captain>) => setVoyage((s) => ({ ...s, captain: { ...s.captain, ...p } })), []);
  const markCleared = useCallback((level: Level, date: string) => setVoyage((s) => ({ ...s, cleared: { ...s.cleared, [level]: date } })), []);
  const unmarkCleared = useCallback((level: Level) => setVoyage((s) => { const c = { ...s.cleared }; delete c[level]; return { ...s, cleared: c }; }), []);
  return { state, patch, setCaptain, markCleared, unmarkCleared };
}
