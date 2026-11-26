import { describe, expect, it } from 'vitest';
import { ELEMENT_SPECIALS, SPECIAL, bossSpecial, BOSSES } from '../data/adventure';
import { getSpecies } from '../data/species';
import type { AppData } from '../types';
import { TEACHER, afterAward, battleRemaining, battleTotal, currentBattle, rollLoot, specialPoints, startBattle, undoAdventure } from './adventure';
import { applyAward } from './awards';
import { CARD_FORMS, PACK, binderCount, cardForm, openPack, packPrice } from './cards';
import { addStudents, emptyData, newClass } from './roster';
import { mulberry32 } from './util';

/** 1.9: special attacks, a boss's special attack, lucky finds from befriended bosses, creature card packs. */
const NOW = new Date(2026, 10, 26, 9, 0).getTime();
const MIN = 60_000;

function battleWorld(hp = 400, names = ['Ahmed', 'Bea', 'Cy', 'Dee']) {
  const c = newClass('Test', 'Grade 2', NOW);
  let data: AppData = { ...emptyData(NOW), classes: [c] };
  data = addStudents(data, c.id, names, mulberry32(1), NOW);
  data = startBattle(data, TEACHER, {
    classId: c.id, bossId: 'grumblethorn', hp, durationMs: 0, reward: { xp: 2, coins: 5 },
    lesson: { mission: 'Work together', strikeBack: true, lessonMs: 45 * MIN, lessons: 1 },
  }, NOW).data;
  return { data, ids: data.students.map((s) => s.id), classId: c.id };
}
const give = (d: AppData, ids: string[], cat: string, at: number) => { const r = applyAward(d, ids, cat, at); return { data: afterAward(r, at).data, batchId: r.batchId }; };
const battle = (d: AppData, classId: string) => d.bosses.find((b) => b.classId === classId)!;
const xpOf = (d: AppData, cat: string) => d.categories.find((c) => c.id === cat)!.xp;

describe('1.9 special attacks', () => {
  it('names a special attack for every element and every boss', () => {
    for (const name of Object.values(ELEMENT_SPECIALS)) expect(name.length).toBeGreaterThan(3);
    for (const b of BOSSES) expect(bossSpecial(b.id).name).not.toBe('Big Stomp');
  });

  it("follows a creature's attack with its element's special attack each time its points pass another 10", () => {
    let { data, ids, classId } = battleWorld();
    const mine = () => battle(data, classId).contributions.filter((x) => x.source === 'special' && x.studentId === ids[0]);
    for (let i = 1; i <= 8; i++) {
      data = give(data, [ids[0]], 'cat-participating', NOW + i * MIN).data;
      // one special attack for every 10 points this creature has given (awards and the quests they finish)
      expect(mine()).toHaveLength(Math.floor(specialPoints(battle(data, classId), ids[0]) / SPECIAL.every));
    }
    expect(mine().length).toBeGreaterThanOrEqual(1);
    expect(mine()[0]).toMatchObject({ amount: SPECIAL.bonus, label: ELEMENT_SPECIALS[getSpecies(data.students[0].speciesId).element] });
    // only that creature's points count: the others gave none
    expect(battle(data, classId).contributions.filter((x) => x.source === 'special' && x.studentId !== ids[0])).toHaveLength(0);
    expect(xpOf(data, 'cat-participating')).toBeGreaterThan(0);
  });

  it('takes a special attack back with the award that set it off', () => {
    let { data, ids, classId } = battleWorld();
    let last = '';
    for (let i = 0; i < 6 && !battle(data, classId).contributions.some((x) => x.source === 'special'); i++) {
      const r = give(data, [ids[1]], 'cat-participating', NOW + (i + 1) * MIN); data = r.data; last = r.batchId;
    }
    expect(battle(data, classId).contributions.some((x) => x.source === 'special')).toBe(true);
    data = undoAdventure(data, last, NOW + 30 * MIN);
    expect(battle(data, classId).contributions.some((x) => x.source === 'special')).toBe(false);
  });

  it("answers with the boss's special attack once at half its HP and once at a quarter, recovering a little", () => {
    let { data, ids, classId } = battleWorld(200);
    let t = 0;
    while (battleRemaining(battle(data, classId)) > 100) data = give(data, ids, 'cat-participating', NOW + (t += 1) * MIN).data;
    let bs = battle(data, classId).contributions.filter((x) => x.source === 'boss-special');
    expect(bs).toHaveLength(1);
    expect(bs[0]).toMatchObject({ amount: -Math.round(200 * SPECIAL.bossHeal), label: bossSpecial('grumblethorn').name });
    // not again at the same threshold
    data = give(data, [ids[0]], 'cat-participating', NOW + (t += 1) * MIN).data;
    expect(battle(data, classId).contributions.filter((x) => x.source === 'boss-special')).toHaveLength(battleRemaining(battle(data, classId)) <= 50 ? 2 : 1);
    while (battleRemaining(battle(data, classId)) > 50 && battle(data, classId).status === 'active') data = give(data, ids, 'cat-participating', NOW + (t += 1) * MIN).data;
    bs = battle(data, classId).contributions.filter((x) => x.source === 'boss-special');
    expect(bs.length).toBe(2);
  });

  it('never lets the boss special undo a win: the winning hit befriends at once', () => {
    let { data, ids, classId } = battleWorld(40);
    let t = 0;
    while (currentBattle(data, classId)) data = give(data, ids, 'cat-participating', NOW + (t += 1) * MIN).data;
    const b = battle(data, classId);
    expect(b.status).toBe('won');
    expect(battleTotal(b)).toBeGreaterThanOrEqual(b.hp);
  });
});

