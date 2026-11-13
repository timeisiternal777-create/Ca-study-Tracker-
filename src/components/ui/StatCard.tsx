import type { ReactNode } from 'react';
import { LuCircleHelp } from 'react-icons/lu';
import { Card } from './Card';
import { CountUp } from './CountUp';
import type { Accent } from '../../types';

/** Big-number tile used on the overview and rewards screens. */
export function StatCard({ label, value, decimals = 0, unit, icon, accent = 'cyan', foot, onHelp, children, locale, live }: {
  label: string; value: number; decimals?: number; unit?: string; icon: ReactNode; accent?: Accent | 'brand' | 'good' | 'warn' | 'bad';
  foot?: ReactNode; onHelp?: () => void; children?: ReactNode; locale?: boolean;
  /** The icon has a little life of its own: a flickering flame, a heartbeat, a slow spin or a twinkle. */
  live?: 'flame' | 'pulse' | 'spin' | 'shine';
}) {
  return (
    <Card accent={accent} glow className={live ? `stat stat--${live}` : 'stat'}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="row g-2">
          {onHelp ? <button type="button" className="help-btn" onClick={onHelp} aria-label={`How ${label.toLowerCase()} works`}><LuCircleHelp /></button> : null}
          <span className="stat-icon">{icon}</span>
        </div>
      </div>
      <div>
        <span className="stat-value"><CountUp value={value} decimals={decimals} locale={locale} /></span>
        {unit ? <span className="stat-unit">{unit}</span> : null}
      </div>
      {children}
      {foot ? <div className="stat-foot">{foot}</div> : null}
    </Card>
  );
}
