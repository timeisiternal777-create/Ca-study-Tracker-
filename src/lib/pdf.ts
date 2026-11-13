// A small, dependency-free PDF writer for the study reports (the npm registry is unavailable in the build
// sandbox, and a report needs nothing beyond text, shapes and gradients).
//
//  * Fonts: Comic Relief (Regular and Bold) is embedded as a TrueType CID font (Identity-H) with a ToUnicode map,
//    so text stays crisp, selectable and searchable in any viewer. Comic Relief is an open-licence (SIL OFL) look-alike
//    of Comic Sans with the same letter widths. Glyphs it lacks (arrows, tick, star, rupee ...) are drawn as vectors.
//  * Coordinates: points, origin at the TOP-left, y grows downwards (converted on output).
//  * Gradients (linear and radial) are real PDF shadings, so they are smooth at any zoom.
//  * Streams are Flate-compressed when the browser can (CompressionStream), otherwise written plain.

export type PdfFont = 'regular' | 'bold' | 'italic';
export type PdfColor = string | [number, number, number];

export const A4 = { w: 595.28, h: 841.89 } as const;
/** 16:10, the shape of a tablet screen held sideways (842 x 526 pt is A4 landscape's width at 16:10). */
export const TABLET = { w: 842, h: 526 } as const;

/* ═════════════════════════ fonts ═════════════════════════ */

interface TtFont {
  bytes: Uint8Array;
  upem: number;
  ascent: number;
  descent: number;
  capHeight: number;
  bbox: [number, number, number, number];
  adv: Uint16Array;
  cmap: Map<number, number>;
  /** gid → smallest code point that maps to it, for the ToUnicode map */
  rev: Map<number, number>;
  name: string;
  stemV: number;
}

function parseTtf(buf: Uint8Array, name: string, stemV: number): TtFont {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  const tables: Record<string, { off: number; len: number }> = {};
  const n = dv.getUint16(4);
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; tables[tag(o)] = { off: dv.getUint32(o + 8), len: dv.getUint32(o + 12) }; }
  for (const t of ['head', 'hhea', 'hmtx', 'maxp', 'cmap']) if (!tables[t]) throw new Error(`The report font is damaged (missing ${t}).`);
  const head = tables.head.off, hhea = tables.hhea.off;
  const upem = dv.getUint16(head + 18);
  const bbox: [number, number, number, number] = [dv.getInt16(head + 36), dv.getInt16(head + 38), dv.getInt16(head + 40), dv.getInt16(head + 42)];
  const ascent = dv.getInt16(hhea + 4), descent = dv.getInt16(hhea + 6), nHm = dv.getUint16(hhea + 34);
  const numGlyphs = dv.getUint16(tables.maxp.off + 4);
  let capHeight = Math.round(upem * 0.72);
  const os2 = tables['OS/2'];
  if (os2 && os2.len >= 90 && dv.getUint16(os2.off) >= 2) capHeight = dv.getInt16(os2.off + 88) || capHeight;

  const adv = new Uint16Array(numGlyphs);
  let last = 0;
  for (let g = 0; g < numGlyphs; g++) { if (g < nHm) last = dv.getUint16(tables.hmtx.off + g * 4); adv[g] = last; }

  // cmap: prefer a full Unicode table (3,10), then Windows BMP (3,1), then any Unicode platform table.
  const cm = tables.cmap.off;
  const recs: { p: number; e: number; off: number }[] = [];
  for (let i = 0; i < dv.getUint16(cm + 2); i++) recs.push({ p: dv.getUint16(cm + 4 + i * 8), e: dv.getUint16(cm + 6 + i * 8), off: cm + dv.getUint32(cm + 8 + i * 8) });
  const pick = recs.find((r) => r.p === 3 && r.e === 10) || recs.find((r) => r.p === 3 && r.e === 1) || recs.find((r) => r.p === 0);
  if (!pick) throw new Error('The report font has no Unicode table.');
  const map = new Map<number, number>();
  const fmt = dv.getUint16(pick.off);
  if (fmt === 4) {
    const segX2 = dv.getUint16(pick.off + 6), seg = segX2 / 2;
    const endO = pick.off + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
    for (let s = 0; s < seg; s++) {
      const end = dv.getUint16(endO + s * 2), start = dv.getUint16(startO + s * 2), delta = dv.getInt16(deltaO + s * 2), ro = dv.getUint16(rangeO + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g: number;
        if (ro === 0) g = (c + delta) & 0xffff;
        else { const a = rangeO + s * 2 + ro + (c - start) * 2; g = a + 1 < buf.length ? dv.getUint16(a) : 0; if (g) g = (g + delta) & 0xffff; }
        if (g) map.set(c, g);
      }
    }
  } else if (fmt === 12) {
    const groups = dv.getUint32(pick.off + 12);
    for (let i = 0; i < groups; i++) {
      const o = pick.off + 16 + i * 12, s = dv.getUint32(o), e = dv.getUint32(o + 4), g0 = dv.getUint32(o + 8);
      for (let c = s; c <= e; c++) map.set(c, g0 + (c - s));
    }
  } else throw new Error(`The report font uses an unsupported character table (format ${fmt}).`);
  const rev = new Map<number, number>();
  for (const [c, g] of [...map].sort((a, b) => a[0] - b[0])) if (!rev.has(g)) rev.set(g, c);
  return { bytes: buf, upem, ascent, descent, capHeight, bbox, adv, cmap: map, rev, name, stemV };
}

