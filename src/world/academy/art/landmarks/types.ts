import type { ReactElement } from 'react';

export interface Box { x: number; y: number; w: number; h: number }

/** One building of Lanternfell. Each is drawn by hand for its own paper; the map only decides which windows are lit and what grows over it. */
export interface LandmarkDef {
  id: LandmarkId;
  name: string;
  /** What the place is, in a line (shown on the map card). */
  blurb: string;
  box: Box;
  /** How many windows can be lit: one per chapter-lantern. */
  slots: number;
  /** Where the student stands in front of it (feet). */
  door: { x: number; y: number };
  /** Where a pennant flies once the paper is cleared. */
  flag: { x: number; y: number };
  /** The drawing. `lit[i]` says whether window slot i is lit; `id` keeps gradient ids unique when a building is on screen twice. */
  Art: (p: { id: string; lit: boolean[] }) => ReactElement;
}

export type LandmarkId = 'counting' | 'statute' | 'orrery' | 'market' | 'tithe' | 'toll' | 'foundry' | 'watch' | 'vault' | 'maptower';
