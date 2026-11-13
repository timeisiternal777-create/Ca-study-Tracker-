// Milestone badges. Ids, titles and unlock rules follow the original app's `badges.ts`
// (generalised so “All-Rounder” works for any level/group), plus progress for the locked ones.
import type { DailyStudyLog, MockLogEntry } from '../types';
import { diffDays } from './date';
import { dayHours } from './stats';
import { subjectHoursOf } from './log';

export type BadgeIcon = 'sword' | 'flame' | 'rocket' | 'medal' | 'swords' | 'shield' | 'globe' | 'gem' | 'crosshair' | 'crown';

export interface BadgeDef { id: string; title: string; description: string; icon: BadgeIcon }
export interface BadgeState extends BadgeDef { unlocked: boolean; progress: number; value: number; target: number; unit: string }

export const BADGES: BadgeDef[] = [
  { id: 'first-blood', title: 'First Blood', description: 'Log your first study session.', icon: 'sword' },
  { id: 'week-warrior', title: 'Week Warrior', description: 'Study on 7 days in a row.', icon: 'flame' },
  { id: 'beast-mode', title: 'Beast Mode', description: 'Study 10 or more hours in a single day.', icon: 'rocket' },
  { id: 'century-club', title: 'Century Club', description: 'Reach 100 total study hours.', icon: 'medal' },
  { id: 'mock-slayer', title: 'Mock Slayer', description: 'Pass your first mock test (50% or more).', icon: 'swords' },
  { id: 'iron-will', title: 'Iron Will', description: 'Study on 14 days in a row.', icon: 'shield' },
  { id: 'all-rounder', title: 'All-Rounder', description: 'Log study hours in every one of your papers.', icon: 'globe' },
  { id: 'double-ton', title: 'Double Ton', description: 'Reach 200 total study hours.', icon: 'gem' },
  { id: 'perfectionist', title: 'Perfectionist', description: 'Score 90% or more in any mock test.', icon: 'crosshair' },
  { id: 'ca-ready', title: 'CA Ready', description: 'Reach 300 total study hours.', icon: 'crown' },
];

export interface BadgeInput {
  logs: DailyStudyLog[];
  mocks: MockLogEntry[];
  pastHours: Record<string, number>;
  /** Subject names the student studies (active level & group). */
  subjects: string[];
  /** Max marks for a subject name (for mock percentages). */
  mockMax: (subject: string) => number;
}

/** Longest run of consecutive calendar days with any study logged. */
export function longestActiveRun(logs: DailyStudyLog[]): number {
  const days = [...new Set(logs.filter((l) => dayHours(l) > 0).map((l) => l.date))].sort();
  let best = 0, cur = 0, prev = '';
  for (const d of days) {
    cur = prev && diffDays(prev, d) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

export function evaluateBadges({ logs, mocks, pastHours, subjects, mockMax }: BadgeInput): BadgeState[] {
  const past = Object.values(pastHours || {}).reduce((a, h) => a + (Number(h) > 0 ? Number(h) : 0), 0);
  const logged = logs.reduce((a, l) => a + dayHours(l), 0);
  const total = logged + past;
  const run = longestActiveRun(logs);
  const beast = logs.some((l) => dayHours(l) >= 10);
  const studied = new Set<string>();
  for (const [s, h] of Object.entries(pastHours || {})) if (Number(h) > 0) studied.add(s);
  for (const l of logs) for (const [s] of subjectHoursOf(l)) studied.add(s);
  const pcts = mocks.map((m) => (m.marks / (mockMax(m.subject) || 100)) * 100);
  const passed = pcts.some((p) => p >= 50);
  const high = pcts.some((p) => p >= 90);
  const covered = subjects.filter((s) => studied.has(s)).length;

  const make = (def: BadgeDef, value: number, target: number, unit: string): BadgeState => ({ ...def, value: Math.min(value, target), target, unit, unlocked: value >= target, progress: Math.max(0, Math.min(1, target ? value / target : 0)) });
  const by = Object.fromEntries(BADGES.map((b) => [b.id, b]));
  return [
    make(by['first-blood'], logs.length + (past > 0 ? 1 : 0) > 0 ? 1 : 0, 1, 'session'),
    make(by['week-warrior'], run, 7, 'days'),
    make(by['beast-mode'], beast ? 10 : Math.max(0, ...logs.map((l) => dayHours(l))), 10, 'hours'),
    make(by['century-club'], total, 100, 'hours'),
    make(by['mock-slayer'], passed ? 1 : 0, 1, 'pass'),
    make(by['iron-will'], run, 14, 'days'),
    make(by['all-rounder'], covered, Math.max(subjects.length, 1), 'papers'),
    make(by['double-ton'], total, 200, 'hours'),
    make(by['perfectionist'], high ? 90 : Math.max(0, ...pcts, 0), 90, '%'),
    make(by['ca-ready'], total, 300, 'hours'),
  ];
}

