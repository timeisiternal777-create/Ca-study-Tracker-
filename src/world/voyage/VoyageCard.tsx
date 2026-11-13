import { useId } from 'react';
import { LuArrowRight, LuWind } from 'react-icons/lu';
import { Button, Card } from '../../components/ui';
import { navigateTo } from '../../lib/nav';
import { clamp } from '../../lib/format';
import { SHIP_BOX, ShipArt, Stars, WaveRow } from './art';
import { placer, vb } from './layer';
import { HarbourArt, LedgerIslet, MoonArt, SeaGate } from './scenery';
import { SEA_NAME, SHIP_CLASS } from './progress';
import { useVoyageSummary } from './useVoyageSummary';

const W = 1200, H = 200;
const { to } = placer(W, H);
const ROUTE = { x0: 560, x1: 1130, y: 150 };
const NODES = [0, 1, 2, 3].map((i) => ROUTE.x0 + ((ROUTE.x1 - ROUTE.x0) * i) / 3);
const WIND_WORDS = { tail: 'Tailwind', cross: 'Crosswind', head: 'Headwind', calm: 'Calm' } as const;

/** The home screen's window onto the voyage: a small sea with the ship placed along your route, the weather and a way in to the full chart. */
export function VoyageCard() {
  const uid = useId().replace(/:/g, '');
  const { level, levelLabel, vs, islands, wind, fraction, won } = useVoyageSummary();
  const f = clamp(fraction, 0, 1);
  const shipX = ROUTE.x0 + (ROUTE.x1 - ROUTE.x0 - 130) * f;
  const patches = islands.filter((i) => i.progress >= 0.5).map((i) => ({ accent: i.accent, done: i.state === 'cleared' }));
  const pct = Math.round(f * 100);
  const donePast = [f >= 1 / 3, f >= 2 / 3];

  return (
    <Card className="vcard" size="flush">
      <div className="vc-scene" aria-hidden>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="vc-bg">
          <defs>
            <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#06141d" /><stop offset="1" stopColor="#0c3040" /></linearGradient>
            <linearGradient id={`${uid}sea`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12566a" /><stop offset=".3" stopColor="#0d4152" /><stop offset="1" stopColor="#061f2b" /></linearGradient>
            <radialGradient id={`${uid}moon`}><stop offset="0" stopColor="#fff6d6" stopOpacity=".45" /><stop offset="1" stopColor="#fff2c0" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width={W} height="86" fill={`url(#${uid}sky)`} />
          <Stars />
          <rect y="84" width={W} height={H - 84} fill={`url(#${uid}sea)`} />
          <rect className="sea-horizon" y="83" width={W} height="3" />
          <circle cx="1040" cy="38" r="52" fill={`url(#${uid}moon)`} /><MoonArt id={`${uid}m`} cx={1040} cy={38} r={15} />
          <path className="sea-route" d={`M${ROUTE.x0},${ROUTE.y + 10} H${ROUTE.x1}`} />
          {/* harbour, the two sea boundaries, and the Golden Ledger */}
          <g transform={`translate(${NODES[0] - 22},${ROUTE.y + 6}) scale(.5)`}><HarbourArt id={`${uid}hb`} /></g>
          {[1, 2].map((n) => (
            <g key={n} transform={`translate(${NODES[n]},${ROUTE.y + 8})`}><SeaGate done={donePast[n - 1]} /></g>
          ))}
          <g transform={`translate(${NODES[3]},${ROUTE.y + 4})`}>
            <ellipse className="isl-shoal" cx="0" cy="8" rx="64" ry="16" />
            <g transform="scale(.36)"><LedgerIslet id={`${uid}li`} open={won} /></g>
          </g>
        </svg>
        <WaveRow y={96} h={26} stageH={H} seed={51} count={14} minW={26} maxW={52} className="w1" />
        <WaveRow y={128} h={30} stageH={H} seed={53} count={12} minW={34} maxW={64} className="w3" />
        <WaveRow y={166} h={30} stageH={H} seed={57} count={10} minW={44} maxW={86} className="w5" />
        <div className="sea-mv vc-ship" style={to(SHIP_BOX, shipX, ROUTE.y - 2, 0.56)}>
          <div className="ship-turn"><svg viewBox={vb(SHIP_BOX)}><ShipArt cls={SHIP_CLASS[level]} patches={patches} name={vs.shipName} /></svg></div>
        </div>
        {won ? <i className="vc-glow" /> : null}
      </div>
      <div className="vc-copy">
        <p className="vc-kicker">{levelLabel} · {SEA_NAME[level]}</p>
        <h2 className="vc-title">{won ? 'The Golden Ledger is yours' : `${pct}% of the voyage sailed`}</h2>
        <p className={`vc-wind is-${wind.kind}`}><LuWind aria-hidden />{WIND_WORDS[wind.kind]}<span>{wind.kind === 'calm' ? 'no pace set yet' : `${Math.round(wind.needed * 10) / 10} h a day needed`}</span></p>
        <div className="vc-act"><Button variant="primary" onClick={() => navigateTo('VOYAGE')}>Open the Sea chart<LuArrowRight aria-hidden /></Button></div>
      </div>
    </Card>
  );
}
