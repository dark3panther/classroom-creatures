# World of Adventures (1.5, lesson battles 1.6) — design

Structured with the game-design-document and economy-model templates from
[Claude-Code-Game-Studios](https://github.com/dark3panther/Claude-Code-Game-Studios) (Overview, Player
Fantasy, Detailed Rules, Formulas, Edge Cases, Dependencies, Tuning Knobs, Acceptance Criteria). Content
numbers live in `src/data/adventure.ts`; rules live in `src/engine/adventure/`.

## 1. Overview

An adventure layer on top of the 1.4 creature game. The class explores a fantasy world of nine regions (six
in 1.5, three more in 1.6),
completes quests, befriends bosses together, opens treasure chests and grows a shared world. Nothing here
creates a second XP, coin or item system: every reward goes through the existing award pipeline
(`applyReward` in `engine/awards.ts`), so levels, evolutions, achievements, milestone treats, undo and the
activity history all keep working.

## 2. Player fantasy

*Students:* "My creature and I are adventurers. When I help a classmate or finish my reading, I complete
quests, find treasure and help the whole class calm the boss." *Teacher:* "Ten seconds to set up, one tap
to approve, and the class pulls together."

Kind by design: no elimination, no losing progress, no random rewards, no money, bosses are never
"killed" (they are befriended and move into the class sanctuary).

## 3. Detailed rules

### 3.1 Who can do what

| Action | Teacher (controls unlocked) | Student (kiosk, controls locked) |
|---|---|---|
| Create, edit, duplicate, delete, assign quests | yes | no |
| Submit a quest as done | on behalf of a student | own quests only |
| Approve / reject a submission | yes | no |
| Collect an approved reward | on behalf of a student | own rewards only |
| Start, pause, resume, end a boss battle, set its HP and reward | yes | no |
| Change boss HP directly | never (HP only falls through approved activity) | never |
| Unlock / lock regions, upgrade class locations | yes | no |
| Open a ready treasure chest | on behalf of a student | own chests only |
| Visit a region (exploration) | the whole class ("Explore together") | self |

Enforced in the engine (`Actor` argument, `engine/adventure/permissions.ts`), not only by hiding buttons.

### 3.2 Quests: states and transitions

A quest has a requirement: **tracked** (counted automatically from teacher awards: a behaviour tag, or XP
earned) or **check** (someone says it is done). Daily and weekly quests repeat each period (records are keyed
by `day` or `ISO week`); custom quests run once, optionally between a start and end date.

```
           progress (derived from awards)                 teacher approves
 available ───────────────► target reached ──► SUBMITTED ─────────────────► APPROVED ──► COLLECTED
     │                         │ (no approval needed) ▲      │                 ▲   (student or teacher;
     │  student "I did it"     └──────────────────────┼──────┼─► APPROVED       │    reward granted once)
     └────────────────────────────────────────────────┘      │                 │
                                     teacher rejects (reason) ▼                 │ undo of the reward
                                                       REJECTED ── resubmit ────┘ returns it to APPROVED
```

* A **student** submission always goes to SUBMITTED, even on quests that do not need approval: a child can
  never mark their own quest complete.
* A **teacher** marking a quest done moves it straight to APPROVED.
* Tracked quests reach SUBMITTED (approval on) or APPROVED (approval off) by themselves when the target is met.
* Every transition is validated; anything else is refused with a reason. Each change is kept in the record's
  `history` (who, when, note).
* Collecting is idempotent: the reward ledger key `quest:<recordId>` can be written once.
* Each approved completion also counts in `challengeCompletions`, so the 1.4 challenge achievements and item
  unlocks keep working.

### 3.3 Boss battles

1. The teacher picks a boss (any boss of an unlocked region), its HP (the total contribution needed), the
   duration and the reward, and starts the battle. One active battle per class.
2. Every positive teacher award to a student of that class during the battle hits the boss for the XP
   awarded. Every approved quest hits it for `max(5, quest XP)`. The teacher can add a whole-class activity
   ("the class finished the reading: 20").
3. Undoing an award also takes its hit back. Paused battles take no hits and the clock stops.
4. When contributions reach HP the boss is **befriended**: the battle is won, every student in the class
   gets the reward once (ledger `boss:<battleId>:<studentId>`), contributors get the battle in their journal
   and count towards Boss Buster achievements, and the boss's statue joins the Creature Sanctuary.
5. If time runs out first, the boss "wanders off to rest": no penalty, the teacher can start it again.

### 3.4 Treasure

Fixed treasures with written requirements (`TREASURES` in `data/adventure.ts`): per region a relic (visit the
region), a coin chest (2 region quests), a cosmetic chest (5 region quests: the region background) and a
boss chest (help befriend the region boss: a region accessory); plus four special treasures. A chest is
LOCKED (with progress), READY, or OPENED. Opening grants exactly what it says, once (ledger
`treasure:<id>:<studentId>`). If the item is already owned, the chest pays the stated coin value instead.
No randomness anywhere.

