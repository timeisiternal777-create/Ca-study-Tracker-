// Shared domain types. Storage layout is documented in README.md ("Data & storage").

export type Level = 'foundation' | 'inter' | 'final';
export type GroupId = 'group1' | 'group2' | 'both';
/** Per-subject colour keys. CSS: `.acc-<accent>` sets `--ac` / `--ac-rgb`. */
export type Accent = 'cyan' | 'violet' | 'gold' | 'ember' | 'mint' | 'rose';
/** App-wide colour theme (sets `data-accent` on <html>). */
export type ThemeId = 'aurora' | 'violet' | 'ember' | 'gold' | 'mint' | 'rose';

export interface SubjectConfig {
  id: string;
  name: string;
  abbrev: string;
  paperNumber: number;
  group: GroupId;
  marks: number;
  accent: Accent;
}

export interface SubjectMeta {
  abbrev: string;
  accent: Accent;
  /** CSS colour value, e.g. `var(--c-cyan)` */
  color: string;
}

/**
 * One study day. A day holds up to six subject slots (the first three always exist, slots 4 to 6 only when used).
 * One slot per subject: studying the same subject twice in a day adds to its slot. `id` === `date` (YYYY-MM-DD, local time).
 */
export interface DailyStudyLog {
  id: string;
  date: string;
  subject1: string; topic1: string; hours1: number; targetHours1?: number;
  subject2: string; topic2: string; hours2: number; targetHours2?: number;
  subject3: string; topic3: string; hours3: number; targetHours3?: number;
  subject4?: string; topic4?: string; hours4?: number; targetHours4?: number;
  subject5?: string; topic5?: string; hours5?: number; targetHours5?: number;
  subject6?: string; topic6?: string; hours6?: number; targetHours6?: number;
  createdAt?: number;
}

export interface MockLogEntry {
  id: string;
  date: string;
  subject: string;
  marks: number;
  notes: string;
}

export interface UserSettings {
  onboardingCompleted: boolean;
  dailyGoalHours: number;
  /** YYYY-MM-DD; the countdown runs to 2 PM on this day. */
  targetExamDate: string;
  displayName: string;
  /** Hours studied before using the app, per subject name. */
  pastHours: Record<string, number>;
  /** UI sound effects. */
  hudChimes: boolean;
  /** 0-100. Defaults to 80. */
  sfxVolume?: number;
  /** Which set of sounds to use. Defaults to soft. */
  sfxKit?: 'soft' | 'glass' | 'voyage' | 'lantern';
  /** The kit to go back to when a themed world (Voyage or Lanternfell) is switched off again: each brings its own kit. */
  sfxKitBefore?: 'soft' | 'glass';
  /** Look and page shape of the PDF reports */
  reportTheme?: 'night' | 'sky' | 'paper';
  reportPage?: 'tablet' | 'a4';
  /** full: every control has a sound. light: only switches, confirmations, notices and rewards. */
  sfxLevel?: 'full' | 'light';
  /** Short vibration on phones that support it. Defaults to on. */
  haptics?: boolean;
  /** Notify when Beast mode (10 h+) is reached. */
  beastNotifs: boolean;
  accent?: ThemeId;
  reduceMotion?: boolean;
  /** How much the background and interface may move on their own. Auto lowers it on a device that drops frames. Default auto. */
  motionLevel?: 'auto' | 'full' | 'calm';
  /** Optional look and story for the whole app. 'voyage' is the Ledger Seas journey, 'academy' is Lanternfell, the school of magic. Default 'default'. */
  worldTheme?: 'default' | 'voyage' | 'academy';
  /** The interface: 'ios' (springs, glass bars, sheets you drag away) or 'classic', the look before v6. Default 'ios'. */
  ui?: 'ios' | 'classic';
  /** How clear or tinted the glass is, 0 (clear) to 100 (tinted). Default 55. */
  glass?: number;
  /** The everyday wallpaper: 'day' follows the hour of the day, 'night' stays on the night sky. The worlds keep their own. Default 'day'. */
  wallpaper?: 'day' | 'night';
  /** In a themed world, keep the everyday words (Overview, Study log...) instead of the themed ones. */
  plainWords?: boolean;
  /** Weekdays that are planned rest days (0 = Sunday … 6 = Saturday). They never break a streak. */
  restDays?: number[];
  /** How much Blip speaks up: full tips, quiet (only when asked), or hidden. */
  blipMode?: 'full' | 'quiet' | 'off';
  /** Study timer: keep the screen awake while it runs. Defaults to on. */
  timerWakeLock?: boolean;
  /** Study timer: a short message and soft sound at 10, 25, 45 and 60 minutes. Defaults to on. */
  timerNudges?: boolean;
  /** Study timer: a soft chime every this many minutes while it runs. 0 is off (the default). */
  timerChime?: 0 | 15 | 25 | 30 | 45 | 60;
}

