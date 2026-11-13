import { useMemo, useRef, useState } from 'react';
import { LuCalendarCheck, LuCheck, LuDownload, LuFileSpreadsheet, LuPlus, LuScale, LuTrash2, LuUpload } from 'react-icons/lu';
import { Button, Card, CardHead, EmptyState, Field, Input, Modal, Select, Stepper, useConfirm, useToast } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { downloadBlob } from '../../lib/files';
import { fmtDate } from '../../lib/date';
import { cn, fmtNum, plural, uid } from '../../lib/format';
import { sfx } from '../../lib/sfx';
import { paceFor, scaleSyllabus, syllabusTemplate, syllabusTotals, type SyllabusItem, type TargetsApi } from '../../lib/targets';
import { NumInput, PlanSettingsCard } from './Shared';

function TopicRow({ item, onToggle, onPatch, onDelete }: { item: SyllabusItem; onToggle: () => void; onPatch: (p: Partial<SyllabusItem>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.topic);
  const commit = () => { setEditing(false); const v = name.trim(); if (v && v !== item.topic) onPatch({ topic: v }); else setName(item.topic); };
  return (
    <div className={cn('tg-topic', item.completed && 'is-done')} id={`topic-${item.id}`}>
      <div className="tg-check-cell"><button type="button" className="tg-check" aria-pressed={!!item.completed} aria-label={`${item.completed ? 'Mark not done' : 'Mark done'}: ${item.topic}`} onClick={onToggle}><LuCheck aria-hidden /></button></div>
      <div className="tg-t-name">
        {editing
          ? <Input value={name} autoFocus maxLength={160} aria-label="Topic name" onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(item.topic); setEditing(false); } }} />
          : <button type="button" onClick={() => { setName(item.topic); setEditing(true); }} title="Click to rename">{item.topic}</button>}
      </div>
      <NumInput value={Number(item.targetHours ?? item.hours) || 0} min={0.25} max={99} step={0.25} label={`Target hours for ${item.topic}`} onCommit={(n) => onPatch({ hours: n, targetHours: n, originalHours: undefined })} />
      <NumInput value={Number(item.actualHours) || 0} min={0} max={200} step={0.25} label={`Hours spent on ${item.topic}`} onCommit={(n) => onPatch({ actualHours: n })} />
      <Button size="sm" variant="ghost" icon aria-label={`Remove ${item.topic}`} onClick={onDelete}><LuTrash2 aria-hidden /></Button>
    </div>
  );
}

