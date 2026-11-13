import { useId } from 'react';

/**
 * The school's seal: a brass medallion with a beaded rim, the name set round it as real text (so it can be changed in any vector tool),
 * and in the middle a lantern with a ring of rays above an open book. It is the app's brand mark in the Lanternfell world.
 */
export function Seal({ size = 120, title, idPrefix, text = true, className }: { size?: number; title?: string; idPrefix?: string; text?: boolean; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = idPrefix ?? `sl${uid}`;
  const beads = Array.from({ length: 56 }, (_, i) => { const a = (i / 56) * Math.PI * 2; return [100 + Math.cos(a) * 91, 100 + Math.sin(a) * 91] as const; });
  const rays = Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; const w = 0.07; const r0 = 15; const r1 = i % 2 ? 36 : 44; return `M${100 + Math.cos(a - w) * r0},${92 + Math.sin(a - w) * r0} L${100 + Math.cos(a) * r1},${92 + Math.sin(a) * r1} L${100 + Math.cos(a + w) * r0},${92 + Math.sin(a + w) * r0}Z`; });
  const star = (x: number, y: number, s: number) => `M${x},${y - s} L${x + s * 0.28},${y - s * 0.28} L${x + s},${y} L${x + s * 0.28},${y + s * 0.28} L${x},${y + s} L${x - s * 0.28},${y + s * 0.28} L${x - s},${y} L${x - s * 0.28},${y - s * 0.28}Z`;
  const font = { fontFamily: "var(--font-head, 'Voyage Title'), Georgia, serif", fontWeight: 700 } as const;
  return (
    <svg className={className} viewBox="0 0 200 200" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0b8" /><stop offset=".42" stopColor="#d9a441" /><stop offset="1" stopColor="#7a5018" /></linearGradient>
        <linearGradient id={`${id}-b2`} x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3cf7a" /><stop offset=".5" stopColor="#c28a2e" /><stop offset="1" stopColor="#6f4814" /></linearGradient>
        <radialGradient id={`${id}-f`} cx=".38" cy=".3" r=".9"><stop offset="0" stopColor="#35337c" /><stop offset=".6" stopColor="#1a1850" /><stop offset="1" stopColor="#0b0a2a" /></radialGradient>
        <radialGradient id={`${id}-g`}><stop offset="0" stopColor="#ffe9a8" stopOpacity=".85" /><stop offset=".4" stopColor="#ffb85a" stopOpacity=".28" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-gl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff0b8" /><stop offset="1" stopColor="#ffae48" /></linearGradient>
        <path id={`${id}-top`} d="M26,100 A74,74 0 0 1 174,100" />
        <path id={`${id}-bot`} d="M17,100 A83,83 0 0 0 183,100" />
      </defs>
      {/* the medallion: a brass ring with a beaded edge, and a dark field */}
      <circle cx="100" cy="100" r="98" fill="#2a1a08" opacity=".55" />
      <circle cx="100" cy="100" r="96" fill={`url(#${id}-b)`} stroke="#3a2408" strokeWidth="2" />
      <circle cx="100" cy="100" r="86.5" fill={`url(#${id}-b2)`} stroke="#3a2408" strokeWidth="1.4" />
      <g fill="#fff3c8" opacity=".85">{beads.map(([x, y], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="1.5" />)}</g>
      <g fill="#6f4814" opacity=".6">{beads.map(([x, y], i) => <circle key={i} cx={(x + 0.7).toFixed(1)} cy={(y + 0.8).toFixed(1)} r="1" />)}</g>
      <circle cx="100" cy="100" r="82" fill={`url(#${id}-f)`} stroke="#3a2408" strokeWidth="2.4" />
      <circle cx="100" cy="100" r="60.5" fill="none" stroke={`url(#${id}-b)`} strokeWidth="2.4" />
      <circle cx="100" cy="100" r="64" fill="none" stroke="#d9a441" strokeWidth=".8" strokeDasharray="1.2 3" opacity=".8" />
      {text ? (
        <g style={font} fontSize="14.5" fill="#f6e3b0" letterSpacing="3.4">
          <text><textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">LANTERNFELL</textPath></text>
          <text><textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle" fontSize="13">ACADEMY</textPath></text>
        </g>
      ) : null}
      <g fill="#ffe08a"><path d={star(21, 100, 5.4)} /><path d={star(179, 100, 5.4)} /></g>
      {/* the centre: rays, a lantern on its hook, an open book */}
      <circle cx="100" cy="94" r="46" fill={`url(#${id}-g)`} />
      <path d={rays.join(' ')} fill="#ffd98a" opacity=".42" />
      <g fill="#ffe08a" opacity=".9"><path d={star(74, 64, 4.2)} /><path d={star(126, 64, 4.2)} /><path d={star(100, 38, 3.4)} opacity=".8" /></g>
      <path d="M100,48 V63" stroke="#d9a441" strokeWidth="2.2" strokeLinecap="round" /><circle cx="100" cy="46" r="3.6" fill="none" stroke="#d9a441" strokeWidth="2" />
      <path d="M87,76 L113,76 L108,66 L92,66Z" fill="#d9a441" stroke="#3a2408" strokeWidth="1.6" strokeLinejoin="round" /><path d="M92,66 Q100,57 108,66Z" fill="#e8b84a" stroke="#3a2408" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="88" y="76" width="24" height="33" rx="3" fill={`url(#${id}-gl)`} stroke="#3a2408" strokeWidth="1.8" />
      <path d="M94,76 V109 M106,76 V109" stroke="#8a5f1f" strokeWidth="1.2" />
      <path d="M100,105 C94,99 96,92 100,86 C104,92 106,99 100,105Z" fill="#ff9a3c" /><path d="M100,104 C97,100 98,95 100,91 C102,95 103,100 100,104Z" fill="#fff6d0" />
      <path d="M85,109 H115 L111,115 H89Z" fill="#d9a441" stroke="#3a2408" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M62,126 C72,120 88,120 100,126 C112,120 128,120 138,126 V148 C128,142 112,142 100,148 C88,142 72,142 62,148Z" fill="#c9ab6a" stroke="#3a2408" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M100,126 C88,120 72,120 66,125 V145 C74,141 90,141 100,146Z" fill="#f4ead0" stroke="#3a2408" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M100,126 C112,120 128,120 134,125 V145 C126,141 110,141 100,146Z" fill="#e6d9b6" stroke="#3a2408" strokeWidth="1.2" strokeLinejoin="round" />
      <g stroke="#8a7650" strokeWidth="1.1" strokeLinecap="round" opacity=".8"><path d="M72,130 C80,128 88,128 94,131 M72,135 C80,133 88,133 94,136 M72,140 C78,138 84,138 90,140" /><path d="M106,131 C112,128 120,128 128,130 M106,136 C112,133 120,133 128,135 M110,141 C116,139 122,139 128,140" /></g>
      <path d="M100,146 V158 L96,154 L92,158 V146Z" fill="#c43d3d" stroke="#3a2408" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
