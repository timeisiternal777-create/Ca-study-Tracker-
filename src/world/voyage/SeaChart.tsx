import { useEffect, useState } from 'react';
import { LuAnchor, LuBookOpen, LuCheck, LuCompass, LuFileText, LuFlag, LuPlay, LuRotateCcw, LuSailboat, LuTarget, LuUndo2, LuWind } from 'react-icons/lu';
import './voyage.css';
import { Button, Card, CardHead, Field, Input, ProgressBar, Segmented, Tag, useConfirm, useToast } from '../../components/ui';
import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { fmtDate, relativeDay } from '../../lib/date';
import { fmtHM, fmtNum } from '../../lib/format';
import { navigateTo } from '../../lib/nav';
import { celebrate } from '../../lib/celebrate';
import { sfx } from '../../lib/sfx';
import { LEVELS } from '../../config/curriculum';
import { useWorld } from '..';
import { VoyageMark } from '../VoyageMark';
import { Crew, ACCESSORY_NAMES, COAT_COLORS, COAT_NAMES, HAIR_COLORS, HAIR_COLOR_NAMES, HAIR_STYLE_NAMES, SKIN_NAMES, SKIN_TONES } from '../crew/Crew';
import { CREW, CREW_ORDER } from '../crew/types';
import { CAPTAIN_CHOICES, DEFAULT_SHIP, SHIP_NAME_MAX, useVoyage, type Captain } from './voyageState';
import { LEVEL_ORDER, SEA_NAME, SHIP_CLASS, seaStatus, stormsFor, treasureWon, type Island } from './progress';
import { Sea } from './Sea';
import { useVoyageSummary } from './useVoyageSummary';
import { Finale } from './Finale';
import { downloadVoyageLog } from './voyagePdf';
import type { Level } from '../../types';

const STATE_TAG: Record<Island['state'], { label: string; accent: 'good' | 'brand' | 'warn' | undefined }> = {
  cleared: { label: 'Cleared', accent: 'good' }, exploring: { label: 'Exploring', accent: 'brand' }, neglected: { label: 'Fogging over', accent: 'warn' }, uncharted: { label: 'Uncharted', accent: undefined },
};
const WIND_WORDS = { tail: 'Tailwind', cross: 'Crosswind', head: 'Headwind', calm: 'Calm' } as const;

export default function SeaChart() {
  const { voyage } = useWorld();
  return voyage ? <Voyage /> : <Invite />;
}

