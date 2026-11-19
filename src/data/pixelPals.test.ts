import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { SPECIES } from './species';
import PALS from './pixelPals.json';

/** The Pixel Pals' sprite sheets and the metadata the app animates them with (npm run art:creatures). */
describe('Pixel Pals', () => {
  const pals = SPECIES.filter((s) => s.pixelArt);
  const forms = PALS.forms as Record<string, { box: number[]; eyes: number[][]; mouth: number[]; offsets: Record<string, number[][]> }>;
  it('every pal has a sheet and metadata for all five stages', () => {
    for (const sp of pals) for (let st = 1; st <= 5; st++) {
      expect(forms[`${sp.id}-${st}`], `${sp.id}-${st}`).toBeTruthy();
      expect(existsSync(`public/creatures-pixel/${sp.id}-${st}.png`), `${sp.id}-${st}.png`).toBe(true);
    }
  });
  it('every animation has a head offset per frame, so worn items follow the head', () => {
    for (const [key, f] of Object.entries(forms)) for (const [name, a] of Object.entries(PALS.anims)) {
      expect(f.offsets[name]?.length, `${key} ${name}`).toBe(a.frames);
      for (const [dx, dy] of f.offsets[name]) expect(Math.abs(dx) + Math.abs(dy), `${key} ${name}`).toBeLessThanOrEqual(12);
    }
  });
  it('each form sits inside its frame with two eyes above its mouth', () => {
    const [W, H] = PALS.frame;
    for (const [key, f] of Object.entries(forms)) {
      const [l, t, r, b] = f.box;
      expect(l >= 0 && t >= 0 && r < W && b < H && l < r && t < b, key).toBe(true);
      expect(f.eyes.length, key).toBe(2);
      expect(f.mouth[1], key).toBeGreaterThan(Math.min(f.eyes[0][1], f.eyes[1][1]));
    }
  });
  it('the pals grow: each stage is at least as big as the one before', () => {
    for (const sp of pals) for (let st = 2; st <= 5; st++) {
      const area = (k: string) => { const [l, t, r, b] = forms[k].box; return (r - l) * (b - t); };
      expect(area(`${sp.id}-${st}`), `${sp.id} ${st}`).toBeGreaterThanOrEqual(area(`${sp.id}-${st - 1}`));
    }
  });
});
