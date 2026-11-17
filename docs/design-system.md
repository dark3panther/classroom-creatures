# Design System

Tokens live in `classroom-creatures/src/index.css` (`@theme`).

## World: the sky world (1.5)
The class lives in a bright, animated painted daytime world (components/SkyWorld.tsx, layers painted by scripts/sky with p5.brush, moved by anime.js). White cards float on it; the header is frosted glass; Present bands and big moments are deep azure. It replaced the green field guide of 1.3, which replaced the dark purple night sky of 1.0.

## Colour
| Token | Value | Use |
|---|---|---|
| azure-950 … azure-600 | #0e2a52 … #3b7fd3 | Filled controls, tab pills, Present bands, lock screen, big moments |
| sky-top / sky-mid / sky-horizon | #5bb8f0 / #a9dcf8 / #fff1d6 | The sky gradient under the painting |
| mist / mist-deep | #e9f4fd / #d5e8f8 | Insets inside cards |
| rule / wash | #cddfee / #f2f8fe | Hairlines; hover fills |
| ink / ink-soft | #13253f / #4a5d78 | Text |
| gilt / gilt-deep / gilt-ink | #ffc23d / #d99400 / #3a2700 | Reserved for "now": selection, current tab, just-rewarded ribbon, primary action |
| leaf / buy / brick | #1a8f4c / #1f9653 / #c8412f | Awards / the buy button / behaviour reminders |
| coin | #8a5d07 | Coin numerals (never gold) |
Element colours are in `src/data/elements.ts`; the watercolour tints per element are in `src/creatures/Habitat.tsx` (`WASH`).

## Type
- Display: **Bricolage Grotesque** (variable) 600–800: headings, names, buttons, big numerals
- Body/UI: **Atkinson Hyperlegible Next** (variable): everything else
Both are bundled via Fontsource (no network). Hierarchy is by scale steps; no tracked-caps labels.

## Shape & depth
- Cards and sheets: white, 1px `rule` hairline, 18px radius, soft blue shadow (`--shadow-card`, `--shadow-lift` on hover); glass (`.glass`) for the header and floating summaries
- Buttons: pills; primary is gold, azure is the filled secondary, buy is green, light and ghost for the rest; all pressed, lifted and sparked by anime.js
- The signature: `Habitat` paints a deterministic watercolour wash per species (seeded by species id) with a pooled darker edge; purchased backgrounds are painted inside the same wash shape
- Drawn icons only (`src/components/Icon.tsx`, 24px grid, 2px rounded strokes); emoji appear only as the teacher's own content

## Components
`btn-primary`, `btn-ghost`, `btn-light`, `btn-azure`, `btn-buy`, `btn-danger`, `panel`, `paper`, `glass`, `input`, `chip`, `ribbon`, `azure`, `azure-deep`, `on-sky`, `ProgressBar` (element colour), `LevelBadge` ("Lv 7" tab, round seal at large size), `StagePips` (element colour), `ElementBadge`, `RarityStars`, `Modal` (bottom sheet on phones), `Toggle`, `AwardGrid`, `Icon`, `CoinIcon`.

Added in 1.4: `EvolveBadge` ("Ready to evolve" gilt chip), `EvolutionQueue` and `BranchChooser` (`components/Evolve.tsx`), `AbilityTree` and `AbilityIcon` (`components/Abilities.tsx`), `ItemThumb` (an item shown on the student's own creature), `PixelSprite` and `Trail` (`creatures/pixel.tsx`), and the screens `CreatureProfile`, `Customize` (dressing room), `Creaturedex` (field guide) and `TeacherCreatures` (Settings → Creatures & Shop). Component rules are in `DESIGN.md`.

## Pixel layer (1.4)
- Effects from the vendored pixelfx library, trail particles, pixel snacks, toys and ability icons; one shared `requestAnimationFrame` clock; each effect module loads on first use and all are warmed while the app is idle
- On large views an effect never covers the creature's face: full-body effects keep their rim (radial mask) or move aside, mood effects use a smaller stand-in, floating pickups have no floor shadow
- Mythical final forms: colour grade + ornaments (`creatures/mythic.tsx`) + drifting particles; a bespoke `public/creatures/<id>-5b.webp` is used when present

## Motion
- anime.js (`src/vendor/animejs`) through `lib/motion.ts` and `lib/interactions.ts`: springy presses, hover lifts, sparks, card tilt, page entrances, count-ups, award pops, modals, progress bars, sliding tab pills, grid re-sorting, and the sky world (cloud drift, island bob, sun, pollen, flyers, pointer parallax)
- Idle loops: CSS only, 2–4 s, per-species style; large views add a 4.2 s breath
- Blinks: painted creatures, one shared timer (`creatures/blink.ts`), every 2.5–7 s per creature, sometimes double; eyes stay shut when sleepy
- Reactions: Framer Motion, ≤ 0.9 s, squash-and-stretch
- Celebrations: ≤ 16 particles per burst; evolution sequence (charge, flash, reveal) ~4 s with a Skip button
- Everything respects *Reduce motion* (setting) and `prefers-reduced-motion`

## Creature art rules
- 200-unit canvas, ground at y≈184, chibi proportions (head = body)
- 3px outline derived from the palette shade, radial gloss, belly patch, blush
- Stage scale 0.64 → 1.0; babies get larger eyes; each stage adds element features
- Rarity only adds sparkles/aura rings
