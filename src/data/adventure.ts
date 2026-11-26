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

/** In the order they open: the world map's route joins them in this order. */
export const REGIONS: RegionDef[] = [
  {
    id: 'verdant', name: 'Verdant Valley', tagline: 'Forests, rivers and meadows',
    description: 'Where every adventure begins: tall trees, winding rivers and meadows full of flowers. Nature and water creatures grow up here.',
    elements: ['nature', 'water'], unlockAp: 0, bossId: 'grumblethorn', colors: ['#7cc77a', '#3f8f52', '#ffd166'],
    map: { x: 5, y: 67, w: 22 }, landmark: 'the Great Oak',
  },
  {
    id: 'crystal', name: 'Crystal Caverns', tagline: 'Glittering caves under the hills',
    description: 'Deep caves that glow with crystals of every colour. Earth and shadow creatures explore the tunnels.',
    elements: ['earth', 'shadow'], unlockAp: 10, bossId: 'glimmerjaw', colors: ['#9b8ad8', '#5a4a9c', '#7fe0ff'],
    map: { x: 40, y: 70, w: 20 }, landmark: 'the Echo Geode',
  },
  {
    id: 'lagoon', name: 'Coral Lagoon', tagline: 'Coral reefs and tide pools',
    description: 'A warm lagoon of coral reefs, rock pools and a sleepy shipwreck. Water creatures splash in the waves.',
    elements: ['water'], unlockAp: 20, bossId: 'puffington', colors: ['#6fd6d2', '#1f7f9c', '#ff9f80'],
    map: { x: 73, y: 66, w: 21 }, landmark: 'the Sunken Ship',
  },
  {
    id: 'frostpeak', name: 'Frostpeak Mountains', tagline: 'Snow, ice and northern lights',
    description: 'Snowy peaks and frozen lakes under shimmering northern lights. Ice creatures love the cold air.',
    elements: ['ice'], unlockAp: 30, bossId: 'snowsulk', colors: ['#d9eefc', '#7aa6d6', '#b9f3ff'],
    map: { x: 74, y: 35, w: 21 }, landmark: 'the Aurora Pass',
  },
  {
    id: 'ember', name: 'Ember Kingdom', tagline: 'Volcanoes and lightning storms',
    description: 'Warm volcanoes, glowing lava rivers and crackling storm clouds. Fire and electric creatures train here.',
    elements: ['fire', 'electric'], unlockAp: 60, bossId: 'magmaw', colors: ['#f08a4b', '#a8402a', '#ffd23f'],
    map: { x: 39, y: 37, w: 22 }, landmark: 'Mount Cinder',
  },
  {
    id: 'hollow', name: 'Mushroom Hollow', tagline: 'Giant glowing mushrooms',
    description: 'A twilight forest of giant glowing mushrooms and fireflies. Nature and shadow creatures wander between the stalks.',
    elements: ['nature', 'shadow'], unlockAp: 80, bossId: 'snorecap', colors: ['#b08ad8', '#4f3a7a', '#ff8fd0'],
    map: { x: 5, y: 35, w: 21 }, landmark: 'the Lantern Toadstool',
  },
  {
    id: 'sky', name: 'Sky Islands', tagline: 'Floating islands above the clouds',
    description: 'Islands that float on the wind, linked by rainbow bridges. Air and light creatures glide between them.',
    elements: ['air', 'light'], unlockAp: 100, bossId: 'whirlwing', colors: ['#bfe6ff', '#6aa9e0', '#fff1a8'],
    map: { x: 6, y: 3, w: 21 }, landmark: 'the Rainbow Bridges',
  },
  {
    id: 'ancient', name: 'Ancient Kingdom', tagline: 'Ruins, stars and legends',
    description: 'A legendary kingdom of starlit ruins and old magic, where cosmic creatures and mythical paths are found.',
    elements: ['cosmic'], unlockAp: 150, bossId: 'colossus', colors: ['#e3c98f', '#8a6a3a', '#c9a8ff'],
    map: { x: 41, y: 5, w: 19 }, landmark: 'the Star Temple',
  },
  {
    id: 'dunes', name: 'Sunstone Desert', tagline: 'Golden dunes and an old pyramid',
    description: 'Golden dunes, palm-tree oases and a pyramid that glows at sunset. Earth, fire and light creatures bask in the warm sand.',
    elements: ['earth', 'fire', 'light'], unlockAp: 200, bossId: 'riddlepaw', colors: ['#f2c46b', '#b5762e', '#ff7a4d'],
    map: { x: 73, y: 4, w: 22 }, landmark: 'the Sunstone Pyramid',
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
  /** what it is made of: its aura, the impacts it takes and its strike back come from this element */
  element: ElementType;
  /** lesson battles: how it strikes back when someone loses points (a pixelfx effect on that creature) */
  strike: { fx: string; verb: string; palette?: string[] };
  /** a wandering boss lives in a region without being its guardian (no region chest of its own) */
  wandering?: boolean;
}

const HOUR = 3_600_000, DAY = 24 * HOUR;
export const DURATIONS: { label: string; ms: number }[] = [
  { label: 'One lesson (45 minutes)', ms: 45 * 60_000 },
  { label: 'One school day', ms: DAY },
  { label: 'Three days', ms: 3 * DAY },
  { label: 'One week', ms: 7 * DAY },
  { label: 'Two weeks', ms: 14 * DAY },
];

const MUD = ['#2b1708', '#5a3418', '#8a5a2b', '#b9834a', '#e0b47a', '#fff0d6'];
const SPORE = ['#3a1440', '#7a2a7a', '#c25ac0', '#ff8fd0', '#ffd0ef', '#ffffff'];
const SAND = ['#4a2c08', '#8a5a1a', '#c8902e', '#f2c46b', '#ffe6a8', '#fff8e0'];

export const BOSSES: BossDef[] = [
  {
    id: 'grumblethorn', name: 'Grumblethorn', regionId: 'verdant', theme: 'A tangle of brambles',
    description: 'A grumpy bramble beast has knotted every path in the valley. Kindness and hard work will untangle its thorns.',
    friendly: 'Grumblethorn bursts into flowers and lets the paths through. It wants to be friends!',
    difficulty: 'easy', durationMs: 3 * DAY, reward: { xp: 5, coins: 15 }, colors: ['#4f8a3c', '#ff8fb1'],
    element: 'nature', strike: { fx: 'nature/root-snare', verb: 'tangled up in brambles' },
  },
  {
    id: 'mudsnout', name: 'Mudsnout', regionId: 'verdant', theme: 'A muddy little hippo', wandering: true,
    description: 'Mudsnout loves puddles so much that it splashes mud on everyone who walks past.',
    friendly: 'Mudsnout has a lovely bath and promises to splash only in its own puddle.',
    difficulty: 'easy', durationMs: 3 * DAY, reward: { xp: 4, coins: 12 }, colors: ['#b9a3a8', '#8a5a2b'],
    element: 'earth', strike: { fx: 'water/splash', verb: 'splattered with mud', palette: MUD },
  },
  {
    id: 'glimmerjaw', name: 'Glimmerjaw', regionId: 'crystal', theme: 'A crystal crab',
    description: 'A crystal crab is hoarding every shiny gem in the caverns and has blocked the tunnels with its claws.',
    friendly: 'Glimmerjaw shares its gems with everyone and clicks its claws happily.',
    difficulty: 'medium', durationMs: 5 * DAY, reward: { xp: 8, coins: 20 }, colors: ['#8a6ad8', '#7fe0ff'],
    element: 'earth', strike: { fx: 'ice/ice-spikes', verb: 'pinched by a crystal claw', palette: ['#1d0f40', '#4a2a9c', '#8a6ad8', '#b9a3ff', '#7fe0ff', '#ffffff'] },
  },
  {
    id: 'murkmoth', name: 'Murkmoth', regionId: 'crystal', theme: 'A moody cave moth', wandering: true,
    description: 'Murkmoth is scared of the dark, so it has gathered every glowing crystal in the caverns and will not share.',
    friendly: 'Murkmoth finds out the class will keep it company, and lets the crystals glow for everyone.',
    difficulty: 'medium', durationMs: 5 * DAY, reward: { xp: 7, coins: 18 }, colors: ['#9b7bff', '#4fd6c8'],
    element: 'shadow', strike: { fx: 'shadow/curse', verb: 'covered in sleepy moth dust' },
  },
  {
    id: 'puffington', name: 'Captain Puffington', regionId: 'lagoon', theme: 'A puffed-up pufferfish',
    description: 'Captain Puffington lost his captain\'s hat in the waves and puffed up so big that no boat can get past the reef.',
    friendly: 'Captain Puffington finds his hat, shrinks back down with a happy toot and gives the class a tour of the reef.',
    difficulty: 'easy', durationMs: 3 * DAY, reward: { xp: 6, coins: 16 }, colors: ['#4fb6f0', '#ffe28a'],
    element: 'water', strike: { fx: 'water/splash', verb: 'splashed with sea water' },
  },
  {
    id: 'snowsulk', name: 'Sir Snowsulk', regionId: 'frostpeak', theme: 'A sulky snow giant',
    description: 'Nobody said hello to Sir Snowsulk, so he froze the mountain pass. A whole class being friendly might melt his mood.',
    friendly: 'Sir Snowsulk smiles for the first time in a hundred winters and builds the class a snow slide.',
    difficulty: 'medium', durationMs: 5 * DAY, reward: { xp: 8, coins: 20 }, colors: ['#e6f4ff', '#5d8fd0'],
    element: 'ice', strike: { fx: 'ice/freeze', verb: 'hit by a snowball' },
  },
  {
    id: 'magmaw', name: 'Magmaw', regionId: 'ember', theme: 'A lava toad with hiccups',
    description: 'Magmaw has the hiccups, and every hiccup makes the volcano rumble. Calm, focused work will settle it down.',
    friendly: 'Magmaw\'s hiccups stop with one last warm puff. The volcano glows gently again.',
    difficulty: 'hard', durationMs: 7 * DAY, reward: { xp: 10, coins: 30 }, colors: ['#d8542f', '#ffd23f'],
    element: 'fire', strike: { fx: 'explosions/smoke-bomb', verb: 'puffed with a hiccup of warm smoke' },
  },
  {
    id: 'zapcrackle', name: 'Zapcrackle', regionId: 'ember', theme: 'A sulky thundercloud', wandering: true,
    description: 'Zapcrackle got left out of a game, so now it rumbles and crackles over the volcanoes all day long.',
    friendly: 'Zapcrackle joins in, turns into a fluffy white cloud and makes a rainbow for the class.',
    difficulty: 'hard', durationMs: 7 * DAY, reward: { xp: 9, coins: 26 }, colors: ['#6a6488', '#ffd23f'],
    element: 'electric', strike: { fx: 'lightning/zap-hit', verb: 'zapped with a tiny spark' },
  },
  {
    id: 'snorecap', name: 'Snorecap', regionId: 'hollow', theme: 'A sleepy giant mushroom',
    description: 'Snorecap was woken up too early, and every grumpy yawn puffs out sleepy spores that make the whole forest doze off.',
    friendly: 'Snorecap has a long stretch, smiles, and glows like a lantern to light up the hollow.',
    difficulty: 'hard', durationMs: 7 * DAY, reward: { xp: 10, coins: 28 }, colors: ['#9b6ad8', '#ff8fd0'],
    element: 'nature', strike: { fx: 'nature/spore-burst', verb: 'puffed with sleepy spores', palette: SPORE },
  },
  {
    id: 'whirlwing', name: 'Whirlwing', regionId: 'sky', theme: 'A storm kite',
    description: 'Whirlwing, a giant storm kite, is spinning so fast that the Sky Islands are drifting apart.',
    friendly: 'Whirlwing slows to a gentle glide and tows the islands back together.',
    difficulty: 'hard', durationMs: 7 * DAY, reward: { xp: 12, coins: 30 }, colors: ['#6aa9e0', '#fff1a8'],
    element: 'air', strike: { fx: 'nature/tornado', verb: 'spun round by a gust of wind' },
  },
  {
    id: 'colossus', name: 'The Clockwork Colossus', regionId: 'ancient', theme: 'An ancient guardian',
    description: 'The ancient guardian of the Star Temple wound itself up too tight and will not let anyone in.',
    friendly: 'The Colossus unwinds with a happy chime and opens the Star Temple to the class.',
    difficulty: 'epic', durationMs: 14 * DAY, reward: { xp: 15, coins: 40 }, colors: ['#c9a25a', '#9b7bff'],
    element: 'cosmic', strike: { fx: 'arcane/arcane-missiles', verb: 'bonked by a bouncing cog' },
  },
  {
    id: 'riddlepaw', name: 'Riddlepaw', regionId: 'dunes', theme: 'A sphinx cat who loves riddles',
    description: 'Riddlepaw guards the Sunstone Pyramid and will not move until someone solves its riddles. It is sulking because nobody has tried.',
    friendly: 'Riddlepaw purrs, opens the pyramid door and shares the warm glow of the sunstone with the class.',
    difficulty: 'epic', durationMs: 14 * DAY, reward: { xp: 15, coins: 40 }, colors: ['#f2c46b', '#2f6fd0'],
    element: 'light', strike: { fx: 'nature/tornado', verb: 'covered in a swirl of sand', palette: SAND },
  },
];
/** Bosses renamed after a release: old ids in saved battles still find their boss. */
export const BOSS_ALIASES: Record<string, string> = { gloomwing: 'murkmoth' };
export const BOSSES_BY_ID = Object.fromEntries([...BOSSES.map((b) => [b.id, b]), ...Object.entries(BOSS_ALIASES).map(([old, id]) => [old, BOSSES.find((b) => b.id === id)!])]) as Record<string, BossDef>;

/** Suggested HP for a class of `students`. */
export function suggestedHp(difficulty: Difficulty, students: number): number {
  return Math.max(30, Math.round(students * DIFFICULTY[difficulty].perStudent / 5) * 5);
}

/* ───────────── lesson battles (1.6) ───────────── */
/**
 * A lesson battle fits one or two lessons. HP is sized so that the class, earning about `awardsPerStudent`
 * points awards each per lesson, brings the boss most of the way down, and the class mission (the team
 * finisher, `missionShare` of HP) finishes it. See docs/adventure-design.md 3.6.
 */
export const LESSON = {
  /** awards a teacher typically gives each student in one lesson */
  awardsPerStudent: 2.5,
  /** the mission's team finisher takes this share of the boss's HP */
  missionShare: 0.25,
  /** a super-effective award (the power-up behaviour) counts this many times */
  superMultiplier: 2,
  /** the boss recovers at most this share of its HP from strikes back, per battle */
  recoverCap: 0.2,
  /** lesson lengths a teacher can pick (minutes) */
  minutes: [30, 40, 45, 50, 60],
  defaultMinutes: 45,
  /** reward for everyone when the boss is befriended (small: these happen often) */
  reward: { xp: 2, coins: 5 } as QuestReward,
  /** HP multipliers for the three settings */
  level: { gentle: 0.75, normal: 1, tough: 1.35 } as Record<'gentle' | 'normal' | 'tough', number>,
};
export type LessonLevel = keyof typeof LESSON.level;

/* ───────────── special attacks (1.9) ───────────── */
export const SPECIAL = {
  /** a creature's special attack comes every this many points it gives in one battle */
  every: 10,
  /** and hits the boss for this much more (lesson HP is sized up by the same share, see lessonHp) */
  bonus: 5,
  /** the boss's special attack: once when what is left of its HP falls to each of these shares */
  bossAt: [0.5, 0.25],
  /** it recovers this share of its HP each time (a little: the class still wins) */
  bossHeal: 0.05,
};

/** Each element's special attack. */
export const ELEMENT_SPECIALS: Record<ElementType, string> = {
  fire: 'Ember Storm', water: 'Bubble Surge', nature: 'Bloom Burst', electric: 'Spark Cascade', ice: 'Frost Flurry',
  earth: 'Boulder Roll', shadow: 'Moonshade Pounce', light: 'Dawn Ray', cosmic: 'Starfall', air: 'Gale Spin',
};

/** Each boss's special attack: its name, and what it does to the whole class (nothing that lasts). */
export const BOSS_SPECIALS: Record<string, { name: string; verb: string }> = {
  grumblethorn: { name: 'Bramble Storm', verb: 'whips its brambles round the whole class' },
  mudsnout: { name: 'Mud Belly-Flop', verb: 'belly-flops and splashes everyone with mud' },
  glimmerjaw: { name: 'Crystal Clatter', verb: 'clatters its claws and showers the class with crystals' },
  murkmoth: { name: 'Dusty Wing Gust', verb: 'flaps up a cloud of sleepy dust' },
  puffington: { name: 'Puffer Burst', verb: 'puffs up huge and bursts out a wave of bubbles' },
  snowsulk: { name: 'Sulky Snowstorm', verb: 'sulks so hard it snows on everyone' },
  magmaw: { name: 'Lava Hiccup', verb: 'hiccups a shower of warm lava sparks' },
  zapcrackle: { name: 'Grumble Thunder', verb: 'grumbles a thunderclap over the class' },
  snorecap: { name: 'Sleepy Spore Cloud', verb: 'yawns out a cloud of sleepy spores' },
  whirlwing: { name: 'Kite Twister', verb: 'spins up a twister across the arena' },
  colossus: { name: 'Gear Quake', verb: 'stamps and shakes the whole arena' },
  riddlepaw: { name: 'Riddle Roar', verb: 'roars a riddle so loud everyone wobbles' },
};
export const bossSpecial = (bossId: string) => BOSS_SPECIALS[bossId] ?? { name: 'Big Stomp', verb: 'stomps and shakes the whole arena' };

/** Class missions to choose from (the class's daily task); each comes with its power-up behaviour. */
export const MISSIONS: { text: string; tag?: CategoryTag }[] = [
  { text: 'Everyone joins in the lesson', tag: 'participation' },
  { text: "Finish today's work", tag: 'work' },
  { text: 'Read our passage', tag: 'reading' },
  { text: 'Work well in our teams', tag: 'teamwork' },
  { text: 'Help each other', tag: 'helping' },
  { text: 'Speak English all lesson', tag: 'english' },
  { text: 'Listen carefully and follow instructions', tag: 'listening' },
  { text: 'Be kind and calm', tag: 'behaviour' },
  { text: 'Make something creative', tag: 'creativity' },
];

/** Boss HP for a lesson battle: the points the class should earn, from its size, its award values and the length. */
export function lessonHp(students: number, avgAwardXp: number, lessons: number, level: LessonLevel = 'normal'): number {
  const expected = Math.max(1, students) * LESSON.awardsPerStudent * Math.max(1, avgAwardXp) * Math.max(1, lessons);
  // special attacks add SPECIAL.bonus for every SPECIAL.every points, so the boss is that much bigger (1.9): a battle
  // still lasts about the lessons it was planned for
  const specials = 1 + SPECIAL.bonus / SPECIAL.every;
  return Math.max(20, Math.round((expected * specials * LESSON.level[level]) / 5) * 5);
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
  lagoon: ['Singing Shell', 'A spiral shell that hums the song of the waves.'],
  frostpeak: ['Everfrost Snowflake', 'A snowflake that never melts.'],
  ember: ['Ember Heartstone', 'A warm stone with a tiny flame inside.'],
  hollow: ['Firefly Lantern', 'A tiny lantern where a friendly firefly lives.'],
  sky: ['Windsong Feather', 'A feather that floats upwards when you let go.'],
  ancient: ['Star Coin', 'An old coin from the Star Temple, stamped with a comet.'],
  dunes: ['Sunstone Scarab', 'A golden beetle charm that glows like the setting sun.'],
};
const REGION_COINS: Record<RegionId, number> = { verdant: 20, crystal: 25, lagoon: 25, frostpeak: 30, ember: 35, hollow: 40, sky: 40, ancient: 50, dunes: 55 };
const REGION_ITEM: Record<RegionId, string> = {
  verdant: 'hat-bramble', crystal: 'trail-crystal', lagoon: 'hat-captain', frostpeak: 'glasses-snow', ember: 'trail-lava',
  hollow: 'trail-spore', sky: 'trail-cloud', ancient: 'hat-relic', dunes: 'hat-sunstone',
};

export const TREASURES: TreasureDef[] = [
  ...REGIONS.flatMap((r): TreasureDef[] => [
    { id: `${r.id}-relic`, name: RELICS[r.id][0], kind: 'relic', regionId: r.id, rule: { kind: 'visit', regionId: r.id }, coins: 0, description: RELICS[r.id][1] },
    { id: `${r.id}-coins`, name: `${r.name.split(' ')[0]} Coin Chest`, kind: 'coins', regionId: r.id, rule: { kind: 'regionQuests', regionId: r.id, count: 2 }, coins: REGION_COINS[r.id], description: `${REGION_COINS[r.id]} coins for completing quests from ${r.name}.` },
    { id: `${r.id}-cosmetic`, name: `${r.name} Chest`, kind: 'cosmetic', regionId: r.id, rule: { kind: 'regionQuests', regionId: r.id, count: 5 }, coins: 30, itemId: `bg-region-${r.id}`, description: `The ${r.name} background for your creature.` },
    { id: `${r.id}-boss`, name: `${BOSSES_BY_ID[r.bossId].name}'s Gift`, kind: 'accessory', regionId: r.id, rule: { kind: 'boss', bossId: r.bossId }, coins: 40, itemId: REGION_ITEM[r.id], description: `A thank-you gift from ${BOSSES_BY_ID[r.bossId].name} once the class befriends it.` },
  ]),
  { id: 'explorer-compass', name: "Explorer's Compass", kind: 'special', rule: { kind: 'visitAll' }, coins: 60, description: 'Explore every region of the world.' },
  { id: 'quest-hoard', name: 'Quest Hoard', kind: 'special', rule: { kind: 'quests', count: 15 }, coins: 50, description: 'Complete fifteen quests.' },
  { id: 'hero-chest', name: "Hero's Chest", kind: 'special', rule: { kind: 'level', level: 10 }, coins: 40, itemId: 'bg-worldmap', description: 'Reach level 10: the World Map background.' },
  { id: 'relic-crown', name: 'Relic Keeper', kind: 'special', rule: { kind: 'relics' }, coins: 100, description: 'Find the relic of every region.' },
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
