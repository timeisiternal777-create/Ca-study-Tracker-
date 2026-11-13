// The School Record: a keepsake PDF of the school year so far, set in Lanternfell's night. A cover with the castle on its hill, the three years,
// the buildings of the current year, the four wells with the house and the cup, and a closing page (the Charter once CA Final is cleared,
// "the term continues" before that). Everything is drawn from the real numbers, in the same colours as the screen.
import type { Level, StudyStats, UserSettings } from '../../types';
import { PdfDoc, TABLET, fit, fitSize, loadPdfFonts, mix, type PdfColor, type PdfPage } from '../../lib/pdf';
import { fmtDate } from '../../lib/date';
import { downloadBlob, slug } from '../../lib/files';
import { LEVELS } from '../../config/curriculum';
import { wordsFor } from '../words';
import { LEVEL_ORDER, journeyFraction, levelProgress, seaStatus, type Island } from '../voyage/progress';
import type { AcademyState } from './academyState';
import { LANDMARKS } from './art/landmarks';
import { VIRTUES, virtueLabel, type Cup, type Measured } from './choosing';
import { HOUSES, HOUSE_ORDER, type HouseId } from './houses';
import { YEAR_NAME, landmarkIdFor } from './grounds';

export interface SchoolRecordInput {
  ac: AcademyState;
  islands: Island[];
  stats: StudyStats;
  settings: UserSettings;
  level: Level;
  levelLabel: string;
  today: string;
  measured: Measured;
  cup: Cup;
}

const W = TABLET.w, H = TABLET.h;
const NIGHT = '#0c0a2e', NIGHT_2 = '#171447', CARD = '#1d1a55', CARD_LINE = '#3a3590', INK = '#f4edd3', INK_SOFT = '#a9a4d8', GOLD = '#e6b957', GOLD_LT = '#ffe08a', GOLD_DK = '#8a5f1f';
const ACCENT: Record<string, string> = { cyan: '#4cc3d4', violet: '#9a86f0', gold: '#e0b038', ember: '#ee7a44', mint: '#44c79a', rose: '#e0608c' };
const hrs = (h: number) => `${Math.round(h * 10) / 10} h`;
/** "The Upper Grounds" in the middle of a sentence: "the Upper Grounds". */
const theYear = (l: Level) => YEAR_NAME[l].replace(/^The /, 'the ');

/** Deterministic pseudo-random numbers, so the same record always looks the same. */
const rnd = (i: number, salt: number) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

function stars(p: PdfPage, count: number, maxY: number, salt = 1) {
  for (let i = 0; i < count; i++) p.circle(rnd(i, salt) * W, rnd(i, salt + 1) * maxY, 0.4 + rnd(i, salt + 2) * 0.9, { fill: i % 6 === 0 ? '#ffe9a8' : i % 4 === 0 ? '#c9c3ff' : '#e8e6ff' });
}

/** A ridge line across the page: a few slow waves plus some jitter, closed down to the bottom of the page. */
function ridge(p: PdfPage, seed: number, base: number, amp: number, color: PdfColor, bump?: { x: number; w: number; h: number }) {
  const pts: [number, number][] = [[-4, H + 4]];
  for (let x = -4; x <= W + 4; x += 14) {
    let y = base - amp * (0.5 + 0.28 * Math.sin(x / 92 + seed) + 0.16 * Math.sin(x / 41 + seed * 2.3) + 0.1 * (rnd(Math.round(x / 14), seed) - 0.5));
    if (bump) { const d = (x - bump.x) / bump.w; if (Math.abs(d) < 1) y -= bump.h * Math.pow(1 - d * d, 1.4); }
    pts.push([x, y]);
  }
  pts.push([W + 4, H + 4]);
  p.polygon(pts, { fill: color });
}

function pine(p: PdfPage, x: number, base: number, h: number, color: PdfColor, rim: PdfColor) {
  const w = h * 0.34;
  p.rect(x - 1.2, base - h * 0.14, 2.4, h * 0.16, { fill: color });
  for (let t = 0; t < 3; t++) {
    const y1 = base - h * 0.1 - t * h * 0.27, tw = w * (1 - t * 0.26), th = h * (0.46 - t * 0.04);
    p.polygon([[x - tw, y1], [x + tw, y1], [x, y1 - th]], { fill: color });
    p.line(x, y1 - th, x - tw * 0.92, y1 - 0.4, { color: rim, width: 0.5 });
  }
}

