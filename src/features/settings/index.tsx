import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LuBell, LuCheck, LuCircleHelp, LuCompass, LuDatabaseBackup, LuFileText, LuGraduationCap, LuInfo, LuPalette, LuRocket, LuShieldCheck, LuSmartphone, LuTimer, LuTriangleAlert, LuUser } from 'react-icons/lu';
import './settings.css';
import { Button, Callout, Card, CardHead, Chip, Field, Input, PageHeader, Segmented, Stepper, Switch, Tag, useConfirm, useToast } from '../../components/ui';
import { LEVELS } from '../../config/curriculum';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { diffDays, isValidYmd } from '../../lib/date';
import { pendingBacklogCount } from '../../lib/backlog';
import { cn, fmtNum, plural } from '../../lib/format';
import { levelOutcome } from '../../lib/manifest';
import { useInstall } from '../../lib/pwa';
import { scheduleNinePmReminder } from '../../lib/reminders';
import { askAssistant } from '../assistant/state';
import { appKeys, readRaw } from '../../lib/storage';
import type { Level, ThemeId } from '../../types';
import { useReducedMotion } from '../../hooks/useMedia';
import { useMotionLevel } from '../../lib/motion';
import { sfx } from '../../lib/sfx';
import { AutoReportSection, BackupSection, DangerSection, ReportsSection, Row } from './data';
import { SoundSettings } from './SoundSettings';
import { WorldPicker } from '../../world/WorldPicker';

const APP_VERSION = '7.0.0';

const SECTIONS: { id: string; label: string; icon: ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <LuUser aria-hidden /> },
  { id: 'exam', label: 'Exam and papers', icon: <LuGraduationCap aria-hidden /> },
  { id: 'timer', label: 'Study timer', icon: <LuTimer aria-hidden /> },
  { id: 'look', label: 'Look and feel', icon: <LuPalette aria-hidden /> },
  { id: 'head-start', label: 'Head start', icon: <LuRocket aria-hidden /> },
  { id: 'reminders', label: 'Reminders', icon: <LuBell aria-hidden /> },
  { id: 'reports', label: 'Reports', icon: <LuFileText aria-hidden /> },
  { id: 'backup', label: 'Backup', icon: <LuDatabaseBackup aria-hidden /> },
  { id: 'app', label: 'This app', icon: <LuInfo aria-hidden /> },
  { id: 'danger', label: 'Danger zone', icon: <LuTriangleAlert aria-hidden /> },
];

const THEMES: { id: ThemeId; name: string; a: string; b: string }[] = [
  { id: 'aurora', name: 'Aurora', a: '#4dd8e8', b: '#9c8cff' },
  { id: 'violet', name: 'Violet', a: '#a597ff', b: '#ff8bd0' },
  { id: 'ember', name: 'Ember', a: '#ff9a5c', b: '#ff5f8a' },
  { id: 'gold', name: 'Gold', a: '#f6c75b', b: '#ff9a5c' },
  { id: 'mint', name: 'Mint', a: '#46e3a8', b: '#4dd8e8' },
  { id: 'rose', name: 'Rose', a: '#ff6389', b: '#9c8cff' },
];

const iconTile = (accent: string, icon: ReactNode) => <span className={`stat-icon acc-${accent}`}>{icon}</span>;

/* ───────── Profile ───────── */
function ProfileSection() {
  const { settings, updateSettings, today } = useStudy();
  const left = isValidYmd(settings.targetExamDate) ? diffDays(today, settings.targetExamDate) : null;
  return (
    <Card>
      <CardHead icon={iconTile('cyan', <LuUser />)} title="Profile" sub="The basics the greeting, countdown and reports use." />
      <div className="st-fields">
        <Field label="Your name" hint="Shown in the greeting and on report headers.">
          <Input value={settings.displayName} maxLength={30} placeholder="For example, Dhruv" autoComplete="given-name" onChange={(e) => updateSettings({ displayName: e.target.value })} />
        </Field>
        <Field label="Exam date" hint={left === null ? 'Pick a date.' : left > 0 ? `${plural(left, 'day')} to go. The countdown ends at 2 PM that day.` : left === 0 ? 'The exam is today. All the best.' : 'This date has passed. Set your next attempt.'}>
          <Input type="date" value={settings.targetExamDate} onChange={(e) => { if (isValidYmd(e.target.value)) updateSettings({ targetExamDate: e.target.value }); }} />
        </Field>
        <div className="span-2">
          <Row title="Daily goal" desc="Hours that make a goal day. Each goal day earns bonus XP.">
            <Stepper value={settings.dailyGoalHours} min={1} max={16} step={0.5} label="daily goal" onChange={(v) => updateSettings({ dailyGoalHours: v })} />
          </Row>
        </div>
        <div className="span-2">
          <Row stack title="Rest days" desc="Days you plan to take off. They never break your streak, and they lower the hours a goal week asks for.">
            <div className="row g-2 wrap" role="group" aria-label="Rest days">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = (settings.restDays || []).includes(d);
                return <Chip key={d} selected={on} onClick={() => { const cur = settings.restDays || []; updateSettings({ restDays: on ? cur.filter((x) => x !== d) : [...cur, d].sort() }); }}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}</Chip>;
              })}
            </div>
          </Row>
        </div>
      </div>
    </Card>
  );
}

