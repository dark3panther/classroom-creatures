import type { ElementType } from '../types';
import type { PixelFxId } from './PixelFx';

/**
 * Pixel mode: each element's aura (a pixelfx loop around the creature) and attack (a pixelfx effect the
 * creature performs). Effects come from pixelfx 0.3.0 (src/vendor/pixelfx, from dark3panther/pixelfx).
 * Positions are in sprite pixels (see pixelSprite.ts): `feet` is the bottom centre of the creature,
 * `mouth` is beside its face, `ahead` is in front of it on the ground.
 */
export interface StageFx {
  id: PixelFxId;
  at: 'feet' | 'mouth' | 'ahead' | 'head' | 'left' | 'right';
  dx?: number;
  dy?: number;
  palette?: string[];
  /** effect pixels per sprite pixel (1 = the same pixel grid as the creature) */
  size?: number;
  /** draw behind the creature */
  back?: boolean;
  /** loops: how long the attack plays */
  duration?: number;
  flip?: boolean;
}

const FIRE = ['#2a0a05', '#7a1a0a', '#d8401a', '#f8902a', '#ffd23f', '#fff6c0'];
const GOLD = ['#3a2400', '#8a5d07', '#d99400', '#ffc23d', '#fff1a8', '#ffffff'];
const AMBER = ['#2b1708', '#6b3d2a', '#a8693f', '#d9a066', '#f3d19a', '#fff3d6'];
const STAR = ['#120a2e', '#3a1f7a', '#7b4fd8', '#b79cff', '#e6dcff', '#ffffff'];
const WIND = ['#1b3a4f', '#3f6f8f', '#7fb0cf', '#bfe0f0', '#eef8ff', '#ffffff'];

export const ELEMENT_STAGE: Record<ElementType, { aura: StageFx[]; attack: StageFx }> = {
  fire: {
    aura: [{ id: 'fire/spirit-flame', at: 'left', dx: 2, palette: FIRE, back: true, size: 0.7 }, { id: 'fire/spirit-flame', at: 'right', dx: -2, palette: FIRE, back: true, size: 0.7, flip: true }],
    attack: { id: 'fire/fire-breath', at: 'mouth', duration: 1.5, size: 0.75 },
  },
  water: {
    aura: [{ id: 'water/water-orb', at: 'right', dx: 6, dy: -26, size: 0.45 }],
    attack: { id: 'water/water-jet', at: 'mouth', duration: 1.3, size: 0.75 },
  },
  nature: {
    aura: [{ id: 'nature/leaf-storm', at: 'feet', back: true, size: 0.8 }],
    attack: { id: 'nature/vine-whip', at: 'ahead', dx: 2, size: 0.75 },
  },
  electric: {
    aura: [{ id: 'lightning/ball-lightning', at: 'right', dx: 6, dy: -22, size: 0.5 }],
    attack: { id: 'lightning/chain-lightning', at: 'feet', dx: -14, dy: -4, size: 0.75 },
  },
  ice: {
    aura: [{ id: 'ice/ice-crystal', at: 'right', dx: 8, dy: -6, size: 0.5 }, { id: 'ice/ice-crystal', at: 'left', dx: -8, dy: -16, size: 0.4 }],
    attack: { id: 'ice/frost-breath', at: 'mouth', duration: 1.4, size: 0.75 },
  },
  earth: {
    aura: [{ id: 'ice/ice-crystal', at: 'right', dx: 8, dy: -6, size: 0.5, palette: AMBER }],
    attack: { id: 'nature/earth-spike', at: 'ahead', dx: 30, size: 0.6 },
  },
  shadow: {
    aura: [{ id: 'shadow/shadow-flames', at: 'feet', back: true, size: 0.95 }],
    attack: { id: 'shadow/shadow-tendrils', at: 'ahead', dx: 34, size: 0.6 },
  },
  light: {
    aura: [{ id: 'holy/halo', at: 'head', size: 0.8 }],
    attack: { id: 'holy/smite', at: 'ahead', dx: 34, size: 0.7, palette: GOLD },
  },
  cosmic: {
    aura: [{ id: 'arcane/rune-circle', at: 'feet', back: true, size: 0.75, palette: STAR }],
    attack: { id: 'arcane/star-fall', at: 'ahead', dx: 30, size: 0.55 },
  },
  air: {
    aura: [{ id: 'nature/leaf-storm', at: 'feet', back: true, size: 0.75, palette: WIND }],
    attack: { id: 'nature/tornado', at: 'ahead', dx: 34, duration: 1.8, size: 0.5 },
  },
};
