// The rules of Lanternfell's four houses, as plain functions. Nothing here touches the screen or storage, so every rule can be tested.
//
// Each house stands for one virtue, and each virtue is MEASURED from how the student really studies (0 to 100):
//   Grit        the longest run of good days, and the hours put in on the hardest days
//   Care        the marks on recent mocks, and how often earlier work is gone over again
//   Wit         how many papers are touched, and how fast chapters get closed
//   Steadiness  how many days were studied
// The Choosing blends the measured virtues (60 percent) with three questions the student answers (40 percent), so someone who has just
// started, with nothing logged yet, is still chosen by their own answers.

import type { DailyStudyLog, MockLogEntry, SubjectConfig } from '../../types';
import { addDays, diffDays } from '../../lib/date';
import { clamp } from '../../lib/format';
import { filledSlots, logHours } from '../../lib/log';
import { HOUSE_ORDER, HOUSES, type HouseId, type Virtue } from './houses';

export const VIRTUES: Virtue[] = ['grit', 'care', 'wit', 'steadiness'];
export type Virtues = Record<Virtue, number>;
/** The three questions have four answers each. An answer is its position 0 to 3, or null when the student skipped it. */
export const QUESTION_COUNT = 3;
export type Answers = (number | null)[];

export const HOUSE_OF: Record<Virtue, HouseId> = { grit: 'wolf', care: 'heron', wit: 'fox', steadiness: 'bear' };
export const VIRTUE_OF: Record<HouseId, Virtue> = { wolf: 'grit', heron: 'care', fox: 'wit', bear: 'steadiness' };

/** The measured part and the questions' part of the blend. */
export const MEASURED_WEIGHT = 0.6;
/** A student can be chosen again after this many days. */
export const TERM_DAYS = 60;
/** A student with fewer logged days than this is chosen by the answers alone. */
export const MIN_DAYS_OF_DATA = 3;

// ───────────────────────────── the three questions ─────────────────────────────

export interface Question { prompt: string; answers: { text: string; virtue: Virtue }[] }

/** Each virtue sits in a different place in each question, so the order of the answers gives nothing away. */
export const QUESTIONS: Question[] = [
  {
    prompt: 'It is late. The lantern is low and the chapter is only half done. What do you do?',
    answers: [
      { text: 'Trim the wick and go on until it is finished.', virtue: 'grit' },
      { text: 'Go back over what I have written, to be sure it is right.', virtue: 'care' },
      { text: 'Look for a quicker way through the rest of it.', virtue: 'wit' },
      { text: 'Stop at a sensible hour. I will be back at it tomorrow.', virtue: 'steadiness' },
    ],
  },
  {
    prompt: 'A trial paper comes back with a poor mark. What is your first thought?',
    answers: [
      { text: 'One paper is one paper. I keep my usual hours.', virtue: 'steadiness' },
      { text: 'Find the pattern: what kind of question keeps catching me?', virtue: 'wit' },
      { text: 'Read every wrong line until I know exactly why it is wrong.', virtue: 'care' },
      { text: 'Sit the very same paper again tomorrow.', virtue: 'grit' },
    ],
  },
  {
    prompt: 'The Archivist offers you one gift for the term. Which do you take?',
    answers: [
      { text: 'A map of every chapter and how they join up.', virtue: 'wit' },
      { text: 'A glass that shows any mistake, however small.', virtue: 'care' },
      { text: 'A winter coat for the longest, coldest nights.', virtue: 'grit' },
      { text: 'A small bell that rings at the same hour every day.', virtue: 'steadiness' },
    ],
  },
];

/** How many of the answers point to each virtue, as a share of the answers given (0 to 100). */
export function answerShares(answers: Answers): Virtues {
  const out: Virtues = { grit: 0, care: 0, wit: 0, steadiness: 0 };
  let given = 0;
  answers.slice(0, QUESTION_COUNT).forEach((a, q) => {
    const pick = a === null || a === undefined ? undefined : QUESTIONS[q]?.answers[a];
    if (!pick) return;
    given++; out[pick.virtue] += 1;
  });
  if (given === 0) return out;
  for (const v of VIRTUES) out[v] = (out[v] / given) * 100;
  return out;
}

