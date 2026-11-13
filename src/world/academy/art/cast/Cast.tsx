import { useId, type ReactNode } from 'react';
import './cast.css';
import { Face, INK, BRASS, BRASS_DK, SKIN_TONES, HAIR_COLORS, type FaceSpec } from '../../../crew/Crew';
import type { Expr } from '../../../crew/types';
import { HOUSES, type HouseId } from '../../houses';
import { darken, lighten, rng } from '../kit';
import { DEFAULT_STUDENT, ROBE_COLORS, type CastId, type StudentLook } from './types';

/**
 * The people of Lanternfell, drawn as plain SVG shapes (so they stay editable in any vector tool). They share the crew's face system, so every
 * one of them can show the same ten expressions, but nothing else is shared: each has their own head, hair, cloth and the thing they carry.
 * The light is the school's one moon, high on the upper left: every big shape takes a cool rim on its left and falls into blue-violet on its right.
 * Idle motion is CSS only (transform and opacity): see cast.css and the crew's own sheet.
 */

const o = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const f1 = (n: number) => Math.round(n * 10) / 10;
type Gaze = { x: number; y: number };

/** A filled outline with the moonlight pass laid over it. */
function Piece({ d, fill, m, sw = 2.2, moon = true }: { d: string; fill: string; m: string; sw?: number; moon?: boolean }) {
  return (
    <>
      <path d={d} fill={fill} {...o} strokeWidth={sw} />
      {moon ? <path d={d} fill={`url(#${m}-m)`} /> : null}
    </>
  );
}

/** A point on a cubic curve and its direction there. */
function bez(p: [number, number][], t: number) {
  const u = 1 - t; const [a, b, c, d] = p;
  const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
  const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
  const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
  const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
  return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** A plait: leaf-shaped strands laid along a curve, leaning left and right in turn, thinner at both ends. */
function Braid({ p, n, wide, base, lit, deep }: { p: [number, number][]; n: number; wide: number; base: string; lit: string; deep: string }) {
  const d = `M${p[0][0]},${p[0][1]} C${p[1][0]},${p[1][1]} ${p[2][0]},${p[2][1]} ${p[3][0]},${p[3][1]}`;
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth={wide * 1.5 + 2.6} strokeLinecap="round" fill="none" />
      <path d={d} stroke={deep} strokeWidth={wide * 1.5} strokeLinecap="round" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n; const q = bez(p, t); const s = 0.74 + 0.26 * Math.sin(Math.PI * t);
        const odd = i % 2 === 1;
        return (
          <g key={i} transform={`translate(${f1(q.x)} ${f1(q.y)}) rotate(${f1(q.a + (odd ? 33 : -33))}) scale(${f1(s)})`}>
            <ellipse rx={wide} ry={wide * 0.56} fill={odd ? base : lit} stroke={deep} strokeWidth="1" />
            <path d={`M${-wide * 0.62},0 Q0,${-wide * 0.2} ${wide * 0.62},0`} stroke={deep} strokeWidth=".8" fill="none" opacity=".55" />
          </g>
        );
      })}
    </g>
  );
}

function Strands({ d, color, w = 1.4, op = 0.7 }: { d: string[]; color: string; w?: number; op?: number }) {
  return <g stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" opacity={op}>{d.map((x, i) => <path key={i} d={x} />)}</g>;
}

/** A tiny brass lantern, used as a badge and on the headmistress's staff. */
function Flame({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="ac-flame">
        <path d="M0,0 C-5,-4 -3.4,-9 0,-14 C3.4,-9 5,-4 0,0Z" fill="#ff9a3c" />
        <path d="M0,-0.4 C-2.6,-2.6 -1.8,-6 0,-9 C1.8,-6 2.6,-2.6 0,-0.4Z" fill="#fff3c4" />
      </g>
    </g>
  );
}

