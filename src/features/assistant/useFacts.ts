import { useEffect, useMemo, useState } from 'react';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { pendingBacklogCount } from '../../lib/backlog';
import { diffDays } from '../../lib/date';
import { logHours, subjectHoursOf } from '../../lib/log';
import { weakestPaper } from '../../lib/quests';
import { readJSON } from '../../lib/storage';
import { suggestions, type AssistantFacts, type Suggestion } from '../../lib/assistant';

const hasRows = (k: string) => { const v = readJSON<unknown>(k, null); return Array.isArray(v) ? v.length > 0 : !!(v && typeof v === 'object' && Array.isArray((v as { rows?: unknown[] }).rows) && (v as { rows: unknown[] }).rows.length); };

/** Everything Blip looks at, in one place. Recomputed when your data changes and once a minute. */
export function useAssistantFacts(): { facts: AssistantFacts; list: Suggestion[] } {
  const { suffix, subjects } = useLevelConfig();
  const { stats, studyLogs, mockScores, quests, phase, daysLeft, settings, today } = useStudy();
  const [minute, setMinute] = useState(() => Date.now());
  const [ext, setExt] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMinute(Date.now()), 60_000);
    const bump = () => setExt((n) => n + 1);
    for (const e of ['backlog_changed', 'targets_changed', 'storage']) window.addEventListener(e, bump);
    return () => { window.clearInterval(id); for (const e of ['backlog_changed', 'targets_changed', 'storage']) window.removeEventListener(e, bump); };
  }, []);

  const names = useMemo(() => subjects.map((s) => s.name), [subjects]);
  return useMemo(() => {
    const lastLog = [...studyLogs].reverse().find((l) => logHours(l) > 0);
    const weakest = weakestPaper({ today, logs: studyLogs, subjects: names, subjectHours: stats.subjectHours });
    let weakestDaysSince: number | null = null;
    if (weakest) {
      for (let i = studyLogs.length - 1; i >= 0; i--) {
        const l = studyLogs[i];
        if (subjectHoursOf(l).some(([s]) => s === weakest)) { weakestDaysSince = diffDays(l.date, today); break; }
      }
    }
    const lastMock = mockScores.reduce<string | null>((a, m) => (!a || m.date > a ? m.date : a), null);
    const facts: AssistantFacts = {
      hour: new Date(minute).getHours(), goal: settings.dailyGoalHours, todayHours: stats.todayHours,
      streak: stats.currentFireStreak, streakMin: stats.streakMin, freezes: stats.freezes, fireToday: stats.fireToday,
      daysLogged: stats.daysLogged, daysSinceLog: lastLog ? diffDays(lastLog.date, today) : null,
      readyQuests: quests.filter((q) => q.done && !q.claimed).length, backlog: pendingBacklogCount(suffix),
      weakest, weakestDaysSince, daysSinceMock: lastMock ? diffDays(lastMock, today) : null, mocksPerWeek: phase.mocksPerWeek,
      hasPlan: hasRows(`ca_targets_data_${suffix}`) || hasRows(`ca_targets_custom_${suffix}`),
      daysLeft, phaseTitle: phase.title, readinessCapped: stats.readiness.capped,
    };
    return { facts, list: suggestions(facts) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, studyLogs, mockScores, quests, phase, daysLeft, settings.dailyGoalHours, today, names, suffix, minute, ext]);
}
