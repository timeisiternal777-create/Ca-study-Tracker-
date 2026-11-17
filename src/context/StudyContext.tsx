import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BackupPayload, DailyStudyLog, GameState, Level, MockLogEntry, StudyStats, ThemeId, UserSettings } from '../types';
import { useLevelConfig } from './LevelContext';
import { KEYS, appKeys, clearSuffixData, readJSON, readRaw, removeKey, writeJSON, writeRaw } from '../lib/storage';
import { EMPTY_GAME, computeStats } from '../lib/stats';
import { buildQuests, type Quest } from '../lib/quests';
import { phaseFor, type Phase } from '../lib/phases';
import { addDays, diffDays, isValidYmd, todayStr } from '../lib/date';
import { clamp, uid } from '../lib/format';
import { sfx } from '../lib/sfx';
import { SLOTS, getSlot, logHours, normaliseLog } from '../lib/log';
import { normaliseWorld } from '../world/words';
import { applyGlass, applyWallpaperMode } from '../lib/look';
import { normaliseGlass } from '../lib/wallpaper';

export { normaliseLog };

export const DEFAULT_SETTINGS: UserSettings = {
  onboardingCompleted: false,
  dailyGoalHours: 8,
  targetExamDate: addDays(todayStr(), 120),
  displayName: '',
  pastHours: {},
  hudChimes: true,
  beastNotifs: true,
  accent: 'aurora',
};

function loadSettings(): UserSettings {
  const raw = readJSON<Partial<UserSettings>>(KEYS.settings, {});
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (!isValidYmd(s.targetExamDate)) s.targetExamDate = DEFAULT_SETTINGS.targetExamDate;
  s.dailyGoalHours = clamp(Number(s.dailyGoalHours) || 8, 1, 24);
  if (!s.pastHours || typeof s.pastHours !== 'object') s.pastHours = {};
  if (s.sfxKit !== 'soft' && s.sfxKit !== 'glass' && s.sfxKit !== 'voyage' && s.sfxKit !== 'lantern') delete s.sfxKit;
  if (s.sfxKitBefore !== 'soft' && s.sfxKitBefore !== 'glass') delete s.sfxKitBefore;
  if (s.reportTheme !== 'night' && s.reportTheme !== 'sky' && s.reportTheme !== 'paper') delete s.reportTheme;
  if (s.reportPage !== 'tablet' && s.reportPage !== 'a4') delete s.reportPage;
  if (s.sfxLevel !== 'full' && s.sfxLevel !== 'light') delete s.sfxLevel;
  if (s.sfxVolume !== undefined) s.sfxVolume = clamp(Number(s.sfxVolume) || 0, 0, 100);
  if (![0, 15, 25, 30, 45, 60].includes(Number(s.timerChime))) delete s.timerChime;
  if (s.motionLevel !== 'auto' && s.motionLevel !== 'full' && s.motionLevel !== 'calm') delete s.motionLevel;
  if (s.worldTheme !== 'default' && s.worldTheme !== 'voyage' && s.worldTheme !== 'academy') delete s.worldTheme;
  if (s.ui !== 'ios' && s.ui !== 'classic') delete s.ui;
  if (typeof s.glass !== 'number' || !Number.isFinite(s.glass)) delete s.glass; else s.glass = normaliseGlass(s.glass);
  if (s.wallpaper !== 'day' && s.wallpaper !== 'night') delete s.wallpaper;
  return s;
}