// ───────────────────────────── shown until the Voyage world is chosen ─────────────────────────────
function Invite() {
  const { updateSettings } = useStudy();
  return (
    <div className="voy-invite stagger">
      <Card className="voy-invite-card sheen acc-gold" size="roomy">
        <div className="voy-invite-art" aria-hidden>
          <VoyageMark size={112} />
          <Crew who="odalys" expr="smile" size={104} />
          <Crew who="tally" expr="cheer" size={104} />
          <Crew who="brine" expr="smile" size={104} />
        </div>
        <h2 className="voy-invite-title">The Ledger Seas</h2>
        <p className="voy-invite-text">An optional world for your whole app. Foundation, Intermediate and Final become three seas. Every paper is an island, every chapter you finish lights a lantern, and the Golden Ledger waits at the end. The crew reads your real numbers: pace, mocks, revision, breaks.</p>
        <div className="row g-3 wrap">
          <Button variant="primary" size="lg" onClick={() => updateSettings({ worldTheme: 'voyage' })}><LuSailboat />Set sail with the Voyage theme</Button>
          <span className="t-small dim">You can switch back any time in Settings. Your data does not change.</span>
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────────── the Voyage screen ─────────────────────────────
function Voyage() {
  const { settings, stats, studyLogs, today } = useStudy();
  const timer = useTimer();
  const confirm = useConfirm();
  const toast = useToast();
  const { patch, markCleared, unmarkCleared } = useVoyage();
  const { level, levelLabel, vs, islands, storms, stormList, race, wind, daysLeft, dockName, dockKey, workingKey, prog, fraction, lines, won } = useVoyageSummary();
  const [selected, setSelected] = useState<string | null>(null);
  const [finale, setFinale] = useState(false);

  const clearedHere = !!vs.cleared[level];
  const sel = islands.find((i) => i.key === selected) ?? null;
  useEffect(() => { if (selected && !islands.some((i) => i.key === selected)) setSelected(null); }, [islands, selected]);

  const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1] ?? null;
  const clearSea = async () => {
    const ok = await confirm({
      title: `Mark ${levelLabel} as cleared?`,
      body: level === 'final' ? 'This is the last sea. The ship reaches the Golden Ledger and the ending plays. Only you can mark this, and you can undo it later.' : `The ship leaves ${SEA_NAME[level]} behind. Only you can mark this, and you can undo it later.`,
      confirmLabel: 'Yes, I cleared it',
    });
    if (!ok) return;
    markCleared(level, today);
    sfx.play('rank');
    if (level === 'final') { setFinale(true); } else celebrate({ kind: 'rank', title: `${SEA_NAME[level]} cleared`, sub: nextLevel ? `Next: ${SEA_NAME[nextLevel]}` : undefined, mood: 'cheer' });
  };

  return (
    <div className="voy stagger">
      <header className="voy-head">
        <div className="min-0">
          <h1 className="voy-title">Sea chart</h1>
          <p className="voy-sub">{levelLabel} · {SEA_NAME[level]} · {vs.shipName}</p>
        </div>
        <div className="voy-head-acts">
          {timer.active && timer.here ? <Tag accent="good"><LuPlay />Sailing to {timer.state.subject}</Tag> : <Button variant="primary" onClick={() => timer.openStart(dockName ?? undefined)}><LuPlay />Set sail</Button>}
        </div>
      </header>

      <Journey level={level} cleared={vs.cleared} fraction={fraction} progress={prog} won={won} />

      <Card className="voy-chart" size="flush">
        <div className="voy-chart-head">
          <span className="voy-chip"><LuCompass />{SEA_NAME[level]}</span>
          <span className={`voy-chip voy-wind is-${wind.kind}`}><LuWind />{WIND_WORDS[wind.kind]}{wind.kind !== 'calm' ? <small>{fmtNum(wind.actual)} of {fmtNum(wind.needed)} h a day</small> : null}</span>
          <span className="voy-chip"><LuTarget />{Math.round(prog * 100)}% explored</span>
        </div>
        {islands.length === 0 ? (
          <div className="voy-empty">No papers are selected for this sea yet. Choose them in Settings.</div>
        ) : (
          <Sea islands={islands} cls={SHIP_CLASS[level]} dockKey={dockKey} workingKey={workingKey} storms={storms} wind={wind} race={race} selected={selected}
            onSelect={(k) => { setSelected((s) => (s === k ? null : k)); sfx.play('select'); }} shipName={vs.shipName} treasure={level === 'final'} treasureWon={won} nextSea={nextLevel ? SEA_NAME[nextLevel] : null} />
        )}
        <ul className="voy-legend">
          <li><i className="lg lg--lantern" />Lantern: a chapter ticked in your plan</li>
          <li><i className="lg lg--fog" />Fog: not explored yet</li>
          <li><i className="lg lg--storm" />Storm: a recent mock under 50%</li>
          <li><i className="lg lg--ghost" />Ghost ship: your best week</li>
        </ul>
      </Card>

      <div className="voy-row">
        <Card className="voy-panel acc-brand">
          {sel ? <IslandPanel it={sel} storm={storms.get(sel.name.toLowerCase())} today={today} onClose={() => setSelected(null)} /> : (
            <div className="voy-panel-empty">
              <LuAnchor aria-hidden />
              <h3>Choose an island</h3>
              <p>Tap a paper on the chart to see how much of it is explored, when you last visited, and how its latest mock went.</p>
            </div>
          )}
        </Card>
        <Card className="voy-cond">
          <CardHead title="Conditions" sub="What the sea says about this week" />
          <ul className="voy-cond-list">
            <li><span className="cd-ic"><LuWind /></span><div><b>{WIND_WORDS[wind.kind]}</b><span>{wind.kind === 'calm' ? (daysLeft < 0 ? 'The exam date has passed. Set a new one in Settings.' : 'Add an exam date and a plan, and the wind will show your pace.') : `You average ${fmtNum(wind.actual)} h a day. The plan needs ${fmtNum(wind.needed)} h a day to finish in time.`}</span></div></li>
            <li><span className="cd-ic"><LuFlag /></span><div><b>{stormList.length === 0 ? 'No recent mocks' : stormList.some((s) => s.weather === 'storm' || s.weather === 'rough') ? 'Rough water' : 'Calm seas'}</b><span>{stormList.length === 0 ? 'Mocks in the last 45 days show up as weather over their islands.' : stormList.map((s) => `${abbrOf(islands, s.subject)} ${Math.round(s.pct)}%`).join(' · ')}</span></div></li>
            <li><span className="cd-ic"><LuSailboat /></span><div><b>Ghost ship</b><span>{race.bestTotal <= 0 ? 'Finish a full week and it becomes your ghost to beat.' : race.ahead ? `You are ${fmtHM(race.you - race.ghost)} ahead of your best week at this point (${fmtHM(race.you)} so far).` : `Your best week had ${fmtHM(race.ghost)} by now; you have ${fmtHM(race.you)}. ${fmtHM(race.ghost - race.you)} to pass it.`}</span></div></li>
          </ul>
        </Card>
      </div>

      <section className="voy-crew" aria-label="The crew">
        {CREW_ORDER.map((id) => {
          const ln = lines[id];
          return (
            <Card key={id} className="voy-crew-card" size="tight">
              <Crew who={id} expr={ln.expr} size={92} title={`${CREW[id].name}, ${CREW[id].role}`} />
              <div className="voy-crew-body">
                <div className="voy-crew-name"><b>{CREW[id].name}</b><small>{CREW[id].role}</small></div>
                <p className="voy-say">{ln.text}</p>
              </div>
            </Card>
          );
        })}
      </section>

      <div className="voy-row voy-row--cap">
        <Card className="voy-captain">
          <CardHead title="Your ship" sub="Sol is the captain. Make Sol look like you." />
          <div className="voy-cap-grid">
            <div className="voy-cap-view"><Crew who="sol" expr={lines.sol.expr} size={150} captain={vs.captain} title="Sol, your captain" /><p className="voy-say">{lines.sol.text}</p></div>
            <CaptainEditor />
          </div>
        </Card>
        <Card className="voy-finish acc-gold">
          <CardHead title={clearedHere ? `${levelLabel} cleared` : `Finish ${levelLabel}`} sub={clearedHere ? `You marked this sea cleared on ${fmtDate(vs.cleared[level]!, { year: true })}.` : 'Only you decide when a sea is behind you.'} />
          {clearedHere ? (
            <div className="col g-3">
              <Callout2 />
              <div className="row g-3 wrap">
                {level === 'final' ? <Button variant="soft" onClick={() => setFinale(true)}><LuPlay />Watch the ending</Button> : null}
                <Button variant="soft" onClick={() => { void downloadVoyageLog({ vs, islands, stats, settings, level, levelLabel, today }).then((ok) => { if (!ok) toast({ message: 'The voyage log could not be made', tone: 'bad' }); }); }}><LuFileText />Voyage log (PDF)</Button>
                <Button variant="ghost" onClick={() => { unmarkCleared(level); toast({ message: `${levelLabel} is open again`, tone: 'info' }); }}><LuUndo2 />Undo</Button>
              </div>
            </div>
          ) : (
            <div className="col g-3">
              <p className="t-small muted">{level === 'final' ? 'When you have cleared CA Final, tell the ship. The Golden Ledger opens and the voyage ends the way it should.' : `When you have cleared ${levelLabel}, tell the ship and the next sea opens.`}</p>
              <div className="row g-3 wrap">
                <Button variant="primary" onClick={clearSea}><LuCheck />I cleared {levelLabel}</Button>
                <Button variant="ghost" onClick={() => { void downloadVoyageLog({ vs, islands, stats, settings, level, levelLabel, today }).then((ok) => { if (!ok) toast({ message: 'The voyage log could not be made', tone: 'bad' }); }); }}><LuFileText />Voyage log so far</Button>
              </div>
            </div>
          )}
          {won && level !== 'final' ? <p className="t-small dim">CA Final is already cleared, so the Golden Ledger is yours.</p> : null}
        </Card>
      </div>

      <Card className="voy-table-card">
        <CardHead title="All islands" sub={`${islands.length} papers in ${SEA_NAME[level]}`} />
        <div className="voy-table-wrap">
          <table className="voy-table">
            <thead><tr><th scope="col">Paper</th><th scope="col">Explored</th><th scope="col">Lanterns</th><th scope="col">Hours</th><th scope="col">Last visit</th><th scope="col">State</th></tr></thead>
            <tbody>
              {islands.map((it) => (
                <tr key={it.key} className={`acc-${it.accent}${selected === it.key ? ' is-selected' : ''}`} onClick={() => setSelected(it.key)}>
                  <th scope="row"><span className="abbr">{it.abbrev}</span><span className="truncate">{it.name}</span></th>
                  <td><div className="voy-cell-bar"><ProgressBar value={it.progress * 100} accent={it.accent} size="thin" label={`${it.name} explored`} /><span className="t-num">{Math.round(it.progress * 100)}%</span></div></td>
                  <td className="t-num">{it.lanterns.lit}/{it.lanterns.total}</td>
                  <td className="t-num">{fmtHM(it.hours)}</td>
                  <td>{it.daysSince === null ? 'Never' : relativeDay(lastDate(it, today), today)}</td>
                  <td><Tag accent={STATE_TAG[it.state].accent}>{STATE_TAG[it.state].label}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="voy-note"><LuBookOpen aria-hidden />Islands fill by the chapters you tick in your plan. Hours studied clear most of the fog by themselves, and an island you leave alone for 10 days fogs over a little. With no plan, 80 hours is a fully explored paper. Only you can mark a sea cleared.</p>

      {finale ? <Finale shipName={vs.shipName} captain={vs.captain} name={settings.displayName.trim().split(/\s+/)[0] || 'Captain'} totalHours={stats.totalStudiedHours} onClose={() => { setFinale(false); if (!vs.finaleSeen) patch({ finaleSeen: true }); }} /> : null}
    </div>
  );
}

function abbrOf(islands: Island[], subject: string) { return islands.find((i) => i.name.toLowerCase() === subject.toLowerCase())?.abbrev ?? subject; }
function lastDate(it: Island, today: string) {
  const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - (it.daysSince ?? 0));
  const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const Callout2 = () => <p className="t-small muted">Well sailed. Everything you logged stays in your study log, and the voyage log keeps the story.</p>;

// ───────────────────────────── the journey: three seas and the treasure ─────────────────────────────
function Journey({ level, cleared, fraction, progress, won }: { level: Level; cleared: Partial<Record<Level, string>>; fraction: number; progress: number; won: boolean }) {
  const pct = Math.round(fraction * 100);
  return (
    <Card className="voy-journey" size="roomy">
      <div className="voy-j-head">
        <div><h2 className="voy-j-title">{won ? 'The Golden Ledger is yours' : 'The long way to the Golden Ledger'}</h2><p className="voy-j-sub">{won ? 'Every sea sailed. Well done, Captain.' : `${pct}% of the voyage behind you. ${LEVELS.find((l) => l.id === level)?.short} is ${Math.round(progress * 100)}% explored.`}</p></div>
        <span className="voy-j-pct t-num">{pct}<small>%</small></span>
      </div>
      <div className="voy-track" style={{ ['--f' as string]: fraction }}>
        <div className="voy-track-line"><i /></div>
        <span className="voy-boat" aria-hidden><VoyageMark size={30} /></span>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`voy-node n${i}${i < 3 && seaStatus(LEVEL_ORDER[i], level, cleared) === 'sailed' ? ' is-done' : ''}${i === 3 && won ? ' is-done' : ''}`}>{i === 3 ? <LuAnchor /> : i === 0 ? <LuSailboat /> : <LuFlag />}</span>)}
        <div className="voy-seas">
          {LEVEL_ORDER.map((l) => {
            const st = seaStatus(l, level, cleared);
            return (
              <div key={l} className={`voy-sea is-${st}`}>
                <b>{SEA_NAME[l]}</b>
                <span>{LEVELS.find((x) => x.id === l)?.short}{cleared[l] ? ` · cleared ${fmtDate(cleared[l]!)}` : st === 'current' ? ' · you are here' : st === 'sailed' ? ' · sailed' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ───────────────────────────── one island, up close ─────────────────────────────
function IslandPanel({ it, storm, today, onClose }: { it: Island; storm: ReturnType<typeof stormsFor> extends Map<string, infer S> ? S | undefined : never; today: string; onClose: () => void }) {
  const timer = useTimer();
  const tag = STATE_TAG[it.state];
  return (
    <div className={`voy-isl acc-${it.accent}`}>
      <div className="voy-isl-head">
        <span className="abbr">{it.abbrev}</span>
        <div className="min-0"><h3>{it.name}</h3><p>Paper {it.paperNumber} · {it.marks} marks</p></div>
        <Tag accent={tag.accent}>{tag.label}</Tag>
      </div>
      <div className="voy-isl-bar"><ProgressBar value={it.progress * 100} accent={it.accent} label={`${it.name} explored`} /><b className="t-num">{Math.round(it.progress * 100)}%</b></div>
      <dl className="voy-isl-stats">
        <div><dt>Lanterns</dt><dd className="t-num">{it.lanterns.lit}<small> of {it.lanterns.total}</small></dd></div>
        <div><dt>Hours</dt><dd className="t-num">{fmtHM(it.hours)}<small> of {fmtHM(it.targetHours)}</small></dd></div>
        <div><dt>Chapters</dt><dd className="t-num">{it.topics > 0 ? <>{it.topicsDone}<small> of {it.topics}</small></> : <small>none in the plan</small>}</dd></div>
        <div><dt>Last visit</dt><dd>{it.daysSince === null ? 'Never' : it.daysSince === 0 ? 'Today' : `${it.daysSince} ${it.daysSince === 1 ? 'day' : 'days'} ago`}</dd></div>
      </dl>
      {storm ? <p className={`voy-isl-weather is-${storm.weather}`}><LuFlag aria-hidden />Latest mock: {storm.marks}/{storm.max} ({Math.round(storm.pct)}%), {relativeDay(storm.date, today)}.</p> : <p className="voy-isl-weather"><LuFlag aria-hidden />No mock in the last 45 days.</p>}
      {it.neglected ? <p className="voy-isl-weather is-rough"><LuRotateCcw aria-hidden />The fog is coming back. One revision hour clears it.</p> : null}
      <p className="voy-isl-how">{it.basis === 'chapters' ? 'Lanterns are chapters you ticked in the plan. Hours clear up to 85% of the fog; ticking every chapter clears the rest.' : 'No chapters for this paper in your plan, so it clears by hours: 80 hours is a fully explored island.'}</p>
      <div className="row g-2 wrap">
        <Button variant="primary" size="sm" onClick={() => timer.openStart(it.name)}><LuPlay />Sail here</Button>
        <Button size="sm" variant="soft" onClick={() => navigateTo('TARGETS')}><LuBookOpen />Chapters</Button>
        <Button size="sm" variant="soft" onClick={() => navigateTo('MOCK')}><LuFlag />Log a mock</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

// ───────────────────────────── make Sol look like you ─────────────────────────────
function Swatches({ label, value, count, colors, names, onPick }: { label: string; value: number; count: number; colors: string[]; names: string[]; onPick: (i: number) => void }) {
  return (
    <div className="voy-sw" role="group" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" className={`voy-swatch${value === i ? ' is-on' : ''}`} style={{ background: colors[i] }} aria-label={names[i]} aria-pressed={value === i} title={names[i]} onClick={() => onPick(i)} />
      ))}
    </div>
  );
}

function CaptainEditor() {
  const { state: vs, patch, setCaptain } = useVoyage();
  const [name, setName] = useState(vs.shipName);
  useEffect(() => setName(vs.shipName), [vs.shipName]);
  const c: Captain = vs.captain;
  const commit = () => { const n = name.replace(/\s+/g, ' ').trim(); patch({ shipName: n || DEFAULT_SHIP }); if (!n) setName(DEFAULT_SHIP); };
  return (
    <div className="voy-edit">
      <Field label="Ship's name" hint={`${name.length}/${SHIP_NAME_MAX}`}>
        <Input value={name} maxLength={SHIP_NAME_MAX} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} placeholder={DEFAULT_SHIP} />
      </Field>
      <Field label="Skin"><Swatches label="Skin tone" value={c.skin} count={CAPTAIN_CHOICES.skin} colors={SKIN_TONES.map((s) => s.skin)} names={SKIN_NAMES} onPick={(i) => setCaptain({ skin: i })} /></Field>
      <Field label="Hair colour"><Swatches label="Hair colour" value={c.hairColor} count={CAPTAIN_CHOICES.hairColor} colors={HAIR_COLORS} names={HAIR_COLOR_NAMES} onPick={(i) => setCaptain({ hairColor: i })} /></Field>
      <Field label="Coat"><Swatches label="Coat colour" value={c.coat} count={CAPTAIN_CHOICES.coat} colors={COAT_COLORS} names={COAT_NAMES} onPick={(i) => setCaptain({ coat: i })} /></Field>
      <Field label="Hair style"><Segmented<string> value={String(c.hair)} options={HAIR_STYLE_NAMES.map((n, i) => ({ value: String(i), label: n }))} onChange={(v) => setCaptain({ hair: Number(v) })} label="Hair style" /></Field>
      <Field label="Wearing"><Segmented<string> value={String(c.accessory)} options={ACCESSORY_NAMES.map((n, i) => ({ value: String(i), label: n }))} onChange={(v) => setCaptain({ accessory: Number(v) })} label="Accessory" /></Field>
    </div>
  );
}
