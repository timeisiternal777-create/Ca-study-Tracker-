// Schedule my syllabus: spread the topics you have not finished over the days you can study.
// Papers take turns so no day is all one subject. A topic that is longer than a day's slot is split across days,
// and every row remembers which topic it came from (`topicId`) so ticks stay in step in both places.
import { eachDay, parseYmd } from './date';
import type { CustomRow, PlanSettings, SyllabusItem } from './targets';

export interface ScheduleOptions {
  from: string;
  to: string;
  /** papers studied on one day */
  perDay: number;
  /** hours on a normal study day */
  hoursPerDay: number;
  plan: PlanSettings;
  /** papers in the order they should start, if you want a particular one first */
  order?: string[];
}

export interface ScheduleResult {
  rows: CustomRow[];
  /** days that got at least one row */
  days: number;
  /** study days available in the range */
  studyDays: number;
  /** hours placed */
  hours: number;
  /** hours of topics that did not fit before `to` */
  leftover: number;
  topics: number;
  lastDate: string | null;
  /** the hours a day that would fit everything */
  neededPerDay: number;
}

const q = (n: number) => Math.round(n * 4) / 4;

/** Study days in the range and how many hours each can hold. */
export function studyCapacity(o: Pick<ScheduleOptions, 'from' | 'to' | 'hoursPerDay' | 'plan'>): { date: string; hours: number }[] {
  const off = new Set(o.plan.restDays.filter((r) => r.off && r.date).map((r) => r.date as string));
  const out: { date: string; hours: number }[] = [];
  for (const date of eachDay(o.from, o.to)) {
    if (off.has(date)) continue;
    const sun = parseYmd(date).getDay() === 0;
    if (sun) {
      if (o.plan.excludeSundays || o.plan.sundayHours <= 0) continue;
      out.push({ date, hours: o.plan.sundayHours });
    } else out.push({ date, hours: o.hoursPerDay });
  }
  return out;
}

export function scheduleSyllabus(items: SyllabusItem[], o: ScheduleOptions): ScheduleResult {
  const todo = items.filter((i) => !i.completed && (Number(i.targetHours ?? i.hours) || 0) > 0);
  const queues = new Map<string, { item: SyllabusItem; left: number; part: number }[]>();
  for (const it of todo) {
    const list = queues.get(it.subject) ?? [];
    list.push({ item: it, left: Number(it.targetHours ?? it.hours) || 0, part: 0 });
    queues.set(it.subject, list);
  }
  const subjects = [...queues.keys()].sort((a, b) => {
    const ia = o.order?.indexOf(a) ?? -1, ib = o.order?.indexOf(b) ?? -1;
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const totalHours = todo.reduce((a, i) => a + (Number(i.targetHours ?? i.hours) || 0), 0);
  const cap = studyCapacity(o);
  const capHours = cap.reduce((a, d) => a + d.hours, 0);

  const rows: CustomRow[] = [];
  let cursor = 0;
  let placed = 0;
  const used = new Set<string>();
  const perDay = Math.max(1, Math.round(o.perDay));

  for (const day of cap) {
    const live = subjects.filter((s) => (queues.get(s)?.length ?? 0) > 0);
    if (!live.length) break;
    const k = Math.min(perDay, live.length);
    const picks: string[] = [];
    for (let n = 0; n < k; n++) picks.push(live[(cursor + n) % live.length]);
    cursor = (cursor + k) % live.length;
    let slot = 0;
    let dayUsed = 0;
    const sun = parseYmd(day.date).getDay() === 0;
    const place = (subject: string, room: number) => {
      const queue = queues.get(subject)!;
      while (room > 0.01 && queue.length) {
        const head = queue[0];
        const take = Math.min(room, head.left);
        rows.push({
          id: `custom-row-${day.date}-s${slot}`, date: day.date, isSunday: sun, sundayExpanded: true, subject: head.item.subject,
          topic: head.part ? `${head.item.topic} (cont.)` : head.item.topic, targetHours: q(take) || 0.25, subRowIndex: slot, topicId: head.item.id,
        });
        slot++; placed += take; dayUsed += take; head.left -= take; head.part++; room -= take;
        used.add(day.date);
        if (head.left <= 0.01) queue.shift();
      }
    };
    // Each paper gets an equal share of the day, in quarter hours.
    for (const p of picks) place(p, q(day.hours / picks.length));
    // A paper that ran out of topics leaves room. Hand it to the other papers rather than waste it.
    for (const p of [...picks, ...live.filter((x) => !picks.includes(x))]) {
      const free = day.hours - dayUsed;
      if (free <= 0.01) break;
      place(p, free);
    }
  }

  let leftover = 0;
  for (const list of queues.values()) for (const h of list) leftover += Math.max(0, h.left);
  return {
    rows, days: used.size, studyDays: cap.length, hours: placed, leftover, topics: todo.length,
    lastDate: rows.length ? rows[rows.length - 1].date : null,
    neededPerDay: cap.length ? Math.ceil((totalHours / Math.max(1, capHours / Math.max(0.25, o.hoursPerDay))) * 4) / 4 : 0,
  };
}
