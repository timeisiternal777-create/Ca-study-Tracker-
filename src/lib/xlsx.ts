// Minimal, dependency-free .xlsx reader/writer.
//
// Reader: parses the ZIP central directory (stored + deflate via DecompressionStream), the workbook
// relationships, shared strings and sheet XML with a small regex tokenizer (no DOMParser, so it also runs in
// workers / Node and is fast for 50k+ cells).
// Writer: store-only ZIP with CRC-32, shared strings, a bold/frozen header row and auto column widths.

export type Cell = string | number | boolean | null;
export interface Sheet {
  name: string;
  rows: Cell[][];
  /** Writer only: treat the first row as a header (bold + frozen). Default true. */
  header?: boolean;
  /** Writer only: 0-based columns whose numeric values are Excel date serials (rendered yyyy-mm-dd). */
  dateColumns?: number[];
}

export interface ReadOptions {
  /** Copy the top-left value of each merged range into every cell of that range. Default false. */
  fillMerged?: boolean;
}

/* ───────────────────────────── helpers ───────────────────────────── */

const MAX_ROWS = 200_000;
const MAX_COLS = 2_000;
const MAX_ENTRY_BYTES = 256 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');

function unescapeXml(s: string): string {
  if (s.indexOf('&') < 0 && s.indexOf('_x') < 0) return s;
  let out = s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_m, g: string) => {
    switch (g) {
      case 'amp': return '&';
      case 'lt': return '<';
      case 'gt': return '>';
      case 'quot': return '"';
      case 'apos': return "'";
      default: {
        const code = g[1] === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        try { return String.fromCodePoint(code); } catch { return ''; }
      }
    }
  });
  // OOXML escapes control characters as _xHHHH_ (e.g. _x000D_ for CR).
  if (out.indexOf('_x') >= 0) out = out.replace(/_x([0-9A-Fa-f]{4})_/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
  return out;
}

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1]] = unescapeXml(m[2] ?? m[3] ?? '');
  return out;
}

/** Concatenate the visible text of an <si> / <is> body (rich-text runs joined, phonetic hints ignored). */
function textOf(xml: string): string {
  if (xml.indexOf('<rPh') >= 0) xml = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) if (m[1]) out += unescapeXml(m[1]);
  return out;
}

/** 'AB12' → { col: 27, row: 11 } (0-based). */
function parseRef(ref: string): { col: number; row: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(ref);
  if (!m) return null;
  let col = 0;
  const letters = m[1].toUpperCase();
  for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64);
  return { col: col - 1, row: parseInt(m[2], 10) - 1 };
}

function colName(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/* ───────────────────────────── ZIP reading ───────────────────────────── */

interface ZipEntry { name: string; method: number; csize: number; usize: number; offset: number }

function readZipDirectory(buf: Uint8Array): Map<string, ZipEntry> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('This file is not a valid .xlsx (zip directory not found).');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  if (count === 0xffff || p === 0xffffffff) throw new Error('Zip64 workbooks are not supported.');
  const out = new Map<string, ZipEntry>();
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || dv.getUint32(p, true) !== 0x02014b50) throw new Error('The .xlsx file is corrupted (bad zip directory).');
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true);
    const elen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen)).replace(/\\/g, '/');
    out.set(name.toLowerCase(), { name, method, csize, usize, offset });
    p += 46 + nlen + elen + clen;
  }
  return out;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open compressed .xlsx files (DecompressionStream missing).');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function zipText(buf: Uint8Array, dir: Map<string, ZipEntry>, name: string): Promise<string | null> {
  const e = dir.get(name.toLowerCase());
  if (!e) return null;
  if (e.usize > MAX_ENTRY_BYTES) throw new Error('A part of this workbook is too large to open.');
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (e.offset + 30 > buf.length || dv.getUint32(e.offset, true) !== 0x04034b50) throw new Error('The .xlsx file is corrupted (bad entry header).');
  const nlen = dv.getUint16(e.offset + 26, true);
  const elen = dv.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nlen + elen;
  const raw = buf.subarray(start, start + e.csize);
  let bytes: Uint8Array;
  if (e.method === 0) bytes = raw;
  else if (e.method === 8) bytes = await inflateRaw(raw);
  else throw new Error(`Unsupported compression method ${e.method} in .xlsx.`);
  return dec.decode(bytes);
}

