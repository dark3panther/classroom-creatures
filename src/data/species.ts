import type { Species } from '../types';

/**
 * The original creature roster: 30 species, three per element.
 * Appearance is fully described by these parameters and drawn by `CreatureSvg`,
 * so adding a creature is just adding an entry here (see README → "Adding creatures").
 */
type S = Omit<Species, 'sound'> & { sound?: Species['sound'] };

const RAW: S[] = [
  // ───────── FIRE ─────────
  { id: 'emberpup', name: 'Emberpup', legendTitle: 'the Sunflame', element: 'fire', rarity: 'common',
    personality: 'Brave and bouncy. Always the first to try something new.', ability: 'Warm Hug Spark',
    body: 'round', ears: 'cat', tail: 'flame', wings: 'none', face: 'snout', pattern: 'belly', idle: 'hop',
    palette: { main: '#ff8a3d', shade: '#e0622a', belly: '#ffe1b8', accent: '#ffd43b', eye: '#3a1d12' } },
  { id: 'cinderwing', name: 'Cinderwing', legendTitle: 'Phoenix of Dawn', element: 'fire', rarity: 'rare',
    personality: 'Proud, kind, and a little dramatic. Loves to show off its glow.', ability: 'Ember Flurry',
    body: 'pear', ears: 'feather', tail: 'flame', wings: 'feather', face: 'beak', pattern: 'none', idle: 'float',
    palette: { main: '#ff5d5d', shade: '#d63b4a', belly: '#ffd3a1', accent: '#ffb627', eye: '#2b1020' } },
  { id: 'magmole', name: 'Magmole', legendTitle: 'Heart of the Volcano', element: 'fire', rarity: 'uncommon',
    personality: 'Sleepy until snack time, then unstoppable.', ability: 'Lava Bubble Pop',
    body: 'tall', ears: 'round', tail: 'curl', wings: 'none', face: 'whisker', pattern: 'cracks', idle: 'breathe',
    palette: { main: '#b5543a', shade: '#8a3a28', belly: '#ffc48a', accent: '#ff7b1c', eye: '#24120c' } },

  // ───────── WATER ─────────
  { id: 'splashlet', name: 'Splashlet', legendTitle: 'Tide Guardian', element: 'water', rarity: 'common',
    personality: 'Giggly and splashy. Turns every puddle into a party.', ability: 'Bubble Shower',
    body: 'round', ears: 'fin', tail: 'fish', wings: 'none', face: 'plain', pattern: 'spots', idle: 'wiggle',
    palette: { main: '#4fb6f0', shade: '#2f8fd0', belly: '#d6f3ff', accent: '#ff9ec7', eye: '#10233a' } },
  { id: 'tidepaw', name: 'Tidepaw', legendTitle: 'Keeper of the Reef', element: 'water', rarity: 'uncommon',
    personality: 'Curious and helpful. Collects shiny shells for friends.', ability: 'Ripple Wave',
    body: 'tall', ears: 'round', tail: 'fluffy', wings: 'none', face: 'whisker', pattern: 'belly', idle: 'sway',
    palette: { main: '#3a9bb5', shade: '#2a7a91', belly: '#e1f6ef', accent: '#7ee0c3', eye: '#0f2730' } },
  { id: 'coralyn', name: 'Coralyn', legendTitle: 'Pearl Empress', element: 'water', rarity: 'epic',
    personality: 'Graceful and gentle. Sings to the moonlit sea.', ability: 'Pearl Song',
    body: 'pear', ears: 'droop', tail: 'fish', wings: 'fairy', face: 'plain', pattern: 'swirl', idle: 'float',
    palette: { main: '#ff8fb1', shade: '#e0688f', belly: '#ffe3ec', accent: '#7fd6ff', eye: '#3a1028' } },

  // ───────── NATURE ─────────
  { id: 'sproutling', name: 'Sproutling', legendTitle: 'Elder of the Grove', element: 'nature', rarity: 'common',
    personality: 'Patient and caring. Grows a little every single day.', ability: 'Blossom Burst',
    body: 'round', ears: 'leaf', tail: 'leaf', wings: 'none', face: 'plain', pattern: 'none', idle: 'sway',
    palette: { main: '#7ccf5b', shade: '#56a83d', belly: '#effbd2', accent: '#ff9ad1', eye: '#173012' } },
  { id: 'thornquill', name: 'Thornquill', legendTitle: 'Bramble Knight', element: 'nature', rarity: 'rare',
    personality: 'Shy at first, fiercely loyal to its friends.', ability: 'Seed Spin',
    body: 'tall', ears: 'round', tail: 'leaf', wings: 'none', face: 'snout', pattern: 'stripes', idle: 'hop',
    palette: { main: '#8f7a4f', shade: '#6b5a38', belly: '#f6e8c3', accent: '#5fbf4a', eye: '#22180c' } },
  { id: 'bloomfawn', name: 'Bloomfawn', legendTitle: 'Spirit of Spring', element: 'nature', rarity: 'legendary',
    personality: 'Dreamy and wise. Flowers bloom wherever it steps.', ability: 'Spring Awakening',
    body: 'pear', ears: 'droop', tail: 'fluffy', wings: 'leaf', face: 'snout', pattern: 'spots', idle: 'breathe',
    palette: { main: '#f2c48d', shade: '#d9a46a', belly: '#fff4e0', accent: '#8ee07a', eye: '#2d1c0e' } },

  // ───────── ELECTRIC ─────────
  { id: 'zipzap', name: 'Zipzap', legendTitle: 'Storm Sovereign', element: 'electric', rarity: 'common',
    personality: 'Super speedy and full of jokes. Can never sit still.', ability: 'Zigzag Dash',
    body: 'round', ears: 'antenna', tail: 'bolt', wings: 'none', face: 'whisker', pattern: 'none', idle: 'hop',
    palette: { main: '#ffd23f', shade: '#e6b000', belly: '#fff6c9', accent: '#3d8bff', eye: '#2a2208' } },
  { id: 'voltmunk', name: 'Voltmunk', legendTitle: 'Thunder Chief', element: 'electric', rarity: 'uncommon',
    personality: 'Clever tinkerer. Builds tiny gadgets out of acorns.', ability: 'Static Pop',
    body: 'tall', ears: 'cat', tail: 'fluffy', wings: 'none', face: 'whisker', pattern: 'stripes', idle: 'wiggle',
    palette: { main: '#f6a93b', shade: '#d4851a', belly: '#fff0cf', accent: '#fff15c', eye: '#2a1806' } },
  { id: 'sparkfinch', name: 'Sparkfinch', legendTitle: 'Herald of Lightning', element: 'electric', rarity: 'epic',
    personality: 'Cheerful singer whose songs light up the sky.', ability: 'Thunder Chirp',
    body: 'pear', ears: 'feather', tail: 'bolt', wings: 'feather', face: 'beak', pattern: 'none', idle: 'float',
    palette: { main: '#6fd3ff', shade: '#3fb0e6', belly: '#fffbd1', accent: '#ffe93b', eye: '#0d2233' } },

  // ───────── ICE ─────────
  { id: 'frostnib', name: 'Frostnib', legendTitle: 'Aurora Warden', element: 'ice', rarity: 'common',
    personality: 'Calm and polite. Waddles carefully, slides joyfully.', ability: 'Snowflake Twirl',
    body: 'pear', ears: 'none', tail: 'none', wings: 'none', face: 'beak', pattern: 'belly', idle: 'wiggle',
    palette: { main: '#5b7bd6', shade: '#3f5db5', belly: '#f4fbff', accent: '#9de7ff', eye: '#0f1633' } },
  { id: 'glacikit', name: 'Glacikit', legendTitle: 'Crystal Monarch', element: 'ice', rarity: 'rare',
    personality: 'Cool and confident, secretly loves warm cuddles.', ability: 'Glitter Frost',
    body: 'round', ears: 'cat', tail: 'crystal', wings: 'none', face: 'whisker', pattern: 'none', idle: 'sway',
    palette: { main: '#bfefff', shade: '#8fd2ee', belly: '#ffffff', accent: '#7ab8ff', eye: '#16324a' } },
  { id: 'snowmoth', name: 'Snowmoth', legendTitle: 'Moon of Winter', element: 'ice', rarity: 'epic',
    personality: 'Quiet dreamer who dances in falling snow.', ability: 'Blizzard Waltz',
    body: 'wisp', ears: 'antenna', tail: 'none', wings: 'fairy', face: 'plain', pattern: 'spots', idle: 'float',
    palette: { main: '#eef4ff', shade: '#c9d6f2', belly: '#ffffff', accent: '#a7c4ff', eye: '#1c2340' } },

  // ───────── EARTH ─────────
  { id: 'pebblet', name: 'Pebblet', legendTitle: 'Mountain Heart', element: 'earth', rarity: 'common',
    personality: 'Steady and dependable. The best listener in the world.', ability: 'Rock Roll',
    body: 'round', ears: 'round', tail: 'none', wings: 'none', face: 'plain', pattern: 'cracks', idle: 'breathe',
    palette: { main: '#a8a29a', shade: '#857e75', belly: '#e6e0d6', accent: '#7fd1b9', eye: '#221f1b' } },
  { id: 'burrowby', name: 'Burrowby', legendTitle: 'Lord of Tunnels', element: 'earth', rarity: 'uncommon',
    personality: 'Hard-working digger. Finds treasure everywhere.', ability: 'Dig Dash',
    body: 'tall', ears: 'bunny', tail: 'fluffy', wings: 'none', face: 'snout', pattern: 'belly', idle: 'hop',
    palette: { main: '#c48a52', shade: '#9e6a38', belly: '#f7e2c3', accent: '#ffcf6b', eye: '#2a1a0c' } },
  { id: 'gemsnout', name: 'Gemsnout', legendTitle: 'Geode Titan', element: 'earth', rarity: 'rare',
    personality: 'Sparkly and generous. Shares gems with everyone.', ability: 'Gem Shine',
    body: 'pear', ears: 'horn', tail: 'crystal', wings: 'none', face: 'snout', pattern: 'spots', idle: 'sway',
    palette: { main: '#8a6fb8', shade: '#6a5196', belly: '#e9def7', accent: '#5ff0d2', eye: '#1c1230' } },

  // ───────── SHADOW ─────────
  { id: 'duskit', name: 'Duskit', legendTitle: 'Night Watcher', element: 'shadow', rarity: 'common',
    personality: 'Mysterious but sweet. Loves bedtime stories.', ability: 'Shadow Peek',
    body: 'round', ears: 'cat', tail: 'wisp', wings: 'none', face: 'whisker', pattern: 'none', idle: 'sway',
    palette: { main: '#5d4a9e', shade: '#44357c', belly: '#c9bdf0', accent: '#ffd76b', eye: '#fff4b8' } },
  { id: 'gloomwing', name: 'Gloomwing', legendTitle: 'Eclipse Drake', element: 'shadow', rarity: 'epic',
    personality: 'Looks spooky, acts silly. Afraid of nothing except spiders.', ability: 'Midnight Swoop',
    body: 'tall', ears: 'horn', tail: 'curl', wings: 'bat', face: 'snout', pattern: 'stars', idle: 'float',
    palette: { main: '#3f3a6b', shade: '#2b274f', belly: '#9b8fd6', accent: '#7ef0ff', eye: '#b8f6ff' } },
  { id: 'murmink', name: 'Murmink', legendTitle: 'Keeper of Dreams', element: 'shadow', rarity: 'uncommon',
    personality: 'Soft-spoken and clever. Hides in the coziest corners.', ability: 'Dream Mist',
    body: 'wisp', ears: 'bunny', tail: 'wisp', wings: 'none', face: 'plain', pattern: 'swirl', idle: 'float',
    palette: { main: '#7a5fb8', shade: '#5c4596', belly: '#e3d6ff', accent: '#ff9ee8', eye: '#20123a' } },

  // ───────── LIGHT ─────────
  { id: 'glowbun', name: 'Glowbun', legendTitle: 'Dawnbringer', element: 'light', rarity: 'common',
    personality: 'Sunny and kind. Makes everyone feel welcome.', ability: 'Sunbeam Hop',
    body: 'round', ears: 'bunny', tail: 'fluffy', wings: 'none', face: 'plain', pattern: 'none', idle: 'hop',
    palette: { main: '#fff1c9', shade: '#f2d58c', belly: '#ffffff', accent: '#ffc93b', eye: '#3a2a08' } },
  { id: 'lumifox', name: 'Lumifox', legendTitle: 'Radiant Sage', element: 'light', rarity: 'rare',
    personality: 'Wise and playful. Its tail glows when it is happy.', ability: 'Prism Flash',
    body: 'tall', ears: 'cat', tail: 'fluffy', wings: 'none', face: 'snout', pattern: 'belly', idle: 'sway',
    palette: { main: '#ffcf7a', shade: '#f0ab3f', belly: '#fff8e8', accent: '#ff8fd0', eye: '#331d06' } },
  { id: 'halowl', name: 'Halowl', legendTitle: 'Guardian of Light', element: 'light', rarity: 'legendary',
    personality: 'Gentle protector who watches over the whole class.', ability: 'Halo Shine',
    body: 'pear', ears: 'feather', tail: 'none', wings: 'feather', face: 'beak', pattern: 'swirl', idle: 'breathe',
    palette: { main: '#fff7e3', shade: '#efdcae', belly: '#ffffff', accent: '#ffb84d', eye: '#2f2410' } },

  // ───────── COSMIC ─────────
  { id: 'stardrop', name: 'Stardrop', legendTitle: 'Comet Queen', element: 'cosmic', rarity: 'uncommon',
    personality: 'Bubbly stargazer. Makes a wish every night.', ability: 'Wishing Star',
    body: 'round', ears: 'antenna', tail: 'star', wings: 'none', face: 'plain', pattern: 'stars', idle: 'float',
    palette: { main: '#7f6cff', shade: '#5f4ce0', belly: '#ddd6ff', accent: '#ffe066', eye: '#120b33' } },
  { id: 'nebulynx', name: 'Nebulynx', legendTitle: 'Galaxy Strider', element: 'cosmic', rarity: 'epic',
    personality: 'Adventurous explorer who maps the stars.', ability: 'Nebula Leap',
    body: 'tall', ears: 'cat', tail: 'star', wings: 'none', face: 'whisker', pattern: 'stars', idle: 'sway',
    palette: { main: '#3b3f9e', shade: '#282b78', belly: '#ff9ee8', accent: '#7ef7ff', eye: '#fff7c2' } },
  { id: 'orbitoad', name: 'Orbitoad', legendTitle: 'Planet Prince', element: 'cosmic', rarity: 'common',
    personality: 'Funny and friendly. Its belly rumbles like thunder in space.', ability: 'Moon Bounce',
    body: 'pear', ears: 'none', tail: 'none', wings: 'none', face: 'plain', pattern: 'spots', idle: 'hop',
    palette: { main: '#5fd1b4', shade: '#3caf93', belly: '#e2fff6', accent: '#c58bff', eye: '#0d2a24' } },

  // ───────── AIR ─────────
  { id: 'puffwhirl', name: 'Puffwhirl', legendTitle: 'Sky Monarch', element: 'air', rarity: 'common',
    personality: 'Light-hearted and floaty. Giggles when the wind tickles.', ability: 'Breeze Spin',
    body: 'wisp', ears: 'none', tail: 'cloud', wings: 'none', face: 'plain', pattern: 'swirl', idle: 'float',
    palette: { main: '#e9f6ff', shade: '#bcdcf2', belly: '#ffffff', accent: '#9ad4ff', eye: '#1a2b3a' } },
  { id: 'breezel', name: 'Breezel', legendTitle: 'Windrunner', element: 'air', rarity: 'uncommon',
    personality: 'Speedy and free. Races clouds for fun.', ability: 'Gust Zoom',
    body: 'tall', ears: 'bunny', tail: 'curl', wings: 'none', face: 'whisker', pattern: 'stripes', idle: 'sway',
    palette: { main: '#a7e3d4', shade: '#7cc6b3', belly: '#f2fffa', accent: '#ffffff', eye: '#122a26' } },
  { id: 'gustowl', name: 'Gustowl', legendTitle: 'Tempest Sage', element: 'air', rarity: 'rare',
    personality: 'Thoughtful and calm. Knows a story about every cloud.', ability: 'Whirlwind Wink',
    body: 'pear', ears: 'feather', tail: 'cloud', wings: 'feather', face: 'beak', pattern: 'none', idle: 'breathe',
    palette: { main: '#9db8d9', shade: '#7896bd', belly: '#eef5ff', accent: '#ffd36b', eye: '#141f30' } },
];

