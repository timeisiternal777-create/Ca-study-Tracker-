// The study timer: one running session for the whole app, kept in localStorage so it survives reloads, sleep and closing the app.
// All the rules (time from timestamps, midnight splits, same-subject merging, undo) live in lib/timer.ts and are tested there.
// This file connects them to storage, the study log, sounds, toasts and the questions we ask after a long absence.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Level } from '../types';
import { useLevelConfig } from './LevelContext';
import { useStudy } from './StudyContext';
import { useToast } from '../components/ui';
import { NAV_BY_ID } from '../config/nav';
import { weekdayShort } from '../lib/date';
import { fmtHM, uid } from '../lib/format';
import { logHours, sameSubject } from '../lib/log';
import { navigateTo, useRoute } from '../lib/nav';
import { sfx } from '../lib/sfx';
import { BEAST_HOURS } from '../lib/stats';
import { KEYS, readJSON, removeKey, writeJSON } from '../lib/storage';
import * as ticker from '../lib/ticker';
import * as T from '../lib/timer';

export type TimerPrompt =
  /** The app was out of sight for hours while the timer ran. */
  | { kind: 'away'; info: T.AwayInfo; seen: number }
  /** A paused timer was left alone for a long time. */
  | { kind: 'stale'; ms: number; since: number }
  /** Stopping would save a very long session. The timer is paused until the answer. */
  | { kind: 'long'; ms: number; next?: { subject: string; topic: string } }
  /** Stop was pressed while another level is open. */
  | { kind: 'level'; level: Level }
  /** Throw the session away? */
  | { kind: 'discard'; ms: number };

export type PromptAnswer = 'keep' | 'skip' | 'save' | 'resume' | 'discard' | 'switch';

export interface TimerApi {
  state: T.TimerState;
  active: boolean;
  running: boolean;
  paused: boolean;
  /** The timer belongs to the level that is open (or there is no timer). */
  here: boolean;
  start: (subject: string, topic?: string) => boolean;
  pause: () => void;
  resume: () => void;
  /** Stops and saves the session into the study log. */
  stop: () => void;
  /** Saves the session and starts another subject at the same moment. */
  switchTo: (subject: string, topic?: string) => void;
  setTopic: (topic: string) => void;
  askDiscard: () => void;
  /** Finished sessions of this level, newest first. */
  sessions: T.Session[];
  undoSession: (id: string) => void;
  retrySession: (id: string) => void;
  /** Milliseconds of the running session that fall on `date` (for live progress on today's dial). */
  liveMsOn: (date: string) => number;
  /** The subject sheet. `subject` is a suggestion. */
  startSheet: { subject?: string } | null;
  openStart: (subject?: string) => void;
  closeStart: () => void;
  focusOpen: boolean;
  openFocus: () => void;
  closeFocus: () => void;
  prompt: TimerPrompt | null;
  answer: (a: PromptAnswer) => void;
  closePrompt: () => void;
}

const Ctx = createContext<TimerApi | null>(null);

const loadTimer = (level: Level) => T.sanitizeTimer(readJSON<unknown>(KEYS.timer, null), level);
const loadSessions = (level: Level) => T.sanitizeSessions(readJSON<unknown>(KEYS.sessions(level), []));

interface WakeLockLike { release: () => Promise<void> }
interface WithWakeLock { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }

const dayWord = (date: string, today: string) => (date === today ? 'today' : weekdayShort(date));

