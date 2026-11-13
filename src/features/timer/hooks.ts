import { useMemo } from 'react';
import { useStudy } from '../../context/StudyContext';
import { SLOTS, getSlot, slotOfSubject } from '../../lib/log';

/** Topics you used before for a subject, newest first. A slot can hold several, separated by ";". */
export function useRecentTopics(subject: string, limit = 4): string[] {
  const { studyLogs } = useStudy();
  return useMemo(() => {
    const seen: string[] = [];
    for (const l of [...studyLogs].reverse()) {
      for (const k of SLOTS) {
        const sl = getSlot(l, k);
        if (sl.subject.trim().toLowerCase() !== subject.trim().toLowerCase()) continue;
        for (const part of sl.topic.split(';').map((x) => x.trim()).filter(Boolean).reverse()) {
          if (!seen.some((x) => x.toLowerCase() === part.toLowerCase())) seen.push(part);
        }
      }
      if (seen.length >= limit) break;
    }
    return seen.slice(0, limit);
  }, [studyLogs, subject, limit]);
}

/** Hours already on today's log for one subject. */
export function useTodayHours(subject: string): number {
  const { studyLogs, today } = useStudy();
  return useMemo(() => {
    const log = studyLogs.find((l) => l.date === today);
    const slot = slotOfSubject(log, subject);
    return slot ? getSlot(log, slot).hours : 0;
  }, [studyLogs, today, subject]);
}
