import type { ReactNode } from 'react';
import { BrickPattern, Casement, Lantern, P, Pennant, PlankPattern, Porthole, SlatePattern, Smoke, StonePattern, darken, lighten, rng } from '../kit';
import type { LandmarkDef } from './types';

const PLASTER = '#b4aec6';

/** A striped canvas awning, drawn flat; the caller tilts it. Width is 2*hw. Scalloped lower edge. */
function Awning({ hw, y0, drop, a, b, n = 6 }: { hw: number; y0: number; drop: number; a: string; b: string; n?: number }) {
  const w = (hw * 2) / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x0 = -hw + i * w;
        return <path key={i} d={`M${x0} ${y0} h${w} l${w * 0.12} ${drop} q${-w * 0.56} ${drop * 0.5} ${-w * 1.12} 0Z`} fill={i % 2 ? b : a} />;
      })}
      <path d={`M${-hw} ${y0} H${hw}`} stroke={darken(a, 0.5)} strokeWidth="1.2" />
      <path d={`M${-hw} ${y0 + 1.4} H${hw}`} stroke="#fff" strokeWidth=".6" opacity=".25" />
    </g>
  );
}

/** One market stall standing on the slope of the bridge. Local origin: centre of the deck under the stall. */
function Stall({ id, tone, goods, flip = false, dl = 2, dr = 2 }: { id: string; tone: [string, string]; goods: 'fruit' | 'cloth'; flip?: boolean; dl?: number; dr?: number }) {
  const r = rng(goods === 'fruit' ? 5 : 9);
  const items: ReactNode[] = [];
  if (goods === 'fruit') {
    for (let i = 0; i < 9; i++) { const x = -22 + i * 5.4, row = i % 2; items.push(<circle key={i} cx={x} cy={-16.5 - row * 2.6} r={2.9} fill={['#c4483c', '#e0a43c', '#8aa84a', '#c4483c'][i % 4]} stroke="#2a1018" strokeWidth=".4" />); }
    items.push(<g key="ch"><ellipse cx="14" cy="-17" rx="6" ry="3" fill="#e8c46a" /><path d="M8 -17 h12" stroke="#a37a2a" strokeWidth=".6" /></g>);
  } else {
    ['#7a5ab8', '#c4605a', '#4f9a8a', '#e0b45a'].forEach((c, i) => items.push(<g key={i}><rect x={-23 + i * 11.4} y={-24.4} width="9" height="10.4" rx="2" fill={c} stroke={darken(c, 0.5)} strokeWidth=".5" /><ellipse cx={-18.5 + i * 11.4} cy={-24.4} rx="4.5" ry="1.8" fill={lighten(c, 0.25)} /></g>));
  }
  return (
    <g transform={flip ? 'scale(-1 1)' : undefined}>
      {/* stilts down to the sloping deck, braced, so the booth itself stands level */}
      <path d={`M-27 0 V${dl} M27 0 V${dr} M0 0 V${(dl + dr) / 2}`} stroke={P.timberShade} strokeWidth="2.6" />
      <path d={`M-27 2 L0 ${(dl + dr) / 2} L27 2 M-27 ${dl} L0 2 L27 ${dr}`} stroke={P.timber} strokeWidth="1.6" fill="none" opacity=".9" />
      <path d="M-27 0 V-48 M27 0 V-48" stroke={P.timberLit} strokeWidth="2.4" />
      <path d="M-27 0 V-48" stroke={P.timberShade} strokeWidth=".6" />
      <rect x="-31" y="-1" width="62" height="4" rx="1" fill={P.timber} stroke={P.timberShade} strokeWidth=".6" />
      {/* back cloth */}
      <path d="M-27 -50 H27 V-26 H-27Z" fill={darken(tone[0], 0.62)} opacity=".9" />
      {/* counter */}
      <rect x="-28" y="-15" width="56" height="12" fill="url(#plk)" />
      <rect x="-28" y="-15" width="56" height="12" fill={P.timber} opacity=".55" />
      <rect x="-30" y="-17.4" width="60" height="3.4" rx="1" fill={P.timberLit} stroke={P.timberShade} strokeWidth=".6" />
      <path d="M-22 -3 V0 M22 -3 V0" stroke={P.timberShade} strokeWidth="2.4" />
      {items}
      <g transform="translate(0 -52)"><Awning hw={32} y0={0} drop={9} a={tone[0]} b={tone[1]} /></g>
      <path d="M-32 -52 L-28 -62 H28 L32 -52Z" fill={darken(tone[0], 0.3)} opacity=".0" />
      <Lantern id={id} x={0} y={-41} s={0.9} />
      <g transform="translate(-33 -2)"><rect x="-4.6" y="-9" width="9.2" height="9" rx=".6" fill={P.timber} stroke={P.timberShade} strokeWidth=".6" /><path d="M-4.6 -6 H4.6 M-4.6 -3 H4.6" stroke={P.timberShade} strokeWidth=".5" /><path d="M-3.6 -9 l0 9" stroke={P.timberLit} strokeWidth=".4" opacity=".5" /></g>
    </g>
  );
}

