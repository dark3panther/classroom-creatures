# World of Adventures (1.5) — design

Structured with the game-design-document and economy-model templates from
[Claude-Code-Game-Studios](https://github.com/dark3panther/Claude-Code-Game-Studios) (Overview, Player
Fantasy, Detailed Rules, Formulas, Edge Cases, Dependencies, Tuning Knobs, Acceptance Criteria). Content
numbers live in `src/data/adventure.ts`; rules live in `src/engine/adventure/`.

## 1. Overview

An adventure layer on top of the 1.4 creature game. The class explores a fantasy world of six regions,
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

## 4. Formulas

* **Adventure points** (class): `AP = floor(Σ lifetimeXp / 100) + 3 × approved quest completions + 20 × bosses befriended`.
  All three come only from teacher-approved activity.
* **Region unlock** (AP): Verdant Valley 0 · Crystal Caverns 15 · Frostpeak Mountains 40 · Ember Kingdom 80 ·
  Sky Islands 130 · Ancient Kingdom 200.
* **Suggested boss HP**: `students × perStudent` (easy 8, medium 14, hard 22, epic 32), minimum 30.
* **Boss hit**: award XP (positive awards only); approved quest `max(5, reward XP)`.
* **Region completion** (per student): average of quests completed in the region (distinct quests, capped
  at the region's quest count), treasures opened in the region (out of 4) and region creature forms the class
  has discovered.
* **Location stage thresholds** (AP): Sanctuary 0/25/70 · Village 10/45/110 · Library 20/60/140 ·
  Arena 30/80/160 · Castle 50/120/220.

## 5. Economy (sources)

| Source | XP | Coins | Frequency | Notes |
|---|---|---|---|---|
| Daily quest | 3 | 5 | per day | 5 default daily quests |
| Weekly quest | 10–15 | 15–20 | per week | 4 default weekly quests |
| Custom quest | teacher | teacher | once | optional item reward |
| Boss befriended | 5–15 | 15–40 | per battle | every student, plus a statue |
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
