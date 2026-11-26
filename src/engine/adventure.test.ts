import { describe, expect, it } from 'vitest';
import { BOSSES_BY_ID, LOCATIONS_BY_ID, REGIONS, TREASURES_BY_ID } from '../data/adventure';
import { DEFAULT_CHALLENGES } from '../data/defaults';
import type { AppData, Quest } from '../types';
import {
  AdventureError, TEACHER, adventurePoints, afterAward, approveQuest, asStudent, battleRemaining, battleTimeLeft, classActivity, collectQuest,
  controlBattle, currentBattle, deleteQuest, duplicateQuest, journalFor, locationState, questBoard, regionStates, rejectQuest,
  saveQuest, setRegion, startBattle, submitQuest, tickBattles, treasureState, undoAdventure, upgradeLocation, visitRegion,
  openTreasure, classHistory,
} from './adventure';
import { applyAward } from './awards';
import { migrate, parseBackup, toBackup } from './backup';
import { addStudents, emptyData, newClass } from './roster';
import { mulberry32 } from './util';

const NOW = new Date(2026, 10, 4, 10, 0).getTime(); // a Wednesday
const HOUR = 3_600_000;

function world(names = ['Ana', 'Bo', 'Cy']): { data: AppData; ids: string[]; classId: string } {
  const c = newClass('Test', 'Grade 2', NOW);
  let data: AppData = { ...emptyData(NOW), classes: [c] };
  data = addStudents(data, c.id, names, mulberry32(1), NOW);
  return { data, ids: data.students.map((s) => s.id), classId: c.id };
}

/** award + adventure hooks, like the store does */
function award(data: AppData, ids: string[], cat: string, at: number): AppData {
  const r = applyAward(data, ids, cat, at);
  return afterAward(r, at).data;
}

const checkQuest = (over: Partial<Quest> = {}): Quest => ({
  id: 'q-test', classId: null, title: 'Draw a map', description: 'Draw a map of the classroom.', category: 'creativity', kind: 'custom',
  regionId: 'verdant', assign: 'class', reward: { xp: 4, coins: 10 }, requirement: { type: 'check' }, approval: true, active: true,
  createdAt: NOW, updatedAt: NOW, ...over,
});

const student = (d: AppData, id: string) => d.students.find((s) => s.id === id)!;

describe('World of Adventures: regions and adventure points', () => {
  it('starts with Verdant Valley open and the others locked with their requirement', () => {
    const { data, classId } = world();
    const st = regionStates(data, classId);
    expect(st.verdant.open).toBe(true);
    for (const r of REGIONS.filter((x) => x.id !== 'verdant')) {
      expect(st[r.id].open).toBe(false);
      expect(st[r.id].need).toBe(r.unlockAp);
    }
  });

  it('opens regions from adventure points, keeps them open, and lets the teacher override', () => {
    let { data, ids, classId } = world(['A']);
    // 375 lifetime XP for the only student = 15 points: Crystal Caverns
    data = { ...data, students: data.students.map((s) => ({ ...s, lifetimeXp: 370, xp: 370 })) };
    data = award(data, ids, 'cat-behaviour', NOW); // +5 → 375
    expect(adventurePoints(data, classId).total).toBeGreaterThanOrEqual(15);
    expect(regionStates(data, classId).crystal.open).toBe(true);
    expect(data.classes[0].adventure!.opened).toContain('crystal');
    expect(data.adventureLog.some((l) => l.kind === 'region-unlocked' && l.regionId === 'crystal')).toBe(true);
    // teacher opens Ancient Kingdom early, then closes Crystal Caverns
    data = setRegion(data, TEACHER, classId, 'ancient', 'open', NOW).data;
    expect(regionStates(data, classId).ancient.open).toBe(true);
    data = setRegion(data, TEACHER, classId, 'crystal', 'locked', NOW).data;
    expect(regionStates(data, classId).crystal.open).toBe(false);
    expect(() => setRegion(data, TEACHER, classId, 'verdant', 'locked', NOW)).toThrow(AdventureError);
    expect(() => setRegion(data, asStudent(ids[0]), classId, 'sky', 'open', NOW)).toThrow(/teacher/);
  });

  it('exploring a region records it once and can earn explorer badges', () => {
    let { data, ids, classId } = world();
    data = setRegion(data, TEACHER, classId, 'crystal', 'open', NOW).data;
    data = setRegion(data, TEACHER, classId, 'frostpeak', 'open', NOW).data;
    for (const r of ['verdant', 'crystal', 'frostpeak'] as const) data = visitRegion(data, asStudent(ids[0]), [ids[0]], r, NOW).data;
    data = visitRegion(data, asStudent(ids[0]), [ids[0]], 'verdant', NOW).data;
    expect(student(data, ids[0]).adventure!.visited).toHaveLength(3);
    expect(student(data, ids[0]).achievements.some((a) => a.id === 'world-explorer')).toBe(true);
    expect(() => visitRegion(data, asStudent(ids[0]), [ids[0]], 'ember', NOW)).toThrow(/not open/);
    expect(() => visitRegion(data, asStudent(ids[0]), [ids[1]], 'verdant', NOW)).toThrow(/yourself/);
  });
});

