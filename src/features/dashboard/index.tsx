import { lazy, Suspense, useMemo, useState } from 'react';
import { LuAward, LuClock, LuFlame, LuPlay, LuMaximize2, LuPlus, LuSparkles, LuTarget, LuCheck, LuArrowRight, LuSnowflake } from 'react-icons/lu';
import './dashboard.css';
import { Button, Card, CardHead, ProgressBar, Ring, StatCard, SubjectTag, Tag } from '../../components/ui';
import { QuestList } from '../../components/game/QuestList';
import { RadarDial, angleFor, type Blip } from '../../components/RadarDial';
import { StreakInfoModal } from '../../components/modals/StreakInfoModal';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { BEAST_HOURS } from '../../lib/stats';
import { PHASES } from '../../lib/phases';
import { addDays, fmtDate, greeting, parseYmd, relativeDay, startOfWeek, weekdayShort } from '../../lib/date';
import { MAX_SLOTS, filledSlots } from '../../lib/log';
import { fmtHM, fmtInt, fmtNum } from '../../lib/format';
import { quoteFor } from '../../lib/quotes';
import { pendingBacklogCount } from '../../lib/backlog';
import { navigateTo } from '../../lib/nav';
import { Countdown } from './Countdown';
import { QuickLog } from './QuickLog';
import { TimerCard } from '../timer/TimerCard';
import { useWorld } from '../../world';
const VoyageCard = lazy(() => import('../../world/voyage/VoyageCard').then((m) => ({ default: m.VoyageCard })));
const AcademyCard = lazy(() => import('../../world/academy/AcademyCard').then((m) => ({ default: m.AcademyCard })));
import { useTimer } from '../../context/TimerContext';
import { useElapsedBucket } from '../../lib/ticker';

function useStatus(hours: number, goal: number) {
  if (hours >= BEAST_HOURS) return { label: 'Beast mode', accent: 'ember' as const, icon: <LuFlame /> };
  if (hours >= goal) return { label: 'Goal met', accent: 'mint' as const, icon: <LuCheck /> };
  if (hours > 0) return { label: 'In progress', accent: 'gold' as const, icon: <LuClock /> };
  return { label: 'Not started', accent: undefined, icon: <LuClock /> };
}