### 3.5 Regions and the shared world

Regions unlock for the whole class by **adventure points** (below) or by the teacher. Locations of the
shared world (Creature Sanctuary, Fantasy Village, Magical Library, Training Arena, Royal Castle) each have
three stages; when the class has enough points the teacher presses Build / Upgrade. Decorations come from
befriended bosses (statues) and class quest milestones. The shared world can be switched off in Settings.

### 3.6 Lesson battles (1.6)

A short battle made for the projector, sized for **one or two lessons** around a **class mission** (the
daily task). It turns the teacher's normal point-giving into a visible fight the whole class follows.

**Setup (about ten seconds).** On the Boss Battle page the teacher picks a boss of an open region and
*Lesson battle*, then:

| Setting | Default | Notes |
|---|---|---|
| Class mission | "Everyone joins in the lesson" | nine presets or the teacher's own words (80 characters) |
| Super effective today | the mission's behaviour | awards of that category count double (×2); or nothing extra |
| How long | one lesson of 45 minutes | one or two lessons; 30 to 60 minutes each |
| Boss strength | Normal | Gentle / Normal / Tough set the HP (below); the teacher can type any HP |
| The boss strikes back | on | off: deductions do not touch the battle. Unavailable when deductions are off |
| Reward for everyone | 2 XP, 5 coins | small, because lesson battles can happen every day |

**During the lesson** the arena shows the class's creatures on the left and the boss on the right, the
mission, the boss's HP and the lesson clock. Points can be given from the arena (tap a creature, or
*Whole class*), from the classroom, or anywhere else: the arena plays every one.

1. **A point award is that creature's attack.** The creature hops, its element flies at the boss (fireball,
   water orb, ice lance, ball lightning...), the boss flinches and loses HP equal to the award's XP; a
   *super effective* award counts double and says so. An award to several students at once is a **team
   attack**. Approved quests and class activities hit the boss as before.
2. **A deduction makes the boss strike back** at that student's creature, in its own way (Grumblethorn tangles
   it in brambles, Mudsnout splatters mud, Snowsulk throws a snowball...). The creature is dazed for five
   seconds; the boss **recovers the points lost**, at most 20% of its HP over the whole battle, and never past
   full. The strike happens even if the student had no XP left to lose. The student's only cost is the
   deduction itself: no coins, no lost progress, nobody is ever out.
3. **Mission complete** (teacher, once per battle) is the **team finisher**: every creature attacks together
   for 25% of the boss's HP.
4. **Time's up**: the battle pauses with its HP kept (it does not end, unlike a long battle). Resuming starts
   a fresh lesson on the clock, so a two-lesson battle simply carries on next time. Pause and End work as for
   long battles; ending costs nobody anything.
5. **Befriended** at 0 HP: the boss turns happy in the arena, then the usual celebration; everyone gets the
   reward once. A boss befriended before becomes a friend *again* (no second statue).

**Why it stays kind.** The boss never targets anyone the teacher did not deduct; the strike is cartoon play
(splats, puffs, tangles), names the creature and the first name only, and the class's shared consequence is
small and capped. The rules screen under the arena says it in the children's words: "keep each other on
track". The teacher can switch strikes off per battle.

### 3.7 Regions and bosses added in 1.6