function CastDefs({ m }: { m: string }) {
  return (
    <defs>
      {/* the moon pass: a cool rim on the left, blue-violet shade on the right; laid over any outline with fill="url(#…-m)" */}
      <linearGradient id={`${m}-m`} x1="0" y1="0" x2="1" y2=".28">
        <stop offset="0" stopColor="#dbe7ff" stopOpacity=".28" /><stop offset=".3" stopColor="#dbe7ff" stopOpacity="0" />
        <stop offset=".58" stopColor="#0f1848" stopOpacity="0" /><stop offset="1" stopColor="#0f1848" stopOpacity=".38" />
      </linearGradient>
      <radialGradient id={`${m}-glow`}><stop offset="0" stopColor="#ffe3a0" stopOpacity=".95" /><stop offset=".35" stopColor="#ffb85a" stopOpacity=".4" /><stop offset="1" stopColor="#ff9a3a" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${m}-glass`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff0b8" /><stop offset="1" stopColor="#ffae48" /></linearGradient>
      <pattern id={`${m}-knit`} width="7" height="9" patternUnits="userSpaceOnUse"><path d="M0,1.5 L3.5,7 L7,1.5" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></pattern>
      <pattern id={`${m}-plaid`} width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="4" fill="#06241a" opacity=".42" /><rect width="4" height="22" fill="#06241a" opacity=".42" />
        <rect y="11" width="22" height="1.2" fill="#d7f5df" opacity=".5" /><rect x="11" width="1.2" height="22" fill="#d7f5df" opacity=".5" />
      </pattern>
      <pattern id={`${m}-herring`} width="10" height="8" patternUnits="userSpaceOnUse"><path d="M0,7 L5,1 L10,7" fill="none" stroke="#fff" strokeOpacity=".26" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></pattern>
      <pattern id={`${m}-stripe`} width="20" height="14" patternUnits="userSpaceOnUse"><rect y="0" width="20" height="6" fill="#2f7f86" /></pattern>
    </defs>
  );
}

// ───────────────────────────── the student ─────────────────────────────
function Student({ look, house, expr, gaze, m }: { look: StudentLook; house?: HouseId; expr: Expr; gaze?: Gaze; m: string }) {
  const { skin, shade } = SKIN_TONES[look.skin];
  const hair = HAIR_COLORS[look.hairColor]; const hairDeep = darken(hair, 0.3);
  const robe = ROBE_COLORS[look.robe]; const robeDeep = darken(robe, 0.32); const robeLit = lighten(robe, 0.16);
  const hc = house ? HOUSES[house].colors : null;
  const accA = hc ? hc.main : '#c8bfa6'; const accB = hc ? hc.light : '#a89f86'; const accM = hc ? hc.metal : BRASS;
  const f: FaceSpec = { cx: 80, ey: 84, ex: 15.5, by: 70, ny: 97, my: 107, s: 1, skin, shade, brow: hair === '#e6ebf0' ? '#9aa3ad' : hair, iris: '#3b2f2a' };
  const st = look.hair;
  const band = 'M54,131 Q80,153 106,131 L109,145 Q80,168 51,145Z';
  const rnd = rng(7);
  const curls = Array.from({ length: 16 }, (_, i) => { const a = (-175 + i * 22) * (Math.PI / 180); const r = 34 + rnd() * 10; return { x: 80 + Math.cos(a) * r, y: 62 + Math.sin(a) * r, r: 4 + rnd() * 2.4 }; });
  return (
    <>
      <defs>
        <clipPath id={`${m}-band`}><path d={band} /></clipPath>
        <clipPath id={`${m}-tail`}><path d="M57,146 L45,186 L66,191 L75,154Z" /></clipPath>
      </defs>
      {/* hair behind the head */}
      <g className="cr-sway">
        {st === 1 ? (
          <>
            <Piece d={look.accessory === 1 ? 'M39,92 C34,66 54,50 80,50 C106,50 126,66 121,92 C126,108 124,122 116,134 L44,134 C36,122 34,108 39,92Z' : 'M39,86 C32,56 54,34 80,34 C106,34 128,56 121,86 C126,106 124,122 116,134 L44,134 C36,122 34,106 39,86Z'} fill={hair} m={m} />
            <Strands color={hairDeep} w={1.5} op={0.75} d={['M41,96 C37,108 43,118 39,130', 'M48,100 C45,112 50,120 47,132', 'M119,96 C123,108 117,118 121,130', 'M112,100 C115,112 110,120 113,132']} />
          </>
        ) : null}
        {st === 2 && look.accessory !== 1 ? (
          <>
            <circle cx="80" cy="33" r="15" fill={hair} {...o} /><circle cx="80" cy="33" r="15" fill={`url(#${m}-m)`} />
            <Strands color={hairDeep} w={1.4} op={0.8} d={['M70,30 C74,24 86,24 90,30', 'M68,36 C74,42 86,42 92,36', 'M76,21 C72,30 76,38 80,46']} />
            <path d="M69,45 Q80,51 91,45" stroke={accA} strokeWidth="4.2" fill="none" strokeLinecap="round" />
            <path d="M69,45 Q80,51 91,45" stroke={accB} strokeWidth="1.2" fill="none" strokeDasharray="1.6 3" strokeLinecap="round" />
          </>
        ) : null}
        {st === 3 ? (
          <>
            <circle cx="80" cy="62" r="50" fill={hair} {...o} /><circle cx="80" cy="62" r="50" fill={`url(#${m}-m)`} />
            <g stroke={hairDeep} strokeWidth="1.5" fill="none" opacity=".6">{curls.map((c, i) => <circle key={i} cx={f1(c.x)} cy={f1(c.y)} r={f1(c.r)} />)}</g>
          </>
        ) : null}
      </g>

      <g className="cr-breathe">
        {/* the hood, folded down behind the neck */}
        <Piece d="M50,140 C52,126 66,119 80,119 C94,119 108,126 110,140 L102,152 L80,160 L58,152Z" fill={robeDeep} m={m} />
        <path d="M69,110 L69,136 Q80,144 91,136 L91,110Z" fill={shade} {...o} />
        <path d="M70,126 Q80,134 90,126 L90,134 Q80,142 70,134Z" fill="#000" opacity=".12" />
        {/* the robe */}
        <Piece d="M12,192 C12,160 30,144 58,137 L102,137 C130,144 148,160 148,192Z" fill={robe} m={m} />
        <Strands color={robeDeep} w={1.6} op={0.7} d={['M28,192 C30,176 36,164 44,156', 'M132,192 C130,176 124,166 116,158', 'M54,192 C56,180 58,172 62,166', 'M104,192 C103,182 101,174 98,168']} />
        <path d="M62,140 L80,184 L98,140 L92,136 Q80,150 68,136Z" fill="#efe6cf" {...o} />
        <path d="M60,141 L80,186 L100,141" stroke={accM} strokeWidth="1.6" strokeDasharray="2 3" fill="none" strokeLinecap="round" />
        {/* the scarf: wound twice, one end hanging, striped in the house colours (plain wool before the Choosing) */}
        <path d={band} fill={accA} {...o} />
        <g clipPath={`url(#${m}-band)`} stroke={accB} strokeWidth="3.4" strokeLinecap="round">{[48, 57, 66, 75, 84, 93, 102, 111].map((x) => <line key={x} x1={x} y1="126" x2={x + 5} y2="170" />)}</g>
        <path d={band} fill={`url(#${m}-m)`} />
        <path d="M57,146 L45,186 L66,191 L75,154Z" fill={accA} {...o} />
        <g clipPath={`url(#${m}-tail)`} stroke={accB} strokeWidth="3.4"><line x1="40" y1="170" x2="82" y2="160" /><line x1="40" y1="180" x2="82" y2="170" /><line x1="40" y1="190" x2="82" y2="180" /></g>
        <path d="M57,146 L45,186 L66,191 L75,154Z" fill={`url(#${m}-m)`} />
        <path d="M46,187 l-1,4 M51,188 l-1,4 M56,189 l-1,4 M61,190 l-1,4 M66,191 l-1,4" stroke={accB} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="62" cy="146" r="5" fill={accA} {...o} strokeWidth="1.8" />
        {/* the house pin (a plain brass button before the Choosing) */}
        {hc ? (
          <g transform="translate(97 160)"><path d="M-6,-7 H6 V3 Q6,8 0,10 Q-6,8 -6,3Z" fill={hc.main} stroke={hc.metal} strokeWidth="1.8" strokeLinejoin="round" /><path d="M0,-3.4 L1.2,-0.8 L4,-0.6 L1.9,1.2 L2.5,3.8 L0,2.4 L-2.5,3.8 L-1.9,1.2 L-4,-0.6 L-1.2,-0.8Z" fill={hc.metal} /></g>
        ) : <circle cx="97" cy="160" r="3.6" fill={BRASS} {...o} strokeWidth="1.6" />}
        {/* the arm that carries the lantern */}
        <Piece d="M110,192 C112,178 116,166 121,158 L137,160 C139,170 143,182 147,192Z" fill={robeLit} m={m} />
        <path d="M120,159 Q129,164 138,161 L137,154 Q129,158 121,154Z" fill={accM} {...o} strokeWidth="1.6" />
        <circle cx="128" cy="147" r="7.6" fill={skin} {...o} /><ellipse cx="121.6" cy="150" rx="3" ry="5.2" transform="rotate(20 121.6 150)" fill={skin} {...o} strokeWidth="1.6" />
        <path d="M123,142 q5,-2 10,0 M122,146 q6,-2 12,0" stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <g className="ac-lantern">
          <g transform="translate(128 148)">
            <circle className="ac-glow" cx="0" cy="26" r="28" fill={`url(#${m}-glow)`} />
            <circle cx="0" cy="6" r="3.4" fill="none" stroke={INK} strokeWidth="3.8" /><circle cx="0" cy="6" r="3.4" fill="none" stroke={BRASS} strokeWidth="1.8" />
            <path d="M-8,17 L8,17 L5,10 L-5,10Z" fill={BRASS} {...o} strokeWidth="1.6" /><path d="M-5,10 Q0,4 5,10Z" fill={BRASS} {...o} strokeWidth="1.6" />
            <rect x="-8" y="17" width="16" height="20" rx="2" fill={`url(#${m}-glass)`} stroke={INK} strokeWidth="1.8" />
            <path d="M-2.7,17 V37 M2.7,17 V37" stroke={BRASS_DK} strokeWidth="1.2" />
            <Flame x={0} y={34} s={0.8} />
            <path d="M-9,37 H9 L7,42 H-7Z" fill={BRASS} {...o} strokeWidth="1.6" />
          </g>
        </g>
      </g>

      <g className="cr-head">
        <ellipse cx="45" cy="88" rx="6.4" ry="8.6" fill={skin} {...o} /><ellipse cx="115" cy="88" rx="6.4" ry="8.6" fill={skin} {...o} />
        <ellipse cx="80" cy="84" rx="35" ry="39" fill={skin} {...o} />
        <ellipse cx="80" cy="84" rx="35" ry="39" fill={`url(#${m}-m)`} />
        <path d="M103,64 Q119,92 99,115 Q112,100 103,64Z" fill={shade} opacity=".45" />
        <Face f={f} expr={expr} gaze={gaze} />
        {st === 0 || st === 2 ? (
          <>
            <Piece d="M43,84 C40,50 62,38 80,38 C98,38 120,50 117,84 C114,68 104,60 92,58 C84,64 66,64 58,58 C52,62 45,72 43,84Z" fill={hair} m={m} />
            <Strands color={hairDeep} d={['M62,44 C58,50 56,56 56,60', 'M74,40 C70,48 68,54 68,59', 'M90,40 C92,48 94,54 94,58', 'M102,44 C106,50 108,56 108,62']} />
          </>
        ) : null}
        {st === 1 ? (
          <>
            <Piece d="M44,82 C42,52 62,38 80,38 C100,38 118,52 116,82 C112,70 104,62 92,60 C84,70 70,72 58,70 C50,72 46,76 44,82Z" fill={hair} m={m} />
            <Piece d="M44,84 C41,100 46,112 53,119 C54,104 51,92 53,84Z" fill={hair} m={m} sw={2} /><Piece d="M116,84 C119,100 114,112 107,119 C106,104 109,92 107,84Z" fill={hair} m={m} sw={2} />
            <Strands color={hairDeep} d={['M64,44 C60,52 62,60 66,66', 'M80,40 C78,50 80,58 84,64', 'M98,44 C102,52 100,60 96,64']} />
          </>
        ) : null}
        {st === 3 ? (
          <>
            <Piece d="M45,78 C45,52 62,46 80,46 C98,46 115,52 115,78 C110,66 100,58 80,58 C60,58 50,66 45,78Z" fill={hair} m={m} />
            <g stroke={hairDeep} strokeWidth="1.4" fill="none" opacity=".6"><circle cx="62" cy="54" r="4.4" /><circle cx="78" cy="51" r="4.6" /><circle cx="94" cy="53" r="4.4" /><circle cx="106" cy="60" r="3.8" /></g>
          </>
        ) : null}
        <path d="M58,50 Q70,42 86,43" stroke="#fff" strokeOpacity=".24" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        {look.accessory === 1 ? (
          <g transform="translate(0,-6)">
            <Piece d="M46,64 C42,32 118,28 116,62 C100,52 62,54 46,64Z" fill={accA === '#c8bfa6' ? '#5a3a6e' : accA} m={m} />
            <path d="M62,49 C70,44 80,43 92,44" stroke="#fff" strokeOpacity=".3" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <Piece d="M45,62 Q80,52 117,62 L118,72 Q80,62 44,72Z" fill={darken(accA === '#c8bfa6' ? '#5a3a6e' : accA, 0.3)} m={m} />
            <path d="M46,67 Q80,57 116,67" stroke={accM} strokeWidth="1.4" strokeDasharray="2 3.4" fill="none" strokeLinecap="round" />
            <path d="M112,38 Q124,40 127,56" stroke={INK} strokeWidth="4.2" fill="none" strokeLinecap="round" /><path d="M112,38 Q124,40 127,56" stroke={accM} strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M127,56 l-3,10 M127,56 l0,11 M127,56 l3,10" stroke={accM} strokeWidth="2" strokeLinecap="round" />
            <circle cx="112" cy="38" r="3.4" fill={accM} {...o} strokeWidth="1.6" />
            <path d="M60,60 a6,6 0 1 0 5,9 a4.6,4.6 0 1 1 -5,-9Z" fill={accM} stroke={INK} strokeWidth="1.2" />
          </g>
        ) : null}
        {look.accessory === 2 ? (
          <g>
            <Piece d="M44,66 Q80,50 116,66 L116,77 Q80,62 44,77Z" fill={accA === '#c8bfa6' ? '#c43d3d' : accA} m={m} />
            <Piece d="M112,63 L136,53 L132,72Z M112,70 L134,86 L124,64Z" fill={darken(accA === '#c8bfa6' ? '#c43d3d' : accA, 0.2)} m={m} sw={2} />
            <circle cx="113" cy="66" r="4.4" fill={accA === '#c8bfa6' ? '#c43d3d' : accA} {...o} strokeWidth="1.8" />
            <g fill={accM}>{[[62, 66], [80, 62], [98, 66]].map(([x, y], i) => <path key={i} transform={`translate(${x} ${y - 1})`} d="M0,-3.6 L1.1,-1.1 L3.8,-0.9 L1.7,0.9 L2.3,3.5 L0,2.1 L-2.3,3.5 L-1.7,0.9 L-3.8,-0.9 L-1.1,-1.1Z" />)}</g>
          </g>
        ) : null}
        {look.accessory === 3 ? (
          <g>
            <g fill="rgba(210,238,244,.16)" stroke={INK} strokeWidth="2.6"><circle cx="64.5" cy="84" r="12" /><circle cx="95.5" cy="84" r="12" /><path d="M76.5,83 Q80,80 83.5,83" fill="none" /><path d="M52.5,82 L46,80 M107.5,82 L114,80" fill="none" strokeLinecap="round" /></g>
            <g fill="none" stroke={BRASS} strokeWidth="1.2"><circle cx="64.5" cy="84" r="12" /><circle cx="95.5" cy="84" r="12" /></g>
            <path d="M57,79 Q60,75 65,75 M88,79 Q91,75 96,75" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".7" />
          </g>
        ) : null}
      </g>
    </>
  );
}

