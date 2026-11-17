import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { StillPainter } from '../../lib/sky';
import { SCENE, SceneCastle, SceneFar, SceneLake, SceneNear } from './art/scene';

/**
 * Lanternfell's backdrop picture: the school on its crag across the lake, low on the left, so that it shows through the glass of the menu and
 * melts away to the right before it reaches the cards. (The art faces the other way, so it is mirrored.)
 *
 * It is painted INTO the wallpaper canvas (lib/sky.ts) instead of being a layer of its own: the wallpaper is opaque and painted once, so the
 * school becomes part of it and costs nothing per frame. A separate translucent layer above the canvas had to be blended again on every frame the
 * page moved, which cost a third of the frame rate on a weak GPU.
 *
 * It is the same SVG art as everywhere else in the school (the scene layers in art/scene.tsx, without the sky: the wallpaper is the sky), drawn once to an image.
 */

/** The four scene layers as one stand-alone SVG document. */
function sceneMarkup(): string {
  const host = document.createElement('div');
  const root = createRoot(host) as ReturnType<typeof createRoot> & { unmount?: () => void };
  flushSync(() => root.render(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} width={SCENE.w} height={SCENE.h}>
      <SceneFar id="bk-f" /><SceneCastle id="bk-c" /><SceneLake id="bk-w" /><SceneNear id="bk-n" />
    </svg>,
  ));
  const svg = host.firstElementChild!;
  const text = new XMLSerializer().serializeToString(svg);
  root.unmount?.();
  return text;
}

function loadImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('the castle picture could not be drawn')); };
    img.src = url;
  });
}

/** Where the picture sits, in CSS pixels, and how strong it is: bottom edge on the screen's, as wide as 62% of the screen (or 98% of its height). */
export function scenePlacement(vw: number, vh: number) {
  const narrow = vw <= 820;
  const w = narrow ? vw * 1.5 : Math.min(vw * 0.62, vh * 0.98);
  // The castle stands about a third of the way in from the picture's left edge once it is mirrored. On a wide screen that is pulled left so it sits under
  // the menu; on a narrow one it is centred.
  const x = narrow ? vw / 2 - w * 0.35 : -w * 0.2;
  return { w, h: (w * SCENE.h) / SCENE.w, x, alpha: narrow ? 0.3 : 0.4 };
}

export async function makeScenePainter(): Promise<StillPainter> {
  const img = await loadImage(sceneMarkup());
  return (g, W, H) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const p = scenePlacement(vw, vh);
    // the wallpaper canvas is a little larger than the window (its size is rounded up) and stretched to fit, so work in its own pixels
    const kx = W / vw, ky = H / vh;
    const w = Math.round(p.w * kx), h = Math.round(p.h * ky);
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const t = tmp.getContext('2d')!;
    t.translate(w, 0); t.scale(-1, 1);
    t.drawImage(img, 0, 0, w, h);
    t.setTransform(1, 0, 0, 1, 0, 0);
    // the right edge fades out, so the picture melts into the night rather than ending in a line
    t.globalCompositeOperation = 'destination-in';
    const k = t.createLinearGradient(0, 0, w, 0);
    k.addColorStop(0, 'rgba(0,0,0,1)'); k.addColorStop(0.46, 'rgba(0,0,0,1)'); k.addColorStop(1, 'rgba(0,0,0,0)');
    t.fillStyle = k; t.fillRect(0, 0, w, h);
    g.globalAlpha = p.alpha;
    g.drawImage(tmp, Math.round(p.x * kx), H - h);
  };
}
