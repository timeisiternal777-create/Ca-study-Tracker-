// What the four teachers say. Like the Ledger Seas crew, every line comes from the student's real numbers; the day number only picks between
// equal choices, so a screen never changes while it is being read.

import type { Island, Storm, Wind } from '../voyage/progress';
import type { Expr } from '../crew/types';
import { HOUSES, type HouseId } from './houses';
import type { CastId } from './art/cast/types';

export type TeacherId = Exclude<CastId, 'student'>;

export interface AcademyContext {
  wind: Wind;
  daysLeft: number;
  islands: Island[];
  /** The latest mock of each paper in the last 45 days. */
  storms: Storm[];
  streak: number;
  freezes: number;
  todayHours: number;
  goal: number;
  rankTitle: string;
  totalXP: number;
  timerSubject: string | null;
  house: HouseId | null;
  seed: number;
}
export interface TeacherLine { who: TeacherId; expr: Expr; text: string }

const pick = <T,>(seed: number, list: T[], salt = 0): T => list[Math.abs(Math.floor(seed) + salt) % list.length];
const h = (n: number) => (Math.round(n * 10) / 10).toString();
const plural = (n: number, a: string, b = a + 's') => (n === 1 ? a : b);

/** Headmistress Vane reads the pace: hours a day the timetable needs against hours a day lately. */
export function vaneLine(c: AcademyContext): TeacherLine {
  const who = 'vane' as const;
  if (c.daysLeft < 0) return { who, expr: 'neutral', text: 'The examination day has passed. When you are ready, set a new date in Your room and the next term can begin.' };
  const w = c.wind;
  if (w.kind === 'calm') return { who, expr: 'think', text: 'I cannot read the draught without a date and a plan. Give me both, and I will tell you how the term is going.' };
  const left = `${c.daysLeft} ${plural(c.daysLeft, 'day')} remain`;
  if (w.kind === 'tail') return { who, expr: 'proud', text: pick(c.seed, [
    `A kind draught. You average ${h(w.actual)} hours a day and the timetable asks ${h(w.needed)}. Keep the lamps as they are; ${left}.`,
    `You are ahead of the timetable: ${h(w.actual)} hours a day against the ${h(w.needed)} I need. Do not change a thing. ${left}.`,
  ]) };
  if (w.kind === 'cross') return { who, expr: 'think', text: pick(c.seed, [
    `A cross-draught. The timetable asks ${h(w.needed)} hours a day and you are at ${h(w.actual)}. A little more on most days closes it. ${left}.`,
    `Nearly there: ${h(w.actual)} hours against ${h(w.needed)}. One extra hour on the good days will do it. ${left}.`,
  ]) };
  return { who, expr: 'worry', text: pick(c.seed, [
    `A head draught. The timetable needs ${h(w.needed)} hours a day and lately you manage ${h(w.actual)}. We can still reach the day, but we must walk faster. ${left}.`,
    `We are falling behind: ${h(w.actual)} hours a day against ${h(w.needed)} needed. Short, steady sessions will turn this around. ${left}.`,
  ]) };
}

/** Mr Bellweather, the Archivist, keeps the trial book and the standings. */
export function bellweatherLine(c: AcademyContext): TeacherLine {
  const who = 'bellweather' as const;
  const list = [...c.storms].sort((a, b) => b.date.localeCompare(a.date));
  const last = list[0];
  if (!last) return { who, expr: 'think', text: 'The trial book is empty. A mock paper is the only honest report. Sit one when you can and I shall enter it myself.' };
  const pct = Math.round(last.pct);
  if (last.weather === 'clear') return { who, expr: 'cheer', text: `${last.subject}: ${pct}%. That goes in the margin in gold ink, and I wrote it twice to be sure. You hold ${c.totalXP.toLocaleString('en-IN')} XP, ${c.rankTitle}.` };
  if (last.weather === 'fair') return { who, expr: 'smile', text: `${last.subject}: ${pct}%. A fair pass. The ink is dry, but there is room above the line. You stand as ${c.rankTitle}.` };
  if (last.weather === 'rough') return { who, expr: 'worry', text: `${last.subject}: ${pct}%, only just under the line. I have put a slip in that page. One more trial will show whether it is mending.` };
  return { who, expr: 'worry', text: `${last.subject}: ${pct}%. It happens to every student who has ever sat a trial. Learn from it, revise, and sit it again.` };
}

