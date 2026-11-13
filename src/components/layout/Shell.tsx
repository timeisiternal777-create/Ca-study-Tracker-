import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import { LuBell, LuCircleHelp, LuEllipsis, LuSparkles } from 'react-icons/lu';
import { NAV_BY_ID, SECTIONS, SECTION_BY_TAB, bottomFor, moreIcon, sectionIcon, sectionsFor, type Section } from '../../config/nav';
import { BRAND, useWorld } from '../../world';
import { WorldMark } from '../../world/WorldMark';
import { TABS, prefetchTabs } from '../../features/registry';
import { navigateTo, recallTab, rememberTab, useRoute } from '../../lib/nav';
import { pendingBacklogCount } from '../../lib/backlog';
import { reminderDismissed, scheduleNinePmReminder } from '../../lib/reminders';
import { KEYS, writeRaw } from '../../lib/storage';
import { fmtInt } from '../../lib/format';
import { usePageTitle } from '../../lib/pageTitle';
import { useIos } from '../../lib/ui';
import { configureMotion } from '../../lib/motion';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { Button, Modal, Skeleton } from '../ui';
import { SectionTabs } from './SectionTabs';
import { useSlider } from './useSlider';
import GuideModal from '../../features/guide/GuideModal';
import { AssistantLayer } from '../../features/assistant';
import { TimerPill } from '../../features/timer/TimerLayer';
import { Celebrations } from '../game/Celebrations';
import { askAssistant } from '../../features/assistant/state';
import type { TabType } from '../../types';

function usePendingBacklog(suffix: string) {
  const [n, setN] = useState(() => pendingBacklogCount(suffix));
  useEffect(() => {
    const update = () => setN(pendingBacklogCount(suffix));
    update();
    window.addEventListener('backlog_changed', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('backlog_changed', update); window.removeEventListener('storage', update); };
  }, [suffix]);
  return n;
}

/** Tells the topbar when XP goes up, so the pill can bump and show a floating +N. */
function useXpGain(total: number, key: string) {
  const last = useRef({ key, total });
  const [gain, setGain] = useState<{ n: number; id: number } | null>(null);
  useEffect(() => {
    const l = last.current; last.current = { key, total };
    const d = total - l.total;
    if (l.key !== key || d <= 0 || d > 1500) return;
    setGain({ n: Math.round(d), id: Date.now() });
    const t = window.setTimeout(() => setGain(null), 1700);
    return () => window.clearTimeout(t);
  }, [total, key]);
  return gain;
}

function go(tab: TabType) { navigateTo(tab); }
/** Open a section on the tab you last used in it. */
function goSection(s: Section) { go(recallTab(s.id) ?? s.tabs[0]); }

function NavButton({ section, active, badge }: { section: Section; active: boolean; badge?: number }) {
  const ios = useIos();
  const Icon = sectionIcon(section, ios, active);
  const { words } = useWorld();
  const label = words.section(section).label;
  return (
    <button type="button" className="nav-item" aria-current={active ? 'page' : undefined} onClick={() => goSection(section)} data-tour={`nav-${section.id}`}>
      <Icon aria-hidden />
      <span>{label}</span>
      {badge ? <span className="nav-badge" aria-label={`${badge} pending`}>{badge}</span> : null}
    </button>
  );
}

