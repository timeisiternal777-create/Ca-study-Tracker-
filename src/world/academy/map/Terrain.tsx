import { memo } from 'react';
import { CommonDefs, rng } from '../art/kit';
import { CastleArt, Pines, Ridge } from '../art/scene';
import { GROUNDS, LANE, type Spot } from '../grounds';

/**
 * The still picture under the Grounds map: night sky and moon, two ridges with the castle far off, three tiers of lawn, the cobbled lanes
 * between the buildings, lamp posts, the school gate and the lamp lane along the bottom. It is one SVG that never changes while the
 * buildings come and go, so the browser paints it once. Nothing in here moves.
 */
const { w: W, h: H, rowA, rowB, horizon: HZ } = GROUNDS;
const f1 = (n: number) => Math.round(n * 10) / 10;
const LAMP = '#ffd98a';

/** The lanes, as one set of paths: a trunk lane up from the gate, a lane along each row of buildings, and the road to the castle. */
export const LANES = {
  trunk: `M44,${rowB + 26} C16,${rowB - 50} 74,${rowA + 100} 44,${rowA + 17}`,
  a: `M44,${rowA + 17} C220,${rowA + 11} 380,${rowA + 24} 560,${rowA + 17} S940,${rowA + 11} 1090,${rowA + 17}`,
  b: `M44,${rowB + 26} C240,${rowB + 18} 420,${rowB + 30} 620,${rowB + 24} S980,${rowB + 18} 1150,${rowB + 24}`,
  road: `M1090,${rowA + 17} C1136,${rowA + 4} 1130,${HZ + 78} 1020,${HZ + 56} S884,${HZ + 24} 864,${HZ + 3}`,
};

function Sky({ id }: { id: string }) {
  const r = rng(77);
  const stars = Array.from({ length: 125 }, () => ({ x: r() * W, y: Math.pow(r(), 1.7) * (HZ - 26), s: 0.45 + r() * 1.1, o: 0.3 + r() * 0.7, sp: r() > 0.93 }));
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#060516" /><stop offset=".45" stopColor="#13103a" /><stop offset=".8" stopColor="#38296a" /><stop offset="1" stopColor="#7d5192" /></linearGradient>
        <radialGradient id={`${id}-halo`}><stop offset="0" stopColor="#fff2c8" stopOpacity=".5" /><stop offset=".25" stopColor="#d9d2ff" stopOpacity=".2" /><stop offset="1" stopColor="#8a7be0" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-moon`} cx=".36" cy=".32" r=".8"><stop offset="0" stopColor="#fffdf0" /><stop offset=".65" stopColor="#f4ecc8" /><stop offset="1" stopColor="#d6c993" /></radialGradient>
      </defs>
      <rect width={W} height={HZ + 30} fill={`url(#${id}-sky)`} />
      <g fill="#fff">{stars.map((s, i) => <circle key={i} cx={f1(s.x)} cy={f1(s.y)} r={f1(s.s)} opacity={f1(s.o)} />)}</g>
      <g stroke="#fff" strokeWidth=".7" strokeLinecap="round" opacity=".7">{stars.filter((s) => s.sp).map((s, i) => <path key={i} d={`M${f1(s.x - 4.5)},${f1(s.y)} H${f1(s.x + 4.5)} M${f1(s.x)},${f1(s.y - 4.5)} V${f1(s.y + 4.5)}`} />)}</g>
      <circle cx="150" cy="68" r="170" fill={`url(#${id}-halo)`} />
      <circle cx="150" cy="68" r="29" fill={`url(#${id}-moon)`} />
      <g fill="#bfb27c" opacity=".38"><ellipse cx="141" cy="60" rx="6" ry="4.6" /><ellipse cx="160" cy="76" rx="8" ry="5.6" /><ellipse cx="147" cy="80" rx="3.4" ry="2.4" /><ellipse cx="162" cy="55" rx="3" ry="2.4" /><ellipse cx="133" cy="72" rx="2.4" ry="2" /></g>
      <path d="M168,53 A29,29 0 0 1 168,85 A35,35 0 0 0 168,53Z" fill="#8a7a5a" opacity=".12" />
      <g fill="#1a1546" opacity=".5"><ellipse cx="190" cy="84" rx="62" ry="3.4" transform="rotate(-6 190 84)" /><ellipse cx="90" cy="96" rx="76" ry="3" transform="rotate(4 90 96)" /><ellipse cx="640" cy="64" rx="110" ry="4" transform="rotate(-3 640 64)" /><ellipse cx="470" cy="126" rx="120" ry="3.6" transform="rotate(3 470 126)" /></g>
    </g>
  );
}

