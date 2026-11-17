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
  // Where the last press was, so a sheet that opens because of it can spring out of that spot (see popFrom).
  document.addEventListener('pointerdown', (e) => { lastPress = { x: e.clientX, y: e.clientY, at: performance.now() }; }, { passive: true, capture: true });
}

let lastPress: { x: number; y: number; at: number } | null = null;

/**
 * Where a sheet that has just opened should start from: how far, in pixels, the control that was pressed is from the middle of the screen, scaled
 * down so the sheet only leans towards it. Null when nothing was pressed in the last second (a sheet opened by the keyboard or by the app itself).
 */
export function popFrom(): { x: number; y: number } | null {
  if (!lastPress || performance.now() - lastPress.at > 1000 || typeof window === 'undefined') return null;
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const dx = lastPress.x - window.innerWidth / 2, dy = lastPress.y - window.innerHeight / 2;
  return { x: Math.round(clamp(dx * 0.32, window.innerWidth * 0.2)), y: Math.round(clamp(dy * 0.32, window.innerHeight * 0.2)) };
}

const held = new Set<Animation>();
let holds = 0;
const OVERLAYS = '.scrim, .ios-alert-scrim, .toasts';

function stillIfLoop(a: Animation) {
  const fx = a.effect;
  if (a.playState !== 'running' || !fx || fx.getTiming().iterations !== Infinity) return;
  const target = fx instanceof KeyframeEffect ? fx.target : null;
  if (target?.closest(OVERLAYS)) return;
  a.pause();
  held.add(a);
}
/** A loop that starts while the sheet is open (the mascot reacting to what you pressed, say) is held the moment it starts. */
const onStart = (e: Event) => { if (e.target instanceof Element) for (const a of e.target.getAnimations({ subtree: true })) stillIfLoop(a); };

/**
 * Call when a sheet or an alert opens, and call what it returns when that has gone. While one is open the page behind it is dimmed and still, and nobody is
 * watching the loops that run there (the mascot breathing, the radar, the flame). They are paused, which matters more than it looks: the sheet is glass, a
 * blur of what is behind it, and a loop behind it would make the browser redo that blur on every single frame. Paused loops pick up where they stopped.
 * Only loops are paused (animations that repeat for ever); anything with an end, such as a toast arriving, plays on. Safe to nest: the last to close lets go.
 * While anything is held <html> carries data-sheet, which the one animation that ticks by itself (the countdown's rolling digits) checks before it rolls.
 */
export function holdPage(): () => void {
  if (typeof document === 'undefined' || typeof document.getAnimations !== 'function') return () => undefined;
  if (holds++ === 0) {
    document.documentElement.setAttribute('data-sheet', '');
    for (const a of document.getAnimations()) stillIfLoop(a);
    document.addEventListener('animationstart', onStart, true);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--holds > 0) return;
    holds = 0;
    document.documentElement.removeAttribute('data-sheet');
    document.removeEventListener('animationstart', onStart, true);
    for (const a of held) { try { a.play(); } catch { /* its element is gone */ } }
    held.clear();
  };
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
