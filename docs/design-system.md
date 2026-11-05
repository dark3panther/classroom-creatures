# Design System

Tokens live in `classroom-creatures/src/index.css` (`@theme`).

## Colour
| Token | Value | Use |
|---|---|---|
| night-950 / 900 / 800 | #120b2e / #1b1240 / #2a1d5c | App sky, overlays, presentation backdrop |
| parchment | #fffaf0 | Cards and modals ("paper") |
| cream | #fff3dc | Inset panels on paper |
| ink / ink-soft | #2b2140 / #6b5f86 | Text on paper |
| sun / sun-deep | #ffc93b / #f2a20c | Primary actions, level badges, legendary |
| grape | #8b5cf6 | XP bars, selection, focus |
| mint | #34d399 | Class goal, success |
| berry | #ff5fa2 | Demo labels, highlights |
Element colours, habitats and glow colours are in `src/data/elements.ts`; behaviour colours in `src/data/defaults.ts`.

## Type
- Display: **Fredoka** 600/700 — headings, names, buttons
- Body: **Nunito** 400/700/800 — everything else
Both are bundled (no network).

## Shape & depth
- Cards: 24px radius (`--radius-card`), soft long shadow; habitats inside cards 18px radius
- Buttons: pill shape; primary has a 4px "pressable" bottom shadow that collapses on press
- Panels on the night sky: 7% white fill, 12% white hairline, blur

## Components
`btn-primary`, `btn-ghost`, `btn-light`, `btn-danger`, `panel`, `paper`, `input`, `chip`, `ProgressBar`, `LevelBadge` (gold hexagon), `StagePips` (5 dots, gold for Legendary), `ElementBadge` (custom glyphs), `RarityStars`, `Modal` (bottom sheet on phones), `Toggle`, `AwardGrid`.

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
