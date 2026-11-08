import { describe, expect, it } from 'vitest';
import { BRANCHES, formKey } from '../data/branches';
import type { AppData, Student } from '../types';
import { ADJUST_CATEGORY_ID, applyAward, buyItem, undoBatch } from './awards';
import { migrate, parseBackup, toBackup } from './backup';
import { collectionStats, formsOf, TOTAL_FORMS } from './collection';
import { approveEvolution, needsBranchChoice, pendingStage } from './evolution';
import { displayStage, readyToEvolve } from './progression';
import { addStudents, DATA_VERSION, emptyData, newClass } from './roster';
import { mulberry32 } from './util';

const NOW = new Date(2026, 10, 4, 10, 0).getTime();

function classWith(names: string[], patch: Partial<AppData['settings']> = {}): { data: AppData; ids: string[] } {
  const c = newClass('Test', 'Grade 2', NOW);
  let data: AppData = { ...emptyData(), classes: [c] };
  data.settings = { ...data.settings, ...patch };
  data = addStudents(data, c.id, names, mulberry32(1), NOW);
  return { data, ids: data.students.map((s) => s.id) };
}
const student = (d: AppData, id: string) => d.students.find((s) => s.id === id)!;
/** award the 5-XP category n times */
function give(data: AppData, id: string, n: number) {
  let d = data;
  for (let i = 0; i < n; i++) d = applyAward(d, [id], 'cat-behaviour', NOW + i).data;
  return d;
}

/** A realistic v2 (1.3) save: progress, coins, purchases, equipped items, history. */
function v2Save(): AppData {
  const { data, ids } = classWith(['Amira', 'Ben']);
  let d = give(data, ids[0], 30); // 150 XP: level 3, stage 2
  d = { ...d, students: d.students.map((s) => (s.id === ids[0] ? { ...s, coins: 87, unlockedItems: [...s.unlockedItems, 'hat-pirate', 'outfit-tee'], equipped: { ...s.equipped, hat: 'hat-pirate', outfit: 'outfit-tee' } } : s)) };
  // strip everything 1.4 added, as an old save would look
  const old = JSON.parse(JSON.stringify(d)) as AppData & { settings: Record<string, unknown> };
  old.version = 2;
  for (const k of ['evolutionMode', 'soundVolume', 'uiSounds', 'disabledSpecies', 'disabledItems', 'itemPrices', 'shopWhileLocked']) delete old.settings[k];
  old.students = old.students.map((s) => { const c = { ...s } as Partial<Student>; delete c.evolutionLog; delete c.skills; delete c.interactions; return c as Student; });
  old.classes = old.classes.map((c) => { const x = { ...c }; delete x.discovered; return x; });
  return old;
}

describe('1.4 data migration (v2 → v3)', () => {
  it('keeps every student, their XP, coins, creature, owned and equipped items', () => {
    const old = v2Save();
    const m = migrate(old);
    expect(m.version).toBe(DATA_VERSION);
    expect(m.students).toHaveLength(old.students.length);
    for (const before of old.students) {
      const after = m.students.find((s) => s.id === before.id)!;
      expect(after.name).toBe(before.name);
      expect(after.xp).toBe(before.xp);
      expect(after.coins).toBe(before.coins);
      expect(after.speciesId).toBe(before.speciesId);
      expect(after.bestStage).toBe(before.bestStage);
      expect(after.unlockedItems).toEqual(before.unlockedItems);
      expect(after.equipped).toEqual(before.equipped);
      expect(after.achievements).toEqual(before.achievements);
    }
    expect(m.events).toHaveLength(old.events.length);
  });
  it('adds safe defaults: automatic evolution, history from the stages reached, discoveries, sound', () => {
    const old = v2Save();
    const m = migrate(old);
    expect(m.settings.evolutionMode).toBe('auto');
    expect(m.settings.soundVolume).toBeGreaterThan(0);
    const amira = m.students.find((s) => s.name === 'Amira')!;
    expect(amira.evolutionLog!.map((e) => e.stage)).toEqual([2]);
    expect(amira.interactions).toEqual({ pet: 0, feed: 0, play: 0 });
    expect(m.classes[0].discovered).toEqual(expect.arrayContaining([`${amira.speciesId}-1`, `${amira.speciesId}-2`]));
  });
  it('is idempotent and repairs invalid new fields', () => {
    const m = migrate(v2Save());
    expect(migrate(m)).toEqual(m);
    const broken = { ...m, settings: { ...m.settings, soundVolume: 7, evolutionMode: 'banana' as never }, students: m.students.map((s) => ({ ...s, branch: 'z' as never, skills: null as never })) };
    const fixed = migrate(broken);
    expect(fixed.settings.soundVolume).toBeLessThanOrEqual(1);
    expect(fixed.settings.evolutionMode).toBe('auto');
    expect(fixed.students.every((s) => s.branch === undefined && typeof s.skills === 'object')).toBe(true);
  });
  it('imports a v2 backup file through the same migration', () => {
    const old = v2Save();
    const { data } = parseBackup(JSON.stringify(toBackup(old)));
    expect(data.version).toBe(DATA_VERSION);
    expect(data.students.find((s) => s.name === 'Amira')!.coins).toBe(87);
  });
});

