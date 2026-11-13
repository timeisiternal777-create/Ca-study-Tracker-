// The study report: a designed PDF built on lib/pdf.ts. Real text in the Comic Relief font (a Comic Sans look-alike),
// real tables, gradient bars and rings, three colour looks and two page shapes. No libraries, no screenshots,
// so the text stays selectable and the file stays small.
import type { DailyStudyLog, Level, MockLogEntry, StudyStats, SubjectConfig } from '../types';
import { levelLabel } from '../config/curriculum';
import { diffDays, eachDay, fmtDate, monthName, parseYmd, startOfWeek, todayStr } from './date';
import { fmtHM, fmtInt, fmtNum, plural } from './format';
import { A4, TABLET, PdfDoc, type PdfColor, type PdfPage, capMid, fit, fitSize, loadPdfFonts, measure, mix, wrap } from './pdf';
import { dayHours, gradeFor } from './stats';
import { SLOTS, getSlot, subjectHoursOf } from './log';

export type ReportTheme = 'night' | 'sky' | 'paper';
export type ReportPage = 'tablet' | 'a4';

export const REPORT_THEMES: { id: ReportTheme; name: string; note: string; swatch: [string, string, string] }[] = [
  { id: 'night', name: 'Night', note: 'Deep blue, glowing colours. Best on a screen.', swatch: ['#070b1c', '#4dd8e8', '#9c8cff'] },
  { id: 'sky', name: 'Sky', note: 'Bright and colourful. Easy to read in daylight.', swatch: ['#eaf1ff', '#2f6be8', '#8a5cf0'] },
  { id: 'paper', name: 'Paper', note: 'Clean white. Uses the least ink to print.', swatch: ['#ffffff', '#139bb0', '#0d1430'] },
];
export const REPORT_PAGES: { id: ReportPage; name: string; note: string }[] = [
  { id: 'tablet', name: 'Tablet', note: 'Wide 16:10 pages that fill a tablet held sideways.' },
  { id: 'a4', name: 'A4', note: 'Tall A4 pages for printing.' },
];

export interface ReportInput {
  title: string;
  displayName: string;
  level: Level;
  /** e.g. 'Group 1' or 'Both groups' */
  groupLabel: string;
  /** Human text, e.g. 'Sun, 25 Oct 2026' or 'Last 30 days' */
  rangeLabel: string;
  examDate: string;
  stats: StudyStats;
  /** Logs inside the range, ascending by date */
  logs: DailyStudyLog[];
  mocks: MockLogEntry[];
  subjects: SubjectConfig[];
  dailyGoalHours: number;
  /** Optional exact range (YYYY-MM-DD). When omitted it is derived from the logs. */
  rangeStart?: string;
  rangeEnd?: string;
  theme?: ReportTheme;
  page?: ReportPage;
  /** The rank name to print when the app shows ranks under other names (the Voyage world). Falls back to the everyday name. */
  rankLabel?: string;
}

type AccentName = 'cyan' | 'violet' | 'gold' | 'ember' | 'mint' | 'rose';
interface Palette {
  dark: boolean;
  headDark: boolean;
  bg: string; bg2: string | null;
  card: string; cardTop: string; card2: string; border: string;
  ink: string; text: string; muted: string; faint: string;
  head: [string, string]; headText: string; headSub: string;
  track: string; thead: string; theadText: string; zebra: string;
  accent: Record<AccentName, string>;
  rule: [string, string, string];
  glows: { x: number; y: number; r: number; color: string }[];
}

const THEMES: Record<ReportTheme, Palette> = {
  night: {
    dark: true, headDark: true, bg: '#070b1c', bg2: null,
    card: '#0f1832', cardTop: '#141f40', card2: '#17234a', border: '#243259',
    ink: '#ffffff', text: '#e8ecfb', muted: '#a2add0', faint: '#6e7ba6',
    head: ['#1d2b7c', '#0c5f82'], headText: '#ffffff', headSub: '#bcc9f2',
    track: '#1b2750', thead: '#1b2c66', theadText: '#d3e2ff', zebra: '#0b1430',
    accent: { cyan: '#4dd8e8', violet: '#9c8cff', gold: '#f9dc5c', ember: '#ff7f4d', mint: '#46e3a8', rose: '#f45b8d' },
    rule: ['#4dd8e8', '#9c8cff', '#f9dc5c'],
    glows: [{ x: 0.96, y: 0.02, r: 0.95, color: '#2b2370' }, { x: 0.02, y: 1.0, r: 0.8, color: '#0b3f5e' }],
  },
  sky: {
    dark: false, headDark: true, bg: '#e9f0ff', bg2: '#f6f0ff',
    card: '#ffffff', cardTop: '#ffffff', card2: '#f1f5ff', border: '#d7dff4',
    ink: '#10173a', text: '#222b4e', muted: '#5d698f', faint: '#8c97b8',
    head: ['#2e69e6', '#8b5cf1'], headText: '#ffffff', headSub: '#e0e7ff',
    track: '#e0e7f8', thead: '#2a3a80', theadText: '#ffffff', zebra: '#f5f8ff',
    accent: { cyan: '#0aa3bb', violet: '#6a55e6', gold: '#d49a00', ember: '#e8591a', mint: '#0e9d6c', rose: '#d92b66' },
    rule: ['#38e0f0', '#c4b5fd', '#fbcfe8'],
    glows: [{ x: 1.0, y: 0.0, r: 0.9, color: '#d8caff' }, { x: 0.0, y: 1.0, r: 0.75, color: '#c0ebff' }],
  },
  paper: {
    dark: false, headDark: false, bg: '#ffffff', bg2: null,
    card: '#ffffff', cardTop: '#ffffff', card2: '#f5f7fb', border: '#dde3ee',
    ink: '#0d1430', text: '#1b2237', muted: '#586381', faint: '#8b94ab',
    head: ['#eef2fb', '#eef2fb'], headText: '#0d1430', headSub: '#586381',
    track: '#e7ebf4', thead: '#0d1430', theadText: '#ffffff', zebra: '#f6f8fc',
    accent: { cyan: '#139bb0', violet: '#6853e0', gold: '#c08a00', ember: '#dd4d14', mint: '#0f9a68', rose: '#d02a62' },
    rule: ['#139bb0', '#6853e0', '#d02a62'],
    glows: [],
  },
};

