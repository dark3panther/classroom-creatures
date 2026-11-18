import type { CategoryTag, ElementType, LocationId, Quest, QuestCategory, QuestKind, QuestReward, RegionId } from '../types';

/**
 * World of Adventures content. Every number a teacher might want tuned lives here (see
 * docs/adventure-design.md for the rules that use them). Art is in public/adventure/ (scripts/pixel).
 */

export const ADVENTURE_ART = `${typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.BASE_URL : '/'}adventure/`;

/* ───────────── adventure points ───────────── */
/**
 * Class adventure points = the class average of (lifetime XP / xpPerPoint + perQuest × approved quests),
 * plus perBoss for every boss the class has befriended. An average, so a class of 12 and a class of 30 move
 * through the world at the same pace.
 */
export const AP = {
  xpPerPoint: 25,
  perQuest: 2,
  perBoss: 20,
};

/* ───────────── regions ───────────── */
export interface RegionDef {
  id: RegionId;
  name: string;
  tagline: string;
  description: string;
  /** creatures of these elements live here */
  elements: ElementType[];
  /** adventure points the class needs (the teacher can open it earlier) */
  unlockAp: number;
  bossId: string;
  /** map colours: land, deep shade, accent */
  colors: [string, string, string];
  /** where the region sits on the world map (percent of the map box) */
  map: { x: number; y: number; w: number };
  landmark: string;
}

export const REGIONS: RegionDef[] = [
  {
    id: 'verdant', name: 'Verdant Valley', tagline: 'Forests, rivers and meadows',
    description: 'Where every adventure begins: tall trees, winding rivers and meadows full of flowers. Nature and water creatures grow up here.',
    elements: ['nature', 'water'], unlockAp: 0, bossId: 'grumblethorn', colors: ['#7cc77a', '#3f8f52', '#ffd166'],
    map: { x: 6, y: 55, w: 27 }, landmark: 'the Great Oak',
  },
  {
    id: 'crystal', name: 'Crystal Caverns', tagline: 'Glittering caves under the hills',
    description: 'Deep caves that glow with crystals of every colour. Earth and shadow creatures explore the tunnels.',
    elements: ['earth', 'shadow'], unlockAp: 10, bossId: 'glimmerjaw', colors: ['#9b8ad8', '#5a4a9c', '#7fe0ff'],
    map: { x: 37, y: 58, w: 24 }, landmark: 'the Echo Geode',
  },
  {
    id: 'frostpeak', name: 'Frostpeak Mountains', tagline: 'Snow, ice and northern lights',
    description: 'Snowy peaks and frozen lakes under shimmering northern lights. Ice creatures love the cold air.',
    elements: ['ice'], unlockAp: 30, bossId: 'snowsulk', colors: ['#d9eefc', '#7aa6d6', '#b9f3ff'],
    map: { x: 66, y: 53, w: 27 }, landmark: 'the Aurora Pass',
  },
  {
    id: 'ember', name: 'Ember Kingdom', tagline: 'Volcanoes and lightning storms',
    description: 'Warm volcanoes, glowing lava rivers and crackling storm clouds. Fire and electric creatures train here.',
    elements: ['fire', 'electric'], unlockAp: 60, bossId: 'magmaw', colors: ['#f08a4b', '#a8402a', '#ffd23f'],
    map: { x: 64, y: 8, w: 27 }, landmark: 'Mount Cinder',
  },
  {
    id: 'sky', name: 'Sky Islands', tagline: 'Floating islands above the clouds',
    description: 'Islands that float on the wind, linked by rainbow bridges. Air and light creatures glide between them.',
    elements: ['air', 'light'], unlockAp: 100, bossId: 'whirlwing', colors: ['#bfe6ff', '#6aa9e0', '#fff1a8'],
    map: { x: 10, y: 6, w: 26 }, landmark: 'the Rainbow Bridges',
  },
  {
    id: 'ancient', name: 'Ancient Kingdom', tagline: 'Ruins, stars and legends',
    description: 'A legendary kingdom of starlit ruins and old magic, where cosmic creatures and mythical paths are found.',
    elements: ['cosmic'], unlockAp: 150, bossId: 'colossus', colors: ['#e3c98f', '#8a6a3a', '#c9a8ff'],
    map: { x: 39, y: 27, w: 23 }, landmark: 'the Star Temple',
  },
];
export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, RegionDef>;

