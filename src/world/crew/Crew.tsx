import { useId, type ReactNode } from 'react';
import './crew.css';
import type { CrewId, Expr } from './types';
import { CAPTAIN_CHOICES, DEFAULT_CAPTAIN, type Captain } from '../voyage/voyageState';

/**
 * The crew of The Double Entry, drawn as plain SVG shapes (so they stay editable in any vector tool).
 * Every character shares one face system, so each of them can show the same ten expressions; what makes them
 * different is their head shape, hair, clothes and the thing they carry. Idle motion is CSS only (transform and opacity).
 */

export const INK = '#171c27';
const PAPER = '#fbfaf5';
const MOUTH = '#5b1f2b';
export const BRASS = '#d7a84a';
export const BRASS_DK = '#a97a28';

// ───────────────────────────── captain choices ─────────────────────────────
export const SKIN_TONES = [
  { skin: '#fbdcc3', shade: '#e6b997' }, { skin: '#f1c19b', shade: '#d89e75' }, { skin: '#d6a074', shade: '#b97f55' },
  { skin: '#b47a50', shade: '#975d38' }, { skin: '#8a5636', shade: '#6f4026' }, { skin: '#5d3a28', shade: '#482b1c' },
];
export const HAIR_COLORS = ['#2a1d19', '#5a3825', '#9a5b2e', '#d7a548', '#c2453a', '#e6ebf0', '#3d72ad'];
export const COAT_COLORS = ['#1f4e79', '#7a2230', '#2d6a4f', '#5f3f99', '#b5651d', '#27323d'];
export const HAIR_STYLE_NAMES = ['Short crop', 'Wavy', 'Top bun', 'Curly puff'];
export const ACCESSORY_NAMES = ['None', 'Hat', 'Bandana', 'Glasses'];
export const SKIN_NAMES = ['Porcelain', 'Peach', 'Honey', 'Bronze', 'Umber', 'Deep'];
export const HAIR_COLOR_NAMES = ['Ink', 'Chestnut', 'Auburn', 'Gold', 'Ember', 'Silver', 'Sea blue'];
export const COAT_NAMES = ['Navy', 'Burgundy', 'Forest', 'Violet', 'Rust', 'Slate'];

// ───────────────────────────── the face ─────────────────────────────
type EyeKind = 'open' | 'wide' | 'arcUp' | 'arcDown' | 'half' | 'angry' | 'worry';
type BrowKind = 'flat' | 'soft' | 'high' | 'down' | 'up' | 'arch' | 'low' | 'one';
type MouthKind = 'line' | 'smile' | 'grin' | 'cheer' | 'smirk' | 'wobble' | 'o' | 'flat' | 'side';

const EXPR: Record<Expr, { eye: EyeKind; brow: BrowKind; mouth: MouthKind; blush: boolean; gaze?: [number, number] }> = {
  neutral: { eye: 'open', brow: 'flat', mouth: 'line', blush: false },
  smile: { eye: 'open', brow: 'soft', mouth: 'smile', blush: true },
  grin: { eye: 'arcUp', brow: 'high', mouth: 'grin', blush: true },
  cheer: { eye: 'arcUp', brow: 'high', mouth: 'cheer', blush: true },
  determined: { eye: 'angry', brow: 'down', mouth: 'smirk', blush: false },
  worry: { eye: 'worry', brow: 'up', mouth: 'wobble', blush: false },
  surprise: { eye: 'wide', brow: 'arch', mouth: 'o', blush: false },
  sleepy: { eye: 'half', brow: 'low', mouth: 'flat', blush: false },
  proud: { eye: 'arcDown', brow: 'soft', mouth: 'smile', blush: true },
  think: { eye: 'open', brow: 'one', mouth: 'side', blush: false, gaze: [0.8, -0.9] },
};

/** Where the features sit on one character's head. */
export interface FaceSpec { cx: number; ey: number; ex: number; by: number; ny: number; my: number; s: number; skin: string; shade: string; brow: string; iris: string; browW?: number }

const BROW: Record<BrowKind, [number, number, number]> = {
  flat: [0, -2, 0], soft: [1, -3, 1], high: [-3, -7, -3], down: [-3, -1, 3], up: [3, -2, -5], arch: [-2, -9, -2], low: [3, 2, 3], one: [-2, -9, -2],
};

