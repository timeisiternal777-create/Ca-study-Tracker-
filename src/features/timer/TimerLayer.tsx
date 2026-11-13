import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuArrowLeftRight, LuMinimize2, LuPause, LuPlay, LuSquare } from 'react-icons/lu';
import './timer.css';
import { Button, Chip, Field, Input, Modal, ProgressBar } from '../../components/ui';
import { levelLabel } from '../../config/curriculum';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { useFocusTrap, useLockScroll } from '../../hooks/useDialog';
import { fmtHM } from '../../lib/format';
import { navigateTo } from '../../lib/nav';
import { useElapsedSeconds } from '../../lib/ticker';
import { TOPIC_MAX, fmtMinutes, fmtTime, milestoneFor } from '../../lib/timer';
import { BLOCK_SECONDS, ClockDigits, TimerDial, spoken } from './Clock';
import { useRecentTopics, useTodayHours } from './hooks';

/** Everything the timer puts on top of the app: the subject sheet, focus mode and the questions. (The small clock lives in the top bar.) */
export function TimerLayer() {
  return (<><StartSheet /><TimerFocus /><TimerPrompts /></>);
}

// ───────────────────────── choose a subject ─────────────────────────

function StartSheet() {
  const t = useTimer();
  const { subjects, allSubjectsInGroup, getSubjectMetadata } = useLevelConfig();
  const open = t.startSheet !== null;
  const switching = t.active;
  const list = (subjects.length ? subjects : allSubjectsInGroup).filter((s) => !(switching && s.name === t.state.subject));
  const suggestion = t.startSheet?.subject;
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  useEffect(() => {
    if (!open) return;
    const last = t.sessions[0]?.subject;
    setName(list.find((s) => s.name === suggestion)?.name ?? list.find((s) => s.name === last)?.name ?? '');
    setTopic('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const recent = useRecentTopics(name);
  const hours = useTodayHours(name);
  const go = () => {
    if (!name) return;
    if (switching) t.switchTo(name, topic); else t.start(name, topic);
    t.closeStart();
  };
  return (
    <Modal
      open={open} onClose={t.closeStart} size="sm"
      title={switching ? 'Switch subject' : 'Start studying'}
      description={switching ? `${t.state.subject} is saved to today's log and the next subject starts right away.` : 'Pick a subject. The clock starts when you press Start.'}
      footer={<>
        <Button variant="ghost" onClick={t.closeStart}>Cancel</Button>
        <Button variant="primary" disabled={!name} onClick={go}><LuPlay />{switching ? 'Save and switch' : 'Start'}</Button>
      </>}
    >
      <div className="col g-5">
        <div className="field">
          <span className="field-label">Subject</span>
          <div className="tsheet-chips" role="radiogroup" aria-label="Subject">
            {list.map((s) => <Chip key={s.id} selected={s.name === name} accent={s.accent} dot role="radio" aria-checked={s.name === name} onClick={() => setName(s.name)}>{s.abbrev}</Chip>)}
          </div>
          <div className="tsheet-name">{name ? <>{name}{hours > 0 ? <span className="faint"> · {fmtHM(hours)} already today, this adds to it</span> : null}</> : 'Choose one to continue'}</div>
        </div>
        <Field label="Topic" right="optional">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={TOPIC_MAX} placeholder="e.g. Consolidation, step acquisition" onKeyDown={(e) => { if (e.key === 'Enter') go(); }} />
        </Field>
        {recent.length > 0 ? (
          <div className="col g-2" style={{ marginTop: -8 }}>
            <span className="t-xs dim">Recent topics</span>
            <div className="chips">{recent.map((x) => <Chip key={x} onClick={() => setTopic(x)}>{x}</Chip>)}</div>
          </div>
        ) : null}
        {name ? <span className={`sr-only acc-${getSubjectMetadata(name).accent}`}>{name} selected</span> : null}
      </div>
    </Modal>
  );
}

// ───────────────────────── the clock in the top bar ─────────────────────────

/** A small live clock in the top bar while a session is on: always in view, never on top of anything. */
export function TimerPill() {
  const t = useTimer();
  const secs = useElapsedSeconds();
  const { getSubjectMetadata } = useLevelConfig();
  if (!t.active || t.focusOpen) return null;
  const st = t.state;
  const meta = getSubjectMetadata(st.subject);
  const open = t.here ? t.openFocus : () => navigateTo('DASHBOARD');
  return (
    <div className={`tpill acc-${t.here ? meta.accent : 'warn'}`} data-status={st.status} role="group" aria-label="Study timer">
      <button type="button" className="tpill-main" onClick={open} aria-label={`${t.here ? 'Open the timer' : 'Timer'}. ${st.subject}, ${spoken(secs)}${t.paused ? ', paused' : ''}`}>
        <span className="live-dot" aria-hidden />
        <span className="tpill-abbr">{t.here ? meta.abbrev : 'Other'}</span>
        <ClockDigits seconds={secs} live={t.running} />
      </button>
      <button type="button" onClick={t.running ? t.pause : t.resume} aria-label={t.running ? 'Pause the timer' : 'Resume the timer'}>{t.running ? <LuPause /> : <LuPlay />}</button>
      <button type="button" className="tpill-stop" onClick={t.stop} aria-label="Stop and save"><LuSquare /></button>
    </div>
  );
}

// ───────────────────────── focus mode ─────────────────────────

function TimerFocus() {
  const t = useTimer();
  const want = t.focusOpen && t.active;
  const [mounted, setMounted] = useState(want);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (want) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const id = window.setTimeout(() => { setMounted(false); setClosing(false); }, 250);
    return () => window.clearTimeout(id);
  }, [want, mounted]);
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-focus', '');
    return () => document.documentElement.removeAttribute('data-focus');
  }, [mounted]);
  if (!mounted) return null;
  return createPortal(<FocusView closing={closing} />, document.body);
}

