// Wording for the themed worlds. The app's own words stay the default; in the Voyage world the menus and rank names turn nautical, in
// Lanternfell they turn into a school's (grounds, trials, standing), unless "plain words" is on. Pure, so it can be tested.
import type { TabType } from '../types';

export type World = 'default' | 'voyage' | 'academy';
export const WORLDS: World[] = ['default', 'voyage', 'academy'];

/** Whatever is stored for the world (old, hand-edited or damaged) as a valid world. */
export const normaliseWorld = (v: unknown): World => (v === 'voyage' || v === 'academy' ? v : 'default');

/** [menu label, short label for the phone bar] */
type SectionWords = Record<string, [string, string]>;
const SECTION_WORDS: Record<Exclude<World, 'default'>, SectionWords> = {
  voyage: {
    home: ['The deck', 'Deck'], log: ["Ship's log", 'Log'], mocks: ['Storms', 'Storms'], plan: ['Course', 'Course'],
    insights: ['Spyglass', 'Glass'], rewards: ['Treasure', 'Treasure'], settings: ['Quarters', 'Quarters'], voyage: ['Sea chart', 'Sea'],
  },
  academy: {
    home: ['The Atrium', 'Atrium'], grounds: ['The Grounds', 'Grounds'], log: ['Day book', 'Day book'], mocks: ['Trials', 'Trials'], plan: ['Timetable', 'Timetable'],
    insights: ['The Observatory', 'Observatory'], rewards: ['Cup room', 'Cups'], settings: ['Your room', 'Room'],
  },
};
const TAB_WORDS: Record<Exclude<World, 'default'>, Partial<Record<TabType, string>>> = {
  voyage: {
    MOCK: 'Log a storm', MOCK_DASHBOARD: 'Weather report', MANIFESTATION: 'Set your sights', TARGETS: 'Provisions', TARGET_ANALYSIS: 'Course check',
    CHARTS: 'Tides', WEEKLY: 'Star map', SUBJECTS: 'Islands',
  },
  academy: {
    MOCK: 'Log a trial', MOCK_DASHBOARD: 'Trial results', MANIFESTATION: 'Marks to earn', TARGETS: 'Lesson plan', TARGET_ANALYSIS: 'Term check',
    CHARTS: 'Term charts', WEEKLY: 'Lamplight', SUBJECTS: 'Buildings',
  },
};
/** Same order and same count as the app's rank ladder (RANK_TITLES in lib/stats.ts). */
export const VOYAGE_RANKS = ['Deckhand', 'Ledger Mate', 'Bosun', 'Navigator', 'First Mate', 'Captain', 'Commodore', 'Admiral of the Ledger'];
export const ACADEMY_RANKS = ['Wick', 'Spark', 'Ember', 'Flame', 'Torch', 'Beacon', 'Lantern-Warden', 'Keeper of Lanternfell'];
const PLAIN_RANKS = ['Fresh Aspirant', 'Ledger Keeper', 'Journal Master', 'Trial Balancer', 'Audit Ace', 'Tax Titan', 'Chartered Champion', 'FCA Legend'];
const RANKS: Record<Exclude<World, 'default'>, string[]> = { voyage: VOYAGE_RANKS, academy: ACADEMY_RANKS };

/** The name each world gives the app (sidebar, top bar, window title). */
export const BRAND: Record<World, string> = { default: 'Study Radar', voyage: 'The Double Entry', academy: 'Lanternfell' };

export interface Words {
  world: World;
  voyage: boolean;
  academy: boolean;
  section(s: { id: string; label: string; short: string }): { label: string; short: string };
  tab(id: TabType, label: string): string;
  rank(title: string): string;
}

export function wordsFor(world: World, plain = false): Words {
  const themed = world !== 'default' ? world : null;
  const on = themed && !plain ? themed : null;
  return {
    world,
    voyage: world === 'voyage',
    academy: world === 'academy',
    section: (s) => { const w = on ? SECTION_WORDS[on][s.id] : undefined; return w ? { label: w[0], short: w[1] } : { label: s.label, short: s.short }; },
    tab: (id, label) => (on && TAB_WORDS[on][id]) || label,
    rank: (title) => { const i = PLAIN_RANKS.indexOf(title); return on && i >= 0 ? RANKS[on][i] : title; },
  };
}
