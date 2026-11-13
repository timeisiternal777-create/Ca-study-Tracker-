import { useRef } from 'react';
import { LuCalendarDays, LuDownload, LuListChecks, LuPlus, LuUpload } from 'react-icons/lu';
import { Button, Card } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { downloadBlob } from '../../lib/files';
import { cn } from '../../lib/format';
import { syllabusTemplate, type PlanSource } from '../../lib/targets';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** First-time chooser. Pass `only` to show a single kind of plan. */
export function Setup({ only, busy, onImport, onStartEmpty, onBuild }: { only: PlanSource | null; busy: boolean; onImport: (f: File) => void; onStartEmpty: () => void; onBuild: () => void }) {
  const { allSubjectsInGroup } = useLevelConfig();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('tg-choose stagger', only && 'tg-choose--one')} data-tour="plan-start">
      {only !== 'custom' ? (
        <Card className="tg-opt acc-violet" tinted>
          <span className="stat-icon acc-violet"><LuListChecks aria-hidden /></span>
          <h2>Syllabus plan</h2>
          <p>List every chapter with the hours you want to give it, then tick chapters off as you finish. The app works out how many hours a day you need to be ready by your exam.</p>
          <ul>
            <li>Import a list from Excel, or type the topics in</li>
            <li>Daily pace that accounts for rest days and Sundays</li>
            <li>Scale all hours up or down in one step</li>
          </ul>
          <div className="row g-3 wrap" style={{ marginTop: 'auto' }}>
            <Button variant="primary" loading={busy} onClick={() => fileRef.current?.click()}><LuUpload aria-hidden /> Import from Excel</Button>
            <Button onClick={() => downloadBlob(syllabusTemplate(allSubjectsInGroup), 'ca-targets-template.xlsx', XLSX)}><LuDownload aria-hidden /> Get the template</Button>
            <Button variant="ghost" onClick={onStartEmpty}><LuPlus aria-hidden /> Start with an empty list</Button>
          </div>
          <input ref={fileRef} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        </Card>
      ) : null}
      {only !== 'excel' ? (
        <Card className="tg-opt acc-cyan" tinted>
          <span className="stat-icon acc-cyan"><LuCalendarDays aria-hidden /></span>
          <h2>Date plan</h2>
          <p>Give each day a few study slots, then fill in what you will study. Anything planned for a day that passes without study lands in your backlog, so nothing quietly slips.</p>
          <ul>
            <li>Pick the dates, papers and slots per day</li>
            <li>Tick slots off, or let your study log cover them</li>
            <li>Missed topics collect in a backlog you can clear</li>
          </ul>
          <div className="row g-3 wrap" style={{ marginTop: 'auto' }}>
            <Button variant="primary" onClick={onBuild}><LuCalendarDays aria-hidden /> Build a date plan</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
