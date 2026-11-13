import { addDays, diffDays, eachDay, fmtDate, startOfWeek } from './date';
import { paceFor, type Completion, type CustomRow, type Pace, type PlanSettings, type PlanSource, type SyllabusItem } from './targets';
import type { DailyStudyLog } from '../types';
import { subjectHoursOf } from './log';

export interface PaperRow { name: string; target: number; done: number; logged: number; topics: number; topicsDone: number }
export interface WeekRow { start: string; planned: number; logged: number; slots: number; satisfied: number }
export interface PendingGroup { subject: string; hours: number; topics: { id: string; topic: string; hours: number; date?: string }[] }
export type InsightTone = 'good' | 'warn' | 'bad' | 'info';
export interface Insight { tone: InsightTone; text: string; link?: 'TARGETS' | 'LOG' }
export interface Verdict { tone: InsightTone; title: string; body: string }

export interface Analysis {
  mode: PlanSource;
  papers: PaperRow[];
  totals: { target: number; done: number; remaining: number; logged: number; topics: number; topicsDone: number; pct: number };
  verdict: Verdict;
  /** Hours a day still needed (syllabus plan) */
  needPerDay: number | null;
  pace: Pace | null;
  avg7: number;
  finish: { date: string; marginDays: number } | null;
  /** Date plan only */
  adherence: { total: number; satisfied: number; pct: number } | null;
  plannedToDate: number;
  loggedToDate: number;
  range: { from: string; to: string } | null;
  series: { x: string[]; planned: (number | null)[]; logged: (number | null)[] } | null;
  weeks: WeekRow[];
  /** Hours a week needed to finish (syllabus plan) */
  needPerWeek: number | null;
  pending: PendingGroup[];
  insights: Insight[];
}

