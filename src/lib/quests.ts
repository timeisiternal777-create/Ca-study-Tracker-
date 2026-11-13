// Quests: small, fair goals that reset every day and every week.
// Progress is worked out from your logs. Only "collected" is stored, so nothing can be lost or double counted.
import type { DailyStudyLog, MockLogEntry } from '../types';
import { addDays, startOfWeek } from './date';
import { subjectHoursOf } from './log';

export interface Quest {
  /** unique per period, e.g. `d:2026-10-29:goal` */
  key: string;
  id: string;
  kind: 'daily' | 'weekly';
  title: string;
  hint: string;
  xp: number;
  value: number;
  target: number;
  unit: string;
  done: boolean;
  claimed: boolean;
}

export interface QuestInput {
  today: string;
  logs: DailyStudyLog[];
  mocks: MockLogEntry[];
  goal: number;
  /** names of the papers being studied */
  subjects: string[];
  /** hours per paper, all time (used to break ties for the weakest paper) */
  subjectHours: Record<string, number>;
  dailyTotals: Record<string, number>;
  claims: Record<string, number>;
}

const papersOn = (l: DailyStudyLog | undefined): string[] => {
  if (!l) return [];
  const out: string[] = [];
  for (const [s] of subjectHoursOf(l)) out.push(s);
  return out;
};

/** The paper that has had the least study over the last 14 days. */
export function weakestPaper(i: Pick<QuestInput, 'today' | 'logs' | 'subjects' | 'subjectHours'>): string | null {
  if (i.subjects.length < 2) return null;
  const since = addDays(i.today, -13);
  const recent: Record<string, number> = {};
  for (const l of i.logs) {
    if (l.date < since || l.date > i.today) continue;
    for (const [s, h] of subjectHoursOf(l)) recent[s] = (recent[s] || 0) + h;
  }
  return [...i.subjects].sort((a, b) => ((recent[a] || 0) - (recent[b] || 0)) || ((i.subjectHours[a] || 0) - (i.subjectHours[b] || 0)))[0] ?? null;
}

export function buildQuests(i: QuestInput): Quest[] {
  const goal = Math.min(12, Math.max(1, i.goal));
  const weekStart = startOfWeek(i.today);
  const weekEnd = addDays(weekStart, 6);
  const todayLog = i.logs.find((l) => l.date === i.today);
  const mk = (kind: 'daily' | 'weekly', id: string, q: Omit<Quest, 'key' | 'id' | 'kind' | 'done' | 'claimed'>): Quest => {
    const key = `${kind === 'daily' ? `d:${i.today}` : `w:${weekStart}`}:${id}`;
    const value = Math.round(q.value * 100) / 100;
    return { ...q, value, key, id, kind, done: value >= q.target - 1e-9, claimed: key in i.claims };
  };
  const out: Quest[] = [];

  // Daily
  out.push(mk('daily', 'goal', { title: 'Reach your daily goal', hint: `Study ${goal}h today.`, xp: 30, value: Math.min(i.dailyTotals[i.today] || 0, goal), target: goal, unit: 'h' }));
  if (i.subjects.length >= 2) {
    out.push(mk('daily', 'variety', { title: 'Study two papers', hint: 'Switching papers keeps you fresh.', xp: 20, value: new Set(papersOn(todayLog)).size, target: 2, unit: 'papers' }));
    const weak = weakestPaper(i);
    if (weak) {
      const hrs = todayLog ? subjectHoursOf(todayLog).reduce((a, [s, h]) => a + (s === weak ? h : 0), 0) : 0;
      out.push(mk('daily', 'weak', { title: `Give ${weak} an hour`, hint: 'It has had the least study lately.', xp: 25, value: Math.min(hrs, 1), target: 1, unit: 'h' }));
    }
  }

  // Weekly
  let goalDays = 0;
  const seen = new Set<string>();
  for (let d = weekStart; d <= weekEnd && d <= i.today; d = addDays(d, 1)) {
    if ((i.dailyTotals[d] || 0) >= goal - 1e-9) goalDays++;
    const l = i.logs.find((x) => x.date === d);
    papersOn(l).forEach((p) => seen.add(p));
  }
  out.push(mk('weekly', 'days', { title: 'Hit your goal on 4 days', hint: `Four days of ${goal}h or more this week.`, xp: 120, value: Math.min(goalDays, 4), target: 4, unit: 'days' }));
  out.push(mk('weekly', 'mock', { title: 'Take a mock test', hint: 'Log one mock this week.', xp: 80, value: Math.min(1, i.mocks.filter((m) => m.date >= weekStart && m.date <= weekEnd).length), target: 1, unit: 'mock' }));
  if (i.subjects.length >= 2) {
    const covered = i.subjects.filter((s) => seen.has(s)).length;
    out.push(mk('weekly', 'cover', { title: 'Touch every paper', hint: 'Study each of your papers at least once this week.', xp: 100, value: covered, target: i.subjects.length, unit: 'papers' }));
  }
  return out;
}
