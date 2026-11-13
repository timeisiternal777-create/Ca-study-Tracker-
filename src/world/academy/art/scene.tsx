import type { ReactNode } from 'react';
import './scene.css';
import { P, SlatePattern, StonePattern, darken, lighten, mix, rng } from './kit';

/**
 * The school at night, drawn as separate layers so each one can sit still on the GPU while only the mist, the flags and the fireflies move:
 * sky (stars, the moon), far mountains, the castle on its crag with a lamp-lit stair, the lake with its reflections, and the mist.
 * Every layer is a plain full-width SVG on the same 1600 x 900 stage, so they stack exactly. One moon, high on the upper left: it lights the
 * left faces of everything and the right faces fall into blue-violet shade. Windows throw warm light back.
 */
export const SCENE = { w: 1600, h: 900 };
const VB = `0 0 ${SCENE.w} ${SCENE.h}`;
const FLOOR = 546;      // where the castle stands on the crag
const SHORE = 700;      // the waterline
const f1 = (n: number) => Math.round(n * 10) / 10;

function Stage({ children, className, slice = true }: { children: ReactNode; className?: string; slice?: boolean }) {
  return <svg className={className} viewBox={VB} preserveAspectRatio={slice ? 'xMidYMax slice' : 'xMidYMid meet'} aria-hidden focusable="false">{children}</svg>;
}

// ───────────────────────────── sky ─────────────────────────────
export function SceneSky({ id, className }: { id: string; className?: string }) {
  const r = rng(77);
  const stars = Array.from({ length: 190 }, () => ({ x: r() * SCENE.w, y: Math.pow(r(), 1.8) * 640, s: 0.5 + r() * 1.3, o: 0.3 + r() * 0.7, sp: r() > 0.94 }));
  return (
    <Stage className={className}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#060516" /><stop offset=".38" stopColor="#13103a" /><stop offset=".7" stopColor="#38296a" /><stop offset="1" stopColor="#7d5192" /></linearGradient>
        <radialGradient id={`${id}-halo`}><stop offset="0" stopColor="#fff2c8" stopOpacity=".5" /><stop offset=".25" stopColor="#d9d2ff" stopOpacity=".2" /><stop offset="1" stopColor="#8a7be0" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-moon`} cx=".36" cy=".32" r=".8"><stop offset="0" stopColor="#fffdf0" /><stop offset=".65" stopColor="#f4ecc8" /><stop offset="1" stopColor="#d6c993" /></radialGradient>
        <radialGradient id={`${id}-glow`} cx=".5" cy="1" r=".7"><stop offset="0" stopColor="#c27ab0" stopOpacity=".45" /><stop offset="1" stopColor="#c27ab0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={SCENE.w} height={SCENE.h} fill={`url(#${id}-sky)`} />
      <rect y="380" width={SCENE.w} height="340" fill={`url(#${id}-glow)`} />
      <g fill="#fff">{stars.map((s, i) => <circle key={i} cx={f1(s.x)} cy={f1(s.y)} r={f1(s.s)} opacity={f1(s.o)} />)}</g>
      <g stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".7">{stars.filter((s) => s.sp).map((s, i) => <path key={i} d={`M${f1(s.x - 5)},${f1(s.y)} H${f1(s.x + 5)} M${f1(s.x)},${f1(s.y - 5)} V${f1(s.y + 5)}`} />)}</g>
      <circle cx="300" cy="190" r="320" fill={`url(#${id}-halo)`} />
      <circle cx="300" cy="190" r="62" fill={`url(#${id}-moon)`} />
      <g fill="#bfb27c" opacity=".38"><ellipse cx="282" cy="172" rx="13" ry="10" /><ellipse cx="322" cy="206" rx="17" ry="12" /><ellipse cx="296" cy="214" rx="7" ry="5" /><ellipse cx="327" cy="164" rx="6" ry="5" /><ellipse cx="270" cy="198" rx="5" ry="4" /></g>
      <path d="M338,150 A62,62 0 0 1 338,232 A74,74 0 0 0 338,150Z" fill="#8a7a5a" opacity=".12" />
      <g fill="#1a1546" opacity=".5"><ellipse cx="360" cy="196" rx="120" ry="7" transform="rotate(-6 360 196)" /><ellipse cx="200" cy="230" rx="150" ry="6" transform="rotate(4 200 230)" /><ellipse cx="1180" cy="150" rx="190" ry="8" transform="rotate(-3 1180 150)" /><ellipse cx="900" cy="300" rx="220" ry="7" transform="rotate(3 900 300)" /></g>
    </Stage>
  );
}

// ───────────────────────────── far mountains ─────────────────────────────
/** A ridge line made by midpoint displacement, so every range is its own. */
function ridgeline(seed: number, top: number, base: number, rough: number) {
  const r = rng(seed);
  let pts: [number, number][] = [[-20, base - (base - top) * (0.3 + 0.4 * r())], [SCENE.w + 20, base - (base - top) * (0.3 + 0.4 * r())]];
  let disp = (base - top) * 0.55;
  for (let it = 0; it < 5; it++) {
    const next: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1]; next.push(pts[i], [(x0 + x1) / 2, (y0 + y1) / 2 + (r() - 0.5) * 2 * disp]); }
    next.push(pts[pts.length - 1]); pts = next; disp *= rough;
  }
  return pts.map(([x, y]) => [x, Math.max(top, Math.min(base - 8, y))] as [number, number]);
}
export function Ridge({ id, seed, base, top, color, lit, rough = 0.56 }: { id: string; seed: number; base: number; top: number; color: string; lit: string; rough?: number }) {
  const pts = ridgeline(seed, top, base, rough);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)},${f1(y)}`).join(' ');
  const rising: string[] = []; const falling: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1];
    // the facets lean (they are flanks, not pillars), so no vertical seams show
    if (y1 < y0 - 1.5) rising.push(`M${f1(x0)},${f1(y0)} L${f1(x1)},${f1(y1)} L${f1(x1 - 70)},${base} L${f1(x0 - 70)},${base}Z`);
    else if (y1 > y0 + 1.5) falling.push(`M${f1(x0)},${f1(y0)} L${f1(x1)},${f1(y1)} L${f1(x1 + 70)},${base} L${f1(x0 + 70)},${base}Z`);
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-lit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={lit} stopOpacity=".42" /><stop offset=".55" stopColor={lit} stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}-dk`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#03021a" stopOpacity=".4" /><stop offset=".55" stopColor="#03021a" stopOpacity="0" /></linearGradient>
      </defs>
      <path d={`${line} L${SCENE.w + 20},${base} L-20,${base}Z`} fill={color} />
      <path d={rising.join(' ')} fill={`url(#${id}-lit)`} />
      <path d={falling.join(' ')} fill={`url(#${id}-dk)`} />
      <path d={line} stroke={lit} strokeWidth="1.4" fill="none" opacity=".35" strokeLinejoin="round" />
    </g>
  );
}
export function SceneFar({ id, className }: { id: string; className?: string }) {
  return (
    <Stage className={className}>
      <defs><linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d5192" stopOpacity="0" /><stop offset="1" stopColor="#7d5192" stopOpacity=".55" /></linearGradient></defs>
      <Ridge id={`${id}a`} seed={21} base={700} top={400} color="#2b2262" lit="#7a6ed0" rough={0.58} />
      <rect y="500" width={SCENE.w} height="200" fill={`url(#${id}-haze)`} />
      <Ridge id={`${id}b`} seed={33} base={710} top={520} color="#1b1648" lit="#5a50b0" rough={0.6} />
    </Stage>
  );
}