/** A castle in local units (x across, y up from the ground), scaled by `s`. Windows light up at random, like a late evening. */
function castle(p: PdfPage, cx: number, ground: number, s: number, seed: number) {
  const body = '#18164a', roof = '#0b0a2c', edge = '#34308a', warm = '#ffd27a', dim = '#26226a';
  const X = (x: number) => cx + x * s, Y = (y: number) => ground - y * s;
  const box = (x: number, y: number, w: number, h: number, c: PdfColor) => p.rect(X(x), Y(y + h), w * s, h * s, { fill: c });
  const cone = (x: number, y: number, w: number, h: number) => p.polygon([[X(x - 4), Y(y)], [X(x + w + 4), Y(y)], [X(x + w / 2), Y(y + h)]], { fill: roof });
  const crenels = (x: number, y: number, w: number, step = 12) => { for (let i = 0; i + 7 <= w; i += step) box(x + i, y, 7, 6, body); };
  const win = (x: number, y: number, w: number, h: number, k: number) => {
    const on = rnd(k, seed) > 0.34;
    p.rect(X(x), Y(y + h), w * s, h * s, { fill: on ? warm : dim, radius: [w * s * 0.5, w * s * 0.5, 0, 0] });
    if (on) p.line(X(x + w / 2), Y(y + h - 1), X(x + w / 2), Y(y + 1), { color: '#b57a2a', width: 0.5 });
  };
  // curtain wall and its walk
  box(-156, 0, 312, 46, body); crenels(-156, 46, 312, 13); box(-156, 44, 312, 3, edge);
  // outer towers
  box(-138, 0, 40, 122, body); cone(-138, 122, 40, 52); box(-138, 118, 40, 4, edge);
  box(98, 0, 40, 106, body); cone(98, 106, 40, 48); box(98, 102, 40, 4, edge);
  // inner towers
  box(-92, 0, 32, 96, body); cone(-92, 96, 32, 38);
  box(60, 0, 32, 84, body); cone(60, 84, 32, 34);
  // the keep and the high tower
  box(-46, 0, 92, 128, body); crenels(-46, 128, 92, 12); box(-46, 124, 92, 4, edge);
  box(-20, 128, 40, 76, body); cone(-20, 204, 40, 60); box(-20, 200, 40, 4, edge);
  // light on the left edge of everything, as if from the moon
  for (const [x, y, h] of [[-138, 0, 122], [-92, 0, 96], [-46, 0, 128], [-20, 128, 76], [60, 0, 84], [98, 0, 106]] as const) box(x, y, 1.6, h, edge);
  // gate
  box(-15, 0, 30, 34, roof); p.polygon([[X(-15), Y(34)], [X(0), Y(46)], [X(15), Y(34)]], { fill: roof });
  box(-9, 0, 18, 28, '#3a2410'); p.rect(X(-9), Y(28), 18 * s, 28 * s, { fill: '#c98a3a', radius: [9 * s, 9 * s, 0, 0] });
  // windows: tall slits in the towers, pairs in the keep
  let k = 0;
  for (const [x, w] of [[-124, 12], [-82, 10]] as const) for (const y of [26, 56, 84, 106]) { if (y < (x === -124 ? 112 : 88)) win(x, y, w, 15, k++); }
  for (const y of [22, 50, 80]) win(112, y, 11, 15, k++);
  for (const y of [22, 50]) win(70, y, 10, 14, k++);
  for (const x of [-34, 18]) for (const y of [48, 84]) win(x, y, 14, 22, k++);
  win(-6, 150, 12, 22, k++); win(-6, 180, 12, 14, k++);
  // lanterns along the wall and a flag on each high roof
  for (let x = -150; x <= 150; x += 30) if (Math.abs(x) > 20) p.circle(X(x), Y(38), 1.6, { fill: warm });
  for (const [x, y] of [[0, 264], [-118, 174], [118, 154]] as const) {
    p.line(X(x), Y(y), X(x), Y(y + 22), { color: INK_SOFT, width: 0.8 });
    p.polygon([[X(x), Y(y + 22)], [X(x + 16), Y(y + 17)], [X(x), Y(y + 12)]], { fill: x === 0 ? GOLD : '#c0463a' });
  }
}

