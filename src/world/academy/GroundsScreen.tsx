import { useEffect, useState } from 'react';
import { LuBookOpen, LuCastle, LuCheck, LuDoorOpen, LuFileText, LuFlag, LuLamp, LuPlay, LuSparkles, LuTarget, LuUndo2, LuWind } from 'react-icons/lu';
import './map/grounds.css';
import './grounds-page.css';
import { Button, Card, CardHead, ProgressBar, Tag, useConfirm, useToast } from '../../components/ui';
import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { fmtDate, relativeDay } from '../../lib/date';
import { fmtHM, fmtNum } from '../../lib/format';
import { celebrate } from '../../lib/celebrate';
import { sfx } from '../../lib/sfx';
import { LEVELS } from '../../config/curriculum';
import { useWorld } from '..';
import { WorldMark } from '../WorldMark';
import { useSwitchWorld } from '../useSwitchWorld';
import { LEVEL_ORDER, seaStatus } from '../voyage/progress';
import type { Level } from '../../types';
import { Cast } from './art/cast/Cast';
import { HouseCrest } from './art/crests';
import { ChoosingLantern } from './art/props';
import { HOUSES } from './houses';
import { YEAR_NAME, YEAR_SHORT } from './grounds';
import { canRechoose } from './choosing';
import { useAcademy } from './academyState';
import { useAcademySummary } from './useAcademySummary';
import { GroundsMap } from './map/GroundsMap';
import { BuildingPanel, Houses, STATE_TAG, StudentEditor, Teachers, lastDate } from './GroundsParts';
import { Choosing } from './ChoosingCeremony';
import { CharterNight } from './CharterNight';
import { downloadSchoolRecord } from './recordPdf';

const DRAUGHT = { tail: 'Fair draught', cross: 'Cross draught', head: 'Head draught', calm: 'Still air' } as const;

export default function GroundsScreen() {
  const { academy } = useWorld();
  return academy ? <Grounds /> : <Invite />;
}

