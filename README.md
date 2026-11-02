# Classroom Creatures

A gamified classroom management app for Grade 2 and Grade 3 teachers. Every student gets their own original fantasy creature. The teacher awards XP for positive behaviour, and the creatures celebrate, level up, evolve through five forms, unlock badges and accessories, and appear on a projector-friendly presentation screen.

- **Runs locally.** No accounts, no student emails, no cloud, no paid services. Works offline once installed.
- **Saves automatically** to the browser's IndexedDB (with a localStorage mirror), plus daily safety snapshots and downloadable backup files.
- **Positive by default.** Negative points are off. If turned on, they can never make a creature lose an evolution or go below 0 XP.

## Quick start

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
cd classroom-creatures
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). On first launch a clearly labelled **demo class** is loaded so you can try everything; the welcome screen offers to set up your real class and a teacher PIN.

### Using it every day without the dev server

```bash
npm run build
npm run preview
```

`npm run build` writes a static site to `dist/`. It uses relative paths, so `dist/` can be served by any static web server (for example `npx serve dist`) or copied to a school intranet. Data is stored per browser *and* per address, so always open the app from the same address on the same computer.

### Mac app

Classroom Creatures also runs as a normal Mac app (a dock icon, its own window, native full screen for the projector, menu shortcuts ⌘1–⌘3 for the tabs, ⌘, for Settings and ⌘P for Presentation Mode). It works fully offline.

**Easiest: build it on your Mac** (needs Node.js 18+):

```bash
cd classroom-creatures
npm install
npm run app:mac
```

This creates `release/Classroom Creatures-1.0.0-universal.dmg` (works on both Apple Silicon and Intel Macs). Open the `.dmg` and drag **Classroom Creatures** into **Applications**.

**Or download it from GitHub:** every push that changes `classroom-creatures/` runs the *Classroom Creatures – macOS app* workflow, which builds the same `.dmg` on a Mac. Open the workflow run on the repository's **Actions** tab and download the `Classroom-Creatures-mac` artifact.

**First launch of a downloaded copy:** the app is not notarised by Apple (that needs a paid Apple Developer account), so macOS warns you the first time. Right-click (or Control-click) the app in Applications → **Open** → **Open**. On recent macOS versions you may instead need to go to System Settings → Privacy & Security and click **Open Anyway**. If macOS says the app "is damaged", run this once in Terminal:

```bash
xattr -cr "/Applications/Classroom Creatures.app"
```

**Your data in the Mac app** is stored in `~/Library/Application Support/Classroom Creatures`, separately from any browser copy. To move a class from the browser version into the app, use Settings → Backup & Data → *Download backup file* in the browser, then *Restore from file* in the app.

To try the desktop shell without packaging: `npm run app`. The same config also builds Windows (`npx electron-builder --win`) and Linux (`npx electron-builder --linux`) versions.

### Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit tests for the XP, evolution, achievement, challenge, import and backup engine (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Type-check and build the production site into `dist/` |

## Classroom workflow

1. **Classroom tab**: every student card shows the creature, level, XP bar, stage and three quick-award buttons (the behaviours you ⭐ pin in Settings).
2. **Click a card** to open the student profile: a big animated creature, the full award grid, wardrobe, badges, challenge progress, history and management tools.
3. **Select students** to award several at once, or **Award whole class**.
4. Every award shows a floating **+XP**, a chime and a creature celebration. Level-ups, achievements and evolutions trigger their own celebrations automatically.
5. **Made a mistake?** Every award shows an **Undo** toast for 10 seconds, and any award can be undone later from the activity panel or the student's History tab. Undo also takes back badges or items that award unlocked.
6. **Present** opens a full-screen projector view: first names and creatures only (no XP totals, no rankings), a class-goal bar, an awards ticker, a spinning random student picker and a big spotlight view.

## Project architecture

```
src/
├── types.ts                 Domain types (AppData is everything that is persisted)
├── data/                    Pure content: species roster, elements, defaults, achievements, items, challenges
├── engine/                  Pure, unit-tested game logic (no React, no storage)
│   ├── progression.ts       XP → level → stage, next-evolution targets, table validation
│   ├── awards.ts            applyAward / undoBatch / unlock evaluation / challenge progress
│   ├── roster.ts            Unique creature assignment, student/class factories, CSV/name parsing
│   ├── backup.ts            Backup file format, validation and normalisation
│   ├── demo.ts              Clearly labelled demo class
│   └── pin.ts               Salted SHA-256 PIN hashing
├── store/
│   ├── store.ts             Zustand store: actions call the engine, queue celebrations, auto-save
│   └── storage.ts           IndexedDB persistence, localStorage mirror, rolling snapshots
├── creatures/
│   ├── CreatureSvg.tsx      Parametric SVG renderer for all species × 5 stages
│   ├── accessories.tsx      Hats, glasses, wings, magic, decorations
│   ├── Creature.tsx         Animated wrapper: idle loop, reactions, particle bursts
│   ├── Burst.tsx            One-shot element/sparkle/confetti particles
│   └── Habitat.tsx          Element habitats and unlockable backgrounds
├── (electron/main.cjs)     Desktop shell: serves dist/ from a private app:// origin, menus, full screen
├── audio/sfx.ts             All sounds synthesised with Web Audio (original, offline)
├── components/              Cards, award grid, celebrations, toasts, top bar, PIN lock, UI kit
├── views/                   Dashboard, StudentProfile, Creaturedex, Rewards, Settings, Present, Onboarding
└── lib/                     Hash router and view-model helpers
```