/** Rewards state that cannot be worked out from the logs: collected quests and the never-drop rank floor. */
export interface GameState {
  /** Highest rank index ever reached. The rank shown never falls below it. */
  rankFloor: number;
  /** quest key → XP collected */
  claims: Record<string, number>;
}

export type TabType =
  | 'DASHBOARD' | 'LOG' | 'MOCK' | 'MOCK_DASHBOARD' | 'GAMIFICATION' | 'WEEKLY'
  | 'CHARTS' | 'SUBJECTS' | 'TARGETS' | 'TARGET_ANALYSIS' | 'MANIFESTATION' | 'SETTINGS' | 'VOYAGE' | 'GROUNDS';

export interface RankStep { title: string; minXP: number }

export interface RankInfo {
  /** 1-based tier number */
  level: number;
  title: string;
  /** 0–100 progress inside the current tier */
  progress: number;
  minXP: number;
  nextTitle: string;
  nextMin: number;
  isMax: boolean;
  /** true when the rank shown is held by the never-drop floor (XP alone would be lower) */
  held: boolean;
}

export interface ReadinessPart {
  id: 'pace' | 'consistency' | 'mocks' | 'coverage';
  label: string;
  /** 0–100, or null when there is nothing to measure yet */
  score: number | null;
  /** share of the total score, in percent */
  weight: number;
  note: string;
}

export interface Readiness {
  /** 0–100 */
  score: number;
  label: string;
  accent: 'rose' | 'gold' | 'cyan' | 'mint';
  parts: ReadinessPart[];
  /** false until anything has been logged */
  started: boolean;
  /** true when no mock has been logged, so the score is capped */
  capped: boolean;
}

export interface StudyStats {
  /** logs + past hours */
  totalStudiedHours: number;
  /** logs only */
  loggedHours: number;
  pastHours: number;
  /** hours per subject name (logs + past hours) */
  subjectHours: Record<string, number>;
  /** number of logged sessions per subject name */
  subjectSessionCount: Record<string, number>;
  /** date → total hours for that day */
  dailyTotals: Record<string, number>;
  daysLogged: number;
  todayHours: number;
  /** Monday-to-today */
  weekHours: number;
  last7Avg: number;
  bestDayHours: number;
  bestDayDate: string | null;
  currentFireStreak: number;
  maxStreak: number;
  /** hours a day needs to reach to count as a streak day (follows the daily goal) */
  streakMin: number;
  /** streak freezes in the bank (0–2) */
  freezes: number;
  /** days a freeze saved the streak, oldest first */
  frozenDays: string[];
  /** consecutive weeks that reached the weekly goal */
  goalWeekStreak: number;
  /** this week against the weekly goal */
  goalWeek: { hours: number; target: number; done: boolean };
  /** whether today already counts towards the fire streak */
  fireToday: boolean;
  beastDays: number;
  goalDays: number;
  totalXP: number;
  xpBreakdown: { hours: number; goal: number; beast: number; mocks: number; quests: number };
  rankInfo: RankInfo;
  /** rank thresholds, scaled to the time left before the exam */
  ladder: RankStep[];
  readiness: Readiness;
}

export interface BackupPayload {
  appSignature: 'ca-study-tracker-v3';
  schema: number;
  backupDate: string;
  level: Level;
  settings: UserSettings;
  studyLogs: DailyStudyLog[];
  mockScores: MockLogEntry[];
  /** Raw localStorage entries for every level (targets, manifest, plan settings…). */
  storage?: Record<string, string>;
}