/** Warden Reed walks the grounds and notices which doors have not been opened. */
export function reedLine(c: AcademyContext): TeacherLine {
  const who = 'reed' as const;
  const worn = c.islands.filter((i) => i.neglected).sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0));
  if (worn.length) {
    const i = worn[0];
    const more = worn.length > 1 ? `, and ${worn.length - 1} more ${plural(worn.length - 1, 'building')}` : '';
    return { who, expr: 'determined', text: `${i.abbrev} (${i.name}) has not been visited in ${i.daysSince} days${more}. Ivy grows on a shut door. One revision hour will do.` };
  }
  const weak = [...c.storms].filter((s) => s.weather === 'rough' || s.weather === 'storm').sort((a, b) => a.pct - b.pct)[0];
  if (weak) return { who, expr: 'determined', text: `${weak.subject} took a beating (${Math.round(weak.pct)}%). I would go back to that building first, before anything new.` };
  const fresh = c.islands.filter((i) => i.state === 'uncharted');
  if (fresh.length) return { who, expr: 'neutral', text: `We have not opened ${fresh[0].abbrev} yet. Start with one chapter. The first window is the hardest to light.` };
  return { who, expr: 'smile', text: pick(c.seed, ['Every door has been opened lately. Nothing is gathering dust.', 'The grounds are in good order. I could almost take an evening off.']) };
}

/** Madge the lamplighter looks after breaks, streaks and the end of the day. */
export function madgeLine(c: AcademyContext): TeacherLine {
  const who = 'madge' as const;
  if (c.timerSubject) return { who, expr: 'smile', text: `You are timing ${c.timerSubject}. I will keep the lamps trimmed. Stretch and take a sip of water at the next marker.` };
  if (c.goal > 0 && c.todayHours >= c.goal) return { who, expr: 'cheer', text: 'Goal met! Eat something proper and sleep early. The lamps will still be burning in the morning.' };
  if (c.streak >= 2) return { who, expr: 'proud', text: `${c.streak} days running. ${c.freezes > 0 ? `${c.freezes} ${plural(c.freezes, 'freeze')} in my pocket for a rough day.` : 'No freezes in my pocket yet, so mind the days.'}` };
  if (c.todayHours > 0) return { who, expr: 'smile', text: `${h(c.todayHours)} h in today. A little more, then a proper meal.` };
  return { who, expr: pick(c.seed, ['neutral', 'sleepy'] as Expr[]), text: pick(c.seed, [
    'A fresh day. An hour before lunch is worth more than three after midnight.',
    'Tea first, then the first hour. The rest tends to follow.',
  ]) };
}

const STUDENT = [
  'Every window lit is a chapter that will not surprise me in the hall.',
  'Today is one entry in the day book. Make it a clean one.',
  'Small hours add up faster than big plans.',
  'The lamp is lit. One more chapter and another window glows.',
];
/** The student's own thought for the day, with the house motto now and then. */
export function studentLine(c: AcademyContext): { expr: Expr; text: string } {
  if (c.house && c.seed % 3 === 0) return { expr: 'determined', text: `${HOUSES[c.house].motto} ${HOUSES[c.house].name} does not stop at the first closed door.` };
  return { expr: pick(c.seed, ['determined', 'proud', 'smile'] as Expr[], 1), text: pick(c.seed, STUDENT, 2) };
}

export function teacherLines(c: AcademyContext): Record<TeacherId, TeacherLine> {
  return { vane: vaneLine(c), bellweather: bellweatherLine(c), reed: reedLine(c), madge: madgeLine(c) };
}