/* ───────────────────────────── XLSX reading ───────────────────────────── */

function resolvePart(target: string, baseDir = 'xl/'): string {
  let t = target.replace(/\\/g, '/');
  if (t.startsWith('/')) return t.slice(1);
  t = baseDir + t;
  const parts: string[] = [];
  for (const seg of t.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const re = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1] ? textOf(m[1]) : '');
  return out;
}

function parseSheet(xml: string, shared: string[], opts: ReadOptions): Cell[][] {
  const start = xml.indexOf('<sheetData');
  const end = xml.indexOf('</sheetData>');
  const body = start >= 0 ? xml.slice(start, end > start ? end : undefined) : '';
  const cells = new Map<number, Map<number, Cell>>();
  let maxRow = -1;
  let maxCol = -1;

  const rowRe = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  let rm: RegExpExecArray | null;
  let rowCursor = -1;
  while ((rm = rowRe.exec(body))) {
    const rAttr = /(?:^|\s)r=["'](\d+)["']/.exec(rm[1]);
    const rowIdx = rAttr ? parseInt(rAttr[1], 10) - 1 : rowCursor + 1;
    rowCursor = rowIdx;
    const inner = rm[2];
    if (!inner || rowIdx < 0 || rowIdx >= MAX_ROWS) continue;
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    let colCursor = -1;
    while ((cm = cellRe.exec(inner))) {
      const attrs = cm[1];
      const refM = /(?:^|\s)r=["']([^"']+)["']/.exec(attrs);
      let colIdx = colCursor + 1;
      if (refM) { const pr = parseRef(refM[1]); if (pr) colIdx = pr.col; }
      colCursor = colIdx;
      const body2 = cm[2];
      if (!body2 || colIdx < 0 || colIdx >= MAX_COLS) continue;
      const tM = /(?:^|\s)t=["']([^"']+)["']/.exec(attrs);
      const type = tM ? tM[1] : 'n';
      let value: Cell = null;
      if (type === 'inlineStr') {
        const is = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(body2);
        value = is ? textOf(is[1]) : null;
      } else {
        const vM = /<v\b[^>]*?(?:\/>|>([\s\S]*?)<\/v>)/.exec(body2);
        const raw = vM && vM[1] != null ? vM[1] : '';
        if (raw === '') value = null;
        else if (type === 's') { const idx = parseInt(raw, 10); value = idx >= 0 && idx < shared.length ? shared[idx] : null; }
        else if (type === 'str' || type === 'e' || type === 'd') value = unescapeXml(raw);
        else if (type === 'b') value = raw.trim() === '1' || raw.trim().toLowerCase() === 'true';
        else { const n = Number(raw); value = Number.isFinite(n) ? n : unescapeXml(raw); }
      }
      if (value === null || value === '') continue;
      let row = cells.get(rowIdx);
      if (!row) { row = new Map(); cells.set(rowIdx, row); }
      row.set(colIdx, value);
      if (rowIdx > maxRow) maxRow = rowIdx;
      if (colIdx > maxCol) maxCol = colIdx;
    }
  }

  if (opts.fillMerged) {
    const mergeRe = /<mergeCell\b[^>]*?ref=["']([^"']+)["']/g;
    let mm: RegExpExecArray | null;
    while ((mm = mergeRe.exec(xml))) {
      const [a, b] = mm[1].split(':');
      const p1 = parseRef(a);
      const p2 = parseRef(b || a);
      if (!p1 || !p2) continue;
      const v = cells.get(p1.row)?.get(p1.col);
      if (v === undefined) continue;
      for (let r = p1.row; r <= Math.min(p2.row, MAX_ROWS - 1); r++) {
        for (let c = p1.col; c <= Math.min(p2.col, MAX_COLS - 1); c++) {
          if (r === p1.row && c === p1.col) continue;
          let row = cells.get(r);
          if (!row) { row = new Map(); cells.set(r, row); }
          if (!row.has(c)) row.set(c, v);
          if (r > maxRow) maxRow = r;
          if (c > maxCol) maxCol = c;
        }
      }
    }
  }

  const rows: Cell[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    const src = cells.get(r);
    const row: Cell[] = new Array(maxCol + 1).fill(null);
    if (src) src.forEach((v, c) => { row[c] = v; });
    rows.push(row);
  }
  return rows;
}

/** Parse an .xlsx file. Numbers stay numbers (dates are Excel serials → use `excelSerialToYmd`). Empty cells are null. */
export async function readXlsx(input: File | Blob | ArrayBuffer, opts: ReadOptions = {}): Promise<Sheet[]> {
  let buf: Uint8Array;
  if (input instanceof ArrayBuffer) buf = new Uint8Array(input);
  else if (ArrayBuffer.isView(input)) { const v = input as ArrayBufferView; buf = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); }
  else buf = new Uint8Array(await (input as Blob).arrayBuffer());
  if (buf.length < 22 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error('This does not look like an .xlsx file. Save your sheet as "Excel Workbook (.xlsx)" and try again.');
  }
  const dir = readZipDirectory(buf);

  const sharedXml = await zipText(buf, dir, 'xl/sharedStrings.xml');
  const shared = parseSharedStrings(sharedXml);
  const wbXml = await zipText(buf, dir, 'xl/workbook.xml');
  const relsXml = await zipText(buf, dir, 'xl/_rels/workbook.xml.rels');

  const rels = new Map<string, { target: string; type: string }>();
  if (relsXml) {
    const re = /<Relationship\b([^>]*?)\/?>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(relsXml))) {
      const a = parseAttrs(m[1]);
      if (a.Id && a.Target) rels.set(a.Id, { target: a.Target, type: a.Type || '' });
    }
  }

  const sheets: { name: string; path: string }[] = [];
  if (wbXml) {
    const re = /<sheet\b([^>]*?)\/?>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(wbXml))) {
      const a = parseAttrs(m[1]);
      const rid = a['r:id'] ?? Object.entries(a).find(([k]) => k.endsWith(':id'))?.[1];
      const rel = rid ? rels.get(rid) : undefined;
      if (!rel) continue;
      if (rel.type && !/\/worksheet$/.test(rel.type)) continue; // chart sheets, macro sheets, dialogs
      sheets.push({ name: a.name || `Sheet${sheets.length + 1}`, path: resolvePart(rel.target) });
    }
  }
  if (!sheets.length) {
    // Damaged/unusual package: fall back to any worksheet parts, in numeric order.
    const found = [...dir.values()].map((e) => e.name).filter((n) => /^xl\/worksheets\/[^/]+\.xml$/i.test(n))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    found.forEach((p, i) => sheets.push({ name: `Sheet${i + 1}`, path: p }));
  }
  if (!sheets.length) throw new Error('No worksheets were found in this file.');

  const out: Sheet[] = [];
  for (const s of sheets) {
    const xml = await zipText(buf, dir, s.path);
    out.push({ name: s.name, rows: xml ? parseSheet(xml, shared, opts) : [] });
  }
  return out;
}