/** Wide cobbled lane: a shadow, the edge stones, the surface, then pebbles and darker stones over it. */
function Lane({ d, w = 20 }: { d: string; w?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#05040f" strokeOpacity=".34" strokeWidth={w + 8} transform="translate(0 3)" />
      <path d={d} stroke="#4a4672" strokeWidth={w + 3} />
      <path d={d} stroke="#716c9c" strokeWidth={w - 2} />
      <path d={d} stroke="#9b95c7" strokeOpacity=".5" strokeWidth={w - 7} strokeDasharray="2 12" />
      <path d={d} stroke="#3e3a63" strokeOpacity=".55" strokeWidth={w - 12} strokeDasharray="6 14" strokeDashoffset="5" />
      <path d={d} stroke="#b7b1de" strokeOpacity=".16" strokeWidth="2" transform={`translate(0 ${-w / 2 + 3})`} />
    </g>
  );
}

function LampPost({ x, y, id, s = 1 }: { x: number; y: number; id: string; s?: number }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="38" ry="8" fill={`url(#${id}-pool)`} />
      <circle cx="0" cy="-34" r="34" fill={`url(#${id}-lampg)`} />
      <rect x="-1.8" y="-32" width="3.6" height="32" fill="#1b1840" /><rect x="-1.8" y="-32" width="1.2" height="32" fill="#6a66b0" opacity=".55" />
      <path d="M-5.4,0 h10.8 l-1.8,-6 h-7.2z" fill="#1b1840" />
      <path d="M-6.6,-36 L0,-43.5 L6.6,-36Z" fill="#1b1840" /><circle cx="0" cy="-44.4" r="1.4" fill="#1b1840" />
      <rect x="-4.8" y="-36" width="9.6" height="12" rx="1.6" fill={LAMP} stroke="#1b1840" strokeWidth="1.5" /><path d="M0,-36 v12" stroke="#c9792f" strokeWidth=".7" />
      <path d="M-6.4,-24 h12.8 v2.4 h-12.8z" fill="#1b1840" />
    </g>
  );
}

