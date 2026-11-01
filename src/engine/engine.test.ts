import { describe, expect, it } from 'vitest';
import { DEFAULT_LEVEL_XP, DEFAULT_EVOLUTION_LEVELS } from '../data/defaults';
import { SPECIES } from '../data/species';
import type { AppData } from '../types';
import { applyAward, challengeProgress, undoBatch } from './awards';
import { parseBackup, toBackup } from './backup';
import { buildDemoData, removeDemo } from './demo';
import { levelForXp, levelProgress, nextEvolution, stageForXp, validateProgression } from './progression';
import { addStudents, emptyData, newClass, parseNames, pickSpecies, speciesChoices } from './roster';
import { mulberry32 } from './util';

const prog = { levelXp: DEFAULT_LEVEL_XP, evolutionLevels: DEFAULT_EVOLUTION_LEVELS };
const NOW = new Date(2026, 10, 4, 10, 0).getTime(); // a Wednesday

function classWith(names: string[]): { data: AppData; ids: string[] } {
  const c = newClass('Test', 'Grade 2', NOW);
  let data: AppData = { ...emptyData(), classes: [c] };
  data = addStudents(data, c.id, names, mulberry32(1), NOW);
  return { data, ids: data.students.map((s) => s.id) };
}

describe('progression', () => {
  it('maps the boundary XP values to the configured levels', () => {
    expect(levelForXp(0, DEFAULT_LEVEL_XP)).toBe(1);
    expect(levelForXp(49, DEFAULT_LEVEL_XP)).toBe(1);
    expect(levelForXp(50, DEFAULT_LEVEL_XP)).toBe(2);
    expect(levelForXp(119, DEFAULT_LEVEL_XP)).toBe(2);
    expect(levelForXp(120, DEFAULT_LEVEL_XP)).toBe(3);
    expect(levelForXp(1199, DEFAULT_LEVEL_XP)).toBe(9);
    expect(levelForXp(1200, DEFAULT_LEVEL_XP)).toBe(10);
    expect(levelForXp(99999, DEFAULT_LEVEL_XP)).toBe(10);
  });
  it('maps levels to the five evolution stages', () => {
    expect(stageForXp(0, prog)).toBe(1);
    expect(stageForXp(119, prog)).toBe(1);
    expect(stageForXp(120, prog)).toBe(2); // level 3
    expect(stageForXp(320, prog)).toBe(3); // level 5
    expect(stageForXp(600, prog)).toBe(4); // level 7
    expect(stageForXp(1200, prog)).toBe(5); // level 10
  });
  it('reports progress inside a level and the next evolution target', () => {
    const p = levelProgress(85, DEFAULT_LEVEL_XP);
    expect(p).toMatchObject({ level: 2, into: 35, span: 70, toNext: 35 });
    expect(nextEvolution(85, prog)).toMatchObject({ stage: 2, level: 3, atXp: 120, xpNeeded: 35 });
    expect(nextEvolution(1200, prog)).toBeNull();
    expect(levelProgress(1500, DEFAULT_LEVEL_XP).isMax).toBe(true);
  });
  it('rejects broken progression tables', () => {
    expect(validateProgression(DEFAULT_LEVEL_XP, [...DEFAULT_EVOLUTION_LEVELS])).toBeNull();
    expect(validateProgression([0, 50, 40, 60, 80], [1, 2, 3, 4, 5])).toMatch(/more XP/);
    expect(validateProgression(DEFAULT_LEVEL_XP, [1, 3, 3, 7, 10])).toMatch(/higher level/);
    expect(validateProgression(DEFAULT_LEVEL_XP, [1, 3, 5, 7, 12])).toMatch(/above the highest/);
  });
});

