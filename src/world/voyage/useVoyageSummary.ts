import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { useWorld } from '..';
import { crewLines, daySeed } from '../crew/lines';
import { useWorldSummary } from '../useWorldSummary';
import { useVoyage } from './voyageState';
import { journeyFraction, treasureWon } from './progress';

/** Everything the Sea chart and the dashboard card need to know about the voyage, worked out once from the real study data. */
export function useVoyageSummary() {
  const { stats, settings, today } = useStudy();
  const timer = useTimer();
  const { words } = useWorld();
  const { state: vs } = useVoyage();
  const { level, levelLabel, islands, storms, stormList, race, wind, daysLeft, dockName, dockKey, workingKey, prog } = useWorldSummary();

  const fraction = journeyFraction(level, vs.cleared, prog);
  const lines = crewLines({
    wind, daysLeft, islands, storms: stormList, streak: stats.currentFireStreak, freezes: stats.freezes, todayHours: stats.todayHours, goal: settings.dailyGoalHours,
    rankTitle: words.rank(stats.rankInfo.title), totalXP: stats.totalXP, timerSubject: timer.active && timer.here ? timer.state.subject : null, seed: daySeed(today),
  });
  const won = treasureWon(vs.cleared);

  return { level, levelLabel, vs, islands, storms, stormList, race, wind, daysLeft, dockName, dockKey, workingKey, prog, fraction, lines, won };
}
