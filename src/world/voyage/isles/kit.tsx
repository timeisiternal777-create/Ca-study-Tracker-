import type { ReactNode } from 'react';
import { mix } from '../../academy/art/kit';

// Drawing helpers for the Ledger Seas islands. Every island is plain SVG: shapes, gradients and a few real <pattern> fills (brick, planks,
// shingles, stone), so it can be opened and edited in any vector tool. Nothing here animates and nothing uses a filter or a blur: the picture
// is painted once. Colours are the moonlit-sea palette: cool stone, warm timber and brick, brass and copper, and one accent per paper.

export { mix, rng } from '../../academy/art/kit';
export const INK = '#171c27';
export const f1 = (n: number) => Math.round(n * 10) / 10;
export const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
export const darken = (c: string, t: number) => mix(c, '#0b1018', t);

/** Each ramp runs light, mid, shade, deep. Faces that look at the moon (upper left) take the light end. */
export const C = {
  stone: ['#d3dadb', '#a3b0b5', '#6f7e8b', '#435062'],
  plaster: ['#fbf3dd', '#e8dcb9', '#bcae88', '#8a7e62'],
  timber: ['#d29a62', '#a3714a', '#67432c', '#3c271a'],
  brick: ['#dc7656', '#b25440', '#7c3a33', '#4f2526'],
  copper: ['#f0a766', '#c47640', '#85472b', '#51291d'],
  verdigris: ['#a4ecd8', '#58b8a4', '#2f7a72', '#18453f'],
  gold: ['#fff3c2', '#ffd77a', '#e2a63a', '#8f5f1c'],
  iron: ['#8b97a4', '#566271', '#303a47', '#1b222c'],
  sand: ['#f7ebc0', '#e8d6a1', '#c6ad70', '#93794a'],
  grass: ['#6cb784', '#43956a', '#2d7358', '#1d4f40'],
  rock: ['#8d97a1', '#667282', '#47515f', '#2c3441'],
  glass: '#17303f', glassDeep: '#0c1b26', lit: '#ffe9a8', litHot: '#fff8d8', ember: '#ff9a45',
} as const;

/** A little deterministic noise in 0..1, so the same island always gets the same scatter. */
export const hash = (a: number, b: number, c = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return v - Math.floor(v); };

/** A vertical or diagonal gradient from a four-step ramp. */
export function Ramp({ id, ramp, x2 = 0, y2 = 1, stops = [0, 0.4, 0.8, 1] }: { id: string; ramp: readonly string[]; x2?: number; y2?: number; stops?: number[] }) {
  return <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>{ramp.map((c, i) => <stop key={i} offset={stops[i] ?? i / (ramp.length - 1)} stopColor={c} />)}</linearGradient>;
}

/** Brick: courses of slightly different bricks, laid in a running bond, as a pattern tile. */
export function BrickPat({ id, seed, ramp = C.brick, w = 24, h = 20, rows = 4 }: { id: string; seed: number; ramp?: readonly string[]; w?: number; h?: number; rows?: number }) {
  const rh = h / rows; const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? w / 4 : 0;
    for (let k = -1; k < 2; k++) {
      const x = off + k * (w / 2); const t = hash(seed, r, k);
      out.push(<rect key={`${r}${k}`} x={f1(x + 0.5)} y={f1(r * rh + 0.5)} width={f1(w / 2 - 1)} height={f1(rh - 1)} fill={mix(ramp[1], t > 0.5 ? ramp[0] : ramp[2], Math.abs(t - 0.5) * 0.9)} />);
    }
  }
  return <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse"><rect width={w} height={h} fill={ramp[3]} />{out}</pattern>;
}

/** Cut stone: blocks of different widths in staggered courses. */
export function StonePat({ id, seed, ramp = C.stone, w = 30, h = 22, rows = 4 }: { id: string; seed: number; ramp?: readonly string[]; w?: number; h?: number; rows?: number }) {
  const rh = h / rows; const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    let x = -hash(seed, r, 9) * 9;
    let k = 0;
    while (x < w) {
      const bw = 8 + hash(seed, r, k + 3) * 11; const t = hash(seed, r, k);
      out.push(<rect key={`${r}-${k}`} x={f1(x + 0.5)} y={f1(r * rh + 0.5)} width={f1(bw - 1)} height={f1(rh - 1)} rx="1" fill={mix(ramp[1], t > 0.5 ? ramp[0] : ramp[2], Math.abs(t - 0.5) * 0.8)} />);
      x += bw; k++;
    }
  }
  return <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse"><rect width={w} height={h} fill={ramp[3]} />{out}</pattern>;
}

