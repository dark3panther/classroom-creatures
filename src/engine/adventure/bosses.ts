import { BOSSES_BY_ID, ELEMENT_SPECIALS, LESSON, SPECIAL, bossSpecial } from '../../data/adventure';
import { ITEMS } from '../../data/defaults';
import { SPECIES_BY_ID } from '../../data/species';
import type { AppData, BossBattle, BossContribution, BossLoot, CategoryTag, QuestReward } from '../../types';
import { applyReward } from '../awards';
import { itemPrice, inSeason } from '../shop';
import { mulberry32, uid } from '../util';
import { packsOn } from '../cards';
import { AdventureError, type Actor, type AdventureResult, type Ctx, addLog, clampInt, ctxOf, getClass, patchStudentAdv, refreshBadges, requireTeacher, result } from './core';
import { regionOpen, syncWorld } from './world';

const MIN_MS = 10 * 60_000, MAX_MS = 60 * 86_400_000;

/** The class's current battle (running or paused), if any. One per class. */
export const currentBattle = (data: AppData, classId: string): BossBattle | undefined =>
  data.bosses.find((b) => b.classId === classId && (b.status === 'active' || b.status === 'paused'));

/** How far the class has got: every hit, minus what the boss recovered in a lesson battle (never below 0). */
export const battleTotal = (b: BossBattle) => Math.max(0, b.contributions.reduce((n, x) => n + x.amount, 0));
export const battleRemaining = (b: BossBattle) => Math.max(0, b.hp - battleTotal(b));
/** Lesson battles: what the boss has recovered from strikes back so far. */
export const battleRecovered = (b: BossBattle) => -b.contributions.reduce((n, x) => n + (x.source === 'setback' ? x.amount : 0), 0);

/** Milliseconds left on the battle clock (the clock stops while paused). */
export function battleTimeLeft(b: BossBattle, now: number): number {
  const paused = b.pausedMs + (b.status === 'paused' && b.pausedAt ? now - b.pausedAt : 0);
  return Math.max(0, b.startedAt + b.durationMs + paused - now);
}

/** Each student's share of the battle, for the "who helped" list. */
export function contributionsByStudent(b: BossBattle): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of b.contributions) if (x.studentId && x.amount > 0) m.set(x.studentId, (m.get(x.studentId) ?? 0) + x.amount);
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
    if (b.lesson) {
      // a lesson battle waits for the next lesson instead: the clock stops at the moment it ran out
      replaceBattle(c, { ...b, status: 'paused', pausedAt: b.startedAt + b.durationMs + b.pausedMs });
      addLog(c, { kind: 'boss-paused', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `Time's up! ${def?.name ?? 'The boss'} waits for the next lesson`, detail: `The class reached ${battleTotal(b)} of ${b.hp}. Resume next lesson to carry on.` });
      c.notes.push({ type: 'boss-timeup', classId: b.classId, battleId: b.id, bossId: b.bossId });
      continue;
    }
    replaceBattle(c, { ...b, status: 'ended', endedAt: b.startedAt + b.durationMs + b.pausedMs });
    addLog(c, { kind: 'boss-ended', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `${def?.name ?? 'The boss'} wandered off to rest`, detail: `The class reached ${battleTotal(b)} of ${b.hp}. Your teacher can start the battle again.` });
    c.notes.push({ type: 'boss-ended', classId: b.classId, battleId: b.id, bossId: b.bossId });
  }
}

export interface LessonSetup { mission: string; focusTag?: CategoryTag; strikeBack: boolean; lessonMs: number; lessons: number }
export interface BattleSetup { classId: string; bossId: string; hp: number; durationMs: number; reward: QuestReward; lesson?: LessonSetup }

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
  const l = setup.lesson;
  const lesson = l ? {
    mission: l.mission.trim().slice(0, 80) || 'Do our best work together',
    ...(l.focusTag ? { focusTag: l.focusTag } : {}),
    strikeBack: !!l.strikeBack,
    lessonMs: clampInt(l.lessonMs, MIN_MS, 3 * 3_600_000, LESSON.defaultMinutes * 60_000),
    lessons: clampInt(l.lessons, 1, 3, 1),
  } : undefined;
  const battle: BossBattle = {
    id: uid('boss'), classId: setup.classId, bossId: def.id,
    hp: clampInt(setup.hp, 10, 100_000, 100), status: 'active', startedAt: now,
    durationMs: lesson ? lesson.lessonMs * lesson.lessons : clampInt(setup.durationMs, MIN_MS, MAX_MS, def.durationMs), pausedMs: 0,
    reward: { xp: clampInt(setup.reward.xp, 0, 100, def.reward.xp), coins: clampInt(setup.reward.coins, 0, 500, def.reward.coins) },
    contributions: [],
    ...(lesson ? { lesson } : {}),
  };
  c.data = { ...c.data, bosses: [...c.data.bosses, battle] };
  addLog(c, { kind: 'boss-started', classId: battle.classId, ref: battle.id, regionId: def.regionId, title: `${def.name} appeared!`,
    detail: lesson ? `Lesson battle. Today's mission: ${lesson.mission}.` : `Work together: the class needs ${battle.hp} points to befriend it.` });
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
    // a lesson battle whose time ran out gets a fresh lesson on the clock
    const fresh = !!b.lesson && battleTimeLeft(b, now) <= 0;
    replaceBattle(c, { ...b, status: 'active', pausedMs: b.pausedMs + (now - (b.pausedAt ?? now)), pausedAt: undefined, durationMs: fresh ? b.durationMs + b.lesson!.lessonMs : b.durationMs });
    addLog(c, { kind: 'boss-resumed', classId: b.classId, ref: b.id, regionId: def?.regionId, title: fresh ? `${name} is back for another lesson!` : `${name} is back!` });
  } else {
    if (b.status !== 'active' && b.status !== 'paused') throw new AdventureError('This battle is already over.', 'state');
    replaceBattle(c, { ...b, status: 'ended', endedAt: now, pausedAt: undefined, pausedMs: b.status === 'paused' ? b.pausedMs + (now - (b.pausedAt ?? now)) : b.pausedMs });
    addLog(c, { kind: 'boss-ended', classId: b.classId, ref: b.id, regionId: def?.regionId, title: `${name} went home to rest`, detail: 'Your teacher ended the battle.' });
    c.notes.push({ type: 'boss-ended', classId: b.classId, battleId: b.id, bossId: b.bossId });
  }
  return result(c);
}