/* ───────────── bosses ───────────── */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic';
export const DIFFICULTY: Record<Difficulty, { label: string; perStudent: number; color: string }> = {
  easy: { label: 'Easy', perStudent: 8, color: '#157a40' },
  medium: { label: 'Medium', perStudent: 14, color: '#2563b8' },
  hard: { label: 'Hard', perStudent: 22, color: '#c8412f' },
  epic: { label: 'Epic', perStudent: 32, color: '#8b3fd0' },
};

export interface BossDef {
  id: string;
  name: string;
  regionId: RegionId;
  theme: string;
  description: string;
  /** what the class sees when the boss is befriended */
  friendly: string;
  difficulty: Difficulty;
  /** default battle length */
  durationMs: number;
  /** default reward for every student when the boss is befriended */
  reward: QuestReward;
  colors: [string, string];
}

const HOUR = 3_600_000, DAY = 24 * HOUR;
export const DURATIONS: { label: string; ms: number }[] = [
  { label: 'One lesson (45 minutes)', ms: 45 * 60_000 },
  { label: 'One school day', ms: DAY },
  { label: 'Three days', ms: 3 * DAY },
  { label: 'One week', ms: 7 * DAY },
  { label: 'Two weeks', ms: 14 * DAY },
];

export const BOSSES: BossDef[] = [
  {
    id: 'grumblethorn', name: 'Grumblethorn', regionId: 'verdant', theme: 'A tangle of brambles',
    description: 'A grumpy bramble beast has knotted every path in the valley. Kindness and hard work will untangle its thorns.',
    friendly: 'Grumblethorn bursts into flowers and lets the paths through. It wants to be friends!',
    difficulty: 'easy', durationMs: 3 * DAY, reward: { xp: 5, coins: 15 }, colors: ['#4f8a3c', '#ff8fb1'],
  },
  {
    id: 'glimmerjaw', name: 'Glimmerjaw', regionId: 'crystal', theme: 'A crystal crab',
    description: 'A crystal crab is hoarding every shiny gem in the caverns and has blocked the tunnels with its claws.',
    friendly: 'Glimmerjaw shares its gems with everyone and clicks its claws happily.',
    difficulty: 'medium', durationMs: 5 * DAY, reward: { xp: 8, coins: 20 }, colors: ['#8a6ad8', '#7fe0ff'],
  },
  {
    id: 'snowsulk', name: 'Sir Snowsulk', regionId: 'frostpeak', theme: 'A sulky snow giant',
    description: 'Nobody said hello to Sir Snowsulk, so he froze the mountain pass. A whole class being friendly might melt his mood.',
    friendly: 'Sir Snowsulk smiles for the first time in a hundred winters and builds the class a snow slide.',
    difficulty: 'medium', durationMs: 5 * DAY, reward: { xp: 8, coins: 20 }, colors: ['#e6f4ff', '#5d8fd0'],
  },
  {
    id: 'magmaw', name: 'Magmaw', regionId: 'ember', theme: 'A lava toad with hiccups',
    description: 'Magmaw has the hiccups, and every hiccup makes the volcano rumble. Calm, focused work will settle it down.',
    friendly: 'Magmaw\'s hiccups stop with one last warm puff. The volcano glows gently again.',
    difficulty: 'hard', durationMs: 7 * DAY, reward: { xp: 10, coins: 30 }, colors: ['#d8542f', '#ffd23f'],
  },
  {
    id: 'whirlwing', name: 'Whirlwing', regionId: 'sky', theme: 'A storm kite',
    description: 'Whirlwing, a giant storm kite, is spinning so fast that the Sky Islands are drifting apart.',
    friendly: 'Whirlwing slows to a gentle glide and tows the islands back together.',
    difficulty: 'hard', durationMs: 7 * DAY, reward: { xp: 12, coins: 30 }, colors: ['#6aa9e0', '#fff1a8'],
  },
  {
    id: 'colossus', name: 'The Clockwork Colossus', regionId: 'ancient', theme: 'An ancient guardian',
    description: 'The ancient guardian of the Star Temple wound itself up too tight and will not let anyone in.',
    friendly: 'The Colossus unwinds with a happy chime and opens the Star Temple to the class.',
    difficulty: 'epic', durationMs: 14 * DAY, reward: { xp: 15, coins: 40 }, colors: ['#c9a25a', '#9b7bff'],
  },
];
export const BOSSES_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b])) as Record<string, BossDef>;

