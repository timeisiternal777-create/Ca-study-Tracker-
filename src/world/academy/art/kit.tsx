import type { ReactNode } from 'react';

// Small drawing helpers for Lanternfell's artwork. Everything is plain SVG (shapes, gradients, patterns), so it can be opened and
// edited in any vector tool, and every piece that repeats (stones, slates, windows) varies a little from a seed, so no two walls are cut
// from the same stamp. The light in this world is one moon, high on the upper left: left faces catch a cool rim, right faces fall into
// blue-violet shade, and windows throw warm light back onto whatever is near them.

/** A small, fast, seedable random number generator (xorshift32): the same seed always draws the same wall. */
export function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const hex = (c: string) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** Blend two #rrggbb colours (t = 0 gives a, 1 gives b). */
export function mix(a: string, b: string, t: number) { const x = hex(a), y = hex(b); return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
export const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
export const darken = (c: string, t: number) => mix(c, '#05040f', t);
const f1 = (n: number) => Math.round(n * 10) / 10;

/** The colours of the moonlit palette. Landmarks take what they need from here, so the whole village hangs together. */
export const P = {
  moon: '#f6f0dc', sky0: '#0a0920', sky1: '#1a1442', sky2: '#3b2b6e',
  stoneLit: '#8a86a8', stone: '#5d5a7c', stoneShade: '#38365a', stoneDeep: '#23213d',
  slate: '#3d4670', slateLit: '#5a6798', slateShade: '#262c4d',
  copper: '#c4733f', copperLit: '#f0a56a', verdigris: '#62b3a3', verdigrisDeep: '#2f6f69',
  timber: '#5b3a2a', timberLit: '#8a5a3c', timberShade: '#34201a', plaster: '#cdbf9d', plasterShade: '#8a7f6f',
  moss: '#587a52', mossLit: '#86a86a', ivy: '#2f5a43', ivyLit: '#4f8a5a',
  glow: '#ffd27a', glowHot: '#fff0b8', ember: '#f08a3c', ember2: '#d9532a',
  parchment: '#efe0b8', parchmentShade: '#b9a27a', ink: '#17122e', brass: '#d9a441', brassLit: '#ffe08a', brassShade: '#8a5f1f',
  iron: '#3a3a4d', ironLit: '#6c6c86',
} as const;

/** `<defs>` that every landmark shares: a vertical wall shade (moon side to shadow side), a warm window glow, mist. Ids carry a prefix. */
export function CommonDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-wallL`} x1="0" y1="0" x2="1" y2="0.15"><stop offset="0" stopColor={P.stoneLit} /><stop offset=".55" stopColor={P.stone} /><stop offset="1" stopColor={P.stoneShade} /></linearGradient>
      <linearGradient id={`${id}-wallD`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={P.stone} /><stop offset="1" stopColor={P.stoneDeep} /></linearGradient>
      <linearGradient id={`${id}-roofL`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.slateLit} /><stop offset="1" stopColor={P.slate} /></linearGradient>
      <linearGradient id={`${id}-roofD`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.slate} /><stop offset="1" stopColor={P.slateShade} /></linearGradient>
      <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={P.glow} stopOpacity=".55" /><stop offset=".45" stopColor={P.ember} stopOpacity=".18" /><stop offset="1" stopColor={P.ember} stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2f5c" /><stop offset="1" stopColor="#12142f" /></linearGradient>
      <linearGradient id={`${id}-lit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.glowHot} /><stop offset=".5" stopColor={P.glow} /><stop offset="1" stopColor={P.ember} /></linearGradient>
      <linearGradient id={`${id}-col`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={P.stoneShade} /><stop offset=".25" stopColor={P.stoneLit} /><stop offset=".55" stopColor={P.stone} /><stop offset="1" stopColor={P.stoneDeep} /></linearGradient>
      <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c3a45" /><stop offset="1" stopColor="#141a2b" /></linearGradient>
      <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#05040f" stopOpacity="0" /><stop offset="1" stopColor="#05040f" stopOpacity=".55" /></linearGradient>
    </defs>
  );
}