describe('World of Adventures: quests', () => {
  it('creates, edits, duplicates and deletes quests (teacher only, history kept)', () => {
    let { data, ids } = world();
    data = saveQuest(data, TEACHER, checkQuest(), NOW);
    expect(data.quests.find((q) => q.id === 'q-test')!.title).toBe('Draw a map');
    data = saveQuest(data, TEACHER, { ...checkQuest(), title: 'Draw a treasure map' }, NOW + 1);
    expect(data.quests.filter((q) => q.id === 'q-test')).toHaveLength(1);
    const dup = duplicateQuest(data, TEACHER, 'q-test', NOW + 2);
    expect(dup.quest.title).toBe('Draw a treasure map (copy)');
    data = deleteQuest(dup.data, TEACHER, dup.quest.id, NOW + 3);
    expect(data.quests.find((q) => q.id === dup.quest.id)!.deleted).toBe(true);
    expect(questBoard(data, student(data, ids[0]), NOW).some((v) => v.quest.id === dup.quest.id)).toBe(false);
    expect(() => saveQuest(data, asStudent(ids[0]), checkQuest({ id: 'q-x' }), NOW)).toThrow(/teacher/);
    expect(() => saveQuest(data, TEACHER, checkQuest({ id: 'q-y', title: '  ' }), NOW)).toThrow(/title/);
  });

  it('assigns quests to the class or to chosen students', () => {
    let { data, ids } = world();
    data = saveQuest(data, TEACHER, checkQuest({ assign: [ids[1]] }), NOW);
    expect(questBoard(data, student(data, ids[0]), NOW).some((v) => v.quest.id === 'q-test')).toBe(false);
    expect(questBoard(data, student(data, ids[1]), NOW).some((v) => v.quest.id === 'q-test')).toBe(true);
    expect(() => submitQuest(data, asStudent(ids[0]), 'q-test', ids[0], NOW)).toThrow(/not on your quest board/);
  });

  it('a student submission always waits for the teacher; approve, reject with a reason and resubmit work', () => {
    let { data, ids } = world();
    data = saveQuest(data, TEACHER, checkQuest({ approval: false }), NOW);
    data = submitQuest(data, asStudent(ids[0]), 'q-test', ids[0], NOW).data;
    let rec = data.questRecords.find((r) => r.questId === 'q-test')!;
    expect(rec.status).toBe('submitted'); // even though the quest does not ask for approval
    expect(() => collectQuest(data, asStudent(ids[0]), rec.id, NOW)).toThrow(/not approved/);
    expect(() => approveQuest(data, asStudent(ids[0]), rec.id, NOW)).toThrow(/teacher/);
    expect(() => rejectQuest(data, TEACHER, rec.id, '', NOW)).toThrow(/reason/);
    data = rejectQuest(data, TEACHER, rec.id, 'Please add a title to your map', NOW + 1).data;
    rec = data.questRecords.find((r) => r.id === rec.id)!;
    expect(rec.status).toBe('rejected');
    expect(rec.reason).toBe('Please add a title to your map');
    data = submitQuest(data, asStudent(ids[0]), 'q-test', ids[0], NOW + 2).data;
    expect(data.questRecords.find((r) => r.id === rec.id)!.status).toBe('submitted');
    data = approveQuest(data, TEACHER, rec.id, NOW + 3).data;
    rec = data.questRecords.find((r) => r.id === rec.id)!;
    expect(rec.status).toBe('approved');
    expect(rec.history.map((h) => h.status)).toEqual(['submitted', 'rejected', 'submitted', 'approved']);
    expect(student(data, ids[0]).challengeCompletions.some((c) => c.challengeId === 'q-test')).toBe(true);
  });

  it('grants a reward exactly once, however many times Collect is pressed', () => {
    let { data, ids } = world();
    data = saveQuest(data, TEACHER, checkQuest(), NOW);
    data = submitQuest(data, TEACHER, 'q-test', ids[0], NOW).data; // the teacher marks it done: approved at once
    const rec = data.questRecords.find((r) => r.questId === 'q-test')!;
    expect(rec.status).toBe('approved');
    const before = student(data, ids[0]);
    data = collectQuest(data, asStudent(ids[0]), rec.id, NOW + 1).data;
    const after = student(data, ids[0]);
    expect(after.xp - before.xp).toBe(4);
    expect(after.coins - before.coins).toBe(10);
    expect(data.rewardLedger[`quest:${rec.id}`]).toBeTruthy();
    expect(() => collectQuest(data, asStudent(ids[0]), rec.id, NOW + 2)).toThrow(/already collected/);
    // even a forced second grant through a stale copy of the record is refused by the ledger
    const stale = { ...data, questRecords: data.questRecords.map((r) => (r.id === rec.id ? { ...r, status: 'approved' as const } : r)) };
    const again = collectQuest(stale, TEACHER, rec.id, NOW + 3).data;
    expect(student(again, ids[0]).coins).toBe(after.coins);
  });

  it('students can never approve, collect for others, or mark tracked quests done themselves', () => {
    let { data, ids } = world();
    data = saveQuest(data, TEACHER, checkQuest({ approval: false }), NOW);
    data = submitQuest(data, TEACHER, 'q-test', ids[1], NOW).data;
    const rec = data.questRecords.find((r) => r.studentId === ids[1])!;
    expect(() => collectQuest(data, asStudent(ids[0]), rec.id, NOW)).toThrow(/yourself/);
    expect(() => submitQuest(data, asStudent(ids[0]), 'q-participate', ids[0], NOW)).toThrow(/counts by itself/);
    expect(() => submitQuest(data, asStudent(ids[0]), 'q-test', ids[1], NOW)).toThrow(/yourself/);
  });

  it('tracked quests complete from teacher awards, once per period, and undo takes them back', () => {
    let { data, ids } = world(['A']);
    // q-participate: participate twice today
    data = award(data, ids, 'cat-participating', NOW);
    expect(data.questRecords).toHaveLength(0);
    const r = applyAward(data, ids, 'cat-participating', NOW + 1);
    data = afterAward(r, NOW + 1).data;
    const rec = data.questRecords.find((x) => x.questId === 'q-participate')!;
    expect(rec.status).toBe('approved');
    data = award(data, ids, 'cat-participating', NOW + 2);
    expect(data.questRecords.filter((x) => x.questId === 'q-participate')).toHaveLength(1);
    // undoing the award that completed it removes the uncollected completion
    const undone = undoAdventure(data, r.batchId, NOW + 3);
    // the third award still makes two participations, so the quest stays complete
    expect(undone.questRecords.some((x) => x.id === rec.id)).toBe(true);
    // the next day starts fresh
    const tomorrow = award(data, ids, 'cat-participating', NOW + 24 * HOUR);
    expect(tomorrow.questRecords.filter((x) => x.questId === 'q-participate')).toHaveLength(1);
  });

  it('removes a tracked completion when the award behind it is undone', () => {
    let { data, ids } = world(['A']);
    data = award(data, ids, 'cat-participating', NOW);
    const r = applyAward(data, ids, 'cat-participating', NOW + 1);
    data = afterAward(r, NOW + 1).data;
    expect(data.questRecords).toHaveLength(1);
    data = undoAdventure(data, r.batchId, NOW + 2);
    expect(data.questRecords).toHaveLength(0);
    expect(student(data, ids[0]).challengeCompletions).toHaveLength(0);
  });

  it('undoing a collected reward takes it back and lets it be collected again', () => {
    let { data, ids } = world(['A']);
    data = saveQuest(data, TEACHER, checkQuest(), NOW);
    data = submitQuest(data, TEACHER, 'q-test', ids[0], NOW).data;
    const rec = data.questRecords[0];
    const coins0 = student(data, ids[0]).coins;
    data = collectQuest(data, TEACHER, rec.id, NOW + 1).data;
    const batch = data.questRecords[0].rewardBatchId!;
    data = undoAdventure(data, batch, NOW + 2);
    expect(student(data, ids[0]).coins).toBe(coins0);
    expect(data.questRecords[0].status).toBe('approved');
    expect(data.rewardLedger[`quest:${rec.id}`]).toBeUndefined();
    data = collectQuest(data, TEACHER, rec.id, NOW + 3).data;
    expect(student(data, ids[0]).coins).toBe(coins0 + 10);
  });

  it('quests in a region that is not open yet wait, and custom quests respect their dates', () => {
    let { data, ids } = world();
    data = saveQuest(data, TEACHER, checkQuest({ regionId: 'ember' }), NOW);
    expect(questBoard(data, student(data, ids[0]), NOW).find((v) => v.quest.id === 'q-test')!.state).toBe('locked');
    expect(() => submitQuest(data, TEACHER, 'q-test', ids[0], NOW)).toThrow(/not open yet/);
    data = saveQuest(data, TEACHER, checkQuest({ id: 'q-later', startAt: NOW + 48 * HOUR }), NOW);
    expect(questBoard(data, student(data, ids[0]), NOW).find((v) => v.quest.id === 'q-later')!.state).toBe('upcoming');
    expect(() => submitQuest(data, asStudent(ids[0]), 'q-later', ids[0], NOW)).toThrow(/not started/);
  });
});

