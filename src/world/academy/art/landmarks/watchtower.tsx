import type { ReactNode } from 'react';
import { ArchWindow, Casement, Ivy, Lantern, P, Pennant, SlatePattern, Smoke, StonePattern, darken, lighten, rng } from '../kit';
import type { LandmarkDef } from './types';

/** The Watchtower: a banded lighthouse-like tower on a crag above the lake, with a keeper's cottage, a lens lantern and two beams. */
export const watchtower: LandmarkDef = {
  id: 'watch',
  name: 'The Watchtower',
  blurb: 'Someone has to look twice.',
  box: { x: 0, y: -34, w: 300, h: 348 },
  slots: 8,
  door: { x: 150, y: 262 },
  flag: { x: 150, y: 2 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const r = rng(89);
    const TOWER = 'M112 262 L127 104 H173 L188 262Z';
    // the tower's left and right edges at height y
    const edgeL = (y: number) => 112 + ((262 - y) / 158) * 15;
    const edgeR = (y: number) => 188 - ((262 - y) / 158) * 15;
    const rocks: ReactNode[] = [];
    for (let i = 0; i < 26; i++) {
      const x = 8 + r() * 284, y = 262 + r() * 36;
      rocks.push(<path key={i} d={`M${x.toFixed(0)} ${y.toFixed(0)} l${(r() * 10 - 3).toFixed(0)} ${(r() * 9 + 3).toFixed(0)}`} stroke="#14122e" strokeWidth=".9" opacity=".5" fill="none" />);
    }
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-st`} seed={45} base="#8a86a8" w={46} h={26} rows={4} vary={0.12} />
          <StonePattern id={`${id}-rk`} seed={55} base="#4a4868" w={50} h={34} rows={4} vary={0.22} />
          <StonePattern id={`${id}-rk2`} seed={65} base="#3a3858" w={50} h={34} rows={4} vary={0.22} />
          <SlatePattern id={`${id}-sl`} seed={25} base="#44507a" w={22} h={13} />
          <linearGradient id={`${id}-tw`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e6e4ff" stopOpacity=".34" /><stop offset=".28" stopColor="#9a96bc" stopOpacity=".05" /><stop offset=".7" stopColor="#0a0820" stopOpacity=".28" /><stop offset="1" stopColor="#0a0820" stopOpacity=".7" /></linearGradient>
          <linearGradient id={`${id}-wat`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#173c5c" /><stop offset="1" stopColor="#09152e" /></linearGradient>
          <linearGradient id={`${id}-cu`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9ee0d0" /><stop offset=".4" stopColor={P.verdigris} /><stop offset="1" stopColor="#1c4a48" /></linearGradient>
          <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.brassLit} /><stop offset=".5" stopColor={P.brass} /><stop offset="1" stopColor={P.brassShade} /></linearGradient>
          <radialGradient id={`${id}-lens`} cx="50%" cy="50%" r="55%"><stop offset="0" stopColor="#fffbe0" /><stop offset=".35" stopColor="#ffe08a" /><stop offset=".8" stopColor="#ff9a40" /><stop offset="1" stopColor="#d9532a" /></radialGradient>
          <linearGradient id={`${id}-beamL`} x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#ffe9a8" stopOpacity=".55" /><stop offset="1" stopColor="#ffe9a8" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${id}-beamR`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffe9a8" stopOpacity=".55" /><stop offset="1" stopColor="#ffe9a8" stopOpacity="0" /></linearGradient>
          <clipPath id={`${id}-tower`}><path d={TOWER} /></clipPath>
        </defs>

        {/* the light's two beams, over the sky and the lake (slot 7) */}
        <g className={L(7) ? 'lh on' : 'lh'}>
          <path d="M138 66 L2 34 V104Z" fill={`url(#${id}-beamL)`} /><path d="M162 66 L298 34 V104Z" fill={`url(#${id}-beamR)`} />
          <circle cx="150" cy="70" r="46" fill={`url(#${id}-halo)`} />
        </g>

        {/* the lake */}
        <rect x="-10" y="296" width="320" height="30" fill={`url(#${id}-wat)`} />
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${(r() * 280).toFixed(0)} ${(302 + r() * 18).toFixed(0)} q6 -2 12 0 q6 2 12 0`} stroke="#8fb8d8" strokeWidth=".8" fill="none" opacity={0.2 + r() * 0.2} />)}
        {[[40, 308], [250, 310], [150, 316]].map(([x, y], i) => <path key={i} d={`M${x} ${y} h${10 + i * 4}`} stroke="#f6f0dc" strokeWidth="1.2" strokeLinecap="round" opacity=".45" />)}
        <g opacity={L(7) ? 0.7 : 0.15}>{[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M${150 - 12 + k * 2} ${300 + k * 4.4} h${24 - k * 4}`} stroke={P.glow} strokeWidth={2.4 - k * 0.3} strokeLinecap="round" />)}</g>

        {/* the crag, in three layers of rock with moss and tufts */}
        <path d="M-6 300 L10 270 L34 254 L66 250 L96 258 L112 262 H188 L214 256 L248 248 L282 262 L306 280 L306 300Z" fill={`url(#${id}-rk2)`} />
        <path d="M0 300 L16 276 L40 262 L74 258 L104 266 L196 266 L228 260 L260 262 L296 284 L300 300Z" fill={`url(#${id}-rk)`} />
        <path d="M0 300 L16 276 L40 262 L74 258 L104 266 L196 266 L228 260 L260 262 L296 284 L300 300Z" fill={`url(#${id}-tw)`} opacity=".6" />
        <path d="M18 274 L40 262 L74 258" stroke="#c4c8ee" strokeWidth="1.2" fill="none" opacity=".35" />
        {rocks}
        {[[30, 270, 14], [88, 262, 12], [230, 262, 14], [270, 272, 10]].map(([x, y, rx], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry="3.4" fill={P.moss} opacity=".6" />)}
        {Array.from({ length: 22 }, (_, i) => { const x = 12 + r() * 276, y = 268 + r() * 22; return <path key={i} d={`M${x.toFixed(0)} ${y.toFixed(0)} q-1 -5 -3 -6 M${x.toFixed(0)} ${y.toFixed(0)} q1 -6 3 -7`} stroke={P.mossLit} strokeWidth="1" fill="none" opacity=".6" strokeLinecap="round" />; })}

        {/* steps cut into the rock, a rope rail and a lamp */}
        <path d="M208 298 L196 288 L212 280 L198 272 L186 266" stroke="#9a96bc" strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity=".0" />
        {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${228 - i * 8 + (i % 2) * 4} ${296 - i * 6} h18`} stroke="#a09cc4" strokeWidth="3" strokeLinecap="round" opacity=".7" />)}
        <path d="M244 292 L196 262" stroke="#b9a27a" strokeWidth="1" fill="none" opacity=".0" />
        {[[246, 292], [226, 280], [206, 268]].map(([x, y], i) => <path key={i} d={`M${x} ${y} v-14`} stroke={P.timber} strokeWidth="2" />)}
        <path d="M246 278 Q226 270 226 266 Q216 262 206 254" stroke="#b9a27a" strokeWidth="1.1" fill="none" />
        <Lantern id={id} x={246} y={268} s={1.2} />

        {/* the tower: banded stone */}
        <path d={TOWER} fill={`url(#${id}-st)`} />
        <g clipPath={`url(#${id}-tower)`}>
          {/* painted bands: pale, dark, pale, dark */}
          {[[236, 26, '#cfc9e6', 0.7], [190, 22, '#2a2a5a', 0.75], [150, 24, '#cfc9e6', 0.7], [124, 14, '#2a2a5a', 0.75]].map(([y, h, c, o], i) => <rect key={i} x="100" y={y as number} width="100" height={h as number} fill={c as string} opacity={o as number} />)}
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${108 + i * 7} ${104 + (i % 3) * 3} v140`} stroke="#14122e" strokeWidth=".4" opacity=".0" />)}
          <path d={TOWER} fill={`url(#${id}-tw)`} />
        </g>
        <path d="M112 262 L127 104" stroke="#e6e4ff" strokeWidth="1.2" opacity=".5" />
        {/* the door at the foot */}
        <g>
          <path d="M141 262 V244 A9 9 0 0 1 159 244 V262Z" fill="#2a1c26" /><path d="M143 262 V245 A7 7 0 0 1 157 245 V262Z" fill="#4a2f24" /><path d="M150 238 V262" stroke="#1a0f0a" strokeWidth=".8" /><path d="M143 250 H157 M143 257 H157" stroke={P.iron} strokeWidth="1.4" />
          <circle cx="147" cy="254" r=".9" fill={P.brassLit} />
        </g>
        {/* spiral-stair windows: six, alternating sides as the stair climbs (slots 0 to 5) */}
        {[[-9, 236], [9, 212], [-9, 188], [9, 164], [-9, 140]].map(([dx, y], i) => (
          <ArchWindow key={i} id={id} x={150 + dx * (1 - (262 - y) / 1000)} y={y} w={9} h={19} on={L(i)} stone="#b4b0d4" sill inside={<path d={`M${150 + dx - 4.5} ${y - 9} H${150 + dx + 4.5}`} stroke="#3a1a10" strokeWidth="1" opacity=".5" />} />
        ))}
        {/* ivy at the foot */}
        <Ivy seed={11} x={118} y={262} len={58} wob={4} leaf={3.2} />

        {/* the gallery: slab, brackets, railing */}
        <g>
          <path d="M114 106 H186 L190 114 H110Z" fill="#6d6a90" /><path d="M114 106 H186" stroke="#d6d8ff" strokeWidth="1" opacity=".5" />
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${118 + i * 4.4} 114 L${122 + i * 4.4} 114 L${120 + i * 4.4} 120Z`} fill="#4a4868" opacity=".0" />)}
          {[113, 123, 133, 143].map((x, i) => <path key={i} d={`M${x} 114 l3 8 l3 -8Z`} fill="#4a4868" />)}
          {[159, 169, 179].map((x, i) => <path key={i} d={`M${x} 114 l3 8 l3 -8Z`} fill="#3a3858" />)}
          <path d="M116 106 V92 M186 106 V92" stroke={P.iron} strokeWidth="2" />
          {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${118 + i * 5.2} 106 V93`} stroke={P.iron} strokeWidth=".9" />)}
          <path d="M114 93 H188" stroke={P.ironLit} strokeWidth="1.8" strokeLinecap="round" /><path d="M114 99 H188" stroke={P.iron} strokeWidth=".8" />
        </g>
        {/* the lantern room: glass in a brass cage, a Fresnel lens at its heart */}
        <g>
          <path d="M128 92 V58 H172 V92Z" fill="#14122e" />
          <rect x="130" y="60" width="40" height="30" fill={`url(#${id}-glass)`} />
          <g className={L(7) ? 'lw on' : 'lw'}>
            <rect x="130" y="60" width="40" height="30" fill={`url(#${id}-lens)`} opacity=".9" />
          </g>
          <circle cx="150" cy="75" r="13" fill="none" stroke={P.brass} strokeWidth="1.4" opacity=".9" />
          {[11, 8.4, 5.8, 3.2].map((rr, i) => <circle key={i} cx="150" cy="75" r={rr} fill="none" stroke={L(7) ? '#fff6c8' : '#6a6a9a'} strokeWidth=".9" opacity={0.85 - i * 0.1} />)}
          <circle cx="150" cy="75" r="1.8" fill={L(7) ? '#fff' : '#8a8ab0'} />
          {[138, 150, 162].map((x) => <path key={x} d={`M${x} 60 V90`} stroke={`url(#${id}-brass)`} strokeWidth="2.2" />)}
          <path d="M130 75 H170" stroke={`url(#${id}-brass)`} strokeWidth="1.6" />
          <rect x="126" y="90" width="48" height="4" rx="1" fill={`url(#${id}-brass)`} /><rect x="126" y="55" width="48" height="5" rx="1.4" fill={`url(#${id}-brass)`} />
          <path d="M126 55 Q150 22 174 55Z" fill={`url(#${id}-cu)`} /><path d="M126 55 Q150 22 174 55Z" fill={`url(#${id}-tw)`} opacity=".6" />
          {[-14, -5, 5, 14].map((dx) => <path key={dx} d={`M${150 + dx * 0.5} 30 Q${150 + dx * 1.3} 42 ${150 + dx * 1.7} 55`} stroke="#14463f" strokeWidth=".8" fill="none" opacity=".6" />)}
          <path d="M150 26 V8" stroke={P.iron} strokeWidth="1.6" /><circle cx="150" cy="24" r="2.4" fill={P.brassLit} /><path d="M150 12 l9 -3 l-9 -3Z" fill={P.brass} stroke={P.brassShade} strokeWidth=".5" />
        </g>

        {/* the keeper's cottage at the left of the tower */}
        <g>
          <ellipse cx="54" cy="270" rx="46" ry="5" fill="#05040f" opacity=".4" />
          <rect x="14" y="228" width="74" height="42" fill="#b4aec6" /><rect x="14" y="228" width="74" height="42" fill={`url(#${id}-tw)`} />
          {[14, 50, 84].map((x, i) => <rect key={i} x={x} y="228" width="4" height="42" fill="#3a2a38" />)}
          <rect x="14" y="228" width="74" height="4" fill="#3a2a38" /><rect x="14" y="258" width="74" height="3.4" fill="#3a2a38" />
          <path d="M18 258 L50 232 M84 258 L54 232" stroke="#3a2a38" strokeWidth="2.4" opacity=".9" />
          <path d="M8 232 L36 196 H66 L96 232Z" fill={`url(#${id}-sl)`} /><path d="M8 232 L36 196 H66 L96 232Z" fill={`url(#${id}-tw)`} opacity=".9" />
          <path d="M8 232 H96" stroke="#2a1c26" strokeWidth="3" /><path d="M36 196 H66" stroke="#262c4d" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="68" y="192" width="12" height="32" fill="#8a5a5a" /><rect x="66" y="188" width="16" height="5" rx="1" fill="#6a6a8a" />
          <Smoke x={74} y={184} seed={2} n={3} />
          <Casement id={id} x={32} y={258} w={18} h={20} on={L(6)} mull="cross" flowers shutters curtain="#c4605a" />
          <path d="M60 270 V252 A8 8 0 0 1 76 252 V270Z" fill="#2a1c26" /><path d="M62 270 V253 A6 6 0 0 1 74 253 V270Z" fill="#4a2f24" /><path d="M68 247 V270" stroke="#1a0f0a" strokeWidth=".8" /><circle cx="65" cy="262" r=".9" fill={P.brassLit} />
          <Lantern id={id} x={52} y={246} s={0.9} />
        </g>
        <g>
          <circle className={L(5) ? 'lh on' : 'lh'} cx="51" cy="216" r="20" fill={`url(#${id}-halo)`} />
          <circle cx="51" cy="216" r="7.4" fill="#2a2850" /><circle cx="51" cy="216" r="6.4" fill={P.brass} /><circle cx="51" cy="216" r="4.6" fill={`url(#${id}-glass)`} />
          <circle className={L(5) ? 'lw on' : 'lw'} cx="51" cy="216" r="4.6" fill={`url(#${id}-lit)`} /><path d="M46.4 216 h9.2 M51 211.4 v9.2" stroke="#6b3a14" strokeWidth=".7" opacity=".7" />
        </g>
        {/* a boat at a little jetty */}
        <g>
          <path d="M236 300 H290" stroke={P.timber} strokeWidth="3" /><path d="M244 300 V312 M262 300 V312 M280 300 V312" stroke={P.timberShade} strokeWidth="2.4" />
          <path d="M252 306 Q268 313 286 304 L282 310 Q266 316 256 311Z" fill="#3a2a38" /><path d="M252 306 Q268 313 286 304" stroke="#8a5a3c" strokeWidth="1.2" fill="none" />
        </g>
        <Pennant x={150} y={8} h={0} />
      </g>
    );
  },
};
