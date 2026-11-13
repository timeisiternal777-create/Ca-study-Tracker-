import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Island, Race, ShipClass, Storm, Wind } from './progress';
import { CHART, layoutFor } from './progress';
import { CalmArt, ISL_BOX, IslandBase, IslandFog, IslandGlow, IslandRing, IslandTag, SHIP_BOX, ShipArt, StormArt, Stars, TwinkleStars, WIND_BOX, WX_BOX, WaveRow, WindArt } from './art';
import { Layer, cv, placer, vb } from './layer';
import { FarIsles, HarbourArt, LedgerIslet, MoonArt } from './scenery';
import { clamp } from '../../lib/format';

export interface SeaProps {
  islands: Island[];
  cls: ShipClass;
  /** The island the ship is docked at; null while it is still in harbour. */
  dockKey: string | null;
  /** The island being timed right now. */
  workingKey: string | null;
  storms: Map<string, Storm>;
  wind: Wind;
  race: Race;
  selected: string | null;
  onSelect: (key: string) => void;
  shipName: string;
  /** CA Final: the Golden Ledger glows on the horizon. */
  treasure: boolean;
  nextSea: string | null;
  treasureWon: boolean;
}

const HARBOUR = { x: 150, y: 372 };
/** Where the harbour's pier starts; the ship lies alongside its end. */
const HARBOUR_ART = { x: 34, y: 384 };
const LANE = { x0: 150, x1: 1070, y: 596 };
const SHIP_SCALE = 0.68;
const hours = (h: number) => `${Math.round(h * 10) / 10} h`;

const { at, to } = placer(CHART.w, CHART.h);
/** A layer inside an island's own box, placed by where it sits relative to the island's middle. */
const inIsle = placer(ISL_BOX.w, ISL_BOX.h).at;

const ROWS = [
  { y: 150, h: 34, seed: 3, count: 13, minW: 26, maxW: 50, className: 'w1' },
  { y: 224, h: 38, seed: 7, count: 12, minW: 30, maxW: 58, className: 'w2' },
  { y: 350, h: 40, seed: 11, count: 11, minW: 34, maxW: 66, className: 'w3' },
  { y: 432, h: 40, seed: 17, count: 11, minW: 34, maxW: 66, className: 'w4' },
  { y: 548, h: 46, seed: 23, count: 9, minW: 44, maxW: 88, className: 'w5' },
];
const GUSTS = [{ x: 250, y: 170 }, { x: 640, y: 236 }, { x: 930, y: 322 }];

