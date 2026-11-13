import { useMemo, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheck, LuGraduationCap, LuUser } from 'react-icons/lu';
import './onboarding.css';
import { Button, Chip, Field, Input, Range, Segmented, Tag } from '../../components/ui';
import { RadarDial, angleFor, type Blip } from '../../components/RadarDial';
import { Logo } from '../../components/layout/Logo';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { CURRICULUM, LEVELS, subjectsInGroup } from '../../config/curriculum';
import { addDays, fmtDate, todayStr } from '../../lib/date';
import { clamp, cn, fmtNum } from '../../lib/format';
import { sfx } from '../../lib/sfx';
import type { GroupId, Level } from '../../types';

type Step = 'level' | 'subjects' | 'you' | 'head-start';

/** Next occurrences of the usual attempt months, as quick picks for the exam date. */
function examPresets() {
  const now = new Date();
  const out: { label: string; date: string }[] = [];
  for (const m of [0, 4, 8]) {
    let y = now.getFullYear();
    if (new Date(y, m, 1).getTime() < now.getTime()) y += 1;
    const d = new Date(y, m, 1);
    out.push({ label: d.toLocaleString('en', { month: 'short', year: 'numeric' }), date: `${y}-${String(m + 1).padStart(2, '0')}-01` });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function goalLabel(h: number) {
  if (h <= 5) return 'Steady pace';
  if (h <= 8) return 'Focused';
  if (h <= 10) return 'Serious';
  return 'Beast mode';
}

export default function Onboarding() {
  const { hasLevelSelected, level: currentLevel, completeSetup } = useLevelConfig();
  const { settings, updateSettings } = useStudy();
  const steps: Step[] = hasLevelSelected ? ['you', 'head-start'] : ['level', 'subjects', 'you', 'head-start'];
  const [i, setI] = useState(0);
  const step = steps[i];

  const [level, setLevel] = useState<Level>(currentLevel);
  const [group, setGroup] = useState<GroupId>('both');
  const [active, setActive] = useState<string[]>(() => CURRICULUM[currentLevel].map((s) => s.name));
  const [name, setName] = useState(settings.displayName);
  const [examDate, setExamDate] = useState(settings.targetExamDate || addDays(todayStr(), 120));
  const [goal, setGoal] = useState(settings.dailyGoalHours || 8);
  const [past, setPast] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const presets = useMemo(examPresets, []);

  const inGroup = subjectsInGroup(level, group);
  const chosen = inGroup.filter((s) => active.includes(s.name));
  const blips: Blip[] = (hasLevelSelected ? subjectsInGroup(currentLevel, 'both') : chosen).map((s, k) => ({ id: s.id, angle: angleFor(s.name), radius: 0.3 + ((k * 37) % 60) / 100, accent: s.accent }));

  const pickLevel = (l: Level) => { setLevel(l); setGroup('both'); setActive(CURRICULUM[l].map((s) => s.name)); };
  const pickGroup = (g: GroupId) => { setGroup(g); setActive(subjectsInGroup(level, g).map((s) => s.name)); };
  const toggleSubject = (n: string) => { setActive((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n])); };

  const next = () => {
    setError('');
    if (step === 'subjects' && active.length === 0) return setError('Choose at least one paper to track.');
    if (step === 'you') {
      if (!name.trim()) return setError('Add your name so the app can greet you.');
      if (!examDate) return setError('Pick your exam date for the countdown.');
    }
    setI((v) => Math.min(steps.length - 1, v + 1));
  };
  const back = () => { setError(''); setI((v) => Math.max(0, v - 1)); };

  const finish = () => {
    const pastHours: Record<string, number> = {};
    for (const [k, v] of Object.entries(past)) { const n = parseFloat(v); if (n > 0) pastHours[k] = clamp(n, 0, 2000); }
    updateSettings({ onboardingCompleted: true, displayName: name.trim(), targetExamDate: examDate, dailyGoalHours: goal, pastHours: { ...settings.pastHours, ...pastHours } });
    sfx.play('success');
    // Persist the level choice last: it re-keys the data layer, which then reads the settings saved above.
    completeSetup({ level: hasLevelSelected ? currentLevel : level, group: hasLevelSelected ? 'both' : group, activeSubjects: hasLevelSelected ? CURRICULUM[currentLevel].map((s) => s.name) : active });
  };

  const trackSubjects = hasLevelSelected ? subjectsInGroup(currentLevel, 'both') : chosen;
  const last = i === steps.length - 1;
  const lvlInfo = LEVELS.find((l) => l.id === (hasLevelSelected ? currentLevel : level))!;

  return (
    <div className="ob">
      <aside className="ob-side">
        <div className="row g-3"><Logo size={44} /><div><div className="brand-name">Study Radar</div><div className="brand-sub">CA study tracker</div></div></div>
        <div className="ob-radar"><RadarDial progress={step === 'head-start' ? 0.72 : step === 'you' ? 0.55 : 0.3} size={280} blips={blips} /></div>
        <div className="col g-2">
          <h1 className="t-display ob-title">Set up your study radar</h1>
          <p className="muted">A minute of setup gives you a live countdown, streaks that count, and a plan that adapts to your level.</p>
        </div>
      </aside>

      <section className="ob-main">
        <div className="ob-steps" aria-label={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((s, k) => <span key={s} className="ob-step" data-state={k < i ? 'done' : k === i ? 'now' : 'todo'} />)}
        </div>

        <div className="ob-panel" key={step}>
          {step === 'level' && (
            <>
              <h2 className="t-h1">Which level are you preparing for?</h2>
              <p className="muted mt-2">You can switch levels any time in Settings — each level keeps its own data.</p>
              <div className="ob-levels" role="radiogroup" aria-label="Exam level">
                {LEVELS.map((l) => (
                  <button key={l.id} type="button" role="radio" aria-checked={level === l.id} className="ob-level" onClick={() => pickLevel(l.id)}>
                    <span className="stat-icon"><LuGraduationCap /></span>
                    <span className="grow">
                      <span className="t-h2" style={{ display: 'block' }}>{l.label}</span>
                      <span className="t-small dim">{l.blurb}</span>
                    </span>
                    <span className="ob-check">{level === l.id ? <LuCheck /> : null}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'subjects' && (
            <>
              <h2 className="t-h1">Choose your papers</h2>
              <p className="muted mt-2">{level === 'foundation' ? 'Foundation has four papers — all included.' : 'Pick a group, then switch off any paper you are not attempting.'}</p>
              {level !== 'foundation' && (
                <div className="mt-4">
                  <Segmented value={group} onChange={pickGroup} label="Group"
                    options={[{ value: 'both', label: 'Both groups' }, { value: 'group1', label: 'Group 1' }, { value: 'group2', label: 'Group 2' }]} />
                </div>
              )}
              <div className="ob-subjects">
                {inGroup.map((s) => {
                  const on = active.includes(s.name);
                  return (
                    <button key={s.id} type="button" role="checkbox" aria-checked={on} className={cn('ob-subject', `acc-${s.accent}`)} onClick={() => toggleSubject(s.name)}>
                      <span className="abbr">{s.abbrev}</span>
                      <span className="grow min-0 text-left"><span className="t-small fw-6 clamp-2" style={{ display: 'block' }}>{s.name}</span><span className="t-xs dim">{s.marks} marks</span></span>
                      <span className="ob-check">{on ? <LuCheck /> : null}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 'you' && (
            <>
              <h2 className="t-h1">About you</h2>
              <p className="muted mt-2">Your name, exam date and daily target drive the greeting, countdown and streaks.</p>
              <div className="col g-5 mt-5">
                <Field label="Your name">
                  <Input icon={<LuUser />} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priyesh Sharma" autoComplete="given-name" maxLength={40} data-autofocus />
                </Field>
                <Field label="Exam date" hint={`Countdown runs to 2 PM on ${fmtDate(examDate, { weekday: true, year: true })}. Use the date of your first paper.`}>
                  <Input type="date" value={examDate} min={todayStr()} onChange={(e) => setExamDate(e.target.value)} />
                </Field>
                <div className="chips -mt">
                  {presets.map((p) => <Chip key={p.date} selected={examDate === p.date} onClick={() => setExamDate(p.date)}>{p.label}</Chip>)}
                </div>
                <div className="field">
                  <span className="field-label"><span>Daily study goal</span><span className="row g-2"><Tag accent="brand">{goalLabel(goal)}</Tag><strong className="t-num" style={{ fontSize: 22 }}>{fmtNum(goal)}h</strong></span></span>
                  <Range value={goal} min={2} max={16} step={0.5} onChange={(v) => { setGoal(v); }} label="Daily study goal in hours" />
                  <div className="row between t-xs faint"><span>2h</span><span>16h</span></div>
                </div>
              </div>
            </>
          )}

          {step === 'head-start' && (
            <>
              <h2 className="t-h1">Already studied some?</h2>
              <p className="muted mt-2">Add hours you completed before today. They count towards totals, XP and subject balance. Skip this if you are starting fresh.</p>
              <div className="ob-past">
                {trackSubjects.map((s) => (
                  <label key={s.id} className={cn('ob-past-row', `acc-${s.accent}`)}>
                    <span className="abbr">{s.abbrev}</span>
                    <span className="grow min-0 t-small fw-6 clamp-2">{s.name}</span>
                    <span className="ob-hrs"><input className="input input--sm input--center" inputMode="decimal" type="number" min="0" step="0.5" placeholder="0" value={past[s.name] ?? ''} onChange={(e) => setPast((p) => ({ ...p, [s.name]: e.target.value }))} aria-label={`Hours already studied for ${s.name}`} /><span className="t-xs dim">h</span></span>
                  </label>
                ))}
              </div>
            </>
          )}

          {error ? <div className="field-error mt-4" role="alert">{error}</div> : null}
        </div>

        <div className="ob-actions">
          {i > 0 ? <Button variant="ghost" onClick={back}><LuArrowLeft />Back</Button> : <span />}
          {last ? (
            <div className="row g-3">
              <Button variant="ghost" onClick={() => { setPast({}); finish(); }}>Skip</Button>
              <Button variant="primary" size="lg" onClick={finish}>Start tracking<LuArrowRight /></Button>
            </div>
          ) : <Button variant="primary" size="lg" onClick={next}>Continue<LuArrowRight /></Button>}
        </div>
        <div className="t-xs faint text-center mt-4">{lvlInfo.label} · everything stays on this device</div>
      </section>
    </div>
  );
}
