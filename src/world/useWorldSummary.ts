import { useMemo } from 'react';
import { useLevelConfig } from '../context/LevelContext';
import { useStudy } from '../context/StudyContext';
import { useTimer } from '../context/TimerContext';
import { paceFor, useTargets } from '../lib/targets';
import { buildIslands, dockSubject, ghostRace, levelProgress, stormsFor, windFor } from './voyage/progress';

/**
 * What the Sea chart and the Grounds both read from the real study data: one entry per paper (progress, chapters, neglect), the latest mocks,
 * this week against the best week, the pace the plan needs, and where the student studied last. Worked out once, the same for either world.
 */
export function useWorldSummary() {
  const { level, subjects, allSubjectsInGroup, levelLabel } = useLevelConfig();
  const { stats, studyLogs, mockScores, settings, today, daysLeft } = useStudy();
  const targets = useTargets();
  const timer = useTimer();

  const list = subjects.length ? subjects : allSubjectsInGroup;
  const plan = useMemo(() => targets.syllabus.map((i) => ({ subject: i.subject, targetHours: Number(i.targetHours ?? i.hours) || 0, completed: !!i.completed })), [targets.syllabus]);
  const islands = useMemo(() => buildIslands(list, stats.subjectHours, plan, studyLogs, today), [list, stats.subjectHours, plan, studyLogs, today]);
  const storms = useMemo(() => stormsFor(mockScores, list, today), [mockScores, list, today]);
  const race = useMemo(() => ghostRace(stats.dailyTotals, today), [stats.dailyTotals, today]);

  const remaining = islands.reduce((a, i) => a + Math.max(0, i.targetHours - i.hours), 0);
  const pace = useMemo(() => paceFor(remaining, settings.targetExamDate, today, targets.plan), [remaining, settings.targetExamDate, today, targets.plan]);
  const wind = useMemo(() => windFor(daysLeft < 0 ? 0 : pace.perDay, stats.last7Avg), [pace.perDay, stats.last7Avg, daysLeft]);

  const dockName = dockSubject(studyLogs);
  const keyOf = (name: string | null | undefined) => (name ? islands.find((i) => i.name.toLowerCase() === name.trim().toLowerCase())?.key ?? null : null);
  const dockKey = keyOf(dockName);
  const workingKey = timer.active && timer.here ? keyOf(timer.state.subject) : null;
  const prog = levelProgress(islands);
  const stormList = [...storms.values()];
  const chapters = useMemo(() => ({ done: plan.filter((p) => p.completed).length, total: plan.length }), [plan]);

  return { level, levelLabel, subjects: list, islands, storms, stormList, race, wind, daysLeft, dockName, dockKey, workingKey, prog, chapters };
}