function Sidebar({ tab, backlog }: { tab: TabType; backlog: number }) {
  const { levelLabel, groupLabel } = useLevelConfig();
  const { settings } = useStudy();
  const { world } = useWorld();
  const name = settings.displayName || 'Student';
  const cur = SECTION_BY_TAB[tab];
  const { ref, box, ready } = useSlider<HTMLElement>([tab, world]);
  const main = sectionsFor(world).filter((s) => s.id !== 'settings');
  const settingsSection = SECTIONS.find((s) => s.id === 'settings')!;
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <WorldMark world={world} className="brand-mark" />
        <div>
          <div className="brand-name">{BRAND[world]}</div>
          <div className="brand-sub">{levelLabel}</div>
        </div>
      </div>
      <nav ref={ref} className="nav-main" data-tour="nav">
        {box && cur.id !== 'settings' ? <i className={`nav-glide${ready ? ' is-ready' : ''}`} style={{ height: box.h, transform: `translateY(${box.y}px)` }} aria-hidden /> : null}
        {main.map((s) => <NavButton key={s.id} section={s} active={cur.id === s.id} badge={s.id === 'plan' ? backlog : undefined} />)}
      </nav>
      <div className="sidebar-foot">
        <NavButton section={settingsSection} active={cur.id === 'settings'} />
        <button type="button" className="profile-chip" onClick={() => go('SETTINGS')} aria-label="Open profile settings">
          <span className="avatar">{name.trim().charAt(0).toUpperCase()}</span>
          <span className="min-0">
            <span className="t-small fw-6 truncate" style={{ display: 'block' }}>{name}</span>
            <span className="t-xs dim truncate" style={{ display: 'block' }}>{groupLabel}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ tab, backlog, onMore }: { tab: TabType; backlog: number; onMore: () => void }) {
  const cur = SECTION_BY_TAB[tab];
  const { world, words } = useWorld();
  const pinned = bottomFor(world);
  const moreActive = !pinned.includes(cur.id);
  const ios = useIos();
  const MoreIcon = ios ? moreIcon(ios, moreActive) : LuEllipsis;
  const { ref, box, ready } = useSlider<HTMLElement>([tab, world]);
  return (
    <nav className="bottom-nav" aria-label="Main navigation" ref={ref} data-tour="nav">
      {box ? <i className={`bn-glide${ready ? ' is-ready' : ''}`} style={{ width: box.w, transform: `translateX(${box.x}px)` }} aria-hidden /> : null}
      {pinned.map((id) => {
        const s = SECTIONS.find((x) => x.id === id)!; const Icon = sectionIcon(s, ios, cur.id === id);
        return (
          <button key={id} type="button" className="bn-item" aria-current={cur.id === id ? 'page' : undefined} onClick={() => goSection(s)}>
            <Icon aria-hidden /><span>{words.section(s).short}</span>
            {id === 'plan' && backlog ? <span className="bn-badge">{backlog}</span> : null}
          </button>
        );
      })}
      <button type="button" className="bn-item" aria-current={moreActive ? 'page' : undefined} onClick={onMore} aria-haspopup="dialog">
        <MoreIcon aria-hidden /><span>More</span>
      </button>
    </nav>
  );
}

function MoreSheet({ open, onClose, tab }: { open: boolean; onClose: () => void; tab: TabType }) {
  const cur = SECTION_BY_TAB[tab];
  const { world, words } = useWorld();
  const ios = useIos();
  return (
    <Modal open={open} onClose={onClose} title="All screens" size="md">
      <div className="more-grid">
        {sectionsFor(world).map((s) => {
          const Icon = sectionIcon(s, ios, cur.id === s.id);
          return (
            <button key={s.id} type="button" className="more-item" aria-current={cur.id === s.id ? 'page' : undefined} onClick={() => { goSection(s); onClose(); }}>
              <Icon aria-hidden /><span>{words.section(s).label}</span>
              {s.tabs.length > 1 ? <small>{s.tabs.map((t) => words.tab(t, NAV_BY_ID[t].label)).join(' · ')}</small> : null}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function ReminderBanner() {
  const { suffix } = useLevelConfig();
  const { settings } = useStudy();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!settings.onboardingCompleted || typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') scheduleNinePmReminder(suffix);
    else if (Notification.permission === 'default' && !reminderDismissed(suffix)) setShow(true);
  }, [settings.onboardingCompleted, suffix]);
  if (!show) return null;
  const dismiss = () => { writeRaw(KEYS.notifDismissed(suffix), 'true'); setShow(false); };
  return (
    <div className="banner" role="region" aria-label="Daily reminder">
      <span className="banner-icon"><LuBell size={18} /></span>
      <div className="banner-text"><strong>Get a 9 PM nudge</strong>We’ll remind you only when you have pending backlogs.</div>
      <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
      <Button size="sm" variant="primary" onClick={async () => {
        writeRaw(KEYS.notifDismissed(suffix), 'true');
        try { if ((await Notification.requestPermission()) === 'granted') scheduleNinePmReminder(suffix); } catch { /* unsupported */ }
        setShow(false);
      }}>Turn on</Button>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="col g-4" aria-busy="true">
      <Skeleton height={34} width="40%" />
      <Skeleton height={220} radius={20} />
      <div className="grid cols-4 g-4"><Skeleton height={128} radius={20} /><Skeleton height={128} radius={20} /><Skeleton height={128} radius={20} /><Skeleton height={128} radius={20} /></div>
    </div>
  );
}

/**
 * Two facts about the page that the top bar's stylesheet cannot read for itself, kept as attributes on the bar:
 *
 *  - `data-fit`      the page is too short to scroll. Such a page has no scroll timeline, and the glass animation would keep what it
 *                    last showed (you scrolled a long page, then opened a short one), so the stylesheet clears the glass and the title.
 *  - `data-scrolled` the page has scrolled far enough for the bar to be glass (30 px; it lets go again below 12 px, so hovering on the
 *                    line does not flicker). The glass is a live blur of whatever is behind it, and anything that moves inside the
 *                    bar redraws that blur on every frame, so the stylesheet holds the bar's decorative loops still meanwhile.
 */
function useBarState(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const root = document.documentElement;
    const fit = () => bar.toggleAttribute('data-fit', root.scrollHeight <= root.clientHeight + 1);
    let scrolled = false;
    const scroll = () => {
      const next = scrolled ? window.scrollY > 12 : window.scrollY > 30;
      if (next !== scrolled) { scrolled = next; bar.toggleAttribute('data-scrolled', next); }
    };
    const ro = new ResizeObserver(fit);
    // The column that holds the page grows and shrinks with its content (the body itself stays one screen tall).
    ro.observe(bar.parentElement ?? document.body);
    ro.observe(root);
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', scroll, { passive: true });
    fit();
    scroll();
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); window.removeEventListener('scroll', scroll); };
  }, [ref]);
}

