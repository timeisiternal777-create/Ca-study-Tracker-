import { useEffect, useState } from 'react';
import { LuArrowLeftRight, LuMaximize2, LuPause, LuPlay, LuRepeat, LuSquare, LuTrash2 } from 'react-icons/lu';
import './timer.css';
import { Button, Card, Chip, Field, Input, ProgressBar, Tag } from '../../components/ui';
import { levelLabel } from '../../config/curriculum';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { fmtHM, fmtNum } from '../../lib/format';
import { fmtTime, milestoneFor, TOPIC_MAX } from '../../lib/timer';
import { useElapsedSeconds } from '../../lib/ticker';
import { getSlot, slotOfSubject } from '../../lib/log';
import { ClockDigits, TimerDial, BLOCK_SECONDS } from './Clock';
import { useRecentTopics } from './hooks';
import { TodaySessions } from './Sessions';

/** The timer on the dashboard: pick a subject to start, then a live clock with the controls. */
export function TimerCard() {
  const t = useTimer();
  return (
    <section className="timer" aria-label="Study timer" data-tour="timer">
      {!t.active ? <IdleCard /> : !t.here ? <OtherLevelCard /> : <LiveCard />}
    </section>
  );
}

function IdleCard() {
  const t = useTimer();
  const { subjects, allSubjectsInGroup } = useLevelConfig();
  const { studyLogs, today } = useStudy();
  const list = subjects.length ? subjects : allSubjectsInGroup;
  const todayLog = studyLogs.find((l) => l.date === today);
  const [topic, setTopic] = useState('');
  const last = t.sessions[0]?.subject;
  const lastInList = last && list.some((s) => s.name === last) ? last : '';
  const begin = (name: string) => { if (t.start(name, topic)) setTopic(''); };
  return (
    <Card className="tcard tcard--idle acc-brand" size="flush">
      <div className="tplay-wrap">
        <button type="button" className="tplay" aria-label="Start studying" onClick={() => t.openStart(lastInList || undefined)}>
          <i className="tplay-ring" aria-hidden /><i className="tplay-ring tplay-ring--2" aria-hidden />
          <LuPlay aria-hidden />
        </button>
      </div>
      <div className="tcard-main">
        <div className="tcard-head">
          <h2 className="tcard-title">What are you studying?</h2>
          <p className="tcard-cap">Tap a subject and the clock starts. When you stop, the time goes into today's log by itself.</p>
        </div>
        {list.length === 0 ? (
          <p className="callout acc-warn">No subjects are selected yet. Choose them in Settings.</p>
        ) : (
          <div className="tcard-chips" role="group" aria-label="Start timing a subject">
            {list.map((s) => {
              const slot = slotOfSubject(todayLog, s.name);
              const h = slot ? getSlot(todayLog, slot).hours : 0;
              return (
                <Chip key={s.id} accent={s.accent} dot title={s.name} aria-label={`Start timing ${s.name}`} onClick={() => begin(s.name)}>
                  {s.abbrev}{h > 0 ? <small>{fmtHM(h)} today</small> : null}
                </Chip>
              );
            })}
          </div>
        )}
        <Field className="tcard-topicf" label="Topic" right="optional, you can change it while the clock runs">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={TOPIC_MAX} placeholder="e.g. Contract Act, sections 10 to 30" />
        </Field>
        {lastInList ? (
          <button type="button" className="tagain" onClick={() => begin(lastInList)}><LuRepeat aria-hidden />Study {lastInList} again</button>
        ) : null}
      </div>
      <TodaySessions />
    </Card>
  );
}

function OtherLevelCard() {
  const t = useTimer();
  return (
    <Card className="tcard tcard--idle acc-warn" size="flush">
      <div className="tplay-wrap"><span className="tplay" style={{ background: 'rgb(var(--c-gold-rgb) / 0.2)', color: 'var(--c-gold)', boxShadow: 'none' }} aria-hidden><LuPause /></span></div>
      <div className="tcard-main">
        <div className="tcard-head">
          <h2 className="tcard-title">A timer is running for {levelLabel(t.state.level)}</h2>
          <p className="tcard-cap">{t.state.subject} has been timed since {fmtTime(t.state.startedAt)}. Switch back to {levelLabel(t.state.level)} to stop it and save the time there.</p>
        </div>
        <div className="tcard-actions"><Button variant="primary" onClick={t.stop}>Switch and save it</Button></div>
      </div>
    </Card>
  );
}

