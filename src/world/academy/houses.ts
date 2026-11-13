// The four houses of Lanternfell Academy. Pure data: names, virtues, colours and words. The rules that choose a house live in choosing.ts.

export type HouseId = 'wolf' | 'heron' | 'fox' | 'bear';
export type Virtue = 'grit' | 'care' | 'wit' | 'steadiness';

export interface HouseInfo {
  id: HouseId;
  /** The house's name, e.g. Ashwold. */
  name: string;
  /** The animal on its crest. */
  animal: string;
  virtue: Virtue;
  /** The virtue as a word on screen. */
  virtueLabel: string;
  /** What the virtue is measured from, in plain words. */
  measuredFrom: string;
  /** One line about the house. */
  blurb: string;
  motto: string;
  /** Crest and UI colours: the field, a deeper shade, a light tone and the metal. */
  colors: { main: string; deep: string; light: string; metal: string };
}

export const HOUSE_ORDER: HouseId[] = ['wolf', 'heron', 'fox', 'bear'];

export const HOUSES: Record<HouseId, HouseInfo> = {
  wolf: {
    id: 'wolf', name: 'Ashwold', animal: 'wolf', virtue: 'grit', virtueLabel: 'Grit',
    measuredFrom: 'your longest streak and the hours you put in on hard days',
    blurb: 'Ashwold goes on. Cold mornings, long chapters, the same lantern lit again.',
    motto: 'We go on.',
    colors: { main: '#2f4a78', deep: '#18253f', light: '#cfd6ea', metal: '#c9d2e8' },
  },
  heron: {
    id: 'heron', name: 'Mirewing', animal: 'heron', virtue: 'care', virtueLabel: 'Care',
    measuredFrom: 'your mock marks and how much you revise',
    blurb: 'Mirewing stands still and looks closely. Every figure checked, every line read twice.',
    motto: 'Look twice.',
    colors: { main: '#1f6a66', deep: '#0e2f33', light: '#dfe8f2', metal: '#e6d6a0' },
  },
  fox: {
    id: 'fox', name: 'Emberquill', animal: 'fox', virtue: 'wit', virtueLabel: 'Wit',
    measuredFrom: 'how many papers you touch and how fast chapters get closed',
    blurb: 'Emberquill finds the shortcut that is also correct. Quick hands, quicker questions.',
    motto: 'Find the way.',
    colors: { main: '#b5472a', deep: '#4a1d1c', light: '#f6e4c4', metal: '#e8b84a' },
  },
  bear: {
    id: 'bear', name: 'Hollowhearth', animal: 'bear', virtue: 'steadiness', virtueLabel: 'Steadiness',
    measuredFrom: 'how many of the last 28 days you studied',
    blurb: 'Hollowhearth keeps the fire in. A little every day, and the winter does not matter.',
    motto: 'Keep the fire.',
    colors: { main: '#7a5230', deep: '#2e2418', light: '#ecd8ae', metal: '#e8b84a' },
  },
};

export const isHouseId = (v: unknown): v is HouseId => v === 'wolf' || v === 'heron' || v === 'fox' || v === 'bear';
