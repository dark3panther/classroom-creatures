import { ACHIEVEMENTS_BY_ID } from '../../data/defaults';
import type { AppData, AwardEvent, Equipped } from '../../types';
import { achievementMet, undoBatch, type AwardResult } from '../awards';
import { hitBoss, expireBattles } from './bosses';
import { type AdventureResult, ctxOf, result } from './core';
import { questProgress, questWindow, syncTrackedQuests } from './quests';
import { syncWorld } from './world';

/**
 * What an award changes in the adventure: positive awards hit the class's boss, tracked quests complete,
 * and new regions or decorations may open. Corrections and adventure rewards are not activity.
 */
export function afterAward(award: AwardResult, now = Date.now()): AdventureResult {
  const c = ctxOf(award.data, now);
  if (!award.outcomes.length || !c.data.settings.adventureEnabled) return result(c);
  const events = c.data.events.filter((e) => e.batchId === award.batchId && !e.undone);
  const classIds = [...new Set(events.map((e) => e.classId))];
  expireBattles(c, classIds);
  for (const e of events) {
    if (e.xp > 0 && !e.adjust && !e.reward) hitBoss(c, e.classId, { studentId: e.studentId, amount: e.xp, source: 'award', ref: award.batchId, label: e.categoryName });
  }
  syncTrackedQuests(c, events.map((e) => e.studentId), award.batchId);
  for (const id of classIds) syncWorld(c, id);
  return result(c);
}

const without = (equipped: Equipped, itemId: string): Equipped =>
  Object.fromEntries(Object.entries(equipped).filter(([, v]) => v !== itemId)) as Equipped;

/**
 * Undo a batch with its adventure consequences. An award: its boss hits come off a running battle and a
 * tracked quest it completed (not yet collected) is taken back. A reward: the ledger entry is cleared so it
 * can be collected again, and the quest goes back to approved. A befriended boss stays a friend.
 */
export function undoAdventure(data: AppData, batchId: string, now = Date.now()): AppData {
  const batch = data.events.filter((e) => e.batchId === batchId && !e.undone);
  if (!batch.length) return data;
  const rewards = batch.filter((e): e is AwardEvent & { reward: NonNullable<AwardEvent['reward']> } => !!e.reward);
  let d = data;

  if (rewards.length) {
    const ledger = { ...d.rewardLedger };
    for (const e of rewards) delete ledger[e.reward.key];
    d = { ...d, rewardLedger: ledger };
    for (const e of rewards) {
      const { kind, ref } = e.reward;
      if (kind === 'quest') {
        d = { ...d, questRecords: d.questRecords.map((r) => (r.id === ref && r.status === 'collected'
          ? { ...r, status: 'approved', rewardBatchId: undefined, updatedAt: now, history: [...r.history, { status: 'approved', at: now, by: 'teacher', note: 'Reward undone' }] }
          : r)) };
      }
      d = { ...d, students: d.students.map((s) => {
        if (s.id !== e.studentId || !s.adventure) return s;
        const a = s.adventure;
        if (kind === 'treasure') return { ...s, adventure: { ...a, treasures: a.treasures.filter((t) => !(t.id === ref && t.batchId === batchId)) } };
        return s;
      }) };
    }
    d = { ...d, adventureLog: d.adventureLog.filter((l) => !(l.kind === 'treasure' && rewards.some((e) => e.reward.kind === 'treasure' && e.reward.ref === l.ref && e.studentId === l.studentId))) };
    d = undoBatch(d, batchId);
    // items a reward handed out go back too (shop items would otherwise be kept on undo)
    for (const e of rewards) {
      const itemId = e.reward.itemId;
      if (!itemId) continue;
      d = { ...d, students: d.students.map((s) => (s.id === e.studentId ? { ...s, unlockedItems: s.unlockedItems.filter((i) => i !== itemId), equipped: without(s.equipped, itemId) } : s)) };
    }
    return d;
  }

  d = undoBatch(d, batchId);
  // the award's boss hits come off battles that are still running
  d = { ...d, bosses: d.bosses.map((b) => (b.status === 'active' || b.status === 'paused'
    ? { ...b, contributions: b.contributions.filter((x) => !(x.source === 'award' && x.ref === batchId)) } : b)) };
  // tracked quests this award completed are taken back when the target is no longer met and nothing was collected
  const removed = d.questRecords.filter((r) => r.sourceBatchId === batchId && (r.status === 'submitted' || r.status === 'approved'));
  const gone = new Set<string>();
  for (const r of removed) {
    const q = d.quests.find((x) => x.id === r.questId);
    // still met by the other awards of the same period (counted up to now, within that period)?
    if (q && questProgress(q, r.studentId, d.events, Math.min(now, questWindow(q, r.createdAt).to - 1)).done) continue;
    gone.add(r.id);
  }
  if (gone.size) {
    const recs = d.questRecords.filter((r) => gone.has(r.id));
    d = {
      ...d,
      questRecords: d.questRecords.filter((r) => !gone.has(r.id)),
      adventureLog: d.adventureLog.filter((l) => !(l.ref && gone.has(l.ref))),
      bosses: d.bosses.map((b) => (b.status === 'active' || b.status === 'paused' ? { ...b, contributions: b.contributions.filter((x) => !(x.source === 'quest' && x.ref && gone.has(x.ref))) } : b)),
      students: d.students.map((s) => {
        const mine = recs.filter((r) => r.studentId === s.id);
        if (!mine.length) return s;
        const since = Math.min(...mine.map((r) => r.createdAt));
        const draft = { ...s, challengeCompletions: s.challengeCompletions.filter((cc) => !mine.some((r) => r.questId === cc.challengeId && r.period === cc.periodKey)) };
        // badges earned since then that are no longer met (Quest Champion and friends) go too
        draft.achievements = s.achievements.filter((a) => {
          if (a.at < since) return true;
          const def = ACHIEVEMENTS_BY_ID[a.id];
          return def ? achievementMet(def, draft, d.settings, d.classes.find((cl) => cl.id === draft.classId)) : true;
        });
        return draft;
      }),
    };
  }
  return d;
}

/** Keep the world in step after any change that may have added points (used on load). */
export function syncAllWorlds(data: AppData, now = Date.now()): AppData {
  const c = ctxOf(data, now);
  expireBattles(c);
  for (const cls of data.classes) syncWorld(c, cls.id);
  return c.data;
}
