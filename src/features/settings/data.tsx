import { useMemo, useRef, useState, type ReactNode } from 'react';
import { LuCircleAlert, LuDatabaseBackup, LuDownload, LuFileDown, LuFileText, LuFolderOpen, LuHardDriveDownload, LuTriangleAlert, LuUpload } from 'react-icons/lu';
import { Button, Callout, Card, CardHead, Field, Input, Modal, Segmented, Switch, Tag, useConfirm, useToast } from '../../components/ui';
import { useLevelConfig } from '../../context/LevelContext';
import { useStudy } from '../../context/StudyContext';
import { addDays, diffDays, fmtDate, isValidYmd, todayStr, ymd } from '../../lib/date';
import { allowReportFolder, chooseReportFolder, forgetReportFolder, reportInputFor, saveReportNow, setAutoReport, useAutoReport, useReportSource } from '../../lib/dailyReport';
import { downloadBlob, formatBytes, readFileText, slug } from '../../lib/files';
import { fmtHM, fmtInt, plural } from '../../lib/format';
import { REPORT_PAGES, REPORT_THEMES, buildReportPdf, type ReportPage, type ReportTheme } from '../../lib/reportPdf';
import { dayHours } from '../../lib/stats';
import { readRaw, writeRaw } from '../../lib/storage';
import { sfx } from '../../lib/sfx';
import type { BackupPayload, Level } from '../../types';
import { levelLabel as levelName } from '../../config/curriculum';

/** Small label + description + control row used across Settings. */
export function Row({ title, desc, children, stack }: { title: string; desc?: ReactNode; children?: ReactNode; stack?: boolean }) {
  return (
    <div className={`st-row${stack ? ' st-row--stack' : ''}`}>
      <div className="st-row-t"><b>{title}</b>{desc ? <span>{desc}</span> : null}</div>
      {children ? <div className="st-row-c">{children}</div> : null}
    </div>
  );
}

/* ───────────────────────── PDF report ───────────────────────── */

type RangeId = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom';