describe('World of Adventures: boss battles', () => {
  const setup = (classId: string, hp = 30) => ({ classId, bossId: 'grumblethorn', hp, durationMs: 3 * 24 * HOUR, reward: { xp: 5, coins: 15 } });

  it('only the teacher starts a battle, one per class, with a boss of an open region', () => {
    const { data, ids, classId } = world();
    expect(() => startBattle(data, asStudent(ids[0]), setup(classId), NOW)).toThrow(/teacher/);
    expect(() => startBattle(data, TEACHER, { ...setup(classId), bossId: 'magmaw' }, NOW)).toThrow(/not opened/);
    const d = startBattle(data, TEACHER, setup(classId), NOW).data;
    expect(currentBattle(d, classId)!.hp).toBe(30);
    expect(() => startBattle(d, TEACHER, setup(classId), NOW)).toThrow(/already has/);
  });

  it('HP falls only through approved activity, undo restores it, and the class is rewarded once', () => {
    let { data, ids, classId } = world();
    data = startBattle(data, TEACHER, setup(classId), NOW).data;
    const r = applyAward(data, [ids[0]], 'cat-behaviour', NOW + 1); // +5
    data = afterAward(r, NOW + 1).data;
    expect(currentBattle(data, classId)!.contributions.reduce((n, x) => n + x.amount, 0)).toBe(5);
    data = undoAdventure(data, r.batchId, NOW + 2);
    expect(currentBattle(data, classId)!.contributions).toHaveLength(0);
    // negative points and corrections never touch the boss
    data = afterAward(applyAward(data, [ids[0]], 'neg-talking', NOW + 3), NOW + 3).data;
    expect(currentBattle(data, classId)!.contributions).toHaveLength(0);
    // a whole-class award: 3 × 5 = 15, then a class activity of 15 befriends it
    data = award(data, ids, 'cat-behaviour', NOW + 4);
    const coins = ids.map((id) => student(data, id).coins);
    // (the boss's special attack at half its HP gave it a little back, 1.9: the activity covers what is left)
    data = classActivity(data, TEACHER, classId, battleRemaining(currentBattle(data, classId)!), 'Finished the class story', NOW + 5).data;
    const b = data.bosses[0];
    expect(b.status).toBe('won');
    ids.forEach((id, i) => {
      // the class reward, and a lucky find on top when it is coins (1.9)
      const find = b.loot?.[id];
      expect(student(data, id).coins - coins[i]).toBe(15 + (find?.kind === 'coins' ? find.amount : 0));
      expect(student(data, id).adventure!.bosses).toHaveLength(1);
      expect(student(data, id).achievements.some((a) => a.id === 'boss-buster')).toBe(true);
    });
    // more activity after the win changes nothing
    const later = award(data, ids, 'cat-behaviour', NOW + 6);
    ids.forEach((id) => expect(student(later, id).coins - student(data, id).coins).toBe(5));
    expect(Object.keys(later.rewardLedger).filter((k) => k.startsWith('boss:'))).toHaveLength(3);
  });

  it('approved quests hit the boss; pause stops hits and the clock; time running out has no penalty', () => {
    let { data, ids, classId } = world();
    data = startBattle(data, TEACHER, setup(classId, 200), NOW).data;
    data = saveQuest(data, TEACHER, checkQuest(), NOW);
    data = submitQuest(data, TEACHER, 'q-test', ids[0], NOW).data;
    expect(currentBattle(data, classId)!.contributions[0]).toMatchObject({ source: 'quest', amount: 5 });
    const id = data.bosses[0].id;
    data = controlBattle(data, TEACHER, id, 'pause', NOW + HOUR).data;
    const left = battleTimeLeft(data.bosses[0], NOW + HOUR);
    expect(battleTimeLeft(data.bosses[0], NOW + 10 * HOUR)).toBe(left);
    data = award(data, ids, 'cat-behaviour', NOW + 2 * HOUR);
    expect(currentBattle(data, classId)!.contributions).toHaveLength(1);
    expect(() => classActivity(data, TEACHER, classId, 10, 'x', NOW + 2 * HOUR)).toThrow(/paused/);
    data = controlBattle(data, TEACHER, id, 'resume', NOW + 10 * HOUR).data;
    expect(battleTimeLeft(data.bosses[0], NOW + 10 * HOUR)).toBe(left);
    const coins = student(data, ids[0]).coins;
    data = tickBattles(data, NOW + 30 * 24 * HOUR).data;
    expect(data.bosses[0].status).toBe('ended');
    expect(student(data, ids[0]).coins).toBe(coins);
    expect(data.adventureLog.some((l) => l.kind === 'boss-ended')).toBe(true);
  });
});

