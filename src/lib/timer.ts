// Study timer logic. Pure functions only (no storage, no React), so every rule can be tested on its own.
//
// How a session turns into log hours:
//  1. The timer keeps *run segments* (from, to) in real clock time. Pausing closes a segment, resuming opens a new one.
//     Elapsed time is always worked out from those timestamps, never from counting ticks, so closing the app,
//     a sleeping tablet or a throttled background tab cannot lose or add time.
//  2. On stop the segments are cut at local midnights and turned into whole minutes per calendar day.
//  3. Each day's minutes are merged into that day's log: the same subject (ignoring case and spaces) always adds to
//     the entry it already has; a new subject takes the first free slot (a day holds six). Nothing is ever duplicated.
//  4. Undo subtracts exactly what was added from that slot, so it still works if the day was edited in between.

import type { DailyStudyLog, Level } from '../types';
import { ymd } from './date';
import { SLOTS, emptyLog, firstFreeSlot, getSlot, logHours, slotOfSubject, withSlot, type Slot } from './log';

/** A session shorter than this is thrown away (an accidental tap). */
export const MIN_SESSION_MS = 30_000;
/** A single session longer than this asks for confirmation. */
export const LONG_SESSION_MS = 6 * 3_600_000;
/** Coming back after this long, the timer says how much time it counted meanwhile (and offers to take it off). */
export const AWAY_NOTE_MS = 10 * 60_000;
/**
 * Coming back after more than this, the timer asks what to do. Shorter than this it just keeps counting: the usual
 * reason is reading notes in another app, and that is studying.
 */
export const AWAY_MS = 3 * 3_600_000;
/** A paused timer that nobody came back to for this long asks what to do. */
export const STALE_PAUSE_MS = 6 * 3_600_000;
/** How often the running timer leaves a "last seen" mark. */
export const HEARTBEAT_MS = 15_000;
/** No day of the log can hold more than this (the log already limits one entry to 24 h). */
export const LOG_DAY_MAX_HOURS = 24;
/** Same limit as the topic box in the log. */
export const TOPIC_MAX = 140;
/** How many finished sessions are kept per level. */
export const HISTORY_MAX = 300;

export interface Segment { from: number; to: number }
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  v: 1;
  id: string;
  status: TimerStatus;
  /** The level this session belongs to. */
  level: Level;
  subject: string;
  topic: string;
  /** When the session first started (ms). */
  startedAt: number;
  /** Finished runs. */
  segments: Segment[];
  /** Start of the run in progress (ms), 0 when not running. */
  runFrom: number;
  /** Last time the app confirmed it was open (ms). */
  seen: number;
}

export const idleTimer = (level: Level = 'inter'): TimerState => ({ v: 1, id: '', status: 'idle', level, subject: '', topic: '', startedAt: 0, segments: [], runFrom: 0, seen: 0 });

const LEVELS: Level[] = ['foundation', 'inter', 'final'];
const posNum = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const cleanText = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Coerce stored JSON into a valid state. Anything odd becomes idle. */
export function sanitizeTimer(raw: unknown, fallbackLevel: Level = 'inter'): TimerState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const level = LEVELS.includes(r.level as Level) ? (r.level as Level) : fallbackLevel;
  const status = r.status === 'running' || r.status === 'paused' ? r.status : 'idle';
  if (status === 'idle' || typeof r.subject !== 'string' || !r.subject.trim()) return idleTimer(level);
  const segments: Segment[] = Array.isArray(r.segments)
    ? (r.segments as unknown[]).map((s) => ({ from: posNum((s as Segment)?.from), to: posNum((s as Segment)?.to) })).filter((s) => s.from > 0 && s.to >= s.from)
    : [];
  const runFrom = posNum(r.runFrom);
  const startedAt = posNum(r.startedAt) || segments[0]?.from || runFrom;
  if (!startedAt) return idleTimer(level);
  // "Running" with no run start cannot be trusted as running; treat it as paused so no time is invented.
  const fixed: TimerStatus = status === 'running' && !runFrom ? 'paused' : status;
  return {
    v: 1, id: typeof r.id === 'string' && r.id ? r.id : `t${startedAt}`, status: fixed, level, subject: cleanText(r.subject),
    topic: typeof r.topic === 'string' ? cleanTopic(r.topic) : '', startedAt, segments, runFrom: fixed === 'running' ? runFrom : 0,
    seen: posNum(r.seen) || runFrom || segments[segments.length - 1]?.to || startedAt,
  };
}

