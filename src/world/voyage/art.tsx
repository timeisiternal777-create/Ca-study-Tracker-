import { useMemo, type ReactNode } from 'react';
import type { Accent } from '../../types';
import { IsleScene } from './isles/Isle';
import { isleKindFor, lanternSpots } from './isles/terrain';
import { ShipDetail } from './ships';
import type { Island, ShipClass, Weather } from './progress';

export { blobPath, lanternSpots } from './isles/terrain';

// The pieces of the Sea chart, drawn as plain SVG. Nothing here uses a filter or a blur.
// Sea.tsx puts each moving piece (a wave row, the fog, the glow, the ship, a cloud) in its own small layer, so the picture
// inside is painted once and the GPU only slides or fades the layer (see voyage.css).

const INK = '#171c27';
const f1 = (n: number) => Math.round(n * 10) / 10;

export interface Box { x: number; y: number; w: number; h: number }
/** The box (in island coordinates) that an island's layers cover. The name tag hangs below it and is allowed to overflow. */
export const ISL_BOX: Box = { x: -126, y: -74, w: 252, h: 142 };
/** The box around a ship, symmetric about its middle so flipping it to face the other way turns it on the spot. */
export const SHIP_BOX: Box = { x: -140, y: -122, w: 280, h: 152 };
/** The box around a cloud, or the sparkle of a clear sky. */
export const WX_BOX: Box = { x: -76, y: -36, w: 156, h: 96 };
/** The box around a few streaks of wind. */
export const WIND_BOX: Box = { x: -12, y: -18, w: 132, h: 92 };

/**
 * Everything about an island that holds still: the land, the building that belongs to the paper (see isles/), and a lantern per chapter ticked.
 * Fog and glow are separate layers on top (see Sea.tsx), so this is painted once.
 */
export function IslandBase({ it, seed }: { it: Island; seed: number }) {
  const cleared = it.state === 'cleared';
  return (
    <g className={`isl acc-${it.accent}${cleared ? ' is-cleared' : ''}${it.state === 'neglected' ? ' is-neglected' : ''}`}>
      <ellipse className="isl-shoal" cx="0" cy="12" rx="118" ry="50" />
      <ellipse className="isl-select" cx="0" cy="8" rx="112" ry="46" />
      <g style={{ opacity: 1 - 0.4 * it.fog }}>
        <IsleScene kind={isleKindFor(it.key, it.paperNumber)} seed={seed} litCount={it.lanterns.lit} total={it.lanterns.total} cleared={cleared} />
      </g>
    </g>
  );
}

/** The warm halos of the lit lanterns. A layer of its own that only fades. */
export function IslandGlow({ it, fill }: { it: Island; fill: string }) {
  const spots = lanternSpots(it.lanterns.total).slice(0, it.lanterns.lit);
  return <g className="isl-glow">{spots.map((p, i) => <circle key={i} cx={p.x} cy={p.y - 10} r="13" fill={fill} />)}</g>;
}

/** A ring that swells around the island while the timer runs here. */
export function IslandRing() {
  return <ellipse className="isl-working" cx="0" cy="12" rx="104" ry="43" />;
}

/** Fog is a few soft shapes that drift sideways. Its strength is the layer's opacity. */
export function IslandFog({ fill }: { fill: string }) {
  return (
    <g className="isl-fog-in" fill={fill}>
      <ellipse cx="-44" cy="-8" rx="66" ry="28" /><ellipse cx="38" cy="-20" rx="60" ry="26" /><ellipse cx="0" cy="14" rx="104" ry="34" />
      <ellipse cx="-74" cy="22" rx="48" ry="20" /><ellipse cx="72" cy="16" rx="50" ry="21" />
    </g>
  );
}

/** The name tag under an island. */
export function IslandTag({ it }: { it: Island }) {
  const pct = Math.round(it.progress * 100);
  // wide enough for the abbreviation and the longest percentage, with a gap between them
  const w = 28 + it.abbrev.length * 10.4 + 12 + `${pct}%`.length * 8.6 + 12;
  return (
    <g className={`isl-tag acc-${it.accent}`} transform="translate(0,70)">
      <rect className="isl-tag-bg" x={-w / 2} y="-14" width={w} height="28" rx="14" />
      <circle className="isl-tag-dot" cx={-w / 2 + 15} cy="0" r="4.6" />
      <text className="isl-tag-abbr" x={-w / 2 + 26} y="5" >{it.abbrev}</text>
      <text className="isl-tag-pct" x={w / 2 - 12} y="5" textAnchor="end">{pct}%</text>
    </g>
  );
}