/** A tile of irregular masonry, used as a pattern fill. Blocks differ in width and tone; mortar is a thin dark line. */
export function StonePattern({ id, seed, base = P.stone, w = 44, h = 30, rows = 5, line = P.stoneDeep, vary = 0.16 }: { id: string; seed: number; base?: string; w?: number; h?: number; rows?: number; line?: string; vary?: number }) {
  const r = rng(seed);
  const out: ReactNode[] = [];
  const rh = h / rows;
  for (let row = 0; row < rows; row++) {
    let x = -r() * 10;
    const y = row * rh;
    let k = 0;
    while (x < w) {
      const bw = 9 + r() * 14;
      const t = (r() - 0.5) * 2 * vary;
      const fill = t > 0 ? lighten(base, t) : darken(base, -t);
      out.push(<rect key={`${row}-${k++}`} x={f1(x + 0.4)} y={f1(y + 0.4)} width={f1(bw - 0.8)} height={f1(rh - 0.8)} rx="1.4" fill={fill} />);
      if (r() < 0.22) out.push(<path key={`c${row}-${k++}`} d={`M${f1(x + bw * 0.3)} ${f1(y + 1)} l${f1(2 + r() * 3)} ${f1(rh * 0.5)} l${f1(-1.5)} ${f1(rh * 0.4)}`} stroke={darken(base, 0.45)} strokeWidth=".45" fill="none" opacity=".6" />);
      x += bw;
    }
  }
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}>
      <rect width={w} height={h} fill={line} />
      {out}
    </pattern>
  );
}

/** A tile of fish-scale slates for roofs. */
export function SlatePattern({ id, seed, base = P.slate, w = 26, h = 16 }: { id: string; seed: number; base?: string; w?: number; h?: number }) {
  const r = rng(seed);
  const out: ReactNode[] = [];
  const rows = 2, step = h / rows;
  for (let row = 0; row < rows; row++) {
    for (let i = -1; i < 3; i++) {
      const cx = i * (w / 2) + (row % 2 ? w / 4 : 0) + w / 4;
      const t = (r() - 0.5) * 0.3;
      const fill = t > 0 ? lighten(base, t) : darken(base, -t);
      const y0 = row * step;
      out.push(<path key={`${row}-${i}`} d={`M${f1(cx - w / 4)} ${f1(y0)} h${f1(w / 2)} v${f1(step * 0.55)} a${f1(w / 4)} ${f1(step * 0.62)} 0 0 1 ${f1(-w / 2)} 0Z`} fill={fill} stroke={darken(base, 0.5)} strokeWidth=".5" />);
    }
  }
  return <pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}><rect width={w} height={h} fill={darken(base, 0.45)} />{out}</pattern>;
}

/** Vertical weatherboard / timber planks tile. */
export function PlankPattern({ id, seed, base = P.timber, w = 30, h = 40 }: { id: string; seed: number; base?: string; w?: number; h?: number }) {
  const r = rng(seed);
  const n = 5, pw = w / n;
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}>
      {Array.from({ length: n }, (_, i) => { const t = (r() - 0.5) * 0.28; return <rect key={i} x={i * pw} y="0" width={pw} height={h} fill={t > 0 ? lighten(base, t) : darken(base, -t)} />; })}
      {Array.from({ length: n + 1 }, (_, i) => <path key={`l${i}`} d={`M${i * pw} 0V${h}`} stroke={darken(base, 0.55)} strokeWidth=".7" />)}
      {Array.from({ length: 4 }, (_, i) => { const x = r() * w, y = r() * h; return <path key={`g${i}`} d={`M${f1(x)} ${f1(y)} q1.2 ${f1(h * 0.12)} 0 ${f1(h * 0.24)}`} stroke={darken(base, 0.4)} strokeWidth=".5" fill="none" opacity=".7" />; })}
    </pattern>
  );
}

