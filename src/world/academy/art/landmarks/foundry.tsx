import type { ReactNode } from 'react';
import { ArchWindow, BrickPattern, Lantern, P, Pennant, SlatePattern, Smoke, StonePattern, darken, lighten, rng } from '../kit';
import type { LandmarkDef } from './types';

/** A cog: a ring with teeth and a hub. */
function Cog({ x, y, r, teeth = 12, fill = P.iron, rim = P.ironLit }: { x: number; y: number; r: number; teeth?: number; fill?: string; rim?: string }) {
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2, a1 = ((i + 0.28) / teeth) * Math.PI * 2, a2 = ((i + 0.5) / teeth) * Math.PI * 2, a3 = ((i + 0.78) / teeth) * Math.PI * 2;
    const R = r * 1.16;
    pts.push(`${(x + Math.cos(a0) * r).toFixed(1)} ${(y + Math.sin(a0) * r).toFixed(1)}`, `${(x + Math.cos(a1) * R).toFixed(1)} ${(y + Math.sin(a1) * R).toFixed(1)}`, `${(x + Math.cos(a2) * R).toFixed(1)} ${(y + Math.sin(a2) * R).toFixed(1)}`, `${(x + Math.cos(a3) * r).toFixed(1)} ${(y + Math.sin(a3) * r).toFixed(1)}`);
  }
  return (
    <g>
      <path d={`M${pts.join('L')}Z`} fill={fill} stroke={rim} strokeWidth=".7" strokeLinejoin="round" />
      <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke={rim} strokeWidth=".8" opacity=".7" />
      {[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2; return <path key={i} d={`M${x} ${y} L${(x + Math.cos(a) * r * 0.62).toFixed(1)} ${(y + Math.sin(a) * r * 0.62).toFixed(1)}`} stroke={rim} strokeWidth="1.4" opacity=".8" />; })}
      <circle cx={x} cy={y} r={r * 0.2} fill={P.brass} stroke={P.brassShade} strokeWidth=".6" />
    </g>
  );
}

/** An anvil on a stump, with a hammer leaning on it. (x, y) = floor under the stump. */
function Anvil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="22" ry="3" fill="#05040f" opacity=".45" />
      <path d="M-11 0 L-9 -17 H9 L11 0Z" fill={P.timber} stroke={P.timberShade} strokeWidth=".8" />
      <ellipse cx="0" cy="-17" rx="9" ry="2.4" fill={P.timberLit} stroke={P.timberShade} strokeWidth=".6" /><path d="M-5 -17 a5 1.4 0 0 1 10 0" stroke={P.timberShade} strokeWidth=".5" fill="none" />
      <path d="M-21 -26 Q-14 -26 -10 -26 H12 Q14 -26 14 -23 V-21 H8 Q6 -18 8 -17 H-8 Q-6 -19 -8 -21 Q-15 -21 -21 -26Z" fill={`url(#fd-iron)`} stroke="#0e0c20" strokeWidth=".7" strokeLinejoin="round" />
      <path d="M-20 -25.4 H12" stroke="#c9c9e8" strokeWidth=".9" opacity=".7" />
      <g transform="translate(13 -17) rotate(24)"><rect x="-1" y="-22" width="2.2" height="26" rx=".8" fill={P.timberLit} /><rect x="-5" y="-27" width="10" height="6" rx="1" fill={P.iron} stroke={P.ironLit} strokeWidth=".6" /></g>
    </g>
  );
}

