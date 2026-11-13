import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { GroupId, Level, SubjectConfig, SubjectMeta } from '../types';
import {
  CURRICULUM, groupLabel as groupLabelFor, keySuffix, levelLabel as levelLabelFor, passingCriteria as passingFor,
  subjectMeta, subjectsInGroup,
} from '../config/curriculum';
import { KEYS, ensureSchema, readJSON, readRaw, removeKey, writeJSON, writeRaw } from '../lib/storage';

export interface GroupConfig { id: GroupId; name: string; papers: string[] }

interface LevelContextType {
  level: Level;
  selectedGroup: GroupId;
  /** Names of the subjects the student chose to track. */
  activeSubjects: string[];
  /** Active subjects (filtered by group and selection). */
  subjects: SubjectConfig[];
  /** Every subject in the selected group (used by pickers and analytics). */
  allSubjectsInGroup: SubjectConfig[];
  groups: GroupConfig[];
  totalMarks: number;
  totalPapers: number;
  passingCriteria: string;
  levelLabel: string;
  groupLabel: string;
  /** Storage key suffix: `foundation`, `inter`, `inter_group1`… */
  suffix: string;
  hasLevelSelected: boolean;
  setLevel: (lvl: Level) => void;
  setSelectedGroup: (grp: GroupId) => void;
  setLevelAndGroup: (lvl: Level, grp: GroupId) => void;
  setActiveSubjects: (subs: string[]) => void;
  /** First-run: choose level, group and subjects in one go. */
  completeSetup: (cfg: { level: Level; group: GroupId; activeSubjects: string[] }) => void;
  getSubjectMetadata: (subjectName: string) => SubjectMeta;
  getTargetKeySuffix: () => string;
}

const Ctx = createContext<LevelContextType | undefined>(undefined);

const isLevel = (v: unknown): v is Level => v === 'foundation' || v === 'inter' || v === 'final';
const isGroup = (v: unknown): v is GroupId => v === 'group1' || v === 'group2' || v === 'both';

function loadLevel(): Level {
  const v = readRaw(KEYS.level);
  return isLevel(v) ? v : 'inter';
}
function loadGroup(level: Level): GroupId {
  const saved = readRaw(KEYS.group(level));
  if (isGroup(saved)) return level === 'foundation' ? 'both' : saved;
  const legacy = readRaw('ca_group_selected');
  return isGroup(legacy) && level !== 'foundation' ? legacy : 'both';
}
function loadActive(level: Level): string[] {
  const names = CURRICULUM[level].map((s) => s.name);
  const saved = readJSON<unknown>(KEYS.activeSubjects(level), null);
  if (Array.isArray(saved)) {
    const kept = saved.filter((n): n is string => typeof n === 'string');
    if (kept.length) return kept;
  }
  const legacy = readJSON<unknown>('ca_active_subjects', null);
  if (Array.isArray(legacy) && legacy.some((n) => names.includes(n))) return legacy.filter((n): n is string => typeof n === 'string');
  return names;
}
const defaultActive = (lvl: Level, grp: GroupId) => subjectsInGroup(lvl, grp).map((s) => s.name);

export function LevelProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<Level>(() => { ensureSchema(); return loadLevel(); });
  const [selectedGroup, setGroupState] = useState<GroupId>(() => loadGroup(loadLevel()));
  const [activeSubjects, setActiveState] = useState<string[]>(() => loadActive(loadLevel()));
  const [hasLevelSelected, setHasLevelSelected] = useState<boolean>(() => !!readRaw(KEYS.level));

  const apply = useCallback((lvl: Level, grp: GroupId, active: string[]) => {
    const g = lvl === 'foundation' ? 'both' : grp;
    setLevelState(lvl); setGroupState(g); setActiveState(active);
    writeRaw(KEYS.level, lvl);
    writeRaw(KEYS.group(lvl), g);
    writeJSON(KEYS.activeSubjects(lvl), active);
  }, []);

  const setLevel = useCallback((lvl: Level) => {
    const grp = loadGroup(lvl);
    apply(lvl, grp, loadActive(lvl));
  }, [apply]);

  const setLevelAndGroup = useCallback((lvl: Level, grp: GroupId) => {
    apply(lvl, grp, defaultActive(lvl, lvl === 'foundation' ? 'both' : grp));
  }, [apply]);

  const setSelectedGroup = useCallback((grp: GroupId) => {
    apply(level, grp, defaultActive(level, grp));
  }, [apply, level]);

  const setActiveSubjects = useCallback((subs: string[]) => {
    setActiveState(subs);
    writeJSON(KEYS.activeSubjects(level), subs);
  }, [level]);

  const completeSetup = useCallback((cfg: { level: Level; group: GroupId; activeSubjects: string[] }) => {
    apply(cfg.level, cfg.group, cfg.activeSubjects);
    setHasLevelSelected(true);
  }, [apply]);

  const allSubjectsInGroup = useMemo(() => subjectsInGroup(level, selectedGroup), [level, selectedGroup]);
  const subjects = useMemo(() => allSubjectsInGroup.filter((s) => activeSubjects.includes(s.name)), [allSubjectsInGroup, activeSubjects]);
  const groups = useMemo<GroupConfig[]>(() => {
    if (level === 'foundation') return [{ id: 'both', name: 'All papers', papers: CURRICULUM.foundation.map((s) => s.name) }];
    const list = CURRICULUM[level];
    return [
      { id: 'group1', name: 'Group I', papers: list.filter((s) => s.group === 'group1').map((s) => s.name) },
      { id: 'group2', name: 'Group II', papers: list.filter((s) => s.group === 'group2').map((s) => s.name) },
    ];
  }, [level]);

  const getSubjectMetadata = useCallback((name: string) => subjectMeta(level, name), [level]);
  const suffix = keySuffix(level, selectedGroup);
  const getTargetKeySuffix = useCallback(() => suffix, [suffix]);

  const value = useMemo<LevelContextType>(() => ({
    level, selectedGroup, activeSubjects, subjects, allSubjectsInGroup, groups,
    totalMarks: allSubjectsInGroup.reduce((sum, s) => sum + s.marks, 0),
    totalPapers: allSubjectsInGroup.length,
    passingCriteria: passingFor(level, selectedGroup),
    levelLabel: levelLabelFor(level), groupLabel: groupLabelFor(level, selectedGroup),
    suffix, hasLevelSelected,
    setLevel, setSelectedGroup, setLevelAndGroup, setActiveSubjects, completeSetup, getSubjectMetadata, getTargetKeySuffix,
  }), [level, selectedGroup, activeSubjects, subjects, allSubjectsInGroup, groups, suffix, hasLevelSelected,
    setLevel, setSelectedGroup, setLevelAndGroup, setActiveSubjects, completeSetup, getSubjectMetadata, getTargetKeySuffix]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLevelConfig(): LevelContextType {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLevelConfig must be used within a LevelProvider');
  return c;
}

/** Remove level selection (used by "reset app"). */
export function resetLevelSelection() { removeKey(KEYS.level); }