// ───────────────────────── running the clock ─────────────────────────

/** A topic never holds ";" (that is the separator inside a slot) and is cut to the log's limit. */
export const cleanTopic = (s: string) => cleanText(s.replace(/;/g, ',')).slice(0, TOPIC_MAX);

export function startTimer(level: Level, subject: string, topic: string, now: number, id: string): TimerState {
  return { v: 1, id, status: 'running', level, subject: cleanText(subject), topic: cleanTopic(topic), startedAt: now, segments: [], runFrom: now, seen: now };
}

const lenOf = (s: Segment) => Math.max(0, s.to - s.from);

/** Time on the clock right now, in ms. A clock that jumps backwards never makes this negative. */
export function elapsedMs(s: TimerState, now: number): number {
  if (s.status === 'idle') return 0;
  let t = 0;
  for (const g of s.segments) t += lenOf(g);
  if (s.status === 'running' && s.runFrom) t += Math.max(0, now - s.runFrom);
  return t;
}

export function pauseTimer(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s;
  return { ...s, status: 'paused', segments: [...s.segments, { from: s.runFrom, to: Math.max(s.runFrom, now) }], runFrom: 0, seen: now };
}

export function resumeTimer(s: TimerState, now: number): TimerState {
  if (s.status !== 'paused') return s;
  return { ...s, status: 'running', runFrom: now, seen: now };
}

/** Leaves a "last seen" mark. Only a running timer needs one. */
export function heartbeat(s: TimerState, now: number): TimerState {
  return s.status === 'running' && now > s.seen ? { ...s, seen: now } : s;
}

/** Changes what the session is about without touching the clock. */
export function retopic(s: TimerState, topic: string): TimerState {
  return s.status === 'idle' ? s : { ...s, topic: cleanTopic(topic) };
}

/** All run segments up to `until` (ms), including the run in progress. */
export function segmentsUntil(s: TimerState, until: number): Segment[] {
  if (s.status === 'idle') return [];
  const out: Segment[] = [];
  for (const g of s.segments) { const to = Math.min(g.to, until); if (to > g.from) out.push({ from: g.from, to }); }
  if (s.status === 'running' && s.runFrom && until > s.runFrom) out.push({ from: s.runFrom, to: until });
  return out;
}

export const segmentsMs = (segs: Segment[]) => segs.reduce((a, g) => a + lenOf(g), 0);

export interface AwayInfo {
  /** out of sight for longer than AWAY_NOTE_MS */
  note: boolean;
  /** out of sight for longer than AWAY_MS: ask what to do */
  away: boolean;
  /** how long the app has been out of sight while the clock ran (ms) */
  gone: number;
  /** session length if it is cut at the last-seen time (ms) */
  untilSeen: number;
  /** session length if everything counts (ms) */
  all: number;
}

/** Did the timer keep running while the app was closed, in the background or the device slept? */
export function awayInfo(s: TimerState, now: number): AwayInfo {
  const all = elapsedMs(s, now);
  if (s.status !== 'running') return { note: false, away: false, gone: 0, untilSeen: all, all };
  const gone = Math.max(0, now - s.seen);
  return { note: gone > AWAY_NOTE_MS, away: gone > AWAY_MS, gone, untilSeen: segmentsMs(segmentsUntil(s, Math.min(now, s.seen))), all };
}

/** Takes the time since the app was last seen off the session and keeps the clock running from now. */
export function skipAway(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s;
  const at = Math.min(Math.max(s.seen, s.runFrom), now);
  return { ...s, segments: [...s.segments, { from: s.runFrom, to: at }], runFrom: now, seen: now };
}

/** A paused timer that has been left alone for a long time. */
export const stalePaused = (s: TimerState, now: number) => s.status === 'paused' && now - s.seen > STALE_PAUSE_MS;

export type StopKind = 'discard' | 'ok' | 'long';
export function classifyStop(ms: number): StopKind {
  if (ms < MIN_SESSION_MS) return 'discard';
  return ms > LONG_SESSION_MS ? 'long' : 'ok';
}

// ───────────────────────── days ─────────────────────────

const nextMidnight = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };

