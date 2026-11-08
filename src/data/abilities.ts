import type { ElementType, Species, Stage } from '../types';
import { BRANCHES } from './branches';

/**
 * Abilities are cosmetic: casting one plays a pixel-art animation. They never change XP, coins or anything
 * that affects the classroom. Each creature has four, one per tier, awakened as it evolves.
 */
export type AbilityKind = 'burst' | 'shield' | 'signature' | 'ultimate';

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3 | 4;
  kind: AbilityKind;
  /** the stage that awakens this tier */
  stage: Stage;
  /** pixel effect played when cast */
  fx: string;
  anchor?: [number, number];
  size?: number;
}

/** Two element abilities per element (tier 1 and tier 2). */
const ELEMENT_ABILITIES: Record<ElementType, [Omit<AbilityDef, 'tier' | 'stage'>, Omit<AbilityDef, 'tier' | 'stage'>]> = {
  fire: [
    { id: 'flame-burst', name: 'Flame Burst', kind: 'burst', description: 'A puff of friendly fire bursts into sparks.', fx: 'explosions/plasma-explosion', anchor: [0.5, 0.75], size: 0.5 },
    { id: 'fire-shield', name: 'Fire Shield', kind: 'shield', description: 'A warm ring of flame circles the creature.', fx: 'holy/divine-shield' },
  ],
  water: [
    { id: 'healing-wave', name: 'Healing Wave', kind: 'burst', description: 'Soft water lights rise and sparkle.', fx: 'holy/heal' },
    { id: 'aqua-shield', name: 'Aqua Shield', kind: 'shield', description: 'A bubble of clear water forms around it.', fx: 'holy/divine-shield' },
  ],
  nature: [
    { id: 'growth', name: 'Growth', kind: 'burst', description: 'A beam of spring light makes everything bloom.', fx: 'holy/blessing' },
    { id: 'regeneration', name: 'Regeneration', kind: 'shield', description: 'Green motes gather and glow.', fx: 'holy/heal' },
  ],
  electric: [
    { id: 'thunder-spark', name: 'Thunder Spark', kind: 'burst', description: 'A crackle of bright electric sparks.', fx: 'explosions/plasma-explosion', anchor: [0.5, 0.75], size: 0.5 },
    { id: 'lightning-dash', name: 'Lightning Dash', kind: 'shield', description: 'Speed lines zip past as it dashes.', fx: 'status/haste' },
  ],
  ice: [
    { id: 'frost-shield', name: 'Frost Shield', kind: 'shield', description: 'A coat of glittering frost forms.', fx: 'status/frozen' },
    { id: 'ice-blast', name: 'Ice Blast', kind: 'burst', description: 'Cold air rushes in, then sparkles out.', fx: 'explosions/implosion', anchor: [0.5, 0.7], size: 0.5 },
  ],
  earth: [
    { id: 'stone-skin', name: 'Stone Skin', kind: 'shield', description: 'Its skin turns to strong, shining stone for a moment.', fx: 'status/petrified' },
    { id: 'quake', name: 'Quake', kind: 'burst', description: 'A tiny rumble throws up sand and pebbles.', fx: 'explosions/dirt-explosion', anchor: [0.5, 0.95], size: 0.45 },
  ],
  shadow: [
    { id: 'shade-cloak', name: 'Shade Cloak', kind: 'shield', description: 'Wisps of night drift around it.', fx: 'status/cursed' },
    { id: 'night-burst', name: 'Night Burst', kind: 'burst', description: 'The shadows pull in, then pop.', fx: 'explosions/implosion', anchor: [0.5, 0.7], size: 0.5 },
  ],
  light: [
    { id: 'radiance', name: 'Radiance', kind: 'burst', description: 'A sunburst of warm light.', fx: 'holy/sunburst', anchor: [0.5, 0.55], size: 0.9 },
    { id: 'light-pillar', name: 'Light Pillar', kind: 'shield', description: 'A column of light shines down.', fx: 'holy/holy-pillar', anchor: [0.5, 0.95], size: 0.6 },
  ],
  cosmic: [
    { id: 'star-fall', name: 'Star Fall', kind: 'burst', description: 'A firework of tiny stars.', fx: 'explosions/firework-burst', anchor: [0.5, 0.75], size: 0.5 },
    { id: 'nova', name: 'Nova', kind: 'shield', description: 'A ring of starlight pulses outward.', fx: 'holy/divine-shield' },
  ],
  air: [
    { id: 'gust', name: 'Gust', kind: 'burst', description: 'A swirl of feathers on the wind.', fx: 'holy/feather-burst', anchor: [0.5, 0.6], size: 0.6 },
    { id: 'tailwind', name: 'Tailwind', kind: 'shield', description: 'Wind lines rush past.', fx: 'status/haste' },
  ],
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** The four abilities of a species, in tier order. The final tier follows the chosen path where a species branches. */
export function abilitiesFor(sp: Species, branch?: 'a' | 'b'): AbilityDef[] {
  const [a, b] = ELEMENT_ABILITIES[sp.element];
  const myth = branch === 'b' ? BRANCHES[sp.id]?.b : undefined;
  const title = myth?.title ?? sp.legendTitle.replace(/^the /i, '');
  return [
    { ...a, tier: 1, stage: 2 },
    { ...b, tier: 2, stage: 3 },
    { id: `sig-${sp.id}`, name: sp.ability, kind: 'signature', tier: 3, stage: 4, description: `${sp.name}’s own move, nobody else can do it.`, fx: 'holy/feather-burst', anchor: [0.5, 0.6], size: 0.55 },
    { id: `ult-${sp.id}${myth ? '-b' : ''}`, name: myth ? `${title} Rite` : `${title} Awakening`, kind: 'ultimate', tier: 4, stage: 5, description: myth ? `The mythical ${title}’s ultimate: a rebirth of light.` : `The final form’s ultimate: a rebirth of light.`, fx: 'holy/resurrection', anchor: [0.5, 0.95], size: 0.55 },
  ];
}

/** Max rank of every ability. */
export const MAX_RANK = 3;

export { slug };
