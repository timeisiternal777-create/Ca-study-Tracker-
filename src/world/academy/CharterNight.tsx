import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { LuFileText, LuX } from 'react-icons/lu';
import './ceremony.css';
import { useFocusTrap, useLockScroll } from '../../hooks/useDialog';
import { burst, flare } from '../../lib/fx';
import { fmtHM } from '../../lib/format';
import { sfx } from '../../lib/sfx';
import type { Expr } from '../crew/types';
import { Cast } from './art/cast/Cast';
import { CAST, type CastId, type StudentLook } from './art/cast/types';
import { darken, mix, rng } from './art/kit';
import { Charter } from './art/props';
import { CastleScene, Fireflies } from './art/scene';
import { HOUSES, type HouseId } from './houses';

const LINES: { who: Exclude<CastId, 'student' | 'reed'> | 'reed'; expr: Expr; text: string }[] = [
  { who: 'reed', expr: 'grin', text: 'Every trial sat, every paper faced. I have nothing left to warn you about.' },
  { who: 'bellweather', expr: 'smile', text: 'Entered in the school record, in ink that does not fade.' },
  { who: 'vane', expr: 'proud', text: 'The old lantern has never burned this steady. Welcome, Warden.' },
  { who: 'madge', expr: 'cheer', text: 'Your window stays lit. I will see to that myself.' },
];
const GOLDS = ['#ffd77a', '#ffe9a8', '#f2b84a', '#fff3cc'];

/** The paper lanterns that rise over the school: where each starts, how big, how slowly it climbs, and its colour. */
function useLanterns(house: HouseId | null) {
  return useMemo(() => {
    const r = rng(40);
    // A hint of the house colour, warmed toward candle light so every lantern still reads as lit from inside.
    const tints = (house ? [HOUSES[house].colors.metal, HOUSES[house].colors.light, '#ffcf78', '#ffe0a0'] : ['#ffcf78', '#ffe0a0', '#ffb860', '#ffd98a']).map((c) => mix(c, '#ffc15e', 0.42));
    // Half are already in the air when the night opens; the rest are let go from the grass over the first few seconds.
    const list = Array.from({ length: 28 }, (_, i) => {
      const dur = 17 + r() * 15;
      return { x: 3 + r() * 94, s: 0.62 + r() * 0.95, dur, delay: i % 2 ? -r() * dur : 0.4 + r() * 6, sway: 3 + r() * 3.4, amp: 10 + r() * 22, rest: 6 + r() * 66, k: i % tints.length };
    });
    return { tints, list };
  }, [house]);
}

/**
 * Charter Night, the ending of Lanternfell: paper lanterns rise over the school, the Charter is sealed in the student's name, and the four
 * teachers say their piece. Everything animates with transform and opacity, and the resting state is the finished picture, which is also what
 * shows when motion is set to "still". Nothing here is automatic: the student chose to mark CA Final as cleared, so the night only plays then.
 */