export interface PdfFonts { regular: TtFont; bold: TtFont }
let FONTS: PdfFonts | null = null;
let loading: Promise<PdfFonts> | null = null;

/** Install the two font files (tests and non-browser use). */
export function installPdfFonts(regular: Uint8Array, bold: Uint8Array): PdfFonts {
  FONTS = { regular: parseTtf(regular, 'ComicRelief', 80), bold: parseTtf(bold, 'ComicRelief-Bold', 150) };
  return FONTS;
}

/** Fetch the bundled Comic Relief files (cached by the service worker, so this works offline). Safe to call repeatedly. */
export function loadPdfFonts(): Promise<PdfFonts> {
  if (FONTS) return Promise.resolve(FONTS);
  if (!loading) {
    const get = async (file: string) => {
      const r = await fetch(`/fonts/${file}`);
      if (!r.ok) throw new Error(`Could not load the report font (${file}).`);
      return new Uint8Array(await r.arrayBuffer());
    };
    loading = Promise.all([get('comic-relief-400.ttf'), get('comic-relief-700.ttf')])
      .then(([a, b]) => installPdfFonts(a, b))
      .catch((e) => { loading = null; throw e; });
  }
  return loading;
}

function fonts(): PdfFonts {
  if (!FONTS) throw new Error('PDF fonts are not loaded yet. Call loadPdfFonts() first.');
  return FONTS;
}
const face = (f: PdfFont): TtFont => (f === 'bold' ? fonts().bold : fonts().regular);

/* ═════════════════════════ text: normalise, measure, wrap ═════════════════════════ */

/** Symbols Comic Relief does not have are drawn as small vector icons, so they still show up in notes and topics. */
const INLINE_ICON: Record<number, { name: string; adv: number }> = {
  0x2192: { name: 'arrowR', adv: 0.95 }, 0x2190: { name: 'arrowL', adv: 0.95 }, 0x2191: { name: 'arrowU', adv: 0.7 }, 0x2193: { name: 'arrowD', adv: 0.7 },
  0x2713: { name: 'check', adv: 0.85 }, 0x2714: { name: 'check', adv: 0.85 }, 0x2717: { name: 'cross', adv: 0.8 }, 0x2715: { name: 'cross', adv: 0.8 }, 0x2718: { name: 'cross', adv: 0.8 },
  0x2605: { name: 'star', adv: 0.9 }, 0x2606: { name: 'starO', adv: 0.9 }, 0x25b2: { name: 'triUp', adv: 0.8 }, 0x25bc: { name: 'triDown', adv: 0.8 },
  0x25cb: { name: 'ringO', adv: 0.8 }, 0x25a0: { name: 'square', adv: 0.8 }, 0x20b9: { name: 'rupee', adv: 0.64 },
};

/** Clean a string for the PDF: tidy whitespace, drop emoji and invisible marks, turn the unknown into "?". */
export function normalize(input: string): string {
  const cmap = fonts().regular.cmap;
  let out = '';
  for (const ch of String(input ?? '').normalize('NFC')) {
    const cp = ch.codePointAt(0) as number;
    if (cp === 0x20 || cp === 0x09 || cp === 0x0a || cp === 0x0d || cp === 0xa0 || (cp >= 0x2000 && cp <= 0x200a) || cp === 0x202f || cp === 0x3000) { out += ' '; continue; }
    if (cp < 0x20 || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f)) continue;
    if (cp === 0xad || (cp >= 0x200b && cp <= 0x200f) || cp === 0x2060 || cp === 0xfeff || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x300 && cp <= 0x36f)) continue;
    if (cp === 0x2212 || cp === 0x2010 || cp === 0x2011) { out += '-'; continue; }
    if (cmap.has(cp) || INLINE_ICON[cp]) { out += ch; continue; }
    if (cp >= 0x1f000 || (cp >= 0x2190 && cp <= 0x2bff) || (cp >= 0x2600 && cp <= 0x27bf)) continue; // emoji, pictographs, arrows we cannot draw
    out += '?';
  }
  return out;
}

/** Advance of one code point, in 1/1000 em. */
function advOf(cp: number, f: TtFont): number {
  const g = f.cmap.get(cp);
  if (g !== undefined) return (f.adv[g] * 1000) / f.upem;
  const ic = INLINE_ICON[cp];
  return ic ? ic.adv * 1000 : 500;
}
function widthOf(norm: string, font: PdfFont): number {
  const f = face(font === 'italic' ? 'regular' : font);
  let w = 0;
  for (const ch of norm) w += advOf(ch.codePointAt(0) as number, f);
  return w;
}

/** Width of a string in points. */
export function measure(text: string, size: number, font: PdfFont = 'regular'): number {
  return (widthOf(normalize(text), font) * size) / 1000;
}

/** Shorten with an ellipsis so the text fits `maxWidth`. */
export function fit(text: string, maxWidth: number, size: number, font: PdfFont = 'regular'): string {
  const s = normalize(text);
  if (measure(s, size, font) <= maxWidth) return s;
  const chars = [...s];
  let lo = 0, hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(chars.slice(0, mid).join('').trimEnd() + '…', size, font) <= maxWidth) lo = mid; else hi = mid - 1;
  }
  return chars.slice(0, lo).join('').trimEnd() + '…';
}

/** Largest size (between `min` and `size`) at which the text fits. */
export function fitSize(text: string, maxWidth: number, size: number, min: number, font: PdfFont = 'regular'): number {
  const w = measure(text, size, font);
  return w <= maxWidth || w === 0 ? size : Math.max(min, (size * maxWidth) / w);
}

