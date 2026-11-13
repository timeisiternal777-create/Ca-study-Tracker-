import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LuCalendarDays, LuCheck, LuChevronLeft, LuChevronRight, LuCopy, LuEraser, LuFlame, LuMinus, LuNotebookPen, LuPlus, LuSearch, LuTrash2, LuUndo2, LuX,
} from 'react-icons/lu';
import './log.css';
import { Button, Card, CardHead, Chip, Field, Input, Modal, Ring, SubjectTag, Tag, useConfirm, useToast, PageHeader, EmptyState } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { addDays, diffDays, eachDay, fmtDate, monthName, parseYmd, relativeDay, startOfWeek, weekdayShort } from '../../lib/date';
import { cn, fmtHM, fmtNum } from '../../lib/format';
import { MAX_SLOTS, SLOTS, emptyLog, filledSlots, getSlot, withSlot, type Slot } from '../../lib/log';
import { BEAST_HOURS, dayHours } from '../../lib/stats';
import { sfx } from '../../lib/sfx';
import type { DailyStudyLog } from '../../types';

const MAX_SLOT = 16;
const PRESETS = [1, 2, 3, 4];

/* ───────── helpers ───────── */
const hasContent = (l: DailyStudyLog) => SLOTS.some((s) => { const x = getSlot(l, s); return x.subject || x.hours > 0 || x.topic.trim() || x.target > 0; });

/** Drop empty slots, pack the rest to the front, trim topics. */
function normalise(l: DailyStudyLog): DailyStudyLog {
  const kept = SLOTS.map((s) => getSlot(l, s)).filter((x) => x.subject && (x.hours > 0 || x.topic.trim() || x.target > 0));
  let out = emptyLog(l.date);
  out.createdAt = l.createdAt;
  kept.forEach((k, i) => { out = withSlot(out, (i + 1) as Slot, { subject: k.subject, topic: k.topic.trim(), hours: k.hours, target: k.target }); });
  return out;
}

const sig = (l: DailyStudyLog) => JSON.stringify(SLOTS.map((s) => { const x = getSlot(l, s); return [x.subject, x.topic.trim(), x.hours, x.target]; }));