describe('evolution: automatic and teacher approval', () => {
  it('automatic mode evolves at the XP threshold, logs the evolution and discovers the form', () => {
    const { data, ids } = classWith(['A']);
    const d = give(data, ids[0], 24); // 120 XP → level 3 → stage 2
    const s = student(d, ids[0]);
    expect(s.bestStage).toBe(2);
    expect(s.evolutionLog!.map((e) => e.stage)).toEqual([2]);
    expect(d.classes[0].discovered).toContain(`${s.speciesId}-2`);
  });
  it('approval mode waits for the teacher, flags readiness once, and evolves one stage per approval', () => {
    const { data, ids } = classWith(['A'], { evolutionMode: 'approval' });
    let d = data;
    let flagged = 0;
    for (let i = 0; i < 70; i++) { // 350 XP: enough for stage 3
      const r = applyAward(d, [ids[0]], 'cat-behaviour', NOW + i);
      if (r.outcomes[0].readyToEvolve) flagged++;
      expect(r.outcomes[0].evolved).toBe(false);
      d = r.data;
    }
    const s = student(d, ids[0]);
    expect(flagged).toBe(1);
    expect(s.bestStage).toBe(1);
    expect(displayStage(s, d.settings)).toBe(1);
    expect(readyToEvolve(s, d.settings)).toBe(true);
    expect(pendingStage(s, d)).toBe(2);
    const first = approveEvolution(d, ids[0], undefined, NOW + 100)!;
    expect(first.to).toBe(2);
    const second = approveEvolution(first.data, ids[0], undefined, NOW + 200)!;
    expect(second.to).toBe(3);
    expect(approveEvolution(second.data, ids[0])).toBeNull();
    const after = student(second.data, ids[0]);
    expect(after.evolutionLog!.map((e) => e.stage)).toEqual([2, 3]);
    expect(after.xp).toBe(350); // approving never changes XP or coins
    expect(after.coins).toBe(student(d, ids[0]).coins);
  });
  it('branching species choose a path at the final stage, and the mythical form is discovered', () => {
    const { data, ids } = classWith(['A'], { evolutionMode: 'approval' });
    const branching = Object.keys(BRANCHES)[0];
    let d: AppData = { ...data, students: data.students.map((s) => ({ ...s, speciesId: branching, xp: 1200, bestStage: 4 })) };
    const s = student(d, ids[0]);
    expect(needsBranchChoice(s)).toBe(true);
    const r = approveEvolution(d, ids[0], 'b', NOW)!;
    d = r.data;
    expect(r.to).toBe(5);
    expect(student(d, ids[0]).branch).toBe('b');
    expect(d.classes[0].discovered).toContain(formKey(branching, 5, 'b'));
    expect(formsOf(student(d, ids[0]))).toContain(`${branching}-5b`);
  });
  it('undoing the award behind an approved evolution reverses it and its log entry', () => {
    const { data, ids } = classWith(['A'], { evolutionMode: 'approval' });
    let d = give(data, ids[0], 23); // 115 XP
    const r = applyAward(d, [ids[0]], 'cat-behaviour', NOW + 50); // 120 XP: ready
    d = approveEvolution(r.data, ids[0], undefined, NOW + 60)!.data;
    expect(student(d, ids[0]).bestStage).toBe(2);
    d = undoBatch(d, r.batchId);
    expect(student(d, ids[0]).bestStage).toBe(1);
    expect(student(d, ids[0]).evolutionLog).toEqual([]);
  });
});

