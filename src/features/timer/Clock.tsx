import { useState, type ReactNode } from 'react';
import type { Accent } from '../../types';
import type { TimerStatus } from '../../lib/timer';

const pad = (n: number) => String(n).padStart(2, '0');

/** One digit. When it changes, the new one rolls in from below and the old one rolls out above. */
function Roll({ ch }: { ch: string }) {
  const [st, setSt] = useState({ cur: ch, old: '', n: 0 });
  if (st.cur !== ch) setSt({ cur: ch, old: st.cur, n: st.n + 1 });
  return (
    <span className="roll" aria-hidden>
      <span key={st.n} className={st.n ? 'roll-in' : undefined}>{st.cur}</span>
      {st.old ? <span key={`o${st.n}`} className="roll-out">{st.old}</span> : null}
    </span>
  );
}

export function spoken(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return [h ? part(h, 'hour') : '', m ? part(m, 'minute') : '', !h ? part(s, 'second') : ''].filter(Boolean).join(' ');
}

/** 42:17 or 1:02:17, digits rolling. Tabular numerals keep it from jittering. */
export function ClockDigits({ seconds, live = true, className = '' }: { seconds: number; live?: boolean; className?: string }) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  const text = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return (
    <span className={`clk ${live ? 'is-live' : ''} ${className}`} data-len={text.length} role="timer" aria-live="off" aria-label={spoken(seconds)}>
      {[...text].map((c, i) => (c === ':' ? <i key={`${text.length}:${i}`} className="clk-colon" aria-hidden>:</i> : <Roll key={`${text.length}:${i}`} ch={c} />))}
    </span>
  );
}

/** One full turn takes 60 seconds of timer time. It starts at the right angle, then the browser turns it by itself. */
function Sweep({ seconds, running }: { seconds: number; running: boolean }) {
  const [phase] = useState(() => seconds % 60);
  return <i className="tdial-sweep" data-keep-time style={{ animationDelay: `-${phase}s`, animationPlayState: running ? 'running' : 'paused' }} aria-hidden />;
}

export const BLOCK_SECONDS = 25 * 60;

/**
 * The timer's face: a ring that fills over each 25 minute block, a comet that goes round once a minute, and the clock in the middle.
 * Only the comet and the soft glow move on their own, and both are transforms or opacity on layers that hold still pictures.
 */
export function TimerDial({ seconds, status, accent, size, top, bottom, children }: {
  seconds: number; status: TimerStatus; accent: Accent | 'brand'; size?: number; top?: ReactNode; bottom?: ReactNode; children?: ReactNode;
}) {
  const running = status === 'running';
  const blocks = Math.floor(seconds / BLOCK_SECONDS);
  const frac = (seconds % BLOCK_SECONDS) / BLOCK_SECONDS;
  const [first] = useState(blocks);
  const R = 90, C = 2 * Math.PI * R;
  return (
    <div className={`tdial acc-${accent}`} data-status={status} style={size ? { ['--s' as string]: `${size}px` } : undefined}>
      <i className="tdial-glow" aria-hidden />
      <svg className="tdial-svg" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="7" />
        <circle cx="100" cy="100" r="76" fill="none" stroke="rgb(190 205 255 / 0.2)" strokeWidth="4" strokeDasharray={`1.1 ${(2 * Math.PI * 76) / 60 - 1.1}`} strokeDashoffset="0.55" transform="rotate(-90 100 100)" />
        <circle cx="100" cy="100" r="76" fill="none" stroke="rgb(190 205 255 / 0.4)" strokeWidth="6" strokeDasharray={`1.8 ${(2 * Math.PI * 76) / 12 - 1.8}`} strokeDashoffset="0.9" transform="rotate(-90 100 100)" />
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--ac)" strokeOpacity="0.28" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 100 100)" />
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--ac)" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 100 100)" />
      </svg>
      <Sweep key={running ? 'run' : 'hold'} seconds={seconds} running={running} />
      {blocks > first ? <i key={blocks} className="tdial-pulse" aria-hidden /> : null}
      <div className="tdial-mid">
        {top ? <div className="tdial-top">{top}</div> : null}
        {children}
        {bottom ? <div className="tdial-bot">{bottom}</div> : null}
      </div>
    </div>
  );
}
