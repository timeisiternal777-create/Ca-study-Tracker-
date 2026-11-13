import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import { Button } from '../../components/ui';
import { Crew } from '../crew/Crew';
import type { CrewId, Expr } from '../crew/types';
import { CREW } from '../crew/types';
import type { Captain } from './voyageState';
import { SHIP_BOX, ShipArt, Stars, WaveRow, type Box } from './art';
import { ChestBody, ChestGold, ChestLidClosed, ChestLidOpen, LedgerIslet } from './scenery';
import { Layer, cv, placer, vb } from './layer';
import { burst, flare } from '../../lib/fx';
import { sfx } from '../../lib/sfx';
import { fmtHM } from '../../lib/format';
import { ACCENTS } from '../../config/curriculum';

// The ending is a scene 1200 by 680, laid out in layers like the sea chart: the GPU slides and fades them, nothing is repainted.
const W = 1200, H = 680;
const { at } = placer(W, H);
const ISLET = { x: 900, y: 472 };
const SUN = { x: 600, y: 396 };
const COIN: Box = { x: -5.2, y: -5.2, w: 10.4, h: 10.4 };
const GOLDS = ['#ffd77a', '#ffe9a8', '#f2b84a', '#fff3cc'];
const COINS = Array.from({ length: 20 }, (_, i) => {
  const side = i % 2 ? 1 : -1; const k = Math.floor(i / 2);
  return { dx: side * (16 + k * 15 + (i % 3) * 6), up: 70 + (i % 4) * 14, dy: 64 + (i % 5) * 22, d: 5.4 + k * 0.07 + (i % 4) * 0.05 };
});
const FINAL_LINES: { who: CrewId; expr: Expr; text: string }[] = [
  { who: 'odalys', expr: 'proud', text: 'Course complete. Not one degree off.' },
  { who: 'tally', expr: 'cheer', text: 'Debits and credits agree. Balanced.' },
  { who: 'sol', expr: 'grin', text: 'One entry at a time. We did it.' },
  { who: 'brine', expr: 'smile', text: 'Not a leak anywhere in the hull.' },
  { who: 'saffron', expr: 'cheer', text: 'Supper is on me. You have earned it.' },
];

const SKY: Box = { x: 0, y: 0, w: W, h: 132 };
const SUN_BOX: Box = { x: -150, y: -150, w: 300, h: 300 };
const PATH_BOX: Box = { x: 540, y: 396, w: 120, h: 284 };
const ISLET_BOX: Box = { x: -190, y: -44, w: 380, h: 110 };
const RAYS_BOX: Box = { x: -470, y: -570, w: 940, h: 520 };
const GLOW_BOX: Box = { x: -120, y: -180, w: 240, h: 240 };
const CHEST_BOX: Box = { x: -62, y: -130, w: 124, h: 134 };

/**
 * The ending of the voyage: the ship sails in at dawn, the Golden Ledger opens, the crew cheer.
 * Everything animates with transform and opacity only, and the resting state is the finished picture,
 * which is also what shows when motion is set to "still".
 */