/** Suggested HP for a class of `students`. */
export function suggestedHp(difficulty: Difficulty, students: number): number {
  return Math.max(30, Math.round(students * DIFFICULTY[difficulty].perStudent / 5) * 5);
}

/** XP an approved quest adds to an active battle. */
export const questHit = (rewardXp: number) => Math.max(5, rewardXp);

/* ───────────── treasure ───────────── */
export type TreasureKind = 'relic' | 'coins' | 'cosmetic' | 'accessory' | 'special';
export type TreasureRule =
  | { kind: 'visit'; regionId: RegionId }
  | { kind: 'regionQuests'; regionId: RegionId; count: number }
  | { kind: 'boss'; bossId: string }
  | { kind: 'visitAll' }
  | { kind: 'quests'; count: number }
  | { kind: 'level'; level: number }
  | { kind: 'relics' };

export interface TreasureDef {
  id: string;
  name: string;
  kind: TreasureKind;
  regionId?: RegionId;
  rule: TreasureRule;
  /** coins in the chest; for item chests, the coins paid instead when the item is already owned */
  coins: number;
  itemId?: string;
  description: string;
}

const RELICS: Record<RegionId, [string, string]> = {
  verdant: ['Glowing Acorn', 'An acorn from the Great Oak that glows softly in the dark.'],
  crystal: ['Echo Geode', 'Hold it to your ear and hear the caverns sing.'],
  frostpeak: ['Everfrost Snowflake', 'A snowflake that never melts.'],
  ember: ['Ember Heartstone', 'A warm stone with a tiny flame inside.'],
  sky: ['Windsong Feather', 'A feather that floats upwards when you let go.'],
  ancient: ['Star Coin', 'An old coin from the Star Temple, stamped with a comet.'],
};
const REGION_COINS: Record<RegionId, number> = { verdant: 20, crystal: 25, frostpeak: 30, ember: 35, sky: 40, ancient: 50 };
const REGION_ITEM: Record<RegionId, string> = {
  verdant: 'hat-bramble', crystal: 'trail-crystal', frostpeak: 'glasses-snow', ember: 'trail-lava', sky: 'trail-cloud', ancient: 'hat-relic',
};

