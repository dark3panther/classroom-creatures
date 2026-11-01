import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../data/defaults';
import { SPECIES_BY_ID } from '../data/species';
import type { AppData, Student } from '../types';
import { validateProgression } from './progression';
import { DATA_VERSION } from './roster';

const STUDENT_DEFAULTS = (): Pick<Student, 'equipped' | 'unlockedItems' | 'achievements' | 'tagCounts' | 'tagXp' | 'bestStage' | 'challengeCompletions' | 'createdAt'> => ({
  equipped: {}, unlockedItems: ['bg-habitat'], achievements: [], tagCounts: {}, tagXp: {},
  bestStage: 1, challengeCompletions: [], createdAt: Date.now(),
});

export const BACKUP_KIND = 'classroom-creatures-backup';

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  exportedAt: string;
  version: number;
  data: AppData;
}

export function toBackup(data: AppData, now = new Date()): BackupFile {
  // the PIN is device-local and never leaves this computer inside a backup file
  return { kind: BACKUP_KIND, exportedAt: now.toISOString(), version: DATA_VERSION, data: { ...data, settings: { ...data.settings, pinHash: null } } };
}

export interface BackupSummary { classes: number; students: number; events: number; exportedAt?: string }

/**
 * Validate and normalise an imported backup (or a raw AppData object).
 * Throws an Error with a teacher-friendly message when the file is not usable.
 */
export function parseBackup(json: string): { data: AppData; summary: BackupSummary } {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error('This file is not a Classroom Creatures backup (it is not valid JSON).'); }
  const obj = raw as Partial<BackupFile> & Partial<AppData>;
  const data = (obj && obj.kind === BACKUP_KIND ? obj.data : obj) as AppData | undefined;
  if (!data || !Array.isArray(data.classes) || !Array.isArray(data.students)) {
    throw new Error('This file does not look like a Classroom Creatures backup.');
  }
  if ((data.version ?? 1) > DATA_VERSION) throw new Error('This backup was made by a newer version of Classroom Creatures.');
  const classIds = new Set(data.classes.map((c) => c.id));
  for (const s of data.students) {
    if (typeof s.id !== 'string' || typeof s.name !== 'string' || !classIds.has(s.classId)) {
      throw new Error('The backup has a student record that is damaged or belongs to a missing class.');
    }
  }
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
  if (validateProgression(settings.levelXp, settings.evolutionLevels)) {
    settings.levelXp = DEFAULT_SETTINGS.levelXp;
    settings.evolutionLevels = DEFAULT_SETTINGS.evolutionLevels;
  }
  const normalised: AppData = {
    version: DATA_VERSION,
    classes: data.classes.map((c) => ({ ...({ goal: 1000, archived: false, grade: '' } as const), ...c })),
    students: data.students.map((s) => ({
      ...STUDENT_DEFAULTS(),
      ...s,
      speciesId: SPECIES_BY_ID[s.speciesId] ? s.speciesId : 'emberpup',
      xp: Math.max(0, Number(s.xp) || 0),
    })),
    categories: Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    events: Array.isArray(data.events) ? data.events : [],
    challenges: Array.isArray(data.challenges) ? data.challenges : [],
    settings,
  };
  return {
    data: normalised,
    summary: { classes: normalised.classes.length, students: normalised.students.length, events: normalised.events.length, exportedAt: obj.exportedAt },
  };
}
