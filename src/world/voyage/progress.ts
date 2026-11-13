// The rules of the Ledger Seas, as plain functions. Nothing here touches the screen or storage, so every rule can be tested.
//
// One island per paper. Lanterns on the shore are the chapters ticked in the plan. The fog is what is still unexplored.
// Hours studied clear most of the fog by themselves (so an island never stays stuck because a chapter was not ticked),
// but only ticked chapters can clear the last of it. An island left alone for 10 days fogs over a little (a revision nudge).

import type { Accent, DailyStudyLog, GroupId, Level, MockLogEntry, SubjectConfig } from '../../types';
import { COVER_HOURS_PER_PAPER } from '../../lib/readiness';
import { addDays, diffDays, startOfWeek } from '../../lib/date';
import { filledSlots } from '../../lib/log';
import { clamp } from '../../lib/format';

export const NEGLECT_DAYS = 10;
/** With a syllabus on file, hours alone clear at most this share of an island. */
export const HOURS_CLEAR_CAP = 0.85;
export const MAX_LANTERNS = 12;
/** A mock counts as "recent weather" for this many days. */
export const STORM_WINDOW_DAYS = 45;

export const LEVEL_ORDER: Level[] = ['foundation', 'inter', 'final'];
export const SEA_NAME: Record<Level, string> = { foundation: 'The Shallows', inter: 'The Narrows', final: 'The Deep' };
export type ShipClass = 'sloop' | 'brigantine' | 'galleon';
export const SHIP_CLASS: Record<Level, ShipClass> = { foundation: 'sloop', inter: 'brigantine', final: 'galleon' };
export const SHIP_CLASS_NAME: Record<ShipClass, string> = { sloop: 'sloop', brigantine: 'brigantine', galleon: 'galleon' };

// ───────────────────────────── islands ─────────────────────────────

/** A topic of the syllabus plan, reduced to what the islands need. */
export interface PlanItem { subject: string; targetHours?: number; hours?: number; completed?: boolean }

export interface IslandInput { subject: SubjectConfig; hours: number; plan: PlanItem[]; lastStudied: string | null }

export type IslandState = 'uncharted' | 'exploring' | 'neglected' | 'cleared';

export interface Island {
  key: string;
  name: string;
  abbrev: string;
  accent: Accent;
  paperNumber: number;
  group: GroupId;
  marks: number;
  hours: number;
  /** Hours that make the paper "covered": the plan's total for it, or the standard 80 h when there is no plan. */
  targetHours: number;
  topics: number;
  topicsDone: number;
  /** What the explored share is based on. */
  basis: 'chapters' | 'hours';
  /** 0 to 1 */
  progress: number;
  lanterns: { lit: number; total: number };
  /** Days since this paper was last studied; null if never. */
  daysSince: number | null;
  neglected: boolean;
  /** 0 (clear) to 1 (thick fog) */
  fog: number;
  state: IslandState;
}

export function buildIsland({ subject, hours, plan, lastStudied }: IslandInput, today: string): Island {
  const topics = plan.length;
  const topicsDone = plan.filter((p) => p.completed).length;
  const planHours = plan.reduce((a, p) => a + (Number(p.targetHours ?? p.hours) || 0), 0);
  const targetHours = planHours > 0 ? planHours : COVER_HOURS_PER_PAPER;
  const hourFrac = clamp(hours / targetHours, 0, 1);
  const chapterFrac = topics > 0 ? topicsDone / topics : 0;
  const basis: Island['basis'] = topics > 0 ? 'chapters' : 'hours';
  const progress = topics > 0 ? Math.max(chapterFrac, Math.min(HOURS_CLEAR_CAP, hourFrac * HOURS_CLEAR_CAP)) : hourFrac;

  let lit: number; let total: number;
  if (topics > 0) {
    total = Math.min(topics, MAX_LANTERNS);
    lit = Math.round(chapterFrac * total);
    if (topicsDone > 0 && lit === 0) lit = 1;
    if (topicsDone < topics && lit === total) lit = total - 1;
  } else {
    total = 8;
    lit = Math.round(hourFrac * total);
    if (hours > 0 && lit === 0) lit = 1;
    if (hourFrac < 1 && lit === total) lit = total - 1;
  }

  const daysSince = lastStudied ? Math.max(0, diffDays(lastStudied, today)) : null;
  const cleared = progress >= 0.999;
  const untouched = hours <= 0 && topicsDone === 0;
  const neglected = !cleared && !untouched && daysSince !== null && daysSince >= NEGLECT_DAYS;
  const state: IslandState = cleared ? 'cleared' : untouched ? 'uncharted' : neglected ? 'neglected' : 'exploring';
  const fog = cleared ? 0 : untouched ? 0.95 : clamp((1 - progress) * 0.88 + (neglected ? 0.2 : 0), 0, 0.95);

  return {
    key: subject.id, name: subject.name, abbrev: subject.abbrev, accent: subject.accent, paperNumber: subject.paperNumber, group: subject.group, marks: subject.marks,
    hours, targetHours, topics, topicsDone, basis, progress, lanterns: { lit, total }, daysSince, neglected, fog, state,
  };
}