// ───────────────────────────── measuring the virtues ─────────────────────────────

export interface VirtueInput {
  logs: DailyStudyLog[];
  /** Mock marks as a percentage of the paper, whatever the paper's own maximum (see mockPercents). */
  mocks: { date: string; pct: number }[];
  /** Chapters ticked in the plan and chapters in the plan altogether. */
  chapters: { done: number; total: number };
  /** How many papers the student's level has. */
  papers: number;
  /** Total hours studied (the speed of closing chapters is measured against it). */
  totalHours: number;
  /** A day counts as a good day (for the run) from this many hours. */
  goodDayHours: number;
  today: string;
}
export interface Measured { virtues: Virtues; daysOfData: number }

const MOCK_WINDOW_DAYS = 45;

/** Mocks as percentages of their paper's marks. A mock for a paper that is not in the list is counted out of 100. */
export function mockPercents(mocks: MockLogEntry[], subjects: SubjectConfig[]): { date: string; pct: number }[] {
  const max = new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s.marks] as const));
  return mocks.map((m) => ({ date: m.date, pct: clamp(((Number(m.marks) || 0) / (max.get((m.subject || '').trim().toLowerCase()) ?? 100)) * 100, 0, 100) }));
}
const REVISIT_DAYS = 14;
const norm = (s: string) => s.trim().toLowerCase();

/** The longest run of consecutive days at or above `min` hours, inside the window. */
function longestRun(days: string[], hoursOn: Map<string, number>, min: number): number {
  let best = 0, run = 0;
  for (const d of days) { if ((hoursOn.get(d) ?? 0) >= min) { run++; if (run > best) best = run; } else run = 0; }
  return best;
}

/**
 * The four virtues over the last `windowDays` days (28 for the wells, 7 for the week's cup). Each is 0 to 100.
 * Everything is worked out inside the window except the mock marks, which use the last 45 days (mocks are rare, and a week without one
 * should not make anyone careless).
 */
export function scoreVirtues(inp: VirtueInput, windowDays = 28): Measured {
  const { today } = inp;
  const days = Array.from({ length: windowDays }, (_, i) => addDays(today, i - (windowDays - 1)));
  const inWindow = new Set(days);
  const hoursOn = new Map<string, number>();
  for (const l of inp.logs) { const h = logHours(l); if (h > 0) hoursOn.set(l.date, (hoursOn.get(l.date) ?? 0) + h); }
  const studied = days.filter((d) => (hoursOn.get(d) ?? 0) >= 0.5);

  // Grit: the longest good-day run (full marks at 14 days, or the whole window if that is shorter) and the average of the three biggest days.
  const run = longestRun(days, hoursOn, Math.max(1, inp.goodDayHours * 0.6));
  const gritRun = clamp(run / Math.min(14, windowDays), 0, 1);
  const top3 = days.map((d) => hoursOn.get(d) ?? 0).sort((a, b) => b - a).slice(0, 3);
  const gritHard = clamp(top3.reduce((a, b) => a + b, 0) / 3 / 10, 0, 1);
  const grit = 100 * (0.5 * gritRun + 0.5 * gritHard);

  // Care: the latest five mocks (as a share of the paper's marks, 25 percent scoring nothing and 80 percent everything) and the share of
  // the window's study that returns to a paper already studied in the 14 days before.
  const recent = inp.mocks
    .filter((m) => { const ago = diffDays(m.date, today); return ago >= 0 && ago <= MOCK_WINDOW_DAYS; })
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const lastBySubject = new Map<string, string[]>();
  for (const l of [...inp.logs].sort((a, b) => a.date.localeCompare(b.date))) for (const s of filledSlots(l)) if (s.hours > 0 && s.subject) {
    const k = norm(s.subject); const arr = lastBySubject.get(k) ?? []; arr.push(l.date); lastBySubject.set(k, arr);
  }
  let pairs = 0, revisits = 0;
  for (const arr of lastBySubject.values()) {
    arr.forEach((d, i) => {
      if (!inWindow.has(d)) return;
      pairs++;
      const prev = arr[i - 1];
      if (prev && diffDays(prev, d) <= REVISIT_DAYS) revisits++;
    });
  }
  const careRev = pairs ? clamp(revisits / pairs / 0.7, 0, 1) : 0;
  let care: number;
  if (recent.length) {
    const avg = recent.reduce((a, m) => a + clamp(Number(m.pct) || 0, 0, 100), 0) / recent.length;
    care = 100 * (0.6 * clamp((avg - 25) / 55, 0, 1) + 0.4 * careRev);
  } else care = 100 * 0.7 * careRev;

  // Wit: how many of the level's papers were touched in the window, and chapters closed per hour studied (0.15 an hour is full marks).
  const touched = new Set<string>();
  for (const l of inp.logs) if (inWindow.has(l.date)) for (const s of filledSlots(l)) if (s.hours > 0 && s.subject) touched.add(norm(s.subject));
  const range = clamp(touched.size / Math.max(1, Math.min(inp.papers, 6)), 0, 1);
  const speed = inp.chapters.total > 0 && inp.totalHours > 0 ? clamp(inp.chapters.done / inp.totalHours / 0.15, 0, 1) : null;
  const wit = speed === null ? 100 * 0.8 * range : 100 * (0.5 * range + 0.5 * speed);

  // Steadiness: the share of days studied (85 percent of days is full marks).
  const steadiness = 100 * clamp(studied.length / windowDays / 0.85, 0, 1);

  const r = (n: number) => Math.round(clamp(n, 0, 100));
  return { virtues: { grit: r(grit), care: r(care), wit: r(wit), steadiness: r(steadiness) }, daysOfData: hoursOn.size };
}

