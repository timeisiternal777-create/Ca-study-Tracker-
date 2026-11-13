import { useId } from 'react';

// The Voyage world's brand mark: a brass-ringed compass card on a deep-sea disc, its north point aimed at a small lit lantern.
// Drawn in a 128 box from plain shapes. Small copies drop the degree ticks and the fine inner points.

const C = 64;
const INK = '#171c27';
const f = (n: number) => Math.round(n * 100) / 100;
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
const MINOR = ticks(44, 48.4, 5, 30);
const MAJOR = ticks(40.4, 48.4, 30);

/** One point of the compass card: a kite split down the middle so one half is lit and the other in shade. Drawn pointing at twelve o'clock, then turned. */
function Point({ r, w, deg, lit, shade }: { r: number; w: number; deg: number; lit: string; shade: string }) {
  const b = r * 0.26;
  return (
    <g transform={`rotate(${deg} ${C} ${C})`}>
      <path d={`M${C} ${C - r}L${C - w} ${C - b}L${C} ${C}Z`} fill={lit} />
      <path d={`M${C} ${C - r}L${C + w} ${C - b}L${C} ${C}Z`} fill={shade} />
      <path d={`M${C} ${C - r}L${C - w} ${C - b}L${C} ${C}L${C + w} ${C - b}Z`} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    </g>
  );
}

export function VoyageMark({ size, className }: { size?: number; className?: string }) {
  // Every copy needs its own gradient ids: a copy inside a hidden sidebar would otherwise swallow the ids and leave the visible one unpainted.
  const u = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fine = (size ?? 42) >= 56;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 128 128" fill="none" role="img" aria-label="The Double Entry">
      <defs>
        <radialGradient id={`${u}sea`} cx="35%" cy="28%" r="85%"><stop offset="0" stopColor="#2a7482" /><stop offset=".55" stopColor="#10404c" /><stop offset="1" stopColor="#051a21" /></radialGradient>
        <linearGradient id={`${u}brass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0b8" /><stop offset=".32" stopColor="#f0c765" /><stop offset=".66" stopColor="#bb7b20" /><stop offset="1" stopColor="#5e3a0c" /></linearGradient>
        <radialGradient id={`${u}glow`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffd77a" stopOpacity=".7" /><stop offset="1" stopColor="#ffd77a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${u}lamp`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3b8" /><stop offset="1" stopColor="#ffb938" /></linearGradient>
      </defs>

      {/* the sea disc and its brass ring */}
      <circle cx={C} cy={C} r="60" fill={`url(#${u}sea)`} />
      <circle cx={C} cy={C} r="57" stroke={`url(#${u}brass)`} strokeWidth="7" />
      <circle cx={C} cy={C} r="60.6" stroke={INK} strokeOpacity=".8" strokeWidth="1.2" />
      <circle cx={C} cy={C} r="53.4" stroke={INK} strokeOpacity=".7" strokeWidth="1" />
      <path d="M22 28A54 54 0 0 1 56 10.6" stroke="#fff" strokeOpacity=".6" strokeWidth="2.2" strokeLinecap="round" />

      {fine && (
        <g stroke="#ffe08a" strokeLinecap="round">
          <path d={MINOR} strokeOpacity=".38" strokeWidth=".9" />
          <path d={MAJOR} strokeOpacity=".8" strokeWidth="1.6" />
          <circle cx={C} cy={C} r="19" strokeOpacity=".4" strokeWidth=".9" strokeDasharray="1.2 2.6" />
        </g>
      )}

      {/* the compass card: eight small points, four middle ones, four long ones with north in cream */}
      {fine && [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((d) => <Point key={d} r={30} w={4.8} deg={d} lit="#e9b04a" shade="#9a6014" />)}
      {[45, 135, 225, 315].map((d) => <Point key={d} r={34} w={6.4} deg={d} lit="#ffe08a" shade="#b9791f" />)}
      {[90, 180, 270].map((d) => <Point key={d} r={46} w={8.6} deg={d} lit="#ffe08a" shade="#b9791f" />)}
      <Point r={42} w={8.6} deg={0} lit="#fffaf0" shade="#d8c79a" />

      {/* the lantern the needle points at */}
      <circle cx={C} cy="13.6" r="10" fill={`url(#${u}glow)`} />
      <path d="M60.6 11.4L64 7.6 67.4 11.4Z" fill="#c9892b" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <rect x="60.9" y="11" width="6.2" height="6.8" rx="1.6" fill={`url(#${u}lamp)`} stroke={INK} strokeWidth="1" />
      <path d="M62.2 12.4V16" stroke="#fff" strokeOpacity=".75" strokeWidth="1" strokeLinecap="round" />
      <rect x="60.4" y="17.2" width="7.2" height="1.8" rx=".7" fill="#c9892b" stroke={INK} strokeWidth=".9" />

      {/* the pin in the middle */}
      <circle cx={C} cy={C} r="7.4" fill={`url(#${u}brass)`} stroke={INK} strokeWidth="1.3" />
      <circle cx={C} cy={C} r="3.6" fill={INK} />
      <circle cx={C} cy={C} r="2" fill="#ffd77a" />
      <circle cx="63.4" cy="63.2" r=".7" fill="#fff" />
    </svg>
  );
}
