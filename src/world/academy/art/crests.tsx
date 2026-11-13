import { useId } from 'react';
import type { ReactNode } from 'react';
import { HOUSES } from '../houses';
import type { HouseId } from '../houses';
import { P, darken, lighten, rng } from './kit';

// Four heraldic crests, each drawn by hand as layered vector shapes: a shield with a studded rim, a patterned field, and a charge
// (the animal) built from separate pieces with fur, feather and light. The three animals that face the viewer are drawn as one
// half and mirrored, which is how heraldic masks are drawn and keeps both sides exactly alike.

const SHIELD = 'M8 10 H112 V76 Q112 126 60 156 Q8 126 8 76Z';
const FIELD = 'M13.5 15.5 H106.5 V76 Q106.5 121 60 149 Q13.5 121 13.5 76Z';

/** The right half of a symmetric charge, drawn once and then mirrored about x = 60. */
function Mirror({ children }: { children: ReactNode }) {
  return <g><g>{children}</g><g transform="translate(120 0) scale(-1 1)">{children}</g></g>;
}

/** A mirrored shape without a seam: the fill closes along the mirror line, the outline is an open path that stops at it. */
function S({ d, fill, stroke, w = 0.9 }: { d: string; fill: string; stroke: string; w?: number }) {
  return <g><path d={`${d}Z`} fill={fill} /><path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" /></g>;
}

/** A tiny lantern, the academy's own mark, set into the top of every crest. */
function Finial({ id }: { id: string }) {
  return (
    <g transform="translate(60 8)">
      <circle r="9" fill={`url(#${id}-flare)`} />
      <path d="M-4 -5 L0 -8.4 L4 -5Z" fill="#2a2a48" stroke="#0e0c20" strokeWidth=".6" />
      <path d="M-3.6 -5 H3.6 L3 4 H-3Z" fill={`url(#${id}-gold)`} stroke="#5a3a10" strokeWidth=".7" strokeLinejoin="round" />
      <path d="M-1.4 3 Q0 -3.6 1.4 3 Q0 1.6 -1.4 3Z" fill="#fff6c8" />
      <path d="M-3 4 H3 L2.2 6 H-2.2Z" fill="#2a2a48" />
    </g>
  );
}