export function Face({ f, expr, gaze }: { f: FaceSpec; expr: Expr; gaze?: { x: number; y: number } }) {
  const e = EXPR[expr];
  const g = gaze ?? (e.gaze ? { x: e.gaze[0], y: e.gaze[1] } : { x: 0, y: 0 });
  const s = f.s;
  const eyes: ReactNode[] = []; const lids: ReactNode[] = []; const irises: ReactNode[] = []; const lines: ReactNode[] = [];
  const open = e.eye === 'open' || e.eye === 'wide' || e.eye === 'half' || e.eye === 'angry' || e.eye === 'worry';

  ([-1, 1] as const).forEach((side) => {
    const x = f.cx + side * f.ex; const y = f.ey;
    const outer = x + side * 8.6 * s; const inner = x - side * 8.6 * s;
    if (open) {
      const rx = (e.eye === 'wide' ? 8.9 : 7.7) * s; const ry = (e.eye === 'wide' ? 10.6 : 8.8) * s;
      eyes.push(<ellipse key={`e${side}`} cx={x} cy={y} rx={rx} ry={ry} fill={PAPER} stroke={INK} strokeWidth="1.8" />);
      const ir = (e.eye === 'wide' ? 4.1 : 4.9) * s;
      const ix = x + g.x * 2.3 * s; const iy = y + 0.7 * s + g.y * 2.1 * s;
      irises.push(
        <g key={`i${side}`}>
          <circle cx={ix} cy={iy} r={ir} fill={f.iris} />
          <circle cx={ix} cy={iy} r={ir * 0.5} fill={INK} />
          <circle cx={ix + 1.6 * s} cy={iy - 1.8 * s} r={1.5 * s} fill="#fff" />
          <circle cx={ix - 1.5 * s} cy={iy + 1.7 * s} r={0.75 * s} fill="#fff" opacity=".85" />
        </g>,
      );
      lines.push(<path key={`l${side}`} d={`M${x - 8.4 * s},${y - 1.2 * s} Q${x},${y - 12.6 * s} ${x + 8.4 * s},${y - 1.2 * s}`} stroke={INK} strokeWidth={3 * s} strokeLinecap="round" fill="none" />);
      if (e.eye === 'half') {
        lids.push(<path key={`h${side}`} d={`M${x - 10 * s},${y - 13 * s} H${x + 10 * s} V${y - 0.5 * s} H${x - 10 * s}Z`} fill={f.skin} />, <path key={`hl${side}`} d={`M${x - 8.6 * s},${y - 0.5 * s} H${x + 8.6 * s}`} stroke={INK} strokeWidth={2.6 * s} strokeLinecap="round" />);
      } else if (e.eye === 'angry') {
        lids.push(<path key={`a${side}`} d={`M${outer - side * 2 * s},${y - 13 * s} H${inner + side * 2 * s} V${y + 1.4 * s} L${outer - side * 2 * s},${y - 6.4 * s}Z`} fill={f.skin} />,
          <path key={`al${side}`} d={`M${outer},${y - 6.2 * s} L${inner},${y + 1.2 * s}`} stroke={INK} strokeWidth={2.8 * s} strokeLinecap="round" />);
      } else if (e.eye === 'worry') {
        lids.push(<path key={`w${side}`} d={`M${outer - side * 2 * s},${y - 13 * s} H${inner + side * 2 * s} V${y - 8.4 * s} L${outer - side * 2 * s},${y - 0.8 * s}Z`} fill={f.skin} />,
          <path key={`wl${side}`} d={`M${outer},${y - 1.2 * s} L${inner},${y - 8.2 * s}`} stroke={INK} strokeWidth={2.8 * s} strokeLinecap="round" />);
      }
    } else if (e.eye === 'arcUp') {
      lines.push(<path key={`u${side}`} d={`M${x - 8 * s},${y + 3 * s} Q${x},${y - 9 * s} ${x + 8 * s},${y + 3 * s}`} stroke={INK} strokeWidth={3.5 * s} strokeLinecap="round" fill="none" />);
    } else {
      lines.push(<path key={`d${side}`} d={`M${x - 8 * s},${y - 0.5 * s} Q${x},${y + 7 * s} ${x + 8 * s},${y - 0.5 * s}`} stroke={INK} strokeWidth={3.3 * s} strokeLinecap="round" fill="none" />);
    }
  });

  const [yo, ym, yi] = BROW[e.brow];
  const brows = ([-1, 1] as const).map((side) => {
    const x = f.cx + side * f.ex; const outer = x + side * 9.6 * s; const inner = x - side * 9.6 * s;
    let a = yo; let b = ym; let c = yi;
    if (e.brow === 'one' && side === 1) { a = 1; b = 0; c = 2; }
    return <path key={`b${side}`} d={`M${outer},${f.by + a} Q${x},${f.by + b} ${inner},${f.by + c}`} stroke={f.brow} strokeWidth={f.browW ?? 3.7} strokeLinecap="round" fill="none" />;
  });

  const m = f.cx; const y = f.my;
  const mouths: Record<MouthKind, ReactNode> = {
    line: <path d={`M${m - 6},${y} Q${m},${y + 1.8} ${m + 6},${y}`} stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />,
    smile: <path d={`M${m - 9.5},${y - 1.5} Q${m},${y + 9.5} ${m + 9.5},${y - 1.5}`} stroke={INK} strokeWidth="2.9" strokeLinecap="round" fill="none" />,
    grin: <g><path d={`M${m - 11.5},${y - 2.4} Q${m},${y + 3} ${m + 11.5},${y - 2.4} Q${m + 8},${y + 12} ${m},${y + 12} Q${m - 8},${y + 12} ${m - 11.5},${y - 2.4}Z`} fill={MOUTH} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d={`M${m - 9.6},${y - 1.2} Q${m},${y + 3.4} ${m + 9.6},${y - 1.2} L${m + 8.6},${y + 2.6} Q${m},${y + 6} ${m - 8.6},${y + 2.6}Z`} fill={PAPER} />
      <ellipse cx={m} cy={y + 9} rx="5" ry="2.6" fill="#ee7f8b" /></g>,
    cheer: <g><path d={`M${m - 12.5},${y - 3.4} Q${m},${y + 2} ${m + 12.5},${y - 3.4} Q${m + 12},${y + 15} ${m},${y + 15} Q${m - 12},${y + 15} ${m - 12.5},${y - 3.4}Z`} fill={MOUTH} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d={`M${m - 10.6},${y - 2} Q${m},${y + 3} ${m + 10.6},${y - 2} L${m + 9.6},${y + 2.4} Q${m},${y + 6.2} ${m - 9.6},${y + 2.4}Z`} fill={PAPER} />
      <ellipse cx={m} cy={y + 11.4} rx="6.6" ry="3.4" fill="#ee7f8b" /></g>,
    smirk: <g><path d={`M${m - 8},${y + 1.6} Q${m},${y + 3.4} ${m + 8.4},${y - 1.4}`} stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d={`M${m + 8.4},${y - 1.4} q2.4,-0.4 3.2,-2.6`} stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" /></g>,
    wobble: <path d={`M${m - 7.4},${y + 2.4} Q${m - 3.7},${y - 1.2} ${m},${y + 2} Q${m + 3.7},${y + 5.2} ${m + 7.4},${y + 1.6}`} stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />,
    o: <ellipse cx={m} cy={y + 3} rx="4.4" ry="5.4" fill={MOUTH} stroke={INK} strokeWidth="2.2" />,
    flat: <path d={`M${m - 5.2},${y + 1.4} H${m + 5.2}`} stroke={INK} strokeWidth="2.6" strokeLinecap="round" />,
    side: <path d={`M${m - 3.6},${y + 3} Q${m + 3},${y} ${m + 8.4},${y - 3}`} stroke={INK} strokeWidth="2.7" strokeLinecap="round" fill="none" />,
  };

  return (
    <g className="cr-face" key={expr}>
      {e.blush ? <g opacity=".5"><ellipse cx={f.cx - f.ex - 9} cy={f.ey + 14} rx={7.4 * s} ry={4.2 * s} fill="#ff7a86" /><ellipse cx={f.cx + f.ex + 9} cy={f.ey + 14} rx={7.4 * s} ry={4.2 * s} fill="#ff7a86" /></g> : null}
      {open ? (
        <g className="cr-eyes">{eyes}<g className="cr-gaze">{irises}</g>{lids}</g>
      ) : null}
      {lines}
      {brows}
      <path d={`M${f.cx - 1},${f.ny - 5} Q${f.cx + 3.6},${f.ny + 1.4} ${f.cx - 1.2},${f.ny + 3.4}`} stroke={f.shade} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {mouths[e.mouth]}
    </g>
  );
}

