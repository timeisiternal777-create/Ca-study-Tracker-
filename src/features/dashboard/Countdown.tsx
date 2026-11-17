import { useEffect, useRef, type RefObject } from 'react';
import { examMoment } from '../../lib/date';

const pad = (n: number) => String(n).padStart(2, '0');
type Ref = RefObject<HTMLSpanElement | null>;

/** A changed number rolls: the old one lifts away while the new one rises into its place. Transform and opacity only. */
function roll(inEl: HTMLElement, outEl: HTMLElement | null, text: string) {
  const prev = inEl.textContent ?? '';
  if (prev === text) return;
  inEl.textContent = text;
  if (!inEl.dataset.ready) { inEl.dataset.ready = '1'; return; }
  // No roll while a sheet is open (data-sheet, see lib/ui.ts holdPage): behind a blurred sheet every frame of it would redo the blur, once a second for nothing anyone sees.
  if (!outEl || document.documentElement.dataset.motion === 'still' || document.documentElement.dataset.reduceMotion === 'true' || document.documentElement.hasAttribute('data-sheet')) return;
  outEl.textContent = prev;
  outEl.animate([{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: 0, transform: 'translate3d(0,-42%,0)' }], { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
  inEl.animate([{ opacity: 0, transform: 'translate3d(0,42%,0)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
}

/** Live countdown to 2 PM on the exam day. Ticks by writing text nodes directly: no React re-render per second. */
export function Countdown({ examDate }: { examDate: string }) {
  const refs = { d: useRef<HTMLSpanElement>(null), h: useRef<HTMLSpanElement>(null), m: useRef<HTMLSpanElement>(null), s: useRef<HTMLSpanElement>(null) };
  const outs = { d: useRef<HTMLSpanElement>(null), h: useRef<HTMLSpanElement>(null), m: useRef<HTMLSpanElement>(null), s: useRef<HTMLSpanElement>(null) };
  const target = examMoment(examDate).getTime();

  useEffect(() => {
    let timer = 0;
    const paint = () => {
      const diff = Math.max(0, target - Date.now());
      const total = Math.floor(diff / 1000);
      const set = (k: 'd' | 'h' | 'm' | 's', v: string) => { const el = refs[k].current; if (el) roll(el, outs[k].current, v); };
      set('d', String(Math.floor(total / 86400)));
      set('h', pad(Math.floor((total % 86400) / 3600)));
      set('m', pad(Math.floor((total % 3600) / 60)));
      set('s', pad(total % 60));
      timer = window.setTimeout(paint, 1000 - (Date.now() % 1000) + 5);
    };
    paint();
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const cell = (k: 'd' | 'h' | 'm' | 's', label: string, feature = false) => (
    <div className={feature ? 'cd-cell cd-cell--lead' : 'cd-cell'}>
      <span className="cd-num"><span ref={refs[k] as Ref} className="cd-in">00</span><span ref={outs[k] as Ref} className="cd-out" aria-hidden /></span>
      <span className="cd-lab">{label}</span>
    </div>
  );
  return (
    <div className="cd" role="timer" aria-label="Time until exam">
      {cell('d', 'days', true)}
      {cell('h', 'hours')}
      {cell('m', 'minutes')}
      {cell('s', 'seconds')}
    </div>
  );
}