const shade = (c: PdfColor, t: number) => mix(c, '#000000', t);

export async function buildReportPdf(input: ReportInput): Promise<Blob> {
  await loadPdfFonts();
  const { displayName, level, groupLabel, stats, logs, mocks, subjects, dailyGoalHours } = input;
  const T = THEMES[input.theme && THEMES[input.theme] ? input.theme : 'night'];
  const a4 = input.page === 'a4';
  const W = a4 ? A4.w : TABLET.w, H = a4 ? A4.h : TABLET.h;
  const M = a4 ? 32 : 30, CW = W - M * 2, FOOT = 38;
  const headH = a4 ? 100 : 82, tileH = a4 ? 70 : 62;
  const goal = dailyGoalHours > 0 ? dailyGoalHours : 8;
  const today = todayStr();
  const doc = new PdfDoc({ title: input.title || 'Study report', author: displayName || 'CA Study Tracker', subject: `${levelLabel(level)} study report, ${input.rangeLabel}` });

  /* ───────── numbers ───────── */
  const byDate = new Map<string, DailyStudyLog[]>();
  for (const l of logs) { if (dayHours(l) > 0) byDate.set(l.date, [...(byDate.get(l.date) || []), l]); }
  const dates = [...byDate.keys()].sort();
  let start = input.rangeStart || dates[0] || '';
  let end = input.rangeEnd || dates[dates.length - 1] || '';
  if (start && end && start > end) [start, end] = [end, start];
  const allDays = start && end ? eachDay(start, end) : [];
  const totals = new Map<string, number>();
  for (const [d, ls] of byDate) totals.set(d, ls.reduce((a, l) => a + dayHours(l), 0));
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const span = Math.max(allDays.length, dates.length, 1);
  const studiedDays = dates.length;
  const avg = total / span;
  let best = 0, bestDate = '';
  for (const [d, h] of totals) if (h > best) { best = h; bestDate = d; }
  const goalDays = [...totals.values()].filter((h) => h >= goal - 1e-9).length;

  const subjHours = new Map<string, number>();
  const subjSessions = new Map<string, number>();
  for (const l of logs) for (const [s, h] of subjectHoursOf(l)) { subjHours.set(s, (subjHours.get(s) || 0) + h); subjSessions.set(s, (subjSessions.get(s) || 0) + 1); }
  const subjMeta = (name: string) => subjects.find((s) => s.name === name);
  const accentName = (name: string): AccentName => (subjMeta(name)?.accent as AccentName) in T.accent ? (subjMeta(name)?.accent as AccentName) : 'cyan';
  const colorOf = (name: string): string => T.accent[accentName(name)];
  const maxOf = (name: string) => subjMeta(name)?.marks || 100;
  const sessions = [...subjSessions.values()].reduce((a, b) => a + b, 0);

  const mockRows = [...mocks].sort((a, b) => a.date.localeCompare(b.date)).map((m) => ({ ...m, max: maxOf(m.subject), g: gradeFor(m.marks, maxOf(m.subject)) }));
  const mockAvg = mockRows.length ? mockRows.reduce((a, m) => a + m.g.pct, 0) / mockRows.length : 0;

  // Which weekday is strongest (Monday first)
  const wdHours = Array<number>(7).fill(0), wdDays = Array<number>(7).fill(0);
  for (const d of allDays) { const wd = (parseYmd(d).getDay() + 6) % 7; wdDays[wd]++; wdHours[wd] += totals.get(d) || 0; }
  const wdAvg = wdHours.map((h, i) => (wdDays[i] ? h / wdDays[i] : 0));
  const wdTop = Math.max(...wdAvg);
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const names = [...new Set([...subjects.map((s) => s.name), ...subjHours.keys()])].filter((n) => subjHours.has(n) || subjects.some((s) => s.name === n));
  names.sort((a, b) => (subjHours.get(b) || 0) - (subjHours.get(a) || 0));

  /* ───────── page furniture ───────── */
  const bgAt = (y: number) => (T.bg2 ? mix(T.bg, T.bg2, Math.max(0, Math.min(1, y / H))) : T.bg);
  const decorate = (pg: PdfPage) => {
    if (T.bg2) pg.gradient(-2, -2, W + 4, H + 4, { from: T.bg, to: T.bg2, dir: 'v' }); else pg.rect(-2, -2, W + 4, H + 4, { fill: T.bg });
    for (const g of T.glows) pg.glow(g.x * W, g.y * H, g.r * Math.min(W, H), g.color, bgAt(g.y * H), 1.5);
  };
  const logoMark = (pg: PdfPage, cx: number, cy: number, s: number, onDark: boolean) => {
    const c = onDark ? '#ffffff' : T.accent.cyan, base = onDark ? T.head[0] : '#eef2fb';
    pg.circle(cx, cy, 22 * s, { stroke: mix(c, base, 0.62), lineWidth: 1.1 * s });
    pg.circle(cx, cy, 14 * s, { stroke: mix(c, base, 0.38), lineWidth: 1.1 * s });
    pg.circle(cx, cy, 6 * s, { stroke: c, lineWidth: 1.3 * s });
    pg.line(cx, cy, cx + 15 * s, cy - 15 * s, { color: c, width: 1.6 * s, cap: 'round' });
    pg.circle(cx + 12 * s, cy + 7 * s, 2.4 * s, { fill: T.accent.gold === '#f9dc5c' ? '#f9dc5c' : '#f2b705' });
  };
  const card = (pg: PdfPage, x: number, y: number, w: number, h: number, r = 11) => {
    pg.gradient(x, y, w, h, { from: T.cardTop, to: T.card, dir: 'v', radius: r, stroke: T.border, lineWidth: 0.8 });
  };
  const cardTitle = (pg: PdfPage, title: string, x: number, y: number, color: string = T.accent.cyan) => {
    pg.rect(x, y - 10, 3.2, 14, { fill: color, radius: 1.6 });
    pg.text(title, x + 10, y + capMid(12.5) - 3, { size: 12.5, font: 'bold', color: T.ink });
  };

  let page = doc.addPage(W, H);
  decorate(page);
  // Header band
  {
    const hasBand = T.headDark;
    if (hasBand) {
      page.gradient(0, 0, W, headH, { from: T.head[0], via: mix(mix(T.head[0], T.head[1], 0.5), '#ffffff', 0.07), to: T.head[1], dir: 'd' });
    } else {
      page.rect(0, 0, W, headH, { fill: T.head[0] });
      page.rect(0, 0, 6, headH, { fill: T.accent.cyan });
    }
    page.gradient(0, headH, W, 3, { from: T.rule[0], via: T.rule[1], to: T.rule[2], dir: 'h' });
    logoMark(page, M + 26, headH / 2, a4 ? 1.05 : 0.95, T.headDark);
    const tx = M + 66, rightW = Math.min(250, CW * 0.38);
    const tSize = fitSize(input.title || 'Study report', CW - 66 - rightW - 10, a4 ? 25 : 23, 15, 'bold');
    page.text(input.title || 'Study report', tx, headH / 2 - 4, { size: tSize, font: 'bold', color: T.headText, maxWidth: CW - 66 - rightW - 10 });
    const sub = [displayName, levelLabel(level), groupLabel].filter(Boolean).join('  ·  ');
    page.text(sub, tx, headH / 2 + 17, { size: 10.5, color: T.headSub, maxWidth: CW - 66 - rightW - 10 });
    page.text(input.rangeLabel, W - M, headH / 2 - 8, { size: 11.5, font: 'bold', color: T.headText, align: 'right', maxWidth: rightW });
    page.text(`Made on ${fmtDate(today, { year: true })}`, W - M, headH / 2 + 8, { size: 8.8, color: T.headSub, align: 'right' });
    const left = input.examDate ? diffDays(today, input.examDate) : NaN;
    if (Number.isFinite(left) && left >= 0) page.text(`Exam in ${plural(left, 'day')}`, W - M, headH / 2 + 24, { size: 9.2, font: 'bold', color: T.headDark ? '#fde68a' : T.accent.ember, align: 'right', maxWidth: rightW });
  }

  let cur = { page, y: headH + 20 };
  const newPage = (): void => {
    const pg = doc.addPage(W, H);
    decorate(pg);
    pg.gradient(0, 0, W, 5, { from: T.rule[0], via: T.rule[1], to: T.rule[2], dir: 'h' });
    logoMark(pg, M + 11, 24, 0.5, false);
    pg.text(input.title || 'Study report', M + 30, 24 + capMid(10.5), { size: 10.5, font: 'bold', color: T.ink, maxWidth: CW * 0.5 });
    pg.text(input.rangeLabel, W - M, 24 + capMid(9), { size: 9, color: T.muted, align: 'right', maxWidth: CW * 0.4 });
    pg.line(M, 38, W - M, 38, { color: T.border, width: 0.7 });
    cur = { page: pg, y: 54 };
  };
  const ensure = (h: number) => { if (cur.y + h > H - FOOT) newPage(); };

  /* ───────── summary tiles ───────── */
  const gap = 10, tileW = (CW - gap * 3) / 4;
  const tile = (i: number, row: number, icon: string, accent: AccentName, label: string, value: string, sub: string) => {
    const x = M + i * (tileW + gap), y = cur.y + row * (tileH + gap), c = T.accent[accent], pg = cur.page;
    card(pg, x, y, tileW, tileH, 12);
    pg.circle(x + 21, y + 20, 11.5, { fill: mix(T.card, c, T.dark ? 0.2 : 0.14) });
    pg.icon(icon, x + 21, y + 20, 13, c, mix(c, T.card, 0.4));
    pg.text(label, x + 40, y + 20 + capMid(8.6), { size: 8.6, color: T.muted, maxWidth: tileW - 48 });
    const vs = fitSize(value, tileW - 24, a4 ? 17.5 : 16.5, 10, 'bold');
    pg.text(value, x + 14, y + tileH - 20, { size: vs, font: 'bold', color: T.ink, maxWidth: tileW - 22 });
    pg.text(sub, x + 14, y + tileH - 7.5, { size: 7.6, color: T.faint, maxWidth: tileW - 22 });
    pg.rect(x - 0.4, y + 16, 3, tileH - 32, { fill: c, radius: 1.5 });
  };
  tile(0, 0, 'clock', 'cyan', 'Study hours', fmtHM(total), studiedDays ? `${plural(sessions, 'session')} logged` : 'Nothing logged yet');
  tile(1, 0, 'calendar', 'violet', 'Days studied', `${studiedDays} / ${span}`, `${Math.round((studiedDays / span) * 100)}% of the days`);
  tile(2, 0, 'target', avg >= goal ? 'mint' : 'gold', 'Daily average', fmtHM(avg), `Goal is ${fmtHM(goal)} a day`);
  tile(3, 0, 'bolt', 'ember', 'Best day', best ? fmtHM(best) : '-', bestDate ? fmtDate(bestDate, { weekday: true }) : 'No data yet');
  tile(0, 1, 'medal', 'mint', 'Goal days', String(goalDays), `${fmtHM(goal)} or more`);
  tile(1, 1, 'flame', 'ember', 'Fire streak', plural(stats.currentFireStreak, 'day'), `Best ${stats.maxStreak} · ${stats.streakMin}h+ days`);
  tile(2, 1, 'trophy', 'gold', 'Rank', input.rankLabel || stats.rankInfo.title, `${fmtInt(stats.totalXP)} XP overall`);
  tile(3, 1, 'doc', 'rose', 'Mock tests', String(mockRows.length), mockRows.length ? `Average ${fmtNum(mockAvg, 0)}%` : 'None in this period');
  cur.y += tileH * 2 + gap + 16;

  /* ───────── chart: hours per day ───────── */
  const weekly = allDays.length > 62;
  interface Bucket { label: string; month: string; hours: number; days: number; target: number }
  const buckets: Bucket[] = [];
  if (!weekly) {
    for (const d of allDays) buckets.push({ label: String(parseYmd(d).getDate()), month: monthName(parseYmd(d).getMonth()), hours: totals.get(d) || 0, days: 1, target: goal });
  } else {
    const idx = new Map<string, Bucket>();
    for (const d of allDays) {
      const w = startOfWeek(d);
      let b = idx.get(w);
      if (!b) { b = { label: String(parseYmd(w).getDate()), month: monthName(parseYmd(w).getMonth()), hours: 0, days: 0, target: 0 }; idx.set(w, b); buckets.push(b); }
      b.hours += totals.get(d) || 0; b.days += 1; b.target += goal;
    }
  }

  const hoursCard = (x: number, y: number, w: number, h: number) => {
    const pg = cur.page;
    card(pg, x, y, w, h);
    cardTitle(pg, weekly ? 'Hours per week' : 'Hours per day', x + 16, y + 24, T.accent.cyan);
    // legend
    const ly = y + 24, lg = (label: string, color: PdfColor, right: number) => { const tw = measure(label, 8); pg.text(label, right, ly + capMid(8), { size: 8, color: T.muted, align: 'right' }); pg.rect(right - tw - 13, ly - 4, 9, 9, { fill: color, radius: 2.5 }); return right - tw - 13 - 12; };
    const next = lg('Goal met', T.accent.cyan, x + w - 16);
    lg('Below goal', mix(T.card, T.accent.cyan, 0.42), next);
    const plot = { x: x + 42, y: y + 50, w: w - 42 - 18, h: h - 50 - 40 };
    const peak = Math.max(goal * (weekly ? 7 : 1), ...buckets.map((b) => b.hours), 1);
    const step = weekly ? (peak > 60 ? 20 : 10) : peak <= 12 ? 2 : peak <= 24 ? 4 : 8;
    const top = Math.ceil(peak / step) * step;
    const yOf = (v: number) => plot.y + plot.h - (v / top) * plot.h;
    for (let v = 0; v <= top + 1e-9; v += step) {
      pg.line(plot.x, yOf(v), plot.x + plot.w, yOf(v), { color: v === 0 ? T.faint : T.border, width: v === 0 ? 0.9 : 0.6, dash: v === 0 ? undefined : [2, 3] });
      pg.text(String(v), plot.x - 7, yOf(v) + capMid(7.8), { size: 7.8, color: T.faint, align: 'right' });
    }
    if (buckets.length) {
      const slot = plot.w / buckets.length, bw = Math.max(1.6, Math.min(slot * 0.66, 24));
      const every = Math.max(1, Math.ceil(buckets.length / (weekly ? 18 : a4 ? 31 : 40)));
      const grad = buckets.length <= 45, labels = buckets.length <= 16 && bw >= 13;
      let lastMonth = '', lastMonthX = -99;
      const cyan = T.accent.cyan;
      const valueLabels: { text: string; cx: number; base: number; hit: boolean }[] = [];
      buckets.forEach((b, i) => {
        const bx = plot.x + i * slot + (slot - bw) / 2, t = b.target || goal;
        const hit = b.hours >= t - 1e-9 && b.hours > 0;
        if (b.hours > 0) {
          const bh = Math.max(2, (b.hours / top) * plot.h), r = Math.min(4, bw / 2);
          const c1 = hit ? cyan : mix(T.card, cyan, 0.5), c2 = hit ? mix(cyan, T.accent.violet, 0.55) : mix(T.card, cyan, 0.24);
          if (grad) pg.gradient(bx, yOf(b.hours), bw, bh, { from: c1, to: c2, dir: 'v', radius: [r, r, 0, 0] });
          else pg.rect(bx, yOf(b.hours), bw, bh, { fill: c1, radius: [r, r, 0, 0] });
          if (labels) valueLabels.push({ text: fmtNum(b.hours, 1), cx: bx + bw / 2, base: yOf(b.hours) - 4, hit });
        }
        if (i % every === 0) pg.text(b.label, bx + bw / 2, plot.y + plot.h + 14, { size: 7.6, color: T.muted, align: 'center' });
        if (b.month !== lastMonth && (i % every === 0 || i === 0)) {
          if (bx - lastMonthX > 34) { pg.text(b.month, bx + bw / 2, plot.y + plot.h + 26, { size: 7.6, font: 'bold', color: T.ink, align: i === 0 ? 'left' : 'center' }); lastMonthX = bx; }
          lastMonth = b.month;
        }
      });
      const gy = yOf(weekly ? goal * 7 : goal);
      pg.line(plot.x, gy, plot.x + plot.w, gy, { color: T.accent.ember, width: 1.1, dash: [4, 3] });
      // Value labels are drawn on top of the goal line. When the line would run through the digits they get a small backing in the card colour at that height.
      const vs = 7.2, half = capMid(vs), cardAt = (cy: number) => mix(T.cardTop, T.card, Math.min(1, Math.max(0, (cy - y) / h)));
      const taken: { x0: number; x1: number }[] = [];
      for (const v of valueLabels) {
        const tw = measure(v.text, vs, 'bold'), mid = v.base - half;
        if (Math.abs(mid - gy) < half + 2.5) pg.rect(v.cx - tw / 2 - 3.5, mid - half - 2.5, tw + 7, half * 2 + 5, { fill: cardAt(mid), radius: 3.5 });
        pg.text(v.text, v.cx, v.base, { size: vs, font: 'bold', color: v.hit ? T.ink : T.muted, align: 'center' });
        if (v.base - half * 2 - 1 < gy - 1 && v.base + 1 > gy - 16) taken.push({ x0: v.cx - tw / 2 - 2, x1: v.cx + tw / 2 + 2 });
      }
      // The "Goal 8h" tag sits at the right end of the line. If a bar or a value label would be under it, it slides left to the first free spot.
      buckets.forEach((b, i) => { if (b.hours > 0 && yOf(b.hours) < gy - 1) taken.push({ x0: plot.x + i * slot + (slot - bw) / 2 - 2, x1: plot.x + i * slot + (slot + bw) / 2 + 2 }); });
      const gl = `${weekly ? 'Weekly goal ' : 'Goal '}${fmtNum(weekly ? goal * 7 : goal, 0)}h`;
      const gw = measure(gl, 7.8, 'bold') + 12;
      let tx = plot.x + plot.w - gw;
      for (let px = tx; px >= plot.x; px -= 4) if (!taken.some((o) => px < o.x1 && px + gw > o.x0)) { tx = px; break; }
      pg.rect(tx, gy - 15, gw, 13, { fill: mix(T.card, T.accent.ember, T.dark ? 0.22 : 0.12), radius: 6.5 });
      pg.text(gl, tx + gw / 2, gy - 15 + 6.5 + capMid(7.8), { size: 7.8, font: 'bold', color: T.accent.ember, align: 'center' });
    }
    if (!total) pg.text('No study logged in this period', plot.x + plot.w / 2, plot.y + plot.h / 2, { size: 11, font: 'italic', color: T.faint, align: 'center' });
  };

  /* ───────── hours by paper ───────── */
  const papersCard = (x: number, y: number, w: number, h: number, cols: number) => {
    const pg = cur.page;
    card(pg, x, y, w, h);
    cardTitle(pg, 'Hours by paper', x + 16, y + 24, T.accent.violet);
    if (!names.length) { pg.text('No papers to show yet.', x + 16, y + 56, { size: 10, font: 'italic', color: T.faint }); return; }
    const inner = w - 32, gapC = 22, colW = (inner - gapC * (cols - 1)) / cols;
    const rows = Math.ceil(names.length / cols), avail = h - 46 - 8, rowH = Math.min(a4 ? 32 : 30, avail / rows);
    const peakS = Math.max(...names.map((n) => subjHours.get(n) || 0), 1);
    names.forEach((n, i) => {
      const colI = i % cols, row = Math.floor(i / cols);
      const rx = x + 16 + colI * (colW + gapC), ry = y + 46 + row * rowH;
      const hrs = subjHours.get(n) || 0, c = colorOf(n), share = total > 0 ? Math.round((hrs / total) * 100) : 0;
      const hm = fmtHM(hrs), hw = measure(hm, 9.2, 'bold');
      pg.circle(rx + 4, ry + 5, 3.6, { fill: c });
      pg.text(n, rx + 15, ry + 5 + capMid(9.2), { size: 9.2, font: 'bold', color: T.text, maxWidth: colW - 15 - hw - 40 });
      pg.text(hm, rx + colW, ry + 5 + capMid(9.2), { size: 9.2, font: 'bold', color: T.ink, align: 'right' });
      pg.text(`${share}%`, rx + colW - hw - 7, ry + 5 + capMid(7.6), { size: 7.6, color: T.faint, align: 'right' });
      pg.rect(rx, ry + 14, colW, 6, { fill: T.track, radius: 3 });
      if (hrs > 0) { const bw = Math.max(6, (hrs / peakS) * colW); pg.gradient(rx, ry + 14, bw, 6, { from: c, to: mix(c, T.accent.violet, 0.45), dir: 'h', radius: 3 }); }
    });
  };

  /* ───────── weekday rhythm + highlights ───────── */
  const rhythmCard = (x: number, y: number, w: number, h: number) => {
    const pg = cur.page;
    card(pg, x, y, w, h);
    cardTitle(pg, 'Weekday rhythm', x + 16, y + 24, T.accent.gold);
    pg.text('Average per weekday', x + w - 16, y + 24 + capMid(8), { size: 8, color: T.muted, align: 'right', maxWidth: w - 190 });
    const plot = { x: x + 18, y: y + 48, w: w - 36, h: h - 48 - 28 };
    const slot = plot.w / 7, bw = Math.min(slot * 0.58, 34), mx = Math.max(wdTop, 0.001);
    pg.line(plot.x, plot.y + plot.h, plot.x + plot.w, plot.y + plot.h, { color: T.faint, width: 0.8 });
    WD.forEach((d, i) => {
      const bx = plot.x + i * slot + (slot - bw) / 2, v = wdAvg[i], isTop = total > 0 && v === wdTop && v > 0;
      const bh = v > 0 ? Math.max(3, (v / mx) * (plot.h - 14)) : 0, c = isTop ? T.accent.gold : T.accent.violet;
      pg.rect(bx, plot.y + plot.h - (plot.h - 14), bw, plot.h - 14, { fill: mix(T.card, c, T.dark ? 0.09 : 0.07), radius: [5, 5, 0, 0] });
      if (bh) pg.gradient(bx, plot.y + plot.h - bh, bw, bh, { from: c, to: shade(c, T.dark ? 0.32 : 0.18), dir: 'v', radius: [5, 5, 0, 0] });
      if (v > 0) pg.text(fmtHM(v), bx + bw / 2, plot.y + plot.h - bh - 4, { size: 7, font: 'bold', color: isTop ? T.ink : T.muted, align: 'center' });
      pg.text(d, bx + bw / 2, plot.y + plot.h + 14, { size: 8, font: isTop ? 'bold' : 'regular', color: isTop ? T.ink : T.muted, align: 'center' });
    });
  };
  const highlightsCard = (x: number, y: number, w: number, h: number, strip = false) => {
    const pg = cur.page;
    card(pg, x, y, w, h);
    if (!strip) cardTitle(pg, 'Highlights', x + 16, y + 24, T.accent.mint);
    const topName = names.find((n) => (subjHours.get(n) || 0) > 0);
    const rows: { icon: string; c: AccentName; label: string; value: string; sub: string }[] = [
      { icon: 'book', c: 'violet', label: 'Top paper', value: topName || 'Nothing yet', sub: topName ? `${fmtHM(subjHours.get(topName) || 0)} · ${Math.round(((subjHours.get(topName) || 0) / Math.max(total, 1e-9)) * 100)}% of study time` : 'Log a session to see it here' },
      { icon: 'bolt', c: 'gold', label: 'Best weekday', value: wdTop > 0 ? WD[wdAvg.indexOf(wdTop)] : 'Nothing yet', sub: wdTop > 0 ? `${fmtHM(wdTop)} on average` : 'Needs a few days of data' },
      { icon: 'target', c: 'mint', label: 'Goal days', value: `${goalDays} of ${span}`, sub: `Days with ${fmtHM(goal)} or more` },
    ];
    if (strip) {
      const cw3 = w / rows.length;
      rows.forEach((r, i) => {
        const x0 = x + i * cw3, c = T.accent[r.c], cy = y + h / 2;
        if (i) pg.line(x0, y + 18, x0, y + h - 18, { color: T.border, width: 0.7 });
        pg.circle(x0 + 32, cy, 14, { fill: mix(T.card, c, T.dark ? 0.2 : 0.14) });
        pg.icon(r.icon, x0 + 32, cy, 16, c, mix(c, T.card, 0.4));
        pg.text(r.label, x0 + 56, cy - 12 + capMid(7.8), { size: 7.8, color: T.muted });
        pg.text(r.value, x0 + 56, cy + 3 + capMid(10.2), { size: fitSize(r.value, cw3 - 66, 10.2, 8, 'bold'), font: 'bold', color: T.ink, maxWidth: cw3 - 66 });
        pg.text(r.sub, x0 + 56, cy + 17 + capMid(7.6), { size: 7.6, color: T.faint, maxWidth: cw3 - 66 });
      });
      return;
    }
    const rh = (h - 40 - 8) / rows.length;
    rows.forEach((r, i) => {
      const ry = y + 40 + i * rh, c = T.accent[r.c], cy = ry + rh / 2;
      pg.circle(x + 30, cy, 13, { fill: mix(T.card, c, T.dark ? 0.2 : 0.14) });
      pg.icon(r.icon, x + 30, cy, 15, c, mix(c, T.card, 0.4));
      pg.text(r.label, x + 54, cy - 8 + capMid(7.8), { size: 7.8, color: T.muted });
      pg.text(r.value, x + 54, cy + 4 + capMid(10.2), { size: 10.2, font: 'bold', color: T.ink, maxWidth: w - 70 });
      pg.text(r.sub, x + 54, cy + 17 + capMid(7.6), { size: 7.6, color: T.faint, maxWidth: w - 70 });
    });
  };

  /* ───────── layout of the overview ───────── */
  if (!a4) {
    // Tablet: the chart and the papers sit side by side on the first page.
    const h = H - FOOT - cur.y - 6, cw = CW * 0.6 - 6;
    hoursCard(M, cur.y, cw, h);
    papersCard(M + cw + 12, cur.y, CW - cw - 12, h, 1);
    newPage();
    const rh = 168, lw = CW * 0.6 - 6;
    rhythmCard(M, cur.y, lw, rh);
    highlightsCard(M + lw + 12, cur.y, CW - lw - 12, rh);
    cur.y += rh + 22;
  } else {
    hoursCard(M, cur.y, CW, 188);
    cur.y += 188 + 12;
    const rows = Math.ceil(names.length / 2), ph = 52 + Math.max(1, rows) * 32 + 6;
    ensure(ph);
    papersCard(M, cur.y, CW, ph, 2);
    cur.y += ph + 12;
    ensure(84);
    highlightsCard(M, cur.y, CW, 84, true);
    cur.y += 84 + 12;
    ensure(158);
    rhythmCard(M, cur.y, CW, 150);
    cur.y += 150 + 22;
  }

  /* ───────── tables ───────── */
  const sectionTitle = (title: string, note?: string, need = 120) => {
    ensure(need);
    const pg = cur.page;
    pg.gradient(M, cur.y - 11, 4, 16, { from: T.accent.cyan, to: T.accent.violet, dir: 'v', radius: 2 });
    pg.text(title, M + 12, cur.y + capMid(13.5) - 3.5, { size: 13.5, font: 'bold', color: T.ink });
    if (note) pg.text(note, W - M, cur.y + capMid(8.4) - 3.5, { size: 8.4, color: T.muted, align: 'right', maxWidth: CW * 0.55 });
    cur.y += 20;
  };
  const tableHead = (cols: { t: string; x: number; align?: 'left' | 'right' | 'center' }[]) => {
    const pg = cur.page;
    pg.rect(M, cur.y, CW, 22, { fill: T.thead, radius: 7 });
    for (const c of cols) pg.text(c.t, M + c.x, cur.y + 11 + capMid(8.6), { size: 8.6, font: 'bold', color: T.theadText, align: c.align });
    cur.y += 26;
  };
  const chip = (pg: PdfPage, x: number, cy: number, name: string, maxW: number) => {
    const c = colorOf(name), ab = subjMeta(name)?.abbrev || name.slice(0, 3);
    const aw = measure(ab, 7.4, 'bold') + 9;
    pg.rect(x, cy - 7.5, aw, 15, { fill: mix(T.card, c, T.dark ? 0.26 : 0.16), radius: 7.5 });
    pg.text(ab, x + aw / 2, cy + capMid(7.4), { size: 7.4, font: 'bold', color: T.dark ? mix(c, '#ffffff', 0.25) : shade(c, 0.12), align: 'center' });
    pg.text(name, x + aw + 7, cy + capMid(8.6), { size: 8.6, font: 'bold', color: T.text, maxWidth: Math.max(10, maxW - aw - 7) });
  };

  // Mock tests
  sectionTitle('Mock tests', mockRows.length ? `Average ${fmtNum(mockAvg, 1)}% across ${plural(mockRows.length, 'mock test')}` : undefined, Math.min(mockRows.length, 3) * 24 + 70);
  if (!mockRows.length) {
    cur.page.text('No mock tests in this period.', M + 4, cur.y + 6, { size: 10, font: 'italic', color: T.faint });
    cur.y += 34;
  } else {
    const c = { date: 12, paper: a4 ? 100 : 130, marks: a4 ? CW - 214 : 500, score: a4 ? CW - 134 : 580, result: a4 ? CW - 84 : 656 };
    const cols = [{ t: 'Date', x: c.date }, { t: 'Paper', x: c.paper }, { t: 'Marks', x: c.marks, align: 'right' as const }, { t: 'Score', x: c.score, align: 'right' as const }, { t: 'Result', x: c.result }];
    tableHead(cols);
    mockRows.forEach((m, i) => {
      const rh = 24;
      if (cur.y + rh > H - FOOT) { newPage(); tableHead(cols); }
      const pg = cur.page, cy = cur.y + rh / 2 - 2;
      if (i % 2 === 0) pg.rect(M, cur.y - 2, CW, rh, { fill: T.zebra, radius: 6 });
      pg.text(fmtDate(m.date, { year: true }), M + c.date, cy + capMid(8.8), { size: 8.8, color: T.text });
      chip(pg, M + c.paper, cy, m.subject, c.marks - c.paper - (a4 ? 50 : 80));
      pg.text(`${fmtNum(m.marks, 1)} / ${m.max}`, M + c.marks, cy + capMid(8.8), { size: 8.8, color: T.text, align: 'right' });
      const gc = T.accent[m.g.accent as AccentName] || T.accent.cyan;
      pg.text(`${fmtNum(m.g.pct, 0)}%`, M + c.score, cy + capMid(9), { size: 9, font: 'bold', color: T.ink, align: 'right' });
      const barW = a4 ? 34 : 56;
      pg.rect(M + c.score + 8, cy - 2.5, barW, 5, { fill: T.track, radius: 2.5 });
      pg.gradient(M + c.score + 8, cy - 2.5, Math.max(3, Math.min(barW, (m.g.pct / 100) * barW)), 5, { from: gc, to: shade(gc, 0.2), dir: 'h', radius: 2.5 });
      const lw = measure(m.g.label, 8, 'bold') + 14;
      pg.rect(M + c.result, cy - 7.5, lw, 15, { fill: mix(T.card, gc, T.dark ? 0.24 : 0.14), radius: 7.5 });
      pg.text(m.g.label, M + c.result + lw / 2, cy + capMid(8), { size: 8, font: 'bold', color: T.dark ? mix(gc, '#ffffff', 0.2) : shade(gc, 0.15), align: 'center' });
      cur.y += rh;
    });
    cur.y += 22;
  }

  // Daily log
  sectionTitle('Daily study log', dates.length ? `${plural(dates.length, 'study day')} · ${fmtHM(total)} in total` : undefined, 150);
  if (!dates.length) {
    cur.page.text('Nothing has been logged in this period.', M + 4, cur.y + 6, { size: 10, font: 'italic', color: T.faint });
    cur.y += 30;
  } else {
    const c = { date: 12, paper: a4 ? 84 : 120, topic: a4 ? 278 : 330, hours: CW - (a4 ? 80 : 100), total: CW - 14 };
    const topicW = c.hours - c.topic - (a4 ? 40 : 44), paperW = c.topic - c.paper - 8;
    const cols = [{ t: 'Date', x: c.date }, { t: 'Paper', x: c.paper }, { t: 'Topic', x: c.topic }, { t: 'Hours', x: c.hours, align: 'right' as const }, { t: 'Day total', x: c.total, align: 'right' as const }];
    tableHead(cols);
    let zebra = 0;
    for (const d of [...dates].reverse()) {
      const slots: { s: string; lines: string[]; h: number; rowH: number }[] = [];
      for (const l of byDate.get(d) || []) for (const k of SLOTS) {
        const x = getSlot(l, k);
        if (x.hours > 0) { const lines = wrap(x.topic || '', topicW, 8.4, 'regular', 2); slots.push({ s: x.subject || 'Other', lines, h: x.hours, rowH: Math.max(19, lines.length * 10.5 + 8) }); }
      }
      const rowH = slots.reduce((a, s) => a + s.rowH, 0) + 8;
      if (cur.y + rowH > H - FOOT) { newPage(); tableHead(cols); }
      const pg = cur.page;
      if (zebra++ % 2 === 0) pg.rect(M, cur.y - 2, CW, rowH, { fill: T.zebra, radius: 7 });
      const dateTop = cur.y + 11;
      pg.text(fmtDate(d, { weekday: true }), M + c.date, dateTop + capMid(8.8), { size: 8.8, font: 'bold', color: T.text, maxWidth: c.paper - c.date - 6 });
      pg.text(String(parseYmd(d).getFullYear()), M + c.date, dateTop + 12 + capMid(7.6), { size: 7.6, color: T.faint });
      pg.text(fmtHM(totals.get(d) || 0), M + c.total, dateTop + capMid(10), { size: 10, font: 'bold', color: T.accent.cyan, align: 'right' });
      let sy = cur.y + 2;
      for (const sl of slots) {
        const cy = sy + 9.5;
        chip(pg, M + c.paper, cy, sl.s, paperW);
        if (sl.lines.length && sl.lines[0]) sl.lines.forEach((ln, li) => pg.text(ln, M + c.topic, cy + capMid(8.4) + li * 10.5, { size: 8.4, color: T.muted }));
        else pg.text('-', M + c.topic, cy + capMid(8.4), { size: 8.4, color: T.faint });
        pg.text(fmtHM(sl.h), M + c.hours, cy + capMid(8.8), { size: 8.8, color: T.text, align: 'right' });
        sy += sl.rowH;
      }
      cur.y += rowH;
    }
    cur.y += 6;
    ensure(34);
    const pg = cur.page;
    pg.gradient(M, cur.y, CW, 26, { from: T.thead, to: T.dark ? mix(T.thead, T.accent.violet, 0.28) : mix(T.thead, T.accent.violet, 0.4), dir: 'h', radius: 8 });
    pg.text('Total', M + 14, cur.y + 13 + capMid(10), { size: 10, font: 'bold', color: T.theadText });
    pg.text(`${fmtHM(total)}   (${total.toFixed(1)} h)`, M + CW - 14, cur.y + 13 + capMid(10), { size: 10, font: 'bold', color: T.theadText, align: 'right' });
    cur.y += 34;
  }

  /* ───────── footers ───────── */
  const n = doc.pages.length;
  doc.pages.forEach((pg, i) => {
    pg.line(M, H - 28, W - M, H - 28, { color: T.border, width: 0.7 });
    pg.text(fit(`${levelLabel(level)} Study Tracker  ·  ${displayName || 'Student'}`, CW - 100, 8), M, H - 14, { size: 8, color: T.faint });
    pg.text(`Page ${i + 1} of ${n}`, W - M, H - 14, { size: 8, font: 'bold', color: T.muted, align: 'right' });
  });

  return doc.blob();
}
