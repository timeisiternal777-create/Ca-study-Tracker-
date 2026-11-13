import { useMemo, useState } from 'react';
import { LuArrowRight, LuCircleAlert, LuCircleCheck, LuGitCompareArrows, LuInfo, LuTriangleAlert } from 'react-icons/lu';
import './plan.css';
import { BarChart, ChartCard, ChartTable, Legend, TrendChart, type BarSeries, type Series } from '../../components/charts';
import { Button, Card, CardHead, CountUp, EmptyState, PageHeader, ProgressBar, Ring, Segmented, SubjectLabel, SubjectTag } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { useBacklogs } from '../../lib/backlog';
import { fmtDate } from '../../lib/date';
import { cn, fmtNum, plural } from '../../lib/format';
import { navigateTo } from '../../lib/nav';
import { analyse, type InsightTone } from '../../lib/planAnalysis';
import { useTargets, type PlanSource } from '../../lib/targets';

const h1 = (n: number) => `${fmtNum(n, n % 1 ? 1 : 0)}h`;
const ACC: Record<InsightTone, 'good' | 'warn' | 'bad' | 'brand'> = { good: 'good', warn: 'warn', bad: 'bad', info: 'brand' };
const ICON: Record<InsightTone, JSX.Element> = {
  good: <LuCircleCheck aria-hidden />, warn: <LuTriangleAlert aria-hidden />, bad: <LuCircleAlert aria-hidden />, info: <LuInfo aria-hidden />,
};
const C = { target: 'var(--c-violet)', done: 'var(--c-mint)', logged: 'var(--c-cyan)' };

