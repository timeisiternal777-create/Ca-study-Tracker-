import { useId, useMemo } from 'react';
import { LuBookOpen, LuCloudLightning, LuFlag, LuPlay, LuRotateCcw, LuSparkles } from 'react-icons/lu';
import { Button, Card, CardHead, Field, ProgressBar, Segmented, Tag } from '../../components/ui';
import { useTimer } from '../../context/TimerContext';
import { fmtDate, relativeDay } from '../../lib/date';
import { fmtHM } from '../../lib/format';
import { navigateTo } from '../../lib/nav';
import { vb } from '../voyage/layer';
import type { Island, Storm } from '../voyage/progress';
import { HAIR_COLORS, HAIR_COLOR_NAMES, SKIN_NAMES, SKIN_TONES } from '../crew/Crew';
import { Cast } from './art/cast/Cast';
import { CAST, CAST_ORDER, ROBE_COLORS, ROBE_NAMES, STUDENT_ACCESSORY_NAMES, STUDENT_CHOICES, STUDENT_HAIR_NAMES, type StudentLook } from './art/cast/types';
import { HouseCrest } from './art/crests';
import { CommonDefs } from './art/kit';
import { LANDMARKS } from './art/landmarks';
import { Well } from './art/props';
import { HOUSES, HOUSE_ORDER, type HouseId } from './houses';
import { landmarkIdFor, litFlags, windowsLit } from './grounds';
import { VIRTUES, rechooseFrom, virtueLabel, type Cup, type Measured } from './choosing';
import type { TeacherId, TeacherLine } from './lines';

/** The date (YYYY-MM-DD) a paper was last studied, worked back from how many days ago that was. */
export function lastDate(it: Island, today: string) {
  const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - (it.daysSince ?? 0));
  const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const STATE_TAG: Record<Island['state'], { label: string; accent: 'good' | 'brand' | 'warn' | undefined }> = {
  cleared: { label: 'Cleared', accent: 'good' }, exploring: { label: 'In progress', accent: 'brand' }, neglected: { label: 'Ivy growing', accent: 'warn' }, uncharted: { label: 'Not opened', accent: undefined },
};

// ───────────────────────────── one building, up close ─────────────────────────────

