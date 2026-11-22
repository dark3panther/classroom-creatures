import { describe, expect, it } from 'vitest';
import { BOSSES, BOSSES_BY_ID, LESSON, MISSIONS, REGIONS, TREASURES, lessonHp } from '../data/adventure';
import type { AppData } from '../types';
import {
  AdventureError, TEACHER, adventurePoints, afterAward, asStudent, battleRecovered, battleTimeLeft, battleTotal, completeMission,
  contributionsByStudent, controlBattle, currentBattle, setRegion, startBattle, tickBattles, undoAdventure,
} from './adventure';
import { applyAward } from './awards';
import { addStudents, emptyData, newClass } from './roster';
import { mulberry32 } from './util';

/** Lesson battles (1.6): docs/adventure-design.md 3.6. */
const NOW = new Date(2026, 10, 23, 9, 0).getTime();
const MIN = 60_000;

function world(names = ['Ahmed', 'Bea', 'Cy', 'Dee']): { data: AppData; ids: string[]; classId: string } {
  const c = newClass('Test', 'Grade 2', NOW);
  let data: AppData = { ...emptyData(NOW), classes: [c] };
  data = addStudents(data, c.id, names, mulberry32(1), NOW);
  return { data, ids: data.students.map((s) => s.id), classId: c.id };
}
const award = (data: AppData, ids: string[], cat: string, at: number) => afterAward(applyAward(data, ids, cat, at), at).data;
const give = (d: AppData, ids: string[], cat: string, at: number) => { const r = applyAward(d, ids, cat, at); return { data: afterAward(r, at).data, batchId: r.batchId }; };

function lessonWorld(opts: { hp?: number; strikeBack?: boolean; focusTag?: 'participation' | 'work'; lessons?: number } = {}) {
  const w = world();
  const data = startBattle(w.data, TEACHER, {
    classId: w.classId, bossId: 'grumblethorn', hp: opts.hp ?? 100, durationMs: 0, reward: { xp: 2, coins: 5 },
    lesson: { mission: "Finish today's work", focusTag: opts.focusTag, strikeBack: opts.strikeBack ?? true, lessonMs: 45 * MIN, lessons: opts.lessons ?? 1 },
  }, NOW).data;
  return { ...w, data, battle: () => currentBattle(data, w.classId)! };
}
const battleOf = (d: AppData, classId: string) => d.bosses.find((b) => b.classId === classId)!;

describe('World of Adventures 1.6: regions and bosses', () => {
  it('has nine regions in the order they open, each with its own guardian boss', () => {
    expect(REGIONS.map((r) => r.id)).toEqual(['verdant', 'crystal', 'lagoon', 'frostpeak', 'ember', 'hollow', 'sky', 'ancient', 'dunes']);
    for (let i = 1; i < REGIONS.length; i++) expect(REGIONS[i].unlockAp).toBeGreaterThan(REGIONS[i - 1].unlockAp);
    for (const r of REGIONS) {
      const boss = BOSSES_BY_ID[r.bossId];
      expect(boss?.regionId).toBe(r.id);
      expect(boss?.wandering).toBeFalsy();
    }
  });
  it('has twelve bosses; wandering bosses live in an open-early region and have no region chest', () => {
    expect(BOSSES).toHaveLength(12);
    const wandering = BOSSES.filter((b) => b.wandering);
    expect(wandering.map((b) => b.id).sort()).toEqual(['gloomwing', 'mudsnout', 'zapcrackle']);
    for (const b of wandering) expect(TREASURES.some((t) => t.rule.kind === 'boss' && t.rule.bossId === b.id)).toBe(false);
    for (const b of BOSSES) expect(b.strike.verb.length).toBeGreaterThan(3);
  });
  it('gives a class two bosses to battle from the very first day', () => {
    const { data, classId } = world();
    const open = BOSSES.filter((b) => b.regionId === 'verdant');
    expect(open.length).toBe(2);
    for (const b of open) expect(() => startBattle(data, TEACHER, { classId, bossId: b.id, hp: 50, durationMs: 0, reward: { xp: 1, coins: 1 }, lesson: { mission: 'x', strikeBack: true, lessonMs: 45 * MIN, lessons: 1 } }, NOW)).not.toThrow();
  });
  it('counts each befriended boss once for adventure points, however often it is befriended again', () => {
    let { data, ids, classId } = lessonWorld({ hp: 20 });
    data = award(data, ids, 'cat-behaviour', NOW + MIN); // 4 × 5 = 20: befriended
    expect(battleOf(data, classId).status).toBe('won');
    const once = adventurePoints(data, classId);
    data = startBattle(data, TEACHER, { classId, bossId: 'grumblethorn', hp: 20, durationMs: 0, reward: { xp: 0, coins: 0 }, lesson: { mission: 'Again', strikeBack: false, lessonMs: 45 * MIN, lessons: 1 } }, NOW + 2 * MIN).data;
    data = award(data, ids, 'cat-behaviour', NOW + 3 * MIN);
    expect(data.bosses.filter((b) => b.status === 'won')).toHaveLength(2);
    expect(adventurePoints(data, classId).bosses).toBe(1);
    expect(adventurePoints(data, classId).total - once.total).toBeLessThan(20);
  });
});

