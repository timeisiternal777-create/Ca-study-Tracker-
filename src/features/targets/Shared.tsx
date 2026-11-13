import { useMemo, useState } from 'react';
import { LuCalendarDays, LuPlus, LuSlidersHorizontal, LuTrash2 } from 'react-icons/lu';
import { Button, Card, CardHead, Chip, Field, Input, Modal, Segmented, Stepper, Switch, useConfirm } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { addDays, diffDays, eachDay, fmtDate, isValidYmd, parseYmd } from '../../lib/date';
import { clamp, plural, uid } from '../../lib/format';
import { sfx } from '../../lib/sfx';
import { buildDateRows, type TargetsApi } from '../../lib/targets';

/** Number cell that lets you type freely and commits a clamped value as you go. */
export function NumInput({ value, onCommit, min = 0, max = 99, step = 0.5, label, placeholder = '0' }: { value: number; onCommit: (n: number) => void; min?: number; max?: number; step?: number; label: string; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      className="tg-num" type="number" inputMode="decimal" min={min} max={max} step={step} placeholder={placeholder} aria-label={label}
      value={draft ?? (value === 0 ? '' : String(value))}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => { setDraft(e.target.value); const n = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(n)) onCommit(clamp(n, min, max)); else if (e.target.value === '') onCommit(min); }}
      onBlur={() => setDraft(null)}
    />
  );
}