/** Planks: vertical boards with grain lines, nail heads and a dark seam. */
export function PlankPat({ id, seed, ramp = C.timber, w = 24, h = 24 }: { id: string; seed: number; ramp?: readonly string[]; w?: number; h?: number }) {
  const n = 4; const bw = w / n; const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = hash(seed, i, 2);
    out.push(<g key={i}><rect x={f1(i * bw + 0.4)} y="0" width={f1(bw - 0.8)} height={h} fill={mix(ramp[1], t > 0.5 ? ramp[0] : ramp[2], Math.abs(t - 0.5) * 0.7)} /><path d={`M${f1(i * bw + bw * 0.35)},${f1(2 + t * 4)} V${f1(h - 3 - t * 5)}`} stroke={ramp[3]} strokeWidth=".5" opacity=".45" /></g>);
  }
  return <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse"><rect width={w} height={h} fill={ramp[3]} />{out}</pattern>;
}

/** Roof tiles or shingles in scalloped rows. */
export function ShinglePat({ id, seed, ramp, w = 14, h = 10 }: { id: string; seed: number; ramp: readonly string[]; w?: number; h?: number }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < 2; r++) for (let k = -1; k < 2; k++) {
    const x = k * w + (r % 2 ? w / 2 : 0); const t = hash(seed, r, k);
    out.push(<path key={`${r}${k}`} d={`M${f1(x)},${f1(r * (h / 2))} h${w} v${f1(h / 2 - 2)} q${f1(-w / 2)},${f1(4)} ${f1(-w)},0Z`} fill={mix(ramp[1], t > 0.5 ? ramp[0] : ramp[2], Math.abs(t - 0.5) * 0.9)} stroke={ramp[3]} strokeWidth=".7" />);
  }
  return <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse"><rect width={w} height={h} fill={ramp[2]} />{out}</pattern>;
}

/** A window: dark glass with a cross, or glowing when lit (warm, brighter at the bottom, with a soft halo around it). */
export function Win({ x, y, w, h, on, arch = false, bars = true, frame = C.timber[3], halo = true }: { x: number; y: number; w: number; h: number; on: boolean; arch?: boolean; bars?: boolean; frame?: string; halo?: boolean }) {
  const d = arch ? `M${x},${y + h} V${y + w / 2} a${w / 2},${w / 2} 0 0 1 ${w},0 V${y + h}Z` : `M${x},${y} h${w} v${h} h${-w}Z`;
  return (
    <g>
      {on && halo ? <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="4" fill={C.lit} opacity=".2" /> : null}
      <path d={d} fill={on ? C.lit : C.glass} stroke={frame} strokeWidth="1.5" strokeLinejoin="round" />
      {on ? <path d={`M${x + 1},${y + h * 0.55} h${w - 2} v${h * 0.45 - 1} h${-(w - 2)}Z`} fill={C.ember} opacity=".35" /> : <path d={`M${x + 1.2},${y + 1.4} l${w * 0.45},0 l${-w * 0.3},${h * 0.5}Z`} fill="#fff" opacity=".12" />}
      {bars ? <path d={`M${x + w / 2},${y + (arch ? w / 2 : 0)} V${y + h} M${x},${y + h * 0.5} H${x + w}`} stroke={frame} strokeWidth="1" opacity={on ? 0.7 : 0.9} /> : null}
    </g>
  );
}

