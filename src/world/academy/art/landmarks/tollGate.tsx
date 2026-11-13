import type { ReactNode } from 'react';
import { Lancet, Lantern, P, Pennant, SlatePattern, StonePattern } from '../kit';
import type { LandmarkDef } from './types';

/** An arrow slit with a lit pane (slot window): a tall narrow opening, flared at the base. */
function Slit({ id, x, y, h, on }: { id: string; x: number; y: number; h: number; on: boolean }) {
  const top = y - h;
  const d = `M${x - 3.2} ${y} V${top + 3} Q${x} ${top - 2} ${x + 3.2} ${top + 3} V${y}Z`;
  const cl = `slit-${id}-${x}-${y}`;
  return (
    <g>
      <ellipse className={on ? 'lh on' : 'lh'} cx={x} cy={y - h / 2} rx={h * 0.5} ry={h * 0.75} fill={`url(#${id}-halo)`} />
      <path d={`M${x - 5.4} ${y + 2} V${top + 2} Q${x} ${top - 6} ${x + 5.4} ${top + 2} V${y + 2}Z`} fill="#8e8ab0" opacity=".5" />
      <path d={d} fill={`url(#${id}-glass)`} />
      <clipPath id={cl}><path d={d} /></clipPath>
      <g className={on ? 'lw on' : 'lw'} clipPath={`url(#${cl})`}><rect x={x - 4} y={top - 3} width="8" height={h + 4} fill={`url(#${id}-lit)`} /><path d={`M${x - 4} ${y - h * 0.4} H${x + 4}`} stroke="#6b3a14" strokeWidth=".9" opacity=".6" /></g>
      <path d={d} fill="none" stroke="#14122e" strokeWidth="1.1" />
    </g>
  );
}

/** Crenellations: merlons with stone caps across a width, with a corbel table below. (x0..x1, y = top of the wall) */
function Battlements({ id, x0, x1, y, n, h = 16, cap = true }: { id: string; x0: number; x1: number; y: number; n: number; h?: number; cap?: boolean }) {
  const w = (x1 - x0) / n, mw = w * 0.58;
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * w + (w - mw) / 2;
    out.push(<g key={i}>
      <rect x={x.toFixed(1)} y={y - h} width={mw.toFixed(1)} height={h} fill={`url(#${id}-st)`} />
      <rect x={x.toFixed(1)} y={y - h} width={mw.toFixed(1)} height={h} fill={`url(#${id}-rf)`} opacity=".55" />
      {cap ? <rect x={(x - 1).toFixed(1)} y={y - h - 3} width={(mw + 2).toFixed(1)} height="3.4" rx=".8" fill="#a09cc4" /> : null}
      <path d={`M${(x + 1).toFixed(1)} ${y - h - 2} h${(mw - 2).toFixed(1)}`} stroke="#fff" strokeWidth=".5" opacity=".4" />
    </g>);
  }
  return <g>{out}</g>;
}

