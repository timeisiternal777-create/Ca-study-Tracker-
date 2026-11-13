import { useEffect, useState, type ReactNode } from 'react';
import { LuArrowRight, LuClipboardCheck, LuNotebookPen, LuShieldCheck, LuSparkles, LuTarget, LuTrophy } from 'react-icons/lu';
import './guide.css';
import { Button, Modal } from '../../components/ui';
import { navigateTo } from '../../lib/nav';
import { BEAST_HOURS, DAY_CAP_HOURS, FREEZE_EVERY, MAX_FREEZES, RANK_TITLES, XP_BEAST_BONUS, XP_GOAL_BONUS, XP_PER_HOUR } from '../../lib/stats';
import type { Accent, TabType } from '../../types';
import { useWorld } from '../../world';

interface Page { id: string; label: string; icon: ReactNode; accent: Accent; title: string; lead: string; body: ReactNode; go?: { tab: TabType; label: string }[] }

const List = ({ items }: { items: ReactNode[] }) => <ul className="gd-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;

const PAGES: Page[] = [
  {
    id: 'log', label: 'Log', icon: <LuNotebookPen aria-hidden />, accent: 'cyan',
    title: 'Log each study day', lead: 'Everything else in the app, from streaks to charts, is built from the hours you log here.',
    body: <List items={[
      <>A day holds up to <b>six sessions</b>. Each one is a paper, a topic and the hours.</>,
      <>Hours move in half-hour steps. Press and hold the plus button to go faster.</>,
      <>Open any earlier date to fill it in or fix it. A deleted day can be brought back from the message that appears.</>,
      <>Add a target to a session and the log shows how close you got.</>,
      <>Hours you studied before you started tracking go in Settings, under Head start.</>,
    ]} />,
    go: [{ tab: 'LOG', label: 'Open the study log' }],
  },
  {
    id: 'plan', label: 'Plan', icon: <LuTarget aria-hidden />, accent: 'violet',
    title: 'Plan the syllabus, then compare', lead: 'Schedule is where you decide what to cover and when. Plan vs actual tells you honestly if you are on pace.',
    body: <List items={[
      <>Pick a <b>syllabus plan</b> (a topic list per paper that you tick off) or a <b>custom plan</b> with your own rows per date.</>,
      <>Import a plan from Excel, or download the template and fill it in.</>,
      <>Mark rest days and choose how many hours a Sunday gets.</>,
      <>Anything planned for a past date and not done becomes a <b>backlog</b>. Clear it when you catch up.</>,
      <>Plan vs actual shows your pace against the exam date, paper by paper.</>,
    ]} />,
    go: [{ tab: 'TARGETS', label: 'Open Schedule' }, { tab: 'TARGET_ANALYSIS', label: 'Plan vs actual' }],
  },
  {
    id: 'mock', label: 'Mocks', icon: <LuClipboardCheck aria-hidden />, accent: 'rose',
    title: 'Log every mock test', lead: 'A mock is the closest thing to the real paper. The score trend is more honest than how a week of study felt.',
    body: <List items={[
      <>Enter the marks per paper. The percentage and grade are worked out for you.</>,
      <><b>70% and above</b> is Excellent, <b>50 to 69%</b> is a Pass, <b>40 to 49%</b> is Borderline, and anything lower says Needs work.</>,
      <>Mock analysis checks the 40% floor on your <b>average per paper</b>, so one bad day does not mark a whole paper as failing.</>,
      <>Every mock earns XP, and a higher score earns more. A 90% score unlocks the Perfectionist badge.</>,
      <>Your last three mocks make up 30% of your <b>readiness</b> score.</>,
    ]} />,
    go: [{ tab: 'MOCK', label: 'Log a mock' }, { tab: 'MOCK_DASHBOARD', label: 'Mock analysis' }],
  },
  {
    id: 'rewards', label: 'Rewards', icon: <LuTrophy aria-hidden />, accent: 'gold',
    title: 'XP, streaks and ranks', lead: 'Everything is earned from real study. Nothing can be bought or faked.',
    body: (
      <>
        <div className="gd-xp">
          <span>Each hour studied (up to {DAY_CAP_HOURS} a day)</span><b>{XP_PER_HOUR} XP</b>
          <span>A goal day (your daily goal reached)</span><b>+{XP_GOAL_BONUS} XP</b>
          <span>A beast day ({BEAST_HOURS} hours or more)</span><b>+{XP_BEAST_BONUS} XP</b>
          <span>A mock test (more for a higher score)</span><b>20 to 80 XP</b>
          <span>A quest you collect</span><b>20 to 120 XP</b>
        </div>
        <List items={[
          <><b>Fire streak:</b> study three quarters of your daily goal (at most 6 hours) on consecutive days. Today stays pending until you get there.</>,
          <><b>Streak freeze:</b> every {FREEZE_EVERY} days in a row banks one (up to {MAX_FREEZES}). A missed day uses a freeze instead of resetting the streak. Rest days you plan in Settings never break it.</>,
          <><b>Goal week:</b> Monday to Sunday hours reach your daily goal for five days. Goal weeks in a row build a streak.</>,
          <><b>Readiness:</b> a 0 to 100 score from your pace, consistency, mocks and paper coverage. It is shown on the Overview.</>,
          <><b>Ranks</b> are scaled to your exam date and daily goal, so the top rank is within reach of your own plan. A rank you reach is never taken away.</>,
        ]} />
        <RankLadder />
      </>
    ),
    go: [{ tab: 'GAMIFICATION', label: 'See your rewards' }],
  },
  {
    id: 'manifest', label: 'Target marks', icon: <LuSparkles aria-hidden />, accent: 'mint',
    title: 'Write down the marks you will score', lead: 'A marksheet for the result you want. It shows what it takes to pass, and how far your mocks are from it.',
    body: <List items={[
      <>Set a target for every paper with the sliders or by typing. It saves as you go.</>,
      <>The pass rule is <b>40% in every paper</b> and <b>50% overall in each group</b>.</>,
      <>Appearing for both groups together? The <b>set-off rule</b> applies: 40% in every paper and 50% of the grand total passes both.</>,
      <>Quick fill starts you at 50, 60 or 70% so you can adjust from there.</>,
    ]} />,
    go: [{ tab: 'MANIFESTATION', label: 'Open the marksheet' }],
  },
  {
    id: 'data', label: 'Your data', icon: <LuShieldCheck aria-hidden />, accent: 'violet',
    title: 'Your data stays with you', lead: 'There is no account and no server. Everything is stored in this browser.',
    body: <List items={[
      <>Download a <b>backup</b> from Settings now and then. It is the only copy that survives clearing your browser data.</>,
      <>Restoring from a backup file lets you move to another device. Files from the earlier version work too.</>,
      <>Install the app from your browser menu to use it offline, with its own icon.</>,
      <>Switch between Foundation, Intermediate and Final in Settings. Each level keeps its own study days, mocks and plan.</>,
    ]} />,
    go: [],
  },
];

