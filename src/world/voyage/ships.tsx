import { useId } from 'react';
import type { Accent } from '../../types';
import { C, INK, Ramp, f1, hash } from './isles/kit';
import type { ShipClass } from './progress';

// The crew's ship, drawn from the side as plain SVG: planked hull, brass wale, portholes, a stern cabin with lit windows, masts with crow's nests,
// shrouds, billowed sails with seams and sewn patches (one per paper that is half explored), a bowsprit, a jib and a figurehead.
// The whole ship bobs as one layer (see voyage.css), so none of this moves on its own except the lantern glow and the pennant, which keep their classes.

type Sq = { k: 'sq'; x0: number; x1: number; y0: number; y1: number; patch: [number, number][] };
type Tri = { k: 'tri'; lx: number; yh: number; yt: number; cx: number; cy: number; patch: [number, number][] };
type Sail = Sq | Tri;
interface Spec {
  hull: string; rail: string; wale: string; planks: string[]; ports: number[]; portR: number;
  castle: { x: number; w: number; top: number }; fore: { x: number; w: number; top: number } | null;
  masts: { x: number; top: number; nest: boolean }[]; sails: Sail[];
  bow: { x: number; y: number; tx: number; ty: number }; jib: string | null;
  rudder: string; anchor: [number, number]; lantern: [number, number]; pennant: number; shrouds: number[]; deck: number; foreDeck: number;
}

const SPECS: Record<ShipClass, Spec> = {
  sloop: {
    hull: 'M-46,-10 C-26,-6 22,-7 52,-12 C56,-13 60,-15 64,-19 C62,-6 56,4 46,10 C26,19 -22,19 -36,12 C-43,7 -47,-2 -46,-10Z',
    rail: 'M-46,-10 C-26,-6 22,-7 52,-12 C56,-13 60,-15 64,-19', wale: 'M-46,-6 C-26,-2 22,-3 54,-8 C58,-9 61,-11 63,-14',
    planks: ['M-45,-1 C-24,3 20,2 58,-6', 'M-42,5 C-22,10 18,9 50,2'], ports: [-26, -10, 6, 22], portR: 2,
    castle: { x: -46, w: 18, top: -26 }, fore: null,
    masts: [{ x: -2, top: -90, nest: false }],
    sails: [
      { k: 'tri', lx: -2, yh: -84, yt: -12, cx: -40, cy: -14, patch: [[-14, -46], [-18, -30]] },
      { k: 'tri', lx: 4, yh: -72, yt: -12, cx: 34, cy: -14, patch: [[14, -32]] },
    ],
    bow: { x: 62, y: -17, tx: 84, ty: -31 }, jib: null,
    rudder: 'M-46,-4 L-51,4 L-49,13 L-43,9Z', anchor: [48, -3], lantern: [-40, -36], pennant: 0, shrouds: [-2], deck: -9, foreDeck: -14,
  },
  brigantine: {
    hull: 'M-58,-11 C-34,-7 28,-8 58,-13 C63,-14 68,-17 72,-21 C70,-7 62,5 50,11 C28,22 -28,21 -44,13 C-54,8 -59,-2 -58,-11Z',
    rail: 'M-58,-11 C-34,-7 28,-8 58,-13 C63,-14 68,-17 72,-21', wale: 'M-58,-7 C-34,-3 28,-4 60,-9 C65,-10 69,-13 71,-16',
    planks: ['M-57,-2 C-32,3 26,2 66,-8', 'M-52,5 C-30,11 24,10 60,0'], ports: [-34, -18, -2, 14, 30], portR: 2.2,
    castle: { x: -58, w: 24, top: -30 }, fore: { x: 56, w: 14, top: -23 },
    masts: [{ x: -14, top: -86, nest: false }, { x: 7, top: -92, nest: true }, { x: 42, top: -74, nest: true }],
    sails: [
      { k: 'tri', lx: -14, yh: -80, yt: -12, cx: -46, cy: -14, patch: [[-25, -42], [-26, -28], [-22, -56]] },
      { k: 'sq', x0: -8, x1: 22, y0: -82, y1: -12, patch: [[2, -64], [8, -50], [2, -32]] },
      { k: 'sq', x0: 30, x1: 54, y0: -64, y1: -12, patch: [[38, -50], [44, -30]] },
    ],
    bow: { x: 70, y: -19, tx: 92, ty: -33 }, jib: null,
    rudder: 'M-58,-4 L-63,4 L-61,14 L-55,10Z', anchor: [56, -2], lantern: [-52, -41], pennant: 1, shrouds: [7, 42], deck: -10, foreDeck: -16,
  },
  galleon: {
    hull: 'M-66,-14 C-40,-9 20,-10 62,-15 C70,-17 80,-20 88,-25 C86,-9 78,3 64,12 C38,25 -36,26 -54,15 C-63,8 -67,-4 -66,-14Z',
    rail: 'M-66,-14 C-40,-9 20,-10 62,-15 C70,-17 80,-20 88,-25', wale: 'M-66,-9 C-40,-4 20,-5 62,-10 C72,-12 80,-15 86,-19',
    planks: ['M-65,-3 C-40,2 24,1 82,-14', 'M-63,4 C-38,10 22,9 76,-5', 'M-57,11 C-36,17 24,16 68,5'], ports: [-34, -20, -6, 8, 22, 36], portR: 2.4,
    castle: { x: -68, w: 34, top: -38 }, fore: { x: 62, w: 22, top: -29 },
    masts: [{ x: -23, top: -88, nest: true }, { x: 11, top: -102, nest: true }, { x: 45, top: -80, nest: true }],
    sails: [
      { k: 'sq', x0: -34, x1: -12, y0: -78, y1: -14, patch: [[-26, -62], [-22, -42]] },
      { k: 'sq', x0: -4, x1: 26, y0: -92, y1: -14, patch: [[6, -76], [14, -58], [8, -36]] },
      { k: 'sq', x0: 34, x1: 56, y0: -70, y1: -14, patch: [[42, -54], [48, -34]] },
    ],
    bow: { x: 84, y: -24, tx: 110, ty: -38 }, jib: 'M58,-70 L106,-38 L70,-25Z',
    rudder: 'M-66,-6 L-72,4 L-70,17 L-62,12Z', anchor: [70, -4], lantern: [-60, -48], pennant: 1, shrouds: [-23, 11, 45], deck: -13, foreDeck: -19,
  },
};

