import { useEffect, useRef, useState } from 'react';
import { useLevelConfig } from './context/LevelContext';
import { StudyProvider, useStudy } from './context/StudyContext';
import { TimerProvider } from './context/TimerContext';
import { TimerLayer } from './features/timer/TimerLayer';
import { Shell } from './components/layout/Shell';
import { Logo } from './components/layout/Logo';
import Onboarding from './features/onboarding';
import { calculateBacklogs } from './lib/backlog';
import { useAutoReportRunner } from './lib/dailyReport';
import { Backdrop } from './components/layout/Backdrop';

/** Brief overlay while the whole app re-keys to another level / group. */
function SwitchOverlay() {
  const { level, selectedGroup, levelLabel, groupLabel } = useLevelConfig();
  const [show, setShow] = useState(false);
  const prev = useRef(`${level}:${selectedGroup}`);
  useEffect(() => {
    const now = `${level}:${selectedGroup}`;
    if (prev.current === now) return;
    prev.current = now;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 750);
    return () => window.clearTimeout(t);
  }, [level, selectedGroup]);
  if (!show) return null;
  return (
    <div className="scrim" style={{ zIndex: 300, background: 'rgb(6 9 19 / 0.92)' }} role="status" aria-live="polite">
      <div className="col center g-4 text-center pop-in" style={{ alignItems: 'center' }}>
        <Logo size={72} />
        <div className="t-h2">Switching to {levelLabel}</div>
        <div className="dim t-small">{groupLabel}</div>
      </div>
    </div>
  );
}

function Gate() {
  const { hasLevelSelected, level, suffix } = useLevelConfig();
  const { settings, studyLogs } = useStudy();
  useAutoReportRunner();
  // Keep the backlog list fresh whenever logs or the active level/group change.
  useEffect(() => { if (settings.onboardingCompleted) calculateBacklogs(level, suffix); }, [studyLogs, settings.onboardingCompleted, level, suffix]);
  if (!hasLevelSelected || !settings.onboardingCompleted) return <Onboarding />;
  return <><Shell /><TimerLayer /></>;
}

export default function App() {
  const { level } = useLevelConfig();
  return (
    <>
      <Backdrop />
      <StudyProvider key={level}>
        <TimerProvider>
          <Gate />
        </TimerProvider>
      </StudyProvider>
      <SwitchOverlay />
    </>
  );
}
