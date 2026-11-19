# Classroom Creatures 1.5.2: the Pixel Pals

1.5.2 adds **ten new creatures drawn as pixel art**, animated frame by frame, and makes the painted creatures
breathe in Pixel mode. Everything from 1.5.0 and 1.5.1 is unchanged. No data migration is needed: existing
students keep their creatures, and the new species simply join the list.

## The Pixel Pals
- **Ten new species, one per element**, each with five forms:

  | Pal | Element | Rarity | Final form |
  |---|---|---|---|
  | Blazard | Fire | Rare | grows dragon wings and a flame crest |
  | Otterpop | Water | Common | a crest of water spikes |
  | Mossling | Nature | Common | a mossy shell that flowers |
  | Boltbat | Electric | Uncommon | wide bat wings and a lightning tail |
  | Icicub | Ice | Uncommon | a ridge of icicles |
  | Rumbadillo | Earth | Rare | crystal studs on its armour |
  | Wispurr | Shadow | Epic | a floating shadow cat with wisps |
  | Solcub | Light | Legendary | a sun mane |
  | Nebuloop | Cosmic | Epic | a floating starry jelly with a ring |
  | Cumulamb | Air | Common | a cloud fleece with a rainbow |

- **40 creatures and 210 forms** in the field guide now (30 painted creatures and 10 Pixel Pals, five forms
  each, plus the ten mythical forms).
- **Frame-by-frame animation.** Each form has six animations made for it: idle breathing (with the tail, ears,
  wings or tentacles moving), a blink, a happy hop, an attack (wind up, lunge, recoil), a flinch and sleep. The
  app chooses the animation from the creature's mood and what just happened: an award makes it hop, an
  ability makes it attack, a deduction makes it flinch, a sleepy creature sleeps. Blinks come at random
  moments, and each creature has its own rhythm.
- **Element effects on the pal's own body.** The Pixel mode auras and attacks (from pixelfx) start at the
  pal's mouth and sit around its body, so fire breath really comes out of Blazard's mouth.
- **Dressing up works.** Hats and glasses follow the head in every frame. Clothes and armour sit on the body,
  and wings and capes are drawn behind the pal, rising from its back. Mood effects such as the proud halo
  sit over its head.
- **In both looks.** Pixel Pals are pixel sprites in the painted look as well as in Pixel mode.

## Painted creatures in Pixel mode
- Their sprites now **breathe like hand-animated sprites**: the upper body rises one pixel and the chest grows
  one row, then they breathe out. Blinks come at random moments instead of on a fixed beat.

## Preview
- `#/pixel-lab` shows the ten Pixel Pals with **Hop**, **Attack**, **Hurt** and **Sleep** buttons and a stage
  picker, above the painted creatures in Pixel mode.

## For developers
- `npm run art:creatures` rebuilds the Pixel Pals' sheets (`public/creatures-pixel/`) and their animation
  data (`src/data/pixelPals.json`) from `scripts/pixel/creatures.px.js` (claude-pxl).
- New unit tests check every sheet and frame measurement (`src/data/pixelPals.test.ts`); the species and
  field-guide counts in the existing tests follow the species list.
- `npm run test:e2e:pixel` now also checks that painted sprites animate, that a Pixel Pal plays its animation
  and wears its hat on its profile, and that the field guide lists the Pixel Pals.