describe('World of Adventures: treasure', () => {
  it('opens only when the requirement is met, grants exactly its reward once', () => {
    let { data, ids, classId } = world(['A']);
    const relic = TREASURES_BY_ID['verdant-relic'];
    expect(treasureState(data, student(data, ids[0]), relic).state).toBe('locked');
    expect(() => openTreasure(data, asStudent(ids[0]), ids[0], 'verdant-relic', NOW)).toThrow(/locked/);
    data = visitRegion(data, asStudent(ids[0]), [ids[0]], 'verdant', NOW).data;
    expect(treasureState(data, student(data, ids[0]), relic).state).toBe('ready');
    data = openTreasure(data, asStudent(ids[0]), ids[0], 'verdant-relic', NOW).data;
    expect(treasureState(data, student(data, ids[0]), relic).state).toBe('opened');
    expect(() => openTreasure(data, asStudent(ids[0]), ids[0], 'verdant-relic', NOW)).toThrow(/already open/);
    // coin chest: two Verdant Valley quests
    data = saveQuest(data, TEACHER, checkQuest(), NOW);
    data = saveQuest(data, TEACHER, checkQuest({ id: 'q-two', title: 'Tidy the reading corner' }), NOW);
    data = submitQuest(data, TEACHER, 'q-test', ids[0], NOW).data;
    data = submitQuest(data, TEACHER, 'q-two', ids[0], NOW).data;
    const coins = student(data, ids[0]).coins;
    data = openTreasure(data, asStudent(ids[0]), ids[0], 'verdant-coins', NOW).data;
    expect(student(data, ids[0]).coins - coins).toBe(TREASURES_BY_ID['verdant-coins'].coins);
    expect(() => openTreasure(data, TEACHER, ids[0], 'verdant-coins', NOW)).toThrow(/already open/);
    expect(() => openTreasure(data, asStudent('someone-else'), ids[0], 'verdant-coins', NOW)).toThrow(/yourself/);
    void classId;
  });

  it('gives the item once, pays coins instead when it is already owned, and undo takes it back', () => {
    let { data, ids, classId } = world(['A', 'B']);
    // befriend Grumblethorn so the boss chest (Bramble Crown) is ready
    data = startBattle(data, TEACHER, { classId, bossId: 'grumblethorn', hp: 10, durationMs: 24 * HOUR, reward: { xp: 0, coins: 0 } }, NOW).data;
    data = classActivity(data, TEACHER, classId, 10, 'Class effort', NOW).data;
    expect(treasureState(data, student(data, ids[0]), TREASURES_BY_ID['verdant-boss']).state).toBe('ready');
    let r = openTreasure(data, asStudent(ids[0]), ids[0], 'verdant-boss', NOW);
    data = r.data;
    expect(student(data, ids[0]).unlockedItems).toContain('hat-bramble');
    // B already owns the crown somehow (e.g. restored from a backup): the chest pays its coins instead
    data = { ...data, students: data.students.map((s) => (s.id === ids[1] ? { ...s, unlockedItems: [...s.unlockedItems, 'hat-bramble'] } : s)) };
    const coinsB = student(data, ids[1]).coins;
    data = openTreasure(data, asStudent(ids[1]), ids[1], 'verdant-boss', NOW).data;
    expect(student(data, ids[1]).coins - coinsB).toBe(TREASURES_BY_ID['verdant-boss'].coins);
    expect(student(data, ids[1]).unlockedItems.filter((i) => i === 'hat-bramble')).toHaveLength(1);
    // undo the crown for A
    const batch = student(data, ids[0]).adventure!.treasures.find((t) => t.id === 'verdant-boss')!.batchId!;
    data = undoAdventure(data, batch, NOW + 1);
    expect(student(data, ids[0]).unlockedItems).not.toContain('hat-bramble');
    expect(treasureState(data, student(data, ids[0]), TREASURES_BY_ID['verdant-boss']).state).toBe('ready');
    r = openTreasure(data, asStudent(ids[0]), ids[0], 'verdant-boss', NOW + 2);
    expect(student(r.data, ids[0]).unlockedItems).toContain('hat-bramble');
  });
});

