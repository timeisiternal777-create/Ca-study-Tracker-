// Readiness: one honest 0–100 number for "how ready am I?".
// It blends how you have been studying lately (habit), how your mock tests are going, and how much
// of each paper you have covered. It needs no server and no guesswork: every part comes from your logs.
import type { MockLogEntry, Readiness, ReadinessPart } from '../types';
import { addDays, eachDay, parseYmd } from './date';
import { clamp } from './format';

/** Hours of study per paper that count as "fully covered" for the coverage part. */
export const COVER_HOURS_PER_PAPER = 80;
/** A mock average at this percentage scores full marks in the mocks part. */
export const MOCK_FULL_SCORE_PCT = 70;
/** Without a mock on record the score cannot go past this. */
export const NO_MOCK_CAP = 80;

export interface ReadinessInput {
  today: string;
  goal: number;
  streakMin: number;
  restDays: number[];
  dailyTotals: Record<string, number>;
  mocks: MockLogEntry[];
  mockMax: (subject: string) => number;
  subjects: string[];
  subjectHours: Record<string, number>;
}

export function readinessLabel(score: number): Pick<Readiness, 'label' | 'accent'> {
  if (score < 20) return { label: 'Just starting', accent: 'rose' };
  if (score < 40) return { label: 'Building up', accent: 'gold' };
  if (score < 60) return { label: 'Getting there', accent: 'cyan' };
  if (score < 80) return { label: 'On track', accent: 'mint' };
  return { label: 'Exam ready', accent: 'mint' };
}

export function computeReadiness(i: ReadinessInput): Readiness {
  const dates = Object.keys(i.dailyTotals).filter((d) => i.dailyTotals[d] > 0).sort();
  const started = dates.length > 0 || Object.values(i.subjectHours).some((h) => h > 0);

  // Habit window: the last 14 days (not counting today unless it is the only day so far).
  const yesterday = addDays(i.today, -1);
  const first = dates[0];
  let days: string[] = [];
  if (first) {
    const end = first <= yesterday ? yesterday : i.today;
    const start = first > addDays(end, -13) ? first : addDays(end, -13);
    days = eachDay(start, end).filter((d) => !i.restDays.includes(parseYmd(d).getDay()));
  }
  const goal = Math.max(1, i.goal);
  const paceRaw = days.length ? days.reduce((a, d) => a + Math.min(i.dailyTotals[d] || 0, goal * 1.25), 0) / (goal * days.length) : 0;
  const consistency = days.length ? days.filter((d) => (i.dailyTotals[d] || 0) >= i.streakMin).length / days.length : 0;

  // Mocks: the average of the latest three.
  const recent = [...i.mocks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const mockPct = recent.length ? recent.reduce((a, m) => a + (m.marks / (i.mockMax(m.subject) || 100)) * 100, 0) / recent.length : null;

  // Coverage: how far each paper is towards COVER_HOURS_PER_PAPER.
  const cover = i.subjects.length
    ? i.subjects.reduce((a, s) => a + Math.min(1, (i.subjectHours[s] || 0) / COVER_HOURS_PER_PAPER), 0) / i.subjects.length
    : 0;

  const parts: ReadinessPart[] = [
    { id: 'pace', label: 'Study pace', weight: 25, score: days.length ? Math.round(clamp(paceRaw, 0, 1) * 100) : null,
      note: days.length ? `Recent days average ${Math.round(paceRaw * 100)}% of your daily goal.` : 'Log a few days to measure your pace.' },
    { id: 'consistency', label: 'Consistency', weight: 15, score: days.length ? Math.round(consistency * 100) : null,
      note: days.length ? `${Math.round(consistency * days.length)} of the last ${days.length} study days reached ${i.streakMin}h.` : 'Shows how steady your days are.' },
    { id: 'mocks', label: 'Mock tests', weight: 30, score: mockPct == null ? null : Math.round(clamp(mockPct / MOCK_FULL_SCORE_PCT, 0, 1) * 100),
      note: mockPct == null ? 'Log a mock test to unlock this part.' : `Your last ${recent.length === 1 ? 'mock' : `${recent.length} mocks`} average ${Math.round(mockPct)}%.` },
    { id: 'coverage', label: 'Paper coverage', weight: 30, score: i.subjects.length ? Math.round(cover * 100) : null,
      note: `${COVER_HOURS_PER_PAPER}h on a paper counts as fully covered.` },
  ];

  const live = parts.filter((p) => p.score != null);
  const totalW = live.reduce((a, p) => a + p.weight, 0);
  let score = totalW ? live.reduce((a, p) => a + (p.score as number) * p.weight, 0) / totalW : 0;
  const capped = mockPct == null && started;
  if (capped) score = Math.min(score, NO_MOCK_CAP);
  if (!started) score = 0;
  score = Math.round(clamp(score, 0, 100));
  return { score, ...readinessLabel(score), parts, started, capped };
}