// ───────────────────────────── Headmistress Vane ─────────────────────────────
function Vane({ expr, gaze, m }: { expr: Expr; gaze?: Gaze; m: string }) {
  const skin = '#c58f66'; const shade = '#a8704a';
  const silver = '#dfe4ec'; const silverLit = '#ffffff'; const silverDeep = '#98a3b6';
  const green = '#2d6c55'; const greenDeep = '#1a4234'; const greenLit = '#55a583';
  const plum = '#43274d'; const plumDeep = '#4e2f5a';
  const f: FaceSpec = { cx: 80, ey: 91, ex: 14.5, by: 77, ny: 105, my: 116, s: 0.98, skin, shade, brow: '#8e98a8', iris: '#4a6b5b', browW: 3.2 };
  const HEAD = 'M49,88 C49,60 63,46 80,46 C97,46 111,60 111,88 C111,106 104,126 92,134 Q80,140 68,134 C56,126 49,106 49,88Z';
  const SHAWL = 'M14,182 C10,170 24,156 50,150 L64,146 L80,172 L96,146 L110,150 C136,156 150,170 146,182 C110,190 50,190 14,182Z';
  const hem: [number, number][] = [[146, 182], [110, 190], [50, 190], [14, 182]];
  const fringe = Array.from({ length: 30 }, (_, i) => { const q = bez(hem, i / 29); return { x: q.x, y: q.y, k: ((i * 7) % 5) / 5 - 0.4 }; });
  const crown: [number, number][] = [[50, 73], [45, 34], [115, 34], [110, 73]];
  return (
    <>
      <g className="cr-breathe">
        <path d="M70,124 L70,152 Q80,160 90,152 L90,124Z" fill={shade} {...o} />
        <path d="M68,138 Q80,150 92,138 L92,150 Q80,158 68,150Z" fill="#000" opacity=".1" />
        {/* the plum dress with its stand collar and lace edge */}
        <Piece d="M12,192 C12,168 30,154 62,148 L98,148 C130,154 148,168 148,192Z" fill={plum} m={m} />
        <Piece d="M62,150 L63,130 Q80,142 97,130 L98,150 Q80,162 62,150Z" fill={plumDeep} m={m} sw={2} />
        <path d="M63,130 Q80,142 97,130" stroke="#efe4f0" strokeWidth="1.8" strokeDasharray="1.2 2.6" fill="none" strokeLinecap="round" />
        <g fill="#efe4f0" opacity=".9">{[70, 75, 80, 85, 90].map((x) => <circle key={x} cx={x} cy={150 + Math.abs(x - 80) * 0.18} r="0.9" />)}</g>
        {/* the green shawl: plaid weave, a darker hem and a hand-tied fringe */}
        <path d={SHAWL} fill={green} {...o} />
        <path d={SHAWL} fill={`url(#${m}-plaid)`} opacity=".75" />
        <path d={SHAWL} fill={`url(#${m}-m)`} />
        <path d="M14,182 C50,190 110,190 146,182 L147,176 C110,184 50,184 13,176Z" fill={greenDeep} opacity=".85" />
        <path d="M16,179.6 C52,187 108,187 144,179.6" stroke={BRASS} strokeWidth="1.2" strokeDasharray="2.4 3" fill="none" strokeLinecap="round" opacity=".9" />
        <g stroke={greenLit} strokeWidth="1.5" strokeLinecap="round">{fringe.map((q, i) => <line key={i} x1={f1(q.x)} y1={f1(q.y - 1)} x2={f1(q.x + q.k)} y2={f1(q.y + 6)} />)}</g>
        <Strands color={greenDeep} w={1.6} op={0.7} d={['M30,176 C32,168 38,162 46,157', 'M130,176 C128,168 122,162 114,157', 'M56,178 C58,170 62,164 66,158', 'M104,178 C102,170 98,164 94,158']} />
        {/* the brooch, which always glows a little */}
        <circle className="ac-glow" cx="80" cy="168" r="16" fill={`url(#${m}-glow)`} />
        <path d="M80,160 L86.5,164 V172 L80,176 L73.5,172 V164Z" fill={BRASS} {...o} strokeWidth="1.8" />
        <path d="M80,163.4 L84,165.8 V170.2 L80,172.6 L76,170.2 V165.8Z" fill={`url(#${m}-glass)`} stroke={BRASS_DK} strokeWidth="1" />
        <path d="M78,165 L80,164 M77,167 L77,169" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".8" />
        {/* the staff and its lantern */}
        <g className="ac-staff">
          <path d="M142,198 L138,40" stroke={INK} strokeWidth="7.2" strokeLinecap="round" /><path d="M142,198 L138,40" stroke="#80603c" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M142,198 L138,40" stroke="#c19a63" strokeWidth="4.4" strokeDasharray="1.6 17" fill="none" opacity=".9" />
          <path d="M140.4,198 L136.4,40" stroke="#fff" strokeWidth="1" opacity=".25" />
          <circle className="ac-glow" cx="138" cy="30" r="32" fill={`url(#${m}-glow)`} />
          <path d="M138,41 q0,-5 0,-8" stroke={BRASS} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M130,27 L146,27 L142,19 L134,19Z" fill={BRASS} {...o} strokeWidth="1.6" /><path d="M134,19 Q138,10 142,19Z" fill={BRASS} {...o} strokeWidth="1.6" /><circle cx="138" cy="9" r="2" fill={BRASS} {...o} strokeWidth="1.2" />
          <rect x="131" y="27" width="14" height="20" rx="3" fill={`url(#${m}-glass)`} stroke={INK} strokeWidth="1.8" />
          <path d="M135.6,27 V47 M140.4,27 V47" stroke={BRASS_DK} strokeWidth="1.1" />
          <Flame x={138} y={44} s={0.82} />
          <path d="M130,47 H146 L143,52 H133Z" fill={BRASS} {...o} strokeWidth="1.6" />
          <ellipse cx="140" cy="168" rx="8.4" ry="7.2" fill={skin} {...o} />
          <path d="M133,165 q7,3 14,0 M133,169.4 q7,3 14,0" stroke={shade} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M133,173 q7,4 14,0" stroke={INK} strokeWidth="0" fill="none" />
        </g>
      </g>

      <g className="cr-head">
        <ellipse cx="49.5" cy="95" rx="5" ry="7.4" fill={skin} {...o} /><ellipse cx="110.5" cy="95" rx="5" ry="7.4" fill={skin} {...o} />
        {/* two small lantern drops for earrings */}
        <g stroke={BRASS} strokeWidth="1.4" strokeLinecap="round"><path d="M49,101 V105" /><path d="M111,101 V105" /></g>
        <g fill={BRASS} stroke={INK} strokeWidth="1"><rect x="46.8" y="105" width="4.4" height="6" rx="1.2" /><rect x="108.8" y="105" width="4.4" height="6" rx="1.2" /></g>
        <g fill="#ffd27a"><rect x="48" y="106.6" width="2" height="3" rx=".6" /><rect x="110" y="106.6" width="2" height="3" rx=".6" /></g>
        <path d={HEAD} fill={skin} {...o} />
        <path d={HEAD} fill={`url(#${m}-m)`} />
        <path d="M103,66 Q113,92 100,124 Q109,100 103,66Z" fill={shade} opacity=".42" />
        <Face f={f} expr={expr} gaze={gaze} />
        {/* a face that has done a lot of looking: smile lines, crow's feet, a single mole */}
        <g stroke={shade} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".5">
          <path d="M71,111 Q68,116 68.4,121" /><path d="M89,111 Q92,116 91.6,121" />
          <path d="M55,89 q-3,1.6 -4,5" /><path d="M105,89 q3,1.6 4,5" />
        </g>
        <circle cx="96" cy="106" r="1.2" fill="#5b3a26" opacity=".85" />
        {/* the hair, swept back, and the plait wound round like a crown */}
        {/* the hair is taken up into a high roll, and the plait is wound round its foot */}
        <Piece d="M51,66 C42,36 58,12 80,12 C102,12 118,36 109,66 C102,52 94,46 80,46 C66,46 58,52 51,66Z" fill={silver} m={m} />
        <Strands color={silverDeep} w={1.3} op={0.85} d={['M54,50 C50,38 58,26 72,20 C80,17 90,16 98,18', 'M62,47 C58,38 64,29 76,24 C84,21 92,21 100,24', 'M72,46 C68,40 72,33 82,30 C90,28 98,29 104,33', 'M84,46 C82,42 86,38 93,37 C99,37 104,39 107,43', 'M50,60 C46,48 52,36 62,28']} />
        <path d="M62,26 C68,19 78,15 90,15" stroke="#fff" strokeWidth="2.6" strokeOpacity=".55" fill="none" strokeLinecap="round" />
        <path d="M80,12 C84,10 92,12 94,17" stroke={silverDeep} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".8" />
        <Piece d="M47,90 C45,62 62,46 80,46 C98,46 115,62 113,90 C110,76 103,66 94,62 C88,67 72,67 66,62 C57,66 50,76 47,90Z" fill={silver} m={m} />
        <Strands color={silverDeep} w={1.2} op={0.8} d={['M64,60 C62,52 66,46 72,43', 'M72,62 C72,54 76,47 80,43', 'M88,62 C88,54 84,47 80,43', 'M96,60 C98,52 94,46 88,43', 'M52,78 C52,70 56,64 62,60', 'M108,78 C108,70 104,64 98,60']} />
        <Strands color={silverLit} w={1.4} op={0.7} d={['M57,64 C60,58 66,53 72,50', 'M104,64 C101,58 96,53 90,50']} />
        <path d="M80,43 V54" stroke={silverDeep} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M50,84 q-3,6 -2,12 M110,84 q3,6 2,12" stroke={silverDeep} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".9" />
        <Braid p={crown} n={15} wide={5.6} base="#c2c9d7" lit="#f0f3f8" deep="#59657f" />
        {/* a brass pin holding the crown */}
        <g transform="translate(105 50)"><circle r="4.6" fill={BRASS} {...o} strokeWidth="1.6" /><circle r="2" fill="#ffd27a" /><path d="M-2,-1.6 L-0.4,-2.8" stroke="#fff" strokeWidth="1" strokeLinecap="round" /></g>
      </g>
    </>
  );
}