describe('World of Adventures: journal and the class world', () => {
  it('keeps a journal of quests, regions, bosses and treasure in time order, with filters', () => {
    let { data, ids, classId } = world(['A']);
    data = visitRegion(data, asStudent(ids[0]), [ids[0]], 'verdant', NOW).data;
    data = openTreasure(data, asStudent(ids[0]), ids[0], 'verdant-relic', NOW + 1).data;
    data = saveQuest(data, TEACHER, checkQuest(), NOW);
    data = submitQuest(data, asStudent(ids[0]), 'q-test', ids[0], NOW + 2).data;
    data = approveQuest(data, TEACHER, data.questRecords[0].id, NOW + 3).data;
    data = startBattle(data, TEACHER, { classId, bossId: 'grumblethorn', hp: 10, durationMs: 24 * HOUR, reward: { xp: 1, coins: 1 } }, NOW + 4).data;
    const all = journalFor(data, ids[0]);
    expect(all.map((e) => e.at)).toEqual([...all.map((e) => e.at)].sort((a, b) => b - a));
    expect(journalFor(data, ids[0], 'treasures').every((e) => e.group === 'treasures')).toBe(true);
    expect(journalFor(data, ids[0], 'regions')).toHaveLength(1);
    expect(journalFor(data, ids[0], 'bosses')[0].classWide).toBe(true);
    expect(journalFor(data, ids[0], 'quests').length).toBeGreaterThanOrEqual(2);
    expect(classHistory(data, classId)[0].title).toMatch(/appeared/);
  });

  it('builds the shared world from adventure points (teacher only)', () => {
    let { data, ids, classId } = world(['A']);
    expect(locationState(data, classId, 'sanctuary').stage).toBe(1);
    expect(() => upgradeLocation(data, TEACHER, classId, 'village', NOW)).toThrow(/needs 10/);
    data = { ...data, students: data.students.map((s) => ({ ...s, lifetimeXp: 300 })) }; // 12 points
    expect(() => upgradeLocation(data, asStudent(ids[0]), classId, 'village', NOW)).toThrow(/teacher/);
    data = upgradeLocation(data, TEACHER, classId, 'village', NOW).data;
    expect(locationState(data, classId, 'village').stage).toBe(1);
    expect(data.adventureLog.at(-1)!.title).toContain(LOCATIONS_BY_ID.village.stageNames[0]);
    const off = { ...data, settings: { ...data.settings, classWorld: false } };
    expect(() => upgradeLocation(off, TEACHER, classId, 'library', NOW)).toThrow(/switched off/);
  });
});