/** The points a student has given in a battle, towards special attacks: their awards and quests (a super-effective
 *  hit counts its points, not its double damage), not the specials themselves. */
export function specialPoints(b: BossBattle, studentId: string): number {
  return b.contributions.reduce((n, x) => (x.studentId === studentId && (x.source === 'award' || x.source === 'quest') && x.amount > 0
    ? n + (x.super ? x.amount / LESSON.superMultiplier : x.amount) : n), 0);
}

/**
 * Approved activity hits the class's running boss. The only way HP goes down. When the class reaches the
 * total, the boss is befriended and every student in the class gets the reward once.
 * Special attacks (1.9): each time a creature's points in the battle pass another SPECIAL.every, it follows up with
 * its element's special attack (SPECIAL.bonus more); and the boss answers with its own special attack once when
 * its HP falls to a half and once at a quarter, recovering a little (SPECIAL.bossHeal), never enough to undo a win.
 */
export function hitBoss(c: Ctx, classId: string, hit: Omit<BossContribution, 'id' | 'at'>): void {
  if (!c.data.settings.adventureEnabled) return;
  expireBattles(c, [classId]);
  const b = c.data.bosses.find((x) => x.classId === classId && x.status === 'active');
  const amount = Math.round(hit.amount);
  if (!b || !(amount > 0)) return;
  const added: BossContribution[] = [{ id: uid('hit'), at: c.now, ...hit, amount }];
  if (hit.studentId && (hit.source === 'award' || hit.source === 'quest')) {
    const before = specialPoints(b, hit.studentId);
    const after = before + (hit.super ? amount / LESSON.superMultiplier : amount);
    const st = c.data.students.find((x) => x.id === hit.studentId);
    const name = ELEMENT_SPECIALS[SPECIES_BY_ID[st?.speciesId ?? '']?.element ?? 'light'];
    for (let k = Math.floor(before / SPECIAL.every); k < Math.floor(after / SPECIAL.every); k++) {
      added.push({ id: uid('hit'), at: c.now, studentId: hit.studentId, amount: SPECIAL.bonus, source: 'special', ref: hit.ref, label: name });
    }
  }
  let next: BossBattle = { ...b, contributions: [...b.contributions, ...added] };
  replaceBattle(c, next);
  if (battleTotal(next) >= next.hp) { befriend(c, next); return; }
  const used = next.contributions.filter((x) => x.source === 'boss-special').length;
  const due = SPECIAL.bossAt.filter((share) => battleRemaining(next) <= next.hp * share).length;
  if (due > used) {
    const sp = bossSpecial(next.bossId);
    next = { ...next, contributions: [...next.contributions, { id: uid('hit'), at: c.now, amount: -Math.max(1, Math.round(next.hp * SPECIAL.bossHeal)), source: 'boss-special', label: sp.name }] };
    replaceBattle(c, next);
  }
}

/**
 * A deduction during a lesson battle: the boss strikes back at that student's creature and recovers the
 * points lost, never more than LESSON.recoverCap of its HP over the battle and never below a full meter.
 * The strike is recorded even when nothing is recovered, so the arena can show it. Nothing else happens to
 * the student: the deduction itself is the only cost (docs/adventure-design.md 3.6).
 */
