import { useMemo, useState, type CSSProperties } from 'react';
import { LuChevronDown, LuCircleAlert, LuCircleCheck, LuLibrary, LuScale, LuTrendingUp } from 'react-icons/lu';
import './subjects.css';
import { Card, EmptyState, PageHeader, Segmented, Sparkline, SubjectTag, Tag } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { addDays, diffDays, fmtDate, startOfWeek } from '../../lib/date';
import { cn, fmtHM, fmtNum, plural } from '../../lib/format';
import { SLOTS, getSlot } from '../../lib/log';

type Sort = 'hours' | 'attention' | 'recent';
const WEEKS = 12;

export default function Subjects() {
  const { allSubjectsInGroup, getSubjectMetadata, levelLabel } = useLevelConfig();
  const { studyLogs, mockScores, stats, today } = useStudy();
  const [sort, setSort] = useState<Sort>('hours');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const total = Object.entries(stats.subjectHours).filter(([k]) => allSubjectsInGroup.some((s) => s.name === k)).reduce((a, [, h]) => a + h, 0) || 1;
    const fair = 100 / Math.max(allSubjectsInGroup.length, 1);
    const w0 = addDays(startOfWeek(today), -(WEEKS - 1) * 7);
    return allSubjectsInGroup.map((cfg) => {
      const name = cfg.name;
      const hours = stats.subjectHours[name] || 0;
      const share = (hours / total) * 100;
      const sessions = stats.subjectSessionCount[name] || 0;
      let last = '';
      const topics = new Map<string, { n: number; h: number; last: string }>();
      const weekly = Array(WEEKS).fill(0) as number[];
      for (const l of studyLogs) {
        for (const k of SLOTS) {
          const x = getSlot(l, k);
          if (x.subject !== name || x.hours <= 0) continue;
          if (l.date > last) last = l.date;
          const wi = Math.floor(diffDays(w0, startOfWeek(l.date)) / 7);
          if (wi >= 0 && wi < WEEKS) weekly[wi] += x.hours;
          for (const t of x.topic.split(/;\s*/).map((v) => v.trim()).filter(Boolean)) {
            const c = topics.get(t) ?? { n: 0, h: 0, last: '' };
            c.n++; c.h += x.hours; if (l.date > c.last) c.last = l.date; topics.set(t, c);
          }
        }
      }
      const mm = mockScores.filter((m) => m.subject === name);
      const mockAvg = mm.length ? (mm.reduce((a, m) => a + m.marks, 0) / mm.length / (cfg.marks || 100)) * 100 : null;
      const gapDays = last ? diffDays(last, today) : null;
      const status = share > fair + 5 ? { id: 'over', label: 'Heavy focus', accent: 'gold' as const, icon: <LuTrendingUp /> }
        : share >= fair - 5 ? { id: 'ok', label: 'Well balanced', accent: 'good' as const, icon: <LuCircleCheck /> }
        : { id: 'low', label: 'Needs attention', accent: 'bad' as const, icon: <LuCircleAlert /> };
      return { cfg, name, hours, share, fair, sessions, avg: sessions ? hours / sessions : 0, last, gapDays, topics: [...topics.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last)), weekly, mockAvg, status, meta: getSubjectMetadata(name) };
    });
  }, [allSubjectsInGroup, stats, studyLogs, mockScores, today, getSubjectMetadata]);

  const sorted = useMemo(() => {
    const r = [...rows];
    if (sort === 'hours') r.sort((a, b) => b.hours - a.hours);
    else if (sort === 'attention') r.sort((a, b) => a.share - b.share);
    else r.sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    return r;
  }, [rows, sort]);

  const anyData = rows.some((r) => r.hours > 0);
  const stale = [...rows].filter((r) => r.gapDays !== null && r.gapDays >= 5).sort((a, b) => (b.gapDays ?? 0) - (a.gapDays ?? 0))[0];
  const lowest = [...rows].sort((a, b) => a.share - b.share)[0];

  return (
    <div className="page-enter">
      <PageHeader title="Papers" sub={`${levelLabel}: how your time is spread across papers.`}
        actions={<Segmented label="Sort subjects" value={sort} onChange={setSort} options={[{ value: 'hours', label: 'Most time' }, { value: 'attention', label: 'Needs attention' }, { value: 'recent', label: 'Recent' }]} />} />

      {!anyData ? (
        <Card><EmptyState icon={<LuLibrary />} title="No subject data yet">Log study sessions and each paper's hours, sessions and chapters will show up here.</EmptyState></Card>
      ) : (
        <>
          <Card className="sb-insight acc-brand" tinted>
            <div className="sb-insight-icon"><LuScale /></div>
            <div className="grow min-0">
              {stale
                ? <><b>{stale.name}</b> hasn't been studied for {plural(stale.gapDays ?? 0, 'day')}. A short session this week keeps it warm.</>
                : lowest && lowest.share < lowest.fair - 5
                  ? <><b>{lowest.name}</b> has {fmtNum(lowest.share, 0)}% of your time against an even split of {fmtNum(lowest.fair, 0)}%. Worth giving it more hours.</>
                  : <>Your time is evenly spread. Keep every paper moving to stay balanced.</>}
            </div>
          </Card>

          <div className="sb-grid stagger">
            {sorted.map((r) => {
              const isOpen = open === r.name;
              const trend = r.weekly;
              return (
                <Card key={r.name} className={cn('sb-card', `acc-${r.meta.accent}`)} accent={r.meta.accent} tinted={isOpen}>
                  <div className="row g-3">
                    <SubjectTag name={r.name} />
                    <h3 className="sb-name grow min-0 truncate">{r.name}</h3>
                    <Tag accent={r.status.accent}>{r.status.icon}{r.status.label}</Tag>
                  </div>

                  <div className="sb-hero">
                    <div><div className="sb-hours t-num">{fmtNum(r.hours, 1)}<small>h</small></div><div className="t-xs dim">{fmtNum(r.share, 0)}% of your time</div></div>
                    <div className="sb-spark" aria-label="Weekly hours for the last 12 weeks" role="img"><Sparkline values={trend} height={46} /><span className="t-xs dim">Last 12 weeks</span></div>
                  </div>

                  <div className="sb-share" aria-hidden style={{ ['--v' as string]: Math.min(1, r.share / Math.max(r.fair * 2, 1)), ['--m' as string]: 0.5 } as CSSProperties}>
                    <i /><b title={`Even split: ${fmtNum(r.fair, 0)}%`} />
                  </div>
                  <div className="t-xs dim sb-share-note">Even split would be {fmtNum(r.fair, 0)}%</div>

                  <dl className="sb-facts">
                    <div><dt>Sessions</dt><dd className="t-num">{r.sessions}</dd></div>
                    <div><dt>Avg session</dt><dd className="t-num">{r.sessions ? fmtHM(r.avg) : '—'}</dd></div>
                    <div><dt>Last studied</dt><dd>{r.last ? (r.gapDays === 0 ? 'Today' : r.gapDays === 1 ? 'Yesterday' : `${r.gapDays} days ago`) : 'Never'}</dd></div>
                    <div><dt>Mock average</dt><dd className="t-num">{r.mockAvg == null ? '—' : `${fmtNum(r.mockAvg, 0)}%`}</dd></div>
                  </dl>

                  <button className="sb-toggle" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : r.name); }}>
                    <span>Chapters covered ({r.topics.length})</span><LuChevronDown />
                  </button>
                  {isOpen ? (
                    <ul className="sb-topics">
                      {r.topics.length === 0 ? <li className="dim t-small">No chapters noted yet. Add a topic when you log.</li> : r.topics.map(([t, c]) => (
                        <li key={t}><span className="grow min-0 truncate">{t}</span><span className="t-xs dim">{c.n}× · {fmtHM(c.h)} · {fmtDate(c.last)}</span></li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