// ───────────────────────────── shown until the Lanternfell world is chosen ─────────────────────────────
function Invite() {
  const switchWorld = useSwitchWorld();
  return (
    <div className="gr-invite stagger">
      <Card className="gr-invite-card sheen acc-violet" size="roomy">
        <div className="gr-invite-art" aria-hidden>
          <Cast who="vane" expr="smile" size={104} /><WorldMark world="academy" size={112} /><Cast who="bellweather" expr="think" size={104} /><Cast who="madge" expr="cheer" size={104} />
        </div>
        <h2 className="gr-invite-title">Lanternfell Academy</h2>
        <p className="gr-invite-text">An optional world for your whole app. Foundation, Intermediate and Final become three parts of a school on a hill at night. Every paper is a building, every chapter you finish lights a window, and four teachers read your real numbers. You are chosen for one of four houses by how you actually study, and Charter Night waits at the end.</p>
        <div className="row g-3 wrap">
          <Button variant="primary" size="lg" onClick={() => switchWorld('academy')}><LuCastle />Enter Lanternfell</Button>
          <span className="t-small dim">You can switch back any time in Settings. Your data does not change.</span>
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────────── the Grounds screen ─────────────────────────────
function Grounds() {
  const { settings, stats, today } = useStudy();
  const timer = useTimer();
  const confirm = useConfirm();
  const toast = useToast();
  const { state: ac, patch, setLook, markCleared, unmarkCleared } = useAcademy();
  const { level, levelLabel, islands, storms, stormList, race, wind, daysLeft, dockName, dockKey, workingKey, prog, fraction, lines, student, won, measured, cup } = useAcademySummary();
  const [selected, setSelected] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [night, setNight] = useState(false);

  const clearedHere = !!ac.cleared[level];
  const sel = islands.find((i) => i.key === selected) ?? null;
  useEffect(() => { if (selected && !islands.some((i) => i.key === selected)) setSelected(null); }, [islands, selected]);
  const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1] ?? null;
  const canChoose = canRechoose(ac.chosenOn, today);
  const first = settings.displayName.trim().split(/\s+/)[0] || 'Student';
  const record = () => { void downloadSchoolRecord({ ac, islands, stats, settings, level, levelLabel, today, measured, cup }).then((ok) => { if (!ok) toast({ message: 'The school record could not be made', tone: 'bad' }); }); };

  const clearYear = async () => {
    const ok = await confirm({
      title: `Mark ${levelLabel} as cleared?`,
      body: level === 'final' ? 'This is the last year. Charter Night plays and the Charter is yours. Only you can mark this, and you can undo it later.' : `${YEAR_NAME[level]} is behind you. Only you can mark this, and you can undo it later.`,
      confirmLabel: 'Yes, I cleared it',
    });
    if (!ok) return;
    markCleared(level, today);
    sfx.play('rank');
    if (level === 'final') setNight(true); else celebrate({ kind: 'rank', title: `${YEAR_NAME[level]} cleared`, sub: nextLevel ? `Next: ${YEAR_NAME[nextLevel]}` : undefined, mood: 'cheer' });
  };

  return (
    <div className="gr stagger">
      <header className="gr-head">
        <div className="min-0">
          <h1 className="gr-title">The Grounds</h1>
          <p className="gr-sub">{levelLabel} · {YEAR_NAME[level]}{ac.house ? ` · ${HOUSES[ac.house].name}` : ''}</p>
        </div>
        <div className="gr-head-acts">
          {timer.active && timer.here ? <Tag accent="good"><LuPlay />In lesson: {timer.state.subject}</Tag> : <Button variant="primary" onClick={() => timer.openStart(dockName ?? undefined)}><LuPlay />Start a lesson</Button>}
        </div>
      </header>

      {!ac.house ? (
        <Card className="gr-prompt acc-gold" size="roomy">
          <ChoosingLantern size={104} lit={false} idPrefix="gprompt" />
          <div className="gr-prompt-copy">
            <h2>You have not been chosen yet</h2>
            <p>Three questions, and the old lantern reads your last four weeks of study. It then names your house: Ashwold, Mirewing, Emberquill or Hollowhearth. It takes about a minute.</p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setChoosing(true)}><LuSparkles />Begin the Choosing</Button>
        </Card>
      ) : null}

      <Journey level={level} cleared={ac.cleared} fraction={fraction} progress={prog} won={won} />

      <Card className="gr-chart" size="flush">
        <div className="gr-chart-head">
          <span className="gr-chip"><LuCastle />{YEAR_NAME[level]}</span>
          <span className={`gr-chip gr-wind is-${wind.kind}`}><LuWind />{DRAUGHT[wind.kind]}{wind.kind !== 'calm' ? <small>{fmtNum(wind.actual)} of {fmtNum(wind.needed)} h a day</small> : null}</span>
          <span className="gr-chip"><LuTarget />{Math.round(prog * 100)}% explored</span>
          {ac.house ? <span className="gr-chip gr-chip--house"><HouseCrest house={ac.house} size={20} idPrefix="gchip" />{HOUSES[ac.house].name}</span> : null}
        </div>
        {islands.length === 0 ? (
          <div className="gr-empty">No papers are selected for this year yet. Choose them in Your room.</div>
        ) : (
          <GroundsMap islands={islands} dockKey={dockKey} workingKey={workingKey} storms={storms} wind={wind} race={race} selected={selected} house={ac.house} look={ac.look}
            onSelect={(k) => { setSelected((s) => (s === k ? null : k)); sfx.play('select'); }} ahead={{ label: level === 'final' ? 'Charter Night' : `Next: ${YEAR_NAME[nextLevel ?? 'final']}`, glow: won }} />
        )}
        <ul className="gr-legend">
          <li><i className="gr-lg gr-lg--win" />Lit window: a chapter ticked in your plan</li>
          <li><i className="gr-lg gr-lg--mist" />Mist: not explored yet</li>
          <li><i className="gr-lg gr-lg--ivy" />Ivy: not visited for 10 days</li>
          <li><i className="gr-lg gr-lg--storm" />Storm cloud: a recent trial under 50%</li>
          <li><i className="gr-lg gr-lg--ghost" />Pale lantern: your best week</li>
        </ul>
      </Card>

      <div className="gr-row">
        <Card className="gr-panel acc-brand">
          {sel ? <BuildingPanel it={sel} storm={storms.get(sel.name.toLowerCase())} today={today} onClose={() => setSelected(null)} /> : (
            <div className="gr-panel-empty">
              <LuLamp aria-hidden />
              <h3>Choose a building</h3>
              <p>Tap a paper on the map to see how many windows are lit, when you last visited, and how its latest trial went.</p>
            </div>
          )}
        </Card>
        <Card className="gr-cond">
          <CardHead title="Conditions" sub="What the grounds say about this week" />
          <ul className="gr-cond-list">
            <li><span className="cd-ic"><LuWind /></span><div><b>{DRAUGHT[wind.kind]}</b><span>{wind.kind === 'calm' ? (daysLeft < 0 ? 'The examination date has passed. Set a new one in Your room.' : 'Add an exam date and a plan, and the draught will show your pace.') : `You average ${fmtNum(wind.actual)} h a day over the last week against the ${fmtNum(wind.needed)} h the timetable needs, with ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to go.`}</span></div></li>
            <li><span className="cd-ic"><LuFlag /></span><div><b>{stormList.length === 0 ? 'No recent trials' : stormList.some((s) => s.weather === 'storm' || s.weather === 'rough') ? 'Rough weather' : 'Clear skies'}</b><span>{stormList.length === 0 ? 'Trials from the last 45 days show up as weather over each building.' : stormList.some((s) => s.weather === 'storm' || s.weather === 'rough') ? `${stormList.filter((s) => s.weather === 'storm' || s.weather === 'rough').length} of ${stormList.length} recent trials went under 50%. Revise those papers and the cloud lifts.` : 'Every recent trial is at 50% or better.'}</span></div></li>
            <li><span className="cd-ic"><LuLamp /></span><div><b>The pale lantern</b><span>{race.bestTotal <= 0 ? 'Finish a full week and it becomes the pale lantern you try to overtake.' : race.ahead ? `You are ${fmtHM(race.you - race.ghost)} ahead of your best week at this point (${fmtHM(race.you)} against ${fmtHM(race.ghost)}).` : `You are ${fmtHM(race.ghost - race.you)} behind your best week at this point (${fmtHM(race.you)} against ${fmtHM(race.ghost)}).`}</span></div></li>
          </ul>
        </Card>
      </div>

      <Teachers lines={lines} />

      <Houses house={ac.house} chosenOn={ac.chosenOn} measured={measured} cup={cup} today={today} canChoose={canChoose} onChoose={() => setChoosing(true)} />

      <div className="gr-row gr-row--stu">
        <Card className="gr-student">
          <CardHead title="Your student" sub="You are the student. Make them look like you." />
          <div className="gr-stu-grid">
            <div className="gr-stu-view"><Cast who="student" expr={student.expr} size={150} look={ac.look} house={ac.house ?? undefined} title="Your student" /><p className="gr-say">{student.text}</p></div>
            <StudentEditor look={ac.look} onChange={setLook} />
          </div>
        </Card>
        <Card className="gr-finish acc-gold">
          <CardHead title={clearedHere ? `${levelLabel} cleared` : `Finish ${levelLabel}`} sub={clearedHere ? `You marked this year cleared on ${fmtDate(ac.cleared[level]!, { year: true })}.` : 'Only you decide when a year is behind you.'} />
          {clearedHere ? (
            <div className="col g-3">
              <p className="t-small muted">Well done. Everything you logged stays in your day book, and the school record keeps the story.</p>
              <div className="row g-3 wrap">
                {level === 'final' ? <Button variant="soft" onClick={() => setNight(true)}><LuPlay />Watch Charter Night</Button> : null}
                <Button variant="soft" onClick={record}><LuFileText />School record (PDF)</Button>
                <Button variant="ghost" onClick={() => { unmarkCleared(level); toast({ message: `${levelLabel} is open again`, tone: 'info' }); }}><LuUndo2 />Undo</Button>
              </div>
            </div>
          ) : (
            <div className="col g-3">
              <p className="t-small muted">{level === 'final' ? 'When you have cleared CA Final, tell the school. Charter Night begins and the Charter is signed in your name.' : `When you have cleared ${levelLabel}, tell the school and the next part of the grounds opens.`}</p>
              <div className="row g-3 wrap">
                <Button variant="primary" onClick={clearYear}><LuCheck />I cleared {levelLabel}</Button>
                <Button variant="ghost" onClick={record}><LuFileText />School record so far</Button>
              </div>
            </div>
          )}
          {won && level !== 'final' ? <p className="t-small dim">CA Final is already cleared, so the Charter is yours.</p> : null}
        </Card>
      </div>

      <Card className="gr-table-card">
        <CardHead title="All buildings" sub={`${islands.length} papers in ${YEAR_NAME[level]}`} />
        <div className="gr-table-wrap">
          <table className="gr-table">
            <thead><tr><th scope="col">Paper</th><th scope="col">Explored</th><th scope="col">Chapters</th><th scope="col">Hours</th><th scope="col">Last visit</th><th scope="col">State</th></tr></thead>
            <tbody>
              {islands.map((it) => (
                <tr key={it.key} className={`acc-${it.accent}${selected === it.key ? ' is-selected' : ''}`} onClick={() => setSelected(it.key)}>
                  <th scope="row"><span className="abbr">{it.abbrev}</span><span className="truncate">{it.name}</span></th>
                  <td><div className="gr-cell-bar"><ProgressBar value={it.progress * 100} accent={it.accent} size="thin" label={`${it.name} explored`} /><span className="t-num">{Math.round(it.progress * 100)}%</span></div></td>
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

      <p className="gr-note"><LuBookOpen aria-hidden />Buildings fill by the chapters you tick in your plan: each lit window is some of them. Hours studied clear most of the mist by themselves, and a building you leave alone for 10 days grows ivy. With no plan, 80 hours is a fully explored paper. Your house comes from how you really study, the cup changes every week, and only you decide when a year is cleared.</p>

      {choosing ? <Choosing measured={measured} onClose={() => setChoosing(false)} /> : null}
      {night ? <CharterNight name={first} house={ac.house} look={ac.look} totalHours={stats.totalStudiedHours} onRecord={record} onClose={() => { setNight(false); if (!ac.finaleSeen) patch({ finaleSeen: true }); }} /> : null}
    </div>
  );
}

// ───────────────────────────── the journey: three years and Charter Night ─────────────────────────────
function Journey({ level, cleared, fraction, progress, won }: { level: Level; cleared: Partial<Record<Level, string>>; fraction: number; progress: number; won: boolean }) {
  const pct = Math.round(fraction * 100);
  return (
    <Card className="gr-journey" size="roomy">
      <div className="gr-j-head">
        <div>
          <h2 className="gr-j-title">{won ? 'Charter Night is yours' : 'The long way to Charter Night'}</h2>
          <p className="gr-j-sub">{won ? 'Every year behind you. Every lantern in Lanternfell is lit for you.' : `${pct}% of the school is behind you. ${LEVELS.find((l) => l.id === level)?.short} is ${Math.round(progress * 100)}% explored.`}</p>
        </div>
        <span className="gr-j-pct t-num">{pct}<small>%</small></span>
      </div>
      <div className="gr-track" style={{ ['--f' as string]: fraction }}>
        <div className="gr-track-line"><i /></div>
        <span className="gr-marker" aria-hidden><WorldMark world="academy" size={30} /></span>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`gr-node n${i}${i < 3 && seaStatus(LEVEL_ORDER[i], level, cleared) === 'sailed' ? ' is-done' : ''}${i === 3 && won ? ' is-done' : ''}`}>{i === 3 ? <LuCastle /> : i === 0 ? <LuDoorOpen /> : <LuFlag />}</span>)}
        <div className="gr-years">
          {LEVEL_ORDER.map((l) => {
            const st = seaStatus(l, level, cleared);
            return (
              <div key={l} className={`gr-year is-${st}`}>
                <b>{YEAR_SHORT[l]}</b>
                <span>{LEVELS.find((x) => x.id === l)?.short}{cleared[l] ? ` · cleared ${fmtDate(cleared[l]!)}` : st === 'current' ? ' · you are here' : st === 'sailed' ? ' · behind you' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