export function Finale({ shipName, captain, name, totalHours, onClose }: { shipName: string; captain: Captain; name: string; totalHours: number; onClose: () => void }) {
  const uid = useId().replace(/:/g, '');
  const chest = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timers: number[] = [];
    const at2 = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    sfx.play('rank');
    at2(5200, () => {
      sfx.play('goal');
      const r = chest.current?.getBoundingClientRect();
      if (r) burst(r.left + r.width / 2, r.top + r.height * 0.2, { count: 16, power: 1.7, colors: GOLDS });
      flare();
    });
    at2(6600, () => sfx.play('week'));
    at2(9400, () => sfx.play('badge'));
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { timers.forEach((t) => window.clearTimeout(t)); window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patches = Array.from({ length: 8 }, (_, i) => ({ accent: ACCENTS[i % ACCENTS.length], done: true }));
  const glow = (id: string) => <defs><radialGradient id={`${uid}${id}`}><stop offset="0" stopColor="#fff0b8" stopOpacity=".95" /><stop offset=".4" stopColor="#ffd77a" stopOpacity=".3" /><stop offset="1" stopColor="#ffd77a" stopOpacity="0" /></radialGradient></defs>;

  // Portalled to the body: the page has a view-transition name, which would make a fixed overlay relative to the page instead of the screen.
  return createPortal(
    <div className="fin" role="dialog" aria-modal="true" aria-label="The Golden Ledger">
      <div className="fin-stage" aria-hidden>
        {/* sky: night, then dawn fades in over it */}
        <div className="fin-abs fin-night" style={{ top: 0, left: 0, width: '100%', height: `${(400 / H) * 100}%` }} />
        <Layer box={SKY} className="fin-abs fin-stars" style={at(SKY, 0, 0)}><Stars /></Layer>
        <div className="fin-abs fin-dawn" style={{ top: 0, left: 0, width: '100%', height: `${(400 / H) * 100}%` }} />
        <Layer box={SUN_BOX} className="fin-abs fin-sun" style={at(SUN_BOX, SUN.x, SUN.y)}>
          {glow('sun')}
          <circle r="150" fill={`url(#${uid}sun)`} /><circle r="62" fill="#ffe3a0" />
        </Layer>
        <div className="fin-abs fin-seabg" style={{ top: `${(392 / H) * 100}%`, left: 0, width: '100%', height: `${(288 / H) * 100}%` }} />
        <Layer box={PATH_BOX} className="fin-abs fin-sunpath" style={at(PATH_BOX, 0, 0)}>
          <defs><linearGradient id={`${uid}path`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd98a" stopOpacity=".8" /><stop offset="1" stopColor="#ffd98a" stopOpacity=".05" /></linearGradient></defs>
          <path d="M600,400 L560,680 L640,680Z" fill={`url(#${uid}path)`} />
        </Layer>
        <WaveRow y={424} h={34} stageH={H} seed={31} count={12} minW={30} maxW={60} className="w1" />
        <WaveRow y={512} h={40} stageH={H} seed={37} count={10} minW={40} maxW={80} className="w3" />
        <WaveRow y={606} h={46} stageH={H} seed={41} count={8} minW={54} maxW={100} className="w5" />

        {/* the islet that holds the Golden Ledger */}
        <Layer box={ISLET_BOX} className="fin-abs fin-isle" style={at(ISLET_BOX, ISLET.x, ISLET.y)}>
          <ellipse className="isl-shoal" cx="0" cy="12" rx="170" ry="48" />
          <LedgerIslet id={`${uid}li`} chest={false} />
        </Layer>
        <Layer box={RAYS_BOX} className="fin-abs fin-rays" style={at(RAYS_BOX, ISLET.x, ISLET.y)}>
          {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M0,-62 L${-14 - i * 0.3},-560 L${14 + i * 0.3},-560Z`} transform={`rotate(${(i - 6) * 11} 0 -62)`} />)}
        </Layer>
        <Layer box={GLOW_BOX} className="fin-abs fin-chest-glow" style={at(GLOW_BOX, ISLET.x, ISLET.y)}>
          {glow('chest')}
          <circle cx="0" cy="-60" r="110" fill={`url(#${uid}chest)`} />
        </Layer>
        <div ref={chest} className="fin-abs fin-chest" style={at(CHEST_BOX, ISLET.x, ISLET.y)}>
          <svg viewBox={vb(CHEST_BOX)}>
            <g className="fin-lid-open"><ChestLidOpen id={`${uid}ch`} /></g>
            <ChestBody id={`${uid}ch`} />
            <ChestGold id={`${uid}ch`} />
            {[[-34, -92, 0], [38, -86, 1], [4, -112, 2]].map(([x, y, i]) => <path key={i} className="fin-spark" style={cv('--d', `${5.8 + i * 0.7}s`)} transform={`translate(${x},${y})`} d="M0,-9 l2.6,6.4 6.4,2.6 -6.4,2.6 -2.6,6.4 -2.6,-6.4 -6.4,-2.6 6.4,-2.6z" />)}
            <g className="fin-lid-closed"><ChestLidClosed id={`${uid}ch`} /></g>
          </svg>
        </div>
        {COINS.map((c, i) => (
          <i key={i} className="fin-abs fin-coin" style={{ ...at(COIN, ISLET.x, ISLET.y - 58), ...cv('--dx', (c.dx / COIN.w) * 100), ...cv('--up', (c.up / COIN.w) * 100), ...cv('--dy', (c.dy / COIN.w) * 100), ...cv('--t', `${c.d}s`) }} />
        ))}

        {/* the ship comes in on the morning tide */}
        <div className="fin-abs" style={at(SHIP_BOX, 330, 458, 1.45)}>
          <div className="fin-ship"><svg viewBox={vb(SHIP_BOX)}><ShipArt cls="galleon" patches={patches} name={shipName} /></svg></div>
        </div>
      </div>

      <button ref={close} type="button" className="fin-close" onClick={onClose} aria-label="Close the ending"><LuX /></button>

      <div className="fin-copy">
        <h2 className="fin-title">The Golden Ledger</h2>
        <p className="fin-sub">{name}, you cleared CA Final.</p>
        <p className="fin-stats"><span>{fmtHM(totalHours)} studied</span><span>{shipName}</span></p>
      </div>

      <div className="fin-crew">
        {FINAL_LINES.map((l, i) => (
          <div key={l.who} className="fin-mate" style={cv('--i', i)}>
            <Crew who={l.who} expr={l.expr} size={88} captain={captain} />
            <b>{CREW[l.who].name}</b>
            <span className="fin-line">{l.text}</span>
          </div>
        ))}
      </div>

      <div className="fin-actions"><Button variant="primary" size="lg" onClick={onClose}>Back to the chart</Button></div>
    </div>,
    document.body,
  );
}
