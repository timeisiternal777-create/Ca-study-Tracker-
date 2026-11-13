import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheck } from 'react-icons/lu';
import { Blip } from '../../components/blip/Blip';
import { navigateTo } from '../../lib/nav';
import { sfx } from '../../lib/sfx';
import { TOUR, type TourStep } from './tourSteps';

interface Rect { x: number; y: number; w: number; h: number }

const PAD = 10;
const GAP = 18;
const MARGIN = 14;

/** The first visible element that matches. A hidden one (like the bottom bar on a desktop) is skipped. */
function pick(selector?: string): HTMLElement | null {
  if (!selector) return null;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 2 && r.height > 2) return el;
  }
  return null;
}

function place(step: TourStep, rect: Rect | null, card: { w: number; h: number }, vw: number, vh: number): { x: number; y: number } {
  const center = { x: (vw - card.w) / 2, y: Math.max(MARGIN, (vh - card.h) / 2) };
  if (!rect) return center;
  const clampX = (x: number) => Math.min(Math.max(MARGIN, x), vw - card.w - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(MARGIN, y), vh - card.h - MARGIN);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const below = { x: clampX(cx - card.w / 2), y: rect.y + rect.h + GAP + 36 };
  const above = { x: clampX(cx - card.w / 2), y: rect.y - GAP - card.h };
  const right = { x: rect.x + rect.w + GAP + 8, y: clampY(cy - card.h / 2) };
  const left = { x: rect.x - GAP - card.w, y: clampY(cy - card.h / 2) };
  const fitsBelow = below.y + card.h <= vh - MARGIN;
  const fitsAbove = above.y >= MARGIN + 40;
  const fitsRight = right.x + card.w <= vw - MARGIN;
  const fitsLeft = left.x >= MARGIN;
  const tall = rect.h > vh * 0.55;
  const narrow = rect.w < 340;
  const want = step.place ?? 'auto';
  if (want === 'below' && fitsBelow) return below;
  if (want === 'above' && fitsAbove) return above;
  if (want === 'right' && fitsRight) return right;
  if (tall && narrow && fitsRight) return right;
  if (tall && narrow && fitsLeft) return left;
  if (!tall && fitsBelow) return below;
  if (!tall && fitsAbove) return above;
  if (fitsRight) return right;
  if (fitsLeft) return left;
  // The target is too big to go around: sit at the bottom edge, over it.
  return { x: center.x, y: vh - card.h - MARGIN };
}

export function Tour({ startAt = 0, onClose }: { startAt?: number; onClose: (finished: boolean) => void }) {
  const [i, setI] = useState(startAt);
  const step = TOUR[i];
  const last = i === TOUR.length - 1;
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [card, setCard] = useState({ w: 380, h: 220 });
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const scrolledFor = useRef('');

  // Open the right screen for this step.
  useEffect(() => { navigateTo(step.tab); scrolledFor.current = ''; }, [step.tab, step.id]);

  // Follow the target, frame by frame. It can move while a screen loads or the page scrolls.
  useEffect(() => {
    let raf = 0;
    let stop = false;
    const loop = () => {
      if (stop) return;
      const el = pick(step.target);
      if (el) {
        if (scrolledFor.current !== step.id) {
          scrolledFor.current = step.id;
          const r0 = el.getBoundingClientRect();
          if (r0.top < 70 || r0.bottom > window.innerHeight - 20) el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
        const r = el.getBoundingClientRect();
        setRect((p) => (p && Math.abs(p.x - (r.left - PAD)) < 0.5 && Math.abs(p.y - (r.top - PAD)) < 0.5 && Math.abs(p.w - (r.width + PAD * 2)) < 0.5 && Math.abs(p.h - (r.height + PAD * 2)) < 0.5 ? p : { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }));
      } else setRect((p) => (p === null ? p : null));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { stop = true; cancelAnimationFrame(raf); };
  }, [step.id, step.target]);

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCard((p) => (Math.abs(p.w - el.offsetWidth) < 1 && Math.abs(p.h - el.offsetHeight) < 1 ? p : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [i]);

  // The first position is set without animation, so the card does not fly in from the corner.
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true))); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, [i]);

  const go = useCallback((d: 1 | -1) => {
    if (d === 1 && last) { sfx.play('tourDone'); onClose(true); return; }
    sfx.play(d === 1 ? 'tourNext' : 'tourBack');
    setI((v) => Math.min(TOUR.length - 1, Math.max(0, v + d)));
  }, [last, onClose]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go, onClose]);

  const cw = Math.min(392, vp.w - MARGIN * 2);
  const pos = place(step, rect, { w: Math.min(card.w, cw), h: card.h }, vp.w, vp.h);
  const hole = rect ?? { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0 };
  const blipX = rect && pos.y < rect.y ? 'right' : 'left';

  return (
    <div className={`tour${ready ? ' is-ready' : ''}`} role="dialog" aria-modal="true" aria-label={`Tour, step ${i + 1} of ${TOUR.length}: ${step.title}`}>
      <div className="tour-hole" style={{ width: hole.w, height: hole.h, transform: `translate(${hole.x}px, ${hole.y}px)`, opacity: rect ? 1 : 0 }} />
      <div className="tour-card" ref={cardRef} style={{ width: cw, transform: `translate(${pos.x}px, ${pos.y}px)` }}>
        <div className={`tour-blip is-${blipX}`} key={step.id}><Blip mood={step.mood} size={78} /></div>
        <div className="tour-steps" aria-hidden>{TOUR.map((s, k) => <i key={s.id} className={k < i ? 'is-done' : k === i ? 'is-cur' : ''} />)}</div>
        <div className="tour-text" key={`t-${step.id}`} aria-live="polite">
          <h2>{step.title}</h2>
          <p>{step.body}</p>
        </div>
        <div className="tour-foot">
          <button type="button" className="tour-skip" onClick={() => onClose(false)}>{last ? 'Close' : 'Skip tour'}</button>
          <span className="tour-count t-num">{i + 1} of {TOUR.length}</span>
          <div className="row g-2">
            {i > 0 ? <button type="button" className="tour-btn" onClick={() => go(-1)} aria-label="Previous step"><LuArrowLeft aria-hidden /></button> : null}
            <button type="button" ref={nextRef} className="tour-btn is-primary" onClick={() => go(1)}>{last ? <>Finish<LuCheck aria-hidden /></> : <>Next<LuArrowRight aria-hidden /></>}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
