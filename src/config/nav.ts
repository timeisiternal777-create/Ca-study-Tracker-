import type { IconType } from 'react-icons';
import {
  LuLayoutDashboard, LuNotebookPen, LuClipboardCheck, LuActivity, LuTrophy, LuGrid3X3, LuChartLine,
  LuLibraryBig, LuTarget, LuGitCompareArrows, LuSparkles, LuSettings, LuListChecks, LuChartNoAxesCombined, LuCompass, LuCastle,
} from 'react-icons/lu';
import {
  IoGrid, IoGridOutline, IoCompass, IoCompassOutline, IoJournal, IoJournalOutline, IoClipboard, IoClipboardOutline, IoCalendar, IoCalendarOutline,
  IoStatsChart, IoStatsChartOutline, IoTrophy, IoTrophyOutline, IoSettings, IoSettingsOutline, IoEllipsisHorizontalCircle, IoEllipsisHorizontalCircleOutline,
  IoSchool, IoSchoolOutline,
} from 'react-icons/io5';
import type { TabType } from '../types';
import type { World } from '../world/words';

/** A screen. Each one keeps its own address (`#/log`), so old links and bookmarks keep working. */
export interface NavItem { id: TabType; slug: string; label: string; hint: string; icon: IconType }

const item = (id: TabType, slug: string, label: string, hint: string, icon: IconType): NavItem => ({ id, slug, label, hint, icon });

export const ALL_NAV: NavItem[] = [
  item('DASHBOARD', 'overview', 'Overview', 'Countdown, today, readiness and quests', LuLayoutDashboard),
  item('LOG', 'log', 'Study log', 'Log hours by day and subject', LuNotebookPen),
  item('MOCK', 'mock', 'Log a mock', 'Record a mock test score', LuClipboardCheck),
  item('MOCK_DASHBOARD', 'mock-analysis', 'Analysis', 'Pass chances and trends', LuActivity),
  item('MANIFESTATION', 'manifest', 'Target marks', 'Set the marks you will score', LuSparkles),
  item('TARGETS', 'targets', 'Schedule', 'Your study schedule and backlog', LuTarget),
  item('TARGET_ANALYSIS', 'plan', 'Plan vs actual', 'How you are tracking against plan', LuGitCompareArrows),
  item('CHARTS', 'analytics', 'Trends', 'Hours, subjects and trends', LuChartLine),
  item('WEEKLY', 'heatmap', 'Heatmap', 'Study intensity by day', LuGrid3X3),
  item('SUBJECTS', 'subjects', 'Papers', 'Coverage and balance by paper', LuLibraryBig),
  item('GAMIFICATION', 'rewards', 'Rewards', 'Quests, streaks, ranks and badges', LuTrophy),
  item('SETTINGS', 'settings', 'Settings', 'Profile, level, backup and sound', LuSettings),
  item('VOYAGE', 'sea', 'Sea chart', 'Your journey from Foundation to the Golden Ledger', LuCompass),
  item('GROUNDS', 'grounds', 'The Grounds', 'Your school grounds: one building per paper, and the house you were chosen for', LuCastle),
];
export const NAV_BY_ID = Object.fromEntries(ALL_NAV.map((n) => [n.id, n])) as Record<TabType, NavItem>;
export const NAV_BY_SLUG = Object.fromEntries(ALL_NAV.map((n) => [n.slug, n])) as Record<string, NavItem>;

/** What the menus show: seven places, with related screens grouped as tabs inside one of them. */
export interface Section { id: string; label: string; short: string; hint: string; icon: IconType; tabs: TabType[]; /** Shown only while this world is on (the screen is the world's own). */ world?: World }