const sailPath = (s: Sail) => {
  if (s.k === 'sq') {
    const h = s.y1 - s.y0; const m = (s.x0 + s.x1) / 2;
    return `M${s.x0},${s.y0} H${s.x1} C${s.x1 + 3.4},${f1(s.y0 + h * 0.3)} ${s.x1 + 3.4},${f1(s.y0 + h * 0.72)} ${s.x1},${s.y1} Q${m},${s.y1 - 7} ${s.x0},${s.y1} C${s.x0 - 3.4},${f1(s.y0 + h * 0.72)} ${s.x0 - 3.4},${f1(s.y0 + h * 0.3)} ${s.x0},${s.y0}Z`;
  }
  const dir = Math.sign(s.cx - s.lx) || 1;
  const mx = (s.lx + s.cx) / 2 + dir * 5; const my = (s.yh + s.cy) / 2 - 3;
  return `M${s.lx},${s.yt} L${s.lx},${s.yh} Q${f1(mx)},${f1(my)} ${s.cx},${s.cy} Q${f1((s.lx + s.cx) / 2)},${f1((s.cy + s.yt) / 2 + 3.4)} ${s.lx},${s.yt}Z`;
};

function SailArt({ id, s, k, patches }: { id: string; s: Sail; k: number; patches: ({ accent: Accent; done: boolean } | undefined)[] }) {
  const d = sailPath(s);
  const seams: string[] = [];
  if (s.k === 'sq') {
    const h = s.y1 - s.y0;
    for (let i = 1; i <= 3; i++) { const y = f1(s.y0 + (h * i) / 4); seams.push(`M${s.x0 - 4},${y} Q${(s.x0 + s.x1) / 2},${f1(y + 3.2)} ${s.x1 + 4},${y}`); }
    const w = s.x1 - s.x0; for (let i = 1; i <= 2; i++) { const x = f1(s.x0 + (w * i) / 3); seams.push(`M${x},${s.y0} Q${f1(x + 1.4)},${f1((s.y0 + s.y1) / 2)} ${x},${s.y1}`); }
  } else {
    for (let i = 1; i <= 3; i++) { const y = f1(s.yt + ((s.yh - s.yt) * i) / 4); seams.push(`M${s.lx},${y} L${s.cx},${s.cy}`); }
  }
  return (
    <g>
      <clipPath id={`${id}-c${k}`}><path d={d} /></clipPath>
      <path d={d} fill={`url(#${id}-sail)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#${id}-c${k})`}>
        <path d={seams.join(' ')} stroke="#8a7a52" strokeWidth=".9" fill="none" opacity=".42" />
        <path d={d} fill={`url(#${id}-shade)`} />
        {s.k === 'sq' ? <path d={`M${s.x0},${s.y0} H${s.x1} V${s.y0 + 5} H${s.x0}Z`} fill="#8a7a52" opacity=".22" /> : null}
      </g>
      {s.patch.map(([x, y], j) => {
        const p = patches[j];
        const r = ((k * 7 + j * 11) % 14) - 7;
        return p ? (
          <g key={j} transform={`rotate(${r} ${x} ${y})`}>
            <rect className={`ship-patch acc-${p.accent}${p.done ? ' is-done' : ''}`} x={x - 5} y={y - 5} width="10" height="10" rx="1.4" />
            <rect x={x - 3.6} y={y - 3.6} width="7.2" height="7.2" rx=".8" fill="none" stroke="#fff" strokeWidth=".8" strokeDasharray="1.6 1.4" opacity=".7" />
          </g>
        ) : null;
      })}
    </g>
  );
}

