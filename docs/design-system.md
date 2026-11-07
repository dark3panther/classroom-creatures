# Design System

Tokens live in `classroom-creatures/src/index.css` (`@theme`).

## World: the creature field guide (1.3)
The class is a naturalist's field guide: every creature is a numbered specimen on its own painted plate. Built for a projector in a lit classroom, so the ground is light and text is dark ink.

## Colour
| Token | Value | Use |
|---|---|---|
| cloth-950 … cloth-600 | #0d2e23 … #3f866c | Bookcloth shell: header, Present bands, lock screen, big moments (with a linen weave) |
| endpaper / endpaper-deep | #e5ecdc / #d3dec7 | Page ground, printed with a faint tracks-and-leaves tile |
| rule / wash | #c3d0b8 / #eef3e8 | Hairlines on plates; inset panels |
| ink / ink-soft | #16241c / #46584c | Text |
| gilt / gilt-deep / gilt-ink | #f4b631 / #c98a0c / #3b2800 | Reserved for "now": selection, current tab, just-rewarded ribbon, primary action |
| leaf / brick | #23864a / #b8432d | Awards / behaviour reminders |
| coin | #8a5d07 | Coin numerals (the coin glyph is its own ochre, never gilt) |
| berry / sky | #a3245a / #1f7fbf | Demo labels; daily/weekly challenge tags |
Element colours are in `src/data/elements.ts`; the watercolour tints per element are in `src/creatures/Habitat.tsx` (`WASH`). Behaviour colours are the teacher's own and only tint buttons; labels stay ink.

## Type
- Display: **Bricolage Grotesque** (variable) 600–800: headings, names, buttons, big numerals
- Body/UI: **Atkinson Hyperlegible Next** (variable): everything else
Both are bundled via Fontsource (no network). Hierarchy is by scale steps; no tracked-caps labels.

## Shape & depth
- Plates and sheets: white, 1px `rule` hairline, 14px radius, soft offset shadow (`--shadow-card`, `--shadow-lift` on hover)
- Buttons: pills; primary is gilt, ghost is an ink hairline, cloth is the filled secondary
- The signature: `Habitat` paints a deterministic watercolour wash per species (seeded by species id) with a pooled darker edge; purchased backgrounds are painted inside the same wash shape
- Drawn icons only (`src/components/Icon.tsx`, 24px grid, 2px rounded strokes); emoji appear only as the teacher's own content

## Components
`btn-primary`, `btn-ghost`, `btn-light`, `btn-cloth`, `btn-danger`, `panel`, `paper`, `input`, `chip`, `ribbon`, `cloth`, `cloth-deep`, `ProgressBar` (element colour), `LevelBadge` ("Lv 7" tab, round seal at large size), `StagePips` (element colour), `ElementBadge`, `RarityStars`, `Modal` (bottom sheet on phones), `Toggle`, `AwardGrid`, `Icon`, `CoinIcon`.

## Motion
- Idle loops: CSS only, 2–4 s, per-species style
- Reactions: Framer Motion, ≤ 0.9 s, squash-and-stretch
- Celebrations: ≤ 16 particles per burst; evolution sequence ~3.5 s with a Skip button
- Everything respects *Reduce motion* (setting) and `prefers-reduced-motion`

## Creature art rules
- 200-unit canvas, ground at y≈184, chibi proportions (head = body)
- 3px outline derived from the palette shade, radial gloss, belly patch, blush
- Stage scale 0.64 → 1.0; babies get larger eyes; each stage adds element features
- Rarity only adds sparkles/aura rings
