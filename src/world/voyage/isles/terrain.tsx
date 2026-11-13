import { C, INK, Bush, Crag, Pine, Rock, Ramp, f1, hash, lighten } from './kit';

import { ISLE_KINDS, isleKindFor, lanternSpots, type IsleKind } from './kinds';
export { ISLE_KINDS, isleKindFor, lanternSpots, type IsleKind };

/** A wobbly closed outline around the origin, the same for the same seed, so each island keeps its own shape. */
export function blobPath(seed: number, rx: number, ry: number, n = 10, jit = 0.12): string {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + jit * Math.sin(seed * 3.1 + i * 2.17) + jit * 0.6 * Math.cos(seed * 1.7 + i * 1.3);
    return [Math.cos(a) * rx * r, Math.sin(a) * ry * r] as const;
  });
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${f1(m0[0])},${f1(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i]; const m = mid(p, pts[(i + 1) % n]);
    d += ` Q${f1(p[0])},${f1(p[1])} ${f1(m[0])},${f1(m[1])}`;
  }
  return `${d}Z`;
}

const HEATH = ['#a9a3d2', '#8780b6', '#645e98', '#443f70'] as const;
interface Spec { rx: number; ry: number; jit: number; ground: 'meadow' | 'plaza' | 'rocky' | 'slag' | 'sand' | 'field' | 'heath'; top: readonly string[]; rim: readonly string[] }
const SPEC: Record<IsleKind, Spec> = {
  counting: { rx: 90, ry: 33, jit: 0.1, ground: 'meadow', top: C.sand, rim: C.rock },
  statute: { rx: 94, ry: 34, jit: 0.07, ground: 'plaza', top: C.sand, rim: C.rock },
  orrery: { rx: 88, ry: 34, jit: 0.14, ground: 'rocky', top: C.rock, rim: C.rock },
  market: { rx: 98, ry: 31, jit: 0.09, ground: 'sand', top: C.sand, rim: C.timber },
  tithe: { rx: 92, ry: 33, jit: 0.1, ground: 'field', top: C.sand, rim: C.rock },
  toll: { rx: 96, ry: 31, jit: 0.08, ground: 'plaza', top: C.sand, rim: C.rock },
  foundry: { rx: 92, ry: 32, jit: 0.13, ground: 'slag', top: C.rock, rim: C.rock },
  watch: { rx: 82, ry: 34, jit: 0.16, ground: 'heath', top: C.sand, rim: C.rock },
  vault: { rx: 90, ry: 33, jit: 0.08, ground: 'plaza', top: C.sand, rim: C.rock },
  chart: { rx: 90, ry: 33, jit: 0.1, ground: 'meadow', top: C.sand, rim: C.rock },
};

/**
 * The land under an island: foam, a rock face, the beach and the ground on top (meadow, paving, bare rock, slag or a field), with rocks,
 * bushes and tufts scattered by the seed. The same shapes are used for every paper, but each kind has its own ground and each seed its own coast.
 */