// ───────────────────────────── Archivist Bellweather ─────────────────────────────
function Bellweather({ expr, gaze, m }: { expr: Expr; gaze?: Gaze; m: string }) {
  const skin = '#e8b690'; const shade = '#cd926a';
  const white = '#eef0f5'; const whiteDeep = '#b5bccb';
  const cardi = '#8a5a34'; const cardiDeep = '#5f3a1f'; const vest = '#7b2236'; const ink = '#27336b';
  const f: FaceSpec = { cx: 80, ey: 88, ex: 17, by: 73, ny: 102, my: 118, s: 1.02, skin, shade, brow: '#aeb4c2', iris: '#4a5f7a', browW: 6.2 };
  const HEAD = 'M42,86 C42,58 60,47 80,47 C100,47 118,58 118,86 C119,108 112,128 96,135 Q80,141 64,135 C48,128 41,108 42,86Z';
  const tuft = (cx: number, cy: number) => (
    <g fill={white} stroke={whiteDeep} strokeWidth="1.2"><circle cx={cx} cy={cy} r="7" /><circle cx={cx - 3 * Math.sign(cx - 80)} cy={cy + 10} r="6.4" /><circle cx={cx + 1 * Math.sign(cx - 80)} cy={cy - 9} r="5.6" /></g>
  );
  const blot = (x: number, y: number, s = 1, r = 0) => <path key={`${x}${y}`} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d="M0,0 c4,-3 9,-1 9,3 c0,4 -5,6 -8,4 c-3,-1 -4,-5 -1,-7Z" fill={ink} />;
  return (
    <>
      {/* a goose quill behind the ear */}
      <g>
        <path d="M112,94 L142,40" stroke={INK} strokeWidth="5" strokeLinecap="round" /><path d="M112,94 L142,40" stroke="#f1ead6" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M124,72 C142,70 152,52 148,32 C138,40 128,52 120,70Z" fill="#cdd5e3" {...o} strokeWidth="1.8" />
        <Strands color="#8d99b0" w={1} op={0.9} d={['M128,66 L146,40', 'M124,70 L140,46', 'M132,62 L148,38']} />
        <path d="M112,94 L110.4,97" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="cr-breathe">
        <path d="M68,128 L68,142 Q80,150 92,142 L92,128Z" fill={shade} {...o} />
        {/* the cardigan, knitted, with a shawl collar */}
        <Piece d="M2,192 C2,160 20,144 50,140 L110,140 C140,144 158,160 158,192Z" fill={cardi} m={m} />
        <path d="M2,192 C2,160 20,144 50,140 L110,140 C140,144 158,160 158,192Z" fill={`url(#${m}-knit)`} opacity=".3" />
        <Piece d="M62,163 L80,153 L98,163 L104,192 L56,192Z" fill={vest} m={m} />
        <path d="M68,140 L80,152 L92,140 L86,134 L80,140 L74,134Z" fill="#f3ecdc" {...o} strokeWidth="1.8" />
        <Piece d="M50,140 C54,132 66,128 80,130 C94,128 106,132 110,140 L98,163 L80,153 L62,163Z" fill={cardiDeep} m={m} sw={2} />
        <path d="M50,140 C54,132 66,128 80,130 C94,128 106,132 110,140 L98,163 L80,153 L62,163Z" fill={`url(#${m}-knit)`} opacity=".3" />
        <path d="M80,146 L66,139 Q63,146 66,153Z M80,146 L94,139 Q97,146 94,153Z" fill="#2f6f78" {...o} strokeWidth="1.8" />
        <circle cx="80" cy="146" r="4" fill="#245a62" {...o} strokeWidth="1.8" />
        <g fill={BRASS} stroke={INK} strokeWidth="1.4"><circle cx="80" cy="170" r="2.8" /><circle cx="80" cy="180" r="2.8" /><circle cx="80" cy="189" r="2.8" /></g>
        <path d="M64,183 Q68,172 80,170" stroke={BRASS} strokeWidth="1.8" fill="none" strokeLinecap="round" /><circle cx="64" cy="184" r="3.6" fill={BRASS} {...o} strokeWidth="1.4" /><circle cx="64" cy="184" r="1.4" fill="#fff" opacity=".7" />
        {/* suede elbow patches, stitched on */}
        <g><ellipse cx="22" cy="178" rx="12" ry="8.6" fill="#b88a50" {...o} strokeWidth="1.8" /><ellipse cx="138" cy="178" rx="12" ry="8.6" fill="#b88a50" {...o} strokeWidth="1.8" /></g>
        <g stroke="#6a4a22" strokeWidth="1" strokeDasharray="2 2.2" fill="none"><ellipse cx="22" cy="178" rx="9.6" ry="6.4" /><ellipse cx="138" cy="178" rx="9.6" ry="6.4" /></g>
        {/* ink, because it is an archive */}
        {blot(128, 158, 0.7, -12)}{blot(146, 172, 0.45, 20)}{blot(122, 184, 0.6, 40)}
        {/* a stack of three books carried against the chest */}
        <g className="ac-books">
          <Piece d="M10,174 H62 V190 H10Z" fill="#8c2b3a" m={m} sw={2} />
          <path d="M62,176 H66 V188 H62Z" fill="#f3ecdc" {...o} strokeWidth="1.4" /><path d="M63,178 H66 M63,181 H66 M63,184 H66" stroke="#c9bd9f" strokeWidth=".8" />
          <path d="M16,177 V187 M20,177 V187" stroke={BRASS} strokeWidth="1.6" strokeLinecap="round" /><rect x="28" y="178" width="26" height="6" rx="1.6" fill="none" stroke={BRASS} strokeWidth="1.2" />
          <Piece d="M14,158 H58 V174 H14Z" fill="#2f6b50" m={m} sw={2} />
          <path d="M58,160 H62 V172 H58Z" fill="#f3ecdc" {...o} strokeWidth="1.4" /><path d="M59,162 H62 M59,165 H62 M59,168 H62" stroke="#c9bd9f" strokeWidth=".8" />
          <path d="M20,161 V171 M24,161 V171" stroke={BRASS} strokeWidth="1.6" strokeLinecap="round" /><circle cx="42" cy="166" r="3.4" fill="none" stroke={BRASS} strokeWidth="1.2" />
          <Piece d="M18,144 H54 V158 H18Z" fill="#26407a" m={m} sw={2} />
          <path d="M54,146 H58 V156 H54Z" fill="#f3ecdc" {...o} strokeWidth="1.4" />
          <path d="M26,147 V155 M30,147 V155" stroke={BRASS} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M44,144 V164" stroke="#c43d3d" strokeWidth="3.2" strokeLinecap="round" /><path d="M44,164 l-2,5 M44,164 l2,5" stroke="#c43d3d" strokeWidth="1.8" strokeLinecap="round" />
          <g fill={skin} {...o} strokeWidth="1.6"><ellipse cx="65" cy="177" rx="4.4" ry="2.8" /><ellipse cx="66" cy="182.4" rx="4.6" ry="2.8" /><ellipse cx="65" cy="187.6" rx="4.2" ry="2.7" /></g>
          <ellipse cx="22" cy="150" rx="3.4" ry="4.8" transform="rotate(-20 22 150)" fill={skin} {...o} strokeWidth="1.6" />
          <path d="M62,186 q3,1 5,-.4" stroke={ink} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </g>

      <g className="cr-head">
        {tuft(35, 84)}{tuft(125, 84)}
        <ellipse cx="42" cy="93" rx="6.4" ry="9" fill={skin} {...o} /><ellipse cx="118" cy="93" rx="6.4" ry="9" fill={skin} {...o} />
        <path d={HEAD} fill={skin} {...o} />
        <path d={HEAD} fill={`url(#${m}-m)`} />
        <path d="M108,64 Q122,92 104,126 Q115,100 108,64Z" fill={shade} opacity=".4" />
        <ellipse cx="52" cy="106" rx="8" ry="6" fill="#e8806f" opacity=".3" /><ellipse cx="108" cy="106" rx="8" ry="6" fill="#e8806f" opacity=".3" />
        <ellipse cx="68" cy="58" rx="12" ry="6" fill="#fff" opacity=".35" transform="rotate(-18 68 58)" />
        {/* the hair that is left, combed carefully across */}
        <Piece d="M44,82 C40,66 46,58 54,55 C50,64 49,72 51,83Z" fill={white} m={m} sw={1.6} /><Piece d="M116,82 C120,66 114,58 106,55 C110,64 111,72 109,83Z" fill={white} m={m} sw={1.6} />
        <Strands color={whiteDeep} w={1.5} op={0.95} d={['M54,56 Q80,46 106,56', 'M56,60 Q80,51 104,60', 'M60,53 Q80,45 100,53', 'M64,50 Q80,44 96,50']} />
        <Face f={f} expr={expr} gaze={gaze} />
        <circle cx="80" cy="102.6" r="7.8" fill="#e7a384" stroke="#c98265" strokeWidth="1.2" /><ellipse cx="77.4" cy="99.6" rx="2.6" ry="1.7" fill="#fff" opacity=".55" />
        <path d="M74,104 q1.4,2.6 3.2,1.6 M86,104 q-1.4,2.6 -3.2,1.6" stroke="#b9694f" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M80,105 C72,103 62,104 54,106 C50,107 46,104 47,99 C50,102 52,108 56,111 C62,117 72,118 80,115 C88,118 98,117 104,111 C108,108 110,102 113,99 C114,104 110,107 106,106 C98,104 88,103 80,105Z" fill={white} {...o} strokeWidth="1.8" />
        <path d="M80,105 C72,103 62,104 54,106 C50,107 46,104 47,99 C50,102 52,108 56,111 C62,117 72,118 80,115 C88,118 98,117 104,111 C108,108 110,102 113,99 C114,104 110,107 106,106 C98,104 88,103 80,105Z" fill={`url(#${m}-m)`} />
        <Strands color={whiteDeep} w={1.2} op={0.9} d={['M76,107 C68,107 60,108 54,110', 'M72,112 C66,112 60,114 56,111', 'M84,107 C92,107 100,108 106,110', 'M88,112 C94,112 100,114 104,111']} />
        {blot(97, 116, 0.4, 10)}
        {/* spectacles on a chain, with a small bell */}
        <g>
          <circle cx="63" cy="88" r="13.4" fill="rgba(215,238,244,.16)" stroke={INK} strokeWidth="4" /><circle cx="97" cy="88" r="13.4" fill="rgba(215,238,244,.16)" stroke={INK} strokeWidth="4" />
          <circle cx="63" cy="88" r="13.4" fill="none" stroke={BRASS} strokeWidth="2" /><circle cx="97" cy="88" r="13.4" fill="none" stroke={BRASS} strokeWidth="2" />
          <path d="M76.4,86 Q80,82 83.6,86" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" /><path d="M76.4,86 Q80,82 83.6,86" fill="none" stroke={BRASS} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M49.6,86 L42,84 M110.4,86 L118,84" stroke={BRASS} strokeWidth="2" strokeLinecap="round" />
          <path d="M53,82 Q56,77 62,76 M87,82 Q90,77 96,76" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".75" />
          <path d="M42,85 Q34,116 54,144 Q80,170 106,144 Q126,116 118,85" stroke={BRASS} strokeWidth="1.5" strokeDasharray="2.6 1.6" fill="none" opacity=".95" />
          <g className="ac-bell">
            <path d="M80,160 V164" stroke={BRASS} strokeWidth="1.6" />
            <path d="M74,174 Q74,164 80,164 Q86,164 86,174 L88,176 H72Z" fill={BRASS} {...o} strokeWidth="1.6" /><circle cx="80" cy="178" r="2" fill={BRASS_DK} {...o} strokeWidth="1" />
            <path d="M76,168 Q77,166 79,166" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".8" />
          </g>
        </g>
      </g>
    </>
  );
}

