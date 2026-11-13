import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuPlus } from 'react-icons/lu';
import { Button, Chip, Field, Input, Modal, Stepper, SubjectTag, useToast } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { dayHours } from '../../lib/stats';
import { fmtHM, fmtNum } from '../../lib/format';
import { sfx } from '../../lib/sfx';
import { navigateTo } from '../../lib/nav';
import { emptyLog, firstFreeSlot, getSlot, slotOfSubject, withSlot, SLOTS } from '../../lib/log';

const PRESETS = [0.5, 1, 1.5, 2, 3, 4];

/** Quick “add time to a subject” dialog. Adds to the subject’s slot for today (or uses the next free slot). */
export function QuickLog({ subject, onClose }: { subject: string | null; onClose: () => void }) {
  const { subjects, allSubjectsInGroup } = useLevelConfig();
  const { studyLogs, today, saveStudyLog, deleteStudyLog, settings } = useStudy();
  const toast = useToast();
  const list = subjects.length ? subjects : allSubjectsInGroup;
  const [name, setName] = useState(subject ?? list[0]?.name ?? '');
  const [hours, setHours] = useState(1);
  const [topic, setTopic] = useState('');
  const open = subject !== null;

  useEffect(() => { if (subject) { setName(subject); setHours(1); setTopic(''); } }, [subject]);

  const todayLog = studyLogs.find((l) => l.date === today);
  const existingSlot = slotOfSubject(todayLog, name);
  const target = existingSlot || firstFreeSlot(todayLog);
  const already = existingSlot ? getSlot(todayLog, existingSlot).hours : 0;

  const recentTopics = useMemo(() => {
    const seen: string[] = [];
    for (const l of [...studyLogs].reverse()) {
      for (const k of SLOTS) {
        const sl = getSlot(l, k);
        if (sl.subject === name && sl.topic && !seen.includes(sl.topic)) seen.push(sl.topic);
      }
      if (seen.length >= 4) break;
    }
    return seen.slice(0, 4);
  }, [studyLogs, name]);

  const save = () => {
    if (!name || !target) return;
    const prev = todayLog ? { ...todayLog } : undefined;
    const cur = getSlot(todayLog, target);
    const t = topic.trim();
    const mergedTopic = t && !cur.topic.toLowerCase().includes(t.toLowerCase()) ? (cur.topic ? `${cur.topic}; ${t}` : t) : cur.topic;
    const base = withSlot(todayLog ?? emptyLog(today), target, { subject: name, hours: Math.min(16, cur.hours + hours), topic: mergedTopic });
    const before = prev ? dayHours(prev) : 0;
    saveStudyLog(base);
    const after = dayHours(base);
    const goal = settings.dailyGoalHours;
    if (before < 10 && after >= 10) { toast({ message: 'Beast mode unlocked', sub: `${fmtNum(after)} hours today`, tone: 'good' }); }
    else if (before < goal && after >= goal) { toast({ message: 'Daily goal reached', sub: `${fmtNum(after)} of ${fmtNum(goal)} hours`, tone: 'good' }); }
    else {
      sfx.play('save');
      toast({
        message: `Added ${fmtHM(hours)} to ${name}`, sub: `Today: ${fmtHM(after)} of ${fmtHM(goal)}`, tone: 'good',
        action: { label: 'Undo', onClick: () => { if (prev) saveStudyLog(prev); else deleteStudyLog(today); } },
      });
    }
    onClose();
  };

  const full = !target;
  return (
    <Modal
      open={open} onClose={onClose} size="sm" title="Add study time" description="Adds to today’s log. You can fine-tune any day in the Study log."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {full
          ? <Button variant="primary" onClick={() => { onClose(); navigateTo('LOG'); }}>Open study log</Button>
          : <Button variant="primary" onClick={save}><LuCheck />Add {fmtHM(hours)}</Button>}
      </>}
    >
      <div className="col g-5">
        <div className="field">
          <span className="field-label">Subject</span>
          <div className="chips chips--scroll no-scrollbar" role="radiogroup" aria-label="Subject">
            {list.map((s) => (
              <Chip key={s.id} selected={s.name === name} accent={s.accent} dot onClick={() => { setName(s.name); }}>{s.abbrev}</Chip>
            ))}
          </div>
          <div className="row g-2 mt-1"><SubjectTag name={name} /><span className="t-small muted truncate">{name}</span></div>
        </div>

        <div className="col g-3" style={{ alignItems: 'center' }}>
          <Stepper value={hours} onChange={setHours} min={0.5} max={12} step={0.5} />
          <div className="chips" style={{ justifyContent: 'center' }}>
            {PRESETS.map((p) => <Chip key={p} selected={hours === p} onClick={() => { setHours(p); }}>{fmtNum(p)}h</Chip>)}
          </div>
          {already > 0 ? <div className="t-small dim">Already {fmtHM(already)} on {name} today</div> : null}
        </div>

        <Field label="What did you cover?" right="optional">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Consolidation — step acquisition" maxLength={120} onKeyDown={(e) => { if (e.key === 'Enter' && !full) save(); }} />
        </Field>
        {recentTopics.length > 0 && (
          <div className="col g-2" style={{ marginTop: -6 }}>
            <span className="t-xs dim">Recent topics</span>
            <div className="chips">{recentTopics.map((t) => <Chip key={t} onClick={() => setTopic(t)}><LuPlus />{t}</Chip>)}</div>
          </div>
        )}
        {full ? <div className="callout acc-warn">Today already has six subjects. Open the study log to edit them.</div> : null}
      </div>
    </Modal>
  );
}