describe('teacher XP adjustment', () => {
  it('logs a correction without coins, may go to 0, never de-evolves, and can be undone', () => {
    const { data, ids } = classWith(['A']);
    let d = give(data, ids[0], 30); // 150 XP, stage 2
    const coins = student(d, ids[0]).coins;
    const r = applyAward(d, [ids[0]], ADJUST_CATEGORY_ID, NOW + 99, { xp: -500, note: 'typo' });
    d = r.data;
    const s = student(d, ids[0]);
    expect(s.xp).toBe(0);
    expect(s.coins).toBe(coins);
    expect(displayStage(s, d.settings)).toBe(2);
    expect(d.events.at(-1)).toMatchObject({ adjust: true, note: 'typo', categoryId: ADJUST_CATEGORY_ID });
    d = undoBatch(d, r.batchId);
    expect(student(d, ids[0]).xp).toBe(150);
  });
});

describe('purchases survive undo', () => {
  it('undoing an unrelated award keeps bought items and what is equipped', () => {
    const { data, ids } = classWith(['A']);
    let d = give(data, ids[0], 20); // 100 coins
    d = buyItem(d, ids[0], 'hat-pirate', 60)!;
    d = { ...d, students: d.students.map((s) => ({ ...s, equipped: { ...s.equipped, hat: 'hat-pirate' } })) };
    const r = applyAward(d, [ids[0]], 'cat-behaviour', NOW + 500);
    d = undoBatch(r.data, r.batchId);
    expect(student(d, ids[0]).unlockedItems).toContain('hat-pirate');
    expect(student(d, ids[0]).equipped.hat).toBe('hat-pirate');
  });
});

describe('class encyclopedia', () => {
  it('counts discovered forms out of every form including mythical paths', () => {
    const { data } = classWith(['A', 'B', 'C']);
    const st = collectionStats(data.classes[0]);
    expect(st.total).toBe(TOTAL_FORMS);
    expect(TOTAL_FORMS).toBe(30 * 5 + Object.keys(BRANCHES).length);
    expect(st.discovered).toBe(3); // three baby forms
    expect(st.species).toBe(3);
  });
});

describe('teacher reset', () => {
  it('starts one student over and leaves classmates and class discoveries alone', async () => {
    const { resetProgress } = await import('./roster');
    const { data, ids } = classWith(['A', 'B']);
    let d = give(data, ids[0], 40);
    d = give(d, ids[1], 10);
    const disc = d.classes[0].discovered!.length;
    d = resetProgress({ ...d, students: d.students.map((s) => (s.id === ids[0] ? { ...s, nickname: 'Sparky' } : s)) }, ids[0], NOW);
    const a = student(d, ids[0]);
    expect(a.xp).toBe(0);
    expect(a.coins).toBe(0);
    expect(a.bestStage).toBe(1);
    expect(a.nickname).toBe('Sparky');
    expect(d.events.some((e) => e.studentId === ids[0])).toBe(false);
    expect(student(d, ids[1]).xp).toBe(50);
    expect(d.classes[0].discovered!.length).toBe(disc);
  });
});

describe('teacher creature choices', () => {
  it('new students, re-rolls and student choices skip switched-off creatures', async () => {
    const { pickSpecies, speciesChoices } = await import('./roster');
    const { SPECIES } = await import('../data/species');
    const off = SPECIES.slice(0, 25).map((s) => s.id);
    const { data } = classWith(['A', 'B', 'C', 'D', 'E', 'F', 'G'], { disabledSpecies: off });
    expect(data.students.every((s) => !off.includes(s.speciesId))).toBe(true);
    for (let i = 0; i < 20; i++) expect(off).not.toContain(pickSpecies([], mulberry32(i), off));
    expect(speciesChoices([], 3, mulberry32(4), off).every((id) => !off.includes(id))).toBe(true);
  });
});