function LiveCard() {
  const t = useTimer();
  const secs = useElapsedSeconds();
  const { getSubjectMetadata } = useLevelConfig();
  const { stats, settings, today } = useStudy();
  const st = t.state;
  const meta = getSubjectMetadata(st.subject);
  const [topic, setTopic] = useState(st.topic);
  useEffect(() => { setTopic(st.topic); }, [st.id, st.topic]);
  const saveTopic = () => { if (topic !== st.topic) t.setTopic(topic); };
  const caption = t.paused ? 'Paused. This time is not counted.' : milestoneFor(secs * 1000).text;
  const goal = settings.dailyGoalHours;
  const todayH = stats.todayHours + t.liveMsOn(today) / 3_600_000;
  const block = Math.floor(secs / BLOCK_SECONDS) + 1;
  const toGo = Math.max(0, goal - todayH);
  return (
    <Card className={`tcard tcard--live acc-${meta.accent}`} size="flush" data-status={st.status}>
      <div className="tcard-dialwrap">
        <TimerDial seconds={secs} status={st.status} accent={meta.accent} top={meta.abbrev} bottom={t.paused ? 'Paused' : `Block ${block}`}>
          <ClockDigits seconds={secs} live={t.running} />
        </TimerDial>
      </div>
      <div className="tcard-main">
        <div className="tcard-head">
          <div className="row g-3 wrap">
            <Tag accent={meta.accent}>{t.running ? <span className="live-dot" aria-hidden /> : <LuPause aria-hidden />}{t.running ? 'Studying' : 'Paused'}</Tag>
            <span className="tcard-since">Started {fmtTime(st.startedAt)}</span>
          </div>
          <h2 className="tcard-title">{st.subject}</h2>
          <p className="tcard-cap" aria-live="polite">{caption}</p>
        </div>
        <Field label="Topic" right="optional">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} onBlur={saveTopic} onKeyDown={(e) => { if (e.key === 'Enter') { saveTopic(); (e.target as HTMLInputElement).blur(); } }} maxLength={TOPIC_MAX} placeholder="What are you covering?" />
        </Field>
        <RecentTopics subject={st.subject} current={topic} pick={(x) => { setTopic(x); t.setTopic(x); }} />
        <div className="tcard-actions">
          {t.running
            ? <Button variant="soft" accent={meta.accent} onClick={t.pause}><LuPause />Pause</Button>
            : <Button variant="primary" onClick={t.resume}><LuPlay />Resume</Button>}
          <Button variant="primary" onClick={() => { saveTopic(); t.stop(); }}><LuSquare />Stop and save</Button>
          <Button onClick={() => t.openStart()}><LuArrowLeftRight />Switch subject</Button>
          <Button variant="ghost" icon aria-label="Open focus mode" title="Focus mode" onClick={t.openFocus}><LuMaximize2 /></Button>
          <Button variant="ghost" icon aria-label="Discard this session" title="Discard" onClick={t.askDiscard}><LuTrash2 /></Button>
        </div>
        <div className="tcard-today">
          <div><span>Today, with this session</span><b className="tnum">{fmtHM(todayH)} of {fmtHM(goal)}</b></div>
          <ProgressBar value={goal > 0 ? (todayH / goal) * 100 : 0} size="thin" accent={meta.accent} live={todayH > 0 && todayH < goal} />
          <div className="t-xs dim"><span>{toGo > 0 ? `${fmtHM(toGo)} to go` : 'Goal reached. Everything from here is bonus XP.'}</span><span>{fmtNum(todayH)}h</span></div>
        </div>
      </div>
      <TodaySessions />
    </Card>
  );
}

function RecentTopics({ subject, current, pick }: { subject: string; current: string; pick: (t: string) => void }) {
  const recent = useRecentTopics(subject).filter((x) => x.toLowerCase() !== current.trim().toLowerCase());
  if (!recent.length) return null;
  return (
    <div className="col g-2" style={{ marginTop: -6 }}>
      <span className="t-xs dim">Recent topics</span>
      <div className="chips">{recent.map((x) => <Chip key={x} onClick={() => pick(x)}>{x}</Chip>)}</div>
    </div>
  );
}

