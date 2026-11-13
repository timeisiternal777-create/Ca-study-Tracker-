// Builds a sample study report with the app's own report code and demo data, so the design can be checked without a browser.
//
//   node scripts/pdf-sample.mjs                                   -> /tmp/ca-report-night-tablet.pdf
//   node scripts/pdf-sample.mjs --theme=sky --page=a4 --days=30   (themes: night, sky, paper; pages: tablet, a4)
//   node scripts/pdf-sample.mjs --days=0                          (an empty report: no study logged)
//   node scripts/pdf-sample.mjs --weird                           (symbols, emoji and very long topics, to check the font fallbacks)
//   node scripts/pdf-sample.mjs --out=report.pdf
//
// Then look at it:  pdftoppm -r 80 -png report.pdf page   ·   pdffonts report.pdf   ·   pdftotext report.pdf -
import { build } from 'esbuild';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './lib.mjs';
import { buildSeed, ymd } from './seed.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return [m[1], m[2] ?? true]; }));
const theme = args.theme || 'night', page = args.page || 'tablet', days = args.days === undefined ? 14 : Number(args.days);
const out = args.out || `/tmp/ca-report-${theme}-${page}.pdf`;

const dir = await mkdtemp(path.join(tmpdir(), 'ca-pdf-'));
const entry = path.join(dir, 'entry.ts');
await writeFile(entry, `
export * from ${JSON.stringify(path.join(root, 'src/lib/reportPdf.ts'))};
export * from ${JSON.stringify(path.join(root, 'src/lib/pdf.ts'))};
export { computeStats } from ${JSON.stringify(path.join(root, 'src/lib/stats.ts'))};
export { CURRICULUM } from ${JSON.stringify(path.join(root, 'src/config/curriculum.ts'))};
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: path.join(dir, 'out.mjs'), logLevel: 'error' });
const L = await import(pathToFileURL(path.join(dir, 'out.mjs')).href);
await rm(dir, { recursive: true, force: true });

L.installPdfFonts(new Uint8Array(await readFile(path.join(root, 'public/fonts/comic-relief-400.ttf'))), new Uint8Array(await readFile(path.join(root, 'public/fonts/comic-relief-700.ttf'))));

const today = new Date();
const store = buildSeed({ today, days: Math.max(days, 1), withLogs: days > 0 });
const settings = JSON.parse(store.ca_settings_v3);
const logsAll = JSON.parse(store.ca_study_logs_v4_inter || '[]'), mocksAll = JSON.parse(store.ca_mock_scores_v4_inter || '[]');
const subjects = L.CURRICULUM.inter;
const stats = L.computeStats({ logs: logsAll, mocks: mocksAll, settings: { ...settings, restDays: [] }, mockMax: () => 100, subjects: subjects.map((s) => s.name) });
const from = new Date(today); from.setDate(from.getDate() - Math.max(days, 1) + 1);
const start = ymd(from), end = ymd(today);
if (args.weird) logsAll.forEach((l, i) => { if (i % 3 === 0) { l.topic1 = '\u20b95,000 \u2192 \u20b97,500 \u2713 done \u2605 \u25cb \u25a0 \u25b2 \u25bc \u2717 \u2190 \u2191 \u2193 caf\u00e9 \u{1F4DA} naive'; l.topic2 = 'A very long topic name that goes on and on to see how wrapping behaves inside the table cell for narrow pages'; } });
const input = {
  title: 'Study report', displayName: settings.displayName, level: 'inter', groupLabel: 'Both groups',
  rangeLabel: days > 1 ? `Last ${days} days` : 'Today', examDate: settings.targetExamDate, stats,
  logs: logsAll.filter((l) => l.date >= start && l.date <= end), mocks: mocksAll.filter((m) => m.date >= start && m.date <= end),
  subjects, dailyGoalHours: settings.dailyGoalHours, rangeStart: start, rangeEnd: end, theme, page,
};
const blob = await L.buildReportPdf(input);
const bytes = new Uint8Array(await blob.arrayBuffer());
await writeFile(out, bytes);
console.log(`${out}  ${(bytes.length / 1024).toFixed(0)} KB`);