// ───────────────────────────── the castle ─────────────────────────────
function Win({ x, y, w = 8, h = 16, on = true, round = false, hid }: { x: number; y: number; w?: number; h?: number; on?: boolean; round?: boolean; hid: string }) {
  const d = round ? `M${x - w / 2},${y + h} V${y + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${y + w / 2} V${y + h}Z` : `M${x - w / 2},${y + h} V${y + w * 0.7} L${x},${y} L${x + w / 2},${y + w * 0.7} V${y + h}Z`;
  return on ? <g><circle cx={x} cy={y + h / 2} r={Math.max(w, h) * 1.7} fill={`url(#${hid})`} /><path d={d} fill="#ffd98a" /><path d={`M${x},${y + 3} V${y + h}`} stroke="#c9792f" strokeWidth=".8" opacity=".8" /></g> : <path d={d} fill="#14123a" />;
}

function Merlons({ x0, x1, y, w = 11, h = 9, gap = 9, fill }: { x0: number; x1: number; y: number; w?: number; h?: number; gap?: number; fill: string }) {
  const out: ReactNode[] = []; for (let x = x0; x + w <= x1; x += w + gap) out.push(<rect key={x} x={x} y={y - h} width={w} height={h} fill={fill} />);
  return <>{out}</>;
}