Coral Lagoon (water, 20 AP, Captain Puffington), Mushroom Hollow (nature and shadow, 80 AP, Snorecap) and
Sunstone Desert (earth, fire and light, 200 AP, Riddlepaw), each with a relic, a coin chest, a background
chest and a gift chest (Captain's Hat, Glow Spore Trail, Sunstone Circlet). Three **wandering bosses** live
in regions without guarding them (no chest of their own): Mudsnout (Verdant Valley), Gloomwing (Crystal
Caverns) and Zapcrackle (Ember Kingdom), so a class has two bosses to battle from the first day. Every boss
is drawn as a painted illustration in code (`src/creatures/bosses/BossArt.tsx`) with four faces (grumpy,
hurt, attacking, happy), a blink, an element, an aura and a strike; in Pixel mode it is made into pixel art.

## 4. Formulas

* **Adventure points** (class): `AP = floor((Σ lifetimeXp / 25 + 2 × approved quest completions) / students) + 20 × different bosses befriended`
  (1.6: each boss counts once, so befriending it again in lesson battles does not race the class through the map).
  The class average, so a class of 12 and a class of 30 move through the world at the same pace. All three parts
  come only from teacher-approved activity. A student who earns about 12 XP and completes one or two quests a
  day adds about 3 to 4 points a day.
* **Region unlock** (AP): Verdant Valley 0 · Crystal Caverns 10 · Coral Lagoon 20 · Frostpeak Mountains 30 ·
  Ember Kingdom 60 · Mushroom Hollow 80 · Sky Islands 100 · Ancient Kingdom 150 · Sunstone Desert 200. Roughly:
  the second region in the first week, Ancient Kingdom in about a term, Sunstone Desert for the end of the year. A region that has opened stays open (undo never closes it); only the teacher can close one.
* **Suggested boss HP**: `students × perStudent` (easy 8, medium 14, hard 22, epic 32), minimum 30.
* **Boss hit**: award XP (positive awards only); approved quest `max(5, reward XP)`.
* **Lesson battle HP**: `round5(students × 2.5 awards × average positive award XP × lessons × level)`, level
  Gentle 0.75 · Normal 1 · Tough 1.35, minimum 20. E.g. 24 students, awards averaging 4 XP, one lesson: 240 HP.
  The class's awards bring it most of the way; the mission's 25% finishes it.
* **Super effective**: the award's XP × 2. **Strike back**: the boss recovers the XP lost, while
  `recovered ≤ floor(0.2 × HP)` and never below a full meter. **Team finisher**: `ceil(0.25 × HP)`.
* **Region completion** (per student): average of quests completed in the region (distinct quests, capped
  at the region's quest count), treasures opened in the region (out of 4) and region creature forms the class
  has discovered.
* **Location stage thresholds** (AP): Sanctuary 0/20/55 · Village 10/35/90 · Library 15/50/110 ·
  Arena 25/65/130 · Castle 40/95/170.
* **Class decorations** (approved quest completions, whole class): bunting 20 · lanterns 75 · fountain 150 ·
  rainbow arch 300; plus a statue for every boss befriended.

## 5. Economy (sources)

| Source | XP | Coins | Frequency | Notes |
|---|---|---|---|---|
| Daily quest | 3 | 5 | per day | 5 default daily quests |
| Weekly quest | 10–15 | 15–20 | per week | 4 default weekly quests |
| Custom quest | teacher | teacher | once | optional item reward |
| Boss befriended | 5–15 | 15–40 | per battle | every student, plus a statue |
| Lesson battle befriended | 2 | 5 | up to daily | every student (defaults; the teacher can change them) |
| Coin chest | 0 | 20–50 | once each | per region + specials |
| Cosmetic / boss chest | 0 | fallback 30–40 | once each | item, or coins if owned |

Coin sinks stay the 1.4 shop (items 25–180 coins). A student completing every daily quest earns about
25 coins a week from quests, so a mid-priced item takes two to four weeks.

## 6. Edge cases

* A quest edited after records exist: records keep their own title snapshot in the log; rewards already
  collected are never changed. Deleting a quest hides it but keeps its history.
* A student moved to another class keeps their records and treasures; class totals follow the class.
* Approving a submission for a quest that has since ended: still allowed (the work was done in time).
* A whole-class award during a paused battle: no hit, but the award itself is unaffected.
* Undoing the award that completed a tracked quest: the record is removed if it was not collected yet.
* Undoing a collected reward: the reward is taken back and the quest returns to APPROVED (collectable).
* Boss reward after an undo brought contributions under HP: the boss stays befriended (never punitive).
* Two windows or a double click: the ledger refuses the second grant.

## 7. Dependencies

Award pipeline (`applyAward`, `applyReward`, `undoBatch`), achievements (new rule kinds `treasures`,
`bosses`, `regions`), items (new unlock type `treasure`), class field guide (region creatures), PIN lock
(student kiosk), IndexedDB storage and backups (data version 4).

## 8. Tuning knobs

Everything in `src/data/adventure.ts`: AP weights, region thresholds, quest rewards, boss HP per student,
durations and rewards, treasure contents and coin values, location thresholds. Teachers tune per quest and
per battle in the Adventure Control Center; Settings has *Adventure* on/off, *Shared class world* on/off and
*Students may use Adventure while locked*.

## 9. Acceptance criteria

1. Regions open at the stated AP; a teacher can open or close any region; locked regions show their requirement.
2. Quests can be created, edited, duplicated, deleted (history kept) and assigned to the class or students.
3. Student submissions always wait for approval; approval, rejection (with reason) and resubmission work.
4. A reward is granted exactly once per completion, however many times "Collect" is pressed.
5. Students cannot approve, grant rewards, change boss HP or use teacher controls (engine refuses).
6. Boss HP falls only through approved activity, undo restores it, the boss is befriended at 0 HP and the
   class is rewarded once; pause stops hits and the clock.
7. Treasures open only when their requirement is met, grant exactly their reward once, and pay the coin
   value when the item is already owned.
8. The journal lists every quest, region, boss, treasure and milestone in time order, with filters.
9. All of it survives a restart, a backup and restore, and an upgrade from 1.4 data.
10. (1.6) A lesson battle: an award hits for its XP (double when super effective); a deduction makes the boss
    strike back at that creature and recover at most 20% of its HP in total; Mission complete hits for 25% once;
    time's up pauses with HP kept and Resume adds a lesson; undo takes back attacks and strikes. Each boss counts
    once for adventure points. (`src/engine/lesson.test.ts`, `scripts/e2e-battle.mjs`)
