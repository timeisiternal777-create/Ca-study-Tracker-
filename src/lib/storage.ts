import type { Level } from '../types';

export const KEYS = {
  settings: 'ca_settings_v3',
  level: 'ca_level_selected',
  schema: 'ca_schema_version_v5',
  guideSeen: 'hasSeenGuide',
  logs: (level: Level) => `ca_study_logs_v4_${level}`,
  mocks: (level: Level) => `ca_mock_scores_v4_${level}`,
  manifest: (level: Level) => `manifestationData_${level}`,
  game: (level: Level) => `ca_game_v1_${level}`,
  seen: (level: Level) => `ca_seen_v1_${level}`,
  group: (level: Level) => `ca_group_selected_${level}`,
  activeSubjects: (level: Level) => `ca_active_subjects_${level}`,
  notifDismissed: (suffix: string) => `ca_notification_dismissed_${suffix}`,
  backlog: (suffix: string) => `ca_backlog_${suffix}`,
  /** The study timer in progress. One for the whole app, never part of a backup. */
  timer: 'ca_timer_v1',
  /** Finished timer sessions of one level. */
  sessions: (level: Level) => `ca_timer_sessions_v1_${level}`,
} as const;

/** Key prefixes that are scoped by `_${suffix}` (level + group). Cleared together on "wipe level". */
export const SUFFIX_KEY_PREFIXES = [
  'ca_targets_source_', 'ca_targets_data_', 'ca_targets_custom_', 'ca_targets_completion_',
  'ca_sunday_study_hours_', 'ca_all_non_study_days_', 'ca_exclude_sundays_', 'ca_excel_non_study_days_',
  'ca_excel_exam_date_', 'ca_custom_non_study_days_', 'ca_log_target_hours_', 'ca_backlog_',
];

export function readRaw(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeRaw(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function writeJSON(key: string, value: unknown): boolean {
  return writeRaw(key, JSON.stringify(value));
}

export function allKeys(): string[] {
  const out: string[] = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) out.push(k); } } catch { /* ignore */ }
  return out;
}

/** Remove every suffix-scoped key (targets, backlog, plan settings) for one level/group. */
export function clearSuffixData(suffix: string): void {
  for (const prefix of SUFFIX_KEY_PREFIXES) removeKey(prefix + suffix);
}

/** Keys that belong to this app (used for full backups). */
export function appKeys(): string[] {
  return allKeys().filter((k) => /^(ca_|manifestationData_)/.test(k) && !k.startsWith('ca_notification_dismissed_') && k !== KEYS.schema && k !== KEYS.timer);
}

/** One-time, NON-destructive schema marker. (The previous version wiped user data on upgrade.) */
export function ensureSchema(): void {
  if (readRaw(KEYS.schema) !== '5') writeRaw(KEYS.schema, '5');
}
