import type { ReactNode } from 'react';
import { P, darken, lighten, rng } from '../art/kit';
import { HouseCrest } from '../art/crests';
import { ROBE_COLORS, type StudentLook } from '../art/cast/types';
import { HAIR_COLORS, SKIN_TONES } from '../../crew/Crew';
import { HOUSES, type HouseId } from '../houses';
import type { Box } from '../art/landmarks';
import type { Island } from '../../voyage/progress';

// The small pieces that sit over the Grounds map: what grows over a building nobody visits, the weather over a building, the nameplate
// at a door, the student walking between buildings, the two lanterns on the lamp lane, the house banner and the leaves the draught blows.
// Each is a small picture with its own box; the map places it and CSS moves or fades the layer (transform and opacity only).

const INK = '#17122e';
const f1 = (n: number) => Math.round(n * 10) / 10;

// ───────────────────────────── ivy and dust: a building that has not been visited ─────────────────────────────

/** A vine that climbs from (x, y), with leaves in two greens. Drawn for the map's scale, so the stroke and the leaves are big enough to read. */
function Vine({ seed, x, y, len, dir, leaf }: { seed: number; x: number; y: number; len: number; dir: number; leaf: number }) {
  const r = rng(seed);
  let cx = x; let cy = y;
  let d = `M${f1(cx)} ${f1(cy)}`;
  const leaves: ReactNode[] = [];
  const steps = Math.max(4, Math.round(len / 11));
  for (let i = 0; i < steps; i++) {
    const nx = x + Math.sin(i * 1.5 + r() * 2) * 9 * dir; const ny = y - ((i + 1) * len) / steps;
    d += ` Q${f1((cx + nx) / 2 + (r() - 0.5) * 9)} ${f1((cy + ny) / 2)} ${f1(nx)} ${f1(ny)}`;
    cx = nx; cy = ny;
    const n = 2 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const a = (r() - 0.5) * 3.6; const sz = leaf * (0.75 + r() * 0.7);
      const lx = cx + Math.cos(a) * sz * 0.9; const ly = cy + Math.sin(a) * sz * 0.9;
      leaves.push(<path key={`${i}-${k}`} d={`M${f1(cx)} ${f1(cy)} Q${f1(lx + sz * 0.3)} ${f1(ly - sz * 0.8)} ${f1(lx + sz * 0.9)} ${f1(ly)} Q${f1(lx + sz * 0.2)} ${f1(ly + sz * 0.7)} ${f1(cx)} ${f1(cy)}Z`} fill={r() < 0.5 ? P.ivy : P.ivyLit} stroke="#0f2a1e" strokeWidth=".7" strokeLinejoin="round" transform={`rotate(${f1(a * 57)} ${f1(cx)} ${f1(cy)})`} />);
    }
  }
  return <g><path d={d} stroke="#0f2a1e" strokeWidth="3" fill="none" strokeLinecap="round" /><path d={d} stroke="#3d6a45" strokeWidth="1.5" fill="none" strokeLinecap="round" />{leaves}</g>;
}

/** Drawn in the building's own coordinates, so it lines up with its walls. `amount` (0 to 1) says how far the ivy has crept and how thick the dust lies. */
export function Neglect({ box, amount, seed }: { box: Box; amount: number; seed: number }) {
  const gy = box.y + box.h - 3;
  const r = rng(seed);
  const n = 4 + Math.round(amount * 6);
  const strands = Array.from({ length: n }, (_, i) => ({ x: box.x + 16 + ((i + 0.5) / n) * (box.w - 32) + (r() - 0.5) * 16, len: (46 + r() * 90) * (0.3 + amount * 0.9) }));
  const cobweb = amount > 0.45;
  return (
    <g>
      <ellipse cx={box.x + box.w / 2} cy={gy} rx={box.w * (0.36 + amount * 0.1)} ry={7 + amount * 9} fill="#8c8478" opacity={f1(0.2 + amount * 0.26)} />
      <g fill="#b3aa98" opacity={f1(0.25 + amount * 0.35)}>{Array.from({ length: 9 + Math.round(amount * 9) }, (_, i) => <circle key={i} cx={f1(box.x + 12 + r() * (box.w - 24))} cy={f1(gy - 6 - r() * 26)} r={f1(0.9 + r() * 1.4)} />)}</g>
      {strands.map((s, i) => <Vine key={i} seed={seed + i * 17} x={s.x} y={gy} len={s.len} dir={i % 2 ? 1 : -1} leaf={6 + amount * 3} />)}
      {cobweb ? <g stroke="#d9d4ea" strokeWidth="1" fill="none" opacity=".5" strokeLinecap="round"><path d={`M${box.x + 8},${gy - 70} L${box.x + 44},${gy - 70} M${box.x + 8},${gy - 70} L${box.x + 38},${gy - 40} M${box.x + 8},${gy - 70} L${box.x + 20},${gy - 28}`} /><path d={`M${box.x + 8},${gy - 56} Q${box.x + 26},${gy - 52} ${box.x + 32},${gy - 40} M${box.x + 8},${gy - 44} Q${box.x + 18},${gy - 42} ${box.x + 22},${gy - 34}`} /></g> : null}
    </g>
  );
}

