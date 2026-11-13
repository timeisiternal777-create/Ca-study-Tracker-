import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import './celebrations.css';
import { Blip } from '../blip/Blip';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { evaluateBadges } from '../../lib/badges';
import { celebrate, onCelebrate, type Celebration, type CelebrationKind } from '../../lib/celebrate';
import { startOfWeek } from '../../lib/date';
import { detectMilestones, normalizeSeen, squash, type MilestoneInput, type Seen } from '../../lib/milestones';
import { sfx } from '../../lib/sfx';
import { KEYS, readJSON, writeJSON } from '../../lib/storage';
import { useWorld } from '../../world';

interface Item extends Celebration { id: number }

const TAG: Record<CelebrationKind, { label: string; acc: string }> = {
  quest: { label: 'Quest', acc: 'acc-brand' },
  rank: { label: 'Rank up', acc: 'acc-gold' },
  badge: { label: 'Badge', acc: 'acc-violet' },
  save: { label: 'Saved', acc: 'acc-brand' },
  goal: { label: 'Daily goal', acc: 'acc-mint' },
  week: { label: 'Goal week', acc: 'acc-cyan' },
  freeze: { label: 'Streak freeze', acc: 'acc-cyan' },
};
const COLORS = ['var(--a)', 'var(--c-gold)', 'var(--c-mint)', 'var(--c-rose)', 'var(--c-violet)'];

const reduced = () => document.documentElement.dataset.reduceMotion === 'true' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Same pieces every time for the same card, so a re-render never reshuffles the confetti. */
function pieces(seed: number, n: number) {
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round((rnd() - 0.5) * 2 * 210), up: Math.round(70 + rnd() * 120), fall: Math.round(150 + rnd() * 170),
    r: Math.round((rnd() - 0.5) * 900), d: Math.round(rnd() * 140), w: 6 + Math.round(rnd() * 4), h: 8 + Math.round(rnd() * 8),
    round: rnd() > 0.6, c: COLORS[i % COLORS.length],
  }));
}

function Card({ item, onDone }: { item: Item; onDone: () => void }) {
  const big = item.kind === 'rank';
  const dur = big ? 6400 : 4800;
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const left = useRef(dur);
  const t0 = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const xpRef = useRef<HTMLSpanElement>(null);
  const still = useMemo(reduced, []);
  const bits = useMemo(() => (still ? [] : pieces(item.id, big ? 44 : 26)), [item.id, big, still]);
  const tag = TAG[item.kind];

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setClosing(true);
    window.setTimeout(onDone, still ? 0 : 240);
  }, [onDone, still]);

  const arm = useCallback(() => { t0.current = performance.now(); timer.current = window.setTimeout(close, Math.max(400, left.current)); }, [close]);
  useEffect(() => { arm(); return () => window.clearTimeout(timer.current); }, [arm]);
  const pause = () => { if (paused) return; window.clearTimeout(timer.current); left.current -= performance.now() - t0.current; setPaused(true); };
  const resume = () => { if (!paused) return; setPaused(false); arm(); };

  // Sound and a short buzz on phones. Quests already played their own chime when collected.
  useEffect(() => {
    if (item.kind !== 'quest') sfx.play(item.kind); // quests already played their own sound when collected
    if (!still && sfx.enabled) sfx.vibrate(item.kind === 'rank' ? [14, 50, 14, 50, 26] : [12, 40, 18]);
  }, [item.kind, still]);

  // Count the XP up, writing straight to the DOM so React never re-renders per frame.
  useEffect(() => {
    const el = xpRef.current; const to = item.xp ?? 0;
    if (!el || !to) return;
    if (still) { el.textContent = String(to); return; }
    let raf = 0; const start = performance.now() + 380;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 900));
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = '0'; raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [item.xp, still]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [close]);

  return (
    <>
      {big ? <div className={`cel-scrim${closing ? ' is-closing' : ''}`} onClick={close} aria-hidden /> : null}
      <div
        className={`cel-card ${tag.acc}${big ? ' is-big' : ''}${closing ? ' is-closing' : ''}${paused ? ' is-paused' : ''}`}
        role="status" onClick={close} onPointerEnter={(e) => { if (e.pointerType === 'mouse') pause(); }} onPointerLeave={resume}
        style={{ ['--cel-dur' as string]: `${dur}ms` }}
      >
        <div className="cel-confetti" aria-hidden>
          {bits.map((b, i) => (
            <b key={i} style={{ ['--x' as string]: `${b.x}px`, ['--d' as string]: `${b.d}ms` } as CSSProperties}>
              <i style={{ ['--up' as string]: `${-b.up}px`, ['--fall' as string]: `${b.fall}px`, ['--r' as string]: `${b.r}deg`, ['--w' as string]: `${b.w}px`, ['--h' as string]: `${b.round ? b.w : b.h}px`, ['--cc' as string]: b.c, borderRadius: b.round ? '50%' : 2 } as CSSProperties} />
            </b>
          ))}
        </div>
        <span className="cel-blip" aria-hidden><Blip mood={item.mood ?? 'cheer'} size={big ? 118 : 68} /></span>
        <div className="cel-body">
          <span className="cel-tag">{tag.label}</span>
          <div className="cel-title">{item.title}</div>
          {item.sub ? <div className="cel-sub">{item.sub}</div> : null}
          {big ? <button type="button" className="cel-ok" onClick={(e) => { e.stopPropagation(); close(); }}>Nice!</button> : null}
        </div>
        {item.xp ? <div className="cel-xp"><span ref={xpRef} className="tnum">{item.xp}</span><small>XP</small></div> : null}
        <i className="cel-time" aria-hidden />
      </div>
    </>
  );
}

