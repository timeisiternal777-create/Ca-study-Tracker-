import type { ReactNode } from 'react';
import { Casement, Ivy, Lantern, P, Pennant, PlankPattern, StonePattern, darken, lighten, rng } from '../kit';
import type { LandmarkDef } from './types';

/** A tile of thatch: short straw strokes in rows, with binding shadows. */
function ThatchPattern({ id, seed, base = '#a08c5e', w = 44, h = 28 }: { id: string; seed: number; base?: string; w?: number; h?: number }) {
  const r = rng(seed);
  const out: ReactNode[] = [];
  const rows = 4, rh = h / rows;
  for (let row = 0; row < rows; row++) {
    const y = row * rh;
    for (let i = 0; i < 26; i++) {
      const x = r() * w, len = rh * (1.1 + r() * 0.9), t = (r() - 0.5) * 0.5;
      out.push(<path key={`${row}-${i}`} d={`M${x.toFixed(1)} ${y.toFixed(1)} l${((r() - 0.5) * 2.4).toFixed(1)} ${len.toFixed(1)}`} stroke={t > 0 ? lighten(base, t) : darken(base, -t)} strokeWidth={(1 + r() * 0.9).toFixed(1)} strokeLinecap="round" />);
    }
    out.push(<path key={`b${row}`} d={`M0 ${(y + rh - 0.6).toFixed(1)} H${w}`} stroke={darken(base, 0.62)} strokeWidth="1.1" opacity=".7" />);
  }
  return <pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}><rect width={w} height={h} fill={darken(base, 0.34)} />{out}</pattern>;
}

/** A sack with a tied neck and the Academy's tithe mark: a sheaf standing on an X (ten). */
function Sack({ x, y, s = 1, tilt = 0 }: { x: number; y: number; s?: number; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <path d="M-11 0 Q-14 -14 -7 -24 Q-4 -28 -5 -31 L5 -31 Q4 -28 7 -24 Q14 -14 11 0 Q0 3 -11 0Z" fill="#a8946a" stroke="#4a3e36" strokeWidth=".8" />
      <path d="M-11 0 Q-14 -14 -7 -24 Q-4 -28 -5 -31 L-3 -31 Q-6 -26 -9 -20 Q-12 -10 -9 0Z" fill="#d8c898" opacity=".5" />
      <path d="M5 -28 Q9 -24 11 -12 Q11 -4 9 -1 Q12 -8 8 -22Z" fill="#4a3e36" opacity=".35" />
      <path d="M-5 -31 q5 -3 10 0" stroke="#4a3e36" strokeWidth="1.1" fill="none" /><path d="M-5.6 -29 q5.6 3 11.2 0" stroke="#4a3e36" strokeWidth="1.2" fill="none" />
      <g transform="translate(0 -14)" stroke="#6a2a2a" strokeWidth="1.2" strokeLinecap="round" fill="none"><path d="M-4 -4 L4 4 M4 -4 L-4 4" /><path d="M0 8 V3 M-2 8 L0 5 L2 8" strokeWidth=".9" /></g>
    </g>
  );
}

/** A spoked cart wheel. */
function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={P.timberShade} strokeWidth="4" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={P.timberLit} strokeWidth="2.2" />
      <circle cx={x} cy={y} r={r + 1.4} fill="none" stroke={P.iron} strokeWidth=".9" />
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <path key={i} d={`M${x} ${y} L${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}`} stroke={P.timber} strokeWidth="1.6" />; })}
      <circle cx={x} cy={y} r="3.4" fill={P.timberShade} /><circle cx={x} cy={y} r="1.4" fill={P.brass} />
    </g>
  );
}

