import { useCallback, useSyncExternalStore } from 'react';
import type { Level } from '../../types';
import { readJSON, writeJSON } from '../../lib/storage';
import { isValidYmd } from '../../lib/date';
import { isHouseId, type HouseId } from './houses';
import { QUESTION_COUNT, type Answers, type Virtues } from './choosing';
import { DEFAULT_STUDENT, normaliseLook, type StudentLook } from './art/cast/types';

/**
 * Everything Lanternfell remembers that cannot be worked out from the logs: which house the Choosing gave, the answers
 * given there, the years the student has marked as cleared, whether Charter Night has played, and how the student looks.
 * One key (it travels with backups because it starts with `ca_`).
 */
export const ACADEMY_KEY = 'ca_academy_v1';

export interface AcademyState {
  v: 1;
  /** The house the Choosing gave. null until the student has been chosen. */
  house: HouseId | null;
  /** The day (YYYY-MM-DD) of the latest Choosing. */
  chosenOn: string | null;
  /** How the three answers went at the latest Choosing. */
  answers: Answers;
  /** The measured virtues (0 to 100 each) at the latest Choosing, for the school record. */
  virtues: Virtues | null;
  /** The day the student marked each year as cleared. Nothing is cleared automatically. */
  cleared: Partial<Record<Level, string>>;
  /** Charter Night has played once, so it does not take over the screen again. */
  finaleSeen: boolean;
  look: StudentLook;
}

export const EMPTY_ACADEMY: AcademyState = { v: 1, house: null, chosenOn: null, answers: [null, null, null], virtues: null, cleared: {}, finaleSeen: false, look: DEFAULT_STUDENT };

const LEVEL_IDS: Level[] = ['foundation', 'inter', 'final'];
const score = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; };

/** Turns whatever is in storage (old, hand-edited or damaged) into a valid state. */
export function normaliseAcademy(raw: unknown): AcademyState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cleared: Partial<Record<Level, string>> = {};
  const rc = (r.cleared && typeof r.cleared === 'object' ? r.cleared : {}) as Record<string, unknown>;
  for (const l of LEVEL_IDS) if (isValidYmd(rc[l])) cleared[l] = rc[l] as string;
  const house = isHouseId(r.house) ? r.house : null;
  const ra = Array.isArray(r.answers) ? r.answers : [];
  const answers: Answers = Array.from({ length: QUESTION_COUNT }, (_, i) => { const a = ra[i]; return typeof a === 'number' && Number.isInteger(a) && a >= 0 && a < 4 ? a : null; });
  let virtues: Virtues | null = null;
  if (r.virtues && typeof r.virtues === 'object') {
    const rv = r.virtues as Record<string, unknown>;
    virtues = { grit: score(rv.grit), care: score(rv.care), wit: score(rv.wit), steadiness: score(rv.steadiness) };
  }
  return {
    v: 1, house, chosenOn: house && isValidYmd(r.chosenOn) ? (r.chosenOn as string) : null, answers, virtues: house ? virtues : null,
    cleared, finaleSeen: r.finaleSeen === true, look: normaliseLook(r.look),
  };
}

// ───────────── a tiny shared store, so the Grounds, the dashboard card and Settings always agree ─────────────

let cache: AcademyState = normaliseAcademy(readJSON<unknown>(ACADEMY_KEY, null));
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** `<html data-house>` carries the house colour into the whole skin (see skin.css). */
function applyHouse(h: HouseId | null) {
  if (typeof document === 'undefined') return;
  if (h) document.documentElement.setAttribute('data-house', h); else document.documentElement.removeAttribute('data-house');
}
applyHouse(cache.house);

function reload() { cache = normaliseAcademy(readJSON<unknown>(ACADEMY_KEY, null)); applyHouse(cache.house); emit(); }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === ACADEMY_KEY || e.key === null) reload(); });
  window.addEventListener('ca_data_restored', reload);
}

export const getAcademy = () => cache;
export function setAcademy(next: (s: AcademyState) => AcademyState) {
  cache = normaliseAcademy(next(cache));
  writeJSON(ACADEMY_KEY, cache);
  applyHouse(cache.house);
  emit();
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function useAcademy() {
  const state = useSyncExternalStore(subscribe, getAcademy, getAcademy);
  const patch = useCallback((p: Partial<AcademyState>) => setAcademy((s) => ({ ...s, ...p })), []);
  const setLook = useCallback((p: Partial<StudentLook>) => setAcademy((s) => ({ ...s, look: { ...s.look, ...p } })), []);
  /** Records the outcome of a Choosing. */
  const choose = useCallback((house: HouseId, virtues: Virtues, answers: Answers, date: string) => setAcademy((s) => ({ ...s, house, virtues, answers, chosenOn: date })), []);
  const markCleared = useCallback((level: Level, date: string) => setAcademy((s) => ({ ...s, cleared: { ...s.cleared, [level]: date } })), []);
  const unmarkCleared = useCallback((level: Level) => setAcademy((s) => { const c = { ...s.cleared }; delete c[level]; return { ...s, cleared: c }; }), []);
  return { state, patch, setLook, choose, markCleared, unmarkCleared };
}
