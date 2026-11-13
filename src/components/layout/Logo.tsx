import { useId } from 'react';

// The Study Radar mark: a brass-rimmed radar scope. A beam sweeps round with a fading trail, and the gold contact it keeps finding is Blip,
// the mascot, with his antenna. Everything is plain SVG, drawn in a 512 box. The same component writes public/icon.svg and the PNG icons (scripts/make-icons.mjs).

const C = 256;
const INK = '#17122e';
const f = (n: number) => Math.round(n * 10) / 10;
/** a point on the scope at radius r and angle deg, clockwise from twelve o'clock */
const pt = (r: number, deg: number): [number, number] => { const a = (deg * Math.PI) / 180; return [f(C + r * Math.sin(a)), f(C - r * Math.cos(a))]; };
const ticks = (r1: number, r2: number, step: number, skipEvery = 0) => {
  let d = '';
  for (let a = 0; a < 360; a += step) {
    if (skipEvery && a % skipEvery === 0) continue;
    const [x1, y1] = pt(r1, a); const [x2, y2] = pt(r2, a);
    d += `M${x1} ${y1}L${x2} ${y2}`;
  }
  return d;
};
const MINOR = ticks(173, 183, 5, 30);
const MAJOR = ticks(162, 183, 30);
/** the fading trail behind the beam, drawn as thin wedges, brightest next to the beam */
const trail = (n: number, span: number) => Array.from({ length: n }, (_, i) => {
  const a0 = -(i * span) / n; const a1 = -((i + 1) * span) / n;
  const [x0, y0] = pt(180, a0); const [x1, y1] = pt(180, a1);
  return { d: `M${C} ${C}L${x0} ${y0}A180 180 0 0 0 ${x1} ${y1}Z`, o: f((0.62 * Math.pow(1 - i / n, 1.6) + 0.015) * 100) / 100 };
});
const TRAIL_FINE = trail(16, 74);
const TRAIL_PLAIN = trail(8, 74);
const SCREWS: Array<[number, number, number]> = [[45, 205, 24], [135, 205, -18], [225, 205, 60], [315, 205, 8]];

export type LogoVariant = 'tile' | 'bleed' | 'mask';

/**
 * @param accent    the beam colour. The app passes its theme variable; the icon files pass a plain colour.
 * @param variant   tile = rounded app icon, bleed = full square, mask = full square with the scope pulled into the safe zone.
 * @param still     leave out the animation hooks (the icon files).
 */
