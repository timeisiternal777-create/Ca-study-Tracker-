import { lazy, Suspense, useEffect, useRef } from 'react';
import { createSky, type Sky } from '../../lib/sky';
import { useMotionLevel } from '../../lib/motion';
import { useWorldAttr } from '../../world';
import { SeaBackdrop } from '../../world/SeaBackdrop';

// Lanternfell's mist and fireflies, and its castle, are separate chunks: nobody downloads them unless that world is on.
const AcademyBackdrop = lazy(() => import('../../world/academy/AcademyBackdrop'));

/**
 * The living background. The sky canvas (lib/sky.ts) paints the whole still backdrop (colour, soft pools of light, a fine star field) and on top of it
 * two drifting pools of light, twinkling stars, floating dust and a rare shooting star; the motion governor decides how much of it runs. The stylesheet's
 * own copy of the backdrop is the fallback until the canvas has painted. A world may add a still picture to the canvas (Lanternfell's castle) or
 * small moving layers in front of it (waves, mist, fireflies).
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
      {world === 'voyage' ? <SeaBackdrop /> : world === 'academy' ? <Suspense fallback={null}><AcademyBackdrop /></Suspense> : null}
    </div>
  );
}