export function Pines({ seed, x0, x1, base, n, hMin, hMax, color = '#0e0d2b', rim = '#232052' }: { seed: number; x0: number; x1: number; base: number; n: number; hMin: number; hMax: number; color?: string; rim?: string }) {
  const r = rng(seed);
  const items = Array.from({ length: n }, () => ({ x: x0 + r() * (x1 - x0), h: hMin + r() * (hMax - hMin), dy: (r() - 0.5) * 22 })).sort((a, b) => a.dy - b.dy);
  return (
    <g>{items.map((p, i) => {
      const w = p.h * 0.42; const y = base + p.dy;
      const tier = (k: number) => { const ty = y - p.h * (0.18 + 0.27 * k); const tw = w * (1 - k * 0.27); return `M${f1(p.x - tw)},${f1(ty + p.h * 0.3)} L${f1(p.x)},${f1(ty - p.h * 0.12)} L${f1(p.x + tw)},${f1(ty + p.h * 0.3)}Z`; };
      return (
        <g key={i}>
          <path d={`M${f1(p.x - 1.6)},${f1(y)} V${f1(y - p.h * 0.2)} H${f1(p.x + 1.6)} V${f1(y)}Z`} fill={color} />
          {[0, 1, 2].map((k) => <path key={k} d={tier(k)} fill={color} />)}
          <path d={`M${f1(p.x)},${f1(y - p.h)} L${f1(p.x - w * 0.55)},${f1(y - p.h * 0.34)} L${f1(p.x - w * 0.2)},${f1(y - p.h * 0.34)}Z`} fill={rim} opacity=".6" />
        </g>
      );
    })}</g>
  );
}

const CRAG: [number, number][] = [[620, 730], [690, 704], [742, 666], [772, 624], [810, 592], [832, 556], [880, 546], [940, 552], [1010, 542], [1090, 550], [1170, 540], [1250, 552], [1306, 590], [1340, 632], [1372, 672], [1424, 704], [1490, 730]];
const edgeX = (chain: [number, number][], y: number) => {
  for (let i = 0; i < chain.length - 1; i++) { const [x0, y0] = chain[i]; const [x1, y1] = chain[i + 1]; if ((y >= y0 && y <= y1) || (y <= y0 && y >= y1)) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1); }
  return chain[chain.length - 1][0];
};
function Rock({ id }: { id: string }) {
  const r = rng(29);
  const left = [[832, 556], [810, 592], [772, 624], [742, 666], [690, 704], [620, 730]] as [number, number][];
  const right = [[1250, 552], [1306, 590], [1340, 632], [1372, 672], [1424, 704], [1490, 730]] as [number, number][];
  const rows = [546, 566, 592, 622, 656, 692, 730];
  const cells: { d: string; fill: string; op: number }[] = [];
  for (let k = 0; k < rows.length - 1; k++) {
    const y0 = rows[k]; const y1 = rows[k + 1];
    const xl0 = edgeX(left, Math.max(y0, 556)) - 6; const xr0 = edgeX(right, Math.max(y0, 552)) + 6;
    const xl1 = edgeX(left, y1) - 6; const xr1 = edgeX(right, y1) + 6;
    let t = 0;
    while (t < 1) {
      const dt = 0.1 + r() * 0.12; const t2 = Math.min(1, t + dt);
      const a0 = xl0 + (xr0 - xl0) * t; const a1 = xl1 + (xr1 - xl1) * t; const b0 = xl0 + (xr0 - xl0) * t2; const b1 = xl1 + (xr1 - xl1) * t2;
      const j = () => (r() - 0.5) * 12;
      const mid = (t + t2) / 2;
      const shade = mix('#5b589c', '#171540', Math.min(1, Math.max(0, mid * 1.05 + (r() - 0.5) * 0.3 + (k / rows.length) * 0.18)));
      cells.push({ d: `M${f1(a0)},${f1(y0 + j())} L${f1(b0)},${f1(y0 + j())} L${f1(b1)},${f1(y1 + j())} L${f1(a1)},${f1(y1 + j())}Z`, fill: shade, op: 0.9 });
      t = t2;
    }
  }
  const outline = CRAG.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ') + 'Z';
  return (
    <g>
      <defs><clipPath id={`${id}-cragclip`}><path d={outline} /></clipPath></defs>
      <path d={outline} fill="#1a1743" />
      <g clipPath={`url(#${id}-cragclip)`}>
        {cells.map((c, i) => <path key={i} d={c.d} fill={c.fill} opacity={c.op} stroke="#0d0b2c" strokeWidth="1" strokeLinejoin="round" />)}
        <rect x="600" y="540" width="920" height="200" fill={`url(#${id}-cragG)`} />
        <g stroke="#0b0a26" strokeWidth="1.6" fill="none" opacity=".55" strokeLinecap="round"><path d="M790,610 L830,640 L822,676" /><path d="M900,566 L930,600 L916,640 L940,676" /><path d="M1060,560 L1090,602 L1074,648" /><path d="M1200,556 L1230,600 L1252,650 L1240,690" /><path d="M1330,620 L1356,660" /></g>
        <path d="M600,700 H1520 V740 H600Z" fill="#05041a" opacity=".35" />
      </g>
    </g>
  );
}