/** The Market Bridge: a humped stone bridge over the mill-race with a half-timbered shop on its crest and a stall on each slope. */
export const marketBridge: LandmarkDef = {
  id: 'market',
  name: 'The Market Bridge',
  blurb: 'Everything trades somewhere.',
  box: { x: 0, y: -34, w: 330, h: 344 },
  slots: 8,
  door: { x: 165, y: 196 },
  flag: { x: 165, y: 30 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const r = rng(23);
    // the bridge deck curve (a quadratic): y at x
    const deckY = (x: number) => { const t = x / 330; return (1 - t) * (1 - t) * 236 + 2 * t * (1 - t) * 136 + t * t * 236; };
    const bulbs: [number, number][] = [];
    // two strings of lights from the lamp posts to the shop eaves
    for (let side = 0; side < 2; side++) {
      const x0 = side ? 310 : 20, y0 = 142, x1 = side ? 232 : 98, y1 = 92;
      for (let i = 1; i < 9; i++) { const t = i / 9; bulbs.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 7]); }
    }
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-st`} seed={61} base="#7c7899" w={50} h={30} rows={5} vary={0.13} />
          <SlatePattern id={`${id}-sl`} seed={17} base="#46508a" w={24} h={14} />
          <BrickPattern id={`${id}-br`} seed={4} base="#8a5a5a" />
          <PlankPattern id="plk" seed={3} base="#5b3a2a" />
          <PlankPattern id={`${id}-door`} seed={8} base="#4a2f24" w={24} h={44} />
          <linearGradient id={`${id}-pl`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d8d2e6" stopOpacity=".5" /><stop offset=".5" stopColor="#8e89ad" stopOpacity="0" /><stop offset="1" stopColor="#1a1844" stopOpacity=".6" /></linearGradient>
          <linearGradient id={`${id}-wat`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a4a63" /><stop offset=".5" stopColor="#12304f" /><stop offset="1" stopColor="#0a1a35" /></linearGradient>
          <linearGradient id={`${id}-rf`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8f8fb8" stopOpacity=".6" /><stop offset="1" stopColor="#23213d" stopOpacity=".7" /></linearGradient>
          <linearGradient id={`${id}-refl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.glow} stopOpacity=".55" /><stop offset="1" stopColor={P.ember} stopOpacity="0" /></linearGradient>
          <clipPath id={`${id}-above`}><path d="M-20 -60 H350 V240 Q330 236 330 236 Q165 136 0 236 Q-10 238 -20 240Z" /></clipPath>
          <clipPath id={`${id}-bodyclip`}><path d="M0 236 Q165 136 330 236 V294 H0Z" /></clipPath>
        </defs>

        {/* the mill-race */}
        <rect x="-6" y="262" width="342" height="48" fill={`url(#${id}-wat)`} />
        {Array.from({ length: 16 }, (_, i) => { const x = r() * 330, y = 270 + r() * 30; return <path key={i} d={`M${x.toFixed(0)} ${y.toFixed(0)} q6 -2 12 0 q6 2 12 0`} stroke="#8fb8d8" strokeWidth=".8" fill="none" opacity={0.18 + r() * 0.2} />; })}
        {/* moon glints */}
        {[[40, 296], [92, 302], [212, 298], [284, 304], [150, 300]].map(([x, y], i) => <path key={i} d={`M${x} ${y} h${8 + (i % 3) * 4}`} stroke="#f6f0dc" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />)}

        {/* bridge body with two arches cut out */}
        <path fillRule="evenodd" d="M0 236 Q165 136 330 236 V294 H0Z M46 294 V268 A40 40 0 0 1 126 268 V294Z M204 294 V268 A40 40 0 0 1 284 268 V294Z" fill={`url(#${id}-st)`} />
        <path fillRule="evenodd" d="M0 236 Q165 136 330 236 V294 H0Z M46 294 V268 A40 40 0 0 1 126 268 V294Z M204 294 V268 A40 40 0 0 1 284 268 V294Z" fill={`url(#${id}-rf)`} opacity=".55" />
        {/* arch rings: voussoirs */}
        {[86, 244].map((cx) => (
          <g key={cx}>
            {Array.from({ length: 13 }, (_, i) => { const a = Math.PI - (i / 12) * Math.PI; return <path key={i} d={`M${(cx + Math.cos(a) * 40).toFixed(1)} ${(268 - Math.sin(a) * 40).toFixed(1)} L${(cx + Math.cos(a) * 48).toFixed(1)} ${(268 - Math.sin(a) * 48).toFixed(1)}`} stroke="#23213d" strokeWidth="1" opacity=".8" />; })}
            <path d={`M${cx - 48} 268 A48 48 0 0 1 ${cx + 48} 268`} fill="none" stroke="#a09cc4" strokeWidth="1.6" opacity=".55" />
            <path d={`M${cx - 40} 268 A40 40 0 0 1 ${cx + 40} 268`} fill="none" stroke="#05040f" strokeWidth="2" opacity=".6" />
            {/* the keystone */}
            <path d={`M${cx - 4} ${268 - 48} h8 l-1.2 9 h-5.6Z`} fill="#b4b0d4" stroke="#23213d" strokeWidth=".7" />
          </g>
        ))}
        {/* shadow inside the arches and the warm reflection of the shop light on the water */}
        <g clipPath={`url(#${id}-bodyclip)`}>
          {[86, 244].map((cx) => <path key={cx} d={`M${cx - 38} 294 V268 A38 38 0 0 1 ${cx + 38} 268 V294Z`} fill="#05040f" opacity=".42" />)}
        </g>
        {/* a carved plaque on the pier: scales inside a laurel ring */}
        <g>
          <ellipse cx="165" cy="246" rx="15" ry="12" fill="#2a2850" /><ellipse cx="165" cy="246" rx="13" ry="10.4" fill="#9a96bc" /><ellipse cx="165" cy="246" rx="11" ry="8.4" fill="#6d6a90" />
          <path d="M165 239 V252 M159 241.6 H171" stroke="#d6d8ff" strokeWidth="1" /><path d="M159 241.6 l-2.4 5 h4.8Z M171 241.6 l-2.4 5 h4.8Z" fill="#d6d8ff" opacity=".85" />
          <path d="M153 250 q-3 -9 3 -14 M177 250 q3 -9 -3 -14" stroke={P.mossLit} strokeWidth="1.2" fill="none" opacity=".8" strokeLinecap="round" />
        </g>
        {[[20, 276, 16, 5], [64, 284, 12, 4], [126, 280, 14, 5], [212, 278, 12, 4], [300, 282, 18, 5], [180, 286, 10, 3]].map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={P.moss} opacity=".34" />)}
        {/* cutwaters on the pier */}
        <path d="M150 294 L165 270 L180 294Z" fill={`url(#${id}-st)`} /><path d="M150 294 L165 270 L180 294Z" fill={`url(#${id}-rf)`} opacity=".55" />
        {/* weeds and wet line at the base */}
        <path d="M0 292 H330" stroke="#0a1a35" strokeWidth="3" opacity=".55" />
        {Array.from({ length: 22 }, (_, i) => { const x = 4 + i * 15 + r() * 6; return <path key={i} d={`M${x.toFixed(0)} 294 q-2 -${(4 + r() * 5).toFixed(0)} 1 -${(7 + r() * 5).toFixed(0)}`} stroke={P.moss} strokeWidth="1.2" fill="none" opacity=".7" strokeLinecap="round" />; })}

        {/* the stalls stand on the slopes, behind the parapet */}
        <g clipPath={`url(#${id}-above)`}>
          <g transform={`translate(52 ${(deckY(79) - 3).toFixed(1)})`}><Stall id={id} tone={['#a8445a', '#d8cdb0']} goods="fruit" dl={Math.round(deckY(25) - deckY(79) + 6)} dr={5} /></g>
          <g transform={`translate(278 ${(deckY(251) - 3).toFixed(1)})`}><Stall id={id} tone={['#3f8f8a', '#d8cdb0']} goods="cloth" flip dl={Math.round(deckY(305) - deckY(251) + 6)} dr={5} /></g>
        </g>

        {/* the parapet: a stone coping along the curve, in front of the stalls */}
        <path d="M0 238 Q165 138 330 238" stroke="#23213d" strokeWidth="11" fill="none" />
        <path d="M0 236 Q165 136 330 236" stroke="#8a86a8" strokeWidth="8" fill="none" />
        <path d="M0 233.4 Q165 133.4 330 233.4" stroke="#d6d8ff" strokeWidth="1.2" fill="none" opacity=".5" />
        {Array.from({ length: 24 }, (_, i) => { const t = (i + 0.5) / 24; const x = 330 * t; const y = (1 - t) * (1 - t) * 236 + 2 * t * (1 - t) * 136 + t * t * 236; return <path key={i} d={`M${x.toFixed(1)} ${(y - 3.4).toFixed(1)} v7`} stroke="#23213d" strokeWidth=".8" opacity=".6" />; })}

        {/* lamp posts and strings of lights */}
        {[20, 310].map((x, k) => (
          <g key={x}>
            <path d={`M${x} ${deckY(x).toFixed(1)} V150`} stroke={P.iron} strokeWidth="2.6" strokeLinecap="round" /><path d={`M${x - 3} 150 h6 M${x - 2.4} 162 h4.8`} stroke={P.ironLit} strokeWidth="1.2" />
            <path d={`M${x - 3.4} ${(deckY(x) - 2).toFixed(1)} h6.8`} stroke={P.ironLit} strokeWidth="1.4" />
            <Lantern id={id} x={x} y={143} s={1.5} />
            {k === 0 ? <g transform={`translate(${x + 5} ${deckY(x) - 9})`}><ellipse cx="0" cy="0" rx="4.6" ry="3.4" fill="#0e0c20" /><circle cx="3.6" cy="-3" r="2.6" fill="#0e0c20" /><path d="M2 -5 l.6 -2.6 l1.6 2 M5 -4.8 l1 -2.4 l.8 2.6" fill="#0e0c20" stroke="#0e0c20" strokeWidth=".6" /><path d="M-4.4 .4 q-4 -1 -5 -5.4" stroke="#0e0c20" strokeWidth="1.6" fill="none" strokeLinecap="round" /><circle cx="4.4" cy="-3.2" r=".7" fill="#e8d56a" /></g> : null}
          </g>
        ))}
        {[0, 1].map((side) => (
          <path key={side} d={`M${side ? 310 : 20} 142 Q${side ? 270 : 60} ${side ? 130 : 130} ${side ? 232 : 98} 92`} stroke={P.iron} strokeWidth=".8" fill="none" opacity=".8" />
        ))}
        {bulbs.map(([x, y], i) => <g key={i}><circle cx={x.toFixed(1)} cy={(y + 1.4).toFixed(1)} r="4" fill={P.glow} opacity=".14" /><circle cx={x.toFixed(1)} cy={(y + 1.4).toFixed(1)} r="1.5" fill={P.glowHot} /></g>)}

        {/* ── the shop on the crest ── */}
        <g>
          <path d="M96 196 H234 V190 H96Z" fill="#8a86a8" /><path d="M96 190 H234" stroke="#d6d8ff" strokeWidth="1" opacity=".5" /><path d="M96 196 H234" stroke="#05040f" strokeWidth="1.4" opacity=".5" />
          {/* ground floor */}
          <rect x="112" y="128" width="106" height="62" fill={PLASTER} />
          <rect x="112" y="128" width="106" height="62" fill={`url(#${id}-pl)`} />
          {/* timber frame: posts, rails and braces */}
          {[[112, 4.4], [148, 3.6], [182, 3.6], [213.6, 4.4]].map(([x, w], i) => <rect key={i} x={x} y="128" width={w} height="62" fill="#3a2a38" />)}
          <rect x="112" y="128" width="106" height="4.4" fill="#3a2a38" /><rect x="112" y="172" width="106" height="3.6" fill="#3a2a38" />
          {[[116.4, 132.4, 148, 172], [148, 132.4, 116.4, 172], [185.6, 132.4, 213.6, 172], [213.6, 132.4, 185.6, 172]].map(([x0, y0, x1, y1], i) => <path key={i} d={`M${x0} ${y0} L${x1} ${y1}`} stroke="#3a2a38" strokeWidth="3.2" opacity=".0" />)}
          {[112, 148, 182, 213.6].map((x, i) => <path key={i} d={`M${x + 1} 128 V190`} stroke="#6a4c52" strokeWidth=".7" opacity=".7" />)}
          {/* bay windows with goods behind the glass (slots 3, 4) */}
          <Casement id={id} x={130} y={170} w={26} h={26} on={L(3)} mull="grid" frame="#2a1c26" inside={<g><rect x="118" y="160" width="26" height="10" fill="#6a3a2a" opacity=".6" />{[0, 1, 2, 3].map((k) => <rect key={k} x={120 + k * 6} y={154 - (k % 2) * 3} width="4.4" height={10 + (k % 2) * 3} rx="1.2" fill={['#7a5ab8', '#c4605a', '#4f9a8a', '#e0b45a'][k]} opacity=".85" />)}</g>} />
          <Casement id={id} x={200} y={170} w={26} h={26} on={L(4)} mull="grid" frame="#2a1c26" inside={<g><rect x="187" y="160" width="26" height="10" fill="#6a3a2a" opacity=".6" />{[0, 1, 2].map((k) => <g key={k}><rect x={190 + k * 7.6} y={152} width="5.6" height="12" rx="1.6" fill={['#3f8f8a', '#c4483c', '#e0b45a'][k]} opacity=".85" /><rect x={191 + k * 7.6} y={149.6} width="3.6" height="3" fill="#d6c9a4" opacity=".8" /></g>)}</g>} />
          {/* awnings over them */}
          <g transform="translate(130 136)"><Awning hw={17} y0={0} drop={8} a="#a8445a" b="#d8cdb0" n={5} /></g>
          <g transform="translate(200 136)"><Awning hw={17} y0={0} drop={8} a="#3f8f8a" b="#d8cdb0" n={5} /></g>
          {/* the door */}
          <path d="M153 192 V162 A12 12 0 0 1 177 162 V192Z" fill="#2a1c26" />
          <path d="M155.4 190 V163 A9.6 9.6 0 0 1 174.6 163 V190Z" fill={`url(#${id}-door)`} />
          <path d="M165 153.4 V190" stroke="#1a0f0a" strokeWidth="1" />
          <circle cx="161" cy="178" r="1.4" fill={P.brassLit} /><circle cx="169" cy="178" r="1.4" fill={P.brassLit} />
          <path d="M157 186 H173 M157 170 H173" stroke="#1a0f0a" strokeWidth=".8" opacity=".6" />
          <path d="M157 190 H173" stroke={P.brass} strokeWidth="1" opacity=".6" />
          <path d="M150 192 V190 h30 v2Z" fill="#8a86a8" />
          {/* stall-board under the windows: planks */}
          <rect x="116" y="176" width="28" height="14" fill="url(#plk)" /><rect x="186" y="176" width="28" height="14" fill="url(#plk)" />
          <rect x="116" y="176" width="28" height="14" fill="#1a1230" opacity=".25" /><rect x="186" y="176" width="28" height="14" fill="#1a1230" opacity=".25" />

          {/* jetty brackets */}
          {[106, 146, 184, 224].map((x) => <path key={x} d={`M${x} 134 L${x + 6} 134 L${x} 128Z`} fill="#3a2a38" />)}
          <rect x="102" y="124" width="126" height="6" rx="1" fill="#2a1c26" /><path d="M102 124.4 H228" stroke="#6a4c52" strokeWidth=".8" opacity=".8" />
          {/* upper floor (jettied) */}
          <rect x="104" y="84" width="122" height="41" fill={PLASTER} />
          <rect x="104" y="84" width="122" height="41" fill={`url(#${id}-pl)`} />
          <rect x="104" y="84" width="122" height="4.6" fill="#3a2a38" />
          {[104, 145, 185, 222.6].map((x, i) => <rect key={i} x={x} y="84" width="3.8" height="41" fill="#3a2a38" />)}
          {[[107.8, 88.6, 145, 122], [145, 88.6, 107.8, 122], [188.8, 88.6, 222.6, 122], [222.6, 88.6, 188.8, 122]].map(([x0, y0, x1, y1], i) => <path key={i} d={`M${x0} ${y0} L${x1} ${y1}`} stroke="#3a2a38" strokeWidth="3" opacity=".0" />)}
          <path d="M108 88.6 L145 122 M145 88.6 L108 122 M189 88.6 L222.6 122 M222.6 88.6 L189 122" stroke="#3a2a38" strokeWidth="2.6" opacity=".92" />
          {[104, 145, 185, 222.6].map((x, i) => <path key={i} d={`M${x + 0.8} 84 V125`} stroke="#6a4c52" strokeWidth=".7" opacity=".7" />)}
          <Casement id={id} x={125} y={118} w={20} h={24} on={L(0)} shutters flowers mull="cross" inside={<g><path d="M118 98 q4 8 4 20" stroke="#6a3a2a" strokeWidth="2" opacity=".5" /></g>} curtain="#c4605a" />
          <Casement id={id} x={165} y={118} w={20} h={24} on={L(1)} mull="cross" flowers inside={<g><rect x="158" y="104" width="14" height="14" fill="#6a3a2a" opacity=".35" /><circle cx="165" cy="108" r="3" fill="#2a1c26" opacity=".55" /></g>} />
          <Casement id={id} x={206} y={118} w={20} h={24} on={L(2)} shutters flowers mull="cross" curtain="#4f9a8a" />

          {/* the hanging sign and its lamp (slot 7) */}
          <path d="M226 138 H258" stroke={P.iron} strokeWidth="2" strokeLinecap="round" /><path d="M226 144 Q240 138 252 138" stroke={P.iron} strokeWidth="1.2" fill="none" />
          <g transform="translate(244 138)">
            <path d="M-6 0 V6 M6 0 V6" stroke={P.iron} strokeWidth=".8" />
            <circle cx="0" cy="17" r="11.4" fill="#2a1c26" /><circle cx="0" cy="17" r="10" fill={P.brass} /><circle cx="0" cy="17" r="8.2" fill="#3a2a38" />
            <path d="M0 9.6 V24.6 M-6 12.6 H6" stroke={P.brassLit} strokeWidth="1" /><path d="M-6 12.6 l-2.6 6 h5.2Z M6 12.6 l-2.6 6 h5.2Z" fill={P.brassLit} />
            <path d="M-4 24.6 H4" stroke={P.brassLit} strokeWidth="1.4" strokeLinecap="round" />
          </g>
          <g>
            <circle className={L(7) ? 'lh on' : 'lh'} cx="258" cy="148" r="24" fill={`url(#${id}-halo)`} />
            <path d="M258 138 V142" stroke={P.iron} strokeWidth=".9" />
            <path d="M254.6 142 L258 139.6 L261.4 142Z" fill={P.iron} />
            <rect x="254.8" y="142" width="6.4" height="9" fill={`url(#${id}-glass)`} stroke={P.iron} strokeWidth=".8" />
            <rect className={L(7) ? 'lw on' : 'lw'} x="255.4" y="142.6" width="5.2" height="7.8" fill={`url(#${id}-lit)`} />
            <path d="M254.6 151 h6.8 l-1 2 h-4.8Z" fill={P.iron} />
          </g>

          {/* the roof: slates, dormer, chimney */}
          <path d="M90 90 L140 34 H190 L240 90Z" fill={`url(#${id}-sl)`} />
          <path d="M90 90 L140 34 H190 L240 90Z" fill={`url(#${id}-pl)`} opacity=".8" />
          <path d="M140 34 H190" stroke="#262c4d" strokeWidth="3.4" strokeLinecap="round" /><path d="M141 32.6 H189" stroke="#8a96d4" strokeWidth=".9" opacity=".7" />
          <path d="M90 90 L140 34 M240 90 L190 34" stroke="#262c4d" strokeWidth="2" /><path d="M91.4 88.4 L141 33" stroke="#8a96d4" strokeWidth=".8" opacity=".5" />
          <rect x="86" y="88" width="158" height="5" rx="1" fill="#2a1c26" /><path d="M86 88.4 H244" stroke="#6a4c52" strokeWidth=".8" opacity=".8" />
          {Array.from({ length: 22 }, (_, i) => <rect key={i} x={89 + i * 7.2} y="93" width="3" height="3.4" fill="#2a1c26" />)}
          {/* dormer with a window (slot 5) */}
          <g>
            <path d="M146 78 V58 H184 V78Z" fill={PLASTER} /><path d="M146 78 V58 H184 V78Z" fill={`url(#${id}-pl)`} />
            <path d="M146 58 H184 M146 78 H184 M146 58 V78 M184 58 V78" stroke="#3a2a38" strokeWidth="3" />
            <Casement id={id} x={165} y={77} w={16} h={16} on={L(5)} mull="cross" sill={false} />
            <path d="M140 60 L165 40 L190 60Z" fill={`url(#${id}-sl)`} /><path d="M140 60 L165 40 L190 60Z" fill={`url(#${id}-pl)`} opacity=".8" />
            <path d="M140 60 L165 40 L190 60" stroke="#262c4d" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
            <path d="M165 40 V35" stroke={P.brassLit} strokeWidth="1.4" /><circle cx="165" cy="34" r="1.8" fill={P.brassLit} />
          </g>
          {/* an attic round window at the right of the roof (slot 6) and the chimney */}
          <g>
            <rect x="204" y="22" width="16" height="48" fill={`url(#${id}-br)`} />
            <rect x="204" y="22" width="16" height="48" fill={`url(#${id}-rf)`} opacity=".6" />
            <rect x="201.6" y="18" width="20.8" height="6" rx="1" fill="#6a6a8a" /><rect x="201.6" y="18" width="20.8" height="2" fill="#a09cc4" opacity=".6" />
            <rect x="206" y="12" width="5" height="8" fill="#8a5a5a" /><rect x="214" y="14" width="5" height="6" fill="#8a5a5a" />
            <Smoke x={212} y={10} seed={6} n={4} />
          </g>
          <g><path d="M108 70 h14 v8 h-14Z" fill="none" /></g>
          <Porthole id={id} x={118} y={74} r={4.4} on={L(6)} />
        </g>

        {/* a rowboat moored under the right arch, lantern at its bow */}
        <g>
          <path d="M214 286 Q246 296 276 284 L270 292 Q244 300 220 294Z" fill="#3a2a38" /><path d="M214 286 Q246 296 276 284" stroke="#8a5a3c" strokeWidth="1.4" fill="none" />
          <path d="M240 276 V290" stroke="#2a1c26" strokeWidth="1.6" /><path d="M240 277 L252 288 H240Z" fill="#c8b890" opacity=".8" />
          <path d="M272 283 V272" stroke={P.iron} strokeWidth="1" /><Lantern id={id} x={272} y={270} s={0.9} />
          <path d="M272 284 v18" stroke="url(#refl)" strokeWidth="3" opacity=".0" />
          <rect x="270" y="288" width="4" height="14" fill={`url(#${id}-refl)`} opacity=".7" />
        </g>
        {/* reflections of the shop's windows */}
        {[130, 165, 200].map((x, i) => <g key={i} stroke={P.glow} strokeLinecap="round" opacity={L(i) ? 0.55 : 0.16}>{[0, 1, 2, 3].map((k) => <path key={k} d={`M${x - 7 + k * 1.2} ${298 + k * 3.6} h${14 - k * 2.4}`} strokeWidth={2.2 - k * 0.35} />)}</g>)}
        {/* reeds at the left bank */}
        {[4, 11, 18].map((x, i) => <g key={x}><path d={`M${x} 304 q${i - 1} -22 ${(i - 1) * 3} -38`} stroke="#4f6a46" strokeWidth="1.4" fill="none" /><rect x={x - 1.4 + (i - 1) * 2.4} y={268 - i * 1.6} width="3" height="9" rx="1.4" fill="#5b3a2a" /></g>)}
        <Pennant x={165} y={34} h={0} />
      </g>
    );
  },
};
