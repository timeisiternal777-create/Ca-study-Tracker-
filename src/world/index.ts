import { useMemo, useSyncExternalStore } from 'react';
import './skin.css';
import { useStudy } from '../context/StudyContext';
import { normaliseWorld, wordsFor, type Words, type World } from './words';
import { applyGlass, applyWallpaperMode } from '../lib/look';
import { applySkyVars, currentSky } from '../lib/sky';

export type { World, Words } from './words';
export { BRAND, normaliseWorld } from './words';

/** Which world the app is showing, and the wording that goes with it. Must be used inside the study provider. */
export function useWorld(): { world: World; voyage: boolean; academy: boolean; words: Words } {
  const { settings } = useStudy();
  const world = normaliseWorld(settings.worldTheme);
  const words = useMemo(() => wordsFor(world, !!settings.plainWords), [world, settings.plainWords]);
  return { world, voyage: world === 'voyage', academy: world === 'academy', words };
}

/** Set `<html data-world>` (and the student's house, once chosen) before the first paint, so a themed look does not flash in after the default one. */
export function bootWorld() {
  const root = document.documentElement;
  let saved: { worldTheme?: unknown; glass?: unknown; wallpaper?: unknown } = {};
  try { saved = JSON.parse(localStorage.getItem('ca_settings_v3') || '{}') || {}; } catch { saved = {}; }
  root.setAttribute('data-world', normaliseWorld(saved.worldTheme));
  // The glass and the wallpaper are part of the look, so they are set now too, not after the first screen has drawn.
  applyGlass(saved.glass);
  applyWallpaperMode(saved.wallpaper);
  // The house colour follows what is stored, now and whenever a backup is restored or another tab changes it. (Lanternfell's own store does the same once
  // its chunk has loaded, but on a screen that never loads it, such as Settings, nothing else would notice a restore.)
  const syncHouse = () => {
    try {
      const a = JSON.parse(localStorage.getItem('ca_academy_v1') || '{}');
      const h = a && a.house;
      if (h === 'wolf' || h === 'heron' || h === 'fox' || h === 'bear') root.setAttribute('data-house', h); else root.removeAttribute('data-house');
    } catch { /* no house yet */ }
  };
  syncHouse();
  // The stylesheet's copy of the wallpaper (the .bg rule) uses these colours until the canvas has painted, so even the first frame has the right sky.
  applySkyVars(currentSky());
  window.addEventListener('ca_data_restored', syncHouse);
  window.addEventListener('storage', (e) => { if (e.key === 'ca_academy_v1' || e.key === null) syncHouse(); });
}

/** The world on `<html data-world>`. Works outside the study provider too (the app's backdrop lives there). */
export function useWorldAttr(): World {
  return useSyncExternalStore(
    (cb) => { const mo = new MutationObserver(cb); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-world'] }); return () => mo.disconnect(); },
    () => normaliseWorld(document.documentElement.getAttribute('data-world')),
    () => 'default' as World,
  );
}

/** True while the Voyage world is showing. */
export const useVoyageOn = (): boolean => useWorldAttr() === 'voyage';
/** True while Lanternfell is showing. */
export const useAcademyOn = (): boolean => useWorldAttr() === 'academy';
