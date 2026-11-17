import { useEffect, useRef } from 'react';
import { createSky, type Sky } from '../../lib/sky';
import { useMotionLevel } from '../../lib/motion';
import { useWorldAttr } from '../../world';

/**
 * The wallpaper behind the whole app: one canvas (lib/sky.ts) holding a calm field of colour that follows the hour of the day, or the sea at night,
 * or the school at night, with fine grain on top. Nothing on it moves. The stylesheet's own copy of the wallpaper (`.bg` in layout.css) is what shows
 * until the canvas has painted. Lanternfell adds one still picture, the school on its crag, painted into the same canvas (world/academy/skyScene.tsx),
 * which is a separate chunk that nobody downloads unless that world is on.
 */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const sky = useRef<Sky | null>(null);
  const level = useMotionLevel();
  const world = useWorldAttr();
  useEffect(() => {
    const s = createSky(ref.current!);
    sky.current = s;
    return () => { s.destroy(); sky.current = null; };
  }, []);
  useEffect(() => { sky.current?.setLevel(level); }, [level]);
  useEffect(() => {
    if (world !== 'academy') return;
    let gone = false;
    import('../../world/academy/skyScene').then((m) => m.makeScenePainter()).then((paint) => { if (!gone) sky.current?.setStill(paint); }).catch(() => { /* the school simply has no picture behind it */ });
    return () => { gone = true; sky.current?.setStill(null); };
  }, [world]);
  return (
    <div className="bg" aria-hidden>
      <canvas ref={ref} className="sky" />
    </div>
  );
}