/**
 * An arched window. The warm lit glass and its halo are always drawn and sit under the class `lw` / `lh`; the stylesheet shows them when
 * the class `on` is present, so a window can light up with a fade instead of popping in. Position is the bottom centre of the window.
 */
export function ArchWindow({ id, x, y, w, h, on = false, shutters = false, stone = P.stoneLit, sill = true, curtain, inside }: { id: string; x: number; y: number; w: number; h: number; on?: boolean; shutters?: boolean; stone?: string; sill?: boolean; curtain?: string; inside?: ReactNode }) {
  const hw = w / 2, top = y - h, rr = hw;
  const arch = `M${f1(x - hw)} ${f1(y)} V${f1(top + rr)} A${f1(rr)} ${f1(rr)} 0 0 1 ${f1(x + hw)} ${f1(top + rr)} V${f1(y)}Z`;
  const pad = Math.max(1.6, w * 0.16);
  const ihw = hw - pad, itop = top + pad;
  const inner = `M${f1(x - ihw)} ${f1(y - pad * 0.4)} V${f1(itop + ihw)} A${f1(ihw)} ${f1(ihw)} 0 0 1 ${f1(x + ihw)} ${f1(itop + ihw)} V${f1(y - pad * 0.4)}Z`;
  const cl = `clip-${id}-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g>
      <circle className={on ? 'lh on' : 'lh'} cx={f1(x)} cy={f1(y - h * 0.5)} r={f1(Math.max(w, h) * 0.95)} fill={`url(#${id}-halo)`} />
      <path d={arch} fill={darken(stone, 0.35)} />
      <path d={`M${f1(x - hw)} ${f1(y)} V${f1(top + rr)} A${f1(rr)} ${f1(rr)} 0 0 1 ${f1(x)} ${f1(top)}`} fill="none" stroke={stone} strokeWidth="1.1" opacity=".85" />
      <path d={inner} fill={`url(#${id}-glass)`} />
      <path d={`M${f1(x - ihw + 1)} ${f1(itop + ihw)} A${f1(ihw)} ${f1(ihw)} 0 0 1 ${f1(x)} ${f1(itop + 0.8)}`} stroke="#9aa6ff" strokeWidth=".8" fill="none" opacity=".35" />
      <g className={on ? 'lw on' : 'lw'}>
        <clipPath id={cl}><path d={inner} /></clipPath>
        <path d={inner} fill={`url(#${id}-lit)`} />
        <g clipPath={`url(#${cl})`}>{inside}{curtain ? <path d={`M${f1(x - ihw)} ${f1(itop)} q${f1(ihw * 0.7)} ${f1(h * 0.28)} ${f1(ihw * 0.5)} ${f1(h)} H${f1(x - ihw)}Z`} fill={curtain} opacity=".5" /> : null}</g>
      </g>
      <path d={`M${f1(x)} ${f1(itop)} V${f1(y - pad * 0.4)} M${f1(x - ihw)} ${f1(y - h * 0.46)} H${f1(x + ihw)}`} stroke={darken(stone, 0.55)} strokeWidth={Math.max(0.7, w * 0.05)} />
      {sill ? <rect x={f1(x - hw - 1.4)} y={f1(y - 0.4)} width={f1(w + 2.8)} height="2.4" rx=".8" fill={stone} /> : null}
      {shutters ? <>
        <path d={`M${f1(x - hw - w * 0.34)} ${f1(top + rr)} h${f1(w * 0.3)} V${f1(y)} h${f1(-w * 0.3)}Z`} fill={P.timber} stroke={P.timberShade} strokeWidth=".6" />
        <path d={`M${f1(x + hw + w * 0.04)} ${f1(top + rr)} h${f1(w * 0.3)} V${f1(y)} h${f1(-w * 0.3)}Z`} fill={P.timberShade} stroke={P.timberShade} strokeWidth=".6" />
      </> : null}
    </g>
  );
}