const Mast = ({ x, top }: { x: number; top: number }) => (
  <g>
    <path d={`M${x},-8 V${top}`} stroke={INK} strokeWidth="5.2" strokeLinecap="round" /><path d={`M${x},-8 V${top}`} stroke={C.timber[1]} strokeWidth="2.6" strokeLinecap="round" />
    <path d={`M${x - 0.7},-8 V${top + 2}`} stroke={C.timber[0]} strokeWidth=".9" opacity=".8" />
  </g>
);

/** The detailed ship, for the sea chart, the home card and the ending. The ghost ship keeps the plain outline (see art.tsx). */
export function ShipDetail({ cls, patches, name }: { cls: ShipClass; patches: { accent: Accent; done: boolean }[]; name?: string }) {
  const id = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const sp = SPECS[cls];
  let n = 0; const assigned = sp.sails.map((q) => q.patch.map(() => patches[n++]));
  const pm = sp.masts[sp.pennant];
  const cast = sp.castle; const fore = sp.fore;
  return (
    <g>
      <defs>
        <Ramp id={`${id}-hull`} ramp={['#b97a4c', '#8b5632', '#5e3a24', '#3b2418']} stops={[0, 0.35, 0.75, 1]} />
        <linearGradient id={`${id}-sail`} x1="0" y1="0" x2="1" y2="0.1"><stop offset="0" stopColor="#fffdf3" /><stop offset=".5" stopColor="#f6ecd0" /><stop offset="1" stopColor="#dccfa6" /></linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0"><stop offset=".5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#3a2e14" stopOpacity=".28" /></linearGradient>
        <linearGradient id={`${id}-cab`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b97a4c" /><stop offset="1" stopColor="#7a4a2c" /></linearGradient>
        <Ramp id={`${id}-gold`} ramp={C.gold} x2={1} y2={1} />
        <clipPath id={`${id}-hc`}><path d={sp.hull} /></clipPath>
      </defs>
      {/* rudder and the far rigging */}
      <path d={sp.rudder} fill={C.timber[2]} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      {sp.masts.map((m, i) => <Mast key={i} x={m.x} top={m.top} />)}
      {sp.sails.map((s, i) => <SailArt key={i} id={id} s={s} k={i} patches={assigned[i]} />)}
      {/* yards across the square sails */}
      {sp.sails.map((s, i) => s.k === 'sq' ? <g key={i}><path d={`M${s.x0 - 5},${s.y0} H${s.x1 + 5}`} stroke={INK} strokeWidth="4.4" strokeLinecap="round" /><path d={`M${s.x0 - 5},${s.y0} H${s.x1 + 5}`} stroke={C.timber[1]} strokeWidth="2.2" strokeLinecap="round" /><path d={`M${s.x0 - 5},${s.y0 - 0.7} H${s.x1 + 5}`} stroke={C.timber[0]} strokeWidth=".8" opacity=".8" /></g> : null)}
      {/* the jib and the stays */}
      {sp.jib ? <g><path d={sp.jib} fill={`url(#${id}-sail)`} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" /><path d="M64,-62 L92,-36 M62,-56 L82,-31" stroke="#8a7a52" strokeWidth=".8" opacity=".4" fill="none" /></g> : null}
      <path d={`M${sp.bow.x},${sp.bow.y} L${sp.bow.tx},${sp.bow.ty}`} stroke={INK} strokeWidth="5" strokeLinecap="round" /><path d={`M${sp.bow.x},${sp.bow.y} L${sp.bow.tx},${sp.bow.ty}`} stroke={C.timber[1]} strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M${sp.masts[sp.masts.length - 1].x},${sp.masts[sp.masts.length - 1].top + 2} L${sp.bow.tx},${sp.bow.ty}`} stroke={INK} strokeWidth=".9" opacity=".55" fill="none" />
      {sp.shrouds.map((x) => {
        const m = sp.masts.find((q) => q.x === x) ?? sp.masts[0]; const top = m.top + 14;
        return <g key={x} stroke={INK} fill="none" strokeLinecap="round" opacity=".6"><path d={`M${x},${top} L${x - 13},-12 M${x},${top} L${x + 13},-12`} strokeWidth=".9" />{[0.3, 0.5, 0.7].map((t, i) => <path key={i} d={`M${f1(x - 13 * t)},${f1(top + (-12 - top) * t)} H${f1(x + 13 * t)}`} strokeWidth=".7" />)}</g>;
      })}
      {/* crow's nests, flags */}
      {sp.masts.map((m, i) => m.nest ? (
        <g key={i}><path d={`M${m.x - 5.4},${m.top + 9} L${m.x - 6.8},${m.top + 2} H${m.x + 6.8} L${m.x + 5.4},${m.top + 9}Z`} fill={C.timber[1]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><path d={`M${m.x - 6.2},${m.top + 5.4} H${m.x + 6.2}`} stroke={C.timber[3]} strokeWidth="1" /><path d={`M${m.x - 6.8},${m.top + 2} H${m.x + 6.8}`} stroke={C.timber[0]} strokeWidth="1.1" /></g>
      ) : <circle key={i} cx={m.x} cy={m.top} r="2.2" fill={C.gold[1]} stroke={INK} strokeWidth="1.1" />)}
      {sp.masts.map((m, i) => i === sp.pennant ? null : <g key={i}><path d={`M${m.x},${m.top} V${m.top - 13}`} stroke={INK} strokeWidth="1.8" strokeLinecap="round" /><path d={`M${m.x},${m.top - 13} l13,3.4 l-13,3.4Z`} fill="#d9577a" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" /></g>)}
      {/* the hull */}
      <path d={sp.hull} fill={`url(#${id}-hull)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <g clipPath={`url(#${id}-hc)`}>
        <path d={sp.planks.join(' ')} stroke={C.timber[3]} strokeWidth="1" fill="none" opacity=".55" />
        <path d={`M-90,${cls === 'galleon' ? 12 : 9} C-40,${cls === 'galleon' ? 18 : 15} 30,${cls === 'galleon' ? 18 : 15} 100,${cls === 'galleon' ? 4 : 2} V40 H-90Z`} fill="#1d120c" opacity=".5" />
        <path d={sp.hull} fill="none" stroke="#fff" strokeWidth="1.2" opacity=".14" transform="translate(-1.2,-1.2)" />
        {Array.from({ length: 11 }, (_, i) => { const x = -60 + i * 13 + hash(3, i) * 5; return <path key={i} d={`M${f1(x)},-14 v${cls === 'galleon' ? 36 : 30}`} stroke={C.timber[3]} strokeWidth=".6" opacity=".22" />; })}
      </g>
      <path d={sp.wale} stroke={INK} strokeWidth="4.4" fill="none" strokeLinecap="round" /><path d={sp.wale} stroke={`url(#${id}-gold)`} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {sp.ports.map((x, i) => <g key={x}><circle cx={x} cy={cls === 'sloop' ? 1 : 2 - (x > 30 ? 3 : 0)} r={sp.portR + 1.2} fill={`url(#${id}-gold)`} stroke={INK} strokeWidth="1.1" /><circle cx={x} cy={cls === 'sloop' ? 1 : 2 - (x > 30 ? 3 : 0)} r={sp.portR} fill="#18222e" /><circle cx={x - 0.6} cy={(cls === 'sloop' ? 1 : 2 - (x > 30 ? 3 : 0)) - 0.6} r={sp.portR * 0.4} fill="#fff" opacity={0.2 + (i % 2) * 0.2} /></g>)}
      <path d={sp.rail} stroke={INK} strokeWidth="4.6" fill="none" strokeLinecap="round" /><path d={sp.rail} stroke={C.timber[0]} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* stern cabin */}
      <path d={`M${cast.x},${sp.deck + 1} V${cast.top} H${cast.x + cast.w} V${sp.deck + 1}Z`} fill={`url(#${id}-cab)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={`M${cast.x - 2.4},${cast.top} H${cast.x + cast.w + 2.4} V${cast.top - 3.4} H${cast.x - 2.4}Z`} fill={C.timber[0]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /><path d={`M${cast.x - 1},${cast.top - 1.7} H${cast.x + cast.w + 1}`} stroke={`url(#${id}-gold)`} strokeWidth="1.1" />
      {Array.from({ length: Math.max(2, Math.round(cast.w / 9)) }, (_, i) => { const gap = cast.w / Math.max(2, Math.round(cast.w / 9)); const x = cast.x + gap * i + gap / 2; return <g key={i}><path d={`M${f1(x - 2.8)},${cast.top + 14} V${cast.top + 7} a2.8,2.8 0 0 1 5.6,0 V${cast.top + 14}Z`} fill={C.lit} stroke={INK} strokeWidth="1.2" /><path d={`M${f1(x)},${cast.top + 4.4} V${cast.top + 14} M${f1(x - 2.8)},${cast.top + 10} H${f1(x + 2.8)}`} stroke={C.timber[3]} strokeWidth=".7" opacity=".7" /><path d={`M${f1(x - 2.2)},${cast.top + 11} h4.4 v2.6 h-4.4Z`} fill={C.ember} opacity=".4" /></g>; })}
      <path d={`M${cast.x + 1},${cast.top + 17} H${cast.x + cast.w - 1}`} stroke={C.timber[3]} strokeWidth="1" opacity=".5" />
      {fore ? <g><path d={`M${fore.x},${sp.foreDeck + 1} V${fore.top} H${fore.x + fore.w} V${sp.foreDeck - 3}Z`} fill={`url(#${id}-cab)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /><path d={`M${fore.x - 1.6},${fore.top} H${fore.x + fore.w + 1.6}`} stroke={INK} strokeWidth="4" strokeLinecap="round" /><path d={`M${fore.x - 1.6},${fore.top} H${fore.x + fore.w + 1.6}`} stroke={C.timber[0]} strokeWidth="1.8" strokeLinecap="round" /></g> : null}
      {/* a carved figurehead and the anchor */}
      <path d={`M${sp.bow.x + 2},${sp.bow.y + 1} C${sp.bow.x + 10},${sp.bow.y + 3} ${sp.bow.x + 11},${sp.bow.y + 11} ${sp.bow.x + 6},${sp.bow.y + 16} C${sp.bow.x + 6},${sp.bow.y + 11} ${sp.bow.x + 2},${sp.bow.y + 9} ${sp.bow.x - 2},${sp.bow.y + 9}Z`} fill={`url(#${id}-gold)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={sp.bow.x + 7} cy={sp.bow.y + 5} r="1" fill={INK} />
      <g transform={`translate(${sp.anchor[0]},${sp.anchor[1]}) scale(.62)`}><path d="M0,-8 V8 M-5,-5 H5 M-8,3 Q0,12 8,3" stroke={INK} strokeWidth="4.6" fill="none" strokeLinecap="round" /><path d="M0,-8 V8 M-5,-5 H5 M-8,3 Q0,12 8,3" stroke={C.iron[0]} strokeWidth="2" fill="none" strokeLinecap="round" /><circle cx="0" cy="-9.4" r="2.4" fill="none" stroke={INK} strokeWidth="2.2" /></g>
      {/* the stern lantern, which glows */}
      <g className="ship-lantern">
        <path d={`M${sp.lantern[0]},${cast.top - 3} V${sp.lantern[1] + 5}`} stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <circle className="ship-lantern-glow" cx={sp.lantern[0]} cy={sp.lantern[1]} r="12" />
        <path d={`M${sp.lantern[0] - 3.4},${sp.lantern[1] + 4.4} h6.8 l-1,-8 h-4.8Z`} fill={C.litHot} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" /><path d={`M${sp.lantern[0] - 3.8},${sp.lantern[1] - 3.6} L${sp.lantern[0]},${sp.lantern[1] - 7.4} L${sp.lantern[0] + 3.8},${sp.lantern[1] - 3.6}Z`} fill={C.copper[1]} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        <circle className="ship-lantern-core" cx={sp.lantern[0]} cy={sp.lantern[1]} r="2.2" />
      </g>
      {/* the pennant on the lead mast */}
      <g className="ship-pennant">
        <path d={`M${pm.x},${pm.top} V${pm.top - 16}`} stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <path className="ship-flag" d={`M${pm.x},${pm.top - 16} l24,5.4 l-24,5.4Z`} />
      </g>
      {name ? <title>{name}</title> : null}
    </g>
  );
}