export function strikeBack(c: Ctx, classId: string, hit: { studentId: string; lost: number; ref?: string; label: string }): void {
  if (!c.data.settings.adventureEnabled) return;
  expireBattles(c, [classId]);
  const b = c.data.bosses.find((x) => x.classId === classId && x.status === 'active');
  if (!b?.lesson?.strikeBack) return;
  const room = Math.max(0, Math.floor(b.hp * LESSON.recoverCap) - battleRecovered(b));
  const recover = Math.max(0, Math.min(Math.round(hit.lost), battleTotal(b), room));
  replaceBattle(c, { ...b, contributions: [...b.contributions, { id: uid('hit'), at: c.now, studentId: hit.studentId, amount: -recover, source: 'setback', ref: hit.ref, label: hit.label }] });
}

/** Teacher: the class finished its mission. Every creature attacks together (once per battle). */
export function completeMission(data: AppData, actor: Actor, battleId: string, now = Date.now()): AdventureResult {
  requireTeacher(actor, 'complete the class mission');
  const c = ctxOf(data, now);
  expireBattles(c);
  const b = battleOrThrow(c.data, battleId);
  if (!b.lesson) throw new AdventureError('Only a lesson battle has a class mission.', 'state');
  if (b.lesson.missionDoneAt) throw new AdventureError('The mission is already complete.', 'state');
  if (b.status !== 'active') throw new AdventureError(b.status === 'paused' ? 'The battle is paused. Resume it first.' : 'This battle is over.', 'state');
  const def = BOSSES_BY_ID[b.bossId];
  replaceBattle(c, { ...b, lesson: { ...b.lesson, missionDoneAt: now } });
  addLog(c, { kind: 'boss-mission', classId: b.classId, ref: b.id, regionId: def?.regionId, title: 'Mission complete: team attack!', detail: b.lesson.mission });
  hitBoss(c, b.classId, { amount: Math.max(1, Math.ceil(b.hp * LESSON.missionShare)), source: 'mission', label: `Mission complete: ${b.lesson.mission}` });
  return result(c);
}

/** A string to a seed, so a battle's lucky finds come out the same however often they are worked out. */
const seedOf = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; };

/**
 * Each student's lucky find when a boss is befriended (1.9), on top of the class reward: a few coins, a little XP,
 * a shop item they do not have yet (the cheaper ones), or a creature card pack (when card packs are on).
 */
export function rollLoot(data: AppData, b: BossBattle, now = Date.now()): Record<string, BossLoot> {
  const out: Record<string, BossLoot> = {};
  const packs = packsOn(data.settings);
  const off = new Set(data.settings.disabledItems ?? []);
  const shop = ITEMS.filter((it) => it.unlock.type === 'shop' && !off.has(it.id) && inSeason(it.season, now) && (itemPrice(it, data.settings) ?? 999) <= 80);
  for (const s of data.students.filter((x) => x.classId === b.classId)) {
    const rand = mulberry32(seedOf(`${b.id}:${s.id}`));
    const r = rand();
    const items = shop.filter((it) => !s.unlockedItems.includes(it.id));
    if (packs && r < 0.3) out[s.id] = { kind: 'pack', amount: 1, label: 'a creature card pack' };
    else if (r < 0.52 && items.length) {
      const it = items[Math.floor(rand() * items.length)];
      out[s.id] = { kind: 'item', amount: 1, itemId: it.id, label: it.name };
    } else if (r < 0.76) {
      const xp = 3 + Math.floor(rand() * 4);
      out[s.id] = { kind: 'xp', amount: xp, label: `${xp} bonus XP` };
    } else {
      const coins = 5 + Math.floor(rand() * 11);
      out[s.id] = { kind: 'coins', amount: coins, label: `${coins} bonus coins` };
    }
  }
  return out;
}

function befriend(c: Ctx, b: BossBattle): void {
  const def = BOSSES_BY_ID[b.bossId];
  const loot = rollLoot(c.data, b, c.now);
  replaceBattle(c, { ...b, status: 'won', endedAt: c.now, loot });
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
  // the lucky finds: coins, XP and items go through the reward pipeline (so undo and the history know them);
  // card packs go straight into each winner's unopened packs
  const grants = Object.entries(loot).filter(([, l]) => l.kind !== 'pack').map(([id, l]) => ({
    studentId: id, key: `bossloot:${b.id}:${id}`, xp: l.kind === 'xp' ? l.amount : 0, coins: l.kind === 'coins' ? l.amount : 0, ...(l.itemId ? { itemId: l.itemId } : {}),
  }));
  if (grants.length) {
    const r = applyReward(c.data, grants, { kind: 'boss', ref: b.id, label: `Lucky find from ${def?.name ?? 'a boss'}`, icon: '🎁' }, c.now);
    c.data = r.data;
    c.outcomes.push(...r.outcomes);
    for (const o of r.outcomes) for (const a of o.newAchievements) c.notes.push({ type: 'achievement', studentId: o.studentId, achievementId: a });
  }
  const packWinners = new Set(Object.entries(loot).filter(([, l]) => l.kind === 'pack').map(([id]) => id));
  if (packWinners.size) c.data = { ...c.data, students: c.data.students.map((s) => (packWinners.has(s.id) ? { ...s, packs: (s.packs ?? 0) + 1 } : s)) };
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
