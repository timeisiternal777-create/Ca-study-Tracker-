import { Logo } from '../components/layout/Logo';
import { VoyageMark } from './VoyageMark';
import { Seal } from './academy/art/seal';
import type { World } from './words';

/** The app's brand mark in the world that is on: the radar, the Voyage compass or the Lanternfell seal. */
export function WorldMark({ world, size, className }: { world: World; size?: number; className?: string }) {
  if (world === 'voyage') return <VoyageMark size={size} className={className} />;
  // The seal's lettering is real text and would be a smudge at menu size, so small copies keep the lantern and the rings only.
  if (world === 'academy') return <Seal size={size ?? 42} className={className} text={(size ?? 42) >= 72} />;
  return <Logo size={size} className={className} />;
}
