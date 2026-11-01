import type { Category, CategoryTag, Challenge, Item, Settings } from '../types';

export const DEFAULT_LEVEL_XP = [0, 50, 120, 210, 320, 450, 600, 780, 980, 1200];
export const DEFAULT_EVOLUTION_LEVELS: Settings['evolutionLevels'] = [1, 3, 5, 7, 10];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-behaviour', name: 'Excellent Behaviour', xp: 5, icon: '🌟', color: '#ffb020', tag: 'behaviour', pinned: true },
  { id: 'cat-participating', name: 'Participating', xp: 3, icon: '✋', color: '#4f8cff', tag: 'participation', pinned: true },
  { id: 'cat-helping', name: 'Helping Others', xp: 5, icon: '🤝', color: '#ff6fa3', tag: 'helping' },
  { id: 'cat-english', name: 'Speaking English', xp: 3, icon: '💬', color: '#24b47e', tag: 'english', pinned: true },
  { id: 'cat-work', name: 'Completing Work', xp: 5, icon: '✅', color: '#36c2b4', tag: 'work' },
  { id: 'cat-reading', name: 'Excellent Reading', xp: 5, icon: '📖', color: '#8b5cf6', tag: 'reading' },
  { id: 'cat-listening', name: 'Good Listening', xp: 3, icon: '👂', color: '#f97316', tag: 'listening' },
  { id: 'cat-creativity', name: 'Creativity', xp: 5, icon: '🎨', color: '#ec4899', tag: 'creativity' },
  { id: 'cat-teamwork', name: 'Teamwork', xp: 5, icon: '🧩', color: '#0ea5e9', tag: 'teamwork' },
  { id: 'cat-homework', name: 'Homework Completed', xp: 3, icon: '🏠', color: '#84cc16', tag: 'homework' },
  { id: 'cat-effort', name: 'Excellent Effort', xp: 5, icon: '💪', color: '#ef4444', tag: 'effort' },
];

/** Offered when the teacher turns negative points on. Kept gentle and small. */
export const DEFAULT_NEGATIVE_CATEGORIES: Category[] = [
  { id: 'neg-focus', name: 'Needs Focus', xp: -2, icon: '🎯', color: '#94a3b8', tag: 'other' },
  { id: 'neg-kind', name: 'Remember Kindness', xp: -2, icon: '💛', color: '#94a3b8', tag: 'other' },
];

export const TAG_LABELS: Record<CategoryTag, string> = {
  behaviour: 'Behaviour', participation: 'Participation', helping: 'Helping', english: 'English',
  work: 'Work', reading: 'Reading', listening: 'Listening', creativity: 'Creativity',
  teamwork: 'Teamwork', homework: 'Homework', effort: 'Effort', other: 'Other',
};

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** check against a student's lifetime stats */
  rule:
    | { kind: 'xp'; min: number }
    | { kind: 'tagXp'; tag: CategoryTag; min: number }
    | { kind: 'tagCount'; tag: CategoryTag | CategoryTag[]; min: number }
    | { kind: 'stage'; min: number }
    | { kind: 'level'; min: number }
    | { kind: 'challenges'; min: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-steps', name: 'First Steps', description: 'Earn your first 10 XP.', icon: '👣', color: '#ffb020', rule: { kind: 'xp', min: 10 } },
  { id: 'super-reader', name: 'Super Reader', description: 'Earn 50 reading XP.', icon: '📚', color: '#8b5cf6', rule: { kind: 'tagXp', tag: 'reading', min: 50 } },
  { id: 'helpful-hero', name: 'Helpful Hero', description: 'Help classmates 10 times.', icon: '🦸', color: '#ff6fa3', rule: { kind: 'tagCount', tag: 'helping', min: 10 } },
  { id: 'english-star', name: 'English Star', description: 'Participate in English 20 times.', icon: '⭐', color: '#24b47e', rule: { kind: 'tagCount', tag: ['english', 'participation'], min: 20 } },
  { id: 'perfect-effort', name: 'Perfect Effort', description: 'Complete 10 tasks.', icon: '🏅', color: '#36c2b4', rule: { kind: 'tagCount', tag: ['work', 'homework'], min: 10 } },
  { id: 'evolution-master', name: 'Evolution Master', description: 'Evolve your creature for the first time.', icon: '🧬', color: '#f97316', rule: { kind: 'stage', min: 2 } },
  { id: 'great-listener', name: 'Great Listener', description: 'Show good listening 10 times.', icon: '🎧', color: '#f97316', rule: { kind: 'tagCount', tag: 'listening', min: 10 } },
  { id: 'team-captain', name: 'Team Captain', description: 'Earn Teamwork 10 times.', icon: '🚩', color: '#0ea5e9', rule: { kind: 'tagCount', tag: 'teamwork', min: 10 } },
  { id: 'creative-spark', name: 'Creative Spark', description: 'Earn Creativity 10 times.', icon: '🎨', color: '#ec4899', rule: { kind: 'tagCount', tag: 'creativity', min: 10 } },
  { id: 'century', name: 'Century Club', description: 'Earn 100 XP in total.', icon: '💯', color: '#ef4444', rule: { kind: 'xp', min: 100 } },
  { id: 'rising-star', name: 'Rising Star', description: 'Reach Level 5.', icon: '🌠', color: '#4f8cff', rule: { kind: 'level', min: 5 } },
  { id: 'advanced-form', name: 'Mighty Form', description: 'Reach the Advanced stage.', icon: '🛡️', color: '#9b51e0', rule: { kind: 'stage', min: 4 } },
  { id: 'living-legend', name: 'Living Legend', description: 'Reach Level 10 and the Legendary Form.', icon: '👑', color: '#f2a20c', rule: { kind: 'stage', min: 5 } },
  { id: 'challenge-champ', name: 'Challenge Champion', description: 'Complete 5 challenges.', icon: '🏆', color: '#eab308', rule: { kind: 'challenges', min: 5 } },
];