/** The sea chart: one island per paper, the ship, the weather and the race against your best week. */
export function Sea({ islands, cls, dockKey, workingKey, storms, wind, race, selected, onSelect, shipName, treasure, nextSea, treasureWon }: SeaProps) {
  const uid = useId().replace(/:/g, '');
  const spots = useMemo(() => layoutFor(islands.length), [islands.length]);
  const posOf = (key: string | null) => { const i = islands.findIndex((x) => x.key === key); return i >= 0 ? spots[i] : null; };

  // Where the ship rests: beside the island it last sailed to, in open water on its left.
  const dock = posOf(workingKey ?? dockKey);
  const target = dock ? { x: dock.x - 104, y: dock.y + 34 } : HARBOUR;
  const [pos, setPos] = useState(target);
  const [face, setFace] = useState<1 | -1>(1);
  const [sailing, setSailing] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; setPos(target); return; }
    if (Math.abs(target.x - pos.x) < 1 && Math.abs(target.y - pos.y) < 1) return;
    setFace(target.x >= pos.x ? 1 : -1);
    setPos(target);
    setSailing(true);
    const t = window.setTimeout(() => setSailing(false), 2700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.y]);

  const patches = islands.filter((i) => i.progress >= 0.5).map((i) => ({ accent: i.accent, done: i.state === 'cleared' }));
  const route = spots.length > 1 ? spots.reduce((d, p, i) => (i === 0 ? `M${p.x},${p.y + 14}` : `${d} L${p.x},${p.y + 14}`), '') : '';

  // The race lane: where the ghost of your best week had got to by this weekday, and where you are.
  const lanePos = (h: number) => LANE.x0 + (LANE.x1 - LANE.x0) * clamp(race.bestTotal > 0 ? h / race.bestTotal : 0, 0, 1);
  const gust = wind.kind === 'calm' ? null : wind.kind === 'tail' ? 'tail' : wind.kind === 'head' ? 'head' : 'cross';

  return (
    <div className="sea-scroll">
      <div className="sea-stage" data-wind={wind.kind} role="group" aria-label={`Sea chart of ${islands.length} islands, one for each paper`}>
        {/* soft-edged fills that the island layers share */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <radialGradient id={`${uid}lamp`}><stop offset="0" stopColor="#ffd678" stopOpacity=".85" /><stop offset=".45" stopColor="#ffd678" stopOpacity=".26" /><stop offset="1" stopColor="#ffd678" stopOpacity="0" /></radialGradient>
            <radialGradient id={`${uid}fog`}><stop offset="0" stopColor="#e2f3f4" stopOpacity=".95" /><stop offset=".55" stopColor="#e2f3f4" stopOpacity=".55" /><stop offset="1" stopColor="#e2f3f4" stopOpacity="0" /></radialGradient>
          </defs>
        </svg>
        {/* ── the picture that never changes ── */}
        <svg className="sea-abs sea-full" viewBox={`0 0 ${CHART.w} ${CHART.h}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#06141d" /><stop offset="1" stopColor="#0c3040" /></linearGradient>
            <linearGradient id={`${uid}sea`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12566a" /><stop offset=".22" stopColor="#0d4152" /><stop offset="1" stopColor="#061f2b" /></linearGradient>
            <radialGradient id={`${uid}moon`}><stop offset="0" stopColor="#fff6d6" stopOpacity=".5" /><stop offset=".45" stopColor="#fff2c0" stopOpacity=".12" /><stop offset="1" stopColor="#fff2c0" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width={CHART.w} height="132" fill={`url(#${uid}sky)`} />
          <Stars />
          <rect y="130" width={CHART.w} height={CHART.h - 130} fill={`url(#${uid}sea)`} />
          <rect className="sea-horizon" y="128" width={CHART.w} height="4" />
          <circle cx="150" cy="72" r="86" fill={`url(#${uid}moon)`} />
          <MoonArt id={`${uid}m`} cx={150} cy={72} r={27} />
          {treasure ? (
            <g transform="translate(1058,126)">
              <g transform="scale(.3)"><LedgerIslet id={`${uid}li`} open={treasureWon} /></g>
              <text className="sea-note" x="0" y="26" textAnchor="middle">The Golden Ledger</text>
            </g>
          ) : (
            <g transform="translate(1058,125)">
              <FarIsles />
              {nextSea ? <text className="sea-note" x="6" y="26" textAnchor="middle">{`Next: ${nextSea}`}</text> : null}
            </g>
          )}
        </svg>

        {/* ── the sky and the water, moving ── */}
        <div className="sea-abs sky-twinkle a" style={at({ x: 0, y: 0, w: CHART.w, h: 132 }, 0, 0)} aria-hidden><svg viewBox={`0 0 ${CHART.w} 132`} preserveAspectRatio="none"><TwinkleStars phase={0} /></svg></div>
        <div className="sea-abs sky-twinkle b" style={at({ x: 0, y: 0, w: CHART.w, h: 132 }, 0, 0)} aria-hidden><svg viewBox={`0 0 ${CHART.w} 132`} preserveAspectRatio="none"><TwinkleStars phase={1} /></svg></div>
        <Layer box={{ x: 128, y: 138, w: 44, h: 140 }} className="sea-abs sea-glint" style={at({ x: 128, y: 138, w: 44, h: 140 }, 0, 0)}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} style={cv('--i', i)} x={150 - (34 - i * 3.6) / 2} y={142 + i * 21} width={34 - i * 3.6} height="3" rx="1.5" />)}
        </Layer>
        {treasure ? (
          <>
            <Layer box={{ x: -80, y: -80, w: 160, h: 160 }} className="sea-abs sea-tglow" style={at({ x: -80, y: -80, w: 160, h: 160 }, 1058, 118)}>
              <defs><radialGradient id={`${uid}gold`}><stop offset="0" stopColor="#ffd77a" stopOpacity=".75" /><stop offset=".5" stopColor="#ffd77a" stopOpacity=".18" /><stop offset="1" stopColor="#ffd77a" stopOpacity="0" /></radialGradient></defs>
              <circle r="74" fill={`url(#${uid}gold)`} />
            </Layer>
            {treasureWon ? <Layer box={{ x: -22, y: -40, w: 44, h: 40 }} className="sea-abs sea-tshine" style={at({ x: -22, y: -40, w: 44, h: 40 }, 1058, 112)}><path className="chest-shine" d="M0,-30 l3,9 9,3 -9,3 -3,9 -3,-9 -9,-3 9,-3z" transform="translate(0,12)" /></Layer> : null}
          </>
        ) : null}
        {ROWS.map((r) => <WaveRow key={r.className} {...r} stageH={CHART.h} />)}

        {/* ── the harbour, the route and the race track: still, drawn over the water ── */}
        <svg className="sea-abs sea-full" viewBox={`0 0 ${CHART.w} ${CHART.h}`} preserveAspectRatio="none" aria-hidden>
          <g className="sea-harbour" transform={`translate(${HARBOUR_ART.x},${HARBOUR_ART.y})`}>
            <g transform="scale(.82)"><HarbourArt id={`${uid}hb`} /></g>
            <text className="sea-note" x="30" y="52" textAnchor="middle">Harbour</text>
          </g>
          {route ? <path className="sea-route" d={route} /> : null}
          <g className="sea-lane">
            <path className="lane-line" d={`M${LANE.x0},${LANE.y} H${LANE.x1}`} />
            <path className="lane-flag" d={`M${LANE.x0},${LANE.y} v-22 l14,5 l-14,5`} /><path className="lane-flag" d={`M${LANE.x1},${LANE.y} v-22 l14,5 l-14,5`} />
            {race.bestTotal > 0 ? (
              <>
                <text className="sea-note" x={LANE.x1 + 22} y={LANE.y + 6}>{hours(race.bestTotal)}</text>
                <text className="sea-note lane-text" x={LANE.x0 - 14} y={LANE.y + 6} textAnchor="end">Best week</text>
              </>
            ) : (
              <text className="sea-note lane-text" x={(LANE.x0 + LANE.x1) / 2} y={LANE.y - 14} textAnchor="middle">Your first full week will become the ghost ship</text>
            )}
          </g>
        </svg>

        {/* gusts of wind, drifting the way the wind blows */}
        {gust ? GUSTS.map((g, i) => (
          <Layer key={i} box={WIND_BOX} className={`sea-abs gust gust--${gust}`} style={{ ...at(WIND_BOX, g.x, g.y), ...cv('--gd', `${-i * 1.9}s`) }}><WindArt kind={gust} /></Layer>
        )) : null}

        {/* ── the islands: each paper is one, with its own fog, glow and weather ── */}
        {islands.map((it, i) => {
          const p = spots[i]; const storm = storms.get(it.name.toLowerCase());
          const isSel = selected === it.key; const isWork = workingKey === it.key;
          const label = `${it.name}. ${Math.round(it.progress * 100)} percent explored, ${it.lanterns.lit} of ${it.lanterns.total} lanterns lit${it.neglected ? ', fogging over, needs a visit' : ''}`;
          return (
            <div key={it.key} className={`isle${isSel ? ' is-selected' : ''}${isWork ? ' is-working' : ''}`} data-state={it.state} style={{ ...at(ISL_BOX, p.x, p.y), ...cv('--k', i) }}>
              <svg className="isle-art" viewBox={vb(ISL_BOX)} aria-hidden><IslandBase it={it} seed={it.paperNumber * 3 + 1} /><IslandTag it={it} /></svg>
              {it.lanterns.lit > 0 ? <Layer box={ISL_BOX} className="isle-lyr isle-glow" style={{}}><IslandGlow it={it} fill={`url(#${uid}lamp)`} /></Layer> : null}
              {isWork ? <Layer box={ISL_BOX} className="isle-lyr isle-ring" style={{}}><IslandRing /></Layer> : null}
              {it.fog > 0.02 ? (
                <>
                  <Layer box={ISL_BOX} className="isle-lyr isle-fog fa" style={{ opacity: it.fog }}><IslandFog fill={`url(#${uid}fog)`} /></Layer>
                  <Layer box={ISL_BOX} className="isle-lyr isle-fog fb" style={{ opacity: it.fog * 0.72 }}><IslandFog fill={`url(#${uid}fog)`} /></Layer>
                </>
              ) : null}
              <button type="button" className="isle-hit" aria-label={label} aria-pressed={isSel} onClick={() => onSelect(it.key)} />
              {storm && (storm.weather === 'storm' || storm.weather === 'rough') ? (
                <Layer box={WX_BOX} className={`wx wx--${storm.weather}`} style={inIsle(WX_BOX, -ISL_BOX.x, -88 - ISL_BOX.y)}><StormArt weather={storm.weather} /></Layer>
              ) : null}
              {storm && storm.weather === 'clear' ? <Layer box={WX_BOX} className="wx wx--clear" style={inIsle(WX_BOX, -ISL_BOX.x, -84 - ISL_BOX.y)}><CalmArt /></Layer> : null}
            </div>
          );
        })}

        {/* ── the ship, sailing to wherever you studied last ── */}
        <div className={`sea-mv sea-ship${sailing ? ' is-sailing' : ''}${workingKey ? ' is-working' : ''}`} style={to(SHIP_BOX, pos.x, pos.y, SHIP_SCALE)}>
          <div className="ship-turn" style={{ transform: `scaleX(${face})` }}>
            <svg viewBox={vb(SHIP_BOX)} aria-hidden><ShipArt cls={cls} patches={patches} name={shipName} /></svg>
          </div>
        </div>
        {workingKey && dock ? (
          <Layer box={{ x: -30, y: -30, w: 60, h: 60 }} className="sea-abs sea-timing" style={at({ x: -30, y: -30, w: 60, h: 60 }, dock.x - 104, dock.y - 36)}>
            <circle r="6" /><circle className="r2" r="6" />
          </Layer>
        ) : null}

        {/* ── the ghost lane: your best week against this one ── */}
        {race.bestTotal > 0 ? (
          <>
            <div className="sea-mv lane-ship ghost" style={to(SHIP_BOX, lanePos(race.ghost), LANE.y - 2, 0.26)}><div className="ship-turn"><svg viewBox={vb(SHIP_BOX)} aria-hidden><ShipArt cls={cls} patches={[]} ghost /></svg></div></div>
            <div className="sea-mv lane-ship you" style={to(SHIP_BOX, lanePos(race.you), LANE.y - 2, 0.3)}><div className="ship-turn"><svg viewBox={vb(SHIP_BOX)} aria-hidden><ShipArt cls={cls} patches={[]} /></svg></div></div>
          </>
        ) : null}
      </div>
    </div>
  );
}
