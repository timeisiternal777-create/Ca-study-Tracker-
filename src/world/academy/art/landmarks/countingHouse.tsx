import { ArchWindow, Ivy, Lantern, P, PlankPattern, Pennant, SlatePattern, Smoke, StonePattern, darken, lighten, rng } from '../kit';
import type { LandmarkDef } from './types';

/**
 * The Counting House: a clock tower with a spire, a long hall for the ledgers and a small stair turret. The big window of the counting room
 * glows when the paper is well explored. The weather vane is a quill.
 */
export const countingHouse: LandmarkDef = {
  id: 'counting',
  name: 'The Counting House',
  blurb: 'Where every entry is weighed twice.',
  box: { x: 0, y: -30, w: 262, h: 352 },
  slots: 8,
  door: { x: 63, y: 298 },
  flag: { x: 226, y: 80 },
  Art({ id, lit }) {
    const L = (i: number) => !!lit[i];
    const r = rng(11);
    // clock tick marks
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const big = i % 3 === 0;
      const r1 = 22.4, r2 = big ? 20 : 20.8;
      return <path key={i} d={`M${63 + Math.cos(a) * r1} ${121 + Math.sin(a) * r1} L${63 + Math.cos(a) * r2} ${121 + Math.sin(a) * r2}`} stroke={P.ink} strokeWidth={big ? 1.3 : 0.8} strokeLinecap="round" />;
    });
    // quoins along both tower edges, following the taper
    const edgeL = (y: number) => 28 - ((y - 92) * 6) / 208, edgeR = (y: number) => 98 + ((y - 92) * 6) / 208;
    const quoins = Array.from({ length: 14 }, (_, i) => {
      const y = 96 + i * 14.6, w = i % 2 ? 9 : 13;
      return <g key={i}><rect x={edgeL(y)} y={y} width={w} height="7.2" rx="1" fill={lighten(P.stoneLit, 0.12)} opacity=".5" /><rect x={edgeR(y + 7) - w} y={y + 7} width={w} height="7.2" rx="1" fill={P.stoneShade} opacity=".75" /></g>;
    });
    return (
      <g>
        <defs>
          <StonePattern id={`${id}-st`} seed={3} base={P.stone} />
          <StonePattern id={`${id}-st2`} seed={9} base={darken(P.stone, 0.12)} />
          <SlatePattern id={`${id}-sl`} seed={5} />
          <SlatePattern id={`${id}-sl2`} seed={8} base={darken(P.slate, 0.25)} />
          <PlankPattern id={`${id}-pl`} seed={4} />
          <radialGradient id={`${id}-face`} cx="42%" cy="38%" r="70%"><stop offset="0" stopColor="#fff6d6" /><stop offset=".7" stopColor={P.parchment} /><stop offset="1" stopColor={P.parchmentShade} /></radialGradient>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.brassLit} /><stop offset=".5" stopColor={P.brass} /><stop offset="1" stopColor={P.brassShade} /></linearGradient>
          <linearGradient id={`${id}-cyl`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={P.stoneShade} /><stop offset=".28" stopColor={P.stoneLit} /><stop offset=".62" stopColor={P.stone} /><stop offset="1" stopColor={P.stoneDeep} /></linearGradient>
          <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a0920" stopOpacity="0" /><stop offset="1" stopColor="#0a0920" stopOpacity=".5" /></linearGradient>
        </defs>

        {/* ground shadow and a few paving stones */}
        <ellipse cx="130" cy="304" rx="132" ry="12" fill="#05040f" opacity=".5" />
        <path d="M30 300 Q130 292 240 300 L248 316 Q130 326 18 316Z" fill={`url(#${id}-ground)`} />
        {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={46 + i * 14 + (i % 2) * 4} cy={309 + (i % 3)} rx={5 + (i % 3)} ry="2" fill={i % 2 ? '#3a4660' : '#2a3350'} opacity=".8" />)}

        {/* stair turret, behind the hall's right end */}
        <g>
          <rect x="204" y="132" width="44" height="168" fill={`url(#${id}-cyl)`} />
          <rect x="204" y="132" width="44" height="168" fill={`url(#${id}-st2)`} opacity=".3" />
          <path d="M204 132 V300" stroke="#cfd0ff" strokeWidth="1" opacity=".3" />
          {[160, 196, 232, 268].map((y, i) => <rect key={i} x="203" y={y} width="46" height="2.6" fill={P.stoneLit} opacity=".5" />)}
          <path d="M198 136 L226 76 L254 136Z" fill={`url(#${id}-sl)`} />
          <path d="M226 76 L254 136 L226 136Z" fill="#0a0920" opacity=".38" />
          <path d="M198 136 L226 76" stroke="#d9dcff" strokeWidth="1" opacity=".5" />
          <path d="M197 137 Q226 142 255 137" stroke={P.slateShade} strokeWidth="3" fill="none" />
          <circle cx="226" cy="75" r="2.6" fill={P.brassLit} />
          <ArchWindow id={id} x={226} y={186} w={9} h={24} on={L(6)} />
          <ArchWindow id={id} x={226} y={246} w={9} h={24} on={L(7)} />
        </g>

        {/* the hall */}
        <g>
          <path d="M86 204 L118 154 L198 154 L222 204Z" fill={`url(#${id}-sl)`} />
          <path d="M86 204 L118 154 L198 154 L222 204Z" fill={`url(#${id}-roofL)`} opacity=".55" />
          <path d="M150 154 L222 204 H110Z" fill="#0a0920" opacity=".0" />
          <path d="M118 154 L198 154" stroke="#e6e8ff" strokeWidth="1.6" opacity=".55" strokeLinecap="round" />
          <path d="M86 204 L118 154" stroke="#cfd0ff" strokeWidth="1" opacity=".45" />
          {[168, 182, 194].map((y, i) => <path key={i} d={`M${86 + (204 - y) * -0.0 + (194 - y) * 0.0 + (y === 168 ? 24 : y === 182 ? 14 : 8)} ${y} H${y === 168 ? 214 : y === 182 ? 218 : 220}`} stroke="#05040f" strokeWidth=".6" opacity=".35" />)}
          <path d="M82 204 H224 V212 H82Z" fill={P.slateShade} />
          <path d="M82 204 H224" stroke={P.slateLit} strokeWidth="1" opacity=".5" />
          <rect x="98" y="212" width="116" height="88" fill={`url(#${id}-st)`} />
          <rect x="98" y="212" width="116" height="88" fill={`url(#${id}-wallL)`} opacity=".55" />
          <rect x="98" y="212" width="116" height="88" fill={`url(#${id}-fade)`} />
          <path d="M98 212 V300" stroke="#cfd0ff" strokeWidth="1" opacity=".3" />
          <rect x="96" y="238" width="120" height="3" fill={P.stoneLit} opacity=".55" />
          {/* upper windows */}
          {[124, 152, 180].map((x, i) => <ArchWindow key={x} id={id} x={x} y={236} w={14} h={24} on={L(1 + i)} />)}
          {/* counting-room window with desks inside */}
          <ArchWindow id={id} x={156} y={290} w={52} h={40} on={L(4)} inside={(
            <g>
              <path d="M132 290 V276 H146 V290Z M162 290 V280 H182 V290Z" fill="#7a3f1d" opacity=".85" />
              <circle cx="139" cy="271" r="3.2" fill="#3a1d12" /><path d="M135.4 276 Q139 270 142.6 276Z" fill="#3a1d12" />
              <path d="M165 280 V275 h6 v5Z" fill="#f4e3b0" /><path d="M176 280 V273 h4 v7Z" fill="#cdbb86" />
              <path d="M152 262 l1.4 -5 1.4 5z" fill="#5a3a22" />
            </g>)} />
          {/* hall chimney */}
          <rect x="172" y="132" width="13" height="26" fill={`url(#${id}-st)`} /><rect x="170" y="128" width="17" height="5" rx="1" fill={P.stoneShade} />
          <Smoke x={178.5} y={124} seed={4} />
        </g>

        {/* the clock tower */}
        <g>
          <path d="M22 300 L28 92 H98 L104 300Z" fill={`url(#${id}-st)`} />
          <path d="M22 300 L28 92 H98 L104 300Z" fill={`url(#${id}-wallL)`} opacity=".62" />
          <path d="M22 300 L28 92 H98 L104 300Z" fill={`url(#${id}-fade)`} />
          <path d="M28 92 L22 300" stroke="#d6d8ff" strokeWidth="1.1" opacity=".42" />
          <clipPath id={`${id}-tclip`}><path d="M22 300 L28 92 H98 L104 300Z" /></clipPath>
          <g clipPath={`url(#${id}-tclip)`}>{quoins}</g>
          {[222, 152].map((y) => <g key={y}><rect x={y === 222 ? 19 : 25} y={y} width={y === 222 ? 89 : 77} height="4.4" fill={P.stoneLit} opacity=".7" /><rect x={y === 222 ? 19 : 25} y={y + 4.4} width={y === 222 ? 89 : 77} height="2.6" fill="#05040f" opacity=".35" /></g>)}

          {/* lower story: slit windows, door, lantern, sign */}
          <ArchWindow id={id} x={36} y={262} w={9} h={22} on={L(0)} />
          <ArchWindow id={id} x={90} y={262} w={9} h={22} on={L(5)} />
          <g>
            <path d="M44 300 V270 A19 19 0 0 1 82 270 V300Z" fill={darken(P.stoneLit, 0.3)} />
            <path d="M44 300 V270 A19 19 0 0 1 63 251" fill="none" stroke={P.stoneLit} strokeWidth="1.3" opacity=".8" />
            <path d="M48 300 V271 A15 15 0 0 1 78 271 V300Z" fill={`url(#${id}-pl)`} />
            <path d="M48 300 V271 A15 15 0 0 1 78 271 V300Z" fill="#05040f" opacity=".28" />
            <path d="M63 256 V300" stroke="#1a0f0a" strokeWidth="1.4" />
            {[272, 283, 293].map((y) => <path key={y} d={`M48 ${y} H78`} stroke={P.iron} strokeWidth="2.2" />)}
            {[272, 283, 293].map((y) => <g key={`b${y}`}><circle cx="52" cy={y} r=".9" fill={P.ironLit} /><circle cx="74" cy={y} r=".9" fill={P.ironLit} /></g>)}
            <circle cx="59" cy="285" r="2" fill="none" stroke={P.brassLit} strokeWidth="1" /><circle cx="67" cy="285" r="2" fill="none" stroke={P.brassLit} strokeWidth="1" />
            {[0, 1, 2].map((i) => <rect key={i} x={40 + i * 1.6} y={296 + i * 1.7} width={46 - i * 3.2} height="2.4" fill={i % 2 ? '#4a4870' : '#5d5a82'} />)}
          </g>
          <Lantern id={id} x={37} y={272} s={1.15} />
          <g>
            <path d="M92 252 H108" stroke={P.iron} strokeWidth="1.6" /><path d="M93 252 V256 M106 252 V256" stroke={P.iron} strokeWidth=".8" />
            <rect x="89" y="256" width="21" height="15" rx="1.4" fill={P.parchment} stroke={P.timberShade} strokeWidth="1" />
            <path d="M99.5 259 V268 M99.5 259 Q94 257.6 91.5 259.4 V267.4 Q94 265.8 99.5 268 M99.5 259 Q105 257.6 107.5 259.4 V267.4 Q105 265.8 99.5 268" fill="none" stroke={P.ink} strokeWidth=".8" />
          </g>

          {/* middle story windows */}
          <ArchWindow id={id} x={46} y={206} w={12} h={30} on={L(2)} shutters />
          <ArchWindow id={id} x={80} y={206} w={12} h={30} on={L(3)} shutters />

          {/* the clock */}
          <circle cx="63" cy="121" r="36" fill={`url(#${id}-halo)`} opacity=".5" />
          <circle cx="63" cy="121" r="28" fill={`url(#${id}-ring)`} />
          <circle cx="63" cy="121" r="26" fill="none" stroke={P.brassShade} strokeWidth=".8" />
          {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <circle key={i} cx={63 + Math.cos(a) * 27} cy={121 + Math.sin(a) * 27} r=".8" fill={P.brassShade} />; })}
          <circle cx="63" cy="121" r="24" fill={`url(#${id}-face)`} />
          {ticks}
          <text x="63" y="111.6" textAnchor="middle" fontSize="5.6" fontFamily="Voyage Title, serif" fill={P.ink}>XII</text>
          <text x="63" y="133.6" textAnchor="middle" fontSize="5.6" fontFamily="Voyage Title, serif" fill={P.ink}>VI</text>
          <text x="51.4" y="123" textAnchor="middle" fontSize="5.6" fontFamily="Voyage Title, serif" fill={P.ink}>IX</text>
          <text x="74.6" y="123" textAnchor="middle" fontSize="5.6" fontFamily="Voyage Title, serif" fill={P.ink}>III</text>
          <path d="M63 121 L56.6 113.8" stroke={P.ink} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M63 121 L74.6 112.2" stroke={P.ink} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="63" cy="121" r="2.2" fill={P.brass} stroke={P.ink} strokeWidth=".7" />
          <path d="M45 111 A21 21 0 0 1 63 100" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity=".5" strokeLinecap="round" />

          {/* belfry */}
          <rect x="26" y="62" width="74" height="32" fill={`url(#${id}-st)`} /><rect x="26" y="62" width="74" height="32" fill={`url(#${id}-wallL)`} opacity=".6" />
          {[40, 63, 86].map((x) => <g key={x}><path d={`M${x - 7} 92 V82 A7 7 0 0 1 ${x + 7} 82 V92Z`} fill="#0a0920" /><path d={`M${x - 7} 92 V82 A7 7 0 0 1 ${x} 75`} stroke={P.stoneLit} strokeWidth="1" fill="none" opacity=".7" /><path d={`M${x - 5} 80 H${x + 5} M${x - 5} 84 H${x + 5} M${x - 5} 88 H${x + 5}`} stroke="#1d1a40" strokeWidth=".8" /></g>)}
          <g>
            <path d="M63 77 q-5 1.6 -5.6 9 h11.2 q-0.6 -7.4 -5.6 -9Z" fill={P.brass} stroke={P.brassShade} strokeWidth=".6" /><path d="M60.6 79 q-2 2.6 -2.2 6" stroke={P.brassLit} strokeWidth=".8" fill="none" />
            <circle cx="63" cy="87.4" r="1.2" fill={P.brassShade} />
          </g>

          {/* the spire */}
          <path d="M14 64 L63 4 L112 64Z" fill={`url(#${id}-sl)`} />
          <path d="M14 64 L63 4 L112 64Z" fill={`url(#${id}-roofL)`} opacity=".45" />
          <path d="M63 4 L112 64 H63Z" fill="#0a0920" opacity=".42" />
          <path d="M14 64 L63 4" stroke="#e6e8ff" strokeWidth="1.4" opacity=".6" strokeLinecap="round" />
          <path d="M12 65 Q63 73 114 65" stroke={P.slateShade} strokeWidth="4" fill="none" />
          <path d="M44 42 L52 32 L60 42Z" fill={`url(#${id}-sl2)`} stroke={P.slateShade} strokeWidth=".6" />
          <rect x="47" y="42" width="10" height="9" fill={P.stoneShade} />
          <ArchWindow id={id} x={52} y={51} w={6} h={9} on={false} sill={false} />
          <path d="M63 4 V-18" stroke={P.iron} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="63" cy="-3" r="2.4" fill={P.brassLit} stroke={P.brassShade} strokeWidth=".6" />
          {/* quill weather vane */}
          <g transform="translate(63 -15)">
            <path d="M-2 4 C6 2 14 -3 21 -9 C17 -3 15 1 11 5 C14 4 16 3 18 2 C14 7 8 8 3 7 C6 6 7 5 8 4 C4 5 0 6 -2 4Z" fill={P.brassLit} stroke={P.brassShade} strokeWidth=".6" strokeLinejoin="round" />
            <path d="M-5 6 L19 -8" stroke={P.brassShade} strokeWidth=".9" strokeLinecap="round" />
            <path d="M-5 6 L-8 9" stroke={P.ink} strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </g>

        {/* ivy and a rook on the ridge */}
        <Ivy seed={21} x={26} y={298} len={150} dir={1} wob={4} />
        <Ivy seed={33} x={214} y={296} len={70} dir={-1} wob={3} leaf={3} />
        <g transform="translate(150 150)" fill="#0a0920"><path d="M0 0 q2 -5 6 -4 l3 -1.4 l-1 2.6 q2 1 2 4 l-2 .6 l-1 3 l-1 -2.4 l-1 2.4 l-1 -3 q-3 1 -5 -1.8Z" /></g>
        {/* barrels and a ledger crate by the hall */}
        <g>
          <ellipse cx="124" cy="299" rx="9" ry="2.6" fill="#05040f" opacity=".5" />
          <path d="M116 270 q-3 14 0 28 h16 q3 -14 0 -28Z" fill={P.timberLit} stroke={P.timberShade} strokeWidth=".8" />
          <path d="M116.4 276 H131.6 M115.8 292 H132.2" stroke={P.iron} strokeWidth="1.6" /><ellipse cx="124" cy="270" rx="8" ry="2.6" fill={P.timber} stroke={P.timberShade} strokeWidth=".8" />
          <rect x="204" y="284" width="22" height="16" rx="1" fill={P.timber} stroke={P.timberShade} strokeWidth=".8" /><path d="M204 292 H226 M215 284 V300" stroke={P.timberShade} strokeWidth=".8" />
        </g>
        <Pennant x={226} y={76} h={0} />
      </g>
    );
  },
};