/** Greedy word wrap. Very long words are hard-broken. */
export function wrap(text: string, maxWidth: number, size: number, font: PdfFont = 'regular', maxLines = Infinity): string[] {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  const push = () => { if (cur) lines.push(cur); cur = ''; };
  for (let word of words) {
    while (measure(word, size, font) > maxWidth && [...word].length > 1) {
      const cs = [...word];
      let k = cs.length - 1;
      while (k > 1 && measure(cs.slice(0, k).join(''), size, font) > maxWidth) k--;
      push();
      lines.push(cs.slice(0, k).join(''));
      word = cs.slice(k).join('');
    }
    const next = cur ? `${cur} ${word}` : word;
    if (measure(next, size, font) <= maxWidth) cur = next; else { push(); cur = word; }
  }
  push();
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fit(kept[maxLines - 1] + ' ' + lines.slice(maxLines).join(' '), maxWidth, size, font);
    return kept;
  }
  return lines.length ? lines : [''];
}

/** Baseline offset that centres capital letters on a line: baseline = centre + capMid(size). */
export function capMid(size: number): number {
  const f = fonts().regular;
  return (f.capHeight / f.upem / 2) * size;
}

/* ═════════════════════════ colours & numbers ═════════════════════════ */

export function rgbOf(c: PdfColor): [number, number, number] {
  if (Array.isArray(c)) return c;
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const col = (c: PdfColor) => rgbOf(c).map((v) => num(v / 255)).join(' ');
function num(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const s = n.toFixed(3);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** Linear blend of two colours (t = 0 → a, 1 → b). Lets us fake transparency on solid backgrounds. */
export function mix(a: PdfColor, b: PdfColor, t: number): [number, number, number] {
  const x = rgbOf(a), y = rgbOf(b);
  return [0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * t)) as [number, number, number];
}

const hex4 = (n: number) => n.toString(16).padStart(4, '0');

/* ═════════════════════════ vector icons ═════════════════════════ */

type Seg = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z'];
interface Shape { d: Seg[]; fill?: boolean; stroke?: number; faint?: boolean }

const K = 0.5523;
const circ = (cx: number, cy: number, r: number): Seg[] => [
  ['M', cx + r, cy], ['C', cx + r, cy + K * r, cx + K * r, cy + r, cx, cy + r], ['C', cx - K * r, cy + r, cx - r, cy + K * r, cx - r, cy],
  ['C', cx - r, cy - K * r, cx - K * r, cy + -r, cx, cy - r], ['C', cx + K * r, cy - r, cx + r, cy - K * r, cx + r, cy], ['Z'],
];
const poly = (pts: [number, number][], close = false): Seg[] => [...pts.map((p, i): Seg => (i ? ['L', p[0], p[1]] : ['M', p[0], p[1]])), ...(close ? [['Z'] as Seg] : [])];
const roundRect = (x: number, y: number, w: number, h: number, r: number): Seg[] => [
  ['M', x + r, y + h], ['L', x + w - r, y + h], ['C', x + w - r + K * r, y + h, x + w, y + h - r + K * r, x + w, y + h - r], ['L', x + w, y + r],
  ['C', x + w, y + r - K * r, x + w - r + K * r, y, x + w - r, y], ['L', x + r, y], ['C', x + r - K * r, y, x, y + r - K * r, x, y + r],
  ['L', x, y + h - r], ['C', x, y + h - r + K * r, x + r - K * r, y + h, x + r, y + h], ['Z'],
];
const star = (cx: number, cy: number, ro: number, ri: number): Seg[] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return poly(pts, true);
};
const rotate = (shapes: Shape[], deg: number): Shape[] => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const t = (x: number, y: number): [number, number] => [x * c - y * s, x * s + y * c];
  return shapes.map((sh) => ({ ...sh, d: sh.d.map((g): Seg => {
    if (g[0] === 'M' || g[0] === 'L') { const [x, y] = t(g[1], g[2]); return [g[0], x, y]; }
    if (g[0] === 'C') { const a1 = t(g[1], g[2]), a2 = t(g[3], g[4]), a3 = t(g[5], g[6]); return ['C', a1[0], a1[1], a2[0], a2[1], a3[0], a3[1]]; }
    return g;
  }) }));
};
const ARROW: Shape[] = [{ d: poly([[-0.38, 0], [0.36, 0]]), stroke: 0.13 }, { d: poly([[0.08, 0.27], [0.38, 0], [0.08, -0.27]]), stroke: 0.13 }];

