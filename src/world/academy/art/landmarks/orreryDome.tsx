import { Lantern, P, Pennant, Porthole, StonePattern, darken, rng } from '../kit';
import type { LandmarkDef } from './types';

/** The Orrery Dome: a drum observatory with a copper dome, an open slit with a brass telescope, and a great armillary sphere in the yard. */
export const orreryDome: LandmarkDef = {
  id: 'orrery',
  name: 'The Orrery Dome',
  blurb: 'Numbers keep their own orbits.',
  box: { x: 0, y: -10, w: 290, h: 330 },
  slots: 8,
  door: { x: 150, y: 298 },
  flag: { x: 150, y: 24 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const r = rng(7);
    // planet beads on the armillary
    const beads: [number, number, number, string][] = [[-26, -14, 3.4, '#9be3d2'], [30, 6, 4.4, '#ffb15a'], [-8, 30, 3, '#a07be8'], [14, -30, 2.6, '#ffe08a']];
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-st`} seed={31} base="#7d7aa0" w={46} h={30} rows={5} vary={0.12} />
          <StonePattern id={`${id}-rock`} seed={13} base="#4a4868" w={40} h={26} rows={4} vary={0.2} />
          <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.brassLit} /><stop offset=".5" stopColor={P.brass} /><stop offset="1" stopColor={P.brassShade} /></linearGradient>
          <linearGradient id={`${id}-drum`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#403e63" /><stop offset=".22" stopColor="#9a96bc" /><stop offset=".5" stopColor="#6d6a90" /><stop offset="1" stopColor="#2a2850" /></linearGradient>
          <radialGradient id={`${id}-cop`} cx="34%" cy="30%" r="85%"><stop offset="0" stopColor="#ffc58c" /><stop offset=".35" stopColor={P.copper} /><stop offset="1" stopColor="#4a2a20" /></radialGradient>
          <linearGradient id={`${id}-slit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2260" /><stop offset="1" stopColor="#0a0920" /></linearGradient>
          <linearGradient id={`${id}-tube`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.brassLit} /><stop offset=".45" stopColor={P.brass} /><stop offset="1" stopColor={P.brassShade} /></linearGradient>
        </defs>

        <ellipse cx="145" cy="306" rx="140" ry="12" fill="#05040f" opacity=".5" />
        {/* rock plinth */}
        <path d="M18 306 Q22 288 52 290 H248 Q270 288 272 306 Q150 320 18 306Z" fill={`url(#${id}-rock)`} />
        <path d="M18 306 Q22 288 52 290 H248 Q270 288 272 306 Q150 320 18 306Z" fill={`url(#${id}-base)`} />
        <path d="M52 290 H248" stroke="#cfd0ff" strokeWidth="1" opacity=".25" />

        {/* drum */}
        <path d="M72 292 V176 H224 V292Z" fill={`url(#${id}-st)`} />
        <path d="M72 292 V176 H224 V292Z" fill={`url(#${id}-drum)`} opacity=".72" />
        <path d="M72 292 V176 H224 V292Z" fill={`url(#${id}-base)`} />
        {[196, 238, 276].map((y) => <g key={y}><rect x="70" y={y} width="156" height="4" fill={P.stoneLit} opacity=".55" /><rect x="70" y={y + 4} width="156" height="2" fill="#05040f" opacity=".3" /></g>)}
        <path d="M72 176 V292" stroke="#d6d8ff" strokeWidth="1" opacity=".4" />
        <Porthole id={id} x={102} y={216} r={9.5} on={L(0)} /><Porthole id={id} x={148} y={216} r={11} on={L(1)} /><Porthole id={id} x={194} y={216} r={9.5} on={L(2)} />
        <Porthole id={id} x={106} y={258} r={8.4} on={L(3)} /><Porthole id={id} x={190} y={258} r={8.4} on={L(4)} />
        {/* door */}
        <g>
          <path d="M132 292 V268 A16 16 0 0 1 164 268 V292Z" fill={darken(P.stoneLit, 0.35)} />
          <path d="M135 292 V269 A13 13 0 0 1 161 269 V292Z" fill={P.timber} />
          <path d="M148 256 V292" stroke="#1a0f0a" strokeWidth="1.2" />
          <g transform="translate(142 274)" fill="none" stroke={P.brassLit} strokeWidth=".8"><path d="M0 -4 L1 -1.2 L4 -1 L1.6 .8 L2.4 3.8 L0 2 L-2.4 3.8 L-1.6 .8 L-4 -1 L-1 -1.2Z" fill={P.brass} /></g>
          <g transform="translate(154 274)" fill="none" stroke={P.brassLit} strokeWidth=".8"><path d="M0 -4 L1 -1.2 L4 -1 L1.6 .8 L2.4 3.8 L0 2 L-2.4 3.8 L-1.6 .8 L-4 -1 L-1 -1.2Z" fill={P.brass} /></g>
          {[0, 1].map((i) => <rect key={i} x={128 - i * 4} y={292 + i * 0} width={40 + i * 8} height="2.4" fill="#5d5a82" />)}
        </g>
        <Lantern id={id} x={122} y={266} s={1.1} />
        <g><path d="M174 258 V266" stroke={P.iron} strokeWidth="1" /><Lantern id={id} x={176} y={272} s={1.1} lit={L(7)} /></g>

        {/* dome */}
        <path d="M66 180 H230 V190 H66Z" fill={`url(#${id}-brass)`} /><path d="M66 180 H230" stroke="#fff3c4" strokeWidth="1" opacity=".6" />
        <path d="M70 180 C70 120 104 74 148 72 C192 74 226 120 226 180Z" fill={`url(#${id}-cop)`} />
        {[-60, -36, -12, 12, 36, 60].map((dx, i) => <path key={i} d={`M${148 + dx * 0.4} 74 Q${148 + dx * 1.4} 130 ${148 + dx * 1.2} 180`} stroke="#5c2c1a" strokeWidth=".9" fill="none" opacity=".55" />)}
        {Array.from({ length: 9 }, (_, i) => { const x = 86 + i * 16 + r() * 4, h = 14 + r() * 30; return <path key={i} d={`M${x} ${100 + Math.abs(x - 148) * 0.25} q2 ${h * 0.5} 0 ${h}`} stroke={P.verdigris} strokeWidth={1.6 + r() * 1.6} fill="none" opacity=".5" strokeLinecap="round" />; })}
        <path d="M82 150 C86 116 108 86 138 78" stroke="#fff0d2" strokeWidth="2" fill="none" opacity=".4" strokeLinecap="round" />
        {/* the open slit and the telescope */}
        <path d="M166 180 L160 96 Q164 88 176 90 L196 180Z" fill={`url(#${id}-slit)`} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} cx={170 + r() * 12} cy={104 + i * 11 + r() * 4} r={0.7 + r() * 0.5} fill="#ffe9b8" opacity=".85" />)}
        <path d="M160 96 Q164 88 176 90" stroke={P.brassLit} strokeWidth="1.6" fill="none" />
        <g transform="rotate(-38 176 118)">
          <rect x="150" y="114" width="78" height="10" rx="3" fill={`url(#${id}-tube)`} stroke={P.brassShade} strokeWidth=".7" />
          <rect x="220" y="111.6" width="9" height="14.8" rx="2" fill={`url(#${id}-tube)`} stroke={P.brassShade} strokeWidth=".7" />
          <ellipse cx="229.4" cy="119" rx="2.2" ry="6.6" fill="#0a0920" /><ellipse cx="229.4" cy="119" rx="1.2" ry="4.4" fill="#7fa8ff" opacity=".6" />
          {[166, 186, 206].map((x) => <rect key={x} x={x} y="113" width="3" height="12" fill={P.brassShade} opacity=".7" />)}
          <path d="M152 116 H222" stroke="#fff3c4" strokeWidth="1" opacity=".5" />
          <rect x="144" y="116" width="8" height="6" rx="1.5" fill={P.iron} />
        </g>
        <g>
          <path d="M172 126 L160 176 M180 126 L192 176 M176 126 V176" stroke={P.iron} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M164 156 H188" stroke={P.ironLit} strokeWidth="1.6" />
          <circle cx="176" cy="122" r="4.6" fill={`url(#${id}-brass)`} stroke={P.brassShade} strokeWidth=".7" />
          <circle cx="174.6" cy="120.6" r="1.4" fill="#fff3c4" opacity=".7" />
        </g>
        <g>
          <path d="M148 72 V54" stroke={P.iron} strokeWidth="1.6" />
          <path d="M148 40 l3.4 8.4 l8.6 .4 l-6.6 5.6 l2.2 8.6 l-7.6 -4.6 l-7.6 4.6 l2.2 -8.6 l-6.6 -5.6 l8.6 -.4Z" fill={P.brassLit} stroke={P.brassShade} strokeWidth=".7" strokeLinejoin="round" />
        </g>
        {/* dome hatches (lit) */}
        {[[104, 150], [128, 126]].map(([cx, cy], i) => (
          <g key={i}><circle className={L(5 + i) ? 'lh on' : 'lh'} cx={cx} cy={cy} r="16" fill={`url(#${id}-halo)`} /><circle cx={cx} cy={cy} r="6.4" fill={darken(P.copper, 0.5)} /><circle cx={cx} cy={cy} r="5" fill={`url(#${id}-glass)`} /><circle className={L(5 + i) ? 'lw on' : 'lw'} cx={cx} cy={cy} r="5" fill={`url(#${id}-lit)`} /><circle cx={cx} cy={cy} r="6.2" fill="none" stroke={P.brassLit} strokeWidth=".9" /></g>
        ))}

        {/* armillary sphere in the yard */}
        <g transform="translate(38 238)">
          <ellipse cx="0" cy="54" rx="26" ry="5" fill="#05040f" opacity=".5" />
          <path d="M-10 52 L-4 26 H4 L10 52Z" fill="#4a4868" /><path d="M-14 52 H14 V56 H-14Z" fill="#6d6a90" />
          <path d="M-18 56 L-12 44 M18 56 L12 44 M0 56 V44" stroke={P.brassShade} strokeWidth="2" strokeLinecap="round" />
          <g transform="rotate(-20)">
            <circle r="34" fill="none" stroke={P.brassShade} strokeWidth="2.6" opacity=".55" />
            <ellipse rx="34" ry="9" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="2.6" />
            <ellipse rx="34" ry="9" transform="rotate(62)" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="2.2" />
            <ellipse rx="34" ry="9" transform="rotate(-62)" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="2.2" opacity=".85" />
            <path d="M-34 0 A34 34 0 0 1 34 0" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="2.6" />
            <path d="M-34 0 A34 34 0 0 0 34 0" fill="none" stroke={P.brass} strokeWidth="2" opacity=".7" />
            <path d="M0 -38 V38" stroke={P.brassShade} strokeWidth="1.2" />
            <circle r="6" fill="#4b8fd9" /><path d="M-4 -3 q4 -3 8 -1 q-2 4 -8 4Z" fill="#7fd79a" /><circle cx="-2" cy="-2" r="2" fill="#fff" opacity=".4" />
          </g>
          {beads.map(([x, y, rr, c], i) => <circle key={i} cx={x} cy={y} r={rr} fill={c} stroke={P.brassShade} strokeWidth=".6" />)}
          <path d="M-36 -2 L-30 -8 M36 4 L30 10" stroke={P.brassLit} strokeWidth="1" opacity=".6" />
        </g>
        {/* a bench with a star atlas, and a cat on the wall */}
        <g><path d="M232 292 h26 v-12 h-26Z" fill={P.timber} stroke={P.timberShade} strokeWidth=".8" /><path d="M234 280 h22" stroke={P.timberLit} strokeWidth="1.4" /><path d="M238 280 l4 -6 h10 l2 6Z" fill={P.parchment} stroke={P.parchmentShade} strokeWidth=".6" /><path d="M244 274 V280" stroke={P.ink} strokeWidth=".5" /></g>
        <Pennant x={148} y={36} h={0} />
      </g>
    );
  },
};