export function CharterNight({ name, house, look, totalHours, onClose, onRecord }: { name: string; house: HouseId | null; look: StudentLook; totalHours: number; onClose: () => void; onRecord?: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { tints, list: lanterns } = useLanterns(house);
  const gid = useId().replace(/:/g, '');
  useLockScroll(true);
  useFocusTrap(root, true, onClose);

  useEffect(() => {
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const still = document.documentElement.getAttribute('data-motion') === 'still';
    sfx.play('rank');
    if (!still) {
      later(1500, () => {
        sfx.play('goal');
        const r = seal.current?.getBoundingClientRect();
        if (r) burst(r.left + r.width * 0.5, r.top + r.height * 0.5, { count: 18, power: 1.7, colors: GOLDS });
        flare();
      });
      later(3300, () => sfx.play('week'));
      later(5600, () => sfx.play('badge'));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const hc = house ? HOUSES[house].colors : null;
  return createPortal(
    // Portalled to the body: the page has a view-transition name, which would make a fixed overlay relative to the page instead of the screen.
    <div ref={root} className="cn" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
      style={hc ? ({ ['--hc' as string]: hc.main, ['--hm' as string]: hc.metal } as CSSProperties) : undefined}>
      <div className="cn-scene" aria-hidden><CastleScene id="cnn" flags={false} /><Fireflies n={22} seed={9} /></div>
      <div className="cn-sky" aria-hidden>
        {/* One soft glow and one lit-from-inside paper gradient per colour, shared by every lantern (they are drawn once, then only moved). */}
        <svg width="0" height="0" style={{ position: 'absolute' }} focusable="false">
          <defs>
            {tints.map((t, k) => (
              <g key={k}>
                <radialGradient id={`${gid}h${k}`}><stop offset="0" stopColor={t} stopOpacity=".55" /><stop offset=".45" stopColor={t} stopOpacity=".18" /><stop offset="1" stopColor={t} stopOpacity="0" /></radialGradient>
                <radialGradient id={`${gid}b${k}`} cx=".5" cy=".62" r=".62"><stop offset="0" stopColor="#fff8d8" /><stop offset=".5" stopColor={t} /><stop offset="1" stopColor={darken(t, 0.32)} /></radialGradient>
              </g>
            ))}
          </defs>
        </svg>
        {lanterns.map((l, i) => (
          <span key={i} className="cn-lan" style={{ ['--x' as string]: `${l.x}%`, ['--s' as string]: l.s, ['--dur' as string]: `${l.dur}s`, ['--dl' as string]: `${l.delay}s`, ['--rest' as string]: `${l.rest}%` } as CSSProperties}>
            <span className="cn-lan-in" style={{ ['--sw' as string]: `${l.sway}s`, ['--amp' as string]: `${l.amp}px` } as CSSProperties}>
              <svg viewBox="-20 -52 40 62" width="40" height="62" focusable="false">
                <circle cy="-22" r="36" fill={`url(#${gid}h${l.k})`} />
                <path d="M0,-50 V-38" stroke="#2a1808" strokeWidth="1.6" />
                <path d="M-7,-38 h14 l-2,-4.5 h-10z" fill="#c8993a" stroke="#2a1808" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M-13,-24 C-13,-36 -7,-38 0,-38 C7,-38 13,-36 13,-24 C13,-11 7,-6 0,-6 C-7,-6 -13,-11 -13,-24Z" fill={`url(#${gid}b${l.k})`} stroke="#2a1808" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M0,-38 V-6 M-7.4,-36 C-10.4,-27 -10.4,-16 -7.4,-8 M7.4,-36 C10.4,-27 10.4,-16 7.4,-8" stroke="#a8601f" strokeWidth="1" fill="none" opacity=".7" />
                <ellipse cx="-4" cy="-26" rx="3" ry="8" fill="#fff" opacity=".35" />
                <path d="M-6,-4 h12 l-1.6,3.4 h-8.8z" fill="#c8993a" stroke="#2a1808" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        ))}
      </div>

      <button type="button" className="cn-x" onClick={onClose} aria-label="Close Charter Night"><LuX /></button>

      <div className="cn-stage">
        <header className="cn-copy">
          <h2 id={titleId} className="cn-title">Charter Night</h2>
          <p className="cn-sub">{name}, you cleared CA Final.</p>
          <p className="cn-stats"><span>{fmtHM(totalHours)} studied</span>{house ? <span>{HOUSES[house].name}</span> : null}</p>
        </header>

        <div className="cn-charter">
          <div ref={seal} className="cn-seal" aria-hidden />
          <Charter name={name} house={house ?? undefined} size={560} idPrefix="cnc" />
        </div>

        <div className="cn-cast">
          {LINES.slice(0, 2).map((l, i) => <Pal key={l.who} i={i} who={l.who} expr={l.expr} text={l.text} />)}
          <div className="cn-pal cn-pal--you" style={{ ['--i' as string]: 2 } as CSSProperties}>
            <div className="cn-head"><Cast who="student" expr="cheer" size={150} look={look} house={house ?? undefined} title="You" /></div>
            <b>You</b>
          </div>
          {LINES.slice(2).map((l, i) => <Pal key={l.who} i={i + 3} who={l.who} expr={l.expr} text={l.text} />)}
        </div>

        <div className="cn-acts">
          <button type="button" className="cho-btn cho-btn--main" onClick={onClose} data-autofocus>Continue</button>
          {onRecord ? <button type="button" className="cho-btn" onClick={onRecord}><LuFileText />School record (PDF)</button> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Pal({ i, who, expr, text }: { i: number; who: CastId; expr: Expr; text: string }) {
  return (
    <div className="cn-pal" style={{ ['--i' as string]: i } as CSSProperties}>
      <p className="cn-say">{text}</p>
      <div className="cn-head"><Cast who={who} expr={expr} size={116} title={`${CAST[who].name}, ${CAST[who].role}`} /></div>
      <b>{CAST[who].name}</b>
    </div>
  );
}