/** The school gate: two stone piers with lanterns, an iron arch and the gate leaves standing open. */
function Gate({ id }: { id: string }) {
  const gy = rowB + 30; const top = gy - 66;
  return (
    <g>
      <ellipse cx="42" cy={gy + 2} rx="52" ry="7" fill="#05040f" opacity=".3" />
      {[8, 56].map((x, i) => (
        <g key={x}>
          <rect x={x} y={top} width="20" height="66" fill={`url(#${id}-pier)`} />
          <path d={`M${x},${top + 14} h20 M${x},${top + 28} h20 M${x},${top + 42} h20 M${x},${top + 56} h20 M${x + 10},${top + 14} v14 M${x + 5},${top + 28} v14 M${x + 14},${top + 42} v14`} stroke="#23213d" strokeWidth="1" opacity=".7" />
          <rect x={x - 3} y={top - 5} width="26" height="7" fill="#6c6a98" stroke="#23213d" strokeWidth="1" /><rect x={x - 3} y={top - 5} width="26" height="2" fill="#a5a2cc" opacity=".6" />
          <rect x={x + 2} y={top - 12} width="16" height="7" fill="#58557f" stroke="#23213d" strokeWidth="1" />
          <circle cx={x + 10} cy={top - 38} r="22" fill={`url(#${id}-lampg)`} />
          <rect x={x + 5.5} y={top - 31} width="9" height="14" rx="1.6" fill={LAMP} stroke="#1b1840" strokeWidth="1.5" /><path d={`M${x + 3},${top - 31} L${x + 10},${top - 39} L${x + 17},${top - 31}Z`} fill="#1b1840" /><path d={`M${x + 10},${top - 31} v14`} stroke="#c9792f" strokeWidth=".7" />
          {i === 0 ? <rect x={x} y={top} width="5" height="66" fill="#b5b2dc" opacity=".22" /> : <rect x={x + 14} y={top} width="6" height="66" fill="#05040f" opacity=".3" />}
        </g>
      ))}
      <path d={`M28,${top + 8} Q42,${top - 18} 56,${top + 8}`} stroke="#1b1840" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d={`M28,${top + 8} Q42,${top - 18} 56,${top + 8}`} stroke="#7a76b0" strokeWidth="1" fill="none" opacity=".6" strokeLinecap="round" />
      <circle cx="42" cy={top - 10} r="3.6" fill="none" stroke="#1b1840" strokeWidth="2" /><path d={`M42,${top - 6.4} V${top + 2}`} stroke="#1b1840" strokeWidth="1.6" />
      <path d={`M31,${top + 8} q3,-4 6,0 M47,${top + 8} q3,-4 6,0`} stroke="#1b1840" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* the leaves, swung open and seen edge on */}
      {[[28, -1], [56, 1]].map(([x, d]) => <g key={x} stroke="#1b1840" strokeWidth="1.8" strokeLinecap="round"><path d={`M${x},${gy - 4} V${top + 16}`} />{[3, 7, 11].map((k) => <path key={k} d={`M${x + d * k * 0.55},${gy - 4} V${top + 16 + k * 1.4}`} strokeWidth="1.2" opacity={0.9 - k * 0.04} />)}</g>)}
    </g>
  );
}

