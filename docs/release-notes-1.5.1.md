# Classroom Creatures 1.5.1: Pixel mode

1.5.1 adds **Pixel mode**, an optional pixel-art look for the whole app. Everything from 1.5.0 (the World of
Adventures and the sky world) is unchanged, and the painted look stays the default.

## Pixel mode
- **One switch.** Press **Pixel** in the top bar, or Settings → Classroom & PIN → *Pixel mode*. Press
  **Painted** to go back. Classes, points, coins, items, quests and everything else stay exactly as they are.
- **Pixel creatures.** Every creature becomes a pixel sprite made from its own painting and everything it
  wears. Sprites have an outline in the hand-drawn style, bob a whole pixel at a time and blink every few
  seconds, each creature on its own rhythm. Sleepy creatures keep their eyes shut.
- **Element auras and attacks**, using the pixelfx library: on the big views each element has its own aura,
  and when a creature uses its ability (the ability buttons, the spotlight's ability button, or tapping the
  creature) it winds up, lunges and attacks:

  | Element | Aura | Attack |
  |---|---|---|
  | Fire | flames at its sides | fire breath |
  | Water | a floating water orb | water jet |
  | Nature | swirling leaves | whipping vines |
  | Electric | a ball of lightning | chain lightning |
  | Ice | floating ice crystals | frost breath |
  | Earth | a glowing gem | earth spikes |
  | Shadow | shadow flames | shadow tendrils |
  | Light | a halo | a beam of light from the sky |
  | Cosmic | a rune circle | falling stars |
  | Air | a whirl of wind | a tornado |

- **A pixel interface.** Square buttons with a bevel, pixel frames, block progress bars, pixel creature
  backgrounds, a banded pixel sky whose clouds and islands move a pixel at a time, a pixel sun and pixel
  creatures flying past.
- **Readable type.** Jersey 10 (headings) and Tiny5 (text), chosen because their numbers are clear (a first
  pixel font made 2 and 5 look like S), and sized to match the painted look.
- **Preview page**: `#/pixel-lab` shows one creature of each element painted and as pixel art, attacking every
  few seconds, with a button to switch the whole app.

## Also
- The version number is now 1.5.1, so this build is easy to tell apart from 1.5.0 (Settings shows it at the bottom).

## Data
- One new optional setting, `pixelMode` (off by default). No data migration; 1.5.0 data opens as it is.

## Tests
- 72 unit tests pass.
- New `npm run test:e2e:pixel` (20 checks): switching on from the top bar, 64 × 66 sprites with blink frames,
  pixel type, places and buttons, the pixel sky, auras and attacks (and that attacks clean up), the profile,
  the setting surviving a restart, phone width, switching back, no page errors.
- `npm run test:e2e` and `npm run test:e2e:adventure` still pass.

## Known limits
- Sprites are made the first time a creature appears in Pixel mode (a few milliseconds each), so a class of 30
  can take a moment to appear the very first time.
- Auras play on the big views only, not on every card in the classroom grid, to keep classroom computers smooth.
- The classic drawn art style is not pixelated; Pixel mode uses the paintings.
