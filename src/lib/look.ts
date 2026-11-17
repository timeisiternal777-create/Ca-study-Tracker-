import { normaliseGlass } from './wallpaper';

// How the saved look settings reach the stylesheet. Both the early boot (world/index.ts, before the first paint) and the settings provider use these, so
// a change in Settings and a fresh page load put the very same values on <html>.

/** Sets how clear or tinted the glass is (--glass-k, 0 to 1) from the saved 0 to 100. */
export function applyGlass(level: unknown) {
  document.documentElement.style.setProperty('--glass-k', (normaliseGlass(level) / 100).toFixed(2));
}

/** Everyday wallpaper: `night` pins the night sky (data-wallpaper="night"); anything else follows the hour of the day. */
export function applyWallpaperMode(mode: unknown) {
  const root = document.documentElement;
  if (mode === 'night') root.setAttribute('data-wallpaper', 'night'); else root.removeAttribute('data-wallpaper');
}