const norm = (s: string | undefined) => (s || '').trim().toLowerCase();

/** The most recent day each subject was studied (hours above zero). Keys are lower-case subject names. */
export function lastStudiedMap(logs: DailyStudyLog[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of logs) for (const s of filledSlots(l)) if (s.hours > 0 && s.subject) { const k = norm(s.subject); if (!out.has(k) || out.get(k)! < l.date) out.set(k, l.date); }
  return out;
}

/** The subject studied last: on the newest day with study, the one with the most hours there. */
export function dockSubject(logs: DailyStudyLog[]): string | null {
  let best: DailyStudyLog | null = null;
  for (const l of logs) if (filledSlots(l).some((s) => s.hours > 0) && (!best || l.date > best.date)) best = l;
  if (!best) return null;
  let pick: { subject: string; hours: number } | null = null;
  for (const s of filledSlots(best)) if (s.hours > 0 && s.subject && (!pick || s.hours >= pick.hours)) pick = { subject: s.subject, hours: s.hours };
  return pick ? pick.subject : null;
}

export function buildIslands(subjects: SubjectConfig[], subjectHours: Record<string, number>, plan: (PlanItem)[], logs: DailyStudyLog[], today: string): Island[] {
  const hoursBy = new Map<string, number>();
  for (const [k, v] of Object.entries(subjectHours)) hoursBy.set(norm(k), (hoursBy.get(norm(k)) || 0) + (Number(v) || 0));
  const last = lastStudiedMap(logs);
  return [...subjects]
    .sort((a, b) => a.paperNumber - b.paperNumber)
    .map((s) => buildIsland({
      subject: s, hours: hoursBy.get(norm(s.name)) || 0,
      plan: plan.filter((p) => norm(p.subject) === norm(s.name)), lastStudied: last.get(norm(s.name)) ?? null,
    }, today));
}

/** How far through the sea: the average of the islands. */
export const levelProgress = (islands: Island[]) => (islands.length ? islands.reduce((a, i) => a + i.progress, 0) / islands.length : 0);

// ───────────────────────────── the whole journey ─────────────────────────────

export type SeaStatus = 'sailed' | 'current' | 'ahead';

/** A sea before the current level counts as sailed (a Final student has been through Inter). The current one is sailed once the student marks it cleared. */
export function seaStatus(sea: Level, current: Level, cleared: Partial<Record<Level, string>>): SeaStatus {
  const a = LEVEL_ORDER.indexOf(sea); const b = LEVEL_ORDER.indexOf(current);
  if (cleared[sea]) return 'sailed';
  if (a < b) return 'sailed';
  return a === b ? 'current' : 'ahead';
}

/** 0 (leaving harbour) to 1 (the Golden Ledger), over the three seas. */
export function journeyFraction(current: Level, cleared: Partial<Record<Level, string>>, currentProgress: number): number {
  let sailed = 0; let partial = 0;
  for (const l of LEVEL_ORDER) {
    const st = seaStatus(l, current, cleared);
    if (st === 'sailed') sailed++;
    else if (st === 'current') partial = clamp(currentProgress, 0, 1);
  }
  return clamp((sailed + partial) / LEVEL_ORDER.length, 0, 1);
}

/** The treasure is won only when CA Final is marked cleared. */
export const treasureWon = (cleared: Partial<Record<Level, string>>) => !!cleared.final;

// ───────────────────────────── wind: pace against the exam ─────────────────────────────

export type WindKind = 'calm' | 'tail' | 'cross' | 'head';
export interface Wind { kind: WindKind; needed: number; actual: number }

