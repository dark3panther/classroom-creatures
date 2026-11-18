import { DEFAULT_CATEGORIES, DEFAULT_MILESTONES, DEFAULT_NEGATIVE_CATEGORIES, DEFAULT_PRIZES, DEFAULT_SETTINGS } from '../data/defaults';
import { BRANCHES } from '../data/branches';
import { SPECIES_BY_ID } from '../data/species';
import { MIGRATED_REWARD, REGIONS_BY_ID, TAG_CATEGORY, freshQuests } from '../data/adventure';
import type { AdventureLogEntry, AppData, BossBattle, ClassRoom, EvolutionEntry, Quest, QuestRecord, RegionId, Settings, Stage, Student } from '../types';
import { formsOf, withDiscovered } from './collection';
import { validateProgression } from './progression';
import { DATA_VERSION, newClassAdventure } from './roster';

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
 *  - v3 → v4 (1.5): the World of Adventures. Every 1.4 challenge becomes a tracked quest in Verdant Valley
 *    (the `challenges` list itself is kept untouched), the starting quests that do not repeat one are
 *    added, and every challenge already completed is kept as a finished quest so it is not paid twice.
 */
export function migrate(data: AppData): AppData {
  let d = data;
  if ((d.version ?? 1) < 2 || !d.settings?.milestones) d = migrateV2(d);
  if ((d.version ?? 2) < 3) d = migrateV3(d);
  if ((d.version ?? 3) < 4) d = migrateV4(d);
  return normaliseV4(normaliseV3(d));
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
  return { ...data, version: 3, students, classes };
}

const questSignature = (q: Quest) => `${q.kind}|${q.requirement.type === 'tracked' ? `${q.requirement.metric}|${q.requirement.metric === 'count' ? q.requirement.tag ?? '' : ''}` : 'check'}`;

function migrateV4(data: AppData, now = Date.now()): AppData {
  const challenges = Array.isArray(data.challenges) ? data.challenges : [];
  const converted: Quest[] = challenges.filter((c) => c && typeof c.id === 'string').map((c) => ({
    id: `q-${c.id}`, classId: null, title: (c.title || 'Challenge').slice(0, 80),
    description: 'A challenge from before the World of Adventures, now a quest.',
    category: c.tag && c.metric === 'count' ? TAG_CATEGORY[c.tag] ?? 'custom' : 'behaviour',
    kind: c.period === 'weekly' ? 'weekly' : 'daily', regionId: 'verdant', assign: 'class',
    reward: { ...MIGRATED_REWARD[c.period === 'weekly' ? 'weekly' : 'daily'] },
    requirement: { type: 'tracked', metric: c.metric === 'xp' ? 'xp' : 'count', ...(c.metric !== 'xp' && c.tag ? { tag: c.tag } : {}), target: Math.max(1, Math.round(Number(c.target) || 1)) },
    approval: false, active: c.active !== false, createdAt: now, updatedAt: now, fromChallenge: c.id,
  }));
  const taken = new Set(converted.filter((q) => q.active).map(questSignature));
  const quests = [...converted, ...freshQuests(now).filter((q) => !taken.has(questSignature(q)))];
  const fromChallenge = new Map(converted.map((q) => [q.fromChallenge!, q.id]));
  // completions from 1.4 become finished quests: they show in the history and are never paid again
  const questRecords: QuestRecord[] = data.students.flatMap((s) => (s.challengeCompletions ?? [])
    .filter((cc) => fromChallenge.has(cc.challengeId))
    .map((cc) => ({
      id: `qr-${s.id}-${cc.challengeId}-${cc.periodKey}`, questId: fromChallenge.get(cc.challengeId)!, studentId: s.id, classId: s.classId,
      period: cc.periodKey, status: 'collected' as const,
      history: [{ status: 'collected' as const, at: cc.at, by: 'auto' as const, note: 'Completed before the World of Adventures' }],
      createdAt: cc.at, updatedAt: cc.at,
    })));
  const adventureLog: AdventureLogEntry[] = data.classes.map((c) => ({
    id: `log-woa-${c.id}`, at: now, kind: 'milestone', classId: c.id, title: 'The World of Adventures opens',
    detail: 'Verdant Valley is ready to explore.', regionId: 'verdant',
  }));
  return { ...data, version: 4, quests, questRecords, bosses: [], adventureLog, rewardLedger: {} };
}