/* ───────── Sundays and rest days (used by the syllabus pace) ───────── */
export function PlanSettingsCard({ t }: { t: TargetsApi }) {
  const { settings } = useStudy();
  const confirm = useConfirm();
  const p = t.plan;
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');

  const add = () => {
    const name = label.trim();
    if (!name) return;
    t.savePlanSettings({ ...p, restDays: [...p.restDays, { key: uid('rest-'), label: name, date: isValidYmd(date) ? date : undefined, off: true }] });
    setLabel(''); setDate('');
  };
  const patch = (i: number, v: Partial<(typeof p.restDays)[number]>) => t.savePlanSettings({ ...p, restDays: p.restDays.map((r, k) => (k === i ? { ...r, ...v } : r)) });
  const remove = async (i: number) => {
    const r = p.restDays[i];
    if (await confirm({ title: `Remove “${r.label}”?`, confirmLabel: 'Remove', danger: true })) t.savePlanSettings({ ...p, restDays: p.restDays.filter((_, k) => k !== i) });
  };

  return (
    <Card>
      <CardHead icon={<span className="stat-icon acc-violet"><LuSlidersHorizontal /></span>} title="Days you will not study" sub={`Used to work out hours per day until ${fmtDate(settings.targetExamDate, { year: true })}.`} />
      <div className="col g-4">
        <Segmented<'rest' | 'study'> block label="Sundays" value={p.excludeSundays ? 'rest' : 'study'} onChange={(v) => t.savePlanSettings({ ...p, excludeSundays: v === 'rest' })} options={[{ value: 'rest', label: 'Rest on Sundays' }, { value: 'study', label: 'Study on Sundays' }]} />
        {!p.excludeSundays ? (
          <div className="row between g-3"><span className="t-small muted">Hours on a Sunday</span><Stepper value={p.sundayHours} min={0} max={12} step={0.5} label="Sunday hours" onChange={(v) => t.savePlanSettings({ ...p, sundayHours: v })} /></div>
        ) : null}
        {p.restDays.length ? (
          <ul className="tg-rest" aria-label="Rest days">
            {p.restDays.map((r, i) => (
              <li key={r.key}>
                <Switch checked={r.off} label={`${r.label} is a day off`} onChange={(v) => patch(i, { off: v })} />
                <div className="grow"><b className="truncate">{r.label}</b><small>{r.date ? fmtDate(r.date, { weekday: true, year: true }) : 'No date'}{r.off ? ' · off' : ' · studying'}</small></div>
                <Button size="sm" variant="ghost" icon aria-label={`Remove ${r.label}`} onClick={() => remove(i)}><LuTrash2 aria-hidden /></Button>
              </li>
            ))}
          </ul>
        ) : <p className="t-small dim">No rest days yet. Add festivals, mock days or trips.</p>}
        <form className="col g-3" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <Field label="Add a day off"><Input value={label} maxLength={40} placeholder="For example, Diwali" onChange={(e) => setLabel(e.target.value)} /></Field>
          <div className="row g-3">
            <Field className="grow" label="Date (optional)"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Button type="submit" disabled={!label.trim()} style={{ alignSelf: 'flex-end' }}><LuPlus aria-hidden /> Add</Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

/* ───────── Build or rebuild a date plan ───────── */
export function BuilderModal({ open, onClose, t, replacing }: { open: boolean; onClose: () => void; t: TargetsApi; replacing: boolean }) {
  const { allSubjectsInGroup, activeSubjects } = useLevelConfig();
  const { today, settings } = useStudy();
  const confirm = useConfirm();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => { const exam = settings.targetExamDate; return isValidYmd(exam) && diffDays(today, exam) > 0 && diffDays(today, exam) <= 120 ? addDays(exam, -1) : addDays(today, 29); });
  const [picked, setPicked] = useState<string[]>(() => { const a = allSubjectsInGroup.filter((s) => activeSubjects.includes(s.name)).map((s) => s.name); return a.length ? a : allSubjectsInGroup.map((s) => s.name); });
  const [perDay, setPerDay] = useState<1 | 2 | 3 | 4>(3);

  const valid = isValidYmd(from) && isValidYmd(to) && from <= to && diffDays(from, to) < 400 && picked.length > 0;
  const preview = useMemo(() => {
    if (!valid) return { days: 0, sundays: 0 };
    const all = eachDay(from, to);
    return { days: all.length, sundays: all.filter((d) => parseYmd(d).getDay() === 0).length };
  }, [from, to, valid]);

  const create = async () => {
    if (replacing && !(await confirm({ title: 'Replace your date plan?', body: 'The current rows and their ticks will be removed. Your study logs are not touched.', confirmLabel: 'Replace plan', danger: true }))) return;
    const rows = buildDateRows(from, to, picked, perDay);
    t.saveCustom({ config: { fromDate: from, toDate: to, subjectsPerDay: perDay, selectedSubjects: picked }, rows });
    t.saveCompletion({});
    sfx.play('success');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title={replacing ? 'Rebuild your date plan' : 'Build a date plan'} description="This creates a row for each study slot. You fill in the topics afterwards, right in the plan."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={create}><LuCalendarDays aria-hidden /> Create plan</Button></>}>
      <div className="col g-5">
        <div className="tg-fields">
          <Field label="From"><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To" error={isValidYmd(from) && isValidYmd(to) && from > to ? 'The end date must come after the start date.' : undefined}><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div className="col g-3">
          <span className="field-label">Papers in the plan</span>
          <div className="row g-2 wrap">
            {allSubjectsInGroup.map((s) => (
              <Chip key={s.id} dot accent={s.accent} selected={picked.includes(s.name)} onClick={() => setPicked((cur) => (cur.includes(s.name) ? cur.filter((n) => n !== s.name) : [...cur, s.name]))}>{s.name}</Chip>
            ))}
          </div>
        </div>
        <div className="col g-3">
          <span className="field-label">Study slots each day</span>
          <Segmented<'1' | '2' | '3' | '4'> block label="Slots per day" value={String(perDay) as '1' | '2' | '3' | '4'} onChange={(v) => setPerDay(Number(v) as 1 | 2 | 3 | 4)} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }]} />
        </div>
        <p className="t-small muted" style={{ lineHeight: 1.55 }}>
          {valid ? <>{plural(preview.days, 'day')} with {plural(preview.days * perDay - preview.sundays * perDay, 'planned slot')} and {plural(preview.sundays, 'Sunday')} left free. Papers rotate through the days.</> : 'Choose at least one paper and a valid range of up to 400 days.'}
        </p>
      </div>
    </Modal>
  );
}
