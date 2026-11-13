// Blip's brain. It is a small set of plain rules over your own data, with no AI model and no server:
// the same data always gives the same advice, and nothing leaves this device.
import type { BlipMood } from '../components/blip/Blip';
import type { TabType } from '../types';
import { addDays, startOfWeek } from './date';

export interface AssistantFacts {
  /** local hour, 0 to 23 */
  hour: number;
  goal: number;
  todayHours: number;
  streak: number;
  streakMin: number;
  freezes: number;
  fireToday: boolean;
  daysLogged: number;
  /** whole days since the last study log (0 = today), or null when nothing is logged */
  daysSinceLog: number | null;
  readyQuests: number;
  backlog: number;
  weakest: string | null;
  /** days since the weakest paper was last studied, or null when never */
  weakestDaysSince: number | null;
  /** days since the last mock test, or null when none */
  daysSinceMock: number | null;
  mocksPerWeek: number;
  hasPlan: boolean;
  daysLeft: number;
  phaseTitle: string;
  readinessCapped: boolean;
}

export interface Suggestion {
  id: string;
  mood: BlipMood;
  title: string;
  body: string;
  action?: { label: string; tab: TabType };
  /** higher goes first */
  weight: number;
}

const hrs = (h: number) => (Math.round(h * 10) / 10).toString().replace(/\.0$/, '');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function suggestions(f: AssistantFacts): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (s: Suggestion) => out.push(s);
  const toGoal = Math.max(0, f.goal - f.todayHours);
  const evening = f.hour >= 18;
  const lateNight = f.hour >= 23 || f.hour < 5;

  if (f.daysLeft < 0) {
    add({ id: 'exam-over', mood: 'happy', title: 'Your exam date has passed', body: 'Rest well. When you are ready for the next attempt, set a new exam date and I will reset the countdown.', action: { label: 'Set a new date', tab: 'SETTINGS' }, weight: 100 });
    return out;
  }

  if (f.daysLogged === 0) {
    add({ id: 'first-log', mood: 'wave', title: 'Log your first study session', body: 'It takes ten seconds. Pick a paper, set the hours and save. Everything else in the app builds on it.', action: { label: 'Open the study log', tab: 'LOG' }, weight: 95 });
  }

  if (f.readyQuests > 0) {
    add({ id: 'collect', mood: 'cheer', title: f.readyQuests === 1 ? 'A quest is ready to collect' : `${f.readyQuests} quests are ready to collect`, body: 'You finished them. Tap Collect to bank the XP before the day or week rolls over.', action: { label: 'Collect your XP', tab: 'GAMIFICATION' }, weight: 80 });
  }

  if (f.streak > 0 && !f.fireToday && f.todayHours < f.streakMin) {
    const need = f.streakMin - f.todayHours;
    if (evening) add({ id: 'streak-risk', mood: 'worry', title: `Your ${f.streak}-day streak needs ${hrs(need)}h tonight`, body: f.freezes ? `You have ${plural(f.freezes, 'freeze')} banked, so it would survive a miss. But ${hrs(need)} more hours keeps it clean.` : `Study ${hrs(need)} more hours before midnight to keep it alive.`, action: { label: 'Log study time', tab: 'LOG' }, weight: 90 });
    else add({ id: 'streak-today', mood: 'idle', title: `Keep your ${f.streak}-day streak going`, body: `${hrs(f.streakMin)} hours today counts as a streak day.`, action: { label: 'Log study time', tab: 'LOG' }, weight: 55 });
  }

  if (f.daysLogged > 0 && f.todayHours === 0 && f.daysSinceLog !== null && f.daysSinceLog >= 2) {
    add({ id: 'comeback', mood: 'happy', title: f.daysSinceLog >= 5 ? 'Welcome back' : 'A fresh start today', body: 'No guilt. One short session today starts the streak again, and that is the hardest part.', action: { label: 'Log a session', tab: 'LOG' }, weight: 70 });
  }

  if (f.todayHours > 0 && toGoal > 0 && !evening) {
    add({ id: 'to-goal', mood: 'idle', title: `${hrs(toGoal)}h to today's goal`, body: `You have done ${hrs(f.todayHours)} of ${hrs(f.goal)} hours. A steady block now gets you there.`, action: { label: 'Log study time', tab: 'LOG' }, weight: 50 });
  } else if (f.todayHours > 0 && toGoal > 0 && evening && f.fireToday) {
    add({ id: 'to-goal-eve', mood: 'idle', title: `${hrs(toGoal)}h left to hit your goal`, body: 'Your streak is safe. Finishing the goal earns bonus XP.', action: { label: 'Log study time', tab: 'LOG' }, weight: 45 });
  }

  if (f.todayHours >= f.goal) {
    add({ id: 'goal-met', mood: 'proud', title: 'Goal reached today', body: 'Nicely done. Any extra hours are bonus XP, or take the evening off. Both are fine.', weight: 40 });
  }

  if (f.backlog > 0) {
    add({ id: 'backlog', mood: 'think', title: `${plural(f.backlog, 'backlog item')} waiting`, body: 'Planned study from earlier days is still open. Clear the oldest one first, or move it to a new day.', action: { label: 'Open the schedule', tab: 'TARGETS' }, weight: 60 });
  }

  if (f.weakest && f.daysLogged >= 3 && (f.weakestDaysSince === null || f.weakestDaysSince >= 4)) {
    add({ id: 'weakest', mood: 'think', title: `${f.weakest} needs some love`, body: f.weakestDaysSince === null ? 'You have not logged it yet. Even one hour gives it a start.' : `Last studied ${plural(f.weakestDaysSince, 'day')} ago. An hour today earns the "give a paper an hour" quest too.`, action: { label: 'Log it now', tab: 'LOG' }, weight: 52 });
  }

  const mockGap = f.mocksPerWeek > 0 ? Math.floor(7 / f.mocksPerWeek) : 14;
  if (f.daysLogged >= 5 && f.phaseTitle !== 'Learn' && (f.daysSinceMock === null || f.daysSinceMock >= mockGap)) {
    add({ id: 'mock', mood: 'think', title: f.daysSinceMock === null ? 'Take your first mock test' : 'Time for a mock test', body: f.daysSinceMock === null ? 'A mock shows what study alone cannot. Log the score and I will use it in your readiness.' : `Your last mock was ${plural(f.daysSinceMock, 'day')} ago. In the ${f.phaseTitle} phase, aim for ${f.mocksPerWeek > 1 ? `${f.mocksPerWeek} a week` : 'one a week'}.`, action: { label: 'Log a mock', tab: 'MOCK' }, weight: 48 });
  }

  if (!f.hasPlan && f.daysLogged >= 1) {
    add({ id: 'plan', mood: 'think', title: 'Plan your syllabus once', body: 'Add your topics, then tap "Schedule my syllabus". I will spread them over your study days, so you never have to decide what to study.', action: { label: 'Set up the plan', tab: 'TARGETS' }, weight: 46 });
  }

  if (f.readinessCapped && f.daysLogged >= 7 && f.daysSinceMock === null && !out.some((s) => s.id === 'mock')) {
    add({ id: 'cap', mood: 'think', title: 'Your readiness is capped', body: 'It cannot pass 80 until you log a mock test.', action: { label: 'Log a mock', tab: 'MOCK' }, weight: 30 });
  }

  if (!out.length) {
    if (lateNight) add({ id: 'sleep', mood: 'sleepy', title: 'Time to rest', body: 'Sleep is part of the plan. Your brain files what you learned while you are asleep.', weight: 20 });
    else add({ id: 'steady', mood: 'happy', title: 'You are on track', body: `Nothing needs your attention. You are in the ${f.phaseTitle} phase with ${plural(f.daysLeft, 'day')} to go.`, weight: 10 });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** How Blip looks at rest, given the day so far. */
export function restingMood(f: AssistantFacts, top: Suggestion | undefined): BlipMood {
  if (f.hour >= 23 || f.hour < 5) return 'sleepy';
  if (top && (top.id === 'streak-risk' || top.id === 'goal-met' || top.id === 'collect')) return top.id === 'streak-risk' ? 'worry' : top.id === 'goal-met' ? 'proud' : 'happy';
  return 'idle';
}

/* ───────── Help ───────── */

export interface HelpEntry { id: string; q: string; a: string; keys: string[]; go?: { tab: TabType; label: string } }

export const HELP: HelpEntry[] = [
  { id: 'log', q: 'How do I log my study time?', keys: ['log', 'study', 'hours', 'add', 'record', 'session', 'time'], a: 'Open Study log (or tap the big button on the Overview). Pick a paper, a topic and the hours. A day can hold six sessions. Open any earlier date to fill it in.', go: { tab: 'LOG', label: 'Open the study log' } },
  { id: 'xp', q: 'How do I earn XP?', keys: ['xp', 'points', 'earn', 'score', 'experience'], a: 'Every hour studied is 10 XP (up to 12 hours a day). A goal day adds 40, a 10-hour day adds 60, and a mock is worth 20 to 80 depending on your score. Quests add more when you collect them.', go: { tab: 'GAMIFICATION', label: 'See your rewards' } },
  { id: 'streak', q: 'How does the fire streak work?', keys: ['streak', 'fire', 'flame', 'days in a row', 'consecutive'], a: 'A day counts when you study three quarters of your daily goal (at most 6 hours). Days in a row build the streak. Today stays pending until you get there, so it never breaks in the middle of the day.', go: { tab: 'GAMIFICATION', label: 'See your streak' } },
  { id: 'freeze', q: 'What is a streak freeze?', keys: ['freeze', 'frozen', 'snowflake', 'miss', 'missed', 'skip', 'lose'], a: 'Every 7 days in a row banks a freeze, up to two. If you miss a day, a freeze is used instead of resetting your streak. Planned rest days never break a streak either.', go: { tab: 'GAMIFICATION', label: 'See your freezes' } },
  { id: 'rest', q: 'How do I take a day off without losing my streak?', keys: ['rest', 'off', 'holiday', 'break', 'sunday', 'weekend', 'leave'], a: 'In Settings, under Profile, pick your rest days. They never break a streak and they lower the hours a goal week asks for. For a one-off day, add it under "Days you will not study" in Schedule.', go: { tab: 'SETTINGS', label: 'Open Settings' } },
  { id: 'readiness', q: 'What is the readiness score?', keys: ['readiness', 'ready', 'prepared', 'preparation', 'score', 'percent', 'exam ready'], a: 'It is one number from 0 to 100: your recent study pace (25%), how steady your days are (15%), your last three mocks (30%) and how much of each paper you have covered (30%). Without any mock it cannot pass 80.', go: { tab: 'DASHBOARD', label: 'Go to the Overview' } },
  { id: 'rank', q: 'How do ranks work?', keys: ['rank', 'level', 'title', 'tier', 'legend', 'ladder'], a: 'Ranks come from your XP. The ladder is scaled to your exam date and daily goal, so the top rank is within reach of your own plan. A rank you reach is never taken away, even if you change the exam date.', go: { tab: 'GAMIFICATION', label: 'See the rank ladder' } },
  { id: 'quests', q: 'What are quests?', keys: ['quest', 'daily', 'weekly', 'collect', 'challenge', 'mission'], a: 'Small goals that reset every day and every week, like reaching your goal or giving your weakest paper an hour. When one is done, press Collect to bank its XP.', go: { tab: 'GAMIFICATION', label: 'Open quests' } },
  { id: 'goalweek', q: 'What is a goal week?', keys: ['goal week', 'weekly', 'week', 'elite', 'target'], a: 'A week from Monday to Sunday where your total hours reach your daily goal for five days. Goal weeks in a row build a streak. The week in progress never breaks it.', go: { tab: 'GAMIFICATION', label: 'See goal weeks' } },
  { id: 'plan', q: 'How do I plan my syllabus?', keys: ['plan', 'syllabus', 'schedule', 'topics', 'chapters', 'timetable', 'organise', 'organize'], a: 'Open Plan, add your topics (or import them from Excel), then tap "Schedule my syllabus". I will spread the topics over your study days, with papers taking turns and Sundays respected.', go: { tab: 'TARGETS', label: 'Open the schedule' } },
  { id: 'excel', q: 'Can I import my topics from Excel?', keys: ['excel', 'import', 'xlsx', 'spreadsheet', 'file', 'template', 'upload'], a: 'Yes. In Plan, choose Import from Excel. The sheet needs the columns Subject, Topic and Target_Hrs. "Get the template" gives you a ready-made file.', go: { tab: 'TARGETS', label: 'Open the schedule' } },
  { id: 'backlog', q: 'What is the backlog?', keys: ['backlog', 'overdue', 'pending', 'missed', 'behind', 'catch up'], a: 'Anything you planned for a past day and did not finish. It appears on the Plan screen. Mark it done when you catch up, or move it to a new day.', go: { tab: 'TARGETS', label: 'Open the schedule' } },
  { id: 'pace', q: 'Am I on pace for my exam?', keys: ['pace', 'behind', 'ahead', 'track', 'compare', 'planned', 'actual'], a: 'Plan vs actual compares the hours you studied with what your plan needs, paper by paper, and tells you how many hours a day you need from here.', go: { tab: 'TARGET_ANALYSIS', label: 'Open Plan vs actual' } },
  { id: 'mock', q: 'How do I log a mock test?', keys: ['mock', 'test', 'marks', 'paper', 'result', 'exam', 'score'], a: 'Open Mocks, pick the paper, set your marks with the dial or type them, and save. 70% and above is Excellent, 50 to 69 is a Pass, 40 to 49 is Borderline.', go: { tab: 'MOCK', label: 'Log a mock' } },
  { id: 'pass', q: 'What are the pass rules?', keys: ['pass', 'fail', 'passing', '40', '50', 'aggregate', 'criteria', 'set off'], a: 'You need at least 40% in every paper and 50% overall in each group. The Analysis tab under Mocks shows your odds, paper by paper.', go: { tab: 'MOCK_DASHBOARD', label: 'See your pass odds' } },
  { id: 'marks', q: 'Where do I set the marks I want to score?', keys: ['target marks', 'manifest', 'manifestation', 'goal marks', 'want', 'aim'], a: 'Mocks has a Target marks tab. Set a target for every paper and it shows what it takes to pass and how far your mocks are from it.', go: { tab: 'MANIFESTATION', label: 'Set target marks' } },
  { id: 'backup', q: 'How do I back up my data or move to a new phone?', keys: ['backup', 'back up', 'restore', 'export', 'download', 'move', 'transfer', 'phone', 'device', 'save', 'lose'], a: 'Everything is stored on this device only. In Settings, download a backup file now and then. To move, open the app on the new device and restore that file in Settings.', go: { tab: 'SETTINGS', label: 'Open Settings' } },
  { id: 'exam', q: 'How do I change my exam date or daily goal?', keys: ['exam date', 'date', 'goal', 'daily goal', 'countdown', 'change', 'attempt'], a: 'Both are in Settings, under Profile. The countdown, readiness phase and ranks all follow them.', go: { tab: 'SETTINGS', label: 'Open Settings' } },
  { id: 'theme', q: 'Can I change the colours?', keys: ['colour', 'color', 'theme', 'accent', 'look', 'dark', 'style'], a: 'Settings, under Look and feel, has six accent colours. The whole app, and I, change colour with it.', go: { tab: 'SETTINGS', label: 'Open Settings' } },
  { id: 'sound', q: 'How do I turn off sounds or animations?', keys: ['sound', 'mute', 'chime', 'animation', 'motion', 'reduce', 'quiet', 'noise'], a: 'Settings has a switch for sounds and one for reduced motion. If your device already asks for reduced motion, the app follows it.', go: { tab: 'SETTINGS', label: 'Open Settings' } },
  { id: 'offline', q: 'Does it work offline? Can I install it?', keys: ['offline', 'install', 'app', 'internet', 'wifi', 'pwa', 'home screen'], a: 'Yes. After the first load it works without internet. Use your browser menu and choose Install app (or Add to Home Screen) to get its own icon.' },
  { id: 'level', q: 'How do I switch between Foundation, Inter and Final?', keys: ['level', 'foundation', 'inter', 'intermediate', 'final', 'group', 'papers', 'switch'], a: 'Settings, under Exam and papers. Each level keeps its own study days, mocks and plan, so nothing is lost when you switch.', go: { tab: 'SETTINGS', label: 'Open Settings' } },
  { id: 'reset', q: 'How do I delete my data?', keys: ['delete', 'reset', 'clear', 'wipe', 'erase', 'remove', 'start over'], a: 'Settings has a Danger zone at the bottom. It clears one level at a time, and asks you to confirm. Download a backup first if you might want it back.', go: { tab: 'SETTINGS', label: 'Open Settings' } },
  { id: 'blip', q: 'Who are you, Blip? Are you an AI?', keys: ['blip', 'who', 'ai', 'chatbot', 'assistant', 'mascot', 'robot', 'you'], a: 'I am the dot on your study radar, brought to life. I am not an AI chatbot: I follow simple rules and look only at your data on this device. Ask me short questions, or tap "What should I do now?"' },
  { id: 'tour', q: 'Can I see the tour again?', keys: ['tour', 'tutorial', 'guide', 'show me', 'walkthrough', 'help', 'learn', 'replay'], a: 'Of course. I will walk you through the app one step at a time. It takes about two minutes.' },
];

const STOP = new Set(['the', 'and', 'for', 'how', 'can', 'what', 'does', 'did', 'where', 'why', 'when', 'who', 'are', 'you', 'this', 'that', 'with', 'from', 'have', 'has', 'was', 'not', 'but', 'its', 'any', 'get', 'got', 'into', 'about', 'there', 'they', 'them', 'will', 'would', 'should', 'could', 'make', 'want', 'need', 'use', 'using', 'please', 'tell', 'show', 'work', 'works']);
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '');