export const TREASURES: TreasureDef[] = [
  ...REGIONS.flatMap((r): TreasureDef[] => [
    { id: `${r.id}-relic`, name: RELICS[r.id][0], kind: 'relic', regionId: r.id, rule: { kind: 'visit', regionId: r.id }, coins: 0, description: RELICS[r.id][1] },
    { id: `${r.id}-coins`, name: `${r.name.split(' ')[0]} Coin Chest`, kind: 'coins', regionId: r.id, rule: { kind: 'regionQuests', regionId: r.id, count: 2 }, coins: REGION_COINS[r.id], description: `${REGION_COINS[r.id]} coins for completing quests from ${r.name}.` },
    { id: `${r.id}-cosmetic`, name: `${r.name} Chest`, kind: 'cosmetic', regionId: r.id, rule: { kind: 'regionQuests', regionId: r.id, count: 5 }, coins: 30, itemId: `bg-region-${r.id}`, description: `The ${r.name} background for your creature.` },
    { id: `${r.id}-boss`, name: `${BOSSES_BY_ID[r.bossId].name}'s Gift`, kind: 'accessory', regionId: r.id, rule: { kind: 'boss', bossId: r.bossId }, coins: 40, itemId: REGION_ITEM[r.id], description: `A thank-you gift from ${BOSSES_BY_ID[r.bossId].name} once the class befriends it.` },
  ]),
  { id: 'explorer-compass', name: "Explorer's Compass", kind: 'special', rule: { kind: 'visitAll' }, coins: 60, description: 'Explore all six regions.' },
  { id: 'quest-hoard', name: 'Quest Hoard', kind: 'special', rule: { kind: 'quests', count: 15 }, coins: 50, description: 'Complete fifteen quests.' },
  { id: 'hero-chest', name: "Hero's Chest", kind: 'special', rule: { kind: 'level', level: 10 }, coins: 40, itemId: 'bg-worldmap', description: 'Reach level 10: the World Map background.' },
  { id: 'relic-crown', name: 'Relic Keeper', kind: 'special', rule: { kind: 'relics' }, coins: 100, description: 'Find all six region relics.' },
];
export const TREASURES_BY_ID = Object.fromEntries(TREASURES.map((t) => [t.id, t])) as Record<string, TreasureDef>;

/* ───────────── the shared class world ───────────── */
export interface LocationDef {
  id: LocationId;
  name: string;
  description: string;
  /** adventure points for stages 1, 2 and 3 */
  stages: [number, number, number];
  stageNames: [string, string, string];
}
export const LOCATIONS: LocationDef[] = [
  { id: 'sanctuary', name: 'Creature Sanctuary', description: 'A green haven where the class creatures play and befriended bosses come to live.', stages: [0, 20, 55], stageNames: ['Meadow camp', 'Sanctuary garden', 'Grand sanctuary'] },
  { id: 'village', name: 'Fantasy Village', description: 'Cottages, a market and a well: the class\'s own village.', stages: [10, 35, 90], stageNames: ['A few cottages', 'Market village', 'Lantern town'] },
  { id: 'library', name: 'Magical Library', description: 'Books that read themselves and maps of every region.', stages: [15, 50, 110], stageNames: ['Reading tent', 'Tower library', 'Library of Stars'] },
  { id: 'arena', name: 'Training Arena', description: 'Where creatures practise their abilities together.', stages: [25, 65, 130], stageNames: ['Practice ring', 'Training grounds', 'Champion arena'] },
  { id: 'castle', name: 'Royal Castle', description: 'The class castle, with a banner for every adventure.', stages: [40, 95, 170], stageNames: ['Watchtower', 'Stone keep', 'Royal castle'] },
];
export const LOCATIONS_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l])) as Record<LocationId, LocationDef>;

/** Decorations the class earns by approved quest completions (boss statues are added per befriended boss). */
export const QUEST_DECORATIONS: { id: string; name: string; quests: number }[] = [
  { id: 'bunting', name: 'Bunting', quests: 20 },
  { id: 'lanterns', name: 'Lantern string', quests: 75 },
  { id: 'fountain', name: 'Wishing fountain', quests: 150 },
  { id: 'rainbow', name: 'Rainbow arch', quests: 300 },
];

/* ───────────── quests ───────────── */
export const QUEST_CATEGORIES: Record<QuestCategory, { label: string; tag?: CategoryTag; icon: string }> = {
  participation: { label: 'Participation', tag: 'participation', icon: 'participate' },
  work: { label: 'Assigned work', tag: 'work', icon: 'work' },
  reading: { label: 'Reading', tag: 'reading', icon: 'book' },
  teamwork: { label: 'Teamwork', tag: 'teamwork', icon: 'team' },
  helping: { label: 'Helping others', tag: 'helping', icon: 'heart' },
  behaviour: { label: 'Positive behaviour', tag: 'behaviour', icon: 'star' },
  english: { label: 'Speaking English', tag: 'english', icon: 'speak' },
  creativity: { label: 'Creativity', tag: 'creativity', icon: 'sparkle' },
  custom: { label: 'Other', icon: 'scroll' },
};

