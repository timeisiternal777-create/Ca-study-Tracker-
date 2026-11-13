import { useMemo, useState } from 'react';
import { LuArrowDownRight, LuArrowRight, LuArrowUpRight, LuCircleAlert, LuCircleCheck, LuClipboardList, LuMinus, LuTarget } from 'react-icons/lu';
import './mock-analysis.css';
import { ChartCard, ChartTable, Legend, TrendChart, type Series } from '../../components/charts';
import { Button, Card, EmptyState, PageHeader, Ring, Sparkline, SubjectTag, Tag } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { fmtDate } from '../../lib/date';
import { cn, fmtNum, plural } from '../../lib/format';
import { navigateTo } from '../../lib/nav';
import { gradeFor } from '../../lib/stats';
import type { MockLogEntry, SubjectConfig } from '../../types';

const pctOf = (m: MockLogEntry, cfg?: SubjectConfig) => ((cfg?.marks || 100) > 0 ? (m.marks / (cfg?.marks || 100)) * 100 : 0);

interface GroupResult { id: string; label: string; avg: number; pass: boolean; count: number; weakest?: { name: string; pct: number }; below40: string[] }

export default function MockAnalysis() {
  const { allSubjectsInGroup, getSubjectMetadata } = useLevelConfig();
  const { mockScores } = useStudy();
  const [hidden, setHidden] = useState<string[]>([]);

  const data = useMemo(() => {
    const byName = new Map(allSubjectsInGroup.map((s) => [s.name, s]));
    const list = mockScores.filter((m) => byName.has(m.subject)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const items = list.map((m) => ({ m, cfg: byName.get(m.subject)!, pct: pctOf(m, byName.get(m.subject)) }));

    const g1 = allSubjectsInGroup.filter((s) => s.group === 'group1' || s.group === 'both').map((s) => s.name);
    const g2 = allSubjectsInGroup.filter((s) => s.group === 'group2').map((s) => s.name);
    const makeGroup = (id: string, label: string, names: string[]): GroupResult => {
      const mine = items.filter((i) => names.includes(i.m.subject));
      const avg = mine.length ? mine.reduce((a, i) => a + i.pct, 0) / mine.length : 0;
      // A paper counts as under the 40% floor when its *average* is below it (one early bad mock shouldn't fail it forever).
      const below = names.filter((n) => { const mm = mine.filter((i) => i.m.subject === n); return mm.length > 0 && mm.reduce((a, i) => a + i.pct, 0) / mm.length < 40; });
      // weakest paper by its own average
      let weakest: GroupResult['weakest'];
      for (const n of names) {
        const mm = mine.filter((i) => i.m.subject === n);
        if (!mm.length) continue;
        const a = mm.reduce((x, i) => x + i.pct, 0) / mm.length;
        if (!weakest || a < weakest.pct) weakest = { name: n, pct: a };
      }
      return { id, label, avg, pass: avg >= 50 && below.length === 0 && mine.length > 0, count: mine.length, weakest, below40: below };
    };
    const groups: GroupResult[] = [makeGroup('g1', g2.length ? 'Group 1 aggregate' : 'Core aggregate', g1)];
    if (g2.length) groups.push(makeGroup('g2', 'Group 2 aggregate', g2));

    const passRate = items.length ? (items.filter((i) => i.pct >= 50).length / items.length) * 100 : 0;

    const per = allSubjectsInGroup.map((cfg) => {
      const mm = items.filter((i) => i.m.subject === cfg.name);
      const pcts = mm.map((i) => i.pct);
      const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
      const avgMarks = mm.length ? mm.reduce((a, i) => a + i.m.marks, 0) / mm.length : null;
      const delta = pcts.length >= 2 ? pcts[pcts.length - 1] - pcts[pcts.length - 2] : null;
      return { cfg, count: mm.length, avgPct, avgMarks, delta, pcts, best: pcts.length ? Math.max(...pcts) : null, worst: pcts.length ? Math.min(...pcts) : null, first: pcts[0] ?? null, last: pcts[pcts.length - 1] ?? null };
    });

    const dates = [...new Set(items.map((i) => i.m.date))];
    const series: Series[] = allSubjectsInGroup.filter((s) => items.some((i) => i.m.subject === s.name)).map((s) => ({
      id: s.name, label: s.abbrev, color: getSubjectMetadata(s.name).color,
      values: dates.map((d) => { const f = items.filter((i) => i.m.subject === s.name && i.m.date === d); return f.length ? +(f.reduce((a, i) => a + i.pct, 0) / f.length).toFixed(1) : null; }),
    }));
    return { items, groups, passRate, per, dates, series };
  }, [mockScores, allSubjectsInGroup, getSubjectMetadata]);

  if (data.items.length === 0) {
    return (
      <div className="page-enter">
        <PageHeader title="Mock analysis" sub="Pass odds, trends and weak spots from your mock tests." />
        <Card><EmptyState icon={<LuClipboardList />} title="No mock scores yet" action={<Button variant="primary" onClick={() => navigateTo('MOCK')}>Log a mock<LuArrowRight /></Button>}>
          Once you log a few mocks, you'll see whether you're on track to pass each group and which papers need work.
        </EmptyState></Card>
      </div>
    );
  }

  const ranked = data.per.filter((p) => p.avgPct !== null).sort((a, b) => (a.avgPct as number) - (b.avgPct as number));
  const improved = data.per.filter((p) => p.delta !== null).sort((a, b) => (b.delta as number) - (a.delta as number))[0];
  const toggle = (id: string) => setHidden((h) => (h.includes(id) ? h.filter((v) => v !== id) : [...h, id]));
  const fixes: { key: string; tone: 'bad' | 'warn'; text: string; name: string }[] = [];
  for (const r of ranked) {
    if ((r.avgPct as number) < 40) fixes.push({ key: r.cfg.name, name: r.cfg.name, tone: 'bad', text: `Averaging ${fmtNum(r.avgPct as number, 0)}%, below the 40% minimum. A single paper under 40% fails the group even if the aggregate is fine.` });
    else if ((r.avgPct as number) < 50) fixes.push({ key: r.cfg.name, name: r.cfg.name, tone: 'warn', text: `Averaging ${fmtNum(r.avgPct as number, 0)}%. ${fmtNum(50 - (r.avgPct as number), 0)} points more reaches the 50% pass line.` });
  }

  return (
    <div className="page-enter">
      <PageHeader title="Mock analysis" sub={`${plural(data.items.length, 'mock')} analysed. Pass means 50% aggregate and at least 40% in every paper.`}
        actions={<Button variant="soft" onClick={() => navigateTo('MOCK')}>Log a mock<LuArrowRight /></Button>} />

      <div className="ma-verdicts stagger">
        {data.groups.map((g) => {
          const acc = g.count === 0 ? undefined : g.pass ? 'good' : 'bad';
          return (
            <Card key={g.id} className="ma-verdict" accent={acc} tinted glow>
              <Ring value={g.avg} size={128} stroke={11} accent={acc ?? 'brand'}>
                <div className="ma-ring"><b className="t-num">{Math.round(g.avg)}%</b><span>average</span></div>
              </Ring>
              <div className="col g-2 grow min-0">
                <div className="t-small muted">{g.label}</div>
                {g.count === 0 ? <Tag>No mocks yet</Tag> : g.pass ? <Tag accent="good" size="lg"><LuCircleCheck />On track to pass</Tag> : <Tag accent="bad" size="lg"><LuCircleAlert />Not passing yet</Tag>}
                <p className="t-small muted">
                  {g.count === 0 ? 'Log a mock in these papers to see your verdict.'
                    : g.below40.length ? `Below 40% in ${g.below40.join(', ')}.`
                    : g.avg < 50 ? `${fmtNum(50 - g.avg, 0)} ${Math.round(50 - g.avg) === 1 ? 'point' : 'points'} short of the 50% aggregate.`
                    : g.weakest ? `Weakest paper: ${g.weakest.name} at ${fmtNum(g.weakest.pct, 0)}%.` : ''}
                </p>
              </div>
            </Card>
          );
        })}
        <Card className="ma-verdict" accent="cyan" tinted>
          <Ring value={data.passRate} size={128} stroke={11} accent="cyan"><div className="ma-ring"><b className="t-num">{Math.round(data.passRate)}%</b><span>pass rate</span></div></Ring>
          <div className="col g-2 grow min-0">
            <div className="t-small muted">Mocks at 50% or more</div>
            <Tag accent="cyan" size="lg"><LuTarget />{data.items.filter((i) => i.pct >= 50).length} of {data.items.length}</Tag>
            {improved && (improved.delta as number) > 0 ? <p className="t-small muted">Most improved: <b className="ma-b">{improved.cfg.name}</b> (+{fmtNum(improved.delta as number, 0)} points).</p> : <p className="t-small muted">Keep logging to see which paper is climbing.</p>}
          </div>
        </Card>
      </div>

      <div className="ma-mid">
        <ChartCard title="Scores over time" sub="Each line is a paper, shown as a percentage of its marks"
          legend={<Legend items={data.series.map((s) => ({ id: s.id, label: s.label, color: s.color }))} hidden={hidden} onToggle={toggle} />}
          table={<ChartTable head={['Date', 'Paper', 'Marks', '%']} rows={data.items.slice().reverse().map((i) => [fmtDate(i.m.date, { year: true }), i.cfg.abbrev, `${i.m.marks}/${i.cfg.marks}`, `${fmtNum(i.pct, 0)}%`])} />}>
          <TrendChart x={data.dates} series={data.series} hidden={hidden} height={280} yMax={100} yFormat={(n) => `${n}%`} valueFormat={(n) => `${fmtNum(n, 0)}%`} goal={{ value: 50, label: 'Pass 50%' }}
            tipTitle={(i) => fmtDate(data.dates[i], { weekday: true, year: true })} xTickLabel={(i) => fmtDate(data.dates[i])} smooth={false} connectGaps markers ariaLabel="Mock scores as a percentage over time" />
        </ChartCard>

        <Card className="ma-fix">
          <h3 className="ch-title">What to work on next</h3>
          {fixes.length === 0 ? (
            <p className="t-small muted mt-3">Every paper is averaging 50% or more. Push the weakest ones higher to build a safety margin{ranked[0] ? `, starting with ${ranked[0].cfg.name} (${fmtNum(ranked[0].avgPct as number, 0)}%)` : ''}.</p>
          ) : (
            <ul className="ma-fixes">
              {fixes.slice(0, 4).map((f) => (
                <li key={f.key} className={cn(`acc-${f.tone}`)}>
                  <span className="ma-fix-ic">{f.tone === 'bad' ? <LuCircleAlert /> : <LuTarget />}</span>
                  <div className="min-0"><div className="row g-2"><SubjectTag name={f.name} /><b className="ma-b truncate">{f.name}</b></div><p className="t-small muted">{f.text}</p></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="t-h2 ma-h">Paper by paper</h2>
      <div className="ma-grid stagger">
        {data.per.map((p) => {
          const meta = getSubjectMetadata(p.cfg.name);
          const g = p.avgPct === null ? null : gradeFor(p.avgPct, 100);
          const up = (p.delta ?? 0) > 0.5, down = (p.delta ?? 0) < -0.5;
          return (
            <Card key={p.cfg.id} className={cn('ma-paper', `acc-${meta.accent}`)} size="tight">
              <div className="row g-2"><SubjectTag name={p.cfg.name} /><span className="t-xs dim truncate grow">{p.cfg.name}</span></div>
              <div className="row between ma-paper-main">
                <div>
                  <div className="ma-score t-num" style={{ color: g ? `var(--c-${g.accent})` : 'var(--tx-3)' }}>{p.avgMarks === null ? '—' : fmtNum(p.avgMarks, 0)}<small>/{p.cfg.marks}</small></div>
                  <div className="t-xs dim">{p.count ? `${plural(p.count, 'test')} · avg ${fmtNum(p.avgPct as number, 0)}%` : 'No tests yet'}</div>
                </div>
                {p.pcts.length > 1 ? <div className="ma-mini" style={{ color: meta.color }}><Sparkline values={p.pcts.slice(-6)} height={34} min={0} max={100} /></div> : null}
              </div>
              <div className="row between ma-paper-foot">
                {g ? <Tag accent={g.accent}>{g.label}</Tag> : <Tag>Waiting</Tag>}
                {p.delta === null ? <span className="t-xs dim">Need 2 tests for a trend</span> : (
                  <span className={cn('ma-delta', up ? 'is-up' : down ? 'is-down' : '')}>{up ? <LuArrowUpRight /> : down ? <LuArrowDownRight /> : <LuMinus />}{up ? '+' : ''}{fmtNum(p.delta, 0)} pts</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
