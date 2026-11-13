import { useEffect, useId, useState, type ReactNode } from 'react';
import type { Accent } from '../types';
import './RadarDial.css';

export interface Blip { id: string; angle: number; radius: number; accent: Accent }

/** Deterministic angle (deg) for a string, so a subject keeps its place on the dial. */
export function angleFor(key: string): number {
  let h = 2166136261;
  for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 3600) / 10;
}

const C = 200;
const circ = (r: number) => 2 * Math.PI * r;

/**
 * The app's signature dial: a clock bezel, a goal-progress arc, a slowly sweeping radar beam
 * (a single transformed layer, so it costs almost nothing) and one blip per subject studied today.
 */
export function RadarDial({ progress, size = 300, blips = [], sweep = true, children, className }: {
  progress: number; size?: number; blips?: Blip[]; sweep?: boolean; children?: ReactNode; className?: string;
}) {
  const id = useId();
  const [p, setP] = useState(0);
  useEffect(() => { const f = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, progress)))); return () => cancelAnimationFrame(f); }, [progress]);
  const rArc = 166;
  const rBezel = 188;
  return (
    <div className={`radar ${className ?? ''}`} style={{ width: size, height: size }}>
      {sweep ? <div className="radar-sweep" aria-hidden /> : null}
      <svg viewBox="0 0 400 400" width={size} height={size} aria-hidden className="radar-svg">
        <defs>
          <linearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--a)" /><stop offset="1" stopColor="var(--a2)" /></linearGradient>
        </defs>
        {/* bezel: 120 minor ticks, 12 major ticks */}
        <circle cx={C} cy={C} r={rBezel} fill="none" stroke="rgb(150 170 255 / 0.2)" strokeWidth="9" strokeDasharray={`1.5 ${circ(rBezel) / 120 - 1.5}`} strokeDashoffset="0.75" transform={`rotate(-90 ${C} ${C})`} />
        <circle cx={C} cy={C} r={rBezel} fill="none" stroke="rgb(190 205 255 / 0.5)" strokeWidth="13" strokeDasharray={`2.4 ${circ(rBezel) / 12 - 2.4}`} strokeDashoffset="1.2" transform={`rotate(-90 ${C} ${C})`} />
        {/* range rings + crosshair */}
        {[134, 100, 66].map((r) => <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="rgb(150 170 255 / 0.1)" strokeWidth="1.2" />)}
        <path d={`M${C} 30V370M30 ${C}H370`} stroke="rgb(150 170 255 / 0.08)" strokeWidth="1.2" />
        {/* progress arc */}
        <circle cx={C} cy={C} r={rArc} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="10" />
        <circle cx={C} cy={C} r={rArc} fill="none" stroke={`url(#${id}-arc)`} strokeOpacity=".22" strokeWidth="20" strokeLinecap="round" strokeDasharray={circ(rArc)} strokeDashoffset={circ(rArc) * (1 - p)} transform={`rotate(-90 ${C} ${C})`} className="radar-arc" />
        <circle cx={C} cy={C} r={rArc} fill="none" stroke={`url(#${id}-arc)`} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ(rArc)} strokeDashoffset={circ(rArc) * (1 - p)} transform={`rotate(-90 ${C} ${C})`} className="radar-arc" />
        {/* blips */}
        {blips.map((b) => {
          const a = ((b.angle - 90) * Math.PI) / 180;
          const x = C + Math.cos(a) * b.radius * 132; const y = C + Math.sin(a) * b.radius * 132;
          return (
            <g key={b.id} className={`acc-${b.accent}`}>
              <circle cx={x} cy={y} r="7" fill="var(--ac)" fillOpacity=".25" className="radar-ping" style={{ transformOrigin: `${x}px ${y}px` }} />
              <circle cx={x} cy={y} r="4.5" fill="var(--ac)" />
            </g>
          );
        })}
      </svg>
      {children ? <div className="radar-center">{children}</div> : null}
    </div>
  );
}