export function searchHelp(query: string, limit = 4): HelpEntry[] {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  if (!q) return [];
  const words = [...new Set(q.split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem))].filter(Boolean);
  if (!words.length) return [];
  const scored = HELP.map((h) => {
    const keys = h.keys.map((k) => k.toLowerCase());
    const qq = h.q.toLowerCase();
    const aa = h.a.toLowerCase();
    let score = 0;
    if (qq.includes(q)) score += 8;
    for (const k of keys) if (q.includes(k) && k.length > 3) score += 4;
    for (const w of words) {
      if (keys.some((k) => k === w || stem(k) === w || k.split(/\s+/).map(stem).includes(w))) score += 3;
      if (qq.includes(w)) score += 2;
      if (aa.includes(w)) score += 1;
    }
    return { h, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.h);
}

/* ───────── One line of advice the first time you open a screen ───────── */
export const TIPS: Partial<Record<TabType, string>> = {
  DASHBOARD: 'This is your home base. Check the ring, then collect any quests.',
  LOG: 'Pick a paper, set the hours, save. A day can hold six sessions.',
  MOCK: 'Set your marks with the dial. Every mock earns XP, more for a higher score.',
  MOCK_DASHBOARD: 'This shows your pass odds, paper by paper. Aim for 40% or more in each.',
  MANIFESTATION: 'Write the marks you want. I will show what it takes to pass.',
  TARGETS: 'Add topics once, then tap "Schedule my syllabus". I will plan every day for you.',
  TARGET_ANALYSIS: 'This compares what you planned with what you did, paper by paper.',
  CHARTS: 'Your hours over time. Switch the range at the top to zoom in.',
  WEEKLY: 'Each square is a day. Brighter means more hours. Tap one for details.',
  SUBJECTS: 'See which papers get your time, and which are being neglected.',
  GAMIFICATION: 'Collect finished quests here. Freezes protect your streak.',
  SETTINGS: 'Set your exam date and daily goal first. Then download a backup now and then.',
};

/**
 * A short look back at last week, shown once at the start of a new week (Monday or Tuesday).
 * Returns null when there is nothing to say, so a quiet week never gets a recap.
 */
export function weeklyRecap(dailyTotals: Record<string, number>, today: string, weekTarget: number, weekday: number): { week: string; text: string; mood: BlipMood } | null {
  if (weekday !== 1 && weekday !== 2) return null;
  const thisWeek = startOfWeek(today);
  const prev = addDays(thisWeek, -7);
  let hours = 0, days = 0;
  for (let i = 0; i < 7; i++) { const h = dailyTotals[addDays(prev, i)] || 0; if (h > 0) { hours += h; days++; } }
  if (hours <= 0) return null;
  const h = Math.round(hours * 10) / 10;
  const hit = weekTarget > 0 && hours >= weekTarget;
  return {
    week: thisWeek,
    text: `Last week: ${h}h over ${days} ${days === 1 ? 'day' : 'days'}. ${hit ? 'You hit your weekly goal. Keep it going!' : 'A fresh week starts now. Let’s beat it.'}`,
    mood: hit ? 'proud' : 'happy',
  };
}