export function Syllabus({ t, onImport, onSchedule }: { t: TargetsApi; onImport: (f: File) => void; onSchedule: () => void }) {
  const { allSubjectsInGroup, getSubjectMetadata } = useLevelConfig();
  const { settings, stats, today } = useStudy();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const items = t.syllabus;
  const [tab, setTab] = useState<string>('All');
  const [adding, setAdding] = useState(false);
  const [scaling, setScaling] = useState(false);

  const totals = useMemo(() => syllabusTotals(items), [items]);
  const pace = useMemo(() => paceFor(totals.remaining, settings.targetExamDate, today, t.plan), [totals.remaining, settings.targetExamDate, today, t.plan]);
  const names = useMemo(() => {
    const known = allSubjectsInGroup.map((s) => s.name);
    const extra = [...new Set(items.map((i) => i.subject))].filter((n) => !known.includes(n));
    return [...known, ...extra];
  }, [allSubjectsInGroup, items]);
  const per = useMemo(() => Object.fromEntries(names.map((n) => { const list = items.filter((i) => i.subject === n); return [n, { n: list.length, done: list.filter((i) => i.completed).length }]; })), [names, items]);
  const shown = tab === 'All' ? items : items.filter((i) => i.subject === tab);
  const shownTotals = syllabusTotals(shown);

  const patch = (id: string, p: Partial<SyllabusItem>) => t.saveSyllabus(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const toggle = (i: SyllabusItem) => { sfx.play(i.completed ? 'checkOff' : 'checkOn'); t.setTopicDone(i.id, !i.completed); };
  const remove = (i: SyllabusItem) => {
    const before = items;
    t.saveSyllabus(items.filter((x) => x.id !== i.id));
    toast({ message: 'Topic removed', sub: i.topic, tone: 'info', action: { label: 'Undo', onClick: () => t.saveSyllabus(before) } });
  };
  const clear = async () => {
    if (await confirm({ title: 'Delete the syllabus plan?', body: `All ${plural(items.length, 'topic')} and their progress will be removed. Your study logs are not touched.`, confirmLabel: 'Delete plan', danger: true })) t.clearPlan('excel');
  };

  const behind = stats.last7Avg + 0.05 < pace.perDay;
  const exam = settings.targetExamDate;
  const finished = totals.topics > 0 && totals.remaining === 0;

  return (
    <>
      <div className="tg-kpis stagger">
        <div className="tg-kpi"><span>Target</span><b className="t-num">{fmtNum(totals.target, 1)}<small>h</small></b><em>{plural(totals.topics, 'topic')}</em></div>
        <div className="tg-kpi"><span>Completed</span><b className="t-num" style={{ color: 'var(--c-mint)' }}>{fmtNum(totals.done, 1)}<small>h</small></b><em>{totals.topicsDone} of {totals.topics} topics</em></div>
        <div className="tg-kpi"><span>Remaining</span><b className="t-num" style={{ color: 'var(--c-gold)' }}>{fmtNum(totals.remaining, 1)}<small>h</small></b><em>{totals.target ? Math.round((totals.done / totals.target) * 100) : 0}% done</em></div>
        <div className="tg-kpi"><span>Hours worked</span><b className="t-num" style={{ color: 'var(--c-cyan)' }}>{fmtNum(totals.actual, 1)}<small>h</small></b><em>as you recorded them</em></div>
      </div>

      {totals.topics > 0 ? (
        <div className={cn('tg-pace', finished ? 'acc-good' : pace.calendarDays <= 0 ? 'acc-bad' : behind ? 'acc-warn' : 'acc-good')}>
          <div className="tg-pace-n"><b className="t-num">{finished ? 'Done' : pace.calendarDays <= 0 ? '-' : fmtNum(pace.perDay, 1)}</b><span>{finished || pace.calendarDays <= 0 ? '' : 'hours a day'}</span></div>
          <p>
            {finished ? <>Every topic is ticked off. Use the days you have left for revision and mocks.</>
              : pace.calendarDays <= 0 ? <>Your exam date, {fmtDate(exam, { year: true })}, is today or has passed. Set the next one in Settings to see the pace.</>
              : <><b>{fmtNum(totals.remaining, 1)} hours</b> of topics are left across <b>{plural(pace.studyDays, 'study day')}</b> before {fmtDate(exam, { year: true })}
                  {pace.sundays ? <> ({plural(pace.sundays, 'Sunday')} {t.plan.excludeSundays ? 'left out' : `at ${fmtNum(pace.sundayHours, 1)}h`}{pace.restDays ? `, ${plural(pace.restDays, 'rest day')} off` : ''})</> : null}.
                  {' '}This week you averaged <b>{fmtNum(stats.last7Avg, 1)}h</b> a day, so you are {behind ? <b>about {fmtNum(pace.perDay - stats.last7Avg, 1)}h a day behind</b> : <b>on pace</b>}.</>}
          </p>
        </div>
      ) : null}

      <div className="tg-grid">
        <div className="col g-4 min-0">
          <div className="tg-tabs" role="tablist" aria-label="Papers">
            <button type="button" role="tab" aria-selected={tab === 'All'} className="tg-tab acc-brand" onClick={() => setTab('All')}>
              <b>All papers</b><small>{totals.topicsDone} of {totals.topics} done</small>
              <div className="tg-mini"><i style={{ transform: `scaleX(${totals.topics ? totals.topicsDone / totals.topics : 0})` }} /></div>
            </button>
            {names.map((n) => {
              const m = getSubjectMetadata(n); const c = per[n];
              return (
                <button key={n} type="button" role="tab" aria-selected={tab === n} className={`tg-tab acc-${m.accent}`} onClick={() => setTab(n)}>
                  <b title={n}>{n}</b><small>{c.n ? `${c.done} of ${c.n} done` : 'No topics yet'}</small>
                  <div className="tg-mini"><i style={{ transform: `scaleX(${c.n ? c.done / c.n : 0})` }} /></div>
                </button>
              );
            })}
          </div>

          <Card size="flush" className="tg-list">
            <div className="tg-list-head">
              <div className="min-0">
                <div className="card-title">{tab === 'All' ? 'Every topic' : tab}</div>
                <div className="card-sub">{shownTotals.topicsDone} of {shownTotals.topics} topics · {fmtNum(shownTotals.done, 1)} of {fmtNum(shownTotals.target, 1)} hours</div>
              </div>
              <div className="row g-2 wrap">
                <Button variant="soft" size="sm" disabled={finished} onClick={() => { onSchedule(); }} data-tour="schedule-syllabus"><LuCalendarCheck aria-hidden /> Schedule my syllabus</Button>
                <Button variant="primary" size="sm" onClick={() => setAdding(true)}><LuPlus aria-hidden /> Add topic</Button>
              </div>
            </div>
            {shown.length ? (
              <>
                <div className="tg-cols" aria-hidden><span /><span>Topic</span><span>Target h</span><span>Spent h</span><span /></div>
                {shown.map((i) => <TopicRow key={i.id} item={i} onToggle={() => toggle(i)} onPatch={(p) => patch(i.id, p)} onDelete={() => remove(i)} />)}
              </>
            ) : <div style={{ padding: 24 }}><EmptyState icon={<LuFileSpreadsheet />} title="No topics here yet" action={<Button size="sm" variant="primary" onClick={() => setAdding(true)}><LuPlus aria-hidden /> Add a topic</Button>}>Add topics one by one, or import a whole list from Excel.</EmptyState></div>}
          </Card>
        </div>

        <div className="tg-side">
          <PlanSettingsCard t={t} />
          <Card>
            <CardHead title="Manage the list" sub="Import, adjust hours or start over." />
            <div className="col g-3">
              <Button block onClick={() => fileRef.current?.click()}><LuUpload aria-hidden /> Import from Excel</Button>
              <input ref={fileRef} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
              <Button block onClick={() => downloadBlob(syllabusTemplate(allSubjectsInGroup), 'ca-targets-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}><LuDownload aria-hidden /> Download the template</Button>
              <Button block onClick={() => setScaling(true)} disabled={!items.length}><LuScale aria-hidden /> Adjust hours by a percent</Button>
              <Button block variant="danger" onClick={clear}><LuTrash2 aria-hidden /> Delete this plan</Button>
            </div>
          </Card>
        </div>
      </div>

      <AddTopic open={adding} onClose={() => setAdding(false)} names={names} initial={tab === 'All' ? names[0] : tab} onAdd={(subject, topic, hours) => {
        const id = uid('t');
        t.saveSyllabus([...items, { id, subject, topic, hours, targetHours: hours, actualHours: 0, completed: false, source: 'custom', dayLabel: 'Day 1' }]);
        sfx.play('success');
        setTab(subject);
        window.setTimeout(() => document.getElementById(`topic-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
      }} />
      <ScaleModal open={scaling} onClose={() => setScaling(false)} items={items} names={names} onApply={(pct, subject) => { t.saveSyllabus(scaleSyllabus(items, pct, subject)); sfx.play('success'); setScaling(false); }}
        onUndo={() => { t.saveSyllabus(items.map((i) => (typeof i.originalHours === 'number' ? { ...i, hours: i.originalHours, targetHours: i.originalHours, originalHours: undefined } : i))); setScaling(false); }} />
    </>
  );
}

function AddTopic({ open, onClose, names, initial, onAdd }: { open: boolean; onClose: () => void; names: string[]; initial: string; onAdd: (subject: string, topic: string, hours: number) => void }) {
  const [subject, setSubject] = useState(initial);
  const [topic, setTopic] = useState('');
  const [hours, setHours] = useState(3);
  const submit = () => { if (!topic.trim()) return; onAdd(subject, topic.trim(), hours); setTopic(''); onClose(); };
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Add a topic"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!topic.trim()} onClick={submit}>Add topic</Button></>}>
      <form className="col g-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Paper"><Select value={names.includes(subject) ? subject : names[0]} onChange={(e) => setSubject(e.target.value)}>{names.map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
        <Field label="Topic"><Input value={topic} autoFocus maxLength={160} placeholder="For example, Ind AS 115" onChange={(e) => setTopic(e.target.value)} data-autofocus /></Field>
        <div className="row between g-3"><span className="field-label">Target hours</span><Stepper value={hours} min={0.5} max={40} step={0.5} label="target hours" onChange={setHours} /></div>
      </form>
    </Modal>
  );
}

function ScaleModal({ open, onClose, items, names, onApply, onUndo }: { open: boolean; onClose: () => void; items: SyllabusItem[]; names: string[]; onApply: (pct: number, subject: string) => void; onUndo: () => void }) {
  const [pct, setPct] = useState(10);
  const [subject, setSubject] = useState('All');
  const scaled = items.some((i) => typeof i.originalHours === 'number');
  const remaining = (list: SyllabusItem[]) => list.filter((i) => !i.completed).reduce((a, i) => a + (Number(i.targetHours ?? i.hours) || 0), 0);
  const after = remaining(scaleSyllabus(items, pct, subject));
  const before = remaining(items);
  const preset = (v: number) => <button key={v} type="button" className="chip" aria-pressed={pct === v} onClick={() => setPct(v)}>{v > 0 ? '+' : ''}{v}%</button>;
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Adjust target hours" description="Scale every target up or down, for all papers or one. The first values are remembered so you can undo it."
      footer={<>{scaled ? <Button variant="ghost" onClick={onUndo}>Restore originals</Button> : <Button variant="ghost" onClick={onClose}>Cancel</Button>}<Button variant="primary" disabled={pct === 0} onClick={() => onApply(pct, subject)}>Apply {pct > 0 ? '+' : ''}{pct}%</Button></>}>
      <div className="col g-4">
        <div className="row g-2 wrap">{[-30, -20, -10, 10, 20, 30].map(preset)}</div>
        <Field label="Or type a percent"><Input type="number" inputMode="numeric" min={-90} max={300} value={pct} onChange={(e) => setPct(Math.max(-90, Math.min(300, Number(e.target.value) || 0)))} /></Field>
        <Field label="Paper"><Select value={subject} onChange={(e) => setSubject(e.target.value)}><option value="All">All papers</option>{names.map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
        <div className="t-small muted" style={{ lineHeight: 1.55 }}>Remaining hours would go from <b className="tx-0">{fmtNum(before, 1)}h</b> to <b className="tx-0">{fmtNum(after, 1)}h</b>. Topics you have already ticked off keep their hours.</div>
      </div>
    </Modal>
  );
}