/** A pennant on a short pole: the paper's colour, or gold once the paper is cleared. */
export function Flag({ x, y, h = 18, cleared, side = 1 }: { x: number; y: number; h?: number; cleared: boolean; side?: 1 | -1 }) {
  const fill = cleared ? C.gold[1] : 'var(--ac, #f2c25c)';
  return (
    <g>
      <path d={`M${x},${y} V${y - h}`} stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M${x},${y - h} h${12 * side} q${-3 * side},3.6 ${-1 * side},7 q${-5 * side},-1.2 ${-11 * side},-1.4Z`} fill={fill} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx={x} cy={y - h - 1} r="1.8" fill={C.gold[1]} stroke={INK} strokeWidth="1" />
    </g>
  );
}

/** A wall lamp or post lamp. */
export function Lamp({ x, y, on, r = 3 }: { x: number; y: number; on: boolean; r?: number }) {
  return (
    <g>
      {on ? <circle cx={x} cy={y} r={r * 3.4} fill={C.lit} opacity=".22" /> : null}
      <path d={`M${x - r},${y - r * 1.2} h${r * 2} l${-r * 0.35},${-r * 0.9} h${-r * 1.3}Z`} fill={C.iron[2]} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <rect x={x - r} y={y - r * 1.2} width={r * 2} height={r * 2.4} rx={r * 0.5} fill={on ? C.lit : C.glass} stroke={INK} strokeWidth="1.2" />
      {on ? <circle cx={x} cy={y} r={r * 0.45} fill={C.litHot} /> : null}
    </g>
  );
}

export function Barrel({ x, y, s = 1, ramp = C.timber }: { x: number; y: number; s?: number; ramp?: readonly string[] }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-5,0 C-7,-4 -7,-8 -5,-12 H5 C7,-8 7,-4 5,0Z" fill={ramp[1]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-6.4,-9 H6.4 M-6.5,-3 H6.5" stroke={C.iron[1]} strokeWidth="1.5" /><path d="M-3.4,-12 C-4.2,-8 -4.2,-4 -3.4,0" stroke={ramp[0]} strokeWidth="1.2" opacity=".7" fill="none" />
    </g>
  );
}

export function Crate({ x, y, w = 11, h = 9, ramp = C.timber }: { x: number; y: number; w?: number; h?: number; ramp?: readonly string[] }) {
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={ramp[1]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M${x},${y - h} L${x + w},${y} M${x + w},${y - h} L${x},${y}`} stroke={ramp[2]} strokeWidth="1" />
      <path d={`M${x + 1},${y - h + 1.4} h${w - 2}`} stroke={ramp[0]} strokeWidth="1.2" opacity=".7" />
    </g>
  );
}

export function Sack({ x, y, s = 1, fill = C.plaster[1] }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-5,0 C-7,-5 -5,-10 -2.4,-12 L-3.2,-14.4 L3.2,-14.4 L2.4,-12 C5,-10 7,-5 5,0Z" fill={fill} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-3,-12 H3" stroke={darken(fill, 0.4)} strokeWidth="1.2" /><path d="M-3.4,-8 C-3,-5 -3,-3 -2.6,-1.4" stroke="#fff" strokeWidth="1" opacity=".5" fill="none" />
    </g>
  );
}

/** A rounded rock, lit from the upper left. */
export function Rock({ x, y, s = 1, ramp = C.rock }: { x: number; y: number; s?: number; ramp?: readonly string[] }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-8,0 C-9,-5 -5,-9 0,-9 C5,-9 9,-5 8,0Z" fill={ramp[1]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-6,-3 C-6,-6 -3,-8 0,-8 C-3,-6 -4,-4 -4,-1Z" fill={ramp[0]} opacity=".8" /><path d="M2,-8 C6,-6 7,-3 7,-0.5 L3,0Z" fill={ramp[2]} opacity=".7" />
    </g>
  );
}