/**
 * Mist over a building: low, flat banks that hug its foot, in one picture (the map slides it slowly). The fill is a shared gradient.
 * `density` (0 to 1) lifts a few more banks up the walls, so a paper nobody has opened is more hidden than one that is half done.
 */
export function Mist({ fill, flip = false, density = 0.5 }: { fill: string; flip?: boolean; density?: number }) {
  const r = rng(flip ? 19 : 41);
  const low = Array.from({ length: 8 }, (_, i) => ({ x: 4 + (i / 7) * 92 + (r() - 0.5) * 8, y: 70 + r() * 24, rx: 20 + r() * 16, ry: 6 + r() * 7 }));
  const high = Array.from({ length: Math.round(density * 3) }, () => ({ x: 14 + r() * 72, y: 44 + r() * 20, rx: 18 + r() * 14, ry: 7 + r() * 7 }));
  return <g>{[...low, ...high].map((p, i) => <ellipse key={i} cx={f1(p.x)} cy={f1(p.y)} rx={f1(p.rx)} ry={f1(p.ry)} fill={fill} />)}</g>;
}

// ───────────────────────────── weather over a building ─────────────────────────────

export const WX_BOX: Box = { x: -64, y: -50, w: 128, h: 100 };

/** A storm cloud with rain (and, for a bad mock, a flash of lightning). Small, so its parts may animate. */
export function Storm({ weather }: { weather: 'storm' | 'rough' }) {
  const dark = weather === 'storm';
  return (
    <g className={`gm-storm gm-storm--${weather}`}>
      <g className="gm-cloud">
        <ellipse cx="-22" cy="-12" rx="26" ry="15" fill={dark ? '#2a2d52' : '#43476e'} stroke={INK} strokeWidth="2" />
        <ellipse cx="6" cy="-20" rx="30" ry="19" fill={dark ? '#32355e' : '#4e5380'} stroke={INK} strokeWidth="2" />
        <ellipse cx="32" cy="-9" rx="24" ry="14" fill={dark ? '#262949' : '#3d4166'} stroke={INK} strokeWidth="2" />
        <ellipse cx="4" cy="-4" rx="46" ry="11" fill={dark ? '#262949' : '#3d4166'} stroke={INK} strokeWidth="2" />
        <path d="M-30,-26 q10,-10 22,-8 M-6,-34 q12,-8 24,-2" stroke="#a8abd8" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
      </g>
      <g className="gm-rain">{[-34, -20, -6, 8, 22, 36].map((x, i) => <path key={x} d={`M${x},8 l-3,13`} style={{ ['--i' as string]: i }} />)}</g>
      {dark ? <path className="gm-bolt" d="M6,6 l-10,20 h8 l-7,18 l18,-25 h-9 l8,-13z" /> : null}
    </g>
  );
}

/** The clear-sky sign over a paper that went well: a few stars that twinkle. */
export function Sparks() {
  const star = 'M0,-9 L2.6,-2.6 L9,0 L2.6,2.6 L0,9 L-2.6,2.6 L-9,0 L-2.6,-2.6Z';
  return (
    <g className="gm-sparks">
      {[[-22, 4, 0.9], [0, -14, 1.25], [24, 6, 0.8]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path className={`gm-spark gm-spark--${i}`} d={star} /></g>
      ))}
    </g>
  );
}

// ───────────────────────────── the nameplate at a building's door ─────────────────────────────

export const PLATE_BOX: Box = { x: -60, y: 0, w: 120, h: 32 };

