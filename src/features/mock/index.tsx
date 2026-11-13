import { useEffect, useMemo, useState } from 'react';
import { LuAward, LuCheck, LuCircleAlert, LuClipboardCheck, LuMinus, LuPlus, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import './mock.css';
import { Button, Card, CardHead, Chip, EmptyState, Field, Input, PageHeader, Range, Ring, Segmented, SubjectTag, Tag, useToast } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { gradeFor, mockXP } from '../../lib/stats';
import { fmtDate } from '../../lib/date';
import { cn, fmtNum } from '../../lib/format';
import { sfx } from '../../lib/sfx';

const GRADE_ICON = { excellent: <LuCheck />, pass: <LuCheck />, borderline: <LuTriangleAlert />, fail: <LuCircleAlert /> } as const;

export default function MockTests() {
  const { allSubjectsInGroup, getSubjectMetadata } = useLevelConfig();
  const { mockScores, saveMockScore, deleteMockScore, restoreMockScore, today } = useStudy();
  const toast = useToast();

  const [subject, setSubject] = useState(allSubjectsInGroup[0]?.name ?? '');
  const [marks, setMarks] = useState(65);
  const [touched, setTouched] = useState(false);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<'new' | 'high'>('new');

  useEffect(() => {
    if (allSubjectsInGroup.length && !allSubjectsInGroup.some((s) => s.name === subject)) setSubject(allSubjectsInGroup[0].name);
  }, [allSubjectsInGroup, subject]);

  const cfg = allSubjectsInGroup.find((s) => s.name === subject);
  const max = cfg?.marks ?? 100;
  const grade = gradeFor(marks, max);
  const subjectMocks = useMemo(() => mockScores.filter((m) => m.subject === subject), [mockScores, subject]);
  const avg = subjectMocks.length ? subjectMocks.reduce((a, m) => a + m.marks, 0) / subjectMocks.length : 0;

  const setScore = (v: number) => { setTouched(true); setMarks(Math.max(0, Math.min(max, Math.round(v)))); };
  useEffect(() => { setMarks((m) => Math.min(m, max)); }, [max]);

  const save = () => {
    if (!subject) return;
    const entry = saveMockScore({ date, subject, marks, notes: notes.trim() });
    const g = gradeFor(marks, max);
    const xp = mockXP(g.pct);
    sfx.play(g.pct >= 50 ? 'success' : 'save');
    toast({
      message: `${marks}/${max} saved in ${getSubjectMetadata(subject).abbrev}`, sub: `${g.label} · +${xp} XP`, tone: g.pct >= 50 ? 'good' : 'warn',
      action: { label: 'Undo', onClick: () => deleteMockScore(entry.id) },
    });
    setNotes(''); setTouched(false);
  };

  const rows = useMemo(() => {
    const names = new Set(allSubjectsInGroup.map((s) => s.name.toLowerCase()));
    const list = mockScores.filter((m) => names.has(m.subject.toLowerCase()) && (filter === 'all' || m.subject === filter));
    return list.sort((a, b) => sort === 'new' ? b.date.localeCompare(a.date) || b.id.localeCompare(a.id) : (b.marks / (maxOf(b.subject)) - a.marks / (maxOf(a.subject))));
    function maxOf(n: string) { return allSubjectsInGroup.find((s) => s.name === n)?.marks || 100; }
  }, [mockScores, allSubjectsInGroup, filter, sort]);

  const countFor = (n: string) => mockScores.filter((m) => m.subject === n).length;

  return (
    <div className="page-enter">
      <PageHeader title="Log a mock" sub="Log every mock you sit. Each one earns XP, and a higher score earns more." />

      <div className="mk-grid">
        <Card size="roomy" className={cn('mk-entry', `acc-${grade.accent}`)} accent={grade.accent} glow>
          <CardHead title="New score" sub="Pick the paper, then set your marks." />

          <div className="chips mk-subjects" role="radiogroup" aria-label="Subject">
            {allSubjectsInGroup.map((s) => (
              <Chip key={s.id} accent={s.accent} dot selected={s.name === subject} onClick={() => { setSubject(s.name); }}>{s.abbrev}{countFor(s.name) ? <span className="mk-count">{countFor(s.name)}</span> : null}</Chip>
            ))}
          </div>
          <div className="row g-2 mk-subname"><SubjectTag name={subject} /><span className="t-small fw-6 truncate">{subject}</span>
            <span className="t-xs dim">{subjectMocks.length ? `${subjectMocks.length} ${subjectMocks.length === 1 ? 'test' : 'tests'} · avg ${fmtNum(avg, 0)}/${max}` : 'No tests yet'}</span></div>

          <div className="mk-dial" data-tour="mock-dial">
            <Ring value={max ? (marks / max) * 100 : 0} size={232} stroke={14} accent={grade.accent}>
              <div className="mk-dial-in">
                <div className="mk-num">
                  <input className="t-num" inputMode="numeric" aria-label={`Marks out of ${max}`} value={touched || marks ? String(marks) : ''}
                    onChange={(e) => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setScore(Number.isFinite(v) ? v : 0); }} onFocus={(e) => e.currentTarget.select()} />
                  <span>/{max}</span>
                </div>
                <div className="t-small dim">{fmtNum(grade.pct, 0)}%</div>
              </div>
            </Ring>
            <Tag accent={grade.accent} size="lg" key={grade.id}>{GRADE_ICON[grade.id]}{grade.label}</Tag>
            <p className="t-xs dim mk-hint">{`Worth +${mockXP(grade.pct)} XP. A higher score earns more.`}</p>
          </div>

          <div className="mk-tune">
            <button className="stepper-btn" aria-label="Minus 5 marks" onClick={() => setScore(marks - 5)}><LuMinus /></button>
            <Range value={marks} min={0} max={max} step={1} onChange={setScore} label="Marks" accent={grade.accent} />
            <button className="stepper-btn" aria-label="Plus 5 marks" onClick={() => setScore(marks + 5)}><LuPlus /></button>
          </div>
          <div className="chips mk-quick">
            {[40, 50, 60, 70, 80].map((p) => { const v = Math.round((max * p) / 100); return <Chip key={p} selected={marks === v} onClick={() => { setScore(v); }}>{p}%</Chip>; })}
          </div>

          <div className="grid cols-2 g-3 mk-fields">
            <Field label="Test date"><Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
            <Field label="Notes" right="optional"><Input value={notes} maxLength={160} placeholder="e.g. Ran out of time on Q5" onChange={(e) => setNotes(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} /></Field>
          </div>
          <Button variant="primary" size="lg" block onClick={save} disabled={!subject}><LuAward />Save score</Button>
        </Card>

        <Card size="flush" className="mk-ledger">
          <div className="mk-ledger-head">
            <div className="row between wrap g-3">
              <div>
                <h2 className="t-h2">Score history</h2>
                <p className="t-xs dim mt-1">{mockScores.length} {mockScores.length === 1 ? 'mock' : 'mocks'} recorded</p>
              </div>
              <Segmented label="Sort" value={sort} onChange={setSort} options={[{ value: 'new', label: 'Newest' }, { value: 'high', label: 'Highest' }]} />
            </div>
            <div className="chips chips--scroll no-scrollbar">
              <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
              {allSubjectsInGroup.filter((s) => countFor(s.name) > 0).map((s) => <Chip key={s.id} accent={s.accent} dot selected={filter === s.name} onClick={() => setFilter(filter === s.name ? 'all' : s.name)}>{s.abbrev}</Chip>)}
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={<LuClipboardCheck />} title={mockScores.length ? 'No mocks for this subject' : 'No mocks yet'}>
              {mockScores.length ? 'Pick another subject or clear the filter.' : 'Log your first score on the left. Trends and pass odds appear in Mock analysis.'}
            </EmptyState>
          ) : (
            <ul className="mk-list">
              {rows.map((m) => {
                const mx = allSubjectsInGroup.find((s) => s.name === m.subject)?.marks || 100;
                const g = gradeFor(m.marks, mx);
                const meta = getSubjectMetadata(m.subject);
                return (
                  <li key={m.id} className={cn('mk-row', `acc-${meta.accent}`)}>
                    <SubjectTag name={m.subject} />
                    <div className="grow min-0">
                      <div className="t-small fw-6 truncate">{m.subject}</div>
                      <div className="t-xs dim truncate">{fmtDate(m.date, { year: true })}{m.notes ? ` · ${m.notes}` : ''}</div>
                    </div>
                    <Tag accent={g.accent}>{GRADE_ICON[g.id]}{g.label}</Tag>
                    <div className="mk-score t-num">{m.marks}<small>/{mx}</small></div>
                    <button className="icon-btn mk-del" aria-label={`Delete ${m.subject} score of ${m.marks}`} onClick={() => {
                      const snap = m; deleteMockScore(m.id); sfx.play('delete');
                      toast({ message: 'Score deleted', sub: `${meta.abbrev} · ${m.marks}/${mx}`, tone: 'warn', action: { label: 'Undo', onClick: () => restoreMockScore(snap) } });
                    }}><LuTrash2 /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