describe('Lesson battles', () => {
  it('sizes HP from class size, award values and length', () => {
    expect(lessonHp(24, 4, 1)).toBe(240);
    expect(lessonHp(24, 4, 2)).toBe(480);
    expect(lessonHp(24, 4, 1, 'gentle')).toBeLessThan(lessonHp(24, 4, 1));
    expect(lessonHp(24, 4, 1, 'tough')).toBeGreaterThan(lessonHp(24, 4, 1));
    expect(lessonHp(1, 1, 1)).toBeGreaterThanOrEqual(20);
    expect(MISSIONS.length).toBeGreaterThanOrEqual(6);
  });

  it('starts with the mission and a clock of one lesson per planned lesson; only the teacher can', () => {
    const w = world();
    const setup = { classId: w.classId, bossId: 'mudsnout', hp: 80, durationMs: 0, reward: { xp: 2, coins: 5 }, lesson: { mission: '  Read our passage  ', focusTag: 'reading' as const, strikeBack: true, lessonMs: 40 * MIN, lessons: 2 } };
    expect(() => startBattle(w.data, asStudent(w.ids[0]), setup, NOW)).toThrow(AdventureError);
    const d = startBattle(w.data, TEACHER, setup, NOW).data;
    const b = currentBattle(d, w.classId)!;
    expect(b.lesson).toMatchObject({ mission: 'Read our passage', focusTag: 'reading', strikeBack: true, lessons: 2, lessonMs: 40 * MIN });
    expect(battleTimeLeft(b, NOW)).toBe(80 * MIN);
    expect(d.adventureLog.at(-1)?.detail).toContain('Read our passage');
  });

  it("an award is that creature's attack; the power-up behaviour is super effective (double)", () => {
    let { data, ids, classId } = lessonWorld({ focusTag: 'participation' });
    data = award(data, [ids[0]], 'cat-behaviour', NOW + MIN); // 5
    data = award(data, [ids[1]], 'cat-participating', NOW + 2 * MIN); // 3 × 2
    const b = battleOf(data, classId);
    expect(b.contributions.map((x) => [x.studentId, x.amount, !!x.super])).toEqual([[ids[0], 5, false], [ids[1], 6, true]]);
    expect(battleTotal(b)).toBe(11);
  });

  it('a deduction makes the boss strike back at that creature and recover the points lost', () => {
    let { data, ids, classId } = lessonWorld();
    data = award(data, ids, 'cat-behaviour', NOW + MIN); // 20
    const before = data.students.find((s) => s.id === ids[0])!;
    data = award(data, [ids[0]], 'neg-unfinished', NOW + 2 * MIN); // -3
    const b = battleOf(data, classId);
    const strike = b.contributions.at(-1)!;
    expect(strike).toMatchObject({ studentId: ids[0], amount: -3, source: 'setback' });
    expect(battleTotal(b)).toBe(17);
    expect(battleRecovered(b)).toBe(3);
    // the student's only cost is the deduction itself: coins untouched, no creature lost
    const after = data.students.find((s) => s.id === ids[0])!;
    expect(after.coins).toBe(before.coins);
    expect(after.speciesId).toBe(before.speciesId);
    expect(contributionsByStudent(b).get(ids[0])).toBe(5); // helpers list shows only the good
  });

  it('records the strike even with nothing to recover, never pushes the meter below empty, and caps recovery', () => {
    let { data, ids, classId } = lessonWorld({ hp: 50 });
    data = award(data, [ids[0]], 'neg-talking', NOW + MIN); // nothing earned yet
    let b = battleOf(data, classId);
    expect(b.contributions).toHaveLength(1);
    expect(b.contributions[0].amount === 0).toBe(true);
    expect(battleTotal(b)).toBe(0);
    data = award(data, ids, 'cat-behaviour', NOW + 2 * MIN); // 20
    for (let i = 0; i < 6; i++) data = award(data, [ids[i % 4]], 'neg-unfinished', NOW + (3 + i) * MIN);
    b = battleOf(data, classId);
    expect(battleRecovered(b)).toBe(Math.floor(50 * LESSON.recoverCap)); // 10, not 18
    expect(battleTotal(b)).toBe(10);
  });

  it('can be set so deductions do not affect the battle', () => {
    let { data, ids, classId } = lessonWorld({ strikeBack: false });
    data = award(data, ids, 'cat-behaviour', NOW + MIN);
    data = award(data, [ids[0]], 'neg-unfinished', NOW + 2 * MIN);
    expect(battleOf(data, classId).contributions.every((x) => x.source === 'award')).toBe(true);
  });

  it('undo takes back both an attack and a strike back', () => {
    let { data, ids, classId } = lessonWorld();
    data = award(data, ids, 'cat-behaviour', NOW + MIN);
    const hit = give(data, [ids[0]], 'cat-work', NOW + 2 * MIN);
    data = undoAdventure(hit.data, hit.batchId, NOW + 3 * MIN);
    expect(battleTotal(battleOf(data, classId))).toBe(20);
    const strike = give(data, [ids[1]], 'neg-talking', NOW + 4 * MIN);
    expect(battleTotal(battleOf(strike.data, classId))).toBe(18);
    data = undoAdventure(strike.data, strike.batchId, NOW + 5 * MIN);
    expect(battleTotal(battleOf(data, classId))).toBe(20);
    expect(battleOf(data, classId).contributions.some((x) => x.source === 'setback')).toBe(false);
  });

  it('completing the mission is a team attack worth a quarter of the HP, once, and can befriend the boss', () => {
    let { data, ids, classId } = lessonWorld({ hp: 100 });
    for (let i = 0; i < 4; i++) data = award(data, ids, 'cat-behaviour', NOW + (1 + i) * MIN); // 80
    const b = currentBattle(data, classId)!;
    expect(() => completeMission(data, asStudent(ids[0]), b.id, NOW + 10 * MIN)).toThrow(AdventureError);
    const r = completeMission(data, TEACHER, b.id, NOW + 10 * MIN);
    data = r.data;
    const done = battleOf(data, classId);
    expect(done.status).toBe('won');
    expect(done.lesson?.missionDoneAt).toBe(NOW + 10 * MIN);
    expect(done.contributions.at(-1)).toMatchObject({ source: 'mission', amount: 25 });
    expect(r.notes.some((n) => n.type === 'boss-won')).toBe(true);
    // everyone gets the (small) lesson reward
    for (const s of data.students) expect(s.adventure?.bosses.some((x) => x.battleId === done.id)).toBe(true);
    expect(() => completeMission(data, TEACHER, b.id, NOW + 11 * MIN)).toThrow(AdventureError);
  });

  it("the mission can't be completed twice or while paused", () => {
    let { data, classId } = lessonWorld({ hp: 1000 });
    const id = currentBattle(data, classId)!.id;
    data = controlBattle(data, TEACHER, id, 'pause', NOW + MIN).data;
    expect(() => completeMission(data, TEACHER, id, NOW + 2 * MIN)).toThrow(/paused/);
    data = controlBattle(data, TEACHER, id, 'resume', NOW + 3 * MIN).data;
    data = completeMission(data, TEACHER, id, NOW + 4 * MIN).data;
    expect(battleTotal(battleOf(data, classId))).toBe(250);
    expect(() => completeMission(data, TEACHER, id, NOW + 5 * MIN)).toThrow(/already/);
  });

  it("when the lesson's time is up the battle pauses (progress kept); resuming adds a fresh lesson", () => {
    let { data, ids, classId } = lessonWorld({ hp: 200 });
    data = award(data, ids, 'cat-behaviour', NOW + MIN);
    const r = tickBattles(data, NOW + 50 * MIN);
    data = r.data;
    let b = battleOf(data, classId);
    expect(b.status).toBe('paused');
    expect(r.notes.some((n) => n.type === 'boss-timeup')).toBe(true);
    expect(battleTotal(b)).toBe(20);
    expect(battleTimeLeft(b, NOW + 24 * 60 * MIN)).toBe(0);
    // awards while it waits do not hit it
    data = award(data, ids, 'cat-behaviour', NOW + 60 * MIN);
    expect(battleTotal(battleOf(data, classId))).toBe(20);
    // next lesson
    const tomorrow = NOW + 24 * 60 * MIN;
    data = controlBattle(data, TEACHER, b.id, 'resume', tomorrow).data;
    b = battleOf(data, classId);
    expect(b.status).toBe('active');
    expect(battleTimeLeft(b, tomorrow)).toBe(45 * MIN);
    data = award(data, ids, 'cat-behaviour', tomorrow + MIN);
    expect(battleTotal(battleOf(data, classId))).toBe(40);
  });

  it('a long (multi-day) battle keeps its old rules: no strike back, ends when time runs out', () => {
    const w = world();
    let data = setRegion(w.data, TEACHER, w.classId, 'crystal', 'open', NOW).data;
    data = startBattle(data, TEACHER, { classId: w.classId, bossId: 'glimmerjaw', hp: 100, durationMs: 60 * MIN, reward: { xp: 1, coins: 1 } }, NOW).data;
    data = award(data, w.ids, 'cat-behaviour', NOW + MIN);
    data = award(data, [w.ids[0]], 'neg-talking', NOW + 2 * MIN);
    expect(battleOf(data, w.classId).contributions.every((x) => x.source === 'award')).toBe(true);
    expect(tickBattles(data, NOW + 2 * 60 * MIN).data.bosses[0].status).toBe('ended');
  });
});
