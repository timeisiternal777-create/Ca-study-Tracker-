import { useSyncExternalStore } from 'react';
import { NAV_BY_ID, NAV_BY_SLUG, SECTIONS, SECTION_BY_TAB } from '../config/nav';
import type { TabType } from '../types';

const parse = (): TabType => NAV_BY_SLUG[location.hash.replace(/^#\/?/, '').split(/[?/]/)[0]]?.id ?? 'DASHBOARD';

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

/** Current tab, derived from the URL hash (`#/log`). Back/forward and refresh keep working. */
export function useRoute(): TabType {
  return useSyncExternalStore(subscribe, parse, () => 'DASHBOARD');
}

/** Position of a screen in the menu: its section first, then its place inside the section. */
const order = (t: TabType) => { const sec = SECTION_BY_TAB[t]; return SECTIONS.findIndex((x) => x.id === sec.id) * 10 + Math.max(0, sec.tabs.indexOf(t)); };

type WithTransitions = Document & { startViewTransition?: (update: () => void | Promise<void>) => unknown };
const calm = () => document.documentElement.dataset.reduceMotion === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Go to a tab. Safe to call from anywhere (also reachable via `change_tab` events).
 *  Where the browser supports it, the old page fades out while the new one builds in (see motion.css). */
export function navigateTo(tab: TabType) {
  const next = '#/' + NAV_BY_ID[tab].slug;
  if (location.hash === next) return;
  // Screens slide in from the side you are heading towards (menu order decides which way is forward).
  document.documentElement.dataset.dir = order(tab) >= order(parse()) ? 'f' : 'b';
  const doc = document as WithTransitions;
  if (!doc.startViewTransition || document.hidden || calm()) { location.hash = next; return; }
  doc.startViewTransition(() => new Promise<void>((resolve) => {
    let over = false;
    const end = () => { if (over) return; over = true; window.removeEventListener('hashchange', onHash); window.clearTimeout(guard); resolve(); };
    // React renders the new screen as soon as the hash changes. The browser holds back painting until this promise
    // settles, so it must not wait for an animation frame (none would come). A tick later the screen is in the DOM.
    const onHash = () => window.setTimeout(end, 0);
    const guard = window.setTimeout(end, 300);
    window.addEventListener('hashchange', onHash);
    location.hash = next;
    window.scrollTo(0, 0);
  }));
}

if (typeof window !== 'undefined') {
  // Backwards compatible with the original `change_tab` CustomEvent.
  window.addEventListener('change_tab', (e) => {
    const tab = (e as CustomEvent<TabType>).detail;
    if (tab && NAV_BY_ID[tab]) navigateTo(tab);
  });
}

const lastInSection: Record<string, TabType> = {};
/** Remember which tab you were on inside a section, so coming back lands where you left off. */
export function rememberTab(sectionId: string, tab: TabType) { lastInSection[sectionId] = tab; }
export function recallTab(sectionId: string): TabType | undefined { return lastInSection[sectionId]; }