export function Shell() {
  const tab = useRoute();
  const { suffix } = useLevelConfig();
  const { stats, settings } = useStudy();
  const backlog = usePendingBacklog(suffix);
  const timer = useTimer();
  const { world, words } = useWorld();
  const xpGain = useXpGain(stats.totalXP, suffix);
  const [guideOpen, setGuideOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pageTitle = usePageTitle();
  const barRef = useRef<HTMLElement>(null);
  useBarState(barRef);
  const Tab = TABS[tab];
  const nav = NAV_BY_ID[tab];
  const section = SECTION_BY_TAB[tab];

  useEffect(() => { window.scrollTo(0, 0); rememberTab(section.id, tab); document.title = `${words.tab(tab, nav.label)} · ${world === 'default' ? 'CA Study Tracker' : BRAND[world]}`; }, [tab, nav.label, section.id, words, world]);
  useEffect(() => { prefetchTabs(['LOG', 'MOCK', 'CHARTS', 'TARGETS', 'GAMIFICATION', 'SETTINGS']); }, []);
  useEffect(() => { document.documentElement.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false'; }, [settings.reduceMotion]);
  useEffect(() => { configureMotion({ pref: settings.motionLevel ?? 'auto', reduce: !!settings.reduceMotion }); }, [settings.motionLevel, settings.reduceMotion]);

  useEffect(() => { const open = () => setGuideOpen(true); window.addEventListener('ca_open_guide', open); return () => window.removeEventListener('ca_open_guide', open); }, []);
  const openHelp = () => { writeRaw(KEYS.guideSeen, 'true'); askAssistant({ open: 'panel' }); };

  return (
    <div className="shell">
      <Sidebar tab={tab} backlog={backlog} />
      <div className="main">
        <header ref={barRef} className="topbar" data-timer={timer.active ? '' : undefined}>
          <div className="topbar-glass" aria-hidden="true" />
          <div className="topbar-brand row g-3 min-0" aria-hidden="true">
            <WorldMark world={world} size={30} />
            <span className="topbar-title truncate">{BRAND[world]}</span>
          </div>
          <div className="topbar-center" aria-hidden="true"><span>{pageTitle || words.tab(tab, nav.label)}</span></div>
          <div className="topbar-actions">
            <TimerPill />
            <button type="button" className="xp-pill" onClick={() => go('GAMIFICATION')} aria-label={`${words.rank(stats.rankInfo.title)}, ${fmtInt(stats.totalXP)} XP. Open rewards`}>
              <span key={xpGain?.id ?? 0} className={`xp-ic${xpGain ? ' is-bump' : ''}`}><LuSparkles aria-hidden /></span>
              <span className="xp-rank">{words.rank(stats.rankInfo.title)}</span>
              <span className="dim hide-sm tnum">· {fmtInt(stats.totalXP)} XP</span>
              {xpGain ? <span key={xpGain.id} className="xp-float tnum" aria-hidden>+{xpGain.n} XP</span> : null}
            </button>
            <button type="button" className="icon-btn" onClick={openHelp} aria-label="Ask Blip for help"><LuCircleHelp aria-hidden /></button>
          </div>
        </header>
        <main className="page" id="main">
          <ReminderBanner />
          <SectionTabs tab={tab} />
          <Suspense fallback={<PageFallback />}>
            <div className="tab-root" key={tab + suffix}><Tab /></div>
          </Suspense>
        </main>
      </div>
      <BottomNav tab={tab} backlog={backlog} onMore={() => { setMoreOpen(true); }} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} tab={tab} />
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <AssistantLayer />
      <Celebrations />
    </div>
  );
}
