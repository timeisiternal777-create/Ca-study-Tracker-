import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { LuCircleCheck, LuInfo, LuTriangleAlert, LuCircleX } from 'react-icons/lu';
import { sfx } from '../../lib/sfx';
import { useIos } from '../../lib/ui';
import { useSwipeAway } from '../../hooks/useSwipeAway';
import { Button } from './Button';

export interface ToastOptions {
  message: string;
  sub?: string;
  tone?: 'good' | 'warn' | 'bad' | 'info';
  action?: { label: string; onClick: () => void };
  /** ms; 0 = sticky */
  duration?: number;
}
interface ToastItem extends ToastOptions { id: number; closing?: boolean }

const Ctx = createContext<((o: ToastOptions | string) => number) | null>(null);

const icon = (t: ToastItem['tone']) => (t === 'good' ? <LuCircleCheck /> : t === 'bad' ? <LuCircleX /> : t === 'warn' ? <LuTriangleAlert /> : <LuInfo />);

/** One toast. In the iOS interface it can be swiped away (sideways or down) and stays while a finger is on it. */
function ToastCard({ t, dismiss, remove, hold }: { t: ToastItem; dismiss: (id: number) => void; remove: (id: number) => void; hold: (id: number, on: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const ios = useIos();
  useSwipeAway(ref, { active: ios && !t.closing, onGone: () => remove(t.id), onHold: (on) => hold(t.id, on) });
  return (
    <div ref={ref} className={`toast acc-${t.tone === 'good' ? 'good' : t.tone === 'bad' ? 'bad' : t.tone === 'warn' ? 'warn' : 'brand'}`} data-closing={t.closing || undefined}>
      <span className="toast-icon">{icon(t.tone)}</span>
      <div className="grow">
        <div className="toast-msg">{t.message}</div>
        {t.sub ? <div className="toast-sub">{t.sub}</div> : null}
      </div>
      {t.action ? <Button size="sm" variant="soft" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</Button> : null}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const held = useRef(new Set<number>());
  const hold = useCallback((id: number, on: boolean) => { if (on) held.current.add(id); else held.current.delete(id); }, []);
  const remove = useCallback((id: number) => { held.current.delete(id); setItems((l) => l.filter((t) => t.id !== id)); }, []);

  const dismiss = useCallback((id: number) => {
    // Not from under a finger: wait until it has let go.
    if (held.current.has(id)) { window.setTimeout(() => dismiss(id), 700); return; }
    setItems((l) => l.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 210);
  }, []);

  const toast = useCallback((o: ToastOptions | string) => {
    const opts = typeof o === 'string' ? { message: o } : o;
    const id = ++seq.current;
    sfx.play(opts.tone === 'good' ? 'toastGood' : opts.tone === 'bad' ? 'toastBad' : opts.tone === 'warn' ? 'toastWarn' : 'toastInfo');
    setItems((l) => [...l.slice(-2), { ...opts, id }]);
    const duration = opts.duration ?? (opts.action ? 6500 : 3600);
    if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => toast, [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <ToastCard key={t.id} t={t} dismiss={dismiss} remove={remove} hold={hold} />)}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside <ToastProvider>');
  return c;
}