/** A silhouette made of overlapping shapes: drawn once as ink, once as colour, so only the outer edge is outlined. */
function Union({ fill, ink = INK, w = 4.6, children }: { fill: string; ink?: string; w?: number; children: (p: { fill: string; stroke?: string; strokeWidth?: number }) => ReactNode }) {
  return <>{children({ fill: ink, stroke: ink, strokeWidth: w })}{children({ fill })}</>;
}

const o = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

// ───────────────────────────── Sol, the captain ─────────────────────────────
function Sol({ c, expr, gaze }: { c: Captain; expr: Expr; gaze?: { x: number; y: number } }) {
  const { skin, shade } = SKIN_TONES[c.skin]; const hair = HAIR_COLORS[c.hairColor]; const coat = COAT_COLORS[c.coat];
  const f: FaceSpec = { cx: 80, ey: 84, ex: 15.5, by: 70, ny: 97, my: 107, s: 1, skin, shade, brow: hair === '#e6ebf0' ? '#9aa3ad' : hair, iris: '#3b2f2a' };
  const st = c.hair;
  return (
    <>
      {/* hair behind the head */}
      <g className="cr-sway">
        {st === 1 ? <path d="M39,86 C32,56 54,34 80,34 C106,34 128,56 121,86 C126,106 124,122 116,134 L44,134 C36,122 34,106 39,86Z" fill={hair} {...o} /> : null}
        {st === 2 && c.accessory !== 1 ? <><circle cx="80" cy="33" r="15" fill={hair} {...o} /><path d="M70,44 Q80,50 90,44" stroke={BRASS} strokeWidth="3.4" fill="none" strokeLinecap="round" /></> : null}
        {st === 3 ? <circle cx="80" cy="62" r="50" fill={hair} {...o} /> : null}
      </g>
      <g className="cr-breathe">
        <path d="M69,110 L69,138 Q80,146 91,138 L91,110Z" fill={shade} {...o} />
        <path d="M14,192 C14,158 30,142 58,135 L80,160 L102,135 C130,142 146,158 146,192Z" fill={coat} {...o} />
        <path d="M58,135 L80,160 L102,135 L96,130 Q80,144 64,130Z" fill="#f4ecd8" {...o} />
        <path d="M58,135 L66,176 L80,160Z" fill="#fff" opacity=".1" /><path d="M102,135 L94,176 L80,160Z" fill="#000" opacity=".14" />
        <g fill={BRASS} stroke={INK} strokeWidth="1.6">
          <circle cx="62" cy="178" r="3.2" /><circle cx="62" cy="189" r="3.2" /><circle cx="98" cy="178" r="3.2" /><circle cx="98" cy="189" r="3.2" />
          <ellipse cx="33" cy="152" rx="15" ry="5.4" transform="rotate(-26 33 152)" /><ellipse cx="127" cy="152" rx="15" ry="5.4" transform="rotate(26 127 152)" />
        </g>
        {/* the brass compass on its chain */}
        <path d="M67,134 Q80,174 93,134" stroke={BRASS} strokeWidth="2.2" fill="none" />
        <g className="cr-compass"><circle cx="80" cy="166" r="9" fill={BRASS} stroke={INK} strokeWidth="2" /><circle cx="80" cy="166" r="6.2" fill="#f7efd7" stroke={BRASS_DK} strokeWidth="1" />
          <path d="M80,160.6 L82.2,166 L80,171.4 L77.8,166Z" fill="#c43d3d" stroke={INK} strokeWidth=".8" /></g>
      </g>
      <g className="cr-head">
        <ellipse cx="45" cy="88" rx="6.4" ry="8.6" fill={skin} {...o} /><ellipse cx="115" cy="88" rx="6.4" ry="8.6" fill={skin} {...o} />
        <ellipse cx="80" cy="84" rx="35" ry="39" fill={skin} {...o} />
        <path d="M103,64 Q119,92 99,115 Q112,100 103,64Z" fill={shade} opacity=".55" />
        <Face f={f} expr={expr} gaze={gaze} />
        {/* hair in front */}
        {st === 0 || st === 2 ? <path d="M43,84 C40,50 62,38 80,38 C98,38 120,50 117,84 C114,68 104,60 92,58 C84,64 66,64 58,58 C52,62 45,72 43,84Z" fill={hair} {...o} /> : null}
        {st === 1 ? <><path d="M44,82 C42,52 62,38 80,38 C100,38 118,52 116,82 C112,70 104,62 92,60 C84,70 70,72 58,70 C50,72 46,76 44,82Z" fill={hair} {...o} />
          <path d="M44,84 C41,100 46,112 53,119 C54,104 51,92 53,84Z" fill={hair} {...o} /><path d="M116,84 C119,100 114,112 107,119 C106,104 109,92 107,84Z" fill={hair} {...o} /></> : null}
        {st === 3 ? <path d="M45,78 C45,52 62,46 80,46 C98,46 115,52 115,78 C110,66 100,58 80,58 C60,58 50,66 45,78Z" fill={hair} {...o} /> : null}
        <path d="M58,50 Q70,42 86,43" stroke="#fff" strokeOpacity=".22" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        {c.accessory === 1 ? (
          <g transform="translate(0,-10)">
            <path d="M46,66 C50,32 110,32 114,66Z" fill="#1d2a44" {...o} />
            <path d="M28,68 Q80,46 132,68 Q80,80 28,68Z" fill="#26375a" {...o} />
            <path d="M46,64 Q80,52 114,64" stroke={BRASS} strokeWidth="4.4" fill="none" strokeLinecap="round" />
            <circle cx="80" cy="46" r="4.6" fill={BRASS} stroke={INK} strokeWidth="1.8" />
          </g>
        ) : null}
        {c.accessory === 2 ? (
          <g>
            <path d="M44,66 Q80,50 116,66 L116,76 Q80,62 44,76Z" fill="#c43d3d" {...o} />
            <path d="M112,64 L134,56 L130,72Z M112,70 L132,84 L124,64Z" fill="#a82f2f" {...o} />
            <g fill="#fff" opacity=".7"><circle cx="62" cy="64" r="1.7" /><circle cx="80" cy="60" r="1.7" /><circle cx="98" cy="64" r="1.7" /></g>
          </g>
        ) : null}
        {c.accessory === 3 ? (
          <g fill="rgba(210,238,244,.16)" stroke={INK} strokeWidth="2.6">
            <circle cx="64.5" cy="84" r="12" /><circle cx="95.5" cy="84" r="12" /><path d="M76.5,83 Q80,80 83.5,83" fill="none" /><path d="M52.5,82 L46,80 M107.5,82 L114,80" fill="none" strokeLinecap="round" />
          </g>
        ) : null}
      </g>
    </>
  );
}

