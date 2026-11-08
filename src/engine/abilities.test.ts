import { describe, expect, it } from 'vitest';
import { abilitiesFor } from '../data/abilities';
import { BRANCHES } from '../data/branches';
import { getSpecies } from '../data/species';
import type { AppData } from '../types';
import { abilityTree, raiseAbility, resetAbilities, skillPoints } from './abilities';
import { applyAward } from './awards';
import { addStudents, emptyData, newClass } from './roster';
import { mulberry32 } from './util';

const NOW = new Date(2026, 10, 4, 10, 0).getTime();
function at(xp: number, bestStage: 1 | 2 | 3 | 4 | 5, speciesId = 'emberpup'): { data: AppData; id: string } {
  const c = newClass('Test', 'Grade 2', NOW);
  let data: AppData = { ...emptyData(), classes: [c] };
  data = addStudents(data, c.id, ['Amira'], mulberry32(1), NOW);
  data = { ...data, students: data.students.map((s) => ({ ...s, xp, bestStage, speciesId })) };
  return { data, id: data.students[0].id };
}

describe('abilities and skill tree', () => {
  it('every creature has four abilities, one per tier, the last following its path', () => {
    const sp = getSpecies('emberpup');
    expect(abilitiesFor(sp).map((a) => a.tier)).toEqual([1, 2, 3, 4]);
    expect(abilitiesFor(sp)[0].name).toBe('Flame Burst');
    expect(abilitiesFor(sp, 'b')[3].name).toContain(BRANCHES.emberpup.b.title);
  });
  it('earns one skill point per level and stays locked until the creature evolves', () => {
    const baby = at(0, 1);
    expect(skillPoints(baby.data.students[0], baby.data.settings).free).toBe(0);
    expect(abilityTree(baby.data.students[0], baby.data.settings).every((v) => v.status === 'needsStage')).toBe(true);
    const young = at(120, 2); // level 3, stage 2 → 2 points
    expect(skillPoints(young.data.students[0], young.data.settings)).toEqual({ earned: 2, spent: 0, free: 2 });
    const tree = abilityTree(young.data.students[0], young.data.settings);
    expect(tree[0].status).toBe('unlock');
    expect(tree[1].status).toBe('needsStage');
  });
  it('spends points to awaken and rank up, gated by level, and unlocks Ability Adept', () => {
    let { data, id } = at(120, 2);
    data = raiseAbility(data, id, 'flame-burst', NOW)!;
    expect(data.students[0].skills!['flame-burst']).toBe(1);
    expect(data.students[0].achievements.map((a) => a.id)).toContain('ability-adept');
    // rank 2 needs level 4 (210 XP)
    expect(abilityTree(data.students[0], data.settings)[0].status).toBe('needsLevel');
    expect(raiseAbility(data, id, 'flame-burst', NOW)).toBeNull();
    data = { ...data, students: data.students.map((s) => ({ ...s, xp: 210 })) };
    data = raiseAbility(data, id, 'flame-burst', NOW)!;
    expect(data.students[0].skills!['flame-burst']).toBe(2);
    expect(skillPoints(data.students[0], data.settings).free).toBe(1);
  });
  it('never spends a point that is not there, and a reset gives every point back', () => {
    // level 10: 9 points for 12 ranks, so students have to choose
    let { data, id } = at(1200, 5);
    const tree = abilitiesFor(getSpecies('emberpup'));
    data = { ...data, students: data.students.map((s) => ({ ...s, skills: { [tree[0].id]: 3, [tree[1].id]: 3, [tree[2].id]: 3 } })) };
    expect(skillPoints(data.students[0], data.settings).free).toBe(0);
    expect(abilityTree(data.students[0], data.settings)[3].status).toBe('needsPoint');
    expect(raiseAbility(data, id, tree[3].id, NOW)).toBeNull();
    data = resetAbilities(data, id);
    expect(skillPoints(data.students[0], data.settings).free).toBe(9);
  });
  it('abilities are cosmetic: awarding XP is unaffected by them', () => {
    const a = at(120, 2);
    const b = { ...a, data: raiseAbility(a.data, a.id, 'flame-burst', NOW)! };
    const ra = applyAward(a.data, [a.id], 'cat-behaviour', NOW).outcomes[0];
    const rb = applyAward(b.data, [b.id], 'cat-behaviour', NOW).outcomes[0];
    expect(rb.xp).toBe(ra.xp);
    expect(rb.coins).toBe(ra.coins);
  });
});