/** The rank ladder, under the names the current world uses. */
function RankLadder() {
  const { words } = useWorld();
  return <div className="gd-ranks" aria-label="Ranks">{RANK_TITLES.map((r, i) => <span key={r}><i>{i + 1}</i>{words.rank(r)}</span>)}</div>;
}

export default function GuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => { document.getElementById(`gd-t-${PAGES[i].id}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [i, open]);
  const p = PAGES[i];
  const last = i === PAGES.length - 1;
  const step = (n: number) => { setI((v) => Math.min(PAGES.length - 1, Math.max(0, v + n))); };

  return (
    <Modal open={open} onClose={onClose} size="wide" title="How this app works" description="A two-minute tour of the parts you will use every day."
      footer={<>
        <span className="t-xs dim grow">{i + 1} of {PAGES.length}</span>
        <Button variant="ghost" disabled={i === 0} onClick={() => step(-1)}>Back</Button>
        <Button variant="primary" onClick={() => (last ? onClose() : step(1))} data-autofocus>{last ? 'Got it' : 'Next'}</Button>
      </>}>
      <div className="gd-tabs" role="tablist" aria-label="Guide topics">
        {PAGES.map((x, k) => (
          <button key={x.id} type="button" role="tab" id={`gd-t-${x.id}`} aria-selected={k === i} aria-controls="gd-pane" className={`gd-tab acc-${x.accent}`} onClick={() => { setI(k); }}>{x.icon}{x.label}</button>
        ))}
      </div>
      <div className={`gd-pane acc-${p.accent}`} id="gd-pane" role="tabpanel" aria-labelledby={`gd-t-${p.id}`} key={p.id}>
        <span className="gd-badge">{p.icon}</span>
        <div className="gd-main">
          <h3 className="t-h2">{p.title}</h3>
          <p className="gd-lead">{p.lead}</p>
          {p.body}
          {p.go && p.go.length ? (
            <div className="row g-2 wrap mt-4">
              {p.go.map((g) => <Button key={g.tab} size="sm" variant="soft" onClick={() => { onClose(); navigateTo(g.tab); }}>{g.label}<LuArrowRight aria-hidden /></Button>)}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
