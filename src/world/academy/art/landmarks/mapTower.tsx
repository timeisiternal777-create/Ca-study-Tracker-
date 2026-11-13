import type { ReactNode } from 'react';
import { ArchWindow, Ivy, Lantern, P, Pennant, SlatePattern, StonePattern, darken, lighten, rng } from '../kit';
import type { LandmarkDef } from './types';

/** A compass rose: eight points (four long), a ring with ticks, a north mark. */
function Rose({ id, cx, cy, r, glow }: { id: string; cx: number; cy: number; r: number; glow: boolean }) {
  const long = (a: number, len: number, w: number, c: string) => {
    const x = Math.cos(a), y = Math.sin(a), px = -y, py = x;
    return <path d={`M${(cx + x * len).toFixed(1)} ${(cy + y * len).toFixed(1)} L${(cx + px * w).toFixed(1)} ${(cy + py * w).toFixed(1)} L${(cx - x * len * 0.28).toFixed(1)} ${(cy - y * len * 0.28).toFixed(1)} L${(cx - px * w).toFixed(1)} ${(cy - py * w).toFixed(1)}Z`} fill={c} stroke="#0e2a38" strokeWidth=".5" strokeLinejoin="round" />;
  };
  const dirs: ReactNode[] = [];
  for (let i = 0; i < 4; i++) dirs.push(<g key={`d${i}`}>{long(-Math.PI / 4 + (i * Math.PI) / 2, r * 0.7, r * 0.1, '#2f6f7a')}</g>);
  for (let i = 0; i < 4; i++) dirs.push(<g key={`m${i}`}>{long(-Math.PI / 2 + (i * Math.PI) / 2, r * 0.96, r * 0.14, i === 0 ? '#e8d27a' : P.brass)}</g>);
  return (
    <g>
      <circle className={glow ? 'lh on' : 'lh'} cx={cx} cy={cy} r={r * 2.2} fill={`url(#${id}-halo)`} />
      <circle cx={cx} cy={cy} r={r + 4} fill="#2a2850" /><circle cx={cx} cy={cy} r={r + 2.6} fill="#9a96bc" /><circle cx={cx} cy={cy} r={r + 0.4} fill="#14122e" />
      <circle cx={cx} cy={cy} r={r - 1.6} fill={`url(#${id}-rosebg)`} />
      <g className={glow ? 'lw on' : 'lw'}><circle cx={cx} cy={cy} r={r - 1.6} fill={`url(#${id}-halo)`} opacity=".95" /><circle cx={cx} cy={cy} r={r + 1} fill="none" stroke={P.brassLit} strokeWidth="1.4" /></g>
      {Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2, l = i % 8 === 0 ? 4 : i % 4 === 0 ? 3 : 1.8; return <path key={i} d={`M${(cx + Math.cos(a) * (r - 1.6)).toFixed(1)} ${(cy + Math.sin(a) * (r - 1.6)).toFixed(1)} L${(cx + Math.cos(a) * (r - 1.6 - l)).toFixed(1)} ${(cy + Math.sin(a) * (r - 1.6 - l)).toFixed(1)}`} stroke={P.brassLit} strokeWidth=".6" opacity=".8" />; })}
      {dirs}
      <circle cx={cx} cy={cy} r={r * 0.12} fill={P.brassLit} stroke="#0e2a38" strokeWidth=".6" />
      <path d={`M${cx} ${cy - r - 9} l3 6 h-6Z`} fill="#e8d27a" stroke="#0e2a38" strokeWidth=".5" />
    </g>
  );
}

