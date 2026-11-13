import { Barrel, BrickPat, C, Crate, Dinghy, Flag, INK, Lamp, PlankPat, Puffs, Ramp, Sack, ShinglePat, Star, StonePat, Win, f1, lighten, shadow } from './kit';

/** What every island building is told: a prefix for its gradient ids, a seed, whether any lantern is lit, and whether the paper is cleared. */
export interface StructureProps { id: string; seed: number; lit: boolean; cleared: boolean }


// ───────────────────────────── counting: a lighthouse that is also a counting house ─────────────────────────────
export function Counting({ id, seed, lit, cleared }: StructureProps) {
  return (
    <g transform="translate(6,5)">
      <defs>
        <linearGradient id={`${id}-twr`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.plaster[0]} /><stop offset=".42" stopColor={C.plaster[1]} /><stop offset="1" stopColor={C.plaster[3]} /></linearGradient>
        <StonePat id={`${id}-stn`} seed={seed + 1} ramp={C.stone} w={26} h={14} rows={3} />
        <BrickPat id={`${id}-brk`} seed={seed + 2} ramp={C.brick} w={20} h={16} rows={4} />
        <ShinglePat id={`${id}-tile`} seed={seed + 3} ramp={C.copper} w={12} h={8} />
        <Ramp id={`${id}-cu`} ramp={C.copper} x2={1} y2={0.4} />
        <linearGradient id={`${id}-lamp`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.litHot} /><stop offset=".6" stopColor={C.lit} /><stop offset="1" stopColor={C.ember} /></linearGradient>
        <linearGradient id={`${id}-bmL`} gradientUnits="userSpaceOnUse" x1="-22" y1="0" x2="-104" y2="0"><stop offset="0" stopColor={C.litHot} stopOpacity=".5" /><stop offset="1" stopColor={C.litHot} stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}-bmR`} gradientUnits="userSpaceOnUse" x1="-6" y1="0" x2="76" y2="0"><stop offset="0" stopColor={C.litHot} stopOpacity=".5" /><stop offset="1" stopColor={C.litHot} stopOpacity="0" /></linearGradient>
      </defs>
      {shadow(-12, 3, 30, 4.4)}{shadow(30, 3, 22, 3.4)}
      {/* the beams from the lamp, only when something on the island is lit */}
      {lit ? <g><path d="M-22,-60 L-104,-78 L-104,-42Z" fill={`url(#${id}-bmL)`} /><path d="M-6,-60 L76,-78 L76,-42Z" fill={`url(#${id}-bmR)`} /></g> : null}
      {/* the tower */}
      <path d="M-33,0 L-26,-50 H-2 L5,0Z" fill={`url(#${id}-twr)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-33,0 L-26,-50 H-2 L5,0Z" fill={`url(#${id}-stn)`} opacity=".22" />
      <path d="M-28.8,-30 H0.8 L1.5,-25 H-29.5Z" fill="var(--ac, #f2c25c)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-26,-50 H-2 L-1.6,-47 H-26.4Z" fill="var(--ac, #f2c25c)" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M-33,0 L-31.8,-9 H4 L5,0Z" fill={C.stone[2]} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <Win x={-17} y={-41} w={6} h={9} on={lit} arch /><Win x={-17} y={-22} w={6} h={9} on={lit} arch />
      <path d="M-20,0 V-8 a6,6 0 0 1 12,0 V0Z" fill={C.timber[1]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-14,-14 V0 M-18,-6 H-10" stroke={C.timber[3]} strokeWidth="1" opacity=".7" /><circle cx="-10.6" cy="-4" r=".9" fill={C.gold[1]} />
      <Lamp x={-27.4} y={-11} on={lit} r={2.6} />
      {/* gallery, rail and lamp room */}
      <path d="M-30,-53 H2 V-50 H-30Z" fill={C.iron[1]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-29,-53 V-60 M-23,-53 V-60 M-17,-53 V-60 M-11,-53 V-60 M-5,-53 V-60 M1,-53 V-60 M-29,-60 H1 M-29,-56.5 H1" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M-22,-53 V-66 H-6 V-53Z" fill={lit ? `url(#${id}-lamp)` : C.glass} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {lit ? <circle cx="-14" cy="-60" r="4.2" fill="#fff" opacity=".9" /> : <path d="M-21,-65 l4,0 l-3,8Z" fill="#fff" opacity=".12" />}
      <path d="M-17.2,-53 V-66 M-14,-53 V-66 M-10.8,-53 V-66" stroke={INK} strokeWidth="1.1" opacity=".75" />
      <path d="M-25,-66 H-3 L-14,-77Z" fill={`url(#${id}-cu)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-14,-77 V-83" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><circle cx="-14" cy="-84" r="2" fill={C.gold[1]} stroke={INK} strokeWidth="1.1" />
      <Flag x={1} y={-60} h={13} cleared={cleared} />
      {/* the counting house beside it */}
      <path d="M10,0 V-20 H48 V0Z" fill={`url(#${id}-brk)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M10,0 V-20 H14 V0Z" fill="#fff" opacity=".1" /><path d="M44,0 V-20 H48 V0Z" fill="#000" opacity=".18" />
      <rect x="34" y="-40" width="7" height="14" fill={`url(#${id}-brk)`} stroke={INK} strokeWidth="1.6" /><rect x="32.6" y="-42" width="9.8" height="3" fill={C.stone[1]} stroke={INK} strokeWidth="1.3" />
      <path d="M6,-20 L16,-32 H42 L52,-20Z" fill={`url(#${id}-tile)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M16,-32 H42" stroke={C.copper[0]} strokeWidth="2" strokeLinecap="round" /><path d="M6,-20 H52" stroke={INK} strokeWidth="1.4" /><path d="M6,-20 L16,-32" stroke={C.copper[0]} strokeWidth="1.2" opacity=".7" />
      <Win x={15} y={-16} w={8} h={9} on={lit} /><Win x={35} y={-16} w={8} h={9} on={lit} />
      <path d="M25,0 V-11 H33 V0Z" fill={C.timber[1]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /><path d="M29,-11 V0" stroke={C.timber[3]} strokeWidth="1" opacity=".7" />
      <path d="M48,-15 H53" stroke={INK} strokeWidth="1.5" strokeLinecap="round" /><path d="M51,-15 v2" stroke={INK} strokeWidth="1" /><rect x="48.5" y="-13" width="7" height="8" rx="1" fill="var(--ac, #f2c25c)" stroke={INK} strokeWidth="1.3" /><path d="M50.5,-10.5 h3 M50.5,-8 h3" stroke={INK} strokeWidth=".8" />
      <Puffs x={37.5} y={-45} n={3} s={0.7} seed={seed} />
      {/* ledgers by the door */}
      <rect x="36" y="-3" width="11" height="3" fill="var(--ac, #f2c25c)" stroke={INK} strokeWidth="1.2" /><rect x="37" y="-6" width="9" height="3" fill={C.plaster[1]} stroke={INK} strokeWidth="1.2" /><rect x="36.5" y="-9" width="8" height="3" fill={C.copper[1]} stroke={INK} strokeWidth="1.2" />
    </g>
  );
}

// ───────────────────────────── statute: a columned court with scales on the roof ─────────────────────────────
export function Statute({ id, seed, lit, cleared }: StructureProps) {
  const cols = [-39, -13, 13, 39];
  return (
    <g transform="translate(0,6) scale(.94)">
      <defs>
        <linearGradient id={`${id}-col`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.stone[0]} /><stop offset=".4" stopColor={C.stone[1]} /><stop offset=".8" stopColor={C.stone[2]} /><stop offset="1" stopColor={C.stone[3]} /></linearGradient>
        <linearGradient id={`${id}-ped`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.stone[0]} /><stop offset="1" stopColor={C.stone[2]} /></linearGradient>
        <StonePat id={`${id}-stn`} seed={seed + 4} ramp={C.stone} w={30} h={16} rows={3} />
        <Ramp id={`${id}-br`} ramp={C.gold} x2={1} y2={1} />
      </defs>
      {shadow(0, 3, 56, 5)}
      {/* three steps */}
      {[[48, 0], [44, -3.5], [40, -7]].map(([w, y], i) => (
        <g key={i}><path d={`M${-w},${y} H${w} V${y - 3.5} H${-w}Z`} fill={`url(#${id}-ped)`} stroke={INK} strokeWidth="1.7" strokeLinejoin="round" /><path d={`M${-w + 1},${y - 3} H${w - 1}`} stroke="#fff" strokeWidth="1" opacity=".5" /></g>
      ))}
      {/* the hall behind the columns */}
      <path d="M-33,-10.5 V-44 H33 V-10.5Z" fill={`url(#${id}-ped)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-33,-10.5 V-44 H33 V-10.5Z" fill={`url(#${id}-stn)`} opacity=".35" />
      <path d="M-6.5,-10.5 V-26 a6.5,6.5 0 0 1 13,0 V-10.5Z" fill={lit ? C.lit : C.glassDeep} stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M0,-32 V-10.5 M-6.5,-20 H6.5" stroke={INK} strokeWidth="1.2" opacity=".6" />
      {lit ? <path d="M-5,-12 H5 V-18 H-5Z" fill={C.ember} opacity=".4" /> : null}
      <Win x={-27} y={-39} w={8} h={13} on={lit} arch frame={C.stone[3]} /><Win x={19} y={-39} w={8} h={13} on={lit} arch frame={C.stone[3]} />
      {/* columns */}
      {cols.map((x) => (
        <g key={x}>
          <rect x={x - 6} y={-13.5} width="12" height="3" rx=".8" fill={`url(#${id}-col)`} stroke={INK} strokeWidth="1.3" />
          <rect x={x - 4.4} y={-42} width="8.8" height="28.6" fill={`url(#${id}-col)`} stroke={INK} strokeWidth="1.6" />
          <path d={`M${x - 1.6},-41 V-14.4 M${x + 1.4},-41 V-14.4`} stroke={C.stone[3]} strokeWidth=".8" opacity=".5" />
          <rect x={x - 6.2} y={-45.2} width="12.4" height="3.4" rx=".8" fill={`url(#${id}-col)`} stroke={INK} strokeWidth="1.4" />
          <path d={`M${x - 6.2},-45.2 q-1.4,-1.8 0,-3.2 H${x + 6.2} q1.4,1.4 0,3.2`} fill={C.stone[0]} stroke={INK} strokeWidth="1.1" />
        </g>
      ))}
      {/* beam, frieze and cornice */}
      <path d="M-47,-48.4 H47 V-52.4 H-47Z" fill={`url(#${id}-ped)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-47,-52.4 H47 V-56.4 H-47Z" fill={C.stone[2]} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={Array.from({ length: 24 }, (_, i) => `M${-45 + i * 3.9},-52.4 v-4`).join(' ')} stroke={INK} strokeWidth=".8" opacity=".45" />
      <path d="M-49,-56.4 H49 V-59 H-49Z" fill={C.stone[0]} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* pediment, with the brass anchor and scales set in it */}
      <path d="M-50,-59 L0,-82 L50,-59Z" fill={`url(#${id}-ped)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-39,-61 L0,-78 L39,-61Z" fill={C.stone[2]} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M-50,-59 L0,-82" stroke="#fff" strokeWidth="1.4" opacity=".5" />
      <g transform="translate(0,-67)"><circle r="6" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.3" /><path d="M0,-3.6 V3.6 M-2.6,-1.2 H2.6 M-3,1.4 q3,3.2 6,0" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" /></g>
      <g stroke={INK} strokeWidth="1" fill={C.stone[3]} opacity=".8"><circle cx="-28" cy="-64" r="1.4" /><circle cx="28" cy="-64" r="1.4" /></g>
      {/* the scales on the roof */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M0,-82 V-94" stroke={INK} strokeWidth="3.4" /><path d="M0,-82 V-94" stroke={C.gold[1]} strokeWidth="1.6" />
        <path d="M-10,-93 H10" stroke={INK} strokeWidth="3.4" /><path d="M-10,-93 H10" stroke={C.gold[1]} strokeWidth="1.6" />
        <path d="M-9,-93 L-12,-85 M-9,-93 L-6,-85 M9,-93 L6,-85 M9,-93 L12,-85" stroke={INK} strokeWidth="1" />
        <path d="M-14.6,-85 h5.6 q-2.8,4 -5.6,0Z M6,-85 h5.6 q-2.8,4 -5.6,0Z" transform="translate(-0.6,0)" fill={C.gold[1]} stroke={INK} strokeWidth="1.2" />
        <circle cx="0" cy="-95" r="2.2" fill={C.gold[1]} stroke={INK} strokeWidth="1.2" />
      </g>
      <Flag x={47} y={-59} h={15} cleared={cleared} />
      {/* braziers either side of the steps */}
      {[-54, 54].map((x) => (
        <g key={x}>
          <path d={`M${x - 3},0 L${x - 1.6},-9 H${x + 1.6} L${x + 3},0Z`} fill={C.iron[2]} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d={`M${x - 5.4},-9 H${x + 5.4} L${x + 3.4},-13 H${x - 3.4}Z`} fill={C.iron[1]} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          {lit ? <><circle cx={x} cy={-15} r="7" fill={C.ember} opacity=".25" /><path d={`M${x - 3},-13 C${x - 4},-18 ${x - 1},-19 ${x - 1},-23 C${x + 2},-20 ${x + 4},-17 ${x + 3},-13Z`} fill={C.ember} stroke={INK} strokeWidth="1" strokeLinejoin="round" /><path d={`M${x - 1},-13 C${x - 1.6},-16 ${x},-17 ${x + 0.2},-19 C${x + 1.6},-17 ${x + 2},-15 ${x + 1.4},-13Z`} fill={C.litHot} /></> : <ellipse cx={x} cy={-13.4} rx="3" ry="1" fill={C.rock[3]} />}
        </g>
      ))}
    </g>
  );
}

// ───────────────────────────── orrery: an observatory dome with a telescope and an armillary sphere ─────────────────────────────
export function Orrery({ id, seed, lit, cleared }: StructureProps) {
  return (
    <g transform="translate(4,5)">
      <defs>
        <linearGradient id={`${id}-drum`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.stone[0]} /><stop offset=".5" stopColor={C.stone[1]} /><stop offset="1" stopColor={C.stone[3]} /></linearGradient>
        <radialGradient id={`${id}-dome`} cx=".34" cy=".26" r=".9"><stop offset="0" stopColor={C.verdigris[0]} /><stop offset=".45" stopColor={C.verdigris[1]} /><stop offset="1" stopColor={C.verdigris[3]} /></radialGradient>
        <StonePat id={`${id}-stn`} seed={seed + 7} ramp={C.stone} w={26} h={14} rows={3} />
        <Ramp id={`${id}-br`} ramp={C.gold} x2={1} y2={1} />
        <Ramp id={`${id}-bt`} ramp={C.copper} x2={0} y2={1} />
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f2c5a" /><stop offset="1" stopColor="#0a1030" /></linearGradient>
      </defs>
      {shadow(0, 4, 34, 5)}
      {/* the round stone drum */}
      <path d="M-27,-22 V-1 C-20,5 20,5 27,-1 V-22Z" fill={`url(#${id}-drum)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-27,-22 V-1 C-20,5 20,5 27,-1 V-22Z" fill={`url(#${id}-stn)`} opacity=".25" />
      <path d="M-27,-9 C-20,-4 20,-4 27,-9" stroke={INK} strokeWidth="1.1" opacity=".4" fill="none" />
      <Win x={-20} y={-18} w={7} h={11} on={lit} arch frame={C.stone[3]} /><Win x={13} y={-18} w={7} h={11} on={lit} arch frame={C.stone[3]} />
      <path d="M-5,0 V-10 a5,5 0 0 1 10,0 V0Z" fill={C.copper[1]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /><path d="M0,-15 V0" stroke={C.copper[3]} strokeWidth="1" />
      <ellipse cx="0" cy="-22" rx="27.6" ry="5.4" fill={C.stone[0]} stroke={INK} strokeWidth="1.8" /><ellipse cx="0" cy="-22.6" rx="22" ry="3.4" fill={C.stone[1]} opacity=".7" />
      {/* the copper dome, its ribs and the open slit */}
      <path d="M-26,-22 C-26,-48 -14,-62 0,-62 C14,-62 26,-48 26,-22 C19,-17.6 -19,-17.6 -26,-22Z" fill={`url(#${id}-dome)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <g stroke={C.verdigris[3]} strokeWidth="1.2" fill="none" opacity=".75" strokeLinecap="round">
        <path d="M0,-62 C-10,-48 -16,-34 -20,-19" /><path d="M0,-62 C-5,-46 -8,-32 -10,-18.4" /><path d="M0,-62 C10,-48 16,-34 20,-19" /><path d="M0,-62 C5,-46 8,-32 10,-18.4" />
        <path d="M-21,-40 C-10,-36 10,-36 21,-40" /><path d="M-24,-30 C-12,-25 12,-25 24,-30" />
      </g>
      <path d="M-3.6,-61 L-4.8,-20 H4.8 L3.6,-61Z" fill={`url(#${id}-sky)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <g fill="#fff"><circle cx="-1" cy="-50" r=".7" /><circle cx="1.4" cy="-40" r=".6" /><circle cx="-1.6" cy="-31" r=".7" /><circle cx="0.8" cy="-25" r=".5" /></g>
      <path d="M-5.2,-40 H5.2 M-5,-30 H5" stroke={C.gold[2]} strokeWidth="1.2" />
      {/* the telescope leaning out of the slit */}
      <g transform="translate(0,-37) rotate(-40)">
        <rect x="-4" y="-3.6" width="10" height="7.2" rx="1.6" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.5" />
        <rect x="5" y="-3" width="26" height="6" rx="1.4" fill={`url(#${id}-bt)`} stroke={INK} strokeWidth="1.6" />
        <path d="M11,-3 V3 M20,-3 V3 M28,-3 V3" stroke={INK} strokeWidth="1.1" />
        <path d="M6,-2 H30" stroke="#fff" strokeWidth="1" opacity=".5" />
        <rect x="30" y="-3.8" width="4.4" height="7.6" rx="1.2" fill={C.gold[1]} stroke={INK} strokeWidth="1.4" /><ellipse cx="34.6" cy="0" rx="1.2" ry="3" fill={C.verdigris[0]} stroke={INK} strokeWidth="1" />
      </g>
      <Star x={34} y={-72} r={3.6} /><Star x={22} y={-76} r={2} /><Star x={-30} y={-58} r={2.4} />
      <path d="M0,-62 V-67" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><circle cx="0" cy="-68" r="2" fill={C.gold[1]} stroke={INK} strokeWidth="1.1" />
      {/* the armillary sphere on its stone stand */}
      <g transform="translate(-48,2)">
        {shadow(0, 1, 9, 2.4)}
        <path d="M-7,0 H7 L5,-7 H-5Z" fill={C.stone[1]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><path d="M-3,-7 V-12 H3 V-7Z" fill={C.stone[0]} stroke={INK} strokeWidth="1.4" />
        <g fill="none" strokeLinecap="round">
          <g stroke={INK} strokeWidth="3.6"><circle cx="0" cy="-24" r="11.4" /><ellipse cx="0" cy="-24" rx="4.4" ry="11.4" /><ellipse cx="0" cy="-24" rx="11.4" ry="3.6" /><path d="M-5,-36 L5,-12" /></g>
          <g stroke={C.gold[1]} strokeWidth="1.8"><circle cx="0" cy="-24" r="11.4" /><ellipse cx="0" cy="-24" rx="4.4" ry="11.4" /><ellipse cx="0" cy="-24" rx="11.4" ry="3.6" stroke={C.gold[2]} /><path d="M-5,-36 L5,-12" stroke={C.gold[0]} /></g>
        </g>
        <circle cx="0" cy="-24" r="3.2" fill={C.verdigris[1]} stroke={INK} strokeWidth="1.3" /><circle cx="-1" cy="-25" r="1" fill="#fff" opacity=".8" />
      </g>
      <Flag x={40} y={-1} h={26} cleared={cleared} />
    </g>
  );
}

// ───────────────────────────── market: three booths under striped awnings, a lantern string and a jetty with a rowboat ─────────────────────────────
const JAR = ['#e0698a', '#8cc26a', '#f2c25c', '#5fb7c8'];
export function Market({ id, seed, lit, cleared }: StructureProps) {
  const booths = [
    { cx: -40, goods: 'fruit', cloth: '#d9577a', stripe: 'var(--ac, #f2c25c)' },
    { cx: 0, goods: 'fish', cloth: '#3f9fb4', stripe: '#4fb1c4' },
    { cx: 40, goods: 'cloth', cloth: '#e0a63a', stripe: '#e0698a' },
  ] as const;
  return (
    <g transform="translate(2,5)">
      <defs>
        <PlankPat id={`${id}-pl`} seed={seed + 5} ramp={C.timber} w={24} h={14} />
        <linearGradient id={`${id}-aw`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient>
      </defs>
      {shadow(0, 4, 70, 5)}
      {/* a jetty reaching out behind the left shore, on stilts */}
      <g>
        {[-100, -111, -121].map((x, i) => <g key={x}><ellipse cx={x} cy={18 - i} rx="4.4" ry="1.4" fill="none" stroke="#d6f2ec" strokeWidth="1" opacity=".8" /><path d={`M${x},${6 - i * 0.4} V${17 - i}`} stroke={INK} strokeWidth="4.2" strokeLinecap="round" /><path d={`M${x},${6 - i * 0.4} V${17 - i}`} stroke={C.timber[2]} strokeWidth="2" strokeLinecap="round" /></g>)}
        <path d="M-88,1 L-124,-3 L-124,3 L-88,7Z" fill={`url(#${id}-pl)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M-88,7 L-124,3 V6 L-88,10Z" fill={C.timber[3]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={Array.from({ length: 8 }, (_, i) => `M${-92 - i * 4.4},${1.6 + (i * 4.4 * 4) / 36 * -1 + 0.2} V${7.6 - (i * 4.4 * 4) / 36}`).join(' ')} stroke={C.timber[3]} strokeWidth=".8" opacity=".55" />
        <path d="M-88,1 L-124,-3" stroke={C.timber[0]} strokeWidth="1.4" />
        <path d="M-122,-3 V-11" stroke={INK} strokeWidth="3.6" strokeLinecap="round" /><path d="M-122,-3 V-11" stroke={C.timber[1]} strokeWidth="1.6" strokeLinecap="round" /><circle cx="-122" cy="-11.6" r="2.2" fill={C.timber[1]} stroke={INK} strokeWidth="1.2" />
        <Crate x={-112} y={-1.4} w={9} h={7} /><Barrel x={-100} y={-0.6} s={0.85} />
        <Dinghy x={-112} y={27} s={0.9} />
        <path d="M-122,-9 C-124,2 -122,12 -114,22" stroke={C.plaster[3]} strokeWidth="1" fill="none" />
      </g>
      {/* the lantern string between two tall poles */}
      <path d="M-66,-2 V-57 M66,-2 V-57" stroke={INK} strokeWidth="4.4" strokeLinecap="round" /><path d="M-66,-2 V-57 M66,-2 V-57" stroke={C.timber[1]} strokeWidth="2" strokeLinecap="round" />
      <path d="M-66,-56 Q0,-34 66,-56" stroke={INK} strokeWidth="1.4" fill="none" />
      {Array.from({ length: 9 }, (_, i) => {
        const t = (i + 0.5) / 9; const x = -66 + 132 * t; const y = -56 + 22 * t * (1 - t) * 2 + 0.6;
        const c = i % 3 === 0 ? 'var(--ac, #f2c25c)' : i % 3 === 1 ? C.lit : '#ff8f6a';
        return <g key={i}>{lit ? <circle cx={f1(x)} cy={f1(y + 5)} r="8" fill={C.lit} opacity=".17" /> : null}<path d={`M${f1(x)},${f1(y)} v2.4`} stroke={INK} strokeWidth="1" /><path d={`M${f1(x - 2.8)},${f1(y + 5)} q0,-2.6 2.8,-2.6 q2.8,0 2.8,2.6 q0,3.2 -2.8,3.4 q-2.8,-0.2 -2.8,-3.4Z`} fill={lit ? c : C.glass} stroke={INK} strokeWidth="1.2" /><path d={`M${f1(x - 1)},${f1(y + 3.4)} v3`} stroke="#fff" strokeWidth=".8" opacity={lit ? 0.7 : 0.2} /></g>;
      })}
      {/* three booths */}
      {booths.map((b, k) => {
        const stripes = Array.from({ length: 6 }, (_, i) => {
          const tw = 26 / 6; const bw = 40 / 6;
          return <path key={i} d={`M${f1(-13 + i * tw)},-36 h${f1(tw)} L${f1(-20 + (i + 1) * bw)},-27 H${f1(-20 + i * bw)}Z`} fill={i % 2 === 0 ? b.stripe : '#fbf3dd'} />;
        });
        return (
          <g key={b.cx} transform={`translate(${b.cx},0)`}>
            <ellipse cx="0" cy="1" rx="21" ry="3" fill="#0b1018" opacity=".3" />
            <path d="M-15,-9 V-27 H15 V-9Z" fill="#18222e" stroke={INK} strokeWidth="1.5" />
            {lit ? <path d="M-14,-9.4 V-26 H14 V-9.4Z" fill={C.lit} opacity=".3" /> : null}
            <path d="M-14,-17.6 H14" stroke={C.timber[2]} strokeWidth="1.8" /><path d="M-14,-17.6 H14" stroke={C.timber[0]} strokeWidth=".7" opacity=".8" />
            {[-10, -4, 2, 8].map((x, i) => <g key={x}><rect x={x} y={-22 - (i % 2)} width="4.4" height={4.4 + (i % 2)} rx="1.2" fill={JAR[(i + k) % 4]} stroke={INK} strokeWidth=".9" /><rect x={x + 0.8} y={-23.4 - (i % 2)} width="2.8" height="1.6" rx=".5" fill={C.timber[1]} stroke={INK} strokeWidth=".6" /></g>)}
            <path d="M-16.5,0 V-27.5 M16.5,0 V-27.5" stroke={INK} strokeWidth="3.8" strokeLinecap="round" /><path d="M-16.5,0 V-27.5 M16.5,0 V-27.5" stroke={C.timber[1]} strokeWidth="1.7" strokeLinecap="round" />
            {/* the counter, with a cloth hanging over its front */}
            <path d="M-18,-10 L-14,-12.6 H14 L18,-10Z" fill={C.timber[0]} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M-18,-10 H18 V-2.4 q-4.5,3.6 -9,0 q-4.5,3.6 -9,0 q-4.5,3.6 -9,0 q-4.5,3.6 -9,0Z" fill={b.cloth} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M-18,-10 H18 V-8 H-18Z" fill="#fff" opacity=".22" /><path d="M-9,-8 V-2 M0,-8 V-2 M9,-8 V-2" stroke="#000" strokeWidth="1" opacity=".16" />
            {b.goods === 'fruit' ? <g>
              <path d="M-12,-12.6 L-10.6,-17 H10.6 L12,-12.6Z" fill={C.copper[1]} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" /><path d="M-10,-14 H10 M-11.6,-15.6 H11.6" stroke={C.copper[3]} strokeWidth=".8" opacity=".7" />
              {['#e0503c', '#f08a3c', '#8cc26a', '#f2c25c', '#e0503c', '#f08a3c', '#8cc26a'].map((c, i) => <circle key={i} cx={-9 + i * 3} cy={-18 - (i % 2) * 2.2} r="2.6" fill={c} stroke={INK} strokeWidth="1" />)}
            </g> : null}
            {b.goods === 'fish' ? <g>
              <path d="M-13,-12.6 H13 L11,-16 H-11Z" fill="#dff4f6" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
              {[0, 1, 2].map((i) => <g key={i} transform={`translate(${-8 + i * 8},${-17.4 - (i % 2)})`}><path d="M-4.6,0 q4.6,-5 9.2,0 q-4.6,4.6 -9.2,0Z" fill={['#9fc3d2', '#c9d6dc', '#9fc3d2'][i]} stroke={INK} strokeWidth="1" /><path d="M4.4,0 l3.4,-3 v6Z" fill="#9fc3d2" stroke={INK} strokeWidth=".9" strokeLinejoin="round" /><circle cx="-2.4" cy="-0.6" r=".7" fill={INK} /></g>)}
            </g> : null}
            {b.goods === 'cloth' ? <g>
              {['#d9577a', '#5fb7c8', '#f2c25c', '#8f7be0', '#8cc26a'].map((c, i) => <g key={i}><rect x={-12 + i * 5} y={-21.6 + (i % 2) * 1.6} width="4.6" height={9 - (i % 2) * 1.6} rx="1.3" fill={c} stroke={INK} strokeWidth="1" /><ellipse cx={-9.7 + i * 5} cy={-21.6 + (i % 2) * 1.6} rx="2.3" ry="1" fill={lighten(c, 0.35)} stroke={INK} strokeWidth=".8" /></g>)}
            </g> : null}
            {/* the striped awning */}
            <path d="M-13,-36 H13 L20,-27 H-20Z" fill="#fbf3dd" stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
            {stripes}
            <path d="M-13,-36 H13 L20,-27 H-20Z" fill={`url(#${id}-aw)`} stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M-20,-27 H20 V-25.4 q-3.33,4.2 -6.67,0 q-3.33,4.2 -6.67,0 q-3.33,4.2 -6.67,0 q-3.33,4.2 -6.67,0 q-3.33,4.2 -6.67,0 q-3.33,4.2 -6.67,0Z" fill={b.stripe} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M-20,-27 H20" stroke="#fff" strokeWidth="1" opacity=".4" />
            {k === 1 ? <g><path d="M0,-36 V-41" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><path d="M0,-41 h9 l-2,3.2 l2,3.2 h-9Z" fill="#fbf3dd" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" /><path d="M2.4,-38.4 q2,-1.6 4,0 q-2,1.8 -4,0Z" fill="#3f9fb4" /></g> : null}
          </g>
        );
      })}
      <Flag x={66} y={-57} h={12} cleared={cleared} />
      {/* things piled at the right end of the walk */}
      <Barrel x={70} y={4} s={1.05} /><Barrel x={77} y={5} s={0.88} ramp={C.copper} /><Crate x={56} y={4} w={10} h={8} /><Crate x={58} y={-4} w={7} h={6} /><Sack x={80} y={-3} s={0.8} />
    </g>
  );
}

// ───────────────────────────── tithe: a granary on mushroom stones with a loft hoist ─────────────────────────────
export function Tithe({ id, seed, lit, cleared }: StructureProps) {
  return (
    <g transform="translate(0,6)">
      <defs>
        <PlankPat id={`${id}-pl`} seed={seed + 6} ramp={C.timber} w={20} h={22} />
        <ShinglePat id={`${id}-sh`} seed={seed + 8} ramp={[C.timber[1], C.timber[2], C.timber[3], C.timber[3]]} w={12} h={8} />
        <linearGradient id={`${id}-st`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.stone[0]} /><stop offset="1" stopColor={C.stone[3]} /></linearGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".6" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".26" /></linearGradient>
      </defs>
      {shadow(0, 3, 50, 4.6)}
      {/* mushroom stones keep the rats off the grain */}
      {[-30, -10, 10, 30].map((x) => <g key={x}><path d={`M${x - 2.6},0 L${x - 2},-6 H${x + 2} L${x + 2.6},0Z`} fill={`url(#${id}-st)`} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" /><path d={`M${x - 6},-6 C${x - 4.6},-9.6 ${x + 4.6},-9.6 ${x + 6},-6Z`} fill={C.stone[1]} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" /></g>)}
      <path d="M-34,-8 H34" stroke={INK} strokeWidth="1.2" opacity=".5" />
      {/* the barn: plank walls, beams, double doors */}
      <path d="M-36,-8 V-35 H36 V-8Z" fill={`url(#${id}-pl)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-36,-8 V-35 H36 V-8Z" fill={`url(#${id}-wall)`} />
      <path d="M-36,-8 H36 M-36,-35 H36 M-36,-21 H-10 M10,-21 H36" stroke={C.timber[3]} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-36,-8 L-24,-21 M36,-8 L24,-21 M-36,-35 L-24,-21 M36,-35 L24,-21" stroke={C.timber[3]} strokeWidth="1.6" opacity=".8" />
      <path d="M-10,-8 V-26 H10 V-8Z" fill={C.timber[2]} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M0,-26 V-8 M-10,-8 L0,-26 L10,-8 M-10,-26 L0,-8 L10,-26" stroke={C.timber[3]} strokeWidth="1.3" fill="none" opacity=".85" />
      {lit ? <path d="M-1.4,-26 V-8 H1.4 V-26Z" fill={C.lit} /> : null}
      <path d="M-30,-30 h4 v7 h-4Z M26,-30 h4 v7 h-4Z" fill={lit ? C.lit : C.glass} stroke={INK} strokeWidth="1.3" />
      {/* the roof and the gable end with its hoist door */}
      <path d="M-36,-35 L0,-60 L36,-35Z" fill={`url(#${id}-pl)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M0,-62 L12,-66 L52,-39 L40,-34Z" fill={`url(#${id}-sh)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-42,-33 L0,-62 L42,-33 L37,-33 L0,-57 L-37,-33Z" fill={C.timber[2]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-42,-33 L0,-62" stroke={C.timber[0]} strokeWidth="1.4" opacity=".7" />
      <rect x="-5" y="-50" width="10" height="12" fill={lit ? C.lit : C.glassDeep} stroke={INK} strokeWidth="1.6" /><path d="M0,-50 V-38 M-5,-44 H5" stroke={C.timber[3]} strokeWidth="1" />
      <path d="M-1,-55 H16" stroke={INK} strokeWidth="3.6" strokeLinecap="round" /><path d="M-1,-55 H16" stroke={C.timber[1]} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15" cy="-55" r="2.2" fill={C.iron[1]} stroke={INK} strokeWidth="1.2" /><path d="M15,-53 V-40" stroke={C.plaster[3]} strokeWidth="1.2" />
      <Sack x={15} y={-37} s={0.75} />
      <path d="M0,-62 V-70" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="1.1" fill={C.gold[1]}><path d="M0,-70 C-3,-72 -5,-76 -4,-79 C-1,-77 0,-74 0,-70Z" /><path d="M0,-70 C3,-72 5,-76 4,-79 C1,-77 0,-74 0,-70Z" /><path d="M0,-70 C0,-75 0,-78 0,-81" fill="none" /></g>
      <Flag x={-36} y={-35} h={14} cleared={cleared} side={-1} />
      {/* the hay shed, sacks and sheaves */}
      <path d="M36,-8 V-17 H52 V-8Z" fill={`url(#${id}-pl)`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /><path d="M34,-17 L44,-24 L54,-17Z" fill={C.timber[2]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-52,0 C-50,-13 -38,-13 -36,0Z" fill="#e8c860" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /><path d="M-48,-2 l4,-7 M-44,-2 l1,-9 M-41,-2 l-3,-5" stroke="#a88a2c" strokeWidth="1" opacity=".8" />
      <Sack x={-26} y={1} s={0.9} /><Sack x={-19} y={2} s={0.8} fill={C.plaster[0]} /><Barrel x={40} y={2} s={0.95} />
      {[0, 1, 2].map((i) => <g key={i} transform={`translate(${46 + i * 6},${3 - (i % 2)})`}><path d="M-3,0 L-1.6,-10 M3,0 L1.6,-10 M0,0 V-11" stroke={INK} strokeWidth="2.4" strokeLinecap="round" /><path d="M-3,0 L-1.6,-10 M3,0 L1.6,-10 M0,0 V-11" stroke="#e8c860" strokeWidth="1.2" strokeLinecap="round" /><path d="M-3,-5 H3" stroke={C.copper[2]} strokeWidth="1.2" /></g>)}
    </g>
  );
}