describe('creature assignment', () => {
  it('ships at least 30 species across all 10 elements and 5 rarities', () => {
    expect(SPECIES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(SPECIES.map((s) => s.element)).size).toBe(10);
    expect(new Set(SPECIES.map((s) => s.rarity)).size).toBe(5);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
  });
  it('gives every student in a class a different creature while species remain', () => {
    const names = Array.from({ length: 30 }, (_, i) => `Kid ${i}`);
    const { data } = classWith(names);
    expect(new Set(data.students.map((s) => s.speciesId)).size).toBe(30);
  });
  it('spreads duplicates evenly once all species are used', () => {
    const { data } = classWith(Array.from({ length: 35 }, (_, i) => `Kid ${i}`));
    const counts = new Map<string, number>();
    data.students.forEach((s) => counts.set(s.speciesId, (counts.get(s.speciesId) ?? 0) + 1));
    expect(Math.max(...counts.values())).toBe(2);
  });
  it('offers distinct unused choices', () => {
    const { data } = classWith(['A', 'B']);
    const choices = speciesChoices(data.students, 3, mulberry32(3));
    expect(new Set(choices).size).toBe(3);
    choices.forEach((c) => expect(data.students.map((s) => s.speciesId)).not.toContain(c));
    expect(pickSpecies([], mulberry32(9), SPECIES.slice(1).map((s) => s.id))).toBe(SPECIES[0].id);
  });
});

describe('awarding XP', () => {
  it('adds XP, logs an event and counts the category tag', () => {
    const { data, ids } = classWith(['Ana']);
    const r = applyAward(data, ids, 'cat-reading', NOW);
    const s = r.data.students[0];
    expect(s.xp).toBe(5);
    expect(s.tagCounts.reading).toBe(1);
    expect(s.tagXp.reading).toBe(5);
    expect(r.data.events).toHaveLength(1);
    expect(r.outcomes[0]).toMatchObject({ xp: 5, levelBefore: 1, levelAfter: 1, evolved: false });
  });
  it('awards several students at once in one undoable batch', () => {
    const { data, ids } = classWith(['A', 'B', 'C']);
    const r = applyAward(data, ids, 'cat-teamwork', NOW);
    expect(r.data.students.map((s) => s.xp)).toEqual([5, 5, 5]);
    expect(new Set(r.data.events.map((e) => e.batchId)).size).toBe(1);
    const u = undoBatch(r.data, r.batchId);
    expect(u.students.map((s) => s.xp)).toEqual([0, 0, 0]);
    expect(u.events.every((e) => e.undone)).toBe(true);
  });
  it('detects level-ups and first-time evolutions automatically', () => {
    let { data, ids } = classWith(['Evo']);
    data = { ...data, students: data.students.map((s) => ({ ...s, xp: 117 })) };
    const r = applyAward(data, ids, 'cat-behaviour', NOW);
    expect(r.outcomes[0]).toMatchObject({ levelBefore: 2, levelAfter: 3, stageBefore: 1, stageAfter: 2, evolved: true });
    expect(r.data.students[0].bestStage).toBe(2);
    expect(r.outcomes[0].newAchievements).toContain('evolution-master');
    expect(r.outcomes[0].newItems).toContain('deco-medal');
  });
  it('undo takes back the XP and anything that award unlocked', () => {
    let { data, ids } = classWith(['Evo']);
    data = { ...data, students: data.students.map((s) => ({ ...s, xp: 117 })) };
    const r = applyAward(data, ids, 'cat-behaviour', NOW);
    const u = undoBatch(r.data, r.batchId);
    const s = u.students[0];
    expect(s.xp).toBe(117);
    expect(s.bestStage).toBe(1);
    expect(s.achievements.map((a) => a.id)).not.toContain('evolution-master');
    expect(s.unlockedItems).not.toContain('deco-medal');
    expect(undoBatch(u, r.batchId)).toBe(u); // second undo is a no-op
  });
  it('unlocks First Steps at 10 XP and Super Reader at 50 reading XP', () => {
    let { data, ids } = classWith(['R']);
    for (let i = 0; i < 10; i++) data = applyAward(data, ids, 'cat-reading', NOW + i).data;
    const got = data.students[0].achievements.map((a) => a.id);
    expect(got).toContain('first-steps');
    expect(got).toContain('super-reader');
    expect(data.students[0].unlockedItems).toContain('hat-wizard');
  });
  it('ignores negative categories while they are disabled', () => {
    let { data, ids } = classWith(['N']);
    data = { ...data, categories: [...data.categories, { id: 'neg', name: 'Oops', xp: -5, icon: 'x', color: '#000', tag: 'other' }] };
    const r = applyAward(data, ids, 'neg', NOW);
    expect(r.outcomes).toHaveLength(0);
    expect(r.data).toBe(data);
  });
  it('negative points never drop a creature below its current evolution stage', () => {
    let { data, ids } = classWith(['N']);
    data = {
      ...data,
      settings: { ...data.settings, negativeEnabled: true },
      categories: [...data.categories, { id: 'neg', name: 'Oops', xp: -5, icon: 'x', color: '#000', tag: 'other' }],
      students: data.students.map((s) => ({ ...s, xp: 122, bestStage: 2 })),
    };
    const r = applyAward(data, ids, 'neg', NOW);
    expect(r.data.students[0].xp).toBe(120);
    expect(r.data.events[0].xp).toBe(-2);
    expect(stageForXp(r.data.students[0].xp, prog)).toBe(2);
  });
  it('tracks daily challenges and records completion once per day', () => {
    let { data, ids } = classWith(['C']);
    const ch = data.challenges.find((c) => c.id === 'ch-participate-3')!;
    data = applyAward(data, ids, 'cat-participating', NOW).data;
    data = applyAward(data, ids, 'cat-participating', NOW + 1).data;
    expect(challengeProgress(ch, ids[0], data.events, NOW + 2)).toEqual({ value: 2, done: false });
    const r = applyAward(data, ids, 'cat-participating', NOW + 3);
    expect(r.outcomes[0].completedChallenges).toContain('ch-participate-3');
    const r2 = applyAward(r.data, ids, 'cat-participating', NOW + 4);
    expect(r2.outcomes[0].completedChallenges).not.toContain('ch-participate-3');
    // next day starts fresh
    expect(challengeProgress(ch, ids[0], r2.data.events, NOW + 86_400_000).value).toBe(0);
  });
});