/** Milliseconds per local calendar day. A segment that crosses midnight is split there. */
export function msByDate(segments: Segment[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const g of segments) {
    let a = g.from;
    while (a < g.to) {
      const cut = Math.min(g.to, Math.max(a + 1, nextMidnight(a)));
      const key = ymd(new Date(a));
      out.set(key, (out.get(key) || 0) + (cut - a));
      a = cut;
    }
  }
  return out;
}

/**
 * Whole minutes per day. The total always equals the rounded total of the session, so splitting a session across
 * midnight never loses or gains a minute (largest remainder method).
 */
export function minutesByDate(segments: Segment[]): { date: string; minutes: number }[] {
  const rows = [...msByDate(segments).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, ms]) => ({ date, minutes: Math.floor(ms / 60000), rem: ms % 60000 }));
  const total = rows.reduce((a, r) => a + r.minutes * 60000 + r.rem, 0);
  let left = Math.round(total / 60000) - rows.reduce((a, r) => a + r.minutes, 0);
  for (const r of [...rows].sort((a, b) => b.rem - a.rem)) { if (left <= 0) break; r.minutes += 1; left -= 1; }
  return rows.filter((r) => r.minutes > 0).map(({ date, minutes }) => ({ date, minutes }));
}

export interface Plan {
  segments: Segment[];
  /** time on the clock that will count (ms) */
  ms: number;
  /** when the counted time ends (ms) */
  endedAt: number;
  days: { date: string; minutes: number }[];
  kind: StopKind;
}

/** What stopping would save if the session were cut at `until`. */
export function planSession(s: TimerState, until: number): Plan {
  const segments = segmentsUntil(s, until);
  const ms = segmentsMs(segments);
  return { segments, ms, endedAt: segments.length ? segments[segments.length - 1].to : Math.min(until, s.startedAt || until), days: minutesByDate(segments), kind: classifyStop(ms) };
}

// ───────────────────────── merging into the log ─────────────────────────

export const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
/** Hours in a slot, as a whole number of minutes (the log stores hours; the timer thinks in minutes). */
export const slotMinutes = (hours: number) => Math.round((Number(hours) || 0) * 60);

/** Adds a topic to what a slot already says. A repeat is skipped; the 140 character limit is respected. */
export function mergeTopic(existing: string, added: string): { text: string; added: string } {
  const t = cleanTopic(added);
  if (!t) return { text: existing, added: '' };
  if (existing.split(';').some((p) => p.trim().toLowerCase() === t.toLowerCase())) return { text: existing, added: '' };
  const joined = existing ? `${existing}; ${t}` : t;
  return joined.length <= TOPIC_MAX ? { text: joined, added: t } : { text: existing, added: '' };
}

/** Takes one fragment out of a slot's topic text. */
export function removeTopic(existing: string, fragment: string): string {
  const f = fragment.trim().toLowerCase();
  if (!f) return existing;
  const parts = existing.split(';').map((p) => p.trim()).filter(Boolean);
  const i = parts.findIndex((p) => p.toLowerCase() === f);
  if (i < 0) return existing;
  parts.splice(i, 1);
  return parts.join('; ');
}

export interface ApplyResult {
  /** false when the day has no free slot for a new subject; the log is then returned unchanged */
  ok: boolean;
  log: DailyStudyLog;
  slot: Slot | 0;
  /** the subject had no entry that day, so a new one was made */
  created: boolean;
  addedMinutes: number;
  /** minutes that did not fit in the 24 hour day */
  trimmedMinutes: number;
  /** the topic text this session added to the slot ('' when it added none) */
  topicAdded: string;
}

/**
 * Adds `minutes` of `subject` to a day's log. Same subject => the entry it already has. New subject => the first free slot.
 * Returns null when there is nothing to add (no subject or no minutes).
 */
export function applyMinutes(prev: DailyStudyLog | undefined, date: string, subject: string, topic: string, minutes: number): ApplyResult | null {
  const name = cleanText(subject);
  const want = Math.round(minutes);
  if (!name || !(want > 0)) return null;
  const base = prev ?? emptyLog(date);
  const slot: Slot | 0 = slotOfSubject(base, name) || firstFreeSlot(base);
  if (!slot) return { ok: false, log: base, slot: 0, created: false, addedMinutes: 0, trimmedMinutes: want, topicAdded: '' };
  const cur = getSlot(base, slot);
  const curMin = slotMinutes(cur.hours);
  const dayMin = Math.round(logHours(base) * 60);
  const room = Math.max(0, Math.min(LOG_DAY_MAX_HOURS * 60 - dayMin, LOG_DAY_MAX_HOURS * 60 - curMin));
  const added = Math.min(want, room);
  if (added <= 0) return { ok: true, log: base, slot, created: false, addedMinutes: 0, trimmedMinutes: want, topicAdded: '' };
  const m = mergeTopic(cur.topic, topic);
  const log = withSlot(base, slot, { subject: cur.subject || name, hours: round4((curMin + added) / 60), topic: m.text });
  return { ok: true, log, slot, created: !cur.subject, addedMinutes: added, trimmedMinutes: want - added, topicAdded: m.added };
}

