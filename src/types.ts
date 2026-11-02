/** Shared domain types for Classroom Creatures. Everything persisted lives under {@link AppData}. */

export type ElementType =
  | 'fire' | 'water' | 'nature' | 'electric' | 'ice'
  | 'earth' | 'shadow' | 'light' | 'cosmic' | 'air';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** 1 = Baby … 5 = Legendary Form */
export type Stage = 1 | 2 | 3 | 4 | 5;

export type BodyShape = 'round' | 'tall' | 'pear' | 'wisp';
export type EarType = 'cat' | 'bunny' | 'round' | 'fin' | 'none' | 'antenna' | 'leaf' | 'horn' | 'feather' | 'droop';
export type TailType = 'flame' | 'fluffy' | 'fish' | 'leaf' | 'bolt' | 'none' | 'curl' | 'crystal' | 'wisp' | 'star' | 'cloud';
export type WingType = 'none' | 'feather' | 'bat' | 'fairy' | 'crystal' | 'leaf';
export type FaceType = 'snout' | 'beak' | 'plain' | 'whisker';
export type PatternType = 'none' | 'belly' | 'spots' | 'stripes' | 'stars' | 'cracks' | 'swirl';
export type IdleStyle = 'bob' | 'sway' | 'float' | 'hop' | 'breathe' | 'wiggle';
export type Expression = 'happy' | 'neutral' | 'excited' | 'wow' | 'sleepy';

export interface Palette {
  main: string;
  shade: string;
  belly: string;
  accent: string;
  eye: string;
}

export interface CreatureSound {
  /** base pitch in Hz */
  base: number;
  wave: OscillatorType;
  /** semitone offsets played in sequence */
  notes: number[];
}

export interface Species {
  id: string;
  name: string;
  /** Title shown on the Legendary Form, e.g. "the Sunflame" */
  legendTitle: string;
  element: ElementType;
  rarity: Rarity;
  personality: string;
  ability: string;
  body: BodyShape;
  ears: EarType;
  tail: TailType;
  wings: WingType;
  face: FaceType;
  pattern: PatternType;
  idle: IdleStyle;
  palette: Palette;
  sound: CreatureSound;
}

export type ItemSlot = 'hat' | 'glasses' | 'wings' | 'magic' | 'background' | 'decoration';

export type UnlockRule =
  | { type: 'level'; level: number }
  | { type: 'achievement'; id: string }
  | { type: 'challenges'; count: number }
  | { type: 'free' };

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  unlock: UnlockRule;
  description: string;
}

/** Tags let custom behaviour categories count toward achievements. */
export type CategoryTag =
  | 'behaviour' | 'participation' | 'helping' | 'english' | 'work' | 'reading'
  | 'listening' | 'creativity' | 'teamwork' | 'homework' | 'effort' | 'other';

export interface Category {
  id: string;
  name: string;
  xp: number; // negative values allowed only when settings.negativeEnabled
  icon: string;
  color: string;
  tag: CategoryTag;
  /** pinned categories appear as quick buttons on student cards */
  pinned?: boolean;
}

export interface UnlockedAchievement { id: string; at: number }

export type Equipped = Partial<Record<ItemSlot, string>>;

export interface Student {
  id: string;
  classId: string;
  name: string;
  speciesId: string;
  /** Total XP. Never negative. */
  xp: number;
  createdAt: number;
  equipped: Equipped;
  unlockedItems: string[];
  achievements: UnlockedAchievement[];
  /** times each category tag was awarded */
  tagCounts: Partial<Record<CategoryTag, number>>;
  /** xp earned per category tag */
  tagXp: Partial<Record<CategoryTag, number>>;
  /** highest stage ever reached; evolution badges are kept even after an undo */
  bestStage: Stage;
  challengeCompletions: ChallengeCompletion[];
  isDemo?: boolean;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: string;
  archived: boolean;
  createdAt: number;
  /** collective XP goal for the class celebration */
  goal: number;
  goalReachedAt?: number;
  isDemo?: boolean;
}

export interface AwardEvent {
  id: string;
  classId: string;
  studentId: string;
  /** awards given together (multi-select / whole class) share a batch id */
  batchId: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  tag: CategoryTag;
  /** the XP actually applied (after clamping) */
  xp: number;
  at: number;
  undone?: boolean;
  /** student's bestStage before this award, so undo can restore it */
  bestStageBefore?: Stage;
}

export type ChallengePeriod = 'daily' | 'weekly';

export interface Challenge {
  id: string;
  title: string;
  period: ChallengePeriod;
  /** count = number of awards with tag; xp = XP earned in period */
  metric: 'count' | 'xp';
  tag?: CategoryTag;
  target: number;
  active: boolean;
}

export interface ChallengeCompletion { challengeId: string; periodKey: string; at: number }

export interface Settings {
  /** total XP required for levels 1..10 (index 0 = level 1 = 0) */
  levelXp: number[];
  /** the level at which each stage begins: [stage1, stage2, …, stage5] */
  evolutionLevels: [number, number, number, number, number];
  negativeEnabled: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
  pinHash: string | null;
  currentClassId: string | null;
  onboarded: boolean;
  /** illustrated (painted) creature art or the classic drawn style */
  artStyle?: 'illustrated' | 'classic';
}

export interface AppData {
  version: number;
  classes: ClassRoom[];
  students: Student[];
  categories: Category[];
  events: AwardEvent[];
  challenges: Challenge[];
  settings: Settings;
}

export interface AwardOutcome {
  studentId: string;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  stageBefore: Stage;
  stageAfter: Stage;
  /** true only when a stage was reached for the first time */
  evolved: boolean;
  newAchievements: string[];
  newItems: string[];
  completedChallenges: string[];
}
