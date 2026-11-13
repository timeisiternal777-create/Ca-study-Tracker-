import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LuArrowRight, LuFlame, LuCalendarRange } from 'react-icons/lu';
import './heatmap.css';
import { BarChart, ChartCard, ChartTable, useWidth } from '../../components/charts';
import { Button, Card, CardHead, EmptyState, PageHeader, StatCard, SubjectTag, Tag } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { addDays, eachDay, fmtDate, monthName, parseYmd, startOfWeek } from '../../lib/date';
import { cn, fmtHM, fmtNum } from '../../lib/format';
import { filledSlots } from '../../lib/log';
import { navigateTo } from '../../lib/nav';
import { BEAST_HOURS } from '../../lib/stats';

const MAX_WEEKS = 53;
const GAP = 4;
const ROWS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

function level(h: number, goal: number, streakMin: number): 0 | 1 | 2 | 3 | 4 {
  if (h <= 0) return 0;
  if (h >= goal) return 4;
  if (h >= streakMin) return 3;
  if (h >= 3) return 2;
  return 1;
}

export default function Heatmap() {
  const { getSubjectMetadata } = useLevelConfig();
  const { studyLogs, stats, settings, today } = useStudy();
  const goal = settings.dailyGoalHours;
  const [sel, setSel] = useState<string>(today);
  const scroller = useRef<HTMLDivElement>(null);
  const [frame, fw] = useWidth<HTMLDivElement>();

  const grid = useMemo(() => {
    const end = startOfWeek(today);
    const CELL = 22;
    const WEEKS = Math.max(24, Math.min(MAX_WEEKS, Math.floor((fw - 42) / (CELL + GAP)) || 24));
    const start = addDays(end, -(WEEKS - 1) * 7);
    const days = eachDay(start, addDays(end, 6));
    const months: { col: number; label: string }[] = [];
    let last = -1;
    days.forEach((d, i) => {
      if (i % 7 !== 0) return;
      const m = parseYmd(d).getMonth();
      if (m !== last) { months.push({ col: i / 7, label: monthName(m).slice(0, 3) }); last = m; }
    });
    const cleaned = months.filter((m, i) => i === months.length - 1 || months[i + 1].col - m.col >= 3);
    const cell = fw && fw < 520 ? 18 : CELL;
    return { days, months: cleaned, start, weeks: WEEKS, cell };
  }, [today, fw]);

  const byDate = useMemo(() => new Map(studyLogs.map((l) => [l.date, l])), [studyLogs]);

  // Start the strip scrolled to the most recent weeks.
  useEffect(() => { const el = scroller.current; if (el) el.scrollLeft = el.scrollWidth; }, []);

  const active = useMemo(() => grid.days.filter((d) => d <= today && (stats.dailyTotals[d] || 0) > 0).length, [grid, stats.dailyTotals, today]);
  const beast = useMemo(() => grid.days.filter((d) => (stats.dailyTotals[d] || 0) >= BEAST_HOURS).length, [grid, stats.dailyTotals]);
  const total = useMemo(() => grid.days.reduce((a, d) => a + (stats.dailyTotals[d] || 0), 0), [grid, stats.dailyTotals]);

  const monthly = useMemo(() => {
    const out: { key: string; label: string; h: number }[] = [];
    const t = parseYmd(today);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${monthName(d.getMonth()).slice(0, 3)}${d.getMonth() === 0 || i === 11 ? ` ${String(d.getFullYear()).slice(2)}` : ''}`, h: 0 });
    }
    for (const [d, h] of Object.entries(stats.dailyTotals)) { const m = out.find((o) => o.key === d.slice(0, 7)); if (m) m.h += h; }
    return out;
  }, [stats.dailyTotals, today]);

  if (!studyLogs.length) {
    return (
      <div className="page-enter">
        <PageHeader title="Heatmap" sub="A year of study at a glance." />
        <Card><EmptyState icon={<LuCalendarRange />} title="Your heatmap starts with day one">Log a study day and a cell lights up here. Over time you'll see streaks and gaps at a glance.</EmptyState></Card>
      </div>
    );
  }

  const log = byDate.get(sel);
  const selH = stats.dailyTotals[sel] || 0;
  const slots = filledSlots(log);

  const open = () => { try { sessionStorage.setItem('ca_log_open_date', sel); } catch { /* ignore */ } navigateTo('LOG'); };

  return (
    <div className="page-enter">
      <PageHeader title="Heatmap" sub="Every cell is a day. Brighter means more hours; tap one for the details." />

      <div className="hm-stats stagger">
        <StatCard label="Active days" value={active} unit="this year" icon={<LuCalendarRange />} accent="cyan" foot={`${fmtNum(total, 0)} hours in the last ${grid.weeks} weeks`} />
        <StatCard label="Current streak" value={stats.currentFireStreak} unit={stats.currentFireStreak === 1 ? 'day' : 'days'} icon={<LuFlame />} accent="ember" foot={`${stats.streakMin}h+ days in a row · best ${stats.maxStreak}`} />
        <StatCard label="Beast days" value={beast} unit="days" icon={<LuFlame />} accent="gold" foot={`${BEAST_HOURS}h or more in a day`} />
      </div>

      <Card className="hm-card" size="roomy">
        <CardHead title="Study year" sub={`${fmtDate(grid.start, { year: true })} to today`} />
        <div ref={frame}><div className="hm-scroll no-scrollbar" ref={scroller} style={{ ['--cell' as string]: `${grid.cell}px` } as CSSProperties}>
          <div className="hm-board">
            <div className="hm-months" style={{ ['--w' as string]: grid.weeks } as CSSProperties}>
              {grid.months.map((m) => <span key={m.col} style={{ gridColumn: m.col + 1 }}>{m.label}</span>)}
            </div>
            <div className="hm-body">
              <div className="hm-rows" aria-hidden>{ROWS.map((r, i) => <span key={i}>{r}</span>)}</div>
              <div className="hm-cells" role="grid" aria-label="Study hours by day">
                {grid.days.map((d) => {
                  const h = stats.dailyTotals[d] || 0;
                  const future = d > today;
                  const lv = level(h, goal, stats.streakMin);
                  return (
                    <button key={d} className={cn('hm-cell', d === today && 'is-today', h >= BEAST_HOURS && 'is-beast', d === sel && 'is-sel')} data-l={future ? 'f' : lv} disabled={future}
                      aria-label={`${fmtDate(d, { weekday: true, year: true })}: ${h > 0 ? fmtHM(h) : 'no study'}`} aria-pressed={d === sel} onClick={() => { setSel(d); }} />
                  );
                })}
              </div>
            </div>
          </div>
        </div></div>
        <div className="hm-legend">
          <span className="t-xs dim">Less</span>
          {[0, 1, 2, 3, 4].map((l) => <i key={l} className="hm-cell hm-key" data-l={l} />)}
          <span className="t-xs dim">More</span>
          <span className="hm-legend-note t-xs dim">Levels: under 3h · 3h to a streak day · {stats.streakMin}h+ (streak day) · goal met. A dot marks {BEAST_HOURS}h+ days.</span>
        </div>
      </Card>

      <div className="hm-lower">
        <Card className="hm-detail" key={sel} accent={selH >= goal ? 'good' : undefined}>
          <CardHead title={fmtDate(sel, { weekday: true, year: true })} sub={selH > 0 ? `${fmtHM(selH)} studied` : sel > today ? 'In the future' : 'No study logged'}
            action={sel <= today ? <Button size="sm" variant="soft" onClick={open}>{log ? 'Edit day' : 'Log this day'}<LuArrowRight /></Button> : undefined} />
          {slots.length ? (
            <ul className="col g-3">
              {slots.map((s) => (
                <li key={s.slot} className="hm-slot">
                  <SubjectTag name={s.subject || '—'} />
                  <div className="grow min-0"><div className="t-small fw-6 truncate">{s.subject || 'Unassigned'}</div><div className="t-xs dim truncate">{s.topic || 'No topic noted'}</div></div>
                  <b className="t-num">{fmtHM(s.hours)}</b>
                </li>
              ))}
              <div className="row g-2 wrap">
                {selH >= BEAST_HOURS ? <Tag accent="ember"><LuFlame />Beast day</Tag> : null}
                {selH >= goal ? <Tag accent="good">Goal met</Tag> : selH >= stats.streakMin ? <Tag accent="warn">Streak day</Tag> : <Tag>Below streak threshold</Tag>}
              </div>
            </ul>
          ) : <p className="muted t-small">{sel > today ? 'Pick a day up to today.' : 'Nothing was logged on this day.'}</p>}
        </Card>

        <ChartCard title="Monthly totals" sub="Last 12 months" table={<ChartTable head={['Month', 'Hours']} rows={monthly.map((m) => [m.label, +m.h.toFixed(1)])} />}>
          <BarChart x={monthly.map((m) => m.label)} series={[{ id: 'm', label: 'Hours', color: 'var(--c-cyan)', values: monthly.map((m) => +m.h.toFixed(1)) }]} height={220} valueFormat={(n) => `${fmtNum(n)}h`} ariaLabel="Hours studied per month" hot={monthly.length - 1} />
        </ChartCard>
      </div>
    </div>
  );
}