// ───────────────────────────── the ship ─────────────────────────────

/** Where the patches go on each sail (inside the sail, so they never hang over an edge). */
const SAILS: Record<ShipClass, { d: string; patch: [number, number][] }[]> = {
  sloop: [
    { d: 'M-2,-12 L-2,-84 L-40,-14Z', patch: [[-16, -38], [-22, -24]] },
    { d: 'M4,-12 L4,-72 L34,-14Z', patch: [[14, -32]] },
  ],
  brigantine: [
    { d: 'M-14,-12 L-14,-80 L-46,-14Z', patch: [[-28, -36], [-34, -22], [-24, -50]] },
    { d: 'M-8,-12 L-8,-82 L22,-82 L22,-12Z', patch: [[2, -64], [8, -50], [2, -32]] },
    { d: 'M30,-12 L30,-64 L54,-64 L54,-12Z', patch: [[38, -50], [44, -30]] },
  ],
  galleon: [
    { d: 'M-34,-14 L-34,-78 L-12,-78 L-12,-14Z', patch: [[-26, -62], [-22, -42]] },
    { d: 'M-4,-14 L-4,-92 L26,-92 L26,-14Z', patch: [[6, -76], [14, -58], [8, -36]] },
    { d: 'M34,-14 L34,-70 L56,-70 L56,-14Z', patch: [[42, -54], [48, -34]] },
  ],
};
const MASTS: Record<ShipClass, { x: number; top: number }[]> = {
  sloop: [{ x: -2, top: -88 }], brigantine: [{ x: -14, top: -84 }, { x: -8, top: -86 }, { x: 42, top: -70 }], galleon: [{ x: -23, top: -84 }, { x: 11, top: -98 }, { x: 45, top: -76 }],
};

/**
 * `patches`: the accent of each paper that is at least half explored. Each one is sewn onto a sail (see ships.tsx for the detailed ship).
 * The ghost ship, your best week, stays a plain outline so it reads as a memory rather than a second ship.
 */
export function ShipArt({ cls, patches, ghost, name }: { cls: ShipClass; patches: { accent: Accent; done: boolean }[]; ghost?: boolean; name?: string }) {
  if (!ghost) {
    return (
      <g className="ship">
        <g className="ship-wake"><path d="M-66,14 q-30,6 -64,2 M-60,19 q-24,8 -52,6" /></g>
        <g className="ship-bob"><ShipDetail cls={cls} patches={patches} name={name} /></g>
      </g>
    );
  }
  const hull = cls === 'galleon'
    ? 'M-64,-10 L-58,14 C-40,24 30,24 58,12 C68,6 74,-4 78,-14 L-64,-10Z'
    : cls === 'brigantine' ? 'M-56,-9 L-50,13 C-32,21 24,21 48,10 C56,4 62,-4 66,-13 L-56,-9Z' : 'M-44,-8 L-40,11 C-24,18 16,18 38,8 C44,3 48,-4 52,-12 L-44,-8Z';
  return (
    <g className="ship ship--ghost">
      <g className="ship-bob">
        {MASTS[cls].map((m, i) => <path key={i} className="ship-mast" d={`M${m.x},-8 V${m.top}`} />)}
        <path className="ship-mast" d={`M${cls === 'galleon' ? 76 : cls === 'brigantine' ? 64 : 50},-12 L${cls === 'galleon' ? 98 : cls === 'brigantine' ? 84 : 68},-26`} />
        {SAILS[cls].map((s, i) => <path key={i} className="ship-sail" d={s.d} />)}
        <path className="ship-hull" d={hull} />
      </g>
    </g>
  );
}

// ───────────────────────────── weather ─────────────────────────────

