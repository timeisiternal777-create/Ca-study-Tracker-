import { Barrel, BrickPat, C, Crate, Flag, INK, Lamp, PlankPat, Puffs, Ramp, Sack, ShinglePat, Star, StonePat, Win, f1, shadow } from './kit';
import type { StructureProps } from './structuresA';

const ol = (w = 1.8) => ({ stroke: INK, strokeWidth: w, strokeLinejoin: 'round' as const });
const SLATE = ['#7d95b4', '#566d90', '#3a4d70', '#25344f'] as const;
const WATER = ['#7fd6e4', '#3fa4c0', '#2a7894', '#18506a'] as const;

// ───────────────────────────── toll: a gatehouse across a causeway, with a raised portcullis, round towers and a striped barrier ─────────────────────────────
function Tower({ id, cx, lit, flag }: { id: string; cx: number; lit: boolean; flag?: ReturnType<typeof Flag> }) {
  return (
    <g>
      {shadow(cx, 2, 15, 3.6)}
      <path d={`M${cx - 10},0 V-56 H${cx + 10} V0 C${cx + 6},4 ${cx - 6},4 ${cx - 10},0Z`} fill={`url(#${id}-cyl)`} {...ol(1.9)} />
      <path d={`M${cx - 10},0 V-56 H${cx + 10} V0 C${cx + 6},4 ${cx - 6},4 ${cx - 10},0Z`} fill={`url(#${id}-stn)`} opacity=".26" />
      <path d={`M${cx - 10},-18 C${cx - 5},-15 ${cx + 5},-15 ${cx + 10},-18 M${cx - 10},-38 C${cx - 5},-35 ${cx + 5},-35 ${cx + 10},-38`} stroke={INK} strokeWidth=".9" opacity=".4" fill="none" />
      <path d={`M${cx - 1.5},-47 h3 v9 h-3Z M${cx - 1.5},-29 h3 v9 h-3Z`} fill={lit ? C.lit : C.glassDeep} {...ol(1)} />
      <path d={`M${cx - 12.4},-56 H${cx + 12.4} L${cx + 10.4},-60.4 H${cx - 10.4}Z`} fill={C.stone[1]} {...ol(1.5)} />
      <path d={`M${cx - 11},-56 H${cx + 11}`} stroke="#fff" strokeWidth="1" opacity=".35" />
      <path d={`M${cx - 13.4},-60.4 H${cx + 13.4} L${cx},-83Z`} fill={`url(#${id}-slate)`} {...ol(1.9)} />
      <path d={`M${cx - 13.4},-60.4 L${cx},-83 L${cx - 4},-60.4Z`} fill="#fff" opacity=".13" />
      <path d={`M${cx + 13.4},-60.4 L${cx},-83 L${cx + 5},-60.4Z`} fill="#000" opacity=".18" />
      <path d={`M${cx},-83 V-89`} stroke={INK} strokeWidth="1.8" strokeLinecap="round" /><circle cx={cx} cy="-90" r="2" fill={C.gold[1]} {...ol(1.1)} />
      {flag}
    </g>
  );
}