/** The Foundry: a crow-stepped brick works with a tall stack, a glowing forge, a drive wheel in the race and copper pipes. */
export const foundry: LandmarkDef = {
  id: 'foundry',
  name: 'The Foundry',
  blurb: 'Every cost is poured and weighed.',
  box: { x: 0, y: -34, w: 344, h: 344 },
  slots: 8,
  door: { x: 158, y: 292 },
  flag: { x: 158, y: 26 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const r = rng(77);
    const STEP = 'M78 96 V84 H96 V70 H114 V56 H132 V44 H184 V56 H202 V70 H220 V84 H238 V96Z';
    const sparks: ReactNode[] = [];
    for (let i = 0; i < 16; i++) sparks.push(<circle key={i} cx={(26 + r() * 40).toFixed(1)} cy={(160 + r() * 90).toFixed(1)} r={(0.6 + r() * 0.8).toFixed(1)} fill={P.glowHot} opacity={(0.3 + r() * 0.5).toFixed(2)} className="spark" />);
    return (
      <g>
        <defs>
          <BrickPattern id={`${id}-br`} seed={13} base="#8a5560" w={28} h={20} rows={5} />
          <BrickPattern id={`${id}-br2`} seed={23} base="#6e4452" w={28} h={20} rows={5} />
          <StonePattern id={`${id}-st`} seed={33} base="#7a7699" w={44} h={22} rows={3} vary={0.14} />
          <SlatePattern id={`${id}-sl`} seed={5} base="#44507a" w={24} h={14} />
          <linearGradient id="fd-iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a8ab0" /><stop offset=".5" stopColor="#4a4a68" /><stop offset="1" stopColor="#23233a" /></linearGradient>
          <linearGradient id={`${id}-sh`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d6d8ff" stopOpacity=".22" /><stop offset=".45" stopColor="#8f8fb8" stopOpacity="0" /><stop offset="1" stopColor="#0a0820" stopOpacity=".6" /></linearGradient>
          <linearGradient id={`${id}-cop`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffc58c" /><stop offset=".4" stopColor={P.copper} /><stop offset="1" stopColor="#5a2c20" /></linearGradient>
          <linearGradient id={`${id}-wat`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f5a78" /><stop offset="1" stopColor="#0c1d3c" /></linearGradient>
          <radialGradient id={`${id}-fire`} cx="50%" cy="78%" r="70%"><stop offset="0" stopColor="#fff6c8" /><stop offset=".3" stopColor="#ffb040" /><stop offset=".7" stopColor="#e0502a" /><stop offset="1" stopColor="#3a0e18" /></radialGradient>
          <linearGradient id={`${id}-forgeglow`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9a40" stopOpacity="0" /><stop offset="1" stopColor="#ff9a40" stopOpacity=".5" /></linearGradient>
          <clipPath id={`${id}-step`}><path d={STEP} /></clipPath>
          <clipPath id={`${id}-mouth`}><path d="M24 288 V262 A18 18 0 0 1 60 262 V288Z" /></clipPath>
          <clipPath id={`${id}-doorclip`}><path d="M137 288 V256 A21 21 0 0 1 179 256 V288Z" /></clipPath>
        </defs>

        <ellipse cx="160" cy="298" rx="156" ry="10" fill="#05040f" opacity=".5" />
        {/* the yard: soot-dark gravel and a worn track */}
        <path d="M-4 290 Q80 282 160 290 T348 288 V312 H-4Z" fill={`url(#${id}-ground)`} />
        {Array.from({ length: 34 }, (_, i) => <ellipse key={i} cx={(r() * 330).toFixed(0)} cy={(296 + r() * 12).toFixed(0)} rx={(2 + r() * 3).toFixed(1)} ry="1.4" fill={['#3a3a58', '#2a2a44', '#46466a'][i % 3]} />)}

        {/* the drive wheel and its flume sit behind the hall's right edge */}
        <g>
          <path d="M238 208 H276" stroke={P.iron} strokeWidth="5" /><path d="M238 206 H276" stroke={P.ironLit} strokeWidth="1" opacity=".6" />
          <g className="wheel">
            <circle cx="276" cy="208" r="50" fill="none" stroke="#14122e" strokeWidth="7" />
            <circle cx="276" cy="208" r="50" fill="none" stroke={P.timber} strokeWidth="5" />
            <circle cx="276" cy="208" r="41" fill="none" stroke={P.timberShade} strokeWidth="3.4" />
            <path d="M226 208 A50 50 0 0 1 276 158" fill="none" stroke={P.timberLit} strokeWidth="1.6" opacity=".7" />
            {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return <g key={i}><path d={`M276 208 L${(276 + c * 48).toFixed(1)} ${(208 + s * 48).toFixed(1)}`} stroke={P.timber} strokeWidth="3" /><path d={`M276 208 L${(276 + c * 48).toFixed(1)} ${(208 + s * 48).toFixed(1)}`} stroke={P.timberLit} strokeWidth=".8" opacity=".6" /><path d={`M${(276 + c * 49).toFixed(1)} ${(208 + s * 49).toFixed(1)} l${(c * 8 - s * 3).toFixed(1)} ${(s * 8 + c * 3).toFixed(1)}`} stroke={P.timberShade} strokeWidth="5" strokeLinecap="butt" /><path d={`M${(276 + c * 49).toFixed(1)} ${(208 + s * 49).toFixed(1)} l${(c * 8 - s * 3).toFixed(1)} ${(s * 8 + c * 3).toFixed(1)}`} stroke={P.timber} strokeWidth="3" /></g>; })}
            <circle cx="276" cy="208" r="9" fill={P.iron} stroke={P.ironLit} strokeWidth="1" /><circle cx="276" cy="208" r="4.4" fill={P.brass} stroke={P.brassShade} strokeWidth=".7" /><circle cx="274.6" cy="206.6" r="1.4" fill="#fff3c4" opacity=".7" />
          </g>
          {/* the flume that feeds the top of the wheel, on trestles */}
          <path d="M340 148 L282 164 V172 L340 156Z" fill={P.timber} stroke={P.timberShade} strokeWidth=".8" />
          <path d="M340 149 L283 165" stroke="#4fa8d8" strokeWidth="2.6" opacity=".9" /><path d="M340 148 L282 164" stroke="#fff" strokeWidth=".6" opacity=".4" />
          <path d="M322 158 V292 M338 152 V292" stroke={P.timberShade} strokeWidth="3.4" /><path d="M322 196 L338 172 M322 236 L338 212" stroke={P.timber} strokeWidth="2" />
          <path d="M282 168 q-3 14 -3 30" stroke="#8fd0f0" strokeWidth="3" fill="none" opacity=".7" strokeLinecap="round" /><path d="M285 170 q-2 12 -2 26" stroke="#fff" strokeWidth="1" fill="none" opacity=".5" strokeLinecap="round" />
        </g>
        {/* the race under the wheel */}
        <path d="M222 252 H344 V296 H222Z" fill={`url(#${id}-wat)`} opacity=".92" />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${(226 + r() * 90).toFixed(0)} ${(258 + r() * 30).toFixed(0)} q5 -2 10 0 q5 2 10 0`} stroke="#9fd0f0" strokeWidth=".8" fill="none" opacity=".4" />)}
        <path d="M222 252 H344" stroke="#9fd0f0" strokeWidth="1" opacity=".5" /><path d="M222 252 V296" stroke="#23213d" strokeWidth="4" />
        {[[246, 270], [286, 280], [310, 266]].map(([x, y], i) => <path key={i} d={`M${x} ${y} h10`} stroke="#f6f0dc" strokeWidth="1.2" opacity=".5" strokeLinecap="round" />)}

        {/* the hall: brick front with a crow-stepped gable */}
        <rect x="78" y="94" width="160" height="196" fill={`url(#${id}-br)`} />
        <path d={STEP} fill={`url(#${id}-br)`} />
        <rect x="78" y="94" width="160" height="196" fill={`url(#${id}-sh)`} /><path d={STEP} fill={`url(#${id}-sh)`} />
        <g clipPath={`url(#${id}-step)`}>
          <rect x="132" y="44" width="52" height="52" fill="#05040f" opacity=".0" />
        </g>
        {/* stone coping on every step */}
        {[[78, 96, 84], [96, 84, 70], [114, 70, 56], [132, 56, 44]].map(([x, y0, y1], i) => (
          <g key={i}>
            <path d={`M${x - 1.6} ${y0} V${y1} H${x + 20}`} stroke="#9a96bc" strokeWidth="3.4" fill="none" strokeLinejoin="miter" />
            <path d={`M${x - 1.6} ${y1 - 1.4} H${x + 20}`} stroke="#fff" strokeWidth=".6" opacity=".4" />
          </g>
        ))}
        {[[238, 96, 84], [220, 84, 70], [202, 70, 56], [184, 56, 44]].map(([x, y0, y1], i) => (
          <g key={i}><path d={`M${x + 1.6} ${y0} V${y1} H${x - 20}`} stroke="#6d6a90" strokeWidth="3.4" fill="none" strokeLinejoin="miter" /></g>
        ))}
        <path d="M130 42.4 H186" stroke="#9a96bc" strokeWidth="3.4" /><path d="M130 41 H186" stroke="#fff" strokeWidth=".6" opacity=".4" />
        {/* quoins */}
        {Array.from({ length: 13 }, (_, i) => { const yy = 98 + i * 14.6, wd = i % 2 ? 9 : 13; return <g key={i}><rect x="78" y={yy} width={wd} height="13" fill="#a8a4cc" opacity=".5" stroke="#23213d" strokeWidth=".5" /><rect x={238 - wd} y={yy} width={wd} height="13" fill="#6a6790" opacity=".7" stroke="#23213d" strokeWidth=".5" /></g>; })}
        {/* string courses */}
        {[94, 162].map((y) => <g key={y}><rect x="76" y={y} width="164" height="5" fill="#8e8ab0" /><rect x="76" y={y + 5} width="164" height="2" fill="#05040f" opacity=".35" /><path d={`M76 ${y + 0.6} h164`} stroke="#fff" strokeWidth=".6" opacity=".4" /></g>)}

        {/* the great wheel window and the tall stack */}
        <g>
          <circle className={L(0) ? 'lh on' : 'lh'} cx="158" cy="80" r="30" fill={`url(#${id}-halo)`} />
          <circle cx="158" cy="80" r="19" fill="#8e8ab0" /><circle cx="158" cy="80" r="17" fill="#14122e" /><circle cx="158" cy="80" r="15" fill={`url(#${id}-glass)`} />
          <g className={L(0) ? 'lw on' : 'lw'}><circle cx="158" cy="80" r="15" fill={`url(#${id}-lit)`} /><circle cx="158" cy="80" r="5" fill="#fff6c8" opacity=".6" /></g>
          {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <path key={i} d={`M158 80 L${(158 + Math.cos(a) * 15).toFixed(1)} ${(80 + Math.sin(a) * 15).toFixed(1)}`} stroke="#14122e" strokeWidth="1.4" />; })}
          <circle cx="158" cy="80" r="15" fill="none" stroke="#14122e" strokeWidth="1.6" /><circle cx="158" cy="80" r="4" fill={P.iron} />
          <path d="M142 76 A17 17 0 0 1 154 64" stroke="#fff" strokeWidth="1" fill="none" opacity=".4" strokeLinecap="round" />
        </g>
        <g>
          <path d="M150 44 L152 -8 H166 L168 44Z" fill={`url(#${id}-br2)`} /><path d="M150 44 L152 -8 H166 L168 44Z" fill={`url(#${id}-sh)`} />
          {[8, 24].map((y) => <rect key={y} x="150" y={y} width="18" height="3" fill={P.iron} stroke={P.ironLit} strokeWidth=".4" />)}
          <rect x="148.4" y="-12" width="21.2" height="5" rx="1" fill="#6a6a8a" /><rect x="148.4" y="-12" width="21.2" height="1.6" fill="#a09cc4" opacity=".6" />
          <ellipse cx="159" cy="-12" rx="6" ry="2" fill="#ff9a40" opacity=".85" /><circle cx="159" cy="-14" r="10" fill="#ff9a40" opacity=".16" />
          <Smoke x={159} y={-18} seed={3} n={2} />
        </g>

        {/* the tall windows (slots 1 to 3), with machinery in silhouette */}
        {[108, 158, 208].map((x, i) => (
          <ArchWindow key={x} id={id} x={x} y={154} w={24} h={46} on={L(1 + i)} stone="#9a96bc" sill inside={<g><path d={`M${x} 110 V128`} stroke="#3a1a10" strokeWidth="1.2" opacity=".6" /><path d={`M${x - 5} 128 h10 l-2 8 h-6Z`} fill="#3a1a10" opacity=".55" /><path d={`M${x - 10} 150 H${x + 10}`} stroke="#3a1a10" strokeWidth="2" opacity=".5" /><circle cx={x + 5} cy="142" r="5" fill="none" stroke="#3a1a10" strokeWidth="1.6" opacity=".5" /></g>} />
        ))}
        {/* the cog roundel over the door */}
        <g>
          <circle cx="158" cy="196" r="17" fill="#2a2850" /><circle cx="158" cy="196" r="15" fill="#8e8ab0" /><circle cx="158" cy="196" r="12.6" fill="#4a4868" />
          <Cog x={158} y={196} r={8.4} teeth={10} fill="#6d6a90" rim="#d6d8ff" />
          <path d="M152 202 l12 -12" stroke={P.brassLit} strokeWidth="1.6" strokeLinecap="round" /><path d="M163 188.6 l4 -1 l-1 4Z" fill={P.brassLit} />
        </g>
        {/* ground windows (slots 5, 6) */}
        <ArchWindow id={id} x={103} y={262} w={22} h={36} on={L(5)} stone="#9a96bc" sill inside={<path d="M92 252 H114 M103 232 V262" stroke="#3a1a10" strokeWidth="1.4" opacity=".4" />} />
        <ArchWindow id={id} x={213} y={262} w={22} h={36} on={L(6)} stone="#9a96bc" sill inside={<path d="M202 250 H224" stroke="#3a1a10" strokeWidth="1.4" opacity=".4" />} />

        {/* the great door: one leaf shut, one open on the furnace room (slot 4) */}
        <g>
          <path d="M134 292 V256 A24 24 0 0 1 182 256 V292Z" fill="#8e8ab0" opacity=".55" />
          <path d="M137 288 V256 A21 21 0 0 1 179 256 V288Z" fill="#14122e" />
          <g clipPath={`url(#${id}-doorclip)`}>
            <rect x="137" y="230" width="42" height="60" fill="#1a1230" />
            <g className={L(4) ? 'lw on' : 'lw'}>
              <rect x="137" y="230" width="42" height="60" fill={`url(#${id}-fire)`} />
              <path d="M150 288 V262 q8 -8 16 0 V288Z" fill="#fff0b8" opacity=".6" />
              <path d="M146 270 H170 M146 278 H170" stroke="#5a2410" strokeWidth="1" opacity=".5" />
            </g>
            <path d="M137 256 A21 21 0 0 1 179 256" fill="none" stroke="#05040f" strokeWidth="6" opacity=".4" />
          </g>
          <circle className={L(4) ? 'lh on' : 'lh'} cx="158" cy="292" r="40" fill={`url(#${id}-halo)`} />
          <path d="M137 288 V256 Q137 250 140 246 L158 244 V288Z" fill="#4a2f24" /><path d="M137 288 V256 Q137 250 140 246 L158 244 V288Z" fill={`url(#${id}-sh)`} />
          {[1, 2, 3, 4].map((i) => <path key={i} d={`M${137 + i * 4.2} 246 V288`} stroke="#1a0f0a" strokeWidth=".7" opacity=".7" />)}
          {[256, 270, 282].map((y) => <path key={y} d={`M137 ${y} H158`} stroke={P.iron} strokeWidth="2.4" />)}
          {[256, 270, 282].map((y) => <circle key={`r${y}`} cx="152" cy={y} r=".9" fill={P.ironLit} />)}
          <path d="M158 244 V288" stroke="#05040f" strokeWidth="1.2" /><circle cx="154" cy="268" r="1.4" fill={P.brassLit} />
          <path d="M158 246 L176 248 V288 L158 288Z" fill="#4a2f24" opacity="0" />
        </g>

        {/* copper pipe, valve wheel and gauge on the left of the hall; a little steam at the top */}
        <g>
          <path d="M87 290 V182 H80" stroke="#3a1a10" strokeWidth="6" fill="none" /><path d="M87 290 V182 H80" stroke={`url(#${id}-cop)`} strokeWidth="4" fill="none" />
          <path d="M86 186 V290" stroke="#ffe0b4" strokeWidth=".8" opacity=".5" />
          {[210, 250].map((y) => <rect key={y} x="83.6" y={y} width="7.8" height="4.4" rx="1" fill={P.copperLit} stroke="#3a1a10" strokeWidth=".6" />)}
          <path d="M62 188 q4 -3 6 -2" stroke="#3a1a10" strokeWidth="0" />
          <g transform="translate(87 228)"><circle r="7.4" fill="#2a1c26" /><circle r="6" fill="#efe0b8" /><circle r="6" fill="none" stroke={P.brass} strokeWidth="1.2" /><path d="M0 0 L3.6 -3" stroke="#b8434a" strokeWidth="1" strokeLinecap="round" /><circle r=".9" fill={P.ink} />{[-60, -30, 0, 30, 60].map((a) => <path key={a} d={`M${(Math.sin((a * Math.PI) / 180) * 4.6).toFixed(1)} ${(-Math.cos((a * Math.PI) / 180) * 4.6).toFixed(1)} l${(Math.sin((a * Math.PI) / 180) * 1).toFixed(1)} ${(-Math.cos((a * Math.PI) / 180) * 1).toFixed(1)}`} stroke={P.ink} strokeWidth=".5" />)}</g>
          <g transform="translate(87 266)"><circle r="5" fill="none" stroke="#8a2a30" strokeWidth="1.6" /><path d="M-5 0 H5 M0 -5 V5" stroke="#8a2a30" strokeWidth="1.2" /></g>
          <g className="smoke" fill="#d6d2f0"><circle cx="78" cy="176" r="3" opacity=".3" /><circle cx="75" cy="168" r="4.6" opacity=".24" /><circle cx="79" cy="158" r="6" opacity=".16" /></g>
        </g>

        {/* the forge lean-to at the left: slate shed roof, brick walls, a glowing hearth mouth (slot 7), a short stack */}
        <g>
          <rect x="12" y="190" width="68" height="100" fill={`url(#${id}-br2)`} /><rect x="12" y="190" width="68" height="100" fill={`url(#${id}-sh)`} opacity=".8" />
          <rect x="12" y="190" width="68" height="100" fill={`url(#${id}-forgeglow)`} className={L(7) ? 'lh on' : 'lh'} />
          <path d="M4 194 L82 170 V184 L4 210Z" fill={`url(#${id}-sl)`} /><path d="M4 194 L82 170 V184 L4 210Z" fill={`url(#${id}-sh)`} />
          <path d="M4 210 L82 184" stroke="#14122e" strokeWidth="2.2" />
          <path d="M20 195 V150 H34 V190Z" fill={`url(#${id}-br)`} /><path d="M20 195 V150 H34 V190Z" fill={`url(#${id}-sh)`} />
          <rect x="18" y="146" width="18" height="5" rx="1" fill="#6a6a8a" /><path d="M18 146.6 h18" stroke="#a09cc4" strokeWidth=".7" opacity=".6" />
          <Smoke x={27} y={142} seed={9} n={3} />
          <path d="M22 290 V262 A20 20 0 0 1 62 262 V290Z" fill="#8e8ab0" opacity=".5" />
          <path d="M24 288 V262 A18 18 0 0 1 60 262 V288Z" fill="#14122e" />
          <g clipPath={`url(#${id}-mouth)`}>
            <g className={L(7) ? 'lw on' : 'lw'}>
              <rect x="24" y="240" width="36" height="48" fill={`url(#${id}-fire)`} />
              <path d="M30 288 q12 -26 24 0Z" fill="#fff0b8" opacity=".7" />
              {[30, 38, 46, 54].map((x, i) => <path key={i} d={`M${x} 288 q2 ${-10 - (i % 2) * 6} 5 -14 q1 8 0 14Z`} fill={i % 2 ? '#ffd27a' : '#ff9a40'} opacity=".9" />)}
            </g>
            <path d="M24 288 q18 -10 36 0Z" fill="#2a1c26" opacity=".85" /><circle cx="34" cy="283" r="1.2" fill="#e0502a" /><circle cx="46" cy="284" r="1" fill="#e0502a" opacity=".7" /><circle cx="52" cy="282.4" r="1.2" fill="#ff9a40" />
            <path d="M24 262 A18 18 0 0 1 60 262" fill="none" stroke="#05040f" strokeWidth="5" opacity=".4" />
          </g>
          <path d="M22 290 V262 A20 20 0 0 1 62 262" fill="none" stroke="#2a2850" strokeWidth="1.2" />
          {Array.from({ length: 9 }, (_, i) => { const a = Math.PI - (i / 8) * Math.PI; return <path key={i} d={`M${(42 + Math.cos(a) * 18).toFixed(1)} ${(262 - Math.sin(a) * 18).toFixed(1)} L${(42 + Math.cos(a) * 22).toFixed(1)} ${(262 - Math.sin(a) * 22).toFixed(1)}`} stroke="#14122e" strokeWidth="1" />; })}
          {/* a rack of tongs and hammers, a crucible on a chain */}
          <g transform="translate(66 222)"><path d="M-8 0 H8" stroke={P.timber} strokeWidth="2.4" /><path d="M-5 0 v14 M0 0 v16 M5 0 v12" stroke={P.ironLit} strokeWidth="1.6" strokeLinecap="round" /><rect x="3.6" y="12" width="2.8" height="5" fill={P.iron} /><path d="M-5.6 14 l-1.4 4 M-4.4 14 l1.4 4" stroke={P.ironLit} strokeWidth=".9" /></g>
          <path d="M42 190 V204" stroke={P.iron} strokeWidth="1.4" /><path d="M36 204 H48 L46 214 H38Z" fill="#3a3a4d" stroke={P.ironLit} strokeWidth=".7" /><ellipse cx="42" cy="204" rx="6" ry="1.6" fill="#ff9a40" opacity={L(7) ? 0.9 : 0.25} />
          {sparks}
        </g>
        <Anvil x={72} y={296} />
        {/* the bellows */}
        <g transform="translate(5 278) scale(.82)"><path d="M0 0 L16 -7 Q23 -6 23 3 Q23 11 16 12 L0 6Z" fill="#6a3a2a" stroke="#2a1008" strokeWidth=".8" /><path d="M3 1 L15 -4 M3 4 L15 3 M3 6 L15 9" stroke="#2a1008" strokeWidth=".7" opacity=".7" /><path d="M-8 -2 H0 M-8 3 H0" stroke={P.timberLit} strokeWidth="2" strokeLinecap="round" /></g>

        {/* a stack of ingots and a barrel at the door */}
        <g transform="translate(206 290)">
          {[[0, 0, 3], [3, -7, 2], [6, -14, 1]].map(([x0, y0, n], row) => Array.from({ length: n }, (_, k) => <g key={`${row}-${k}`}><path d={`M${x0 + k * 13 + 2} ${y0} h11 l2 -7 h-11Z`} fill="#8a96c0" stroke="#23233a" strokeWidth=".6" /><path d={`M${x0 + k * 13 + 4} ${y0 - 6} h9`} stroke="#e8eeff" strokeWidth=".8" opacity=".7" /></g>))}
        </g>
        <g transform="translate(118 290)"><path d="M-10 0 Q-13 -10 -10 -22 H10 Q13 -10 10 0Z" fill={P.timber} stroke={P.timberShade} strokeWidth=".8" />{[-17, -6].map((y) => <path key={y} d={`M-11.4 ${y} H11.4`} stroke={P.iron} strokeWidth="2" />)}<ellipse cx="0" cy="-22" rx="10" ry="2.4" fill="#2a1008" /><ellipse cx="0" cy="-22" rx="8" ry="1.6" fill="#3a6a9a" opacity=".7" /><path d="M-6 -2 V-20" stroke={P.timberLit} strokeWidth=".8" opacity=".5" /></g>
        <Lantern id={id} x={136} y={216} s={1.2} />
        <Pennant x={158} y={-14} h={0} />
      </g>
    );
  },
};