export function Terrain({ id, seed, kind }: { id: string; seed: number; kind: IsleKind }) {
  const s = SPEC[kind];
  const top = blobPath(seed, s.rx, s.ry, 11, s.jit);
  const inner = blobPath(seed + 5, s.rx * 0.8, s.ry * 0.64, 9, s.jit * 1.2);
  const foam = blobPath(seed, s.rx + 11, s.ry + 9, 11, s.jit);
  const rimPath = blobPath(seed, s.rx, s.ry, 11, s.jit);
  const rocks = Array.from({ length: 5 }, (_, i) => ({ x: f1(-s.rx * 0.92 + hash(seed, i, 1) * s.rx * 1.84), y: f1(26 + hash(seed, i, 2) * 14), s: 0.5 + hash(seed, i, 3) * 0.6 }));
  const tufts = Array.from({ length: 14 }, (_, i) => ({ x: f1(-s.rx * 0.7 + hash(seed, i, 4) * s.rx * 1.4), y: f1(-8 + hash(seed, i, 5) * 36) }));
  const ground = s.ground;
  const g = ground === 'slag' ? C.rock : ground === 'rocky' ? C.rock : ground === 'field' ? ['#b9c36a', '#98a650', '#6f8240', '#4a5c2f'] as const : ground === 'heath' ? HEATH : C.grass;
  return (
    <g>
      <defs>
        <Ramp id={`${id}-sand`} ramp={s.top} /><Ramp id={`${id}-face`} ramp={s.rim} /><Ramp id={`${id}-grn`} ramp={g} />
        <clipPath id={`${id}-clip`}><path d={rimPath} transform="translate(0,22)" /></clipPath>
      </defs>
      {/* the foam where the water meets the land */}
      <path d={foam} transform="translate(0,14)" fill="#d6f2ec" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={blobPath(seed, s.rx + 5.5, s.ry + 4.5, 11, s.jit)} transform="translate(0,14)" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="6 7" strokeLinecap="round" opacity=".9" />
      {/* the rock face under the beach */}
      <path d={rimPath} transform="translate(0,22)" fill={`url(#${id}-face)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#${id}-clip)`} stroke={C.rock[3]} strokeLinecap="round" fill="none" opacity=".5">
        {Array.from({ length: 9 }, (_, i) => { const x = -s.rx + (i + hash(seed, i, 6) * 0.6) * (s.rx * 2 / 9); return <path key={i} d={`M${f1(x)},${f1(26 + hash(seed, i, 7) * 6)} q${f1(hash(seed, i, 8) * 4 - 2)},5 ${f1(hash(seed, i, 9) * 4 - 2)},10`} strokeWidth="1.2" />; })}
        <path d={`M${-s.rx},44 q${s.rx * 0.5},6 ${s.rx},4 t${s.rx},-2`} strokeWidth="1" /><path d={`M${-s.rx},36 q${s.rx * 0.6},4 ${s.rx},3 t${s.rx},-2`} strokeWidth="1" />
      </g>
      {/* the beach */}
      <path d={top} transform="translate(0,12)" fill={`url(#${id}-sand)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={top} transform="translate(0,12) scale(.97 .94) translate(-1,-1)" fill="none" stroke="#fff" strokeWidth="1.3" opacity=".35" strokeLinejoin="round" />
      {/* the ground on top of it */}
      <path d={inner} transform="translate(0,7)" fill={`url(#${id}-grn)`} stroke={ground === 'meadow' || ground === 'field' ? C.grass[3] : ground === 'heath' ? HEATH[3] : INK} strokeWidth={ground === 'meadow' || ground === 'field' || ground === 'heath' ? 1.3 : 1.6} strokeLinejoin="round" />
      {ground === 'field' ? <g stroke="#7d8d3a" strokeWidth="1.2" strokeLinecap="round" opacity=".7" transform="translate(0,7)">{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${-62 + i * 4},${14 - i * 1.2} q30,-9 ${70 - i * 1.5},-3`} fill="none" />)}</g> : null}
      {ground === 'plaza' ? <g transform="translate(0,7)" opacity=".5" stroke={C.stone[3]} strokeWidth="1" fill="none"><path d="M-62,2 q62,-12 124,0 M-58,10 q58,-10 116,0 M-50,17 q50,-8 100,0" /><path d="M-20,-8 V16 M0,-9 V17 M22,-8 V16 M-40,-4 V13 M42,-4 V13" strokeWidth=".8" /></g> : null}
      {ground === 'slag' ? <g transform="translate(0,7)" fill={C.rock[3]} opacity=".6">{tufts.slice(0, 9).map((p, i) => <ellipse key={i} cx={p.x * 0.8} cy={p.y * 0.5} rx={2 + hash(seed, i, 11) * 3} ry={1.2 + hash(seed, i, 12) * 1.4} />)}</g> : null}
      {/* tufts and pebbles */}
      <g transform="translate(0,7)" stroke={lighten(g[0], 0.2)} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={ground === 'meadow' || ground === 'field' || ground === 'heath' ? 0.85 : 0.4}>
        {tufts.map((p, i) => <path key={i} d={`M${p.x * 0.8},${p.y * 0.55} l-2,-4 M${p.x * 0.8},${p.y * 0.55} l0.6,-5 M${p.x * 0.8},${p.y * 0.55} l2.4,-3.6`} />)}
      </g>
      <g>{rocks.map((r, i) => <Rock key={i} x={r.x * 0.86} y={r.y * 0.7 + 4} s={r.s * 0.75} />)}</g>
      {ground === 'rocky' && kind === 'orrery' ? <g><Crag x={-80} y={14} s={1.05} /><Crag x={84} y={16} s={0.85} flip={-1} /><Crag x={-52} y={-8} s={0.6} flip={-1} /></g> : null}
      {ground === 'heath' ? <g>
        <Pine x={-76} y={12} s={1.05} /><Pine x={-66} y={20} s={0.8} /><Pine x={78} y={10} s={1} /><Bush x={70} y={22} s={0.9} ramp={HEATH} flower="#f7d6ff" /><Bush x={-54} y={24} s={0.8} ramp={HEATH} flower="#fff2a8" />
      </g> : null}
      {ground === 'meadow' ? <g>
        <Bush x={-72} y={16} s={0.9} flower="#ffd0e0" /><Bush x={70} y={20} s={1} flower="#fff2a8" />
        {hash(seed, 1, 1) > 0.4 ? <Pine x={-80} y={8} s={0.9} /> : <Bush x={-80} y={10} s={1.1} />}
        {hash(seed, 2, 2) > 0.4 ? <Pine x={78} y={6} s={1} /> : <Bush x={80} y={8} s={1} />}
      </g> : null}
    </g>
  );
}
