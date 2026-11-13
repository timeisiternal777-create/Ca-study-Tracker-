import { useId } from 'react';
import { IsleScene } from './isles/Isle';
import { ShipDetail } from './ships';
import { MoonArt } from './scenery';

const STARS: Array<[number, number, number]> = [[12, 10, 1], [30, 22, .8], [52, 8, 1.1], [74, 18, .8], [96, 9, 1], [112, 27, .7], [146, 40, .8], [20, 40, .7]];
const PATCHES = [{ accent: 'cyan' as const, done: true }, { accent: 'gold' as const, done: true }, { accent: 'violet' as const, done: false }, { accent: 'ember' as const, done: false }];

/** The picture on the Ledger Seas card in Settings: the real island, ship and moon, drawn small. */
export default function VoyagePickerArt() {
  const u = `p${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <span className="wp-art" aria-hidden>
      <svg viewBox="0 0 160 96">
        <defs>
          <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#050f18" /><stop offset="1" stopColor="#0b3140" /></linearGradient>
          <linearGradient id={`${u}sea`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d4a5c" /><stop offset="1" stopColor="#06222d" /></linearGradient>
        </defs>
        <rect width="160" height="96" fill={`url(#${u}sky)`} />
        {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity=".8" />)}
        <MoonArt id={`${u}m`} cx={134} cy={19} r={9} />
        <rect y="54" width="160" height="42" fill={`url(#${u}sea)`} />
        <path d="M0 54H160" stroke="#9fe4dd" strokeOpacity=".28" strokeWidth=".8" />
        <path d="M8 74q8-3.4 16 0t16 0M70 88q8-3.4 16 0t16 0M122 70q8-3.4 16 0t16 0M44 84q6-2.6 12 0t12 0" stroke="#a0e8e2" strokeOpacity=".3" strokeWidth="1.1" strokeLinecap="round" />
        <g transform="translate(42 62) scale(.36)"><IsleScene kind="counting" seed={3} litCount={4} total={6} cleared={false} /></g>
        <g transform="translate(118 80) scale(.3)"><ShipDetail cls="brigantine" patches={PATCHES} /></g>
      </svg>
    </span>
  );
}
