import { useId, type ReactNode } from 'react';
import './props.css';
import './cast/cast.css';
import { HOUSES, HOUSE_ORDER, type HouseId } from '../houses';
import { HouseCrest } from './crests';
import { Seal } from './seal';
import { darken, lighten, mix, rng } from './kit';

/**
 * The things in Lanternfell that are not buildings or people: the Choosing Lantern, the four wells, the Charter and the post lantern.
 * Plain SVG, with real text where there is text. Idle motion is CSS only (transform and opacity), see props.css.
 */

const INK = '#171c27';
const BRASS = '#d9a441'; const BRASS_LIT = '#ffe08a'; const BRASS_DK = '#8a5f1f';
const f1 = (n: number) => Math.round(n * 10) / 10;
const useUid = (prefix: string, given?: string) => { const u = useId().replace(/[^a-zA-Z0-9]/g, ''); return given ?? `${prefix}${u}`; };
const star = (x: number, y: number, s: number) => `M${x},${y - s} L${x + s * 0.28},${y - s * 0.28} L${x + s},${y} L${x + s * 0.28},${y + s * 0.28} L${x},${y + s} L${x - s * 0.28},${y + s * 0.28} L${x - s},${y} L${x - s * 0.28},${y - s * 0.28}Z`;
const fontHead = { fontFamily: "var(--font-head, 'Voyage Title'), Georgia, serif", fontWeight: 700 } as const;
const fontStory = { fontFamily: "var(--font-quote, 'Voyage Story'), Georgia, serif", fontStyle: 'italic' } as const;

