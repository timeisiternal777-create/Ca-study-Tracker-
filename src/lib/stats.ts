import type { DailyStudyLog, GameState, MockLogEntry, RankInfo, RankStep, StudyStats, UserSettings } from '../types';
import { addDays, diffDays, parseYmd, startOfWeek, todayStr } from './date';
import { clamp } from './format';
import { logHours, subjectHoursOf } from './log';
import { computeReadiness } from './readiness';

/** Thresholds (documented in the in-app guide). */
export const FIRE_MIN_HOURS = 6;
export const BEAST_HOURS = 10;
/** Hours beyond this on one day earn no XP, so a typo or a marathon cannot run away with the ranks. */
export const DAY_CAP_HOURS = 12;
export const XP_PER_HOUR = 10;
/** Study hours entered as a head start in Settings earn half rate. */
export const XP_PAST_PER_HOUR = 5;
export const XP_GOAL_BONUS = 40;
export const XP_BEAST_BONUS = 60;
export const MOCK_XP_BASE = 20;
/** Each percent scored on a mock adds this much XP. */
export const MOCK_XP_PER_PCT = 0.6;
export const MAX_FREEZES = 2;
/** A streak freeze is earned every time the streak reaches a multiple of this. */
export const FREEZE_EVERY = 7;
export const GOAL_WEEK_DAYS = 5;

/** XP for one mock test, from its score. 50% is worth 50 XP and 100% is worth 80. */
export const mockXP = (pct: number) => MOCK_XP_BASE + Math.round(clamp(pct, 0, 100) * MOCK_XP_PER_PCT);

/** Rank thresholds for a standard 150-day run at 8 hours a day. They are scaled to your own exam date and goal. */
const BASE_RANKS: RankStep[] = [
  { title: 'Fresh Aspirant', minXP: 0 },
  { title: 'Ledger Keeper', minXP: 300 },
  { title: 'Journal Master', minXP: 900 },
  { title: 'Trial Balancer', minXP: 1800 },
  { title: 'Audit Ace', minXP: 3200 },
  { title: 'Tax Titan', minXP: 5200 },
  { title: 'Chartered Champion', minXP: 8000 },
  { title: 'FCA Legend', minXP: 12000 },
];
export const RANK_TITLES = BASE_RANKS.map((r) => r.title);

/** How much to stretch or shrink the ladder so the top rank is within reach of your own plan. */
export function rankScale(goal: number, anchor: string, exam: string): number {
  const prepDays = Math.max(21, diffDays(anchor, exam));
  return clamp((Math.max(1, goal) * prepDays) / (8 * 150), 0.35, 2.5);
}

export function ladderFor(scale: number): RankStep[] {
  let prev = -50;
  return BASE_RANKS.map((r, i) => {
    const v = i === 0 ? 0 : Math.max(prev + 50, Math.round((r.minXP * scale) / 50) * 50);
    prev = v;
    return { title: r.title, minXP: v };
  });
}

export const dayHours = (l: DailyStudyLog | Pick<DailyStudyLog, 'hours1' | 'hours2' | 'hours3'>) => logHours(l as DailyStudyLog);

export function rankFor(xp: number, ladder: RankStep[] = ladderFor(1), floorIdx = 0): RankInfo {
  let idx = 0;
  for (let i = 0; i < ladder.length; i++) if (xp >= ladder[i].minXP) idx = i;
  const held = floorIdx > idx;
  if (held) idx = Math.min(floorIdx, ladder.length - 1);
  const cur = ladder[idx];
  const next = ladder[idx + 1];
  const isMax = !next;
  const progress = isMax ? 100 : clamp(((xp - cur.minXP) / (next.minXP - cur.minXP)) * 100, 0, 100);
  return {
    level: idx + 1, title: cur.title, progress, minXP: cur.minXP,
    nextTitle: next ? next.title : cur.title, nextMin: next ? next.minXP : cur.minXP, isMax, held,
  };
}

export const EMPTY_GAME: GameState = { rankFloor: 0, claims: {} };

export function emptyStats(): StudyStats {
  return computeStats({ logs: [], mocks: [], settings: { pastHours: {} } as UserSettings, mockMax: () => 100 });
}

interface Input {
  logs: DailyStudyLog[];
  mocks: MockLogEntry[];
  settings: Pick<UserSettings, 'pastHours' | 'dailyGoalHours'> & Partial<Pick<UserSettings, 'targetExamDate' | 'restDays'>>;
  /** Max marks for a subject name (for mock percentages). */
  mockMax: (subject: string) => number;
  /** Names of the papers being studied (for readiness). */
  subjects?: string[];
  game?: GameState;
  today?: string;
}

/** Hours a day needs to count towards the streak: three quarters of the goal, between 2 and 6 hours. */
export const streakMinFor = (goal: number) => clamp(Math.round(goal * 0.75), 2, FIRE_MIN_HOURS);

