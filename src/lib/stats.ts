import { useMemo } from 'react';
import { getSpecies } from '../data/species';
import { displayStage, levelProgress, nextEvolution } from '../engine/progression';
import { useStore } from '../store/store';
import type { Settings, Student } from '../types';

export function studentView(s: Student, settings: Pick<Settings, 'levelXp' | 'evolutionLevels'>) {
  const species = getSpecies(s.speciesId);
  const prog = levelProgress(s.xp, settings.levelXp);
  const stage = displayStage(s, settings);
  return { species, prog, stage, level: prog.level, next: nextEvolution(s.xp, settings) };
}

export function useStudentView(s: Student | undefined) {
  const levelXp = useStore((st) => st.data.settings.levelXp);
  const evolutionLevels = useStore((st) => st.data.settings.evolutionLevels);
  return useMemo(() => (s ? studentView(s, { levelXp, evolutionLevels }) : null), [s, levelXp, evolutionLevels]);
}

export function useClassStudents(classId: string | undefined) {
  const students = useStore((s) => s.data.students);
  return useMemo(() => students.filter((s) => s.classId === classId), [students, classId]);
}
