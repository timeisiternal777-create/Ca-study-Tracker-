import { useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { useWorld } from '..';
import { daySeed } from '../crew/lines';
import { journeyFraction } from '../voyage/progress';
import { useWorldSummary } from '../useWorldSummary';
import { useAcademy } from './academyState';
import { mockPercents, scoreVirtues, weeklyCup } from './choosing';
import { studentLine, teacherLines } from './lines';

/** Everything the Grounds and the dashboard card need to know about the school year, worked out once from the real study data. */
export function useAcademySummary() {
  const { stats, studyLogs, mockScores, settings, today } = useStudy();
  const timer = useTimer();
  const { words } = useWorld();
  const { state } = useAcademy();
  const base = useWorldSummary();
  const { level, islands, storms, stormList, wind, daysLeft, prog, chapters, subjects } = base;

  const input = useMemo(() => ({
    logs: studyLogs, mocks: mockPercents(mockScores, subjects), chapters, papers: islands.length, totalHours: stats.totalStudiedHours,
    goodDayHours: settings.dailyGoalHours, today,
  }), [studyLogs, mockScores, subjects, chapters, islands.length, stats.totalStudiedHours, settings.dailyGoalHours, today]);
  /** The wells show the last 28 days; the cup is decided on the last 7. */
  const measured = useMemo(() => scoreVirtues(input, 28), [input]);
  const weekly = useMemo(() => scoreVirtues(input, 7), [input]);
  const cup = useMemo(() => weeklyCup(weekly.virtues), [weekly]);

  const ctx = {
    wind, daysLeft, islands, storms: stormList, streak: stats.currentFireStreak, freezes: stats.freezes, todayHours: stats.todayHours, goal: settings.dailyGoalHours,
    rankTitle: words.rank(stats.rankInfo.title), totalXP: stats.totalXP, timerSubject: timer.active && timer.here ? timer.state.subject : null, house: state.house, seed: daySeed(today),
  };
  const lines = teacherLines(ctx);
  const student = studentLine(ctx);
  const fraction = journeyFraction(level, state.cleared, prog);
  const won = !!state.cleared.final;

  return { ...base, state, measured, weekly, cup, lines, student, fraction, won, input };
}