function FocusView({ closing }: { closing: boolean }) {
  const t = useTimer();
  const secs = useElapsedSeconds();
  const ref = useRef<HTMLDivElement>(null);
  const { getSubjectMetadata } = useLevelConfig();
  const { stats, settings, today, studyLogs } = useStudy();
  const st = t.state;
  const meta = getSubjectMetadata(st.subject);
  const [topic, setTopic] = useState(st.topic);
  useEffect(() => { setTopic(st.topic); }, [st.id, st.topic]);
  useLockScroll(true);
  useFocusTrap(ref, !closing, t.closeFocus);
  // Space pauses and resumes, unless you are typing or pressing a button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code !== 'Space' || e.repeat || !el || el.closest('input, textarea, button, select, [contenteditable]')) return;
      e.preventDefault();
      if (t.running) t.pause(); else t.resume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t.running, t.pause, t.resume]);
  const goal = settings.dailyGoalHours;
  const todayH = stats.todayHours + t.liveMsOn(today) / 3_600_000;
  const sessionsToday = t.sessions.filter((s) => s.parts.some((p) => p.date === today)).length;
  const block = Math.floor(secs / BLOCK_SECONDS) + 1;
  const saveTopic = () => { if (topic !== st.topic) t.setTopic(topic); };
  void studyLogs;
  return (
    <div ref={ref} className={`tfocus acc-${meta.accent}`} data-status={st.status} data-closing={closing || undefined} role="dialog" aria-modal="true" aria-label="Focus mode" tabIndex={-1}>
      <div className="tfocus-bg" aria-hidden />
      <div className="tfocus-top">
        <span className="t-small">{levelLabel(st.level)} · started {fmtTime(st.startedAt)}</span>
        <Button variant="ghost" onClick={t.closeFocus} aria-label="Leave focus mode (the timer keeps running)"><LuMinimize2 />Minimise</Button>
      </div>
      <div className="tfocus-mid" data-autofocus tabIndex={-1}>
        <TimerDial seconds={secs} status={st.status} accent={meta.accent} top={meta.abbrev} bottom={t.paused ? 'Paused' : `Block ${block}`}>
          <ClockDigits seconds={secs} live={t.running} />
        </TimerDial>
        <div className="col g-2" style={{ alignItems: 'center' }}>
          <h2 className="tfocus-name">{st.subject}</h2>
          <p className="tfocus-cap">{t.paused ? 'Paused. This time is not counted.' : milestoneFor(secs * 1000).text}</p>
        </div>
        <div className="tfocus-topic">
          <Input value={topic} center onChange={(e) => setTopic(e.target.value)} onBlur={saveTopic} onKeyDown={(e) => { if (e.key === 'Enter') { saveTopic(); (e.target as HTMLInputElement).blur(); } }} maxLength={TOPIC_MAX} placeholder="Topic (optional)" aria-label="Topic" />
        </div>
        <div className="tfocus-ctl">
          {t.running
            ? <Button size="lg" variant="soft" accent={meta.accent} onClick={t.pause}><LuPause />Pause</Button>
            : <Button size="lg" variant="primary" onClick={t.resume}><LuPlay />Resume</Button>}
          <Button size="lg" variant="primary" onClick={() => { saveTopic(); t.closeFocus(); t.stop(); }}><LuSquare />Stop and save</Button>
          <Button size="lg" onClick={() => t.openStart()}><LuArrowLeftRight />Switch</Button>
        </div>
      </div>
      <div className="tfocus-foot">
        <div><span>Today, with this session</span><b className="tnum">{fmtHM(todayH)} of {fmtHM(goal)}</b></div>
        <ProgressBar value={goal > 0 ? (todayH / goal) * 100 : 0} size="thin" accent={meta.accent} live={todayH > 0 && todayH < goal} />
        <div><span>{sessionsToday} saved {sessionsToday === 1 ? 'session' : 'sessions'} today</span><span>Space pauses · Esc leaves</span></div>
      </div>
    </div>
  );
}