/** A small round tree and a pine, for the meadows. */
export function Bush({ x, y, s = 1, ramp = C.grass, flower }: { x: number; y: number; s?: number; ramp?: readonly string[]; flower?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx="0" cy="0.6" rx="8" ry="2" fill="#0b1018" opacity=".25" />
      <path d="M-8,0 C-10,-5 -6,-10 -1,-9 C2,-12 9,-9 8,-3 C10,-1 8,0 6,0Z" fill={ramp[1]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-6,-3 C-6,-6 -3,-8 -1,-8" stroke={ramp[0]} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {flower ? <g fill={flower}><circle cx="-3" cy="-4" r="1.2" /><circle cx="3" cy="-6" r="1.2" /><circle cx="4.6" cy="-2" r="1" /></g> : null}
    </g>
  );
}

export function Pine({ x, y, s = 1, ramp = C.grass }: { x: number; y: number; s?: number; ramp?: readonly string[] }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx="0" cy="0.8" rx="7" ry="1.8" fill="#0b1018" opacity=".25" />
      <rect x="-1.5" y="-4" width="3" height="5" fill={C.timber[2]} stroke={INK} strokeWidth="1.2" />
      <path d="M0,-27 L6.4,-14 L3.4,-14 L8.6,-5 L-8.6,-5 L-3.4,-14 L-6.4,-14Z" fill={ramp[2]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M0,-25 L-5,-14.6 L-2.4,-14.4 L-7,-6 L-3,-6 L0,-14Z" fill={ramp[1]} opacity=".7" />
    </g>
  );
}

/** A little rowing boat, drawn from the side. */
export function Dinghy({ x, y, s = 1, flip = 1 }: { x: number; y: number; s?: number; flip?: 1 | -1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s * flip},${s})`}>
      <ellipse cx="0" cy="2.4" rx="15" ry="2.6" fill="#041018" opacity=".3" />
      <path d="M-14,-4 H14 C12,2 6,4.6 0,4.6 C-6,4.6 -12,2 -14,-4Z" fill={C.timber[1]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-13,-4 H13" stroke={C.timber[0]} strokeWidth="1.6" /><path d="M-10,0 C-4,2.6 4,2.6 10,0" stroke={C.timber[2]} strokeWidth="1" fill="none" />
      <path d="M-4,-4 L4,-9" stroke={C.timber[2]} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

/** A cut-out of a smoke puff column. Painted once, so it does not move. */
export function Puffs({ x, y, n = 4, s = 1, seed = 1, fill = '#dfe6ea' }: { x: number; y: number; n?: number; s?: number; seed?: number; fill?: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = i / n; const r = (4 + i * 2.4) * s;
        return <circle key={i} cx={f1(x + Math.sin(seed + i * 1.6) * 3 + i * 3.4)} cy={f1(y - i * 9 * s)} r={f1(r)} fill={fill} opacity={f1(0.78 - t * 0.5)} stroke={INK} strokeWidth="1" strokeOpacity={f1(0.55 - t * 0.4)} />;
      })}
    </g>
  );
}

/** A soft shadow on the ground under a building. */
export const shadow = (cx: number, cy: number, rx: number, ry = 4) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#0b1018" opacity=".3" />;

/** A four-point sparkle. */
export const Star = ({ x, y, r = 3.4, c = C.gold[0] }: { x: number; y: number; r?: number; c?: string }) => <path d={`M${x},${y - r} L${x + r * 0.28},${y - r * 0.28} L${x + r},${y} L${x + r * 0.28},${y + r * 0.28} L${x},${y + r} L${x - r * 0.28},${y + r * 0.28} L${x - r},${y} L${x - r * 0.28},${y - r * 0.28}Z`} fill={c} opacity=".95" />;

/** An angular crag with a lit face and a shaded face. */
export function Crag({ x, y, s = 1, flip = 1, ramp = C.rock }: { x: number; y: number; s?: number; flip?: 1 | -1; ramp?: readonly string[] }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s * flip},${s})`}>
      <ellipse cx="0" cy="1" rx="15" ry="2.6" fill="#0b1018" opacity=".28" />
      <path d="M-13,0 L-10,-9 L-5,-16 L-1,-25 L4,-15 L9,-11 L14,0Z" fill={ramp[1]} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-10,-9 L-5,-16 L-1,-25 L-2,-10 L-5,0 L-13,0Z" fill={ramp[0]} opacity=".85" />
      <path d="M-1,-25 L4,-15 L9,-11 L14,0 L3,0 L0,-10Z" fill={ramp[2]} opacity=".8" />
      <path d="M-5,-16 L-2,-10 M4,-15 L0,-10 M-2,-10 L-3,-3" stroke={ramp[3]} strokeWidth="1" opacity=".55" fill="none" strokeLinecap="round" />
    </g>
  );
}