export default function PlanVsActual() {
  const t = useTargets();
  const { allSubjectsInGroup, groups, selectedGroup, level, suffix, getSubjectMetadata } = useLevelConfig();
  const { studyLogs, stats, settings, today } = useStudy();
  const { pending } = useBacklogs(suffix);

  const hasSyllabus = t.syllabus.length > 0;
  const hasDates = (t.custom?.rows.length ?? 0) > 0;
  const [pick, setPick] = useState<PlanSource | null>(null);
  const ok = (k: PlanSource | null) => (k === 'excel' ? hasSyllabus : k === 'custom' ? hasDates : false);
  const mode: PlanSource | null = ok(pick) ? pick : ok(t.source) ? t.source : hasSyllabus ? 'excel' : hasDates ? 'custom' : null;

  const names = useMemo(() => {
    const known = allSubjectsInGroup.map((s) => s.name);
    const extra = [...new Set([...t.syllabus.map((i) => i.subject), ...(t.custom?.rows ?? []).map((r) => r.subject)])].filter((n) => !known.includes(n));
    return [...known, ...extra];
  }, [allSubjectsInGroup, t.syllabus, t.custom]);

  const a = useMemo(() => (mode ? analyse({
    mode, syllabus: t.syllabus, custom: t.custom?.rows ?? [], completion: t.completion, plan: t.plan, logs: studyLogs,
    dailyTotals: stats.dailyTotals, last7Avg: stats.last7Avg, paperNames: names, examDate: settings.targetExamDate, today, backlogPending: pending.length,
  }) : null), [mode, t.syllabus, t.custom, t.completion, t.plan, studyLogs, stats.dailyTotals, stats.last7Avg, names, settings.targetExamDate, today, pending.length]);

  if (!mode || !a) {
    return (
      <div className="page-enter">
        <PageHeader title="Plan vs actual" sub="See how your study compares with what you planned." />
        <EmptyState icon={<LuGitCompareArrows />} title="No plan to compare yet" action={<Button variant="primary" onClick={() => navigateTo('TARGETS')}>Set up your plan</Button>}>
          Build a syllabus plan or a date plan in Schedule. Once it has topics, this page shows whether your hours are keeping up.
        </EmptyState>
      </div>
    );
  }

  const both = hasSyllabus && hasDates;
  const date = mode === 'custom';
  const tone = ACC[a.verdict.tone];
  const rows = a.papers.filter((p) => p.target > 0 || p.logged > 0);
  const grouped = level !== 'foundation' && selectedGroup === 'both';
  const abbr = (n: string) => getSubjectMetadata(n).abbrev;

  const paperBars: BarSeries[] = [
    { id: 't', label: date ? 'Planned' : 'Target', color: C.target, values: rows.map((p) => +p.target.toFixed(1)) },
    { id: 'd', label: 'Done', color: C.done, values: rows.map((p) => +p.done.toFixed(1)) },
    { id: 'l', label: 'Logged', color: C.logged, values: rows.map((p) => +p.logged.toFixed(1)) },
  ];
  const trend: Series[] = a.series ? [
    { id: 'p', label: 'Planned so far', color: C.target, values: a.series.planned, dashed: true, width: 2 },
    { id: 'l', label: 'Logged so far', color: C.logged, values: a.series.logged, area: true },
  ] : [];
  const weekBars: BarSeries[] = date
    ? [{ id: 'p', label: 'Planned', color: C.target, values: a.weeks.map((w) => +w.planned.toFixed(1)) }, { id: 'l', label: 'Logged', color: C.logged, values: a.weeks.map((w) => +w.logged.toFixed(1)) }]
    : [{ id: 'l', label: 'Logged', color: C.logged, values: a.weeks.map((w) => +w.logged.toFixed(1)) }];

  const fact = (label: string, value: string, sub?: string) => (
    <div className="pa-fact"><span>{label}</span><b className="t-num">{value}</b>{sub ? <em>{sub}</em> : null}</div>
  );

  const renderPaper = (p: (typeof rows)[number]) => {
    const meta = getSubjectMetadata(p.name);
    const donePct = p.target ? Math.min(100, (p.done / p.target) * 100) : 0;
    const logPct = p.target ? Math.min(100, (p.logged / p.target) * 100) : 0;
    return (
      <li key={p.name} className={`pa-paper acc-${meta.accent}`}>
        <div className="pa-paper-top">
          <SubjectLabel name={p.name} />
          <span className="t-small muted"><b className="t-num" style={{ color: 'var(--tx-0)' }}>{h1(p.done)}</b> of {h1(p.target)} done</span>
        </div>
        <div className="pa-bars" aria-hidden>
          <div className="pa-bar"><i className="is-done" style={{ transform: `scaleX(${donePct / 100})` }} /></div>
          <div className="pa-bar"><i className="is-log" style={{ transform: `scaleX(${logPct / 100})` }} /></div>
        </div>
        <div className="pa-paper-foot">
          <span>{p.topicsDone} of {plural(p.topics, 'topic')} covered</span>
          <span>{h1(Math.round(p.logged * 10) / 10)} logged</span>
        </div>
      </li>
    );
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Plan vs actual"
        sub={date ? 'Your date plan against the hours you really logged.' : 'The hours your syllabus needs against the pace you are keeping.'}
        actions={<>
          {both ? <Segmented<PlanSource> label="Plan type" value={mode} onChange={setPick} options={[{ value: 'excel', label: 'Syllabus plan' }, { value: 'custom', label: 'Date plan' }]} /> : null}
          <Button onClick={() => navigateTo('TARGETS')}>Open Schedule <LuArrowRight aria-hidden /></Button>
        </>}
      />

      <Card className={cn('pa-hero', `acc-${tone}`)} accent={tone} glow>
        <Ring value={a.totals.pct} size={132} stroke={10} accent={tone}>
          <div className="pa-ring"><b className="t-num"><CountUp value={Math.round(a.totals.pct)} />%</b><span>topics covered</span></div>
        </Ring>
        <div className="pa-verdict">
          <span className="pa-verdict-tag">{ICON[a.verdict.tone]}{date ? 'Against your plan' : 'Against your exam date'}</span>
          <h2>{a.verdict.title}</h2>
          <p>{a.verdict.body}</p>
        </div>
        <div className="pa-facts">
          {date ? (<>
            {fact('Slots covered', a.adherence?.total ? `${a.adherence.satisfied} of ${a.adherence.total}` : 'None due', 'on days that have passed')}
            {fact('Hours logged', h1(a.loggedToDate), `of ${h1(a.plannedToDate)} planned`)}
            {fact('Backlog', String(pending.length), pending.length ? 'missed and open' : 'all caught up')}
          </>) : (<>
            {fact('Needed a day', a.needPerDay != null ? h1(Math.round(a.needPerDay * 10) / 10) : 'n/a', a.pace ? `${plural(a.pace.studyDays, 'study day')} left` : 'no exam date ahead')}
            {fact('Last 7 days', h1(Math.round(a.avg7 * 10) / 10), 'average a day')}
            {fact('Finish date', a.finish ? fmtDate(a.finish.date) : a.totals.remaining === 0 ? 'Done' : 'n/a', a.finish ? (a.finish.marginDays >= 0 ? `${plural(a.finish.marginDays, 'day')} before the exam` : `${plural(-a.finish.marginDays, 'day')} after the exam`) : 'at this week’s average')}
          </>)}
        </div>
      </Card>

      <div className="pa-kpis stagger">
        <div className="pa-kpi"><span>{date ? 'Planned' : 'Target'}</span><b className="t-num">{fmtNum(a.totals.target, 1)}<small>h</small></b><em>{plural(a.totals.topics, 'topic')}</em></div>
        <div className="pa-kpi"><span>Done</span><b className="t-num" style={{ color: 'var(--c-mint)' }}>{fmtNum(a.totals.done, 1)}<small>h</small></b><em>{a.totals.topicsDone} of {a.totals.topics} topics</em></div>
        <div className="pa-kpi"><span>Still to do</span><b className="t-num" style={{ color: 'var(--c-gold)' }}>{fmtNum(a.totals.remaining, 1)}<small>h</small></b><em>{a.totals.topics - a.totals.topicsDone} topics left</em></div>
        <div className="pa-kpi"><span>Hours logged</span><b className="t-num" style={{ color: 'var(--c-cyan)' }}>{fmtNum(a.totals.logged, 1)}<small>h</small></b><em>{date ? 'inside the plan dates' : 'in your study log'}</em></div>
      </div>

      <div className="pa-grid">
        <div className="col g-5 min-0">
          <Card>
            <CardHead title="By paper" sub={date ? 'The solid bar is the share of planned hours you covered. The lighter bar is hours logged on plan days.' : 'The solid bar is the share of target hours you ticked off. The lighter bar is every hour in your study log for that paper.'} />
            {rows.length ? (
              grouped ? (
                <div className="col g-5">
                  {groups.map((g) => {
                    const list = rows.filter((p) => g.papers.includes(p.name));
                    if (!list.length) return null;
                    const tgt = list.reduce((x, p) => x + p.target, 0), dn = list.reduce((x, p) => x + p.done, 0);
                    return (
                      <section key={g.id} aria-label={g.name}>
                        <div className="pa-group"><b>{g.name}</b><span>{h1(dn)} of {h1(tgt)} done</span></div>
                        <ul className="pa-papers">{list.map(renderPaper)}</ul>
                      </section>
                    );
                  })}
                  {rows.filter((p) => !groups.some((g) => g.papers.includes(p.name))).length ? <ul className="pa-papers">{rows.filter((p) => !groups.some((g) => g.papers.includes(p.name))).map(renderPaper)}</ul> : null}
                </div>
              ) : <ul className="pa-papers">{rows.map(renderPaper)}</ul>
            ) : <p className="t-small dim">No paper has any topics yet.</p>}
          </Card>

          <ChartCard
            title={date ? 'Planned against logged' : 'Weekly hours against what you need'}
            sub={date ? 'Running totals from the first planned day. The logged line stops at today.' : a.needPerWeek != null ? `The dashed line is the ${h1(Math.round(a.needPerWeek * 10) / 10)} a week you need from here.` : 'Hours logged in each of the last eight weeks.'}
            legend={<Legend items={date ? trend.map((s) => ({ id: s.id, label: s.label, color: s.color })) : [{ id: 'l', label: 'Logged', color: C.logged }]} />}
            table={date && a.series
              ? <ChartTable head={['Date', 'Planned so far', 'Logged so far']} rows={a.series.x.map((d, i) => [fmtDate(d), a.series!.planned[i] ?? 0, a.series!.logged[i] ?? '-'])} />
              : <ChartTable head={['Week of', 'Logged']} rows={a.weeks.map((w) => [fmtDate(w.start), +w.logged.toFixed(1)])} />}
          >
            {date && a.series
              ? <TrendChart x={a.series.x.map((d) => fmtDate(d))} series={trend} height={260} yFormat={(v) => `${v}`} valueFormat={h1} xTicks={6} smooth={false} ariaLabel="Running total of planned and logged hours" />
              : <BarChart x={a.weeks.map((w) => fmtDate(w.start))} series={weekBars} height={240} valueFormat={h1} tipTitle={(i) => `Week of ${fmtDate(a.weeks[i].start, { year: true })}`} goal={a.needPerWeek != null ? { value: Math.round(a.needPerWeek * 10) / 10, label: `Need ${h1(Math.round(a.needPerWeek * 10) / 10)}` } : undefined} ariaLabel="Hours logged in each of the last eight weeks" />}
          </ChartCard>

          {date && a.weeks.length ? (
            <ChartCard title="Week by week" sub="Planned hours, logged hours and how many slots you covered."
              legend={<Legend items={weekBars.map((s) => ({ id: s.id, label: s.label, color: s.color }))} />}
              table={<ChartTable head={['Week of', 'Planned', 'Logged', 'Slots covered']} rows={a.weeks.map((w) => [fmtDate(w.start), h1(+w.planned.toFixed(1)), h1(+w.logged.toFixed(1)), `${w.satisfied} of ${w.slots}`])} />}>
              <BarChart x={a.weeks.map((w) => fmtDate(w.start))} series={weekBars} height={240} valueFormat={h1} tipTitle={(i) => `Week of ${fmtDate(a.weeks[i].start, { year: true })}`} ariaLabel="Planned and logged hours in each week" />
            </ChartCard>
          ) : null}

          {rows.length ? (
            <ChartCard title="Target, done and logged" sub="Every paper side by side."
              legend={<Legend items={paperBars.map((s) => ({ id: s.id, label: s.label, color: s.color }))} />}
              table={<ChartTable head={['Paper', date ? 'Planned' : 'Target', 'Done', 'Logged']} rows={rows.map((p) => [p.name, h1(+p.target.toFixed(1)), h1(+p.done.toFixed(1)), h1(+p.logged.toFixed(1))])} />}>
              <BarChart x={rows.map((p) => abbr(p.name))} series={paperBars} height={250} valueFormat={h1} tipTitle={(i) => rows[i].name} ariaLabel="Target, done and logged hours for each paper" />
            </ChartCard>
          ) : null}
        </div>

        <div className="pa-side">
          <Card>
            <CardHead title="What to do next" sub="Drawn from your plan and your study log." />
            <ul className="pa-ins">
              {a.insights.length ? a.insights.map((n, i) => (
                <li key={i} className={`acc-${ACC[n.tone]}`}>
                  <span className="pa-ins-i">{ICON[n.tone]}</span>
                  <div><p>{n.text}</p>{n.link ? <button type="button" onClick={() => navigateTo(n.link!)}>{n.link === 'LOG' ? 'Open the study log' : 'Open Targets'} <LuArrowRight aria-hidden /></button> : null}</div>
                </li>
              )) : <li className="t-small dim">Nothing to flag. Keep going.</li>}
            </ul>
          </Card>

          <Card>
            <CardHead title="Still to cover" sub={a.pending.length ? `${plural(a.pending.reduce((x, g) => x + g.topics.length, 0), 'topic')}, ${h1(Math.round(a.pending.reduce((x, g) => x + g.hours, 0) * 10) / 10)} in all.` : 'Every topic is covered.'} />
            {a.pending.length ? (
              <ul className="pa-pend">
                {a.pending.slice(0, 6).map((g) => (
                  <li key={g.subject}>
                    <div className="row between g-2"><span className="row g-2 min-0"><SubjectTag name={g.subject} /><b className="truncate">{g.subject}</b></span><span className="t-xs dim">{h1(Math.round(g.hours * 10) / 10)}</span></div>
                    <p>{g.topics.slice(0, 3).map((x) => x.topic).join(' · ')}{g.topics.length > 3 ? ` and ${g.topics.length - 3} more` : ''}</p>
                  </li>
                ))}
              </ul>
            ) : <ProgressBar value={100} accent="good" label="All topics covered" />}
          </Card>
        </div>
      </div>
    </div>
  );
}
