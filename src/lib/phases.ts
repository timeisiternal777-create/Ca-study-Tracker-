// Exam phases: what to focus on, depending on how many days are left.
export type PhaseId = 'learn' | 'practice' | 'revise' | 'sprint' | 'final' | 'done';

export interface Phase {
  id: PhaseId;
  title: string;
  /** a short line: what matters most right now */
  focus: string;
  /** mock tests worth taking each week in this phase */
  mocksPerWeek: number;
  accent: 'cyan' | 'violet' | 'gold' | 'ember' | 'rose' | 'mint';
  /** days left at which this phase begins (inclusive upper bound) */
  upTo: number;
}

export const PHASES: Phase[] = [
  { id: 'learn', title: 'Learn', focus: 'Cover the whole syllabus once. Depth can wait, coverage cannot.', mocksPerWeek: 0, accent: 'cyan', upTo: Infinity },
  { id: 'practice', title: 'Practise', focus: 'Finish the syllabus and solve questions on every chapter you finish.', mocksPerWeek: 1, accent: 'violet', upTo: 120 },
  { id: 'revise', title: 'Revise', focus: 'Revise each paper at least twice. Take a mock every week and fix what it shows.', mocksPerWeek: 1, accent: 'gold', upTo: 60 },
  { id: 'sprint', title: 'Mock sprint', focus: 'Mocks under exam conditions, then study only the mistakes.', mocksPerWeek: 3, accent: 'ember', upTo: 21 },
  { id: 'final', title: 'Final week', focus: 'Light revision, short notes and sleep. No new topics.', mocksPerWeek: 0, accent: 'rose', upTo: 7 },
  { id: 'done', title: 'Exam over', focus: 'Rest well. Set a new exam date in Settings when you are ready for the next round.', mocksPerWeek: 0, accent: 'mint', upTo: -1 },
];

/** `daysLeft` is whole days until the exam (negative once it has passed). */
export function phaseFor(daysLeft: number): Phase {
  if (daysLeft < 0) return PHASES[5];
  let hit = PHASES[0];
  for (const p of PHASES) if (p.id !== 'done' && daysLeft <= p.upTo) hit = p;
  return hit;
}