// ───────────────────────────── Odalys Quill, the navigator ─────────────────────────────
function Odalys({ expr, gaze }: { expr: Expr; gaze?: { x: number; y: number } }) {
  const skin = '#c88a62'; const shade = '#a76b46'; const hair = '#3a2b30'; const coat = '#2a6b72';
  const f: FaceSpec = { cx: 80, ey: 85, ex: 15.5, by: 70, ny: 98, my: 108, s: 1, skin, shade, brow: '#2c2025', iris: '#4a3a2a' };
  const curls = [[44, 84, 15], [40, 106, 13], [116, 84, 15], [120, 106, 13], [58, 52, 18], [80, 44, 20], [102, 50, 18], [76, 60, 20]];
  return (
    <>
      <g className="cr-sway">
        <Union fill={hair}>{(p) => curls.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} {...p} />)}</Union>
        <circle cx="106" cy="30" r="16" fill={INK} stroke={INK} strokeWidth="4.6" /><circle cx="106" cy="30" r="16" fill={hair} />
        <path d="M98,26 Q104,18 114,22" stroke="#dfe3ea" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* the quill in the bun */}
        <path d="M100,38 L142,-2" stroke={INK} strokeWidth="6" strokeLinecap="round" /><path d="M100,38 L142,-2" stroke="#f0e6d0" strokeWidth="3" strokeLinecap="round" />
        <path d="M122,18 C136,20 146,10 150,-4 C136,0 124,6 118,16Z" fill="#f7f0e0" {...o} strokeWidth="2" />
      </g>
      <g className="cr-breathe">
        <path d="M69,110 L69,138 Q80,146 91,138 L91,110Z" fill={shade} {...o} />
        <path d="M14,192 C14,158 30,142 56,136 L104,136 C130,142 146,158 146,192Z" fill={coat} {...o} />
        <path d="M54,136 L62,112 L76,132Z" fill="#348089" {...o} /><path d="M106,136 L98,112 L84,132Z" fill="#348089" {...o} />
        <path d="M70,136 Q80,150 90,136" fill="#f4ecd8" {...o} />
        <g fill={BRASS} stroke={INK} strokeWidth="1.6"><circle cx="58" cy="168" r="3" /><circle cx="58" cy="180" r="3" /></g>
        <path d="M14,192 C14,170 22,158 34,152 L40,192Z" fill="#000" opacity=".08" />
        {/* an astrolabe, held up for reading */}
        <g className="cr-astro">
          <circle cx="114" cy="160" r="25" fill="none" stroke={INK} strokeWidth="8.4" /><circle cx="114" cy="160" r="25" fill="rgba(255,226,150,.14)" stroke={BRASS} strokeWidth="5" />
          <circle cx="114" cy="160" r="17" fill="none" stroke={BRASS_DK} strokeWidth="1.8" /><path d="M114,140 V180 M94,160 H134" stroke={BRASS_DK} strokeWidth="1.4" />
          <path d="M114,148 L117,160 L114,172 L111,160Z" fill="#c43d3d" stroke={INK} strokeWidth="1" />
          <circle cx="114" cy="133" r="3.6" fill={BRASS} stroke={INK} strokeWidth="1.4" />
        </g>
        <ellipse cx="92" cy="176" rx="8.4" ry="7" fill={skin} {...o} />
      </g>
      <g className="cr-head">
        <ellipse cx="45" cy="90" rx="6" ry="8.2" fill={skin} {...o} /><ellipse cx="115" cy="90" rx="6" ry="8.2" fill={skin} {...o} />
        <ellipse cx="80" cy="85" rx="34" ry="38" fill={skin} {...o} />
        <path d="M103,66 Q118,92 99,114 Q112,100 103,66Z" fill={shade} opacity=".5" />
        <Face f={f} expr={expr} gaze={gaze} />
        <path d="M45,82 C44,54 64,42 82,42 C100,42 116,56 115,82 C108,68 98,62 84,60 C72,64 56,68 45,82Z" fill={hair} {...o} />
        <path d="M52,70 Q58,54 76,48" stroke="#dfe3ea" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* half-moon glasses */}
        <g fill="rgba(215,238,244,.2)" stroke={BRASS} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M53.5,83 H77.5 Q77.5,98 65.5,98 Q53.5,98 53.5,83Z" /><path d="M82.5,83 H106.5 Q106.5,98 94.5,98 Q82.5,98 82.5,83Z" />
          <path d="M77.5,84 Q80,81.6 82.5,84" fill="none" /><path d="M53.5,84 L46,82 M106.5,84 L114,82" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </>
  );
}