const REGION_IDS = Object.keys(REGIONS_BY_ID) as RegionId[];
const isRegion = (v: unknown): v is RegionId => typeof v === 'string' && REGION_IDS.includes(v as RegionId);
const arr = <T,>(v: unknown, ok: (x: T) => boolean): T[] => (Array.isArray(v) ? (v as T[]).filter((x) => x && typeof x === 'object' && ok(x)) : []);

/** Fill any v4 (World of Adventures) field that is missing or damaged (idempotent, safe on every load). */
function normaliseV4(data: AppData): AppData {
  const st = data.settings;
  const settings: Settings = {
    ...st,
    adventureEnabled: st.adventureEnabled !== false,
    classWorld: st.classWorld !== false,
    adventureWhileLocked: st.adventureWhileLocked !== false,
  };
  const classes: ClassRoom[] = data.classes.map((c) => {
    const a = c.adventure;
    const base = newClassAdventure();
    if (!a || typeof a !== 'object') return { ...c, adventure: base };
    const regions = Object.fromEntries(Object.entries(a.regions ?? {}).filter(([k, v]) => isRegion(k) && (v === 'open' || v === 'locked')));
    const locations = Object.fromEntries(Object.entries(a.locations ?? {}).filter(([, v]) => typeof v === 'number' && v >= 0 && v <= 3).map(([k, v]) => [k, Math.round(v as number)]));
    const opened = Array.isArray(a.opened) ? [...new Set(a.opened.filter(isRegion))] : [];
    if (!opened.includes('verdant')) opened.unshift('verdant');
    return { ...c, adventure: { regions, locations: Object.keys(locations).length ? locations : base.locations, opened, milestones: Array.isArray(a.milestones) ? a.milestones.filter((m) => typeof m === 'string') : [] } };
  });
  const students: Student[] = data.students.map((s) => {
    const a = s.adventure;
    return {
      ...s,
      adventure: {
        visited: arr<{ regionId: RegionId; at: number }>(a?.visited, (v) => isRegion(v.regionId)),
        treasures: arr<{ id: string; at: number; coins: number }>(a?.treasures, (t) => typeof t.id === 'string'),
        bosses: arr<{ battleId: string; bossId: string; at: number }>(a?.bosses, (b) => typeof b.battleId === 'string'),
      },
    };
  });
  return {
    ...data,
    version: DATA_VERSION,
    settings,
    classes,
    students,
    quests: arr<Quest>(data.quests, (q) => typeof q.id === 'string' && !!q.requirement && !!q.reward && isRegion(q.regionId)),
    questRecords: arr<QuestRecord>(data.questRecords, (r) => typeof r.id === 'string' && typeof r.questId === 'string' && typeof r.studentId === 'string'),
    bosses: arr<BossBattle>(data.bosses, (b) => typeof b.id === 'string' && Array.isArray(b.contributions)),
    adventureLog: arr<AdventureLogEntry>(data.adventureLog, (e) => typeof e.id === 'string' && typeof e.at === 'number'),
    rewardLedger: data.rewardLedger && typeof data.rewardLedger === 'object' && !Array.isArray(data.rewardLedger) ? data.rewardLedger : {},
  };
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
    quests: Array.isArray(data.quests) ? data.quests : [],
    questRecords: Array.isArray(data.questRecords) ? data.questRecords : [],
    bosses: Array.isArray(data.bosses) ? data.bosses : [],
    adventureLog: Array.isArray(data.adventureLog) ? data.adventureLog : [],
    rewardLedger: data.rewardLedger && typeof data.rewardLedger === 'object' ? data.rewardLedger : {},
  };
  const migrated = migrate({ ...normalised, version: data.version ?? 1 });
  return {
    data: migrated,
    summary: { classes: migrated.classes.length, students: migrated.students.length, events: migrated.events.length, exportedAt: obj.exportedAt },
  };
}
