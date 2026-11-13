import { useEffect, useMemo, useRef, useState } from 'react';
import './targets.css';
import { PageHeader, Segmented, useConfirm, useToast } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { plural } from '../../lib/format';
import { sfx } from '../../lib/sfx';
import { importSyllabusFile, useTargets, type PlanSource } from '../../lib/targets';
import { DatePlan } from './DatePlan';
import { BuilderModal } from './Shared';
import { ScheduleModal } from './Schedule';
import { Setup } from './Setup';
import { Syllabus } from './Syllabus';

export default function Tab() {
  const t = useTargets();
  const { allSubjectsInGroup } = useLevelConfig();
  const confirm = useConfirm();
  const toast = useToast();

  const hasSyllabus = t.syllabus.length > 0;
  const hasDates = (t.custom?.rows.length ?? 0) > 0;
  const [view, setView] = useState<PlanSource | null>(() => t.source ?? (hasSyllabus ? 'excel' : hasDates ? 'custom' : null));
  const [startedEmpty, setStartedEmpty] = useState(false);
  const [building, setBuilding] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [busy, setBusy] = useState(false);

  // Remember which plan was last open.
  useEffect(() => {
    if (view && t.source !== view && (view === 'excel' ? hasSyllabus : hasDates)) t.setSource(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, hasSyllabus, hasDates]);

  // A freshly built date plan opens straight away.
  const hadDates = useRef(hasDates);
  useEffect(() => { if (hasDates && !hadDates.current) setView('custom'); hadDates.current = hasDates; }, [hasDates]);

  const api = useMemo(() => ({ ...t, clearPlan: (kind: PlanSource) => { t.clearPlan(kind); if (kind === 'excel') setStartedEmpty(false); } }), [t]);

  const importFile = async (file: File) => {
    setBusy(true);
    try {
      const r = await importSyllabusFile(file, allSubjectsInGroup);
      if (hasSyllabus && !(await confirm({ title: 'Replace your syllabus plan?', body: `This file has ${plural(r.items.length, 'topic')}. They will replace your current ${plural(t.syllabus.length, 'topic')} and their progress.`, confirmLabel: 'Import and replace', danger: true }))) return;
      t.saveSyllabus(r.items);
      setView('excel');
      sfx.play('success');
      const note = r.skipped ? `${plural(r.skipped, 'row')} skipped${r.unknown.length ? `. No paper called ${r.unknown.slice(0, 3).join(', ')}${r.unknown.length > 3 ? '…' : ''}` : ''}.` : `Read from the sheet “${r.sheet}”.`;
      toast({ message: `Imported ${plural(r.items.length, 'topic')}`, sub: note, tone: r.skipped ? 'warn' : 'good', duration: r.skipped ? 8000 : 4000 });
    } catch (e) {
      toast({ message: 'That file could not be imported', sub: e instanceof Error ? e.message : 'Check the file and try again.', tone: 'bad', duration: 10000 });
    } finally { setBusy(false); }
  };

  const showSyllabus = view === 'excel' && (hasSyllabus || startedEmpty);
  const showDates = view === 'custom' && hasDates;
  const sub = showSyllabus ? 'Tick chapters off and keep an eye on the daily pace.' : showDates ? 'Plan each day, and clear what you missed.' : 'Choose how you want to plan your preparation.';

  return (
    <div className="page-enter">
      <PageHeader
        title="Schedule"
        sub={sub}
        actions={view ? (
          <Segmented<PlanSource> label="Plan type" value={view} onChange={(v) => { setView(v); if (v === 'excel' && !hasSyllabus) setStartedEmpty(false); }} options={[{ value: 'excel', label: 'Syllabus plan' }, { value: 'custom', label: 'Date plan' }]} />
        ) : null}
      />
      {showSyllabus ? <Syllabus t={api} onImport={importFile} onSchedule={() => setScheduling(true)} />
        : showDates ? <DatePlan t={api} onRebuild={() => setBuilding(true)} />
        : <Setup only={view} busy={busy} onImport={importFile} onStartEmpty={() => { setStartedEmpty(true); setView('excel'); }} onBuild={() => setBuilding(true)} />}
      <ScheduleModal key={scheduling ? 'open' : 'closed'} open={scheduling} onClose={() => setScheduling(false)} t={t} onDone={() => setView('custom')} />
      <BuilderModal key={building ? 'open' : 'closed'} open={building} onClose={() => setBuilding(false)} t={t} replacing={hasDates} />
    </div>
  );
}