/** Icons live in a 1 x 1 box centred on the origin, y up. `faint` parts are drawn in a softer tone of the same colour. */
const ICONS: Record<string, Shape[]> = {
  check: [{ d: poly([[-0.34, -0.02], [-0.1, -0.28], [0.36, 0.26]]), stroke: 0.16 }],
  cross: [{ d: poly([[-0.27, -0.27], [0.27, 0.27]]), stroke: 0.15 }, { d: poly([[-0.27, 0.27], [0.27, -0.27]]), stroke: 0.15 }],
  arrowR: ARROW, arrowL: rotate(ARROW, 180), arrowU: rotate(ARROW, 90), arrowD: rotate(ARROW, -90),
  star: [{ d: star(0, -0.02, 0.5, 0.21), fill: true }],
  starO: [{ d: star(0, -0.02, 0.48, 0.2), stroke: 0.07 }],
  triUp: [{ d: poly([[0, 0.34], [-0.36, -0.28], [0.36, -0.28]], true), fill: true }],
  triDown: [{ d: poly([[0, -0.34], [-0.36, 0.28], [0.36, 0.28]], true), fill: true }],
  ringO: [{ d: circ(0, 0, 0.34), stroke: 0.1 }],
  square: [{ d: poly([[-0.31, -0.31], [0.31, -0.31], [0.31, 0.31], [-0.31, 0.31]], true), fill: true }],
  rupee: [
    { d: [['M', -0.3, 0.38], ['L', 0.3, 0.38]], stroke: 0.1 }, { d: [['M', -0.3, 0.17], ['L', 0.3, 0.17]], stroke: 0.1 },
    { d: [['M', -0.3, 0.38], ['L', -0.02, 0.38], ['C', 0.3, 0.38, 0.3, -0.04, -0.02, -0.04], ['L', -0.3, -0.04], ['L', 0.14, -0.4]], stroke: 0.1 },
  ],
  // ── tile icons ──
  clock: [{ d: circ(0, 0, 0.4), stroke: 0.1 }, { d: poly([[0, 0.2], [0, 0], [0.16, -0.1]]), stroke: 0.1 }],
  calendar: [{ d: roundRect(-0.4, -0.38, 0.8, 0.74, 0.1), stroke: 0.09 }, { d: poly([[-0.4, 0.12], [0.4, 0.12]]), stroke: 0.09 }, { d: poly([[-0.17, 0.3], [-0.17, 0.46]]), stroke: 0.09 }, { d: poly([[0.17, 0.3], [0.17, 0.46]]), stroke: 0.09 }, { d: circ(0, -0.14, 0.07), fill: true }],
  target: [{ d: circ(0, 0, 0.42), stroke: 0.08 }, { d: circ(0, 0, 0.24), stroke: 0.08 }, { d: circ(0, 0, 0.08), fill: true }],
  flame: [{ d: [['M', 0, 0.48], ['C', 0.1, 0.3, 0.36, 0.2, 0.36, -0.08], ['C', 0.36, -0.3, 0.2, -0.46, 0, -0.46], ['C', -0.2, -0.46, -0.36, -0.3, -0.36, -0.08], ['C', -0.36, 0.1, -0.2, 0.16, -0.14, 0.3], ['C', -0.08, 0.2, -0.02, 0.34, 0, 0.48], ['Z']], fill: true },
    { d: [['M', 0, -0.04], ['C', 0.1, -0.14, 0.18, -0.2, 0.16, -0.32], ['C', 0.1, -0.4, -0.1, -0.4, -0.16, -0.3], ['C', -0.18, -0.2, -0.06, -0.1, 0, -0.04], ['Z']], fill: true, faint: true }],
  trophy: [{ d: [['M', -0.3, 0.4], ['L', 0.3, 0.4], ['L', 0.3, 0.12], ['C', 0.3, -0.12, 0.14, -0.2, 0, -0.2], ['C', -0.14, -0.2, -0.3, -0.12, -0.3, 0.12], ['Z']], fill: true },
    { d: [['M', -0.3, 0.3], ['L', -0.42, 0.3], ['C', -0.42, 0.04, -0.34, 0, -0.26, 0]], stroke: 0.07 }, { d: [['M', 0.3, 0.3], ['L', 0.42, 0.3], ['C', 0.42, 0.04, 0.34, 0, 0.26, 0]], stroke: 0.07 },
    { d: poly([[0, -0.2], [0, -0.34]]), stroke: 0.09 }, { d: roundRect(-0.2, -0.46, 0.4, 0.1, 0.04), fill: true }],
  bolt: [{ d: poly([[0.08, 0.48], [-0.3, -0.04], [-0.02, -0.04], [-0.1, -0.48], [0.3, 0.06], [0.02, 0.06]], true), fill: true }],
  book: [{ d: [['M', 0, 0.32], ['C', -0.12, 0.4, -0.3, 0.4, -0.44, 0.34], ['L', -0.44, -0.3], ['C', -0.3, -0.24, -0.12, -0.24, 0, -0.32], ['Z']], fill: true },
    { d: [['M', 0, 0.32], ['C', 0.12, 0.4, 0.3, 0.4, 0.44, 0.34], ['L', 0.44, -0.3], ['C', 0.3, -0.24, 0.12, -0.24, 0, -0.32], ['Z']], fill: true, faint: true }],
  doc: [{ d: roundRect(-0.3, -0.44, 0.6, 0.88, 0.08), stroke: 0.09 }, { d: poly([[-0.14, 0.14], [0.14, 0.14]]), stroke: 0.08 }, { d: poly([[-0.14, -0.04], [0.14, -0.04]]), stroke: 0.08 }, { d: poly([[-0.14, -0.22], [0.04, -0.22]]), stroke: 0.08 }],
  medal: [{ d: circ(0, -0.1, 0.3), fill: true }, { d: poly([[-0.18, 0.18], [-0.3, 0.5], [0, 0.4], [0.3, 0.5], [0.18, 0.18]], true), fill: true, faint: true }],
};

/* ═════════════════════════ page ═════════════════════════ */

export interface ShapeStyle { fill?: PdfColor; stroke?: PdfColor; lineWidth?: number; dash?: [number, number] }
export interface TextStyle { size?: number; font?: PdfFont; color?: PdfColor; align?: 'left' | 'center' | 'right'; maxWidth?: number; charSpace?: number }
type Radius = number | [number, number, number, number];
export type GradientDir = 'h' | 'v' | 'd' | 'u';
export interface GradientStyle { from: PdfColor; to: PdfColor; via?: PdfColor; dir?: GradientDir; radius?: Radius }

