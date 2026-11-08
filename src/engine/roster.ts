import { DEFAULT_CATEGORIES, DEFAULT_CHALLENGES, DEFAULT_NEGATIVE_CATEGORIES, DEFAULT_SETTINGS } from '../data/defaults';
import { SPECIES } from '../data/species';
import type { AppData, ClassRoom, Student } from '../types';
import { recordDiscoveries } from './collection';
import { shuffle, uid } from './util';

export const DATA_VERSION = 3;

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    classes: [],
    students: [],
    categories: [...DEFAULT_CATEGORIES, ...DEFAULT_NEGATIVE_CATEGORIES].map((c) => ({ ...c })),
    events: [],
    challenges: DEFAULT_CHALLENGES.map((c) => ({ ...c })),
    settings: { ...DEFAULT_SETTINGS, milestones: DEFAULT_SETTINGS.milestones.map((m) => ({ ...m })), prizes: DEFAULT_SETTINGS.prizes.map((p) => ({ ...p })) },
  };
}

/**
 * Pick a species no one in the class has yet. When all 30 are taken,
 * pick among the least-used ones so duplicates stay rare and spread out.
 */
export function pickSpecies(classStudents: Pick<Student, 'speciesId'>[], rand = Math.random, exclude: string[] = []): string {
  const counts = new Map<string, number>(SPECIES.map((s) => [s.id, 0]));
  for (const st of classStudents) counts.set(st.speciesId, (counts.get(st.speciesId) ?? 0) + 1);
  const filtered = SPECIES.filter((s) => !exclude.includes(s.id));
  const pool = filtered.length ? filtered : SPECIES;
  const min = Math.min(...pool.map((s) => counts.get(s.id) ?? 0));
  const candidates = pool.filter((s) => (counts.get(s.id) ?? 0) === min);
  return candidates[Math.floor(rand() * candidates.length)].id;
}

/** `n` distinct species for a "let the student choose" selection, preferring unused ones. */
export function speciesChoices(classStudents: Pick<Student, 'speciesId'>[], n = 3, rand = Math.random, disabled: string[] = []): string[] {
  const used = new Set(classStudents.map((s) => s.speciesId));
  const offered = SPECIES.filter((s) => !disabled.includes(s.id));
  const pool = offered.length >= n ? offered : SPECIES;
  const unused = shuffle(pool.filter((s) => !used.has(s.id)), rand).map((s) => s.id);
  const rest = shuffle(pool.filter((s) => used.has(s.id)), rand).map((s) => s.id);
  return [...unused, ...rest].slice(0, n);
}

export function newStudent(name: string, classId: string, speciesId: string, now = Date.now()): Student {
  return {
    id: uid('s'), classId, name: name.trim(), speciesId, xp: 0, createdAt: now,
    equipped: { background: 'bg-habitat' }, unlockedItems: ['bg-habitat'], achievements: [],
    tagCounts: {}, tagXp: {}, bestStage: 1, challengeCompletions: [],
    coins: 0, lifetimeXp: 0, milestoneRewards: [],
    evolutionLog: [], skills: {}, interactions: { pet: 0, feed: 0, play: 0 },
  };
}

export function newClass(name: string, grade: string, now = Date.now()): ClassRoom {
  return { id: uid('c'), name: name.trim(), grade, archived: false, createdAt: now, goal: 1000, goalStep: 1000, prizeHistory: [] };
}

/** Add students to a class, each with an automatically assigned unique creature. */
export function addStudents(data: AppData, classId: string, names: string[], rand = Math.random, now = Date.now()): AppData {
  const inClass = data.students.filter((s) => s.classId === classId);
  const added: Student[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const speciesId = pickSpecies([...inClass, ...added], rand, data.settings.disabledSpecies ?? []);
    added.push(newStudent(name, classId, speciesId, now));
  }
  // every new creature's baby form joins the class encyclopedia
  return recordDiscoveries({ ...data, students: [...data.students, ...added] }, added.map((s) => s.id)).data;
}

/**
 * Parse a pasted list or CSV of student names. Accepts one name per line, or a CSV
 * with a "name" column (or "first name" + "last name" columns). Header rows are skipped.
 */
export function parseNames(text: string): string[] {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) => {
    const out: string[] = [];
    let cur = '', q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if ((ch === ',' || ch === ';' || ch === '\t') && !q) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h === 'name' || h === 'student' || h === 'student name' || h === 'full name');
  const firstIdx = header.findIndex((h) => h === 'first name' || h === 'first' || h === 'firstname' || h === 'given name');
  const lastIdx = header.findIndex((h) => h === 'last name' || h === 'last' || h === 'lastname' || h === 'surname' || h === 'family name');
  const hasHeader = nameIdx >= 0 || firstIdx >= 0;
  const rows = (hasHeader ? lines.slice(1) : lines).map(split);
  const names = rows.map((cols) => {
    if (nameIdx >= 0) return cols[nameIdx] ?? '';
    if (firstIdx >= 0) return [cols[firstIdx], lastIdx >= 0 ? cols[lastIdx] : ''].filter(Boolean).join(' ');
    return cols[0] ?? '';
  });
  return names.map((n) => n.replace(/\s+/g, ' ').trim()).filter((n) => n.length > 0 && n.length <= 60);
}