// ───────────────────────── questions ─────────────────────────

function TimerPrompts() {
  const t = useTimer();
  const p = t.prompt;
  const st = t.state;
  const [shown, setShown] = useState(p);
  useEffect(() => { if (p) setShown(p); }, [p]);
  const open = p !== null;
  const q = p ?? shown;
  if (!q) return null;
  const subject = st.subject || 'your session';

  if (q.kind === 'away') {
    const all = fmtMinutes(q.info.all / 60000), until = fmtMinutes(q.info.untilSeen / 60000);
    return (
      <Modal open={open} onClose={() => t.answer('keep')} dismissible={false} hideClose size="sm" title="Welcome back"
        description={`Your ${subject} timer kept running while the app was out of sight.`}>
        <div className="col g-4">
          <div className="tprompt-nums">
            <div><b>{fmtMinutes(q.info.gone / 60000)}</b><span>away since {fmtTime(q.seen)}</span></div>
            <div><b>{all}</b><span>on the clock now</span></div>
          </div>
          <div className="tprompt-actions">
            <Button variant="primary" onClick={() => t.answer('keep')}>I was studying: keep all {all}</Button>
            <Button onClick={() => t.answer('skip')}>I was not: take that time off ({until} so far)</Button>
            <Button onClick={() => t.answer('save')}>Stop and save {until}</Button>
            <Button variant="danger" onClick={() => t.answer('discard')}>Discard this session</Button>
          </div>
        </div>
      </Modal>
    );
  }
  if (q.kind === 'stale') {
    return (
      <Modal open={open} onClose={t.closePrompt} size="sm" title="Finish this session?" description={`${subject} has been paused since ${fmtTime(q.since)}.`}
        footer={<>
          <Button variant="danger" onClick={() => t.answer('discard')}>Discard</Button>
          <Button onClick={() => t.answer('resume')}><LuPlay />Resume</Button>
          <Button variant="primary" onClick={() => t.answer('save')}>Save {fmtMinutes(q.ms / 60000)}</Button>
        </>}>
        <p className="muted">{fmtMinutes(q.ms / 60000)} was timed before you paused. Paused time is never counted.</p>
      </Modal>
    );
  }
  if (q.kind === 'long') {
    return (
      <Modal open={open} onClose={t.closePrompt} size="sm" title="That was a long one" description={`${fmtMinutes(q.ms / 60000)} on the clock. The timer is paused until you decide.`}
        footer={<>
          <Button variant="danger" onClick={() => t.answer('discard')}>Discard</Button>
          <Button onClick={() => t.answer('keep')}><LuPlay />Keep timing</Button>
          <Button variant="primary" onClick={() => t.answer('save')}>Save {fmtMinutes(q.ms / 60000)}</Button>
        </>}>
        <p className="muted">Sessions over six hours usually mean the timer was left running. If you really studied that long, save it. A day holds at most 24 hours.</p>
      </Modal>
    );
  }
  if (q.kind === 'level') {
    return (
      <Modal open={open} onClose={t.closePrompt} size="sm" title={`This timer belongs to ${levelLabel(q.level)}`} description="Its time has to be saved in that level's study log."
        footer={<><Button variant="ghost" onClick={t.closePrompt}>Not now</Button><Button variant="primary" onClick={() => t.answer('switch')}>Switch to {levelLabel(q.level)}</Button></>}>
        <p className="muted">After switching, press Stop and save again. Nothing is lost in the meantime.</p>
      </Modal>
    );
  }
  return (
    <Modal open={open} onClose={t.closePrompt} size="sm" title="Discard this session?" description={`${fmtMinutes(q.ms / 60000)} of ${subject} will not be saved.`}
      footer={<><Button variant="ghost" onClick={t.closePrompt}>Keep timing</Button><Button variant="danger-solid" onClick={() => t.answer('discard')}>Discard</Button></>}>
      <p className="muted">This cannot be undone.</p>
    </Modal>
  );
}
