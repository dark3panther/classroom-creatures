# Classroom Creatures 1.6.0: lesson battles

1.6.0 turns boss battles into something a class can play in one or two lessons on the projector: every point
a teacher gives is a creature's attack, and every point taken makes the boss strike back. It also adds three
regions and six bosses, and every boss is now painted. Existing classes, battles and progress carry over with
no migration.

## Lesson battles
- **Set-up in about ten seconds**: Adventure → Boss Battle → *Start battle* → *Lesson battle*. Choose the class
  mission (nine presets or your own words), what is super effective today, one or two lessons (30 to 60 minutes
  each) and Gentle, Normal or Tough. The HP is worked out from the class size, the class's award values and the
  length (24 students, awards averaging 4 XP, one lesson: 240 HP).
- **Points are attacks.** An award, given anywhere in the app, is that creature's attack in the arena: it hops,
  its element flies at the boss, the boss flinches and loses HP equal to the XP. The super-effective behaviour
  counts double. An award to many students at once is a team attack.
- **Deductions: the boss strikes back** at that creature with its own cartoon attack (brambles, mud, a snowball,
  a puff of warm smoke, a tiny spark...). The creature is dazed for five seconds and the boss gets the points back,
  at most 20% of its HP in a whole battle. The student loses only the points taken; nobody is ever out. The
  teacher can switch strikes off per battle (they are off when deductions are off).
- **Mission complete** is the team finisher: every creature attacks at once for 25% of the HP. Once per battle.
- **Time's up** pauses the battle with its HP kept; *Start the next lesson* adds another lesson to the clock.
- **Befriended**: the boss turns happy in the arena, then the usual celebration. Everyone gets the battle's reward
  (2 XP and 5 coins by default). A boss already befriended becomes a friend again (its statue is already there).
- The arena has the class line-up (tap a creature to give points), *Whole class*, *Pause*, *End* and full screen,
  the mission card, a big HP bar and the lesson clock. The classroom page shows a battle strip with
  *Open the arena* while a lesson battle is on. Pop-ups wait until the attacks have played.

## The world grows
- **Three new regions**: Coral Lagoon (20 adventure points), Mushroom Hollow (80) and Sunstone Desert (200), with
  relics (Singing Shell, Firefly Lantern, Sunstone Scarab), coin chests, region backgrounds and boss gifts
  (Captain's Hat, Glow Spore Trail, Sunstone Circlet). The world map now has nine islands.
- **Six new bosses**: Captain Puffington, Snorecap and Riddlepaw guard the new regions; Mudsnout (Verdant Valley),
  Murkmoth (Crystal Caverns) and Zapcrackle (Ember Kingdom) are wandering bosses, so there are two bosses to
  battle from the first day.
- **Painted bosses**: all twelve bosses are painted illustrations with four faces (grumpy, hurt, attacking,
  befriended), blinking eyes and an aura from their element. In Pixel mode they are made into pixel art.
- **Fixed**: the 1.5 boss gifts (Bramble Crown, Crystal Trail, Lava Trail, Cloud Trail, Star Temple Crown, Snow
  Goggles) now show on the creature.
- Adventure points count each befriended boss once, so repeated lesson battles do not race a class through the
  map. The Boss Befriender badges count different bosses.

## For developers
- Engine: `BossBattle.lesson`, `strikeBack`, `completeMission`, `battleRecovered` in `src/engine/adventure/bosses.ts`;
  numbers in `LESSON`, `MISSIONS` and `lessonHp` (`src/data/adventure.ts`). Rules: `docs/adventure-design.md` 3.6.
- Bosses are drawn in code: `src/creatures/bosses/BossArt.tsx` (see `?bosses` in development), shown through
  `BossPortrait` (pixelated with `src/creatures/pixelate.ts` in Pixel mode). Painted arena places:
  `src/views/adventure/ArenaBackdrop.tsx`. The arena: `src/views/adventure/Arena.tsx`.
- New pixel art: `scripts/pixel/regions2.px.js` (`npm run art:adventure`).
- Tests: `src/engine/lesson.test.ts` (15) and `npm run test:e2e:battle` (31 checks).
- The AI image services were unavailable while this was made (a payment issue, a plan limit, a free-plan watermark),
  so the bosses are drawn in code. `BossPortrait` takes painted images as a drop-in later: list the boss in
  `BOSS_PAINTINGS` and add `public/bosses/<id>.webp` and `<id>-friend.webp`.
