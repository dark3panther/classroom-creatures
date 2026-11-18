import { ACHIEVEMENTS_BY_ID } from '../../data/defaults';
import { SPECIES_BY_ID } from '../../data/species';
import type { AdventureLogEntry, AdventureLogKind, AppData, RegionId } from '../../types';

export type JournalFilter = 'all' | 'quests' | 'regions' | 'bosses' | 'treasures' | 'milestones';

export interface JournalEntry {
  id: string;
  at: number;
  kind: AdventureLogKind | 'achievement' | 'evolution';
  group: Exclude<JournalFilter, 'all'>;
  title: string;
  detail?: string;
  regionId?: RegionId;
  xp?: number;
  coins?: number;
  itemId?: string;
  /** a moment of the whole class rather than of this student */
  classWide: boolean;
}

export function groupOf(kind: JournalEntry['kind']): JournalEntry['group'] {
  if (kind.startsWith('quest-')) return 'quests';
  if (kind.startsWith('boss-')) return 'bosses';
  if (kind === 'treasure') return 'treasures';
  if (kind.startsWith('region-')) return 'regions';
  return 'milestones';
}

const fromLog = (e: AdventureLogEntry): JournalEntry => ({
  id: e.id, at: e.at, kind: e.kind, group: groupOf(e.kind), title: e.title, detail: e.detail, regionId: e.regionId,
  xp: e.xp, coins: e.coins, itemId: e.itemId, classWide: !e.studentId,
});

/**
 * One student's adventure journal, newest first: their quests, treasure and explorations, the class's
 * bosses, regions and decorations, plus their badges and evolutions.
 */
export function journalFor(data: AppData, studentId: string, filter: JournalFilter = 'all'): JournalEntry[] {
  const s = data.students.find((x) => x.id === studentId);
  if (!s) return [];
  const out: JournalEntry[] = data.adventureLog
    .filter((e) => e.studentId === studentId || (!e.studentId && e.classId === s.classId && e.kind !== 'quest-submitted'))
    .map(fromLog);
  for (const a of s.achievements) {
    const def = ACHIEVEMENTS_BY_ID[a.id];
    if (def) out.push({ id: `ach-${a.id}`, at: a.at, kind: 'achievement', group: 'milestones', title: `Badge: ${def.name}`, detail: def.description, classWide: false });
  }
  const sp = SPECIES_BY_ID[s.speciesId];
  for (const ev of s.evolutionLog ?? []) {
    out.push({ id: `evo-${ev.stage}-${ev.at}`, at: ev.at, kind: 'evolution', group: 'milestones', title: `${s.nickname || sp?.name || 'Your creature'} evolved`, detail: `Reached stage ${ev.stage}.`, classWide: false });
  }
  return out.filter((e) => filter === 'all' || e.group === filter).sort((a, b) => b.at - a.at);
}

/** The class's adventure history for the teacher, newest first. */
export function classHistory(data: AppData, classId: string, filter: JournalFilter = 'all', limit = 200): JournalEntry[] {
  const names = new Map(data.students.map((s) => [s.id, s.name]));
  return data.adventureLog
    .filter((e) => e.classId === classId)
    .map((e) => ({ ...fromLog(e), title: e.studentId ? `${names.get(e.studentId)?.split(' ')[0] ?? 'A student'}: ${e.title}` : e.title }))
    .filter((e) => filter === 'all' || e.group === filter)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}