// ───────────────────────────── Tally Fenn, the quartermaster ─────────────────────────────
function Tally({ expr, gaze }: { expr: Expr; gaze?: { x: number; y: number } }) {
  const skin = '#e0b088'; const shade = '#c4936b'; const hair = '#bf5a2f';
  const f: FaceSpec = { cx: 80, ey: 93, ex: 16, by: 81, ny: 104, my: 113, s: 1.06, skin, shade, brow: '#8f3d1f', iris: '#2f6b46' };
  return (
    <>
      <g className="cr-breathe">
        <path d="M70,118 L70,140 Q80,146 90,140 L90,118Z" fill={shade} {...o} />
        <path d="M26,192 C26,160 42,144 64,140 L96,140 C118,144 134,160 134,192Z" fill="#f4efe2" {...o} />
        <path d="M64,140 L80,174 L96,140 L110,146 L104,192 L56,192 L50,146Z" fill="#6b4a2f" {...o} />
        <g fill={BRASS} stroke={INK} strokeWidth="1.5"><circle cx="80" cy="168" r="2.8" /><circle cx="80" cy="180" r="2.8" /></g>
        <path d="M80,142 L64,134 L64,150Z M80,142 L96,134 L96,150Z" fill="#c43d3d" {...o} /><circle cx="80" cy="142" r="4.4" fill="#a82f2f" {...o} />
        <rect x="28" y="160" width="12" height="8" rx="2" transform="rotate(-18 34 164)" fill="#c43d3d" {...o} strokeWidth="1.8" /><rect x="120" y="160" width="12" height="8" rx="2" transform="rotate(18 126 164)" fill="#c43d3d" {...o} strokeWidth="1.8" />
      </g>
      <g className="cr-head">
        <circle cx="42" cy="86" r="9" fill={hair} {...o} /><circle cx="118" cy="86" r="9" fill={hair} {...o} />
        <ellipse cx="42" cy="94" rx="6" ry="8" fill={skin} {...o} /><ellipse cx="118" cy="94" rx="6" ry="8" fill={skin} {...o} />
        <ellipse cx="80" cy="90" rx="38" ry="36" fill={skin} {...o} />
        <path d="M106,70 Q122,96 100,120 Q114,104 106,70Z" fill={shade} opacity=".5" />
        <g fill="#b8723f" opacity=".75"><circle cx="56" cy="104" r="1.5" /><circle cx="62" cy="108" r="1.5" /><circle cx="52" cy="110" r="1.5" /><circle cx="104" cy="104" r="1.5" /><circle cx="98" cy="108" r="1.5" /><circle cx="108" cy="110" r="1.5" /></g>
        <Face f={f} expr={expr} gaze={gaze} />
        {/* the green eyeshade */}
        <path d="M38,80 C38,50 122,50 122,80 C122,84 118,86 114,84 C96,72 64,72 46,84 C42,86 38,84 38,80Z" fill="#2e8f5e" {...o} />
        <path d="M44,82 C60,72 100,72 116,82 L118,88 C100,78 60,78 42,88Z" fill="#1f6e47" {...o} strokeWidth="2" />
        <path d="M52,67 Q66,59 82,59" stroke="#fff" strokeOpacity=".3" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        {/* a pencil behind the ear */}
        <path d="M122,92 L132,70" stroke={INK} strokeWidth="6" strokeLinecap="round" /><path d="M122,92 L132,70" stroke="#e8a33b" strokeWidth="3" strokeLinecap="round" /><path d="M133,68 L134.6,64" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* a ledger bigger than the one who carries it */}
      <g className="cr-ledger">
        <rect x="32" y="152" width="98" height="46" rx="4" fill="#f7efd7" {...o} />
        <rect x="26" y="158" width="108" height="42" rx="5" fill="#7a1f2b" {...o} />
        <rect x="26" y="158" width="11" height="42" rx="3" fill="#5a1520" {...o} strokeWidth="1.8" />
        <path d="M46,170 H122 M46,178 H112 M46,186 H118" stroke={BRASS} strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
        <path d="M134,158 l-9,0 l9,9Z M134,200 l-9,0 l9,-9Z" fill={BRASS} stroke={INK} strokeWidth="1.4" />
        <circle cx="29" cy="178" r="7.6" fill={skin} {...o} /><circle cx="133" cy="178" r="7.6" fill={skin} {...o} />
      </g>
    </>
  );
}