/* ───────── page ───────── */
export default function StudyLog() {
  const { subjects, allSubjectsInGroup } = useLevelConfig();
  const { studyLogs, settings, today, saveStudyLog, deleteStudyLog, deleteStudyLogsInRange, restoreStudyLogs } = useStudy();
  const toast = useToast();
  const confirm = useConfirm();
  const list = subjects.length ? subjects : allSubjectsInGroup;

  const [date, setDate] = useState(() => {
    try { const d = sessionStorage.getItem('ca_log_open_date'); sessionStorage.removeItem('ca_log_open_date'); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) return d; } catch { /* ignore */ }
    return today;
  });
  const byDate = useMemo(() => new Map(studyLogs.map((l) => [l.date, l])), [studyLogs]);
  const saved = byDate.get(date);
  const [draft, setDraft] = useState<DailyStudyLog>(() => saved ?? emptyLog(date));
  const [rangeOpen, setRangeOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const loadedFor = useRef<string>(`${date}|${saved ? sig(saved) : ''}`);

  const baseSig = saved ? sig(saved) : sig(emptyLog(date));
  const dirty = sig(draft) !== baseSig;

  // Load the day when the date changes, or when the stored copy changes under a clean draft (undo, import, quick log…).
  useEffect(() => {
    const key = `${date}|${saved ? sig(saved) : ''}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    setDraft(saved ?? emptyLog(date));
    setShowErrors(false);
  }, [date, saved]);

  const goal = settings.dailyGoalHours;
  const total = dayHours(draft);
  const isToday = date === today;

  /* ── save ── */
  const errors = useMemo(() => {
    const e: Partial<Record<Slot, string>> = {};
    for (const s of SLOTS) {
      const x = getSlot(draft, s);
      if (!x.subject && (x.hours > 0 || x.topic.trim())) e[s] = 'Pick a subject for this session';
    }
    return e;
  }, [draft]);
  const tooMuch = total > 24;

  const save = useCallback((silentNav = false) => {
    if (Object.keys(errors).length || tooMuch) { setShowErrors(true); sfx.play('error'); return false; }
    const next = normalise(draft);
    const prev = saved;
    const before = prev ? dayHours(prev) : 0;
    const after = dayHours(next);
    if (!hasContent(next)) {
      if (prev) { deleteStudyLog(date); toast({ message: `Cleared ${fmtDate(date)}`, tone: 'info', action: { label: 'Undo', onClick: () => restoreStudyLogs([prev]) } }); }
      setDraft(emptyLog(date));
      return true;
    }
    saveStudyLog({ ...next, createdAt: prev?.createdAt ?? Date.now() });
    if (silentNav) { toast({ message: `Saved ${fmtDate(date)}`, sub: fmtHM(after), tone: 'good' }); return true; }
    if (before < BEAST_HOURS && after >= BEAST_HOURS) { toast({ message: 'Beast mode unlocked', sub: `${fmtNum(after)} hours on ${fmtDate(date)}`, tone: 'good' }); }
    else if (before < goal && after >= goal) { toast({ message: 'Daily goal reached', sub: `${fmtNum(after)} of ${fmtNum(goal)} hours`, tone: 'good' }); }
    else {
      sfx.play('save');
      toast({
        message: prev ? 'Day updated' : 'Day saved', sub: `${fmtDate(date, { weekday: true })} · ${fmtHM(after)}`, tone: 'good',
        action: { label: 'Undo', onClick: () => { if (prev) saveStudyLog(prev); else deleteStudyLog(date); } },
      });
    }
    return true;
  }, [errors, tooMuch, draft, saved, date, goal, saveStudyLog, deleteStudyLog, restoreStudyLogs, toast]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) save(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, save]);

  const go = useCallback((next: string) => {
    if (next > today || next === date) return;
    if (dirty && !save(true)) return;
    setDate(next);
  }, [dirty, save, date, today]);

  /* ── slot edits ── */
  const patch = (slot: Slot, p: Partial<{ subject: string; topic: string; hours: number; target: number }>) => setDraft((d) => withSlot(d, slot, p));
  const clearSlot = (slot: Slot) => { setDraft((d) => withSlot(d, slot, { subject: '', topic: '', hours: 0, target: 0 })); };

  const copyLast = () => {
    const prevDate = [...studyLogs].filter((l) => l.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!prevDate) return;
    setDraft((d) => {
      let out = d;
      filledSlots(prevDate).forEach((p, i) => { out = withSlot(out, (i + 1) as Slot, { subject: p.subject, topic: p.topic, hours: getSlot(d, (i + 1) as Slot).hours, target: p.target }); });
      return out;
    });
    toast({ message: `Copied subjects from ${fmtDate(prevDate.date)}`, sub: 'Set the hours for each session, then save.', tone: 'info' });
  };

  const resetDraft = () => { sfx.play('undo'); setDraft(saved ?? emptyLog(date)); setShowErrors(false); };
  const deleteDay = async () => {
    if (!saved) return;
    const ok = await confirm({ title: `Delete ${fmtDate(date, { weekday: true })}?`, body: `This removes ${fmtHM(dayHours(saved))} of study time. You can undo right after.`, confirmLabel: 'Delete day', danger: true });
    if (!ok) return;
    const prev = saved;
    deleteStudyLog(date);
    sfx.play('delete');
    toast({ message: 'Day deleted', sub: fmtDate(date, { weekday: true }), tone: 'warn', action: { label: 'Undo', onClick: () => restoreStudyLogs([prev]) } });
  };

  /* ── week strip ── */
  const week = useMemo(() => {
    const start = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => { const d = addDays(start, i); return { d, h: d === date ? total : dayHours(byDate.get(d) ?? emptyLog(d)) }; });
  }, [date, byDate, total]);
  const weekMax = Math.max(goal * 1.2, ...week.map((w) => w.h), 1);

  const prevLogged = useMemo(() => studyLogs.some((l) => l.date < date && hasContent(l)), [studyLogs, date]);
  const usedSubjects = SLOTS.map((s) => getSlot(draft, s).subject);
  const status = total >= BEAST_HOURS ? { t: 'Beast mode', a: 'ember' as const } : total >= goal ? { t: 'Goal met', a: 'mint' as const } : total > 0 ? { t: `${fmtHM(goal - total)} to goal`, a: 'gold' as const } : { t: 'Nothing logged', a: undefined };
  const visible = SLOTS.filter((s) => getSlot(draft, s).subject || getSlot(draft, s).hours > 0 || s === 1 || SLOTS.slice(0, s - 1).every((p) => getSlot(draft, p).subject));

  return (
    <div className="page-enter">
      <PageHeader
        title="Study log"
        sub="Record what you studied, day by day. Up to six subjects a day. Studying a subject twice adds to the same entry."
        actions={<>
          <Button variant="ghost" onClick={() => setRangeOpen(true)}><LuEraser />Clear a range</Button>
          <Button variant="soft" disabled={isToday} onClick={() => go(today)}><LuCalendarDays />Jump to today</Button>
        </>}
      />

      <div className="lg-grid">
        <div className="col g-5 min-0">
          {/* Day editor */}
          <Card className="lg-day" size="roomy" data-tour="log-form">
            <div className="lg-datebar">
              <button className="icon-btn" aria-label="Previous day" onClick={() => go(addDays(date, -1))}><LuChevronLeft /></button>
              <div className="lg-date">
                <div className="lg-date-main">{fmtDate(date, { weekday: true })}</div>
                <div className="row g-2 wrap">
                  <Tag accent={isToday ? 'brand' : undefined}>{relativeDay(date, today)}</Tag>
                  {dirty ? <Tag accent="gold">Unsaved changes</Tag> : saved ? <Tag accent="good"><LuCheck />Saved</Tag> : null}
                </div>
              </div>
              <button className="icon-btn" aria-label="Next day" disabled={date >= today} onClick={() => go(addDays(date, 1))}><LuChevronRight /></button>
              <label className="lg-datepick" title="Pick a date">
                <LuCalendarDays aria-hidden />
                <input type="date" aria-label="Pick a date" value={date} max={today} onChange={(e) => e.target.value && go(e.target.value)} />
              </label>
            </div>

            <div className="lg-week" role="tablist" aria-label="Week">
              {week.map(({ d, h }) => {
                const future = d > today;
                return (
                  <button key={d} role="tab" aria-selected={d === date} disabled={future} className={cn('lg-wd', d === date && 'is-on', d === today && 'is-today')} onClick={() => go(d)}>
                    <span className="lg-wd-n">{weekdayShort(d)}</span>
                    <span className="lg-wd-d t-num">{parseYmd(d).getDate()}</span>
                    <span className="lg-wd-bar"><i style={{ ['--v' as string]: Math.min(1, h / weekMax), ['--ok' as string]: h >= goal ? 1 : 0 }} /></span>
                    <span className="lg-wd-h">{h > 0 ? fmtNum(h) : '·'}</span>
                  </button>
                );
              })}
            </div>

            <div className="lg-summary">
              <Ring value={goal > 0 ? (total / goal) * 100 : 0} size={104} stroke={9} accent={total >= BEAST_HOURS ? 'ember' : total >= goal ? 'good' : 'brand'}>
                <div className="lg-ring"><b className="t-num" key={total}>{fmtNum(total)}</b><span>of {fmtNum(goal)}h</span></div>
              </Ring>
              <div className="col g-2 grow min-0">
                <div className="row g-2 wrap">
                  {status.a ? <Tag accent={status.a} size="lg">{total >= BEAST_HOURS ? <LuFlame /> : null}{status.t}</Tag> : <Tag size="lg">{status.t}</Tag>}
                  {tooMuch ? <Tag accent="bad">More than 24 hours</Tag> : null}
                </div>
                <p className="t-small muted">{total === 0 ? 'Choose a subject below and set the hours you studied.' : `${fmtHM(total)} across ${filledSlots(draft).length} ${filledSlots(draft).length === 1 ? 'subject' : 'subjects'}.`}</p>
              </div>
              <div className="lg-summary-actions">
                <Button size="sm" variant="ghost" disabled={!prevLogged} onClick={copyLast} title="Copy subjects and topics from your previous logged day"><LuCopy />Copy last day</Button>
              </div>
            </div>
          </Card>

          {/* Slots */}
          <div className="lg-slots stagger">
            {visible.map((s) => {
              const x = getSlot(draft, s);
              const meta = list.find((m) => m.name === x.subject);
              const err = showErrors ? errors[s] : undefined;
              return (
                <SlotCard key={s} slot={s} x={x} acc={meta?.accent} err={err} list={list} usedSubjects={usedSubjects} date={date}
                  onPatch={(p) => patch(s, p)} onClear={() => clearSlot(s)} />
              );
            })}
            {visible.length < MAX_SLOTS && getSlot(draft, visible[visible.length - 1]).subject ? (
              <button className="lg-add" onClick={() => { const next = SLOTS.find((s) => !visible.includes(s)); if (next) patch(next, { subject: '' }); }}>
                <LuPlus />Add another subject
              </button>
            ) : null}
          </div>

          {/* Save bar */}
          <div className="lg-savebar" data-dirty={dirty}>
            <div className="t-small muted grow">{dirty ? 'You have unsaved changes.' : saved ? `Saved · ${fmtHM(dayHours(saved))}` : 'Nothing to save yet.'}</div>
            {saved ? <Button variant="ghost" onClick={deleteDay}><LuTrash2 />Delete day</Button> : null}
            <Button variant="ghost" disabled={!dirty} onClick={resetDraft}><LuUndo2 />Discard</Button>
            <Button variant="primary" size="lg" disabled={!dirty} onClick={() => save()}><LuCheck />Save day</Button>
          </div>
        </div>

        <Logbook selected={date} onSelect={go} byDate={byDate} today={today} goal={goal} />
      </div>

      <RangeDialog open={rangeOpen} onClose={() => setRangeOpen(false)} onDelete={(a, b) => {
        const removed = deleteStudyLogsInRange(a, b);
        sfx.play('delete');
        toast({ message: `Deleted ${removed.length} ${removed.length === 1 ? 'day' : 'days'}`, sub: `${fmtDate(a, { year: true })} to ${fmtDate(b, { year: true })}`, tone: 'warn', action: { label: 'Undo', onClick: () => restoreStudyLogs(removed) } });
      }} />
    </div>
  );
}

/* ───────── slot card ───────── */
interface SlotProps {
  slot: Slot; x: ReturnType<typeof getSlot>; acc?: string; err?: string; date: string;
  list: { id: string; name: string; abbrev: string; accent: import('../../types').Accent }[]; usedSubjects: string[];
  onPatch: (p: Partial<{ subject: string; topic: string; hours: number; target: number }>) => void; onClear: () => void;
}

function SlotCard({ slot, x, acc, err, list, usedSubjects, date, onPatch, onClear }: SlotProps) {
  const { studyLogs } = useStudy();
  const [showTarget, setShowTarget] = useState(x.target > 0);
  const topics = useMemo(() => {
    if (!x.subject) return [] as string[];
    const seen: string[] = [];
    for (const l of [...studyLogs].sort((a, b) => b.date.localeCompare(a.date))) {
      if (l.date === date) continue;
      for (const k of SLOTS) { const sl = getSlot(l, k); if (sl.subject === x.subject && sl.topic && !seen.includes(sl.topic)) seen.push(sl.topic); }
      if (seen.length >= 4) break;
    }
    return seen.slice(0, 4);
  }, [studyLogs, x.subject, date]);
  const set = (h: number) => onPatch({ hours: Math.max(0, Math.min(MAX_SLOT, Math.round(h * 60) / 60)) });
  const whole = Math.abs(x.hours * 2 - Math.round(x.hours * 2)) < 1e-6;
  const done = x.target > 0 ? x.hours >= x.target : null;

  return (
    <Card className={cn('lg-slot', acc && `acc-${acc}`, err && 'has-err')} accent={acc as never} tinted={!!acc}>
      <div className="lg-slot-head">
        <span className="lg-slot-n t-num">{slot}</span>
        <div className="grow min-0">
          {x.subject ? <div className="row g-2"><SubjectTag name={x.subject} /><span className="t-small fw-6 truncate">{x.subject}</span></div> : <span className="t-small muted">Choose a subject</span>}
        </div>
        {x.subject || x.hours > 0 || x.topic ? <button className="icon-btn lg-x" aria-label={`Clear session ${slot}`} onClick={onClear}><LuX /></button> : null}
      </div>

      <div className="chips" role="radiogroup" aria-label={`Subject for session ${slot}`}>
        {list.map((s) => {
          const taken = usedSubjects.includes(s.name) && s.name !== x.subject;
          return (
            <Chip key={s.id} accent={s.accent} dot selected={s.name === x.subject} disabled={taken} title={taken ? 'Already used in another session' : s.name}
              onClick={() => { onPatch({ subject: s.name === x.subject ? '' : s.name }); }}>{s.abbrev}</Chip>
          );
        })}
      </div>
      {err ? <div className="field-error">{err}</div> : null}

      <div className="lg-hours">
        <div className="lg-step">
          <button className="stepper-btn" aria-label="Less time" disabled={x.hours <= 0} onClick={() => set(x.hours - 0.5)}><LuMinus /></button>
          <label className="lg-hval">
            <input className="t-num" inputMode="decimal" aria-label={`Hours for session ${slot}`} value={x.hours === 0 ? '' : String(Math.round(x.hours * 100) / 100)} placeholder="0"
              onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); set(Number.isFinite(v) ? v : 0); }} />
            <small>{whole ? 'hours' : fmtHM(x.hours)}</small>
          </label>
          <button className="stepper-btn" aria-label="More time" disabled={x.hours >= MAX_SLOT} onClick={() => set(x.hours + 0.5)}><LuPlus /></button>
        </div>
        <div className="chips lg-presets">
          {PRESETS.map((p) => <Chip key={p} selected={x.hours === p} onClick={() => { set(p); }}>{p}h</Chip>)}
        </div>
      </div>

      <Field label="What did you cover?" right={x.topic.length > 90 ? `${x.topic.length}/140` : undefined}>
        <Input value={x.topic} maxLength={140} placeholder="Chapter, topic or question set" onChange={(e) => onPatch({ topic: e.target.value })} />
      </Field>
      {topics.length > 0 && !x.topic ? (
        <div className="chips lg-suggest">
          {topics.map((t) => <Chip key={t} onClick={() => onPatch({ topic: t })} title="Reuse this topic"><LuPlus />{t}</Chip>)}
        </div>
      ) : null}

      <div className="lg-target">
        {showTarget || x.target > 0 ? (
          <>
            <span className="t-small muted">Target</span>
            <div className="lg-mini">
              <button aria-label="Lower target" onClick={() => onPatch({ target: Math.max(0, x.target - 0.5) })}><LuMinus /></button>
              <b className="t-num">{fmtNum(x.target)}h</b>
              <button aria-label="Raise target" onClick={() => onPatch({ target: Math.min(MAX_SLOT, x.target + 0.5) })}><LuPlus /></button>
            </div>
            {done === null ? null : done ? <Tag accent="good"><LuCheck />Target met</Tag> : <Tag accent="warn">{fmtHM(x.target - x.hours)} short</Tag>}
          </>
        ) : <button className="lg-link" onClick={() => setShowTarget(true)}><LuPlus />Set a target for this session</button>}
      </div>
    </Card>
  );
}

/* ───────── logbook ───────── */
function Logbook({ selected, onSelect, byDate, today, goal }: { selected: string; onSelect: (d: string) => void; byDate: Map<string, DailyStudyLog>; today: string; goal: number }) {
  const [q, setQ] = useState('');
  const [gaps, setGaps] = useState(false);
  const { studyLogs } = useStudy();
  const all = useMemo(() => [...studyLogs].filter(hasContent).sort((a, b) => b.date.localeCompare(a.date)), [studyLogs]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let src: { date: string; log?: DailyStudyLog }[];
    if (gaps && all.length) {
      const first = all[all.length - 1].date;
      src = eachDay(first, today).reverse().map((d) => ({ date: d, log: byDate.get(d) }));
    } else src = all.map((l) => ({ date: l.date, log: l }));
    if (!needle) return src;
    return src.filter(({ date, log }) => date.includes(needle) || fmtDate(date, { year: true }).toLowerCase().includes(needle)
      || (log && SLOTS.some((s) => { const x = getSlot(log, s); return x.subject.toLowerCase().includes(needle) || x.topic.toLowerCase().includes(needle); })));
  }, [all, q, gaps, today, byDate]);

  const groups = useMemo(() => {
    const m = new Map<string, { label: string; rows: typeof rows; hours: number; days: number }>();
    for (const r of rows) {
      const k = r.date.slice(0, 7);
      let g = m.get(k);
      if (!g) { const d = parseYmd(r.date); g = { label: `${monthName(d.getMonth())} ${d.getFullYear()}`, rows: [], hours: 0, days: 0 }; m.set(k, g); }
      g.rows.push(r);
      if (r.log) { const h = dayHours(r.log); g.hours += h; if (h > 0) g.days++; }
    }
    return [...m.values()];
  }, [rows]);

  const selRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Keep the selected row visible by scrolling only the list (never the page).
  useEffect(() => {
    const list = listRef.current, row = selRef.current;
    if (!list || !row) return;
    const lr = list.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (rr.top < lr.top + 44) list.scrollTop += rr.top - lr.top - 52;
    else if (rr.bottom > lr.bottom) list.scrollTop += rr.bottom - lr.bottom + 8;
  }, [selected, gaps]);

  return (
    <aside className="lg-book" aria-label="Logbook">
      <div className="lg-book-head">
        <div className="row between">
          <h2 className="t-h2">Logbook</h2>
          <span className="t-xs dim">{all.length} {all.length === 1 ? 'day' : 'days'} logged</span>
        </div>
        <Input icon={<LuSearch />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, topic or date" aria-label="Search the logbook" />
        <label className="lg-check"><input type="checkbox" checked={gaps} onChange={(e) => setGaps(e.target.checked)} /><span>Show days without study</span></label>
      </div>

      <div className="lg-book-list no-scrollbar" ref={listRef}>
        {groups.length === 0 ? (
          <EmptyState icon={<LuNotebookPen />} title={q ? 'No matches' : 'Your logbook is empty'}>{q ? 'Try another subject, topic or date.' : 'Save your first day and it will appear here.'}</EmptyState>
        ) : groups.map((g) => (
          <section key={g.label}>
            <div className="lg-month"><span>{g.label}</span><span className="t-xs dim">{fmtNum(g.hours)}h · {g.days} {g.days === 1 ? 'day' : 'days'}</span></div>
            {g.rows.map(({ date, log }) => {
              const h = log ? dayHours(log) : 0;
              const slots = log ? filledSlots(log) : [];
              const on = date === selected;
              return (
                <button key={date} ref={on ? selRef : undefined} className={cn('lg-row', on && 'is-on', !log && 'is-empty')} aria-current={on ? 'date' : undefined} onClick={() => onSelect(date)}>
                  <span className="lg-row-date"><b className="t-num">{parseYmd(date).getDate()}</b><small>{weekdayShort(date)}</small></span>
                  <span className="lg-row-main">
                    {slots.length ? (
                      <>
                        <span className="row g-1 wrap">{slots.map((s) => <SubjectTag key={s.slot} name={s.subject || '—'} />)}</span>
                        <span className="lg-row-topic truncate">{slots.map((s) => s.topic).filter(Boolean).join(' · ') || 'No topics noted'}</span>
                      </>
                    ) : <span className="t-small dim">{date === today ? 'Today · not logged yet' : diffDays(date, today) === 1 ? 'Yesterday · no study' : 'No study'}</span>}
                    <span className="lg-row-bar"><i style={{ ['--v' as string]: Math.min(1, h / Math.max(goal * 1.25, 1)), ['--ok' as string]: h >= goal ? 1 : 0 }} /></span>
                  </span>
                  <span className="lg-row-h t-num">{h > 0 ? fmtHM(h) : ''}</span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </aside>
  );
}

/* ───────── delete a range ───────── */
function RangeDialog({ open, onClose, onDelete }: { open: boolean; onClose: () => void; onDelete: (a: string, b: string) => void }) {
  const { studyLogs, today } = useStudy();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const confirm = useConfirm();
  useEffect(() => { if (open) { setFrom(addDays(today, -6)); setTo(today); } }, [open, today]);

  const hit = useMemo(() => (from && to && from <= to) ? studyLogs.filter((l) => l.date >= from && l.date <= to) : [], [studyLogs, from, to]);
  const hours = hit.reduce((a, l) => a + dayHours(l), 0);
  const invalid = !from || !to || from > to;

  const run = async () => {
    const ok = await confirm({ title: 'Delete these days?', body: `${hit.length} ${hit.length === 1 ? 'day' : 'days'} and ${fmtHM(hours)} of study time will be removed. You can undo right after.`, confirmLabel: 'Delete days', danger: true });
    if (!ok) return;
    onDelete(from, to);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Clear a date range" description="Remove several days of logs at once. Past hours you entered in Settings are not affected."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" disabled={invalid || hit.length === 0} onClick={run}><LuTrash2 />Delete {hit.length || ''} {hit.length === 1 ? 'day' : 'days'}</Button></>}>
      <div className="col g-4">
        <div className="grid cols-2 g-3">
          <Field label="From"><Input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div className="row g-2 wrap">
          <Chip onClick={() => { setFrom(addDays(today, -6)); setTo(today); }}>Last 7 days</Chip>
          <Chip onClick={() => { setFrom(addDays(today, -29)); setTo(today); }}>Last 30 days</Chip>
          <Chip onClick={() => { const f = [...studyLogs].map((l) => l.date).sort()[0]; if (f) { setFrom(f); setTo(today); } }}>Everything</Chip>
        </div>
        <div className={cn('callout', invalid ? 'acc-bad' : hit.length ? 'acc-warn' : '')}>
          {from > to && from && to ? 'The start date must be before the end date.' : hit.length === 0 ? 'No logged days in this range.' : `${hit.length} ${hit.length === 1 ? 'day' : 'days'} · ${fmtHM(hours)} will be deleted.`}
        </div>
      </div>
    </Modal>
  );
}