/** The Tithe Barn: a great timber barn with a thatched gable, a hoist at its peak, open doors full of hay and a cart shed. */
export const titheBarn: LandmarkDef = {
  id: 'tithe',
  name: 'The Tithe Barn',
  blurb: 'A share of every harvest, kept in order.',
  box: { x: 0, y: -14, w: 316, h: 322 },
  slots: 8,
  door: { x: 150, y: 292 },
  flag: { x: 150, y: 10 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const r = rng(41);
    const WALL = 'M72 284 V150 L150 50 L228 150 V284Z';
    const hay: ReactNode[] = [];
    for (let i = 0; i < 40; i++) { const x = 126 + r() * 48, y = 214 + r() * 70; hay.push(<path key={i} d={`M${x.toFixed(1)} ${y.toFixed(1)} l${(r() * 7 - 3.5).toFixed(1)} ${(-3 - r() * 5).toFixed(1)}`} stroke={r() < 0.5 ? '#f0d890' : '#c8a04a'} strokeWidth="1" strokeLinecap="round" />); }
    return (
      <g>
        <defs>
          <ThatchPattern id={`${id}-th`} seed={9} />
          <ThatchPattern id={`${id}-th2`} seed={19} base="#8c7850" />
          <ThatchPattern id={`${id}-hs`} seed={29} base="#b09a62" w={36} h={22} />
          <PlankPattern id={`${id}-bd`} seed={5} base="#6b5868" w={30} h={44} />
          <PlankPattern id={`${id}-bd2`} seed={15} base="#4e3f52" w={24} h={36} />
          <StonePattern id={`${id}-st`} seed={51} base="#6e6a8c" w={44} h={22} rows={3} vary={0.14} />
          <linearGradient id={`${id}-sh`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d8d2f0" stopOpacity=".26" /><stop offset=".45" stopColor="#8e89ad" stopOpacity="0" /><stop offset="1" stopColor="#0a0820" stopOpacity=".55" /></linearGradient>
          <linearGradient id={`${id}-in`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c0a1e" /><stop offset="1" stopColor="#1a1430" /></linearGradient>
          <linearGradient id={`${id}-inlit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a4a22" /><stop offset=".5" stopColor="#e89a3c" /><stop offset="1" stopColor="#ffd27a" /></linearGradient>
          <clipPath id={`${id}-wall`}><path d={WALL} /></clipPath>
          <clipPath id={`${id}-doorclip`}><rect x="127" y="204" width="46" height="80" /></clipPath>
        </defs>

        <ellipse cx="156" cy="298" rx="150" ry="10" fill="#05040f" opacity=".5" />
        {/* the yard */}
        <path d="M0 292 Q60 282 120 290 T240 288 T316 292 V312 H0Z" fill={`url(#${id}-ground)`} />
        {Array.from({ length: 30 }, (_, i) => { const x = r() * 316, y = 292 + r() * 14; return <path key={i} d={`M${x.toFixed(0)} ${y.toFixed(0)} q-1 -5 -3 -6 M${x.toFixed(0)} ${y.toFixed(0)} q1 -6 3 -7`} stroke={P.moss} strokeWidth="1" fill="none" opacity=".65" strokeLinecap="round" />; })}
        {Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx={104 + i * 8 + r() * 3} cy={298 + r() * 6} rx={3 + r() * 2} ry={1.6} fill="#46506a" opacity=".7" />)}

        {/* footing */}
        <rect x="66" y="274" width="168" height="16" fill={`url(#${id}-st)`} /><rect x="66" y="274" width="168" height="16" fill={`url(#${id}-sh)`} />
        <path d="M66 274 H234" stroke="#c4c8ee" strokeWidth="1" opacity=".4" />

        {/* front wall: boards inside a timber frame */}
        <path d={WALL} fill={`url(#${id}-bd)`} />
        <path d={WALL} fill={`url(#${id}-sh)`} />
        <g clipPath={`url(#${id}-wall)`}>
          {/* gable infill darker, to read as a separate panel */}
          <path d="M72 150 L150 50 L228 150Z" fill={`url(#${id}-bd2)`} opacity=".9" />
          {/* frame */}
          <g fill="#2e2030">
            {[72, 108, 147.5, 187, 222].map((x, i) => <rect key={i} x={x} y="50" width={i === 2 ? 5 : 6} height="236" />)}
            <rect x="72" y="146" width="156" height="5" /><rect x="72" y="198" width="156" height="6" /><rect x="102" y="118" width="96" height="4" />
          </g>
          {[72, 108, 147.5, 187, 222].map((x, i) => <path key={i} d={`M${x + 0.8} 50 V286`} stroke="#6a4c60" strokeWidth=".7" opacity=".7" />)}
          {/* braces in the gable and the lower bays */}
          <path d="M147.5 122 L120 146 M152.5 122 L180 146 M78 146 L108 118 M222 146 L192 118" stroke="#2e2030" strokeWidth="3.2" />
          <path d="M78 270 L108 204 M222 270 L192 204" stroke="#2e2030" strokeWidth="3.4" />
          <path d="M114 150 L108 204 M186 150 L192 204" stroke="#2e2030" strokeWidth="0" />
        </g>
        {/* the thatched rake: a thick band of straw along the roof line, rolled at the eaves */}
        <path d="M42 160 L150 20 L258 160 L236 160 L150 50 L64 160Z" fill={`url(#${id}-th)`} />
        <path d="M42 160 L150 20 L258 160 L236 160 L150 50 L64 160Z" fill={`url(#${id}-sh)`} opacity=".9" />
        <path d="M64 160 L150 50 L236 160" stroke="#1a1228" strokeWidth="2.4" fill="none" opacity=".6" />
        <path d="M43 158 L150 20.4" stroke="#fff0c0" strokeWidth="1.2" opacity=".35" />
        {[[42, 160], [52, 162], [62, 160]].map(([x, y], i) => <ellipse key={`l${i}`} cx={x + 2} cy={y + 1} rx="6" ry="3.4" fill="#8c7850" stroke="#4a3e36" strokeWidth=".6" />)}
        {[[258, 160], [248, 162], [238, 160]].map(([x, y], i) => <ellipse key={`r${i}`} cx={x - 2} cy={y + 1} rx="6" ry="3.4" fill="#6c5c40" stroke="#4a3e36" strokeWidth=".6" />)}
        {/* crossed finials and the flag pole at the peak */}
        <path d="M150 26 L139 10 M150 26 L161 10" stroke="#3a2a38" strokeWidth="2.4" strokeLinecap="round" /><circle cx="139" cy="9" r="1.8" fill={P.brass} /><circle cx="161" cy="9" r="1.8" fill={P.brass} />

        {/* the hoist: a pulley at the peak, a rope, a hook and a sack waiting to go up */}
        <g>
          <rect x="146" y="58" width="8" height="8" rx="1" fill="#2e2030" /><ellipse cx="150" cy="70" rx="2.6" ry="6.6" fill={P.iron} stroke={P.ironLit} strokeWidth=".7" /><circle cx="150" cy="70" r="1" fill={P.brassLit} />
          <path d="M148 76 Q146 114 150 150" stroke="#b9a27a" strokeWidth="1.6" fill="none" /><path d="M148.6 76 Q146.6 114 150.4 150" stroke="#6a5a3a" strokeWidth=".6" fill="none" opacity=".8" strokeDasharray="2 2" />
          <path d="M150 150 v4 a3 3 0 1 1 -3 3" stroke={P.ironLit} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
        {/* round vents (slots 5, 6) */}
        {[[126, 106, 5], [174, 106, 6]].map(([x, y, k]) => (
          <g key={k}>
            <circle className={L(k) ? 'lh on' : 'lh'} cx={x} cy={y} r="24" fill={`url(#${id}-halo)`} />
            <circle cx={x} cy={y} r="11" fill="#2e2030" /><circle cx={x} cy={y} r="9" fill={`url(#${id}-glass)`} />
            <circle className={L(k) ? 'lw on' : 'lw'} cx={x} cy={y} r="9" fill={`url(#${id}-lit)`} />
            {[-6, -2, 2, 6].map((dy) => <path key={dy} d={`M${x - 9} ${y + dy} H${x + 9}`} stroke="#2e2030" strokeWidth="1.4" />)}
            <circle cx={x} cy={y} r="11" fill="none" stroke="#6a4c60" strokeWidth=".9" />
          </g>
        ))}
        {/* the loft hatch (slot 4), with its shutters open and hay inside */}
        <Casement id={id} x={150} y={188} w={22} h={30} on={L(4)} shutters mull="bars" frame="#2e2030" sill inside={<g>{Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${(141 + (i * 1.1) % 17).toFixed(1)} ${(180 - (i * 5) % 22).toFixed(1)} l${((i % 3) - 1) * 3} -5`} stroke={i % 2 ? '#f0d890' : '#c8a04a'} strokeWidth="1" strokeLinecap="round" />)}</g>} />

        {/* tall slit windows, two on each side of the doors (slots 0 to 3) */}
        {[[86, 0], [99, 1], [201, 2], [214, 3]].map(([x, k]) => (
          <g key={k}>
            <ellipse className={L(k) ? 'lh on' : 'lh'} cx={x} cy={252} rx="13" ry="26" fill={`url(#${id}-halo)`} />
            <rect x={x - 3.8} y={228} width="7.6" height="38" rx="1.4" fill="#2e2030" /><rect x={x - 2.4} y={229.6} width="4.8" height="35" fill={`url(#${id}-glass)`} />
            <rect className={L(k) ? 'lw on' : 'lw'} x={x - 2.4} y={229.6} width="4.8" height="35" fill={`url(#${id}-lit)`} />
            <path d={`M${x - 2.4} 247 H${x + 2.4}`} stroke="#2e2030" strokeWidth="1" />
          </g>
        ))}

        {/* the great doors, standing open on a loft of hay and sacks (slot 7 lights it) */}
        <g>
          <path d="M116 284 V212 Q116 204 124 204 H176 Q184 204 184 212 V284Z" fill="#2e2030" />
          <rect x="127" y="204" width="46" height="80" fill={`url(#${id}-in)`} />
          <g clipPath={`url(#${id}-doorclip)`}>
            <path d="M127 284 V258 Q150 246 173 258 V284Z" fill="#241a30" />
            <rect x="130" y="250" width="22" height="34" rx="2" fill="#2c2038" /><rect x="148" y="236" width="24" height="48" rx="2" fill="#241a30" />
            <g className={L(7) ? 'lw on' : 'lw'}>
              <rect x="127" y="204" width="46" height="80" fill={`url(#${id}-inlit)`} opacity=".92" />
              <path d="M127 284 V256 Q150 244 173 256 V284Z" fill="#c8923c" />
              <rect x="130" y="250" width="22" height="34" rx="2" fill="#e0b050" stroke="#8a5a1c" strokeWidth=".7" /><path d="M130 258 H152 M130 266 H152 M130 274 H152" stroke="#8a5a1c" strokeWidth=".7" />
              <rect x="148" y="236" width="24" height="48" rx="2" fill="#d8a448" stroke="#8a5a1c" strokeWidth=".7" /><path d="M148 246 H172 M148 256 H172 M148 266 H172 M148 276 H172" stroke="#8a5a1c" strokeWidth=".7" />
              {hay}
              <path d="M150 204 V216" stroke="#3a2a38" strokeWidth="1" /><circle cx="150" cy="222" r="5" fill="#fff0b8" /><circle cx="150" cy="222" r="9" fill="#fff0b8" opacity=".3" />
            </g>
            <path d="M127 214 H173" stroke="#05040f" strokeWidth="6" opacity=".35" />
          </g>
          <ellipse className={L(7) ? 'lh on' : 'lh'} cx="150" cy="291" rx="62" ry="13" fill={`url(#${id}-halo)`} />
          {/* the leaves, swung open: boards seen edge-on */}
          <path d="M117 284 V208 L127 206 V284Z" fill={`url(#${id}-bd2)`} /><path d="M117 284 V208 L127 206 V284Z" fill={`url(#${id}-sh)`} />
          <path d="M183 284 V208 L173 206 V284Z" fill={`url(#${id}-bd2)`} /><path d="M183 284 V208 L173 206 V284Z" fill="#05040f" opacity=".3" />
          {[218, 244, 270].map((y) => <g key={y}><path d={`M117 ${y} h10`} stroke={P.iron} strokeWidth="2" /><path d={`M183 ${y} h-10`} stroke={P.iron} strokeWidth="2" /></g>)}
          <path d="M116 204 H184 L178 196 H122Z" fill="#2e2030" /><path d="M122 196 H178" stroke="#6a4c60" strokeWidth=".8" opacity=".8" />
          <path d="M116 212 Q122 204 130 204 M184 212 Q178 204 170 204" stroke="#6a4c60" strokeWidth="1" fill="none" opacity=".6" />
          {/* the tithe mark painted on the lintel: a ring with a sheaf and X */}
          <g transform="translate(150 200)"><circle r="6.4" fill="#2e2030" stroke={P.brass} strokeWidth="1" /><g stroke={P.brassLit} strokeWidth="1" strokeLinecap="round" fill="none"><path d="M-3 -2.4 L3 2.4 M3 -2.4 L-3 2.4" /><path d="M0 -4.6 V-3" /></g></g>
        </g>

        {/* sacks by the doors */}
        <Sack x={100} y={286} s={1.02} tilt={-3} /><Sack x={86} y={288} s={0.92} tilt={5} />
        <Sack x={200} y={286} s={1} tilt={2} /><Sack x={214} y={288} s={1.06} tilt={-4} />
        {/* lanterns beside the doors */}
        <g><path d="M110 226 H116" stroke={P.iron} strokeWidth="1.4" /><Lantern id={id} x={113} y={232} s={1.2} /></g>
        <g><path d="M190 226 H184" stroke={P.iron} strokeWidth="1.4" /><Lantern id={id} x={187} y={232} s={1.2} /></g>
        <Ivy seed={5} x={78} y={286} len={104} wob={5} leaf={3.8} />

        {/* the cart shed: a lean-to roof of straw, a loaded cart and a lantern */}
        <g>
          <rect x="228" y="176" width="68" height="110" fill={`url(#${id}-bd2)`} opacity=".55" />
          <rect x="228" y="176" width="68" height="110" fill="#05040f" opacity=".42" />
          <path d="M294 200 V284 M262 190 V284" stroke="#2e2030" strokeWidth="4.4" />
          <path d="M294 200 V284" stroke="#6a4c60" strokeWidth=".8" opacity=".7" />
          <path d="M262 244 L294 214 M262 214 L294 244" stroke="#2e2030" strokeWidth="2" opacity=".0" />
          {/* cart */}
          <g>
            <path d="M236 276 L228 268" stroke={P.timber} strokeWidth="3" strokeLinecap="round" />
            <path d="M240 248 H292 L288 270 H244Z" fill={P.timber} stroke={P.timberShade} strokeWidth=".8" />
            {[250, 258, 266, 274, 282].map((x) => <path key={x} d={`M${x} 249 V269`} stroke={P.timberShade} strokeWidth=".7" opacity=".8" />)}
            <path d="M242 262 H290" stroke={P.timberShade} strokeWidth=".7" />
            <path d="M240 248 C244 232 258 228 268 232 C278 226 290 232 292 248Z" fill={`url(#${id}-hs)`} stroke="#4a3e36" strokeWidth=".6" />
            {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${(244 + i * 3.4).toFixed(1)} ${(240 - (i % 4) * 2).toFixed(1)} l${(i % 2 ? 3 : -3)} -5`} stroke="#d8c080" strokeWidth=".9" strokeLinecap="round" opacity=".8" />)}
            <Wheel x={256} y={274} r={13} />
          </g>
          <Lantern id={id} x={262} y={204} s={1.1} />
          <path d="M262 190 V199" stroke={P.iron} strokeWidth="1" />
          <path d="M224 164 L302 192 V204 L224 178Z" fill={`url(#${id}-th2)`} /><path d="M224 164 L302 192 V204 L224 178Z" fill={`url(#${id}-sh)`} />
          <path d="M224 178 L302 204" stroke="#1a1228" strokeWidth="1.6" opacity=".6" />
          {[0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={228 + i * 14} cy={180 + i * 4.6} rx="5.4" ry="3" fill="#6c5c40" stroke="#4a3e36" strokeWidth=".5" />)}
        </g>

        {/* the haystack and a pitchfork at the left */}
        <g>
          <ellipse cx="38" cy="288" rx="32" ry="5" fill="#05040f" opacity=".4" />
          <path d="M8 286 Q6 256 20 238 Q30 214 38 196 Q46 214 56 238 Q70 256 68 286 Q38 292 8 286Z" fill={`url(#${id}-hs)`} />
          <path d="M8 286 Q6 256 20 238 Q30 214 38 196 Q46 214 56 238 Q70 256 68 286 Q38 292 8 286Z" fill={`url(#${id}-sh)`} />
          {Array.from({ length: 22 }, (_, i) => { const y = 206 + i * 3.6, hw = Math.max(2, (y - 196) * 0.46); return <path key={i} d={`M${(38 - hw * 0.9).toFixed(1)} ${y.toFixed(1)} q${(hw * 0.9).toFixed(1)} 3 ${(hw * 1.8).toFixed(1)} 0`} stroke="#6a5a3a" strokeWidth=".7" fill="none" opacity=".6" />; })}
          <path d="M34 200 Q38 192 42 200Z" fill="#8c7850" />
          <g transform="rotate(14 54 262)"><path d="M54 296 V236" stroke={P.timberLit} strokeWidth="2.2" strokeLinecap="round" /><path d="M48 236 v-9 M54 236 v-11 M60 236 v-9 M48 238 H60" stroke={P.ironLit} strokeWidth="1.4" strokeLinecap="round" fill="none" /></g>
        </g>

        <Pennant x={150} y={22} h={14} />
      </g>
    );
  },
};