/* ───────── Exam, group and papers ───────── */
function ExamSection() {
  const { level, selectedGroup, allSubjectsInGroup, activeSubjects, setLevel, setSelectedGroup, setActiveSubjects, levelLabel, groupLabel, passingCriteria } = useLevelConfig();
  const confirm = useConfirm();
  const outcomes = useMemo(() => Object.fromEntries(LEVELS.map((l) => [l.id, levelOutcome(l.id)])) as Record<Level, ReturnType<typeof levelOutcome>>, []);

  const pick = async (id: Level) => {
    if (id === level) return;
    const label = LEVELS.find((l) => l.id === id)?.label ?? id;
    const ok = await confirm({ title: `Switch to ${label}?`, body: 'Each level keeps its own study days, mock tests and plan. Nothing is deleted, and you can switch back any time.', confirmLabel: 'Switch' });
    if (ok) { setLevel(id); }
  };
  const toggle = (name: string) => {
    const on = activeSubjects.includes(name);
    if (on && activeSubjects.filter((n) => allSubjectsInGroup.some((s) => s.name === n)).length <= 1) return;
    setActiveSubjects(on ? activeSubjects.filter((n) => n !== name) : [...activeSubjects, name]);
  };

  return (
    <Card>
      <CardHead icon={iconTile('violet', <LuGraduationCap />)} title="Exam and papers" sub={`Studying ${levelLabel}, ${groupLabel}.`} />
      <div className="st-levels" role="radiogroup" aria-label="CA level">
        {LEVELS.map((l) => {
          const o = outcomes[l.id];
          return (
            <button key={l.id} type="button" role="radio" aria-checked={l.id === level} className="st-level" onClick={() => pick(l.id)}>
              <b>{l.label}</b>
              <small>{l.blurb}</small>
              {l.id === level ? <Tag accent="brand">Active</Tag> : o.hasData ? <Tag accent={o.passed ? 'good' : 'warn'}>{o.passed ? 'Marksheet passes' : `Target ${fmtNum(o.percent, 0)}%`}</Tag> : null}
            </button>
          );
        })}
      </div>

      {level !== 'foundation' ? (
        <Row stack title="Group" desc="Switching group resets which papers are selected below.">
          <Segmented<'group1' | 'group2' | 'both'> label="Group" value={selectedGroup} onChange={(g) => { setSelectedGroup(g); }} options={[{ value: 'group1', label: 'Group I' }, { value: 'group2', label: 'Group II' }, { value: 'both', label: 'Both groups' }]} />
        </Row>
      ) : null}

      <Row stack title="Papers you are studying" desc="Turn off a paper to leave it out of your pickers. At least one stays on.">
        <div className="row g-2 wrap">
          {allSubjectsInGroup.map((s) => <Chip key={s.id} dot accent={s.accent} selected={activeSubjects.includes(s.name)} onClick={() => toggle(s.name)}>{s.name}</Chip>)}
        </div>
      </Row>
      <Callout icon={<LuShieldCheck aria-hidden />} accent="brand">{passingCriteria}</Callout>
    </Card>
  );
}