export default function Dashboard() {
  const { subjects, allSubjectsInGroup, suffix, getSubjectMetadata } = useLevelConfig();
  const { stats, settings, studyLogs, today, quests, phase, daysLeft } = useStudy();
  const { words } = useWorld();
  const [quick, setQuick] = useState<string | null>(null);
  const [streakInfo, setStreakInfo] = useState(false);

  const goal = settings.dailyGoalHours;
  const timer = useTimer();
  useElapsedBucket(120); // while the timer runs, today's numbers move every two minutes
  const todayLog = studyLogs.find((l) => l.date === today);
  const slots = filledSlots(todayLog);
  const savedToday = stats.todayHours;
  const liveToday = timer.active && timer.here ? timer.liveMsOn(today) / 3_600_000 : 0;
  const todayHours = savedToday + liveToday;
  const status = useStatus(todayHours, goal);
  const toGoal = Math.max(0, goal - todayHours);
  const examPassed = daysLeft < 0 || (daysLeft === 0 && new Date() > new Date(parseYmd(settings.targetExamDate).setHours(14, 0, 0, 0)));
  const quote = quoteFor(today);
  const backlog = pendingBacklogCount(suffix);
  const list = subjects.length ? subjects : allSubjectsInGroup;

  const blips: Blip[] = useMemo(() => {
    const total = slots.reduce((a, s) => a + s.hours, 0) || 1;
    return slots.filter((s) => s.subject).map((s) => ({
      id: s.subject, angle: angleFor(s.subject), radius: 0.35 + 0.6 * Math.min(1, s.hours / Math.max(total, 1)), accent: getSubjectMetadata(s.subject).accent,
    }));
  }, [slots, getSubjectMetadata]);

  // This week (Mon–Sun)
  const week = useMemo(() => {
    const start = startOfWeek(today);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const hours = days.map((d) => stats.dailyTotals[d] || 0);
    const scale = Math.max(goal * 1.15, ...hours, 1);
    return { days, hours, scale, total: hours.reduce((a, b) => a + b, 0) };
  }, [stats.dailyTotals, today, goal]);

  const rank = stats.rankInfo;
  const rd = stats.readiness;
  const hoursSubj = (name: string) => stats.subjectHours[name] || 0;
  const loggedToday = (name: string) => slots.find((s) => s.subject === name)?.hours || 0;
  const name = settings.displayName.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="dash stagger">
      {/* Hero ─ countdown + today's dial */}
      <Card className="hero sheen acc-brand" size="flush">
        <div className="hero-copy">
          <div>
            <h1 className="t-display hero-title">{greeting()}, {name}</h1>
            <p className="muted mt-2">
              {examPassed
                ? 'Your exam date has passed. Set the next one in Settings to restart the countdown.'
                : <>Exam on <strong className="fw-6" style={{ color: 'var(--tx-0)' }}>{fmtDate(settings.targetExamDate, { weekday: true, year: true })}</strong>, 2 PM · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go</>}
            </p>
          </div>
          <Countdown examDate={settings.targetExamDate} />
          <div className="row g-3 wrap hero-cta" data-tour="log-cta">
            <span className="cta">
              {timer.active
                ? <Button variant="primary" size="lg" onClick={timer.openFocus}><LuMaximize2 />Open the timer</Button>
                : <Button variant="primary" size="lg" onClick={() => timer.openStart()}><LuPlay />Start studying</Button>}
              <i className="cta-aura" aria-hidden />
            </span>
            <Button variant="soft" onClick={() => { setQuick(slots[0]?.subject || list[0]?.name || ''); }}><LuPlus />Add hours</Button>
            <span className="t-small muted">
              {timer.active ? `Timing ${timer.state.subject} now.`
                : todayHours === 0 ? 'Nothing logged yet. Even one hour keeps the streak moving.'
                : toGoal > 0 ? `${fmtHM(toGoal)} more to reach today’s goal.` : 'Goal reached. Every extra hour is bonus XP.'}
            </span>
          </div>
        </div>
        <div className="hero-dial" data-tour="hero-dial">
          <RadarDial progress={goal > 0 ? todayHours / goal : 0} size={300} blips={blips}>
            <div className="col g-1" style={{ alignItems: 'center' }}>
              <div className="dial-num t-num">{fmtNum(todayHours)}<small>/{fmtNum(goal)}h</small></div>
              <div className="t-xs dim">studied today</div>
            </div>
          </RadarDial>
          <Tag accent={status.accent} size="lg">{status.icon}{status.label}</Tag>
        </div>
      </Card>

      {/* Today */}
      <Card className="today">
        <CardHead title="Today" sub={fmtDate(today, { weekday: true })} action={slots.length ? <Button size="sm" variant="ghost" onClick={() => navigateTo('LOG')}>Edit<LuArrowRight /></Button> : undefined} />
        {slots.length === 0 ? (
          <div className="empty" style={{ padding: '18px 8px 6px' }}>
            <div className="empty-icon"><LuClock /></div>
            <h3>A clean slate</h3>
            <p>Pick a subject below to add your first session of the day.</p>
          </div>
        ) : (
          <ul className="col g-3">
            {slots.map((s) => {
              const m = getSubjectMetadata(s.subject || 'Study');
              return (
                <li key={s.slot} className={`today-row acc-${m.accent}`}>
                  <div className="row g-3">
                    <SubjectTag name={s.subject || 'Study'} />
                    <div className="grow min-0">
                      <div className="t-small fw-6 truncate">{s.subject || 'Unassigned'}</div>
                      <div className="t-xs dim truncate">{s.topic || 'No topic noted'}</div>
                    </div>
                    <div className="t-num" style={{ fontSize: 20 }}>{fmtHM(s.hours)}</div>
                  </div>
                  <ProgressBar value={goal > 0 ? (s.hours / goal) * 100 : 0} size="thin" accent={m.accent} />
                </li>
              );
            })}
          </ul>
        )}
        {slots.length < MAX_SLOTS ? <Button size="sm" variant="soft" block onClick={() => { setQuick(list.find((x) => !slots.some((s) => s.subject === x.name))?.name || list[0]?.name || ''); }}><LuPlus />Add a session</Button> : null}
        <div className="today-total">
          <span className="t-small muted">{liveToday > 0 ? 'Saved so far' : 'Total'}</span>
          <span className="t-num" style={{ fontSize: 24 }}>{fmtHM(savedToday)}</span>
        </div>
      </Card>

      <TimerCard />

      {words.voyage ? <Suspense fallback={null}><VoyageCard /></Suspense> : null}
      {words.academy ? <Suspense fallback={null}><AcademyCard /></Suspense> : null}

      {/* Stats */}
      <div className="stat-row" data-tour="streaks">
        <StatCard label="Studied today" value={todayHours} decimals={1} unit="hours" icon={<LuClock />} live="pulse" accent={todayHours >= goal ? 'mint' : 'cyan'}
          foot={toGoal > 0 ? `${fmtHM(toGoal)} to your ${fmtNum(goal)}h goal` : 'Daily goal reached'}>
          <ProgressBar value={goal > 0 ? (todayHours / goal) * 100 : 0} size="thin" live={todayHours > 0 && todayHours < goal} />
        </StatCard>
        <StatCard label="Fire streak" value={stats.currentFireStreak} unit={stats.currentFireStreak === 1 ? 'day' : 'days'} icon={<LuFlame />} live="flame" accent="ember" onHelp={() => setStreakInfo(true)}
          foot={`${stats.fireToday ? 'Today counts' : `Study ${stats.streakMin}h+ today to extend`} · best ${stats.maxStreak}${stats.freezes ? ` · ${stats.freezes} freeze${stats.freezes > 1 ? 's' : ''}` : ''}`} />
        <StatCard label="Goal weeks" value={stats.goalWeekStreak} unit={stats.goalWeekStreak === 1 ? 'week' : 'weeks'} icon={<LuAward />} live="shine" accent="gold" onHelp={() => setStreakInfo(true)}
          foot={`This week: ${fmtNum(stats.goalWeek.hours, 0)} of ${fmtNum(stats.goalWeek.target, 0)}h`}>
          <ProgressBar value={Math.min(100, (stats.goalWeek.hours / Math.max(1, stats.goalWeek.target)) * 100)} size="thin" />
        </StatCard>
        <StatCard label={words.rank(rank.title)} value={stats.totalXP} unit="XP" icon={<LuSparkles />} live="shine" accent="violet" locale
          foot={rank.isMax ? 'Top rank reached' : `${fmtInt(rank.nextMin - stats.totalXP)} XP to ${words.rank(rank.nextTitle)}`}>
          <ProgressBar value={rank.progress} size="thin" />
        </StatCard>
      </div>

      {/* Readiness + quests */}
      <Card className="ready" accent={rd.accent} data-tour="readiness">
        <CardHead title="Exam readiness" sub={`${phase.title} phase${examPassed ? '' : ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}`} action={<Button size="sm" variant="ghost" onClick={() => navigateTo('CHARTS')}>Details<LuArrowRight /></Button>} />
        <div className="rd-body">
          <Ring value={rd.score} size={132} stroke={11} accent={rd.accent}>
            <div className="rd-ring"><b className="t-num">{rd.started ? rd.score : '–'}</b><span>{rd.started ? 'of 100' : 'not started'}</span></div>
          </Ring>
          <div className="min-0 grow">
            <Tag accent={rd.accent} size="lg">{rd.label}</Tag>
            <ul className="rd-parts">
              {rd.parts.map((p) => (
                <li key={p.id} title={p.note}>
                  <span>{p.label}</span>
                  <div className="rd-bar"><i style={{ transform: `scaleX(${(p.score ?? 0) / 100})` }} /></div>
                  <b className="t-num">{p.score == null ? '–' : p.score}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ol className="rd-phases" aria-label="Exam phases">
          {PHASES.filter((x) => x.id !== 'done').map((x) => <li key={x.id} className={`${x.id === phase.id ? 'is-cur' : ''} acc-${x.accent}`}><i /><span>{x.title}</span></li>)}
        </ol>
        <p className="rd-focus t-small muted"><LuTarget aria-hidden /><span>{phase.focus}{rd.capped ? ' Log a mock test to lift the cap on your score.' : ''}</span></p>
      </Card>

      <Card className="qcard" data-tour="quests">
        <CardHead title="Today’s quests" sub={`${quests.filter((q) => q.kind === 'daily' && q.done).length} of ${quests.filter((q) => q.kind === 'daily').length} done`} action={<Button size="sm" variant="ghost" onClick={() => navigateTo('GAMIFICATION')}>All quests<LuArrowRight /></Button>} />
        <QuestList kind="daily" quests={quests} />
      </Card>

      {/* Quick log */}
      <Card className="quick">
        <CardHead title="Quick log" sub="Tap a subject to add time to today" />
        <div className="tiles">
          {list.map((s) => {
            const done = loggedToday(s.name);
            return (
              <button key={s.id} type="button" className={`tile acc-${s.accent}`} data-done={done > 0 || undefined} onClick={() => { setQuick(s.name); }} aria-label={`Log time for ${s.name}`}>
                <span className="row g-2 between">
                  <span className="abbr">{s.abbrev}</span>
                  <span className="tile-plus">{done > 0 ? <LuCheck /> : <LuPlus />}</span>
                </span>
                <span className="tile-name clamp-2">{s.name}</span>
                <span className="tile-foot">
                  <span className="tile-today">{done > 0 ? `${fmtHM(done)} today` : 'Not today'}</span>
                  <span className="dim">{fmtNum(hoursSubj(s.name), 0)}h total</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Week */}
      <Card className="week">
        <CardHead title="This week" sub={`${fmtHM(week.total)} so far · goal ${fmtNum(goal)}h a day`} />
        <div className="wk" style={{ ['--goal' as string]: `${(goal / week.scale) * 100}%` }}>
          {week.days.map((d, i) => {
            const h = week.hours[i];
            const future = d > today;
            const cls = h >= BEAST_HOURS ? 'acc-ember' : h >= goal ? 'acc-mint' : 'acc-brand';
            return (
              <div key={d} className={`wk-col ${cls}`} data-today={d === today || undefined} data-future={future || undefined} title={`${relativeDay(d, today)} · ${fmtHM(h)}`}>
                <span className="wk-val tnum">{h > 0 ? fmtNum(h) : ''}</span>
                <div className="wk-plot"><div className="wk-bar" style={{ ['--h' as string]: `${Math.max(h > 0 ? 3 : 0, (h / week.scale) * 100)}%`, ['--i' as string]: i }} /></div>
                <span className="wk-day">{weekdayShort(d).charAt(0)}</span>
              </div>
            );
          })}
        </div>
        <div className="wk-foot">
          <div><b>{fmtNum(week.total)}h</b><span>This week</span></div>
          <div><b>{fmtNum(stats.last7Avg)}h</b><span>Daily average</span></div>
          <div><b>{stats.bestDayHours > 0 ? `${fmtNum(stats.bestDayHours)}h` : '—'}</b><span>Best day ever</span></div>
        </div>
      </Card>

      {/* Backlog + quote */}
      {backlog > 0 ? (
        <Card className="note acc-ember" tinted interactive onClick={() => navigateTo('TARGETS')} onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('TARGETS'); }}>
          <div className="row g-4">
            <span className="stat-icon"><LuTarget /></span>
            <div className="grow">
              <div className="t-h3">{backlog} backlog {backlog === 1 ? 'item' : 'items'} waiting</div>
              <div className="t-small muted">Planned study from earlier days that is still open. Clear them before they pile up.</div>
            </div>
            <LuArrowRight />
          </div>
        </Card>
      ) : null}
      <Card className="note quote">
        <p className="t-quote">“{quote.text}”</p>
        <span className="t-xs dim">{quote.by}</span>
      </Card>

      <QuickLog subject={quick} onClose={() => setQuick(null)} />
      <StreakInfoModal open={streakInfo} onClose={() => setStreakInfo(false)} />
    </div>
  );
}
