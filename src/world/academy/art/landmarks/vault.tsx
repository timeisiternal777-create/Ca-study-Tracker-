import type { ReactNode } from 'react';
import { ArchWindow, Brazier, Lantern, P, Pennant, SlatePattern, StonePattern, darken } from '../kit';
import type { LandmarkDef } from './types';

/** The great round vault door: a steel disc with locking bolts, a spoked handwheel and a combination dial. Centre (cx, cy). */
function VaultDoor({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  const bolts: ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    bolts.push(<g key={i}><rect x={(cx + Math.cos(a) * (r - 2.6) - 2.2).toFixed(1)} y={(cy + Math.sin(a) * (r - 2.6) - 2.2).toFixed(1)} width="4.4" height="4.4" rx="1.2" fill="#9a9ac0" stroke="#23233a" strokeWidth=".6" transform={`rotate(${((a * 180) / Math.PI).toFixed(0)} ${(cx + Math.cos(a) * (r - 2.6)).toFixed(1)} ${(cy + Math.sin(a) * (r - 2.6)).toFixed(1)})`} /></g>);
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 3.4} fill="#14122e" />
      <circle cx={cx} cy={cy} r={r + 1.6} fill={`url(#${id}-steel)`} />
      <circle cx={cx} cy={cy} r={r - 5.6} fill="none" stroke="#23233a" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={r - 8.4} fill={`url(#${id}-steel2)`} />
      <circle cx={cx} cy={cy} r={r - 8.4} fill="none" stroke="#d6d8ff" strokeWidth=".8" opacity=".5" />
      {bolts}
      {/* hinge barrels on the left */}
      {[-0.55, 0.55].map((k, i) => <g key={i}><rect x={(cx - r - 5).toFixed(1)} y={(cy + r * k - 5).toFixed(1)} width="9" height="10" rx="2" fill={`url(#${id}-steel)`} stroke="#14122e" strokeWidth=".8" /><path d={`M${(cx - r - 3).toFixed(1)} ${(cy + r * k - 3).toFixed(1)} h5`} stroke="#fff" strokeWidth=".6" opacity=".5" /></g>)}
      {/* the handwheel: six spokes with brass balls */}
      <circle cx={cx} cy={cy} r={r * 0.46} fill="none" stroke="#14122e" strokeWidth="3.4" /><circle cx={cx} cy={cy} r={r * 0.46} fill="none" stroke={P.brass} strokeWidth="2" />
      {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + 0.2; return <g key={i}><path d={`M${cx} ${cy} L${(cx + Math.cos(a) * r * 0.66).toFixed(1)} ${(cy + Math.sin(a) * r * 0.66).toFixed(1)}`} stroke="#14122e" strokeWidth="3.4" strokeLinecap="round" /><path d={`M${cx} ${cy} L${(cx + Math.cos(a) * r * 0.66).toFixed(1)} ${(cy + Math.sin(a) * r * 0.66).toFixed(1)}`} stroke={P.brass} strokeWidth="1.8" strokeLinecap="round" /><circle cx={(cx + Math.cos(a) * r * 0.66).toFixed(1)} cy={(cy + Math.sin(a) * r * 0.66).toFixed(1)} r="2.6" fill={P.brassLit} stroke={P.brassShade} strokeWidth=".6" /></g>; })}
      <circle cx={cx} cy={cy} r={r * 0.17} fill={P.brass} stroke={P.brassShade} strokeWidth=".8" /><circle cx={cx - 1} cy={cy - 1} r={r * 0.06} fill="#fff3c4" opacity=".8" />
      {/* the combination dial, with tick marks, to the lower right */}
      <g transform={`translate(${cx + r * 0.52} ${cy + r * 0.5})`}>
        <circle r="6.6" fill="#14122e" /><circle r="5.4" fill="#d8d8f0" />{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <path key={i} d={`M${(Math.cos(a) * 3.8).toFixed(1)} ${(Math.sin(a) * 3.8).toFixed(1)} L${(Math.cos(a) * 5).toFixed(1)} ${(Math.sin(a) * 5).toFixed(1)}`} stroke="#14122e" strokeWidth=".6" />; })}<path d="M0 0 L2.4 -3.6" stroke="#b8434a" strokeWidth="1" strokeLinecap="round" /><circle r=".9" fill="#14122e" />
      </g>
      <path d={`M${cx - r * 0.7} ${cy - r * 0.5} A${r * 0.86} ${r * 0.86} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.9}`} stroke="#fff" strokeWidth="1.4" fill="none" opacity=".35" strokeLinecap="round" />
    </g>
  );
}