/* ───────── Study timer ───────── */
type Chime = '0' | '15' | '25' | '30' | '45' | '60';
function TimerSection() {
  const { settings, updateSettings } = useStudy();
  const chime = String(settings.timerChime ?? 0) as Chime;
  return (
    <Card>
      <CardHead icon={iconTile('cyan', <LuTimer />)} title="Study timer" sub="Time yourself instead of typing hours. Every stop adds to today's log." />
      <Row title="Keep the screen awake" desc="Stops the tablet from dimming while the clock runs and this app is open. Some browsers do not allow it.">
        <Switch checked={settings.timerWakeLock !== false} label="Keep the screen awake while timing" onChange={(v) => updateSettings({ timerWakeLock: v })} />
      </Row>
      <Row title="Encouragement" desc="A short message at 10 minutes, 25 minutes, an hour and so on while you study.">
        <Switch checked={settings.timerNudges !== false} label="Encouraging messages while timing" onChange={(v) => updateSettings({ timerNudges: v })} />
      </Row>
      <Row stack title="Chime" desc="A soft sound at a steady interval, so you know when to rest your eyes. It plays only when sound effects are on.">
        <Segmented<Chime> label="Chime every" value={chime} onChange={(v) => updateSettings({ timerChime: Number(v) as 0 | 15 | 25 | 30 | 45 | 60 })}
          options={[{ value: '0', label: 'Off' }, { value: '15', label: '15 min' }, { value: '25', label: '25 min' }, { value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '1 hour' }]} />
      </Row>
      <Callout icon={<LuShieldCheck aria-hidden />} accent="brand">
        The timer counts real time, so switching to your notes or locking the tablet does not lose any. Anything under 30 seconds is ignored. Studying the same subject twice in a day adds to one entry, and Undo takes a saved session back out.
      </Callout>
    </Card>
  );
}

/* ───────── Look and feel ───────── */
function AnimationRow() {
  const { settings, updateSettings } = useStudy();
  const osReduce = useReducedMotion();
  const now = useMotionLevel();
  const words = { full: 'everything is moving', calm: 'only the stars twinkle and the big glows rest', still: 'nothing loops' } as const;
  return (
    <Row stack title="Animation" desc="Auto watches how smoothly this device draws and turns the extras down if it starts to struggle, then back up when it can. Full keeps everything moving. Calm keeps things light and saves battery.">
      <Segmented<'auto' | 'full' | 'calm'> label="Animation" value={settings.motionLevel ?? 'auto'} onChange={(v) => updateSettings({ motionLevel: v })}
        options={[{ value: 'auto', label: 'Auto' }, { value: 'full', label: 'Full' }, { value: 'calm', label: 'Calm' }]} />
      <p className="t-small" style={{ margin: '10px 0 0', color: 'var(--tx-2)' }} aria-live="polite">
        {settings.reduceMotion || osReduce ? 'Reduce motion is on, so nothing loops.' : `Right now ${now}: ${words[now]}.`}
      </p>
    </Row>
  );
}

function InterfaceRow() {
  const { settings, updateSettings } = useStudy();
  const ios = settings.ui !== 'classic';
  return (
    <Row stack title="Interface" desc="iOS gives you springs that follow your finger, glass bars that clear as you scroll, a floating tab bar, large titles, switches you can drag and sheets you can pull down to dismiss. Classic is the look the app had before.">
      <Segmented<'ios' | 'classic'> label="Interface" value={ios ? 'ios' : 'classic'} onChange={(v) => { updateSettings({ ui: v }); sfx.haptic('light'); }}
        options={[{ value: 'ios', label: 'iOS' }, { value: 'classic', label: 'Classic' }]} />
    </Row>
  );
}

function LookSection() {
  const { settings, updateSettings } = useStudy();
  const toast = useToast();
  const cur = settings.accent || 'aurora';
  return (
    <Card>
      <CardHead icon={iconTile('gold', <LuPalette />)} title="Look and feel" sub="Pick the interface and a world, then the colour the whole app glows in." />
      <InterfaceRow />
      <WorldPicker />
      <div style={{ height: 6 }} />
      <p className="t-small dim" style={{ margin: '0 0 10px' }}>{settings.worldTheme === 'voyage' ? 'Accent colour (the Voyage world keeps its lantern gold; your choice comes back in the everyday look)' : settings.worldTheme === 'academy' ? 'Accent colour (Lanternfell keeps its lamp amber and takes your house colour as its second accent; your choice comes back in the everyday look)' : 'Accent colour'}</p>
      <div className="st-themes" role="radiogroup" aria-label="Accent colour">
        {THEMES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={cur === t.id} className="st-theme" style={{ ['--sw1' as string]: t.a, ['--sw2' as string]: t.b } as CSSProperties} onClick={() => { updateSettings({ accent: t.id }); }}>
            <span className="st-swatch"><LuCheck aria-hidden /></span>{t.name}
          </button>
        ))}
      </div>
      <div style={{ height: 18 }} />
      <Row stack title="Blip, your helper" desc="Blip shows short tips the first time you open a screen. Quiet only answers when you ask. Hidden removes the corner helper (the ? button still opens help).">
        <div className="row g-3 wrap">
          <Segmented<'full' | 'quiet' | 'off'> label="Blip" value={settings.blipMode ?? 'full'} onChange={(v) => { updateSettings({ blipMode: v }); }} options={[{ value: 'full', label: 'With tips' }, { value: 'quiet', label: 'Quiet' }, { value: 'off', label: 'Hidden' }]} />
          <Button size="sm" onClick={() => askAssistant({ open: 'tour' })}><LuCompass aria-hidden /> Take the tour again</Button>
        </div>
      </Row>
      <Row title="Reduce motion" desc="Stops animated charts, flips and entrances. Also follows your device setting."><Switch checked={!!settings.reduceMotion} label="Reduce motion" onChange={(v) => updateSettings({ reduceMotion: v })} /></Row>
      <AnimationRow />
      <SoundSettings />
      <Row title="Beast mode alert" desc="A notification when you reach 10 hours in a day.">
        <Switch checked={settings.beastNotifs} label="Beast mode alert" onChange={async (v) => {
          updateSettings({ beastNotifs: v });
          if (v && typeof Notification !== 'undefined' && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch { /* unsupported */ }
          }
          if (v && typeof Notification !== 'undefined' && Notification.permission === 'denied') toast({ message: 'Notifications are blocked', sub: 'Allow them for this site in your browser settings to get the alert.', tone: 'warn' });
        }} />
      </Row>
    </Card>
  );
}

