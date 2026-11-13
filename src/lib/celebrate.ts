// A tiny event bus: any screen can ask for a celebration, and one layer (components/game/Celebrations) shows it.
export type CelebrationKind = 'quest' | 'rank' | 'badge' | 'save' | 'goal' | 'week' | 'freeze';

export interface Celebration {
  kind: CelebrationKind;
  title: string;
  sub?: string;
  /** XP to count up in the card */
  xp?: number;
  /** Blip's mood in the card */
  mood?: 'cheer' | 'proud' | 'happy' | 'wow';
}

const EVENT = 'ca:celebrate';

export function celebrate(c: Celebration): void {
  window.dispatchEvent(new CustomEvent<Celebration>(EVENT, { detail: c }));
}

export function onCelebrate(fn: (c: Celebration) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<Celebration>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