/* ───────────────────────────── dates ───────────────────────────── */

/**
 * Excel serial day number (1900 date system, with Excel's phantom 29 Feb 1900) → 'YYYY-MM-DD' (calendar date, no
 * timezone involved), or null when not a plausible date (serial < 1, serial 60 which does not exist, year > 2200).
 */
export function excelSerialToYmd(serial: number): string | null {
  if (typeof serial !== 'number' || !Number.isFinite(serial)) return null;
  const s = Math.floor(serial);
  if (s < 1 || s === 60) return null;
  // Serial 1 = 1900-01-01. After the phantom leap day, serial 61 = 1900-03-01 = 1899-12-30 + 61 days.
  const days = s < 60 ? s + 1 : s; // days since 1899-12-30
  const ms = Date.UTC(1899, 11, 30) + days * 86_400_000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  if (y > 2200) return null;
  return `${String(y).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → Excel serial (1900 system), or null when invalid. */
export function ymdToExcelSerial(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  const days = Math.round((ms - Date.UTC(1899, 11, 30)) / 86_400_000);
  if (days < 1) return null;
  return days < 61 ? days - 1 : days;
}

/* ───────────────────────────── XLSX writing ───────────────────────────── */

let CRC_TABLE: Uint32Array | null = null;
function crc32(data: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = (Math.max(0, now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const names = files.map((f) => enc.encode(f.name));
  let size = 22;
  files.forEach((f, i) => { size += 30 + names[i].length + f.data.length + 46 + names[i].length; });
  const out = new Uint8Array(new ArrayBuffer(size));
  const dv = new DataView(out.buffer);
  let p = 0;
  const offsets: number[] = [];
  const crcs: number[] = [];
  files.forEach((f, i) => {
    offsets.push(p);
    const crc = crc32(f.data);
    crcs.push(crc);
    dv.setUint32(p, 0x04034b50, true);
    dv.setUint16(p + 4, 20, true);
    dv.setUint16(p + 6, 0x0800, true); // UTF-8 names
    dv.setUint16(p + 8, 0, true); // stored
    dv.setUint16(p + 10, dosTime, true);
    dv.setUint16(p + 12, dosDate, true);
    dv.setUint32(p + 14, crc, true);
    dv.setUint32(p + 18, f.data.length, true);
    dv.setUint32(p + 22, f.data.length, true);
    dv.setUint16(p + 26, names[i].length, true);
    dv.setUint16(p + 28, 0, true);
    out.set(names[i], p + 30);
    out.set(f.data, p + 30 + names[i].length);
    p += 30 + names[i].length + f.data.length;
  });
  const cdStart = p;
  files.forEach((f, i) => {
    dv.setUint32(p, 0x02014b50, true);
    dv.setUint16(p + 4, 20, true);
    dv.setUint16(p + 6, 20, true);
    dv.setUint16(p + 8, 0x0800, true);
    dv.setUint16(p + 10, 0, true);
    dv.setUint16(p + 12, dosTime, true);
    dv.setUint16(p + 14, dosDate, true);
    dv.setUint32(p + 16, crcs[i], true);
    dv.setUint32(p + 20, f.data.length, true);
    dv.setUint32(p + 24, f.data.length, true);
    dv.setUint16(p + 28, names[i].length, true);
    dv.setUint32(p + 42, offsets[i], true);
    out.set(names[i], p + 46);
    p += 46 + names[i].length;
  });
  dv.setUint32(p, 0x06054b50, true);
  dv.setUint16(p + 8, files.length, true);
  dv.setUint16(p + 10, files.length, true);
  dv.setUint32(p + 12, p - cdStart, true);
  dv.setUint32(p + 16, cdStart, true);
  return out;
}

/** XML-escape text and drop characters XML 1.0 cannot carry. */
function esc(s: string): string {
  return s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeSheetNames(sheets: Sheet[]): string[] {
  const used = new Set<string>();
  return sheets.map((s, i) => {
    let name = String(s.name ?? '').replace(/[[\]:*?/\\]/g, '-').replace(/^'+|'+$/g, '').trim().slice(0, 31).trim();
    if (!name) name = `Sheet${i + 1}`;
    let candidate = name;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
      const suffix = ` (${n++})`;
      candidate = name.slice(0, 31 - suffix.length).trimEnd() + suffix;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const STYLES_XML = `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">`
  + '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>'
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="11"/><color rgb="FF0B1022"/><name val="Calibri"/><family val="2"/></font></fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFDCE5FA"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
  + '<border><left/><right/><top/><bottom style="thin"><color rgb="FF8791B3"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

/** Build a valid .xlsx (store-only zip) from sheets. */
export function writeXlsx(sheets: Sheet[]): Blob {
  const list: Sheet[] = sheets.length ? sheets : [{ name: 'Sheet1', rows: [] }];
  const names = safeSheetNames(list);
  const sst = new Map<string, number>();
  let sstTotal = 0;
  const sstIndex = (s: string) => {
    sstTotal++;
    let i = sst.get(s);
    if (i === undefined) { i = sst.size; sst.set(s, i); }
    return i;
  };

  const sheetXml = list.map((sheet) => {
    const rows = sheet.rows.slice(0, 1_048_576);
    const hasHeader = sheet.header !== false && rows.length > 0;
    const dateCols = new Set(sheet.dateColumns ?? []);
    let cols = 0;
    for (const r of rows) if (r.length > cols) cols = r.length;
    cols = Math.min(cols, 16_384);
    const widths = new Array<number>(cols).fill(0);
    const body: string[] = [];
    rows.forEach((row, ri) => {
      const cells: string[] = [];
      for (let ci = 0; ci < Math.min(row.length, cols); ci++) {
        const v = row[ci];
        if (v === null || v === undefined || v === '') continue;
        const ref = colName(ci) + (ri + 1);
        const isHeader = hasHeader && ri === 0;
        let len = 0;
        if (typeof v === 'number') {
          if (!Number.isFinite(v)) continue;
          const style = isHeader ? ' s="1"' : dateCols.has(ci) ? ' s="2"' : '';
          cells.push(`<c r="${ref}"${style}><v>${v}</v></c>`);
          len = dateCols.has(ci) ? 10 : String(v).length;
        } else if (typeof v === 'boolean') {
          cells.push(`<c r="${ref}" t="b"${isHeader ? ' s="1"' : ''}><v>${v ? 1 : 0}</v></c>`);
          len = 5;
        } else {
          const str = String(v).slice(0, 32_767);
          cells.push(`<c r="${ref}" t="s"${isHeader ? ' s="1"' : ''}><v>${sstIndex(str)}</v></c>`);
          // widest line of the cell drives the column width
          for (const line of str.split('\n')) if (line.length > len) len = line.length;
        }
        if (len > widths[ci]) widths[ci] = len;
      }
      if (cells.length) body.push(`<row r="${ri + 1}">${cells.join('')}</row>`);
    });
    const dim = rows.length && cols ? `A1:${colName(cols - 1)}${rows.length}` : 'A1';
    const colsXml = cols
      ? '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(8, w * 1.12 + 2)).toFixed(2)}" customWidth="1"/>`).join('') + '</cols>'
      : '';
    const pane = hasHeader && rows.length > 1
      ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
      : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    return `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><dimension ref="${dim}"/>${pane}<sheetFormatPr defaultRowHeight="15"/>${colsXml}<sheetData>${body.join('')}</sheetData></worksheet>`;
  });

  const sstXml = `${XML_HEAD}<sst xmlns="${NS_MAIN}" count="${sstTotal}" uniqueCount="${sst.size}">`
    + [...sst.keys()].map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('') + '</sst>';

  const n = list.length;
  const workbook = `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets>`
    + names.map((nm, i) => `<sheet name="${esc(nm)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';
  const wbRels = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + list.map((_s, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    + `<Relationship Id="rId${n + 1}" Type="${NS_REL}/styles" Target="styles.xml"/>`
    + `<Relationship Id="rId${n + 2}" Type="${NS_REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
  const contentTypes = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + list.map((_s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>';
  const rootRels = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const files: { name: string; data: Uint8Array }[] = [
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/styles.xml', data: enc.encode(STYLES_XML) },
    { name: 'xl/sharedStrings.xml', data: enc.encode(sstXml) },
    ...sheetXml.map((x, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(x) })),
  ];
  return new Blob([zipStore(files)], { type: XLSX_MIME });
}
