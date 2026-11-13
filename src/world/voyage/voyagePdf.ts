// The Voyage Log: a keepsake PDF of the journey so far, written like a captain's log. Cover, the three seas, the islands of the current sea,
// and a closing page (the Golden Ledger once CA Final is cleared, "to be continued" before that).
import type { Level, StudyStats, UserSettings } from '../../types';
import { PdfDoc, TABLET, fit, fitSize, loadPdfFonts, type PdfColor, type PdfPage } from '../../lib/pdf';
import { fmtDate } from '../../lib/date';
import { downloadBlob, slug } from '../../lib/files';
import { LEVELS } from '../../config/curriculum';
import { wordsFor } from '../words';
import { LEVEL_ORDER, SEA_NAME, journeyFraction, levelProgress, seaStatus, treasureWon, type Island } from './progress';
import type { VoyageState } from './voyageState';

export interface VoyageLogInput {
  vs: VoyageState;
  islands: Island[];
  stats: StudyStats;
  settings: UserSettings;
  level: Level;
  levelLabel: string;
  today: string;
}

const W = TABLET.w, H = TABLET.h;
const PARCH = '#f2e6c8', PARCH_DK = '#e6d4a8', INK = '#3a2a1a', INK_SOFT = '#7a6648', BRASS = '#b98a2e', BRASS_LT = '#e7c36a', TEAL = '#0f4a5c', SEA = '#06202c';
const ACCENT: Record<string, string> = { cyan: '#2b9fb2', violet: '#7a68d4', gold: '#c4971c', ember: '#d4602c', mint: '#2ba078', rose: '#c4416c' };
const hrs = (h: number) => `${Math.round(h * 10) / 10} h`;

/** Deterministic pseudo-random numbers, so the same log always looks the same. */
const rnd = (i: number, salt: number) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

function stars(p: PdfPage, count: number, maxY: number) {
  for (let i = 0; i < count; i++) p.circle(rnd(i, 1) * W, rnd(i, 2) * maxY, 0.5 + rnd(i, 3) * 0.9, { fill: i % 5 === 0 ? '#ffe9a8' : '#cfe8ee' });
}

/** An eight-pointed compass rose, in two shades per ray so it looks folded. */
function rose(p: PdfPage, cx: number, cy: number, r: number, light: PdfColor, dark: PdfColor, lightD: PdfColor, darkD: PdfColor) {
  const pt = (deg: number, rad: number): [number, number] => { const a = (deg * Math.PI) / 180; return [cx + Math.sin(a) * rad, cy - Math.cos(a) * rad]; };
  for (let i = 0; i < 8; i++) {
    const main = i % 2 === 0; const th = i * 45; const tip = pt(th, main ? r : r * 0.62); const bl = pt(th - 22.5, r * 0.17); const br = pt(th + 22.5, r * 0.17);
    p.polygon([tip, [cx, cy], bl], { fill: main ? light : lightD }); p.polygon([tip, [cx, cy], br], { fill: main ? dark : darkD });
  }
  p.circle(cx, cy, r * 0.075, { fill: SEA, stroke: BRASS_LT, lineWidth: 1.2 });
}

function frame(p: PdfPage, page: number, ship: string, today: string) {
  p.rect(0, 0, W, H, { fill: PARCH });
  p.glow(W / 2, H / 2, W * 0.62, '#f8eed4', PARCH);
  p.rect(14, 14, W - 28, H - 28, { stroke: BRASS, lineWidth: 1.6, radius: 10 });
  p.rect(20, 20, W - 40, H - 40, { stroke: BRASS_LT, lineWidth: 0.7, radius: 7 });
  for (const [x, y] of [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]] as const) { p.circle(x, y, 3.2, { fill: BRASS }); p.circle(x, y, 1.2, { fill: PARCH }); }
  p.text(`${ship}  ·  Voyage log  ·  ${fmtDate(today, { year: true })}`, 42, H - 30, { size: 8.5, color: INK_SOFT });
  p.text(String(page), W - 42, H - 30, { size: 8.5, color: INK_SOFT, align: 'right' });
}

function heading(p: PdfPage, title: string, sub: string) {
  p.text(title, 44, 66, { size: 25, font: 'bold', color: INK, maxWidth: W - 88 });
  p.text(sub, 44, 86, { size: 10.5, color: INK_SOFT, maxWidth: W - 88 });
  p.line(44, 98, 44 + 78, 98, { color: BRASS, width: 2.2, cap: 'round' });
}

function bar(p: PdfPage, x: number, y: number, w: number, h: number, v: number, color: PdfColor) {
  p.rect(x, y, w, h, { fill: PARCH_DK, radius: h / 2 });
  if (v > 0.004) p.rect(x, y, Math.max(h, w * Math.min(1, v)), h, { fill: color, radius: h / 2 });
}

