// Local-time date helpers. All app dates are "YYYY-MM-DD" in the user's local time zone
// (the original used toISOString(), which is UTC and shows the wrong day for evening study in India).

const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return ymd(new Date());
}

/** Parse "YYYY-MM-DD" as local midnight. */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Whole days from a to b (b - a). Uses UTC maths so DST never skews it. */
export function diffDays(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** Monday of the week containing `s`. */
export function startOfWeek(s: string): string {
  const d = parseYmd(s);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return ymd(d);
}

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let cur = start; cur <= end && out.length < 4000; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

export function isValidYmd(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseYmd(s).getTime());
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "25 Oct", "25 Oct 2026" (with year) or "Sun, 25 Oct" (with weekday). */
export function fmtDate(s: string, o: { year?: boolean; weekday?: boolean } = {}): string {
  const d = parseYmd(s);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}${o.year ? ` ${d.getFullYear()}` : ''}`;
  return o.weekday ? `${DAYS[d.getDay()]}, ${base}` : base;
}

export function monthName(i: number): string {
  return MONTHS[i];
}

export function weekdayShort(s: string): string {
  return DAYS[parseYmd(s).getDay()];
}

/** Relative label for a day: Today, Yesterday, Tomorrow or a short date. */
export function relativeDay(s: string, today = todayStr()): string {
  const n = diffDays(today, s);
  if (n === 0) return 'Today';
  if (n === -1) return 'Yesterday';
  if (n === 1) return 'Tomorrow';
  return fmtDate(s, { weekday: Math.abs(n) < 7 });
}

/** Exam starts at 2 PM local time on the target date. */
export function examMoment(dateStr: string): Date {
  const d = parseYmd(dateStr);
  d.setHours(14, 0, 0, 0);
  return d;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