// ───────────────────────────── Madge Ashdown, the lamplighter ─────────────────────────────
function Madge({ expr, gaze, m }: { expr: Expr; gaze?: Gaze; m: string }) {
  const skin = '#d8a579'; const shade = '#bb8359'; const hair = '#2a1b17'; const soot = '#8b8f9c';
  const cap = '#3b4b55'; const jerkin = '#7b5233'; const scarf = '#e07a2f';
  const f: FaceSpec = { cx: 80, ey: 87, ex: 15, by: 73, ny: 100, my: 110, s: 1, skin, shade, brow: '#2b1d18', iris: '#8a6420' };
  const rungs = [0.1, 0.28, 0.46, 0.64, 0.82, 1];
  const L = (t: number): [number, number] => [24 + (6 - 24) * t, 34 + 166 * t]; const R = (t: number): [number, number] => [50 + (34 - 50) * t, 34 + 166 * t];
  const freckles: [number, number][] = [[70, 100], [76, 97], [84, 97], [90, 100], [73, 104], [87, 104], [66, 96], [94, 96], [79, 101], [81, 101], [62, 102], [98, 102]];
  return (
    <>
      {/* the ladder she carries on her back */}
      <g>
        <path d={`M${L(0)[0]},${L(0)[1]} L${L(1)[0]},${L(1)[1]}`} stroke={INK} strokeWidth="6.4" strokeLinecap="round" /><path d={`M${R(0)[0]},${R(0)[1]} L${R(1)[0]},${R(1)[1]}`} stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
        {rungs.map((t) => <path key={`i${t}`} d={`M${L(t)[0]},${L(t)[1]} L${R(t)[0]},${R(t)[1]}`} stroke={INK} strokeWidth="5.2" strokeLinecap="round" />)}
        <path d={`M${L(0)[0]},${L(0)[1]} L${L(1)[0]},${L(1)[1]}`} stroke="#9a7448" strokeWidth="3.4" strokeLinecap="round" /><path d={`M${R(0)[0]},${R(0)[1]} L${R(1)[0]},${R(1)[1]}`} stroke="#9a7448" strokeWidth="3.4" strokeLinecap="round" />
        {rungs.map((t) => <path key={`r${t}`} d={`M${L(t)[0]},${L(t)[1]} L${R(t)[0]},${R(t)[1]}`} stroke="#b88d57" strokeWidth="2.6" strokeLinecap="round" />)}
        <path d={`M${L(0)[0] - 1},${L(0)[1]} L${L(1)[0] - 1},${L(1)[1]}`} stroke="#fff" strokeWidth=".9" opacity=".25" />
      </g>
      {/* two buns, tied with rust cord */}
      <g className="cr-sway">
        <circle cx="36" cy="74" r="12" fill={hair} {...o} /><circle cx="124" cy="74" r="12" fill={hair} {...o} />
        <circle cx="36" cy="74" r="12" fill={`url(#${m}-m)`} /><circle cx="124" cy="74" r="12" fill={`url(#${m}-m)`} />
        <Strands color="#5a463e" w={1.3} op={0.9} d={['M29,70 C32,64 40,64 43,70', 'M28,76 C32,82 40,82 44,76', 'M117,70 C120,64 128,64 131,70', 'M116,76 C120,82 128,82 132,76']} />
        <path d="M44,80 l5,5 M116,80 l-5,5" stroke="#c4552a" strokeWidth="4.4" strokeLinecap="round" /><path d="M44,80 l5,5 M116,80 l-5,5" stroke="#e8885a" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      <g className="cr-breathe">
        <path d="M70,110 L70,138 Q80,146 90,138 L90,110Z" fill={shade} {...o} />
        <path d="M70,126 Q80,134 90,126 L90,134 Q80,142 70,134Z" fill="#000" opacity=".12" />
        {/* a striped shirt under a leather jerkin */}
        <Piece d="M12,192 C12,160 30,144 58,137 L102,137 C130,144 148,160 148,192Z" fill="#f2e6cc" m={m} />
        <path d="M12,192 C12,160 30,144 58,137 L102,137 C130,144 148,160 148,192Z" fill={`url(#${m}-stripe)`} />
        <path d="M12,192 C12,160 30,144 58,137 L102,137 C130,144 148,160 148,192Z" fill={`url(#${m}-m)`} />
        <Piece d="M28,192 C30,166 44,150 60,142 L72,143 L76,192Z" fill={jerkin} m={m} />
        <Piece d="M132,192 C130,166 116,150 100,142 L88,143 L84,192Z" fill={jerkin} m={m} />
        <g stroke="#d9b678" strokeWidth="1.2" strokeDasharray="2.4 2.6" fill="none" strokeLinecap="round"><path d="M72,146 L75.4,190" /><path d="M88,146 L84.6,190" /><path d="M33,186 C35,168 46,154 60,146" /><path d="M127,186 C125,168 114,154 100,146" /></g>
        <g fill="none" stroke={BRASS} strokeWidth="1.8"><rect x="60" y="147" width="7" height="9" rx="1.4" /><rect x="93" y="147" width="7" height="9" rx="1.4" /></g>
        {/* the bandolier of wick tins */}
        <path d="M108,140 L30,192" stroke={INK} strokeWidth="9.8" /><path d="M108,140 L30,192" stroke="#a06a3a" strokeWidth="6.6" /><path d="M108,140 L30,192" stroke="#e0be86" strokeWidth="1" strokeDasharray="2 3" />
        {[[0.3, '#b9bec9'], [0.55, BRASS], [0.8, '#b9bec9']].map(([t, c], i) => (
          <g key={i} transform={`translate(${f1(108 - 78 * (t as number))} ${f1(140 + 52 * (t as number))}) rotate(-33.7)`}>
            <rect x="-8.4" y="-6.4" width="16.8" height="12.8" rx="2.4" fill={c as string} stroke={INK} strokeWidth="1.7" /><path d="M-8.4,-2 H8.4" stroke={INK} strokeWidth="1" opacity=".6" />
            <circle cx="-5.6" cy="-4.2" r=".9" fill={INK} /><circle cx="5.6" cy="-4.2" r=".9" fill={INK} />
            {i === 1 ? <path d="M0,4.6 C-2.4,3 -1.6,0.6 0,-0.8 C1.6,0.6 2.4,3 0,4.6Z" fill="#c4552a" /> : <path d="M-4,3 H4" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity=".6" />}
          </g>
        ))}
        {/* the orange scarf, knotted, with two tails */}
        <path d="M56,134 Q80,152 104,134 L106,146 Q80,164 54,146Z" fill={scarf} {...o} /><path d="M56,134 Q80,152 104,134 L106,146 Q80,164 54,146Z" fill={`url(#${m}-m)`} />
        <path d="M60,141 Q80,158 100,141" stroke="#ffc07a" strokeWidth="1.4" strokeDasharray="2 3" fill="none" strokeLinecap="round" />
        <Piece d="M64,152 L56,178 L68,176 L76,154Z" fill={scarf} m={m} sw={2} /><Piece d="M72,154 L76,184 L88,178 L84,152Z" fill={darken(scarf, 0.12)} m={m} sw={2} />
        <path d="M58,172 l8,-1.6 M62,160 l8,-1 M76,170 l9,-3 M77,178 l9,-3" stroke="#ffc07a" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
        <circle cx="76" cy="150" r="5.4" fill={scarf} {...o} strokeWidth="1.8" />
        {/* the lighting pole, with its flame */}
        <g className="ac-pole">
          <path d="M132,200 L150,34" stroke={INK} strokeWidth="6.6" strokeLinecap="round" /><path d="M132,200 L150,34" stroke="#8a6a44" strokeWidth="3.8" strokeLinecap="round" /><path d="M131,200 L149,34" stroke="#fff" strokeWidth=".9" opacity=".25" />
          <path d="M150,34 q6,-9 13,-3" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M150,34 q6,-9 13,-3" stroke={BRASS} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle className="ac-glow" cx="150" cy="22" r="24" fill={`url(#${m}-glow)`} />
          <path d="M144,34 H156 L154,29 H146Z" fill={BRASS} {...o} strokeWidth="1.6" />
          <Flame x={150} y={29} s={0.9} />
          <ellipse cx="136" cy="168" rx="8.4" ry="7.2" fill={skin} {...o} /><path d="M129,165 q7,3 14,0 M129,169.4 q7,3 14,0" stroke={shade} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      </g>

      <g className="cr-head">
        <ellipse cx="45" cy="92" rx="6" ry="8.4" fill={skin} {...o} /><ellipse cx="115" cy="92" rx="6" ry="8.4" fill={skin} {...o} />
        <circle cx="44" cy="102" r="4.6" fill="none" stroke={BRASS} strokeWidth="2" /><circle cx="116" cy="102" r="4.6" fill="none" stroke={BRASS} strokeWidth="2" />
        <ellipse cx="80" cy="87" rx="34" ry="38" fill={skin} {...o} />
        <ellipse cx="80" cy="87" rx="34" ry="38" fill={`url(#${m}-m)`} />
        <path d="M104,68 Q119,94 100,116 Q112,102 104,68Z" fill={shade} opacity=".5" />
        <Face f={f} expr={expr} gaze={gaze} />
        {/* soot: freckles across the nose and a smudge where she wiped her face */}
        <g fill="#6b3d22" opacity=".75">{freckles.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 1} />)}</g>
        <ellipse cx="95" cy="105" rx="7.4" ry="3.2" transform="rotate(-18 95 105)" fill="#2a2530" opacity=".22" /><path d="M58,98 q5,2 8,0" stroke="#2a2530" strokeWidth="2.4" opacity=".18" strokeLinecap="round" fill="none" />
        {/* the fringe under the cap, with one grey streak of ash */}
        <path d="M47,76 C47,63 62,58 80,60 C98,58 113,63 113,76 C108,69 98,67 90,69 C82,75 70,73 62,69 C54,69 50,71 47,76Z" fill={hair} {...o} />
        <path d="M60,62 C66,64 70,68 72,73" stroke={soot} strokeWidth="3.6" strokeLinecap="round" fill="none" /><path d="M66,61 C71,64 74,67 76,71" stroke={soot} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".7" />
        {/* a flat cap, worn at an angle, with a small brass flame on it */}
        <g transform="rotate(-5 80 60)">
          <Piece d="M44,66 C40,36 70,25 100,31 C116,35 123,52 119,68 C102,58 62,58 44,66Z" fill={cap} m={m} />
          <g stroke={lighten(cap, 0.3)} strokeWidth="1.1" strokeDasharray="2 2.4" fill="none" strokeLinecap="round"><path d="M60,36 C58,46 56,54 56,62" /><path d="M80,30 C80,42 80,52 80,59" /><path d="M100,31 C102,42 104,52 106,62" /></g>
          <circle cx="82" cy="30" r="3" fill={cap} {...o} strokeWidth="1.6" />
          <Piece d="M44,66 C60,58 102,58 119,68 L121,75 C102,68 62,68 43,76Z" fill={darken(cap, 0.32)} m={m} sw={2} />
          <path d="M50,72 C66,65 98,65 114,72" stroke="#fff" strokeOpacity=".16" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <g transform="translate(80 51)"><rect x="-5" y="-6" width="10" height="12" rx="2.4" fill={BRASS} stroke={INK} strokeWidth="1.5" /><Flame x={0} y={4} s={0.5} /></g>
        </g>
      </g>
    </>
  );
}

