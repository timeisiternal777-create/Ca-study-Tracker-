import type { BlipMood } from '../../components/blip/Blip';
import type { TabType } from '../../types';

export interface TourStep {
  id: string;
  /** screen to open first */
  tab: TabType;
  /** CSS selector of the thing to point at. The first visible match is used. No target means a centred card. */
  target?: string;
  title: string;
  body: string;
  mood: BlipMood;
  /** where the card goes relative to the target */
  place?: 'auto' | 'right' | 'below' | 'above';
}

const t = (name: string) => `[data-tour="${name}"]`;

/** One small idea per step, in plain words. */
export const TOUR: TourStep[] = [
  { id: 'hello', tab: 'DASHBOARD', mood: 'wave', title: 'Hi, I’m Blip!', body: 'I’m the dot on your study radar. I’ll show you around, one small step at a time. It takes about two minutes, and you can stop whenever you like.' },
  { id: 'today', tab: 'DASHBOARD', target: t('hero-dial'), mood: 'happy', place: 'auto', title: 'This is your day', body: 'The ring fills as you study. When it closes, you’ve reached your daily goal. The clock on the left counts down to your exam.' },
  { id: 'log', tab: 'DASHBOARD', target: t('log-cta'), mood: 'cheer', place: 'below', title: 'Log time here', body: 'After each study session, tap this button, pick the paper and the hours. It takes ten seconds, and the whole app updates.' },
  { id: 'ready', tab: 'DASHBOARD', target: t('readiness'), mood: 'think', place: 'auto', title: 'Your readiness', body: 'One number from 0 to 100. It looks at how steady your study is, how your mock tests are going, and how much of each paper you’ve covered.' },
  { id: 'quests', tab: 'DASHBOARD', target: t('quests'), mood: 'happy', place: 'auto', title: 'Small quests', body: 'Three tiny goals a day. When one is finished, press Collect to bank the XP. They reset at midnight.' },
  { id: 'streaks', tab: 'DASHBOARD', target: t('streaks'), mood: 'proud', place: 'below', title: 'Streaks and ranks', body: 'Study most days to build a fire streak. Miss a day? A freeze, earned every 7 days, saves it. Your XP builds your rank.' },
  { id: 'nav', tab: 'DASHBOARD', target: t('nav'), mood: 'idle', place: 'auto', title: 'Everything in a few places', body: 'The whole app lives in these places. Related screens, like mock scores and mock analysis, sit together as tabs inside one place.' },
  { id: 'logscreen', tab: 'LOG', target: t('log-form'), mood: 'idle', place: 'auto', title: 'The study log', body: 'Pick a day, then add up to six sessions with a paper, a topic and the hours. You can fill in earlier days too, and Undo is always there.' },
  { id: 'mocks', tab: 'MOCK', target: t('section-tabs'), mood: 'think', place: 'below', title: 'Tabs inside a place', body: 'Mocks has three tabs: log a score, see the analysis, and set the marks you want. Tap a tab to switch.' },
  { id: 'plan', tab: 'TARGETS', target: `${t('schedule-syllabus')}, ${t('plan-start')}`, mood: 'wow', place: 'auto', title: 'Plan once, then just study', body: 'Add your topics, or import them from Excel, then tap “Schedule my syllabus”. I’ll spread them over your study days, so you never have to decide what to study.' },
  { id: 'rewards', tab: 'GAMIFICATION', target: t('rewards-hero'), mood: 'proud', place: 'auto', title: 'Your rewards', body: 'Ranks, quests, streak freezes and badges live here. Nothing can be bought. Everything is earned by studying.' },
  { id: 'backup', tab: 'SETTINGS', target: t('backup'), mood: 'idle', place: 'auto', title: 'Keep your data safe', body: 'Everything is stored on this device only. Download a backup now and then, and you can restore it on any device.' },
  { id: 'done', tab: 'DASHBOARD', mood: 'cheer', title: 'You’re all set!', body: 'I’ll wait in the corner. Tap me any time to ask what to do next, or to search for help. You can drag me to the other side too.' },
];