export function Plate({ it }: { it: Island }) {
  const pct = Math.round(it.progress * 100);
  return (
    <g className="gm-plate">
      <path className="gm-plate-post" d="M-44,0 v4 M44,0 v4" />
      <rect className="gm-plate-bg" x="-56" y="4" width="112" height="26" rx="8" />
      <rect className="gm-plate-bar" x="-50" y="25.6" width="100" height="2.6" rx="1.3" />
      <rect className="gm-plate-fill" x="-50" y="25.6" width={f1(100 * it.progress)} height="2.6" rx="1.3" />
      <circle className="gm-plate-dot" cx="-43" cy="15" r="4.4" />
      <text className="gm-plate-abbr" x="-33" y="20">{it.abbrev}</text>
      <text className="gm-plate-pct" x="50" y="20" textAnchor="end">{pct}%</text>
    </g>
  );
}

// ───────────────────────────── the student, walking between the buildings ─────────────────────────────

export const WALKER_BOX: Box = { x: -34, y: -102, w: 68, h: 106 };

/** The student in the map, small: robe, scarf in the house colours, a lantern held out, hair and glasses from the look chosen in the editor. Origin: the feet. */
export function Walker({ look, house, busy }: { look: StudentLook; house: HouseId | null; busy: boolean }) {
  const { skin, shade } = SKIN_TONES[look.skin];
  const hair = HAIR_COLORS[look.hairColor]; const hairDeep = darken(hair, 0.3);
  const robe = ROBE_COLORS[look.robe]; const robeDeep = darken(robe, 0.35); const robeLit = lighten(robe, 0.16);
  const hc = house ? HOUSES[house].colors : null;
  const sA = hc ? hc.main : '#c8bfa6'; const sB = hc ? hc.light : '#a89f86';
  const o = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const st = look.hair;
  return (
    <g>
      <ellipse cx="0" cy="-1" rx="22" ry="5" fill="#05040f" opacity=".38" />
      {busy ? <ellipse className="gm-w-ring" cx="0" cy="-1" rx="22" ry="6" fill="none" stroke="#ffd98a" strokeWidth="2" /> : null}
      <g className="gm-w-body">
        {/* boots and the hem of the robe */}
        <path d="M-9,-5 h7 v5 h-9z M2,-5 h7 v5 h-5z" fill="#2a2038" {...o} strokeWidth="1.6" />
        {/* hair that falls behind the shoulders */}
        {st === 1 ? <path d="M-13,-62 C-19,-50 -17,-38 -12,-30 L12,-30 C17,-38 19,-50 13,-62Z" fill={hair} {...o} strokeWidth="1.6" /> : null}
        {st === 3 ? <circle cx="0" cy="-71" r="16" fill={hair} {...o} strokeWidth="1.6" /> : null}
        {/* the robe */}
        <path d="M-17,-6 C-19,-24 -15,-38 -9,-46 L9,-46 C15,-38 19,-24 17,-6Z" fill={robe} {...o} />
        <path d="M5,-44 C13,-36 16,-24 15,-8 L17,-6 C19,-24 15,-38 9,-46Z" fill={robeDeep} opacity=".7" />
        <path d="M-15,-9 H15" stroke={sA} strokeWidth="3.4" strokeLinecap="round" /><path d="M-15,-9 H15" stroke={sB} strokeWidth="1" strokeDasharray="2 3" strokeLinecap="round" />
        <path d="M-5,-45 L0,-24 L5,-45Z" fill="#efe6cf" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        {/* the scarf, wound twice, one end hanging */}
        <path d="M-10,-47 Q0,-40 10,-47 L11,-41 Q0,-33 -11,-41Z" fill={sA} {...o} strokeWidth="1.6" />
        <path d="M-8,-45 l2,5 M-3,-43 l1,5 M2,-43 l-1,5 M7,-45 l-2,5" stroke={sB} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M-9,-40 L-14,-24 L-6,-22 L-3,-38Z" fill={sA} {...o} strokeWidth="1.6" /><path d="M-13,-29 l8,-2 M-12,-25 l8,-2" stroke={sB} strokeWidth="1.5" strokeLinecap="round" />
        {/* the neck and the head */}
        <rect x="-4" y="-52" width="8" height="8" fill={shade} />
        <circle cx="-12" cy="-58" r="3" fill={skin} {...o} strokeWidth="1.4" /><circle cx="12" cy="-58" r="3" fill={skin} {...o} strokeWidth="1.4" />
        <ellipse cx="0" cy="-60" rx="12.4" ry="13.6" fill={skin} {...o} />
        <path d="M7,-69 Q15,-58 6,-48 Q12,-58 7,-69Z" fill={shade} opacity=".45" />
        <circle cx="-4.6" cy="-60" r="1.9" fill={INK} /><circle cx="4.6" cy="-60" r="1.9" fill={INK} /><circle cx="-4" cy="-60.7" r=".6" fill="#fff" /><circle cx="5.2" cy="-60.7" r=".6" fill="#fff" />
        <path d="M-3.4,-54 Q0,-51 3.4,-54" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M-8,-65 q3,-2 6,-0.4 M2,-65.4 q3,-1.6 6,0.4" stroke={hairDeep} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {look.accessory === 3 ? <g fill="none" stroke={P.brass} strokeWidth="1.5"><circle cx="-4.8" cy="-60" r="4.2" /><circle cx="4.8" cy="-60" r="4.2" /><path d="M-0.6,-60 h1.2" /></g> : null}
        {/* hair on top of the head */}
        {st === 0 ? <path d="M-13,-62 C-13,-76 13,-76 13,-62 C10,-68 4,-70 -2,-69 C-7,-68 -11,-66 -13,-62Z" fill={hair} {...o} strokeWidth="1.6" /> : null}
        {st === 1 ? <path d="M-13.4,-61 C-14,-77 14,-77 13.4,-61 C11,-67 5,-71 0,-70 C-6,-71 -11,-67 -13.4,-61Z" fill={hair} {...o} strokeWidth="1.6" /> : null}
        {st === 2 ? <><circle cx="0" cy="-77" r="7" fill={hair} {...o} strokeWidth="1.6" /><path d="M-13,-62 C-13,-75 13,-75 13,-62 C10,-68 4,-70 -2,-69 C-7,-68 -11,-66 -13,-62Z" fill={hair} {...o} strokeWidth="1.6" /></> : null}
        {st === 3 ? <path d="M-13,-62 C-14,-74 14,-74 13,-62 C10,-68 4,-70 0,-69.6 C-5,-70 -10,-67 -13,-62Z" fill={hair} {...o} strokeWidth="1.6" /> : null}
        {look.accessory === 1 ? <g><path d="M-14,-70 L0,-76 L14,-70 L0,-64Z" fill="#1d1a3a" {...o} strokeWidth="1.6" /><path d="M-9,-69 V-62 Q0,-58 9,-62 V-69" fill="#2a2650" {...o} strokeWidth="1.4" /><path d="M12,-70 V-62" stroke={P.brass} strokeWidth="1.4" /><circle cx="12" cy="-61" r="1.7" fill={P.brass} /></g> : null}
        {look.accessory === 2 ? <g><path d="M9,-70 L16,-74 L16,-66Z M9,-70 L2,-74 L2,-66Z" fill={sA} {...o} strokeWidth="1.4" /><circle cx="9" cy="-70" r="2" fill={sB} stroke={INK} strokeWidth="1.2" /></g> : null}
        {/* the arm that holds the lantern out, and the lantern itself */}
        <path d="M9,-42 C16,-38 22,-34 25,-30 L22,-25 C17,-29 13,-32 8,-34Z" fill={robeLit} {...o} strokeWidth="1.6" />
        <circle cx="24" cy="-27" r="3.6" fill={skin} {...o} strokeWidth="1.5" />
      </g>
      <g className="gm-w-lamp">
        <circle className="gm-w-glow" cx="24" cy="-12" r="22" fill="url(#gm-lampglow)" />
        <path d="M24,-26 V-22" stroke={INK} strokeWidth="2" />
        <path d="M19,-14 L29,-14 L27,-19 L21,-19Z" fill={P.brass} {...o} strokeWidth="1.4" />
        <rect x="19" y="-14" width="10" height="13" rx="1.6" fill="#ffe9a8" stroke={INK} strokeWidth="1.6" /><path d="M24,-14 v13" stroke="#c9792f" strokeWidth=".8" />
        <path className="gm-w-flame" d="M24,-5 q-3,-3 0,-9 q3,6 0,9Z" fill="#ff9a3c" />
        <path d="M18,-1 h12 l-1.4,3 h-9.2z" fill={P.brass} {...o} strokeWidth="1.3" />
      </g>
    </g>
  );
}