function loadLogs(level: Level): DailyStudyLog[] {
  const list = readJSON<unknown>(KEYS.logs(level), null) ?? readJSON<unknown>('ca_study_logs_v3', []);
  if (!Array.isArray(list)) return [];
  const byDate = new Map<string, DailyStudyLog>();
  for (const l of list) if (l && isValidYmd((l as DailyStudyLog).date)) byDate.set((l as DailyStudyLog).date, normaliseLog(l as DailyStudyLog));
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function loadMocks(level: Level): MockLogEntry[] {
  const list = readJSON<unknown>(KEYS.mocks(level), []);
  if (!Array.isArray(list)) return [];
  return list
    .filter((m): m is MockLogEntry => !!m && typeof (m as MockLogEntry).subject === 'string' && isValidYmd((m as MockLogEntry).date))
    .map((m) => ({ id: m.id || uid('m'), date: m.date, subject: m.subject, marks: Math.max(0, Number(m.marks) || 0), notes: m.notes || '' }));
}

function loadGame(level: Level): GameState {
  const raw = readJSON<Partial<GameState> | null>(KEYS.game(level), null);
  const claims: Record<string, number> = {};
  if (raw && typeof raw.claims === 'object' && raw.claims) for (const [k, v] of Object.entries(raw.claims)) if (Number(v) > 0) claims[k] = Number(v);
  return { rankFloor: clamp(Math.floor(Number(raw?.rankFloor) || 0), 0, 20), claims };
}

export interface StudyApi {
  studyLogs: DailyStudyLog[];
  mockScores: MockLogEntry[];
  settings: UserSettings;
  stats: StudyStats;
  /** Insert or replace the log for `log.date`. An empty log removes that day. */
  saveStudyLog: (log: Partial<DailyStudyLog> & { date: string }) => DailyStudyLog | null;
  /**
   * Atomic read-modify-write of one day. `fn` receives the latest stored log for that date (undefined when the day is empty)
   * and returns the log to store, or null to leave the day as it is. Returns what was there before and what is stored now.
   */
  mutateStudyLog: (date: string, fn: (prev: DailyStudyLog | undefined) => DailyStudyLog | null) => { before: DailyStudyLog | undefined; after: DailyStudyLog | null } | null;
  deleteStudyLog: (id: string) => void;
  /** Delete logs with start <= date <= end (inclusive). Returns the removed logs (for undo). */
  deleteStudyLogsInRange: (start: string, end: string) => DailyStudyLog[];
  /** Restore logs (undo). */
  restoreStudyLogs: (logs: DailyStudyLog[]) => void;
  clearStudyLogs: () => void;
  saveMockScore: (score: Omit<MockLogEntry, 'id'> & { id?: string }) => MockLogEntry;
  deleteMockScore: (id: string) => void;
  restoreMockScore: (m: MockLogEntry) => void;
  clearMockScores: () => void;
  clearManifestationData: () => void;
  /** Wipes logs, mocks, manifest, targets, backlog and plan settings for the current level & group. */
  clearAllData: () => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  exportBackup: () => BackupPayload;
  /** Restore from a backup file. `replace` overwrites this level's logs/mocks; `merge` keeps both (imported wins). */
  importBackupData: (data: unknown, mode?: 'replace' | 'merge') => { logs: number; mocks: number };
  /** Local calendar day, refreshed at midnight. */
  today: string;
  /** Collected quests and the never-drop rank floor. */
  game: GameState;
  /** Today's and this week's quests, with progress worked out from the logs. */
  quests: Quest[];
  /** Collect a finished quest. Returns the XP gained (0 when it is not ready or already collected). */
  claimQuest: (key: string) => number;
  /** Whole days until the exam (negative once it has passed). */
  daysLeft: number;
  /** What to focus on, given the days left. */
  phase: Phase;
}

const Ctx = createContext<StudyApi | undefined>(undefined);

export function StudyProvider({ children }: { children: ReactNode }) {
  const { level, suffix, subjects, allSubjectsInGroup } = useLevelConfig();
  const [logs, setLogs] = useState<DailyStudyLog[]>(() => loadLogs(level));
  const [mocks, setMocks] = useState<MockLogEntry[]>(() => loadMocks(level));
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [game, setGame] = useState<GameState>(() => loadGame(level));
  const [today, setToday] = useState(todayStr);

  const logsRef = useRef(logs); logsRef.current = logs;
  const mocksRef = useRef(mocks); mocksRef.current = mocks;
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const gameRef = useRef(game); gameRef.current = game;

  // Keep "today" correct across midnight and when the tab wakes from sleep.
  useEffect(() => {
    const tick = () => setToday((prev) => { const t = todayStr(); return t === prev ? prev : t; });
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  // Sound follows the settings; accent theme is applied to <html>.
  useEffect(() => {
    sfx.configure({ enabled: settings.hudChimes !== false, volume: (settings.sfxVolume ?? 80) / 100, kit: settings.sfxKit ?? 'soft', level: settings.sfxLevel ?? 'full', haptics: settings.haptics !== false });
  }, [settings.hudChimes, settings.sfxVolume, settings.sfxKit, settings.sfxLevel, settings.haptics]);
  useEffect(() => { document.documentElement.setAttribute('data-accent', settings.accent || 'aurora'); }, [settings.accent]);
  useEffect(() => { document.documentElement.setAttribute('data-world', normaliseWorld(settings.worldTheme)); }, [settings.worldTheme]);
  useEffect(() => { document.documentElement.setAttribute('data-ui', settings.ui === 'classic' ? 'classic' : 'ios'); }, [settings.ui]);
  useEffect(() => { applyGlass(settings.glass); }, [settings.glass]);
  useEffect(() => { applyWallpaperMode(settings.wallpaper); }, [settings.wallpaper]);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.logs(level)) setLogs(loadLogs(level));
      else if (e.key === KEYS.mocks(level)) setMocks(loadMocks(level));
      else if (e.key === KEYS.settings) setSettings(loadSettings());
      else if (e.key === KEYS.game(level)) setGame(loadGame(level));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [level]);

  const commitLogs = useCallback((next: DailyStudyLog[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    logsRef.current = sorted; setLogs(sorted); writeJSON(KEYS.logs(level), sorted);
  }, [level]);
  const commitMocks = useCallback((next: MockLogEntry[]) => {
    mocksRef.current = next; setMocks(next); writeJSON(KEYS.mocks(level), next);
  }, [level]);

  const commitGame = useCallback((next: GameState) => { gameRef.current = next; setGame(next); writeJSON(KEYS.game(level), next); }, [level]);

  const saveStudyLog: StudyApi['saveStudyLog'] = useCallback((input) => {
    if (!isValidYmd(input.date)) return null;
    const log = normaliseLog(input);
    const empty = !SLOTS.some((s) => getSlot(log, s).subject) && logHours(log) === 0;
    const rest = logsRef.current.filter((l) => l.date !== log.date);
    const prev = logsRef.current.find((l) => l.date === log.date);
    if (prev?.createdAt) log.createdAt = prev.createdAt;
    commitLogs(empty ? rest : [...rest, log]);
    return empty ? null : log;
  }, [commitLogs]);

  const mutateStudyLog: StudyApi['mutateStudyLog'] = useCallback((date, fn) => {
    if (!isValidYmd(date)) return null;
    const before = logsRef.current.find((l) => l.date === date);
    const next = fn(before);
    if (!next) return { before, after: before ?? null };
    return { before, after: saveStudyLog({ ...next, date }) };
  }, [saveStudyLog]);

  const deleteStudyLog = useCallback((id: string) => commitLogs(logsRef.current.filter((l) => l.id !== id && l.date !== id)), [commitLogs]);
  const deleteStudyLogsInRange = useCallback((start: string, end: string) => {
    const [a, b] = start <= end ? [start, end] : [end, start];
    const removed = logsRef.current.filter((l) => l.date >= a && l.date <= b);
    if (removed.length) commitLogs(logsRef.current.filter((l) => l.date < a || l.date > b));
    return removed;
  }, [commitLogs]);
  const restoreStudyLogs = useCallback((list: DailyStudyLog[]) => {
    const map = new Map(logsRef.current.map((l) => [l.date, l] as const));
    list.forEach((l) => map.set(l.date, normaliseLog(l)));
    commitLogs([...map.values()]);
  }, [commitLogs]);
  const clearStudyLogs = useCallback(() => commitLogs([]), [commitLogs]);

  const saveMockScore: StudyApi['saveMockScore'] = useCallback((score) => {
    const entry: MockLogEntry = {
      id: score.id || uid('m'), date: isValidYmd(score.date) ? score.date : todayStr(),
      subject: score.subject, marks: Math.max(0, Number(score.marks) || 0), notes: score.notes || '',
    };
    commitMocks([...mocksRef.current.filter((m) => m.id !== entry.id), entry]);
    return entry;
  }, [commitMocks]);
  const deleteMockScore = useCallback((id: string) => commitMocks(mocksRef.current.filter((m) => m.id !== id)), [commitMocks]);
  const restoreMockScore = useCallback((m: MockLogEntry) => commitMocks([...mocksRef.current.filter((x) => x.id !== m.id), m]), [commitMocks]);
  const clearMockScores = useCallback(() => commitMocks([]), [commitMocks]);
  const clearManifestationData = useCallback(() => removeKey(KEYS.manifest(level)), [level]);
  const clearAllData = useCallback(() => {
    commitLogs([]); commitMocks([]);
    removeKey(KEYS.manifest(level));
    removeKey(KEYS.game(level)); gameRef.current = EMPTY_GAME; setGame(EMPTY_GAME);
    removeKey(KEYS.sessions(level));
    clearSuffixData(suffix);
    window.dispatchEvent(new Event('backlog_changed'));
    window.dispatchEvent(new Event('ca_data_cleared'));
  }, [commitLogs, commitMocks, level, suffix]);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    if (patch.dailyGoalHours !== undefined) next.dailyGoalHours = clamp(Number(patch.dailyGoalHours) || 8, 1, 24);
    settingsRef.current = next; setSettings(next); writeJSON(KEYS.settings, next);
  }, []);

  const exportBackup = useCallback((): BackupPayload => {
    const storage: Record<string, string> = {};
    for (const k of appKeys()) { const v = readRaw(k); if (v != null && k !== KEYS.settings) storage[k] = v; }
    return {
      appSignature: 'ca-study-tracker-v3', schema: 5, backupDate: new Date().toISOString(), level,
      settings: settingsRef.current, studyLogs: logsRef.current, mockScores: mocksRef.current, storage,
    };
  }, [level]);

  const importBackupData: StudyApi['importBackupData'] = useCallback((data, mode = 'replace') => {
    const d = data as Partial<BackupPayload> | null;
    if (!d || typeof d !== 'object') throw new Error('This file is not a valid backup.');
    if (!Array.isArray(d.studyLogs) && !d.settings && !Array.isArray(d.mockScores)) throw new Error('No study data found in this file.');
    const incomingLogs = (Array.isArray(d.studyLogs) ? d.studyLogs : [])
      .filter((l) => l && isValidYmd((l as DailyStudyLog).date)).map((l) => normaliseLog(l as DailyStudyLog));
    const incomingMocks = (Array.isArray(d.mockScores) ? d.mockScores : [])
      .filter((m) => m && typeof m.subject === 'string' && isValidYmd(m.date))
      .map((m) => ({ id: m.id || uid('m'), date: m.date, subject: m.subject, marks: Math.max(0, Number(m.marks) || 0), notes: m.notes || '' }));
    // Restore the per-level targets / manifest / plan keys that ship with a v2 backup.
    if (d.storage && typeof d.storage === 'object') {
      for (const [k, v] of Object.entries(d.storage)) {
        if (typeof v === 'string' && /^(ca_|manifestationData_)/.test(k) && k !== KEYS.settings && k !== KEYS.schema && k !== KEYS.timer && !k.startsWith('ca_notification_')) {
          if (k === KEYS.logs(level) || k === KEYS.mocks(level)) continue;
          writeRaw(k, v);
        }
      }
    }
    if (mode === 'merge') {
      const lm = new Map(logsRef.current.map((l) => [l.date, l] as const)); incomingLogs.forEach((l) => lm.set(l.date, l));
      const mm = new Map(mocksRef.current.map((m) => [m.id, m] as const)); incomingMocks.forEach((m) => mm.set(m.id, m));
      commitLogs([...lm.values()]); commitMocks([...mm.values()]);
    } else { commitLogs(incomingLogs); commitMocks(incomingMocks); }
    if (d.settings && typeof d.settings === 'object') {
      const merged = { ...DEFAULT_SETTINGS, ...settingsRef.current, ...d.settings, onboardingCompleted: true };
      if (!isValidYmd(merged.targetExamDate)) merged.targetExamDate = settingsRef.current.targetExamDate;
      settingsRef.current = merged; setSettings(merged); writeJSON(KEYS.settings, merged);
    }
    { const g = loadGame(level); gameRef.current = g; setGame(g); }
    window.dispatchEvent(new Event('backlog_changed'));
    window.dispatchEvent(new Event('ca_data_restored'));
    return { logs: incomingLogs.length, mocks: incomingMocks.length };
  }, [commitLogs, commitMocks, level]);

  const maxByName = useMemo(() => new Map(allSubjectsInGroup.map((s) => [s.name, s.marks] as const)), [allSubjectsInGroup]);
  const subjectNames = useMemo(() => subjects.map((s) => s.name), [subjects]);
  const stats = useMemo(() => computeStats({
    logs, mocks, settings, today, game, subjects: subjectNames, mockMax: (name) => maxByName.get(name) ?? 100,
  }), [logs, mocks, settings, today, game, subjectNames, maxByName]);

  // The rank you have reached is kept: it never falls, even if the exam date or goal moves the ladder.
  useEffect(() => {
    const idx = stats.rankInfo.level - 1;
    if (idx > gameRef.current.rankFloor) commitGame({ ...gameRef.current, rankFloor: idx });
  }, [stats.rankInfo.level, commitGame]);

  const quests = useMemo(() => buildQuests({
    today, logs, mocks, goal: settings.dailyGoalHours, subjects: subjectNames,
    subjectHours: stats.subjectHours, dailyTotals: stats.dailyTotals, claims: game.claims,
  }), [today, logs, mocks, settings.dailyGoalHours, subjectNames, stats.subjectHours, stats.dailyTotals, game.claims]);

  const questsRef = useRef(quests); questsRef.current = quests;
  const claimQuest = useCallback((key: string) => {
    const q = questsRef.current.find((x) => x.key === key);
    if (!q || !q.done || q.claimed) return 0;
    commitGame({ ...gameRef.current, claims: { ...gameRef.current.claims, [key]: q.xp } });
    return q.xp;
  }, [commitGame]);

  const daysLeft = diffDays(today, settings.targetExamDate);
  const phase = useMemo(() => phaseFor(daysLeft), [daysLeft]);

  const value = useMemo<StudyApi>(() => ({
    studyLogs: logs, mockScores: mocks, settings, stats, today, game, quests, claimQuest, daysLeft, phase,
    saveStudyLog, mutateStudyLog, deleteStudyLog, deleteStudyLogsInRange, restoreStudyLogs, clearStudyLogs,
    saveMockScore, deleteMockScore, restoreMockScore, clearMockScores, clearManifestationData, clearAllData,
    updateSettings, exportBackup, importBackupData,
  }), [logs, mocks, settings, stats, today, game, quests, claimQuest, daysLeft, phase, saveStudyLog, mutateStudyLog, deleteStudyLog, deleteStudyLogsInRange, restoreStudyLogs, clearStudyLogs,
    saveMockScore, deleteMockScore, restoreMockScore, clearMockScores, clearManifestationData, clearAllData, updateSettings, exportBackup, importBackupData]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudy(): StudyApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStudy must be used within a StudyProvider');
  return c;
}

export type { ThemeId };
