// Targets: the plan side of the app. Two kinds of plan, both stored exactly as the original app stored them
// (so backups from the old version restore into this one):
//   - 'excel'  = a syllabus plan: a topic list per paper with target hours, ticked off as you go.
//   - 'custom' = a date plan: rows per day (paper, topic, target hours), which feed the backlog.
// All keys are scoped by level + group (`suffix`).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLevelConfig } from '../context/LevelContext';
import type { SubjectConfig } from '../types';
import { calculateBacklogs } from './backlog';
import { diffDays, eachDay, parseYmd } from './date';
import { uid } from './format';
import { readJSON, readRaw, removeKey, writeJSON, writeRaw } from './storage';
import { readXlsx, writeXlsx, type Cell } from './xlsx';

export type PlanSource = 'excel' | 'custom';

/** A topic in the syllabus plan. */
export interface SyllabusItem {
  id: string;
  subject: string;
  topic: string;
  /** Target hours. */
  hours: number;
  targetHours?: number;
  originalHours?: number;
  actualHours?: number;
  completed?: boolean;
  dayLabel?: string;
  source?: string;
  [extra: string]: unknown;
}

/** One planned row on a date plan. */
export interface CustomRow {
  id: string;
  date: string;
  dayLabel?: string;
  isSunday: boolean;
  sundayExpanded?: boolean;
  subject: string;
  topic: string;
  targetHours?: number;
  hours?: number;
  subRowIndex?: number;
  /** Set when the row was scheduled from a syllabus topic. Ticks stay in step with that topic. */
  topicId?: string;
  [extra: string]: unknown;
}
export interface CustomPlan {
  config?: { fromDate: string; toDate: string; subjectsPerDay: number; selectedSubjects: string[] };
  rows: CustomRow[];
}
export type Completion = Record<string, { done: boolean; completedAt: string | null }>;

export interface RestDay { key: string; label: string; date?: string; off: boolean }
export interface PlanSettings { excludeSundays: boolean; sundayHours: number; restDays: RestDay[] }

const EV = 'targets_changed';
const K = {
  source: (s: string) => `ca_targets_source_${s}`,
  data: (s: string) => `ca_targets_data_${s}`,
  custom: (s: string) => `ca_targets_custom_${s}`,
  completion: (s: string) => `ca_targets_completion_${s}`,
  restList: (s: string) => `ca_all_non_study_days_${s}`,
  restLegacy: (s: string) => `ca_custom_non_study_days_${s}`,
  restChecked: (s: string) => `ca_excel_non_study_days_${s}`,
  exclSun: (s: string) => `ca_exclude_sundays_${s}`,
  sunHrs: (s: string) => `ca_sunday_study_hours_${s}`,
};

/* ───────────── subject names ───────────── */

const norm = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const ALIASES: [RegExp, RegExp][] = [
  [/^(dt|direct tax(es)?( laws?)?( and international taxation)?)$/, /direct tax/],
  [/^(idt|indirect tax(es)?( laws?)?|gst)$/, /indirect tax/],
  [/^(costing|cost|cma|cost accounting|cost and management accounting)$/, /^cost/],
  [/^(audit|auditing|audit and ethics|auditing and ethics)$/, /^auditing and ethics|^audit/],
  [/^(sm|strategic management)$/, /strategic management/],
  [/^(fm|financial management)$/, /financial management/],
  [/^(law|laws|corporate and other laws|company law|business laws?)$/, /law/],
  [/^(account|accounts|accounting|advanced accounting|adv accounting)$/, /^(advanced )?accounting$/],
  [/^(eco|economics|business economics)$/, /economics/],
  [/^(qa|quant|quantitative aptitude|maths)$/, /quantitative/],
  [/^(ibs|integrated business solutions)$/, /integrated/],
  [/^(fr|financial reporting)$/, /financial reporting/],
  [/^(sfm|strategic financial management)$/, /strategic financial/],
  [/^(aaape|advanced auditing)$/, /advanced auditing/],
];

/** Map a name from a spreadsheet or old data to one of this level's papers. Returns null when nothing fits. */
export function canonSubject(raw: string, subjects: SubjectConfig[]): string | null {
  const s = norm(String(raw ?? ''));
  if (!s) return null;
  const exact = subjects.find((x) => norm(x.name) === s || norm(x.abbrev) === s);
  if (exact) return exact.name;
  for (const [asked, target] of ALIASES) {
    if (!asked.test(s)) continue;
    const hit = subjects.find((x) => target.test(norm(x.name)));
    if (hit) return hit.name;
  }
  const part = subjects.find((x) => norm(x.name).includes(s) && s.length >= 3);
  return part ? part.name : null;
}