export function Logo({ size = 42, className, accent = 'var(--a)', variant = 'tile', still }: { size?: number; className?: string; accent?: string; variant?: LogoVariant; still?: boolean }) {
  // Each copy needs its own gradient ids, or a copy in a hidden sidebar swallows them and the visible one loses its fill.
  const u = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const a = accent;
  const fine = size >= 64;
  const trailing = fine ? TRAIL_FINE : TRAIL_PLAIN;
  const scope = (
    <g>
      {/* soft glow behind the rim */}
      <circle cx={C} cy={C} r="219" stroke={a} strokeOpacity=".09" strokeWidth="22" />
      {/* brass rim */}
      <circle cx={C} cy={C} r="214" fill={`url(#${u}br)`} stroke="#2b1a06" strokeOpacity=".85" strokeWidth="3" />
      <circle cx={C} cy={C} r="207" stroke="#fff5d0" strokeOpacity=".55" strokeWidth="2" />
      <circle cx={C} cy={C} r="196" fill="#1d1206" />
      <path d="M118 120A200 200 0 0 1 238 56" stroke="#fff" strokeOpacity=".62" strokeWidth="6" strokeLinecap="round" />
      {fine && SCREWS.map(([deg, r, rot]) => {
        const [x, y] = pt(r, deg);
        return (
          <g key={deg} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <circle r="6.2" fill={`url(#${u}br)`} stroke="#4a2d08" strokeOpacity=".9" strokeWidth="1.5" />
            <path d="M-3.8 0H3.8" stroke="#4a2d08" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      })}

      {/* the screen */}
      <circle cx={C} cy={C} r="188" fill={`url(#${u}sc)`} />
      <g clipPath={`url(#${u}cl)`}>
        <g stroke={a} fill="none">
          <circle cx={C} cy={C} r="62" strokeOpacity=".3" strokeWidth="3" />
          <circle cx={C} cy={C} r="122" strokeOpacity=".3" strokeWidth="3" />
          <circle cx={C} cy={C} r="183" strokeOpacity=".5" strokeWidth="3" />
          <path d="M256 70V442M70 256H442" strokeOpacity=".17" strokeWidth="2" />
          {fine && <path d="M124 124L388 388M388 124L124 388" strokeOpacity=".08" strokeWidth="1.6" />}
          {fine && <path d={MINOR} strokeOpacity=".3" strokeWidth="2" strokeLinecap="round" />}
          <path d={MAJOR} strokeOpacity=".62" strokeWidth="3.6" strokeLinecap="round" />
        </g>

        {/* the beam turns clockwise; the trail fades behind it */}
        <g className={still ? undefined : 'logo-sweep'}>
          {trailing.map((t, i) => <path key={i} d={t.d} fill={a} fillOpacity={t.o} />)}
          <path d="M256 256V72" stroke={a} strokeOpacity=".28" strokeWidth="19" strokeLinecap="round" />
          <path d="M256 256V72" stroke={a} strokeWidth="7" strokeLinecap="round" />
          <path d="M256 250V80" stroke="#e2fcff" strokeOpacity=".8" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* quieter contacts */}
        <g fill={a}>
          <circle cx="176" cy="332" r="15" fillOpacity=".14" /><circle cx="176" cy="332" r="7" fillOpacity=".8" />
          <circle cx="324" cy="374" r="11" fillOpacity=".12" /><circle cx="324" cy="374" r="5" fillOpacity=".7" />
          <circle cx="194" cy="178" r="9" fillOpacity=".1" /><circle cx="194" cy="178" r="3.8" fillOpacity=".6" />
        </g>

        {/* Blip, the gold contact: a pulse of light, the body, the face and a little antenna */}
        <g className={still ? undefined : 'logo-blip'}><circle cx="348" cy="170" r="44" fill="#f6c75b" fillOpacity=".22" /></g>
        <circle cx="348" cy="170" r="31" fill="#f6c75b" fillOpacity=".25" />
        <path d="M353 140C356 129 361 125 369 122" stroke="#8a4a0e" strokeOpacity=".7" strokeWidth="7.4" strokeLinecap="round" />
        <path d="M353 140C356 129 361 125 369 122" stroke="#f0cd7e" strokeWidth="4" strokeLinecap="round" />
        <circle cx="370" cy="121" r="7" fill={a} stroke="#8a4a0e" strokeOpacity=".6" strokeWidth="1.6" />
        <circle cx="368" cy="119" r="2.2" fill="#fff" fillOpacity=".9" />
        <circle cx="348" cy="170" r="26" fill={`url(#${u}gd)`} stroke="#8a4a0e" strokeOpacity=".65" strokeWidth="2.6" />
        <path d="M331 161C334.5 153 341.5 149 350 148.4" stroke="#fff" strokeOpacity=".78" strokeWidth="4.4" strokeLinecap="round" />
        {fine ? (
          <g>
            <ellipse cx="339.6" cy="168" rx="4.2" ry="5.8" fill={INK} /><ellipse cx="357.4" cy="168" rx="4.2" ry="5.8" fill={INK} />
            <circle cx="338" cy="165.2" r="1.7" fill="#fff" /><circle cx="355.8" cy="165.2" r="1.7" fill="#fff" />
            <path d="M341.6 178.4Q348.6 184.6 355.6 178.4" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="331.6" cy="177" rx="5" ry="3" fill="#ff7a86" fillOpacity=".6" /><ellipse cx="365.4" cy="177" rx="5" ry="3" fill="#ff7a86" fillOpacity=".6" />
          </g>
        ) : <circle cx="348" cy="170" r="8" fill="#fff6c8" fillOpacity=".7" />}

        {/* glass */}
        <ellipse cx="226" cy="116" rx="152" ry="64" transform="rotate(-18 226 116)" fill={`url(#${u}gl)`} />
        <path d="M100 208A166 166 0 0 1 210 100" stroke="#fff" strokeOpacity=".17" strokeWidth="6" strokeLinecap="round" />
        <circle cx={C} cy={C} r="193" stroke="#000" strokeOpacity=".45" strokeWidth="14" />
      </g>

      {/* hub */}
      <circle cx={C} cy={C} r="17" fill={`url(#${u}br)`} stroke="#2b1a06" strokeOpacity=".85" strokeWidth="2.4" />
      <circle cx={C} cy={C} r="9.4" fill="#1d1206" />
      <circle cx={C} cy={C} r="4.2" fill={a} />
      <circle cx="254.6" cy="254.4" r="1.4" fill="#fff" fillOpacity=".9" />
    </g>
  );

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden>
      <defs>
        <radialGradient id={`${u}bg`} cx="50%" cy="28%" r="88%"><stop offset="0" stopColor="#1b2c63" /><stop offset=".5" stopColor="#0b1334" /><stop offset="1" stopColor="#04060f" /></radialGradient>
        <linearGradient id={`${u}sh`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".14" /><stop offset=".42" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${u}br`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3c9" /><stop offset=".3" stopColor="#f0c765" /><stop offset=".62" stopColor="#b8791f" /><stop offset="1" stopColor="#5e3a0c" /></linearGradient>
        <radialGradient id={`${u}sc`} cx="50%" cy="42%" r="62%"><stop offset="0" stopColor="#14495a" /><stop offset=".55" stopColor="#0b2a3a" /><stop offset="1" stopColor="#061622" /></radialGradient>
        <linearGradient id={`${u}gl`} x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <radialGradient id={`${u}gd`} cx="38%" cy="30%" r="80%"><stop offset="0" stopColor="#fff6c8" /><stop offset=".5" stopColor="#ffd45a" /><stop offset="1" stopColor="#e8952a" /></radialGradient>
        <clipPath id={`${u}cl`}><circle cx={C} cy={C} r="188" /></clipPath>
      </defs>
      {variant === 'tile' ? <rect width="512" height="512" rx="116" fill={`url(#${u}bg)`} /> : <rect width="512" height="512" fill={`url(#${u}bg)`} />}
      {variant === 'tile' && <rect width="512" height="512" rx="116" fill={`url(#${u}sh)`} />}
      {variant === 'mask' ? <g transform="translate(51.2 51.2) scale(.8)">{scope}</g> : scope}
    </svg>
  );
}
