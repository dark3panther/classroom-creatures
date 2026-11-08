import { BRANCHES, BRANCH_STAGE } from '../data/branches';
import type { AppData, EvolutionEntry, Stage, Student } from '../types';
import { refreshStudent } from './awards';
import { recordDiscoveries } from './collection';
import { stageForXp } from './progression';

export interface EvolveResult { data: AppData; from: Stage; to: Stage; branch?: 'a' | 'b'; newAchievements: string[]; discovered: string[] }

/** The stage this creature would evolve into next (approval mode), or null when it is not ready. */
export function pendingStage(s: Pick<Student, 'xp' | 'bestStage'>, data: Pick<AppData, 'settings'>): Stage | null {
  if (stageForXp(s.xp, data.settings) <= s.bestStage || s.bestStage >= 5) return null;
  return (s.bestStage + 1) as Stage;
}

/** True when the next evolution is the one where this species chooses a path. */
export function needsBranchChoice(s: Pick<Student, 'speciesId' | 'bestStage'>): boolean {
  return s.bestStage + 1 === BRANCH_STAGE && !!BRANCHES[s.speciesId];
}

/**
 * The teacher confirms one evolution (approval mode, or a pending evolution in automatic mode).
 * Evolves one stage at a time; at the branching stage the chosen path is stored. Returns null when not ready.
 */
export function approveEvolution(data: AppData, studentId: string, branch?: 'a' | 'b', now = Date.now()): EvolveResult | null {
  const st = data.students.find((s) => s.id === studentId);
  if (!st) return null;
  const to = pendingStage(st, data);
  if (!to) return null;
  const from = st.bestStage;
  const chosen: 'a' | 'b' | undefined = to === BRANCH_STAGE && BRANCHES[st.speciesId] ? (branch ?? 'a') : undefined;
  const entry: EvolutionEntry = { speciesId: st.speciesId, stage: to, at: now, ...(chosen ? { branch: chosen } : {}) };
  const draft: Student = { ...st, bestStage: to, evolutionLog: [...(st.evolutionLog ?? []), entry], ...(chosen ? { branch: chosen } : {}) };
  let next: AppData = { ...data, students: data.students.map((s) => (s.id === studentId ? draft : s)) };
  const un = refreshStudent(next, studentId, now);
  next = un.data;
  const disc = recordDiscoveries(next, [studentId]);
  return { data: disc.data, from, to, branch: chosen, newAchievements: un.newAchievements, discovered: disc.added };
}

/** Log entries for stages gained automatically (several stages can be crossed by one big award). */
export function autoEvolutionEntries(s: Pick<Student, 'speciesId' | 'branch'>, from: Stage, to: Stage, now: number): EvolutionEntry[] {
  const out: EvolutionEntry[] = [];
  for (let st = from + 1; st <= to; st++) {
    const branch = st === BRANCH_STAGE && BRANCHES[s.speciesId] ? (s.branch ?? 'a') : undefined;
    out.push({ speciesId: s.speciesId, stage: st as Stage, at: now, ...(branch ? { branch } : {}) });
  }
  return out;
}
