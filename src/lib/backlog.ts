// Backlog = date-planned study (Targets → date plan) that was due on a past day and never got done.
// Storage key and entry shape are unchanged from the original (`ca_backlog_<suffix>`), so old data keeps working.
//
// Differences from the original: it recomputes on every change (the original ran once a day and needed a
// forced call from the Targets tab), uses the local calendar day instead of UTC, and treats a row you ticked
// off as done even if you did not log hours for it.
import { useEffect, useState } from 'react';
import type { DailyStudyLog, Level } from '../types';
import { subjectHoursOf } from './log';
import { fmtDate, parseYmd, todayStr } from './date';
import { KEYS, readJSON, writeJSON } from './storage';

export type BacklogStatus = 'pending' | 'auto-resolved' | 'completed' | 'dismissed';

export interface BacklogItem {
  id: string;
  date: string;
  /** e.g. "27 Oct Tue" */
  dayLabel: string;
  subject: string;
  subjectLabel: string;
  topic: string;
  targetHours: number;
  status: BacklogStatus;
  completedAt: string | null;
}

const EVENT = 'backlog_changed';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const backlogId = (row: { date: string; subject: string; id: string }) => `backlog-${row.date}-${row.subject}-${row.id}`;
const labelFor = (date: string) => { const d = parseYmd(date); return `${fmtDate(date)} ${DAYS[d.getDay()]}`; };

export function readBacklogs(suffix: string): BacklogItem[] {
  const list = readJSON<unknown>(KEYS.backlog(suffix), []);
  return Array.isArray(list) ? (list as BacklogItem[]).filter((b) => b && typeof b.id === 'string' && typeof b.date === 'string') : [];
}

export function pendingBacklogCount(suffix: string): number {
  return readBacklogs(suffix).filter((b) => b.status === 'pending').length;
}

interface PlanRow { id: string; date?: string; subject?: string; topic?: string; targetHours?: number; hours?: number; isSunday?: boolean; sundayExpanded?: boolean }
type LogLike = DailyStudyLog

/** Recompute the backlog from the date plan, ticks and study logs, and persist it. Safe to call often. */
export function calculateBacklogs(level: Level, suffix: string): void {
  try {
    const before = JSON.stringify(readBacklogs(suffix));
    let next: BacklogItem[] = [];

    const plan = readJSON<{ rows?: PlanRow[] } | null>(`ca_targets_custom_${suffix}`, null);
    const rows = Array.isArray(plan?.rows) ? (plan!.rows as PlanRow[]) : [];
    if (rows.length) {
      const done = readJSON<Record<string, { done?: boolean }>>(`ca_targets_completion_${suffix}`, {});
      const logs = readJSON<LogLike[]>(KEYS.logs(level), []);
      const hoursBy = new Map<string, number>();
      for (const l of Array.isArray(logs) ? logs : []) {
        for (const [s, h] of subjectHoursOf(l)) hoursBy.set(`${l.date}|${s}`, (hoursBy.get(`${l.date}|${s}`) || 0) + h);
      }
      const today = todayStr();
      const map = new Map(readBacklogs(suffix).map((b) => [b.id, b] as const));
      const live = new Set<string>();

      for (const row of rows) {
        if (!row.date || !row.subject || !row.topic) continue;
        if (row.isSunday && !row.sundayExpanded) continue;
        const id = backlogId({ date: row.date, subject: row.subject, id: row.id });
        live.add(id);
        if (row.date >= today) continue; // only days that are over
        const satisfied = !!done[row.id]?.done || (hoursBy.get(`${row.date}|${row.subject}`) || 0) > 0;
        const existing = map.get(id);
        if (!satisfied) {
          if (!existing) map.set(id, { id, date: row.date, dayLabel: labelFor(row.date), subject: row.subject, subjectLabel: row.subject, topic: row.topic, targetHours: Number(row.targetHours || row.hours || 1.5), status: 'pending', completedAt: null });
          else if (existing.status === 'auto-resolved') map.set(id, { ...existing, status: 'pending', completedAt: null }); // un-ticked or hours removed
        } else if (existing && existing.status === 'pending') {
          map.set(id, { ...existing, status: 'auto-resolved', completedAt: new Date().toISOString() });
        }
      }
      next = [...map.values()].filter((b) => live.has(b.id)).sort((a, b) => a.date.localeCompare(b.date));
    }

    if (JSON.stringify(next) === before) return;
    writeJSON(KEYS.backlog(suffix), next);
    window.dispatchEvent(new Event(EVENT));
  } catch (e) {
    console.error('Backlog calculation failed', e);
  }
}

/** Mark a pending backlog as done or dismissed. */
export function resolveBacklog(id: string, status: 'completed' | 'dismissed', suffix: string): void {
  const list = readBacklogs(suffix).map((b) => (b.id === id ? { ...b, status, completedAt: new Date().toISOString() } : b));
  writeJSON(KEYS.backlog(suffix), list);
  window.dispatchEvent(new Event(EVENT));
}

/** Put a resolved backlog back (used by Undo). */
export function reopenBacklog(id: string, suffix: string): void {
  const list = readBacklogs(suffix).map((b) => (b.id === id ? { ...b, status: 'pending' as const, completedAt: null } : b));
  writeJSON(KEYS.backlog(suffix), list);
  window.dispatchEvent(new Event(EVENT));
}

/** Live backlog list for the current level and group. */
export function useBacklogs(suffix: string) {
  const [items, setItems] = useState(() => readBacklogs(suffix));
  useEffect(() => {
    const load = () => setItems(readBacklogs(suffix));
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener('storage', load);
    return () => { window.removeEventListener(EVENT, load); window.removeEventListener('storage', load); };
  }, [suffix]);
  const pending = items.filter((b) => b.status === 'pending');
  return { items, pending };
}