/** A heater-shaped shield, as a polygon. */
function shieldPoints(cx: number, cy: number, w: number, h: number): [number, number][] {
  const x0 = cx - w / 2, x1 = cx + w / 2, top = cy - h / 2, bot = cy + h / 2, sh = top + h * 0.52;
  const pts: [number, number][] = [[x0, top], [x1, top], [x1, sh]];
  for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t; pts.push([u * u * x1 + 2 * u * t * x1 + t * t * cx, u * u * sh + 2 * u * t * (bot - h * 0.1) + t * t * bot]); }
  for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t; pts.push([u * u * cx + 2 * u * t * x0 + t * t * x0, u * u * bot + 2 * u * t * (bot - h * 0.1) + t * t * sh]); }
  return pts;
}

/** A house crest: the shield in the house colours with its own charge (wolf: crescent and star, heron: waves, fox: flame, bear: chevron and hearth). */
function crest(p: PdfPage, house: HouseId, cx: number, cy: number, w: number) {
  const h = w * 1.2; const c = HOUSES[house].colors;
  const pts = shieldPoints(cx, cy, w, h);
  p.polygon(pts, { fill: c.deep, stroke: c.metal, lineWidth: Math.max(0.8, w * 0.04) });
  p.polygon(shieldPoints(cx, cy, w * 0.84, h * 0.84), { fill: c.main });
  const u = w / 100;
  if (house === 'wolf') {
    p.circle(cx - 4 * u, cy - 2 * u, 22 * u, { fill: c.metal }); p.circle(cx + 6 * u, cy - 7 * u, 20 * u, { fill: c.main });
    const star: [number, number][] = [];
    for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, r = (i % 2 ? 4.4 : 10) * u; star.push([cx + 20 * u + Math.cos(a) * r, cy - 14 * u + Math.sin(a) * r]); }
    p.polygon(star, { fill: c.metal });
  } else if (house === 'heron') {
    for (let r = 0; r < 3; r++) {
      const pl: [number, number][] = [];
      for (let i = 0; i <= 16; i++) pl.push([cx - 24 * u + (48 * u * i) / 16, cy - 14 * u + r * 14 * u + Math.sin((i / 16) * Math.PI * 4) * 3.4 * u]);
      p.polyline(pl, { color: c.metal, width: Math.max(0.9, 2.6 * u) });
    }
  } else if (house === 'fox') {
    p.polygon([[cx, cy - 26 * u], [cx + 16 * u, cy], [cx + 12 * u, cy + 16 * u], [cx, cy + 22 * u], [cx - 12 * u, cy + 16 * u], [cx - 16 * u, cy], [cx - 6 * u, cy - 8 * u]], { fill: c.metal });
    p.polygon([[cx, cy - 8 * u], [cx + 7 * u, cy + 6 * u], [cx, cy + 16 * u], [cx - 7 * u, cy + 6 * u]], { fill: c.deep });
  } else {
    p.polyline([[cx - 24 * u, cy + 4 * u], [cx, cy - 18 * u], [cx + 24 * u, cy + 4 * u]], { color: c.metal, width: Math.max(1.2, 6 * u) });
    p.circle(cx, cy + 14 * u, 7 * u, { fill: c.metal }); p.circle(cx, cy + 14 * u, 3.4 * u, { fill: c.deep });
  }
}

function frame(p: PdfPage, page: number, today: string) {
  p.gradient(0, 0, W, H, { from: NIGHT, to: NIGHT_2, dir: 'v' });
  stars(p, 46, H * 0.9, 7);
  p.rect(14, 14, W - 28, H - 28, { stroke: GOLD, lineWidth: 1.4, radius: 10 });
  p.rect(20, 20, W - 40, H - 40, { stroke: GOLD_DK, lineWidth: 0.6, radius: 7 });
  for (const [x, y] of [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]] as const) { p.circle(x, y, 3.2, { fill: GOLD }); p.circle(x, y, 1.2, { fill: NIGHT }); }
  p.text(`Lanternfell Academy  ·  School record  ·  ${fmtDate(today, { year: true })}`, 42, H - 30, { size: 8.5, color: INK_SOFT });
  p.text(String(page), W - 42, H - 30, { size: 8.5, color: INK_SOFT, align: 'right' });
}

