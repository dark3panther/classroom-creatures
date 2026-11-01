import type { Settings, Stage } from '../types';

/** Level (1-based) reached with `xp` total XP. */
export function levelForXp(xp: number, levelXp: number[]): number {
  let level = 1;
  for (let i = 0; i < levelXp.length; i++) if (xp >= levelXp[i]) level = i + 1;
  return level;
}

export function maxLevel(levelXp: number[]): number {
  return levelXp.length;
}

/** Stage (1..5) for a level, given the level at which each stage begins. */
export function stageForLevel(level: number, evolutionLevels: Settings['evolutionLevels']): Stage {
  let stage = 1;
  for (let i = 0; i < evolutionLevels.length; i++) if (level >= evolutionLevels[i]) stage = i + 1;
  return stage as Stage;
}

export function stageForXp(xp: number, s: Pick<Settings, 'levelXp' | 'evolutionLevels'>): Stage {
  return stageForLevel(levelForXp(xp, s.levelXp), s.evolutionLevels);
}

export interface LevelProgress {
  level: number;
  isMax: boolean;
  /** XP into the current level */
  into: number;
  /** XP span of the current level (0 at max) */
  span: number;
  /** 0..1 */
  pct: number;
  toNext: number;
}

export function levelProgress(xp: number, levelXp: number[]): LevelProgress {
  const level = levelForXp(xp, levelXp);
  const isMax = level >= levelXp.length;
  if (isMax) return { level, isMax, into: xp - levelXp[level - 1], span: 0, pct: 1, toNext: 0 };
  const start = levelXp[level - 1];
  const end = levelXp[level];
  const span = end - start;
  return { level, isMax, into: xp - start, span, pct: span > 0 ? (xp - start) / span : 1, toNext: end - xp };
}

/** XP needed to reach the next evolution stage, or null at Legendary. */
export function nextEvolution(xp: number, s: Pick<Settings, 'levelXp' | 'evolutionLevels'>): { stage: Stage; level: number; xpNeeded: number; atXp: number } | null {
  const stage = stageForXp(xp, s);
  if (stage >= 5) return null;
  const level = (s.evolutionLevels as readonly number[])[stage]; // level where stage+1 begins
  const atXp = s.levelXp[Math.min(level, s.levelXp.length) - 1] ?? Infinity;
  return { stage: (stage + 1) as Stage, level, atXp, xpNeeded: Math.max(0, atXp - xp) };
}

/** Stage to show: never below the best stage reached (undo lowers bestStage itself). */
export function displayStage(s: { xp: number; bestStage: Stage }, st: Pick<Settings, 'levelXp' | 'evolutionLevels'>): Stage {
  return Math.max(stageForXp(s.xp, st), s.bestStage) as Stage;
}

/** Lowest XP that still keeps `stage`. Used to make negative points never undo an evolution. */
export function stageFloorXp(stage: Stage, s: Pick<Settings, 'levelXp' | 'evolutionLevels'>): number {
  const level = s.evolutionLevels[stage - 1];
  return s.levelXp[level - 1] ?? 0;
}

/** Validates a teacher-edited progression table. Returns an error message or null. */
export function validateProgression(levelXp: number[], evolutionLevels: number[]): string | null {
  if (levelXp.length < 5) return 'Please keep at least 5 levels.';
  if (levelXp[0] !== 0) return 'Level 1 must start at 0 XP.';
  for (let i = 1; i < levelXp.length; i++) {
    if (!Number.isFinite(levelXp[i]) || levelXp[i] <= levelXp[i - 1]) return `Level ${i + 1} must need more XP than level ${i}.`;
  }
  if (evolutionLevels.length !== 5) return 'There must be exactly 5 evolution stages.';
  if (evolutionLevels[0] !== 1) return 'The Baby stage must start at level 1.';
  for (let i = 1; i < 5; i++) {
    if (evolutionLevels[i] <= evolutionLevels[i - 1]) return 'Each evolution must happen at a higher level than the one before.';
    if (evolutionLevels[i] > levelXp.length) return `Evolution level ${evolutionLevels[i]} is above the highest level (${levelXp.length}).`;
  }
  return null;
}