export function CastleArt({ id }: { id: string }) {
  const stone = `${id}-st`; const slate = `${id}-sl`;
  const W = (p: { x: number; y: number; w?: number; h?: number; on?: boolean; round?: boolean }) => <Win {...p} hid={`${id}-hal`} />;
  const wallL = `url(#${id}-wl)`; const wallR = `url(#${id}-wr)`;
  return (
    <>
      <defs>
        <StonePattern id={stone} seed={5} base="#4a4880" w={22} h={13} rows={4} line="#262448" vary={0.14} />
        <SlatePattern id={slate} seed={9} base="#3a3a74" w={14} h={9} />
        <radialGradient id={`${id}-hal`}><stop offset="0" stopColor="#ffcf78" stopOpacity=".34" /><stop offset=".45" stopColor="#ffb85a" stopOpacity=".12" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-wl`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6a68a4" /><stop offset=".45" stopColor="#47457f" /><stop offset="1" stopColor="#262450" /></linearGradient>
        <linearGradient id={`${id}-wr`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4e4c88" /><stop offset="1" stopColor="#1f1d46" /></linearGradient>
        <linearGradient id={`${id}-roof`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7c7ac0" stopOpacity=".5" /><stop offset=".5" stopColor="#7c7ac0" stopOpacity="0" /><stop offset="1" stopColor="#0c0a2a" stopOpacity=".55" /></linearGradient>
        <linearGradient id={`${id}-cragG`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6f6cae" stopOpacity=".5" /><stop offset=".4" stopColor="#6f6cae" stopOpacity="0" /><stop offset="1" stopColor="#0b0a26" stopOpacity=".6" /></linearGradient>
      </defs>

      {/* the crag: broken rock, cut into facets that catch the moon on the left and fall into shade on the right */}
      <Rock id={id} />

      {/* the curtain wall and its battlements */}
      <g>
        <rect x="846" y="486" width="452" height={FLOOR - 486 + 4} fill={wallL} />
        <rect x="846" y="486" width="452" height={FLOOR - 486 + 4} fill={`url(#${stone})`} opacity=".5" />
        <rect x="846" y="486" width="452" height="6" fill="#8a88c8" opacity=".28" />
        <Merlons x0={846} x1={1298} y={486} fill="#46447c" />
        <g fill="#05041a" opacity=".3">{Array.from({ length: 21 }, (_, i) => <rect key={i} x={856 + i * 21} y="478" width="3" height="8" />)}</g>
      </g>

      {/* the great hall: tall lancets between buttresses, a rose window in the gable, a steep slate roof with two dormers */}
      <g>
        <rect x="930" y="448" width="204" height="98" fill={wallL} />
        <rect x="930" y="448" width="204" height="98" fill={`url(#${stone})`} opacity=".55" />
        {[934, 970, 1010, 1050, 1090, 1126].map((x) => <rect key={x} x={x - 3} y="452" width="7" height="94" fill="#2a2858" opacity=".7" />)}
        {[952, 990, 1030, 1070, 1110].map((x, i) => <W key={x} x={x} y={476} w={13} h={36} on={i !== 3} />)}
        <path d="M918,452 L1034,346 L1146,452Z" fill="#2c2a62" />
        <path d="M918,452 L1034,346 L1146,452Z" fill={`url(#${slate})`} />
        <path d="M918,452 L1034,346 L1146,452Z" fill={`url(#${id}-roof)`} />
        <path d="M918,452 L1034,346 L1146,452" stroke="#9a98d6" strokeWidth="2" fill="none" opacity=".5" strokeLinejoin="round" />
        <g fill="#2f2d66" stroke="#1a1840" strokeWidth="1"><rect x="1062" y="378" width="12" height="30" /><rect x="994" y="384" width="11" height="26" /><rect x="1059" y="374" width="18" height="5" /><rect x="991" y="380" width="17" height="5" /></g>
        <path d="M1068,372 C1060,360 1076,352 1068,338 C1062,330 1070,322 1076,318" stroke="#b4aee8" strokeWidth="3" fill="none" opacity=".16" strokeLinecap="round" />
        <path d="M928,452 L933,430 L938,452Z M1126,452 L1131,430 L1136,452Z" fill="#3a3870" />
        <path d="M1034,346 V330" stroke="#2a2858" strokeWidth="3" /><path d="M1034,330 L1046,336 L1034,342Z" fill="#c9792f" />
        <circle cx="1034" cy="408" r="17" fill="#2a2858" /><circle cx="1034" cy="408" r="13" fill="#ffd98a" /><circle cx="1034" cy="408" r="26" fill="#ffcf78" opacity=".12" />
        <g stroke="#7a3f1c" strokeWidth="1.3" opacity=".85"><path d="M1034,395 V421 M1021,408 H1047 M1025,399 L1043,417 M1043,399 L1025,417" /><circle cx="1034" cy="408" r="4.4" fill="none" /></g>
        {[[974, 424], [1096, 424]].map(([x, y]) => (
          <g key={x}><rect x={x - 11} y={y} width="22" height="26" fill="#3a3870" /><path d={`M${x - 15},${y + 2} L${x},${y - 18} L${x + 15},${y + 2}Z`} fill="#2c2a62" /><path d={`M${x - 15},${y + 2} L${x},${y - 18} L${x + 15},${y + 2}Z`} fill={`url(#${slate})`} /><W x={x} y={y + 7} w={7} h={14} /></g>
        ))}
      </g>

      {/* the High Keep: a clock, three tall windows, a ring of machicolations and a slate spire */}
      <g>
        <rect x="846" y="306" width="82" height={FLOOR - 306} fill={wallL} />
        <rect x="846" y="306" width="82" height={FLOOR - 306} fill={`url(#${stone})`} opacity=".55" />
        <rect x="922" y="306" width="8" height={FLOOR - 306} fill="#1e1c46" opacity=".55" />
        <rect x="838" y="292" width="98" height="16" fill="#3a3870" /><rect x="838" y="292" width="98" height="3" fill="#9a98d6" opacity=".4" />
        <g fill="#1a1840">{Array.from({ length: 9 }, (_, i) => <rect key={i} x={843 + i * 11} y="302" width="4" height="6" />)}</g>
        <Merlons x0={838} x1={936} y={292} w={9} h={8} gap={7} fill="#3a3870" />
        <path d="M832,284 L888,176 L944,284Z" fill="#2c2a62" /><path d="M832,284 L888,176 L944,284Z" fill={`url(#${slate})`} /><path d="M832,284 L888,176 L944,284Z" fill={`url(#${id}-roof)`} />
        <path d="M832,284 L888,176 L944,284" stroke="#9a98d6" strokeWidth="2" fill="none" opacity=".45" strokeLinejoin="round" />
        <path d="M888,176 V150" stroke="#2a2858" strokeWidth="3" /><circle cx="888" cy="148" r="3.4" fill="#e6b24a" />
        <g className="sc-flag"><path d="M888,154 C902,150 912,158 926,154 L918,164 L926,174 C912,178 902,170 888,174Z" fill="#c9792f" /><path d="M888,154 C902,150 912,158 926,154" stroke="#ffcf78" strokeWidth="1" fill="none" opacity=".6" /></g>
        <circle cx="887" cy="352" r="22" fill="#1a1840" /><circle cx="887" cy="352" r="18" fill="#e9dfbe" /><circle cx="887" cy="352" r="18" fill="none" stroke="#b08a3a" strokeWidth="2" />
        <g stroke="#3a2a14" strokeWidth="1.4" strokeLinecap="round">{Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return <path key={i} d={`M${f1(887 + Math.sin(a) * 14.6)},${f1(352 - Math.cos(a) * 14.6)} L${f1(887 + Math.sin(a) * 17)},${f1(352 - Math.cos(a) * 17)}`} />; })}<path d="M887,352 L887,340 M887,352 L896,356" strokeWidth="2" /></g>
        {[[887, 394], [887, 438], [887, 482]].map(([x, y], i) => <W key={y} x={x} y={y} w={11} h={30} on={i !== 1} />)}
        <rect x="846" y="312" width="82" height="3" fill="#9a98d6" opacity=".25" />
      </g>

      {/* low houses built against the wall, with their own roofs and one lit window each */}
      <g>
        {[[1204, 508, 30], [1100, 512, 34]].map(([x, y, w], i) => (
          <g key={i}><rect x={x} y={y} width={w} height={FLOOR - y + 2} fill={wallL} /><rect x={x} y={y} width={w} height={FLOOR - y + 2} fill={`url(#${stone})`} opacity=".5" />
            <path d={`M${x - 5},${y + 2} L${x + w / 2},${y - 20} L${x + w + 5},${y + 2}Z`} fill="#2c2a62" /><path d={`M${x - 5},${y + 2} L${x + w / 2},${y - 20} L${x + w + 5},${y + 2}Z`} fill={`url(#${slate})`} /><path d={`M${x - 5},${y + 2} L${x + w / 2},${y - 20} L${x + w + 5},${y + 2}Z`} fill={`url(#${id}-roof)`} />
            <W x={x + w / 2} y={y + 8} w={7} h={13} on={i === 0} round /></g>
        ))}
      </g>

      {/* a round turret with a cone roof, and a slim bell tower beyond it */}
      <g>
        <path d="M1144,546 V396 H1196 V546Z" fill={wallL} /><path d="M1144,546 V396 H1196 V546Z" fill={`url(#${stone})`} opacity=".55" /><rect x="1190" y="396" width="6" height="150" fill="#1e1c46" opacity=".5" />
        <rect x="1140" y="392" width="60" height="9" fill="#3a3870" />
        <path d="M1136,394 L1170,300 L1204,394Z" fill="#2c2a62" /><path d="M1136,394 L1170,300 L1204,394Z" fill={`url(#${slate})`} /><path d="M1136,394 L1170,300 L1204,394Z" fill={`url(#${id}-roof)`} />
        <path d="M1170,300 V278" stroke="#2a2858" strokeWidth="2.6" /><path d="M1170,282 L1184,287 L1170,292Z" fill="#7ad6c8" />
        <W x={1170} y={424} w={9} h={22} /><W x={1170} y={470} w={9} h={22} on={false} />
        <path d="M1240,546 V376 H1274 V546Z" fill={wallL} /><path d="M1240,546 V376 H1274 V546Z" fill={`url(#${stone})`} opacity=".5" /><rect x="1269" y="376" width="5" height="170" fill="#1e1c46" opacity=".55" />
        <rect x="1236" y="372" width="42" height="8" fill="#3a3870" />
        <path d="M1236,374 L1257,286 L1278,374Z" fill="#2c2a62" /><path d="M1236,374 L1257,286 L1278,374Z" fill={`url(#${slate})`} /><path d="M1236,374 L1257,286 L1278,374Z" fill={`url(#${id}-roof)`} />
        <g><W x={1247} y={392} w={7} h={14} round /><W x={1257} y={392} w={7} h={14} round /><W x={1267} y={392} w={7} h={14} round /></g>
        <W x={1257} y={440} w={8} h={20} /><circle cx="1257" cy="284" r="3" fill="#e6b24a" />
      </g>

      {/* the gatehouse, and the lamp-lit stair that comes down the crag to the water */}
      <g>
        <rect x="796" y="494" width="54" height="56" fill={wallL} /><rect x="796" y="494" width="54" height="56" fill={`url(#${stone})`} opacity=".55" />
        <Merlons x0={796} x1={850} y={494} w={9} h={8} gap={5} fill="#46447c" />
        <path d="M786,496 L823,452 L860,496Z" fill="#2c2a62" /><path d="M786,496 L823,452 L860,496Z" fill={`url(#${slate})`} /><path d="M786,496 L823,452 L860,496Z" fill={`url(#${id}-roof)`} />
        <path d="M814,546 V524 A9,9 0 0 1 832,524 V546Z" fill="#ffc46a" /><path d="M814,546 V524 A9,9 0 0 1 832,524 V546Z" fill="#7a3f1c" opacity=".25" />
        <g stroke="#5a2f12" strokeWidth="1.2" opacity=".9"><path d="M818,515 V546 M823,513 V546 M828,515 V546 M813,526 H833 M813,534 H833 M813,542 H833" /></g>
        <circle cx="823" cy="530" r="26" fill="#ffcf78" opacity=".14" />
        <path d="M824,552 L792,576 L814,598 L772,626 L796,650 L744,674 L722,704" stroke="#1a1840" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M824,552 L792,576 L814,598 L772,626 L796,650 L744,674 L722,704" stroke="#6b69a8" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
        {[[808, 562], [802, 590], [786, 612], [784, 640], [770, 662], [736, 688]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y - 7} r="11" fill="#ffcf78" opacity=".16" /><path d={`M${x},${y} V${y - 8}`} stroke="#1a1840" strokeWidth="1.6" /><circle cx={x} cy={y - 9} r="2.2" fill="#ffd98a" /></g>)}
      </g>

      {/* the pines on the crag's shoulders and on both shores */}
      <Pines seed={3} x0={560} x1={760} base={712} n={30} hMin={34} hMax={78} />
      <Pines seed={8} x0={1330} x1={1520} base={716} n={26} hMin={32} hMax={72} />
      <Pines seed={13} x0={1480} x1={1620} base={730} n={14} hMin={40} hMax={90} />
    </>
  );
}

