import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './grounds.css';
import type { Island, Race, Storm, Wind } from '../../voyage/progress';
import { Layer, cv, placer, vb } from '../../voyage/layer';
import { clamp } from '../../../lib/format';
import { GROUNDS, LANE, groundsLayout, landmarkIdFor, litFlags, neglectAmount, windowsLit } from '../grounds';
import { LANDMARKS } from '../art/landmarks';
import { CommonDefs, rng } from '../art/kit';
import { Fireflies } from '../art/scene';
import type { StudentLook } from '../art/cast/types';
import type { HouseId } from '../houses';
import Terrain from './Terrain';
import { BANNER_BOX, Banner, LANTERN_BOX, LEAF_BOX, Leaves, Mist, Neglect, PLATE_BOX, PaperLantern, Plate, Sparks, Storm as StormArt, WALKER_BOX, WX_BOX, Walker } from './Overlays';

export interface GroundsMapProps {
  islands: Island[];
  /** The building the student last studied in; null while still at the gate. */
  dockKey: string | null;
  /** The building being timed right now. */
  workingKey: string | null;
  storms: Map<string, Storm>;
  wind: Wind;
  race: Race;
  selected: string | null;
  onSelect: (key: string) => void;
  house: HouseId | null;
  look: StudentLook;
  /** What the far castle stands for: Charter Night in the last year, the next year before that. `glow` when the Charter is signed. */
  ahead: { label: string; glow: boolean };
  /** Skip the moment of darkness before the windows come on (used when motion is off, and for pictures taken of the map). */
  settled?: boolean;
}

const { w: W, h: H, horizon: HZ } = GROUNDS;
const { at, to } = placer(W, H);
const GATE = { x: 188, y: GROUNDS.rowB + 32 };
const WALK_SCALE = 0.64;
const LANTERN_SCALE = 0.8;
const BANNER_AT = { x: 92, y: GROUNDS.rowB + 34 - BANNER_BOX.h };
const hours = (h: number) => `${Math.round(h * 10) / 10} h`;
const GUSTS = [{ x: 250, y: 214 }, { x: 640, y: 330 }, { x: 930, y: 440 }];
const SKY_BOX = { x: 0, y: 0, w: W, h: HZ };
const CASTLE_AT = { x: 962, y: 112 };

/** A few extra stars that blink, in two layers so they do not blink together. */
function Twinkle({ phase }: { phase: 0 | 1 }) {
  const r = rng(300 + phase * 17);
  const pts = Array.from({ length: 15 }, () => ({ x: r() * W, y: Math.pow(r(), 1.5) * (HZ - 34), s: 0.9 + r() * 1.1 }));
  return <g fill="#fff">{pts.map((p, i) => <circle key={i} cx={Math.round(p.x * 10) / 10} cy={Math.round(p.y * 10) / 10} r={Math.round(p.s * 10) / 10} />)}</g>;
}

