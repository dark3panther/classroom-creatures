# Classroom Creatures 1.5.0: World of Adventures

1.5.0 brings two things: the **World of Adventures** and the **sky world** (the animated painted background
with springy, responsive buttons and cards). Both are in this one version.

## World of Adventures

The class explores a fantasy world together. Everything runs on the points you already give, so there is
nothing extra to keep track of during a lesson.

### For the class
- **A world map** with six regions: Verdant Valley, Crystal Caverns, Frostpeak Mountains, Ember Kingdom,
  Sky Islands and the Ancient Kingdom. Each region has its own pixel-art island and place, quests, four
  treasures, the creatures that live there, a boss, and a completion percentage for every student.
- **Regions open together.** The class earns adventure points from the XP students earn, the quests they
  complete and the bosses they befriend. Crystal Caverns opens at 10 points, then Frostpeak Mountains at 30,
  Ember Kingdom at 60, Sky Islands at 100 and the Ancient Kingdom at 150. A region that has opened stays open.
- **Quests**: daily, weekly and special quests with XP, coins and sometimes an item. Some count by themselves
  from the points you give; others students hand in for you to check.
- **Boss battles** the whole class wins together. Six original bosses. Every point you award and every
  approved quest fills the friendship meter. Nobody is ever out, and when the meter is full the boss becomes
  the class's friend: everyone gets the reward and a statue joins the class world.
- **Treasure chests** that say exactly what is inside and what they need. No luck, no gambling. New items:
  six region backgrounds, a World Map background, the Bramble Crown, Snow Goggles, the Star Temple Crown, and
  Crystal, Lava and Cloud trails.
- **An adventure journal** for every student, by day, with filters.
- **The class world**: the Creature Sanctuary, Fantasy Village, Magical Library, Training Arena and Royal
  Castle grow through three stages as the class earns adventure points, with decorations and statues.
- **New badges**: Quest Starter, Quest Hero, Treasure Hunter, Boss Befriender, Legendary Ally, World Explorer
  and Master Explorer. Challenge Champion is now Quest Champion.

### For the teacher
- **Adventure** in the top bar, with World Map, Quests, Boss Battle, Treasures, Journal, Class World and
  the **Adventure Control Center**.
- **Quest book**: create, edit, duplicate and delete quests (deleted quests keep their history), assign them
  to the class or to chosen students, set start and end dates, and choose whether completions need your
  approval. Approve hand-ins one by one or all at once, or send one back with a short note.
- **Boss battles**: pick the boss, the points needed (a suggestion is worked out from your class size), how
  long and the reward. Pause, resume or end at any time. Add a class activity ("we finished the class story").
- **Control Center**: adventure points, regions, quests waiting, the boss battle and treasure at a glance;
  approve everything, hand out rewards, open a region early or close one, and the full adventure history.
- **Settings → Adventure**: switch the whole adventure, the class world, or student use while locked on and off.

### Safe by design
- **Students can never reward themselves.** What a student hands in always waits for you. The engine checks
  who is asking for every change, so a student at the kiosk cannot approve, change points, open regions or
  start battles even by tapping around.
- **Every reward is given exactly once.** Quest, boss and treasure rewards are written into a reward ledger;
  pressing Collect twice, two windows or a quick double tap cannot pay twice.
- **One reward system.** Quest, boss and treasure rewards go through the same XP and coin pipeline as your
  awards, so levels, evolutions, badges, milestone treats and the history all work, and **Undo** works: undo
  an award and its boss points and the quest it completed are taken back (unless already collected); undo a
  collected reward and it can be collected again.
- **Kind**: no elimination, no losing progress, bosses are befriended, never defeated, and a battle that runs
  out of time just ends.

### Upgrading from 1.4
Your data upgrades automatically the first time 1.5 opens, and a safety snapshot is saved first. Every
student keeps their creature, XP, coins, items, badges and history. Your challenges become quests in Verdant
Valley (the original challenge list is kept untouched), the starting quests that do not repeat one are added,
and a challenge already completed today is not completed or paid again. Backups made with 1.4 restore into
1.5; backups made with 1.5 contain all adventure progress.

## The sky world
- A bright painted daytime world behind every screen: sun, drifting clouds, floating islands, hills and a
  flower meadow, with the class's winged creatures flying past. *Animated background* (Settings → Classroom
  & PIN) keeps it still; *Reduce motion* calms everything.
- Springy buttons, cards that lean towards the pointer, "+5 XP" springing out of a card, rolling numbers and
  sliding tabs (anime.js).
- The Mac app is for Apple Silicon (M1 and newer), signed ad hoc so macOS opens it.

## Data changes (for the record)
- Data version 3 → 4. New collections: `quests`, `questRecords`, `bosses`, `adventureLog`, `rewardLedger`.
  New fields: `student.adventure` (regions explored, treasure opened, bosses befriended), `class.adventure`
  (region overrides, regions opened, class-world stages, decorations announced), `event.reward` on reward
  events, and the settings `adventureEnabled`, `classWorld`, `adventureWhileLocked`. Nothing is removed or
  rewritten; the migration only adds.

## Tests
- 72 unit tests (21 new for the adventure: regions, quests and the approval state machine, one-time rewards,
  permissions, tracked quests and undo, bosses, treasure, journal, class world, the upgrade from 1.4, backup
  and repair of damaged data).
- `npm run test:e2e:adventure`: 45 end-to-end checks in a real browser, from the upgrade through the kiosk
  hand-in, approval, a boss battle, a treasure chest and the journal to a restart and phone width.
- `npm run test:e2e`: the 1.4 end-to-end checks still pass.

## Known limits
- Adventure points are worked out for the class currently selected; moving a student to another class takes
  their adventure progress with them.
- The class world shows up to ten of the class's creatures strolling around, to keep older computers smooth.
- The pixel art scales with the screen; on very small phones the map labels get small, and the region list
  under the map is the easier way in.