/** `needed` = hours a day that finish the remaining plan before the exam; `actual` = the recent daily average. */
export function windFor(needed: number, actual: number): Wind {
  if (!(needed > 0) || !Number.isFinite(needed)) return { kind: 'calm', needed: 0, actual };
  const r = actual / needed;
  return { kind: r >= 1 ? 'tail' : r >= 0.8 ? 'cross' : 'head', needed, actual };
}

// ───────────────────────────── mocks are storms ─────────────────────────────

export type Weather = 'clear' | 'fair' | 'rough' | 'storm';
export const weatherOf = (pct: number): Weather => (pct >= 70 ? 'clear' : pct >= 50 ? 'fair' : pct >= 40 ? 'rough' : 'storm');

export interface Storm { subject: string; marks: number; max: number; pct: number; weather: Weather; date: string; daysAgo: number }

/** The latest mock of each paper within the last 45 days. Keys are lower-case subject names. */
export function stormsFor(mocks: MockLogEntry[], subjects: SubjectConfig[], today: string): Map<string, Storm> {
  const max = new Map(subjects.map((s) => [norm(s.name), s.marks] as const));
  const out = new Map<string, Storm>();
  for (const m of mocks) {
    const k = norm(m.subject); const mx = max.get(k);
    if (!mx) continue;
    const ago = diffDays(m.date, today);
    if (ago < 0 || ago > STORM_WINDOW_DAYS) continue;
    const cur = out.get(k);
    if (cur && cur.date >= m.date) continue;
    const pct = clamp((m.marks / mx) * 100, 0, 100);
    out.set(k, { subject: m.subject, marks: m.marks, max: mx, pct, weather: weatherOf(pct), date: m.date, daysAgo: ago });
  }
  return out;
}

// ───────────────────────────── the ghost ship: your best week ─────────────────────────────

/** The biggest Monday-to-Sunday total before this week. */
export function bestWeek(dailyTotals: Record<string, number>, today: string): { hours: number; start: string | null } {
  const thisWeek = startOfWeek(today);
  const sums = new Map<string, number>();
  for (const [d, h] of Object.entries(dailyTotals)) {
    const w = startOfWeek(d);
    if (w >= thisWeek) continue;
    sums.set(w, (sums.get(w) || 0) + (Number(h) || 0));
  }
  let best = 0; let start: string | null = null;
  for (const [w, h] of sums) if (h > best) { best = h; start = w; }
  return { hours: best, start };
}

export interface Race {
  /** Total hours of the best earlier week (the finish line). */
  bestTotal: number;
  bestStart: string | null;
  /** The best week's hours from Monday up to the same weekday as today. */
  ghost: number;
  /** This week's hours from Monday to today. */
  you: number;
  ahead: boolean;
  /** 0 (Monday) to 6 (Sunday) */
  day: number;
}

/** This week against your best week, weekday by weekday: the ghost ship is where you were on the same day of your best week. */
export function ghostRace(dailyTotals: Record<string, number>, today: string): Race {
  const { hours: bestTotal, start } = bestWeek(dailyTotals, today);
  const thisWeek = startOfWeek(today);
  const day = diffDays(thisWeek, today);
  let ghost = 0; let you = 0;
  for (let i = 0; i <= day; i++) {
    you += Number(dailyTotals[addDays(thisWeek, i)]) || 0;
    if (start) ghost += Number(dailyTotals[addDays(start, i)]) || 0;
  }
  return { bestTotal, bestStart: start, ghost, you, ahead: you >= ghost, day };
}

// ───────────────────────────── where the islands sit on the chart ─────────────────────────────

export const CHART = { w: 1200, h: 620, rowA: 292, rowB: 470 } as const;

/** Two staggered rows, centred. Paper order zig-zags along them, which is also the sailing route. */
export function layoutFor(count: number): { x: number; y: number }[] {
  const step = count >= 7 ? 250 : count >= 5 ? 300 : 330;
  const raw = Array.from({ length: count }, (_, i) => ({ x: Math.floor(i / 2) * step + (i % 2 ? step / 2 : 0), y: i % 2 ? CHART.rowB : CHART.rowA }));
  if (!raw.length) return raw;
  const lo = Math.min(...raw.map((p) => p.x)); const hi = Math.max(...raw.map((p) => p.x));
  const shift = CHART.w / 2 - (lo + hi) / 2;
  return raw.map((p) => ({ x: Math.round(p.x + shift), y: p.y }));
}
