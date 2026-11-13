import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LuBadgeCheck, LuCheck, LuCircleAlert, LuCircleCheck, LuRotateCcw } from 'react-icons/lu';
import './manifest.css';
import { Button, Card, CardHead, CountUp, Input, PageHeader, Range, Tag, useConfirm } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { monthName, parseYmd } from '../../lib/date';
import { clamp, fmtNum, plural } from '../../lib/format';
import { AGGREGATE_PASS, PAPER_FLOOR, evaluateManifest, manifestPapers, marksForPercent, readManifest, writeManifest, type GroupEval, type Paper } from '../../lib/manifest';
import { quoteFor } from '../../lib/quotes';

function MarkInput({ value, max, onChange, low, label }: { value: number; max: number; onChange: (v: number) => void; low: boolean; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      type="number" inputMode="decimal" min={0} max={max} step={0.5} placeholder="0" aria-label={label} data-low={low}
      value={draft ?? (value === 0 ? '' : String(value))}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => { setDraft(e.target.value); const n = Number(e.target.value); if (Number.isFinite(n)) onChange(clamp(n, 0, max)); }}
      onBlur={() => setDraft(null)}
    />
  );
}

export default function Manifest() {
  const { level, selectedGroup, allSubjectsInGroup, levelLabel, groupLabel } = useLevelConfig();
  const { settings, mockScores, today, clearManifestationData } = useStudy();
  const confirm = useConfirm();

  const papers = useMemo(() => manifestPapers(level, allSubjectsInGroup), [level, allSubjectsInGroup]);
  const [marks, setMarks] = useState<Record<string, number>>(() => readManifest(level).marks);
  const [name, setName] = useState(() => readManifest(level).name);
  const [saved, setSaved] = useState(false);

  /* Autosave: a short debounce after every edit, and a final write if the page closes first. */
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef({ marks, name, level });
  latest.current = { marks, name, level };
  const flush = useCallback((silent = false) => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    writeManifest(latest.current.level, { marks: latest.current.marks, name: latest.current.name });
    if (!silent) { setSaved(true); window.setTimeout(() => setSaved(false), 1700); }
  }, []);
  const touch = useCallback(() => { dirty.current = true; window.clearTimeout(timer.current); timer.current = window.setTimeout(() => flush(), 400); }, [flush]);
  useEffect(() => () => flush(true), [flush]);

  const setMark = (p: Paper, v: number) => { setMarks((m) => ({ ...m, [p.name]: clamp(v, 0, p.marks) })); touch(); };
  const ev = useMemo(() => evaluateManifest(papers, marks, selectedGroup), [papers, marks, selectedGroup]);

  /* Average of the student's real mock results per paper, as a fraction of its max. */
  const mockFrac = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const p of papers) {
      const names = p.parts ?? [p.name];
      let got = 0, max = 0;
      for (const m of mockScores) if (names.includes(m.subject)) { got += m.marks; max += allSubjectsInGroup.find((s) => s.name === m.subject)?.marks || 100; }
      out[p.name] = max ? clamp(got / max, 0, 1) : null;
    }
    return out;
  }, [papers, mockScores, allSubjectsInGroup]);
  const hasMocks = Object.values(mockFrac).some((v) => v != null);

  const preset = async (pct: number) => {
    if (ev.hasData && !(await confirm({ title: `Fill every paper at ${pct}%?`, body: 'This replaces the marks you have entered.', confirmLabel: 'Fill marks' }))) return;
    setMarks(marksForPercent(papers, pct)); touch();
  };
  const reset = async () => {
    if (!(await confirm({ title: 'Reset the marksheet?', body: 'The marks and the name will be cleared.', confirmLabel: 'Reset', danger: true }))) return;
    window.clearTimeout(timer.current); dirty.current = false;
    clearManifestationData(); setMarks({}); setName('');
  };

  const exam = parseYmd(settings.targetExamDate);
  const quote = quoteFor(today);
  const pct = ev.grandMax ? (ev.grandTotal / ev.grandMax) * 100 : 0;
  const gaugeColor = !ev.hasData ? 'var(--a)' : ev.allPassed ? 'var(--c-mint)' : pct >= 40 ? 'var(--c-gold)' : 'var(--c-rose)';
  const R = 88, C = 2 * Math.PI * R;

  /* What stands between the student and a pass. */
  const needs: { ok: boolean; text: string }[] = [];
  const groups: [string, GroupEval][] = [[level === 'foundation' ? 'All papers' : 'Group I', ev.g1], ['Group II', ev.g2]];
  for (const [label, g] of groups) {
    if (!g.papers.length) continue;
    for (const p of g.failing) {
      const need = Math.ceil(p.marks * PAPER_FLOOR);
      needs.push({ ok: false, text: `${p.name} is on ${fmtNum(marks[p.name] || 0, 1)}. It needs ${need} to clear 40%, so add ${fmtNum(need - (marks[p.name] || 0), 1)}.` });
    }
    const line = Math.ceil(g.max * AGGREGATE_PASS);
    if (!g.aggregate && g.min40 && !ev.setOff) needs.push({ ok: false, text: `${label} is ${fmtNum(line - g.total, 1)} marks short of the ${line} aggregate it needs.` });
    else if (!g.aggregate && !g.min40) needs.push({ ok: false, text: `${label} also needs ${fmtNum(Math.max(0, line - g.total), 1)} more marks in total to reach ${line}.` });
  }
  if (ev.combined && !ev.allPassed && ev.g1.min40 && ev.g2.min40) {
    const line = Math.ceil(ev.grandMax * AGGREGATE_PASS);
    needs.push({ ok: false, text: `Appearing for both groups, the grand aggregate needs ${line}. You are ${fmtNum(line - ev.grandTotal, 1)} short.` });
  }
  if (ev.setOff) needs.push({ ok: true, text: 'One group is under 50% on its own. The set-off rule for both groups together carries it through.' });
  if (ev.allPassed) {
    const margin = ev.combined ? ev.grandTotal - Math.ceil(ev.grandMax * AGGREGATE_PASS) : Math.min(...[ev.g1, ev.g2].filter((g) => g.papers.length).map((g) => g.total - Math.ceil(g.max * AGGREGATE_PASS)));
    needs.push({ ok: true, text: `Every paper clears 40% and the aggregate clears 50%, with ${fmtNum(Math.max(0, margin), 1)} marks to spare.` });
  }
  if (!ev.hasData) needs.length = 0;

  const renderGroup = (title: string, g: GroupEval) => g.papers.length === 0 ? null : (
    <div className="mf-group" key={title}>
      <div className="mf-gh"><b>{title}</b><span className="t-xs dim">Pass: 40% in each paper and 50% overall</span></div>
      {g.papers.map((p) => {
        const v = marks[p.name] || 0;
        const mf = mockFrac[p.name];
        return (
          <div className="mf-paper" key={p.id}>
            <div className="mf-pname">
              <b>{p.name}</b>
              <span>Paper {p.paperNumber} · pass mark {Math.ceil(p.marks * PAPER_FLOOR)}</span>
              {mf != null ? <span className="mf-mockline">Your mock average: {fmtNum(mf * p.marks, 0)}</span> : null}
            </div>
            <div className="mf-slider" style={{ ['--pass' as string]: PAPER_FLOOR, ...(mf != null ? { ['--m' as string]: mf } : null) } as CSSProperties}>
              <Range value={v} min={0} max={p.marks} step={1} accent={p.accent} label={`${p.name} marks`} onChange={(n) => setMark(p, n)} />
              <i className="mf-tick" aria-hidden />
              {mf != null ? <i className="mf-mock" aria-hidden /> : null}
            </div>
            <div className="mf-score">
              <MarkInput value={v} max={p.marks} label={`${p.name}, marks out of ${p.marks}`} low={ev.hasData && v < p.marks * PAPER_FLOOR - 1e-9} onChange={(n) => setMark(p, n)} />
              <small>/ {p.marks}</small>
            </div>
          </div>
        );
      })}
      <div className="mf-total">
        <span className="mf-sum">Total<b className="t-num">{fmtNum(g.total, 1)}</b>/ {g.max} <span className="dim">({g.max ? fmtNum((g.total / g.max) * 100, 0) : 0}%)</span></span>
        {g.passed ? <span className="mf-stamp is-pass"><LuBadgeCheck aria-hidden />Successful</span> : <span className="mf-stamp is-fail">Not passing yet</span>}
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader title="Target marks" sub="Write down the marks you are going to score. See what it takes to pass." actions={<Button variant="ghost" size="sm" onClick={reset}><LuRotateCcw aria-hidden /> Reset</Button>} />
      <div className="mf-grid">
        <Card size="flush" className="mf-sheet" style={{ position: 'relative' }}>
          <div className="mf-sheet-head">
            <span className="mf-saved" data-on={saved} role="status"><LuCheck aria-hidden />Saved</span>
            <div className="t-xs dim">{levelLabel} examination · {monthName(exam.getMonth())} {exam.getFullYear()}</div>
            <div className="mf-title">Manifestation marksheet</div>
            <Input className="mf-name" value={name} maxLength={40} placeholder={settings.displayName || 'Candidate name'} aria-label="Candidate name" onChange={(e) => { setName(e.target.value); touch(); }} />
            <div className="mf-meta">{groupLabel} · {plural(papers.length, 'paper')} · {ev.grandMax} marks in all</div>
          </div>
          {groups.map(([label, g]) => renderGroup(label, g))}
          {ev.combined ? (
            <div className="mf-grand">
              <span className="mf-sum">Grand aggregate<b className="t-num">{fmtNum(ev.grandTotal, 1)}</b>/ {ev.grandMax} <span className="dim">({fmtNum(pct, 0)}%)</span></span>
              <Tag accent="brand">Set-off rule: 40% per paper, 50% overall</Tag>
            </div>
          ) : null}
        </Card>

        <div className="mf-side">
          <Card className="mf-quote" size="roomy"><p className="t-quote">“{quote.text}”</p><span>{quote.by}</span></Card>

          <Card>
            <CardHead title="Where this lands" sub={ev.hasData ? (ev.allPassed ? 'This marksheet passes.' : 'Not passing yet.') : 'Enter marks to see the result.'} />
            <div className="mf-gauge" style={{ ['--gc' as string]: gaugeColor } as CSSProperties}>
              <svg viewBox="0 0 212 212" aria-hidden>
                <circle cx="106" cy="106" r={R} className="mf-g-bg" />
                <circle cx="106" cy="106" r={R} className="mf-g-fg" transform="rotate(-90 106 106)" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(pct, 100) / 100)} />
                <line x1="106" y1={106 + R - 11} x2="106" y2={106 + R + 11} className="mf-g-tick" />
              </svg>
              <div className="mf-gauge-in"><b className="t-num"><CountUp value={pct} suffix="%" /></b><span>{fmtNum(ev.grandTotal, 1)} of {ev.grandMax}</span></div>
            </div>
            <div className="t-xs dim" style={{ textAlign: 'center', marginBottom: 16 }}>The tick at the bottom marks the 50% aggregate.</div>
            {needs.length ? (
              <ul className="mf-needs" aria-live="polite">
                {needs.map((n, i) => <li key={i} className={n.ok ? 'ok' : 'no'}>{n.ok ? <LuCircleCheck aria-hidden /> : <LuCircleAlert aria-hidden />}<span>{n.text}</span></li>)}
              </ul>
            ) : <p className="t-small dim">Move a slider or type a mark. Anything under the white tick on a paper is below the 40% line.</p>}
            <div className="mf-legend">
              <span><i className="l-tick" />40% pass mark</span>
              {hasMocks ? <span><i className="l-mock" />Your mock average</span> : null}
            </div>
          </Card>

          <Card>
            <CardHead title="Quick fill" sub="Start from a level, then adjust paper by paper." />
            <div className="mf-presets">
              {[{ p: 50, t: 'Clear it' }, { p: 60, t: 'Comfortable' }, { p: 70, t: 'Distinction' }].map((x) => (
                <button key={x.p} type="button" className="mf-preset" onClick={() => preset(x.p)}><b>{x.p}%</b>{x.t}</button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
