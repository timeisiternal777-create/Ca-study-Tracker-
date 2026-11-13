import { LuClock, LuUndo2 } from 'react-icons/lu';
import { Button, SubjectTag } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { useTimer } from '../../context/TimerContext';
import { fmtMinutes, fmtRange, sessionMinutesOn, sessionPending } from '../../lib/timer';

/** The sessions that went into today's log, newest first, each with a way to take it back. */
export function TodaySessions({ max = 4 }: { max?: number }) {
  const t = useTimer();
  const { today } = useStudy();
  const { getSubjectMetadata } = useLevelConfig();
  const rows = t.sessions.filter((s) => s.parts.some((p) => p.date === today));
  if (!rows.length) return null;
  const total = rows.reduce((a, s) => a + sessionMinutesOn(s, today), 0);
  return (
    <div className="tcard-list">
      <h3><span className="row g-2"><LuClock aria-hidden size={15} />Timer sessions today</span><span className="dim fw-5 tnum">{fmtMinutes(total)} · {rows.length} {rows.length === 1 ? 'session' : 'sessions'}</span></h3>
      <ul className="tses-list">
        {rows.slice(0, max).map((s, i) => {
          const m = getSubjectMetadata(s.subject);
          const waiting = sessionPending(s);
          return (
            <li key={s.id} className={`tses acc-${m.accent}`} data-new={i === 0 && Date.now() - s.endedAt < 8000 ? '' : undefined}>
              <SubjectTag name={s.subject} />
              <div className="min-0">
                <div className="t-small fw-6 truncate">{s.subject}{s.topic ? <span className="dim fw-4"> · {s.topic}</span> : null}</div>
                <div className="t-xs dim">{fmtRange(s.startedAt, s.endedAt)}</div>
              </div>
              {waiting > 0
                ? <span className="tses-wait">{fmtMinutes(waiting)} not in the log</span>
                : <span className="tses-mins">{fmtMinutes(sessionMinutesOn(s, today))}</span>}
              {waiting > 0
                ? <Button size="sm" variant="soft" onClick={() => t.retrySession(s.id)}>Add to log</Button>
                : <Button size="sm" variant="ghost" icon aria-label={`Take the ${s.subject} session out of today's log`} title="Undo this session" onClick={() => t.undoSession(s.id)}><LuUndo2 /></Button>}
            </li>
          );
        })}
      </ul>
      {rows.length > max ? <div className="t-xs dim">and {rows.length - max} earlier. Everything is in the Study log.</div> : null}
    </div>
  );
}