/** A pointed (lancet) window with tracery. When lit its panes glow warm, tinted by the three colours given (top, middle, bottom light). */
export function Lancet({ id, x, y, w, h, on = false, stone = P.stoneLit, tints = ['#6fd6c8', '#a07be8', '#ffb15a'] }: { id: string; x: number; y: number; w: number; h: number; on?: boolean; stone?: string; tints?: [string, string, string] }) {
  const hw = w / 2, top = y - h, sh = top + hw * 1.25;
  const outline = `M${f1(x - hw)} ${f1(y)} V${f1(sh)} Q${f1(x - hw)} ${f1(top + hw * 0.55)} ${f1(x)} ${f1(top)} Q${f1(x + hw)} ${f1(top + hw * 0.55)} ${f1(x + hw)} ${f1(sh)} V${f1(y)}Z`;
  const pad = 1.7, ihw = hw - pad;
  const inner = `M${f1(x - ihw)} ${f1(y)} V${f1(sh)} Q${f1(x - ihw)} ${f1(top + pad + hw * 0.5)} ${f1(x)} ${f1(top + pad)} Q${f1(x + ihw)} ${f1(top + pad + hw * 0.5)} ${f1(x + ihw)} ${f1(sh)} V${f1(y)}Z`;
  const cl = `lc-${id}-${Math.round(x)}-${Math.round(y)}`;
  const bands = [top + pad, top + h * 0.34, top + h * 0.66, y];
  return (
    <g>
      <circle className={on ? 'lh on' : 'lh'} cx={f1(x)} cy={f1(y - h * 0.5)} r={f1(h * 0.75)} fill={`url(#${id}-halo)`} />
      <path d={outline} fill={darken(stone, 0.4)} />
      <path d={outline} fill="none" stroke={stone} strokeWidth="1.2" opacity=".8" />
      <path d={inner} fill={`url(#${id}-glass)`} />
      <clipPath id={cl}><path d={inner} /></clipPath>
      <g clipPath={`url(#${cl})`}>
        {[0, 1, 2].map((i) => <rect key={i} x={f1(x - hw)} y={f1(bands[i])} width={f1(w)} height={f1(bands[i + 1] - bands[i])} fill={tints[i]} opacity=".18" />)}
        <g className={on ? 'lw on' : 'lw'}>
          <rect x={f1(x - hw)} y={f1(top)} width={f1(w)} height={f1(h)} fill={`url(#${id}-lit)`} />
          {[0, 1, 2].map((i) => <rect key={i} x={f1(x - hw)} y={f1(bands[i])} width={f1(w)} height={f1(bands[i + 1] - bands[i])} fill={tints[i]} opacity=".5" />)}
        </g>
        <path d={`M${f1(x)} ${f1(top)} V${f1(y)} M${f1(x - hw)} ${f1(bands[1])} H${f1(x + hw)} M${f1(x - hw)} ${f1(bands[2])} H${f1(x + hw)}`} stroke={darken(stone, 0.6)} strokeWidth="1" />
        <circle cx={f1(x)} cy={f1(top + hw * 1.15)} r={f1(hw * 0.38)} fill="none" stroke={darken(stone, 0.6)} strokeWidth=".9" />
      </g>
      <rect x={f1(x - hw - 1.4)} y={f1(y - 0.4)} width={f1(w + 2.8)} height="2.4" rx=".8" fill={stone} />
    </g>
  );
}