export function StormArt({ weather }: { weather: Weather }) {
  const dark = weather === 'storm';
  return (
    <g className={`storm storm--${weather}`}>
      <g className="storm-cloud">
        <ellipse cx="-30" cy="0" rx="38" ry="17" /><ellipse cx="6" cy="-10" rx="40" ry="21" /><ellipse cx="44" cy="2" rx="34" ry="15" />
      </g>
      <g className="storm-rain">{[-34, -14, 6, 26, 46].map((x, i) => <path key={i} d={`M${x},14 l-5,16`} style={{ ['--i' as string]: i }} />)}</g>
      {dark ? <path className="storm-bolt" d="M4,12 L-6,34 L2,34 L-4,54 L14,28 L5,28 L12,12Z" /> : null}
    </g>
  );
}

export function CalmArt() {
  return (
    <g className="calm" aria-hidden>
      <path className="calm-spark" d="M0,-10 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3z" />
      <path className="calm-spark s2" transform="translate(26,8) scale(.6)" d="M0,-10 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3z" />
      <path className="calm-spark s3" transform="translate(-24,10) scale(.5)" d="M0,-10 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3z" />
    </g>
  );
}

/** Streaks of wind. A tailwind blows the way the ship sails, a headwind against it. */
export function WindArt({ kind }: { kind: 'tail' | 'cross' | 'head' }) {
  const lines: ReactNode[] = [
    <path key="a" d="M0,0 q30,-10 60,0 t50,-4" />, <path key="b" d="M14,24 q26,-9 52,0 t44,-3" />, <path key="c" d="M-6,46 q28,-8 56,0 t40,-3" />,
  ];
  return <g className={`wind wind--${kind}`}>{lines}</g>;
}

// ───────────────────────────── the sea itself ─────────────────────────────

const STAR_SPOTS = Array.from({ length: 46 }, (_, i) => {
  const a = Math.sin(i * 12.9898 + 4.1) * 43758.5453; const b = Math.sin(i * 78.233 + 1.7) * 24634.6345;
  return { x: Math.round(((a - Math.floor(a)) * 1180 + 10) * 10) / 10, y: Math.round(((b - Math.floor(b)) * 92 + 8) * 10) / 10, r: 0.7 + ((i * 37) % 10) / 12 };
});

/** Stars that hold still. */
export function Stars() {
  return <g className="sea-stars">{STAR_SPOTS.map((s, i) => (i % 3 ? <circle key={i} cx={s.x} cy={s.y} r={s.r} /> : null))}</g>;
}
/** The stars that breathe, in two groups that take turns, each its own layer (the sky is 1200 by 132 in chart units). */
export function TwinkleStars({ phase }: { phase: 0 | 1 }) {
  return <g className="sea-twinkle-in">{STAR_SPOTS.map((s, i) => (i % 3 === 0 && (i / 3) % 2 === phase ? <circle key={i} cx={s.x} cy={s.y} r={s.r + 0.4} /> : null))}</g>;
}

const rnd = (s: number, i: number, k: number) => { const v = Math.sin(s * 127.1 + i * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };

/**
 * One row of wave crests. The picture is two identical copies side by side, and the layer slides left by exactly one copy and starts
 * again, so the water never seems to stop or jump. It is an HTML layer with a picture that never changes: the GPU does the sliding.
 * `y` and `h` are in the units of a stage `stageH` high and 1200 wide.
 */
export function WaveRow({ y, h, stageH, seed, count, minW, maxW, className }: { y: number; h: number; stageH: number; seed: number; count: number; minW: number; maxW: number; className: string }) {
  const d = useMemo(() => {
    let out = '';
    for (let i = 0; i < count; i++) {
      const x = Math.round(((i + rnd(seed, i, 1) * 0.7) / count) * 1200);
      const yy = Math.round(5 + rnd(seed, i, 2) * (h - 10));
      const w = Math.round(minW + rnd(seed, i, 3) * (maxW - minW));
      out += `M${x},${yy} q${Math.round(w / 4)},${-Math.round(h * 0.22)} ${Math.round(w / 2)},0 t${Math.round(w / 2)},0 `;
    }
    return out.trim();
  }, [seed, count, minW, maxW, h]);
  return (
    <div className={`wave-row ${className}`} style={{ top: `${(y / stageH) * 100}%`, height: `${(h / stageH) * 100}%` }} aria-hidden>
      <div className="wave-track">
        <svg viewBox={`0 0 2400 ${h}`} preserveAspectRatio="none"><path d={d} /><path d={d} transform="translate(1200,0)" /></svg>
      </div>
    </div>
  );
}