// ───────────────────────────── Warden Reed ─────────────────────────────
function Reed({ expr, gaze, m }: { expr: Expr; gaze?: Gaze; m: string }) {
  const skin = '#dcc4aa'; const shade = '#bfa285';
  const coat = '#566070'; const coatDeep = '#3b4352'; const cap = '#39465a'; const capDeep = '#1f2530';
  const f: FaceSpec = { cx: 80, ey: 92, ex: 14, by: 80, ny: 107, my: 119, s: 0.94, skin, shade, brow: '#3e434d', iris: '#56626f', browW: 3.2 };
  const HEAD = 'M51,88 C51,62 63,48 80,48 C97,48 109,62 109,88 L107,108 C105,126 95,137 80,140 C65,137 55,126 53,108Z';
  const rnd = rng(11);
  const stubble = Array.from({ length: 26 }, () => { const a = rnd() * Math.PI; const r = 14 + rnd() * 14; return { x: 80 + Math.cos(a) * r * 1.5 * (rnd() > 0.5 ? 1 : -1), y: 118 + Math.sin(a) * r * 0.5 + rnd() * 6 }; }).filter((p) => p.x > 57 && p.x < 103 && p.y > 112 && p.y < 138 && Math.abs(p.x - 80) > 7 || (p.y > 124 && p.y < 138));
  const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; const big = i % 3 === 0; const r1 = big ? 9.8 : 11.2; return { x1: 38 + Math.sin(a) * r1, y1: 164 - Math.cos(a) * r1, x2: 38 + Math.sin(a) * 13, y2: 164 - Math.cos(a) * 13, big }; });
  return (
    <>
      <g className="cr-breathe">
        <path d="M70,126 L70,156 Q80,162 90,156 L90,126Z" fill={shade} {...o} />
        <path d="M78,142 q2,3.4 4,0" stroke={darken(shade, 0.2)} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M68,140 Q80,152 92,140 L92,152 Q80,160 68,152Z" fill="#000" opacity=".1" />
        {/* the long grey coat: herringbone cloth, a popped collar, two rows of brass buttons */}
        <Piece d="M8,192 C8,166 26,152 56,148 L104,148 C134,152 152,166 152,192Z" fill={coat} m={m} />
        <path d="M8,192 C8,166 26,152 56,148 L104,148 C134,152 152,166 152,192Z" fill={`url(#${m}-herring)`} opacity=".8" />
        <Piece d="M70,150 L80,166 L90,150 L86,146 L80,152 L74,146Z" fill="#efe9db" m={m} sw={1.8} />
        <path d="M80,153 L77,176 L80,180 L83,176Z" fill="#7b2236" {...o} strokeWidth="1.4" />
        <path d="M80,152 V192" stroke={coatDeep} strokeWidth="1.8" />
        <Piece d="M60,150 L56,128 L79,148Z" fill={coatDeep} m={m} sw={2} /><Piece d="M100,150 L104,128 L81,148Z" fill={coatDeep} m={m} sw={2} />
        <path d="M62,148 L59,134 M98,148 L101,134" stroke="#fff" strokeWidth="1" opacity=".25" strokeLinecap="round" />
        <path d="M54,150 L70,160 L66,192 H34 C30,176 36,162 54,150Z" fill={coatDeep} opacity=".25" />
        <g fill={BRASS} stroke={INK} strokeWidth="1.3">{[166, 177, 188].flatMap((y) => [64, 96].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" />))}</g>
        <g fill="#fff" opacity=".7">{[166, 177, 188].flatMap((y) => [64, 96].map((x) => <circle key={`h${x}${y}`} cx={x - 1} cy={y - 1} r=".8" />))}</g>
        <g><path d="M28,160 L48,152 L52,160 L32,170Z" fill={coatDeep} {...o} strokeWidth="1.8" /><path d="M132,160 L112,152 L108,160 L128,170Z" fill={coatDeep} {...o} strokeWidth="1.8" /></g>
        <g stroke={BRASS} strokeWidth="1.6" strokeLinecap="round"><path d="M32,164 L49,157 M36,167 L51,160 M128,164 L111,157 M124,167 L109,160" /></g>
        {/* the whistle on its cord */}
        <g className="ac-whistle">
          <path d="M66,150 Q80,184 94,150" stroke={BRASS} strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M66,150 Q80,184 94,150" stroke="#fff" strokeWidth=".8" strokeDasharray="1.6 3" fill="none" opacity=".6" />
          <circle cx="80" cy="170" r="2.6" fill="none" stroke={BRASS} strokeWidth="1.6" />
          <path d="M70,174 H78 A6.4,6.4 0 1 1 78,187 H76 L70,183Z" fill={BRASS} {...o} strokeWidth="1.6" /><circle cx="80" cy="180.4" r="2.2" fill={INK} /><path d="M73,176 H77" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".8" /><path d="M71,178 V182" stroke={BRASS_DK} strokeWidth="1" />
        </g>
        {/* the stopwatch he keeps for the trials, with a second hand that really goes round */}
        <Piece d="M6,192 C8,178 18,166 30,162 L48,178 L46,192Z" fill={coat} m={m} sw={2} />
        <g stroke={BRASS} strokeWidth="1.6" strokeLinecap="round"><path d="M12,188 L40,182 M14,184 L42,178" opacity=".0" /></g>
        <circle cx="38" cy="164" r="19" fill={INK} /><circle cx="38" cy="164" r="17" fill={BRASS} /><circle cx="38" cy="164" r="17" fill={`url(#${m}-m)`} />
        <circle cx="38" cy="164" r="13.6" fill="#f7f0dc" stroke={BRASS_DK} strokeWidth="1.2" />
        <g stroke={INK} strokeLinecap="round">{ticks.map((t, i) => <line key={i} x1={f1(t.x1)} y1={f1(t.y1)} x2={f1(t.x2)} y2={f1(t.y2)} strokeWidth={t.big ? 1.6 : 1} />)}</g>
        <path d="M38,152 V154.4" stroke="#c43d3d" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M31,159 A9,9 0 0 1 45,159" stroke="#c43d3d" strokeWidth="1.2" fill="none" opacity=".7" strokeLinecap="round" />
        <g className="ac-tick"><path d="M38,164 L38,153.6" stroke="#c43d3d" strokeWidth="1.6" strokeLinecap="round" /><circle cx="38" cy="164" r="1.2" fill="#c43d3d" /></g>
        <circle cx="38" cy="164" r="2.2" fill={BRASS} stroke={INK} strokeWidth="1" />
        <path d="M32,152 Q35,149.4 40,150" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".8" />
        <rect x="35" y="140.6" width="6" height="5.4" rx="1.2" fill={BRASS} {...o} strokeWidth="1.5" /><circle cx="38" cy="137.6" r="3.6" fill="none" stroke={INK} strokeWidth="3.4" /><circle cx="38" cy="137.6" r="3.6" fill="none" stroke={BRASS} strokeWidth="1.6" />
        <rect x="50.4" y="153" width="4.6" height="6" rx="1.2" transform="rotate(38 52.7 156)" fill={BRASS} {...o} strokeWidth="1.5" />
        <ellipse cx="22.6" cy="167" rx="4" ry="6.2" transform="rotate(-12 22.6 167)" fill={skin} {...o} strokeWidth="1.8" />
        <ellipse cx="29" cy="181.4" rx="4.4" ry="3" fill={skin} {...o} strokeWidth="1.6" /><ellipse cx="37" cy="183.4" rx="4.4" ry="3" fill={skin} {...o} strokeWidth="1.6" /><ellipse cx="45" cy="181.4" rx="4" ry="3" fill={skin} {...o} strokeWidth="1.6" />
      </g>

      <g className="cr-head">
        <ellipse cx="51" cy="98" rx="4.6" ry="8" fill={skin} {...o} /><ellipse cx="109" cy="98" rx="4.6" ry="8" fill={skin} {...o} />
        <path d={HEAD} fill={skin} {...o} />
        <path d={HEAD} fill={`url(#${m}-m)`} />
        <path d="M102,70 Q110,98 99,126 Q106,102 102,70Z" fill={shade} opacity=".45" />
        {/* hollow cheeks and a day of stubble */}
        <path d="M57,104 Q63,118 73,124" stroke={shade} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".5" /><path d="M103,104 Q97,118 87,124" stroke={shade} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".5" />
        <g fill="#4a4f5a" opacity=".38">{stubble.map((p, i) => <circle key={i} cx={f1(p.x)} cy={f1(p.y)} r=".8" />)}</g>
        <Face f={f} expr={expr} gaze={gaze} />
        <path d="M64,102.4 q6,3 12,0 M84,102.4 q6,3 12,0" stroke={shade} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".55" />
        <path d="M67,113.4 Q73,109.6 80,112 Q87,109.6 93,113.4 Q87,116.4 80,114.4 Q73,116.4 67,113.4Z" fill="#8d929c" stroke="#5b606b" strokeWidth="1.2" strokeLinejoin="round" />
        {/* sideburns, and the cap: slate cloth, a dark band, a polished visor, a small brass lantern badge */}
        <path d="M51,72 L51,92 L55.6,89 L55.6,74Z" fill="#6e7380" {...o} strokeWidth="1.5" /><path d="M109,72 L109,92 L104.4,89 L104.4,74Z" fill="#6e7380" {...o} strokeWidth="1.5" />
        <Piece d="M49,66 C46,26 114,26 111,66Z" fill={cap} m={m} />
        <path d="M64,47 C70,41 80,40 92,41" stroke="#fff" strokeOpacity=".24" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M80,30 V56" stroke={darken(cap, 0.3)} strokeWidth="1.2" opacity=".6" />
        <Piece d="M49,58 Q80,51 111,58 L111,69 Q80,62 49,69Z" fill={capDeep} m={m} sw={2} />
        <path d="M51,63 Q80,56.4 109,63" stroke={BRASS} strokeWidth="1" strokeDasharray="2 3" fill="none" strokeLinecap="round" opacity=".8" />
        <Piece d="M50,67 C62,80 98,80 110,67 C98,70 62,70 50,67Z" fill={capDeep} m={m} sw={2} />
        <path d="M58,71 C68,76 92,76 102,71" stroke="#fff" strokeOpacity=".3" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <g transform="translate(80 57)"><path d="M-7,-5 H7 V3 Q7,8 0,10 Q-7,8 -7,3Z" fill={BRASS} {...o} strokeWidth="1.6" /><rect x="-2.6" y="-2" width="5.2" height="7" rx="1.2" fill={`url(#${m}-glass)`} stroke={INK} strokeWidth=".9" /><Flame x={0} y={3.6} s={0.34} /></g>
      </g>
    </>
  );
}

// ───────────────────────────── the public component ─────────────────────────────
export function Cast({ who, expr = 'neutral', size = 120, look, house, gaze, still, className, title }: {
  who: CastId; expr?: Expr; size?: number; look?: StudentLook; house?: HouseId; gaze?: Gaze; still?: boolean; className?: string; title?: string;
}): ReactNode {
  const m = `ac${useId().replace(/:/g, '')}`;
  const delay = { student: -1.2, vane: -3.4, bellweather: -0.7, madge: -2.4, reed: -4.1 }[who];
  return (
    <span className={`cr ac ac--${who}${still ? ' is-still' : ''}${className ? ` ${className}` : ''}`} style={{ width: size, height: size * 1.1875, ['--cr-delay' as string]: `${delay}s` }} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <svg viewBox="0 0 160 190" width={size} height={size * 1.1875} fill="none">
        <CastDefs m={m} />
        {who === 'student' ? <Student look={look ?? DEFAULT_STUDENT} house={house} expr={expr} gaze={gaze} m={m} /> : null}
        {who === 'vane' ? <Vane expr={expr} gaze={gaze} m={m} /> : null}
        {who === 'bellweather' ? <Bellweather expr={expr} gaze={gaze} m={m} /> : null}
        {who === 'madge' ? <Madge expr={expr} gaze={gaze} m={m} /> : null}
        {who === 'reed' ? <Reed expr={expr} gaze={gaze} m={m} /> : null}
      </svg>
    </span>
  );
}
