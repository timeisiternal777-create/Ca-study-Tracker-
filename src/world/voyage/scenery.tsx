import { Barrel, C, Crate, INK, PlankPat, Ramp, f1, hash } from './isles/kit';
import { blobPath } from './isles/terrain';

// The Voyage scenery that is not an island or a ship: the moon, the harbour, the far-off islands on the horizon and the Golden Ledger chest.
// All plain SVG shapes with gradients and patterns, painted once.

// ───────────────────────────── the moon ─────────────────────────────

/** A moon with maria, craters and a soft shaded edge. `id` keeps its gradient apart from others on the page. */
export function MoonArt({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  const k = r / 27;
  const craters: [number, number, number][] = [[-9, -8, 5.2], [8, 6, 4], [10, -11, 2.8], [-5, 12, 3.4], [-14, 3, 2.2], [1, -1, 2.4], [15, -2, 1.8]];
  return (
    <g transform={`translate(${cx},${cy}) scale(${f1(k)})`}>
      <defs>
        <radialGradient id={`${id}mn`} cx=".36" cy=".32" r=".85"><stop offset="0" stopColor="#fffdf0" /><stop offset=".55" stopColor="#fbeec6" /><stop offset="1" stopColor="#d8c18c" /></radialGradient>
        <clipPath id={`${id}mc`}><circle r="27" /></clipPath>
      </defs>
      <circle r="27" fill={`url(#${id}mn)`} />
      <g clipPath={`url(#${id}mc)`}>
        <path d="M-27,-4 C-20,-14 -8,-18 -2,-12 C4,-8 2,0 -6,2 C-14,4 -22,10 -27,6Z" fill="#b9a574" opacity=".28" />
        <path d="M6,8 C12,2 22,4 27,10 V27 H4Z" fill="#b9a574" opacity=".22" />
        {craters.map(([x, y, rr], i) => <g key={i}><circle cx={x} cy={y} r={rr} fill="#cdb685" opacity=".5" /><circle cx={x} cy={y} r={rr} fill="none" stroke="#a48f5e" strokeWidth=".9" opacity=".6" /><path d={`M${x - rr * 0.7},${y - rr * 0.2} A${rr * 0.8},${rr * 0.8} 0 0 1 ${x + rr * 0.1},${y - rr * 0.8}`} stroke="#fffdf0" strokeWidth=".9" fill="none" opacity=".7" strokeLinecap="round" /></g>)}
        <circle cx="9" cy="8" r="28" fill="none" stroke="#6b5a36" strokeWidth="14" opacity=".13" />
      </g>
      <circle r="27" fill="none" stroke="#fff6d6" strokeWidth="1.3" opacity=".6" />
    </g>
  );
}

// ───────────────────────────── the harbour ─────────────────────────────

/** The harbour where the voyage begins: a harbour-master's hut, a lamp, a pier on stilts, crates and a rowing boat on a line. Origin is the shore end of the pier deck. */
export function HarbourArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <PlankPat id={`${id}pl`} seed={11} ramp={C.timber} w={22} h={10} />
        <PlankPat id={`${id}hw`} seed={12} ramp={C.plaster} w={16} h={16} />
        <Ramp id={`${id}rf`} ramp={C.verdigris} x2={0} y2={1} />
        <linearGradient id={`${id}wl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f8aa8" stopOpacity=".0" /><stop offset="1" stopColor="#041018" stopOpacity=".5" /></linearGradient>
      </defs>
      {/* stilts, with ripples where they meet the water */}
      {[8, 26, 44, 62].map((x) => <g key={x}><ellipse cx={x} cy="31" rx="6" ry="1.8" fill="none" stroke="#d6f2ec" strokeWidth="1.1" opacity=".75" /><path d={`M${x},8 V30`} stroke={INK} strokeWidth="5" strokeLinecap="round" /><path d={`M${x},8 V30`} stroke={C.timber[2]} strokeWidth="2.6" strokeLinecap="round" /><path d={`M${x - 3.4},19 H${x + 3.4}`} stroke={C.iron[1]} strokeWidth="1.4" /></g>)}
      <path d="M8,10 L26,28 M26,10 L8,28 M44,10 L62,28 M62,10 L44,28" stroke={INK} strokeWidth="1.2" opacity=".55" />
      {/* the deck */}
      <path d="M-4,0 H72 V9 H-4Z" fill={`url(#${id}pl)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-4,0 H72" stroke={C.timber[0]} strokeWidth="1.8" /><path d="M-4,9 H72 V12 H-4Z" fill={C.timber[3]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={Array.from({ length: 16 }, (_, i) => `M${i * 4.7},0.6 V8.4`).join(' ')} stroke={C.timber[3]} strokeWidth=".7" opacity=".5" />
      {/* the harbour-master's hut */}
      <g transform="translate(-26,0)">
        <ellipse cx="2" cy="1" rx="22" ry="3" fill="#0b1018" opacity=".3" />
        <path d="M-14,0 V-22 H18 V0Z" fill={`url(#${id}hw)`} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M-14,0 V-22 H-10 V0Z" fill="#fff" opacity=".18" /><path d="M14,0 V-22 H18 V0Z" fill="#000" opacity=".18" />
        <path d="M-18,-22 L2,-38 L22,-22Z" fill={`url(#${id}rf)`} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" /><path d="M-18,-22 L2,-38 L-3,-22Z" fill="#fff" opacity=".16" />
        <path d="M-8,-16 h9 v9 h-9Z" fill={C.lit} stroke={C.timber[3]} strokeWidth="1.4" /><path d="M-3.5,-16 V-7 M-8,-11.5 H1" stroke={C.timber[3]} strokeWidth=".9" /><path d="M-7,-10 h7 v2.6 h-7Z" fill={C.ember} opacity=".4" />
        <path d="M6,0 V-12 a3.5,3.5 0 0 1 7,0 V0Z" fill={C.timber[1]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2,-38 V-48" stroke={INK} strokeWidth="2" strokeLinecap="round" /><path d="M2,-48 h10 q-2,2.6 0,5.4 h-10Z" fill="#d9577a" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      {/* the pier lamp */}
      <g>
        <path d="M0,0 V-24" stroke={INK} strokeWidth="4.2" strokeLinecap="round" /><path d="M0,0 V-24" stroke={C.iron[1]} strokeWidth="2" strokeLinecap="round" />
        <path d="M-5,-20 H5 L3.4,-27 H-3.4Z" fill={C.iron[2]} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
        <rect className="pier-lamp" x="-4" y="-27" width="8" height="9.4" rx="2.4" strokeWidth="1.4" />
        <path d="M-5.4,-27 L0,-33 L5.4,-27Z" fill={C.copper[1]} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" /><circle cx="0" cy="-34" r="1.3" fill={C.gold[1]} stroke={INK} strokeWidth=".8" />
      </g>
      {/* things on the pier */}
      <Barrel x={16} y={0} s={1.1} /><Barrel x={24} y={1} s={0.9} ramp={C.copper} /><Crate x={46} y={0} w={11} h={9} /><Crate x={50} y={-9} w={8} h={7} />
      <g transform="translate(36,0)"><ellipse cx="0" cy="-1.6" rx="5.4" ry="2.2" fill="none" stroke={C.plaster[2]} strokeWidth="2.4" /><ellipse cx="0" cy="-3.6" rx="4.4" ry="1.8" fill="none" stroke={C.plaster[1]} strokeWidth="2.2" /><path d="M5,-2 q4,2 6,6" stroke={C.plaster[2]} strokeWidth="1.6" fill="none" strokeLinecap="round" /></g>
      {/* a rowing boat on its line */}
      <g transform="translate(84,28)">
        <ellipse cx="0" cy="4" rx="18" ry="3" fill="#041018" opacity=".35" />
        <path d="M-16,-4 H16 C14,3 7,6 0,6 C-7,6 -14,3 -16,-4Z" fill={C.timber[1]} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /><path d="M-15,-4 H15" stroke={C.timber[0]} strokeWidth="1.8" />
        <path d="M-10,0 C-4,3 4,3 10,0" stroke={C.timber[3]} strokeWidth="1" fill="none" opacity=".6" />
        <path d="M-6,-4 L8,-12 M3,-4 L14,-10" stroke={INK} strokeWidth="2.4" strokeLinecap="round" /><path d="M-6,-4 L8,-12 M3,-4 L14,-10" stroke={C.timber[0]} strokeWidth="1" strokeLinecap="round" />
      </g>
      <path d="M72,8 C78,14 80,20 78,25" stroke={C.plaster[2]} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  );
}

// ───────────────────────────── the far-off islands ─────────────────────────────

/** Three low islands on the horizon: a lighthouse, a village with a few lit windows and a hill. Drawn dark and cool so they sit far away. */
export function FarIsles() {
  const win = (x: number, y: number, k: number) => <rect key={`${x}${y}`} x={x} y={y} width="1.8" height="2.2" rx=".4" fill="#ffd77a" opacity={0.5 + k * 0.4} />;
  return (
    <g className="sea-far">
      <defs>
        <linearGradient id="farg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#17495a" /><stop offset="1" stopColor="#0a2530" /></linearGradient>
      </defs>
      <ellipse cx="6" cy="2" rx="86" ry="8" fill="#e2f3f4" opacity=".07" stroke="none" />
      <path d="M-62,2 C-58,-8 -44,-12 -34,-8 C-28,-14 -16,-12 -12,-4 C-8,-1 -6,1 -4,2Z" fill="url(#farg)" />
      <path d="M-18,2 C-16,-10 -4,-18 8,-17 C20,-17 28,-10 30,2Z" fill="url(#farg)" />
      <path d="M26,2 C30,-6 42,-9 52,-6 C60,-4 64,-1 66,2Z" fill="url(#farg)" />
      <g stroke="none" fill="#0a2530">
        <path d="M-34,-9 h5 l-1,-12 h-3Z" /><path d="M-35.4,-21 h8 l-4,-6Z" /><rect x="-33.6" y="-20" width="3.6" height="3" rx=".6" fill="#ffe9a8" />
        <path d="M-10,-15 h6 v-5 l3,-3 l3,3 v5 h6 v-4 l3,-3 l3,3 v7Z" />
      </g>
      {win(-7, -17, 0.5)}{win(4, -17, 1)}{win(12, -15, 0.3)}{win(40, -6, 0.6)}{win(46, -5, 0.2)}
      <path d="M-34,-27 L-58,-29 L-58,-22Z" fill="#ffe9a8" opacity=".12" stroke="none" />
      <path d="M-62,2 C-58,-8 -44,-12 -34,-8 C-28,-14 -16,-12 -12,-4 M-18,2 C-16,-10 -4,-18 8,-17 C20,-17 28,-10 30,2 M26,2 C30,-6 42,-9 52,-6 C60,-4 64,-1 66,2" fill="none" stroke="rgb(143 230 220 / 0.3)" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

// ───────────────────────────── the Golden Ledger ─────────────────────────────

const PILE_COINS = Array.from({ length: 78 }, (_, i) => {
  const a = hash(7, i, 1); const b = hash(7, i, 2); const c = hash(7, i, 3);
  const x = (a - 0.5) * 88; const rise = Math.max(0, 1 - Math.pow(x / 46, 2));
  const front = hash(7, i, 5) > 0.55;
  return { x: f1(x), y: f1(front ? -44 - b * 5 - rise * b * 6 : -48 - rise * (6 + b * 26)), r: f1((c - 0.5) * 56), t: hash(7, i, 4) };
}).sort((p, q) => p.y - q.y);

/** The chest's wooden body: planks, brass bands with rivets, corner plates, a base rim and a staple for the lock. Fits x -52 to 52, y -46 to 2. */
export function ChestBody({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <PlankPat id={`${id}cp`} seed={21} ramp={['#b57640', '#8a5430', '#5e3a22', '#3a2314']} w={26} h={16} />
        <linearGradient id={`${id}cs`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".14" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></linearGradient>
        <Ramp id={`${id}cg`} ramp={C.gold} x2={1} y2={1} />
      </defs>
      <ellipse cx="0" cy="3" rx="60" ry="6" fill="#0b1018" opacity=".32" />
      <path d="M-50,0 V-44 H50 V0Z" fill={`url(#${id}cp)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M-50,0 V-44 H50 V0Z" fill={`url(#${id}cs)`} />
      <path d="M-49,-30 H49 M-49,-15 H49" stroke="#2a180e" strokeWidth="1.2" opacity=".55" />
      {[-30, 30].map((x) => <g key={x}><path d={`M${x - 6},0 V-44 H${x + 6} V0Z`} fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /><path d={`M${x - 4},-42 V-2`} stroke="#fff" strokeWidth="1.2" opacity=".5" />{[-38, -26, -14, -5].map((y) => <circle key={y} cx={x} cy={y} r="1.5" fill={C.gold[0]} stroke={INK} strokeWidth=".8" />)}</g>)}
      <path d="M-52,0 H52 V-6 H-52Z" fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /><path d="M-52,-6 H52" stroke="#fff" strokeWidth="1" opacity=".5" />
      {[[-50, -44, 1], [50, -44, -1]].map(([x, y, s]) => <path key={x} d={`M${x},${y} h${12 * s} v7 h${-5 * s} v${9} h${-7 * s}Z`} fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />)}
      <path d="M-5,-44 H5 V-34 L0,-30 L-5,-34Z" fill={C.gold[2]} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

/** The closed lid: a domed lid with planks, two bands, a brass rim and the lock plate that clasps the body. */
export function ChestLidClosed({ id }: { id: string }) {
  const dome = 'M-52,-44 Q-52,-88 0,-88 Q52,-88 52,-44Z';
  return (
    <g>
      <clipPath id={`${id}lc`}><path d={dome} /></clipPath>
      <path d={dome} fill={`url(#${id}cp)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <g clipPath={`url(#${id}lc)`}>
        <path d="M-18,-90 Q-20,-66 -18,-44 M18,-90 Q20,-66 18,-44 M0,-90 V-44 M-40,-80 Q-42,-62 -40,-44 M40,-80 Q42,-62 40,-44" stroke="#2a180e" strokeWidth="1.1" opacity=".45" fill="none" />
        {[-30, 30].map((x) => <g key={x}><rect x={x - 6} y="-92" width="12" height="50" fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.5" /><path d={`M${x - 4},-90 V-46`} stroke="#fff" strokeWidth="1.2" opacity=".5" />{[-80, -68, -56].map((y) => <circle key={y} cx={x} cy={y} r="1.5" fill={C.gold[0]} stroke={INK} strokeWidth=".8" />)}</g>)}
        <path d="M-52,-44 Q-52,-88 0,-88 Q52,-88 52,-44Z" fill={`url(#${id}cs)`} />
        <path d="M-44,-66 Q-36,-82 -16,-84" stroke="#fff" strokeWidth="2.2" opacity=".28" fill="none" strokeLinecap="round" />
      </g>
      <path d="M-54,-44 H54 V-49 H-54Z" fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /><path d="M-54,-48 H54" stroke="#fff" strokeWidth="1" opacity=".5" />
      <path d="M-9,-50 H9 V-36 L0,-27 L-9,-36Z" fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="0" cy="-40" r="2.6" fill="#1a1010" stroke={INK} strokeWidth="1" /><path d="M0,-40 V-34" stroke="#1a1010" strokeWidth="2" strokeLinecap="round" />
      <circle cx="-5.4" cy="-46" r=".9" fill={C.gold[0]} /><circle cx="5.4" cy="-46" r=".9" fill={C.gold[0]} />
    </g>
  );
}

/** The open lid, standing up behind the chest: velvet lining with a braided gold edge, wood and brass on the back of it. */
export function ChestLidOpen({ id }: { id: string }) {
  const outer = 'M-50,-46 L-42,-112 Q0,-124 42,-112 L50,-46Z';
  const inner = 'M-43,-50 L-36,-108 Q0,-118 36,-108 L43,-50Z';
  return (
    <g>
      <defs>
        <pattern id={`${id}vl`} width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#7c2236" /><path d="M0,4.5 L4.5,0 L9,4.5 L4.5,9Z" fill="#92304a" stroke="#4e1424" strokeWidth=".7" /><circle cx="4.5" cy="4.5" r=".9" fill={C.gold[1]} /></pattern>
        <linearGradient id={`${id}vs`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".38" /><stop offset=".6" stopColor="#000" stopOpacity="0" /></linearGradient>
      </defs>
      <path d={outer} fill={`url(#${id}cp)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={inner} fill={`url(#${id}vl)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d={inner} fill={`url(#${id}vs)`} />
      <path d="M-39,-52 L-33,-104 Q0,-113 33,-104 L39,-52" fill="none" stroke={C.gold[1]} strokeWidth="1.6" strokeDasharray="3 2.4" strokeLinecap="round" opacity=".9" />
      <path d="M-50,-46 L-42,-112 L-34,-112 L-40,-46Z M50,-46 L42,-112 L34,-112 L40,-46Z" fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-47,-52 H47 V-46 H-47Z" fill={`url(#${id}cg)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

/** The gold: a mound of coins on edge, a few gems and a pearl. */
export function ChestGold({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}co`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff6c8" /><stop offset=".55" stopColor="#f6c64f" /><stop offset="1" stopColor="#c88a1c" /></radialGradient>
      </defs>
      <ellipse className="fin-gold" cx="0" cy="-45" rx="46" ry="10" stroke={INK} strokeWidth="1.6" fill="#b07a22" />
      {PILE_COINS.map((c, i) => (
        <g key={i} transform={`translate(${c.x},${c.y}) rotate(${c.r})`}>
          <ellipse rx="6.6" ry="3" fill={`url(#${id}co)`} stroke={INK} strokeWidth="1.1" opacity={0.86 + c.t * 0.14} />
          <ellipse rx="4.2" ry="1.7" fill="none" stroke="#c88a1c" strokeWidth=".7" /><path d="M-4.4,-1 q3,-1.6 6,-.4" stroke="#fff" strokeWidth=".9" opacity=".7" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <g stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
        <path d="M-22,-62 l4,-5 l4,5 l-4,6Z" fill="#e0503c" /><path d="M-22,-62 h8 M-18,-67 v11" stroke="#ffb3a6" strokeWidth=".7" />
        <path d="M22,-60 l4,-5 l4,5 l-4,6Z" fill="#4f9fe0" /><path d="M22,-60 h8 M26,-65 v11" stroke="#b9ddff" strokeWidth=".7" />
        <path d="M2,-72 l4,-5 l4,5 l-4,6Z" fill="#4fc27a" /><path d="M2,-72 h8 M6,-77 v11" stroke="#bff0cf" strokeWidth=".7" />
      </g>
      <circle cx="-36" cy="-52" r="3.4" fill="#f7efe4" stroke={INK} strokeWidth="1.1" /><circle cx="-37" cy="-53" r="1" fill="#fff" />
      <path d="M30,-50 h14 l-2,-5 h-10Z" fill="#f2c25c" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  );
}

/** The Golden Ledger chest at any size: closed, or open with the gold showing. Drawn about 104 wide; scale it with a transform. */
export function LedgerChest({ id, open }: { id: string; open: boolean }) {
  return (
    <g>
      {open ? <ChestLidOpen id={id} /> : null}
      <ChestBody id={id} />
      {open ? <ChestGold id={id} /> : <ChestLidClosed id={id} />}
    </g>
  );
}

// ───────────────────────────── a small isle for the Golden Ledger ─────────────────────────────

/** The ledger's own islet: a sandy bar with a few rocks, palms and a stone plinth for the chest. Origin at the middle of the beach. */
export function LedgerIslet({ id, seed = 5, chest = true, open = false }: { id: string; seed?: number; chest?: boolean; open?: boolean }) {
  const sand = blobPath(seed, 150, 30, 12, 0.07);
  const foam = blobPath(seed, 164, 38, 12, 0.07);
  return (
    <g>
      <defs>
        <Ramp id={`${id}sd`} ramp={C.sand} /><Ramp id={`${id}rk`} ramp={C.rock} />
      </defs>
      <path d={foam} transform="translate(0,12)" fill="#d6f2ec" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={blobPath(seed, 156, 33, 12, 0.07)} transform="translate(0,12)" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="7 8" strokeLinecap="round" opacity=".9" />
      <path d={sand} transform="translate(0,20)" fill={`url(#${id}rk)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={sand} transform="translate(0,11)" fill={`url(#${id}sd)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={blobPath(seed + 3, 118, 20, 10, 0.1)} transform="translate(0,8)" fill="#e9d9a5" opacity=".7" />
      <g stroke={C.sand[3]} strokeWidth="1.4" strokeLinecap="round" opacity=".5" fill="none"><path d="M-110,14 q20,-6 44,-2 M60,20 q24,-6 50,-1 M-30,28 q20,4 44,0" /></g>
      {[[-112, 8, 1.1], [118, 6, 0.9], [-70, 26, 0.7], [84, 28, 0.8]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${s})`}><path d="M-12,0 C-14,-8 -6,-14 0,-14 C8,-14 14,-8 12,0Z" fill={C.rock[1]} stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M-9,-3 C-9,-8 -4,-12 0,-12 C-4,-8 -6,-6 -6,-1Z" fill={C.rock[0]} opacity=".85" /></g>
      ))}
      {/* two little palms */}
      {[[-96, -2, 1], [100, -4, -1]].map(([x, y, f], i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${f},1)`}>
          <path d="M0,0 C2,-14 -2,-28 4,-40" stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M0,0 C2,-14 -2,-28 4,-40" stroke={C.timber[1]} strokeWidth="3" fill="none" strokeLinecap="round" />
          {[[-22, 4], [-12, -8], [2, -12], [14, -6], [22, 6]].map(([dx, dy], k) => <path key={k} d={`M4,-40 q${dx * 0.5},${dy - 14} ${dx},${dy}`} stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />)}
          {[[-22, 4], [-12, -8], [2, -12], [14, -6], [22, 6]].map(([dx, dy], k) => <path key={k} d={`M4,-40 q${dx * 0.5},${dy - 14} ${dx},${dy}`} stroke={k % 2 ? C.grass[1] : C.grass[0]} strokeWidth="2.6" fill="none" strokeLinecap="round" />)}
          <circle cx="2" cy="-38" r="2.4" fill={C.timber[2]} stroke={INK} strokeWidth="1" />
        </g>
      ))}
      {/* the plinth */}
      <path d="M-36,18 L-30,6 H30 L36,18 C20,24 -20,24 -36,18Z" fill={C.stone[1]} stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M-30,6 H30 L28,2 H-28Z" fill={C.stone[0]} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-20,8 V18 M0,9 V22 M20,8 V18" stroke={C.stone[3]} strokeWidth="1" opacity=".5" />
      {chest ? <g transform="translate(0,3) scale(.42)"><LedgerChest id={`${id}ch`} open={open} /></g> : null}
    </g>
  );
}

/** A sea-gate on the route card: a banded pole with a lantern and a pennant (the pennant keeps its class so it can turn gold when the sea is sailed). */
export function SeaGate({ done }: { done: boolean }) {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="9" ry="2.4" fill="#0b1018" opacity=".3" />
      <path d="M0,0 V-42" stroke={INK} strokeWidth="6.4" strokeLinecap="round" /><path d="M0,0 V-42" stroke={C.timber[1]} strokeWidth="3.4" strokeLinecap="round" />
      {[-8, -18, -28].map((y, i) => <path key={y} d={`M-2.6,${y} H2.6`} stroke={i % 2 ? '#fbf3dd' : C.copper[1]} strokeWidth="3" />)}
      <path d="M-5,0 H5 L3.4,-5 H-3.4Z" fill={C.stone[1]} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M0,-42 V-46" stroke={INK} strokeWidth="2" strokeLinecap="round" /><circle cx="0" cy="-47" r="2.4" fill={C.gold[1]} stroke={INK} strokeWidth="1.1" />
      <path className={done ? 'vc-pennant is-done' : 'vc-pennant'} d="M0,-40 l24,9 l-24,9z" />
    </g>
  );
}
