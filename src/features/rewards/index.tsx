import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { LuAward, LuCheck, LuCrown, LuCrosshair, LuFlame, LuGem, LuGlobe, LuLock, LuMedal, LuRocket, LuRotateCw, LuShield, LuSnowflake, LuSword, LuSwords } from 'react-icons/lu';
import './rewards.css';
import { Card, CardHead, CountUp, PageHeader, Tag } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { BADGES, evaluateBadges, type BadgeIcon } from '../../lib/badges';
import { fmtInt, fmtNum, plural } from '../../lib/format';
import { BEAST_HOURS, DAY_CAP_HOURS, FREEZE_EVERY, MAX_FREEZES, XP_BEAST_BONUS, XP_GOAL_BONUS, XP_PER_HOUR } from '../../lib/stats';
import { QuestList } from '../../components/game/QuestList';
import { useWorld } from '../../world';

const ICONS: Record<BadgeIcon, ReactNode> = {
  sword: <LuSword />, flame: <LuFlame />, rocket: <LuRocket />, medal: <LuMedal />, swords: <LuSwords />, shield: <LuShield />, globe: <LuGlobe />, gem: <LuGem />, crosshair: <LuCrosshair />, crown: <LuCrown />,
};
const HEX = 'M50 3 L90 26 L90 74 L50 97 L10 74 L10 26 Z';

