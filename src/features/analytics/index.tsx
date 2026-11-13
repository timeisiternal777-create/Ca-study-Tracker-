import { useMemo, useState } from 'react';
import { LuCalendarCheck, LuClock, LuFlame, LuTrendingUp } from 'react-icons/lu';
import './analytics.css';
import { ChartCard, ChartTable, DonutChart, HBarChart, Legend, TrendChart, BarChart, type BarSeries, type Series } from '../../components/charts';
import { Card, PageHeader, Segmented, StatCard, SubjectTag, EmptyState } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { addDays, eachDay, fmtDate, parseYmd, startOfWeek } from '../../lib/date';
import { fmtHM, fmtNum, plural } from '../../lib/format';
import { SLOTS, getSlot } from '../../lib/log';
import { LuChartColumn } from 'react-icons/lu';

type Range = '7' | '30' | '90' | 'all';
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const h1 = (n: number) => `${fmtNum(n, n % 1 ? 1 : 0)}h`;

export default function Analytics() {
  const { allSubjectsInGroup, getSubjectMetadata } = useLevelConfig();
  const { studyLogs, stats, settings, today } = useStudy();
  const [range, setRange] = useState<Range>('30');
  const [hiddenSubj, setHiddenSubj] = useState<string[]>([]);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const goal = settings.dailyGoalHours;

  const model = useMemo(() => {
    const first = studyLogs.length ? [...studyLogs].map((l) => l.date).sort()[0] : today;
    const start = range === 'all' ? first : addDays(today, -(Number(range) - 1));
    const s = start < first && range === 'all' ? first : start;
    const days = eachDay(s, today);
    const hours = days.map((d) => stats.dailyTotals[d] || 0);
    const total = hours.reduce((a, b) => a + b, 0);
    const ma = hours.map((_, i) => { const from = Math.max(0, i - 6); const seg = hours.slice(from, i + 1); return +(seg.reduce((a, b) => a + b, 0) / seg.length).toFixed(2); });
    let run = 0; const cum = hours.map((h) => (run += h));
    const atGoal = hours.filter((h) => h >= goal).length;
    const studied = hours.filter((h) => h > 0).length;
    let best = { h: 0, d: '' }; hours.forEach((h, i) => { if (h > best.h) best = { h, d: days[i] }; });
    // longest gap
    let gap = 0, g = 0; hours.forEach((h) => { if (h === 0) { g++; gap = Math.max(gap, g); } else g = 0; });
    // weeks
    const wkMap = new Map<string, number>(); days.forEach((d, i) => { const k = startOfWeek(d); wkMap.set(k, (wkMap.get(k) || 0) + hours[i]); });
    const weeks = [...wkMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
    // weekday averages
    const wdSum = Array(7).fill(0), wdN = Array(7).fill(0);
    days.forEach((d, i) => { const k = (parseYmd(d).getDay() + 6) % 7; wdSum[k] += hours[i]; wdN[k]++; });
    const wdAvg = wdSum.map((v, i) => (wdN[i] ? v / wdN[i] : 0));
    // subjects
    const subj = new Map<string, number>();
    const set = new Set(days);
    for (const l of studyLogs) { if (!set.has(l.date)) continue; for (const k of SLOTS) { const x = getSlot(l, k); if (x.subject && x.hours > 0) subj.set(x.subject, (subj.get(x.subject) || 0) + x.hours); } }
    return { days, hours, total, ma, cum, atGoal, studied, best, gap, weeks, wdAvg, subj };
  }, [studyLogs, stats.dailyTotals, range, today, goal]);

  if (studyLogs.length === 0) {
    return (
      <div className="page-enter">
        <PageHeader title="Trends" sub="Trends in your study time." />
        <Card><EmptyState icon={<LuChartColumn />} title="Nothing to chart yet">Log a study day and your trends, subject split and weekday pattern will appear here.</EmptyState></Card>
      </div>
    );
  }

  const n = model.days.length;
  const avg = n ? model.total / n : 0;
  const x = model.days;
  const dayTitle = (i: number) => fmtDate(x[i], { weekday: true });
  const dailySeries: Series[] = [
    { id: 'h', label: 'Hours', color: 'var(--c-cyan)', values: model.hours, area: true },
    { id: 'ma', label: '7-day average', color: 'var(--c-gold)', values: model.ma, width: 2 },
  ];
  const toggleSeries = (id: string) => setHiddenSeries((h) => (h.includes(id) ? h.filter((v) => v !== id) : [...h, id]));

  const weekBars: BarSeries[] = [{ id: 'w', label: 'Hours', color: 'var(--c-violet)', values: model.weeks.map((w) => +w[1].toFixed(1)) }];
  const wdBars: BarSeries[] = [{ id: 'wd', label: 'Average hours', color: 'var(--c-mint)', values: model.wdAvg.map((v) => +v.toFixed(2)) }];
  const bestWd = model.wdAvg.indexOf(Math.max(...model.wdAvg));
  const bestWeek = model.weeks.reduce((a, w) => (w[1] > a[1] ? w : a), model.weeks[0] ?? ['', 0]);

  const subjRows = allSubjectsInGroup
    .map((s) => ({ s, h: model.subj.get(s.name) || 0 }))
    .filter((r) => r.h > 0)
    .sort((a, b) => b.h - a.h);
  const subjTotal = subjRows.reduce((a, r) => a + r.h, 0);
  const slices = subjRows.filter((r) => !hiddenSubj.includes(r.s.name)).map((r) => ({ id: r.s.name, label: r.s.abbrev, value: r.h, color: getSubjectMetadata(r.s.name).color }));

  const insights: string[] = [];
  insights.push(`You studied on ${model.studied} of ${n} days and hit your ${fmtNum(goal)}h goal on ${model.atGoal}.`);
  if (bestWeek[0]) insights.push(`Best week: ${h1(bestWeek[1])}, starting ${fmtDate(bestWeek[0])}.`);
  if (Math.max(...model.wdAvg) > 0) insights.push(`${WD[bestWd]} is your strongest day, averaging ${h1(model.wdAvg[bestWd])}.`);
  if (model.gap >= 2) insights.push(`Longest break in this range: ${plural(model.gap, 'day')} without study.`);
  if (subjRows.length) insights.push(`Most time on ${subjRows[0].s.name} (${Math.round((subjRows[0].h / subjTotal) * 100)}%)${subjRows.length > 1 ? `; least on ${subjRows[subjRows.length - 1].s.name} (${Math.round((subjRows[subjRows.length - 1].h / subjTotal) * 100)}%)` : ''}.`);

  return (
    <div className="page-enter">
      <PageHeader title="Trends" sub="Trends in your study time, subject mix and weekly rhythm."
        actions={<Segmented label="Range" value={range} onChange={setRange} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All time' }]} />} />

      <div className="an-stats stagger">
        <StatCard label="Hours studied" value={model.total} decimals={1} unit="h" icon={<LuClock />} accent="cyan" foot={`${plural(n, 'day')} in range`} />
        <StatCard label="Daily average" value={avg} decimals={1} unit="h / day" icon={<LuTrendingUp />} accent="violet" foot={avg >= goal ? 'At or above your goal' : `${fmtHM(goal - avg)} below your goal`} />
        <StatCard label="Days at goal" value={model.atGoal} unit={`of ${n}`} icon={<LuCalendarCheck />} accent="mint" foot={`${Math.round(n ? (model.atGoal / n) * 100 : 0)}% consistency`} />
        <StatCard label="Best day" value={model.best.h} decimals={1} unit="h" icon={<LuFlame />} accent="ember" foot={model.best.d ? fmtDate(model.best.d, { weekday: true }) : 'No data yet'} />
      </div>

      <div className="an-grid">
        <div className="an-12">
          <ChartCard title="Daily study time" sub="Hours per day with a 7-day moving average"
            legend={<Legend items={dailySeries.map((s) => ({ id: s.id, label: s.label, color: s.color }))} hidden={hiddenSeries} onToggle={toggleSeries} />}
            table={<ChartTable head={['Date', 'Hours', '7-day avg']} rows={x.map((d, i) => [fmtDate(d, { year: true }), model.hours[i], model.ma[i]])} />}>
            <TrendChart x={x} series={dailySeries} hidden={hiddenSeries} height={270} yFormat={(v) => `${v}`} valueFormat={h1} goal={{ value: goal, label: `Goal ${fmtNum(goal)}h` }}
              tipTitle={dayTitle} xTickLabel={(i) => fmtDate(x[i])} ariaLabel={`Daily hours over ${n} days. Average ${fmtNum(avg)} hours.`} />
          </ChartCard>
        </div>

        <div className="an-7">
          <ChartCard title="Weekly totals" sub="Monday to Sunday" table={<ChartTable head={['Week of', 'Hours']} rows={model.weeks.map((w) => [fmtDate(w[0], { year: true }), +w[1].toFixed(1)])} />}>
            <BarChart x={model.weeks.map((w) => fmtDate(w[0]))} series={weekBars} height={240} valueFormat={h1} tipTitle={(i) => `Week of ${fmtDate(model.weeks[i][0], { year: true })}`} ariaLabel="Total hours per week"
              goal={{ value: goal * 7, label: `Goal ${fmtNum(goal * 7)}h` }} hot={model.weeks.length - 1} />
          </ChartCard>
        </div>
        <div className="an-5">
          <ChartCard title="Weekday pattern" sub="Average hours by day of the week" table={<ChartTable head={['Weekday', 'Average hours']} rows={WD.map((d, i) => [d, +model.wdAvg[i].toFixed(2)])} />}>
            <BarChart x={WD} series={wdBars} height={240} valueFormat={h1} ariaLabel="Average hours by weekday" hot={bestWd} goal={{ value: goal, label: `Goal ${fmtNum(goal)}h` }} />
          </ChartCard>
        </div>

        <div className="an-7">
          <ChartCard title="Time by subject" sub={`${fmtHM(subjTotal)} in this range`}
            legend={<Legend items={subjRows.map((r) => ({ id: r.s.name, label: r.s.abbrev, color: getSubjectMetadata(r.s.name).color }))} hidden={hiddenSubj} onToggle={(id) => setHiddenSubj((h) => (h.includes(id) ? h.filter((v) => v !== id) : [...h, id]))} />}
            table={<ChartTable head={['Subject', 'Hours', 'Share']} rows={subjRows.map((r) => [r.s.name, +r.h.toFixed(1), `${Math.round((r.h / subjTotal) * 100)}%`])} />}>
            {subjRows.length === 0 ? <p className="muted t-small">No subject time in this range.</p> : (
              <div className="an-subj">
                <DonutChart items={slices} size={188} thickness={22} ariaLabel="Share of study time by subject" valueFormat={h1}>
                  <b className="t-num">{fmtNum(slices.reduce((a, s) => a + s.value, 0), 0)}h</b><span>studied</span>
                </DonutChart>
                <div className="grow min-0">
                  <HBarChart ariaLabel="Hours by subject" max={subjRows[0].h}
                    items={subjRows.map((r) => ({ id: r.s.name, label: <><SubjectTag name={r.s.name} /><span className="truncate">{r.s.name}</span></>, value: r.h, display: `${h1(r.h)} · ${Math.round((r.h / subjTotal) * 100)}%`, color: getSubjectMetadata(r.s.name).color }))} />
                </div>
              </div>
            )}
          </ChartCard>
        </div>
        <div className="an-5 col g-5">
          <ChartCard title="Total hours so far" sub="Cumulative across this range" table={<ChartTable head={['Date', 'Cumulative hours']} rows={x.map((d, i) => [fmtDate(d, { year: true }), +model.cum[i].toFixed(1)])} />}>
            <TrendChart x={x} series={[{ id: 'c', label: 'Total hours', color: 'var(--c-mint)', values: model.cum, area: true }]} height={200} valueFormat={h1} tipTitle={dayTitle} xTickLabel={(i) => fmtDate(x[i])} ariaLabel="Cumulative hours studied" smooth />
          </ChartCard>
          <Card className="grow">
            <h3 className="ch-title">What the data says</h3>
            <ul className="an-insights">{insights.map((t) => <li key={t}>{t}</li>)}</ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
