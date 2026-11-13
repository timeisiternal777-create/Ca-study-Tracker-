import { useEffect, useLayoutEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { LuMinus, LuPlus } from 'react-icons/lu';
import { cn, clamp, fmtNum } from '../../lib/format';
import { penta, sfx } from '../../lib/sfx';
import { isIos } from '../../lib/ui';
import type { Accent } from '../../types';

/* ───────── Switch ───────── */
export function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; id?: string }) {
  // In the iOS interface the thumb can be dragged: it follows the finger, ticks as it crosses the middle, and settles on the nearer side.
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x0: number; id: number; moved: boolean; base: number; last: boolean } | null>(null);
  const swallowUntil = useRef(0);
  const TRAVEL = 20; // px the thumb moves between off and on

  // The state has caught up with the drop position, so the temporary offset is no longer needed (same frame, no jump).
  useLayoutEffect(() => { ref.current?.style.removeProperty('--f'); }, [checked]);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || !isIos() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { x0: e.clientX, id: e.pointerId, moved: false, base: checked ? TRAVEL : 0, last: checked };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current, el = ref.current;
    if (!d || !el || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 5) return;
      d.moved = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      el.setAttribute('data-drag', '');
      el.dataset.pv = d.last ? 'on' : 'off';
    }
    const pos = clamp(d.base + dx, 0, TRAVEL);
    el.style.setProperty('--f', String(pos / TRAVEL));
    const on = pos > TRAVEL / 2;
    if (on !== d.last) { d.last = on; el.dataset.pv = on ? 'on' : 'off'; sfx.haptic('select'); }
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const d = drag.current, el = ref.current;
    if (!d || !el || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.moved) return;
    swallowUntil.current = performance.now() + 300;
    el.removeAttribute('data-drag');
    el.removeAttribute('data-pv');
    const flip = !cancelled && d.last !== checked;
    if (flip) {
      // Spring on to the side it was dropped on; the layout effect above clears the position once the state has changed.
      el.style.setProperty('--f', d.last ? '1' : '0');
      sfx.play(d.last ? 'switchOn' : 'switchOff');
      onChange(d.last);
      window.setTimeout(() => el.style.removeProperty('--f'), 700); // in case the owner refused the change
    } else {
      el.style.removeProperty('--f');
    }
  };

  return (
    <button
      ref={ref} id={id} type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(e) => onPointerEnd(e, false)} onPointerCancel={(e) => onPointerEnd(e, true)}
      onClick={() => { if (performance.now() < swallowUntil.current) return; onChange(!checked); }}
    />
  );
}

/* ───────── Segmented control ───────── */
export interface SegOption<T extends string> { value: T; label: ReactNode; icon?: ReactNode }
export function Segmented<T extends string>({ value, options, onChange, block, label }: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; block?: boolean; label?: string }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={cn('seg', block && 'seg--block')} style={{ ['--n' as string]: options.length, ['--i' as string]: i }} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          <span className="row g-2 center">{o.icon}{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ───────── Chip ───────── */
export function Chip({ selected, accent, dot, children, className, ...rest }: { selected?: boolean; accent?: Accent | 'brand'; dot?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-pressed={selected} className={cn('chip', accent && `acc-${accent}`, className)} {...rest}>
      {dot ? <span className="dot" /> : null}
      {children}
    </button>
  );
}

export function Tag({ accent, children, size, className }: { accent?: Accent | 'brand' | 'good' | 'warn' | 'bad'; children: ReactNode; size?: 'lg'; className?: string }) {
  return <span className={cn('tag', accent && `acc-${accent}`, size === 'lg' && 'tag--lg', className)}>{children}</span>;
}

/* ───────── Form fields ───────── */
export function Field({ label, hint, error, right, children, className }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('field', className)}>
      {label ? <span className="field-label"><span>{label}</span>{right ? <span className="faint">{right}</span> : null}</span> : null}
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ icon, className, small, center, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; small?: boolean; center?: boolean }) {
  const input = <input className={cn('input', small && 'input--sm', center && 'input--center', className)} {...rest} />;
  return icon ? <div className="input-wrap">{icon}{input}</div> : input;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('select', className)} {...rest}>{children}</select>;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('textarea', className)} {...rest} />;
}

/** Native range input with a filled track. */
export function Range({ value, min, max, step = 1, onChange, label, accent }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; accent?: Accent }) {
  const p = ((clamp(value, min, max) - min) / (max - min)) * 100;
  return (
    <input
      type="range" className={cn('range', accent && `acc-${accent}`)} min={min} max={max} step={step} value={value} aria-label={label}
      style={{ ['--p' as string]: `${p}%`, ...(accent ? { ['--ac-fill' as string]: 'var(--ac)' } : null) }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/* ───────── Hour stepper (tap, or press and hold to repeat) ───────── */
export function Stepper({ value, onChange, min = 0, max = 16, step = 0.5, unit = 'h', label = 'hours' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; label?: string }) {
  const valRef = useRef(value); valRef.current = value;
  const cbRef = useRef(onChange); cbRef.current = onChange;
  const hold = useRef<{ t?: number; i?: number }>({});
  const stop = () => { window.clearTimeout(hold.current.t); window.clearInterval(hold.current.i); };
  useEffect(() => stop, []);
  const run = useRef(0);
  const bump = (dir: 1 | -1) => {
    const next = clamp(Math.round((valRef.current + dir * step) / step) * step, min, max);
    if (next === valRef.current) return;
    valRef.current = next; cbRef.current(next);
    // Holding the button climbs (or falls) a pentatonic scale, like a ratchet.
    sfx.play('step', { semitones: dir * penta(Math.min(run.current++, 7)) });
  };
  const start = (dir: 1 | -1) => (e: ReactPointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    run.current = 0;
    bump(dir);
    stop();
    hold.current.t = window.setTimeout(() => { hold.current.i = window.setInterval(() => bump(dir), 90); }, 380);
  };
  return (
    <div className="stepper" role="group" aria-label={label} data-sfx="none">
      <button type="button" className="stepper-btn" aria-label={`Decrease ${label}`} disabled={value <= min} onPointerDown={start(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(-1); } }}><LuMinus /></button>
      <span className="stepper-val" aria-live="polite">{fmtNum(value, 1)}<small>{unit}</small></span>
      <button type="button" className="stepper-btn" aria-label={`Increase ${label}`} disabled={value >= max} onPointerDown={start(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(1); } }}><LuPlus /></button>
    </div>
  );
}
