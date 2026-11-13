import { memo, useId, type ReactNode } from 'react';
import { C, INK, Star, f1 } from './kit';
import * as A from './structuresA';
import * as B from './structuresB';
import type { StructureProps } from './structuresA';
import { Terrain, lanternSpots, type IsleKind } from './terrain';

// One island = the land (terrain.tsx) + the building that belongs to the paper (structures*.tsx) + one lantern per chapter ticked.
// It is drawn once as plain SVG and never animates, so the Sea chart can hold a dozen of them without a repaint (see voyage.css for the glow and fog layers on top).

const BUILD: Record<IsleKind, (p: StructureProps) => ReactNode> = {
  counting: A.Counting, statute: A.Statute, orrery: A.Orrery, market: A.Market, tithe: A.Tithe,
  toll: B.Toll, foundry: B.Foundry, watch: B.Watch, vault: B.Vault, chart: B.ChartTower,
};

/** A post lantern on the shore. The glass keeps the `isl-lantern` class, which voyage.css fills warm when the chapter is done. */
function ShoreLantern({ lit }: { lit: boolean }) {
  return (
    <g transform="scale(.92)">
      <ellipse cx="0" cy="1" rx="4.6" ry="1.4" fill="#0b1018" opacity=".32" />
      <path d="M0,0 V-7" stroke={INK} strokeWidth="3.2" strokeLinecap="round" /><path d="M0,0 V-7" stroke={C.iron[0]} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M-2.6,0.4 H2.6" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <rect className={lit ? 'isl-lantern is-lit' : 'isl-lantern'} x="-3" y="-13.5" width="6" height="7.4" rx="2" />
      {lit ? <path d="M-1.5,-9 a1.5,1.9 0 1 1 3,0 a1.5,1.9 0 1 1 -3,0Z" fill={C.litHot} opacity=".95" /> : null}
      <path d="M0,-13 V-6.4" stroke={INK} strokeWidth=".8" opacity=".55" />
      <path d="M-1.8,-12 V-8.4" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity={lit ? 0.7 : 0.22} />
      <path d="M-4,-13.2 L0,-17.6 L4,-13.2Z" fill={C.copper[1]} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <rect x="-3.7" y="-6.7" width="7.4" height="1.7" rx=".6" fill={C.copper[1]} stroke={INK} strokeWidth="1" />
      <circle cx="0" cy="-18.4" r="1" fill={C.gold[1]} stroke={INK} strokeWidth=".7" />
    </g>
  );
}

export interface IsleSceneProps { kind: IsleKind; seed: number; litCount: number; total: number; cleared: boolean }

/** The whole island picture: land, building and lanterns. Memoised on plain values, so it is only redrawn when a lantern is lit or the paper is cleared. */
export const IsleScene = memo(function IsleScene({ kind, seed, litCount, total, cleared }: IsleSceneProps) {
  const id = `i${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const lit = cleared || litCount > 0;
  const Build = BUILD[kind];
  const spots = lanternSpots(total);
  return (
    <g>
      <Terrain id={`${id}t`} seed={seed} kind={kind} />
      <Build id={`${id}b`} seed={seed} lit={lit} cleared={cleared} />
      {cleared ? <g>{[[-74, -34, 4.4], [-60, -48, 2.6], [70, -30, 3.2]].map(([x, y, r], i) => <Star key={i} x={x} y={y} r={r} c={C.gold[1]} />)}</g> : null}
      <g className="isl-lanterns">
        {spots.map((p, i) => <g key={i} transform={`translate(${f1(p.x)},${f1(p.y)})`}><ShoreLantern lit={i < litCount} /></g>)}
      </g>
    </g>
  );
});
