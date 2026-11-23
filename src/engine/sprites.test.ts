import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOSSES, TREASURES } from '../data/adventure';
import BOSS_SPRITES from '../data/bossSprites.json';
import CHESTS from '../data/chestSprites.json';

/** 1.7: the animated bosses (Blender + SpriteCast) and the 3D chest (Blender) ship complete and consistent. */
const PUBLIC = resolve(__dirname, '../../public');
const ACTIONS = ['idle', 'attack', 'hurt', 'happy', 'walkEast', 'walkWest'] as const;
interface Act { file: string; frames: number; fps: number; loop: boolean; w: number; h: number; ax: number; ay: number; x: number; y: number; sw: number; sh: number }
interface Entry { stage: [number, number]; anchor: [number, number]; body: [number, number]; actions: Record<string, Act> }
const sprites = BOSS_SPRITES as unknown as Record<string, Entry>;

/** a WebP's size from its header (VP8 / VP8L / VP8X), so the strip can be checked against the manifest */
function webpSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

describe('animated bosses', () => {
  it('every boss has a sprite set', () => {
    for (const b of BOSSES) expect(sprites[b.id], b.id).toBeTruthy();
  });

  it('every action is there, plays and fits its stage', () => {
    for (const b of BOSSES) {
      const e = sprites[b.id];
      expect(e.stage[0]).toBeGreaterThan(0); expect(e.stage[1]).toBeGreaterThan(0);
      for (const name of ACTIONS) {
        const a = e.actions[name];
        expect(a, `${b.id} ${name}`).toBeTruthy();
        expect(a.frames).toBeGreaterThan(1);
        expect(a.fps).toBeGreaterThan(0);
        expect(a.loop).toBe(name !== 'attack' && name !== 'hurt');
        const file = resolve(PUBLIC, a.file);
        expect(existsSync(file), a.file).toBe(true);
        expect(webpSize(file), a.file).toEqual([a.sw * a.frames, a.sh]);
        expect(a.sh / a.h).toBeCloseTo(a.sw / a.w, 2);
        // the feet line up: each frame's anchor lands on the stage's anchor
        expect(a.x + a.ax).toBeCloseTo(e.anchor[0], 0);
        expect(a.y + a.ay).toBeCloseTo(e.anchor[1], 0);
        if (!name.startsWith('walk')) {
          expect(a.x).toBeGreaterThanOrEqual(-0.5); expect(a.y).toBeGreaterThanOrEqual(-0.5);
          expect(a.x + a.w).toBeLessThanOrEqual(e.stage[0] + 1); expect(a.y + a.h).toBeLessThanOrEqual(e.stage[1] + 1);
        }
      }
      // one-shots are short enough for a hit and a strike back in a busy lesson
      expect(e.actions.hurt.frames / e.actions.hurt.fps).toBeLessThan(1.5);
      expect(e.actions.attack.frames / e.actions.attack.fps).toBeLessThan(2);
    }
  });
});

describe('3D treasure chests', () => {
  it('every chest kind the treasures use has a strip that opens', () => {
    const kinds = new Set(TREASURES.filter((t) => t.kind !== 'relic').map((t) => (['coins', 'cosmetic', 'accessory'].includes(t.kind) ? t.kind : 'special')));
    const all = CHESTS.kinds as Record<string, { file: string; frames: number }>;
    for (const k of kinds) {
      const c = all[k];
      expect(c, k).toBeTruthy();
      expect(c.frames).toBeGreaterThanOrEqual(12);
      const file = resolve(PUBLIC, c.file);
      expect(existsSync(file), c.file).toBe(true);
      expect(webpSize(file)).toEqual([CHESTS.frame[0] * c.frames, CHESTS.frame[1]]);
    }
  });
});
