import { useMemo } from 'react';
import { getSpecies } from '../data/species';
import { displayStage, levelProgress, nextEvolution, readyToEvolve, stageFloorXp } from '../engine/progression';
import { useStore } from '../store/store';
import type { Settings, Stage, Student } from '../types';

type ProgSettings = Pick<Settings, 'levelXp' | 'evolutionLevels'> & { evolutionMode?: Settings['evolutionMode'] };

/** Progress toward the next evolution of the stage this creature SHOWS (approval mode may be waiting). */
export interface EvolutionProgress { stage: Stage; next: Stage | null; fromXp: number; atXp: number; pct: number; xpNeeded: number; ready: boolean; level: number | null }

export function evolutionProgress(s: Student, settings: ProgSettings): EvolutionProgress {
  const stage = displayStage(s, settings);
  if (stage >= 5) return { stage, next: null, fromXp: 0, atXp: 0, pct: 1, xpNeeded: 0, ready: false, level: null };
  const next = (stage + 1) as Stage;
  const fromXp = stageFloorXp(stage, settings);
  const atXp = stageFloorXp(next, settings);
  const ready = readyToEvolve(s, settings);
  const span = Math.max(1, atXp - fromXp);
  return { stage, next, fromXp, atXp, pct: ready ? 1 : Math.max(0, Math.min(1, (s.xp - fromXp) / span)), xpNeeded: ready ? 0 : Math.max(0, atXp - s.xp), ready, level: (settings.evolutionLevels as readonly number[])[stage] ?? null };
}

export function studentView(s: Student, settings: ProgSettings) {
  const species = getSpecies(s.speciesId);
  const prog = levelProgress(s.xp, settings.levelXp);
  const stage = displayStage(s, settings);
  const evo = evolutionProgress(s, settings);
  // the next evolution is always counted from the stage on show
  const xpNext = nextEvolution(s.xp, settings);
  const next = evo.next ? { stage: evo.next, level: evo.level ?? xpNext?.level ?? 0, atXp: evo.atXp, xpNeeded: evo.xpNeeded } : null;
  return { species, prog, stage, level: prog.level, next, evo };
}

export function useStudentView(s: Student | undefined) {
  const levelXp = useStore((st) => st.data.settings.levelXp);
  const evolutionLevels = useStore((st) => st.data.settings.evolutionLevels);
  const evolutionMode = useStore((st) => st.data.settings.evolutionMode);
  return useMemo(() => (s ? studentView(s, { levelXp, evolutionLevels, evolutionMode }) : null), [s, levelXp, evolutionLevels, evolutionMode]);
}

export function useClassStudents(classId: string | undefined) {
  const students = useStore((s) => s.data.students);
  return useMemo(() => students.filter((s) => s.classId === classId), [students, classId]);
}
