import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/format';
import type { Accent } from '../../types';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'soft' | 'ghost' | 'danger' | 'danger-solid';
  size?: 'sm' | 'md' | 'lg';
  icon?: boolean;
  block?: boolean;
  loading?: boolean;
  /** Subject accent for `soft` buttons. */
  accent?: Accent;
  children?: ReactNode;
}

export function Button({ variant = 'default', size = 'md', icon, block, loading, accent, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('btn', variant !== 'default' && `btn--${variant}`, size !== 'md' && `btn--${size}`, icon && 'btn--icon', block && 'btn--block', accent && `acc-${accent}`, className)}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}
