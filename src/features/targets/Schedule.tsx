import { useMemo, useState } from 'react';
import { LuCalendarCheck, LuTriangleAlert } from 'react-icons/lu';
import { Button, Callout, Field, Input, Modal, Segmented, Stepper, useConfirm } from '../../components/ui';
import { useStudy } from '../../context/StudyContext';
import { addDays, diffDays, fmtDate, isValidYmd } from '../../lib/date';
import { clamp, fmtNum, plural } from '../../lib/format';
import { scheduleSyllabus } from '../../lib/schedule';
import { sfx } from '../../lib/sfx';
import type { TargetsApi } from '../../lib/targets';

/** Turn the topic list into a day-by-day plan, in one step. */
export function ScheduleModal({ open, onClose, t, onDone }: { open: boolean; onClose: () => void; t: TargetsApi; onDone: () => void }) {
  const { today, settings } = useStudy();
  const confirm = useConfirm();
  const exam = settings.targetExamDate;
  const left = isValidYmd(exam) ? diffDays(today, exam) : 0;
  const [from, setFrom] = useState(today);
  // Finish two weeks before the exam so the last stretch is for revision and mocks.
  const [to, setTo] = useState(() => (left > 30 ? addDays(exam, -14) : left > 1 ? addDays(exam, -1) : addDays(today, 29)));
  const [perDay, setPerDay] = useState<'1' | '2' | '3'>('2');
  const [hours, setHours] = useState<number | null>(null);

  const valid = isValidYmd(from) && isValidYmd(to) && from <= to && diffDays(from, to) < 400;
  const base = useMemo(() => (valid ? scheduleSyllabus(t.syllabus, { from, to, perDay: Number(perDay), hoursPerDay: settings.dailyGoalHours, plan: t.plan }) : null), [valid, t.syllabus, t.plan, from, to, perDay, settings.dailyGoalHours]);
  // Default hours a day: your goal, or more if the list will not fit otherwise.
  const auto = base ? clamp(Math.max(settings.dailyGoalHours, base.leftover > 0 ? base.neededPerDay : 0), 1, 16) : settings.dailyGoalHours;
  const perDayHours = hours ?? auto;
  const result = useMemo(() => (valid ? scheduleSyllabus(t.syllabus, { from, to, perDay: Number(perDay), hoursPerDay: perDayHours, plan: t.plan }) : null), [valid, t.syllabus, t.plan, from, to, perDay, perDayHours]);
  const replacing = (t.custom?.rows.length ?? 0) > 0;

  const create = async () => {
    if (!result || !result.rows.length) return;
    if (replacing && !(await confirm({ title: 'Replace your date plan?', body: 'The current rows and their ticks will be replaced by this schedule. Your syllabus list and study logs are not touched.', confirmLabel: 'Replace plan', danger: true }))) return;
    const selected = [...new Set(result.rows.map((r) => r.subject))];
    t.saveCustom({ config: { fromDate: from, toDate: to, subjectsPerDay: Number(perDay), selectedSubjects: selected }, rows: result.rows });
    t.saveCompletion({});
    sfx.play('success');
    onClose();
    onDone();
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="Schedule my syllabus" description="Spread the topics you have not finished over your study days. Papers take turns, and your rest days and Sundays are respected."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!result || !result.rows.length} onClick={create}><LuCalendarCheck aria-hidden /> Create schedule</Button></>}>
      <div className="col g-5">
        <div className="tg-fields">
          <Field label="Start"><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Finish by" error={isValidYmd(from) && isValidYmd(to) && from > to ? 'The finish date must come after the start.' : undefined} hint={left > 30 ? 'Two weeks before your exam, so the end is for revision.' : undefined}>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="col g-3">
          <span className="field-label">Papers on the same day</span>
          <Segmented<'1' | '2' | '3'> block label="Papers a day" value={perDay} onChange={setPerDay} options={[{ value: '1', label: 'One' }, { value: '2', label: 'Two' }, { value: '3', label: 'Three' }]} />
        </div>
        <div className="row between g-3 wrap">
          <div className="min-0"><span className="field-label">Hours on a study day</span><div className="t-xs dim">Your daily goal is {fmtNum(settings.dailyGoalHours)}h.</div></div>
          <Stepper value={perDayHours} min={1} max={16} step={0.5} label="hours per study day" onChange={setHours} />
        </div>
        {base && base.topics > 0 && base.neededPerDay >= 1 && Math.abs(base.neededPerDay - perDayHours) >= 0.25 ? (
          <Button variant="soft" size="sm" onClick={() => { setHours(clamp(base.neededPerDay, 1, 16)); }}>Spread evenly: {fmtNum(base.neededPerDay)}h a day until the finish date</Button>
        ) : null}
        {result ? (
          result.topics === 0 ? <Callout accent="good">Every topic is already ticked off. There is nothing left to schedule.</Callout>
          : result.leftover > 0.1 ? (
            <Callout icon={<LuTriangleAlert aria-hidden />} accent="warn">
              About {fmtNum(result.leftover, 1)} hours of topics do not fit before {fmtDate(to)}. Study about <b>{fmtNum(result.neededPerDay)}h</b> a day, or move the finish date later.
            </Callout>
          ) : (
            <p className="t-small muted" style={{ lineHeight: 1.6 }}>
              <b>{plural(result.topics, 'topic')}</b> ({fmtNum(result.hours, 1)}h) fit across <b>{plural(result.days, 'study day')}</b>
              {result.lastDate ? <>, finishing on <b>{fmtDate(result.lastDate, { weekday: true })}</b></> : null}. {result.lastDate && result.lastDate < to ? `That leaves ${plural(Math.max(0, diffDays(result.lastDate, to)), 'day')} spare before your finish date.` : ''}
            </p>
          )
        ) : <p className="t-small muted">Choose a valid range of up to 400 days.</p>}
      </div>
    </Modal>
  );
}
