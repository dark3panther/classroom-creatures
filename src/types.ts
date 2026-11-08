/** Shared domain types for Classroom Creatures. Everything persisted lives under {@link AppData}. */

export type ElementType =
  | 'fire' | 'water' | 'nature' | 'electric' | 'ice'
  | 'earth' | 'shadow' | 'light' | 'cosmic' | 'air';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';

/** 1 = Baby … 5 = Legendary Form */
export type Stage = 1 | 2 | 3 | 4 | 5;

export type BodyShape = 'round' | 'tall' | 'pear' | 'wisp';
export type EarType = 'cat' | 'bunny' | 'round' | 'fin' | 'none' | 'antenna' | 'leaf' | 'horn' | 'feather' | 'droop';
export type TailType = 'flame' | 'fluffy' | 'fish' | 'leaf' | 'bolt' | 'none' | 'curl' | 'crystal' | 'wisp' | 'star' | 'cloud';
export type WingType = 'none' | 'feather' | 'bat' | 'fairy' | 'crystal' | 'leaf';
export type FaceType = 'snout' | 'beak' | 'plain' | 'whisker';
export type PatternType = 'none' | 'belly' | 'spots' | 'stripes' | 'stars' | 'cracks' | 'swirl';
export type IdleStyle = 'bob' | 'sway' | 'float' | 'hop' | 'breathe' | 'wiggle';
export type Expression = 'happy' | 'neutral' | 'excited' | 'wow' | 'sleepy' | 'sad';

/** How a creature feels right now (derived from recent classroom events). */
export type Mood = 'happy' | 'excited' | 'sad' | 'sleepy' | 'calm' | 'proud';

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

export type ItemSlot = 'hat' | 'glasses' | 'wings' | 'magic' | 'background' | 'decoration' | 'outfit' | 'armor' | 'trail';

/** How a creature behaves: idle motion, reactions and what it says when you play with it. */
export type PersonalityType = 'playful' | 'shy' | 'brave' | 'curious' | 'sleepy' | 'energetic' | 'mischievous';

export type UnlockRule =
  | { type: 'level'; level: number }
  | { type: 'achievement'; id: string }
  | { type: 'challenges'; count: number }
  | { type: 'free' }
  | { type: 'shop'; price: number }
  | { type: 'stage'; stage: Stage }
  | { type: 'collection'; pct: number };

/** A shop item sold only between two month-days each year (e.g. autumn). Owned items stay owned. */
export interface SeasonWindow { from: [month: number, day: number]; to: [month: number, day: number]; label: string }

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  unlock: UnlockRule;
  description: string;
  /** rare collectibles are highlighted in gold in the shop */
  rare?: boolean;
  /** limited-time shop items */
  season?: SeasonWindow;
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
  /** coins to spend in the shop (earned alongside XP, never taken away by deductions) */
  coins: number;
  /** total positive XP ever earned (deductions don't lower it); drives milestone rewards */
  lifetimeXp: number;
  /** real-world rewards earned at XP milestones (e.g. a chocolate) */
  milestoneRewards: MilestoneReward[];
  isDemo?: boolean;
  /** optional name the student gives their creature (identity survives evolution) */
  nickname?: string;
  /** chosen evolution path for species that branch at the final stage ('a' classic, 'b' mythical) */
  branch?: 'a' | 'b';
  /** every evolution this creature went through, oldest first */
  evolutionLog?: EvolutionEntry[];
  /** ability id → level (0 = locked). Cosmetic only. */
  skills?: Record<string, number>;
  /** cosmetic interaction counters (pet / feed / play); nothing is ever lost by not interacting */
  interactions?: { pet: number; feed: number; play: number };
}

export interface EvolutionEntry { speciesId: string; stage: Stage; branch?: 'a' | 'b'; at: number }

export interface MilestoneReward { id: string; milestoneId: string; label: string; icon: string; atXp: number; at: number; given: boolean }

export interface Milestone { id: string; every: number; label: string; icon: string }

export interface Prize { id: string; label: string; icon: string; color: string }

export interface PrizeWin { prizeId: string; label: string; icon: string; goal: number; at: number }

export interface ClassRoom {
  id: string;
  name: string;
  grade: string;
  archived: boolean;
  createdAt: number;
  /** collective XP goal for the class celebration */
  goal: number;
  goalReachedAt?: number;
  /** how much the goal grows after each prize-wheel spin */
  goalStep: number;
  /** the goal was reached and the prize wheel is waiting to be spun */
  pendingSpin?: boolean;
  prizeHistory: PrizeWin[];
  isDemo?: boolean;
  /** creature forms the class has discovered (`${speciesId}-${stage}` or `${speciesId}-5b`) */
  discovered?: string[];
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
  /** coins given with this award (for undo) */
  coins?: number;
  /** a teacher's manual XP correction (not a behaviour award) */
  adjust?: boolean;
  note?: string;
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
  /** coins earned per positive XP point */
  coinRate: number;
  milestones: Milestone[];
  prizes: Prize[];
  /** 'auto': creatures evolve as soon as they have the XP; 'approval': the teacher confirms each evolution */
  evolutionMode: 'auto' | 'approval';
  /** 0..1 master volume */
  soundVolume: number;
  /** soft clicks on buttons (off by default) */
  uiSounds: boolean;
  /** species not offered for new assignments (existing students keep theirs) */
  disabledSpecies: string[];
  /** items hidden from the shop and the dressing room */
  disabledItems: string[];
  /** teacher price overrides for shop items */
  itemPrices: Record<string, number>;
  /** students may buy and equip from the Presentation Mode spotlight while teacher controls are locked */
  shopWhileLocked: boolean;
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
  coins: number;
  newMilestoneRewards: MilestoneReward[];
  /** approval mode: this award made the creature ready to evolve */
  readyToEvolve: boolean;
  /** creature forms this award let the class discover */
  discovered: string[];
}
