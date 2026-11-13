import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn, clamp } from '../../lib/format';
import type { Accent } from '../../types';

export function ProgressBar({ value, accent, size, className, label, live }: { value: number; accent?: Accent | 'brand' | 'good' | 'warn' | 'bad'; size?: 'thin' | 'thick'; className?: string; label?: string; /** Light flows through the bar. For the one or two bars that matter right now. */ live?: boolean }) {
  const v = clamp(value, 0, 100);
  return (
    <div className={cn('bar', size && `bar--${size}`, live && 'bar--live', accent && `acc-${accent}`, className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label}>
      <i style={{ ['--v' as string]: v / 100 } as CSSProperties} />
    </div>
  );
}

/** Circular progress. `value` is 0–100. Children render in the centre. */
export function Ring({ value, size = 96, stroke = 8, accent, children, className, track = true }: { value: number; size?: number; stroke?: number; accent?: Accent | 'brand' | 'good' | 'warn' | 'bad'; children?: ReactNode; className?: string; track?: boolean }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value, 0, 100);
  return (
    <div className={cn('ring', accent && `acc-${accent}`, className)} style={{ width: size, height: size, position: 'relative', flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--ac, var(--a))" />
            <stop offset="1" stopColor="var(--ac2, var(--ac, var(--a2)))" />
          </linearGradient>
        </defs>
        {track ? <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} /> : null}
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 1100ms var(--ease)' }}
        />
      </svg>
      {children ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div> : null}
    </div>
  );
}

/** Smooth mini line chart. Colour comes from `currentColor`. */
export function Sparkline({ values, height = 32, className, area = true, min, max, strokeWidth = 2 }: { values: number[]; height?: number; className?: string; area?: boolean; min?: number; max?: number; strokeWidth?: number }) {
  const id = useId();
  if (values.length < 2) return <div className={className} style={{ height }} />;
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  const W = 100; const H = 30; const pad = 3;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - pad - ((v - lo) / span) * (H - pad * 2)] as const);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient>
      </defs>
      {area ? <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} /> : null}
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