export function computeStats({ logs, mocks, settings, mockMax, subjects = [], game = EMPTY_GAME, today = todayStr() }: Input): StudyStats {
  const goal = Number(settings.dailyGoalHours) || 8;
  const restDays = Array.isArray(settings.restDays) ? settings.restDays : [];
  const streakMin = streakMinFor(goal);
  const dailyTotals: Record<string, number> = {};
  const subjectHours: Record<string, number> = {};
  const subjectSessionCount: Record<string, number> = {};
  let loggedHours = 0;

  for (const log of logs) {
    const total = dayHours(log);
    if (total <= 0) continue;
    dailyTotals[log.date] = (dailyTotals[log.date] || 0) + total;
    loggedHours += total;
    for (const [s, hrs] of subjectHoursOf(log)) {
      subjectHours[s] = (subjectHours[s] || 0) + hrs;
      subjectSessionCount[s] = (subjectSessionCount[s] || 0) + 1;
    }
  }

  let pastHours = 0;
  for (const [name, h] of Object.entries(settings.pastHours || {})) {
    const hrs = Number(h) || 0;
    if (hrs > 0) { subjectHours[name] = (subjectHours[name] || 0) + hrs; pastHours += hrs; }
  }

  const dates = Object.keys(dailyTotals).sort();
  const daysLogged = dates.length;
  const todayHours = dailyTotals[today] || 0;
  const weekStart = startOfWeek(today);
  let weekHours = 0;
  for (const d of dates) if (d >= weekStart && d <= today) weekHours += dailyTotals[d];
  let last7 = 0;
  for (let i = 0; i < 7; i++) last7 += dailyTotals[addDays(today, -i)] || 0;

  let bestDayHours = 0;
  let bestDayDate: string | null = null;
  let beastDays = 0;
  let goalDays = 0;
  let cappedHours = 0;
  for (const d of dates) {
    const h = dailyTotals[d];
    if (h > bestDayHours) { bestDayHours = h; bestDayDate = d; }
    if (h >= BEAST_HOURS) beastDays++;
    if (h >= goal) goalDays++;
    cappedHours += Math.min(h, DAY_CAP_HOURS);
  }

  // --- Fire streak. A day counts at `streakMin` hours. Planned rest days neither add nor break.
  // Every FREEZE_EVERY days in a row banks a freeze (up to two); a missed day spends one instead of resetting.
  // Today is "pending" until it counts, so a streak never breaks mid-day.
  const fireToday = todayHours >= streakMin;
  let currentFireStreak = 0, maxStreak = 0, freezes = 0;
  const frozenDays: string[] = [];
  if (dates.length) {
    for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
      const h = dailyTotals[d] || 0;
      if (h >= streakMin) {
        currentFireStreak++;
        if (currentFireStreak > maxStreak) maxStreak = currentFireStreak;
        if (currentFireStreak % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
      } else if (d === today) {
        // pending
      } else if (restDays.includes(parseYmd(d).getDay())) {
        // planned rest: the streak holds
      } else if (freezes > 0) {
        freezes--; frozenDays.push(d);
      } else {
        currentFireStreak = 0;
      }
    }
  }

  // --- Goal weeks (Mon–Sun): total hours reach the daily goal × 5 (fewer when you have more rest days).
  // The week in progress counts the moment it gets there and never breaks the streak while it is still open.
  const weekTargetDays = clamp(7 - restDays.length, 1, GOAL_WEEK_DAYS);
  const weekTarget = goal * weekTargetDays;
  let goalWeekStreak = 0;
  if (dates.length) {
    const byWeek = new Map<string, number>();
    for (const d of dates) { const wk = startOfWeek(d); byWeek.set(wk, (byWeek.get(wk) || 0) + dailyTotals[d]); }
    for (let wk = startOfWeek(dates[0]); wk <= weekStart; wk = addDays(wk, 7)) {
      const h = byWeek.get(wk) || 0;
      if (h >= weekTarget - 1e-9) goalWeekStreak++;
      else if (wk < weekStart) goalWeekStreak = 0;
    }
  }

  // --- XP
  const mockXPTotal = mocks.reduce((sum, m) => sum + mockXP((m.marks / (mockMax(m.subject) || 100)) * 100), 0);
  const hoursXP = Math.round(cappedHours * XP_PER_HOUR + pastHours * XP_PAST_PER_HOUR);
  const goalXP = goalDays * XP_GOAL_BONUS;
  const beastXP = beastDays * XP_BEAST_BONUS;
  const questXP = Object.values(game.claims || {}).reduce((a, v) => a + (Number(v) || 0), 0);
  const totalXP = hoursXP + goalXP + beastXP + mockXPTotal + questXP;

  // --- Rank: thresholds scale with the time left to the exam and never drop below the best rank reached.
  const exam = settings.targetExamDate || addDays(today, 120);
  const ladder = ladderFor(rankScale(goal, dates[0] || today, exam));
  const rankInfo = rankFor(totalXP, ladder, game.rankFloor || 0);

  const readiness = computeReadiness({ today, goal, streakMin, restDays, dailyTotals, mocks, mockMax, subjects, subjectHours });

  return {
    totalStudiedHours: loggedHours + pastHours, loggedHours, pastHours, subjectHours, subjectSessionCount, dailyTotals,
    daysLogged, todayHours, weekHours, last7Avg: last7 / 7, bestDayHours, bestDayDate,
    currentFireStreak, maxStreak, streakMin, freezes, frozenDays, goalWeekStreak,
    goalWeek: { hours: weekHours, target: weekTarget, done: weekHours >= weekTarget - 1e-9 },
    fireToday, beastDays, goalDays,
    totalXP, xpBreakdown: { hours: hoursXP, goal: goalXP, beast: beastXP, mocks: mockXPTotal, quests: questXP }, rankInfo, ladder, readiness,
  };
}

/** Grade for a mock score, shared by the mock tabs. */
export function gradeFor(marks: number, max: number): { id: 'excellent' | 'pass' | 'borderline' | 'fail'; label: string; accent: 'mint' | 'cyan' | 'gold' | 'rose'; pct: number } {
  const p = max > 0 ? (marks / max) * 100 : 0;
  if (p >= 70) return { id: 'excellent', label: 'Excellent', accent: 'mint', pct: p };
  if (p >= 50) return { id: 'pass', label: 'Pass', accent: 'cyan', pct: p };
  if (p >= 40) return { id: 'borderline', label: 'Borderline', accent: 'gold', pct: p };
  return { id: 'fail', label: 'Needs work', accent: 'rose', pct: p };
}