/* ───────────── read / write ───────────── */

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export interface TargetsState {
  source: PlanSource | null;
  syllabus: SyllabusItem[];
  custom: CustomPlan | null;
  completion: Completion;
  plan: PlanSettings;
}

export function loadPlanSettings(suffix: string): PlanSettings {
  const list = readJSON<unknown>(K.restList(suffix), null);
  const base = Array.isArray(list) ? list : arr<{ key: string; label: string }>(readJSON<unknown>(K.restLegacy(suffix), []));
  const checked = readJSON<Record<string, boolean>>(K.restChecked(suffix), {});
  const restDays: RestDay[] = (base as { key?: string; label?: string; date?: string }[])
    .filter((r) => r && typeof r.key === 'string' && typeof r.label === 'string')
    .map((r) => ({ key: r.key as string, label: r.label as string, date: typeof r.date === 'string' ? r.date : undefined, off: !checked[r.key as string] }));
  const excl = readRaw(K.exclSun(suffix));
  const hrs = parseFloat(readRaw(K.sunHrs(suffix)) || '');
  return { excludeSundays: excl == null ? true : excl === 'true', sundayHours: Number.isFinite(hrs) ? hrs : 4, restDays };
}

function savePlanSettings(suffix: string, p: PlanSettings): void {
  writeRaw(K.exclSun(suffix), String(p.excludeSundays));
  writeRaw(K.sunHrs(suffix), String(p.sundayHours));
  writeJSON(K.restList(suffix), p.restDays.map((r) => ({ key: r.key, label: r.label, ...(r.date ? { date: r.date } : null) })));
  writeJSON(K.restChecked(suffix), Object.fromEntries(p.restDays.map((r) => [r.key, !r.off])));
  removeKey(K.restLegacy(suffix));
}

export function loadTargets(suffix: string, subjects: SubjectConfig[]): TargetsState {
  const src = readRaw(K.source(suffix));
  const syllabus = arr<SyllabusItem>(readJSON<unknown>(K.data(suffix), [])).filter((i) => i && typeof i.id === 'string').map((i) => {
    const hours = Number(i.targetHours ?? i.hours) || 0;
    return { ...i, subject: canonSubject(i.subject, subjects) ?? i.subject, topic: String(i.topic ?? ''), hours, targetHours: hours, actualHours: Number(i.actualHours) || 0, completed: !!i.completed };
  });
  const rawCustom = readJSON<unknown>(K.custom(suffix), null) as Partial<CustomPlan> | null;
  const custom: CustomPlan | null = rawCustom && typeof rawCustom === 'object'
    ? { config: rawCustom.config, rows: arr<CustomRow>(rawCustom.rows).filter((r) => r && typeof r.id === 'string' && typeof r.date === 'string') }
    : null;
  return {
    source: src === 'excel' || src === 'custom' ? src : null,
    syllabus, custom, completion: readJSON<Completion>(K.completion(suffix), {}), plan: loadPlanSettings(suffix),
  };
}

/* ───────────── hook ───────────── */