/** A round column with fluting, a capital and a base. (x, y) is the bottom centre. */
export function Column({ id, x, y, h, w = 13, base = P.stoneLit }: { id: string; x: number; y: number; h: number; w?: number; base?: string }) {
  const hw = w / 2, top = y - h;
  return (
    <g>
      <rect x={f1(x - hw)} y={f1(top)} width={w} height={f1(h)} fill={`url(#${id}-col)`} />
      {[-0.55, -0.18, 0.18, 0.55].map((k, i) => <path key={i} d={`M${f1(x + hw * k)} ${f1(top + 5)} V${f1(y - 5)}`} stroke={darken(base, 0.5)} strokeWidth=".6" opacity=".55" />)}
      <rect x={f1(x - hw - 2.4)} y={f1(top - 4.4)} width={f1(w + 4.8)} height="4.4" rx="1" fill={base} />
      <path d={`M${f1(x - hw - 2.4)} ${f1(top - 4.4)} h${f1(w + 4.8)}`} stroke="#ffffff" strokeWidth=".6" opacity=".4" />
      <rect x={f1(x - hw - 1)} y={f1(top)} width={f1(w + 2)} height="3.2" fill={darken(base, 0.18)} />
      <rect x={f1(x - hw - 1.6)} y={f1(y - 5)} width={f1(w + 3.2)} height="2.8" rx="1.2" fill={darken(base, 0.1)} />
      <rect x={f1(x - hw - 2.6)} y={f1(y - 2.4)} width={f1(w + 5.2)} height="2.6" rx="1" fill={base} />
    </g>
  );
}

/** A little fire in a bowl on a pedestal (a brazier). */
export function Brazier({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-22" r="16" fill="#f08a3c" opacity=".18" />
      <path d="M-2.4 0 L-1.6 -10 H1.6 L2.4 0Z" fill={P.iron} /><path d="M-5 0 H5 V-1.6 H-5Z" fill={P.ironLit} />
      <path d="M-7.6 -14 q1 6 7.6 6.4 q6.6 -0.4 7.6 -6.4Z" fill={P.iron} stroke={P.ironLit} strokeWidth=".5" />
      <path d="M-6 -14 H6" stroke={P.ironLit} strokeWidth="1.2" />
      <path className="flame" d="M0 -30 C4 -24 6.6 -20 5 -15.4 C3.6 -13 -3.6 -13 -5 -15.4 C-6.6 -20 -2 -23 0 -30Z" fill={P.ember} />
      <path className="flame" d="M0 -26 C2.4 -22 3.8 -19.4 2.8 -16.4 C1.8 -15 -1.8 -15 -2.8 -16.4 C-3.8 -19.4 -1 -21.8 0 -26Z" fill={P.glow} />
      <path d="M0 -21 C1 -19.4 1.4 -18 .8 -16.8 C.2 -16.4 -.2 -16.4 -.8 -16.8 C-1.4 -18 -.6 -19.4 0 -21Z" fill={P.glowHot} />
    </g>
  );
}

/** A hanging lantern: cap, glass, flame, chain. */
export function Lantern({ id, x, y, s = 1, lit = true }: { id: string; x: number; y: number; s?: number; lit?: boolean }) {  // always lit by default: lanterns are the world's decoration, windows are the progress
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -9 V-4" stroke={P.iron} strokeWidth=".9" />
      <path d="M-3.2 -4 L0 -6.4 L3.2 -4Z" fill={P.iron} />
      <path d="M-3 -4 H3 L2.6 4.6 H-2.6Z" fill={lit ? `url(#${id}-lit)` : '#1b1d3a'} stroke={P.iron} strokeWidth=".8" strokeLinejoin="round" />
      <path d="M-2.6 4.6 H2.6 L1.8 6 H-1.8Z" fill={P.iron} />
      {lit ? <circle cx="0" cy="0.4" r="9" fill={`url(#${id}-halo)`} /> : null}
      <path d="M-1 3 Q0 -2.6 1 3 Q0 1.6 -1 3Z" fill={P.glowHot} opacity={lit ? 0.95 : 0} />
    </g>
  );
}

