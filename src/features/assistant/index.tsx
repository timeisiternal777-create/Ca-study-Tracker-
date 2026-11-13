import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import './assistant.css';
import { Blip, type BlipMood } from '../../components/blip/Blip';
import { useStudy } from '../../context/StudyContext';
import { onCelebrate } from '../../lib/celebrate';
import { restingMood, TIPS, weeklyRecap } from '../../lib/assistant';
import { navigateTo, useRoute } from '../../lib/nav';
import { sfx } from '../../lib/sfx';
import type { TabType } from '../../types';
import { Panel } from './Panel';
import { Tour } from './Tour';
import { onAssistantRequest, useAssistantPrefs } from './state';
import { useAssistantFacts } from './useFacts';

const SIZE = 64;
const SIDE_GAP = 18;

/** The parts of a pointer event we use (kept small so it works with any React typings). */
interface Ptr { button: number; pointerType: string; clientX: number; clientY: number; pointerId: number; currentTarget: HTMLButtonElement }

interface Bubble { id: string; text: string; mood: BlipMood; tab?: TabType }

function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => { const on = () => setV({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return v;
}

/** Blip: the floating helper, the help panel, the welcome and the tour. */
export function AssistantLayer() {
  const { settings, stats, today } = useStudy();
  const tab = useRoute();
  const mode = settings.blipMode ?? 'full';
  const { facts, list } = useAssistantFacts();
  const [prefs, update] = useAssistantPrefs();
  const vp = useViewport();

  const [panel, setPanel] = useState<'closed' | 'open' | 'closing'>('closed');
  const [focusHelp, setFocusHelp] = useState(false);
  const [tour, setTour] = useState<{ startAt: number } | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [hot, setHot] = useState<BlipMood | null>(null);
  const [dragging, setDragging] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const dockRef = useRef<HTMLDivElement>(null);
  const hotTimer = useRef(0);
  const bubbleTimer = useRef(0);
  const shownSuggestion = useRef(new Set<string>());
  const drag = useRef<{ sx: number; sy: number; moved: boolean; dx: number; dy: number } | null>(null);

  const top = list[0];
  const busy = !!tour || welcome;
  const name = settings.displayName.trim().split(/\s+/)[0] || '';

  const flash = useCallback((m: BlipMood, ms = 1600) => {
    window.clearTimeout(hotTimer.current);
    setHot(m);
    hotTimer.current = window.setTimeout(() => setHot(null), ms);
  }, []);
  const say = useCallback((b: Bubble, ms = 7500) => {
    window.clearTimeout(bubbleTimer.current);
    sfx.play('blipPop');
    setBubble(b);
    bubbleTimer.current = window.setTimeout(() => setBubble((cur) => (cur?.id === b.id ? null : cur)), ms);
  }, []);
  useEffect(() => () => { window.clearTimeout(hotTimer.current); window.clearTimeout(bubbleTimer.current); }, []);

  const openPanel = useCallback((help = false) => {
    setBubble(null); setFocusHelp(help); setPanel('open'); sfx.play('blipOpen');
    if (top) setSeen((s) => new Set(s).add(top.id));
  }, [top]);
  const closePanel = useCallback(() => {
    sfx.play('blipClose');
    setPanel((p) => (p === 'open' ? 'closing' : p));
    window.setTimeout(() => setPanel((p) => (p === 'closing' ? 'closed' : p)), 190);
  }, []);
  const startTour = useCallback((startAt = 0) => { setPanel('closed'); setBubble(null); setWelcome(false); setTour({ startAt }); }, []);

  // Other parts of the app can ask Blip to open something.
  useEffect(() => onAssistantRequest((r) => {
    if (r.open === 'panel') openPanel(true);
    else if (r.open === 'tour') startTour(0);
    else if (r.open === 'welcome') setWelcome(true);
  }), [openPanel, startTour]);

  // First visit: a friendly hello, once.
  useEffect(() => {
    if (prefs.welcomed || !settings.onboardingCompleted) return;
    const id = window.setTimeout(() => setWelcome(true), 900);
    return () => window.clearTimeout(id);
  }, [prefs.welcomed, settings.onboardingCompleted]);

  useEffect(() => { if (welcome) sfx.play('blipHello'); }, [welcome]);

  // The first time you open a screen, one short tip.
  useEffect(() => {
    if (mode !== 'full' || !prefs.welcomed || busy || panel !== 'closed' || prefs.tipsSeen.includes(tab) || !TIPS[tab]) return;
    const id = window.setTimeout(() => { say({ id: `tip-${tab}`, text: TIPS[tab]!, mood: 'happy', tab }); update({ tipsSeen: [...prefs.tipsSeen, tab] }); }, 1300);
    return () => window.clearTimeout(id);
  }, [tab, mode, prefs.welcomed, prefs.tipsSeen, busy, panel, say, update]);

  // Something urgent? Speak up once per session.
  useEffect(() => {
    if (mode !== 'full' || !prefs.welcomed || busy || panel !== 'closed' || !top || top.weight < 80 || shownSuggestion.current.has(top.id)) return;
    const id = window.setTimeout(() => { shownSuggestion.current.add(top.id); say({ id: `s-${top.id}`, text: top.title, mood: top.mood, tab: top.action?.tab }, 9000); }, 4200);
    return () => window.clearTimeout(id);
  }, [top, mode, prefs.welcomed, busy, panel, say]);

  // Celebrations make Blip cheer.
  useEffect(() => onCelebrate(() => { setBubble(null); flash('cheer', 2800); }), [flash]);

  // A new week: one friendly look back at the last one.
  useEffect(() => {
    if (mode !== 'full' || !prefs.welcomed || busy || panel !== 'closed') return;
    const r = weeklyRecap(stats.dailyTotals, today, stats.goalWeek.target, new Date().getDay());
    if (!r || prefs.recapWeek === r.week) return;
    const id = window.setTimeout(() => { say({ id: `recap-${r.week}`, text: r.text, mood: r.mood }, 11000); update({ recapWeek: r.week }); }, 9500);
    return () => window.clearTimeout(id);
  }, [mode, prefs.welcomed, prefs.recapWeek, busy, panel, stats.dailyTotals, stats.goalWeek.target, today, say, update]);

  /* ─── position (everything moves with transform, so it stays smooth) ─── */
  const bottom = vp.w <= 1100 ? 68 + 14 : 22;
  // On wide screens the sidebar owns the left edge, so Blip rests against the content area instead.
  const inset = vp.w > 1100 ? 252 : 0;
  const restX = (side: 'left' | 'right') => (side === 'right' ? vp.w - SIZE - SIDE_GAP : inset + SIDE_GAP);
  const maxLift = Math.max(0, vp.h - bottom - SIZE - 90);
  const lift = Math.min(prefs.lift, maxLift);
  const place = (side: 'left' | 'right', l: number) => `translate3d(${restX(side)}px, ${-l}px, 0)`;

  const onDown = (e: Ptr) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag.current = { sx: e.clientX, sy: e.clientY, moved: false, dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: Ptr) => {
    const d = drag.current; if (!d) return;
    d.dx = e.clientX - d.sx; d.dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(d.dx, d.dy) > 8) { d.moved = true; setDragging(true); setBubble(null); }
    if (d.moved && dockRef.current) dockRef.current.style.transform = `translate3d(${restX(prefs.side) + d.dx}px, ${-lift + d.dy}px, 0)`;
  };
  const onUp = (e: Ptr) => {
    const d = drag.current; drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d) return;
    if (!d.moved) { if (panel === 'open') closePanel(); else openPanel(); return; }
    const centre = restX(prefs.side) + d.dx + SIZE / 2;
    const side: 'left' | 'right' = centre < (inset + vp.w) / 2 ? 'left' : 'right';
    const nextLift = Math.min(maxLift, Math.max(0, lift - d.dy));
    setDragging(false);
    sfx.play('blipDrop');
    if (dockRef.current) dockRef.current.style.transform = place(side, nextLift);
    update({ side, lift: nextLift });
    flash('happy', 1200);
  };
  const onKey = (e: { detail: number }) => { if (e.detail === 0) { if (panel === 'open') closePanel(); else openPanel(); } };

  const mood: BlipMood = hot ?? (bubble?.mood && bubble.id.startsWith('s-') ? bubble.mood : restingMood(facts, top));
  const dot = !!top && top.weight >= 60 && !seen.has(top.id) && panel === 'closed';
  const hidden = mode === 'off';

  const finishTour = (finished: boolean) => {
    setTour(null);
    update({ welcomed: true, tourDone: prefs.tourDone || finished });
    navigateTo('DASHBOARD');
    if (finished) { flash('cheer', 2600); say({ id: 'tour-done', text: 'Tour done! Tap me any time you need a hand.', mood: 'cheer' }, 6000); }
  };

  const bubbleSide = prefs.side;
  const tourOrWelcome = useMemo(() => busy, [busy]);

  return (
    <>
      {!hidden ? (
        <div ref={dockRef} className={`bl-dock is-${prefs.side}${dragging ? ' is-dragging' : ''}${tourOrWelcome ? ' is-away' : ''}`} style={{ transform: place(prefs.side, lift), ['--bl-bottom' as string]: `${bottom}px` }} data-tour="blip">
          {bubble && !dragging && panel === 'closed' ? (
            <div className={`bl-bubble is-${bubbleSide}`} role="status" key={bubble.id}>
              <button type="button" className="bl-bubble-text" onClick={() => { const b = bubble; setBubble(null); if (b.id.startsWith('s-')) openPanel(); else openPanel(); }}>{bubble.text}</button>
              <button type="button" className="bl-bubble-x" onClick={() => setBubble(null)} aria-label="Dismiss"><LuX aria-hidden /></button>
            </div>
          ) : null}
          <button type="button" className="bl-fab" data-ink="none" aria-label="Blip, your study helper. Press to open. Drag to move me." aria-expanded={panel === 'open'} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onClick={onKey} onPointerEnter={(e: { pointerType: string }) => { if (e.pointerType === 'mouse') flash('wave', 1500); }}>
            <Blip mood={mood} size={SIZE} />
            {dot ? <i className="bl-dot" aria-hidden /> : null}
          </button>
        </div>
      ) : null}

      {panel !== 'closed' ? (
        <div className="bl-anchor" style={{ ['--bl-bottom' as string]: `${bottom}px`, ['--bl-lift' as string]: `${lift}px`, ['--bl-inset' as string]: `${inset}px` }}>
          <Panel name={name} facts={facts} list={list} side={prefs.side} closing={panel === 'closing'} focusHelp={focusHelp} onClose={closePanel}
            onTour={() => startTour(0)} onGuide={() => { closePanel(); window.dispatchEvent(new Event('ca_open_guide')); }} />
        </div>
      ) : null}

      {welcome ? (
        <div className="bl-welcome" role="dialog" aria-modal="true" aria-label="Welcome">
          <div className="bl-welcome-card">
            <Blip mood="wave" size={150} />
            <h2>Hi{name ? `, ${name}` : ''}! I’m Blip.</h2>
            <p>I live in the corner of the app. I can show you around, tell you what to study next, and answer questions. I follow simple rules and only look at the data on this device. I’m not an AI chatbot.</p>
            <div className="bl-welcome-actions">
              <button type="button" className="tour-btn is-primary" data-sfx="tourNext" onClick={() => { update({ welcomed: true }); startTour(1); }}>Show me around</button>
              <button type="button" className="tour-btn" onClick={() => { setWelcome(false); update({ welcomed: true }); window.setTimeout(() => say({ id: 'hello-later', text: 'Tap me any time you need a hand.', mood: 'wave' }, 6500), 500); }}>I’ll explore on my own</button>
            </div>
          </div>
        </div>
      ) : null}

      {tour ? <Tour startAt={tour.startAt} onClose={finishTour} /> : null}
    </>
  );
}
