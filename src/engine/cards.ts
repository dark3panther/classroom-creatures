import ART from '../data/creatureArt.json';
import PALS from '../data/pixelPals.json';
import { BRANCHES } from '../data/branches';
import { SPECIES, SPECIES_BY_ID } from '../data/species';
import type { AppData, Rarity, Settings, Species, Stage, Student } from '../types';

/**
 * Creature card packs (1.9). Students spend coins (or a pack won from a boss) to open a pack of three creature cards
 * and collect every form of every creature in their own card binder. A card's rarity is its stage (a mythical form
 * is the rarest of all); the third card of a pack is always Rare or better. A copy a student already has turns
 * into a couple of coins, so no pack is ever wasted. Nothing here uses real money: coins are earned in class.
 */
export interface CardForm { key: string; species: Species; stage: Stage; mythic: boolean; rarity: Rarity }
export interface DrawnCard { key: string; rarity: Rarity; isNew: boolean }
export type PackError = 'unknown' | 'disabled' | 'coins';

export const PACK = {
  /** default price in coins (a teacher can change it in Settings) */
  price: 25,
  size: 3,
  /** coins back for a copy the student already had */
  duplicateCoins: 2,
  /** how often each rarity comes up (relative), whatever the number of forms in it */
  odds: { common: 40, uncommon: 26, rare: 16, epic: 9, legendary: 5, mythical: 2 } as Record<Rarity, number>,
};

const STAGE_RARITY: Record<Stage, Rarity> = { 1: 'common', 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'legendary' };
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

/** Every card there is: each painted creature's five stages, the mythical forms, and the Pixel Pals. */
export const CARD_FORMS: CardForm[] = (() => {
  const out: CardForm[] = [];
  const painted = new Set(Object.keys(ART));
  const pals = new Set(Object.keys((PALS as unknown as { forms: Record<string, unknown> }).forms));
  for (const sp of SPECIES) {
    for (const stage of [1, 2, 3, 4, 5] as Stage[]) {
      const key = `${sp.id}-${stage}`;
      if (painted.has(key) || pals.has(key)) out.push({ key, species: sp, stage, mythic: false, rarity: STAGE_RARITY[stage] });
    }
    if (BRANCHES[sp.id] && !sp.pixelArt) out.push({ key: `${sp.id}-5b`, species: sp, stage: 5, mythic: true, rarity: 'mythical' });
  }
  return out;
})();
export const CARD_FORMS_BY_KEY: Record<string, CardForm> = Object.fromEntries(CARD_FORMS.map((f) => [f.key, f]));

/** A form key's parts, for drawing it (`fox-5b` → fox, stage 5, mythical). */
export function cardForm(key: string): CardForm | undefined {
  if (CARD_FORMS_BY_KEY[key]) return CARD_FORMS_BY_KEY[key];
  const m = key.match(/^(.*)-(\d)(b?)$/);
  const sp = m ? SPECIES_BY_ID[m[1]] : undefined;
  if (!m || !sp) return undefined;
  const stage = Number(m[2]) as Stage;
  return { key, species: sp, stage, mythic: !!m[3], rarity: m[3] ? 'mythical' : STAGE_RARITY[stage] };
}

export const packsOn = (settings: Pick<Settings, 'cardPacks'>) => settings.cardPacks !== false;
export const packPrice = (settings: Pick<Settings, 'packPrice'>) =>
  typeof settings.packPrice === 'number' && settings.packPrice >= 0 ? Math.round(settings.packPrice) : PACK.price;

/** How many different cards a student has, out of all of them. */
export function binderCount(s: Pick<Student, 'cards'>): { have: number; total: number } {
  const have = Object.keys(s.cards ?? {}).filter((k) => CARD_FORMS_BY_KEY[k] && (s.cards?.[k] ?? 0) > 0).length;
  return { have, total: CARD_FORMS.length };
}

/** One card at random: a rarity by the odds (at least `floor`), then a form of that rarity. */
function drawOne(rand: () => number, floor: Rarity): CardForm {
  const allowed = RARITY_ORDER.slice(RARITY_ORDER.indexOf(floor));
  const total = allowed.reduce((n, r) => n + PACK.odds[r], 0);
  let x = rand() * total;
  let rarity = allowed[allowed.length - 1];
  for (const r of allowed) { if (x < PACK.odds[r]) { rarity = r; break; } x -= PACK.odds[r]; }
  const pool = CARD_FORMS.filter((f) => f.rarity === rarity);
  return pool[Math.floor(rand() * pool.length)] ?? CARD_FORMS[0];
}

/**
 * Open a pack for a student: an unopened pack they won is used first, otherwise it costs the pack price in coins
 * (never going below 0). Three cards; a card they already have is drawn again once, and a copy that is still a
 * duplicate gives PACK.duplicateCoins back. Returns the new data and the cards, in the order they are shown.
 */
export function openPack(data: AppData, studentId: string, rand: () => number = Math.random):
  { data: AppData; cards: DrawnCard[]; usedPack: boolean; paid: number; refund: number } | { error: PackError } {
  const s = data.students.find((x) => x.id === studentId);
  if (!s) return { error: 'unknown' };
  if (!packsOn(data.settings)) return { error: 'disabled' };
  const usedPack = (s.packs ?? 0) > 0;
  const paid = usedPack ? 0 : packPrice(data.settings);
  if (!usedPack && (s.coins ?? 0) < paid) return { error: 'coins' };
  const owned = { ...(s.cards ?? {}) };
  const cards: DrawnCard[] = [];
  let refund = 0;
  for (let i = 0; i < PACK.size; i++) {
    const floor: Rarity = i === PACK.size - 1 ? 'rare' : 'common';
    let f = drawOne(rand, floor);
    if ((owned[f.key] ?? 0) > 0) f = drawOne(rand, floor);
    const isNew = !(owned[f.key] ?? 0);
    if (!isNew) refund += PACK.duplicateCoins;
    owned[f.key] = (owned[f.key] ?? 0) + 1;
    cards.push({ key: f.key, rarity: f.rarity, isNew });
  }
  const next: AppData = {
    ...data,
    students: data.students.map((x) => (x.id === studentId ? {
      ...x, cards: owned, coins: Math.max(0, (x.coins ?? 0) - paid + refund), packs: usedPack ? Math.max(0, (x.packs ?? 0) - 1) : (x.packs ?? 0),
    } : x)),
  };
  return { data: next, cards, usedPack, paid, refund };
}