**Data flow.** UI → store action → pure engine function returns a new `AppData` → store commits it (debounced save to IndexedDB) and pushes UI-only celebration events (evolution, level-up, achievement, class goal) to a queue that `CelebrationHost` plays one at a time.

**Ready for cloud sync later.** All persisted state is one serialisable `AppData` object with a `version` field, every record has a stable id, and awards are an append-only event log with batch ids. A sync backend can replicate `AppData` (or the event log) without changing the UI or the engine.

## Creature artwork

Every creature has illustrated artwork for all five stages (150 images in `public/creatures/`, about 4 MB). The art was generated with Higgsfield (GPT Image 2.5): one transparent image per species showing its whole five-stage evolution line, written from that species' design data and reviewed by hand so every design stays original and doesn't resemble an existing franchise character. The prompts are generated by the data in `src/data/species.ts`.

- `scripts/slice-lineup.py <lineup.png> <id>` cuts a lineup into `<id>-1.webp` … `<id>-5.webp` (needs Python with Pillow, NumPy and SciPy).
- `scripts/creature-anchors.py` measures where each creature's head and eyes are and writes `src/data/creatureArt.json`, which is how hats, glasses and other accessories line up on the illustrations.
- The original vector drawings are still in the app. Teachers can switch to them in **Settings → Classroom & PIN → Illustrated creature art**, and any species without an illustration automatically uses them. Open `?sheet` in development to see the vector set, or `?sheet&art` for the illustrations.

## Adding new creatures

The vector version of a creature is drawn from parameters, so a new species works immediately with no image files (add illustrated art later with the scripts above). Add an entry to `RAW` in `src/data/species.ts`:

```ts
{ id: 'puddlepup', name: 'Puddlepup', legendTitle: 'Rain Herald', element: 'water', rarity: 'uncommon',
  personality: 'Splashes in every puddle it finds.', ability: 'Rain Dance',
  body: 'tall',        // round | tall | pear | wisp
  ears: 'droop',       // cat | bunny | round | fin | none | antenna | leaf | horn | feather | droop
  tail: 'fluffy',      // flame | fluffy | fish | leaf | bolt | none | curl | crystal | wisp | star | cloud
  wings: 'none',       // none | feather | bat | fairy | crystal | leaf
  face: 'snout',       // snout | beak | plain | whisker
  pattern: 'spots',    // none | belly | spots | stripes | stars | cracks | swirl
  idle: 'hop',         // bob | sway | float | hop | breathe | wiggle
  palette: { main: '#6fb7e8', shade: '#4a93c8', belly: '#e8f6ff', accent: '#ffd36b', eye: '#10233a' } },
```

- Each stage automatically grows the creature and adds its element's features (for example fire: flame tuft → horns → cheek flames → flame crown and embers).
- A short original "voice" is generated from the id; pass `sound: { base, wave, notes }` to customise it.
- To preview every species at every stage while developing, open `http://localhost:5173/?sheet` (or `?sheet=fire`, `?sheet=puddlepup`, and `&eq=hat:hat-crown,glasses:glasses-round` to try accessories). The sheet only exists in development builds.
- New body parts or element features go in `CreatureSvg.tsx` (`Ears`, `Tail`, `WingPair`, `ElementFeatures`). Accessories go in `accessories.tsx` plus an entry in `ITEMS` (`src/data/defaults.ts`).

## Adding animations

- **Idle loops** are CSS keyframes in `src/index.css` (`.idle-bob`, `.idle-hop`…), chosen per species with `idle`. They are cheap on classroom computers and switch off with *Reduce motion* or the OS setting.
- **Reactions** (jump, wave, ability, happy, celebrate) live in `src/creatures/Creature.tsx`: add a name to `CreatureAction` and a Framer Motion keyframe in `run()`.
- **Particles**: `Burst` in `src/creatures/Burst.tsx` takes an element kind, `sparkle` or `confetti`; add a particle shape in `Particle`.
- **Big moments**: the evolution sequence, level-up, achievement and class-goal celebrations are in `src/components/Celebrations.tsx`.

## Changing XP progression

Teachers can edit the level table and evolution levels in **Settings → XP & Evolution** (validated; nobody loses badges or items). The defaults live in `src/data/defaults.ts`:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Total XP | 0 | 50 | 120 | 210 | 320 | 450 | 600 | 780 | 980 | 1200 |

Evolution: Baby (L1), Young (L3), Evolved (L5), Advanced (L7), Legendary Form (L10). Behaviour XP values are edited in **Settings → Behaviours**. Achievement rules and item unlock rules are data in `src/data/defaults.ts`.

## Backing up and restoring data

- **Automatic**: every change is saved immediately on this computer. A safety snapshot is taken once a day and before anything is deleted, removed or restored (the newest 12 are kept).
- **Backup file**: Settings → Backup & Data → *Download backup file*. Keep it on a USB stick or school drive (once a week is a good habit).
- **Restore**: *Restore from file* (or pick a snapshot). Your current data is snapshotted first, so a restore can itself be undone.
- **Moving to a new computer**: download a backup on the old one, open the app on the new one, restore the file.
- Backups never contain the teacher PIN. **Forgot the PIN?** Clear this site's data in the browser, open the app, and restore your latest backup file.

## Privacy

Only first names (or whatever the teacher types) are stored, and only on this computer. There are no student accounts, emails, analytics or network requests; fonts are bundled. Presentation mode shows first names only. Student deletion requires typing the student's name and takes a snapshot first.

## Credits

All creatures, names, artwork, animations and sounds are original to this project. Inspired by the general appeal of creature-collecting games and classroom point systems; no characters, artwork, sounds or branding from any existing game are used.