// ───────────────────────────── choosing the house ─────────────────────────────

export interface Choice {
  house: HouseId;
  /** The blend each house got, 0 to 100. */
  blended: Virtues;
  /** The answers' part alone. */
  shares: Virtues;
  /** True when the first two houses were level and the answers or the order settled it. */
  close: boolean;
}

/** Blends the measured virtues with the answers and picks the house of the strongest. */
export function chooseHouse(measured: Virtues, answers: Answers, daysOfData = Infinity): Choice {
  const shares = answerShares(answers);
  const anyAnswer = answers.some((a) => a !== null && a !== undefined);
  const useMeasured = daysOfData >= MIN_DAYS_OF_DATA;
  const wm = useMeasured ? (anyAnswer ? MEASURED_WEIGHT : 1) : 0;
  const blended = {} as Virtues;
  for (const v of VIRTUES) blended[v] = Math.round((wm * measured[v] + (1 - wm) * shares[v]) * 10) / 10;
  const order = [...VIRTUES].sort((a, b) =>
    blended[b] - blended[a] || shares[b] - shares[a] || measured[b] - measured[a] || HOUSE_ORDER.indexOf(HOUSE_OF[a]) - HOUSE_ORDER.indexOf(HOUSE_OF[b]));
  const close = Math.abs(blended[order[0]] - blended[order[1]]) < 0.5;
  return { house: HOUSE_OF[order[0]], blended, shares, close };
}

/** From when the student may be chosen again (the day a term after the last Choosing), or null if they have never been chosen. */
export const rechooseFrom = (chosenOn: string | null): string | null => (chosenOn ? addDays(chosenOn, TERM_DAYS) : null);
export const canRechoose = (chosenOn: string | null, today: string): boolean => !chosenOn || today >= addDays(chosenOn, TERM_DAYS);

// ───────────────────────────── the house cup ─────────────────────────────

export interface Cup { winner: HouseId | null; virtue: Virtue | null; score: number; weekly: Virtues }

/** The week's strongest virtue takes the cup for its house. Nothing is won in a week with nothing logged. */
export function weeklyCup(weekly: Virtues): Cup {
  const best = [...VIRTUES].sort((a, b) => weekly[b] - weekly[a] || HOUSE_ORDER.indexOf(HOUSE_OF[a]) - HOUSE_ORDER.indexOf(HOUSE_OF[b]))[0];
  const score = weekly[best];
  return score > 0 ? { winner: HOUSE_OF[best], virtue: best, score, weekly } : { winner: null, virtue: null, score: 0, weekly };
}

export const virtueLabel = (v: Virtue) => HOUSES[HOUSE_OF[v]].virtueLabel;