describe('World of Adventures: data', () => {
  it('upgrades 1.4 data without losing anything: challenges become quests, completions are not paid twice', () => {
    const { data: fresh, ids } = world(['A']);
    const day = new Date(NOW);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const v3 = {
      ...fresh, version: 3,
      challenges: DEFAULT_CHALLENGES.map((c) => ({ ...c })),
      quests: undefined, questRecords: undefined, bosses: undefined, adventureLog: undefined, rewardLedger: undefined,
      classes: fresh.classes.map(({ adventure, ...c }) => { void adventure; return c; }),
      students: fresh.students.map(({ adventure, ...s }) => { void adventure; return { ...s, xp: 140, coins: 33, lifetimeXp: 140, challengeCompletions: [{ challengeId: 'ch-participate-3', periodKey: key, at: NOW - HOUR }] }; }),
    } as unknown as AppData;
    const d = migrate(v3);
    expect(d.version).toBe(4);
    expect(d.challenges).toHaveLength(DEFAULT_CHALLENGES.length); // kept unchanged
    expect(d.quests.filter((q) => q.fromChallenge)).toHaveLength(DEFAULT_CHALLENGES.length);
    expect(d.quests.some((q) => q.id === 'q-participate')).toBe(false); // the converted challenge replaces it
    expect(d.quests.some((q) => q.id === 'q-work')).toBe(true);
    const st = d.students[0];
    expect([st.xp, st.coins, st.lifetimeXp]).toEqual([140, 33, 140]);
    expect(d.questRecords[0]).toMatchObject({ questId: 'q-ch-participate-3', status: 'collected' });
    expect(d.classes[0].adventure!.opened).toEqual(['verdant']);
    // the challenge done this morning is not completed (or paid) again today
    let after = d;
    for (let i = 0; i < 3; i++) after = award(after, ids, 'cat-participating', NOW + i);
    expect(after.questRecords.filter((r) => r.questId === 'q-ch-participate-3')).toHaveLength(1);
    // running the migration again changes nothing
    expect(migrate(d).quests).toHaveLength(d.quests.length);
  });

  it('survives a backup and restore, and repairs damaged adventure fields', () => {
    let { data, ids, classId } = world(['A']);
    data = saveQuest(data, TEACHER, checkQuest(), NOW);
    data = submitQuest(data, TEACHER, 'q-test', ids[0], NOW).data;
    data = startBattle(data, TEACHER, { classId, bossId: 'grumblethorn', hp: 40, durationMs: 24 * HOUR, reward: { xp: 1, coins: 1 } }, NOW).data;
    const { data: back } = parseBackup(JSON.stringify(toBackup(data)));
    expect(back.quests.find((q) => q.id === 'q-test')).toBeTruthy();
    expect(back.questRecords).toHaveLength(data.questRecords.length);
    expect(back.bosses[0].bossId).toBe(BOSSES_BY_ID.grumblethorn.id);
    const broken = { ...back, questRecords: 'x', bosses: null, classes: back.classes.map((c) => ({ ...c, adventure: { regions: { mars: 'open' } } })) } as unknown as AppData;
    const fixed = migrate(broken);
    expect(fixed.questRecords).toEqual([]);
    expect(fixed.bosses).toEqual([]);
    expect(fixed.classes[0].adventure!.regions).toEqual({});
    expect(fixed.classes[0].adventure!.opened).toContain('verdant');
  });
});