describe('names import', () => {
  it('parses plain lists and CSVs with headers', () => {
    expect(parseNames('Ana\nBo\n\n  Cy  ')).toEqual(['Ana', 'Bo', 'Cy']);
    expect(parseNames('Name,Grade\n"Lee, Min",2\nSam,3')).toEqual(['Lee, Min', 'Sam']);
    expect(parseNames('First Name;Last Name\nAna;Silva\nBo;Kim')).toEqual(['Ana Silva', 'Bo Kim']);
  });
});

describe('backup', () => {
  it('round-trips data and rejects garbage', () => {
    const demo = buildDemoData(NOW);
    const { data, summary } = parseBackup(JSON.stringify(toBackup(demo)));
    expect(data.students).toHaveLength(demo.students.length);
    expect(data.students.map((s) => s.xp)).toEqual(demo.students.map((s) => s.xp));
    expect(summary.students).toBe(16);
    expect(() => parseBackup('nope')).toThrow(/not valid JSON/);
    expect(() => parseBackup('{"a":1}')).toThrow(/does not look like/);
  });
});

describe('demo data', () => {
  it('is populated, labelled, spans several stages and can be removed', () => {
    const demo = buildDemoData(NOW);
    expect(demo.classes[0].isDemo).toBe(true);
    expect(demo.students.every((s) => s.isDemo)).toBe(true);
    const stages = new Set(demo.students.map((s) => stageForXp(s.xp, prog)));
    expect(stages.size).toBeGreaterThanOrEqual(3);
    const cleared = removeDemo(demo);
    expect(cleared.students).toHaveLength(0);
    expect(cleared.events).toHaveLength(0);
  });
});

describe('display stage', () => {
  it('never shows a creature below the best stage it reached when the XP table changes', async () => {
    const { displayStage } = await import('./progression');
    const harder = { levelXp: [0, 100, 300, 500, 700, 900, 1100, 1300, 1500, 2000], evolutionLevels: DEFAULT_EVOLUTION_LEVELS };
    expect(stageForXp(130, harder)).toBe(1);
    expect(displayStage({ xp: 130, bestStage: 2 }, harder)).toBe(2);
  });
});
