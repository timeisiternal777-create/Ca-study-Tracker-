// "Manifestation" marksheet: the marks a student is aiming for, per paper, and what the ICAI pass rules
// would make of them. Storage layout is unchanged from the original app: `manifestationData_<level>` →
// `{ marks: { [paper name]: number }, name: string }` so existing data and old backups keep working.
//
// ICAI rule (same as the original tab): at least 40% in every paper AND at least 50% in the group
// aggregate. When a student appears for both groups together, the set-off rule applies: 40% per paper
// and 50% of the grand aggregate passes both groups.
import { CURRICULUM } from '../config/curriculum';
import type { Accent, GroupId, Level, SubjectConfig } from '../types';
import { KEYS, readJSON, readRaw, writeJSON } from './storage';

export interface ManifestData { marks: Record<string, number>; name: string }

export interface Paper {
  id: string;
  name: string;
  abbrev: string;
  paperNumber: number;
  group: GroupId;
  /** Maximum marks. */
  marks: number;
  accent: Accent;
  /** Curriculum papers merged into this one (Inter: DT + IDT, FM + SM). */
  parts?: string[];
}

const TAX = ['Direct Tax (DT)', 'Indirect Tax (IDT)'];
const FMSM = ['Financial Management (FM)', 'Strategic Management (SM)'];

/** The marksheet papers for a level. Inter shows DT + IDT and FM + SM as one 100-mark paper each, like the real marksheet. */
export function manifestPapers(level: Level, subjects: SubjectConfig[]): Paper[] {
  if (level !== 'inter') return subjects.map((s) => ({ ...s }));
  const out: Paper[] = [];
  let n = 1;
  let tax = false, fm = false;
  for (const s of subjects) {
    if (TAX.includes(s.name)) {
      if (tax) continue;
      tax = true;
      const parts = subjects.filter((x) => TAX.includes(x.name));
      out.push({ id: 'inter-tax', name: 'DT & IDT', abbrev: 'TAX', paperNumber: n++, group: s.group, marks: parts.reduce((a, p) => a + p.marks, 0) || 100, accent: 'gold', parts: parts.map((p) => p.name) });
    } else if (FMSM.includes(s.name)) {
      if (fm) continue;
      fm = true;
      const parts = subjects.filter((x) => FMSM.includes(x.name));
      out.push({ id: 'inter-fmsm', name: 'FM & SM', abbrev: 'FMSM', paperNumber: n++, group: s.group, marks: parts.reduce((a, p) => a + p.marks, 0) || 100, accent: 'cyan', parts: parts.map((p) => p.name) });
    } else out.push({ ...s, paperNumber: n++ });
  }
  return out;
}

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

/** Read the saved marksheet (migrating older shapes). Never throws. */
export function readManifest(level: Level): ManifestData {
  const saved = readJSON<{ marks?: Record<string, unknown>; name?: unknown } | null>(KEYS.manifest(level), null);
  if (saved && typeof saved === 'object') {
    const marks: Record<string, number> = {};
    for (const [k, v] of Object.entries(saved.marks || {})) marks[k] = num(v);
    if (level === 'inter') {
      // The original once kept DT / IDT and FM / SM scores separately. Fold them into the combined papers.
      if ('Direct Tax (DT)' in marks || 'Indirect Tax (IDT)' in marks) {
        marks['DT & IDT'] = Math.min(100, (marks['Direct Tax (DT)'] || 0) + (marks['Indirect Tax (IDT)'] || 0));
        delete marks['Direct Tax (DT)']; delete marks['Indirect Tax (IDT)'];
      }
      if ('Financial Management (FM)' in marks || 'Strategic Management (SM)' in marks) {
        marks['FM & SM'] = Math.min(100, (marks['Financial Management (FM)'] || 0) + (marks['Strategic Management (SM)'] || 0));
        delete marks['Financial Management (FM)']; delete marks['Strategic Management (SM)'];
      }
    }
    return { marks, name: typeof saved.name === 'string' ? saved.name : '' };
  }
  if (level === 'inter') {
    // Pre-split legacy key from the very first version of the app.
    const legacy = readJSON<{ marks?: Record<string, unknown>; name?: unknown } | null>('manifestationData', null);
    const m = legacy?.marks;
    if (m && typeof m === 'object') {
      const t: Record<string, number> = {};
      const map: Record<string, string> = { p1: 'Advanced Accounting', p2: 'Corporate & Other Laws', p3: 'DT & IDT', p4: 'Cost & Management Accounting', p5: 'Auditing & Ethics', p6: 'FM & SM' };
      for (const [k, name] of Object.entries(map)) if (k in m) t[name] = num(m[k]);
      return { marks: t, name: typeof legacy?.name === 'string' ? legacy.name : '' };
    }
  }
  return { marks: {}, name: '' };
}