export function BuildingPanel({ it, storm, today, onClose }: { it: Island; storm: Storm | undefined; today: string; onClose: () => void }) {
  const timer = useTimer();
  const id = `gp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const def = LANDMARKS[landmarkIdFor(it.key, it.paperNumber)];
  const n = windowsLit(it.lanterns.lit, it.lanterns.total, def.slots);
  const lit = useMemo(() => litFlags(it.paperNumber * 7 + 3, n, def.slots), [it.paperNumber, n, def.slots]);
  const tag = STATE_TAG[it.state];
  return (
    <div className={`gr-bp acc-${it.accent}`}>
      <div className={`gr-bp-art${it.state === 'cleared' ? ' is-cleared' : ''}`} aria-hidden>
        <svg viewBox={vb(def.box)}><CommonDefs id={id} /><def.Art id={id} lit={lit} /></svg>
      </div>
      <div className="gr-bp-body">
        <div className="gr-bp-head">
          <span className="abbr">{it.abbrev}</span>
          <div className="min-0"><h3>{it.name}</h3><p>{def.name} · Paper {it.paperNumber} · {it.marks} marks</p></div>
          <Tag accent={tag.accent}>{tag.label}</Tag>
        </div>
        <p className="gr-bp-blurb">{def.blurb}</p>
        <div className="gr-bp-bar"><ProgressBar value={it.progress * 100} accent={it.accent} label={`${it.name} explored`} /><b className="t-num">{Math.round(it.progress * 100)}%</b></div>
        <dl className="gr-bp-stats">
          <div><dt>Windows lit</dt><dd className="t-num">{n}<small> of {def.slots}</small></dd></div>
          <div><dt>Hours</dt><dd className="t-num">{fmtHM(it.hours)}<small> of {fmtHM(it.targetHours)}</small></dd></div>
          <div><dt>Chapters</dt><dd className="t-num">{it.topics > 0 ? <>{it.topicsDone}<small> of {it.topics}</small></> : <small>none in the plan</small>}</dd></div>
          <div><dt>Last visit</dt><dd>{it.daysSince === null ? 'Never' : it.daysSince === 0 ? 'Today' : `${it.daysSince} ${it.daysSince === 1 ? 'day' : 'days'} ago`}</dd></div>
        </dl>
        {storm ? <p className={`gr-bp-wx is-${storm.weather}`}><LuCloudLightning aria-hidden />Latest trial: {storm.marks}/{storm.max} ({Math.round(storm.pct)}%), {relativeDay(storm.date, today)}.</p> : <p className="gr-bp-wx"><LuFlag aria-hidden />No trial in the last 45 days.</p>}
        {it.neglected ? <p className="gr-bp-wx is-rough"><LuRotateCcw aria-hidden />Ivy is creeping over the door. One revision hour clears it.</p> : null}
        <p className="gr-bp-how">{it.basis === 'chapters' ? 'Windows light for chapters you tick in the plan. Hours clear most of the mist; ticking every chapter clears the rest.' : 'No chapters for this paper in your plan, so it clears by hours: 80 hours is a fully explored building.'}</p>
        <div className="row g-2 wrap">
          <Button variant="primary" size="sm" onClick={() => timer.openStart(it.name)}><LuPlay />Study here</Button>
          <Button size="sm" variant="soft" onClick={() => navigateTo('TARGETS')}><LuBookOpen />Chapters</Button>
          <Button size="sm" variant="soft" onClick={() => navigateTo('MOCK')}><LuFlag />Log a trial</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── the four teachers ─────────────────────────────

export function Teachers({ lines }: { lines: Record<TeacherId, TeacherLine> }) {
  return (
    <section className="gr-teachers" aria-label="The teachers">
      {(CAST_ORDER as TeacherId[]).map((id) => {
        const ln = lines[id];
        return (
          <Card key={id} className="gr-teacher" size="tight">
            <Cast who={id} expr={ln.expr} size={96} title={`${CAST[id].name}, ${CAST[id].role}`} />
            <div className="gr-teacher-body">
              <div className="gr-teacher-name"><b>{CAST[id].name}</b><small>{CAST[id].role}</small></div>
              <p className="gr-say">{ln.text}</p>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

// ───────────────────────────── the four wells, the cup and the Choosing ─────────────────────────────

export function Houses({ house, chosenOn, measured, cup, today, canChoose, onChoose }: { house: HouseId | null; chosenOn: string | null; measured: Measured; cup: Cup; today: string; canChoose: boolean; onChoose: () => void }) {
  const next = rechooseFrom(chosenOn);
  const sub = measured.daysOfData > 0 ? `How full each virtue is, from your last 28 days (${measured.daysOfData} ${measured.daysOfData === 1 ? 'day' : 'days'} with study logged).` : 'Wells fill from your real study days. Log some study and they start to rise.';
  return (
    <Card className="gr-houses" size="roomy">
      <CardHead title="The four wells" sub={sub}
        action={canChoose
          ? <Button variant={house ? 'soft' : 'primary'} onClick={onChoose}><LuSparkles />{house ? 'Be chosen again' : 'Begin the Choosing'}</Button>
          : <span className="t-small dim">Next Choosing from {next ? fmtDate(next, { year: true }) : '…'}</span>} />
      <div className="gr-wells">
        {HOUSE_ORDER.map((h) => {
          const virtue = HOUSES[h].virtue; const v = measured.virtues[virtue];
          return (
            <div key={h} className={`gr-well${house === h ? ' is-yours' : ''}${cup.winner === h ? ' is-cup' : ''}`}>
              <Well house={h} level={v / 100} size={118} idPrefix={`gw${h}`} />
              <b className="gr-well-name">{HOUSES[h].name}</b>
              <span className="gr-well-virtue">{virtueLabel(virtue)} <b className="t-num">{v}</b><small>/100</small></span>
              <small className="gr-well-from">{HOUSES[h].measuredFrom}</small>
              {house === h ? <Tag accent="brand">Your house</Tag> : null}
            </div>
          );
        })}
      </div>
      <div className={`gr-cup${cup.winner ? '' : ' gr-cup--none'}`}>
        {cup.winner ? (
          <>
            <HouseCrest house={cup.winner} size={54} title={`${HOUSES[cup.winner].name} crest`} idPrefix="gcup" />
            <div className="min-0">
              <b>{HOUSES[cup.winner].name} holds the cup this week</b>
              <span>{virtueLabel(cup.virtue!)} is the strongest virtue over the last 7 days ({cup.score}/100){house && cup.winner === house ? ' and it is your own house.' : '.'}</span>
            </div>
          </>
        ) : (
          <div className="min-0"><b>No cup this week yet</b><span>The strongest virtue of the last 7 days takes it. Log some study and one of the wells will start to lead.</span></div>
        )}
        <ul className="gr-cup-bars" aria-label="Virtues over the last 7 days">
          {VIRTUES.map((v) => {
            const hh = HOUSE_ORDER.find((x) => HOUSES[x].virtue === v)!;
            return <li key={v}><span>{virtueLabel(v)}</span><i style={{ ['--w' as string]: `${cup.weekly[v]}%`, ['--c' as string]: HOUSES[hh].colors.main }} /><b className="t-num">{cup.weekly[v]}</b></li>;
          })}
        </ul>
      </div>
    </Card>
  );
}

// ───────────────────────────── make the student look like you ─────────────────────────────

function Swatches({ label, value, count, colors, names, onPick }: { label: string; value: number; count: number; colors: string[]; names: string[]; onPick: (i: number) => void }) {
  return (
    <div className="gr-sw" role="group" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" className={`gr-swatch${value === i ? ' is-on' : ''}`} style={{ background: colors[i] }} aria-label={names[i]} aria-pressed={value === i} title={names[i]} onClick={() => onPick(i)} />
      ))}
    </div>
  );
}

export function StudentEditor({ look, onChange }: { look: StudentLook; onChange: (p: Partial<StudentLook>) => void }) {
  return (
    <div className="gr-edit">
      <Field label="Skin"><Swatches label="Skin tone" value={look.skin} count={STUDENT_CHOICES.skin} colors={SKIN_TONES.map((s) => s.skin)} names={SKIN_NAMES} onPick={(i) => onChange({ skin: i })} /></Field>
      <Field label="Hair colour"><Swatches label="Hair colour" value={look.hairColor} count={STUDENT_CHOICES.hairColor} colors={HAIR_COLORS} names={HAIR_COLOR_NAMES} onPick={(i) => onChange({ hairColor: i })} /></Field>
      <Field label="Robe"><Swatches label="Robe colour" value={look.robe} count={STUDENT_CHOICES.robe} colors={ROBE_COLORS} names={ROBE_NAMES} onPick={(i) => onChange({ robe: i })} /></Field>
      <Field label="Hair style"><Segmented<string> value={String(look.hair)} options={STUDENT_HAIR_NAMES.map((n, i) => ({ value: String(i), label: n }))} onChange={(v) => onChange({ hair: Number(v) })} label="Hair style" /></Field>
      <Field label="Wearing"><Segmented<string> value={String(look.accessory)} options={STUDENT_ACCESSORY_NAMES.map((n, i) => ({ value: String(i), label: n }))} onChange={(v) => onChange({ accessory: Number(v) })} label="Accessory" /></Field>
    </div>
  );
}

