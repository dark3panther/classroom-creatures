import { DEFAULT_CATEGORIES, DEFAULT_MILESTONES, DEFAULT_NEGATIVE_CATEGORIES, DEFAULT_PRIZES, DEFAULT_SETTINGS } from '../data/defaults';
import { BRANCHES } from '../data/branches';
import { SPECIES_BY_ID } from '../data/species';
import type { AppData, EvolutionEntry, Settings, Stage, Student } from '../types';
import { formsOf, withDiscovered } from './collection';
import { validateProgression } from './progression';
import { DATA_VERSION } from './roster';

// coins / lifetimeXp / milestoneRewards are deliberately absent: migrate() derives them for old backups
const STUDENT_DEFAULTS = (): Pick<Student, 'equipped' | 'unlockedItems' | 'achievements' | 'tagCounts' | 'tagXp' | 'bestStage' | 'challengeCompletions' | 'createdAt'> => ({
  equipped: {}, unlockedItems: ['bg-habitat'], achievements: [], tagCounts: {}, tagXp: {},
  bestStage: 1, challengeCompletions: [], createdAt: Date.now(),
});

/**
 * Bring data saved by an older version up to date. Each step only ADDS fields with safe defaults:
 * XP, coins, creatures, owned and equipped items and history are never changed.
 *  - v1 → v2 (1.1): coins, milestone rewards, prize wheel, behaviour deductions. Existing students start
 *    with coins equal to the XP they already earned, and past milestones count as already handed out.
 *  - v2 → v3 (1.4): evolution mode and history, branching paths, abilities, interactions, class
 *    encyclopedia discoveries, sound and shop settings. Discoveries are seeded from every creature's
 *    current form; the evolution history is seeded from the stages already reached.
 */
export function migrate(data: AppData): AppData {
  let d = data;
  if ((d.version ?? 1) < 2 || !d.settings?.milestones) d = migrateV2(d);
  if ((d.version ?? 2) < 3) d = migrateV3(d);
  return normaliseV3(d);
}

function migrateV2(data: AppData): AppData {
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
    version: 2,
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

function migrateV3(data: AppData): AppData {
  const students = data.students.map((s) => {
    const best = clampStage(s.bestStage);
    const log: EvolutionEntry[] = Array.isArray(s.evolutionLog) ? s.evolutionLog
      : Array.from({ length: best - 1 }, (_, i) => ({ speciesId: s.speciesId, stage: (i + 2) as Stage, at: s.createdAt ?? Date.now() }));
    return { ...s, bestStage: best, evolutionLog: log };
  });
  const classes = data.classes.map((c) => withDiscovered(c, students.filter((s) => s.classId === c.id).flatMap((s) => formsOf(s))).cls);
  return { ...data, version: DATA_VERSION, students, classes };
}

const clampStage = (v: unknown): Stage => (typeof v === 'number' && v >= 1 && v <= 5 ? Math.round(v) : 1) as Stage;

/** Fill any v3 field that is missing or invalid (idempotent, safe to run on every load). */
function normaliseV3(data: AppData): AppData {
  const st = data.settings ?? ({} as Settings);
  const settings: Settings = {
    ...DEFAULT_SETTINGS, ...st,
    evolutionMode: st.evolutionMode === 'approval' ? 'approval' : 'auto',
    soundVolume: typeof st.soundVolume === 'number' && st.soundVolume >= 0 && st.soundVolume <= 1 ? st.soundVolume : DEFAULT_SETTINGS.soundVolume,
    uiSounds: !!st.uiSounds,
    disabledSpecies: Array.isArray(st.disabledSpecies) ? st.disabledSpecies.filter((x) => typeof x === 'string') : [],
    disabledItems: Array.isArray(st.disabledItems) ? st.disabledItems.filter((x) => typeof x === 'string') : [],
    itemPrices: st.itemPrices && typeof st.itemPrices === 'object' ? Object.fromEntries(Object.entries(st.itemPrices).filter(([, v]) => Number.isFinite(v) && v >= 0)) : {},
    shopWhileLocked: st.shopWhileLocked !== false,
  };
  const students = data.students.map((s) => {
    const out: Student = { ...s, bestStage: clampStage(s.bestStage) };
    if (out.branch !== 'a' && out.branch !== 'b') delete out.branch;
    if (out.branch && (out.bestStage < 5 || !BRANCHES[out.speciesId])) delete out.branch;
    if (!Array.isArray(out.evolutionLog)) out.evolutionLog = [];
    if (!out.skills || typeof out.skills !== 'object') out.skills = {};
    const i = out.interactions;
    out.interactions = { pet: num(i?.pet), feed: num(i?.feed), play: num(i?.play) };
    if (typeof out.nickname !== 'string' || !out.nickname.trim()) delete out.nickname;
    return out;
  });
  const classes = data.classes.map((c) => (Array.isArray(c.discovered) ? c : { ...c, discovered: [] }));
  return { ...data, version: DATA_VERSION, settings, students, classes };
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

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
