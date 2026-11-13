import { useSyncExternalStore } from 'react';

/** Registers the service worker in production builds only (never in `npm run dev`). */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || (window as unknown as { __DEV__?: boolean }).__DEV__) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) window.dispatchEvent(new Event('ca_update_ready'));
        });
      });
    }).catch(() => { /* offline support is optional */ });
  });
}

/* ---------- install prompt ---------- */
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferredInstall: InstallEvent | null = null;
let installed = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
const installSubs = new Set<() => void>();
let installSnap = { canInstall: false, installed };
const refreshInstall = () => { installSnap = { canInstall: !!deferredInstall && !installed, installed }; installSubs.forEach((f) => f()); };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e as InstallEvent; refreshInstall(); });
  window.addEventListener('appinstalled', () => { installed = true; deferredInstall = null; refreshInstall(); });
  refreshInstall();
}

/** Whether the browser is offering to install the app, and a way to trigger that offer. */
export function useInstall() {
  const snap = useSyncExternalStore((cb) => { installSubs.add(cb); return () => { installSubs.delete(cb); }; }, () => installSnap, () => installSnap);
  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredInstall) return 'unavailable';
    const ev = deferredInstall;
    try { await ev.prompt(); const { outcome } = await ev.userChoice; deferredInstall = null; refreshInstall(); return outcome; } catch { return 'unavailable'; }
  };
  return { ...snap, install };
}