const q = (id: string, kind: QuestKind, category: QuestCategory, regionId: RegionId, title: string, description: string, requirement: Quest['requirement'], reward: QuestReward): Omit<Quest, 'createdAt' | 'updatedAt'> => ({
  id, classId: null, title, description, category, kind, regionId, assign: 'class', reward, requirement, approval: false, active: true,
});

/** The starting quest board (daily and weekly quests count teacher awards automatically). */
export const DEFAULT_QUESTS: Omit<Quest, 'createdAt' | 'updatedAt'>[] = [
  q('q-participate', 'daily', 'participation', 'verdant', 'Join in the lesson', 'Share an idea or answer a question twice today.', { type: 'tracked', metric: 'count', tag: 'participation', target: 2 }, { xp: 3, coins: 5 }),
  q('q-work', 'daily', 'work', 'crystal', 'Finish your work', 'Complete the work your teacher sets today.', { type: 'tracked', metric: 'count', tag: 'work', target: 1 }, { xp: 3, coins: 5 }),
  q('q-read', 'daily', 'reading', 'frostpeak', 'Read a passage', 'Read your passage for today.', { type: 'tracked', metric: 'count', tag: 'reading', target: 1 }, { xp: 3, coins: 5 }),
  q('q-team', 'daily', 'teamwork', 'ember', 'Team up', 'Work well with a partner or a group.', { type: 'tracked', metric: 'count', tag: 'teamwork', target: 1 }, { xp: 3, coins: 5 }),
  q('q-help', 'daily', 'helping', 'sky', 'Help a classmate', 'Lend a hand to someone who needs it.', { type: 'tracked', metric: 'count', tag: 'helping', target: 1 }, { xp: 3, coins: 5 }),
  q('q-assignments', 'weekly', 'work', 'crystal', 'Assignment adventurer', 'Complete five pieces of work this week.', { type: 'tracked', metric: 'count', tag: 'work', target: 5 }, { xp: 12, coins: 20 }),
  q('q-voice', 'weekly', 'participation', 'verdant', 'Voice of the class', 'Take part eight times this week.', { type: 'tracked', metric: 'count', tag: 'participation', target: 8 }, { xp: 10, coins: 15 }),
  q('q-reader', 'weekly', 'reading', 'ancient', 'Reading explorer', 'Finish four reading tasks this week.', { type: 'tracked', metric: 'count', tag: 'reading', target: 4 }, { xp: 12, coins: 20 }),
  q('q-steady', 'weekly', 'behaviour', 'sky', 'Steady star', 'Earn 40 XP for positive behaviour this week.', { type: 'tracked', metric: 'xp', target: 40 }, { xp: 15, coins: 20 }),
];

/** Region for a quest of this tag (quests made from 1.4 challenges go to Verdant Valley, which is always open). */
export const TAG_REGION: Record<CategoryTag, RegionId> = {
  behaviour: 'sky', participation: 'verdant', helping: 'sky', english: 'verdant', work: 'crystal', reading: 'frostpeak',
  listening: 'crystal', creativity: 'ember', teamwork: 'ember', homework: 'crystal', effort: 'ember', other: 'verdant',
};
export const TAG_CATEGORY: Record<CategoryTag, QuestCategory> = {
  behaviour: 'behaviour', participation: 'participation', helping: 'helping', english: 'english', work: 'work', reading: 'reading',
  listening: 'participation', creativity: 'creativity', teamwork: 'teamwork', homework: 'work', effort: 'work', other: 'custom',
};

/** Starter rewards for a migrated 1.4 challenge (challenges had no reward of their own). */
export const MIGRATED_REWARD: Record<'daily' | 'weekly', QuestReward> = { daily: { xp: 3, coins: 5 }, weekly: { xp: 10, coins: 15 } };

/** The starting quest board for a new install or a new class world. */
export const freshQuests = (now: number): Quest[] => DEFAULT_QUESTS.map((q) => ({ ...q, reward: { ...q.reward }, requirement: { ...q.requirement }, createdAt: now, updatedAt: now }));
