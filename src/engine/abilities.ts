import { abilitiesFor, MAX_RANK, type AbilityDef } from '../data/abilities';
import { getSpecies } from '../data/species';
import type { AppData, Settings, Student } from '../types';
import { refreshStudent } from './awards';
import { displayStage, levelForXp } from './progression';

type Prog = Pick<Settings, 'levelXp' | 'evolutionLevels'> & { evolutionMode?: Settings['evolutionMode'] };

/** Skill points: one per level after the first, minus what has been spent. */
export function skillPoints(s: Student, settings: Prog): { earned: number; spent: number; free: number } {
  const earned = Math.max(0, levelForXp(s.xp, settings.levelXp) - 1);
  // only this creature's current tree counts (a new species or path gives its points back)
  const ids = new Set(abilitiesFor(getSpecies(s.speciesId), s.branch).map((a) => a.id));
  const spent = Object.entries(s.skills ?? {}).reduce((n, [k, v]) => n + (ids.has(k) ? Math.max(0, v) : 0), 0);
  return { earned, spent, free: Math.max(0, earned - spent) };
}

/** The level a rank needs: rank 1 at the tier's evolution level, each further rank one level later. */
export function rankLevel(a: AbilityDef, rank: number, settings: Prog): number {
  const base = settings.evolutionLevels[a.stage - 1] ?? 1;
  return Math.min(settings.levelXp.length, base + (rank - 1));
}

export type AbilityStatus = 'max' | 'upgrade' | 'unlock' | 'needsPoint' | 'needsLevel' | 'needsStage';

export interface AbilityView { def: AbilityDef; rank: number; status: AbilityStatus; nextLevel: number | null; nextXp: number | null }

/** Every ability of a creature with its rank and what it needs next. */
export function abilityTree(s: Student, settings: Prog): AbilityView[] {
  const sp = getSpecies(s.speciesId);
  const stage = displayStage(s, settings);
  const level = levelForXp(s.xp, settings.levelXp);
  const { free } = skillPoints(s, settings);
  return abilitiesFor(sp, s.branch).map((def) => {
    const rank = Math.min(MAX_RANK, Math.max(0, s.skills?.[def.id] ?? 0));
    if (rank >= MAX_RANK) return { def, rank, status: 'max', nextLevel: null, nextXp: null };
    const nextLevel = rankLevel(def, rank + 1, settings);
    const nextXp = settings.levelXp[nextLevel - 1] ?? null;
    let status: AbilityStatus;
    if (stage < def.stage) status = 'needsStage';
    else if (level < nextLevel) status = 'needsLevel';
    else if (free < 1) status = 'needsPoint';
    else status = rank === 0 ? 'unlock' : 'upgrade';
    return { def, rank, status, nextLevel, nextXp };
  });
}

/** Spend one skill point on an ability (awaken it or raise its rank). Returns null when not allowed. */
export function raiseAbility(data: AppData, studentId: string, abilityId: string, now = Date.now()): AppData | null {
  const s = data.students.find((x) => x.id === studentId);
  if (!s) return null;
  const view = abilityTree(s, data.settings).find((v) => v.def.id === abilityId);
  if (!view || (view.status !== 'unlock' && view.status !== 'upgrade')) return null;
  const next: AppData = { ...data, students: data.students.map((x) => (x.id === studentId ? { ...x, skills: { ...(x.skills ?? {}), [abilityId]: view.rank + 1 } } : x)) };
  return refreshStudent(next, studentId, now).data;
}

/** Give back every point (free respec; abilities are cosmetic). Achievements already earned are kept. */
export function resetAbilities(data: AppData, studentId: string): AppData {
  return { ...data, students: data.students.map((x) => (x.id === studentId ? { ...x, skills: {} } : x)) };
}
