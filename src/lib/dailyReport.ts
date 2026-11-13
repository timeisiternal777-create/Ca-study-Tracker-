// Automatic daily PDF report. The browser's File System Access API lets the student pick a folder once;
// after that, today's report is (re)written there as `<YYYY-MM-DD>.pdf` whenever the day's log changes,
// and yesterday's final report is saved the first time the app opens on a new day.
//
// Improvements over the original hook: dates are local (not UTC), the report refreshes as the day
// fills up (the original wrote it once, usually before any study was logged), state is shared by one
// store instead of every component owning its own copy, and nothing runs unless it was switched on.
import { useEffect, useSyncExternalStore } from 'react';
import { useLevelConfig } from '../context/LevelContext';
import { useStudy } from '../context/StudyContext';
import type { DailyStudyLog, Level, MockLogEntry, StudyStats, SubjectConfig, UserSettings } from '../types';
import { addDays, fmtDate, todayStr } from './date';
import { buildReportPdf, type ReportInput } from './reportPdf';
import { dayHours } from './stats';
import { readRaw, removeKey, writeRaw } from './storage';
import { normaliseWorld, wordsFor } from '../world/words';

/* ---------- IndexedDB (same database and store names as the original app) ---------- */

const DB_NAME = 'ca_study_tracker_auto_db';
const STORE = 'handles';
const HANDLE_KEY = 'dir_handle';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const r = run(db.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally { db.close(); }
}
const saveHandle = (h: unknown) => idb('readwrite', (s) => s.put(h, HANDLE_KEY));
const loadHandle = async () => ((await idb('readonly', (s) => s.get(HANDLE_KEY))) || null) as DirHandle | null;
const dropHandle = () => idb('readwrite', (s) => s.delete(HANDLE_KEY));

interface DirHandle {
  name: string;
  getFileHandle(name: string, o?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }>;
  queryPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>;
}

/* ---------- shared state (persisted under the original localStorage keys) ---------- */

const K = {
  enabled: 'auto_report_enabled', folder: 'auto_report_folder', last: 'auto_report_last_date',
  status: 'auto_report_status', error: 'auto_report_error', sig: 'auto_report_sig', final: 'auto_report_final_date',
} as const;

export type AutoStatus = 'idle' | 'working' | 'success' | 'permission' | 'failed';
export interface AutoReportState {
  supported: boolean;
  enabled: boolean;
  folderName: string;
  /** Local date of the most recent report written. */
  lastDate: string;
  status: AutoStatus;
  error: string;
}

function readStatus(): AutoStatus {
  const s = readRaw(K.status);
  if (s === 'success') return 'success';
  if (s === 'failed') return 'failed';
  if (s === 'Permission Required' || s === 'permission') return 'permission';
  return 'idle';
}

const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window && window.isSecureContext !== false;
let state: AutoReportState = {
  supported,
  enabled: readRaw(K.enabled) === 'true',
  folderName: readRaw(K.folder) || '',
  lastDate: readRaw(K.last) || '',
  status: readStatus(),
  error: readRaw(K.error) || '',
};
const listeners = new Set<() => void>();

function set(patch: Partial<AutoReportState>): void {
  state = { ...state, ...patch };
  if (patch.enabled !== undefined) writeRaw(K.enabled, String(patch.enabled));
  if (patch.folderName !== undefined) writeRaw(K.folder, patch.folderName);
  if (patch.lastDate !== undefined) writeRaw(K.last, patch.lastDate);
  if (patch.status !== undefined && patch.status !== 'working') writeRaw(K.status, patch.status === 'permission' ? 'Permission Required' : patch.status);
  if (patch.error !== undefined) writeRaw(K.error, patch.error);
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => state;

/** Live status of the automatic report. */
export function useAutoReport(): AutoReportState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/* ---------- data source (registered by the always-mounted runner) ---------- */

interface Source {
  logs: DailyStudyLog[];
  mocks: MockLogEntry[];
  stats: StudyStats;
  settings: UserSettings;
  level: Level;
  groupLabel: string;
  subjects: SubjectConfig[];
}
let source: Source | null = null;

/** Build the input for `buildReportPdf` for an inclusive date range. */
export function reportInputFor(src: Source, start: string, end: string, rangeLabel: string, title = 'Study report'): ReportInput {
  return {
    title,
    displayName: src.settings.displayName || 'Student',
    level: src.level,
    groupLabel: src.groupLabel,
    rangeLabel,
    examDate: src.settings.targetExamDate,
    stats: src.stats,
    logs: src.logs.filter((l) => l.date >= start && l.date <= end).sort((a, b) => a.date.localeCompare(b.date)),
    mocks: src.mocks.filter((m) => m.date >= start && m.date <= end),
    subjects: src.subjects,
    dailyGoalHours: src.settings.dailyGoalHours,
    rangeStart: start,
    rangeEnd: end,
    theme: src.settings.reportTheme,
    page: src.settings.reportPage,
    rankLabel: wordsFor(normaliseWorld(src.settings.worldTheme), !!src.settings.plainWords).rank(src.stats.rankInfo.title),
  };
}

/* ---------- actions ---------- */

let busy = false;

async function writeDay(handle: DirHandle, src: Source, date: string): Promise<void> {
  const pdf = await buildReportPdf(reportInputFor(src, date, date, fmtDate(date, { weekday: true, year: true }), 'Daily report'));
  const file = await handle.getFileHandle(`${date}.pdf`, { create: true });
  const w = await file.createWritable();
  await w.write(pdf);
  await w.close();
}

async function hasAccess(handle: DirHandle): Promise<boolean> {
  try { return (await handle.queryPermission?.({ mode: 'readwrite' })) === 'granted'; } catch { return false; }
}

/**
 * Write whatever is due: yesterday's final report (once) and today's report whenever the day's
 * log changed. `force` writes today's report even when nothing changed or nothing is logged.
 */
async function runDue(force = false): Promise<void> {
  if ((!state.enabled && !force) || busy || !source) return;
  busy = true;
  try {
    const handle = await loadHandle();
    if (!handle) { set({ status: 'failed', error: 'No folder is selected. Choose one to save reports into.' }); return; }
    if (!(await hasAccess(handle))) { set({ status: 'permission', error: '' }); return; }
    const src = source;
    const today = todayStr();
    const yesterday = addDays(today, -1);
    set({ status: 'working', error: '' });
    let wrote = false;

    const hadYesterday = src.logs.some((l) => l.date === yesterday && dayHours(l) > 0);
    if (hadYesterday && readRaw(K.final) !== yesterday) {
      await writeDay(handle, src, yesterday);
      writeRaw(K.final, yesterday);
      wrote = true;
    }

    const dayLogs = src.logs.filter((l) => l.date === today);
    const hours = dayLogs.reduce((a, l) => a + dayHours(l), 0);
    const mocks = src.mocks.filter((m) => m.date === today).length;
    const sig = `${today}|${hours.toFixed(2)}|${mocks}`;
    if ((hours > 0 || mocks > 0) && (force || readRaw(K.sig) !== sig)) {
      await writeDay(handle, src, today);
      writeRaw(K.sig, sig);
      wrote = true;
    } else if (force && !wrote) {
      await writeDay(handle, src, today);
      wrote = true;
    }
    set({ status: wrote || state.lastDate ? 'success' : 'idle', lastDate: wrote ? today : state.lastDate, error: '' });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err?.name === 'NotAllowedError' || /permission/i.test(err?.message || '')) set({ status: 'permission', error: '' });
    else set({ status: 'failed', error: err?.message || 'The report could not be saved.' });
  } finally { busy = false; }
}

