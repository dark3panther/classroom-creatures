import { BOSSES_BY_ID } from '../../data/adventure';
import type { AppData, BossBattle, BossContribution, QuestReward } from '../../types';
import { applyReward } from '../awards';
import { uid } from '../util';
import { AdventureError, type Actor, type AdventureResult, type Ctx, addLog, clampInt, ctxOf, getClass, patchStudentAdv, refreshBadges, requireTeacher, result } from './core';
import { regionOpen, syncWorld } from './world';

const MIN_MS = 10 * 60_000, MAX_MS = 60 * 86_400_000;

/** The class's current battle (running or paused), if any. One per class. */
export const currentBattle = (data: AppData, classId: string): BossBattle | undefined =>
  data.bosses.find((b) => b.classId === classId && (b.status === 'active' || b.status === 'paused'));

export const battleTotal = (b: BossBattle) => b.contributions.reduce((n, x) => n + x.amount, 0);
export const battleRemaining = (b: BossBattle) => Math.max(0, b.hp - battleTotal(b));

/** Milliseconds left on the battle clock (the clock stops while paused). */
export function battleTimeLeft(b: BossBattle, now: number): number {
  const paused = b.pausedMs + (b.status === 'paused' && b.pausedAt ? now - b.pausedAt : 0);
  return Math.max(0, b.startedAt + b.durationMs + paused - now);
}

/** Each student's share of the battle, for the "who helped" list. */
export function contributionsByStudent(b: BossBattle): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of b.contributions) if (x.studentId) m.set(x.studentId, (m.get(x.studentId) ?? 0) + x.amount);
  return m;
}

function replaceBattle(c: Ctx, b: BossBattle): void {
  c.data = { ...c.data, bosses: c.data.bosses.map((x) => (x.id === b.id ? b : x)) };
}

/** Battles whose time ran out: the boss wanders off to rest. No one loses anything. */
export function expireBattles(c: Ctx, classIds?: string[]): void {
  for (const b of c.data.bosses) {
    if (b.status !== 'active' || (classIds && !classIds.includes(b.classId))) continue;
    if (battleTimeLeft(b, c.now) > 0) continue;
    const def = BOSSES_BY_ID[b.bossId];
    replaceBattle(c, { ...b, status: 'ended', endedAt: b.startedAt + b.durationMs + b.pausedMs });
    addLog(c, { kind: 'boss-ended', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `${def?.name ?? 'The boss'} wandered off to rest`, detail: `The class reached ${battleTotal(b)} of ${b.hp}. Your teacher can start the battle again.` });
    c.notes.push({ type: 'boss-ended', classId: b.classId, battleId: b.id, bossId: b.bossId });
  }
}

export interface BattleSetup { classId: string; bossId: string; hp: number; durationMs: number; reward: QuestReward }

/** Teacher: start a cooperative boss battle. */
export function startBattle(data: AppData, actor: Actor, setup: BattleSetup, now = Date.now()): AdventureResult {
  requireTeacher(actor, 'start boss battles');
  getClass(data, setup.classId);
  const def = BOSSES_BY_ID[setup.bossId];
  if (!def) throw new AdventureError('There is no such boss.', 'missing');
  const c = ctxOf(data, now);
  expireBattles(c, [setup.classId]);
  if (currentBattle(c.data, setup.classId)) throw new AdventureError('This class already has a boss battle. Finish or end it first.', 'state');
  if (!regionOpen(c.data, setup.classId, def.regionId)) throw new AdventureError(`${def.name} lives in a region the class has not opened yet.`, 'state');
  const battle: BossBattle = {
    id: uid('boss'), classId: setup.classId, bossId: def.id,
    hp: clampInt(setup.hp, 10, 100_000, 100), status: 'active', startedAt: now,
    durationMs: clampInt(setup.durationMs, MIN_MS, MAX_MS, def.durationMs), pausedMs: 0,
    reward: { xp: clampInt(setup.reward.xp, 0, 100, def.reward.xp), coins: clampInt(setup.reward.coins, 0, 500, def.reward.coins) },
    contributions: [],
  };
  c.data = { ...c.data, bosses: [...c.data.bosses, battle] };
  addLog(c, { kind: 'boss-started', classId: battle.classId, ref: battle.id, regionId: def.regionId, title: `${def.name} appeared!`, detail: `Work together: the class needs ${battle.hp} points to befriend it.` });
  return result(c);
}

function battleOrThrow(data: AppData, battleId: string): BossBattle {
  const b = data.bosses.find((x) => x.id === battleId);
  if (!b) throw new AdventureError('That battle could not be found.', 'missing');
  return b;
}