export async function buildVoyageLog(i: VoyageLogInput): Promise<Blob> {
  await loadPdfFonts();
  const { vs, islands, stats, settings, level, levelLabel, today } = i;
  const words = wordsFor('voyage');
  const name = settings.displayName.trim() || 'Captain';
  const prog = levelProgress(islands);
  const fraction = journeyFraction(level, vs.cleared, prog);
  const won = treasureWon(vs.cleared);
  const doc = new PdfDoc({ title: `The voyage of ${vs.shipName}`, author: name, subject: `${levelLabel} voyage log`, creator: 'CA Inter Study Tracker, Ledger Seas theme' });

  // ── 1. cover ──
  {
    const p = doc.addPage(W, H);
    p.gradient(0, 0, W, H, { from: '#04141c', to: '#0d4a5e', dir: 'v' });
    stars(p, 90, H * 0.55);
    p.glow(W / 2, 214, 190, '#1c6b80', '#0a3445', 1.3);
    rose(p, W / 2, 214, 112, '#f1d27c', '#b8862b', '#9fe0d6', '#3f9f95');
    p.circle(W / 2, 214, 124, { stroke: BRASS_LT, lineWidth: 1.4 });
    p.circle(W / 2, 214, 130, { stroke: BRASS, lineWidth: 0.6, dash: [2, 4] });
    p.text('N', W / 2, 76, { size: 13, font: 'bold', color: BRASS_LT, align: 'center' });
    const title = `The Voyage of ${vs.shipName}`;
    p.text(title, W / 2, 402, { size: fitSize(title, W - 120, 34, 18, 'bold'), font: 'bold', color: '#f6ecd0', align: 'center', maxWidth: W - 120 });
    p.text(`${name}  ·  ${levelLabel}`, W / 2, 430, { size: 14, color: '#bfe3e6', align: 'center', maxWidth: W - 120 });
    p.line(W / 2 - 40, 446, W / 2 + 40, 446, { color: BRASS_LT, width: 1.4, cap: 'round' });
    p.text(`Logged in the Ledger Seas  ·  ${fmtDate(today, { year: true })}`, W / 2, 468, { size: 10, color: '#8fb9c0', align: 'center' });
  }

  // ── 2. the seas ──
  {
    const p = doc.addPage(W, H);
    frame(p, 2, vs.shipName, today);
    heading(p, 'The voyage so far', `${Math.round(fraction * 100)}% of the way to the Golden Ledger`);
    const cw = (W - 88 - 28) / 3;
    LEVEL_ORDER.forEach((l, idx) => {
      const x = 44 + idx * (cw + 14); const st = seaStatus(l, level, vs.cleared);
      p.rect(x, 114, cw, 112, { fill: st === 'current' ? '#fbf3dc' : PARCH_DK, stroke: st === 'current' ? BRASS : '#cdb98a', lineWidth: st === 'current' ? 1.6 : 0.8, radius: 10 });
      p.text(SEA_NAME[l], x + 14, 140, { size: 15, font: 'bold', color: INK, maxWidth: cw - 28 });
      p.text(LEVELS.find((v) => v.id === l)?.label ?? '', x + 14, 158, { size: 9.5, color: INK_SOFT, maxWidth: cw - 28 });
      const v = st === 'sailed' ? 1 : st === 'current' ? prog : 0;
      bar(p, x + 14, 172, cw - 28, 9, v, st === 'sailed' ? '#2ba078' : TEAL);
      const note = vs.cleared[l] ? `Cleared ${fmtDate(vs.cleared[l]!, { year: true })}` : st === 'sailed' ? 'Sailed' : st === 'current' ? `You are here · ${Math.round(prog * 100)}% explored` : 'Still ahead';
      p.text(note, x + 14, 202, { size: 9.5, color: st === 'ahead' ? INK_SOFT : INK, maxWidth: cw - 28 });
    });
    const tiles: [string, string][] = [
      ['Hours studied', hrs(stats.totalStudiedHours)], ['Days logged', String(stats.daysLogged)],
      ['Best day', `${hrs(stats.bestDayHours)}${stats.bestDayDate ? `  ·  ${fmtDate(stats.bestDayDate)}` : ''}`],
      ['Longest streak', `${stats.maxStreak} ${stats.maxStreak === 1 ? 'day' : 'days'}`], ['Rank', words.rank(stats.rankInfo.title)], ['XP earned', Math.round(stats.totalXP).toLocaleString('en-IN')],
    ];
    const tw = (W - 88 - 28) / 3;
    tiles.forEach(([k, v], idx) => {
      const x = 44 + (idx % 3) * (tw + 14); const y = 246 + Math.floor(idx / 3) * 100;
      p.rect(x, y, tw, 86, { fill: '#fbf3dc', stroke: '#cdb98a', lineWidth: 0.8, radius: 10 });
      p.circle(x + 22, y + 24, 4, { fill: BRASS });
      p.text(k, x + 34, y + 28, { size: 10.5, color: INK_SOFT, maxWidth: tw - 48 });
      p.text(v, x + 14, y + 64, { size: fitSize(v, tw - 28, 21, 11, 'bold'), font: 'bold', color: INK, maxWidth: tw - 28 });
    });
  }

  // ── 3. the islands ──
  {
    const p = doc.addPage(W, H);
    frame(p, 3, vs.shipName, today);
    heading(p, `The islands of ${SEA_NAME[level]}`, `${levelLabel}  ·  ${islands.length} ${islands.length === 1 ? 'paper' : 'papers'}  ·  ${Math.round(prog * 100)}% explored`);
    const rowH = Math.min(40, Math.floor((H - 150 - 40) / Math.max(1, islands.length)));
    islands.forEach((it, idx) => {
      const y = 114 + idx * rowH; const col = ACCENT[it.accent] ?? TEAL;
      p.rect(44, y, W - 88, rowH - 6, { fill: idx % 2 ? '#f7edd2' : '#fbf3dc', radius: 8 });
      p.rect(52, y + (rowH - 6) / 2 - 10, 40, 20, { fill: col, radius: 10 });
      p.text(it.abbrev, 72, y + (rowH - 6) / 2 + 4, { size: 9.5, font: 'bold', color: '#ffffff', align: 'center', maxWidth: 36 });
      p.text(fit(it.name, 250, 11), 102, y + (rowH - 6) / 2 + 4, { size: 11, color: INK });
      bar(p, 362, y + (rowH - 6) / 2 - 4, 170, 8, it.progress, col);
      p.text(`${Math.round(it.progress * 100)}%`, 546, y + (rowH - 6) / 2 + 4, { size: 11, font: 'bold', color: INK });
      p.text(`${it.lanterns.lit}/${it.lanterns.total} lanterns`, 594, y + (rowH - 6) / 2 + 4, { size: 10, color: INK_SOFT });
      p.text(hrs(it.hours), 700, y + (rowH - 6) / 2 + 4, { size: 10, color: INK_SOFT });
      const state = it.state === 'cleared' ? 'Cleared' : it.state === 'neglected' ? 'Fogging over' : it.state === 'uncharted' ? 'Uncharted' : 'Exploring';
      p.text(state, W - 52, y + (rowH - 6) / 2 + 4, { size: 9.5, font: 'bold', color: it.state === 'cleared' ? '#1f8a62' : it.state === 'neglected' ? '#b4691a' : INK_SOFT, align: 'right' });
    });
  }

  // ── 4. the end ──
  {
    const p = doc.addPage(W, H);
    if (won) {
      p.gradient(0, 0, W, H, { from: '#2a1a05', to: '#6b4a10', dir: 'v' });
      p.glow(W / 2, 250, 300, '#ffd77a', '#4a3208', 1.2);
      stars(p, 60, H * 0.5);
      // the chest, open, with light pouring out
      p.rect(W / 2 - 70, 268, 140, 82, { fill: '#6a3f1b', stroke: '#2a1808', lineWidth: 2, radius: 6 });
      p.rect(W / 2 - 70, 296, 140, 12, { fill: BRASS_LT });
      p.rect(W / 2 - 10, 268, 20, 82, { fill: BRASS });
      p.polygon([[W / 2 - 70, 268], [W / 2 - 92, 214], [W / 2 + 92, 214], [W / 2 + 70, 268]], { fill: '#8a5524', stroke: '#2a1808', lineWidth: 2 });
      p.glow(W / 2, 262, 80, '#fff0b0', '#c4922a', 1.1);
      rose(p, W / 2, 140, 40, '#ffe9a8', '#e7c36a', '#ffe9a8', '#e7c36a');
      p.text('The Golden Ledger', W / 2, 402, { size: 30, font: 'bold', color: '#fff3cc', align: 'center' });
      p.text('Balanced.', W / 2, 430, { size: 15, color: '#f1d78a', align: 'center' });
      p.text(`${name}, you sailed all three seas: ${hrs(stats.totalStudiedHours)} over ${stats.daysLogged} days.`, W / 2, 462, { size: 11, color: '#e8d4a0', align: 'center', maxWidth: W - 160 });
    } else {
      frame(p, 4, vs.shipName, today);
      const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1];
      rose(p, W / 2, 180, 70, BRASS_LT, BRASS, '#9fd0c8', '#5fa59b');
      p.text('To be continued', W / 2, 322, { size: 28, font: 'bold', color: INK, align: 'center' });
      p.text(vs.cleared[level] && next ? `Next: ${SEA_NAME[next]}` : `Keep the lanterns lit in ${SEA_NAME[level]}.`, W / 2, 352, { size: 13, color: INK_SOFT, align: 'center' });
      p.text('The Golden Ledger is only a book that balances. One entry at a time.', W / 2, 392, { size: 10.5, color: INK_SOFT, align: 'center', maxWidth: W - 160 });
    }
  }
  return doc.blob();
}

export async function downloadVoyageLog(i: VoyageLogInput): Promise<boolean> {
  try {
    const blob = await buildVoyageLog(i);
    downloadBlob(blob, `voyage-log-${slug(i.vs.shipName) || 'ship'}-${i.today}.pdf`, 'application/pdf');
    return true;
  } catch { return false; }
}
