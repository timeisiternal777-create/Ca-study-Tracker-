import { useEffect, useMemo, useRef, useState } from 'react';
import { LuCalendarDays, LuCheck, LuChevronLeft, LuChevronRight, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Button, Callout, Card, CardHead, ProgressBar, Select, SubjectTag, Tag, useConfirm, useToast } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { reopenBacklog, resolveBacklog, useBacklogs } from '../../lib/backlog';
import { addDays, fmtDate, parseYmd, startOfWeek } from '../../lib/date';
import { clamp, cn, fmtHM, fmtNum, plural } from '../../lib/format';
import { navigateTo } from '../../lib/nav';
import { sfx } from '../../lib/sfx';
import { subjectHoursOf } from '../../lib/log';
import { newRowId, type CustomRow, type TargetsApi } from '../../lib/targets';
import { NumInput } from './Shared';

function PlanRow({ row, names, done, focus, onToggle, onPatch, onDelete }: { row: CustomRow; names: string[]; done: boolean; focus: boolean; onToggle: () => void; onPatch: (p: Partial<CustomRow>) => void; onDelete: () => void }) {
  const [topic, setTopic] = useState(row.topic);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setTopic(row.topic), [row.topic]);
  useEffect(() => { if (focus) ref.current?.focus(); }, [focus]);
  const commit = () => { const v = topic.trim(); if (v !== row.topic) onPatch({ topic: v }); };
  const opts = names.includes(row.subject) ? names : [row.subject, ...names];
  return (
    <div className={cn('tg-row', done && 'is-done')}>
      <div className="tg-check-cell"><button type="button" className="tg-check" aria-pressed={done} aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${row.topic || row.subject}`} onClick={onToggle}><LuCheck aria-hidden /></button></div>
      <Select value={row.subject} aria-label="Paper" onChange={(e) => onPatch({ subject: e.target.value })}>{opts.map((n) => <option key={n} value={n}>{n}</option>)}</Select>
      <input ref={ref} className="input" value={topic} maxLength={160} placeholder="What will you study?" aria-label="Topic" onChange={(e) => setTopic(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <div className="tg-hrs"><NumInput value={Number(row.targetHours ?? row.hours) || 0} min={0.25} max={16} step={0.25} label="Planned hours" onCommit={(n) => onPatch({ targetHours: n, hours: n })} /><small>h</small></div>
      <Button size="sm" variant="ghost" icon aria-label="Remove this row" onClick={onDelete}><LuTrash2 aria-hidden /></Button>
    </div>
  );
}

export function DatePlan({ t, onRebuild }: { t: TargetsApi; onRebuild: () => void }) {
  const { allSubjectsInGroup, suffix } = useLevelConfig();
  const { studyLogs, stats, today } = useStudy();
  const { pending } = useBacklogs(suffix);
  const confirm = useConfirm();
  const toast = useToast();
  const rows = t.custom?.rows ?? [];
  const names = useMemo(() => allSubjectsInGroup.map((s) => s.name), [allSubjectsInGroup]);

  const byDate = useMemo(() => {
    const m = new Map<string, CustomRow[]>();
    for (const r of rows) m.set(r.date, [...(m.get(r.date) || []), r]);
    for (const list of m.values()) list.sort((a, b) => (a.subRowIndex ?? 0) - (b.subRowIndex ?? 0));
    return m;
  }, [rows]);
  const range = useMemo(() => { const d = [...byDate.keys()].sort(); return { min: d[0] || today, max: d[d.length - 1] || today }; }, [byDate, today]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today < range.min ? range.min : today > range.max ? range.max : today));
  const [focusId, setFocusId] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayInRange = today >= range.min && today <= range.max;

  const logged = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of studyLogs) for (const [s, h] of subjectHoursOf(l)) m.set(`${l.date}|${s}`, (m.get(`${l.date}|${s}`) || 0) + h);
    return m;
  }, [studyLogs]);
  const dayLogged = (d: string) => stats.dailyTotals[d] || 0;
  const pendingByDate = useMemo(() => new Set(pending.map((b) => b.date)), [pending]);

  const save = (next: CustomRow[]) => t.saveCustom({ ...(t.custom ?? { rows: [] }), rows: next });
  const patchRow = (id: string, p: Partial<CustomRow>) => save(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const addRow = (date: string) => {
    const id = newRowId(date);
    const sun = parseYmd(date).getDay() === 0;
    const existing = byDate.get(date) || [];
    save([...rows.map((r) => (r.date === date && sun ? { ...r, sundayExpanded: true } : r)), { id, date, isSunday: sun, sundayExpanded: true, subject: names[existing.length % Math.max(names.length, 1)] || 'General', topic: '', targetHours: 1.5, subRowIndex: existing.length }]);
    setFocusId(id);
  };
  const removeRow = (r: CustomRow) => {
    const before = rows;
    save(rows.filter((x) => x.id !== r.id));
    toast({ message: 'Row removed', sub: r.topic || r.subject, tone: 'info', action: { label: 'Undo', onClick: () => save(before) } });
  };
  const toggle = (r: CustomRow) => {
    const cur = !!t.completion[r.id]?.done;
    sfx.play(cur ? 'checkOff' : 'checkOn');
    t.setRowDone(r.id, !cur);
  };
  const toggleSunday = (date: string) => { if ((byDate.get(date) || []).length) save(rows.map((r) => (r.date === date ? { ...r, sundayExpanded: !r.sundayExpanded } : r))); else addRow(date); };
  const clear = async () => { if (await confirm({ title: 'Delete the date plan?', body: 'All rows, ticks and backlog items will be removed. Your study logs are not touched.', confirmLabel: 'Delete plan', danger: true })) t.clearPlan('custom'); };

  const planned = rows.filter((r) => r.topic && !(r.isSunday && !r.sundayExpanded));
  const doneCount = planned.filter((r) => t.completion[r.id]?.done).length;
  const weekRows = days.flatMap((d) => (byDate.get(d) || []).filter((r) => r.topic && !(r.isSunday && !r.sundayExpanded)));
  const weekPlanned = weekRows.reduce((a, r) => a + (Number(r.targetHours ?? r.hours) || 0), 0);
  const weekLogged = days.reduce((a, d) => a + (stats.dailyTotals[d] || 0), 0);
  const weekDone = weekRows.filter((r) => t.completion[r.id]?.done).length;

  const grouped = useMemo(() => {
    const g = new Map<string, typeof pending>();
    for (const b of pending) g.set(b.date, [...(g.get(b.date) || []), b]);
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pending]);

  return (
    <>
      <div className="tg-kpis stagger">
        <div className="tg-kpi"><span>Planned slots</span><b className="t-num">{planned.length}</b><em>with a topic written</em></div>
        <div className="tg-kpi"><span>Done</span><b className="t-num" style={{ color: 'var(--c-mint)' }}>{doneCount}<small>of {planned.length}</small></b><em>{planned.length ? Math.round((doneCount / planned.length) * 100) : 0}% ticked</em></div>
        <div className="tg-kpi"><span>Backlog</span><b className="t-num" style={{ color: pending.length ? 'var(--c-gold)' : 'var(--c-mint)' }}>{pending.length}</b><em>{pending.length ? 'missed and still open' : 'nothing is overdue'}</em></div>
        <div className="tg-kpi"><span>This week</span><b className="t-num" style={{ color: 'var(--c-cyan)' }}>{fmtNum(weekPlanned, 1)}<small>h planned</small></b><em>{fmtHM(weekLogged)} logged</em></div>
      </div>

      {rows.length > 0 && planned.length === 0 ? <div style={{ marginBottom: 20 }}><Callout icon={<LuCalendarDays aria-hidden />} accent="brand">Your plan has empty slots. Click a topic field below and write what you will study. Slots without a topic never become backlog.</Callout></div> : null}

      <div className="tg-grid">
        <div className="min-0">
          <div className="tg-week-nav">
            <div className="row g-2">
              <Button size="sm" icon aria-label="Previous week" disabled={addDays(weekStart, -1) < addDays(startOfWeek(range.min), -7)} onClick={() => setWeekStart(addDays(weekStart, -7))}><LuChevronLeft aria-hidden /></Button>
              <Button size="sm" icon aria-label="Next week" disabled={addDays(weekStart, 7) > addDays(startOfWeek(range.max), 7)} onClick={() => setWeekStart(addDays(weekStart, 7))}><LuChevronRight aria-hidden /></Button>
              <b className="t-h2" style={{ marginLeft: 8 }}>{fmtDate(days[0])} to {fmtDate(days[6], { year: true })}</b>
            </div>
            <div className="row g-2">
              {todayInRange && !days.includes(today) ? <Button size="sm" onClick={() => setWeekStart(startOfWeek(today))}>Jump to today</Button> : null}
              <span className="t-xs dim">Plan runs {fmtDate(range.min)} to {fmtDate(range.max, { year: true })}</span>
            </div>
          </div>

          <div className="tg-days">
            {days.map((d) => {
              const list = byDate.get(d) || [];
              const sun = parseYmd(d).getDay() === 0;
              const rest = sun && !list.some((r) => r.sundayExpanded);
              const isToday = d === today;
              if (d < range.min || d > range.max) {
                return (
                  <Card key={d} size="flush" className="tg-day is-rest is-out" aria-label={fmtDate(d, { weekday: true })}>
                    <div className="tg-day-h"><b>{fmtDate(d, { weekday: true })}</b><span className="t-xs">{dayLogged(d) ? `${fmtHM(dayLogged(d))} logged · ` : ''}Outside your plan</span></div>
                  </Card>
                );
              }
              const total = list.reduce((a, r) => a + (r.topic ? Number(r.targetHours ?? r.hours) || 0 : 0), 0);
              const dayDone = list.filter((r) => r.topic && t.completion[r.id]?.done).length;
              const dayRows = list.filter((r) => r.topic).length;
              const loggedToday = dayLogged(d);
              return (
                <Card key={d} size="flush" className={cn('tg-day', isToday && 'is-today', rest && 'is-rest')} aria-label={fmtDate(d, { weekday: true })}>
                  <div className="tg-day-h">
                    <div className="row g-3 wrap">
                      <b>{fmtDate(d, { weekday: true })}</b>
                      {isToday ? <Tag accent="brand">Today</Tag> : null}
                      {pendingByDate.has(d) ? <Tag accent="warn">Missed</Tag> : null}
                      {rest ? <span className="t-xs">Rest day</span> : null}
                    </div>
                    {rest ? <Button size="sm" onClick={() => toggleSunday(d)}>Plan study</Button>
                      : <span className="t-xs">{dayRows ? `${dayDone} of ${dayRows} done · ${fmtNum(total, 1)}h planned` : 'Nothing planned'}{loggedToday ? ` · ${fmtHM(loggedToday)} logged` : ''}</span>}
                  </div>
                  {!rest ? (
                    <>
                      {list.map((r) => (
                        <PlanRow key={r.id} row={r} names={names} done={!!t.completion[r.id]?.done} focus={focusId === r.id} onToggle={() => toggle(r)} onPatch={(p) => patchRow(r.id, p)} onDelete={() => removeRow(r)} />
                      ))}
                      <button type="button" className="tg-add" onClick={() => addRow(d)}><LuPlus aria-hidden />Add a slot</button>
                    </>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="tg-side">
          <Card>
            <CardHead title="Backlog" sub={pending.length ? `${plural(pending.length, 'topic')} planned for past days and not done.` : 'You are all caught up.'} />
            {grouped.length ? (
              <ul className="tg-bl">
                {grouped.map(([date, items]) => (
                  <li key={date}>
                    <div className="tg-bl-day">{items[0].dayLabel}</div>
                    <div className="col g-2" style={{ marginTop: 8 }}>
                      {items.map((b) => (
                        <div className="tg-bl-item" key={b.id}>
                          <div className="row g-2"><SubjectTag name={b.subject} /><span className="t-xs dim">{fmtNum(b.targetHours, 1)}h planned</span></div>
                          <b>{b.topic}</b>
                          <div className="tg-bl-act">
                            <Button size="sm" variant="soft" onClick={() => { sfx.play('checkOn'); resolveBacklog(b.id, 'completed', suffix); }}>Done</Button>
                            <Button size="sm" onClick={() => navigateTo('LOG')}>Log it</Button>
                            <Button size="sm" variant="ghost" onClick={() => { resolveBacklog(b.id, 'dismissed', suffix); toast({ message: 'Dismissed', sub: b.topic, tone: 'info', action: { label: 'Undo', onClick: () => reopenBacklog(b.id, suffix) } }); }}>Dismiss</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="t-small dim">Anything you plan for a day that passes without study, and that you have not ticked off, shows up here.</p>}
          </Card>

          <Card>
            <CardHead title="This week" sub={`${weekDone} of ${weekRows.length} slots ticked off`} />
            <div className="col g-3">
              <div className="row between t-small"><span className="muted">Studied</span><b>{fmtHM(weekLogged)} of {fmtHM(weekPlanned)}</b></div>
              <ProgressBar value={weekPlanned ? clamp((weekLogged / weekPlanned) * 100, 0, 100) : 0} accent={weekPlanned && weekLogged >= weekPlanned ? 'good' : 'brand'} label="Hours studied against the plan" />
            </div>
          </Card>

          <Card>
            <CardHead title="Manage the plan" />
            <div className="col g-3">
              <Button block onClick={onRebuild}><LuCalendarDays aria-hidden /> Rebuild for new dates</Button>
              <Button block variant="danger" onClick={clear}><LuTrash2 aria-hidden /> Delete this plan</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