function Frame({ id, house, children }: { id: string; house: HouseId; children: ReactNode }) {
  const c = HOUSES[house].colors;
  const studs: ReactNode[] = [];
  for (let i = 0; i < 9; i++) studs.push(<circle key={`t${i}`} cx={16 + i * 11} cy="12.6" r="1.5" fill={`url(#${id}-gold)`} />);
  for (let i = 0; i < 6; i++) { const y = 20 + i * 10; studs.push(<circle key={`l${i}`} cx="10.4" cy={y} r="1.4" fill={`url(#${id}-gold)`} />, <circle key={`r${i}`} cx="109.6" cy={y} r="1.4" fill={`url(#${id}-gold)`} />); }
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0b8" /><stop offset=".45" stopColor={c.metal} /><stop offset="1" stopColor={darken(c.metal, 0.45)} /></linearGradient>
        <radialGradient id={`${id}-flare`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffd27a" stopOpacity=".7" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".26" /><stop offset=".4" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></linearGradient>
        <linearGradient id={`${id}-fld`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={lighten(c.main, 0.12)} /><stop offset="1" stopColor={c.deep} /></linearGradient>
        <clipPath id={`${id}-clip`}><path d={FIELD} /></clipPath>
      </defs>
      <path d={SHIELD} fill="#0a0818" transform="translate(1.6 2.4)" opacity=".5" />
      <path d={SHIELD} fill={`url(#${id}-gold)`} />
      <path d={SHIELD} fill="none" stroke={darken(c.metal, 0.55)} strokeWidth="1" />
      <path d={FIELD} fill="#0a0818" />
      <path d={FIELD} fill={`url(#${id}-fld)`} />
      <g clipPath={`url(#${id}-clip)`}>{children}</g>
      <path d={FIELD} fill="none" stroke={darken(c.metal, 0.5)} strokeWidth="1.2" />
      <path d={FIELD} fill={`url(#${id}-sheen)`} />
      {studs}
      <Finial id={id} />
    </g>
  );
}

// ───────────────────────────── Ashwold, the wolf ─────────────────────────────
function Wolf({ id }: { id: string }) {
  const half = (
    <g>
      {/* the ear: outer fur and a dark inner cup */}
      <path d="M67 62 L77 28 Q90 40 90 68Z" fill={`url(#${id}-wf)`} stroke="#1a2238" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M71 60 L78 38 Q84 48 84 64Z" fill="#3a2a3a" />
      <path d="M74 56 L79 44 Q82 50 82 58Z" fill="#6a4a58" opacity=".7" />
      <path d="M77 28 Q80 40 80 52 M84 36 Q86 48 86 60" stroke="#e6ecfa" strokeWidth=".8" fill="none" opacity=".55" />
      {/* the head: ruff of fur spikes down the cheek */}
      <S d="M60 50 Q74 48 86 60 L98 70 L91 75 L102 88 L93 90 L100 104 L89 102 L94 114 L82 110 Q74 124 62 128 L60 128" fill={`url(#${id}-wf)`} stroke="#1a2238" />
      {[[88, 66, 96, 76], [90, 80, 98, 90], [90, 94, 96, 106], [84, 104, 90, 114]].map(([x0, y0, x1, y1], i) => <path key={i} d={`M${x0} ${y0} L${x1} ${y1}`} stroke="#e6ecfa" strokeWidth=".9" opacity=".55" strokeLinecap="round" />)}
      {[[72, 100, 86, 108], [70, 108, 82, 118], [76, 92, 90, 98]].map(([x0, y0, x1, y1], i) => <path key={i} d={`M${x0} ${y0} Q${(x0 + x1) / 2 + 2} ${(y0 + y1) / 2 - 3} ${x1} ${y1}`} stroke="#4a5a7c" strokeWidth=".8" fill="none" opacity=".7" />)}
      {/* brow mask and eye */}
      <path d="M60 56 Q72 54 82 64 Q76 72 62 70Z" fill="#46567a" opacity=".75" />
      <path d="M66 68 Q76 62 86 70 Q78 78 66 70Z" fill="#fff6d8" />
      <path d="M67 69 Q76 63 85 70 Q78 76 67 69Z" fill="#f4b13e" />
      <path d="M72 66 Q75 72 76 74 Q79 70 80 66Z" fill="#1a1020" opacity=".9" />
      <path d="M75 67.4 q1.6 3.8 0 6.4 q-1.6 -2.6 0 -6.4Z" fill="#0a0612" /><circle cx="73.6" cy="68" r=".9" fill="#fff" />
      <path d="M64 62 Q76 56 88 66" stroke="#12182c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* the long muzzle, lighter, with the nose and mouth */}
      <S d="M60 80 L67 78 Q72 92 70 106 Q66 118 60 120" fill={`url(#${id}-wm)`} stroke="#1a2238" w={0.7} />
      <path d="M60 80 H66 Q68 86 66 90 H60Z" fill="#e6ecfa" opacity=".3" />
      <path d="M53.6 84 Q60 80.6 66.4 84 Q65 92 60 94 Q55 92 53.6 84Z" fill="#0c0a18" stroke="#000" strokeWidth=".5" /><path d="M56 84.6 Q60 83 64 84.6" stroke="#6a7aa0" strokeWidth=".8" fill="none" opacity=".8" />
      <path d="M60 94 V104 Q64 110 71 107" stroke="#1a2238" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {[[66, 100], [68, 96], [64, 104]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".7" fill="#2a3452" />)}
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wf`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b6bfd8" /><stop offset=".5" stopColor="#7d89ab" /><stop offset="1" stopColor="#465078" /></linearGradient>
        <linearGradient id={`${id}-wm`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0f3fc" /><stop offset="1" stopColor="#aeb8d2" /></linearGradient>
        <radialGradient id={`${id}-wmoon`} cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#fffbe6" /><stop offset="1" stopColor="#d8d2b0" /></radialGradient>
      </defs>
      {/* chevrons in ash grey, a crescent moon and three stars */}
      {[0, 1, 2].map((i) => <path key={i} d={`M8 ${112 + i * 14} L60 ${80 + i * 14} L112 ${112 + i * 14} V${122 + i * 14} L60 ${90 + i * 14} L8 ${122 + i * 14}Z`} fill={i === 0 ? '#3d5688' : i === 1 ? '#34497a' : '#2b3e6a'} opacity=".8" />)}
      <path d="M60 22 A33 33 0 1 0 60 88 A26 26 0 1 1 60 22Z" fill={`url(#${id}-wmoon)`} opacity=".95" transform="translate(2 -1)" />
      <path d="M60 22 A33 33 0 1 0 60 88 A26 26 0 1 1 60 22Z" fill="none" stroke="#fffbe6" strokeWidth="1" opacity=".5" transform="translate(2 -1)" />
      {[[22, 38, 2.4], [100, 32, 2], [96, 70, 1.6], [26, 66, 1.6]].map(([x, y, s], i) => <path key={i} d={`M${x} ${(y as number) - (s as number) * 2} L${(x as number) + (s as number) * 0.6} ${(y as number) - (s as number) * 0.6} L${(x as number) + (s as number) * 2} ${y} L${(x as number) + (s as number) * 0.6} ${(y as number) + (s as number) * 0.6} L${x} ${(y as number) + (s as number) * 2} L${(x as number) - (s as number) * 0.6} ${(y as number) + (s as number) * 0.6} L${(x as number) - (s as number) * 2} ${y} L${(x as number) - (s as number) * 0.6} ${(y as number) - (s as number) * 0.6}Z`} fill="#fff6d0" opacity=".9" />)}
      <Mirror>{half}</Mirror>
    </g>
  );
}

// ───────────────────────────── Mirewing, the heron ─────────────────────────────
function Heron({ id }: { id: string }) {
  const r = rng(5);
  const feather = (x: number, y: number, rot: number, len: number, w: number, c: string) => <path d={`M0 0 Q${w} ${len * 0.4} 0 ${len} Q${-w} ${len * 0.4} 0 0Z`} fill={c} stroke="#2a3a5c" strokeWidth=".5" transform={`translate(${x} ${y}) rotate(${rot})`} />;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-hb`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f2f5fc" /><stop offset=".6" stopColor="#c4cde2" /><stop offset="1" stopColor="#8794b4" /></linearGradient>
        <linearGradient id={`${id}-hw`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9eb0d4" /><stop offset="1" stopColor="#4f6288" /></linearGradient>
        <linearGradient id={`${id}-wt`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f6a66" stopOpacity="0" /><stop offset=".3" stopColor="#2f8f86" stopOpacity=".7" /><stop offset="1" stopColor="#0a2a30" /></linearGradient>
        <radialGradient id={`${id}-hm`} cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#fffbe6" /><stop offset="1" stopColor="#dcd6b4" /></radialGradient>
      </defs>
      {/* the moon, its halo, and a few stars */}
      <circle cx="82" cy="40" r="26" fill="#fffbe6" opacity=".08" /><circle cx="82" cy="40" r="18" fill={`url(#${id}-hm)`} />
      {[[88, 34, 3], [76, 46, 2], [90, 46, 1.6]].map(([x, y, rr], i) => <circle key={i} cx={x} cy={y} r={rr} fill="#cfc8a0" opacity=".5" />)}
      {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={(18 + r() * 84).toFixed(0)} cy={(22 + r() * 40).toFixed(0)} r={(0.5 + r() * 0.7).toFixed(1)} fill="#e6f0ff" opacity=".7" />)}
      {/* reeds at both edges */}
      {[[20, 0], [27, 1], [100, 0], [93, 1]].map(([x, k], i) => (
        <g key={i}>
          <path d={`M${x} 140 Q${(x as number) + (i < 2 ? -3 : 3)} 100 ${(x as number) + (i < 2 ? 2 : -2)} ${86 - (k as number) * 12}`} stroke="#3f7a52" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <rect x={(x as number) + (i < 2 ? -0.5 : -3.5) + (i < 2 ? 2 : -2) * 0} y={78 - (k as number) * 12} width="3.6" height="11" rx="1.8" fill="#6a4a2e" stroke="#2a1a10" strokeWidth=".5" transform={`translate(${i < 2 ? 0 : 0} 0)`} />
        </g>
      ))}
      {[[16, 130], [104, 132]].map(([x, y], i) => <path key={i} d={`M${x} ${y} Q${(x as number) + (i ? -8 : 8)} ${(y as number) - 22} ${(x as number) + (i ? -4 : 4)} ${(y as number) - 40} M${x} ${y} Q${(x as number) + (i ? -2 : 2)} ${(y as number) - 24} ${(x as number) + (i ? 4 : -4)} ${(y as number) - 36}`} stroke="#4f9a62" strokeWidth="1.4" fill="none" strokeLinecap="round" />)}

      {/* the heron: legs first, then body, wing, neck, head */}
      <g>
        {/* standing leg and the folded one */}
        <path d="M60 98 L58 114 L56 124" stroke="#d6b45a" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="58" cy="113" r="1.8" fill="#c49a3a" />
        <path d="M52 124 L56 124 L62 126 M56 124 L50 127" stroke="#d6b45a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M68 96 L76 104 L70 110" stroke="#d6b45a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* tail feathers */}
        <g>{feather(80, 84, -118, 26, 3.2, '#8794b4')}{feather(78, 88, -128, 24, 3, '#6f7da2')}{feather(76, 91, -138, 20, 2.8, '#5a6a90')}</g>
        {/* body */}
        <path d="M42 78 Q58 66 80 76 Q90 88 74 98 Q56 104 44 92 Q38 86 42 78Z" fill={`url(#${id}-hb)`} stroke="#2a3a5c" strokeWidth=".8" />
        <path d="M46 92 Q60 100 74 96" stroke="#fff" strokeWidth=".8" fill="none" opacity=".55" />
        {/* the folded wing, three ranks of feathers */}
        <path d="M52 76 Q66 70 82 80 Q80 92 66 96 Q54 92 52 76Z" fill={`url(#${id}-hw)`} stroke="#2a3a5c" strokeWidth=".7" />
        {[0, 1, 2, 3, 4].map((i) => <g key={i}>{feather(58 + i * 5.6, 88 - i * 1.6, 168 - i * 4, 12 - i * 0.6, 2.8, i % 2 ? '#6f82aa' : '#8498c0')}</g>)}
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${60 + i * 6} ${80 + i * 0.6} q4 4 3 9`} stroke="#3a4a6e" strokeWidth=".7" fill="none" opacity=".7" />)}
        {/* the neck: an S, with dark streaks down its front */}
        <path d="M48 78 Q36 70 42 58 Q52 48 44 38 Q40 34 42 30" stroke="#2a3a5c" strokeWidth="7.4" fill="none" strokeLinecap="round" />
        <path d="M48 78 Q36 70 42 58 Q52 48 44 38 Q40 34 42 30" stroke={`url(#${id}-hb)`} strokeWidth="5.6" fill="none" strokeLinecap="round" />
        <path d="M44.6 74 Q35 66 40 58 Q49 50 42 40" stroke="#1a2238" strokeWidth="1.2" fill="none" strokeDasharray="2.4 2" opacity=".85" strokeLinecap="round" />
        {/* the head with its eye, black crest plumes and long yellow beak */}
        <path d="M46 34 Q36 22 44 24 Q52 26 46 34Z" fill="#f2f5fc" stroke="#2a3a5c" strokeWidth=".7" />
        <path d="M44 26 Q58 20 70 26 M44 28 Q56 26 66 32" stroke="#12182c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M42 28 Q44 24 49 26 L41 31Z" fill="#12182c" />
        <path d="M40 31 L14 38 L40 34Z" fill="#e8c24a" stroke="#8a6a1a" strokeWidth=".7" strokeLinejoin="round" />
        <path d="M40 31 L14 38" stroke="#fff3b0" strokeWidth=".7" opacity=".7" />
        <circle cx="42.4" cy="30" r="2" fill="#ffd84a" stroke="#5a3a10" strokeWidth=".5" /><circle cx="42" cy="30" r=".9" fill="#0a0612" />
      </g>
      {/* water: waves, ripples round the leg, a pale line of light */}
      <path d="M13 120 Q30 114 46 120 T80 120 T107 118 V150 H13Z" fill={`url(#${id}-wt)`} />
      {[0, 1, 2].map((i) => <path key={i} d={`M13 ${126 + i * 9} Q22 ${122 + i * 9} 30 ${126 + i * 9} T46 ${126 + i * 9} T62 ${126 + i * 9} T78 ${126 + i * 9} T94 ${126 + i * 9} T110 ${126 + i * 9}`} stroke="#a6dccf" strokeWidth=".9" fill="none" opacity={0.5 - i * 0.12} />)}
      {[[56, 125, 9, 2.6], [56, 125, 15, 4.2], [56, 125, 21, 5.6]].map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke="#e6f6f0" strokeWidth=".9" opacity={0.65 - i * 0.18} />)}
      <path d="M70 130 H92 M78 135 H98" stroke="#fffbe6" strokeWidth="1.3" strokeLinecap="round" opacity=".5" />
    </g>
  );
}

// ───────────────────────────── Emberquill, the fox ─────────────────────────────
function Fox({ id }: { id: string }) {
  const quill = (rot: number) => (
    <g transform={`translate(60 150) rotate(${rot})`}>
      <path d="M0 0 Q9 -34 3 -82 Q0 -112 0 -122 Q0 -112 -3 -82 Q-9 -34 0 0Z" fill={`url(#${id}-qf)`} stroke="#6a5a3a" strokeWidth=".8" />
      <path d="M0 -4 V-118" stroke="#8a7a52" strokeWidth="1" />
      {Array.from({ length: 22 }, (_, i) => { const y = -14 - i * 4.6, w = 7 - Math.abs(i - 9) * 0.28; return <g key={i}><path d={`M0 ${y} L${w} ${y - 6}`} stroke="#b9a678" strokeWidth=".5" opacity=".8" /><path d={`M0 ${y} L${-w} ${y - 6}`} stroke="#b9a678" strokeWidth=".5" opacity=".8" /></g>; })}
      <path d="M0 0 L-1.6 8 L1.6 8Z" fill="#14122e" />
    </g>
  );
  const half = (
    <g>
      {/* the ear: orange, a cream cup, a dark tip */}
      <path d="M64 58 L82 18 Q94 38 94 66Z" fill={`url(#${id}-ff)`} stroke="#3a1a10" strokeWidth=".9" strokeLinejoin="round" />
      <path d="M70 56 L82 30 Q88 44 88 62Z" fill="#f6e4c4" />
      <path d="M74 54 L82 36 Q85 46 85 58Z" fill="#6a3a2a" opacity=".6" />
      <path d="M72 38 L82 18 Q88 26 91 42Q82 38 72 38Z" fill="#2a1410" />
      {/* the head: broad cheeks and a fox's sharp taper */}
      <S d="M60 54 L72 52 L94 64 L102 86 Q98 100 86 108 L72 124 L60 130" fill={`url(#${id}-ff)`} stroke="#3a1a10" />
      <S d="M60 94 L76 88 L96 100 L100 108 L92 106 L96 114 L86 112 L74 124 L60 128" fill="#f6e4c4" stroke="#3a1a10" w={0.5} />
      <path d="M72 90 L84 92 M70 100 L86 106 M66 110 L76 118" stroke="#d8b890" strokeWidth=".8" opacity=".8" strokeLinecap="round" />
      <path d="M84 56 L92 64 M88 70 L98 78 M90 78 L100 88" stroke="#ffb06a" strokeWidth=".9" opacity=".6" strokeLinecap="round" />
      {/* the brow stripe, the eye and its black liner */}
      <path d="M60 60 Q74 58 88 70 L82 74 Q72 66 60 68Z" fill="#8a3a1c" opacity=".6" />
      <path d="M68 76 L86 70 Q84 82 72 84Z" fill="#fff6d8" />
      <path d="M69 76.4 L85 71 Q83 80.6 72 82.6Z" fill="#f4b13e" />
      <path d="M77 72.6 q2 4.4 0 8 q-2.6 -3.6 0 -8Z" fill="#0a0612" /><circle cx="75.4" cy="75" r=".9" fill="#fff" />
      <path d="M86 70 L98 64" stroke="#14100e" strokeWidth="1.6" strokeLinecap="round" /><path d="M68 76 L86 70" stroke="#14100e" strokeWidth="1.4" strokeLinecap="round" />
      {/* nose and mouth */}
      <path d="M53.6 112 Q60 108.6 66.4 112 Q65 119 60 121 Q55 119 53.6 112Z" fill="#14100e" /><path d="M56 112.6 Q60 111 64 112.6" stroke="#8a8aa0" strokeWidth=".8" fill="none" opacity=".8" />
      <path d="M60 121 V126 Q64 130 70 127" stroke="#3a1a10" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {[[70, 112], [74, 108], [68, 118]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".7" fill="#6a3a2a" />)}
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-ff`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb25a" /><stop offset=".5" stopColor="#e0702a" /><stop offset="1" stopColor="#a8381a" /></linearGradient>
        <linearGradient id={`${id}-qf`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff6dc" /><stop offset="1" stopColor="#d8c898" /></linearGradient>
      </defs>
      {/* a gold lattice on the field */}
      {Array.from({ length: 12 }, (_, i) => <g key={i}><path d={`M${-20 + i * 16} 10 L${60 + i * 16 - 60} 160`} stroke="#e8b84a" strokeWidth=".7" opacity=".28" /><path d={`M${140 - i * 16} 10 L${60 - i * 16 + 60} 160`} stroke="#e8b84a" strokeWidth=".7" opacity=".28" /></g>)}
      <path d="M13 128 Q60 100 107 128 V150 H13Z" fill="#2a0e10" opacity=".55" />
      {/* two quills crossed behind the head */}
      {quill(-23)}{quill(23)}
      {/* floating embers */}
      {[[26, 52, 1.6], [96, 46, 1.4], [18, 92, 1.2], [102, 100, 1.5], [34, 30, 1.1], [86, 26, 1.3]].map(([x, y, s], i) => <g key={i}><circle cx={x} cy={y} r={(s as number) * 2.6} fill="#ff9a40" opacity=".18" /><circle cx={x} cy={y} r={s} fill="#ffd27a" /></g>)}
      <Mirror>{half}</Mirror>
    </g>
  );
}

// ───────────────────────────── Hollowhearth, the bear ─────────────────────────────
function Bear({ id }: { id: string }) {
  const hex: ReactNode[] = [];
  for (let row = 0; row < 12; row++) for (let col = 0; col < 8; col++) {
    const x = 8 + col * 15.6 + (row % 2 ? 7.8 : 0), y = 10 + row * 13.5;
    hex.push(<path key={`${row}-${col}`} d={`M${x} ${y - 7.8} l6.75 3.9 v7.8 l-6.75 3.9 l-6.75 -3.9 v-7.8Z`} fill="none" stroke="#e8b84a" strokeWidth=".7" opacity=".22" />);
  }
  const half = (
    <g>
      {/* the ear: round, with a tan cup */}
      <circle cx="88" cy="54" r="12.4" fill={`url(#${id}-bf)`} stroke="#1a1008" strokeWidth=".9" />
      <circle cx="88" cy="55" r="7" fill="#d8a878" /><circle cx="88" cy="55" r="7" fill="none" stroke="#6a4028" strokeWidth=".7" />
      <path d="M82 50 Q88 46 94 50" stroke="#c49a6a" strokeWidth="1" fill="none" opacity=".8" />
      {/* the broad head and fur tufts along the cheek */}
      <S d="M60 48 Q82 46 94 60 Q104 74 99 94 L106 100 L97 103 L100 112 L90 110 Q80 124 62 126 L60 126" fill={`url(#${id}-bf)`} stroke="#1a1008" />
      {[[84, 56, 90, 64], [92, 70, 98, 78], [93, 84, 99, 92], [88, 100, 94, 106]].map(([x0, y0, x1, y1], i) => <path key={i} d={`M${x0} ${y0} L${x1} ${y1}`} stroke="#b88a58" strokeWidth=".9" opacity=".6" strokeLinecap="round" />)}
      {[[70, 56], [80, 54], [88, 80], [92, 90], [68, 62]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q2 2 4 1`} stroke="#c49a6a" strokeWidth=".8" fill="none" opacity=".55" strokeLinecap="round" />)}
      {/* brow, eye */}
      <path d="M64 66 Q76 58 88 66" stroke="#1a1008" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="77" cy="72" r="3.8" fill="#0e0804" /><circle cx="76" cy="70.8" r="1.2" fill="#fff" /><circle cx="77.6" cy="74" r=".7" fill="#fff" opacity=".7" />
      {/* muzzle, nose, mouth */}
      <S d="M60 84 Q78 82 82 98 Q82 114 66 118 L60 118" fill={`url(#${id}-bm)`} stroke="#4a2a18" w={0.7} />
      <path d="M51.6 84 Q60 80.6 68.4 84 Q68 94 60 98 Q52 94 51.6 84Z" fill="#0e0804" /><path d="M55 85 Q60 83 65 85" stroke="#7a6a58" strokeWidth="1" fill="none" opacity=".8" />
      <path d="M60 98 V104 Q66 110 74 106" stroke="#2a1408" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {[[70, 98], [72, 102], [68, 104], [74, 96]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".7" fill="#7a5a3a" />)}
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bf`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b0804a" /><stop offset=".5" stopColor="#7a5230" /><stop offset="1" stopColor="#3e2814" /></linearGradient>
        <linearGradient id={`${id}-bm`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0dcb0" /><stop offset="1" stopColor="#c49a68" /></linearGradient>
        <radialGradient id={`${id}-fire`} cx="50%" cy="80%" r="70%"><stop offset="0" stopColor="#fff6c8" /><stop offset=".4" stopColor="#ffb040" /><stop offset="1" stopColor="#d9532a" /></radialGradient>
      </defs>
      {hex}
      {/* a small hearth under the chin: a ring of stones round a fire */}
      <path d="M38 150 A22 20 0 0 1 82 150Z" fill="#1a1008" stroke="#e8b84a" strokeWidth="1.2" />
      {Array.from({ length: 7 }, (_, i) => { const a = Math.PI - (i / 6) * Math.PI; return <path key={i} d={`M${(60 + Math.cos(a) * 18).toFixed(1)} ${(150 - Math.sin(a) * 16.4).toFixed(1)} L${(60 + Math.cos(a) * 22).toFixed(1)} ${(150 - Math.sin(a) * 20).toFixed(1)}`} stroke="#e8b84a" strokeWidth=".9" opacity=".8" />; })}
      <path d="M48 150 Q52 138 60 130 Q68 138 72 150Z" fill={`url(#${id}-fire)`} />
      <path d="M54 150 Q57 142 60 136 Q63 142 66 150Z" fill="#fff0b8" />
      <Mirror>{half}</Mirror>
    </g>
  );
}

/** A house crest at any size. `size` is the width in px; the height follows (3 : 4 shield). */
export function HouseCrest({ house, size = 120, title, idPrefix }: { house: HouseId; size?: number; title?: string; idPrefix?: string }) {
  const auto = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = idPrefix ?? `hc${auto}`;
  const Charge = house === 'wolf' ? Wolf : house === 'heron' ? Heron : house === 'fox' ? Fox : Bear;
  return (
    <svg viewBox="0 0 120 162" width={size} height={Math.round((size * 162) / 120)} role="img" aria-label={title ?? `${HOUSES[house].name} crest, the ${HOUSES[house].animal}`} className="crest">
      <Frame id={id} house={house}><Charge id={id} /></Frame>
    </svg>
  );
}

export { P };
