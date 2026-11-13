import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { StillPainter } from '../../lib/sky';
import { SCENE, SceneCastle, SceneFar, SceneLake, SceneNear } from './art/scene';

/**
 * Lanternfell's backdrop picture: the school on its crag across the lake, in the lower right, dim and fading out on its left edge.
 *
 * It is painted INTO the sky canvas (lib/sky.ts) instead of being a layer of its own. The sky canvas is opaque and already holds the still
 * backdrop, so the castle becomes part of that: painted once (and again only on resize) and then copied along with it. A separate translucent layer
 * above the canvas had to be blended again on every frame the page moved, which cost a third of the frame rate on a weak GPU.
 *
 * The picture is still the same SVG art as everywhere else in the school (the scene layers in art/scene.tsx), rendered once to an image.
 * The mist and the fireflies in front of it stay as small moving layers (AcademyBackdrop.tsx).
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

/** Where the picture sits, in CSS pixels: right and bottom edges on the screen's, as wide as 78% of the screen or 88% of its height, and a good deal larger on a phone. */
export function scenePlacement(vw: number, vh: number) {
  const narrow = vw <= 820;
  const w = narrow ? vw * 1.6 : Math.min(vw * 0.78, vh * 0.88);
  return { w, h: (w * SCENE.h) / SCENE.w, alpha: narrow ? 0.24 : 0.3 };
}

export async function makeScenePainter(): Promise<StillPainter> {
  const img = await loadImage(sceneMarkup());
  return (g, W, H) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const p = scenePlacement(vw, vh);
    // the sky canvas is a little larger than the window (its size is rounded up) and stretched to fit, so work in its own pixels
    const w = Math.round((p.w * W) / vw), h = Math.round((p.h * H) / vh);
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const t = tmp.getContext('2d')!;
    t.drawImage(img, 0, 0, w, h);
    // the left edge fades out, so the picture melts into the night rather than ending in a line
    t.globalCompositeOperation = 'destination-in';
    const k = t.createLinearGradient(0, 0, w, 0);
    k.addColorStop(0, 'rgba(0,0,0,0)'); k.addColorStop(0.3, 'rgba(0,0,0,1)');
    t.fillStyle = k; t.fillRect(0, 0, w, h);
    g.globalAlpha = p.alpha;
    g.drawImage(tmp, W - w, H - h);
  };
}