export function useTargets() {
  const { level, suffix, allSubjectsInGroup } = useLevelConfig();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    window.addEventListener(EV, f);
    window.addEventListener('storage', f);
    return () => { window.removeEventListener(EV, f); window.removeEventListener('storage', f); };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const state = useMemo(() => loadTargets(suffix, allSubjectsInGroup), [suffix, allSubjectsInGroup, tick]);

  const readState = useCallback(() => loadTargets(suffix, allSubjectsInGroup), [suffix, allSubjectsInGroup]);
  const commit = useCallback((write: () => void) => {
    write();
    window.dispatchEvent(new Event(EV));
    calculateBacklogs(level, suffix);
  }, [level, suffix]);

  const actions = useMemo(() => ({
    setSource: (s: PlanSource) => commit(() => writeRaw(K.source(suffix), s)),
    saveSyllabus: (items: SyllabusItem[], makeActive = true) => commit(() => { writeJSON(K.data(suffix), items); if (makeActive) writeRaw(K.source(suffix), 'excel'); }),
    saveCustom: (plan: CustomPlan, makeActive = true) => commit(() => { writeJSON(K.custom(suffix), plan); if (makeActive) writeRaw(K.source(suffix), 'custom'); }),
    saveCompletion: (c: Completion) => commit(() => writeJSON(K.completion(suffix), c)),
    /** Tick or untick a syllabus topic. Rows scheduled from it follow. */
    setTopicDone: (id: string, done: boolean) => commit(() => {
      const cur = readState();
      writeJSON(K.data(suffix), cur.syllabus.map((i) => (i.id === id ? { ...i, completed: done } : i)));
      const rows = (cur.custom?.rows ?? []).filter((r) => r.topicId === id);
      if (rows.length) {
        const next = { ...cur.completion };
        for (const r of rows) next[r.id] = { done, completedAt: done ? new Date().toISOString() : null };
        writeJSON(K.completion(suffix), next);
      }
    }),
    /** Tick or untick a planned row. The topic it came from is done once every one of its rows is. */
    setRowDone: (rowId: string, done: boolean) => commit(() => {
      const cur = readState();
      const next = { ...cur.completion, [rowId]: { done, completedAt: done ? new Date().toISOString() : null } };
      writeJSON(K.completion(suffix), next);
      const row = cur.custom?.rows.find((r) => r.id === rowId);
      if (row?.topicId) {
        const all = (cur.custom?.rows ?? []).filter((r) => r.topicId === row.topicId);
        const complete = all.every((r) => !!next[r.id]?.done);
        const item = cur.syllabus.find((i) => i.id === row.topicId);
        if (item && !!item.completed !== complete) writeJSON(K.data(suffix), cur.syllabus.map((i) => (i.id === row.topicId ? { ...i, completed: complete } : i)));
      }
    }),
    savePlanSettings: (p: PlanSettings) => commit(() => savePlanSettings(suffix, p)),
    /** Remove one kind of plan and everything derived from it. */
    clearPlan: (kind: PlanSource) => commit(() => {
      if (kind === 'excel') removeKey(K.data(suffix));
      else { removeKey(K.custom(suffix)); removeKey(K.completion(suffix)); writeJSON(`ca_backlog_${suffix}`, []); window.dispatchEvent(new Event('backlog_changed')); }
      const left = readRaw(K.source(suffix));
      if (left === kind) removeKey(K.source(suffix));
    }),
  }), [commit, suffix, readState]);

  return { ...state, ...actions, suffix, level };
}

/* ───────────── syllabus helpers ───────────── */

export interface SyllabusTotals { target: number; done: number; remaining: number; actual: number; topics: number; topicsDone: number }
export function syllabusTotals(items: SyllabusItem[]): SyllabusTotals {
  const t: SyllabusTotals = { target: 0, done: 0, remaining: 0, actual: 0, topics: items.length, topicsDone: 0 };
  for (const i of items) {
    const h = Number(i.targetHours ?? i.hours) || 0;
    t.target += h;
    t.actual += Number(i.actualHours) || 0;
    if (i.completed) { t.done += h; t.topicsDone++; } else t.remaining += h;
  }
  return t;
}

/** Scale target hours by a percentage (e.g. -20 for 20% less). Remembers the original hours so it can be undone. */
export function scaleSyllabus(items: SyllabusItem[], percent: number, subject: string): SyllabusItem[] {
  const f = 1 + percent / 100;
  return items.map((i) => {
    if (i.completed || (subject !== 'All' && i.subject !== subject)) return i;
    const orig = typeof i.originalHours === 'number' ? i.originalHours : Number(i.targetHours ?? i.hours) || 1.5;
    const h = Math.max(0.25, Math.round(orig * f * 4) / 4);
    return { ...i, originalHours: orig, hours: h, targetHours: h };
  });
}

/* ───────────── pace maths (shared by Targets and Plan vs actual) ───────────── */

export interface Pace {
  calendarDays: number;
  sundays: number;
  restDays: number;
  /** Days that count towards the weekday target. */
  studyDays: number;
  /** Hours needed each study day to finish the remaining target. */
  perDay: number;
  sundayHours: number;
  sundayTotal: number;
}

export function paceFor(remainingHours: number, examDate: string, today: string, p: PlanSettings): Pace {
  const calendarDays = Math.max(0, diffDays(today, examDate));
  let sundays = 0;
  if (calendarDays > 0 && calendarDays < 1500) for (const d of eachDay(today, examDate)) if (parseYmd(d).getDay() === 0) sundays++;
  const restDays = p.restDays.filter((r) => r.off && (!r.date || (r.date >= today && r.date <= examDate))).length;
  const effective = Math.max(1, calendarDays - (p.excludeSundays ? sundays : 0) - restDays);
  const regular = Math.max(0, calendarDays - sundays - restDays);
  const sundayTotal = !p.excludeSundays ? sundays * p.sundayHours : 0;
  const perDay = !p.excludeSundays && p.sundayHours > 0
    ? (regular > 0 ? Math.max(0, remainingHours - sundayTotal) / regular : 0)
    : remainingHours / effective;
  return { calendarDays, sundays, restDays, studyDays: !p.excludeSundays && p.sundayHours > 0 ? regular : effective, perDay, sundayHours: p.sundayHours, sundayTotal };
}