function Hex({ children, state, size = 64 }: { children: ReactNode; state: 'on' | 'off' | 'cur'; size?: number }) {
  return (
    <span className={`rw-hex is-${state}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden><path d={HEX} /></svg>
      <span className="rw-hex-in">{children}</span>
    </span>
  );
}

function Flip({ front, back, label }: { front: ReactNode; back: ReactNode; label: string }) {
  const [on, setOn] = useState(false);
  return (
    <button type="button" className="rw-flip" data-on={on} aria-pressed={on} aria-label={label} onClick={() => { setOn((v) => !v); }}>
      <span className="rw-flip-in">
        <span className="rw-face">{front}</span>
        <span className="rw-face rw-back">{back}</span>
      </span>
    </button>
  );
}

export default function Rewards() {
  const { allSubjectsInGroup } = useLevelConfig();
  const { studyLogs, mockScores, settings, stats, quests } = useStudy();
  const { words } = useWorld();
  const ladder = stats.ladder;
  const waiting = quests.filter((q) => q.done && !q.claimed).length;
  const rank = stats.rankInfo;
  const x = stats.xpBreakdown;

  const badges = useMemo(() => evaluateBadges({
    logs: studyLogs, mocks: mockScores, pastHours: settings.pastHours, subjects: allSubjectsInGroup.map((s) => s.name),
    mockMax: (n) => allSubjectsInGroup.find((s) => s.name === n)?.marks || 100,
  }), [studyLogs, mockScores, settings.pastHours, allSubjectsInGroup]);
  const earned = badges.filter((b) => b.unlocked).length;
  const nextBadge = badges.filter((b) => !b.unlocked).sort((a, b) => b.progress - a.progress)[0];

  const ledger = [
    { k: 'hours', label: 'Study hours', note: `${XP_PER_HOUR} XP for every hour, up to ${DAY_CAP_HOURS}h a day`, v: x.hours, c: 'var(--c-cyan)' },
    { k: 'goal', label: 'Goal days', note: `+${XP_GOAL_BONUS} XP for each of ${plural(stats.goalDays, 'day')} at goal`, v: x.goal, c: 'var(--c-mint)' },
    { k: 'beast', label: 'Beast days', note: `+${XP_BEAST_BONUS} XP for each of ${plural(stats.beastDays, 'day')} at ${BEAST_HOURS}h or more`, v: x.beast, c: 'var(--c-ember)' },
    { k: 'mocks', label: 'Mock tests', note: '20 to 80 XP each, more for a higher score', v: x.mocks, c: 'var(--c-violet)' },
    { k: 'quests', label: 'Quests', note: 'XP you collected from daily and weekly quests', v: x.quests, c: 'var(--c-rose)' },
  ];
  const ledMax = Math.max(...ledger.map((l) => l.v), 1);
  const R = 74, C = 2 * Math.PI * R;

  return (
    <div className="page-enter">
      <PageHeader title="Rewards" sub="Quests, streaks, ranks and badges. Everything is earned from the study you log." />

      <div className="rw-top">
        <Card className="rw-hero sheen acc-gold" accent="gold" glow size="roomy" data-tour="rewards-hero">
          <div className="rw-crest">
            <svg viewBox="0 0 180 180" aria-hidden className="rw-crest-svg">
              <circle cx="90" cy="90" r={R} className="rw-ring-bg" />
              <circle cx="90" cy="90" r={R} className="rw-ring" transform="rotate(-90 90 90)" strokeDasharray={C} style={{ ['--to' as string]: C * (1 - rank.progress / 100), ['--c' as string]: C } as CSSProperties} />
            </svg>
            <div className="rw-crest-in">
              <svg viewBox="0 0 100 100" aria-hidden><path d={HEX} /></svg>
              <b className="t-num">{rank.level}</b>
            </div>
          </div>
          <div className="col g-3 grow min-0">
            <div>
              <div className="t-small muted">Current rank</div>
              <h2 className="rw-rank t-display">{words.rank(rank.title)}</h2>
            </div>
            <div className="rw-xp"><span className="t-num"><CountUp value={stats.totalXP} locale /></span><small>XP</small></div>
            {rank.held ? <p className="t-xs dim">Your exam date or goal moved the ladder. Your rank is kept.</p> : null}
            <div>
              <div className="rw-bar" role="progressbar" aria-valuenow={Math.round(rank.progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next rank"><i style={{ ['--v' as string]: rank.progress / 100 } as CSSProperties} /></div>
              <div className="row between t-xs dim mt-2"><span>{fmtInt(rank.minXP)} XP</span><span>{rank.isMax ? 'Top rank reached' : `${fmtInt(rank.nextMin - stats.totalXP)} XP to ${words.rank(rank.nextTitle)}`}</span></div>
            </div>
          </div>
        </Card>

        <Card className="rw-ledger">
          <CardHead title="Where your XP came from" sub={`${fmtInt(stats.totalXP)} XP in total`} />
          <ul className="col g-4">
            {ledger.map((l) => (
              <li key={l.k}>
                <div className="row between"><span className="t-small fw-6">{l.label}</span><b className="t-num">{fmtInt(l.v)}</b></div>
                <div className="rw-lbar"><i style={{ transform: `scaleX(${l.v / ledMax})`, background: l.c }} /></div>
                <div className="t-xs dim mt-1">{l.note}</div>
              </li>
            ))}
          </ul>
          {stats.pastHours > 0 ? <p className="t-xs dim mt-4">Includes {fmtNum(stats.pastHours, 0)} head-start hours from Settings.</p> : null}
        </Card>
      </div>

      <section className="rw-sec rw-quests" data-tour="reward-quests">
        <div className="row between wrap g-3">
          <h2 className="t-h2">Quests</h2>
          {waiting ? <Tag accent="gold">{waiting} ready to collect</Tag> : <span className="t-xs dim">Daily quests reset at midnight. Weekly ones on Monday.</span>}
        </div>
        <div className="rw-qgrid">
          <Card><CardHead title="Today" sub="Small steps that add up" /><QuestList kind="daily" quests={quests} /></Card>
          <Card><CardHead title="This week" sub="Bigger goals, bigger rewards" /><QuestList kind="weekly" quests={quests} /></Card>
        </div>
      </section>

      <div className="rw-streaks">
        <Flip label="Fire streak. Tap to see how it works." front={
          <div className="rw-streak acc-ember">
            <div className="rw-streak-ic"><LuFlame /></div>
            <div className="t-small muted">Fire streak</div>
            <div className="rw-big t-num">{stats.currentFireStreak}<small>{stats.currentFireStreak === 1 ? 'day' : 'days'}</small></div>
            <div className="t-xs dim">{stats.fireToday ? 'Today counts' : `Study ${stats.streakMin}h+ today to extend`} · best {stats.maxStreak}</div>
            <div className="rw-freezes" aria-label={`${stats.freezes} of ${MAX_FREEZES} streak freezes banked`}>
              {Array.from({ length: MAX_FREEZES }, (_, i) => <span key={i} className={i < stats.freezes ? 'is-on' : ''}><LuSnowflake aria-hidden /></span>)}
              <small>{stats.freezes ? `${stats.freezes} freeze${stats.freezes > 1 ? 's' : ''} banked` : `Next freeze at ${FREEZE_EVERY} days`}</small>
            </div>
            <span className="rw-flip-hint"><LuRotateCw aria-hidden /></span>
          </div>
        } back={
          <div className="rw-streak rw-rules acc-ember">
            <b>How the fire streak works</b>
            <p>Study {stats.streakMin} hours or more to count a day. Every {FREEZE_EVERY} days in a row banks a freeze (up to {MAX_FREEZES}). A missed day spends a freeze instead of resetting you. Planned rest days never break it.</p>
          </div>
        } />

        <Flip label="Goal weeks. Tap to see how they work." front={
          <div className="rw-streak acc-gold">
            <div className="rw-streak-ic"><LuAward /></div>
            <div className="t-small muted">Goal weeks</div>
            <div className="rw-big t-num">{stats.goalWeekStreak}<small>{stats.goalWeekStreak === 1 ? 'week' : 'weeks'}</small></div>
            <div className="t-xs dim">This week: {fmtNum(stats.goalWeek.hours, 0)} of {fmtNum(stats.goalWeek.target, 0)}h</div>
            <div className="rw-bar rw-bar--sm mt-2"><i style={{ ['--v' as string]: Math.min(1, stats.goalWeek.hours / Math.max(1, stats.goalWeek.target)) } as CSSProperties} /></div>
            <span className="rw-flip-hint"><LuRotateCw aria-hidden /></span>
          </div>
        } back={
          <div className="rw-streak rw-rules acc-gold">
            <b>How goal weeks work</b>
            <p>A week from Monday to Sunday is a goal week when you study {fmtNum(stats.goalWeek.target, 0)} hours in total, which is your daily goal for five days. The week in progress never breaks your streak.</p>
          </div>
        } />

        <Card className="rw-next">
          <div className="t-small muted">Next badge</div>
          {nextBadge ? (
            <div className="row g-4 mt-3">
              <Hex state="cur" size={72}>{ICONS[nextBadge.icon]}</Hex>
              <div className="grow min-0">
                <div className="fw-6">{nextBadge.title}</div>
                <div className="t-xs dim">{nextBadge.description}</div>
                <div className="rw-bar rw-bar--sm mt-3"><i style={{ ['--v' as string]: nextBadge.progress } as CSSProperties} /></div>
                <div className="t-xs dim mt-1">{fmtNum(nextBadge.value, 0)} of {nextBadge.target} {nextBadge.unit}</div>
              </div>
            </div>
          ) : <p className="t-small muted mt-3">You've earned every badge. Legend status.</p>}
        </Card>
      </div>

      <section className="rw-sec">
        <div className="row between wrap g-3"><h2 className="t-h2">Rank ladder</h2><span className="t-xs dim">Set for your exam date and daily goal</span></div>
        <ol className="rw-ladder stagger">
          {ladder.map((r, i) => {
            const state = i + 1 < rank.level ? 'on' : i + 1 === rank.level ? 'cur' : 'off';
            return (
              <li key={r.title} className={`rw-step is-${state}`}>
                <Hex state={state} size={52}>{state === 'off' ? <LuLock /> : state === 'on' ? <LuCheck /> : <b className="t-num">{i + 1}</b>}</Hex>
                <div className="min-0"><div className="rw-step-t truncate">{r.title}</div><div className="t-xs dim">{fmtInt(r.minXP)} XP</div></div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rw-sec">
        <div className="row between wrap g-3"><h2 className="t-h2">Badges</h2><Tag accent="gold">{earned} of {BADGES.length} earned</Tag></div>
        <ul className="rw-badges stagger">
          {badges.map((b) => (
            <li key={b.id} className={`rw-badge ${b.unlocked ? 'is-on' : ''}`}>
              <Hex state={b.unlocked ? 'on' : 'off'} size={68}>{b.unlocked ? ICONS[b.icon] : <LuLock />}</Hex>
              <div className="min-0">
                <div className="fw-6 t-small">{b.title}</div>
                <div className="t-xs dim">{b.description}</div>
                {!b.unlocked && b.target > 1 ? (<><div className="rw-bar rw-bar--sm mt-2"><i style={{ ['--v' as string]: b.progress } as CSSProperties} /></div><div className="t-xs dim mt-1">{fmtNum(b.value, 0)} / {b.target} {b.unit}</div></>) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
