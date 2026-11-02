import { DEFAULT_CATEGORIES, DEFAULT_MILESTONES, DEFAULT_NEGATIVE_CATEGORIES, DEFAULT_PRIZES, DEFAULT_SETTINGS } from '../data/defaults';
import { SPECIES_BY_ID } from '../data/species';
import type { AppData, Settings, Student } from '../types';
import { validateProgression } from './progression';
import { DATA_VERSION } from './roster';

// coins / lifetimeXp / milestoneRewards are deliberately absent: migrate() derives them for old backups
const STUDENT_DEFAULTS = (): Pick<Student, 'equipped' | 'unlockedItems' | 'achievements' | 'tagCounts' | 'tagXp' | 'bestStage' | 'challengeCompletions' | 'createdAt'> => ({
  equipped: {}, unlockedItems: ['bg-habitat'], achievements: [], tagCounts: {}, tagXp: {},
  bestStage: 1, challengeCompletions: [], createdAt: Date.now(),
});

/**
 * Bring data saved by an older version up to date (v1.0 → v1.1: coins, milestone rewards,
 * prize wheel, behaviour deductions). Existing students start with coins equal to the XP
 * they already earned, and their past milestones are counted as already handed out.
 */
export function migrate(data: AppData): AppData {
  if ((data.version ?? 1) >= DATA_VERSION && data.settings?.milestones) return data;
  const settings: Settings = {
    ...DEFAULT_SETTINGS, ...data.settings,
    coinRate: data.settings?.coinRate ?? 1,
    milestones: data.settings?.milestones ?? DEFAULT_MILESTONES.map((m) => ({ ...m })),
    prizes: data.settings?.prizes ?? DEFAULT_PRIZES.map((p) => ({ ...p })),
    negativeEnabled: true,
  };
  const oldNeg = new Set(['neg-focus', 'neg-kind']);
  let categories = (data.categories ?? []).filter((c) => !oldNeg.has(c.id));
  for (const n of DEFAULT_NEGATIVE_CATEGORIES) if (!categories.some((c) => c.id === n.id)) categories = [...categories, { ...n }];
  return {
    ...data,
    version: DATA_VERSION,
    settings,
    categories,
    classes: data.classes.map((c) => ({ ...c, goalStep: c.goalStep ?? 1000, prizeHistory: c.prizeHistory ?? [] })),
    students: data.students.map((s) => {
      const lifetimeXp = s.lifetimeXp ?? s.xp;
      const milestoneRewards = s.milestoneRewards ?? settings.milestones.flatMap((m) =>
        Array.from({ length: Math.floor(lifetimeXp / m.every) }, (_, i) => ({
          id: `${s.id}-${m.id}-${i + 1}`, milestoneId: m.id, label: m.label, icon: m.icon, atXp: (i + 1) * m.every, at: s.createdAt, given: true,
        })));
      return { ...s, coins: s.coins ?? Math.round(s.xp * settings.coinRate), lifetimeXp, milestoneRewards };
    }),
  };
}

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
    })) as Student[],
    categories: Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    events: Array.isArray(data.events) ? data.events : [],
    challenges: Array.isArray(data.challenges) ? data.challenges : [],
    settings,
  };
  const migrated = migrate({ ...normalised, version: data.version ?? 1 });
  return {
    data: migrated,
    summary: { classes: migrated.classes.length, students: migrated.students.length, events: migrated.events.length, exportedAt: obj.exportedAt },
  };
}
