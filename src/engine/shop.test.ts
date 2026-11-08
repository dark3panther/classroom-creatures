import { describe, expect, it } from 'vitest';
import { ITEMS_BY_ID } from '../data/defaults';
import type { AppData } from '../types';
import { applyAward, refreshClasses } from './awards';
import { equipItem, inSeason, itemPrice, itemState, purchase } from './shop';
import { addStudents, emptyData, newClass } from './roster';
import { mulberry32 } from './util';

const NOW = new Date(2026, 10, 4, 10, 0).getTime(); // 4 Nov: autumn

function one(coins = 0): { data: AppData; id: string } {
  const c = newClass('Test', 'Grade 2', NOW);
  let data: AppData = { ...emptyData(), classes: [c] };
  data = addStudents(data, c.id, ['Amira'], mulberry32(1), NOW);
  data = { ...data, students: data.students.map((s) => ({ ...s, coins })) };
  return { data, id: data.students[0].id };
}

describe('shop', () => {
  it('buys with coins, never twice, never below zero', () => {
    let { data, id } = one(100);
    const r = purchase(data, id, 'armor-leather', NOW);
    expect('data' in r).toBe(true);
    data = (r as { data: AppData }).data;
    expect(data.students[0].coins).toBe(45);
    expect(data.students[0].unlockedItems).toContain('armor-leather');
    expect(purchase(data, id, 'armor-leather', NOW)).toEqual({ error: 'owned' });
    expect(purchase(data, id, 'armor-knight', NOW)).toEqual({ error: 'coins' });
    expect(data.students[0].coins).toBe(45);
  });
  it('uses teacher prices and respects items switched off', () => {
    let { data, id } = one(30);
    data = { ...data, settings: { ...data.settings, itemPrices: { 'armor-leather': 20 }, disabledItems: ['hat-pirate'] } };
    expect(itemPrice(ITEMS_BY_ID['armor-leather'], data.settings)).toBe(20);
    expect('data' in purchase(data, id, 'armor-leather', NOW)).toBe(true);
    expect(purchase(data, id, 'hat-pirate', NOW)).toEqual({ error: 'disabled' });
  });
  it('sells limited-time items only in season, including windows that cross the new year', () => {
    const { data, id } = one(500);
    expect(inSeason(ITEMS_BY_ID['hat-leafcrown'].season, NOW)).toBe(true);
    expect(purchase(data, id, 'hat-blossom', NOW)).toEqual({ error: 'season' });
    expect(inSeason(ITEMS_BY_ID['deco-snowscarf'].season, new Date(2027, 0, 15).getTime())).toBe(true);
    expect(inSeason(ITEMS_BY_ID['deco-snowscarf'].season, new Date(2027, 5, 15).getTime())).toBe(false);
    expect(itemState(ITEMS_BY_ID['hat-blossom'], data.students[0], data.settings, NOW)).toBe('unavailable');
  });
  it('equips owned items into their own slot, unequips, and never equips what is not owned', () => {
    let { data, id } = one(200);
    data = (purchase(data, id, 'trail-ember', NOW) as { data: AppData }).data;
    data = equipItem(data, id, 'trail', 'trail-ember', NOW);
    expect(data.students[0].equipped.trail).toBe('trail-ember');
    data = equipItem(data, id, 'armor', 'armor-knight', NOW);
    expect(data.students[0].equipped.armor).toBeUndefined();
    data = equipItem(data, id, 'trail', null, NOW);
    expect(data.students[0].equipped.trail).toBeUndefined();
    data = equipItem(data, id, 'background', null, NOW);
    expect(data.students[0].equipped.background).toBe('bg-habitat');
  });
  it('unlocks evolution cosmetics by stage and class collection rewards for everyone in the class', () => {
    let { data, id } = one();
    for (let i = 0; i < 70; i++) data = applyAward(data, [id], 'cat-behaviour', NOW + i).data; // 350 XP: stage 3
    expect(data.students[0].unlockedItems).toContain('deco-evobadge');
    expect(data.students[0].unlockedItems).not.toContain('trail-star');
    const forms = Array.from({ length: 50 }, (_, i) => `x${i}-1`);
    data = refreshClasses({ ...data, classes: data.classes.map((c) => ({ ...c, discovered: [...(c.discovered ?? []), ...forms] })) }, [data.classes[0].id], NOW);
    expect(data.students[0].unlockedItems).toContain('trail-star');
    expect(data.students[0].achievements.map((a) => a.id)).toContain('creature-collector');
  });
});