// ───────────────────────────── the two lanterns on the lamp lane ─────────────────────────────

export const LANTERN_BOX: Box = { x: -16, y: -46, w: 32, h: 50 };

/** A paper lantern on a short string. The pale one is the ghost of your best week; the warm one is this week. */
export function PaperLantern({ ghost }: { ghost?: boolean }) {
  const body = ghost ? '#cfe0ff' : '#ffcf78'; const rib = ghost ? '#8da4d8' : '#c9792f'; const glow = ghost ? 'url(#gm-ghostglow)' : 'url(#gm-lampglow)';
  return (
    <g className={ghost ? 'gm-pl gm-pl--ghost' : 'gm-pl'}>
      <circle cx="0" cy="-20" r="26" fill={glow} />
      <path d="M0,-46 V-36" stroke={INK} strokeWidth="1.6" />
      <path d="M-6,-36 h12 l-1.6,-4 h-8.8z" fill={ghost ? '#6f7fa8' : P.brass} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-11,-22 C-11,-34 -6,-36 0,-36 C6,-36 11,-34 11,-22 C11,-10 6,-6 0,-6 C-6,-6 -11,-10 -11,-22Z" fill={body} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M0,-36 V-6 M-6.4,-34 C-9,-26 -9,-16 -6.4,-8 M6.4,-34 C9,-26 9,-16 6.4,-8" stroke={rib} strokeWidth="1" fill="none" opacity=".8" />
      <path d="M-5,-4 h10 l-1.4,3 h-7.2z" fill={ghost ? '#6f7fa8' : P.brass} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    </g>
  );
}