/* ───────── Head start ───────── */
function HeadStartSection() {
  const { settings, updateSettings } = useStudy();
  const { allSubjectsInGroup } = useLevelConfig();
  const fromSettings = () => Object.fromEntries(allSubjectsInGroup.map((s) => [s.name, settings.pastHours[s.name] ? String(settings.pastHours[s.name]) : ''])) as Record<string, string>;
  const [draft, setDraft] = useState(fromSettings);
  useEffect(() => { setDraft(fromSettings()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [allSubjectsInGroup]);

  const commit = (name: string, raw: string) => {
    setDraft((d) => ({ ...d, [name]: raw }));
    const n = raw.trim() === '' ? 0 : Number(raw);
    if (!Number.isFinite(n)) return;
    const v = Math.min(5000, Math.max(0, Math.round(n * 100) / 100));
    const next = { ...settings.pastHours };
    if (v > 0) next[name] = v; else delete next[name];
    updateSettings({ pastHours: next });
  };
  const total = allSubjectsInGroup.reduce((a, s) => a + (Number(settings.pastHours[s.name]) || 0), 0);

  return (
    <Card>
      <CardHead icon={iconTile('ember', <LuRocket />)} title="Head start" sub="Hours you studied before you began tracking. They count towards totals, badges and XP." action={<Tag>{fmtNum(total, 1)} h in total</Tag>} />
      <div className="st-head">
        {allSubjectsInGroup.map((s) => (
          <label key={s.id} className={cn('st-head-row', `acc-${s.accent}`)}>
            <span className="dot" aria-hidden />
            <span className="grow t-small truncate">{s.name}</span>
            <Input small inputMode="decimal" type="number" min={0} max={5000} step={0.5} placeholder="0" value={draft[s.name] ?? ''} aria-label={`Hours already studied for ${s.name}`}
              onChange={(e) => commit(s.name, e.target.value)} onBlur={() => setDraft(fromSettings())} />
            <span className="t-xs dim">h</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

/* ───────── Reminders ───────── */
function RemindersSection() {
  const { suffix } = useLevelConfig();
  const toast = useToast();
  const supported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported');
  const pending = pendingBacklogCount(suffix);

  const enable = async () => {
    try {
      const res = await Notification.requestPermission();
      setPerm(res);
      if (res === 'granted') { scheduleNinePmReminder(suffix); toast({ message: 'Reminder is on', sub: 'You will get a nudge at 9 PM when backlogs are pending.', tone: 'good' }); }
    } catch { setPerm('denied'); }
  };
  const test = async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const opts = { body: 'This is how your 9 PM nudge will look.', icon: '/icons/icon-192.png', tag: 'ca-test' };
      if (reg) await reg.showNotification('CA Study Tracker', opts); else new Notification('CA Study Tracker', opts);
    } catch { toast({ message: 'The test notification could not be shown', tone: 'bad' }); }
  };

  return (
    <Card>
      <CardHead icon={iconTile('rose', <LuBell />)} title="Reminders" sub="One nudge at 9 PM, and only when you have pending backlogs." action={perm === 'granted' ? <Tag accent="good">On</Tag> : perm === 'denied' ? <Tag accent="warn">Blocked</Tag> : <Tag>Off</Tag>} />
      {perm === 'unsupported' ? (
        <Callout icon={<LuInfo aria-hidden />} accent="warn">This browser does not support notifications. On iPhone, add the app to your Home Screen first.</Callout>
      ) : (
        <>
          <Row title="9 PM backlog nudge" desc={perm === 'denied' ? 'Notifications are blocked for this site. Allow them in your browser settings, then come back.' : `${plural(pending, 'backlog')} pending right now.`}>
            {perm === 'granted' ? <Button size="sm" onClick={test}>Send a test</Button> : <Button size="sm" variant="primary" disabled={perm === 'denied'} onClick={enable}>Turn on</Button>}
          </Row>
          <p className="t-xs dim mt-3" style={{ lineHeight: 1.55 }}>Browsers can only deliver the nudge while the app is open or installed on your device. It is not guaranteed when the app is fully closed.</p>
        </>
      )}
    </Card>
  );
}

/* ───────── This app ───────── */
function AppSection() {
  const { canInstall, installed, install } = useInstall();
  const toast = useToast();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null)); }, []);
  const bytes = useMemo(() => appKeys().reduce((a, k) => a + k.length + (readRaw(k)?.length || 0), 0) * 2, []);

  return (
    <Card>
      <CardHead icon={iconTile('mint', <LuSmartphone />)} title="This app" sub={`CA Study Tracker ${APP_VERSION}. Everything stays on this device: no account, no server.`} />
      <Row title="Install on this device" desc="Opens like a normal app, works offline and gets its own icon.">
        {installed ? <Tag accent="good">Installed</Tag> : canInstall ? <Button size="sm" variant="primary" onClick={async () => { const r = await install(); if (r === 'accepted') toast({ message: 'App installed', tone: 'good' }); }}>Install</Button> : <span className="t-small dim">Use your browser menu: Install app, or Add to Home Screen.</span>}
      </Row>
      <Row title="Keep my data safe" desc={`About ${(bytes / 1024).toFixed(0)} KB saved here. Ask the browser not to clear it when space runs low.`}>
        {persisted ? <Tag accent="good">Protected</Tag> : <Button size="sm" disabled={!navigator.storage?.persist} onClick={async () => { const ok = await navigator.storage?.persist?.(); setPersisted(!!ok); toast(ok ? { message: 'Your data is protected from clean-up', tone: 'good' } : { message: 'The browser declined', sub: 'Installing the app usually makes this succeed. A backup file is still the safest copy.', tone: 'warn' }); }}>Protect data</Button>}
      </Row>
      <Row title="How this app works" desc="Replay the guide to ranks, streaks and XP.">
        <Button size="sm" onClick={() => { window.dispatchEvent(new Event('ca_open_guide')); }}><LuCircleHelp aria-hidden /> Open guide</Button>
      </Row>
    </Card>
  );
}

/* ───────── Page ───────── */
export default function Settings() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const reduce = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  // On phones the section list scrolls sideways: keep the current section's pill in view.
  useEffect(() => {
    const nav = navRef.current; const b = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !b || nav.scrollWidth <= nav.clientWidth + 2) return;
    nav.scrollTo({ left: b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  }, [active, reduce]);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`st-${s.id}`)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (seen[0]) setActive(seen[0].target.id.slice(3));
    }, { rootMargin: '-110px 0px -62% 0px', threshold: 0 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(`st-${id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const body: Record<string, ReactNode> = {
    profile: <ProfileSection />,
    exam: <ExamSection />,
    timer: <TimerSection />,
    look: <LookSection />,
    'head-start': <HeadStartSection />,
    reminders: <RemindersSection />,
    reports: <><ReportsSection /><div style={{ height: 20 }} /><AutoReportSection /></>,
    backup: <BackupSection />,
    app: <AppSection />,
    danger: <DangerSection />,
  };

  return (
    <div className="page-enter">
      <PageHeader title="Settings" sub="Make the tracker yours, and keep your data safe." />
      <div className="st-wrap">
        <nav className="st-nav" aria-label="Settings sections" ref={navRef}>
          {SECTIONS.map((s) => <button key={s.id} type="button" aria-current={active === s.id ? 'true' : undefined} onClick={() => go(s.id)}>{s.icon}{s.label}</button>)}
        </nav>
        <div className="st-body">
          {SECTIONS.map((s) => <section key={s.id} id={`st-${s.id}`} className="st-sec" aria-label={s.label}>{body[s.id]}</section>)}
        </div>
      </div>
    </div>
  );
}
