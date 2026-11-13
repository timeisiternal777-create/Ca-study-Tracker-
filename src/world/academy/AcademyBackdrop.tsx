import './academy.css';
import { Fireflies } from './art/scene';

/**
 * Behind the whole app in Lanternfell, in front of the sky: a drift of mist and a few fireflies. Small layers that move with transform and opacity only.
 * The castle itself is not here: it is painted into the sky canvas (skyScene.tsx), which is how it costs nothing per frame.
 */
export default function AcademyBackdrop() {
  return (
    <div className="ab" aria-hidden>
      <div className="ab-mist"><i /><i /></div>
      <Fireflies n={9} seed={11} className="ab-ff" />
    </div>
  );
}