// ───────────────────────────── the draught: leaves blown across the grounds ─────────────────────────────

export const LEAF_BOX: Box = { x: 0, y: 0, w: 120, h: 50 };

export function Leaves({ kind }: { kind: 'tail' | 'head' | 'cross' }) {
  const col = kind === 'head' ? '#e8a07a' : kind === 'cross' ? '#e6c46a' : '#9ed6a0';
  const leaf = (x: number, y: number, rot: number, s: number) => <path d="M0,0 Q5,-7 12,-1 Q5,6 0,0Z M0,0 L12,-1" transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} />;
  return (
    <g className={`gm-leaves gm-leaves--${kind}`} fill={col} stroke="#1b1840" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      {leaf(12, 28, -20, 1)}{leaf(44, 14, 24, 0.85)}{leaf(76, 30, -8, 1.1)}{leaf(104, 18, 30, 0.8)}
      <path d="M0,24 C20,20 30,32 52,26 S86,16 118,26" fill="none" stroke="#c9c5f0" strokeOpacity=".32" strokeWidth="1.6" />
    </g>
  );
}

// ───────────────────────────── your house's banner, by the gate ─────────────────────────────

export const BANNER_BOX: Box = { x: 0, y: 0, w: 56, h: 124 };

/** A banner on a pole beside the gate: in the house's colours with its crest once the Choosing has happened, plain grey wool before. */
export function Banner({ house }: { house: HouseId | null }) {
  const hc = house ? HOUSES[house].colors : null;
  const cloth = hc ? hc.main : '#6d6a8c'; const trim = hc ? hc.metal : '#a8a4c8'; const deep = hc ? hc.deep : '#38365a';
  return (
    <div className="gm-banner">
      <svg viewBox={`0 0 ${BANNER_BOX.w} ${BANNER_BOX.h}`} aria-hidden>
        <path d="M6,4 V122" stroke={INK} strokeWidth="4.4" strokeLinecap="round" /><path d="M6,4 V122" stroke="#6a66b0" strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
        <circle cx="6" cy="3" r="3" fill={P.brass} stroke={INK} strokeWidth="1.2" />
        <path d="M2,12 H54" stroke={INK} strokeWidth="3.6" strokeLinecap="round" /><path d="M2,12 H54" stroke={P.brass} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M10,14 H50 V86 L30,74 L10,86Z" fill={cloth} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M10,14 H50 V86 L30,74 L10,86Z" fill="none" stroke={trim} strokeWidth="1" strokeDasharray="3 3" transform="translate(0 0)" opacity=".8" />
        <path d="M44,16 V82 L50,86 V14Z" fill={deep} opacity=".45" />
        <path d="M13,84 L30,73 L47,84" stroke={trim} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {[16, 24, 32, 40, 48].map((x) => <path key={x} d={`M${x},14 v-2`} stroke={trim} strokeWidth="1.6" />)}
      </svg>
      {house ? <div className="gm-crest"><HouseCrest house={house} size={64} /></div> : <div className="gm-crest gm-crest--plain" />}
    </div>
  );
}