const FONT_RES: Record<'regular' | 'bold', string> = { regular: 'F1', bold: 'F2' };

export class PdfPage {
  readonly w: number;
  readonly h: number;
  private ops: string[] = [];
  private shadings: string[] = [];
  private doc: PdfDoc;
  constructor(w: number, h: number, doc: PdfDoc) { this.w = w; this.h = h; this.doc = doc; }

  private Y(y: number) { return this.h - y; }
  private paint(s: ShapeStyle): string {
    const f = s.fill != null, k = s.stroke != null;
    return f && k ? 'B' : f ? 'f' : k ? 'S' : 'n';
  }
  private style(s: ShapeStyle) {
    if (s.fill != null) this.ops.push(`${col(s.fill)} rg`);
    if (s.stroke != null) {
      this.ops.push(`${col(s.stroke)} RG`, `${num(s.lineWidth ?? 1)} w`);
      this.ops.push(s.dash ? `[${num(s.dash[0])} ${num(s.dash[1])}] 0 d` : '[] 0 d');
    }
  }

  private roundedPath(x: number, y: number, w: number, h: number, r: Radius): string[] {
    const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(v, w / 2, h / 2))) as [number, number, number, number];
    const X0 = x, X1 = x + w, T = this.Y(y), B = this.Y(y + h);
    const p: string[] = [];
    p.push(`${num(X0 + tl)} ${num(T)} m`);
    p.push(`${num(X1 - tr)} ${num(T)} l`);
    if (tr) p.push(`${num(X1 - tr + tr * K)} ${num(T)} ${num(X1)} ${num(T - tr + tr * K)} ${num(X1)} ${num(T - tr)} c`);
    p.push(`${num(X1)} ${num(B + br)} l`);
    if (br) p.push(`${num(X1)} ${num(B + br - br * K)} ${num(X1 - br + br * K)} ${num(B)} ${num(X1 - br)} ${num(B)} c`);
    p.push(`${num(X0 + bl)} ${num(B)} l`);
    if (bl) p.push(`${num(X0 + bl - bl * K)} ${num(B)} ${num(X0)} ${num(B + bl - bl * K)} ${num(X0)} ${num(B + bl)} c`);
    p.push(`${num(X0)} ${num(T - tl)} l`);
    if (tl) p.push(`${num(X0)} ${num(T - tl + tl * K)} ${num(X0 + tl - tl * K)} ${num(T)} ${num(X0 + tl)} ${num(T)} c`);
    p.push('h');
    return p;
  }

  rect(x: number, y: number, w: number, h: number, s: ShapeStyle & { radius?: Radius } = {}): this {
    if (w <= 0 || h <= 0) return this;
    this.ops.push('q');
    this.style(s);
    const r = s.radius ?? 0;
    if (!r || (Array.isArray(r) && r.every((v) => !v))) this.ops.push(`${num(x)} ${num(this.Y(y + h))} ${num(w)} ${num(h)} re ${this.paint(s)}`);
    else this.ops.push(...this.roundedPath(x, y, w, h, r), this.paint(s));
    this.ops.push('Q');
    return this;
  }

  private shading(dict: string): string {
    this.shadings.push(dict);
    return `Sh${this.shadings.length}`;
  }
  private fn(a: PdfColor, b: PdfColor, via?: PdfColor, ease = 1): string {
    const f2 = (c0: PdfColor, c1: PdfColor) => `<< /FunctionType 2 /Domain [0 1] /C0 [${col(c0)}] /C1 [${col(c1)}] /N ${num(ease)} >>`;
    if (!via) return f2(a, b);
    return `<< /FunctionType 3 /Domain [0 1] /Functions [${f2(a, via)} ${f2(via, b)}] /Bounds [0.5] /Encode [0 1 0 1] >>`;
  }

  /** A rectangle filled with a smooth linear gradient. */
  gradient(x: number, y: number, w: number, h: number, g: GradientStyle & { stroke?: PdfColor; lineWidth?: number }): this {
    if (w <= 0 || h <= 0) return this;
    const dir = g.dir ?? 'h';
    const x0 = dir === 'h' || dir === 'd' ? x : x + w / 2, x1 = dir === 'h' ? x + w : dir === 'd' ? x + w : x + w / 2;
    const y0 = dir === 'v' || dir === 'd' ? y : dir === 'u' ? y + h : y + h / 2, y1 = dir === 'v' ? y + h : dir === 'd' ? y + h : dir === 'u' ? y : y + h / 2;
    const name = this.shading(`<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [${num(x0)} ${num(this.Y(y0))} ${num(x1)} ${num(this.Y(y1))}] /Function ${this.fn(g.from, g.to, g.via)} /Extend [true true] >>`);
    this.ops.push('q');
    const r = g.radius ?? 0;
    if (!r || (Array.isArray(r) && r.every((v) => !v))) this.ops.push(`${num(x)} ${num(this.Y(y + h))} ${num(w)} ${num(h)} re W n`);
    else this.ops.push(...this.roundedPath(x, y, w, h, r), 'W n');
    this.ops.push(`/${name} sh`, 'Q');
    if (g.stroke != null) this.rect(x, y, w, h, { stroke: g.stroke, lineWidth: g.lineWidth ?? 0.8, radius: g.radius });
    return this;
  }

  /** A soft round glow: `center` colour fading to `edge` (use the page colour) over `r` points. */
  glow(cx: number, cy: number, r: number, center: PdfColor, edge: PdfColor, ease = 1.6): this {
    if (r <= 0) return this;
    const name = this.shading(`<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [${num(cx)} ${num(this.Y(cy))} 0 ${num(cx)} ${num(this.Y(cy))} ${num(r)}] /Function ${this.fn(center, edge, undefined, ease)} /Extend [false false] >>`);
    this.ops.push('q', `${num(cx - r)} ${num(this.Y(cy + r))} ${num(r * 2)} ${num(r * 2)} re W n`, `/${name} sh`, 'Q');
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, s: { color?: PdfColor; width?: number; dash?: [number, number]; cap?: 'butt' | 'round' } = {}): this {
    this.ops.push('q', `${col(s.color ?? '#000000')} RG`, `${num(s.width ?? 1)} w`, s.dash ? `[${num(s.dash[0])} ${num(s.dash[1])}] 0 d` : '[] 0 d', `${s.cap === 'round' ? 1 : 0} J`);
    this.ops.push(`${num(x1)} ${num(this.Y(y1))} m ${num(x2)} ${num(this.Y(y2))} l S`, 'Q');
    return this;
  }

  circle(cx: number, cy: number, r: number, s: ShapeStyle = {}): this {
    if (r <= 0) return this;
    const k = K * r, Y = this.Y(cy);
    this.ops.push('q');
    this.style(s);
    this.ops.push(
      `${num(cx + r)} ${num(Y)} m`,
      `${num(cx + r)} ${num(Y + k)} ${num(cx + k)} ${num(Y + r)} ${num(cx)} ${num(Y + r)} c`,
      `${num(cx - k)} ${num(Y + r)} ${num(cx - r)} ${num(Y + k)} ${num(cx - r)} ${num(Y)} c`,
      `${num(cx - r)} ${num(Y - k)} ${num(cx - k)} ${num(Y - r)} ${num(cx)} ${num(Y - r)} c`,
      `${num(cx + k)} ${num(Y - r)} ${num(cx + r)} ${num(Y - k)} ${num(cx + r)} ${num(Y)} c`,
      `h ${this.paint(s)}`, 'Q',
    );
    return this;
  }

  /** An arc of a circle. Angles are in degrees, clockwise from 12 o'clock. */
  arc(cx: number, cy: number, r: number, from: number, to: number, s: { color: PdfColor; width?: number; cap?: 'butt' | 'round' }): this {
    if (r <= 0 || Math.abs(to - from) < 0.01) return this;
    const P = (deg: number): [number, number] => { const a = (deg * Math.PI) / 180; return [cx + Math.sin(a) * r, cy - Math.cos(a) * r]; };
    const total = to - from, n = Math.max(1, Math.ceil(Math.abs(total) / 90)), step = total / n;
    this.ops.push('q', `${col(s.color)} RG`, `${num(s.width ?? 2)} w`, `${s.cap === 'round' ? 1 : 0} J`, '[] 0 d');
    const p0 = P(from);
    this.ops.push(`${num(p0[0])} ${num(this.Y(p0[1]))} m`);
    for (let i = 0; i < n; i++) {
      const a0 = from + i * step, a1 = a0 + step, t = (4 / 3) * Math.tan(((a1 - a0) * Math.PI) / 720) * r;
      const A = P(a0), B = P(a1);
      const ra0 = (a0 * Math.PI) / 180, ra1 = (a1 * Math.PI) / 180;
      const c1: [number, number] = [A[0] + Math.cos(ra0) * t, A[1] + Math.sin(ra0) * t], c2: [number, number] = [B[0] - Math.cos(ra1) * t, B[1] - Math.sin(ra1) * t];
      this.ops.push(`${num(c1[0])} ${num(this.Y(c1[1]))} ${num(c2[0])} ${num(this.Y(c2[1]))} ${num(B[0])} ${num(this.Y(B[1]))} c`);
    }
    this.ops.push('S', 'Q');
    return this;
  }

  /** A connected line through points (for sparklines). */
  polyline(pts: [number, number][], s: { color: PdfColor; width?: number }): this {
    if (pts.length < 2) return this;
    this.ops.push('q', `${col(s.color)} RG`, `${num(s.width ?? 1.5)} w`, '1 J', '1 j', '[] 0 d');
    pts.forEach(([x, y], i) => this.ops.push(`${num(x)} ${num(this.Y(y))} ${i ? 'l' : 'm'}`));
    this.ops.push('S', 'Q');
    return this;
  }

  /** A closed shape through points, filled and/or outlined. */
  polygon(pts: [number, number][], s: ShapeStyle = {}): this {
    if (pts.length < 3) return this;
    this.ops.push('q');
    this.style(s);
    this.ops.push('1 j');
    pts.forEach(([x, y], i) => this.ops.push(`${num(x)} ${num(this.Y(y))} ${i ? 'l' : 'm'}`));
    this.ops.push(`h ${this.paint(s)}`, 'Q');
    return this;
  }

  private shapeOps(shapes: Shape[], ox: number, oy: number, size: number, color: PdfColor, soft: PdfColor | undefined): void {
    for (const sh of shapes) {
      const c = sh.faint && soft ? soft : color;
      this.ops.push('q');
      if (sh.fill) this.ops.push(`${col(c)} rg`);
      if (sh.stroke != null) this.ops.push(`${col(c)} RG`, `${num(sh.stroke * size)} w`, '1 J', '1 j');
      for (const g of sh.d) {
        if (g[0] === 'M') this.ops.push(`${num(ox + g[1] * size)} ${num(this.Y(oy - g[2] * size))} m`);
        else if (g[0] === 'L') this.ops.push(`${num(ox + g[1] * size)} ${num(this.Y(oy - g[2] * size))} l`);
        else if (g[0] === 'C') this.ops.push(`${num(ox + g[1] * size)} ${num(this.Y(oy - g[2] * size))} ${num(ox + g[3] * size)} ${num(this.Y(oy - g[4] * size))} ${num(ox + g[5] * size)} ${num(this.Y(oy - g[6] * size))} c`);
        else this.ops.push('h');
      }
      this.ops.push(sh.fill && sh.stroke != null ? 'B' : sh.fill ? 'f' : 'S', 'Q');
    }
  }

  /** A vector icon centred on (cx, cy), `size` points across. `soft` is the colour for its fainter parts. */
  icon(name: string, cx: number, cy: number, size: number, color: PdfColor, soft?: PdfColor): this {
    const sh = ICONS[name];
    if (sh) this.shapeOps(sh, cx, cy, size, color, soft);
    return this;
  }

  /** Draws one line of text; `y` is the baseline. Returns the drawn width. */
  text(str: string, x: number, y: number, s: TextStyle = {}): number {
    const size = s.size ?? 10, fontKey = s.font ?? 'regular';
    const norm = s.maxWidth ? fit(str, s.maxWidth, size, fontKey) : normalize(str);
    if (!norm) return 0;
    const cs = s.charSpace ?? 0, count = [...norm].length;
    const w = (widthOf(norm, fontKey) * size) / 1000 + cs * Math.max(0, count - 1);
    let px = s.align === 'right' ? x - w : s.align === 'center' ? x - w / 2 : x;
    const f = face(fontKey === 'italic' ? 'regular' : fontKey), res = FONT_RES[fontKey === 'bold' ? 'bold' : 'regular'];
    const used = this.doc.used[fontKey === 'bold' ? 'bold' : 'regular'];
    const colour = s.color ?? '#000000';
    const skew = fontKey === 'italic' ? 0.2 : 0;
    let run: number[] = [];
    let runX = px;
    const flush = () => {
      if (!run.length) return;
      // Character spacing stays in the graphics state after the text object ends, so spaced text is saved and restored around itself.
      if (cs) this.ops.push('q');
      this.ops.push('BT', `/${res} ${num(size)} Tf`, `${col(colour)} rg`);
      if (cs) this.ops.push(`${num(cs)} Tc`);
      this.ops.push(skew ? `1 0 ${num(skew)} 1 ${num(runX)} ${num(this.Y(y))} Tm` : `1 0 0 1 ${num(runX)} ${num(this.Y(y))} Tm`, `<${run.map(hex4).join('')}> Tj`, 'ET');
      if (cs) this.ops.push('Q');
      run = [];
    };
    for (const ch of norm) {
      const cp = ch.codePointAt(0) as number, gid = f.cmap.get(cp);
      if (gid !== undefined) {
        if (!run.length) runX = px;
        run.push(gid); used.add(gid);
        px += (f.adv[gid] * size) / f.upem + cs;
      } else {
        const ic = INLINE_ICON[cp];
        flush();
        if (ic) { this.icon(ic.name, px + (ic.adv * size) / 2, y - capMid(size), size * 0.92, colour); px += ic.adv * size + cs; }
      }
    }
    flush();
    return w;
  }

  /** Wrapped paragraph. `y` is the first baseline. Returns the y of the next free baseline. */
  paragraph(str: string, x: number, y: number, maxWidth: number, s: Omit<TextStyle, 'maxWidth' | 'align'> & { leading?: number; maxLines?: number } = {}): number {
    const size = s.size ?? 10, lead = s.leading ?? size * 1.4;
    const lines = wrap(str, maxWidth, size, s.font ?? 'regular', s.maxLines);
    lines.forEach((ln, i) => this.text(ln, x, y + i * lead, s));
    return y + lines.length * lead;
  }

  /** Save/restore a rectangular clip region around `draw`. */
  clip(x: number, y: number, w: number, h: number, draw: () => void, radius: Radius = 0): this {
    this.ops.push('q');
    if (radius) this.ops.push(...this.roundedPath(x, y, w, h, radius), 'W n'); else this.ops.push(`${num(x)} ${num(this.Y(y + h))} ${num(w)} ${num(h)} re W n`);
    draw();
    this.ops.push('Q');
    return this;
  }

  /** @internal */
  content(): string { return this.ops.join('\n'); }
  /** @internal */
  shadingDict(): string { return this.shadings.map((d, i) => `/Sh${i + 1} ${d}`).join(' '); }
}