/** Ivy climbing a line: a vine with leaves of two greens. */
export function Ivy({ seed, x, y, len, dir = 1, wob = 6, leaf = 3.6 }: { seed: number; x: number; y: number; len: number; dir?: number; wob?: number; leaf?: number }) {
  const r = rng(seed);
  let cx = x, cy = y;
  let d = `M${f1(cx)} ${f1(cy)}`;
  const leaves: ReactNode[] = [];
  const steps = Math.max(3, Math.round(len / 9));
  for (let i = 0; i < steps; i++) {
    const nx = x + Math.sin(i * 1.7 + r() * 2) * wob * dir, ny = y - ((i + 1) * len) / steps;
    d += ` Q${f1((cx + nx) / 2 + (r() - 0.5) * wob)} ${f1((cy + ny) / 2)} ${f1(nx)} ${f1(ny)}`;
    cx = nx; cy = ny;
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const a = (r() - 0.5) * 3.2, sz = leaf * (0.7 + r() * 0.7);
      const lx = cx + Math.cos(a) * sz * 0.9, ly = cy + Math.sin(a) * sz * 0.9;
      leaves.push(<path key={`${i}-${k}`} d={`M${f1(cx)} ${f1(cy)} Q${f1(lx + sz * 0.3)} ${f1(ly - sz * 0.8)} ${f1(lx + sz * 0.9)} ${f1(ly)} Q${f1(lx + sz * 0.2)} ${f1(ly + sz * 0.7)} ${f1(cx)} ${f1(cy)}Z`} fill={r() < 0.5 ? P.ivy : P.ivyLit} transform={`rotate(${f1(a * 57)} ${f1(cx)} ${f1(cy)})`} />);
    }
  }
  return <g><path d={d} stroke={darken(P.ivy, 0.35)} strokeWidth="1" fill="none" strokeLinecap="round" />{leaves}</g>;
}

/** Smoke from a chimney: a few soft puffs rising. The map animates the wrapper. */
export function Smoke({ x, y, seed = 1, n = 4 }: { x: number; y: number; seed?: number; n?: number }) {
  const r = rng(seed);
  return (
    <g className="smoke" fill="#b9b4d6">
      {Array.from({ length: n }, (_, i) => <circle key={i} cx={f1(x + Math.sin(i * 1.3) * 4 + (r() - 0.5) * 3)} cy={f1(y - i * 9)} r={f1(3 + i * 1.9)} opacity={f1(0.34 - i * 0.07)} />)}
    </g>
  );
}

/** A pennant that can fly from a pole: used to show a cleared building. */
export function Pennant({ x, y, h = 26, color = P.brass, side = 1 }: { x: number; y: number; h?: number; color?: string; side?: number }) {
  return (
    <g className="pen">
      <path d={`M${x} ${y} V${y - h}`} stroke={P.iron} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx={x} cy={y - h} r="1.6" fill={P.brassLit} />
      <path d={`M${x} ${y - h + 2} q${6 * side} 2 ${12 * side} ${-0.5} q${-3 * side} 4 ${-1 * side} 8 q${-6 * side} -2 ${-11 * side} -1Z`} fill={color} stroke={darken(color, 0.5)} strokeWidth=".6" />
      <path d={`M${x + 1 * side} ${y - h + 4.5} q${5 * side} 1.4 ${9 * side} 0`} stroke={lighten(color, 0.4)} strokeWidth=".5" fill="none" opacity=".8" />
    </g>
  );
}

