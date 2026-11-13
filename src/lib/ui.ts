import { useSyncExternalStore } from 'react';

// Which interface is showing: the iOS-style one (the default) or the classic one the app had before. It lives on
// `<html data-ui="ios|classic">`, so the stylesheet (styles/ios.css) and the components read the same switch.

export type UiMode = 'ios' | 'classic';

const read = (): UiMode => (typeof document !== 'undefined' && document.documentElement.getAttribute('data-ui') === 'classic' ? 'classic' : 'ios');

/** True while the iOS-style interface is showing. Safe to call anywhere (event handlers, effects). */
export const isIos = () => read() === 'ios';

/** Sets `<html data-ui>` before the first paint (index.html does the same earlier, from the saved settings). */
export function bootUi() {
  try {
    const s = JSON.parse(localStorage.getItem('ca_settings_v3') || '{}');
    document.documentElement.setAttribute('data-ui', s && s.ui === 'classic' ? 'classic' : 'ios');
  } catch { document.documentElement.setAttribute('data-ui', 'ios'); }
  // Safari only shows the pressed state (:active) on touch when a touch listener exists somewhere on the page.
  document.addEventListener('touchstart', () => undefined, { passive: true });
}

/** The interface in use, as a React hook. Reads `<html data-ui>`, so it also works outside the study provider. */
export function useUiMode(): UiMode {
  return useSyncExternalStore(
    (cb) => { const mo = new MutationObserver(cb); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ui'] }); return () => mo.disconnect(); },
    read,
    () => 'ios',
  );
}

/** True while the iOS-style interface is showing (hook version of `isIos`). */
export const useIos = () => useUiMode() === 'ios';