/** The Map Tower: a round stone tower, a compass rose on its face, and a glass map room with a pagoda roof, balcony and brass finial. */
export const mapTower: LandmarkDef = {
  id: 'maptower',
  name: 'The Map Tower',
  blurb: 'Know where you are, then choose where next.',
  box: { x: 0, y: -40, w: 296, h: 356 },
  slots: 8,
  door: { x: 146, y: 298 },
  flag: { x: 146, y: -14 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const r = rng(113);
    // the seven mullion posts; the outer bays are narrow, as if the room were an octagon seen from the front
    const posts = [72, 87, 109, 146, 183, 205, 220];
    const bays = posts.slice(0, -1).map((x, i) => ({ x: (x + posts[i + 1]) / 2, w: posts[i + 1] - x - 5 }));
    const inside = (i: number): ReactNode => {
      const x = bays[i].x;
      switch (i) {
        case 0: return <g><circle cx={x} cy="116" r="4.6" fill="none" stroke="#3a1a10" strokeWidth="1" opacity=".55" /><path d={`M${x - 4.6} 116 h9.2 M${x} 111.4 v9.2`} stroke="#3a1a10" strokeWidth=".7" opacity=".55" /></g>;
        case 1: return <g><rect x={x - 6} y="104" width="12" height="26" fill="#3a1a10" opacity=".35" /><path d={`M${x - 6} 104 h12`} stroke="#3a1a10" strokeWidth="2" opacity=".6" /></g>;
        case 2: return <g><circle cx={x} cy="124" r="9" fill="#3a1a10" opacity=".5" /><path d={`M${x - 9} 124 h18`} stroke="#6a3a1a" strokeWidth=".8" opacity=".6" /><path d={`M${x} 133 v10 M${x - 7} 143 h14`} stroke="#3a1a10" strokeWidth="2" opacity=".6" /></g>;
        case 3: return <g><path d={`M${x} 96 v14`} stroke="#3a1a10" strokeWidth="1" opacity=".6" /><path d={`M${x - 6} 110 h12 l-2 9 h-8Z`} fill="#3a1a10" opacity=".55" /><path d={`M${x - 14} 143 h28`} stroke="#3a1a10" strokeWidth="2.4" opacity=".5" /></g>;
        case 4: return <g><path d={`M${x - 10} 146 L${x + 10} 108`} stroke="#3a1a10" strokeWidth="3" opacity=".55" /><path d={`M${x - 4} 134 L${x - 9} 148 M${x - 4} 134 L${x + 3} 148`} stroke="#3a1a10" strokeWidth="1.4" opacity=".55" /></g>;
        default: return <g><rect x={x - 5} y="102" width="10" height="44" fill="#3a1a10" opacity=".35" />{[112, 122, 132].map((y) => <path key={y} d={`M${x - 5} ${y} h10`} stroke="#3a1a10" strokeWidth=".8" opacity=".6" />)}</g>;
      }
    };
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-st`} seed={121} base="#8a86a8" w={46} h={26} rows={4} vary={0.12} />
          <StonePattern id={`${id}-rk`} seed={131} base="#4a4868" w={50} h={34} rows={4} vary={0.22} />
          <SlatePattern id={`${id}-sl`} seed={41} base="#34607e" w={22} h={13} />
          <linearGradient id={`${id}-tw`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e6e4ff" stopOpacity=".32" /><stop offset=".3" stopColor="#9a96bc" stopOpacity=".04" /><stop offset=".72" stopColor="#0a0820" stopOpacity=".3" /><stop offset="1" stopColor="#0a0820" stopOpacity=".7" /></linearGradient>
          <linearGradient id={`${id}-roof`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a8d0f0" stopOpacity=".34" /><stop offset=".4" stopColor="#6a8ab8" stopOpacity="0" /><stop offset="1" stopColor="#0a0820" stopOpacity=".6" /></linearGradient>
          <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.brassLit} /><stop offset=".5" stopColor={P.brass} /><stop offset="1" stopColor={P.brassShade} /></linearGradient>
          <radialGradient id={`${id}-rosebg`} cx="50%" cy="40%" r="70%"><stop offset="0" stopColor="#2f4a6a" /><stop offset="1" stopColor="#14223c" /></radialGradient>
          <clipPath id={`${id}-tower`}><path d="M90 292 Q146 303 202 292 V172 H90Z" /></clipPath>
        </defs>

        <ellipse cx="148" cy="302" rx="146" ry="10" fill="#05040f" opacity=".5" />
        {/* the hill, a path of stepping stones and tufts */}
        <path d="M-6 296 Q50 276 112 288 T300 286 V330 H-6Z" fill={`url(#${id}-ground)`} />
        <path d="M-6 300 Q50 284 112 294 T300 292 V330 H-6Z" fill={`url(#${id}-rk)`} opacity=".7" />
        {Array.from({ length: 26 }, (_, i) => { const x = r() * 290, y = 292 + r() * 16; return <path key={i} d={`M${x.toFixed(0)} ${y.toFixed(0)} q-1 -5 -3 -6 M${x.toFixed(0)} ${y.toFixed(0)} q1 -6 3 -7`} stroke={P.mossLit} strokeWidth="1" fill="none" opacity=".6" strokeLinecap="round" />; })}
        {[[10, 290], [34, 296], [60, 291], [86, 297], [112, 292]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y + 4} rx="11" ry="3" fill="#a09cc4" opacity=".55" />)}

        {/* the tower: round, banded by courses, a compass rose on its face */}
        <path d="M90 292 Q146 303 202 292 V172 H90Z" fill={`url(#${id}-st)`} />
        <g clipPath={`url(#${id}-tower)`}>
          <path d="M90 292 Q146 303 202 292 V172 H90Z" fill={`url(#${id}-tw)`} />
          {[204, 252, 280].map((y) => <g key={y}><rect x="88" y={y} width="116" height="4.6" fill="#a09cc4" opacity=".7" /><rect x="88" y={y + 4.6} width="116" height="1.6" fill="#05040f" opacity=".35" /></g>)}
        </g>
        <path d="M90 292 V172" stroke="#e6e4ff" strokeWidth="1.2" opacity=".5" />
        <Rose id={id} cx={146} cy={230} r={24} glow={L(7)} />
        {/* arrow slits */}
        {[[108, 266], [184, 266]].map(([x, y], i) => <g key={i}><path d={`M${x - 3} ${y} V${y - 22} Q${x} ${y - 27} ${x + 3} ${y - 22} V${y}Z`} fill="#14122e" /><path d={`M${x - 1.2} ${y} V${y - 21}`} stroke="#6d6a90" strokeWidth=".6" opacity=".6" /></g>)}
        {/* the door, with a lamp above (slot 6) */}
        <g>
          <path d="M133 296 V274 A13 13 0 0 1 159 274 V296Z" fill="#2a1c26" /><path d="M136 296 V275 A10 10 0 0 1 156 275 V296Z" fill="#4a2f24" />
          <path d="M146 265 V296" stroke="#1a0f0a" strokeWidth="1" />{[272, 284].map((y) => <path key={y} d={`M136 ${y} H156`} stroke={P.iron} strokeWidth="1.6" />)}<circle cx="142" cy="282" r="1" fill={P.brassLit} /><circle cx="150" cy="282" r="1" fill={P.brassLit} />
          <circle className={L(6) ? 'lh on' : 'lh'} cx="172" cy="262" r="24" fill={`url(#${id}-halo)`} />
          <path d="M172 252 V256" stroke={P.iron} strokeWidth="1" /><path d="M168.6 256 L172 253.6 L175.4 256Z" fill={P.iron} />
          <rect x="168.8" y="256" width="6.4" height="9" fill={`url(#${id}-glass)`} stroke={P.iron} strokeWidth=".8" /><rect className={L(6) ? 'lw on' : 'lw'} x="169.4" y="256.6" width="5.2" height="7.8" fill={`url(#${id}-lit)`} />
          <path d="M168.6 265 h6.8 l-1 2 h-4.8Z" fill={P.iron} />
        </g>
        <Ivy seed={7} x={186} y={292} len={96} wob={4} leaf={3.4} />

        {/* the corbels that carry the glass room out over the tower, and the balcony */}
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${86 + i * 12.6} 170 h9 l${i < 4 ? -4 : i > 5 ? 4 : 0} 10 h-9Z`} fill="#6d6a90" stroke="#23213d" strokeWidth=".6" />)}
        <rect x="64" y="162" width="168" height="9" rx="1.4" fill="#a09cc4" /><path d="M64 162.6 H232" stroke="#fff" strokeWidth=".8" opacity=".5" /><rect x="64" y="171" width="168" height="2.6" fill="#05040f" opacity=".4" />
        {/* a stone balustrade: baluster band under the sills */}
        <rect x="68" y="151" width="160" height="11" fill="#6d6a90" /><rect x="68" y="151" width="160" height="11" fill={`url(#${id}-tw)`} />
        {Array.from({ length: 27 }, (_, i) => <path key={i} d={`M${72 + i * 6} 153 q1.6 3 0 7 q-1.6 -4 0 -7`} stroke="#c4c8ee" strokeWidth="1.6" fill="none" opacity=".7" />)}
        <rect x="66" y="148" width="164" height="4" rx="1.4" fill="#b4b0d4" />

        {/* the glass room: brass posts, six tall windows with maps and instruments inside (slots 0 to 5) */}
        <rect x="72" y="88" width="148" height="62" fill="#14122e" />
        {bays.map((b, i) => <ArchWindow key={i} id={id} x={b.x} y={146} w={b.w} h={52} on={L(i)} stone="#d6c27a" sill={false} inside={inside(i)} />)}
        {posts.map((x, i) => <g key={x}><rect x={x - 2.4} y="88" width="4.8" height="62" fill={`url(#${id}-brass)`} /><path d={`M${x - 1.2} 90 V148`} stroke="#fff3c4" strokeWidth=".6" opacity=".6" /></g>)}
        <rect x="70" y="84" width="152" height="6" rx="1.4" fill={`url(#${id}-brass)`} /><path d="M70 85.2 H222" stroke="#fff3c4" strokeWidth=".7" opacity=".7" />
        <rect x="70" y="146" width="152" height="4" rx="1" fill={`url(#${id}-brass)`} />
        {/* hanging lamp seen through the middle, always on */}
        {/* the pagoda roof of overlapping plates, concave, scalloped at the eaves */}
        <path d="M50 92 Q112 84 146 20 Q180 84 242 92Z" fill={`url(#${id}-sl)`} /><path d="M50 92 Q112 84 146 20 Q180 84 242 92Z" fill={`url(#${id}-roof)`} />
        {[-70, -44, -22, 0, 22, 44, 70].map((dx) => <path key={dx} d={`M146 22 Q${146 + dx * 0.5} 70 ${146 + dx * 1.3} 90`} stroke="#14122e" strokeWidth="1" fill="none" opacity=".5" />)}
        <path d="M146 22 Q112 84 50 92" stroke="#e6f0ff" strokeWidth="1.2" fill="none" opacity=".4" />
        {Array.from({ length: 21 }, (_, i) => <path key={i} d={`M${50 + i * 9.6} 91 q4.8 6 9.6 0`} fill="#34607e" stroke="#14122e" strokeWidth=".7" />)}
        <path d="M50 92 Q112 84 146 20 Q180 84 242 92" stroke="#14122e" strokeWidth="1.8" fill="none" />
        <path d="M50 92.4 H242" stroke={`url(#${id}-brass)`} strokeWidth="2.4" />
        {/* the compass finial and vane */}
        <path d="M146 22 V-8" stroke={P.iron} strokeWidth="2" />
        <circle cx="146" cy="-10" r="6" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="1.6" /><path d="M146 -18 l2 8 l-2 3 l-2 -3Z M146 -2 l2 -8 M146 -2 l-2 -8" fill={P.brassLit} stroke={P.brassShade} strokeWidth=".5" strokeLinejoin="round" /><path d="M139 -10 h14" stroke={P.brass} strokeWidth="1.2" />
        <path d="M146 -20 V-28" stroke={P.iron} strokeWidth="1.4" /><path d="M146 -28 l13 -3 v6Z" fill={P.brass} stroke={P.brassShade} strokeWidth=".5" />
        {/* two small pennants at the eave */}
        {[[56, 1], [236, -1]].map(([x, k]) => <g key={x}><path d={`M${x} 92 V68`} stroke={P.iron} strokeWidth="1.2" /><path d={`M${x} 69 q${7 * (k as number)} 2 ${14 * (k as number)} -1 q${-3 * (k as number)} 4 ${-1 * (k as number)} 8 q${-6 * (k as number)} -2 ${-13 * (k as number)} -1Z`} fill={k === 1 ? '#2f6f7a' : '#a8445a'} stroke="#14122e" strokeWidth=".5" /></g>)}

        {/* the signpost: three plank arrows, no words, a lantern on top */}
        <g>
          <path d="M248 296 V212" stroke={P.timber} strokeWidth="5" /><path d="M246 296 V212" stroke={P.timberLit} strokeWidth="1" opacity=".5" />
          {[[226, 1, '#7a5a3a'], [242, -1, '#6a4a2e'], [258, 1, '#7a5a3a']].map(([y, k, c], i) => <g key={i}><path d={k === 1 ? `M242 ${(y as number) - 5} H266 L274 ${y} L266 ${(y as number) + 5} H242Z` : `M254 ${(y as number) - 5} H230 L222 ${y} L230 ${(y as number) + 5} H254Z`} fill={c as string} stroke="#2a1c26" strokeWidth=".8" /><circle cx={k === 1 ? 248 : 248} cy={y} r="1.2" fill={P.brassLit} /><path d={k === 1 ? `M250 ${(y as number) - 1} H264` : `M232 ${(y as number) - 1} H246`} stroke="#2a1c26" strokeWidth=".7" opacity=".5" /></g>)}
          <path d="M248 212 H258" stroke={P.iron} strokeWidth="1.6" /><Lantern id={id} x={258} y={220} s={1.1} />
        </g>
        {/* a raven on the rail */}
        <g transform="translate(212 142)"><ellipse cx="0" cy="0" rx="5" ry="3.4" fill="#0e0c20" /><circle cx="4.6" cy="-2.6" r="2.4" fill="#0e0c20" /><path d="M6.6 -2.4 l3.2 .6 l-3.2 1Z" fill="#6a5a3a" /><path d="M-4.6 0 l-6 3 l1 -4Z" fill="#0e0c20" /><circle cx="5.4" cy="-3" r=".6" fill="#e8d56a" /></g>
        <Pennant x={146} y={-30} h={0} />
      </g>
    );
  },
};