/* ═════════════════════════ document ═════════════════════════ */

export interface PdfInfo { title?: string; author?: string; subject?: string; creator?: string }

const latin1 = (s: string) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
function pdfString(s: string): string {
  const clean = String(s ?? '').replace(/[\r\n\t]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(clean)) return `(${clean.replace(/[\\()]/g, (m) => '\\' + m)})`;
  let h = 'FEFF';
  for (let i = 0; i < clean.length; i++) h += hex4(clean.charCodeAt(i));
  return `<${h}>`;
}

async function deflate(data: Uint8Array): Promise<Uint8Array | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const body = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(body).arrayBuffer());
  } catch { return null; }
}

interface Obj { dict: string; stream?: Uint8Array; compress?: boolean }

export class PdfDoc {
  readonly pages: PdfPage[] = [];
  info: PdfInfo;
  /** @internal glyphs used per font, for widths and the ToUnicode map */
  readonly used = { regular: new Set<number>(), bold: new Set<number>() };
  constructor(info: PdfInfo = {}) { this.info = info; fonts(); }

  addPage(w: number = A4.w, h: number = A4.h): PdfPage {
    const p = new PdfPage(w, h, this);
    this.pages.push(p);
    return p;
  }

  private toUnicode(f: TtFont, used: Set<number>): string {
    const gids = [...used].sort((a, b) => a - b);
    const parts: string[] = [];
    for (let i = 0; i < gids.length; i += 100) {
      const chunk = gids.slice(i, i + 100);
      parts.push(`${chunk.length} beginbfchar\n${chunk.map((g) => `<${hex4(g)}> <${hex4(f.rev.get(g) ?? 0x20)}>`).join('\n')}\nendbfchar`);
    }
    return `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${parts.join('\n')}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
  }

  /** The complete file. */
  async bytes(): Promise<Uint8Array> {
    if (!this.pages.length) this.addPage();
    const objs: Obj[] = [];
    const add = (o: Obj) => { objs.push(o); return objs.length; };
    // 1 catalog and 2 page tree are filled in at the end; 3 is the document info
    add({ dict: '' });
    add({ dict: '' });
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const stamp = `D:${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
    const inf = this.info;
    add({ dict: `<< ${[
      inf.title ? `/Title ${pdfString(inf.title)}` : '', inf.author ? `/Author ${pdfString(inf.author)}` : '', inf.subject ? `/Subject ${pdfString(inf.subject)}` : '',
      `/Creator ${pdfString(inf.creator || 'CA Study Tracker')}`, '/Producer (CA Study Tracker)', `/CreationDate (${stamp})`,
    ].filter(Boolean).join(' ')} >>` });

    const fontIds: Record<'regular' | 'bold', number> = { regular: 0, bold: 0 };
    for (const key of ['regular', 'bold'] as const) {
      const f = fonts()[key], used = [...this.used[key]].sort((a, b) => a - b);
      const k = 1000 / f.upem;
      const file = add({ dict: `<< /Length1 ${f.bytes.length}`, stream: f.bytes, compress: true });
      const desc = add({ dict: `<< /Type /FontDescriptor /FontName /${f.name} /Flags 4 /FontBBox [${f.bbox.map((v) => Math.round(v * k)).join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(f.ascent * k)} /Descent ${Math.round(f.descent * k)} /CapHeight ${Math.round(f.capHeight * k)} /StemV ${f.stemV} /FontFile2 ${file} 0 R >>` });
      const w: string[] = [];
      for (let i = 0; i < used.length;) {
        let j = i; while (j + 1 < used.length && used[j + 1] === used[j] + 1) j++;
        w.push(`${used[i]} [${used.slice(i, j + 1).map((g) => Math.round(f.adv[g] * k)).join(' ')}]`);
        i = j + 1;
      }
      const cid = add({ dict: `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${f.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${desc} 0 R /DW 600 /W [${w.join(' ')}] /CIDToGIDMap /Identity >>` });
      const tu = add({ dict: '<<', stream: latin1(this.toUnicode(f, this.used[key])), compress: true });
      fontIds[key] = add({ dict: `<< /Type /Font /Subtype /Type0 /BaseFont /${f.name} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${tu} 0 R >>` });
    }
    const kids: number[] = [];
    for (const page of this.pages) {
      const cid = add({ dict: '<<', stream: latin1(page.content().replace(/[^\x00-\xff]/g, '?')), compress: true });
      const sh = page.shadingDict();
      kids.push(add({ dict: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.w)} ${num(page.h)}] /Resources << /Font << /F1 ${fontIds.regular} 0 R /F2 ${fontIds.bold} 0 R >>${sh ? ` /Shading << ${sh} >>` : ''} >> /Contents ${cid} 0 R >>` }));
    }
    objs[0] = { dict: '<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /DisplayDocTitle true >> /Lang (en) >>' };
    objs[1] = { dict: `<< /Type /Pages /Count ${kids.length} /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] >>` };

    const parts: Uint8Array[] = [];
    let pos = 0;
    const push = (u: Uint8Array) => { parts.push(u); pos += u.length; };
    push(latin1('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const offsets: number[] = [];
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      offsets.push(pos);
      push(latin1(`${i + 1} 0 obj\n`));
      if (o.stream) {
        const z = o.compress ? await deflate(o.stream) : null;
        const data = z && z.length < o.stream.length ? z : o.stream;
        const extra = o.dict === '<<' ? '<<' : o.dict;
        push(latin1(`${extra} /Length ${data.length}${data === o.stream ? '' : ' /Filter /FlateDecode'} >>\nstream\n`));
        push(data);
        push(latin1('\nendstream\nendobj\n'));
      } else push(latin1(`${o.dict}\nendobj\n`));
    }
    const xref = pos;
    let tail = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) tail += `${String(o).padStart(10, '0')} 00000 n \n`;
    tail += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(latin1(tail));
    const out = new Uint8Array(pos);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }

  async blob(): Promise<Blob> {
    return new Blob([(await this.bytes()) as BlobPart], { type: 'application/pdf' });
  }
}