/** Packs filled slots to the front (no gaps), like the study log does when you save a day. */
export function compactLog(log: DailyStudyLog): DailyStudyLog {
  const kept = SLOTS.map((s) => getSlot(log, s)).filter((x) => x.subject || x.hours > 0);
  let out = emptyLog(log.date);
  if (log.createdAt !== undefined) out.createdAt = log.createdAt;
  kept.forEach((k, i) => { out = withSlot(out, (i + 1) as Slot, { subject: k.subject, topic: k.topic, hours: k.hours, ...(k.target > 0 ? { target: k.target } : {}) }); });
  return out;
}

/**
 * The exact opposite of applyMinutes for one session. Safe if the day was edited since: it only takes back this
 * session's minutes, and only removes the entry when this session made it and nothing else is left in it.
 */
export function undoMinutes(prev: DailyStudyLog | undefined, subject: string, minutes: number, topicAdded: string, created: boolean): DailyStudyLog | undefined {
  if (!prev || !(minutes > 0)) return prev;
  const slot = slotOfSubject(prev, subject);
  if (!slot) return prev;
  const cur = getSlot(prev, slot);
  const leftMin = Math.max(0, slotMinutes(cur.hours) - Math.round(minutes));
  const topic = removeTopic(cur.topic, topicAdded);
  if (created && leftMin === 0 && !topic && !(cur.target > 0)) return compactLog(withSlot(prev, slot, { subject: '', topic: '', hours: 0 }));
  return withSlot(prev, slot, { hours: round4(leftMin / 60), topic });
}

// ───────────────────────── saving and taking back ─────────────────────────

/** Matches the study context's `mutateStudyLog`: read a day, return the new day (or null to leave it alone). */
export type Mutate = (date: string, fn: (prev: DailyStudyLog | undefined) => DailyStudyLog | null) => unknown;

function logPart(subject: string, topic: string, date: string, minutes: number, mutate: Mutate, into?: SessionPart): SessionPart {
  const part: SessionPart = into ?? { date, want: minutes, minutes: 0, topicAdded: '', created: false, logged: false };
  mutate(date, (prev) => {
    const r = applyMinutes(prev, date, subject, topic, minutes);
    if (!r || !r.ok) return null;
    part.logged = true; part.minutes = r.addedMinutes; part.topicAdded = r.topicAdded; part.created = r.created;
    return r.addedMinutes > 0 ? r.log : null;
  });
  return part;
}

/** Writes a finished session into the log, day by day, and returns the history entry for it. */
export function commitSession(state: TimerState, plan: Plan, mutate: Mutate): Session {
  const parts = plan.days.map((d) => logPart(state.subject, state.topic, d.date, d.minutes, mutate));
  return { id: state.id, level: state.level, subject: state.subject, topic: state.topic, startedAt: state.startedAt, endedAt: plan.endedAt, ms: plan.ms, parts };
}

/** Takes a session back out of the log. */
export function revertSession(session: Session, mutate: Mutate): void {
  for (const p of session.parts) {
    if (!p.logged || p.minutes <= 0) continue;
    mutate(p.date, (prev) => undoMinutes(prev, session.subject, p.minutes, p.topicAdded, p.created) ?? null);
  }
}

/** Tries again for the days that had no free slot. Returns the updated history entry. */
export function retryPending(session: Session, mutate: Mutate): Session {
  return { ...session, parts: session.parts.map((p) => (p.logged ? p : logPart(session.subject, session.topic, p.date, p.want, mutate, { ...p }))) };
}

// ───────────────────────── history ─────────────────────────

export interface SessionPart {
  date: string;
  /** minutes the session wanted to add to this day */
  want: number;
  /** minutes that went into the log (0 when it could not be added) */
  minutes: number;
  /** the topic text this session added to the slot */
  topicAdded: string;
  /** the session made the slot (the subject was new that day) */
  created: boolean;
  /** false when the day had no free slot; the minutes wait in the history until one is free */
  logged: boolean;
}

