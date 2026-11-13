import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/format';
import type { Accent } from '../../types';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: Accent | 'brand' | 'good' | 'warn' | 'bad';
  /** Tint the border and background with the accent. */
  tinted?: boolean;
  /** Soft corner glow in the accent colour. */
  glow?: boolean;
  interactive?: boolean;
  size?: 'tight' | 'normal' | 'roomy' | 'flush';
}

export function Card({ accent, tinted, glow, interactive, size = 'normal', className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('card', accent && `acc-${accent}`, tinted && 'card--accent', glow && 'card--glow', interactive && 'card--interactive', size !== 'normal' && `card--${size}`, className)}
      {...(interactive ? { role: 'button', tabIndex: 0 } : {})}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, sub, action, icon }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card-head">
      <div className="row g-3 grow">
        {icon}
        <div className="min-0">
          <div className="card-title">{title}</div>
          {sub ? <div className="card-sub">{sub}</div> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