/** Shows celebrations one at a time. Anything can ask for one with `celebrate()`. */
function Stage() {
  const [queue, setQueue] = useState<Item[]>([]);
  const [active, setActive] = useState<Item | null>(null);
  const seq = useRef(1);

  useEffect(() => onCelebrate((c) => {
    setQueue((q) => (q.length >= 5 || q.some((x) => x.kind === c.kind && x.title === c.title) ? q : [...q, { ...c, id: seq.current++ }]));
  }), []);

  useEffect(() => {
    if (active || !queue.length) return;
    const id = window.setTimeout(() => { setActive(queue[0]); setQueue((q) => q.slice(1)); }, active === null && seq.current > 2 ? 260 : 0);
    return () => window.clearTimeout(id);
  }, [active, queue]);

  const done = useCallback(() => setActive(null), []);
  return <div className="cel-root" aria-live="polite">{active ? <Card key={active.id} item={active} onDone={done} /> : null}</div>;
}

/** Looks for new milestones (rank, badges, goal, freeze, goal week) after every change to your data. */
function useMilestones() {
  const { level, allSubjectsInGroup } = useLevelConfig();
  const { studyLogs, mockScores, settings, stats, today } = useStudy();
  const { words } = useWorld();
  const badges = useMemo(() => evaluateBadges({
    logs: studyLogs, mocks: mockScores, pastHours: settings.pastHours, subjects: allSubjectsInGroup.map((s) => s.name),
    mockMax: (n) => allSubjectsInGroup.find((s) => s.name === n)?.marks || 100,
  }), [studyLogs, mockScores, settings.pastHours, allSubjectsInGroup]);

  const input = useMemo<MilestoneInput>(() => ({
    today, weekStart: startOfWeek(today),
    rank: { level: stats.rankInfo.level, title: words.rank(stats.rankInfo.title) },
    badges, freezes: stats.freezes, todayHours: stats.todayHours, goalHours: settings.dailyGoalHours, goalWeekDone: stats.goalWeek.done,
  }), [today, stats.rankInfo.level, stats.rankInfo.title, words, badges, stats.freezes, stats.todayHours, settings.dailyGoalHours, stats.goalWeek.done]);

  const seen = useRef<{ key: string; v: Seen | null } | null>(null);
  // Restoring a backup or wiping your data is not an achievement: start fresh from wherever that leaves you.
  const rebase = useRef(false);
  useEffect(() => {
    const on = () => { rebase.current = true; };
    window.addEventListener('ca_data_restored', on); window.addEventListener('ca_data_cleared', on);
    return () => { window.removeEventListener('ca_data_restored', on); window.removeEventListener('ca_data_cleared', on); };
  }, []);
  useEffect(() => {
    const key = KEYS.seen(level);
    if (!seen.current || seen.current.key !== key) seen.current = { key, v: normalizeSeen(readJSON<unknown>(key, null)) };
    if (rebase.current) { rebase.current = false; seen.current.v = null; }
    const { events, next } = detectMilestones(seen.current.v, input);
    seen.current.v = next;
    writeJSON(key, next);
    squash(events).forEach((e, i) => window.setTimeout(() => celebrate(e), 450 + i * 40));
  }, [input, level]);
}

export function Celebrations() {
  useMilestones();
  return <Stage />;
}