/** The Toll Gate: two crenellated slate-capped towers around a road arch with a half-raised portcullis, a toll bell, a banner each side, a striped barrier and a toll hut. */
export const tollGate: LandmarkDef = {
  id: 'toll',
  name: 'The Toll Gate',
  blurb: 'The road is free. The crossing is not.',
  box: { x: 0, y: -28, w: 318, h: 338 },
  slots: 8,
  door: { x: 158, y: 296 },
  flag: { x: 158, y: 110 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const bars: ReactNode[] = [];
    for (let i = 0; i < 7; i++) bars.push(<path key={`v${i}`} d={`M${134 + i * 6.4} 196 V250`} stroke={P.ironLit} strokeWidth="2" />);
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-st`} seed={73} base="#7a7699" w={48} h={28} rows={5} vary={0.13} />
          <StonePattern id={`${id}-st2`} seed={83} base="#5f5c80" w={44} h={28} rows={5} vary={0.16} />
          <StonePattern id={`${id}-cob`} seed={93} base="#4a4868" w={40} h={16} rows={3} vary={0.2} />
          <SlatePattern id={`${id}-sl`} seed={21} base="#3f5a78" w={22} h={13} />
          <linearGradient id={`${id}-rf`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d6d8ff" stopOpacity=".3" /><stop offset=".45" stopColor="#8f8fb8" stopOpacity="0" /><stop offset="1" stopColor="#0a0820" stopOpacity=".62" /></linearGradient>
          <linearGradient id={`${id}-tw`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d6d8ff" stopOpacity=".26" /><stop offset=".3" stopColor="#9a96bc" stopOpacity="0" /><stop offset=".7" stopColor="#0a0820" stopOpacity=".25" /><stop offset="1" stopColor="#0a0820" stopOpacity=".66" /></linearGradient>
          <radialGradient id={`${id}-pass`} cx="50%" cy="85%" r="75%"><stop offset="0" stopColor="#4a5a98" stopOpacity=".7" /><stop offset=".6" stopColor="#1a1a48" stopOpacity=".9" /><stop offset="1" stopColor="#0a0924" stopOpacity="1" /></radialGradient>
          <linearGradient id={`${id}-ban`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f6f7a" /><stop offset="1" stopColor="#1c3f55" /></linearGradient>
          <linearGradient id={`${id}-bell`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={P.brassLit} /><stop offset=".5" stopColor={P.brass} /><stop offset="1" stopColor={P.brassShade} /></linearGradient>
          <clipPath id={`${id}-archclip`}><path d="M128 292 V222 A30 30 0 0 1 188 222 V292Z" /></clipPath>
        </defs>

        <ellipse cx="160" cy="300" rx="154" ry="9" fill="#05040f" opacity=".5" />
        {/* the road: cobbles under the arch and out to the front */}
        <path d="M-4 292 H322 V312 H-4Z" fill={`url(#${id}-ground)`} />
        <path d="M100 292 H216 L236 312 H80Z" fill={`url(#${id}-cob)`} /><path d="M100 292 H216 L236 312 H80Z" fill="#05040f" opacity=".28" />
        {Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${(112 + i * 5.6).toFixed(1)} 293 L${(100 + i * 7.2).toFixed(1)} 312`} stroke="#1a1838" strokeWidth=".6" opacity=".5" />)}
        {[298, 304].map((y) => <path key={y} d={`M${96 - (y - 292) * 0.9} ${y} H${220 + (y - 292) * 0.9}`} stroke="#1a1838" strokeWidth=".7" opacity=".6" />)}

        {/* curtain walls running off to each side, with a walk and merlons */}
        <rect x="0" y="176" width="64" height="116" fill={`url(#${id}-st2)`} /><rect x="0" y="176" width="64" height="116" fill={`url(#${id}-rf)`} opacity=".7" />
        <rect x="252" y="176" width="66" height="116" fill={`url(#${id}-st2)`} /><rect x="252" y="176" width="66" height="116" fill={`url(#${id}-rf)`} />
        <Battlements id={id} x0={0} x1={64} y={176} n={5} h={13} /><Battlements id={id} x0={252} x1={318} y={176} n={5} h={13} />
        <path d="M0 176 H64 M252 176 H318" stroke="#c4c8ee" strokeWidth="1" opacity=".35" />
        {[0, 1, 2].map((i) => <path key={i} d={`M${10 + i * 22} 200 v-3 h4 v3`} stroke="#05040f" strokeWidth="2" fill="none" opacity=".0" />)}

        {/* the gate block between the towers */}
        <rect x="92" y="108" width="134" height="184" fill={`url(#${id}-st)`} /><rect x="92" y="108" width="134" height="184" fill={`url(#${id}-rf)`} opacity=".5" />
        {/* machicolations: a corbelled parapet above the arch */}
        <rect x="88" y="112" width="142" height="6" fill="#a09cc4" opacity=".0" />
        {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${96 + i * 11} 118 h8 v10 l-4 5 l-4 -5Z`} fill="#6d6a90" stroke="#23213d" strokeWidth=".6" />)}
        <rect x="90" y="114" width="138" height="5" fill="#8e8ab0" /><path d="M90 114.4 H228" stroke="#fff" strokeWidth=".6" opacity=".4" />
        <Battlements id={id} x0={90} x1={228} y={114} n={9} h={15} />

        {/* the arch: dark passage, portcullis half raised, a lantern hanging inside */}
        <path d="M122 292 V222 A36 36 0 0 1 194 222 V292Z" fill="#23213d" />
        {Array.from({ length: 15 }, (_, i) => { const a = Math.PI - (i / 14) * Math.PI; return <path key={i} d={`M${(158 + Math.cos(a) * 30).toFixed(1)} ${(222 - Math.sin(a) * 30).toFixed(1)} L${(158 + Math.cos(a) * 38).toFixed(1)} ${(222 - Math.sin(a) * 38).toFixed(1)}`} stroke="#14122e" strokeWidth="1.2" opacity=".8" />; })}
        <path d="M120 222 A38 38 0 0 1 196 222" fill="none" stroke="#b4b0d4" strokeWidth="1.4" opacity=".5" />
        <path d="M128 292 V222 A30 30 0 0 1 188 222 V292Z" fill={`url(#${id}-pass)`} />
        {/* a glimpse of the road beyond, moonlit */}
        <g clipPath={`url(#${id}-archclip)`}>
          <path d="M128 262 Q158 246 188 262 V292 H128Z" fill="#1c2a52" opacity=".8" />
          <path d="M146 292 L156 258 H160 L170 292Z" fill="#5a6aa8" opacity=".35" />
          {[[140, 244], [172, 238], [152, 232], [166, 250]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.9" fill="#f6f0dc" opacity=".8" />)}
          <path d="M128 224 q30 -12 60 0 V215 H128Z" fill="#05040f" opacity=".3" />
        </g>
        <path d="M158 190 V198" stroke={P.iron} strokeWidth="1" /><Lantern id={id} x={158} y={206} s={1.5} />
        {/* the portcullis: iron grid, lowered to mid arch, pointed feet */}
        <g clipPath={`url(#${id}-archclip)`}>
          <rect x="128" y="190" width="60" height="62" fill="#05040f" opacity=".0" />
          {bars}
          <path d="M132 190 V252 M184 190 V252" stroke={P.ironLit} strokeWidth="2" />
          {[204, 220, 236, 250].map((y) => <path key={y} d={`M130 ${y} H186`} stroke={P.iron} strokeWidth="2.2" />)}
          {[204, 220, 236, 250].map((y) => <path key={`h${y}`} d={`M130 ${y - 0.8} H186`} stroke={P.ironLit} strokeWidth=".6" opacity=".7" />)}
          {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${131 + i * 6.2} 250 l1.6 7 l1.6 -7Z`} fill={P.ironLit} stroke={P.iron} strokeWidth=".6" />)}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <circle key={`n${i}`} cx={131.4 + i * 6.2} cy="204" r=".9" fill={P.brass} opacity=".9" />)}
        </g>
        <path d="M136 252 L136 262 M180 252 V262" stroke={P.iron} strokeWidth="1.4" opacity=".0" />
        <g><path d="M126 192 V182 M190 192 V182" stroke={P.iron} strokeWidth="2.4" /><path d="M120 184 h12 M184 184 h12" stroke={P.ironLit} strokeWidth="1.4" /><path d="M126 184 Q158 170 190 184" stroke={P.iron} strokeWidth="1.2" fill="none" /></g>

        {/* the two towers */}
        {[{ x: 36, w: 74, lit: [0, 1, 4] as number[] }, { x: 208, w: 74, lit: [2, 3, 5] as number[] }].map((t, ti) => {
          const x0 = t.x, x1 = t.x + t.w, cx = x0 + t.w / 2;
          return (
            <g key={ti}>
              <rect x={x0} y="74" width={t.w} height="218" fill={`url(#${id}-st)`} />
              <rect x={x0} y="74" width={t.w} height="218" fill={`url(#${id}-tw)`} />
              {/* quoins: alternating long and short corner stones */}
              {Array.from({ length: 16 }, (_, i) => { const yy = 78 + i * 13.4, wd = i % 2 ? 11 : 15; return <g key={i}><rect x={x0} y={yy} width={wd} height="12" fill="#a8a4cc" opacity=".55" stroke="#23213d" strokeWidth=".6" /><rect x={x1 - wd} y={yy} width={wd} height="12" fill="#5f5c80" opacity=".7" stroke="#23213d" strokeWidth=".6" /></g>; })}
              {/* string courses */}
              {[120, 186, 252].map((y) => <g key={y}><rect x={x0 - 2} y={y} width={t.w + 4} height="4.6" fill="#8e8ab0" /><rect x={x0 - 2} y={y + 4.6} width={t.w + 4} height="2" fill="#05040f" opacity=".35" /><path d={`M${x0 - 2} ${y + 0.6} h${t.w + 4}`} stroke="#fff" strokeWidth=".6" opacity=".4" /></g>)}
              {/* corbelled parapet and merlons */}
              {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${x0 - 3 + i * ((t.w + 6) / 8)} 74 h${(t.w + 6) / 8 - 1} v8 l-${((t.w + 6) / 8 - 1) / 2} 4 l-${((t.w + 6) / 8 - 1) / 2} -4Z`} fill="#6d6a90" stroke="#23213d" strokeWidth=".6" />)}
              <rect x={x0 - 4} y="70" width={t.w + 8} height="5" fill="#8e8ab0" /><path d={`M${x0 - 4} 70.4 h${t.w + 8}`} stroke="#fff" strokeWidth=".6" opacity=".45" />
              <Battlements id={id} x0={x0 - 4} x1={x1 + 4} y={70} n={6} h={16} />
              {/* the slate cap, a squat cone with a spike */}
              <path d={`M${x0 - 2} 40 L${cx} -4 L${x1 + 2} 40Z`} fill={`url(#${id}-sl)`} opacity="0" />
              {/* windows */}
              <Slit id={id} x={x0 + 14} y={168} h={30} on={L(t.lit[0])} /><Slit id={id} x={x1 - 14} y={168} h={30} on={L(t.lit[1])} />
              <Lancet id={id} x={cx} y={112} w={18} h={34} on={L(t.lit[2])} />
              {/* a little door at the foot of the tower, and a lamp */}
              <path d={`M${cx - 8} 292 V274 A8 8 0 0 1 ${cx + 8} 274 V292Z`} fill="#2a1c26" /><path d={`M${cx - 6} 292 V275 A6 6 0 0 1 ${cx + 6} 275 V292Z`} fill="#4a2f24" /><path d={`M${cx} 269 V292`} stroke="#1a0f0a" strokeWidth=".8" />
              {/* banner hanging between the string courses */}
              <g transform={`translate(${cx} 200)`}>
                <path d="M-12 -10 H12" stroke={P.iron} strokeWidth="1.6" /><circle cx="-12" cy="-10" r="1.6" fill={P.brassLit} /><circle cx="12" cy="-10" r="1.6" fill={P.brassLit} />
                <path d="M-10 -9 H10 V38 L0 31 L-10 38Z" fill={`url(#${id}-ban)`} stroke="#0e2a38" strokeWidth=".8" />
                <path d="M-10 -9 H-7 V35 L-10 38Z" fill="#fff" opacity=".12" />
                <circle cx="0" cy="8" r="6.6" fill="none" stroke={P.brass} strokeWidth="1.4" /><circle cx="0" cy="8" r="3.2" fill={P.brassLit} /><path d="M-2 8 h4 M0 6 v4" stroke={P.brassShade} strokeWidth=".7" />
                <path d="M-6 24 h12 M-4 28 h8" stroke={P.brass} strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
              </g>
              {/* the cone */}
            </g>
          );
        })}
        {/* the caps: different heights, one with a ball finial, one with a weathervane */}
        <g>
          <path d="M30 56 L73 -10 L116 56Z" fill={`url(#${id}-sl)`} /><path d="M30 56 L73 -10 L116 56Z" fill={`url(#${id}-tw)`} opacity=".9" />
          <path d="M30 56 H116" stroke="#14122e" strokeWidth="2" />
          <path d="M73 -10 V-20" stroke={P.iron} strokeWidth="1.6" /><circle cx="73" cy="-22" r="2.6" fill={P.brassLit} stroke={P.brassShade} strokeWidth=".6" />
        </g>
        <g>
          <path d="M202 56 L245 0 L288 56Z" fill={`url(#${id}-sl)`} /><path d="M202 56 L245 0 L288 56Z" fill={`url(#${id}-tw)`} opacity=".9" />
          <path d="M202 56 H288" stroke="#14122e" strokeWidth="2" />
          <path d="M245 0 V-16" stroke={P.iron} strokeWidth="1.6" />
          <path d="M245 -14 h12 l-3 3 l3 3 h-12Z" fill={P.brass} stroke={P.brassShade} strokeWidth=".6" strokeLinejoin="round" />
        </g>
        {/* wall-walk guard on the cap's skirt */}
        {/* the toll bell in a niche above the arch, with a short pull rope */}
        <g>
          <path d="M140 184 V150 A18 18 0 0 1 176 150 V184Z" fill="#8e8ab0" opacity=".6" />
          <path d="M143 184 V150 A15 15 0 0 1 173 150 V184Z" fill="#14122e" />
          <path d="M143 184 V150 A15 15 0 0 1 158 135" fill="none" stroke="#05040f" strokeWidth="3" opacity=".5" />
          <path d="M146 140 H170" stroke={P.iron} strokeWidth="2.4" strokeLinecap="round" /><path d="M146 138.6 H170" stroke={P.ironLit} strokeWidth=".7" opacity=".7" />
          <g transform="translate(158 141)">
            <path d="M0 -3 V3" stroke={P.iron} strokeWidth="2" />
            <path d="M-7 9 Q-7 3 0 2 Q7 3 7 9 Q8 19 13 25 H-13 Q-8 19 -7 9Z" fill={`url(#${id}-bell)`} />
            <path d="M-6 9 Q-6 4 -2 3 Q-4 11 -4 23 H-11 Q-7 18 -6 9Z" fill="#fff3c4" opacity=".42" />
            <path d="M-13 25 H13" stroke={P.brassShade} strokeWidth="1.8" /><path d="M-6 14 H6" stroke={P.brassShade} strokeWidth=".8" opacity=".7" />
            <circle cx="0" cy="28" r="2.6" fill={P.brassShade} />
            <path d="M0 30 Q1 36 -1 42" stroke="#b9a27a" strokeWidth="1.4" fill="none" /><path d="M-2.4 42 h4.8 l-.8 4 h-3.2Z" fill="#b9a27a" />
          </g>
        </g>

        {/* the striped barrier: pole raised on a pivot with a stone counterweight */}
        <g>
          <ellipse cx="94" cy="296" rx="14" ry="3" fill="#05040f" opacity=".4" />
          <path d="M82 296 V262 H106 V296Z" fill={`url(#${id}-st2)`} /><path d="M82 296 V262 H106 V296Z" fill={`url(#${id}-tw)`} />
          <path d="M80 262 H108 L106 258 H82Z" fill="#a09cc4" />
          <circle cx="94" cy="268" r="3.4" fill={P.iron} stroke={P.ironLit} strokeWidth=".7" />
          <g transform="rotate(-17 94 268)">
            <rect x="94" y="264.4" width="118" height="7.2" rx="1.6" fill="#e8e0d0" />
            {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${100 + i * 14} 264.4 l7 0 l-7 7.2 l-7 0Z`} fill="#b8434a" />)}
            <rect x="94" y="264.4" width="118" height="2" fill="#fff" opacity=".3" /><rect x="94" y="269.6" width="118" height="2" fill="#05040f" opacity=".3" />
            <rect x="54" y="265.6" width="40" height="4.8" rx="1.4" fill={P.timber} stroke={P.timberShade} strokeWidth=".6" />
            <rect x="40" y="262" width="16" height="14" rx="2" fill="#6d6a90" stroke="#23213d" strokeWidth=".8" /><path d="M42 266 H54" stroke="#cfd0ff" strokeWidth=".7" opacity=".5" />
          </g>
          <path d="M214 264 V296" stroke={P.timberLit} strokeWidth="4" /><path d="M214 264 V296" stroke={P.timberShade} strokeWidth=".7" opacity=".6" />
          <path d="M210.4 264 H217.6 L216.4 261 H211.6Z" fill={P.ironLit} />
          <circle className={L(6) ? 'lh on' : 'lh'} cx="214" cy="252" r="26" fill={`url(#${id}-halo)`} />
          <path d="M210.4 261 h7.2 l-0.6 -2 h-6Z" fill={P.iron} />
          <rect x="210.8" y="251" width="6.4" height="9.4" fill={`url(#${id}-glass)`} stroke={P.iron} strokeWidth=".9" />
          <rect className={L(6) ? 'lw on' : 'lw'} x="211.4" y="251.6" width="5.2" height="8.2" fill={`url(#${id}-lit)`} />
          <path d="M210 251 L214 247 L218 251Z" fill={P.iron} /><circle cx="214" cy="246" r="1.2" fill={P.brassLit} />
        </g>

        {/* the toll hut at the right, with a hatch (slot 7 is its lamp, slot 6 the bell lamp above) */}
        <g>
          <rect x="262" y="236" width="48" height="56" fill="#7a6a6a" /><rect x="262" y="236" width="48" height="56" fill={`url(#${id}-tw)`} opacity=".8" />
          {[262, 285, 306].map((x, i) => <rect key={i} x={x} y="236" width="4.4" height="56" fill="#2e2030" />)}
          <rect x="262" y="236" width="48" height="4.4" fill="#2e2030" /><rect x="262" y="270" width="48" height="4" fill="#2e2030" />
          <path d="M266 270 L285 240 M306 270 L289 240" stroke="#2e2030" strokeWidth="3" opacity=".9" />
          <path d="M254 238 L286 214 L318 238Z" fill={`url(#${id}-sl)`} /><path d="M254 238 L286 214 L318 238Z" fill={`url(#${id}-tw)`} />
          <path d="M254 238 H318" stroke="#2a1c26" strokeWidth="3" />
          <rect x="274" y="246" width="26" height="22" fill="#2e2030" />
          <rect x="276" y="248" width="22" height="18" fill={`url(#${id}-glass)`} />
          <g className={L(7) ? 'lw on' : 'lw'}><rect x="276" y="248" width="22" height="18" fill={`url(#${id}-lit)`} /><circle cx="287" cy="260" r="3.6" fill="#2a1c26" opacity=".5" /><path d="M279 266 q8 -8 16 0Z" fill="#2a1c26" opacity=".5" /></g>
          <circle className={L(7) ? 'lh on' : 'lh'} cx="287" cy="257" r="28" fill={`url(#${id}-halo)`} />
          <path d="M287 248 V266 M276 257 H298" stroke="#2e2030" strokeWidth="1.2" />
          <rect x="272" y="266" width="30" height="4" rx="1" fill={P.timberLit} stroke={P.timberShade} strokeWidth=".6" />
          {[0, 1, 2].map((i) => <g key={i}><circle cx={278 + i * 7} cy="264.4" r="2.4" fill={P.brass} stroke={P.brassShade} strokeWidth=".5" /></g>)}
          <path d="M292 236 V214" stroke="#a09cc4" strokeWidth="0" />
          <Lantern id={id} x={270} y={244} s={0.8} />
        </g>

        {/* the academy shield on the left wall, and a wall lamp on the right */}
        <g transform="translate(28 214)">
          <path d="M-9 -12 H9 V0 Q9 12 0 17 Q-9 12 -9 0Z" fill="#2f6f7a" stroke={P.brass} strokeWidth="1.2" />
          <path d="M-9 -12 H-6 V1 Q-6 11 -1 15 Q-9 11 -9 0Z" fill="#fff" opacity=".12" />
          <path d="M-3 -3 h6 v7 h-6Z M-4 -3 h8 M-1 -6 h2 v3" stroke={P.brassLit} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <circle cx="0" cy="1" r="1.6" fill={P.glowHot} />
        </g>
        <rect x="14.4" y="240" width="6.4" height="34" rx="1.6" fill="#14122e" /><path d="M17.6 240 v34" stroke="#6d6a90" strokeWidth=".6" opacity=".6" />
        <g><path d="M288 206 H300" stroke={P.iron} strokeWidth="1.4" /><Lantern id={id} x={294} y={212} s={1.1} /></g>
        {/* ivy and cracks */}
        <path d="M52 292 q-2 -30 4 -60 q-2 -14 4 -26" stroke={P.ivy} strokeWidth="1.2" fill="none" opacity=".8" />
        {Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx={52 + Math.sin(i * 1.7) * 7} cy={288 - i * 7} rx="3.2" ry="1.8" fill={i % 2 ? P.ivy : P.ivyLit} transform={`rotate(${i * 37} ${52 + Math.sin(i * 1.7) * 7} ${288 - i * 7})`} />)}
        <Pennant x={158} y={112} h={0} />
      </g>
    );
  },
};