/** Teacher: pause (no hits, the clock stops), resume, or end a battle early (no reward, no penalty). */
export function controlBattle(data: AppData, actor: Actor, battleId: string, action: 'pause' | 'resume' | 'end', now = Date.now()): AdventureResult {
  requireTeacher(actor, 'control boss battles');
  const c = ctxOf(data, now);
  expireBattles(c);
  const b = battleOrThrow(c.data, battleId);
  const def = BOSSES_BY_ID[b.bossId];
  const name = def?.name ?? 'The boss';
  if (action === 'pause') {
    if (b.status !== 'active') throw new AdventureError('Only a running battle can be paused.', 'state');
    replaceBattle(c, { ...b, status: 'paused', pausedAt: now });
    addLog(c, { kind: 'boss-paused', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `${name} is resting (paused)` });
  } else if (action === 'resume') {
    if (b.status !== 'paused') throw new AdventureError('Only a paused battle can be resumed.', 'state');
    replaceBattle(c, { ...b, status: 'active', pausedMs: b.pausedMs + (now - (b.pausedAt ?? now)), pausedAt: undefined });
    addLog(c, { kind: 'boss-resumed', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `${name} is back!` });
  } else {
    if (b.status !== 'active' && b.status !== 'paused') throw new AdventureError('This battle is already over.', 'state');
    replaceBattle(c, { ...b, status: 'ended', endedAt: now, pausedAt: undefined, pausedMs: b.status === 'paused' ? b.pausedMs + (now - (b.pausedAt ?? now)) : b.pausedMs });
    addLog(c, { kind: 'boss-ended', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `${name} went home to rest`, detail: 'Your teacher ended the battle.' });
    c.notes.push({ type: 'boss-ended', classId: b.classId, battleId: b.id, bossId: b.bossId });
  }
  return result(c);
}

/**
 * Approved activity hits the class's running boss. The only way HP goes down. When the class reaches the
 * total, the boss is befriended and every student in the class gets the reward once.
 */
export function hitBoss(c: Ctx, classId: string, hit: Omit<BossContribution, 'id' | 'at'>): void {
  if (!c.data.settings.adventureEnabled) return;
  expireBattles(c, [classId]);
  const b = c.data.bosses.find((x) => x.classId === classId && x.status === 'active');
  const amount = Math.round(hit.amount);
  if (!b || !(amount > 0)) return;
  const next: BossBattle = { ...b, contributions: [...b.contributions, { id: uid('hit'), at: c.now, ...hit, amount }] };
  replaceBattle(c, next);
  if (battleTotal(next) >= next.hp) befriend(c, next);
}

function befriend(c: Ctx, b: BossBattle): void {
  const def = BOSSES_BY_ID[b.bossId];
  replaceBattle(c, { ...b, status: 'won', endedAt: c.now });
  const students = c.data.students.filter((s) => s.classId === b.classId);
  // everyone in the class is part of the adventure: no one is left out of the friendship
  for (const s of students) {
    patchStudentAdv(c, s.id, (a) => (a.bosses.some((x) => x.battleId === b.id) ? a : { ...a, bosses: [...a.bosses, { battleId: b.id, bossId: b.bossId, at: c.now }] }));
  }
  addLog(c, { kind: 'boss-won', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `${def?.name ?? 'The boss'} became the class's friend!`, detail: def?.friendly, xp: b.reward.xp || undefined, coins: b.reward.coins || undefined });
  c.notes.push({ type: 'boss-won', classId: b.classId, battleId: b.id, bossId: b.bossId });
  if (b.reward.xp > 0 || b.reward.coins > 0) {
    const r = applyReward(c.data, students.map((s) => ({ studentId: s.id, key: `boss:${b.id}:${s.id}`, xp: b.reward.xp, coins: b.reward.coins })),
      { kind: 'boss', ref: b.id, label: `Befriended ${def?.name ?? 'a boss'}`, icon: '⚔️' }, c.now);
    c.data = r.data;
    c.outcomes.push(...r.outcomes);
    for (const o of r.outcomes) for (const a of o.newAchievements) c.notes.push({ type: 'achievement', studentId: o.studentId, achievementId: a });
  } else {
    refreshBadges(c, students.map((s) => s.id));
  }
  syncWorld(c, b.classId);
}

/** Teacher: the whole class did something together ("we finished the reading"): it hits the boss. */
export function classActivity(data: AppData, actor: Actor, classId: string, amount: number, label: string, now = Date.now()): AdventureResult {
  requireTeacher(actor, 'add class activities');
  const c = ctxOf(data, now);
  expireBattles(c, [classId]);
  const b = currentBattle(c.data, classId);
  if (!b) throw new AdventureError('There is no boss battle right now.', 'state');
  if (b.status !== 'active') throw new AdventureError('The battle is paused. Resume it first.', 'state');
  const pts = clampInt(amount, 1, 1000, 0);
  if (!pts) throw new AdventureError('Give the activity some points.', 'invalid');
  hitBoss(c, classId, { amount: pts, source: 'class', label: label.trim().slice(0, 60) || 'Class activity' });
  return result(c);
}

/** Run the battle clock (on load and on a timer): battles that ran out end without any penalty. */
export function tickBattles(data: AppData, now = Date.now()): AdventureResult {
  const c = ctxOf(data, now);
  expireBattles(c);
  return result(c);
}