export function ReportsSection() {
  const src = useReportSource();
  const toast = useToast();
  const { today, updateSettings } = useStudy();
  const theme: ReportTheme = src.settings.reportTheme ?? 'night';
  const pageShape: ReportPage = src.settings.reportPage ?? 'tablet';
  const [range, setRange] = useState<RangeId>('7d');
  const [from, setFrom] = useState(() => addDays(today, -13));
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);

  const first = useMemo(() => src.logs.reduce((m, l) => (dayHours(l) > 0 && (!m || l.date < m) ? l.date : m), ''), [src.logs]);
  const span = useMemo(() => {
    let start = today, end = today, label = fmtDate(today, { weekday: true, year: true });
    if (range === '7d') { start = addDays(today, -6); label = `Last 7 days`; }
    else if (range === '30d') { start = addDays(today, -29); label = `Last 30 days`; }
    else if (range === 'month') { start = `${today.slice(0, 8)}01`; label = `This month`; }
    else if (range === 'all') { start = first || today; label = 'Everything so far'; }
    else if (range === 'custom') { start = from; end = to; label = 'Custom range'; }
    const range2 = start === end ? fmtDate(start, { weekday: true, year: true }) : `${fmtDate(start, { year: true })} to ${fmtDate(end, { year: true })}`;
    return { start, end, label: range === 'today' || range === 'custom' ? range2 : `${label}, ${range2}`, title: range2 };
  }, [range, from, to, today, first]);

  const invalid = !isValidYmd(span.start) || !isValidYmd(span.end) || span.start > span.end;
  const preview = useMemo(() => {
    if (invalid) return { hours: 0, days: 0, best: 0, n: 0 };
    const per = new Map<string, number>();
    for (const l of src.logs) if (l.date >= span.start && l.date <= span.end) per.set(l.date, (per.get(l.date) || 0) + dayHours(l));
    const vals = [...per.values()].filter((h) => h > 0);
    return { hours: vals.reduce((a, b) => a + b, 0), days: vals.length, best: Math.max(0, ...vals), n: diffDays(span.start, span.end) + 1 };
  }, [src.logs, span, invalid]);

  const download = async () => {
    setBusy(true);
    try {
      await new Promise((r) => window.setTimeout(r, 40));
      const blob = await buildReportPdf(reportInputFor(src, span.start, span.end, span.label));
      downloadBlob(blob, `study-report-${slug(src.settings.displayName || 'student')}-${span.start}${span.start === span.end ? '' : `-to-${span.end}`}.pdf`, 'application/pdf');
      sfx.play('success');
      toast({ message: 'Report downloaded', sub: `${formatBytes(blob.size)} · ${plural(preview.days, 'study day')}`, tone: 'good' });
    } catch (e) {
      toast({ message: 'The report could not be created', sub: (e as Error).message, tone: 'bad' });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHead icon={<span className="stat-icon acc-cyan"><LuFileText /></span>} title="Study report" sub="A designed PDF with your hours, papers, mock tests and a day-by-day log. It opens in any PDF app and the text can be selected and searched." />
      <div className="st-range">
        <Segmented<RangeId> label="Report range" value={range} onChange={(v) => { setRange(v); }} options={[
          { value: 'today', label: 'Today' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' },
          { value: 'month', label: 'Month' }, { value: 'all', label: 'All' }, { value: 'custom', label: 'Custom' },
        ]} />
        {range === 'custom' ? (
          <div className="st-fields">
            <Field label="From" error={invalid ? 'Pick a start date that is on or before the end date.' : undefined}><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-invalid={invalid} /></Field>
            <Field label="To"><Input type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        ) : null}
        <div className="st-look" role="radiogroup" aria-label="Report look">
          {REPORT_THEMES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className={`st-look-opt${theme === t.id ? ' is-on' : ''}`} onClick={() => updateSettings({ reportTheme: t.id })}>
              <span className="st-look-sw" style={{ background: t.swatch[0] }} aria-hidden>
                <i style={{ background: t.swatch[1], height: '46%' }} /><i style={{ background: t.swatch[2], height: '78%' }} /><i style={{ background: t.swatch[1], height: '60%' }} /><i style={{ background: t.swatch[2], height: '34%' }} />
              </span>
              <span className="st-look-name">{t.name}</span>
              <span className="st-look-note">{t.note}</span>
            </button>
          ))}
        </div>
        <Segmented<ReportPage> label="Page shape" value={pageShape} onChange={(v) => updateSettings({ reportPage: v })} options={REPORT_PAGES.map((p) => ({ value: p.id, label: p.name }))} />
        <span className="t-small dim st-page-note">{REPORT_PAGES.find((p) => p.id === pageShape)?.note} The saved daily reports use the same look.</span>
        <div className="st-kpis" aria-live="polite">
          <div className="st-kpi"><b className="t-num">{fmtHM(preview.hours)}</b><span>Studied</span></div>
          <div className="st-kpi"><b className="t-num">{preview.days}<small className="dim"> / {Math.max(preview.n, 0)}</small></b><span>Days studied</span></div>
          <div className="st-kpi"><b className="t-num">{fmtHM(preview.best)}</b><span>Best day</span></div>
        </div>
        <div className="row g-3 wrap">
          <Button variant="primary" loading={busy} disabled={invalid} onClick={download}><LuFileDown aria-hidden /> Download PDF</Button>
          {!preview.days && !invalid ? <span className="t-small dim">Nothing is logged in this range yet. The report will still open with empty charts.</span> : null}
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────── Automatic daily report ───────────────────────── */

export function AutoReportSection() {
  const a = useAutoReport();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  const tone = a.status === 'success' ? 'good' : a.status === 'failed' ? 'bad' : a.status === 'permission' ? 'warn' : undefined;
  const statusText = a.status === 'working' ? 'Saving…' : a.status === 'success' ? 'Saved' : a.status === 'permission' ? 'Needs access' : a.status === 'failed' ? 'Problem' : a.enabled ? 'Waiting for study to log' : 'Off';

  return (
    <Card>
      <CardHead icon={<span className="stat-icon acc-mint"><LuHardDriveDownload /></span>} title="Daily report folder" sub="Save a PDF of every study day into a folder on this device, automatically."
        action={a.supported ? <Tag accent={tone}>{statusText}</Tag> : <Tag>Not available</Tag>} />
      {!a.supported ? (
        <Callout icon={<LuCircleAlert aria-hidden />} accent="warn">Saving to a folder needs Chrome or Edge on a computer or tablet, opened from a secure address. You can still download reports by hand above.</Callout>
      ) : (
        <>
          <Row title="Save a report every day" desc="Today's PDF updates as you log. Yesterday's final version is saved the next time you open the app.">
            <Switch checked={a.enabled} label="Save a report every day" onChange={(v) => run(() => setAutoReport(v))} disabled={busy} />
          </Row>
          {a.folderName ? (
            <Row title="Folder" desc={a.lastDate ? `Last report: ${fmtDate(a.lastDate, { weekday: true, year: true })}` : 'No report has been saved yet.'}>
              <Tag><LuFolderOpen aria-hidden /> {a.folderName}</Tag>
              <Button size="sm" onClick={() => run(async () => { await chooseReportFolder(); })} disabled={busy}>Change</Button>
              <Button size="sm" variant="ghost" onClick={() => run(forgetReportFolder)} disabled={busy}>Forget</Button>
            </Row>
          ) : (
            <Row title="Folder" desc="Pick where the PDFs should go. The browser asks you once and remembers it.">
              <Button variant="primary" size="sm" onClick={() => run(async () => { await chooseReportFolder(); })} disabled={busy}>Choose folder</Button>
            </Row>
          )}
          {a.status === 'permission' ? (
            <Callout icon={<LuTriangleAlert aria-hidden />} accent="warn">
              <div className="row between g-3 wrap"><span>Your browser needs you to allow folder access again. This happens after the browser restarts.</span><Button size="sm" variant="primary" onClick={() => run(allowReportFolder)}>Allow access</Button></div>
            </Callout>
          ) : null}
          {a.status === 'failed' && a.error ? <Callout icon={<LuCircleAlert aria-hidden />} accent="bad">{a.error}</Callout> : null}
          {a.folderName ? (
            <Row title="Save today's report now" desc="Writes today's PDF straight away, even before you log anything.">
              <Button size="sm" onClick={() => run(async () => { await saveReportNow(); toast({ message: 'Report saved to your folder', tone: 'good' }); })} disabled={busy || a.status === 'permission'}>Save now</Button>
            </Row>
          ) : null}
        </>
      )}
    </Card>
  );
}


/* ───────────────────────── Backup & restore ───────────────────────── */

const LAST_BACKUP = 'backup_last_at';

export function BackupSection() {
  const { exportBackup, importBackupData, studyLogs, mockScores, today } = useStudy();
  const { level } = useLevelConfig();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [last, setLast] = useState(() => readRaw(LAST_BACKUP) || '');
  const [pending, setPending] = useState<{ data: BackupPayload; name: string; size: number } | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const exportNow = () => {
    const payload = exportBackup();
    const text = JSON.stringify(payload, null, 2);
    downloadBlob(text, `ca-study-tracker-${level}-${todayStr()}.json`, 'application/json');
    const now = new Date().toISOString();
    writeRaw(LAST_BACKUP, now); setLast(now);
    sfx.play('success');
    toast({ message: 'Backup downloaded', sub: `${plural(payload.studyLogs.length, 'study day')}, ${plural(payload.mockScores.length, 'mock test')}. Keep the file somewhere safe.`, tone: 'good' });
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await readFileText(file)) as BackupPayload;
      if (!data || typeof data !== 'object' || (!Array.isArray(data.studyLogs) && !Array.isArray(data.mockScores) && !data.settings)) throw new Error('shape');
      setMode('merge');
      setPending({ data, name: file.name, size: file.size });
    } catch {
      sfx.play('error');
      toast({ message: 'That file is not a study tracker backup', sub: 'Choose a .json file exported from this app or from the earlier version.', tone: 'bad' });
    } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const otherLevel: Level | null = pending && (['foundation', 'inter', 'final'] as const).includes(pending.data.level as Level) && pending.data.level !== level ? pending.data.level : null;
  const doImport = () => {
    if (!pending) return;
    try {
      const res = importBackupData(pending.data, mode);
      sfx.play('success');
      toast({ message: 'Backup restored', sub: `${plural(res.logs, 'study day')} and ${plural(res.mocks, 'mock test')} ${mode === 'merge' ? 'merged in' : 'now in place'}.`, tone: 'good' });
      setPending(null);
    } catch (e) {
      sfx.play('error');
      toast({ message: 'Import failed', sub: (e as Error).message, tone: 'bad' });
    }
  };

  const days = last ? diffDays(ymd(new Date(last)), today) : null;
  const stale = studyLogs.length + mockScores.length > 0 && (days === null || days > 14);

  return (
    <Card data-tour="backup">
      <CardHead icon={<span className="stat-icon acc-violet"><LuDatabaseBackup /></span>} title="Backup and restore" sub="Your data lives only in this browser. A backup file is the way to move it or keep it safe."
        action={days === null ? <Tag accent={stale ? 'warn' : undefined}>Never backed up</Tag> : <Tag accent={stale ? 'warn' : 'good'}>{days <= 0 ? 'Backed up today' : `Backed up ${plural(days, 'day')} ago`}</Tag>} />
      <Row title="Download a backup" desc="One file with your study days, mock tests, targets, manifest and settings.">
        <Button variant="primary" onClick={exportNow}><LuDownload aria-hidden /> Download</Button>
      </Row>
      <Row title="Restore from a backup" desc="Works with files from this version and from the earlier version of the app.">
        <Button onClick={() => fileRef.current?.click()}><LuUpload aria-hidden /> Choose file</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onPick(e.target.files?.[0])} />
      </Row>

      <Modal open={!!pending} onClose={() => setPending(null)} title="Restore this backup?" description={pending ? `${pending.name} · ${formatBytes(pending.size)}` : undefined}
        footer={<>
          <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
          <Button variant={mode === 'replace' ? 'danger-solid' : 'primary'} disabled={!!otherLevel} onClick={doImport}>{mode === 'replace' ? 'Replace my data' : 'Merge into my data'}</Button>
        </>}>
        {pending ? (
          <>
            <div className="st-import-grid">
              <div><b className="t-num">{fmtInt(Array.isArray(pending.data.studyLogs) ? pending.data.studyLogs.length : 0)}</b><span>Study days</span></div>
              <div><b className="t-num">{fmtInt(Array.isArray(pending.data.mockScores) ? pending.data.mockScores.length : 0)}</b><span>Mock tests</span></div>
              <div><b>{pending.data.level ? levelName(pending.data.level as Level) : levelName(level)}</b><span>{pending.data.level ? 'Level in the file' : 'Older file: goes into this level'}</span></div>
              <div><b>{pending.data.backupDate && !Number.isNaN(new Date(pending.data.backupDate).getTime()) ? fmtDate(ymd(new Date(pending.data.backupDate)), { year: true }) : 'Unknown'}</b><span>Backup date</span></div>
            </div>
            {otherLevel ? (
              <Callout icon={<LuTriangleAlert aria-hidden />} accent="warn">This backup is for {levelName(otherLevel)}, but you are in {levelName(level)}. Switch level under Exam and papers, then restore it again so nothing lands in the wrong level.</Callout>
            ) : (
              <>
                <Segmented<'merge' | 'replace'> block label="Restore mode" value={mode} onChange={setMode} options={[{ value: 'merge', label: 'Merge' }, { value: 'replace', label: 'Replace' }]} />
                <p className="t-small muted mt-3" style={{ lineHeight: 1.55 }}>
                  {mode === 'merge' ? 'Keeps everything you have now and adds the days from the file. If both have the same day, the file wins.' : 'Removes your current study days and mock tests for this level and uses only what is in the file.'}
                </p>
              </>
            )}
          </>
        ) : null}
      </Modal>
    </Card>
  );
}

