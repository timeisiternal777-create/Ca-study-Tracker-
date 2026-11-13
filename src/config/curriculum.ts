import type { Accent, GroupId, Level, SubjectConfig, SubjectMeta } from '../types';

const s = (
  id: string, name: string, abbrev: string, paperNumber: number, group: GroupId, marks: number, accent: Accent,
): SubjectConfig => ({ id, name, abbrev, paperNumber, group, marks, accent });

/** ICAI scheme: papers per level, group split and marks. */
export const CURRICULUM: Record<Level, SubjectConfig[]> = {
  foundation: [
    s('f-accounts', 'Accounting', 'AC', 1, 'both', 100, 'cyan'),
    s('f-laws', 'Business Laws', 'LAW', 2, 'both', 100, 'violet'),
    s('f-qa', 'Quantitative Aptitude', 'QA', 3, 'both', 100, 'gold'),
    s('f-eco', 'Business Economics', 'ECO', 4, 'both', 100, 'mint'),
  ],
  inter: [
    s('inter-accounts', 'Advanced Accounting', 'AC', 1, 'group1', 100, 'cyan'),
    s('inter-laws', 'Corporate & Other Laws', 'LAW', 2, 'group1', 100, 'violet'),
    s('inter-dt', 'Direct Tax (DT)', 'DT', 3, 'group1', 50, 'gold'),
    s('inter-idt', 'Indirect Tax (IDT)', 'IDT', 4, 'group1', 50, 'ember'),
    s('inter-costing', 'Cost & Management Accounting', 'COST', 5, 'group2', 100, 'mint'),
    s('inter-audit', 'Auditing & Ethics', 'AUD', 6, 'group2', 100, 'rose'),
    s('inter-fm', 'Financial Management (FM)', 'FM', 7, 'group2', 50, 'cyan'),
    s('inter-sm', 'Strategic Management (SM)', 'SM', 8, 'group2', 50, 'violet'),
  ],
  final: [
    s('fin-fr', 'Financial Reporting', 'FR', 1, 'group1', 100, 'cyan'),
    s('fin-sfm', 'Strategic Financial Management', 'SFM', 2, 'group1', 100, 'gold'),
    s('fin-audit', 'Advanced Auditing, Assurance & Professional Ethics', 'AUDIT', 3, 'group1', 100, 'rose'),
    s('fin-dt', 'Direct Tax Laws & International Taxation', 'DT', 4, 'group2', 100, 'ember'),
    s('fin-idt', 'Indirect Tax Laws', 'IDT', 5, 'group2', 100, 'rose'),
    s('fin-ibs', 'Integrated Business Solutions', 'IBS', 6, 'group2', 100, 'mint'),
  ],
};

export const LEVELS: { id: Level; label: string; short: string; papers: number; blurb: string }[] = [
  { id: 'foundation', label: 'CA Foundation', short: 'Foundation', papers: 4, blurb: '4 papers · single syllabus' },
  { id: 'inter', label: 'CA Intermediate', short: 'Intermediate', papers: 8, blurb: '8 papers · 2 groups' },
  { id: 'final', label: 'CA Final', short: 'Final', papers: 6, blurb: '6 papers · 2 groups' },
];

export const ACCENTS: Accent[] = ['cyan', 'violet', 'gold', 'ember', 'mint', 'rose'];

export function subjectsInGroup(level: Level, group: GroupId): SubjectConfig[] {
  const list = CURRICULUM[level];
  if (level === 'foundation' || group === 'both') return list;
  return list.filter((x) => x.group === group || x.group === 'both');
}

/** Metadata for any subject name, including custom names not in the curriculum. */
export function subjectMeta(level: Level, name: string): SubjectMeta {
  const found = CURRICULUM[level].find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (found) return { abbrev: found.abbrev, accent: found.accent, color: `var(--c-${found.accent})` };
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const accent = ACCENTS[hash % ACCENTS.length];
  return { abbrev: name.slice(0, 4).toUpperCase(), accent, color: `var(--c-${accent})` };
}

export function levelLabel(level: Level): string {
  return LEVELS.find((l) => l.id === level)?.label ?? 'CA';
}

export function groupLabel(level: Level, group: GroupId): string {
  if (level === 'foundation') return 'All papers';
  if (group === 'both') return 'Both groups';
  return group === 'group1' ? 'Group 1' : 'Group 2';
}

/** Suffix used by per-level-and-group storage keys (targets, backlog, plan settings). */
export function keySuffix(level: Level, group: GroupId): string {
  if (level === 'foundation') return 'foundation';
  if (group === 'both') return level;
  return `${level}_${group}`;
}

export function passingCriteria(level: Level, group: GroupId): string {
  if (level === 'foundation') return 'Minimum 40% in every paper and 50% in aggregate';
  return `Minimum 40% in every paper and 50% aggregate per ${group === 'both' ? 'group' : 'selected group'}`;
}