export const ITEMS: Item[] = [
  // hats
  { id: 'hat-party', name: 'Party Hat', slot: 'hat', unlock: { type: 'level', level: 2 }, description: 'Every day is a celebration.' },
  { id: 'hat-flower', name: 'Flower Crown', slot: 'hat', unlock: { type: 'achievement', id: 'helpful-hero' }, description: 'For the kindest helpers.' },
  { id: 'hat-wizard', name: 'Wizard Hat', slot: 'hat', unlock: { type: 'achievement', id: 'super-reader' }, description: 'Full of story magic.' },
  { id: 'hat-explorer', name: 'Explorer Cap', slot: 'hat', unlock: { type: 'level', level: 6 }, description: 'Ready for any adventure.' },
  { id: 'hat-crown', name: 'Golden Crown', slot: 'hat', unlock: { type: 'level', level: 9 }, description: 'Shining royalty.' },
  // glasses
  { id: 'glasses-round', name: 'Smart Specs', slot: 'glasses', unlock: { type: 'level', level: 3 }, description: 'Extra clever looking.' },
  { id: 'glasses-star', name: 'Star Shades', slot: 'glasses', unlock: { type: 'achievement', id: 'english-star' }, description: 'For English superstars.' },
  { id: 'glasses-cool', name: 'Cool Shades', slot: 'glasses', unlock: { type: 'level', level: 7 }, description: 'Too cool for school (but still loves school).' },
  // wings
  { id: 'wings-fairy', name: 'Fairy Wings', slot: 'wings', unlock: { type: 'level', level: 4 }, description: 'Shimmery and light.' },
  { id: 'wings-angel', name: 'Cloud Wings', slot: 'wings', unlock: { type: 'achievement', id: 'perfect-effort' }, description: 'Lifted by hard work.' },
  { id: 'wings-butterfly', name: 'Butterfly Wings', slot: 'wings', unlock: { type: 'achievement', id: 'creative-spark' }, description: 'Painted with imagination.' },
  // magic
  { id: 'magic-sparkles', name: 'Sparkle Aura', slot: 'magic', unlock: { type: 'achievement', id: 'first-steps' }, description: 'A little bit of magic.' },
  { id: 'magic-halo', name: 'Glow Halo', slot: 'magic', unlock: { type: 'achievement', id: 'great-listener' }, description: 'Calm, bright focus.' },
  { id: 'magic-orbit', name: 'Orbiting Stars', slot: 'magic', unlock: { type: 'challenges', count: 3 }, description: 'Earned by completing challenges.' },
  { id: 'magic-rainbow', name: 'Rainbow Trail', slot: 'magic', unlock: { type: 'level', level: 8 }, description: 'Colourful and proud.' },
  // backgrounds
  { id: 'bg-habitat', name: 'Home Habitat', slot: 'background', unlock: { type: 'free' }, description: 'Your creature’s natural home.' },
  { id: 'bg-meadow', name: 'Sunny Meadow', slot: 'background', unlock: { type: 'level', level: 2 }, description: 'Grass, flowers and blue sky.' },
  { id: 'bg-ocean', name: 'Coral Cove', slot: 'background', unlock: { type: 'level', level: 4 }, description: 'Under the sparkling sea.' },
  { id: 'bg-night', name: 'Starry Night', slot: 'background', unlock: { type: 'achievement', id: 'century' }, description: 'A sky full of wishes.' },
  { id: 'bg-castle', name: 'Cloud Castle', slot: 'background', unlock: { type: 'level', level: 8 }, description: 'High above the clouds.' },
  { id: 'bg-aurora', name: 'Aurora Peaks', slot: 'background', unlock: { type: 'achievement', id: 'living-legend' }, description: 'Only for legends.' },
  // decorations
  { id: 'deco-bow', name: 'Ribbon Bow', slot: 'decoration', unlock: { type: 'level', level: 3 }, description: 'Tied with care.' },
  { id: 'deco-scarf', name: 'Cozy Scarf', slot: 'decoration', unlock: { type: 'achievement', id: 'team-captain' }, description: 'Warm like teamwork.' },
  { id: 'deco-medal', name: 'Hero Medal', slot: 'decoration', unlock: { type: 'achievement', id: 'evolution-master' }, description: 'Awarded for evolving.' },
  { id: 'deco-cape', name: 'Champion Cape', slot: 'decoration', unlock: { type: 'achievement', id: 'challenge-champ' }, description: 'For challenge champions.' },
];

export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'ch-participate-3', title: 'Participate three times today', period: 'daily', metric: 'count', tag: 'participation', target: 3, active: true },
  { id: 'ch-reading', title: 'Complete your reading task', period: 'daily', metric: 'count', tag: 'reading', target: 1, active: true },
  { id: 'ch-help', title: 'Help a classmate', period: 'daily', metric: 'count', tag: 'helping', target: 1, active: true },
  { id: 'ch-xp-20', title: 'Earn 20 XP this week', period: 'weekly', metric: 'xp', target: 20, active: true },
  { id: 'ch-english-5', title: 'Speak English 5 times this week', period: 'weekly', metric: 'count', tag: 'english', target: 5, active: true },
];

export const DEFAULT_SETTINGS: Settings = {
  levelXp: DEFAULT_LEVEL_XP,
  evolutionLevels: DEFAULT_EVOLUTION_LEVELS,
  negativeEnabled: false,
  soundEnabled: true,
  reducedMotion: false,
  pinHash: null,
  currentClassId: null,
  onboarded: false,
};
