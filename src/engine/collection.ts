import { BRANCHES, formKey } from '../data/branches';
import { SPECIES } from '../data/species';
import type { AppData, ClassRoom, Stage, Student } from '../types';

/** Every creature form in the encyclopedia: 5 stages per species plus each mythical path. */
export function allForms(): string[] {
  const out: string[] = [];
  for (const sp of SPECIES) {
    for (let st = 1; st <= 5; st++) out.push(`${sp.id}-${st}`);
    if (BRANCHES[sp.id]) out.push(`${sp.id}-5b`);
  }
  return out;
}

export const TOTAL_FORMS = allForms().length;

/** Forms a student's creature has shown so far: every stage up to the current one (and its chosen path). */
export function formsOf(s: Pick<Student, 'speciesId' | 'bestStage' | 'branch' | 'evolutionLog'>): string[] {
  const keys = new Set<string>();
  for (let st = 1; st <= s.bestStage; st++) keys.add(formKey(s.speciesId, st as Stage, st === 5 ? s.branch : undefined));
  for (const e of s.evolutionLog ?? []) keys.add(formKey(e.speciesId, e.stage, e.branch));
  return [...keys];
}

/** Add forms to a class's discoveries. Discoveries are never taken away, even if a creature changes. */
export function withDiscovered(c: ClassRoom, keys: string[]): { cls: ClassRoom; added: string[] } {
  const have = new Set(c.discovered ?? []);
  const added = keys.filter((k) => !have.has(k));
  if (!added.length) return { cls: c, added };
  return { cls: { ...c, discovered: [...(c.discovered ?? []), ...added] }, added };
}

/** Record the current forms of the given students in their classes. Returns the new data and what was new. */
export function recordDiscoveries(data: AppData, studentIds: string[]): { data: AppData; added: string[] } {
  const ids = new Set(studentIds);
  const byClass = new Map<string, string[]>();
  for (const s of data.students) if (ids.has(s.id)) byClass.set(s.classId, [...(byClass.get(s.classId) ?? []), ...formsOf(s)]);
  if (!byClass.size) return { data, added: [] };
  const added: string[] = [];
  const classes = data.classes.map((c) => {
    const keys = byClass.get(c.id);
    if (!keys) return c;
    const r = withDiscovered(c, keys);
    added.push(...r.added);
    return r.cls;
  });
  return added.length ? { data: { ...data, classes }, added } : { data, added };
}

export interface CollectionStats { discovered: number; total: number; pct: number; species: number; mythical: number }

export function collectionStats(c: Pick<ClassRoom, 'discovered'> | undefined): CollectionStats {
  const d = new Set(c?.discovered ?? []);
  const species = new Set([...d].map((k) => k.replace(/-\d+b?$/, ''))).size;
  const mythical = [...d].filter((k) => k.endsWith('-5b')).length;
  return { discovered: d.size, total: TOTAL_FORMS, pct: d.size / TOTAL_FORMS, species, mythical };
}
