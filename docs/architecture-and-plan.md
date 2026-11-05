# Classroom Creatures — Architecture & Development Plan

## Goal
A locally runnable web app where a Grade 2–3 English teacher awards XP for positive behaviour and every student's original creature visibly grows, evolves and celebrates.

## Stack decision
| Need | Choice | Why |
|---|---|---|
| UI | React 18 + TypeScript + Vite | Fast local dev, static build that runs from any folder |
| Styling | Tailwind CSS v4 with design tokens in `@theme` | One token source, quick iteration |
| Motion | Framer Motion for reactions/sequences, CSS keyframes for idle loops | Idle loops run on the compositor and cost almost nothing on old classroom PCs |
| State | Zustand | Tiny, no boilerplate, works outside React for tests |
| Storage | IndexedDB (idb-keyval) + localStorage mirror + rolling snapshots | Survives browser restarts, no server, large quota |
| Art | Parametric SVG drawn in code | No image-generation tool was available; code-drawn art is consistent across 30 species × 5 stages, crisp on projectors and tiny to ship |
| Sound | Web Audio synthesis | Original, offline, no asset files |

## Modules
- `data/` — pure content (species, elements, categories, achievements, items, challenges)
- `engine/` — pure game logic, fully unit tested: progression, awards/undo/unlocks, roster & unique assignment, backup validation, demo data, PIN hashing
- `store/` — single persisted `AppData` object + UI-only celebration queue
- `creatures/` — renderer, accessories, animated wrapper, habitats, particles
- `views/` — Dashboard, Student Profile, Creature Collection, Rewards, Settings, Presentation, Onboarding

## Data model (all in one versioned `AppData`)
`classes[]`, `students[]` (xp, speciesId, equipped, unlockedItems, achievements, tagCounts, tagXp, bestStage, challengeCompletions), `categories[]` (xp, tag, pinned), `events[]` (append-only award log with batch ids for undo), `challenges[]`, `settings` (level table, evolution levels, negative toggle, sound, reduced motion, PIN hash, current class).

Achievements count *tags* rather than category ids, so teacher-created categories can still count toward "Super Reader" etc.

## Key rules
- Creature assignment: unused species first; once all 30 are used, least-used species, so duplicates stay rare and even.
- Rarity is cosmetic only (sparkles, aura ring); XP is never affected.
- Negative points: off by default; when on they are clamped so a creature never drops below its current stage's XP floor.
- Undo reverses XP, tag counts, and any badge/item/challenge that the undone award unlocked.
- Evolution celebrations only fire the first time a stage is reached (`bestStage`).

## Phases (as executed)
1. Architecture, types, design tokens
2. Dashboard & student management
3. Creature roster and SVG art system (contact-sheet reviewed per element)
4. XP & evolution engine (19 unit tests)
5. Animations, particles, evolution sequence, sounds
6. Achievements, collectibles, challenges
7. Presentation mode (spotlight, random picker, class goal celebration)
8. QA pass (scripted Playwright walkthroughs at 4 viewports), docs

## Team roles → how they were covered
| Role | Where the work lives |
|---|---|
| Project Architect | this document, `engine/`, `store/` |
| UI/UX Designer | `design-system.md`, `components/`, `views/` |
| Creature & Game Designer | `data/species.ts`, `data/defaults.ts`, progression rules above |
| Animation & VFX | `creatures/`, `components/Celebrations.tsx`, `index.css` keyframes |
| Frontend Developer | `views/`, `components/` |
| Backend & Database | `store/storage.ts`, `engine/backup.ts` |
| QA & Educational Testing | `engine/engine.test.ts`, independent QA agent walkthrough |
