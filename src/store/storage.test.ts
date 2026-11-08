import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { applyAward, buyItem } from '../engine/awards';
import { migrate } from '../engine/backup';
import { approveEvolution } from '../engine/evolution';
import { abilityTree, raiseAbility } from '../engine/abilities';
import { addStudents, DATA_VERSION, emptyData, newClass } from '../engine/roster';
import { mulberry32 } from '../engine/util';
import type { AppData } from '../types';

const NOW = new Date(2026, 10, 4, 10, 0).getTime();

/** A class with real 1.4 progress: an approved evolution, a purchase, a worn item, an ability, interactions. */
function playedClass(): { data: AppData; id: string } {
  const c = newClass('Restart', 'Grade 3', NOW);
  let d: AppData = { ...emptyData(), classes: [c] };
  d.settings = { ...d.settings, evolutionMode: 'approval', itemPrices: { 'hat-pirate': 70 }, disabledSpecies: ['emberpup'] };
  d = addStudents(d, c.id, ['Amira', 'Ben'], mulberry32(7), NOW);
  const id = d.students[0].id;
  for (let i = 0; i < 30; i++) d = applyAward(d, [id], 'cat-behaviour', NOW + i).data;
  d = approveEvolution(d, id, undefined, NOW + 100)!.data;
  d = buyItem(d, id, 'hat-pirate', 70)!;
  d = { ...d, students: d.students.map((s) => (s.id === id ? { ...s, equipped: { ...s.equipped, hat: 'hat-pirate' }, interactions: { pet: 3, feed: 1, play: 2 }, nickname: 'Sparky' } : s)) };
  const first = abilityTree(d.students.find((s) => s.id === id)!, d.settings).find((v) => v.status === 'unlock')!;
  d = raiseAbility(d, id, first.def.id, NOW + 200)!;
  return { data: d, id };
}

/** wait for the debounced save to reach IndexedDB */
async function saveAndWait(storage: typeof import('./storage'), data: AppData) {
  const saved = new Promise<void>((res) => { const off = storage.onSaved(() => { off(); res(); }); });
  storage.scheduleSave(data, 0);
  storage.flushSave();
  await saved;
}

describe('persistence across a restart', () => {
  it('everything a class did in 1.4 is read back after the app restarts', async () => {
    const { data, id } = playedClass();
    const storage = await import('./storage');
    await saveAndWait(storage, data);

    vi.resetModules(); // a fresh app start: new module state, same IndexedDB
    const fresh = await import('./storage');
    const loaded = await fresh.loadData();
    expect(loaded).toEqual(data);
    const s = loaded!.students.find((x) => x.id === id)!;
    expect(s.bestStage).toBe(2);
    expect(s.evolutionLog!.map((e) => e.stage)).toEqual([2]);
    expect(s.unlockedItems).toContain('hat-pirate');
    expect(s.equipped.hat).toBe('hat-pirate');
    expect(s.interactions).toEqual({ pet: 3, feed: 1, play: 2 });
    expect(Object.values(s.skills!)).toEqual([1]);
    expect(loaded!.settings.evolutionMode).toBe('approval');
    expect(loaded!.settings.itemPrices).toEqual({ 'hat-pirate': 70 });
  });

  it('a 1.3 save already on disk loads and upgrades without losing anything', async () => {
    const { data } = playedClass();
    const old = JSON.parse(JSON.stringify(data)) as AppData & { settings: Record<string, unknown> };
    old.version = 2;
    for (const k of ['evolutionMode', 'soundVolume', 'uiSounds', 'disabledSpecies', 'disabledItems', 'itemPrices', 'shopWhileLocked']) delete old.settings[k];
    old.students.forEach((s) => { delete s.evolutionLog; delete s.skills; delete s.interactions; });
    old.classes.forEach((c) => { delete c.discovered; });

    vi.resetModules();
    const storage = await import('./storage');
    await saveAndWait(storage, old);
    vi.resetModules();
    const loaded = await (await import('./storage')).loadData();
    const up = migrate(loaded!);
    expect(up.version).toBe(DATA_VERSION);
    for (const before of old.students) {
      const after = up.students.find((s) => s.id === before.id)!;
      expect({ xp: after.xp, coins: after.coins, stage: after.bestStage, items: after.unlockedItems, eq: after.equipped, nick: after.nickname })
        .toEqual({ xp: before.xp, coins: before.coins, stage: before.bestStage, items: before.unlockedItems, eq: before.equipped, nick: before.nickname });
    }
    expect(up.settings.evolutionMode).toBe('auto');
  });

  it('safety snapshots survive a restart and keep the newest first', async () => {
    const { data } = playedClass();
    vi.resetModules();
    const storage = await import('./storage');
    await storage.addSnapshot(data, 'Before resetting Amira');
    vi.resetModules();
    const snaps = await (await import('./storage')).listSnapshots();
    expect(snaps[0].reason).toBe('Before resetting Amira');
    expect(snaps[0].data.students).toHaveLength(2);
  });
});