// ───────────────────────────── Brine Hollis, the shipwright ─────────────────────────────
function Brine({ expr, gaze }: { expr: Expr; gaze?: { x: number; y: number } }) {
  const skin = '#a8683f'; const shade = '#8a502d'; const hair = '#5c554c'; const beard = '#3a3029';
  const f: FaceSpec = { cx: 80, ey: 86, ex: 16.5, by: 72, ny: 99, my: 108, s: 0.94, skin, shade, brow: '#3a3029', iris: '#2a3a45', browW: 5.2 };
  const clip = useId().replace(/:/g, '');
  return (
    <>
      <g className="cr-breathe">
        <clipPath id={`${clip}c`}><path d="M2,192 C2,158 22,142 52,137 L108,137 C138,142 158,158 158,192Z" /></clipPath>
        <path d="M66,112 L66,140 Q80,148 94,140 L94,112Z" fill={shade} {...o} />
        <path d="M2,192 C2,158 22,142 52,137 L108,137 C138,142 158,158 158,192Z" fill="#26466a" {...o} />
        <g clipPath={`url(#${clip}c)`} stroke="#e8e2d0" strokeWidth="5" opacity=".9"><path d="M0,150 H160 M0,164 H160 M0,178 H160" /></g>
        <path d="M60,141 L52,192 H108 L100,141 L90,152 H70Z" fill="#c89d62" {...o} />
        <path d="M70,152 H90 L94,192 H66Z" fill="#d6ae74" {...o} strokeWidth="2" /><rect x="72" y="164" width="16" height="12" rx="2" fill="#b98a4f" {...o} strokeWidth="1.8" />
        <path d="M2,192 C2,168 8,156 18,150 L24,192Z" fill="#000" opacity=".1" />
        {/* the mallet */}
        <g className="cr-mallet">
          <path d="M26,196 L18,122" stroke={INK} strokeWidth="13" strokeLinecap="round" /><path d="M26,196 L18,122" stroke="#9a6a35" strokeWidth="8.4" strokeLinecap="round" />
          <rect x="2" y="102" width="34" height="22" rx="5" transform="rotate(-8 19 113)" fill="#7a4e24" {...o} />
          <path d="M9,104 L9,124 M29,102 L29,122" stroke="#59606a" strokeWidth="3.6" transform="rotate(-8 19 113)" />
        </g>
      </g>
      <g className="cr-head">
        <ellipse cx="41" cy="92" rx="6.4" ry="9" fill={skin} {...o} /><ellipse cx="119" cy="92" rx="6.4" ry="9" fill={skin} {...o} />
        <path d="M42,70 C42,48 118,48 118,70 L120,96 C118,122 100,131 80,131 C60,131 42,122 40,96Z" fill={skin} {...o} />
        <path d="M44,74 C46,56 70,50 80,50 C92,50 114,56 116,74 C106,66 94,62 80,62 C66,62 54,66 44,74Z" fill={hair} {...o} />
        <Face f={f} expr={expr} gaze={gaze} />
        {/* beard: a band along the jaw, with a salt-white streak */}
        <path d="M41,92 C40,128 60,142 80,142 C100,142 120,128 119,92 L110,100 C107,114 98,121 80,121 C62,121 53,114 50,100Z" fill={beard} {...o} />
        <path d="M78,121 Q80,134 84,140" stroke="#f1f1ea" strokeWidth="6.4" strokeLinecap="round" fill="none" />
        <path d="M59,98 Q70,92 78,99 M101,98 Q90,92 82,99" stroke={beard} strokeWidth="5.4" strokeLinecap="round" fill="none" />
        {/* goggles pushed up */}
        <path d="M39,62 Q80,44 121,62 L121,73 Q80,56 39,73Z" fill="#3d3229" {...o} />
        <g><circle cx="62" cy="54" r="13.4" fill={INK} /><circle cx="98" cy="54" r="13.4" fill={INK} />
          <circle cx="62" cy="54" r="11" fill="#7fd3d8" stroke={BRASS} strokeWidth="3.4" /><circle cx="98" cy="54" r="11" fill="#7fd3d8" stroke={BRASS} strokeWidth="3.4" />
          <path d="M55,50 Q59,45 65,46 M91,50 Q95,45 101,46" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity=".75" /></g>
      </g>
    </>
  );
}

