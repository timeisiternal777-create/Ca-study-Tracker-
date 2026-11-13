// Works out which celebrations are new since you last looked. Pure, so it can be tested.
// Everything is compared against a small "seen" record; the first time it runs it only records
// where you are now, so opening the app with old data never fires a pile of popups.
import type { Celebration } from './celebrate';

export interface Seen {
  /** highest rank tier you have been congratulated on (1-based) */
  rank: number;
  badges: string[];
  freezes: number;
  /** last day the daily-goal card was shown */
  goalDay: string;
  /** Monday of the last week the goal-week card was shown */
  goalWeek: string;
}

export interface MilestoneInput {
  today: string;
  weekStart: string;
  rank: { level: number; title: string };
  badges: { id: string; title: string; description: string; unlocked: boolean }[];
  freezes: number;
  todayHours: number;
  goalHours: number;
  goalWeekDone: boolean;
}

/** Reads a saved record defensively; anything odd counts as "nothing saved" so we just re-seed. */
export function normalizeSeen(raw: unknown): Seen | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Seen>;
  if (typeof r.rank !== 'number' || !Array.isArray(r.badges)) return null;
  return {
    rank: Math.max(1, Math.floor(r.rank)),
    badges: r.badges.filter((b): b is string => typeof b === 'string'),
    freezes: Number(r.freezes) > 0 ? Math.floor(Number(r.freezes)) : 0,
    goalDay: typeof r.goalDay === 'string' ? r.goalDay : '',
    goalWeek: typeof r.goalWeek === 'string' ? r.goalWeek : '',
  };
}

export function snapshot(i: MilestoneInput): Seen {
  return {
    rank: i.rank.level,
    badges: i.badges.filter((b) => b.unlocked).map((b) => b.id),
    freezes: i.freezes,
    goalDay: i.goalHours > 0 && i.todayHours >= i.goalHours ? i.today : '',
    goalWeek: i.goalWeekDone ? i.weekStart : '',
  };
}

export function detectMilestones(prev: Seen | null, i: MilestoneInput): { events: Celebration[]; next: Seen } {
  const now = snapshot(i);
  if (!prev) return { events: [], next: now };

  const events: Celebration[] = [];
  if (i.rank.level > prev.rank) {
    events.push({ kind: 'rank', title: i.rank.title, sub: 'You moved up a rank. Keep going!', mood: 'cheer' });
  }
  for (const b of i.badges) {
    if (b.unlocked && !prev.badges.includes(b.id)) events.push({ kind: 'badge', title: b.title, sub: b.description, mood: 'wow' });
  }
  if (now.freezes > prev.freezes) {
    events.push({ kind: 'freeze', title: 'Streak freeze earned', sub: 'It saves your streak if you miss a day.', mood: 'happy' });
  }
  if (now.goalDay && prev.goalDay !== now.goalDay) {
    events.push({ kind: 'goal', title: 'Daily goal reached', sub: 'Nice work. Today counts.', mood: 'proud' });
  }
  if (now.goalWeek && prev.goalWeek !== now.goalWeek) {
    events.push({ kind: 'week', title: 'Goal week complete', sub: 'You hit your weekly hours.', mood: 'cheer' });
  }

  // Never remember less than before: a rank or badge you earned stays earned, and the goal card shows once per day.
  const next: Seen = {
    rank: Math.max(prev.rank, now.rank),
    badges: [...new Set([...prev.badges, ...now.badges])],
    freezes: now.freezes,
    goalDay: now.goalDay || prev.goalDay,
    goalWeek: now.goalWeek || prev.goalWeek,
  };
  return { events, next };
}

/** A burst of many events at once (a restored backup, say) becomes one friendly card. */
export function squash(events: Celebration[]): Celebration[] {
  if (events.length <= 3) return events;
  return [{ kind: 'badge', title: `${events.length} new milestones`, sub: 'Open Rewards to see them all.', mood: 'wow' }];
}