/* ───────────── date plan helpers ───────────── */

/** Skeleton rows for a date range: `perDay` rows a day, cycling through the chosen papers. Sundays start hidden. */
export function buildDateRows(from: string, to: string, subjects: string[], perDay: number): CustomRow[] {
  const rows: CustomRow[] = [];
  const names = subjects.length ? subjects : ['General'];
  let cycle = 0;
  for (const date of eachDay(from, to)) {
    const sun = parseYmd(date).getDay() === 0;
    for (let s = 0; s < perDay; s++) {
      rows.push({ id: `custom-row-${date}-${s}`, date, isSunday: sun, sundayExpanded: false, subject: names[cycle % names.length], topic: '', targetHours: 1.5, subRowIndex: s });
      if (!sun) cycle++;
    }
  }
  return rows;
}

export const newRowId = (date: string) => `custom-row-${date}-${uid('n')}`;

/* ───────────── Excel in and out ───────────── */

export interface ImportResult { items: SyllabusItem[]; skipped: number; unknown: string[]; sheet: string }

/** Parse a spreadsheet with Subject / Topic / Target_Hrs columns into syllabus items. */
export async function importSyllabusFile(file: File, subjects: SubjectConfig[]): Promise<ImportResult> {
  const sheets = await readXlsx(file);
  if (!sheets.length) throw new Error('The workbook has no sheets.');
  const sheet = sheets.find((s) => /ca\s*target/i.test(s.name)) ?? sheets[0];
  const rows = sheet.rows;
  let sc = 0, tc = 1, hc = 2, start = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = (rows[i] || []).map((c) => String(c ?? '').trim().toLowerCase());
    const si = r.findIndex((c) => c.includes('subject') || c === 'paper');
    const ti = r.findIndex((c) => c.includes('topic') || c.includes('chapter'));
    if (si !== -1 && ti !== -1) {
      sc = si; tc = ti; start = i + 1;
      const hi = r.findIndex((c) => c.includes('target') || c.includes('hour') || c === 'hrs');
      if (hi !== -1) hc = hi;
      break;
    }
  }
  const items: SyllabusItem[] = [];
  const unknown = new Set<string>();
  let skipped = 0;
  for (let i = start; i < rows.length; i++) {
    const r = rows[i] || [];
    const subjectRaw = String(r[sc] ?? '').trim();
    const topic = String(r[tc] ?? '').trim();
    if (!subjectRaw && !topic) continue;
    const low = `${subjectRaw} ${topic}`.toLowerCase();
    if (!topic || /\btotal\b|\bnotes?\b|\bcomments?\b/.test(low)) continue;
    const hours = parseFloat(String(r[hc] ?? '')) || 0;
    const subject = canonSubject(subjectRaw, subjects);
    if (!subject) { unknown.add(subjectRaw || '(blank)'); skipped++; continue; }
    if (hours <= 0) { skipped++; continue; }
    items.push({ id: uid('t'), subject, topic, hours, targetHours: hours, actualHours: 0, completed: false, source: 'excel-import', dayLabel: 'Day 1' });
  }
  if (!items.length) throw new Error(`No topics could be read. The sheet needs columns named Subject, Topic and Target_Hrs, and each subject must match one of: ${subjects.map((s) => s.name).join(', ')}.`);
  return { items, skipped, unknown: [...unknown], sheet: sheet.name };
}

/** A ready-to-fill template with one example row per paper. */
export function syllabusTemplate(subjects: SubjectConfig[]): Blob {
  const rows: Cell[][] = [['Subject', 'Topic', 'Target_Hrs']];
  for (const s of subjects) rows.push([s.name, 'Example: first chapter', 3], [s.name, 'Example: second chapter', 2.5]);
  const notes: Cell[][] = [
    ['How to use this file'],
    ['1. Keep the header row of the CA Targets sheet as it is.'],
    ['2. Write one topic per row with the paper name in the Subject column.'],
    ['3. Target_Hrs is the number of hours you plan to give the topic.'],
    ['Papers for this level: ' + subjects.map((s) => s.name).join(' | ')],
  ];
  return writeXlsx([{ name: 'CA Targets', rows }, { name: 'Read me', rows: notes, header: false }]);
}


export type TargetsApi = ReturnType<typeof useTargets>;