const WAVES: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];
const ELEMENT_BASE: Record<string, number> = {
  fire: 392, water: 523, nature: 440, electric: 659, ice: 784, earth: 262, shadow: 330, light: 587, cosmic: 698, air: 494,
};

/** Each species gets a short original "voice" derived from its id, unless one is given. */
function soundFor(s: S, i: number): Species['sound'] {
  const h = [...s.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const patterns = [[0, 4, 7], [0, 7, 12], [7, 4, 0, 12], [0, 3, 7, 10], [0, 5, 9], [12, 7, 9], [0, 2, 4, 7]];
  return {
    base: ELEMENT_BASE[s.element] * (s.body === 'tall' ? 0.84 : s.body === 'wisp' ? 1.12 : 1),
    wave: s.element === 'electric' ? 'square' : s.element === 'shadow' ? 'triangle' : WAVES[(h + i) % 2],
    notes: patterns[h % patterns.length],
  };
}

export const SPECIES: Species[] = RAW.map((s, i) => ({ ...s, sound: s.sound ?? soundFor(s, i) }));

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): Species {
  return SPECIES_BY_ID[id] ?? SPECIES[0];
}

const FIELD_NO: Record<string, number> = Object.fromEntries(SPECIES.map((s, i) => [s.id, i + 1]));
/** The species' field-guide number ("No. 014"): its fixed place in the collection, shown on every plate. */
export function fieldNo(id: string): string {
  return `No. ${String(FIELD_NO[id] ?? 0).padStart(3, '0')}`;
}