// ───────────────────────────── Saffron Pell, the cook ─────────────────────────────
function Saffron({ expr, gaze }: { expr: Expr; gaze?: { x: number; y: number } }) {
  const skin = '#8c5a3c'; const shade = '#714428'; const hair = '#2c1c14'; const cloth = '#efe3c8'; const saf = '#e39b2d';
  const f: FaceSpec = { cx: 80, ey: 87, ex: 15.5, by: 73, ny: 100, my: 110, s: 1.03, skin, shade, brow: '#24160f', iris: '#3a2418' };
  const clip = useId().replace(/:/g, '');
  const scarf = 'M39,86 C32,48 58,28 80,28 C104,28 128,48 121,86 C114,66 98,57 80,57 C62,57 46,66 39,86Z';
  return (
    <>
      <g className="cr-breathe">
        <path d="M69,112 L69,140 Q80,148 91,140 L91,112Z" fill={shade} {...o} />
        <path d="M14,192 C14,158 30,142 58,136 L102,136 C130,142 146,158 146,192Z" fill="#2f7f86" {...o} />
        <path d="M62,138 Q80,156 98,138" fill={shade} {...o} />
        <path d="M58,152 L102,152 L118,192 L42,192Z" fill={cloth} {...o} /><path d="M58,152 H102" stroke={saf} strokeWidth="5" />
        <path d="M60,138 L58,152 M100,138 L102,152" stroke={INK} strokeWidth="7" strokeLinecap="round" /><path d="M60,138 L58,152 M100,138 L102,152" stroke={cloth} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M48,176 H112" stroke={saf} strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" />
        {/* a ladle */}
        <g className="cr-ladle">
          <path d="M138,198 L124,136" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M138,198 L124,136" stroke="#9a6a35" strokeWidth="5" strokeLinecap="round" />
          <path d="M108,124 a16,16 0 0 0 32,0Z" fill={BRASS} {...o} /><ellipse cx="124" cy="124" rx="16" ry="4.4" fill="#f2d78c" {...o} strokeWidth="1.8" />
        </g>
        {/* a teapot with steam */}
        <g className="cr-pot">
          <ellipse cx="38" cy="176" rx="20" ry="15" fill="#c94f3d" {...o} /><path d="M20,172 Q38,180 56,172" stroke={cloth} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M20,168 Q8,162 6,150 Q14,156 24,160Z" fill="#c94f3d" {...o} /><path d="M56,168 Q70,168 62,184" fill="none" stroke={INK} strokeWidth="7.6" strokeLinecap="round" /><path d="M56,168 Q70,168 62,184" fill="none" stroke="#c94f3d" strokeWidth="4" strokeLinecap="round" />
          <rect x="30" y="158" width="16" height="6" rx="3" fill="#a93e30" {...o} strokeWidth="1.8" /><circle cx="38" cy="156" r="3" fill={BRASS} stroke={INK} strokeWidth="1.4" />
          <g className="cr-steam" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M6,146 Q0,138 6,130 Q12,122 6,114" opacity=".5" /><path d="M14,148 Q20,140 14,132 Q8,124 14,116" opacity=".35" /></g>
        </g>
      </g>
      <g className="cr-head">
        <Union fill={hair}>{(p) => [[56, 66, 6], [70, 60, 6], [92, 60, 6], [106, 66, 6]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} {...p} />)}</Union>
        <ellipse cx="45" cy="92" rx="6" ry="8.4" fill={skin} {...o} /><ellipse cx="115" cy="92" rx="6" ry="8.4" fill={skin} {...o} />
        <circle cx="44" cy="103" r="5.2" fill="none" stroke={BRASS} strokeWidth="2.2" /><circle cx="116" cy="103" r="5.2" fill="none" stroke={BRASS} strokeWidth="2.2" />
        <ellipse cx="80" cy="87" rx="35" ry="38" fill={skin} {...o} />
        <path d="M104,68 Q120,94 100,116 Q112,102 104,68Z" fill={shade} opacity=".55" />
        <Face f={f} expr={expr} gaze={gaze} />
        {/* the sail-cloth headscarf */}
        <g className="cr-sway">
          <path d="M104,46 C118,34 136,40 140,54 C126,52 114,58 104,46Z" fill={cloth} {...o} /><path d="M118,54 C132,66 130,82 122,92 C122,76 114,64 108,54Z" fill={cloth} {...o} />
          <path d="M126,46 L134,52" stroke={saf} strokeWidth="3" strokeLinecap="round" />
        </g>
        <clipPath id={`${clip}s`}><path d={scarf} /></clipPath>
        <path d={scarf} fill={cloth} {...o} />
        <g clipPath={`url(#${clip}s)`} stroke={saf} strokeWidth="5.4" fill="none" strokeLinecap="round"><path d="M34,62 Q80,34 126,62" /><path d="M32,74 Q80,46 128,74" /><path d="M30,48 Q80,20 130,48" /></g>
        <path d="M52,50 Q66,40 84,40" stroke="#fff" strokeOpacity=".4" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </g>
    </>
  );
}

