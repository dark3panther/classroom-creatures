# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A Grade 2–3 English teacher, many of whose students are non-native English speakers. The teacher runs the app during lessons, mostly on a classroom projector or interactive whiteboard at the front of the room, with the whole class watching. The teacher operates it (often standing, tapping or clicking fast mid-lesson); the students are the audience who watch their creatures react.

## Product Purpose

Classroom Creatures turns positive classroom behaviour into a creature-collecting adventure. Every student owns an original fantasy creature that earns XP and coins, levels up, evolves through five forms, feels emotions, wears earned accessories and reacts to awards and behaviour deductions. Success: the teacher can award or deduct in one or two taps without breaking the lesson, and students are genuinely excited to watch their creatures grow.

## Positioning

A classroom points system where the reward is a living creature, not a number: 30 original species × 5 evolution stages, moods, a coin shop, milestone treats the teacher hands out in real life, a class prize wheel, and pixel-art reactions, all running locally with no accounts.

## Operating Context

- Shown on a projector or whiteboard in a lit classroom (washed-out colours, viewed from across the room); also used on the teacher's laptop.
- Screens: Classroom dashboard (student card grid, quick award buttons, activity panel), student profile (award, shop, wardrobe, badges, history, manage), Creature collection, Rewards & challenges, Settings, Presentation Mode (projector view with random picker and spotlight), celebrations (evolution, level up, milestone, prize wheel).
- Runs locally in the browser and as a Mac app (Electron); works offline.

## Capabilities and Constraints

- React 18 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion; data in IndexedDB; Electron shell for macOS.
- Must stay fast on ordinary classroom computers; respects Reduce Motion.
- Teacher PIN locks teacher controls; Presentation Mode shows first names only, no rankings or XP totals.
- Layout and navigation may change in a redesign; all functions must be preserved.

## Brand Commitments

- Keep unchanged: the 150 illustrated creature images and habitats (`public/creatures/`), the app icon (orange fire-puppy hugging a star, `build/icon.png`), and the pixelfx pixel-art effects (`src/vendor/pixelfx`).
- Name: Classroom Creatures. Tone: an adventure, encouraging and kind; never shaming.
- Must not feel babyish (toddler pastel cartoon) and must not feel like plain school-admin software.

## Evidence on Hand

- Creature art: `public/creatures/*.webp` (30 species × 5 stages), anchors in `src/data/creatureArt.json`.
- Icon: `build/icon.png`, `public/favicon.png`.
- Clearly labelled demo class with fictional "… Demo" students.
- No real student data, testimonials or school logos; never invent them.

## Product Principles

1. One tap to reward: classroom speed beats every other concern on the teacher's screens.
2. The creature is the hero; the interface frames it and gets out of the way.
3. Readable from the back of the room: large targets, strong contrast, few competing colours.
4. Kind by design: deductions sting gently, nobody is ranked or shamed in front of the class.
5. Local and private: no accounts, no student emails, nothing leaves the computer.

## Accessibility & Inclusion

- Young non-native English readers: short labels paired with clear icons.
- Projector legibility: high contrast that survives washed-out projection; nothing important carried by colour alone.
- Honour Reduce Motion and the OS reduced-motion setting.