/** Ask the student for a folder (must run from a click). Turns the feature on and saves today's report. */
export async function chooseReportFolder(): Promise<boolean> {
  if (!supported) { set({ status: 'failed', error: 'This browser cannot save to a folder. Use Chrome or Edge on a computer or tablet.' }); return false; }
  try {
    const handle = await (window as unknown as { showDirectoryPicker(o?: { mode: 'readwrite' }): Promise<DirHandle> }).showDirectoryPicker({ mode: 'readwrite' });
    await saveHandle(handle);
    removeKey(K.sig);
    set({ folderName: handle.name, enabled: true, status: 'idle', error: '' });
    await runDue(true);
    return true;
  } catch (e) {
    if ((e as { name?: string })?.name !== 'AbortError') set({ status: 'failed', error: (e as Error)?.message || 'The folder could not be opened.' });
    return false;
  }
}

/** Switch the feature on or off. Turning it on for the first time opens the folder picker. */
export async function setAutoReport(on: boolean): Promise<void> {
  if (!on) { set({ enabled: false }); return; }
  const handle = await loadHandle().catch(() => null);
  if (!handle) { await chooseReportFolder(); return; }
  set({ enabled: true, folderName: handle.name });
  await runDue(false);
}

/** Re-grant folder access after the browser forgot it (must run from a click). */
export async function allowReportFolder(): Promise<void> {
  try {
    const handle = await loadHandle();
    if (!handle) { await chooseReportFolder(); return; }
    const res = await handle.requestPermission?.({ mode: 'readwrite' });
    if (res === 'granted') { set({ status: 'idle', error: '' }); await runDue(true); } else set({ status: 'permission' });
  } catch (e) { set({ status: 'failed', error: (e as Error)?.message || 'Access was not granted.' }); }
}

/** Save today's report right now. */
export const saveReportNow = () => runDue(true);

/** Stop saving and forget the folder. */
export async function forgetReportFolder(): Promise<void> {
  try { await dropHandle(); } catch { /* nothing stored */ }
  removeKey(K.sig); removeKey(K.final);
  set({ enabled: false, folderName: '', status: 'idle', error: '' });
}

/* ---------- runner: mount once, near the root ---------- */

/** Keeps today's report fresh. Call once inside the study provider (see Gate in App.tsx). */
export function useAutoReportRunner(): void {
  const { studyLogs, mockScores, settings, stats, today } = useStudy();
  const { level, groupLabel, allSubjectsInGroup } = useLevelConfig();

  useEffect(() => {
    source = { logs: studyLogs, mocks: mockScores, stats, settings, level, groupLabel, subjects: allSubjectsInGroup };
    if (!state.enabled) return;
    // Debounce: the log changes on every keystroke-sized edit; write once things settle.
    const t = window.setTimeout(() => { void runDue(false); }, 3500);
    return () => window.clearTimeout(t);
  }, [studyLogs, mockScores, stats, settings, level, groupLabel, allSubjectsInGroup, today]);

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    // Learn whether access survived the last session, so Settings can ask for it again.
    void (async () => {
      const h = await loadHandle().catch(() => null);
      if (!alive || !h || !state.enabled) return;
      if (!(await hasAccess(h))) set({ status: 'permission' });
    })();
    const onVisible = () => { if (document.visibilityState === 'visible' && state.enabled) void runDue(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
  }, []);
}

/** For Settings: a ready-to-use source of study data for manual reports. */
export function useReportSource(): Source {
  const { studyLogs, mockScores, settings, stats } = useStudy();
  const { level, groupLabel, allSubjectsInGroup } = useLevelConfig();
  return { logs: studyLogs, mocks: mockScores, stats, settings, level, groupLabel, subjects: allSubjectsInGroup };
}