export function SceneCastle({ id, className }: { id: string; className?: string }) {
  return <Stage className={className}><CastleArt id={id} /></Stage>;
}

// ───────────────────────────── the lake ─────────────────────────────
export function SceneLake({ id, className }: { id: string; className?: string }) {
  const r = rng(404);
  const moon = Array.from({ length: 22 }, (_, i) => ({ y: SHORE + 14 + i * 8.4, w: 56 - i * 1.7 + r() * 20, x: 300 + (r() - 0.5) * 18 }));
  const ripples = Array.from({ length: 52 }, () => ({ x: r() * SCENE.w, y: SHORE + 8 + r() * 180, w: 24 + r() * 90 }));
  return (
    <Stage className={className}>
      <defs>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a2e72" /><stop offset=".25" stopColor="#1f2060" /><stop offset="1" stopColor="#090a26" /></linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".6" stopColor="#fff" stopOpacity=".25" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <mask id={`${id}-m`}><rect y={SHORE} width={SCENE.w} height={SCENE.h - SHORE} fill={`url(#${id}-fade)`} /></mask>
        <clipPath id={`${id}-clip`}><rect y={SHORE} width={SCENE.w} height={SCENE.h - SHORE} /></clipPath>
      </defs>
      <rect y={SHORE} width={SCENE.w} height={SCENE.h - SHORE} fill={`url(#${id}-water)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <g mask={`url(#${id}-m)`} transform={`translate(0 ${SHORE * 2}) scale(1 -1)`} opacity=".8"><CastleArt id={`${id}r`} /></g>
        <g fill="#f4ecc8" opacity=".5">{moon.map((m, i) => <rect key={i} x={f1(m.x - m.w / 2)} y={f1(m.y)} width={f1(m.w)} height="2.2" rx="1.1" opacity={f1(0.9 - i * 0.035)} />)}</g>
        <g stroke="#a9a2ff" strokeWidth="1.2" strokeLinecap="round" opacity=".28">{ripples.map((p, i) => <path key={i} d={`M${f1(p.x)},${f1(p.y)} h${f1(p.w)}`} />)}</g>
      </g>
    </Stage>
  );
}


// ───────────────────────────── the near shore ─────────────────────────────
export function SceneNear({ id, className }: { id: string; className?: string }) {
  const r = rng(61);
  const reeds = Array.from({ length: 46 }, () => ({ x: 14 + r() * 150, h: 70 + r() * 90, lean: (r() - 0.5) * 36, w: 1.6 + r() * 1.4 }));
  const reeds2 = Array.from({ length: 26 }, () => ({ x: 1380 + r() * 220, h: 60 + r() * 80, lean: (r() - 0.5) * 30, w: 1.6 + r() * 1.4 }));
  const planks = Array.from({ length: 23 }, (_, i) => 16 + i * 17);
  return (
    <Stage className={className}>
      <defs>
        <radialGradient id={`${id}-lamp`}><stop offset="0" stopColor="#ffd98a" stopOpacity=".6" /><stop offset=".4" stopColor="#ffb85a" stopOpacity=".18" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-streak`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd98a" stopOpacity=".5" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M0,840 C80,826 200,830 280,846 L280,900 H0Z" fill="#0b0a28" />
      <g stroke="#0b0a28" strokeLinecap="round" fill="none">{reeds.map((p, i) => <path key={i} d={`M${f1(p.x)},900 C${f1(p.x)},${f1(900 - p.h * 0.5)} ${f1(p.x + p.lean * 0.4)},${f1(900 - p.h * 0.8)} ${f1(p.x + p.lean)},${f1(900 - p.h)}`} strokeWidth={f1(p.w)} />)}</g>
      <g fill="#0b0a28">{reeds.filter((_, i) => i % 4 === 0).map((p, i) => <ellipse key={i} cx={f1(p.x + p.lean)} cy={f1(900 - p.h - 5)} rx="2.6" ry="8" transform={`rotate(${f1(p.lean * 0.5)} ${f1(p.x + p.lean)} ${f1(900 - p.h)})`} />)}</g>
      <g stroke="#0b0a28" strokeLinecap="round" fill="none">{reeds2.map((p, i) => <path key={i} d={`M${f1(p.x)},900 C${f1(p.x)},${f1(900 - p.h * 0.5)} ${f1(p.x + p.lean * 0.4)},${f1(900 - p.h * 0.8)} ${f1(p.x + p.lean)},${f1(900 - p.h)}`} strokeWidth={f1(p.w)} />)}</g>
      {/* the jetty */}
      <g>
        <path d="M0,800 H410 V814 H0Z" fill="#241c4c" /><path d="M0,800 H410 V804 H0Z" fill="#7a76c0" opacity=".5" />
        <g stroke="#100d33" strokeWidth="1.4" opacity=".8">{planks.map((x) => <path key={x} d={`M${x},800 V814`} />)}</g>
        {[40, 150, 260, 380].map((x) => <g key={x}><rect x={x - 5} y="800" width="10" height="46" fill="#171340" /><rect x={x - 5} y="800" width="3" height="46" fill="#6a66b0" opacity=".4" /></g>)}
        <path d="M40,812 Q95,830 150,812 Q205,830 260,812 Q320,830 380,812" stroke="#a89466" strokeWidth="2" fill="none" opacity=".7" />
        <path d="M380,800 V716" stroke="#171340" strokeWidth="6" /><path d="M380,800 V716" stroke="#6a66b0" strokeWidth="1.6" opacity=".5" />
        <path d="M368,718 H392 L388,708 H372Z" fill="#171340" /><circle cx="380" cy="690" r="64" fill={`url(#${id}-lamp)`} />
        <rect x="371" y="694" width="18" height="24" rx="3" fill="#ffd98a" stroke="#171340" strokeWidth="2.4" /><path d="M380,696 V718" stroke="#c9792f" strokeWidth="1" />
        <path d="M368,694 L380,682 L392,694Z" fill="#171340" /><circle cx="380" cy="680" r="2.4" fill="#171340" />
        <g><rect x="380" y="824" width="64" height="2" fill={`url(#${id}-streak)`} opacity="0" /><path d="M380,846 V900" stroke={`url(#${id}-streak)`} strokeWidth="10" opacity=".6" /></g>
      </g>
      {/* a rowing boat with a lantern on a pole */}
      <g>
        <ellipse cx="560" cy="850" rx="96" ry="9" fill="#05041a" opacity=".4" />
        <path d="M486,824 Q540,848 624,822 L604,846 Q548,862 504,846Z" fill="#2b1d3c" stroke="#120d2e" strokeWidth="2" strokeLinejoin="round" />
        <path d="M490,826 Q542,848 620,824" stroke="#8a86c8" strokeWidth="2.4" fill="none" opacity=".6" /><path d="M504,838 Q548,852 600,836" stroke="#6a3a2a" strokeWidth="2" fill="none" opacity=".8" />
        <path d="M600,826 V776" stroke="#120d2e" strokeWidth="4" /><path d="M590,780 H610" stroke="#120d2e" strokeWidth="2.4" />
        <circle cx="600" cy="790" r="48" fill={`url(#${id}-lamp)`} />
        <rect x="593" y="782" width="14" height="18" rx="2.6" fill="#ffd98a" stroke="#120d2e" strokeWidth="2" /><path d="M590,782 L600,774 L610,782Z" fill="#120d2e" />
        <path d="M520,832 L470,806" stroke="#120d2e" strokeWidth="3.4" strokeLinecap="round" /><path d="M470,806 l-8,-6 l12,0Z" fill="#120d2e" />
        <path d="M600,862 V900" stroke={`url(#${id}-streak)`} strokeWidth="14" opacity=".55" />
        <g stroke="#a9a2ff" strokeWidth="1.4" strokeLinecap="round" opacity=".3" fill="none"><path d="M470,858 h40 M600,868 h60 M520,872 h50 M640,852 h40" /></g>
      </g>
    </Stage>
  );
}

// ───────────────────────────── mist ─────────────────────────────
export function SceneMist({ id, className, flip = false }: { id: string; className?: string; flip?: boolean }) {
  const r = rng(flip ? 91 : 55);
  const puffs = Array.from({ length: 16 }, (_, i) => ({ x: (i / 15) * SCENE.w + (r() - 0.5) * 120, y: SHORE - 14 + r() * 34, rx: 120 + r() * 170, ry: 12 + r() * 16 }));
  return (
    <Stage className={className}>
      <defs><radialGradient id={`${id}-p`}><stop offset="0" stopColor="#cfc8ff" stopOpacity=".5" /><stop offset="1" stopColor="#cfc8ff" stopOpacity="0" /></radialGradient></defs>
      {puffs.map((p, i) => <ellipse key={i} cx={f1(p.x)} cy={f1(p.y)} rx={f1(p.rx)} ry={f1(p.ry)} fill={`url(#${id}-p)`} />)}
    </Stage>
  );
}

/** The whole scene, still. Used for the hero of the Grounds screen and the world picker. */
export function CastleScene({ id, className, flags = true }: { id: string; className?: string; flags?: boolean }) {
  return (
    <div className={`sc ${flags ? '' : 'is-flat'} ${className ?? ''}`.trim()} aria-hidden>
      <SceneSky id={`${id}k`} className="sc-l" />
      <SceneFar id={`${id}f`} className="sc-l" />
      <SceneCastle id={`${id}c`} className="sc-l" />
      <SceneLake id={`${id}w`} className="sc-l" />
      <SceneMist id={`${id}m`} className="sc-l sc-mist" />
      <SceneNear id={`${id}n`} className="sc-l" />
    </div>
  );
}

/** Fireflies: a handful of warm lights drifting over the grass. Positions come from a seed; the motion is CSS (transform and opacity). */
export function Fireflies({ n = 14, seed = 6, className = '' }: { n?: number; seed?: number; className?: string }) {
  const r = rng(seed);
  return (
    <div className={`ff ${className}`.trim()} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ left: `${f1(r() * 100)}%`, top: `${f1(54 + r() * 40)}%`, ['--ff-d' as string]: `${f1(7 + r() * 9)}s`, ['--ff-t' as string]: `${f1(-r() * 14)}s`, ['--ff-x' as string]: `${f1((r() - 0.5) * 90)}px`, ['--ff-y' as string]: `${f1(-18 - r() * 54)}px` }} />
      ))}
    </div>
  );
}

export const sceneColors = { sky: '#13103a', mist: '#cfc8ff', mix, lighten, darken, P };
