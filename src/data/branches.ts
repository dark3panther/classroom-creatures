import type { Stage } from '../types';

/**
 * Branching evolutions. Ten species (one per element) can become one of two final forms:
 * path A is the classic Legendary Form, path B a Mythical aspect with its own look, title and ultimate.
 *
 * Path B is drawn from the Legendary artwork with a new colour grade and its own ornaments and pixel aura.
 * When purpose-made art exists as `public/creatures/<id>-5b.webp` (with an anchor entry `<id>-5b`),
 * it is used instead and the colour grade is skipped.
 */
export type Motif = 'frostflame' | 'stormtide' | 'autumn' | 'voidvolt' | 'sunfrost' | 'amethyst' | 'dawn' | 'moon' | 'nebula' | 'tempest';

export interface BranchPath {
  id: 'a' | 'b';
  title: string;
  description: string;
  rarity: 'legendary' | 'mythical';
}

export interface MythicPath extends BranchPath {
  id: 'b';
  /** colour grade applied to the Legendary art: hue rotation (deg), saturation and brightness */
  grade: { hue: number; sat: number; bright: number };
  motif: Motif;
  /** ornament colours: main, light, dark */
  colors: [string, string, string];
  /** pixel aura palette, dark → light */
  aura: string[];
}

export interface BranchDef { a: BranchPath; b: MythicPath }

const A = (title: string, description: string): BranchPath => ({ id: 'a', title, description, rarity: 'legendary' });

export const BRANCHES: Record<string, BranchDef> = {
  emberpup: {
    a: A('the Sunflame', 'Burns bright gold like a summer sun.'),
    b: { id: 'b', title: 'Frostflame Warden', description: 'Its fire turned ice-blue: cold flames that warm only its friends.', rarity: 'mythical',
      grade: { hue: 185, sat: 1.15, bright: 1.04 }, motif: 'frostflame', colors: ['#5fd4ff', '#e6fbff', '#1f6fa8'], aura: ['#0b3a66', '#1f6fa8', '#3fb6e8', '#8fe4ff', '#e6fbff', '#ffffff'] },
  },
  splashlet: {
    a: A('Tide Guardian', 'Calms the waves and guards the shore.'),
    b: { id: 'b', title: 'Stormtide Herald', description: 'Rides thunderclouds over the sea, crackling with violet lightning.', rarity: 'mythical',
      grade: { hue: 55, sat: 1.2, bright: 0.98 }, motif: 'stormtide', colors: ['#a77bff', '#efe4ff', '#4b2a9c'], aura: ['#1e0f4a', '#4b2a9c', '#7c4dff', '#b39bff', '#efe4ff', '#ffffff'] },
  },
  sproutling: {
    a: A('Elder of the Grove', 'An ancient tree spirit, green all year round.'),
    b: { id: 'b', title: 'Autumn Elder', description: 'Its leaves turned gold and red; every step drops a falling leaf.', rarity: 'mythical',
      grade: { hue: -75, sat: 1.25, bright: 1.02 }, motif: 'autumn', colors: ['#f08a24', '#ffe0a3', '#9a3d12'], aura: ['#4a1a08', '#9a3d12', '#d8641d', '#f6a83c', '#ffe0a3', '#fff6e0'] },
  },
  zipzap: {
    a: A('Storm Sovereign', 'Commands the lightning of summer storms.'),
    b: { id: 'b', title: 'Voidvolt', description: 'Lightning from the edge of the night sky, purple and silent.', rarity: 'mythical',
      grade: { hue: 230, sat: 1.1, bright: 0.92 }, motif: 'voidvolt', colors: ['#c06bff', '#f1dcff', '#3a1466'], aura: ['#14052b', '#3a1466', '#7a2fd0', '#c06bff', '#f1dcff', '#ffffff'] },
  },
  frostnib: {
    a: A('Aurora Warden', 'Keeper of the northern lights.'),
    b: { id: 'b', title: 'Sunfrost Monarch', description: 'Ice that holds sunlight inside, glowing gold at dawn.', rarity: 'mythical',
      grade: { hue: 175, sat: 1.1, bright: 1.06 }, motif: 'sunfrost', colors: ['#ffc94a', '#fff5cf', '#a86a00'], aura: ['#4a2c00', '#a86a00', '#e8a21e', '#ffc94a', '#fff5cf', '#ffffff'] },
  },
  pebblet: {
    a: A('Mountain Heart', 'As steady as the mountains themselves.'),
    b: { id: 'b', title: 'Amethyst Heart', description: 'Its stones became violet crystal that hums softly when it is happy.', rarity: 'mythical',
      grade: { hue: 245, sat: 1.35, bright: 1.0 }, motif: 'amethyst', colors: ['#b06cf0', '#f0deff', '#5a2591'], aura: ['#24083f', '#5a2591', '#8c4fd6', '#b06cf0', '#f0deff', '#ffffff'] },
  },
  duskit: {
    a: A('Night Watcher', 'Guards the class through the darkest night.'),
    b: { id: 'b', title: 'Dawn Watcher', description: 'Stayed awake until sunrise and caught the first light in its fur.', rarity: 'mythical',
      grade: { hue: 150, sat: 1.15, bright: 1.12 }, motif: 'dawn', colors: ['#ffb347', '#fff1cc', '#c0651a'], aura: ['#5a2408', '#c0651a', '#f08a2a', '#ffb347', '#fff1cc', '#ffffff'] },
  },
  glowbun: {
    a: A('Dawnbringer', 'Brings the morning sun to every classroom.'),
    b: { id: 'b', title: 'Moonbringer', description: 'Shines silver instead of gold and guides lost travellers home.', rarity: 'mythical',
      grade: { hue: 180, sat: 0.7, bright: 1.03 }, motif: 'moon', colors: ['#cfe3ff', '#ffffff', '#5a6fa8'], aura: ['#141d3a', '#3a4a7a', '#7a8fc8', '#b6c8f2', '#e6eeff', '#ffffff'] },
  },
  orbitoad: {
    a: A('Planet Prince', 'Rules a little planet of its own.'),
    b: { id: 'b', title: 'Nebula Prince', description: 'Wrapped in pink star-dust from a faraway nebula.', rarity: 'mythical',
      grade: { hue: 70, sat: 1.25, bright: 1.03 }, motif: 'nebula', colors: ['#ff7ac8', '#ffe1f3', '#9a1f6e'], aura: ['#3a0828', '#9a1f6e', '#e04aa8', '#ff7ac8', '#ffe1f3', '#ffffff'] },
  },
  puffwhirl: {
    a: A('Sky Monarch', 'Rules the bright blue summer sky.'),
    b: { id: 'b', title: 'Tempest Monarch', description: 'A storm-cloud crown and wind that hums like thunder.', rarity: 'mythical',
      grade: { hue: 210, sat: 0.85, bright: 0.9 }, motif: 'tempest', colors: ['#8fa6c8', '#e8eef8', '#33415e'], aura: ['#11182a', '#33415e', '#5d7096', '#8fa6c8', '#e8eef8', '#ffffff'] },
  },
};

export function branchesFor(speciesId: string): BranchDef | undefined {
  return BRANCHES[speciesId];
}

/** The final stage is where paths split. */
export const BRANCH_STAGE: Stage = 5;

/** Discovery key for a creature form: `emberpup-3`, or `emberpup-5b` for a mythical path. */
export function formKey(speciesId: string, stage: Stage, branch?: 'a' | 'b'): string {
  return stage === BRANCH_STAGE && branch === 'b' && BRANCHES[speciesId] ? `${speciesId}-5b` : `${speciesId}-${stage}`;
}