export interface AnalysisInput {
  mode: PlanSource;
  syllabus: SyllabusItem[];
  custom: CustomRow[];
  completion: Completion;
  plan: PlanSettings;
  logs: DailyStudyLog[];
  dailyTotals: Record<string, number>;
  last7Avg: number;
  paperNames: string[];
  examDate: string;
  today: string;
  backlogPending: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function indexLogs(logs: DailyStudyLog[]) {
  const slot = new Map<string, number>();
  const subject = new Map<string, number>();
  for (const l of logs) {
    for (const [s, h] of subjectHoursOf(l)) {
      slot.set(`${l.date}|${s}`, (slot.get(`${l.date}|${s}`) || 0) + h);
      subject.set(s, (subject.get(s) || 0) + h);
    }
  }
  return { slot, subject };
}

const visibleRows = (rows: CustomRow[]) => rows.filter((r) => r.topic && !(r.isSunday && !r.sundayExpanded));
const hoursOf = (r: { targetHours?: number; hours?: number }) => Number(r.targetHours ?? r.hours) || 0;

export function analyse(i: AnalysisInput): Analysis {
  const { slot, subject: loggedBySubject } = indexLogs(i.logs);
  const papers = new Map<string, PaperRow>(i.paperNames.map((n) => [n, { name: n, target: 0, done: 0, logged: 0, topics: 0, topicsDone: 0 }]));
  const paper = (n: string) => { let p = papers.get(n); if (!p) { p = { name: n, target: 0, done: 0, logged: 0, topics: 0, topicsDone: 0 }; papers.set(n, p); } return p; };
  const pending = new Map<string, PendingGroup>();
  const addPending = (s: string, id: string, topic: string, hours: number, date?: string) => {
    const g = pending.get(s) ?? { subject: s, hours: 0, topics: [] };
    g.hours += hours; g.topics.push({ id, topic, hours, date }); pending.set(s, g);
  };

  let adherence: Analysis['adherence'] = null;
  let plannedToDate = 0, loggedToDate = 0;
  let range: Analysis['range'] = null;
  let series: Analysis['series'] = null;
  let weeks: WeekRow[] = [];
  let pace: Pace | null = null;
  let needPerDay: number | null = null;
  let needPerWeek: number | null = null;

  if (i.mode === 'excel') {
    for (const it of i.syllabus) {
      const p = paper(it.subject), h = hoursOf(it);
      p.target += h; p.topics++;
      if (it.completed) { p.done += h; p.topicsDone++; } else addPending(it.subject, it.id, it.topic, h);
    }
    for (const p of papers.values()) p.logged = loggedBySubject.get(p.name) || 0;
    const remaining = [...papers.values()].reduce((a, p) => a + (p.target - p.done), 0);
    pace = paceFor(remaining, i.examDate, i.today, i.plan);
    if (pace.calendarDays > 0) { needPerDay = pace.perDay; needPerWeek = pace.perDay * (i.plan.excludeSundays ? 6 : 7); }
    // Last eight weeks of hours, oldest first.
    const thisWeek = startOfWeek(i.today);
    for (let w = 7; w >= 0; w--) {
      const start = addDays(thisWeek, -7 * w);
      let logged = 0;
      for (let d = 0; d < 7; d++) logged += i.dailyTotals[addDays(start, d)] || 0;
      weeks.push({ start, planned: needPerWeek ?? 0, logged, slots: 0, satisfied: 0 });
    }
  } else {
    const rows = visibleRows(i.custom);
    const satisfied = (r: CustomRow) => !!i.completion[r.id]?.done || (r.date <= i.today && (slot.get(`${r.date}|${r.subject}`) || 0) > 0);
    const dates = rows.map((r) => r.date).sort();
    const allDates = i.custom.map((r) => r.date).sort();
    const from = allDates[0], to = allDates[allDates.length - 1];
    range = from ? { from, to } : null;
    let pastTotal = 0, pastOk = 0;
    for (const r of rows) {
      const p = paper(r.subject), h = hoursOf(r);
      p.target += h; p.topics++;
      const ok = satisfied(r);
      if (ok) { p.done += h; p.topicsDone++; } else addPending(r.subject, r.id, r.topic, h, r.date);
      if (r.date < i.today) { pastTotal++; if (ok) pastOk++; plannedToDate += h; }
    }
    if (range) {
      for (const d of eachDay(range.from, range.to)) {
        if (d < i.today) loggedToDate += i.dailyTotals[d] || 0;
        for (const p of papers.values()) if (d <= i.today) p.logged += slot.get(`${d}|${p.name}`) || 0;
      }
    }
    adherence = { total: pastTotal, satisfied: pastOk, pct: pastTotal ? (pastOk / pastTotal) * 100 : 0 };

    if (range && dates.length) {
      const days = eachDay(range.from, range.to);
      const plannedByDay = new Map<string, number>();
      for (const r of rows) plannedByDay.set(r.date, (plannedByDay.get(r.date) || 0) + hoursOf(r));
      let cp = 0, cl = 0;
      const planned: number[] = [], logged: (number | null)[] = [];
      for (const d of days) {
        cp += plannedByDay.get(d) || 0;
        planned.push(r1(cp));
        if (d <= i.today) { cl += i.dailyTotals[d] || 0; logged.push(r1(cl)); } else logged.push(null);
      }
      series = { x: days, planned, logged };

      const byWeek = new Map<string, WeekRow>();
      const wk = (d: string) => { const s = startOfWeek(d); let w = byWeek.get(s); if (!w) { w = { start: s, planned: 0, logged: 0, slots: 0, satisfied: 0 }; byWeek.set(s, w); } return w; };
      for (const d of days) wk(d).logged += d <= i.today ? i.dailyTotals[d] || 0 : 0;
      for (const r of rows) { const w = wk(r.date); w.planned += hoursOf(r); w.slots++; if (satisfied(r)) w.satisfied++; }
      weeks = [...byWeek.values()].sort((a, b) => a.start.localeCompare(b.start));
    }
  }

  const list = [...papers.values()];
  const target = list.reduce((a, p) => a + p.target, 0);
  const done = list.reduce((a, p) => a + p.done, 0);
  const topics = list.reduce((a, p) => a + p.topics, 0);
  const topicsDone = list.reduce((a, p) => a + p.topicsDone, 0);
  const logged = list.reduce((a, p) => a + p.logged, 0);
  const totals = { target, done, remaining: Math.max(0, target - done), logged, topics, topicsDone, pct: topics ? (topicsDone / topics) * 100 : 0 };

  const avg7 = i.last7Avg;
  let finish: Analysis['finish'] = null;
  if (i.mode === 'excel' && totals.remaining > 0 && avg7 > 0.05) {
    const days = Math.ceil(totals.remaining / avg7);
    if (days < 3650) { const date = addDays(i.today, days); finish = { date, marginDays: i.examDate ? diffDays(date, i.examDate) : 0 }; }
  }

  /* verdict */
  let verdict: Verdict;
  if (!topics) {
    verdict = { tone: 'info', title: i.mode === 'excel' ? 'No topics yet' : 'No topics written yet', body: i.mode === 'excel' ? 'Add or import topics in Targets and this page will compare them with your study.' : 'Write what you will study in each slot of your date plan and this page will compare it with your study.' };
  } else if (i.mode === 'excel') {
    if (totals.remaining === 0) verdict = { tone: 'good', title: 'Syllabus covered', body: 'Every topic is ticked off. Spend the days left on revision and mock tests.' };
    else if (!pace || pace.calendarDays <= 0) verdict = { tone: 'bad', title: 'Exam date has passed', body: 'Set your next exam date in Settings to see the pace you need.' };
    else {
      const need = pace.perDay;
      const gap = need - avg7;
      if (avg7 >= need * 1.1) verdict = { tone: 'good', title: 'Ahead of pace', body: `You averaged ${r1(avg7)}h a day this week and need ${r1(need)}h. Keep going and you finish early.` };
      else if (gap <= 0.05) verdict = { tone: 'good', title: 'On pace', body: `You averaged ${r1(avg7)}h a day this week against the ${r1(need)}h you need.` };
      else if (avg7 >= need * 0.7) verdict = { tone: 'warn', title: 'Slightly behind', body: `You need ${r1(need)}h a day and averaged ${r1(avg7)}h this week, so you are about ${r1(gap)}h a day short.` };
      else verdict = { tone: 'bad', title: 'Behind pace', body: `You need ${r1(need)}h a day and averaged ${r1(avg7)}h this week. Closing a gap of ${r1(gap)}h a day takes a change of routine.` };
    }
  } else if (!adherence || adherence.total === 0) {
    verdict = { tone: 'info', title: 'Nothing to compare yet', body: 'Your plan has no finished days so far. Come back after the first planned day has passed.' };
  } else {
    const p = adherence.pct;
    const body = `You covered ${adherence.satisfied} of ${adherence.total} slots on days that have passed, and logged ${r1(loggedToDate)}h against ${r1(plannedToDate)}h planned.`;
    verdict = p >= 85 ? { tone: 'good', title: 'On track', body } : p >= 60 ? { tone: 'warn', title: 'Slipping', body } : { tone: 'bad', title: 'Behind plan', body };
  }

  /* insights */
  const insights: Insight[] = [];
  if (topics) {
    const pct = totals.pct;
    insights.push(pct < 30 ? { tone: 'info', text: 'You are at the start. Put your first hours into the papers with the most marks.' }
      : pct <= 60 ? { tone: 'info', text: 'You are around the halfway mark. Give pending theory papers the freshest hours of your day.' }
      : pct <= 85 ? { tone: 'good', text: 'Strong progress. Shift the remaining time towards revision and mock tests.' }
      : { tone: 'good', text: 'Almost exam-ready. Make full mock tests the main work now.' });
    const gap = [...list].sort((a, b) => (b.target - b.done) - (a.target - a.done))[0];
    if (gap && gap.target - gap.done > 0) insights.push({ tone: 'warn', text: `${gap.name} has the most left, ${r1(gap.target - gap.done)}h of topics. Start there.`, link: 'TARGETS' });
    const untouched = list.filter((p) => p.target > 0 && p.logged === 0).map((p) => p.name);
    if (untouched.length) insights.push({ tone: 'warn', text: `No hours logged yet for ${untouched.slice(0, 3).join(', ')}${untouched.length > 3 ? ` and ${untouched.length - 3} more` : ''}.`, link: 'LOG' });
  }
  if (finish && totals.remaining > 0) {
    const m = finish.marginDays;
    insights.push(m >= 0 ? { tone: 'good', text: `At this week's average you finish ${m === 0 ? 'on exam day' : `${m} day${m === 1 ? '' : 's'} before the exam`}.` }
      : { tone: 'bad', text: `At this week's average you finish ${-m} day${m === -1 ? '' : 's'} after the exam. Raise your daily hours or trim the topic list.`, link: 'TARGETS' });
  }
  if (i.backlogPending > 0) insights.push({ tone: 'warn', text: `${i.backlogPending} missed ${i.backlogPending === 1 ? 'topic is' : 'topics are'} waiting in your backlog.`, link: 'TARGETS' });
  const logDates = Object.keys(i.dailyTotals).filter((d) => (i.dailyTotals[d] || 0) > 0).sort();
  if (logDates.length) {
    const thisWeek = startOfWeek(i.today);
    for (let w = 1; w <= 8; w++) {
      const start = addDays(thisWeek, -7 * w);
      if (start < startOfWeek(logDates[0])) break;
      let sum = 0;
      for (let d = 0; d < 7; d++) sum += i.dailyTotals[addDays(start, d)] || 0;
      if (sum === 0) { insights.push({ tone: 'bad', text: `Nothing was logged in the week of ${fmtDate(start)}. A whole empty week costs more than a single missed day.`, link: 'LOG' }); break; }
    }
  }

  return {
    mode: i.mode, papers: list, totals, verdict, needPerDay, pace, avg7, finish, adherence, plannedToDate, loggedToDate,
    range, series, weeks, needPerWeek, pending: [...pending.values()].sort((a, b) => b.hours - a.hours), insights,
  };
}
