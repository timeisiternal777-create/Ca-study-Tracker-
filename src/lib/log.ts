import type { DailyStudyLog } from '../types';
import { clamp } from './format';

/** A day holds up to six subjects. The first three always exist on a log; 4 to 6 appear only when used. */
export type Slot = 1 | 2 | 3 | 4 | 5 | 6;
export const SLOTS: readonly Slot[] = [1, 2, 3, 4, 5, 6];
/** How many subjects one day can hold. */
export const MAX_SLOTS = SLOTS.length;

export interface SlotData { slot: Slot; subject: string; topic: string; hours: number; target: number }

export const emptyLog = (date: string): DailyStudyLog => ({
  id: date, date, subject1: '', topic1: '', hours1: 0, subject2: '', topic2: '', hours2: 0, subject3: '', topic3: '', hours3: 0,
});

type Loose = Record<string, unknown>;

/** Compare subject names without caring about case or stray spaces. */
export const sameSubject = (a: string | undefined, b: string | undefined) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase() && !!(a || '').trim();

export function getSlot(log: DailyStudyLog | undefined, slot: Slot): SlotData {
  if (!log) return { slot, subject: '', topic: '', hours: 0, target: 0 };
  const l = log as unknown as Loose;
  return {
    slot,
    subject: (l[`subject${slot}`] as string) || '',
    topic: (l[`topic${slot}`] as string) || '',
    hours: Number(l[`hours${slot}`]) || 0,
    target: Number(l[`targetHours${slot}`]) || 0,
  };
}

/** Returns a copy of `log` with one slot changed. */
export function withSlot(log: DailyStudyLog, slot: Slot, patch: Partial<Omit<SlotData, 'slot'>>): DailyStudyLog {
  const next = { ...log } as unknown as Loose;
  if (patch.subject !== undefined) next[`subject${slot}`] = patch.subject;
  if (patch.topic !== undefined) next[`topic${slot}`] = patch.topic;
  if (patch.hours !== undefined) next[`hours${slot}`] = patch.hours;
  if (patch.target !== undefined) next[`targetHours${slot}`] = patch.target;
  return next as unknown as DailyStudyLog;
}

/** Slots that actually hold something (a subject or hours). */
export function filledSlots(log: DailyStudyLog | undefined): SlotData[] {
  return SLOTS.map((s) => getSlot(log, s)).filter((s) => s.subject || s.hours > 0);
}

/** Total hours in a log, across all slots. */
export function logHours(log: DailyStudyLog | undefined): number {
  if (!log) return 0;
  let t = 0;
  for (const s of SLOTS) t += Number((log as unknown as Loose)[`hours${s}`]) || 0;
  return t;
}

/** The slot a subject already uses on this day (0 when it has none). */
export function slotOfSubject(log: DailyStudyLog | undefined, subject: string): Slot | 0 {
  return SLOTS.find((s) => sameSubject(getSlot(log, s).subject, subject)) ?? 0;
}

export function firstFreeSlot(log: DailyStudyLog | undefined): Slot | 0 {
  if (!log) return 1;
  return SLOTS.find((s) => !getSlot(log, s).subject && !getSlot(log, s).hours) ?? 0;
}

/** Subject, hours pairs of every filled slot. Handy for stats loops. */
export function subjectHoursOf(log: DailyStudyLog): [string, number][] {
  const out: [string, number][] = [];
  for (const s of SLOTS) { const x = getSlot(log, s); if (x.subject && x.hours > 0) out.push([x.subject, x.hours]); }
  return out;
}

const num = (v: unknown, max = 24) => clamp(Number(v) || 0, 0, max);

/** Coerce anything (old backups, hand-edited JSON) into a valid log. */
export function normaliseLog(raw: Partial<DailyStudyLog> & { date: string }): DailyStudyLog {
  const r = raw as unknown as Record<string, unknown>;
  const log: DailyStudyLog = {
    id: raw.date, date: raw.date,
    subject1: raw.subject1 || '', topic1: raw.topic1 || '', hours1: num(raw.hours1),
    subject2: raw.subject2 || '', topic2: raw.topic2 || '', hours2: num(raw.hours2),
    subject3: raw.subject3 || '', topic3: raw.topic3 || '', hours3: num(raw.hours3),
    createdAt: raw.createdAt || Date.now(),
  };
  const out = log as unknown as Record<string, unknown>;
  for (const k of SLOTS) {
    if (k > 3) {
      // Slots 4 to 6 only exist on days that use them.
      const s = typeof r[`subject${k}`] === 'string' ? (r[`subject${k}`] as string) : '', t = typeof r[`topic${k}`] === 'string' ? (r[`topic${k}`] as string) : '', h = num(r[`hours${k}`]);
      if (s || t || h > 0) { out[`subject${k}`] = s; out[`topic${k}`] = t; out[`hours${k}`] = h; }
    }
    const t = Number(r[`targetHours${k}`]);
    if (Number.isFinite(t) && t > 0) out[`targetHours${k}`] = clamp(t, 0, 24);
  }
  return log;
}
