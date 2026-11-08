import { ITEMS, ITEMS_BY_ID } from '../data/defaults';
import type { AppData, Item, SeasonWindow, Settings, Student } from '../types';
import { qualifiedItems, refreshStudent } from './awards';

/** The price a teacher set, or the item's own price. Null when the item is not sold for coins. */
export function itemPrice(item: Item, settings: Pick<Settings, 'itemPrices'>): number | null {
  if (item.unlock.type !== 'shop') return null;
  const o = settings.itemPrices?.[item.id];
  return typeof o === 'number' && o >= 0 ? Math.round(o) : item.unlock.price;
}

/** Is a seasonal window open on this date? Windows may wrap the new year (e.g. Dec → Feb). */
export function inSeason(season: SeasonWindow | undefined, now = Date.now()): boolean {
  if (!season) return true;
  const d = new Date(now);
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  const from = season.from[0] * 100 + season.from[1];
  const to = season.to[0] * 100 + season.to[1];
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

/** Last day of the current window, for "Limited: until 30 Nov". */
export function seasonEnds(season: SeasonWindow, now = Date.now()): Date {
  const d = new Date(now);
  let y = d.getFullYear();
  if (season.from[0] > season.to[0] && d.getMonth() + 1 >= season.from[0]) y += 1;
  return new Date(y, season.to[0] - 1, season.to[1]);
}

export type ItemState = 'equipped' | 'owned' | 'buyable' | 'short' | 'locked' | 'unavailable';

/**
 * Where an item stands for one student:
 * equipped / owned · buyable (enough coins) · short (shop item, not enough coins) ·
 * locked (earned by level, badge, stage or collection, not reached yet) · unavailable (out of season, never owned).
 */
export function itemState(item: Item, s: Student, settings: Settings, now = Date.now()): ItemState {
  if (s.equipped[item.slot] === item.id) return 'equipped';
  if (s.unlockedItems.includes(item.id)) return 'owned';
  if (item.unlock.type === 'shop') {
    if (!inSeason(item.season, now)) return 'unavailable';
    return (s.coins ?? 0) >= (itemPrice(item, settings) ?? Infinity) ? 'buyable' : 'short';
  }
  return 'locked';
}

/** Items a class can see: everything the teacher did not switch off, plus anything a student already owns. */
export function visibleItems(settings: Pick<Settings, 'disabledItems'>, s?: Student): Item[] {
  const off = new Set(settings.disabledItems ?? []);
  return ITEMS.filter((it) => !off.has(it.id) || !!s?.unlockedItems.includes(it.id));
}

export type BuyError = 'unknown' | 'owned' | 'notForSale' | 'disabled' | 'season' | 'coins';

/** Buy a shop item with coins. Never buys twice, never goes below 0 coins, respects season and teacher switches. */
export function purchase(data: AppData, studentId: string, itemId: string, now = Date.now()): { data: AppData } | { error: BuyError } {
  const item = ITEMS_BY_ID[itemId];
  const s = data.students.find((x) => x.id === studentId);
  if (!item || !s) return { error: 'unknown' };
  if (s.unlockedItems.includes(itemId)) return { error: 'owned' };
  const price = itemPrice(item, data.settings);
  if (price === null) return { error: 'notForSale' };
  if (data.settings.disabledItems?.includes(itemId)) return { error: 'disabled' };
  if (!inSeason(item.season, now)) return { error: 'season' };
  if ((s.coins ?? 0) < price) return { error: 'coins' };
  const next: AppData = { ...data, students: data.students.map((x) => (x.id === studentId ? { ...x, coins: (x.coins ?? 0) - price, unlockedItems: [...x.unlockedItems, itemId] } : x)) };
  // buying can complete "Customization Expert" style achievements
  return { data: refreshStudent(next, studentId, now).data };
}

/** Put an item on (or take a slot off with itemId = null). Only owned, visible items can be worn. */
export function equipItem(data: AppData, studentId: string, slot: Item['slot'], itemId: string | null, now = Date.now()): AppData {
  const next: AppData = {
    ...data,
    students: data.students.map((s) => {
      if (s.id !== studentId) return s;
      const equipped = { ...s.equipped };
      if (itemId && s.unlockedItems.includes(itemId) && ITEMS_BY_ID[itemId]?.slot === slot) equipped[slot] = itemId;
      else if (slot === 'background') equipped.background = 'bg-habitat';
      else delete equipped[slot];
      return { ...s, equipped };
    }),
  };
  return refreshStudent(next, studentId, now).data;
}

/** Does this student qualify for an earned item right now (used to explain locked items)? */
export function qualifies(item: Item, s: Student, data: AppData): boolean {
  const cls = data.classes.find((c) => c.id === s.classId);
  return qualifiedItems(s, data.settings, cls).includes(item.id);
}

const STAGE_LABEL = ['Baby', 'Young', 'Evolved', 'Advanced', 'Legendary'];

/** How an earned item is unlocked, in the teacher's words. */
export function unlockLabel(item: Item, achievementName: (id: string) => string = (id) => id): string {
  const u = item.unlock;
  switch (u.type) {
    case 'level': return `Reach Level ${u.level}`;
    case 'achievement': return `Badge: ${achievementName(u.id)}`;
    case 'challenges': return `Complete ${u.count} challenges`;
    case 'stage': return `Evolve to ${STAGE_LABEL[u.stage - 1]}`;
    case 'collection': return `Class discovers ${Math.round(u.pct * 100)}% of the field guide`;
    case 'shop': return `${u.price} coins`;
    default: return 'Free';
  }
}
