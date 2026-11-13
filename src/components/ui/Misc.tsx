import { useLayoutEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { cn } from '../../lib/format';
import { useLevelConfig } from '../../context/LevelContext';
import { setPageTitle } from '../../lib/pageTitle';

export function EmptyState({ icon, title, children, action, accent }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode; accent?: string }) {
  return (
    <div className={cn('empty', accent && `acc-${accent}`)}>
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius, style }: { height?: number | string; width?: number | string; radius?: number; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} aria-hidden />;
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  // The top bar shows this title small once the large one has scrolled away. A layout effect, so a screen that replaces this one
  // clears the old title before it sets its own.
  const h1 = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const t = h1.current?.textContent?.trim();
    if (t) setPageTitle(t);
    return () => setPageTitle('');
  }, [title]);
  return (
    <div className="page-head">
      <div className="min-0">
        <h1 ref={h1}>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Callout({ icon, accent, children }: { icon?: ReactNode; accent?: string; children: ReactNode }) {
  return <div className={cn('callout', accent && `acc-${accent}`)}>{icon}<div>{children}</div></div>;
}

/** Short coloured subject code (AC, DT, FM…). */
export function SubjectTag({ name }: { name: string }) {
  const { getSubjectMetadata } = useLevelConfig();
  const m = getSubjectMetadata(name);
  return <span className={`abbr acc-${m.accent}`} title={name}>{m.abbrev}</span>;
}

/** Coloured dot + subject name. */
export function SubjectLabel({ name, className }: { name: string; className?: string }) {
  const { getSubjectMetadata } = useLevelConfig();
  const m = getSubjectMetadata(name);
  return <span className={cn('row g-2', `acc-${m.accent}`, className)}><span className="dot" /><span className="truncate">{name}</span></span>;
}