/* ───────────────────────── Danger zone ───────────────────────── */

export function DangerSection() {
  const { studyLogs, mockScores, clearStudyLogs, clearMockScores, clearManifestationData, clearAllData, exportBackup } = useStudy();
  const { levelLabel, groupLabel } = useLevelConfig();
  const confirm = useConfirm();
  const toast = useToast();
  const [wipe, setWipe] = useState(false);
  const [typed, setTyped] = useState('');

  const act = async (title: string, body: string, label: string, run: () => void, done: string) => {
    if (!(await confirm({ title, body, confirmLabel: label, danger: true }))) return;
    run();
    toast({ message: done, tone: 'info' });
  };
  const backupFirst = () => {
    downloadBlob(JSON.stringify(exportBackup(), null, 2), `ca-study-tracker-safety-${todayStr()}.json`, 'application/json');
    writeRaw(LAST_BACKUP, new Date().toISOString());
    toast({ message: 'Safety backup downloaded', tone: 'good' });
  };

  return (
    <Card className="st-danger">
      <CardHead icon={<span className="stat-icon acc-bad"><LuTriangleAlert /></span>} title="Danger zone" sub={`Removes data for ${levelLabel}, ${groupLabel}. It cannot be undone.`}
        action={<Button size="sm" onClick={backupFirst}><LuDownload aria-hidden /> Back up first</Button>} />
      <Row title="Clear study logs" desc={`${plural(studyLogs.length, 'study day')} will be removed.`}>
        <Button variant="danger" size="sm" disabled={!studyLogs.length} onClick={() => act('Clear all study logs?', `This removes ${plural(studyLogs.length, 'study day')} from ${levelLabel}. Your XP and streaks are worked out from these days, so they reset too.`, 'Clear logs', clearStudyLogs, 'Study logs cleared')}>Clear</Button>
      </Row>
      <Row title="Clear mock tests" desc={`${plural(mockScores.length, 'mock test')} will be removed.`}>
        <Button variant="danger" size="sm" disabled={!mockScores.length} onClick={() => act('Clear all mock tests?', `This removes ${plural(mockScores.length, 'mock test')} from ${levelLabel}.`, 'Clear mocks', clearMockScores, 'Mock tests cleared')}>Clear</Button>
      </Row>
      <Row title="Clear the manifest marksheet" desc="Resets the marks you are aiming for.">
        <Button variant="danger" size="sm" onClick={() => act('Clear the marksheet?', 'The target marks and the name on your manifest marksheet will be removed.', 'Clear marksheet', clearManifestationData, 'Marksheet cleared')}>Clear</Button>
      </Row>
      <Row title={`Wipe ${levelLabel}`} desc="Logs, mock tests, marksheet, syllabus plan, backlog and plan settings for this level and group. Settings and other levels stay.">
        <Button variant="danger-solid" size="sm" onClick={() => { setTyped(''); setWipe(true); }}>Wipe level</Button>
      </Row>

      <Modal open={wipe} onClose={() => setWipe(false)} size="sm" title={`Wipe ${levelLabel}?`}
        footer={<>
          <Button variant="ghost" onClick={() => setWipe(false)}>Cancel</Button>
          <Button variant="danger-solid" disabled={typed.trim().toUpperCase() !== 'DELETE'} onClick={() => { clearAllData(); setWipe(false); toast({ message: `${levelLabel} wiped`, tone: 'info' }); }}>Wipe everything</Button>
        </>}>
        <p className="t-small muted" style={{ lineHeight: 1.55, fontSize: 14.5, marginBottom: 14 }}>This removes {plural(studyLogs.length, 'study day')}, {plural(mockScores.length, 'mock test')}, the marksheet and the syllabus plan for {levelLabel}, {groupLabel}. Type <b className="tx-0">DELETE</b> to confirm.</p>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" autoComplete="off" autoCapitalize="characters" aria-label="Type DELETE to confirm" data-autofocus />
      </Modal>
    </Card>
  );
}