/** A square casement window for timber and brick buildings: frame, glass, lit pane with mullions, optional shutters and a sill. (x, y) is the bottom centre. */
export function Casement({ id, x, y, w, h, on = false, shutters = false, frame = P.timberShade, mull = 'cross', sill = true, curtain, inside, flowers = false }: { id: string; x: number; y: number; w: number; h: number; on?: boolean; shutters?: boolean; frame?: string; mull?: 'cross' | 'grid' | 'bars'; sill?: boolean; curtain?: string; inside?: ReactNode; flowers?: boolean }) {
  const hw = w / 2, top = y - h, p = Math.max(1.4, w * 0.1);
  const cl = `cs-${id}-${Math.round(x)}-${Math.round(y)}`;
  const gx = x - hw + p, gy = top + p, gw = w - p * 2, gh = h - p * 2;
  return (
    <g>
      <circle className={on ? 'lh on' : 'lh'} cx={f1(x)} cy={f1(y - h * 0.5)} r={f1(Math.max(w, h) * 1.05)} fill={`url(#${id}-halo)`} />
      {shutters ? <>
        {[-1, 1].map((sd) => {
          const sx = sd < 0 ? x - hw - w * 0.46 : x + hw + w * 0.02;
          return <g key={sd}>
            <rect x={f1(sx)} y={f1(top)} width={f1(w * 0.44)} height={f1(h)} fill={sd < 0 ? P.timber : P.timberShade} stroke={P.timberShade} strokeWidth=".6" />
            {Array.from({ length: Math.max(3, Math.round(h / 4.4)) }, (_, i) => <path key={i} d={`M${f1(sx + 1)} ${f1(top + 2.4 + i * 4.4)} H${f1(sx + w * 0.44 - 1)}`} stroke={darken(P.timber, 0.5)} strokeWidth=".6" opacity=".7" />)}
          </g>;
        })}
      </> : null}
      <rect x={f1(x - hw - 1.2)} y={f1(top - 1.2)} width={f1(w + 2.4)} height={f1(h + 2.4)} rx="1" fill={frame} />
      <rect x={f1(gx)} y={f1(gy)} width={f1(gw)} height={f1(gh)} fill={`url(#${id}-glass)`} />
      <path d={`M${f1(gx + 1)} ${f1(gy + gh * 0.5)} L${f1(gx + gw * 0.4)} ${f1(gy + 1)}`} stroke="#9aa6ff" strokeWidth=".7" opacity=".3" />
      <clipPath id={cl}><rect x={f1(gx)} y={f1(gy)} width={f1(gw)} height={f1(gh)} /></clipPath>
      <g className={on ? 'lw on' : 'lw'} clipPath={`url(#${cl})`}>
        <rect x={f1(gx)} y={f1(gy)} width={f1(gw)} height={f1(gh)} fill={`url(#${id}-lit)`} />
        {inside}
        {curtain ? <path d={`M${f1(gx)} ${f1(gy)} h${f1(gw * 0.42)} q${f1(-gw * 0.1)} ${f1(gh * 0.5)} ${f1(gw * 0.06)} ${f1(gh)} H${f1(gx)}Z`} fill={curtain} opacity=".55" /> : null}
      </g>
      <path d={mull === 'bars' ? `M${f1(x - gw / 6)} ${f1(gy)} V${f1(gy + gh)} M${f1(x + gw / 6)} ${f1(gy)} V${f1(gy + gh)}` : mull === 'grid' ? `M${f1(x - gw / 6)} ${f1(gy)} V${f1(gy + gh)} M${f1(x + gw / 6)} ${f1(gy)} V${f1(gy + gh)} M${f1(gx)} ${f1(gy + gh / 3)} H${f1(gx + gw)} M${f1(gx)} ${f1(gy + (gh * 2) / 3)} H${f1(gx + gw)}` : `M${f1(x)} ${f1(gy)} V${f1(gy + gh)} M${f1(gx)} ${f1(gy + gh * 0.46)} H${f1(gx + gw)}`} stroke={frame} strokeWidth={Math.max(0.7, w * 0.05)} />
      {sill ? <rect x={f1(x - hw - 2)} y={f1(y + 0.4)} width={f1(w + 4)} height="2.4" rx=".8" fill={P.stoneLit} /> : null}
      {flowers ? <g>
        <rect x={f1(x - hw - 1)} y={f1(y + 2.6)} width={f1(w + 2)} height="4.6" rx=".8" fill={P.timber} stroke={P.timberShade} strokeWidth=".5" />
        {Array.from({ length: 5 }, (_, i) => <g key={i}><circle cx={f1(x - hw + 2 + (i * (w - 4)) / 4)} cy={f1(y + 1.6)} r="1.9" fill={P.ivyLit} /><circle cx={f1(x - hw + 2 + (i * (w - 4)) / 4 + 0.4)} cy={f1(y + 0.4)} r="1.1" fill={i % 2 ? '#e86a8a' : '#f4d27a'} /></g>)}
      </g> : null}
    </g>
  );
}