function heading(p: PdfPage, title: string, sub: string) {
  p.text(title, 44, 66, { size: 25, font: 'bold', color: INK, maxWidth: W - 88 });
  p.text(sub, 44, 86, { size: 10.5, color: INK_SOFT, maxWidth: W - 88 });
  p.line(44, 98, 44 + 78, 98, { color: GOLD, width: 2.2, cap: 'round' });
}

function bar(p: PdfPage, x: number, y: number, w: number, h: number, v: number, color: PdfColor) {
  p.rect(x, y, w, h, { fill: '#2a2670', radius: h / 2 });
  if (v > 0.004) p.rect(x, y, Math.max(h, w * Math.min(1, v)), h, { fill: color, radius: h / 2 });
}

export async function buildSchoolRecord(i: SchoolRecordInput): Promise<Blob> {
  await loadPdfFonts();
  const { ac, islands, stats, settings, level, levelLabel, today, measured, cup } = i;
  const words = wordsFor('academy');
  const name = settings.displayName.trim() || 'Student';
  const prog = levelProgress(islands);
  const fraction = journeyFraction(level, ac.cleared, prog);
  const won = !!ac.cleared.final;
  const doc = new PdfDoc({ title: `${name}'s school record`, author: name, subject: `${levelLabel} school record`, creator: 'CA Inter Study Tracker, Lanternfell theme' });

  // ── 1. cover: the castle on its hill, lit windows, the moon ──
  {
    const p = doc.addPage(W, H);
    p.gradient(0, 0, W, H, { from: '#07062a', via: '#1b1760', to: '#4a3a8c', dir: 'v' });
    stars(p, 120, H * 0.5, 1);
    p.glow(150, 96, 120, '#fff0c0', '#13104a', 3.2);
    p.circle(150, 96, 31, { fill: '#fff6d6' });
    for (const [dx, dy, r] of [[-9, -7, 6], [8, 6, 8], [-4, 13, 4.6], [12, -12, 3.6]] as const) p.circle(150 + dx, 96 + dy, r, { fill: '#efe3b8' });
    ridge(p, 3, 300, 70, '#2c2878');
    ridge(p, 5, 352, 56, '#1e1a5c', { x: 596, w: 340, h: 72 });
    castle(p, 596, 300, 0.74, 11);
    ridge(p, 8, 400, 42, '#12103c');
    for (let n = 0; n < 24; n++) { const x = 10 + n * 36 + rnd(n, 4) * 18; const hh = 34 + rnd(n, 5) * 30; pine(p, x, 408 + rnd(n, 6) * 14, hh, '#0b0a2c', '#262270'); }
    ridge(p, 13, 470, 30, '#07062a');
    p.text('Lanternfell Academy', 48, 452, { size: fitSize('Lanternfell Academy', 520, 38, 20, 'bold'), font: 'bold', color: GOLD_LT, maxWidth: 520 });
    p.text('School record', 48, 478, { size: 17, color: INK, maxWidth: 520 });
    p.line(48, 490, 128, 490, { color: GOLD, width: 1.6, cap: 'round' });
    p.text(`${name}  ·  ${levelLabel}  ·  ${fmtDate(today, { year: true })}`, 48, 508, { size: 10.5, color: INK_SOFT, maxWidth: 560 });
    if (ac.house) { crest(p, ac.house, W - 74, 466, 56); p.text(HOUSES[ac.house].name, W - 74, 512, { size: 9.5, font: 'bold', color: INK, align: 'center', maxWidth: 110 }); }
  }

  // ── 2. the school year so far ──
  {
    const p = doc.addPage(W, H);
    frame(p, 2, today);
    heading(p, 'The school year so far', `${Math.round(fraction * 100)}% of the way to Charter Night`);
    const cw = (W - 88 - 28) / 3;
    LEVEL_ORDER.forEach((l, idx) => {
      const x = 44 + idx * (cw + 14); const st = seaStatus(l, level, ac.cleared);
      p.rect(x, 114, cw, 112, { fill: CARD, stroke: st === 'current' ? GOLD : CARD_LINE, lineWidth: st === 'current' ? 1.6 : 0.8, radius: 10 });
      p.text(YEAR_NAME[l], x + 14, 140, { size: 15, font: 'bold', color: INK, maxWidth: cw - 28 });
      p.text(LEVELS.find((v) => v.id === l)?.label ?? '', x + 14, 158, { size: 9.5, color: INK_SOFT, maxWidth: cw - 28 });
      const v = st === 'sailed' ? 1 : st === 'current' ? prog : 0;
      bar(p, x + 14, 172, cw - 28, 9, v, st === 'sailed' ? '#44c79a' : GOLD);
      const note = ac.cleared[l] ? `Cleared ${fmtDate(ac.cleared[l]!, { year: true })}` : st === 'sailed' ? 'Behind you' : st === 'current' ? `You are here · ${Math.round(prog * 100)}% explored` : 'Still ahead';
      p.text(note, x + 14, 202, { size: 9.5, color: st === 'ahead' ? INK_SOFT : INK, maxWidth: cw - 28 });
    });
    const tiles: [string, string][] = [
      ['Hours studied', hrs(stats.totalStudiedHours)], ['Days logged', String(stats.daysLogged)],
      ['Best day', `${hrs(stats.bestDayHours)}${stats.bestDayDate ? `  ·  ${fmtDate(stats.bestDayDate)}` : ''}`],
      ['Longest streak', `${stats.maxStreak} ${stats.maxStreak === 1 ? 'day' : 'days'}`], ['Standing', words.rank(stats.rankInfo.title)], ['XP earned', Math.round(stats.totalXP).toLocaleString('en-IN')],
    ];
    const tw = (W - 88 - 28) / 3;
    tiles.forEach(([k, v], idx) => {
      const x = 44 + (idx % 3) * (tw + 14); const y = 246 + Math.floor(idx / 3) * 100;
      p.rect(x, y, tw, 86, { fill: CARD, stroke: CARD_LINE, lineWidth: 0.8, radius: 10 });
      p.circle(x + 22, y + 24, 4, { fill: GOLD });
      p.text(k, x + 34, y + 28, { size: 10.5, color: INK_SOFT, maxWidth: tw - 48 });
      p.text(v, x + 14, y + 64, { size: fitSize(v, tw - 28, 21, 11, 'bold'), font: 'bold', color: INK, maxWidth: tw - 28 });
    });
  }

  // ── 3. the buildings of this year ──
  {
    const p = doc.addPage(W, H);
    frame(p, 3, today);
    heading(p, `The buildings of ${theYear(level)}`, `${levelLabel}  ·  ${islands.length} ${islands.length === 1 ? 'paper' : 'papers'}  ·  ${Math.round(prog * 100)}% explored`);
    const rowH = Math.min(42, Math.floor((H - 150 - 40) / Math.max(1, islands.length)));
    islands.forEach((it, idx) => {
      const y = 114 + idx * rowH; const col = ACCENT[it.accent] ?? GOLD; const mid = y + (rowH - 6) / 2;
      p.rect(44, y, W - 88, rowH - 6, { fill: idx % 2 ? '#1a1750' : CARD, radius: 8 });
      p.rect(52, mid - 10, 40, 20, { fill: col, radius: 10 });
      p.text(it.abbrev, 72, mid + 4, { size: 9.5, font: 'bold', color: '#0c0a2e', align: 'center', maxWidth: 36 });
      const two = rowH >= 34;
      p.text(fit(it.name, 250, 11), 102, two ? mid - 1 : mid + 4, { size: 11, color: INK });
      if (two) p.text(LANDMARKS[landmarkIdFor(it.key, it.paperNumber)].name, 102, mid + 11, { size: 8, color: INK_SOFT, maxWidth: 250 });
      bar(p, 362, mid - 4, 170, 8, it.progress, col);
      p.text(`${Math.round(it.progress * 100)}%`, 546, mid + 4, { size: 11, font: 'bold', color: INK });
      p.text(`${it.lanterns.lit}/${it.lanterns.total} chapters`, 594, mid + 4, { size: 10, color: INK_SOFT });
      p.text(hrs(it.hours), 700, mid + 4, { size: 10, color: INK_SOFT });
      const state = it.state === 'cleared' ? 'Cleared' : it.state === 'neglected' ? 'Ivy growing' : it.state === 'uncharted' ? 'Not opened' : 'In progress';
      p.text(state, W - 52, mid + 4, { size: 9.5, font: 'bold', color: it.state === 'cleared' ? '#5fe0b0' : it.state === 'neglected' ? '#f0a85a' : INK_SOFT, align: 'right' });
    });
  }

  // ── 4. the four wells, the house and the cup ──
  {
    const p = doc.addPage(W, H);
    frame(p, 4, today);
    heading(p, 'The four wells', measured.daysOfData > 0 ? `How full each virtue is, from the last 28 days (${measured.daysOfData} with study logged)` : 'The wells fill from real study days. None have been logged yet.');
    const vessel = (house: HouseId, cx: number, top: number) => {
      const c = HOUSES[house].colors; const v = measured.virtues[HOUSES[house].virtue]; const gw = 64, gh = 150, gx = cx - gw / 2;
      p.rect(gx - 10, top + gh + 2, gw + 20, 14, { fill: '#3a3690', stroke: '#14123a', lineWidth: 1, radius: 4 });
      p.rect(gx, top, gw, gh, { fill: '#0f0d36', stroke: '#c9c6ff', lineWidth: 1.2, radius: [10, 10, 14, 14] });
      const lh = Math.max(0, (gh - 8) * (v / 100));
      if (lh > 0) p.clip(gx + 1.5, top + 1.5, gw - 3, gh - 3, () => {
        p.rect(gx, top + gh - lh, gw, lh + 4, { fill: mix(c.main, c.metal, 0.35) });
        p.rect(gx, top + gh - lh, gw, Math.min(7, lh), { fill: mix(c.metal, '#ffffff', 0.35) });
        p.rect(gx + 7, top + gh - lh + 4, 5, Math.max(0, lh - 12), { fill: mix(c.main, '#ffffff', 0.32) });
      }, [9, 9, 13, 13]);
      for (const t of [0.25, 0.5, 0.75]) p.line(gx + gw - 11, top + gh - (gh - 8) * t, gx + gw - 2, top + gh - (gh - 8) * t, { color: '#c9c6ff', width: 0.8 });
      crest(p, house, cx, top + gh + 40, 30);
      p.text(HOUSES[house].name, cx, top + gh + 76, { size: 12, font: 'bold', color: INK, align: 'center', maxWidth: 130 });
      p.text(`${virtueLabel(HOUSES[house].virtue)}  ${v}/100`, cx, top + gh + 92, { size: 10, color: INK_SOFT, align: 'center', maxWidth: 130 });
      if (ac.house === house) { p.rect(cx - 33, top - 22, 66, 15, { fill: GOLD, radius: 7.5 }); p.text('Your house', cx, top - 11, { size: 8.5, font: 'bold', color: '#0c0a2e', align: 'center' }); }
    };
    HOUSE_ORDER.forEach((h, idx) => vessel(h, 44 + 80 + idx * 118, 150));

    // the right-hand column: the Choosing, then the cup
    const x0 = 568, cwid = W - 44 - x0;
    p.rect(x0, 126, cwid, 150, { fill: CARD, stroke: CARD_LINE, lineWidth: 0.8, radius: 10 });
    p.text('The Choosing', x0 + 16, 150, { size: 13, font: 'bold', color: INK });
    if (ac.house && ac.chosenOn) {
      p.text(`${HOUSES[ac.house].name}, on ${fmtDate(ac.chosenOn, { year: true })}`, x0 + 16, 170, { size: 10.5, color: INK, maxWidth: cwid - 32 });
      p.paragraph(HOUSES[ac.house].blurb, x0 + 16, 190, cwid - 32, { size: 9.5, color: INK_SOFT, leading: 13, maxLines: 3 });
      if (ac.virtues) p.paragraph(`At the Choosing: ${VIRTUES.map((v) => `${virtueLabel(v)} ${ac.virtues![v]}`).join(', ')}.`, x0 + 16, 236, cwid - 32, { size: 9, color: INK_SOFT, leading: 12, maxLines: 2 });
    } else p.paragraph('No house yet. The Choosing blends how you really study with three questions, and names one of four houses.', x0 + 16, 172, cwid - 32, { size: 10, color: INK_SOFT, leading: 14, maxLines: 5 });
    p.rect(x0, 292, cwid, 148, { fill: CARD, stroke: CARD_LINE, lineWidth: 0.8, radius: 10 });
    p.text('The house cup', x0 + 16, 316, { size: 13, font: 'bold', color: INK });
    if (cup.winner && cup.virtue) {
      crest(p, cup.winner, x0 + 40, 372, 40);
      p.text(`${HOUSES[cup.winner].name} this week`, x0 + 72, 360, { size: 11.5, font: 'bold', color: INK, maxWidth: cwid - 88 });
      p.paragraph(`${virtueLabel(cup.virtue)} is the strongest virtue of the last 7 days (${cup.score}/100).`, x0 + 72, 376, cwid - 88, { size: 9.5, color: INK_SOFT, leading: 13, maxLines: 3 });
    } else p.paragraph('Nothing has been won this week. The strongest virtue of the last 7 days takes the cup.', x0 + 16, 338, cwid - 32, { size: 10, color: INK_SOFT, leading: 14, maxLines: 4 });
  }

  // ── 5. the end ──
  {
    const p = doc.addPage(W, H);
    if (won) {
      p.rect(0, 0, W, H, { fill: '#0f0c36' });
      stars(p, 90, H * 0.9, 3);
      p.glow(W / 2, 228, 280, '#a07a26', '#0f0c36', 2.1);
      // the Charter: a sheet between two rolls, with a wax seal in the house colour
      const sx = W / 2 - 190, sy = 112, sw = 380, sh = 232;
      p.rect(sx, sy, sw, sh, { fill: '#f0e2b8', stroke: '#6f5320', lineWidth: 1.4 });
      p.rect(sx + 10, sy + 10, sw - 20, sh - 20, { stroke: '#7a5a22', lineWidth: 1.2 });
      p.rect(sx + 15, sy + 15, sw - 30, sh - 30, { stroke: '#7a5a22', lineWidth: 0.5 });
      for (const y of [sy - 12, sy + sh - 6]) { p.rect(sx - 14, y, sw + 28, 18, { fill: '#e2cc98', stroke: '#6f5320', lineWidth: 1.2, radius: 9 }); }
      p.text('THE LANTERNFELL CHARTER', W / 2, sy + 52, { size: 15, font: 'bold', color: '#3a2a10', align: 'center', charSpace: 1.4 });
      p.line(W / 2 - 80, sy + 62, W / 2 + 80, sy + 62, { color: '#7a5a22', width: 0.9 });
      p.text('Be it known that', W / 2, sy + 84, { size: 10.5, font: 'italic', color: '#4a3a1a', align: 'center' });
      p.text(name, W / 2, sy + 116, { size: fitSize(name, sw - 80, 27, 14, 'bold'), font: 'bold', color: '#1f2a6a', align: 'center', maxWidth: sw - 80 });
      p.line(W / 2 - 96, sy + 124, W / 2 + 96, sy + 124, { color: '#7a5a22', width: 0.7, dash: [1.6, 3] });
      p.paragraph('has kept the lantern lit through the Lower Court, the Upper Grounds and the High Keep, and is named a Lantern-Warden of Lanternfell.', sx + 40, sy + 146, sw - 80, { size: 10.5, font: 'italic', color: '#4a3a1a', leading: 14.5, maxLines: 3 });
      p.line(sx + 44, sy + sh - 34, sx + 150, sy + sh - 34, { color: '#4a3a1a', width: 0.8 });
      p.text('Headmistress Vane', sx + 97, sy + sh - 24, { size: 8.5, font: 'italic', color: '#6a5a3a', align: 'center' });
      const wax = ac.house ? HOUSES[ac.house].colors.main : '#a82b2b';
      p.circle(sx + sw - 70, sy + sh - 38, 21, { fill: wax, stroke: mix(wax, '#000000', 0.4), lineWidth: 1.4 });
      p.circle(sx + sw - 70, sy + sh - 38, 14.5, { stroke: mix(wax, '#000000', 0.45), lineWidth: 1 });
      p.polygon([[sx + sw - 70, sy + sh - 52], [sx + sw - 64, sy + sh - 40], [sx + sw - 70, sy + sh - 24], [sx + sw - 76, sy + sh - 40]], { fill: mix(wax, '#ffffff', 0.55) });
      p.text('Charter Night', W / 2, 396, { size: 30, font: 'bold', color: '#fff3cc', align: 'center' });
      p.text(`${name}, you cleared CA Final: ${hrs(stats.totalStudiedHours)} over ${stats.daysLogged} days.`, W / 2, 428, { size: 11.5, color: '#f1e3b0', align: 'center', maxWidth: W - 160 });
      p.text('Every lantern in Lanternfell is lit for you.', W / 2, 450, { size: 10.5, font: 'italic', color: '#d8c98a', align: 'center' });
    } else {
      frame(p, 5, today);
      const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1];
      // a lantern, hung from the top of the page: rope, ring, cap, four posts around the glass, flame, base
      const cx = W / 2, DARK = '#2a1808', BRONZE = '#9a5a2a';
      p.line(cx, 20, cx, 104, { color: GOLD_DK, width: 2.2 });
      p.rect(W / 2 - 1, 20, 2, 6, { fill: GOLD });
      p.glow(cx, 196, 124, '#b07a2c', '#110e3a', 2.3);
      p.circle(cx, 112, 8, { stroke: GOLD, lineWidth: 2.6 });
      p.polygon([[cx - 30, 146], [cx - 17, 124], [cx + 17, 124], [cx + 30, 146]], { fill: BRONZE, stroke: DARK, lineWidth: 1.6 });
      p.polygon([[cx - 17, 124], [cx - 11, 124], [cx - 20, 146], [cx - 30, 146]], { fill: mix(BRONZE, '#ffffff', 0.25) });
      p.circle(cx, 121, 3.2, { fill: GOLD, stroke: DARK, lineWidth: 1 });
      p.rect(cx - 34, 144, 68, 8, { fill: GOLD, stroke: DARK, lineWidth: 1.4, radius: 3 });
      p.rect(cx - 28, 152, 56, 88, { fill: '#ffcf78' });
      p.polygon([[cx, 234], [cx + 13, 212], [cx + 6, 190], [cx, 174], [cx - 6, 190], [cx - 13, 212]], { fill: '#ff8f2e' });
      p.polygon([[cx, 230], [cx + 6.5, 213], [cx, 194], [cx - 6.5, 213]], { fill: '#fff6d0' });
      p.rect(cx - 28, 152, 56, 88, { stroke: DARK, lineWidth: 1.6 });
      for (const x of [cx - 28, cx - 9.3, cx + 9.3, cx + 28]) p.line(x, 152, x, 240, { color: DARK, width: x === cx - 28 || x === cx + 28 ? 3 : 1.4 });
      p.rect(cx - 34, 238, 68, 9, { fill: GOLD, stroke: DARK, lineWidth: 1.4, radius: 3 });
      p.polygon([[cx - 22, 247], [cx + 22, 247], [cx + 8, 262], [cx - 8, 262]], { fill: BRONZE, stroke: DARK, lineWidth: 1.4 });
      p.circle(cx, 266, 3.4, { fill: GOLD, stroke: DARK, lineWidth: 1 });
      for (let k = 0; k < 9; k++) p.circle(cx + (rnd(k, 31) - 0.5) * 120, 120 + rnd(k, 32) * 150, 0.7 + rnd(k, 33) * 0.9, { fill: k % 2 ? '#ffd27a' : '#ffe9b0' });
      p.text('The term continues', W / 2, 316, { size: 28, font: 'bold', color: INK, align: 'center' });
      p.text(ac.cleared[level] && next ? `Next: ${YEAR_NAME[next]}` : `Keep the windows lit in ${theYear(level)}.`, W / 2, 346, { size: 13, color: INK_SOFT, align: 'center' });
      p.text('Charter Night is only the end of a long study. One chapter, one lit window at a time.', W / 2, 388, { size: 10.5, font: 'italic', color: INK_SOFT, align: 'center', maxWidth: W - 160 });
    }
  }
  return doc.blob();
}

export async function downloadSchoolRecord(i: SchoolRecordInput): Promise<boolean> {
  try {
    const blob = await buildSchoolRecord(i);
    downloadBlob(blob, `school-record-${slug(i.settings.displayName.trim() || 'student') || 'student'}-${i.today}.pdf`, 'application/pdf');
    return true;
  } catch { return false; }
}