/** The Vault: a squat rusticated strongroom with a copper hip roof and cupola, a pedimented portal around a great round door, and eight barred windows. */
export const vault: LandmarkDef = {
  id: 'vault',
  name: 'The Vault',
  blurb: 'What is kept is counted twice.',
  box: { x: 0, y: -16, w: 304, h: 322 },
  slots: 8,
  door: { x: 152, y: 296 },
  flag: { x: 216, y: 56 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const all = lit.length >= 8 && lit.slice(0, 8).every(Boolean);
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-ru`} seed={91} base="#7d7a9c" w={60} h={36} rows={3} line="#1e1c3a" vary={0.12} />
          <StonePattern id={`${id}-ru2`} seed={101} base="#928eb4" w={52} h={34} rows={3} line="#1e1c3a" vary={0.1} />
          <StonePattern id={`${id}-pl`} seed={111} base="#5a5778" w={56} h={20} rows={2} vary={0.14} />
          <SlatePattern id={`${id}-sl`} seed={31} base="#4f8a82" w={24} h={14} />
          <linearGradient id={`${id}-tw`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e6e4ff" stopOpacity=".26" /><stop offset=".4" stopColor="#9a96bc" stopOpacity="0" /><stop offset="1" stopColor="#0a0820" stopOpacity=".6" /></linearGradient>
          <radialGradient id={`${id}-steel`} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#d8d8f4" /><stop offset=".4" stopColor="#8a8ab0" /><stop offset="1" stopColor="#2a2a48" /></radialGradient>
          <radialGradient id={`${id}-steel2`} cx="38%" cy="32%" r="80%"><stop offset="0" stopColor="#b4b4d8" /><stop offset=".5" stopColor="#6a6a92" /><stop offset="1" stopColor="#30305a" /></radialGradient>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.brassLit} /><stop offset=".5" stopColor={P.brass} /><stop offset="1" stopColor={P.brassShade} /></linearGradient>
          <radialGradient id={`${id}-leak`} cx="50%" cy="50%" r="55%"><stop offset=".6" stopColor="#ffd27a" stopOpacity="0" /><stop offset="1" stopColor="#ffd27a" stopOpacity=".7" /></radialGradient>
          <clipPath id={`${id}-portal`}><path d="M118 292 V196 A34 34 0 0 1 186 196 V292Z" /></clipPath>
        </defs>

        <ellipse cx="152" cy="300" rx="150" ry="10" fill="#05040f" opacity=".5" />
        {/* the yard and the steps */}
        <path d="M-4 294 H308 V316 H-4Z" fill={`url(#${id}-ground)`} />
        {[0, 1, 2, 3, 4].map((i) => <g key={i}><rect x={96 - i * 5} y={282 + i * 3.6} width={112 + i * 10} height="4.4" fill={i % 2 ? '#8e8ab0' : '#a09cc4'} /><rect x={96 - i * 5} y={286.4 + i * 3.6} width={112 + i * 10} height="1.6" fill="#05040f" opacity=".4" /></g>)}

        {/* the main block with a battered plinth */}
        <path d="M34 292 L40 268 H264 L270 292Z" fill={`url(#${id}-pl)`} /><path d="M34 292 L40 268 H264 L270 292Z" fill={`url(#${id}-tw)`} />
        <rect x="40" y="128" width="224" height="140" fill={`url(#${id}-ru)`} /><rect x="40" y="128" width="224" height="140" fill={`url(#${id}-tw)`} />
        {/* cornice with dentils */}
        <rect x="34" y="120" width="236" height="9" fill="#a09cc4" /><rect x="34" y="129" width="236" height="3" fill="#05040f" opacity=".4" /><path d="M34 120.6 H270" stroke="#fff" strokeWidth=".8" opacity=".5" />
        {Array.from({ length: 36 }, (_, i) => <rect key={i} x={37 + i * 6.5} y="132" width="3.6" height="4.6" fill="#7d7a9c" />)}
        {/* the roof: a copper hip, a cupola on the ridge */}
        <path d="M28 124 L78 74 H226 L276 124Z" fill={`url(#${id}-sl)`} /><path d="M28 124 L78 74 H226 L276 124Z" fill={`url(#${id}-tw)`} opacity=".8" />
        <path d="M28 124 L78 74 M276 124 L226 74" stroke="#1c4a48" strokeWidth="2" /><path d="M78 74 H226" stroke="#9ee0d0" strokeWidth="2.6" strokeLinecap="round" opacity=".8" />
        <g>
          <path d="M122 76 V52 H182 V76Z" fill="#14122e" /><rect x="125" y="55" width="54" height="19" fill={`url(#${id}-glass)`} />
          {[0, 1, 2, 3].map((i) => <g key={i}><rect x={129 + i * 13} y="56" width="10" height="17" fill={`url(#${id}-glass)`} stroke="#8a5f1f" strokeWidth=".8" /><rect className={all ? 'lw on' : 'lw'} x={129 + i * 13} y="56" width="10" height="17" fill={`url(#${id}-lit)`} /></g>)}
          <path d="M118 52 L152 30 L186 52Z" fill={`url(#${id}-sl)`} /><path d="M118 52 L152 30 L186 52Z" fill={`url(#${id}-tw)`} opacity=".8" />
          <path d="M152 30 V16" stroke={P.iron} strokeWidth="1.6" /><circle cx="152" cy="13" r="5" fill={`url(#${id}-gold)`} stroke={P.brassShade} strokeWidth=".7" /><path d="M149.6 13 h4.8 M152 10.6 v4.8" stroke={P.brassShade} strokeWidth=".7" />
        </g>
        {/* the portico: a projecting centre block with a pediment and a coin relief */}
        <rect x="96" y="108" width="112" height="184" fill={`url(#${id}-ru2)`} /><rect x="96" y="108" width="112" height="184" fill={`url(#${id}-tw)`} />
        <path d="M88 112 L152 66 L216 112Z" fill="#a09cc4" /><path d="M96 110 L152 72 L208 110Z" fill="#6d6a90" /><path d="M88 112 L152 66" stroke="#fff" strokeWidth="1" opacity=".5" />
        <path d="M96 110 L152 72 L208 110" fill="none" stroke="#23213d" strokeWidth="1.4" />
        <g transform="translate(152 95)">
          <circle r="11.6" fill="#23213d" /><circle r="10" fill={`url(#${id}-gold)`} /><circle r="7.6" fill="none" stroke={P.brassShade} strokeWidth=".9" />
          <path d="M-3 -3 h6 v7 h-6Z M-4 -3 h8 M-1 -6 h2 v3" stroke={P.brassShade} strokeWidth="1.1" fill="none" strokeLinejoin="round" /><circle cx="0" cy="1" r="1.5" fill="#fff3c4" />
          {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <circle key={i} cx={(Math.cos(a) * 8.8).toFixed(1)} cy={(Math.sin(a) * 8.8).toFixed(1)} r=".5" fill={P.brassShade} />; })}
        </g>
        {/* pilasters */}
        {[98, 194].map((x) => <g key={x}><rect x={x} y="112" width="10" height="180" fill="#a8a4cc" opacity=".55" stroke="#23213d" strokeWidth=".6" />{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${x} ${124 + i * 20} h10`} stroke="#23213d" strokeWidth=".6" opacity=".7" />)}</g>)}

        {/* the portal arch and the great door; warm light leaks round the door when its slot is lit... */}
        <path d="M112 292 V196 A40 40 0 0 1 192 196 V292Z" fill="#14122e" />
        {Array.from({ length: 15 }, (_, i) => { const a = Math.PI - (i / 14) * Math.PI; return <path key={i} d={`M${(152 + Math.cos(a) * 34).toFixed(1)} ${(196 - Math.sin(a) * 34).toFixed(1)} L${(152 + Math.cos(a) * 40).toFixed(1)} ${(196 - Math.sin(a) * 40).toFixed(1)}`} stroke="#1e1c3a" strokeWidth="1.2" opacity=".8" />; })}
        <path d="M110 196 A42 42 0 0 1 194 196" fill="none" stroke="#c4c8ee" strokeWidth="1.2" opacity=".45" />
        <path d="M118 292 V196 A34 34 0 0 1 186 196 V292Z" fill="#0a0820" />
        <g clipPath={`url(#${id}-portal)`}>
          <path d="M118 270 H186 V292 H118Z" fill="#23213d" />
          <VaultDoor id={id} cx={152} cy={226} r={30} />
          <path d="M118 196 A34 34 0 0 1 186 196" fill="none" stroke="#05040f" strokeWidth="7" opacity=".5" />
        </g>
        <path d="M152 258 V292" stroke="#05040f" strokeWidth="0" />
        {/* a threshold slab with gold coins spilled on it */}
        <rect x="112" y="290" width="80" height="4" rx="1" fill="#a09cc4" />
        {[[126, 290], [134, 291.4], [170, 290], [178, 291.2], [160, 291.6]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.4" ry="1.4" fill={`url(#${id}-gold)`} stroke={P.brassShade} strokeWidth=".4" />)}

        {/* eight barred windows: four in each wing (slots 0 to 7) */}
        {[[60, 172], [82, 172], [60, 238], [82, 238]].map(([x, y], i) => <ArchWindow key={i} id={id} x={x} y={y} w={14} h={28} on={L(i)} stone="#b4b0d4" sill />)}
        {[[222, 172], [244, 172], [222, 238], [244, 238]].map(([x, y], i) => <ArchWindow key={i} id={id} x={x} y={y} w={14} h={28} on={L(4 + i)} stone="#b4b0d4" sill />)}
        <g>{[60, 82, 222, 244].map((x) => [172, 238].map((y) => <g key={`${x}-${y}`}>{[-0.28, 0.28].map((k, i) => <path key={i} d={`M${x + 14 * k} ${y - 24} V${y - 2}`} stroke="#23233a" strokeWidth="1.6" />)}<path d={`M${x - 5.6} ${y - 14} H${x + 5.6}`} stroke="#23233a" strokeWidth="1.4" /></g>))}</g>
        {/* buttresses at the ends, chain swags and lamps */}
        {[[30, 1], [274, -1]].map(([x, k]) => <g key={x}><path d={`M${x} 292 V136 L${(x as number) + 12 * (k as number)} 132 V292Z`} fill={`url(#${id}-ru2)`} opacity=".9" /><path d={`M${x} 292 V136 L${(x as number) + 12 * (k as number)} 132 V292Z`} fill={`url(#${id}-tw)`} /><path d={`M${x} 136 H${(x as number) + 12 * (k as number)}`} stroke="#c4c8ee" strokeWidth="1.4" opacity=".6" /></g>)}
        <path d="M108 160 Q130 172 152 160 Q174 172 196 160" stroke={P.ironLit} strokeWidth="1.6" fill="none" strokeDasharray="3 2" opacity=".0" />
        <g><path d="M100 140 H92" stroke={P.iron} strokeWidth="1.4" /><Lantern id={id} x={96} y={146} s={1.2} /></g>
        <g><path d="M204 140 H212" stroke={P.iron} strokeWidth="1.4" /><Lantern id={id} x={208} y={146} s={1.2} /></g>
        <Brazier x={66} y={298} s={1.1} /><Brazier x={238} y={298} s={1.1} />
        <Pennant x={216} y={78} h={24} />
      </g>
    );
  },
};
