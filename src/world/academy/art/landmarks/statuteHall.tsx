import { ArchWindow, Brazier, Column, Lancet, P, Pennant, SlatePattern, StonePattern, darken, lighten } from '../kit';
import type { LandmarkDef } from './types';

const LIME = '#a29fc0';

/** The Statute Hall: a columned portico under a pediment of scales, a verdigris dome on a drum, two wings and braziers on the steps. */
export const statuteHall: LandmarkDef = {
  id: 'statute',
  name: 'The Statute Hall',
  blurb: 'Every clause stands on a column.',
  box: { x: 0, y: -34, w: 280, h: 356 },
  slots: 8,
  door: { x: 140, y: 300 },
  flag: { x: 140, y: -12 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const dentils = Array.from({ length: 22 }, (_, i) => <rect key={i} x={60 + i * 7.4} y={171} width="3.6" height="3.4" fill={darken(LIME, 0.25)} />);
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-st`} seed={21} base={LIME} w={52} h={36} rows={6} vary={0.1} />
          <StonePattern id={`${id}-wing`} seed={5} base={darken(LIME, 0.22)} w={40} h={30} rows={5} />
          <SlatePattern id={`${id}-sl`} seed={2} base="#3a4a63" />
          <linearGradient id={`${id}-dome`} x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stopColor="#9be3d2" /><stop offset=".4" stopColor={P.verdigris} /><stop offset="1" stopColor="#1f5753" /></linearGradient>
          <radialGradient id={`${id}-relief`} cx="50%" cy="40%" r="70%"><stop offset="0" stopColor="#2b2850" /><stop offset="1" stopColor="#15132f" /></radialGradient>
        </defs>

        <ellipse cx="140" cy="304" rx="140" ry="12" fill="#05040f" opacity=".5" />

        {/* wings */}
        {[0, 1].map((k) => {
          const x0 = k ? 214 : 12, dir = k ? 1 : -1;
          return (
            <g key={k}>
              <path d={`M${x0 - 6} 204 L${x0 + 10} 172 H${x0 + 44} L${x0 + 58} 204Z`} fill={`url(#${id}-sl)`} />
              <path d={`M${x0 - 6} 204 L${x0 + 10} 172 H${x0 + 44} L${x0 + 58} 204Z`} fill={`url(#${id}-roofL)`} opacity={k ? 0.2 : 0.5} />
              <path d={`M${x0 + 10} 172 H${x0 + 44}`} stroke="#e6e8ff" strokeWidth="1.2" opacity=".5" />
              <rect x={x0} y="204" width="52" height="86" fill={`url(#${id}-wing)`} />
              <rect x={x0} y="204" width="52" height="86" fill={`url(#${id}-wallL)`} opacity={k ? 0.75 : 0.5} />
              <rect x={x0 - 2} y="203" width="56" height="4" fill={LIME} opacity=".6" />
              {[0, 1].map((j) => <Lancet key={j} id={id} x={x0 + 15 + j * 22} y={260} w={11} h={42} on={L(2 + k * 2 + j)} tints={['#6fd6c8', '#a07be8', '#ffb15a']} />)}
            </g>
          );
        })}

        {/* roof plane behind the pediment, drum and dome */}
        <path d="M44 164 L140 100 L236 164Z" fill={`url(#${id}-sl)`} />
        <path d="M140 100 L236 164 H140Z" fill="#0a0920" opacity=".4" />
        <path d="M44 164 L140 100" stroke="#e6e8ff" strokeWidth="1.2" opacity=".45" />
        <rect x="108" y="70" width="64" height="50" fill={`url(#${id}-st)`} />
        <rect x="108" y="70" width="64" height="50" fill={`url(#${id}-wallL)`} opacity=".6" />
        {[0, 1, 2, 3].map((i) => <ArchWindow key={i} id={id} x={118 + i * 14.6} y={112} w={7} h={26} on={L(6 + (i % 2))} sill={false} stone={LIME} />)}
        <rect x="104" y="66" width="72" height="6" rx="1.6" fill={LIME} /><rect x="104" y="66" width="72" height="2" fill="#fff" opacity=".25" />
        <path d="M104 68 C104 40 120 24 140 22 C160 24 176 40 176 68Z" fill={`url(#${id}-dome)`} />
        {[-26, -14, 0, 14, 26].map((dx, i) => <path key={i} d={`M${140 + dx * 0.34} 24 Q${140 + dx * 1.2} 44 ${140 + dx * 1.34} 68`} stroke={P.verdigrisDeep} strokeWidth=".9" fill="none" opacity=".7" />)}
        <path d="M108 60 C110 42 122 30 138 26" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".4" strokeLinecap="round" />
        <rect x="134" y="10" width="12" height="16" fill={LIME} /><path d="M131 12 L140 2 L149 12Z" fill={`url(#${id}-dome)`} />
        <path d="M140 2 V-4" stroke={P.iron} strokeWidth="1.4" /><circle cx="140" cy="-4" r="2" fill={P.brassLit} />
        {/* scales above the dome */}
        <g transform="translate(140 -10)" stroke={P.brassLit} strokeWidth="1" fill="none" strokeLinecap="round"><path d="M-12 -2 H12 M0 -2 V6" /><path d="M-12 -2 l-4 8 h8Z M12 -2 l-4 8 h8Z" fill={P.brass} stroke={P.brassShade} strokeWidth=".6" /></g>

        {/* facade and pediment */}
        <rect x="56" y="172" width="168" height="112" fill={`url(#${id}-st)`} />
        <rect x="56" y="172" width="168" height="112" fill={`url(#${id}-wallL)`} opacity=".5" />
        <rect x="56" y="156" width="168" height="16" fill={darken(LIME, 0.12)} />
        <rect x="56" y="154" width="168" height="4" fill={LIME} /><rect x="56" y="154" width="168" height="1.4" fill="#fff" opacity=".3" />
        {dentils}
        <path d="M52 156 L140 110 L228 156Z" fill={LIME} /><path d="M52 156 L140 110 L228 156Z" fill={`url(#${id}-roofL)`} opacity=".14" />
        <path d="M52 156 L140 110 L228 156" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".45" strokeLinejoin="round" />
        <path d="M68 152 L140 119 L212 152Z" fill={`url(#${id}-relief)`} />
        <path d="M68 152 L140 119 L212 152Z" fill="none" stroke={darken(LIME, 0.3)} strokeWidth="1.2" />
        {/* relief: the scales of the law, balanced, with a book and a sprig either side */}
        <g transform="translate(140 138)" stroke={P.parchment} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 -14 V10 M-4 10 H4" /><path d="M-18 -9 H18" /><circle cx="0" cy="-15" r="1.8" fill={P.parchment} />
          <path d="M-18 -9 l-6 10 h12Z M18 -9 l-6 10 h12Z" fill="rgb(239 224 184 / .18)" />
          <path d="M-22 4 q6 3 12 0" stroke={P.brassLit} /><path d="M10 4 q6 3 12 0" stroke={P.brassLit} />
          <path d="M-40 8 q8 -10 16 -2 M40 8 q-8 -10 -16 -2" stroke={P.mossLit} strokeWidth="1" />
        </g>

        {/* behind the colonnade: recess, door, lancets */}
        <rect x="76" y="176" width="128" height="108" fill="#171534" />
        <rect x="76" y="176" width="128" height="108" fill={`url(#${id}-wallD)`} opacity=".5" />
        <Lancet id={id} x={104} y={274} w={16} h={72} on={L(0)} />
        <Lancet id={id} x={176} y={274} w={16} h={72} on={L(1)} />
        <g>
          <path d="M128 284 V254 A12 12 0 0 1 152 254 V284Z" fill={darken(LIME, 0.35)} />
          <path d="M130.6 284 V255 A9.4 9.4 0 0 1 149.4 255 V284Z" fill={P.timber} />
          <path d="M140 245 V284" stroke="#1a0f0a" strokeWidth="1.2" />
          {[259, 268, 277].map((y) => <path key={y} d={`M130.6 ${y} H149.4`} stroke={P.iron} strokeWidth="1.8" />)}
          <circle cx="136.4" cy="267" r="1.7" fill="none" stroke={P.brassLit} strokeWidth=".9" /><circle cx="143.6" cy="267" r="1.7" fill="none" stroke={P.brassLit} strokeWidth=".9" />
        </g>
        {/* columns */}
        {[88, 120, 160, 192].map((x) => <Column key={x} id={id} x={x} y={284} h={102} w={13} base={LIME} />)}
        {[64, 216].map((x) => <rect key={x} x={x - 6} y="172" width="12" height="112" fill={`url(#${id}-col)`} />)}

        {/* steps */}
        {[0, 1, 2, 3].map((i) => <g key={i}><rect x={44 - i * 8} y={284 + i * 5.6} width={192 + i * 16} height="5.6" fill={i % 2 ? '#6f6c92' : '#7c789e'} /><rect x={44 - i * 8} y={284 + i * 5.6} width={192 + i * 16} height="1.2" fill="#fff" opacity=".22" /></g>)}
        <Brazier x={40} y={292} s={1} /><Brazier x={240} y={292} s={1} />
        <Pennant x={140} y={-14} h={0} />
      </g>
    );
  },
};