// ───────────────────────────── the public component ─────────────────────────────
export function Crew({ who, expr = 'neutral', size = 120, captain, gaze, still, className, title }: {
  who: CrewId; expr?: Expr; size?: number; captain?: Captain; gaze?: { x: number; y: number }; still?: boolean; className?: string; title?: string;
}) {
  const cap = captain ?? DEFAULT_CAPTAIN;
  const delay = { sol: -1.2, odalys: -3.1, tally: -0.4, brine: -2.2, saffron: -4.3 }[who];
  return (
    <span className={`cr cr--${who}${still ? ' is-still' : ''}${className ? ` ${className}` : ''}`} style={{ width: size, height: size * 1.1875, ['--cr-delay' as string]: `${delay}s` }} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <svg viewBox="0 0 160 190" width={size} height={size * 1.1875} fill="none">
        {who === 'sol' ? <Sol c={cap} expr={expr} gaze={gaze} /> : null}
        {who === 'odalys' ? <Odalys expr={expr} gaze={gaze} /> : null}
        {who === 'tally' ? <Tally expr={expr} gaze={gaze} /> : null}
        {who === 'brine' ? <Brine expr={expr} gaze={gaze} /> : null}
        {who === 'saffron' ? <Saffron expr={expr} gaze={gaze} /> : null}
      </svg>
    </span>
  );
}

/** Used by the captain editor to keep choices inside the lists. */
export const captainChoices = CAPTAIN_CHOICES;