export function TimerProvider({ children }: { children: ReactNode }) {
  const { level, setLevel } = useLevelConfig();
  const study = useStudy();
  const toast = useToast();
  const route = useRoute();

  const [state, setState] = useState<T.TimerState>(() => loadTimer(level));
  const [sessions, setSessions] = useState<T.Session[]>(() => loadSessions(level));
  const [prompt, setPrompt] = useState<TimerPrompt | null>(null);
  const [startSheet, setStartSheet] = useState<{ subject?: string } | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);

  const stateRef = useRef(state);
  const sessionsRef = useRef(sessions);
  const studyRef = useRef(study); studyRef.current = study;
  const toastRef = useRef(toast); toastRef.current = toast;
  const levelRef = useRef(level); levelRef.current = level;
  const routeRef = useRef(route); routeRef.current = route;
  const promptRef = useRef(prompt); promptRef.current = prompt;

  // ───────── storage ─────────
  const commit = useCallback((next: T.TimerState) => {
    stateRef.current = next;
    setState(next);
    if (next.status === 'idle') removeKey(KEYS.timer); else writeJSON(KEYS.timer, next);
    ticker.refresh();
  }, []);

  /** Leaves the "last seen" mark without waking anything up. */
  const mark = useCallback((now: number) => {
    const st = stateRef.current;
    const hb = T.heartbeat(st, now);
    if (hb !== st) { stateRef.current = hb; writeJSON(KEYS.timer, hb); }
  }, []);

  const saveSessions = useCallback((list: T.Session[]) => {
    sessionsRef.current = list; setSessions(list); writeJSON(KEYS.sessions(levelRef.current), list);
  }, []);

  // ───────── the document title shows the clock ─────────
  const refreshTitle = useCallback(() => {
    const st = stateRef.current;
    if (st.status === 'idle') document.title = `${NAV_BY_ID[routeRef.current].label} · CA Study Tracker`;
    else document.title = `${st.status === 'paused' ? '⏸' : '●'} ${T.fmtClock(T.elapsedMs(st, Date.now()))} · ${st.subject}`;
  }, []);
  useEffect(refreshTitle, [route, state.status, state.subject, refreshTitle]);

  // ───────── saving a session ─────────
  const describe = (s: T.Session, today: string) => {
    const logged = s.parts.filter((p) => p.logged && p.minutes > 0);
    if (logged.length <= 1) return `Added ${T.fmtMinutes(T.sessionMinutes(s))} to ${s.subject}`;
    return `Added ${logged.map((p, i) => `${T.fmtMinutes(p.minutes)}${i === 0 ? ` of ${s.subject}` : ''} ${dayWord(p.date, today)}`).join(' and ')}`;
  };

  const announce = useCallback((s: T.Session, hours: Map<string, [number, number]>) => {
    const { today, settings } = studyRef.current;
    const added = T.sessionMinutes(s), pending = T.sessionPending(s);
    const wanted = s.parts.reduce((a, p) => a + p.want, 0);
    const [before, after] = hours.get(today) ?? [0, 0];
    const goal = settings.dailyGoalHours;
    const undo = { label: 'Undo', onClick: () => undoRef.current(s.id) };
    if (pending > 0) {
      toastRef.current({ message: `No free slot for ${s.subject}`, sub: `A day holds six subjects. ${T.fmtMinutes(pending)} is kept in your sessions: free a slot in the Study log, then add it.`, tone: 'warn', duration: 9000, action: { label: 'Open log', onClick: () => navigateTo('LOG') } });
    } else if (added === 0 && wanted > 0) {
      toastRef.current({ message: 'That day is already full', sub: 'A day holds at most 24 hours.', tone: 'warn' });
    } else if (before < BEAST_HOURS && after >= BEAST_HOURS && s.parts.some((p) => p.date === today)) {
      toastRef.current({ message: 'Beast mode unlocked', sub: `${fmtHM(after)} today`, tone: 'good', action: undo });
    } else if (before < goal && after >= goal && s.parts.some((p) => p.date === today)) {
      toastRef.current({ message: 'Daily goal reached', sub: `${fmtHM(after)} of ${fmtHM(goal)}`, tone: 'good', action: undo });
    } else {
      sfx.play('timerDone');
      const trimmed = s.parts.some((p) => p.logged && p.want > p.minutes);
      toastRef.current({
        message: describe(s, today),
        sub: trimmed ? 'A day holds at most 24 hours, so a little was left out.' : `Today: ${fmtHM(after)} of ${fmtHM(goal)}`,
        tone: 'good', action: undo,
      });
    }
  }, []);

  const finalize = useCallback((st: T.TimerState, plan: T.Plan, next?: { subject: string; topic: string }) => {
    const now = Date.now();
    // Claim first: once the timer is idle, a second tab or a double tap cannot save the same session twice.
    commit(next ? T.startTimer(st.level, next.subject, next.topic, now, uid('t')) : T.idleTimer(st.level));
    const hours = new Map<string, [number, number]>();
    const mutate: T.Mutate = (date, fn) => {
      const r = studyRef.current.mutateStudyLog(date, fn);
      if (r) hours.set(date, [logHours(r.before), logHours(r.after ?? undefined)]);
      return r;
    };
    let session: T.Session;
    try { session = T.commitSession(st, plan, mutate); } catch {
      commit(st);
      toastRef.current({ message: 'Could not save the session', sub: 'Your timer is still running. Try stopping it again.', tone: 'bad' });
      return;
    }
    saveSessions(T.pushSession(sessionsRef.current, session));
    announce(session, hours);
    if (next) sfx.play('timerStart');
  }, [announce, commit, saveSessions]);

  // ───────── actions ─────────
  const start = useCallback((subject: string, topic = '') => {
    const name = subject.trim();
    if (!name || stateRef.current.status !== 'idle') return false;
    commit(T.startTimer(levelRef.current, name, topic, Date.now(), uid('t')));
    sfx.play('timerStart');
    return true;
  }, [commit]);

  const pause = useCallback(() => {
    const st = stateRef.current;
    if (st.status !== 'running') return;
    commit(T.pauseTimer(st, Date.now()));
    sfx.play('timerPause');
  }, [commit]);

  const resume = useCallback(() => {
    const st = stateRef.current;
    if (st.status !== 'paused') return;
    commit(T.resumeTimer(st, Date.now()));
    sfx.play('timerResume');
  }, [commit]);

  const stopWith = useCallback((next?: { subject: string; topic: string }) => {
    const st = stateRef.current;
    if (st.status === 'idle') return;
    if (st.level !== levelRef.current) { setPrompt({ kind: 'level', level: st.level }); return; }
    const now = Date.now();
    const plan = T.planSession(st, now);
    if (plan.kind === 'discard') {
      commit(next ? T.startTimer(st.level, next.subject, next.topic, now, uid('t')) : T.idleTimer(st.level));
      toastRef.current({ message: 'Too short to save', sub: 'Sessions under 30 seconds are not logged.', tone: 'info' });
      return;
    }
    if (plan.kind === 'long') {
      // Freeze the clock at this moment, then ask. Nothing is lost whichever way the question is answered.
      commit(T.pauseTimer(st, now));
      setPrompt({ kind: 'long', ms: plan.ms, next });
      return;
    }
    finalize(st, plan, next);
  }, [commit, finalize]);

  const stop = useCallback(() => stopWith(), [stopWith]);

  const switchTo = useCallback((subject: string, topic = '') => {
    const st = stateRef.current;
    const name = subject.trim();
    if (!name) return;
    if (st.status === 'idle') { start(name, topic); return; }
    if (sameSubject(st.subject, name)) { commit(T.retopic(st, topic || st.topic)); return; }
    stopWith({ subject: name, topic });
  }, [commit, start, stopWith]);

  const setTopic = useCallback((topic: string) => {
    const st = stateRef.current;
    if (st.status !== 'idle') commit(T.retopic(st, topic));
  }, [commit]);

  const askDiscard = useCallback(() => {
    const st = stateRef.current;
    if (st.status !== 'idle') setPrompt({ kind: 'discard', ms: T.elapsedMs(st, Date.now()) });
  }, []);

  const mutateLog: T.Mutate = (date, fn) => studyRef.current.mutateStudyLog(date, fn);

  const undoSession = useCallback((id: string) => {
    const s = sessionsRef.current.find((x) => x.id === id);
    if (!s) return;
    T.revertSession(s, (date, fn) => studyRef.current.mutateStudyLog(date, fn));
    saveSessions(sessionsRef.current.filter((x) => x.id !== id));
    sfx.play('undo');
  }, [saveSessions]);
  const undoRef = useRef(undoSession); undoRef.current = undoSession;

  const retrySession = useCallback((id: string) => {
    const s = sessionsRef.current.find((x) => x.id === id);
    if (!s) return;
    const next = T.retryPending(s, mutateLog);
    saveSessions(sessionsRef.current.map((x) => (x.id === id ? next : x)));
    if (T.sessionPending(next) > 0) toastRef.current({ message: `Still no free slot on that day`, sub: 'Free a slot in the Study log first.', tone: 'warn' });
    else { sfx.play('timerDone'); toastRef.current({ message: `Added ${T.fmtMinutes(T.sessionMinutes(next))} to ${next.subject}`, tone: 'good' }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSessions]);

  const answer = useCallback((a: PromptAnswer) => {
    const p = promptRef.current;
    const st = stateRef.current;
    const now = Date.now();
    setPrompt(null);
    if (!p) return;
    if (p.kind === 'away') {
      if (st.status !== 'running') return;
      if (a === 'keep') mark(now);
      else if (a === 'skip') commit(T.skipAway(st, now));
      else if (a === 'save') {
        const plan = T.planSession(st, Math.min(now, st.seen));
        if (plan.kind === 'discard') { commit(T.idleTimer(st.level)); toastRef.current({ message: 'Too short to save', tone: 'info' }); }
        else finalize(st, plan);
      } else if (a === 'discard') commit(T.idleTimer(st.level));
    } else if (p.kind === 'stale') {
      if (a === 'resume') commit(T.resumeTimer(st, now));
      else if (a === 'save') { const plan = T.planSession(st, now); if (plan.kind === 'discard') commit(T.idleTimer(st.level)); else finalize(st, plan); }
      else if (a === 'discard') commit(T.idleTimer(st.level));
    } else if (p.kind === 'long') {
      if (a === 'save') finalize(st, T.planSession(st, now), p.next);
      else if (a === 'keep' || a === 'resume') commit(T.resumeTimer(st, now));
      else if (a === 'discard') commit(p.next ? T.startTimer(st.level, p.next.subject, p.next.topic, now, uid('t')) : T.idleTimer(st.level));
    } else if (p.kind === 'level') {
      if (a === 'switch') setLevel(p.level);
    } else if (p.kind === 'discard') {
      if (a === 'discard') { commit(T.idleTimer(st.level)); sfx.play('delete'); }
    }
  }, [commit, finalize, mark, setLevel]);

  const closePrompt = useCallback(() => setPrompt(null), []);

  const liveMsOn = useCallback((date: string) => {
    const st = stateRef.current;
    return st.status === 'idle' ? 0 : T.msByDate(T.segmentsUntil(st, Date.now())).get(date) ?? 0;
  }, []);

  // ───────── coming back ─────────
  const checkAway = useCallback(() => {
    const st = stateRef.current;
    const now = Date.now();
    if (st.status === 'running') {
      const a = T.awayInfo(st, now);
      if (a.away) { if (!promptRef.current) setPrompt({ kind: 'away', info: a, seen: st.seen }); return; }
      if (a.note) {
        toastRef.current({
          message: `Kept counting while you were away`, sub: `${T.fmtMinutes(a.gone / 60000)} of this session passed while the app was out of sight.`,
          tone: 'info', duration: 9000,
          action: { label: 'Remove that time', onClick: () => { const cur = stateRef.current; if (cur.status === 'running') commit(T.skipAway(cur, Date.now())); } },
        });
      }
      mark(now);
    } else if (T.stalePaused(st, now) && !promptRef.current) {
      setPrompt({ kind: 'stale', ms: T.elapsedMs(st, now), since: st.seen });
    }
  }, [commit, mark]);

  useEffect(() => {
    ticker.attach(() => { const st = stateRef.current; return { ms: T.elapsedMs(st, Date.now()), running: st.status === 'running' }; });
    checkAway();
    const beat = () => {
      const st = stateRef.current;
      if (st.status !== 'running') return;
      const now = Date.now();
      if (now - st.seen > T.AWAY_NOTE_MS) checkAway(); else mark(now); // a long gap means the device slept
    };
    const id = window.setInterval(beat, T.HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === 'hidden') mark(Date.now());
      else { checkAway(); ticker.refresh(); refreshTitle(); }
    };
    const onHide = () => mark(Date.now());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onVis);
    };
  }, [checkAway, mark, refreshTitle]);

  // Another tab or window changed the timer or the history.
  useEffect(() => {
    const reloadTimer = () => { const next = loadTimer(levelRef.current); stateRef.current = next; setState(next); ticker.refresh(); };
    const reloadSessions = () => { const next = loadSessions(levelRef.current); sessionsRef.current = next; setSessions(next); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === KEYS.timer) reloadTimer();
      if (e.key === null || e.key === KEYS.sessions(levelRef.current)) reloadSessions();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('ca_data_restored', reloadSessions);
    window.addEventListener('ca_data_cleared', reloadSessions);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('ca_data_restored', reloadSessions); window.removeEventListener('ca_data_cleared', reloadSessions); };
  }, []);

  // ───────── every second: title and gentle messages ─────────
  useEffect(() => {
    let prev = T.elapsedMs(stateRef.current, Date.now());
    return ticker.subscribe(() => {
      const st = stateRef.current;
      if (st.status !== 'running') { prev = T.elapsedMs(st, Date.now()); return; }
      const ms = T.elapsedMs(st, Date.now());
      refreshTitle();
      const { settings } = studyRef.current;
      const hit = settings.timerNudges === false ? null : T.milestoneCrossed(prev, ms);
      const chimes = T.marksCrossed(prev, ms, settings.timerChime ?? 0);
      prev = ms;
      if (hit) { sfx.play('timerMark'); toastRef.current({ message: hit.text, tone: 'info', duration: 4200 }); }
      else if (chimes > 0) sfx.play('timerMark');
    });
  }, [refreshTitle]);

  // ───────── keep the screen on while it runs ─────────
  const wake = study.settings.timerWakeLock !== false;
  useEffect(() => {
    const wl = (navigator as unknown as WithWakeLock).wakeLock;
    if (state.status !== 'running' || !wake || !wl) return;
    let lock: WakeLockLike | null = null;
    let gone = false;
    const take = async () => {
      if (document.visibilityState !== 'visible' || lock) return;
      try { const l = await wl.request('screen'); if (gone) void l.release().catch(() => undefined); else lock = l; } catch { /* not allowed right now */ }
    };
    const onVis = () => { if (document.visibilityState === 'visible') { lock = null; void take(); } };
    void take();
    document.addEventListener('visibilitychange', onVis);
    return () => { gone = true; document.removeEventListener('visibilitychange', onVis); void lock?.release().catch(() => undefined); lock = null; };
  }, [state.status, wake]);

  // ───────── value ─────────
  const api = useMemo<TimerApi>(() => ({
    state, active: state.status !== 'idle', running: state.status === 'running', paused: state.status === 'paused',
    here: state.status === 'idle' || state.level === level,
    start, pause, resume, stop, switchTo, setTopic, askDiscard, sessions, undoSession, retrySession, liveMsOn,
    startSheet, openStart: (subject) => setStartSheet({ subject }), closeStart: () => setStartSheet(null),
    focusOpen, openFocus: () => setFocusOpen(true), closeFocus: () => setFocusOpen(false),
    prompt, answer, closePrompt,
  }), [state, level, start, pause, resume, stop, switchTo, setTopic, askDiscard, sessions, undoSession, retrySession, liveMsOn, startSheet, focusOpen, prompt, answer, closePrompt]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useTimer(): TimerApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTimer must be used inside <TimerProvider>');
  return c;
}
