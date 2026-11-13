export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Join class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** 6.5 → "6h 30m", 0.25 → "15m", 8 → "8h" */
export function fmtHM(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0h';
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** 6.5 → "6.5", 8 → "8" */
export function fmtNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '0';
  return Number(n.toFixed(digits)).toString();
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export function pct(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${fmtNum(n, 1)} ${Math.abs(n - 1) < 1e-9 ? one : many}`;
}

export function uid(prefix = ''): string {
  const c = globalThis.crypto as Crypto | undefined;
  const id = c?.randomUUID ? c.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  return prefix + id;
}

/** Round to the nearest half hour. */
export const roundHalf = (n: number) => Math.round(n * 2) / 2;
