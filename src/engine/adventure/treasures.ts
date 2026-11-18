import { REGIONS, TREASURES, TREASURES_BY_ID, type TreasureDef } from '../../data/adventure';
import type { AppData, Student } from '../../types';
import { applyReward } from '../awards';
import { levelForXp } from '../progression';
import { AdventureError, type Actor, type AdventureResult, addLog, ctxOf, getStudent, patchStudentAdv, refreshBadges, requireSelfOrTeacher, result, studentAdv } from './core';
import { isDone } from './world';

/** How far a student is towards a treasure's requirement. Predetermined: no chance involved. */
export function treasureProgress(data: AppData, s: Student, def: TreasureDef): { value: number; target: number } {
  const a = studentAdv(s);
  const r = def.rule;
  switch (r.kind) {
    case 'visit': return { value: a.visited.some((v) => v.regionId === r.regionId) ? 1 : 0, target: 1 };
    case 'visitAll': return { value: REGIONS.filter((x) => a.visited.some((v) => v.regionId === x.id)).length, target: REGIONS.length };
    case 'boss': return { value: a.bosses.some((b) => b.bossId === r.bossId) ? 1 : 0, target: 1 };
    case 'level': return { value: Math.min(levelForXp(s.xp, data.settings.levelXp), r.level), target: r.level };
    case 'relics': return { value: TREASURES.filter((t) => t.kind === 'relic' && a.treasures.some((x) => x.id === t.id)).length, target: REGIONS.length };
    case 'quests': case 'regionQuests': {
      const regionQuests = r.kind === 'regionQuests' ? new Set(data.quests.filter((q) => q.regionId === r.regionId).map((q) => q.id)) : null;
      const n = data.questRecords.filter((x) => x.studentId === s.id && isDone(x.status) && (!regionQuests || regionQuests.has(x.questId))).length;
      return { value: Math.min(n, r.count), target: r.count };
    }
  }
}

export type TreasureState = 'locked' | 'ready' | 'opened';

export function treasureState(data: AppData, s: Student, def: TreasureDef): { state: TreasureState; value: number; target: number } {
  const p = treasureProgress(data, s, def);
  if (studentAdv(s).treasures.some((t) => t.id === def.id)) return { state: 'opened', ...p, value: p.target };
  return { state: p.value >= p.target ? 'ready' : 'locked', ...p };
}

/** What opening the chest will give this student right now (an owned item turns into its coin value). */
export function treasureContents(s: Student, def: TreasureDef): { coins: number; itemId?: string } {
  if (!def.itemId) return { coins: def.coins };
  return s.unlockedItems.includes(def.itemId) ? { coins: def.coins } : { coins: 0, itemId: def.itemId };
}

/**
 * Open a ready chest (a student for themself, or the teacher for a student). Exactly what it says, exactly
 * once: ledger key treasure:<id>:<student id>.
 */
export function openTreasure(data: AppData, actor: Actor, studentId: string, treasureId: string, now = Date.now()): AdventureResult {
  requireSelfOrTeacher(actor, studentId, 'open treasure');
  const def = TREASURES_BY_ID[treasureId];
  if (!def) throw new AdventureError('There is no such treasure.', 'missing');
  const s = getStudent(data, studentId);
  const st = treasureState(data, s, def);
  const key = `treasure:${def.id}:${s.id}`;
  if (st.state === 'opened' || data.rewardLedger[key]) throw new AdventureError('This chest is already open.', 'state');
  if (st.state !== 'ready') throw new AdventureError('This chest is still locked.', 'state');
  const c = ctxOf(data, now);
  const gift = treasureContents(s, def);
  // the treasure is recorded first so its item counts as earned when badges and items are checked
  patchStudentAdv(c, s.id, (a) => ({ ...a, treasures: [...a.treasures, { id: def.id, at: now, coins: gift.coins, ...(gift.itemId ? { itemId: gift.itemId } : {}) }] }));
  let batchId: string | undefined;
  if (gift.coins > 0 || gift.itemId) {
    const r = applyReward(c.data, [{ studentId: s.id, key, xp: 0, coins: gift.coins, itemId: gift.itemId }], { kind: 'treasure', ref: def.id, label: `Treasure: ${def.name}`, icon: '🧰' }, now);
    c.data = r.data;
    c.outcomes.push(...r.outcomes);
    batchId = r.batchId;
    patchStudentAdv(c, s.id, (a) => ({ ...a, treasures: a.treasures.map((t) => (t.id === def.id ? { ...t, batchId } : t)) }));
    for (const o of r.outcomes) for (const a of o.newAchievements) c.notes.push({ type: 'achievement', studentId: o.studentId, achievementId: a });
  } else {
    // a relic is a keepsake: nothing to spend, but it is still recorded once in the ledger
    c.data = { ...c.data, rewardLedger: { ...c.data.rewardLedger, [key]: { at: now, batchId: '' } } };
    refreshBadges(c, [s.id]);
  }
  addLog(c, { kind: 'treasure', classId: s.classId, studentId: s.id, ref: def.id, regionId: def.regionId, title: `Found ${def.name}`, detail: def.description, coins: gift.coins || undefined, itemId: gift.itemId });
  c.notes.push({ type: 'treasure', studentId: s.id, treasureId: def.id, coins: gift.coins, itemId: gift.itemId });
  return result(c);
}

/** Every treasure with its state for one student. */
export function treasureList(data: AppData, s: Student) {
  return TREASURES.map((def) => ({ def, ...treasureState(data, s, def), contents: treasureContents(s, def) }));
}