export const SECTIONS: Section[] = [
  { id: 'home', label: 'Overview', short: 'Home', hint: 'Countdown, today, readiness and quests', icon: LuLayoutDashboard, tabs: ['DASHBOARD'] },
  { id: 'voyage', label: 'Sea chart', short: 'Sea', hint: 'Your journey from Foundation to the Golden Ledger (Voyage theme)', icon: LuCompass, tabs: ['VOYAGE'], world: 'voyage' },
  { id: 'grounds', label: 'The Grounds', short: 'Grounds', hint: 'Your school grounds and house (Lanternfell theme)', icon: LuCastle, tabs: ['GROUNDS'], world: 'academy' },
  { id: 'log', label: 'Study log', short: 'Log', hint: 'Log hours by day and subject', icon: LuNotebookPen, tabs: ['LOG'] },
  { id: 'mocks', label: 'Mocks', short: 'Mocks', hint: 'Log mock tests, see the analysis, set target marks', icon: LuClipboardCheck, tabs: ['MOCK', 'MOCK_DASHBOARD', 'MANIFESTATION'] },
  { id: 'plan', label: 'Plan', short: 'Plan', hint: 'Your schedule, backlog and pace', icon: LuListChecks, tabs: ['TARGETS', 'TARGET_ANALYSIS'] },
  { id: 'insights', label: 'Insights', short: 'Insights', hint: 'Trends, heatmap and papers', icon: LuChartNoAxesCombined, tabs: ['CHARTS', 'WEEKLY', 'SUBJECTS'] },
  { id: 'rewards', label: 'Rewards', short: 'Rewards', hint: 'Quests, streaks, ranks and badges', icon: LuTrophy, tabs: ['GAMIFICATION'] },
  { id: 'settings', label: 'Settings', short: 'Settings', hint: 'Profile, level, backup and sound', icon: LuSettings, tabs: ['SETTINGS'] },
];
export const SECTION_BY_TAB = Object.fromEntries(SECTIONS.flatMap((s) => s.tabs.map((t) => [t, s]))) as Record<TabType, Section>;

/** The four sections pinned to the phone bottom bar (the rest live under "More"). */
export const BOTTOM_SECTIONS = ['home', 'log', 'mocks', 'plan'];
/** In a themed world its own screen takes a place on the bar and the plan moves under "More". */
export const BOTTOM_SECTIONS_VOYAGE = ['home', 'log', 'voyage', 'mocks'];
export const BOTTOM_SECTIONS_ACADEMY = ['home', 'log', 'grounds', 'mocks'];

/** The sections the menus list in a world: the seven everyday ones plus the world's own screen, if it has one. */
export const sectionsFor = (world: World): Section[] => SECTIONS.filter((s) => !s.world || s.world === world);
/** The sections pinned to the phone bar in a world. */
export const bottomFor = (world: World): string[] => (world === 'voyage' ? BOTTOM_SECTIONS_VOYAGE : world === 'academy' ? BOTTOM_SECTIONS_ACADEMY : BOTTOM_SECTIONS);

/** The iOS look draws menu icons as an outline that fills in when its screen is the current one (like SF Symbols on a tab bar). */
const IOS_ICONS: Record<string, { on: IconType; off: IconType }> = {
  home: { on: IoGrid, off: IoGridOutline },
  voyage: { on: IoCompass, off: IoCompassOutline },
  grounds: { on: IoSchool, off: IoSchoolOutline },
  log: { on: IoJournal, off: IoJournalOutline },
  mocks: { on: IoClipboard, off: IoClipboardOutline },
  plan: { on: IoCalendar, off: IoCalendarOutline },
  insights: { on: IoStatsChart, off: IoStatsChartOutline },
  rewards: { on: IoTrophy, off: IoTrophyOutline },
  settings: { on: IoSettings, off: IoSettingsOutline },
  more: { on: IoEllipsisHorizontalCircle, off: IoEllipsisHorizontalCircleOutline },
};

/** The icon a menu shows for a section: the classic outline, or in the iOS look an outline that fills in when it is current. */
export function sectionIcon(s: { id: string; icon: IconType }, ios: boolean, active: boolean): IconType {
  const pair = ios ? IOS_ICONS[s.id] : undefined;
  return pair ? (active ? pair.on : pair.off) : s.icon;
}
export const moreIcon = (ios: boolean, active: boolean): IconType => (active ? IOS_ICONS.more.on : IOS_ICONS.more.off);
