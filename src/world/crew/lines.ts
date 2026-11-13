// What the crew say. Every line comes from the student's real numbers; the day number picks between equal choices, so the
// same screen does not read the same every morning but never changes while it is being looked at.

import type { Island, Storm, Wind } from '../voyage/progress';
import type { CrewId, Expr } from './types';

export interface CrewContext {
  /** Hours a day the plan needs, hours a day lately. */
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
  seed: number;
}
export interface CrewLine { who: CrewId; expr: Expr; text: string }

const pick = <T,>(seed: number, list: T[], salt = 0): T => list[Math.abs(Math.floor(seed) + salt) % list.length];
const h = (n: number) => (Math.round(n * 10) / 10).toString();
const plural = (n: number, a: string, b = a + 's') => (n === 1 ? a : b);

/** A number that changes once a day, for choosing between equal lines. */
export const daySeed = (today: string) => Number(today.replace(/-/g, '')) % 997;

export function odalysLine(c: CrewContext): CrewLine {
  const who = 'odalys' as const;
  if (c.daysLeft < 0) return { who, expr: 'neutral', text: 'The exam day has passed. Chart a new date in Quarters whenever you are ready for the next crossing.' };
  const w = c.wind;
  if (w.kind === 'calm') return { who, expr: 'think', text: 'I have nothing to steer by yet. Give me an exam date and a plan, and I will plot the course.' };
  const left = `${c.daysLeft} ${plural(c.daysLeft, 'day')} to harbour`;
  if (w.kind === 'tail') return { who, expr: 'smile', text: pick(c.seed, [
    `A tailwind. You are averaging ${h(w.actual)} h a day and the plan needs ${h(w.needed)} h. Hold this heading; ${left}.`,
    `Ahead of the chart: ${h(w.actual)} h a day against the ${h(w.needed)} h I need. Do not touch the tiller.`,
  ]) };
  if (w.kind === 'cross') return { who, expr: 'think', text: pick(c.seed, [
    `A crosswind. The plan needs ${h(w.needed)} h a day and you are at ${h(w.actual)} h. Trim the sails, not the course.`,
    `Nearly on course: ${h(w.actual)} h against ${h(w.needed)} h. One extra hour a day closes it. ${left}.`,
  ]) };
  return { who, expr: 'worry', text: pick(c.seed, [
    `Headwind. The plan needs ${h(w.needed)} h a day; lately you are at ${h(w.actual)} h. We can still make harbour, but we have to row. ${left}.`,
    `We are drifting: ${h(w.actual)} h a day against ${h(w.needed)} h needed. Short, steady sessions will turn this around.`,
  ]) };
}

export function tallyLine(c: CrewContext): CrewLine {
  const who = 'tally' as const;
  const list = [...c.storms].sort((a, b) => b.date.localeCompare(a.date));
  const last = list[0];
  if (!last) return { who, expr: 'think', text: 'No weather on the books. A mock is the only honest report. Log one when you can and I will enter it.' };
  const pct = Math.round(last.pct);
  if (last.weather === 'clear') return { who, expr: 'cheer', text: `${last.subject}: ${pct}%. Calm seas. I wrote it down twice to be sure. You hold ${c.totalXP.toLocaleString('en-IN')} XP, ${c.rankTitle}.` };
  if (last.weather === 'fair') return { who, expr: 'smile', text: `${last.subject}: ${pct}%. A fair wind and a pass, with room to grow. ${c.totalXP.toLocaleString('en-IN')} XP in the chest.` };
  if (last.weather === 'rough') return { who, expr: 'worry', text: `Rough water in ${last.subject}: ${pct}%, just on the edge. Brine has it on the repair list. One more mock will show if it is mending.` };
  return { who, expr: 'worry', text: `A storm over ${last.subject}: ${pct}%. It happens to every crew. Learn from it, repair, and sail it again.` };
}

export function brineLine(c: CrewContext): CrewLine {
  const who = 'brine' as const;
  const worn = c.islands.filter((i) => i.neglected).sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0));
  if (worn.length) {
    const i = worn[0];
    const more = worn.length > 1 ? ` and ${worn.length - 1} more ${plural(worn.length - 1, 'island')}` : '';
    return { who, expr: 'determined', text: `${i.abbrev} (${i.name}) has not had a visit in ${i.daysSince} days${more}. Barnacles by Friday if we leave it. One revision hour will do.` };
  }
  const weak = [...c.storms].filter((s) => s.weather === 'rough' || s.weather === 'storm').sort((a, b) => a.pct - b.pct)[0];
  if (weak) return { who, expr: 'determined', text: `${weak.subject} took a beating (${Math.round(weak.pct)}%). I would patch that hull first, before anything new.` };
  const fresh = c.islands.filter((i) => i.state === 'uncharted');
  if (fresh.length) return { who, expr: 'neutral', text: `We have not set foot on ${fresh[0].abbrev} yet. Start with one chapter. The first lantern is the hardest to light.` };
  return { who, expr: 'smile', text: pick(c.seed, ['Hull is sound. Nothing has gone ten days without a visit.', 'Every plank is where it should be. I could get used to this.']) };
}

export function saffronLine(c: CrewContext): CrewLine {
  const who = 'saffron' as const;
  if (c.timerSubject) return { who, expr: 'smile', text: `You are timing ${c.timerSubject}. I will keep the kettle warm. Stretch and sip some water at the next marker.` };
  if (c.goal > 0 && c.todayHours >= c.goal) return { who, expr: 'cheer', text: 'Goal met! Eat something proper and sleep early. The ledger will still be there in the morning.' };
  if (c.streak >= 2) return { who, expr: 'proud', text: `${c.streak} days running. ${c.freezes > 0 ? `${c.freezes} ${plural(c.freezes, 'freeze')} in the larder for a rough day.` : 'The larder has no freezes yet, so mind the days.'}` };
  if (c.todayHours > 0) return { who, expr: 'smile', text: `${h(c.todayHours)} h in today. A little more, then a proper meal.` };
  return { who, expr: pick(c.seed, ['neutral', 'sleepy'] as Expr[]), text: pick(c.seed, [
    'A fresh day. An hour before lunch is worth more than three after midnight.',
    'Tea first, then the first hour. The rest tends to follow.',
  ]) };
}

const SOL = [
  'A balanced book has two columns. Effort on one side, rest on the other.',
  'Every lantern lit is a chapter that will not surprise me in the hall.',
  'The Golden Ledger is only a book that balances. We are nearly there, one entry at a time.',
  'Today is one entry. Make it a clean one.',
  'The sea does not care how big the ship is. It only asks that you keep sailing.',
  'Small hours add up faster than big plans.',
];
export function solLine(c: CrewContext): CrewLine {
  return { who: 'sol', expr: pick(c.seed, ['determined', 'proud', 'smile'] as Expr[], 1), text: pick(c.seed, SOL, 2) };
}

export function crewLines(c: CrewContext): Record<CrewId, CrewLine> {
  return { sol: solLine(c), odalys: odalysLine(c), tally: tallyLine(c), brine: brineLine(c), saffron: saffronLine(c) };
}