export interface Session {
  id: string;
  level: Level;
  subject: string;
  topic: string;
  startedAt: number;
  endedAt: number;
  /** time on the clock, in ms */
  ms: number;
  parts: SessionPart[];
}

export const sessionMinutes = (s: Session) => s.parts.reduce((a, p) => a + p.minutes, 0);
export const sessionPending = (s: Session) => s.parts.filter((p) => !p.logged).reduce((a, p) => a + p.want, 0);
/** Minutes this session put into one day's log. */
export const sessionMinutesOn = (s: Session, date: string) => s.parts.filter((p) => p.date === date).reduce((a, p) => a + p.minutes, 0);

/** Newest first, capped. Same id replaces the old entry. */
export function pushSession(list: Session[], s: Session): Session[] {
  return [s, ...list.filter((x) => x.id !== s.id)].slice(0, HISTORY_MAX);
}

/** Coerce stored history. Entries that do not look right are dropped. */
export function sanitizeSessions(raw: unknown): Session[] {
  if (!Array.isArray(raw)) return [];
  const out: Session[] = [];
  for (const x of raw as Partial<Session>[]) {
    if (!x || typeof x.id !== 'string' || typeof x.subject !== 'string' || !Array.isArray(x.parts)) continue;
    const parts: SessionPart[] = x.parts
      .filter((p) => p && typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
      .map((p) => ({ date: p.date, want: posNum(p.want), minutes: posNum(p.minutes), topicAdded: typeof p.topicAdded === 'string' ? p.topicAdded : '', created: !!p.created, logged: p.logged !== false }));
    if (!parts.length) continue;
    out.push({ id: x.id, level: LEVELS.includes(x.level as Level) ? (x.level as Level) : 'inter', subject: x.subject, topic: typeof x.topic === 'string' ? x.topic : '', startedAt: posNum(x.startedAt), endedAt: posNum(x.endedAt), ms: posNum(x.ms), parts });
  }
  return out.slice(0, HISTORY_MAX);
}

// ───────────────────────── display ─────────────────────────

/** 65_000 → "01:05", 3_725_000 → "1:02:05" */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/** 65 → "1h 5m", 45 → "45m", 120 → "2h" (same style as the rest of the app) */
export function fmtMinutes(min: number): string {
  const t = Math.max(0, Math.round(min));
  const h = Math.floor(t / 60), m = t % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "2:05 pm", in the device's local time. */
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** "2:05 pm – 3:20 pm" for a session. */
export const fmtRange = (a: number, b: number) => `${fmtTime(a)} – ${fmtTime(b)}`;

export const MILESTONES: { at: number; text: string }[] = [
  { at: 0, text: 'Settling in. The clock is running.' },
  { at: 10, text: 'Ten minutes in. You are warmed up.' },
  { at: 25, text: '25 minutes. A solid block of focus.' },
  { at: 45, text: '45 minutes in. This is deep focus.' },
  { at: 60, text: 'One full hour. Excellent.' },
  { at: 90, text: '90 minutes. A stretch would help soon.' },
  { at: 120, text: 'Two hours. Drink some water.' },
  { at: 180, text: 'Three hours. Take a proper break.' },
];

/** The caption for how long the clock has run. */
export function milestoneFor(ms: number): { at: number; text: string } {
  const min = ms / 60000;
  let pick = MILESTONES[0];
  for (const m of MILESTONES) if (min >= m.at) pick = m;
  return pick;
}

/** The milestone (not the first) that the clock passed between two readings, if any. */
export function milestoneCrossed(prevMs: number, curMs: number): { at: number; text: string } | null {
  if (curMs <= prevMs) return null;
  let hit: { at: number; text: string } | null = null;
  for (const m of MILESTONES) if (m.at > 0 && prevMs / 60000 < m.at && curMs / 60000 >= m.at) hit = m;
  return hit;
}

/** How many `every`-minute marks the clock passed between two readings (for the optional interval chime). */
export function marksCrossed(prevMs: number, curMs: number, everyMin: number): number {
  if (!(everyMin > 0) || curMs <= prevMs) return 0;
  const step = everyMin * 60000;
  return Math.floor(curMs / step) - Math.floor(prevMs / step);
}
