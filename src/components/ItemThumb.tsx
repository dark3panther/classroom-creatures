import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import { EFFECT_ICON, PixelSprite, SPRITES, TRAIL_ICON } from '../creatures/pixel';
import { getSpecies } from '../data/species';
import type { Item, Stage } from '../types';

/** What an item looks like on this creature: worn items on the creature, places on its plate, trails and effects as pixel icons. */
export function ItemThumb({ item, speciesId, stage, branch }: { item: Item; speciesId: string; stage: Stage; branch?: 'a' | 'b' }) {
  const sp = getSpecies(speciesId);
  if (item.slot === 'background') {
    return <Habitat element={sp.element} seed={sp.id} background={item.id} className="aspect-square w-full" rounded="rounded-[8px]"><span /></Habitat>;
  }
  const icon = TRAIL_ICON[item.id] ?? EFFECT_ICON[item.id];
  if (icon) return <div className="grid aspect-square w-full place-items-center rounded-[8px] bg-wash"><PixelSprite sprite={SPRITES[icon]} size={56} /></div>;
  return (
    <div className="aspect-square w-full rounded-[8px] bg-wash">
      <CreatureSvg species={sp} stage={stage} branch={branch} equipped={{ [item.slot]: item.id }} effects={false} noShadow className="h-full w-full" />
    </div>
  );
}