describe('1.9 lucky finds from a befriended boss', () => {
  it('gives every student one lucky find, the same however often it is worked out', () => {
    const { data, classId } = battleWorld(40);
    const b = currentBattle(data, classId)!;
    const a = rollLoot(data, b, NOW), again = rollLoot(data, b, NOW);
    expect(Object.keys(a)).toHaveLength(4);
    expect(a).toEqual(again);
    for (const l of Object.values(a)) expect(['coins', 'xp', 'item', 'pack']).toContain(l.kind);
  });

  it('hands the finds out when the boss is befriended: packs into unopened packs, the rest as rewards', () => {
    let { data, ids, classId } = battleWorld(40, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
    const before = new Map(data.students.map((s) => [s.id, s]));
    let t = 0;
    while (currentBattle(data, classId)) data = give(data, ids, 'cat-participating', NOW + (t += 1) * MIN).data;
    const b = battle(data, classId);
    expect(b.loot && Object.keys(b.loot)).toHaveLength(10);
    for (const s of data.students) {
      const l = b.loot![s.id];
      if (l.kind === 'pack') expect(s.packs).toBe(1);
      if (l.kind === 'item') expect(s.unlockedItems).toContain(l.itemId);
      if (l.kind === 'coins') expect(data.rewardLedger[`bossloot:${b.id}:${s.id}`]).toBeTruthy();
      expect((s.coins ?? 0)).toBeGreaterThanOrEqual(before.get(s.id)!.coins ?? 0);
    }
  });

  it('leaves card packs out of the finds when card packs are switched off', () => {
    const w = battleWorld(40, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);
    const data = { ...w.data, settings: { ...w.data.settings, cardPacks: false } };
    const loot = rollLoot(data, currentBattle(data, w.classId)!, NOW);
    expect(Object.values(loot).some((l) => l.kind === 'pack')).toBe(false);
  });
});

describe('1.9 creature card packs', () => {
  const student = (coins: number, extra: Partial<AppData['students'][number]> = {}) => {
    const w = battleWorld(400, ['Ahmed']);
    return { ...w.data, students: w.data.students.map((s) => ({ ...s, coins, ...extra })) };
  };

  it('has a card for every form: five stages of each creature, the mythical forms and the Pixel Pals', () => {
    expect(CARD_FORMS.length).toBeGreaterThanOrEqual(200);
    expect(new Set(CARD_FORMS.map((f) => f.key)).size).toBe(CARD_FORMS.length);
    expect(CARD_FORMS.filter((f) => f.rarity === 'mythical').every((f) => f.key.endsWith('-5b'))).toBe(true);
    expect(cardForm('emberpup-5b')?.mythic).toBe(true);
  });

  it('costs the pack price in coins and gives three cards, the last one Rare or better', () => {
    const data = student(100);
    const r = openPack(data, data.students[0].id, mulberry32(7));
    if ('error' in r) throw new Error(r.error);
    expect(r.cards).toHaveLength(PACK.size);
    expect(['rare', 'epic', 'legendary', 'mythical']).toContain(r.cards[2].rarity);
    expect(r.paid).toBe(packPrice(data.settings));
    const s = r.data.students[0];
    expect(s.coins).toBe(100 - r.paid + r.refund);
    expect(binderCount(s).have).toBe(new Set(r.cards.map((c) => c.key)).size);
  });

  it('opens a pack won from a boss first, for free', () => {
    const data = student(0, { packs: 2 });
    const r = openPack(data, data.students[0].id, mulberry32(3));
    if ('error' in r) throw new Error(r.error);
    expect(r.usedPack).toBe(true);
    expect(r.paid).toBe(0);
    expect(r.data.students[0].packs).toBe(1);
  });

  it('turns a copy a student already has into coins', () => {
    // a student who already has every card: every card is a copy
    const all = Object.fromEntries(CARD_FORMS.map((f) => [f.key, 1]));
    const data = student(25, { cards: all });
    const r = openPack(data, data.students[0].id, mulberry32(11));
    if ('error' in r) throw new Error(r.error);
    expect(r.cards.every((c) => !c.isNew)).toBe(true);
    expect(r.refund).toBe(PACK.size * PACK.duplicateCoins);
    expect(r.data.students[0].coins).toBe(25 - 25 + r.refund);
  });

  it('refuses without enough coins, or when the teacher switched card packs off', () => {
    const poor = student(5);
    expect(openPack(poor, poor.students[0].id)).toEqual({ error: 'coins' });
    const off = { ...student(100), settings: { ...student(100).settings, cardPacks: false } };
    expect(openPack(off, off.students[0].id)).toEqual({ error: 'disabled' });
    const priced = { ...student(10), settings: { ...student(10).settings, packPrice: 10 } };
    expect('error' in openPack(priced, priced.students[0].id)).toBe(false);
  });
});
