import { createStore, del, get, set } from 'idb-keyval';
import type { AppData } from '../types';

/**
 * Persistence: IndexedDB is the primary store (large quota, survives browser restarts).
 * A localStorage mirror is kept as a second copy when it fits, and rolling snapshots
 * give the teacher a way back from mistakes.
 */
const DATA_KEY = 'cc:data';
const SNAP_KEY = 'cc:snapshots';
const MIRROR_KEY = 'cc:data:mirror';
const MAX_SNAPSHOTS = 12;

let store: ReturnType<typeof createStore> | null = null;
function idb() {
  if (!store) store = createStore('classroom-creatures', 'kv');
  return store;
}

export interface Snapshot {
  id: string;
  at: number;
  reason: string;
  students: number;
  classes: number;
  data: AppData;
}

export async function loadData(): Promise<AppData | null> {
  try {
    const d = await get<AppData>(DATA_KEY, idb());
    if (d) return d;
  } catch (e) {
    console.warn('IndexedDB unavailable, trying localStorage mirror', e);
  }
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

let pending: AppData | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSavedAt = 0;
const listeners = new Set<(t: number) => void>();

export function onSaved(fn: (t: number) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function writeNow(data: AppData) {
  try {
    await set(DATA_KEY, data, idb());
  } catch (e) {
    console.error('Saving to IndexedDB failed', e);
  }
  try {
    const json = JSON.stringify(data);
    if (json.length < 2_500_000) localStorage.setItem(MIRROR_KEY, json);
  } catch {
    /* quota exceeded: IndexedDB copy is still there */
  }
  lastSavedAt = Date.now();
  listeners.forEach((l) => l(lastSavedAt));
}

/** Debounced auto-save. */
export function scheduleSave(data: AppData, delay = 250) {
  pending = data;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const d = pending;
    pending = null;
    if (d) void writeNow(d);
  }, delay);
}

/** Flush any pending save immediately (on tab hide / close). */
export function flushSave() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (pending) {
    const d = pending;
    pending = null;
    void writeNow(d);
  }
}

export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    return (await get<Snapshot[]>(SNAP_KEY, idb())) ?? [];
  } catch {
    return [];
  }
}

export async function addSnapshot(data: AppData, reason: string): Promise<void> {
  const snaps = await listSnapshots();
  const snap: Snapshot = {
    id: `snap-${Date.now().toString(36)}`, at: Date.now(), reason,
    students: data.students.length, classes: data.classes.length, data,
  };
  try {
    await set(SNAP_KEY, [snap, ...snaps].slice(0, MAX_SNAPSHOTS), idb());
  } catch (e) {
    console.error('Snapshot failed', e);
  }
}

/** One automatic safety snapshot per day. */
export async function dailySnapshot(data: AppData): Promise<void> {
  const snaps = await listSnapshots();
  const last = snaps.find((s) => s.reason === 'Daily automatic backup');
  if (!last || Date.now() - last.at > 20 * 3_600_000) await addSnapshot(data, 'Daily automatic backup');
}

export async function wipeAll(): Promise<void> {
  try { await del(DATA_KEY, idb()); } catch { /* ignore */ }
  try { localStorage.removeItem(MIRROR_KEY); } catch { /* ignore */ }
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