function Terrain({ id, spots }: { id: string; spots: Spot[] }) {
  const r = rng(404);
  // wide, soft lawn tiers: the far hill, the lawn behind the first row of buildings and the lawn in front of them
  const far = `M-10,${HZ + 4} C120,${HZ - 6} 280,${HZ + 2} 430,${HZ} S720,${HZ - 8} 880,${HZ - 2} S1100,${HZ - 8} 1210,${HZ - 2} V${H + 10} H-10Z`;
  const mid = `M-10,${rowA - 30} C200,${rowA - 50} 420,${rowA - 34} 640,${rowA - 42} S1010,${rowA - 52} 1210,${rowA - 36} V${H + 10} H-10Z`;
  const near = `M-10,${rowB - 44} C220,${rowB - 62} 450,${rowB - 48} 700,${rowB - 56} S1050,${rowB - 64} 1210,${rowB - 48} V${H + 10} H-10Z`;
  const tufts = (n: number, y0: number, y1: number) => {
    let light = ''; let dark = '';
    for (let i = 0; i < n; i++) {
      const x = r() * W; const y = y0 + (y1 - y0) * Math.pow(r(), 0.8); const h = 3.2 + ((y - y0) / (y1 - y0)) * 6 + r() * 2.4; const lean = (r() - 0.5) * 3;
      const t = `M${f1(x)},${f1(y)} q${f1(lean - 1)},${f1(-h * 0.5)} ${f1(lean - 2)},${f1(-h)} M${f1(x)},${f1(y)} q${f1(lean)},${f1(-h * 0.6)} ${f1(lean + 0.4)},${f1(-h * 1.15)} M${f1(x)},${f1(y)} q${f1(lean + 1)},${f1(-h * 0.5)} ${f1(lean + 2.4)},${f1(-h * 0.9)} `;
      if (r() > 0.45) light += t; else dark += t;
    }
    return { light, dark };
  };
  const tf = [tufts(90, HZ + 8, rowA - 44), tufts(160, rowA - 36, rowB - 56), tufts(240, rowB - 52, H)];
  const flowers = Array.from({ length: 70 }, () => { const y = rowA - 20 + r() * (H - rowA); return { x: r() * W, y, c: ['#cdbdf5', '#ffe08a', '#f4a8bd', '#bfe3ff'][Math.floor(r() * 4)], s: 0.9 + r() * 1.1 }; });
  // lamp posts stand in the gaps between the buildings of each row, and at the lane ends
  const xs = (row: 0 | 1) => spots.filter((_, i) => i % 2 === row).map((p) => p.x).sort((a, b) => a - b);
  const posts = (row: 0 | 1, y: number) => {
    const list = xs(row); const out: number[] = [];
    if (!list.length) return [180, 600, 1020].map((x) => ({ x, y }));
    out.push(Math.max(96, list[0] - 168));
    for (let i = 0; i < list.length - 1; i++) out.push((list[i] + list[i + 1]) / 2);
    out.push(Math.min(W - 70, list[list.length - 1] + 168));
    return out.map((x) => ({ x, y }));
  };
  const lamps = [...posts(0, rowA + 6), ...posts(1, rowB + 14)];
  const laneLamps = Array.from({ length: 11 }, (_, i) => LANE.x0 + ((LANE.x1 - LANE.x0) / 10) * i);
  const slabs = Array.from({ length: 48 }, () => ({ x: LANE.x0 - 12 + r() * (LANE.x1 - LANE.x0 + 24), t: r() }));

  return (
    <>
      <defs>
        <CommonDefs id={`${id}-k`} />
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d5192" stopOpacity="0" /><stop offset="1" stopColor="#7d5192" stopOpacity=".55" /></linearGradient>
        <linearGradient id={`${id}-castleFoot`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a3a82" stopOpacity="0" /><stop offset="1" stopColor="#4a3a82" stopOpacity=".7" /></linearGradient>
        <linearGradient id={`${id}-lf`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f4d6d" /><stop offset="1" stopColor="#1e3350" /></linearGradient>
        <linearGradient id={`${id}-lm`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#274c58" /><stop offset="1" stopColor="#1a3743" /></linearGradient>
        <linearGradient id={`${id}-ln`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f4047" /><stop offset=".6" stopColor="#152f3a" /><stop offset="1" stopColor="#0d2230" /></linearGradient>
        <radialGradient id={`${id}-lampg`}><stop offset="0" stopColor="#ffd98a" stopOpacity=".5" /><stop offset=".4" stopColor="#ffb85a" stopOpacity=".16" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-pool`}><stop offset="0" stopColor="#ffd98a" stopOpacity=".3" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-pier`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a86a8" /><stop offset=".5" stopColor="#5d5a7c" /><stop offset="1" stopColor="#38365a" /></linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#05040f" stopOpacity=".38" /><stop offset="1" stopColor="#05040f" stopOpacity="0" /></linearGradient>
      </defs>
      <Sky id={id} />
      <g transform="scale(.75)"><Ridge id={`${id}-ra`} seed={21} base={275} top={150} color="#2b2262" lit="#7a6ed0" rough={0.58} /></g>
      <rect y={HZ - 70} width={W} height="80" fill={`url(#${id}-haze)`} />
      {/* the castle, far off on its crag, so the school has somewhere to be */}
      <g transform="translate(674 6) scale(.26)"><CastleArt id={`${id}-cs`} /></g>
      <rect x="850" y={HZ - 40} width="240" height="44" fill={`url(#${id}-castleFoot)`} />
      <g transform="scale(.75)"><Ridge id={`${id}-rb`} seed={33} base={285} top={214} color="#1b1648" lit="#5a50b0" rough={0.6} /></g>
      <Pines seed={5} x0={0} x1={W} base={HZ + 5} n={64} hMin={12} hMax={28} color="#16123a" rim="#2a2560" />

      {/* the lawns */}
      <path d={far} fill={`url(#${id}-lf)`} />
      <path d={far} stroke="#9cc0d4" strokeOpacity=".3" strokeWidth="1.4" fill="none" transform="translate(0 -.4)" />
      <path d={`${tf[0].light}`} stroke="#7aa6b8" strokeOpacity=".3" strokeWidth="1" fill="none" strokeLinecap="round" /><path d={tf[0].dark} stroke="#07131a" strokeOpacity=".4" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d={mid} fill={`url(#${id}-lm)`} />
      <path d={mid} stroke="#a6d0c4" strokeOpacity=".28" strokeWidth="1.4" fill="none" />
      <path d={tf[1].light} stroke="#8ab8a4" strokeOpacity=".3" strokeWidth="1.1" fill="none" strokeLinecap="round" /><path d={tf[1].dark} stroke="#06151a" strokeOpacity=".42" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d={near} fill={`url(#${id}-ln)`} />
      <path d={near} stroke="#8fc0aa" strokeOpacity=".26" strokeWidth="1.5" fill="none" />
      <path d={tf[2].light} stroke="#7eb09a" strokeOpacity=".3" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d={tf[2].dark} stroke="#04100f" strokeOpacity=".45" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <rect y={rowA - 28} width={W} height="46" fill={`url(#${id}-fade)`} opacity=".5" />
      <g>{flowers.map((f, i) => <circle key={i} cx={f1(f.x)} cy={f1(f.y)} r={f1(f.s)} fill={f.c} opacity=".7" />)}</g>

      {/* the lanes */}
      <Lane d={LANES.road} w={14} /><Lane d={LANES.trunk} w={18} /><Lane d={LANES.b} w={20} /><Lane d={LANES.a} w={20} />

      <Pines seed={3} x0={-10} x1={10} base={rowA + 6} n={8} hMin={46} hMax={96} />
      <Pines seed={8} x0={1186} x1={1214} base={rowA + 10} n={8} hMin={46} hMax={96} />
      <Pines seed={13} x0={1190} x1={1214} base={rowB + 28} n={7} hMin={52} hMax={104} />
      <Gate id={id} />

      {lamps.map((p, i) => <LampPost key={i} x={p.x} y={p.y} id={id} s={i % 2 ? 0.92 : 1} />)}

      {/* the lamp lane: a straight stone walk with a lamp every so often, where your best week and this week walk side by side */}
      <g>
        <rect x={LANE.x0 - 16} y={LANE.y - 6} width={LANE.x1 - LANE.x0 + 32} height="17" rx="6" fill="#05040f" opacity=".35" transform="translate(0 3)" />
        <rect x={LANE.x0 - 16} y={LANE.y - 8} width={LANE.x1 - LANE.x0 + 32} height="17" rx="6" fill="#3a3763" stroke="#1b1840" strokeWidth="1.6" />
        <rect x={LANE.x0 - 14} y={LANE.y - 7} width={LANE.x1 - LANE.x0 + 28} height="3" rx="1.5" fill="#8c88c2" opacity=".45" />
        <g stroke="#1b1840" strokeWidth="1.2" opacity=".7">{slabs.map((s, i) => <path key={i} d={`M${f1(s.x)},${LANE.y - 4} V${LANE.y + 8}`} />)}</g>
        {laneLamps.map((x, i) => <LampPost key={i} x={x} y={LANE.y - 8} id={id} s={0.64} />)}
        {[LANE.x0, LANE.x1].map((x, i) => (
          <g key={x}><path d={`M${x},${LANE.y - 10} v-34`} stroke="#1b1840" strokeWidth="2.4" strokeLinecap="round" /><path d={`M${x},${LANE.y - 44} l${i ? -16 : 16},5 l${i ? 16 : -16},5Z`} fill="#e6b24a" stroke="#1b1840" strokeWidth="1.4" strokeLinejoin="round" /></g>
        ))}
      </g>
    </>
  );
}

/** The still background of the Grounds map. `spots` only decides where the lamp posts stand; the map keeps it the same array until the number of buildings changes, so this is painted once. */
export default memo(Terrain);
