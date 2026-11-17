import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LuX, LuTriangleAlert } from 'react-icons/lu';
import { cn } from '../../lib/format';
import { sfx } from '../../lib/sfx';
import { holdPage, popFrom, useIos } from '../../lib/ui';
import { useFocusTrap, useLockScroll } from '../../hooks/useDialog';
import { useSheetDrag } from '../../hooks/useSheetDrag';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: 'sm' | 'md' | 'wide' | 'xl';
  children?: ReactNode;
  footer?: ReactNode;
  /** Allow Esc / backdrop click to close (default true). */
  dismissible?: boolean;
  hideClose?: boolean;
  className?: string;
  /** Extra node rendered in the header, before the close button. */
  headerExtra?: ReactNode;
}

/**
 * Accessible dialog. In the iOS interface it is a sheet: it rises from the bottom, can be dragged down and flicked away, and the
 * dimmed backdrop follows it. In the classic interface it is the centred card (a bottom sheet on phones) it always was.
 */
export function Modal({ open, onClose, title, description, size = 'md', children, footer, dismissible = true, hideClose, className, headerExtra }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const flicked = useRef(false);
  const ios = useIos();

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); flicked.current = false; return; }
    if (!mounted) return;
    setClosing(true);
    // The iOS sheet takes longer to leave (it slides all the way down); a sheet already flicked away is gone at once.
    const t = window.setTimeout(() => { setMounted(false); setClosing(false); }, flicked.current ? 40 : ios ? 370 : 190);
    return () => window.clearTimeout(t);
  }, [open, mounted, ios]);

  // Opening and closing have their own sounds. They replace the sound of the button that was tapped.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open !== wasOpen.current) sfx.play(open ? 'open' : 'close');
    wasOpen.current = open;
  }, [open]);

  // The body tells the drag logic (and the stylesheet's touch-action) whether it has anything to scroll.
  useLayoutEffect(() => {
    const b = bodyRef.current;
    if (!b || !ios) return;
    let raf = 0;
    const update = () => { b.dataset.scroll = b.scrollHeight > b.clientHeight + 1 ? 'yes' : 'no'; };
    const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    const ro = new ResizeObserver(soon);
    ro.observe(b);
    const mo = new MutationObserver(soon);
    mo.observe(b, { childList: true, subtree: true, characterData: true });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); };
  }, [mounted, ios]);

  // A sheet on a wide screen springs out of the control that was pressed to open it: the stylesheet starts it from --from-x / --from-y.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!mounted || !el || !ios) return;
    const from = popFrom();
    if (from) { el.style.setProperty('--from-x', `${from.x}px`); el.style.setProperty('--from-y', `${from.y}px`); }
    else { el.style.removeProperty('--from-x'); el.style.removeProperty('--from-y'); }
  }, [mounted, ios]);

  useLockScroll(mounted);
  // The page behind a sheet stands still (lib/ui.ts holdPage): its loops would make the glass redo its blur on every frame.
  useEffect(() => (mounted && ios ? holdPage() : undefined), [mounted, ios]);
  useFocusTrap(ref, mounted && !closing, dismissible ? onClose : undefined);
  useSheetDrag({ sheet: ref, scrim: scrimRef, active: ios && mounted && !closing, dismissible, onDismiss: () => { flicked.current = true; onClose(); } });
  if (!mounted) return null;

  const titleId = 'modal-title-' + (typeof title === 'string' ? title.replace(/\W+/g, '-').toLowerCase() : 'dialog');
  return createPortal(
    <div
      ref={scrimRef}
      className="scrim"
      data-closing={closing ? (flicked.current ? 'drag' : 'true') : undefined}
      onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose(); }}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1} className={cn('modal', size !== 'md' && `modal--${size}`, className)}>
        <div className="modal-grab" aria-hidden="true" />
        {(title || !hideClose) && (
          <div className="modal-head">
            <div className="grow">
              {title ? <h2 id={titleId} className="modal-title">{title}</h2> : null}
              {description ? <p className="modal-desc">{description}</p> : null}
            </div>
            {headerExtra}
            {!hideClose && (
              <Button variant="ghost" size="sm" icon className="modal-close" onClick={onClose} aria-label="Close"><LuX /></Button>
            )}
          </div>
        )}
        <div ref={bodyRef} className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ───────── iOS alert: a small card with its buttons in a row ───────── */
function IosAlert({ open, title, body, cancelLabel, confirmLabel, danger, onCancel, onConfirm }: {
  open: boolean; title?: string; body?: ReactNode; cancelLabel: string; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => { setMounted(false); setClosing(false); }, 210);
    return () => window.clearTimeout(t);
  }, [open, mounted]);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open !== wasOpen.current) sfx.play(open ? 'open' : 'close');
    wasOpen.current = open;
  }, [open]);
  useLockScroll(mounted);
  useEffect(() => (mounted ? holdPage() : undefined), [mounted]);
  useFocusTrap(ref, mounted && !closing, onCancel);
  if (!mounted) return null;
  // A long label or a long message cannot share a row; stack the buttons the way iOS does.
  const stacked = cancelLabel.length + confirmLabel.length > 26;
  return createPortal(
    <div className="ios-alert-scrim" data-closing={closing || undefined}>
      <div ref={ref} className="ios-alert" role="alertdialog" aria-modal="true" aria-labelledby="ios-alert-title" aria-describedby={body ? 'ios-alert-msg' : undefined} tabIndex={-1}>
        <div className="ios-alert-body">
          <h2 id="ios-alert-title">{title}</h2>
          {body ? <div id="ios-alert-msg" className="ios-alert-msg">{body}</div> : null}
        </div>
        <div className={cn('ios-alert-actions', stacked && 'is-stacked')}>
          <button type="button" className={cn(danger && 'is-main')} onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={cn(danger ? 'is-danger' : 'is-main')} onClick={onConfirm} data-autofocus>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ───────── Promise-based confirm dialog ───────── */
export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
}
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);
  const [open, setOpen] = useState(false);
  const ios = useIos();
  const confirm = useCallback<ConfirmFn>((opts) => new Promise<boolean>((resolve) => { setState({ opts, resolve }); setOpen(true); }), []);
  const settle = (v: boolean) => { setOpen(false); state?.resolve(v); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {ios ? (
        <IosAlert
          open={open} title={state?.opts.title} body={state?.opts.body} danger={state?.opts.danger}
          cancelLabel={state?.opts.cancelLabel ?? 'Cancel'} confirmLabel={state?.opts.confirmLabel ?? 'Confirm'}
          onCancel={() => settle(false)} onConfirm={() => { if (state?.opts.danger) sfx.play('delete'); settle(true); }}
        />
      ) : (
        <Modal
          open={open} onClose={() => settle(false)} size="sm" hideClose title={state?.opts.title}
          footer={<>
            <Button variant="ghost" onClick={() => settle(false)}>{state?.opts.cancelLabel ?? 'Cancel'}</Button>
            <Button variant={state?.opts.danger ? 'danger-solid' : 'primary'} onClick={() => { if (state?.opts.danger) sfx.play('delete'); settle(true); }} data-autofocus>{state?.opts.confirmLabel ?? 'Confirm'}</Button>
          </>}
        >
          <div className="row g-3 items-start">
            {state?.opts.danger ? <span className="stat-icon acc-bad" style={{ flex: 'none' }}><LuTriangleAlert /></span> : null}
            <div className="t-small muted" style={{ lineHeight: 1.55, fontSize: 14.5 }}>{state?.opts.body}</div>
          </div>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const c = useContext(ConfirmCtx);
  if (!c) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return c;
}