export function writeManifest(level: Level, data: ManifestData): void {
  writeJSON(KEYS.manifest(level), data);
}

export interface GroupEval {
  papers: Paper[];
  total: number;
  max: number;
  /** Every paper reaches 40%. */
  min40: boolean;
  /** Group aggregate reaches 50%. */
  aggregate: boolean;
  /** Passes on its own, or through the both-groups set-off. */
  passed: boolean;
  /** Papers under 40%. */
  failing: Paper[];
}

export interface ManifestEval {
  g1: GroupEval;
  g2: GroupEval;
  grandTotal: number;
  grandMax: number;
  /** Both groups are in scope, so the set-off rule is in play. */
  combined: boolean;
  /** The set-off rule is what turned a group into a pass. */
  setOff: boolean;
  /** Everything in scope passes. */
  allPassed: boolean;
  /** At least one mark is filled in. */
  hasData: boolean;
}

export const PAPER_FLOOR = 0.4;
export const AGGREGATE_PASS = 0.5;

export function evaluateManifest(papers: Paper[], marks: Record<string, number>, scope: GroupId): ManifestEval {
  const of = (list: Paper[]): GroupEval => {
    const total = list.reduce((a, p) => a + Math.min(p.marks, marks[p.name] || 0), 0);
    const max = list.reduce((a, p) => a + p.marks, 0);
    const failing = list.filter((p) => (marks[p.name] || 0) < p.marks * PAPER_FLOOR - 1e-9);
    const min40 = list.length > 0 && failing.length === 0;
    const aggregate = max > 0 && total >= max * AGGREGATE_PASS - 1e-9;
    return { papers: list, total, max, min40, aggregate, passed: min40 && aggregate, failing };
  };
  const g1 = of(papers.filter((p) => p.group === 'group1' || p.group === 'both'));
  const g2 = of(papers.filter((p) => p.group === 'group2'));
  const grandTotal = g1.total + g2.total;
  const grandMax = g1.max + g2.max;
  const combined = scope === 'both' && g1.papers.length > 0 && g2.papers.length > 0;
  let setOff = false;
  if (combined && !(g1.passed && g2.passed) && g1.min40 && g2.min40 && grandMax > 0 && grandTotal >= grandMax * AGGREGATE_PASS - 1e-9) {
    setOff = true;
    g1.passed = true; g2.passed = true;
  }
  const inScope = [g1, g2].filter((g) => g.papers.length > 0);
  return {
    g1, g2, grandTotal, grandMax, combined, setOff,
    allPassed: inScope.length > 0 && inScope.every((g) => g.passed),
    hasData: papers.some((p) => (marks[p.name] || 0) > 0),
  };
}

/** Marks to put in every paper to land on `pct` percent (rounded to a whole mark). */
export function marksForPercent(papers: Paper[], pct: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of papers) out[p.name] = Math.round((p.marks * pct) / 100);
  return out;
}

/** One line per level for Settings: has the student set a target and would it pass? */
export function levelOutcome(level: Level): { hasData: boolean; passed: boolean; percent: number } {
  if (readRaw(KEYS.manifest(level)) == null) return { hasData: false, passed: false, percent: 0 };
  const papers = manifestPapers(level, CURRICULUM[level]);
  const ev = evaluateManifest(papers, readManifest(level).marks, 'both');
  return { hasData: ev.hasData, passed: ev.allPassed, percent: ev.grandMax ? (ev.grandTotal / ev.grandMax) * 100 : 0 };
}