// ───────────────────────────── the Choosing Lantern ─────────────────────────────
/** The lantern the Choosing is held under. With no house it burns plain gold; once a house has chosen, the glass and its motes take that house's colour. */
export function ChoosingLantern({ size = 220, house, lit = true, idPrefix, still }: { size?: number; house?: HouseId; lit?: boolean; idPrefix?: string; still?: boolean }) {
  const id = useUid('cl', idPrefix);
  const hc = house ? HOUSES[house].colors : null;
  const glassTop = !lit ? '#2a2e5a' : hc ? lighten(hc.main, 0.5) : '#fff0b8';
  const glassBot = !lit ? '#15183c' : hc ? mix(hc.main, '#ffae48', 0.3) : '#ffae48';
  const glow = !lit ? '#000000' : hc ? lighten(hc.main, 0.42) : '#ffc86a';
  const motes = HOUSE_ORDER.map((h) => lighten(HOUSES[h].colors.main, 0.38));
  const links = Array.from({ length: 7 }, (_, i) => i);
  const rivets = (y: number, x0: number, x1: number, n: number) => Array.from({ length: n }, (_, i) => <circle key={i} cx={f1(x0 + ((x1 - x0) * i) / (n - 1))} cy={y} r="1.5" fill={BRASS_LIT} stroke={BRASS_DK} strokeWidth=".6" />);
  return (
    <svg className={`pr pr--lantern${still ? ' is-still' : ''}`} viewBox="0 0 220 320" width={size} height={(size * 320) / 220} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-cu`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f0a56a" /><stop offset=".45" stopColor="#c4733f" /><stop offset="1" stopColor="#6b3418" /></linearGradient>
        <linearGradient id={`${id}-br`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffe9a8" /><stop offset=".5" stopColor="#d9a441" /><stop offset="1" stopColor="#7a5018" /></linearGradient>
        <linearGradient id={`${id}-gl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={glassTop} /><stop offset="1" stopColor={glassBot} /></linearGradient>
        <linearGradient id={`${id}-gs`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset="1" stopColor="#0b0a2a" stopOpacity=".42" /></linearGradient>
        <radialGradient id={`${id}-halo`}><stop offset="0" stopColor={glow} stopOpacity=".7" /><stop offset=".4" stopColor={glow} stopOpacity=".22" /><stop offset="1" stopColor={glow} stopOpacity="0" /></radialGradient>
        <clipPath id={`${id}-cage`}><path d="M56,122 L82,118 H138 L164,122 V218 H56Z" /></clipPath>
      </defs>
      {/* the chain it hangs from */}
      <g fill="none">{links.map((i) => <g key={i}><ellipse cx="110" cy={f1(2 + i * 7.6)} rx={i % 2 ? 2.6 : 4.6} ry="5.2" stroke={INK} strokeWidth="4" /><ellipse cx="110" cy={f1(2 + i * 7.6)} rx={i % 2 ? 2.6 : 4.6} ry="5.2" stroke={BRASS} strokeWidth="2" /></g>)}</g>
      <circle cx="110" cy="52" r="8" fill="none" stroke={INK} strokeWidth="5" /><circle cx="110" cy="52" r="8" fill="none" stroke={`url(#${id}-br)`} strokeWidth="2.8" />
      <circle cx="110" cy="64" r="5.4" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="2" />
      {/* the copper cap, in panels, with a brass band and four small house shields */}
      <path d="M46,114 C46,84 78,68 110,64 C142,68 174,84 174,114Z" fill={`url(#${id}-cu)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <g stroke="#6b3418" strokeWidth="1.4" fill="none" opacity=".7" strokeLinecap="round"><path d="M110,64 L76,114 M110,64 L94,114 M110,64 L110,114 M110,64 L126,114 M110,64 L144,114" /></g>
      <path d="M62,92 C72,80 90,72 104,69" stroke="#fff" strokeWidth="3" strokeOpacity=".4" fill="none" strokeLinecap="round" />
      <path d="M156,92 C150,82 138,74 128,70" stroke="#05041a" strokeWidth="6" strokeOpacity=".16" fill="none" strokeLinecap="round" />
      <path d="M52,100 C70,88 90,82 110,80" stroke="#6ac0a8" strokeWidth="2" fill="none" opacity=".55" strokeLinecap="round" strokeDasharray="1 6" />
      <rect x="42" y="112" width="136" height="12" rx="3.5" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="2.2" />
      {rivets(118, 50, 170, 11)}
      {HOUSE_ORDER.map((h, i) => <g key={h} transform={`translate(${f1(60 + i * 34)} 88) scale(.78)`}><HouseCrest house={h} size={20} idPrefix={`${id}h${i}`} /></g>)}
      {/* the cage: a hexagon seen from one corner, three glass faces between brass posts */}
      <g clipPath={`url(#${id}-cage)`}>
        <path d="M56,122 L82,118 V218 H56Z" fill={`url(#${id}-gl)`} /><path d="M138,118 L164,122 V218 H138Z" fill={`url(#${id}-gl)`} /><rect x="82" y="118" width="56" height="100" fill={`url(#${id}-gl)`} />
        <path d="M56,122 L82,118 V218 H56Z" fill={`url(#${id}-gs)`} /><path d="M138,118 L164,122 V218 H138Z" fill={`url(#${id}-gs)`} opacity=".9" />
        <circle className="ac-glow" cx="110" cy="176" r="70" fill={`url(#${id}-halo)`} />
      </g>
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".5" fill="none"><path d="M90,128 V168" /><path d="M90,176 V182" /><path d="M64,132 V160" /></g>
      <rect x="53" y="118" width="6" height="104" rx="2" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.8" /><rect x="79" y="116" width="6" height="106" rx="2" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.8" />
      <rect x="135" y="116" width="6" height="106" rx="2" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.8" /><rect x="161" y="118" width="6" height="104" rx="2" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.8" />
      <rect x="53" y="168" width="114" height="5" rx="2" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.6" />
      {/* the flame, and four motes in the houses' colours that circle it */}
      {lit ? (
        <g>
          <g className="ac-flame">
            <path d="M110,214 C88,196 95,170 110,142 C125,170 132,196 110,214Z" fill="#ff8f2e" />
            <path d="M110,212 C95,198 100,178 110,158 C120,178 125,198 110,212Z" fill="#ffd36a" />
            <path d="M110,210 C102,200 105,188 110,176 C115,188 118,200 110,210Z" fill="#fff6d0" />
          </g>
          {motes.map((c, i) => <g key={i} className={`ac-mote ac-mote--${i}`}><circle r="7" fill={c} opacity=".28" /><circle r="3.4" fill={c} stroke="#fff" strokeWidth="1" /><circle r="1.2" cx="-1" cy="-1" fill="#fff" /></g>)}
        </g>
      ) : <path d="M110,214 C96,200 100,184 110,170 C120,184 124,200 110,214Z" fill="#0d0f2c" opacity=".7" />}
      <path d="M96,216 H124 L120,222 H100Z" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      {/* base band, bowl, pendants */}
      <rect x="50" y="218" width="120" height="13" rx="3.5" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="2.2" />
      {rivets(224.5, 58, 162, 11)}
      <path d="M62,231 Q110,282 158,231Z" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <g stroke={BRASS_DK} strokeWidth="1.3" fill="none" opacity=".75" strokeLinecap="round"><path d="M76,234 Q110,262 144,234" /><path d="M92,240 Q110,252 128,240" /><path d="M110,232 V262" /></g>
      <path d="M72,238 Q80,252 94,258" stroke="#fff" strokeWidth="2.6" strokeOpacity=".45" fill="none" strokeLinecap="round" />
      {[84, 102, 118, 136].map((x, i) => (
        <g key={x} className={`ac-pend ac-pend--${i}`}><path d={`M${x},${f1(240 + Math.abs(x - 110) * -0.1)} V${262 + (i % 2) * 8}`} stroke={INK} strokeWidth="3.6" strokeLinecap="round" /><path d={`M${x},${f1(240 + Math.abs(x - 110) * -0.1)} V${262 + (i % 2) * 8}`} stroke={BRASS} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx={x} cy={265 + (i % 2) * 8} r="4.4" fill={motes[i]} stroke={INK} strokeWidth="1.6" /><circle cx={x - 1.4} cy={263.6 + (i % 2) * 8} r="1.3" fill="#fff" opacity=".8" /></g>
      ))}
      <path d="M110,262 L103,282 Q110,296 117,282Z" fill={`url(#${id}-br)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M108,270 L106,280" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

// ───────────────────────────── the four wells ─────────────────────────────
interface VesselDef { outline: string; top: number; bottom: number; interiorClip: string }
const VESSELS: Record<HouseId, VesselDef> = {
  wolf: { outline: 'M46,32 H74 Q76,32 76,36 V140 Q76,144 72,144 H48 Q44,144 44,140 V36 Q44,32 46,32Z', interiorClip: 'M48,36 H72 V140 H48Z', top: 36, bottom: 140 },
  heron: { outline: 'M55,38 L49,32 H71 L65,38 V92 C88,96 92,130 78,142 C70,148 50,148 42,142 C28,130 32,96 55,92Z', interiorClip: 'M55,38 H65 V92 C88,96 92,130 78,142 C70,148 50,148 42,142 C28,130 32,96 55,92Z', top: 38, bottom: 146 },
  fox: { outline: 'M52,34 H68 V62 L98,128 Q102,144 86,144 H34 Q18,144 22,128 L52,62Z', interiorClip: 'M52,34 H68 V62 L98,128 Q102,144 86,144 H34 Q18,144 22,128 L52,62Z', top: 34, bottom: 144 },
  bear: { outline: 'M30,84 Q30,72 42,72 H78 Q90,72 90,84 V134 Q90,146 78,146 H42 Q30,146 30,134Z', interiorClip: 'M32,84 Q32,74 42,74 H78 Q88,74 88,84 V134 Q88,144 78,144 H42 Q32,144 32,134Z', top: 74, bottom: 144 },
};
const LIQUID: Record<HouseId, [string, string, string]> = {
  wolf: ['#8fb2f0', '#4a72c4', '#1f3a78'], heron: ['#7fe0d4', '#2fa59c', '#12615e'], fox: ['#ffb36a', '#e8683a', '#9a2a1c'], bear: ['#ffd36a', '#e9a02c', '#a8641a'],
};

/** A glass vessel on a stone plinth that fills as the student's measured virtue grows. `level` is 0 to 1. Each house keeps its own kind of vessel. */
export function Well({ house, level, size = 120, idPrefix, still }: { house: HouseId; level: number; size?: number; idPrefix?: string; still?: boolean }) {
  const id = useUid('wl', idPrefix);
  const v = VESSELS[house]; const [l0, l1, l2] = LIQUID[house]; const hc = HOUSES[house].colors;
  const lv = Math.max(0, Math.min(1, level));
  const y = v.bottom - (v.bottom - v.top) * lv;
  const wavePath = `M-60,${f1(y)} ${Array.from({ length: 12 }, () => 'q10,-3.6 20,0 t20,0').join(' ')} V200 H-60Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const extra: ReactNode = (() => {
    if (house === 'wolf') return (
      <>
        <g fill="#fff" opacity=".85">{[[54, 118], [66, 104], [58, 92], [68, 126], [52, 100]].map(([x, yy], i) => (yy > y + 3 ? <path key={i} d={star(x, yy, 2.6)} /> : null))}</g>
        <g className="ac-bubble ac-bubble--0"><circle cx="58" cy="136" r="1.8" fill="#fff" opacity=".7" /></g><g className="ac-bubble ac-bubble--1"><circle cx="66" cy="136" r="1.3" fill="#fff" opacity=".7" /></g>
      </>
    );
    if (house === 'heron') return (
      <>
        <g className="ac-ripple"><ellipse cx="60" cy={f1(y)} rx="11" ry="3" fill="none" stroke="#fff" strokeWidth="1" opacity=".5" /></g>
        <g fill="#fff" opacity=".5"><circle cx="50" cy="124" r="2" /><circle cx="72" cy="118" r="1.4" /><circle cx="58" cy="132" r="1.2" /></g>
      </>
    );
    if (house === 'fox') return (
      <>
        <g className="ac-bubble ac-bubble--0"><circle cx="58" cy="132" r="2" fill="#ffe3a0" /></g><g className="ac-bubble ac-bubble--1"><circle cx="68" cy="134" r="1.5" fill="#ffe3a0" /></g><g className="ac-bubble ac-bubble--2"><circle cx="48" cy="136" r="1.3" fill="#ffe3a0" /></g>
      </>
    );
    return (
      <>
        <g fill="none" stroke="#fff" strokeWidth=".9" opacity=".3">{[[44, 100], [58, 108], [72, 100], [51, 118], [65, 120], [79, 114], [44, 128], [58, 134], [72, 130]].map(([x, yy], i) => <path key={i} d={`M${x + 6},${yy} l-3,5.2 h-6 l-3,-5.2 l3,-5.2 h6Z`} />)}</g>
        <g className="ac-bubble ac-bubble--0"><circle cx="54" cy="138" r="1.8" fill="#fff3c0" opacity=".8" /></g>
      </>
    );
  })();
  return (
    <svg className={`pr pr--well${still ? ' is-still' : ''}`} viewBox="0 0 120 190" width={size} height={(size * 190) / 120} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-lq`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={l0} /><stop offset=".5" stopColor={l1} /><stop offset="1" stopColor={l2} /></linearGradient>
        <linearGradient id={`${id}-gl`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset=".35" stopColor="#fff" stopOpacity=".05" /><stop offset="1" stopColor="#0b0a2a" stopOpacity=".3" /></linearGradient>
        <radialGradient id={`${id}-aura`}><stop offset="0" stopColor={l1} stopOpacity=".55" /><stop offset="1" stopColor={l1} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-st`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6f6cae" /><stop offset=".5" stopColor="#4a4780" /><stop offset="1" stopColor="#25234f" /></linearGradient>
        <linearGradient id={`${id}-fe`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7b7f9c" /><stop offset=".5" stopColor="#4a4e66" /><stop offset="1" stopColor="#262a3e" /></linearGradient>
        <clipPath id={`${id}-in`}><path d={v.interiorClip} /></clipPath>
      </defs>
      <circle cx="60" cy="96" r="58" fill={`url(#${id}-aura)`} opacity={f1(0.15 + 0.7 * lv)} />
      {/* reeds behind the heron's flask */}
      {house === 'heron' ? (
        <g fill="none" stroke="#1d4a3c" strokeLinecap="round"><path d="M22,150 C18,110 28,80 24,52" strokeWidth="2" /><path d="M30,152 C32,120 38,96 40,70" strokeWidth="1.8" /><path d="M98,150 C102,112 92,84 98,56" strokeWidth="2" /><path d="M90,152 C88,122 82,100 82,74" strokeWidth="1.8" />
          <g fill="#5a3a24" stroke="#2a1a10" strokeWidth="1"><rect x="21" y="44" width="6" height="14" rx="3" /><rect x="95" y="48" width="6" height="14" rx="3" /></g></g>
      ) : null}
      {/* the vessel */}
      <g clipPath={`url(#${id}-in)`}>
        <rect x="0" y="0" width="120" height="190" fill="#0d0b2b" opacity=".35" />
        {lv > 0.005 ? <g><rect x="0" y={f1(y)} width="120" height="160" fill={`url(#${id}-lq)`} /><g className="ac-wave"><path d={wavePath} fill={l0} opacity=".9" /></g><rect x="0" y={f1(y + 4)} width="120" height="160" fill={`url(#${id}-lq)`} opacity=".92" />{extra}</g> : null}
      </g>
      <path d={v.outline} fill={`url(#${id}-gl)`} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d={v.outline} fill="none" stroke="#dbe7ff" strokeWidth="1" opacity=".35" strokeLinejoin="round" transform="translate(-1 -1)" />
      {/* what is special about each vessel */}
      {house === 'wolf' ? (
        <g>
          {[28, 84, 138].map((yy, i) => <g key={yy}><rect x="41" y={yy} width="38" height={i === 1 ? 6 : 9} rx="2" fill={`url(#${id}-fe)`} stroke={INK} strokeWidth="1.8" /><circle cx="46" cy={yy + (i === 1 ? 3 : 4.5)} r="1.3" fill="#9aa0bf" /><circle cx="74" cy={yy + (i === 1 ? 3 : 4.5)} r="1.3" fill="#9aa0bf" /></g>)}
          <path d="M44,28 L60,14 L76,28Z" fill={`url(#${id}-fe)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" /><circle cx="60" cy="12" r="3.2" fill="none" stroke={INK} strokeWidth="2.6" /><circle cx="60" cy="12" r="3.2" fill="none" stroke="#9aa0bf" strokeWidth="1.2" />
          <path d="M50,32 L48,30 M70,32 L72,30" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
          <g fill="#fff" opacity=".8"><path d={star(40, 42, 2.4)} /><path d={star(80, 56, 2)} /></g>
        </g>
      ) : null}
      {house === 'heron' ? (
        <g>
          <path d="M49,32 H71" stroke={INK} strokeWidth="4" strokeLinecap="round" /><path d="M49,32 H71" stroke={hc.metal} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M51,50 H69 M52,66 H68 M52,80 H68" stroke="#fff" strokeWidth=".8" opacity=".25" />
          <path d="M44,118 C40,104 46,96 55,94" stroke="#fff" strokeWidth="2.6" strokeOpacity=".45" fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      {house === 'fox' ? (
        <g>
          <rect x="51" y="26" width="18" height="11" rx="2.4" fill="#c79a62" stroke={INK} strokeWidth="2" /><path d="M54,29 H66 M54,33 H64" stroke="#8a5f30" strokeWidth="1" opacity=".7" />
          <rect x="50" y="50" width="20" height="6" rx="2" fill={`url(#${id}-fe)`} stroke={INK} strokeWidth="1.6" />
          <path d="M62,28 C70,16 82,10 92,4 C88,14 82,22 70,30Z" fill="#fbf5e4" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /><path d="M64,28 C72,20 80,14 90,6" stroke="#b9a98a" strokeWidth="1" fill="none" />
          <path d="M30,126 C28,134 30,138 36,140" stroke="#fff" strokeWidth="2.6" strokeOpacity=".45" fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      {house === 'bear' ? (
        <g>
          {[88, 126].map((yy) => <path key={yy} d={`M30,${yy} Q60,${yy + 5} 90,${yy}`} stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />)}
          {[88, 126].map((yy) => <path key={yy} d={`M30,${yy} Q60,${yy + 5} 90,${yy}`} stroke="#7a5230" strokeWidth="3.4" fill="none" strokeLinecap="round" />)}
          <path d="M42,72 H78" stroke={INK} strokeWidth="5" strokeLinecap="round" /><path d="M42,72 H78" stroke="#a8764a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M78,74 C86,84 82,92 84,100 C86,106 80,108 80,102 C80,94 76,88 74,80Z" fill={l0} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M92,60 L66,108" stroke={INK} strokeWidth="6.4" strokeLinecap="round" /><path d="M92,60 L66,108" stroke="#a8764a" strokeWidth="3.4" strokeLinecap="round" />
          <ellipse cx="62" cy="114" rx="7.4" ry="4.4" transform="rotate(-62 62 114)" fill="#a8764a" stroke={INK} strokeWidth="1.8" /><path d="M58,111 l6,6 M60,108 l7,7" stroke="#6a4222" strokeWidth="1" opacity=".7" />
          <path d="M36,128 C34,134 36,138 40,140" stroke="#fff" strokeWidth="2.4" strokeOpacity=".45" fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      {/* the scale */}
      <g stroke="#dbe7ff" strokeLinecap="round" opacity=".55">{ticks.map((t, i) => { const yy = v.bottom - (v.bottom - v.top) * t; return <path key={i} d={`M${i % 2 ? 12 : 8},${f1(yy)} H20`} strokeWidth={i % 2 ? 1 : 1.6} />; })}</g>
      {/* the plinth, with the house's crest */}
      <path d="M12,154 H108 L104,162 H16Z" fill={`url(#${id}-st)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M12,154 H108" stroke="#c9c6ff" strokeWidth="1.4" opacity=".4" />
      <path d="M18,162 H102 V188 H18Z" fill={`url(#${id}-st)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M18,174 H102 M44,162 V174 M76,162 V174 M30,174 V188 M62,174 V188 M90,174 V188" stroke="#14123a" strokeWidth="1.2" opacity=".6" />
      <g transform="translate(46 160)"><HouseCrest house={house} size={22} idPrefix={`${id}c`} /></g>
    </svg>
  );
}

// ───────────────────────────── the Charter ─────────────────────────────
/** The Charter Night scroll. The words on it are real text, so the name and the lines can be changed in any vector tool. */
export function Charter({ name = 'Your name', house, size = 420, idPrefix, lines }: { name?: string; house?: HouseId; size?: number; idPrefix?: string; lines?: [string, string, string] }) {
  const id = useUid('ch', idPrefix);
  const wax = house ? HOUSES[house].colors.main : '#a82b2b'; const waxLit = lighten(wax, 0.28); const waxDk = darken(wax, 0.35); const ribbon = house ? HOUSES[house].colors.main : '#a82b2b';
  const r = rng(12);
  const fibres = Array.from({ length: 34 }, () => ({ x: 56 + r() * 330, y: 46 + r() * 220, w: 14 + r() * 40, c: (r() - 0.5) * 6 }));
  const body = lines ?? ['has kept the lantern lit through the Lower Court,', 'the Upper Grounds and the High Keep, and is named', 'a Lantern-Warden of Lanternfell.'];
  return (
    <svg className="pr pr--charter" viewBox="0 0 440 310" width={size} height={(size * 310) / 440} role="img" aria-label={`The Lanternfell Charter, signed ${name}`}>
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6e9c4" /><stop offset=".6" stopColor="#ecd9a8" /><stop offset="1" stopColor="#d9bf86" /></linearGradient>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9efd0" /><stop offset=".5" stopColor="#e2cc98" /><stop offset="1" stopColor="#a98e58" /></linearGradient>
        <radialGradient id={`${id}-age`} cx=".5" cy=".5" r=".75"><stop offset=".55" stopColor="#8a6a2a" stopOpacity="0" /><stop offset="1" stopColor="#8a6a2a" stopOpacity=".4" /></radialGradient>
        <radialGradient id={`${id}-wx`} cx=".36" cy=".3" r=".9"><stop offset="0" stopColor={waxLit} /><stop offset=".6" stopColor={wax} /><stop offset="1" stopColor={waxDk} /></radialGradient>
      </defs>
      <ellipse cx="220" cy="296" rx="190" ry="8" fill="#000" opacity=".28" />
      {/* the sheet */}
      <rect x="42" y="26" width="356" height="258" fill={`url(#${id}-p)`} stroke="#6f5320" strokeWidth="1.6" />
      <rect x="42" y="26" width="356" height="258" fill={`url(#${id}-age)`} />
      <g stroke="#9b7d3c" strokeWidth=".9" strokeLinecap="round" fill="none" opacity=".4">{fibres.map((p, i) => <path key={i} d={`M${f1(p.x)},${f1(p.y)} q${f1(p.w / 2)},${f1(p.c)} ${f1(p.w)},0`} />)}</g>
      <g fill="#8a6a2a" opacity=".12"><ellipse cx="96" cy="236" rx="30" ry="16" /><ellipse cx="352" cy="64" rx="22" ry="12" /></g>
      <rect x="56" y="40" width="328" height="230" fill="none" stroke="#7a5a22" strokeWidth="2.2" /><rect x="62" y="46" width="316" height="218" fill="none" stroke="#7a5a22" strokeWidth=".8" />
      {[[56, 40, 1, 1], [384, 40, -1, 1], [56, 270, 1, -1], [384, 270, -1, -1]].map(([x, y, sx, sy], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke="#7a5a22" strokeWidth="1.4" strokeLinecap="round"><path d="M0,22 C0,8 8,0 22,0" /><path d="M8,22 C8,14 14,8 22,8" /><circle cx="13" cy="13" r="2" fill="#7a5a22" /></g>
      ))}
      {/* the words */}
      <g transform="translate(194 52)"><Seal size={52} text={false} idPrefix={`${id}s`} /></g>
      <text x="220" y="124" textAnchor="middle" fontSize="17" fill="#3a2a10" letterSpacing="1.8" style={fontHead}>THE LANTERNFELL CHARTER</text>
      <path d="M136,133 H304" stroke="#7a5a22" strokeWidth="1" /><path d={star(220, 133, 4)} fill="#7a5a22" />
      <text x="220" y="155" textAnchor="middle" fontSize="13.4" fill="#4a3a1a" style={fontStory}>Be it known that</text>
      <text x="220" y="186" textAnchor="middle" fontSize="30" fill="#1f2a6a" style={fontStory}>{name}</text>
      <path d="M124,194 H316" stroke="#7a5a22" strokeWidth=".9" strokeDasharray="1.6 3" />
      <text x="220" y="207" textAnchor="middle" fontSize="12" fill="#4a3a1a" style={fontStory}>{body[0]}</text>
      <text x="220" y="220" textAnchor="middle" fontSize="12" fill="#4a3a1a" style={fontStory}>{body[1]}</text>
      <text x="220" y="233" textAnchor="middle" fontSize="12" fill="#4a3a1a" style={fontStory}>{body[2]}</text>
      <path d="M86,252 H186" stroke="#4a3a1a" strokeWidth=".9" /><text x="136" y="261" textAnchor="middle" fontSize="8.6" fill="#6a5a3a" style={fontStory}>Headmistress Vane</text>
      <path d="M92,250 C98,243 104,252 110,245 C114,242 118,249 124,245 C128,242 134,250 142,245 C146,243 150,247 158,244" stroke="#1f2a6a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* the two rolls */}
      {[10, 274].map((y) => (
        <g key={y}>
          <rect x="24" y={y} width="392" height="26" rx="13" fill={`url(#${id}-r)`} stroke="#6f5320" strokeWidth="1.8" />
          <path d={`M44,${y + 7} H396`} stroke="#fff" strokeWidth="2" opacity=".4" strokeLinecap="round" />
          {[24, 416].map((x) => <g key={x}><ellipse cx={x} cy={y + 13} rx="9" ry="13" fill="#d8c18a" stroke="#6f5320" strokeWidth="1.8" /><path d={`M${x},${y + 13} m0,-1 a2.4,3.2 0 1 1 -.1,0 a5,7 0 1 1 .2,0`} stroke="#7a5a22" strokeWidth="1" fill="none" /></g>)}
        </g>
      ))}
      {/* the ribbon hangs over the lower roll, and the wax seal is pressed where it is tied */}
      <path d="M330,262 L316,300 L326,294 L333,304 L342,266Z" fill={ribbon} stroke={darken(ribbon, 0.4)} strokeWidth="1.4" strokeLinejoin="round" /><path d="M344,262 L356,302 L347,295 L339,304 L333,266Z" fill={darken(ribbon, 0.18)} stroke={darken(ribbon, 0.4)} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="338" cy="246" r="20" fill={`url(#${id}-wx)`} stroke={waxDk} strokeWidth="1.6" />
      {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <circle key={i} cx={f1(338 + Math.cos(a) * 19.6)} cy={f1(246 + Math.sin(a) * 19.6)} r="2.8" fill={`url(#${id}-wx)`} />; })}
      <circle cx="338" cy="246" r="14" fill="none" stroke={waxDk} strokeWidth="1.3" opacity=".7" /><circle cx="338" cy="246" r="14" fill="none" stroke={waxLit} strokeWidth=".8" opacity=".5" transform="translate(-.6 -.6)" />
      <g transform="translate(338 246) scale(.78) translate(-328 -236)"><g fill={waxDk} opacity=".85"><path d="M327,222 h2 v4 h-2z M321,227 h14 l-2,-3 h-10z" /><rect x="322" y="227" width="12" height="14" rx="2" fill="none" stroke={waxDk} strokeWidth="1.8" /><path d="M328,240 c-3,-3 -2,-6 0,-9 c2,3 3,6 0,9z" /></g></g>
      <path d="M327,234 C330,230 334,228 339,228" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".35" fill="none" />
    </svg>
  );
}

// ───────────────────────────── the post lantern ─────────────────────────────
/** A paper lantern that brings the day's letter: it bobs, its light breathes, and the letter swings a little under it. */
export function PostLantern({ size = 110, letter = true, idPrefix, still, color = '#c43d3d' }: { size?: number; letter?: boolean; idPrefix?: string; still?: boolean; color?: string }) {
  const id = useUid('pl', idPrefix);
  return (
    <svg className={`pr pr--post${still ? ' is-still' : ''}`} viewBox="0 0 120 200" width={size} height={(size * 200) / 120} aria-hidden focusable="false">
      <defs>
        <radialGradient id={`${id}-pp`} cx=".5" cy=".5" r=".62"><stop offset="0" stopColor="#fff3c0" /><stop offset=".5" stopColor="#ffc15a" /><stop offset="1" stopColor="#e2682c" /></radialGradient>
        <radialGradient id={`${id}-halo`}><stop offset="0" stopColor="#ffd27a" stopOpacity=".7" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" /></radialGradient>
        <clipPath id={`${id}-body`}><path d="M42,36 C16,54 16,108 42,126 H78 C104,108 104,54 78,36Z" /></clipPath>
      </defs>
      <g className="ac-bob">
        <circle className="ac-glow" cx="60" cy="82" r="62" fill={`url(#${id}-halo)`} />
        <path d="M60,0 V24" stroke={INK} strokeWidth="3.4" strokeLinecap="round" /><path d="M60,0 V24" stroke="#c9ab6a" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="42" y="24" width="36" height="12" rx="4.4" fill="#4a2e1c" stroke={INK} strokeWidth="2" /><path d="M46,28 H74" stroke="#8a5a3c" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="60" cy="22" r="3.4" fill="#4a2e1c" stroke={INK} strokeWidth="1.8" />
        <path d="M42,36 C16,54 16,108 42,126 H78 C104,108 104,54 78,36Z" fill={`url(#${id}-pp)`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <g clipPath={`url(#${id}-body)`}>
          <g stroke="#a8431a" strokeWidth="1.4" fill="none" opacity=".6" strokeLinecap="round"><path d="M60,32 V130" /><path d="M50,32 C34,60 34,100 50,130" /><path d="M70,32 C86,60 86,100 70,130" /><path d="M38,34 C14,62 14,100 38,130" /><path d="M82,34 C106,62 106,100 82,130" /></g>
          <g stroke="#a8431a" strokeWidth="1.2" fill="none" opacity=".5"><path d="M14,64 Q60,76 106,64" /><path d="M14,98 Q60,110 106,98" /></g>
          <g fill="#b3461c" opacity=".55"><path d={star(46, 74, 4.6)} /><path d={star(76, 92, 4)} /><path d={star(64, 60, 3.2)} /><path d="M52,100 a6,6 0 1 0 5,8 a4.6,4.6 0 1 1 -5,-8Z" /></g>
          <path d="M60,108 C50,98 53,86 60,74 C67,86 70,98 60,108Z" fill="#b9511f" opacity=".5" /><path d="M60,106 C54,98 56,90 60,82 C64,90 66,98 60,106Z" fill="#fff6d0" opacity=".85" />
          <path d="M28,60 C24,76 26,92 34,106" stroke="#fff" strokeWidth="4" strokeOpacity=".4" fill="none" strokeLinecap="round" />
        </g>
        <rect x="42" y="126" width="36" height="9" rx="3.6" fill="#4a2e1c" stroke={INK} strokeWidth="2" />
        <path d="M60,135 V142" stroke={color} strokeWidth="3" strokeLinecap="round" /><circle cx="60" cy="146" r="4.6" fill={color} stroke={INK} strokeWidth="1.8" />
        <path d="M60,150 l-5,14 M60,150 l-1.6,16 M60,150 l1.6,16 M60,150 l5,14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {letter ? (
          <g className="ac-letter">
            <path d="M60,150 V166" stroke="#c9ab6a" strokeWidth="1.4" />
            <g transform="rotate(-8 60 166)">
              <rect x="34" y="162" width="52" height="32" rx="3" fill="#f6ecd0" stroke={INK} strokeWidth="2" />
              <path d="M34,164 L60,182 L86,164" stroke="#a9966a" strokeWidth="1.4" fill="none" strokeLinejoin="round" /><path d="M34,192 L52,176 M86,192 L68,176" stroke="#c9b88a" strokeWidth="1" />
              <circle cx="60" cy="180" r="7.4" fill={color} stroke={darken(color, 0.4)} strokeWidth="1.4" /><path d={star(60, 180, 3.8)} fill={lighten(color, 0.5)} />
            </g>
          </g>
        ) : null}
      </g>
    </svg>
  );
}
