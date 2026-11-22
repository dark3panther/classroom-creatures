# Classroom Creatures 1.6.1: creatures stay visible in Pixel mode

A fix release. Nothing about your classes or progress changes.

## Fixed
- **Creatures could disappear in Pixel mode** on some Macs: the classroom cards showed their place, mood and
  effects but no creature. Each pixel creature is made from its painting, and on some computers the painting
  is decoded a moment after it loads, so the first drawing came out empty. Now the app waits for the painting,
  checks that the creature was really drawn and draws it again if not, and makes a few creatures at a time
  instead of the whole class at once. If a pixel creature still cannot be made, the painted creature is shown
  in its place, so a card is never left empty.
- Pixel creatures and Pixel Pals draw their first frame straight away instead of waiting for the animation
  clock, and one effect that goes wrong can no longer stop every animation on the screen.
- The wandering boss of the Crystal Caverns is now called **Murkmoth**, so it is not confused with the
  Gloomwing creature. A battle started with the old name carries on.

## For developers
- `src/creatures/pixelSprite.ts`: `rasterise(svg, painted)` waits for `decode()`, checks the drawing is solid,
  retries (redraw, then a fresh image) and fails cleanly; at most four creatures are drawn at once; after three
  failures in a row with none drawn, sprites stop being attempted. `usePixelSpriteState` reports a failure and
  `PixelCreature` shows `IllustratedCreature` instead.
- `npm run test:e2e:pixel` now checks that every sprite is on screen and drawn (not only that a canvas exists),
  and simulates a computer whose first draws come out empty (`__ccPixelFault`, development only): with two
  empty draws every creature still appears, and with none ever drawn every card shows the painted creature.
