import type { PersonalityType } from '../types';

/** Each species' personality type, read from its description. */
export const PERSONALITY_OF: Record<string, PersonalityType> = {
  emberpup: 'brave', cinderwing: 'brave', pebblet: 'brave', halowl: 'brave',
  splashlet: 'playful', sparkfinch: 'playful', gemsnout: 'playful', glowbun: 'playful', orbitoad: 'playful',
  coralyn: 'shy', thornquill: 'shy', frostnib: 'shy', murmink: 'shy', sproutling: 'shy',
  tidepaw: 'curious', voltmunk: 'curious', lumifox: 'curious', stardrop: 'curious', gustowl: 'curious',
  magmole: 'sleepy', bloomfawn: 'sleepy', snowmoth: 'sleepy', puffwhirl: 'sleepy',
  zipzap: 'energetic', burrowby: 'energetic', nebulynx: 'energetic', breezel: 'energetic',
  glacikit: 'mischievous', duskit: 'mischievous', gloomwing: 'mischievous',
};

export type Snack = 'berry' | 'fish' | 'cookie';
export type Toy = 'ball' | 'yarn' | 'wand';

export interface PersonalityInfo {
  label: string;
  trait: string;
  favSnack: Snack;
  favToy: Toy;
  /** what it does when petted, fed, played with, or when it earns XP ({name} is replaced) */
  lines: { pet: string; feed: string; fav: string; play: string; award: string };
}

export const PERSONALITIES: Record<PersonalityType, PersonalityInfo> = {
  brave: { label: 'Brave', trait: 'Always first to try something new. Stands tall when it is proud.', favSnack: 'fish', favToy: 'ball',
    lines: { pet: '{name} puffs out its chest proudly!', feed: '{name} gobbles it up in one brave bite.', fav: 'Its favourite! {name} does a victory pose.', play: '{name} chases it without any fear!', award: '{name} raises a paw like a champion.' } },
  playful: { label: 'Playful', trait: 'Turns everything into a game and giggles a lot.', favSnack: 'cookie', favToy: 'ball',
    lines: { pet: '{name} rolls over for more tickles!', feed: '{name} juggles it, then eats it.', fav: 'Its favourite! {name} spins with joy.', play: '{name} bounces after it, again and again!', award: '{name} does a happy little dance.' } },
  shy: { label: 'Shy', trait: 'Quiet at first, fiercely loyal once it trusts you.', favSnack: 'berry', favToy: 'yarn',
    lines: { pet: '{name} blushes and hides its face… then peeks out.', feed: '{name} nibbles it very politely.', fav: 'Its favourite! {name} smiles a big shy smile.', play: '{name} taps it gently, then looks at you.', award: '{name} gives a tiny proud wave.' } },
  curious: { label: 'Curious', trait: 'Wants to know how everything works. Sniffs everything twice.', favSnack: 'berry', favToy: 'wand',
    lines: { pet: '{name} sniffs your hand and hums happily.', feed: '{name} studies it closely before tasting.', fav: 'Its favourite! {name} wants to know where you found it.', play: '{name} follows the sparkles with wide eyes!', award: '{name} wonders what it will learn next.' } },
  sleepy: { label: 'Sleepy', trait: 'Loves naps and cosy corners. Wakes up for snacks.', favSnack: 'cookie', favToy: 'yarn',
    lines: { pet: '{name} yawns and snuggles in.', feed: '{name} wakes right up for a snack.', fav: 'Its favourite! {name} is suddenly wide awake.', play: '{name} bats at it sleepily… then pounces!', award: '{name} opens one eye and grins.' } },
  energetic: { label: 'Energetic', trait: 'Never sits still. Races clouds for fun.', favSnack: 'fish', favToy: 'ball',
    lines: { pet: '{name} wiggles so fast it is hard to pet!', feed: '{name} zooms around after eating.', fav: 'Its favourite! {name} does three laps of the room.', play: '{name} fetches it before it lands!', award: '{name} jumps higher than ever.' } },
  mischievous: { label: 'Mischievous', trait: 'A little bit cheeky, always with a twinkle in its eye.', favSnack: 'cookie', favToy: 'wand',
    lines: { pet: '{name} winks and steals a hug.', feed: '{name} hides half of it for later.', fav: 'Its favourite! {name} does a cheeky somersault.', play: '{name} pretends to ignore it, then pounces!', award: '{name} grins like it planned this all along.' } },
};

export const SNACKS: { id: Snack; label: string }[] = [
  { id: 'berry', label: 'Berry' }, { id: 'fish', label: 'Fish' }, { id: 'cookie', label: 'Cookie' },
];
export const TOYS: { id: Toy; label: string }[] = [
  { id: 'ball', label: 'Ball' }, { id: 'yarn', label: 'Yarn' }, { id: 'wand', label: 'Star wand' },
];

export function personalityOf(speciesId: string): PersonalityInfo & { type: PersonalityType } {
  const type = PERSONALITY_OF[speciesId] ?? 'playful';
  return { ...PERSONALITIES[type], type };
}

export function line(text: string, name: string): string {
  return text.replace('{name}', name);
}