export function Toll({ id, seed, lit, cleared }: StructureProps) {
  const crenels = Array.from({ length: 6 }, (_, i) => -22.4 + i * 8.2);
  return (
    <g transform="translate(-5,6) scale(.96)">
      <defs>
        <StonePat id={`${id}-stn`} seed={seed + 11} ramp={C.stone} w={30} h={18} rows={4} />
        <StonePat id={`${id}-road`} seed={seed + 13} ramp={C.plaster} w={26} h={12} rows={3} />
        <linearGradient id={`${id}-cyl`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.stone[0]} /><stop offset=".35" stopColor={C.stone[1]} /><stop offset=".8" stopColor={C.stone[2]} /><stop offset="1" stopColor={C.stone[3]} /></linearGradient>
        <ShinglePat id={`${id}-slate`} seed={seed + 12} ramp={SLATE} w={12} h={8} />
        <ShinglePat id={`${id}-tile`} seed={seed + 14} ramp={C.copper} w={12} h={8} />
        <PlankPat id={`${id}-pl`} seed={seed + 15} ramp={C.timber} w={20} h={18} />
        <Ramp id={`${id}-gold`} ramp={C.gold} x2={1} y2={1} />
        <linearGradient id={`${id}-pass`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.glassDeep} /><stop offset="1" stopColor={lit ? '#6a4420' : '#0a121a'} /></linearGradient>
        <clipPath id={`${id}-arch`}><path d="M-10,0 V-22 a10,10 0 0 1 20,0 V0Z" /></clipPath>
      </defs>
      {/* the causeway running out from the gate */}
      <path d="M-11,1 L11,1 L32,34 L-32,34Z" fill={`url(#${id}-road)`} {...ol(1.6)} />
      <path d="M-11,1 L-32,34 M11,1 L32,34" stroke="#fff" strokeWidth="1.2" opacity=".4" />
      <path d="M0,3 L0,32" stroke={C.plaster[3]} strokeWidth="1" strokeDasharray="4 5" opacity=".6" />
      <Tower id={id} cx={-33} lit={lit} /><Tower id={id} cx={33} lit={lit} flag={<Flag x={33} y={-91} h={12} cleared={cleared} />} />
      {/* the gate between them */}
      <path d="M-24,0 V-44 H24 V0Z" fill={`url(#${id}-cyl)`} {...ol(1.9)} />
      <path d="M-24,0 V-44 H24 V0Z" fill={`url(#${id}-stn)`} opacity=".3" />
      <path d="M-24,0 V-44 H-20 V0Z" fill="#fff" opacity=".1" /><path d="M20,0 V-44 H24 V0Z" fill="#000" opacity=".16" />
      <path d="M-26,-44 H26 V-47.4 H-26Z" fill={C.stone[0]} {...ol(1.5)} />
      {crenels.map((x) => <rect key={x} x={f1(x)} y="-53" width="5.6" height="5.8" fill={C.stone[1]} {...ol(1.4)} />)}
      <path d="M-26,-47.4 H26" stroke="#fff" strokeWidth="1" opacity=".4" />
      <path d="M-13,0 V-22 a13,13 0 0 1 26,0 V0" fill="none" stroke={INK} strokeWidth="5.6" strokeLinejoin="round" /><path d="M-13,0 V-22 a13,13 0 0 1 26,0 V0" fill="none" stroke={C.stone[0]} strokeWidth="3" strokeLinejoin="round" />
      <path d="M-3.4,-36 L3.4,-36 L2.4,-30.4 H-2.4Z" fill={C.stone[0]} {...ol(1.3)} />
      <path d="M-10,0 V-22 a10,10 0 0 1 20,0 V0Z" fill={`url(#${id}-pass)`} stroke={INK} strokeWidth="1.5" />
      {lit ? <path d="M-8,0 V-18 a8,8 0 0 1 16,0 V0Z" fill={C.ember} opacity=".22" /> : null}
      {/* the portcullis, raised halfway */}
      <g clipPath={`url(#${id}-arch)`} stroke={INK} strokeLinecap="round">
        <path d="M-7.6,-34 V-14 M-4,-34 V-14 M-0.4,-34 V-14 M3.2,-34 V-14 M6.8,-34 V-14" strokeWidth="2.6" /><path d="M-10,-30 H10 M-10,-24 H10 M-10,-18 H10" strokeWidth="2.4" />
        <g stroke={C.iron[0]} strokeWidth="1.1"><path d="M-7.6,-34 V-14 M-4,-34 V-14 M-0.4,-34 V-14 M3.2,-34 V-14 M6.8,-34 V-14" /><path d="M-10,-30 H10 M-10,-24 H10 M-10,-18 H10" strokeOpacity=".7" /></g>
        <g fill={C.iron[1]} strokeWidth="1"><path d="M-9.2,-14 l1.6,4 l1.6,-4Z M-5.6,-14 l1.6,4 l1.6,-4Z M-2,-14 l1.6,4 l1.6,-4Z M1.6,-14 l1.6,4 l1.6,-4Z M5.2,-14 l1.6,4 l1.6,-4Z" /></g>
      </g>
      {/* the toll coin over the arch */}
      <circle cx="0" cy="-42" r="5.6" fill={`url(#${id}-gold)`} {...ol(1.4)} /><circle cx="0" cy="-42" r="3.9" fill="none" stroke={C.gold[3]} strokeWidth=".8" />
      <path d="M-1.9,-44.4 H2 M-1.9,-42.6 H2 M-1.9,-44.4 q3.8,0 0,3 L1.7,-38.8" stroke={C.gold[3]} strokeWidth=".95" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Win x={-21} y={-37} w={5} h={10} on={lit} arch frame={C.stone[3]} bars={false} /><Win x={16} y={-37} w={5} h={10} on={lit} arch frame={C.stone[3]} bars={false} />
      <Lamp x={-16} y={-12} on={lit} r={2.4} /><Lamp x={16} y={-12} on={lit} r={2.4} />
      {/* the guard booth with its coin window */}
      <g transform="translate(62,0)">
        {shadow(0, 2, 14, 3)}
        <path d="M-11,0 V-19 H11 V0Z" fill={`url(#${id}-pl)`} {...ol(1.7)} />
        <path d="M-11,0 V-19 H-8 V0Z" fill="#fff" opacity=".12" /><path d="M8,0 V-19 H11 V0Z" fill="#000" opacity=".2" />
        <path d="M-15,-19 L-9,-30 H9 L15,-19Z" fill={`url(#${id}-tile)`} {...ol(1.8)} /><path d="M-9,-30 H9" stroke={C.copper[0]} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M-7,-16 H7 V-8 H-7Z" fill={lit ? C.lit : C.glassDeep} {...ol(1.4)} />
        {lit ? <path d="M-6,-12 H6 V-8.8 H-6Z" fill={C.ember} opacity=".35" /> : null}
        <path d="M-9,-8 H9 V-5.6 H-9Z" fill={C.timber[0]} {...ol(1.3)} />
        {[-4, 0, 4].map((x, i) => <ellipse key={x} cx={x} cy={-9.4 - (i % 2)} rx="2.3" ry="1" fill={`url(#${id}-gold)`} {...ol(0.9)} />)}
        <path d="M-5.6,0 V-5 H5.6 V0" fill="none" stroke={C.timber[3]} strokeWidth="1" opacity=".6" />
      </g>
      <g transform="translate(-60,1)">
        {shadow(0, 1, 9, 2.4)}
        {[0, 1, 2, 3].map((i) => <g key={i}><ellipse cx="0" cy={-2 - i * 3.2} rx="5.6" ry="2" fill={`url(#${id}-gold)`} {...ol(1.1)} /><path d={`M-5.6,${-2 - i * 3.2} v3.2`} stroke={C.gold[3]} strokeWidth=".8" /></g>)}
        <ellipse cx="9" cy="-1.4" rx="4.4" ry="1.6" fill={`url(#${id}-gold)`} {...ol(1)} /><ellipse cx="9" cy="-4" rx="4.4" ry="1.6" fill={`url(#${id}-gold)`} {...ol(1)} />
      </g>
      {/* the barrier across the road */}
      <g>
        <path d="M-24,22.4 L19,18.4" stroke={INK} strokeWidth="6.4" strokeLinecap="round" /><path d="M-24,22.4 L19,18.4" stroke="var(--ac, #f2c25c)" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M-24,22.4 L19,18.4" stroke="#fbf3dd" strokeWidth="4.2" strokeDasharray="6.6 6.6" />
        <path d="M-24,21 L19,17" stroke="#fff" strokeWidth="1" opacity=".4" />
        <rect x="-33" y="18" width="9" height="11" rx="1.4" fill={C.iron[1]} {...ol(1.5)} /><path d="M-31.4,22 H-25.6" stroke={C.iron[0]} strokeWidth="1.2" />
        <path d="M20,30 V21 M15.6,15 L20,21 L24.4,15" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d="M20,30 V21 M15.6,15 L20,21 L24.4,15" fill="none" stroke={C.timber[1]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

// ───────────────────────────── foundry: a brick forge with a tall chimney, a glowing furnace door and a water wheel ─────────────────────────────
export function Foundry({ id, seed, lit, cleared }: StructureProps) {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  const paddles = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
  return (
    <g transform="translate(-4,6)">
      <defs>
        <BrickPat id={`${id}-brk`} seed={seed + 21} ramp={['#c47458', '#94503f', '#693832', '#432424']} w={20} h={16} rows={4} />
        <linearGradient id={`${id}-chim`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d58163" /><stop offset=".45" stopColor="#a65a45" /><stop offset="1" stopColor="#6a3732" /></linearGradient>
        <pattern id={`${id}-tin`} width="6" height="10" patternUnits="userSpaceOnUse"><rect width="6" height="10" fill={C.iron[1]} /><rect width="3" height="10" fill={C.iron[0]} opacity=".55" /><path d="M0,0 V10" stroke={C.iron[3]} strokeWidth=".8" /></pattern>
        <linearGradient id={`${id}-fur`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={lit ? '#ffb64a' : '#4a2a20'} /><stop offset=".55" stopColor={lit ? '#e0632a' : '#2a1614'} /><stop offset="1" stopColor={lit ? '#7a1f14' : '#150c0c'} /></linearGradient>
        <Ramp id={`${id}-gold`} ramp={C.gold} x2={1} y2={1} />
        <Ramp id={`${id}-wd`} ramp={C.timber} x2={0} y2={1} />
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={WATER[0]} /><stop offset="1" stopColor={WATER[2]} /></linearGradient>
      </defs>
      {shadow(-6, 3, 52, 4.6)}
      {/* the chimney, behind the roof */}
      <path d="M-33,-40 L-30.6,-83 H-21.4 L-19,-40Z" fill={`url(#${id}-chim)`} {...ol(1.9)} />
      <path d="M-33,-40 L-30.6,-83 H-21.4 L-19,-40Z" fill={`url(#${id}-brk)`} opacity=".3" />
      <path d="M-31.4,-83 H-20.6 V-86.4 H-31.4Z" fill={C.stone[1]} {...ol(1.5)} /><path d="M-32.6,-86.4 H-19.4 V-89 H-32.6Z" fill={C.stone[0]} {...ol(1.5)} />
      <path d="M-32,-62 H-20 M-31.6,-72 H-20.4" stroke={C.stone[1]} strokeWidth="2" opacity=".85" />
      <Puffs x={-26} y={-96} n={4} s={0.95} seed={seed + 3} fill="#cdd5da" />
      {/* the hall */}
      <path d="M-42,0 V-32 H24 V0Z" fill={`url(#${id}-brk)`} {...ol(2)} />
      <path d="M-42,0 V-32 H-38 V0Z" fill="#fff" opacity=".1" /><path d="M20,0 V-32 H24 V0Z" fill="#000" opacity=".22" />
      {[-42, -22, 1, 22].map((x) => <g key={x}><rect x={x - 2.6} y="-32" width="5.2" height="32" fill={C.stone[1]} {...ol(1.3)} /><path d={`M${x - 1.2},-31 V-1`} stroke="#fff" strokeWidth=".9" opacity=".4" /></g>)}
      <path d="M-44,-32 H26 V-35 H-44Z" fill={C.stone[0]} {...ol(1.5)} />
      {/* the furnace door */}
      <path d="M-15,0 V-17 a9.5,9.5 0 0 1 19,0 V0Z" fill={`url(#${id}-fur)`} {...ol(1.9)} />
      <path d="M-18,0 V-17 a12.5,12.5 0 0 1 25,0 V0" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M-18,0 V-17 a12.5,12.5 0 0 1 25,0 V0" fill="none" stroke={C.stone[1]} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-10,-1 L-8.6,-9 H-2.6 L-1,-1Z" fill="#1a1010" /><path d="M-9.4,-9 H-1.8 L-2.4,-11 H-8.8Z" fill="#1a1010" />
      <path d="M-13,0 H2 V-2 H-13Z" fill="#1a1010" opacity=".8" />
      {lit ? <g><path d="M-14,-17 a8.5,8.5 0 0 1 17,0 V-12 H-14Z" fill={C.litHot} opacity=".4" /><g fill={C.ember}><circle cx="-14" cy="-24" r="1" /><circle cx="6.4" cy="-21" r="1.2" /><circle cx="9.4" cy="-27" r=".9" /><circle cx="-17.6" cy="-18" r=".9" /></g></g> : null}
      <Win x={-33} y={-24} w={6} h={10} on={lit} arch frame={C.stone[3]} bars={false} /><Win x={9} y={-24} w={6} h={10} on={lit} arch frame={C.stone[3]} bars={false} />
      {/* the iron roof, a vent on the ridge and a flue */}
      <path d="M-46,-35 L-38,-48 H20 L28,-35Z" fill={`url(#${id}-tin)`} {...ol(1.9)} />
      <path d="M-46,-35 H28" stroke={C.iron[3]} strokeWidth="1.6" /><path d="M-38,-48 H20" stroke="#fff" strokeWidth="1" opacity=".35" />
      <path d="M-14,-48 V-55 H6 V-48Z" fill={C.iron[2]} {...ol(1.6)} />
      <path d="M-12,-51 H4 M-12,-53.4 H4" stroke={INK} strokeWidth="1" opacity=".7" /><path d="M-16,-55 L-4,-61 L8,-55Z" fill={C.iron[1]} {...ol(1.6)} />
      <path d="M12,-48 V-66 H16.4 V-48Z" fill={C.iron[2]} {...ol(1.5)} /><path d="M10,-66 L14.2,-71 L18.4,-66Z" fill={C.iron[1]} {...ol(1.3)} />
      <Puffs x={14} y={-75} n={2} s={0.6} seed={seed + 9} fill="#cdd5da" />
      <Flag x={28} y={-35} h={13} cleared={cleared} />
      {/* the water wheel, fed from a flume */}
      <g transform="translate(50,0)">
        <path d="M-22,-16 H0" stroke={INK} strokeWidth="5" strokeLinecap="round" /><path d="M-22,-16 H0" stroke={C.timber[1]} strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="0" cy="2" rx="25" ry="5.4" fill={`url(#${id}-water)`} {...ol(1.7)} /><path d="M-16,2 q4,-1.6 8,0 M2,3.6 q4,-1.6 8,0 M-6,0.6 q3,-1.2 6,0" stroke="#d6f2ec" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".85" />
        <g>
          <circle cx="0" cy="-16" r="17.4" fill="none" stroke={INK} strokeWidth="5.4" /><circle cx="0" cy="-16" r="17.4" fill="none" stroke={C.timber[1]} strokeWidth="3" />
          <circle cx="0" cy="-16" r="10.6" fill="none" stroke={INK} strokeWidth="3.2" /><circle cx="0" cy="-16" r="10.6" fill="none" stroke={C.timber[2]} strokeWidth="1.5" />
          {spokes.map((a, i) => <g key={i}><path d={`M0,-16 L${f1(Math.cos(a) * 16.4)},${f1(-16 + Math.sin(a) * 16.4)}`} stroke={INK} strokeWidth="3.2" strokeLinecap="round" /><path d={`M0,-16 L${f1(Math.cos(a) * 16.4)},${f1(-16 + Math.sin(a) * 16.4)}`} stroke={C.timber[0]} strokeWidth="1.3" strokeLinecap="round" /></g>)}
          {paddles.map((a, i) => <rect key={i} x="-2.2" y="-34.8" width="4.4" height="5.6" rx=".8" fill={C.timber[1]} {...ol(1.1)} transform={`rotate(${f1(a)} 0 -16)`} />)}
          <circle cx="0" cy="-16" r="3.6" fill={`url(#${id}-gold)`} {...ol(1.4)} /><circle cx="-0.8" cy="-16.8" r="1" fill="#fff" opacity=".7" />
        </g>
        <path d="M-6,-37 L22,-43 L22,-39.6 L-6,-34Z" fill={`url(#${id}-wd)`} {...ol(1.6)} /><path d="M-6,-37 L22,-43" stroke={C.timber[0]} strokeWidth="1.2" />
        <path d="M14,-39.8 V-2 M22,-40 V-2" stroke={INK} strokeWidth="3.6" strokeLinecap="round" /><path d="M14,-39.8 V-2 M22,-40 V-2" stroke={C.timber[2]} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M-5,-35.4 q-1.6,4 -0.4,8 q1.4,-2 3,-3Z" fill={WATER[0]} opacity=".85" />
        <path d="M-9,-27 V-4" stroke={WATER[0]} strokeWidth="1.2" strokeDasharray="2 3" opacity=".8" strokeLinecap="round" />
      </g>
      {/* the anvil on its stump, a coal heap and a stack of ingots */}
      <g transform="translate(-58,3)">
        {shadow(0, 1, 11, 2.6)}
        <path d="M-6.6,0 L-5.6,-8.4 H5.6 L6.6,0Z" fill={C.timber[1]} {...ol(1.5)} /><ellipse cx="0" cy="-8.4" rx="5.6" ry="1.7" fill={C.timber[0]} {...ol(1.3)} />
        <path d="M-14,-17 H7 Q10.6,-17 10.6,-14.4 L6,-14.4 L4.6,-11 H-3.6 L-4.8,-14.4 H-9 Q-13,-14.4 -14,-17Z" fill={C.iron[1]} {...ol(1.5)} /><path d="M-12,-16.6 H8" stroke={C.iron[0]} strokeWidth="1.1" />
        {lit ? <><rect x="-3" y="-20.6" width="8" height="3.6" rx="1" fill={C.ember} {...ol(1)} /><rect x="-2" y="-20.2" width="5" height="1.2" fill={C.litHot} /></> : null}
      </g>
      <g transform="translate(-72,3)"><path d="M-9,0 C-9,-6 -4,-10 0,-10 C5,-10 9,-5 9,0Z" fill="#2b2f38" {...ol(1.5)} /><path d="M-5,-4 l2,-3 l3,2 M2,-6 l3,1 M-1,-8 l2,1" stroke={C.rock[1]} strokeWidth="1.1" fill="none" strokeLinecap="round" />{lit ? <circle cx="3" cy="-4" r="1.2" fill={C.ember} /> : null}</g>
      <g transform="translate(24,5)">
        {[[-9, 0], [-3, 0], [3, 0], [9, 0], [-6, -4], [0, -4], [6, -4], [-3, -8], [3, -8]].map(([x, y], i) => <g key={i}><path d={`M${x - 4.2},${y} V${y - 3.2} L${x - 3},${y - 4.4} H${x + 3} L${x + 4.2},${y - 3.2} V${y}Z`} fill={i % 3 === 0 ? `url(#${id}-gold)` : C.copper[0]} {...ol(1.1)} /></g>)}
      </g>
    </g>
  );
}

// ───────────────────────────── watch: a stone tower on a crag with a lens lantern, a stair and a banner with a magnifier ─────────────────────────────
export function Watch({ id, seed, lit, cleared }: StructureProps) {
  const posts = Array.from({ length: 7 }, (_, i) => -16.4 + i * 5.5);
  return (
    <g transform="translate(2,6) scale(.92)">
      <defs>
        <StonePat id={`${id}-stn`} seed={seed + 31} ramp={C.stone} w={28} h={14} rows={3} />
        <linearGradient id={`${id}-twr`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.plaster[0]} /><stop offset=".4" stopColor={C.stone[0]} /><stop offset=".85" stopColor={C.stone[2]} /><stop offset="1" stopColor={C.stone[3]} /></linearGradient>
        <Ramp id={`${id}-cu`} ramp={C.copper} x2={1} y2={0.4} />
        <Ramp id={`${id}-br`} ramp={C.gold} x2={1} y2={1} />
        <radialGradient id={`${id}-lens`} cx=".5" cy=".5" r=".6"><stop offset="0" stopColor={lit ? C.litHot : '#4a6a7c'} /><stop offset=".6" stopColor={lit ? C.lit : '#27424f'} /><stop offset="1" stopColor={lit ? C.ember : C.glassDeep} /></radialGradient>
        <linearGradient id={`${id}-bm`} gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="96" y2="0"><stop offset="0" stopColor={C.litHot} stopOpacity=".5" /><stop offset="1" stopColor={C.litHot} stopOpacity="0" /></linearGradient>
      </defs>
      {shadow(0, 3, 44, 5)}
      {lit ? <path d="M10,-70 L98,-86 L98,-54Z" fill={`url(#${id}-bm)`} /> : null}
      {/* the crag */}
      <g transform="scale(1.14,1)">
      <path d="M-44,2 L-40,-8 L-33,-14 L-22,-19 L-8,-22 L12,-22 L26,-18 L38,-10 L46,2 C26,6 -26,6 -44,2Z" fill={C.rock[1]} {...ol(2)} />
      <path d="M-44,2 L-40,-8 L-33,-14 L-22,-19 L-8,-22 L-12,-9 L-20,2Z" fill={C.rock[0]} opacity=".85" />
      <path d="M12,-22 L26,-18 L38,-10 L46,2 L24,3 L18,-8Z" fill={C.rock[2]} opacity=".85" />
      <path d="M-22,-19 L-14,-6 L-16,2 M-8,-22 L-3,-10 L-6,3 M12,-22 L8,-9 L11,3 M26,-18 L28,-6" stroke={C.rock[3]} strokeWidth="1.3" fill="none" opacity=".6" strokeLinecap="round" />
      <path d="M-30,-14 q6,-3 12,-1 M-2,-21 q6,-2 12,0" stroke="#fff" strokeWidth="1.2" opacity=".35" fill="none" strokeLinecap="round" />
      {/* the stair cut into the crag */}
      <path d="M-42,0 L-35,-2 L-35,-5 L-28,-7 L-28,-10 L-21,-12 L-21,-15 L-14,-17 L-14,-20" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M-42,0 L-35,-2 L-35,-5 L-28,-7 L-28,-10 L-21,-12 L-21,-15 L-14,-17 L-14,-20" fill="none" stroke={C.stone[0]} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M-42,-9 L-14,-29" stroke={INK} strokeWidth="1.5" strokeLinecap="round" /><path d="M-42,-9 V0 M-33,-15.4 V-4 M-24,-22 V-12 M-16,-28 V-19" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* the tower */}
      <path d="M-15,-20 L-11.4,-62 H11.4 L15,-20Z" fill={`url(#${id}-twr)`} {...ol(2)} />
      <path d="M-15,-20 L-11.4,-62 H11.4 L15,-20Z" fill={`url(#${id}-stn)`} opacity=".28" />
      <path d="M-14.6,-29 H14.6 M-13.6,-41 H13.6 M-12.6,-53 H12.6" stroke={INK} strokeWidth="1" opacity=".38" />
      <path d="M-7,-20 V-30 a4,4 0 0 1 8,0 V-20Z" fill={C.timber[1]} {...ol(1.5)} /><path d="M-3,-34 V-20" stroke={C.timber[3]} strokeWidth="1" opacity=".7" />
      <path d="M2,-47 h3 v8 h-3Z M-8,-47 h3 v8 h-3Z" fill={lit ? C.lit : C.glassDeep} {...ol(1)} />
      {/* the banner with its magnifier */}
      <path d="M-4.4,-61 H-4.4" stroke={INK} strokeWidth="1" />
      <path d="M-5,-60 H16 V-36 L5.5,-41 L-5,-36Z" fill="var(--ac, #f2c25c)" {...ol(1.5)} />
      <path d="M-5,-60 H16" stroke={C.gold[2]} strokeWidth="2.2" /><path d="M-5,-60 H16 V-57 H-5Z" fill="#fff" opacity=".18" />
      <circle cx="4.6" cy="-51.6" r="4.4" fill="#fff" opacity=".9" {...ol(1.5)} /><circle cx="4.6" cy="-51.6" r="2.6" fill={C.glass} opacity=".35" /><path d="M7.8,-48.4 L11.4,-44.6" stroke={INK} strokeWidth="2.6" strokeLinecap="round" /><path d="M7.8,-48.4 L11.4,-44.6" stroke={C.copper[1]} strokeWidth="1.2" strokeLinecap="round" />
      {/* the gallery and its railing */}
      <path d="M-19,-62 H19 L16.6,-66 H-16.6Z" fill={C.stone[1]} {...ol(1.6)} /><path d="M-19,-62 H19" stroke="#fff" strokeWidth="1" opacity=".3" />
      <path d="M-18.4,-66.4 V-73 M18.4,-66.4 V-73" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {posts.map((x) => <path key={x} d={`M${f1(x)},-66.4 V-72.4`} stroke={INK} strokeWidth="1.1" strokeLinecap="round" />)}
      <path d="M-18.6,-73 H18.6" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M-18.6,-73 H18.6" stroke={C.gold[2]} strokeWidth="1.2" strokeLinecap="round" />
      {/* the lens lantern */}
      <path d="M-9,-66.4 V-80 H9 V-66.4Z" fill={`url(#${id}-lens)`} {...ol(1.7)} />
      <g fill="none" stroke={lit ? C.gold[2] : C.glassDeep} strokeWidth="1" opacity={lit ? 0.9 : 0.8}><circle cx="0" cy="-73" r="3.2" /><circle cx="0" cy="-73" r="5.6" /><path d="M-9,-73 H9 M0,-80 V-66.4" /></g>
      {lit ? <circle cx="0" cy="-73" r="1.6" fill="#fff" /> : <path d="M-7.6,-79 h4 l-3,7Z" fill="#fff" opacity=".12" />}
      <path d="M-9,-66.4 V-80 M9,-66.4 V-80" stroke={INK} strokeWidth="2.2" strokeLinecap="round" /><path d="M-9,-66.4 V-80 M9,-66.4 V-80" stroke={C.gold[2]} strokeWidth=".9" strokeLinecap="round" />
      <path d="M-12,-80 H12 L0,-95Z" fill={`url(#${id}-cu)`} {...ol(1.9)} /><path d="M-12,-80 L0,-95 L-3,-80Z" fill="#fff" opacity=".15" />
      <path d="M0,-95 V-102" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><circle cx="0" cy="-103" r="1.9" fill={C.gold[1]} {...ol(1.1)} />
      <Flag x={17} y={-62} h={12} cleared={cleared} />
      {/* a spyglass on a stand, a lectern with the ledger and some stones at the foot */}
      <g transform="translate(24,-20)"><path d="M0,0 L-3,8 M0,0 L3,8 M0,0 L0,9" stroke={INK} strokeWidth="2.6" strokeLinecap="round" /><path d="M0,0 L-3,8 M0,0 L3,8 M0,0 L0,9" stroke={C.timber[1]} strokeWidth="1.2" strokeLinecap="round" /><g transform="translate(0,-1) rotate(-32)"><rect x="-2" y="-2.2" width="16" height="4.4" rx="1.2" fill={C.copper[1]} {...ol(1.3)} /><rect x="11" y="-2.8" width="4" height="5.6" rx="1" fill={C.gold[1]} {...ol(1.1)} /></g></g>
      <g transform="translate(34,-9)"><path d="M0,0 V-7 M-3,0 H3" stroke={INK} strokeWidth="2.2" strokeLinecap="round" /><path d="M0,0 V-7 M-3,0 H3" stroke={C.timber[1]} strokeWidth="1" strokeLinecap="round" /><path d="M-6,-7 L6,-9.4 L8,-6.2 L-4,-3.8Z" fill={C.plaster[1]} {...ol(1.2)} /><path d="M-3,-6.2 L5,-7.6 M-2.4,-4.8 L5.4,-6.2" stroke={C.plaster[3]} strokeWidth=".8" /></g>
      <Star x={-38} y={-58} r={2.6} /><Star x={40} y={-74} r={2} />
    </g>
  );
}

// ───────────────────────────── vault: a round treasury with a copper dome, a coin frieze and a great brass door ─────────────────────────────
export function Vault({ id, seed, lit, cleared }: StructureProps) {
  const bolts = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  const spokes = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3);
  const coins = Array.from({ length: 13 }, (_, i) => -30 + i * 5);
  return (
    <g transform="translate(0,6) scale(.94)">
      <defs>
        <StonePat id={`${id}-stn`} seed={seed + 41} ramp={C.stone} w={30} h={16} rows={3} />
        <linearGradient id={`${id}-drum`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.stone[0]} /><stop offset=".4" stopColor={C.stone[1]} /><stop offset=".85" stopColor={C.stone[2]} /><stop offset="1" stopColor={C.stone[3]} /></linearGradient>
        <radialGradient id={`${id}-dome`} cx=".34" cy=".24" r=".95"><stop offset="0" stopColor={C.copper[0]} /><stop offset=".45" stopColor={C.copper[1]} /><stop offset="1" stopColor={C.copper[3]} /></radialGradient>
        <radialGradient id={`${id}-door`} cx=".38" cy=".3" r=".9"><stop offset="0" stopColor={C.gold[0]} /><stop offset=".5" stopColor={C.gold[1]} /><stop offset="1" stopColor={C.gold[3]} /></radialGradient>
        <Ramp id={`${id}-gold`} ramp={C.gold} x2={1} y2={1} />
        <Ramp id={`${id}-ver`} ramp={C.verdigris} x2={1} y2={1} />
      </defs>
      {shadow(0, 4, 56, 5.4)}
      {/* two round steps */}
      <path d="M-52,0 C-40,7 40,7 52,0 V-3.4 C40,3.6 -40,3.6 -52,-3.4Z" fill={C.stone[1]} {...ol(1.8)} /><ellipse cx="0" cy="-3.4" rx="52" ry="6.4" fill={C.stone[0]} {...ol(1.8)} />
      <path d="M-46,-3.4 C-36,2.4 36,2.4 46,-3.4 V-6.4 C36,-0.6 -36,-0.6 -46,-6.4Z" fill={C.stone[2]} {...ol(1.5)} /><ellipse cx="0" cy="-6.4" rx="46" ry="5.4" fill={C.stone[0]} {...ol(1.5)} />
      {/* the drum */}
      <path d="M-35,-6.4 V-47 H35 V-6.4 C22,-0.6 -22,-0.6 -35,-6.4Z" fill={`url(#${id}-drum)`} {...ol(2)} />
      <path d="M-35,-6.4 V-47 H35 V-6.4 C22,-0.6 -22,-0.6 -35,-6.4Z" fill={`url(#${id}-stn)`} opacity=".3" />
      <path d="M-35,-14 C-22,-8.4 22,-8.4 35,-14" stroke={INK} strokeWidth="1.1" opacity=".35" fill="none" />
      <path d="M-35,-47 H35 V-42 H-35Z" fill={C.stone[0]} {...ol(1.4)} />
      {coins.map((x, i) => <ellipse key={x} cx={x} cy="-44.4" rx="2.1" ry="1.9" fill={`url(#${id}-gold)`} {...ol(0.9)} opacity={1 - Math.abs(i - 6) * 0.04} />)}
      <path d="M-37,-47 H37 V-49.6 H-37Z" fill={C.stone[1]} {...ol(1.4)} />
      {/* the round windows */}
      {[-26, 26].map((x) => <g key={x}><circle cx={x} cy="-27" r="5.6" fill={`url(#${id}-gold)`} {...ol(1.5)} /><circle cx={x} cy="-27" r="3.8" fill={lit ? C.lit : C.glass} stroke={INK} strokeWidth="1.1" />{lit ? <circle cx={x} cy="-26" r="1.6" fill={C.litHot} /> : <path d={`M${x - 2.6},-28.4 l2,-1 l-1.2,2.6Z`} fill="#fff" opacity=".18" />}<path d={`M${x},-30.8 V-23.2 M${x - 3.8},-27 H${x + 3.8}`} stroke={INK} strokeWidth=".8" opacity=".7" /></g>)}
      {/* the great door */}
      <path d="M-20,-4 V-26 a20,20 0 0 1 40,0 V-4Z" fill={C.stone[0]} {...ol(1.9)} /><path d="M-17,-4 V-26 a17,17 0 0 1 34,0 V-4Z" fill="#18222e" {...ol(1.4)} />
      <path d="M-3.4,-45 L3.4,-45 L2.4,-40 H-2.4Z" fill={C.stone[1]} {...ol(1.2)} />
      {lit ? <circle cx="0" cy="-22" r="19" fill={C.lit} opacity=".2" /> : null}
      <circle cx="0" cy="-22" r="15.4" fill={`url(#${id}-door)`} {...ol(1.9)} />
      <circle cx="0" cy="-22" r="12" fill="none" stroke={C.gold[3]} strokeWidth="1.5" /><circle cx="0" cy="-22" r="9.4" fill={C.gold[2]} stroke={C.gold[3]} strokeWidth="1" opacity=".55" />
      {bolts.map((a, i) => <circle key={i} cx={f1(Math.cos(a) * 13.6)} cy={f1(-22 + Math.sin(a) * 13.6)} r="1.2" fill={C.gold[0]} stroke={INK} strokeWidth=".8" />)}
      {spokes.map((a, i) => <g key={i}><path d={`M0,-22 L${f1(Math.cos(a) * 8.6)},${f1(-22 + Math.sin(a) * 8.6)}`} stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d={`M0,-22 L${f1(Math.cos(a) * 8.6)},${f1(-22 + Math.sin(a) * 8.6)}`} stroke={C.gold[1]} strokeWidth="1.4" strokeLinecap="round" /><circle cx={f1(Math.cos(a) * 9)} cy={f1(-22 + Math.sin(a) * 9)} r="1.6" fill={C.gold[0]} stroke={INK} strokeWidth=".9" /></g>)}
      <circle cx="0" cy="-22" r="3.8" fill={`url(#${id}-door)`} {...ol(1.4)} /><circle cx="-0.8" cy="-22.8" r="1" fill="#fff" opacity=".8" />
      <path d="M-12,-30 C-6,-34.6 6,-34.6 12,-30" stroke="#fff" strokeWidth="1.4" opacity=".4" fill="none" strokeLinecap="round" />
      {lit ? <circle cx="0" cy="-22" r="15.4" fill="none" stroke={C.ember} strokeWidth="1.2" opacity=".7" /> : null}
      {/* the copper dome, its ribs and the cupola */}
      <path d="M-37,-49.6 C-37,-70 -20,-80 0,-80 C20,-80 37,-70 37,-49.6 C25,-45.6 -25,-45.6 -37,-49.6Z" fill={`url(#${id}-dome)`} {...ol(2)} />
      <g stroke={C.copper[3]} strokeWidth="1.2" fill="none" opacity=".7" strokeLinecap="round">
        <path d="M0,-80 C-9,-68 -16,-58 -20,-47" /><path d="M0,-80 C-4,-66 -7,-56 -9,-46" /><path d="M0,-80 C9,-68 16,-58 20,-47" /><path d="M0,-80 C4,-66 7,-56 9,-46" />
        <path d="M-35,-62 C-18,-57 18,-57 35,-62" /><path d="M-36,-55 C-18,-50 18,-50 36,-55" />
      </g>
      <path d="M-32,-60 C-29,-67 -22,-72 -15,-75" stroke="#fff" strokeWidth="2.2" opacity=".35" fill="none" strokeLinecap="round" />
      <path d="M-8,-79 V-88 H8 V-79Z" fill={C.stone[1]} {...ol(1.6)} />
      {[-4.6, 4.6].map((x) => <path key={x} d={`M${x - 1.4},-82 h2.8 v4.4 h-2.8Z`} fill={lit ? C.lit : C.glassDeep} {...ol(0.9)} />)}
      <path d="M-9.6,-88 H9.6 L0,-96Z" fill={`url(#${id}-ver)`} {...ol(1.6)} /><path d="M0,-96 V-100" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><circle cx="0" cy="-101" r="2.2" fill={`url(#${id}-gold)`} {...ol(1.1)} />
      <Flag x={9} y={-91} h={10} cleared={cleared} />
      {/* coin piles on plinths, a chest */}
      {[-50, 50].map((x, k) => <g key={x} transform={`translate(${x},3)`}>
        {shadow(0, 1, 8, 2)}
        <path d="M-5.6,0 V-7 H5.6 V0Z" fill={C.stone[1]} {...ol(1.4)} /><path d="M-6.6,-7 H6.6 V-9.4 H-6.6Z" fill={C.stone[0]} {...ol(1.3)} />
        {[0, 1, 2].map((i) => <ellipse key={i} cx={(i % 2) * 1.4 - 0.7} cy={-11.2 - i * 2.4} rx={4.8 - i * 0.8} ry="1.6" fill={`url(#${id}-gold)`} {...ol(1)} />)}
        {k === 0 ? <circle cx="-4" cy="-10.4" r="1.7" fill={C.gold[1]} {...ol(0.9)} /> : <circle cx="4" cy="-10.4" r="1.7" fill={C.gold[1]} {...ol(0.9)} />}
      </g>)}
      <Crate x={-62} y={4} w={9} h={7} ramp={C.copper} /><Sack x={60} y={4} s={0.85} fill={C.gold[1]} />
    </g>
  );
}

// ───────────────────────────── chart: an octagonal chart tower, a signal mast with flags, a globe and a compass rose in the paving ─────────────────────────────
export function ChartTower({ id, seed, lit, cleared }: StructureProps) {
  const flags = [
    { x: 40, y: -66, c: '#e0503c', k: 'sq' }, { x: 40, y: -56, c: '#fbf3dd', k: 'tri' }, { x: 40, y: -46, c: '#3f9fb4', k: 'sq' }, { x: 40, y: -36, c: 'var(--ac, #f2c25c)', k: 'tri' },
  ] as const;
  const star8 = Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8 - Math.PI / 2; const r = i % 2 ? 7 : 27; return `${f1(Math.cos(a) * r)},${f1(Math.sin(a) * r)}`; }).join(' ');
  return (
    <g transform="translate(-6,6)">
      <defs>
        <StonePat id={`${id}-stn`} seed={seed + 51} ramp={C.stone} w={26} h={14} rows={3} />
        <linearGradient id={`${id}-fl`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.plaster[0]} /><stop offset="1" stopColor={C.stone[0]} /></linearGradient>
        <linearGradient id={`${id}-fm`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.stone[0]} /><stop offset="1" stopColor={C.stone[1]} /></linearGradient>
        <linearGradient id={`${id}-fr`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.stone[2]} /><stop offset="1" stopColor={C.stone[3]} /></linearGradient>
        <Ramp id={`${id}-ver`} ramp={C.verdigris} x2={1} y2={0.3} />
        <Ramp id={`${id}-gold`} ramp={C.gold} x2={1} y2={1} />
        <radialGradient id={`${id}-globe`} cx=".34" cy=".3" r=".85"><stop offset="0" stopColor="#8fe3ef" /><stop offset=".55" stopColor="#3f9fb4" /><stop offset="1" stopColor="#1a5068" /></radialGradient>
      </defs>
      {shadow(0, 3, 40, 5)}
      {/* the compass rose set into the paving in front of the door */}
      <g transform="translate(0,24) scale(1,.3)"><circle r="30" fill={C.plaster[0]} {...ol(2.6)} /><circle r="25" fill="none" stroke={C.gold[2]} strokeWidth="2" /><polygon points={star8} fill={C.verdigris[1]} {...ol(2)} /><polygon points={star8} fill="none" stroke={C.verdigris[3]} strokeWidth="1" transform="rotate(22.5)" opacity=".5" /><circle r="4.4" fill={`url(#${id}-gold)`} {...ol(1.6)} /></g>
      <path d="M0,10.4 L2.2,15 H-2.2Z" fill="var(--ac, #f2c25c)" {...ol(1)} />
      {/* the lower tower: three faces of an octagon */}
      <path d="M-27,-2 V-40 L-13,-42 V0Z" fill={`url(#${id}-fl)`} {...ol(1.9)} /><path d="M13,0 V-42 L27,-40 V-2Z" fill={`url(#${id}-fr)`} {...ol(1.9)} /><path d="M-13,0 V-42 H13 V0Z" fill={`url(#${id}-fm)`} {...ol(1.9)} />
      <path d="M-27,-2 V-40 L-13,-42 V0Z M13,0 V-42 L27,-40 V-2Z M-13,0 V-42 H13 V0Z" fill={`url(#${id}-stn)`} opacity=".26" />
      <path d="M-27,-14 L-13,-14.4 M-27,-27 L-13,-28 M13,-14.4 L27,-14 M13,-28 L27,-27" stroke={INK} strokeWidth="1" opacity=".35" />
      <path d="M-4.6,0 V-9 a4.6,4.6 0 0 1 9.2,0 V0Z" fill={C.timber[1]} {...ol(1.6)} /><path d="M0,-13.6 V0 M-4.6,-6 H4.6" stroke={C.timber[3]} strokeWidth="1" opacity=".7" /><circle cx="2.6" cy="-5" r=".9" fill={C.gold[1]} />
      <Win x={-4} y={-37} w={8} h={19} on={lit} arch frame={C.stone[3]} />
      <path d="M-22,-32 h5.4 v13 h-5.4Z M16.6,-32 h5.4 v13 h-5.4Z" fill={lit ? C.lit : C.glass} {...ol(1.3)} /><path d="M-19.3,-32 V-19 M16.6,-25.5 H22 M19.3,-32 V-19" stroke={INK} strokeWidth=".8" opacity=".6" />
      {lit ? <path d="M-22,-24 h5.4 v5 h-5.4Z M16.6,-24 h5.4 v5 h-5.4Z" fill={C.ember} opacity=".35" /> : null}
      {/* the balcony */}
      <path d="M-31,-40 L-14,-44 H14 L31,-40 V-37 H-31Z" fill={C.stone[0]} {...ol(1.7)} /><path d="M-31,-40 L-14,-44 H14 L31,-40" stroke="#fff" strokeWidth="1" opacity=".35" fill="none" />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-26 + i * 6.5},${-40.6 + Math.abs(i - 4) * 0.3} V${-46.4 + Math.abs(i - 4) * 0.3}`} stroke={INK} strokeWidth="1.2" strokeLinecap="round" />)}
      <path d="M-27,-46.6 L-13,-48.6 H13 L27,-46.6" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M-27,-46.6 L-13,-48.6 H13 L27,-46.6" fill="none" stroke={C.gold[2]} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* the chart room above it */}
      <path d="M-20,-41 V-60 L-9,-62 V-43Z" fill={`url(#${id}-fl)`} {...ol(1.8)} /><path d="M9,-43 V-62 L20,-60 V-41Z" fill={`url(#${id}-fr)`} {...ol(1.8)} /><path d="M-9,-43 V-62 H9 V-43Z" fill={`url(#${id}-fm)`} {...ol(1.8)} />
      <path d="M-5.6,-58 h11.2 v11 h-11.2Z" fill={lit ? C.lit : C.glassDeep} {...ol(1.5)} /><path d="M0,-58 V-47 M-5.6,-52.5 H5.6" stroke={INK} strokeWidth="1" opacity=".7" />
      {lit ? <path d="M-5,-52 h10 v4.4 h-10Z" fill={C.ember} opacity=".4" /> : <path d="M-4.6,-57 l4,0 l-3,5Z" fill="#fff" opacity=".13" />}
      <path d="M-16,-57 h4 v8 h-4Z M12,-57 h4 v8 h-4Z" fill={lit ? C.lit : C.glass} {...ol(1.1)} />
      {/* the roof */}
      <path d="M-24,-60 L0,-86 L-9.6,-62Z" fill={C.verdigris[0]} {...ol(1.8)} /><path d="M24,-60 L0,-86 L9.6,-62Z" fill={C.verdigris[3]} {...ol(1.8)} /><path d="M-9.6,-62 L0,-86 L9.6,-62Z" fill={`url(#${id}-ver)`} {...ol(1.8)} />
      <path d="M-26,-60 L-9.6,-62.6 H9.6 L26,-60 L24,-59 L9.6,-61.2 H-9.6 L-24,-59Z" fill={C.verdigris[2]} {...ol(1.4)} />
      <path d="M0,-86 V-92" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><path d="M0,-92 l9,2.2 l-9,2.2Z" fill="var(--ac, #f2c25c)" {...ol(1.2)} /><circle cx="0" cy="-93" r="1.8" fill={C.gold[1]} {...ol(1)} />
      {/* the signal mast and its flags */}
      <g>
        {shadow(40, 2, 6, 1.6)}
        <path d="M40,0 V-78" stroke={INK} strokeWidth="4.2" strokeLinecap="round" /><path d="M40,0 V-78" stroke={C.timber[1]} strokeWidth="2" strokeLinecap="round" /><path d="M39.4,-76 V-4" stroke={C.timber[0]} strokeWidth=".8" opacity=".7" />
        <path d="M30,-68 H50" stroke={INK} strokeWidth="3.4" strokeLinecap="round" /><path d="M30,-68 H50" stroke={C.timber[1]} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M40,-78 L56,-1 M40,-78 L26,-1" stroke={INK} strokeWidth="1" opacity=".55" fill="none" />
        <path d="M37,-8 h6 v8 h-6Z" fill={C.timber[2]} {...ol(1.3)} />
        {flags.map((f, i) => f.k === 'sq'
          ? <g key={i}><path d={`M${f.x},${f.y} h12 v8 h-12Z`} fill={f.c} {...ol(1.2)} /><path d={`M${f.x},${f.y} h12 v3 h-12Z`} fill="#fff" opacity=".2" /><path d={`M${f.x + 3},${f.y + 2} h6 v4 h-6Z`} fill="#fbf3dd" opacity={i === 0 ? 0.85 : 0} /></g>
          : <g key={i}><path d={`M${f.x},${f.y} l15,4 l-15,4Z`} fill={f.c} {...ol(1.2)} /></g>)}
        <path d="M40,-78 V-82" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><circle cx="40" cy="-83" r="2" fill={C.gold[1]} {...ol(1.1)} />
        <path d="M40,-82 l12,3 l-12,3Z" fill={cleared ? C.gold[1] : 'var(--ac, #f2c25c)'} {...ol(1.1)} />
      </g>
      {/* a globe on its stand */}
      <g transform="translate(-44,2)">
        {shadow(0, 1, 9, 2.2)}
        <path d="M-6,0 H6 L4,-5 H-4Z" fill={C.timber[1]} {...ol(1.4)} /><path d="M0,-5 V-10" stroke={INK} strokeWidth="2.4" strokeLinecap="round" /><path d="M0,-5 V-10" stroke={C.timber[2]} strokeWidth="1" strokeLinecap="round" />
        <circle cx="0" cy="-18" r="9" fill={`url(#${id}-globe)`} {...ol(1.7)} />
        <path d="M-6,-21 q3,-3 6,-1 q2,3 -1,5 q-3,0 -5,-4Z M2,-14 q3,-1 4,2 q-2,3 -4,1Z M-2,-25 q3,-1 5,1 q-2,2 -5,-1Z" fill="#7cc27a" stroke={C.grass[3]} strokeWidth=".7" strokeLinejoin="round" />
        <path d="M-9,-18 H9 M0,-27 V-9" stroke="#fff" strokeWidth=".7" opacity=".35" /><ellipse cx="0" cy="-18" rx="4" ry="9" fill="none" stroke="#fff" strokeWidth=".7" opacity=".3" />
        <path d="M-9.6,-23 A11.6,11.6 0 0 1 9.6,-13" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" /><path d="M-9.6,-23 A11.6,11.6 0 0 1 9.6,-13" fill="none" stroke={C.gold[1]} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M-3.4,-23.6 q2,-2 4,-1.6" stroke="#fff" strokeWidth="1.3" opacity=".7" fill="none" strokeLinecap="round" />
      </g>
      <Star x={-34} y={-60} r={2.4} /><Barrel x={58} y={4} s={0.9} /><Crate x={-58} y={5} w={8} h={7} />
    </g>
  );
}

