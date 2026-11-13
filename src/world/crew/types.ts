/** The crew of The Double Entry. All original characters. */
export type CrewId = 'sol' | 'odalys' | 'tally' | 'brine' | 'saffron';
export type Expr = 'neutral' | 'smile' | 'grin' | 'cheer' | 'determined' | 'worry' | 'surprise' | 'sleepy' | 'proud' | 'think';
export const EXPRESSIONS: Expr[] = ['neutral', 'smile', 'grin', 'cheer', 'determined', 'worry', 'surprise', 'sleepy', 'proud', 'think'];

export interface CrewInfo { id: CrewId; name: string; role: string; job: string }
export const CREW: Record<CrewId, CrewInfo> = {
  sol: { id: 'sol', name: 'Sol', role: 'Captain', job: 'That is you. Steers by the ledger.' },
  odalys: { id: 'odalys', name: 'Odalys Quill', role: 'Navigator', job: 'Reads your pace against the exam date.' },
  tally: { id: 'tally', name: 'Tally Fenn', role: 'Quartermaster', job: 'Keeps the count: XP, ranks and mock results.' },
  brine: { id: 'brine', name: 'Brine Hollis', role: 'Shipwright', job: 'Spots the papers that need repairs.' },
  saffron: { id: 'saffron', name: 'Saffron Pell', role: 'Cook', job: 'Watches breaks, streaks and rations.' },
};
export const CREW_ORDER: CrewId[] = ['odalys', 'tally', 'brine', 'saffron'];
