import { WaveRow } from './voyage/art';

/** Behind the whole app in the Voyage world: three rows of slow waves along the bottom of the screen and, now and then, a distant ship. All of it is GPU-moved layers. */
export function SeaBackdrop() {
  return (
    <div className="sb" aria-hidden>
      <WaveRow y={560} h={34} stageH={700} seed={5} count={14} minW={30} maxW={64} className="w1" />
      <WaveRow y={606} h={40} stageH={700} seed={9} count={12} minW={40} maxW={80} className="w3" />
      <WaveRow y={654} h={46} stageH={700} seed={13} count={10} minW={50} maxW={100} className="w5" />
      <div className="sb-ship">
        <svg viewBox="0 0 120 70">
          <path d="M8,52 L16,62 H92 L106,48 L70,50Z" fill="#0b2531" /><path d="M54,50 V8" stroke="#0b2531" strokeWidth="3" strokeLinecap="round" />
          <path d="M57,10 C80,18 82,36 76,46 H57Z" fill="#0f3040" /><path d="M51,14 C34,22 32,38 36,46 H51Z" fill="#0f3040" /><circle cx="13" cy="50" r="3" fill="#ffd77a" />
        </svg>
      </div>
    </div>
  );
}