/** A round brass-rimmed porthole, with a lit pane under the class `lw` and a halo under `lh`. */
export function Porthole({ id, x, y, r, on = false }: { id: string; x: number; y: number; r: number; on?: boolean }) {
  return (
    <g>
      <circle className={on ? 'lh on' : 'lh'} cx={f1(x)} cy={f1(y)} r={f1(r * 2.4)} fill={`url(#${id}-halo)`} />
      <circle cx={f1(x)} cy={f1(y)} r={f1(r + 2.6)} fill={darken(P.stoneLit, 0.4)} />
      <circle cx={f1(x)} cy={f1(y)} r={f1(r + 1.8)} fill={P.brass} />
      <circle cx={f1(x)} cy={f1(y)} r={f1(r + 1.8)} fill="none" stroke={P.brassShade} strokeWidth=".7" />
      <path d={`M${f1(x - r - 1)} ${f1(y - r * 0.4)} A${f1(r + 1.8)} ${f1(r + 1.8)} 0 0 1 ${f1(x + r * 0.5)} ${f1(y - r - 1.2)}`} stroke={P.brassLit} strokeWidth="1" fill="none" opacity=".8" />
      <circle cx={f1(x)} cy={f1(y)} r={f1(r)} fill={`url(#${id}-glass)`} />
      <g className={on ? 'lw on' : 'lw'}><circle cx={f1(x)} cy={f1(y)} r={f1(r)} fill={`url(#${id}-lit)`} /><path d={`M${f1(x - r)} ${f1(y)} H${f1(x + r)} M${f1(x)} ${f1(y - r)} V${f1(y + r)}`} stroke="#6b3a14" strokeWidth=".8" opacity=".6" /></g>
      <path d={`M${f1(x - r * 0.7)} ${f1(y - r * 0.5)} A${f1(r * 0.9)} ${f1(r * 0.9)} 0 0 1 ${f1(x + r * 0.2)} ${f1(y - r * 0.85)}`} stroke="#fff" strokeWidth="1" fill="none" opacity=".4" strokeLinecap="round" />
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <circle key={i} cx={f1(x + Math.cos(a) * (r + 2.2))} cy={f1(y + Math.sin(a) * (r + 2.2))} r=".55" fill={P.brassShade} />; })}
    </g>
  );
}

/** A tile of small bricks for chimneys and workshops. */
export function BrickPattern({ id, seed, base = '#7a4a4a', w = 24, h = 20, rows = 5 }: { id: string; seed: number; base?: string; w?: number; h?: number; rows?: number }) {
  const r = rng(seed);
  const out: ReactNode[] = [];
  const rh = h / rows;
  for (let row = 0; row < rows; row++) {
    let x = row % 2 ? -6 : 0;
    while (x < w) {
      const bw = 12;
      const t = (r() - 0.5) * 0.3;
      out.push(<rect key={`${row}-${x}`} x={f1(x + 0.4)} y={f1(row * rh + 0.4)} width={bw - 0.8} height={f1(rh - 0.8)} rx=".5" fill={t > 0 ? lighten(base, t) : darken(base, -t)} />);
      x += bw;
    }
  }
  return <pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}><rect width={w} height={h} fill={darken(base, 0.55)} />{out}</pattern>;
}