/** The school grounds: one building per paper, windows lit for chapters done, mist over what is unexplored, ivy over what is neglected, the student at the last door. */
export function GroundsMap({ islands, dockKey, workingKey, storms, wind, race, selected, onSelect, house, look, ahead, settled = false }: GroundsMapProps) {
  const uid = useId().replace(/:/g, '');
  const spots = useMemo(() => groundsLayout(islands.length), [islands.length]);
  // the windows start dark and come on a moment after the map appears, one building after another
  const [ready, setReady] = useState(settled);
  useEffect(() => { if (settled) return; const t = window.setTimeout(() => setReady(true), 420); return () => window.clearTimeout(t); }, [settled]);

  const built = islands.map((it, i) => {
    const def = LANDMARKS[landmarkIdFor(it.key, it.paperNumber)];
    const sp = spots[i];
    const bw = def.box.w * sp.scale; const bh = def.box.h * sp.scale;
    return { it, def, sp, bw, bh, ox: sp.x - bw / 2, oy: sp.y - (def.box.y + def.box.h) * sp.scale };
  });

  // The student rests just to the right of the building studied last, and walks to the next one when that changes.
  const parked = (key: string | null) => {
    const b = built.find((x) => x.it.key === key);
    return b ? { x: Math.min(W - 40, b.sp.x + b.bw / 2 + 22), y: b.sp.y + 8 } : GATE;
  };
  const target = parked(workingKey ?? dockKey);
  const [pos, setPos] = useState(target);
  const [face, setFace] = useState<1 | -1>(-1);
  const [walking, setWalking] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; setPos(target); return; }
    if (Math.abs(target.x - pos.x) < 1 && Math.abs(target.y - pos.y) < 1) return;
    setFace(target.x >= pos.x ? 1 : -1);
    setPos(target);
    setWalking(true);
    const t = window.setTimeout(() => { setWalking(false); setFace(-1); }, 2700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.y]);

  const lanePos = (h: number) => LANE.x0 + (LANE.x1 - LANE.x0) * clamp(race.bestTotal > 0 ? h / race.bestTotal : 0, 0, 1);
  const gust = wind.kind === 'calm' ? null : wind.kind === 'tail' ? 'tail' : wind.kind === 'head' ? 'head' : 'cross';

  return (
    <div className="gm-scroll">
      <div className="gm-stage" data-wind={wind.kind} role="group" aria-label={`Map of the school grounds with ${islands.length} buildings, one for each paper`}>
        {/* soft-edged fills that the layers share */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <radialGradient id="gm-lampglow"><stop offset="0" stopColor="#ffd98a" stopOpacity=".7" /><stop offset=".4" stopColor="#ffb85a" stopOpacity=".22" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></radialGradient>
            <radialGradient id="gm-ghostglow"><stop offset="0" stopColor="#cfe0ff" stopOpacity=".55" /><stop offset=".4" stopColor="#9db8f0" stopOpacity=".16" /><stop offset="1" stopColor="#9db8f0" stopOpacity="0" /></radialGradient>
            <radialGradient id={`${uid}fog`}><stop offset="0" stopColor="#c9c3fa" stopOpacity=".78" /><stop offset=".55" stopColor="#bdb6f2" stopOpacity=".4" /><stop offset="1" stopColor="#bdb6f2" stopOpacity="0" /></radialGradient>
          </defs>
        </svg>

        {/* ── the picture that never changes ── */}
        <svg className="gm-abs gm-full gm-bg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden><Terrain id={`${uid}t`} spots={spots} /></svg>

        {/* ── sky and air, moving ── */}
        <div className="gm-abs gm-twinkle a" style={at(SKY_BOX, 0, 0)} aria-hidden><svg viewBox={`0 0 ${W} ${HZ}`} preserveAspectRatio="none"><Twinkle phase={0} /></svg></div>
        <div className="gm-abs gm-twinkle b" style={at(SKY_BOX, 0, 0)} aria-hidden><svg viewBox={`0 0 ${W} ${HZ}`} preserveAspectRatio="none"><Twinkle phase={1} /></svg></div>
        {ahead.glow ? <Layer box={{ x: -110, y: -110, w: 220, h: 220 }} className="gm-abs gm-cglow" style={at({ x: -110, y: -110, w: 220, h: 220 }, CASTLE_AT.x, CASTLE_AT.y)}><defs><radialGradient id={`${uid}gold`}><stop offset="0" stopColor="#ffd77a" stopOpacity=".7" /><stop offset=".5" stopColor="#ffd77a" stopOpacity=".18" /><stop offset="1" stopColor="#ffd77a" stopOpacity="0" /></radialGradient></defs><circle r="104" fill={`url(#${uid}gold)`} /></Layer> : null}
        <i className="gm-abs gm-band a" /><i className="gm-abs gm-band b" />
        <Fireflies n={11} seed={5} className="gm-ff" />
        {gust ? GUSTS.map((g, i) => <Layer key={i} box={LEAF_BOX} className={`gm-abs gm-gust gm-gust--${gust}`} style={{ ...at(LEAF_BOX, g.x, g.y), ...cv('--gd', `${-i * 1.9}s`) }}><Leaves kind={gust} /></Layer>) : null}

        {/* ── labels that belong to the picture ── */}
        <svg className="gm-abs gm-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          <text className="gm-note" x={CASTLE_AT.x} y="26" textAnchor="middle">{ahead.label}</text>
          <text className="gm-note" x="44" y={GROUNDS.rowB + 62} textAnchor="middle">Gate</text>
          {race.bestTotal > 0 ? (
            <>
              <text className="gm-note" x={LANE.x1 + 30} y={LANE.y + 5}>{hours(race.bestTotal)}</text>
              <text className="gm-note" x={LANE.x0 - 30} y={LANE.y + 5} textAnchor="end">Best week</text>
            </>
          ) : <text className="gm-note" x={(LANE.x0 + LANE.x1) / 2} y={LANE.y + 25} textAnchor="middle">Your first full week becomes the ghost lantern</text>}
        </svg>

        {/* ── the buildings: each paper is one, with its own windows, mist, ivy and weather ── */}
        {built.map(({ it, def, sp, bw, bh, ox, oy }, i) => {
          const storm = storms.get(it.name.toLowerCase());
          const isSel = selected === it.key; const isWork = workingKey === it.key;
          const n = windowsLit(it.lanterns.lit, it.lanterns.total, def.slots);
          const lit = ready ? litFlags(it.paperNumber * 7 + 3, n, def.slots) : litFlags(0, 0, def.slots);
          const neglect = neglectAmount(it.daysSince, it.neglected);
          const spill = n > 0 ? clamp((0.18 + 0.82 * (n / def.slots)) * (neglect > 0 ? 0.6 : 1), 0, 1) : 0;
          const bid = `${uid}b${i}`;
          const label = `${def.name}, for ${it.name}. ${Math.round(it.progress * 100)} percent explored, ${n} of ${def.slots} windows lit${it.neglected ? ', ivy is creeping over it, it needs a visit' : ''}`;
          const inBuilding = placer(bw, bh);
          return (
            <div key={it.key} className={`gm-b acc-${it.accent}${isSel ? ' is-selected' : ''}${isWork ? ' is-working' : ''}${it.state === 'cleared' ? ' is-cleared' : ''}`} data-state={it.state}
              style={{ ...at(def.box, ox, oy, sp.scale), ...cv('--k', i), ...cv('--lit-d', `${i * 0.17}s`) }}>
              {spill > 0 ? <div className="gm-lyr gm-spill" style={{ opacity: spill }}><i /></div> : null}
              <div className="gm-art"><svg viewBox={vb(def.box)} aria-hidden><CommonDefs id={bid} /><def.Art id={bid} lit={lit} /></svg></div>
              {neglect > 0 ? <div className="gm-lyr gm-neglect"><svg viewBox={vb(def.box)} aria-hidden><Neglect box={def.box} amount={neglect} seed={it.paperNumber * 31 + 5} /></svg></div> : null}
              {isWork ? <div className="gm-lyr gm-ring"><i /></div> : null}
              {it.fog > 0.02 ? (
                <>
                  <div className="gm-lyr gm-fog fa" style={{ opacity: Math.min(0.7, it.fog * 0.76) }}><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><Mist fill={`url(#${uid}fog)`} density={it.fog} /></svg></div>
                  <div className="gm-lyr gm-fog fb" style={{ opacity: Math.min(0.7, it.fog * 0.76) * 0.7 }}><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><Mist fill={`url(#${uid}fog)`} density={it.fog} flip /></svg></div>
                </>
              ) : null}
              <div className="gm-sel" />
              <div className="gm-plate-l" style={inBuilding.at(PLATE_BOX, bw / 2, bh + 5, 1)} aria-hidden><svg viewBox={vb(PLATE_BOX)}><Plate it={it} /></svg></div>
              <button type="button" className="gm-hit" aria-label={label} aria-pressed={isSel} onClick={() => onSelect(it.key)} />
              {storm && (storm.weather === 'storm' || storm.weather === 'rough') ? (
                <Layer box={WX_BOX} className={`gm-wx gm-wx--${storm.weather}`} style={inBuilding.at(WX_BOX, bw * 0.64, -6, 1)}><StormArt weather={storm.weather} /></Layer>
              ) : null}
              {storm && storm.weather === 'clear' ? <Layer box={WX_BOX} className="gm-wx gm-wx--clear" style={inBuilding.at(WX_BOX, bw * 0.64, -2, 0.8)}><Sparks /></Layer> : null}
            </div>
          );
        })}

        {/* ── your house's banner, by the gate ── */}
        <div className="gm-abs gm-banner-l" style={at(BANNER_BOX, BANNER_AT.x, BANNER_AT.y)}><Banner house={house} /></div>

        {/* ── the student, at the door of the building studied last ── */}
        <div className={`gm-mv gm-walker${walking ? ' is-walking' : ''}${workingKey ? ' is-working' : ''}`} style={to(WALKER_BOX, pos.x, pos.y, WALK_SCALE)}>
          <div className="gm-turn" style={{ transform: `scaleX(${face})` }}><svg viewBox={vb(WALKER_BOX)} aria-hidden><Walker look={look} house={house} busy={!!workingKey} /></svg></div>
        </div>

        {/* ── the lamp lane: the ghost lantern of your best week against this week's ── */}
        {race.bestTotal > 0 ? (
          <>
            <div className="gm-mv gm-lane-l ghost" style={to(LANTERN_BOX, lanePos(race.ghost), LANE.y - 8, LANTERN_SCALE)}><svg viewBox={vb(LANTERN_BOX)} aria-hidden><PaperLantern ghost /></svg></div>
            <div className="gm-mv gm-lane-l you" style={to(LANTERN_BOX, lanePos(race.you), LANE.y - 8, LANTERN_SCALE)}><svg viewBox={vb(LANTERN_BOX)} aria-hidden><PaperLantern /></svg></div>
          </>
        ) : null}
      </div>
    </div>
  );
}
