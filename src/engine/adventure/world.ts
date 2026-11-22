import { AP, LOCATIONS_BY_ID, QUEST_DECORATIONS, REGIONS, REGIONS_BY_ID, TREASURES } from '../../data/adventure';
import { SPECIES } from '../../data/species';
import type { AppData, LocationId, RegionId, Student } from '../../types';
import { allForms } from '../collection';
import { AdventureError, type Actor, type AdventureResult, type Ctx, addLog, classAdv, ctxOf, getClass, getStudent, patchClassAdv, patchStudentAdv, refreshBadges, requireSelfOrTeacher, requireTeacher, result } from './core';

export const isDone = (status: string) => status === 'approved' || status === 'collected';

/** Adventure points of a class, and what they are made of. Derived, never stored. */
export function adventurePoints(data: AppData, classId: string): { total: number; xp: number; quests: number; bosses: number; students: number } {
  const students = data.students.filter((s) => s.classId === classId);
  const ids = new Set(students.map((s) => s.id));
  const quests = data.questRecords.filter((r) => ids.has(r.studentId) && isDone(r.status)).length;
  const xp = students.reduce((n, s) => n + Math.max(0, s.lifetimeXp ?? s.xp), 0);
  // every boss counts once, however many times the class befriends it again in lesson battles
  const bosses = new Set(data.bosses.filter((b) => b.classId === classId && b.status === 'won').map((b) => b.bossId)).size;
  const n = Math.max(1, students.length);
  const total = Math.floor((xp / AP.xpPerPoint + AP.perQuest * quests) / n) + AP.perBoss * bosses;
  return { total, xp, quests, bosses, students: students.length };
}

export interface RegionState {
  id: RegionId;
  open: boolean;
  /** why: the first region, reached by points, opened or closed by the teacher, or still locked */
  why: 'start' | 'points' | 'teacher-open' | 'teacher-locked' | 'locked';
  need: number;
  ap: number;
}

/** Every region's state for one class, computed once. */
export function regionStates(data: AppData, classId: string): Record<RegionId, RegionState> {
  const cls = data.classes.find((c) => c.id === classId);
  const adv = classAdv(cls);
  const ap = adventurePoints(data, classId).total;
  const out = {} as Record<RegionId, RegionState>;
  for (const r of REGIONS) {
    const o = adv.regions[r.id];
    let why: RegionState['why'];
    if (o === 'locked' && r.id !== 'verdant') why = 'teacher-locked';
    else if (o === 'open') why = 'teacher-open';
    else if (r.id === 'verdant') why = 'start';
    else if (adv.opened.includes(r.id) || ap >= r.unlockAp) why = 'points';
    else why = 'locked';
    out[r.id] = { id: r.id, open: why !== 'teacher-locked' && why !== 'locked', why, need: r.unlockAp, ap };
  }
  return out;
}

export const regionOpen = (data: AppData, classId: string, regionId: RegionId) => regionStates(data, classId)[regionId]?.open ?? false;

/** Class decorations earned so far: a statue for every boss befriended, and quest milestones. */
export function classDecorations(data: AppData, classId: string): { id: string; name: string; kind: 'statue' | 'quest'; bossId?: string }[] {
  const out: { id: string; name: string; kind: 'statue' | 'quest'; bossId?: string }[] = [];
  const seen = new Set<string>();
  for (const b of data.bosses) {
    if (b.classId !== classId || b.status !== 'won' || seen.has(b.bossId)) continue;
    seen.add(b.bossId);
    out.push({ id: `statue-${b.bossId}`, name: 'Statue', kind: 'statue', bossId: b.bossId });
  }
  const done = adventurePoints(data, classId).quests;
  for (const d of QUEST_DECORATIONS) if (done >= d.quests) out.push({ id: d.id, name: d.name, kind: 'quest' });
  return out;
}

/** Open regions the class has reached and announce new decorations, once each. Idempotent. */
export function syncWorld(c: Ctx, classId: string): void {
  const cls = c.data.classes.find((x) => x.id === classId);
  if (!cls || !c.data.settings.adventureEnabled) return;
  const states = regionStates(c.data, classId);
  const adv = classAdv(cls);
  const fresh = REGIONS.filter((r) => states[r.id].why === 'points' && !adv.opened.includes(r.id)).map((r) => r.id);
  if (fresh.length) {
    patchClassAdv(c, classId, (a) => ({ ...a, opened: [...a.opened, ...fresh] }));
    for (const id of fresh) {
      addLog(c, { kind: 'region-unlocked', classId, regionId: id, ref: id, title: `${REGIONS_BY_ID[id].name} is open`, detail: 'The class earned enough adventure points.' });
      c.notes.push({ type: 'region-opened', classId, regionId: id });
    }
  }
  const decos = classDecorations(c.data, classId).filter((d) => d.kind === 'quest' && !adv.milestones.includes(d.id));
  if (decos.length) {
    patchClassAdv(c, classId, (a) => ({ ...a, milestones: [...a.milestones, ...decos.map((d) => d.id)] }));
    for (const d of decos) {
      addLog(c, { kind: 'milestone', classId, ref: d.id, title: `New decoration: ${d.name}`, detail: 'For all the quests the class has completed.' });
      c.notes.push({ type: 'decoration', classId, id: d.id, name: d.name });
    }
  }
}

/** Teacher: open a region early, close it, or go back to points ('auto'). Verdant Valley is always open. */
export function setRegion(data: AppData, actor: Actor, classId: string, regionId: RegionId, mode: 'open' | 'locked' | 'auto', now = Date.now()): AdventureResult {
  requireTeacher(actor, 'open or close regions');
  getClass(data, classId);
  if (!REGIONS_BY_ID[regionId]) throw new AdventureError('There is no such region.', 'missing');
  if (regionId === 'verdant' && mode === 'locked') throw new AdventureError('Verdant Valley is where every adventure starts, so it always stays open.', 'invalid');
  const c = ctxOf(data, now);
  const wasOpen = regionOpen(data, classId, regionId);
  patchClassAdv(c, classId, (a) => {
    const regions = { ...a.regions };
    if (mode === 'auto') delete regions[regionId];
    else regions[regionId] = mode;
    return { ...a, regions, opened: mode === 'open' && !a.opened.includes(regionId) ? [...a.opened, regionId] : a.opened };
  });
  const isOpen = regionOpen(c.data, classId, regionId);
  if (isOpen !== wasOpen) {
    const name = REGIONS_BY_ID[regionId].name;
    addLog(c, isOpen
      ? { kind: 'region-unlocked', classId, regionId, ref: regionId, title: `${name} is open`, detail: 'Opened by your teacher.' }
      : { kind: 'region-locked', classId, regionId, ref: regionId, title: `${name} is closed for now`, detail: 'Closed by your teacher.' });
    if (isOpen) c.notes.push({ type: 'region-opened', classId, regionId });
  }
  syncWorld(c, classId);
  return result(c);
}

/** Explore a region (a student for themself, or the teacher for the whole class or some students). */
export function visitRegion(data: AppData, actor: Actor, studentIds: string[], regionId: RegionId, now = Date.now()): AdventureResult {
  const c = ctxOf(data, now);
  const region = REGIONS_BY_ID[regionId];
  if (!region) throw new AdventureError('There is no such region.', 'missing');
  const visitedNow: string[] = [];
  for (const sid of new Set(studentIds)) {
    requireSelfOrTeacher(actor, sid, 'explore');
    const s = getStudent(c.data, sid);
    if (!regionOpen(c.data, s.classId, regionId)) throw new AdventureError(`${region.name} is not open yet.`, 'state');
    if (s.adventure?.visited.some((v) => v.regionId === regionId)) continue;
    patchStudentAdv(c, sid, (a) => ({ ...a, visited: [...a.visited, { regionId, at: now }] }));
    addLog(c, { kind: 'region-visited', classId: s.classId, studentId: sid, regionId, ref: regionId, title: `Explored ${region.name}`, detail: `Found ${region.landmark}.` });
    c.notes.push({ type: 'visited', studentId: sid, regionId });
    visitedNow.push(sid);
  }
  refreshBadges(c, visitedNow);
  return result(c);
}

/** Location stage (0 = not built yet) and what the next stage needs. */
export function locationState(data: AppData, classId: string, id: LocationId): { stage: number; next: number | null; canUpgrade: boolean; ap: number } {
  const def = LOCATIONS_BY_ID[id];
  const cls = data.classes.find((c) => c.id === classId);
  const stage = Math.min(3, Math.max(0, classAdv(cls).locations[id] ?? 0));
  const ap = adventurePoints(data, classId).total;
  const next = stage < 3 ? def.stages[stage] : null;
  return { stage, next, canUpgrade: next !== null && ap >= next, ap };
}

/** Teacher: build or upgrade a location of the shared class world once the class has the points. */
export function upgradeLocation(data: AppData, actor: Actor, classId: string, id: LocationId, now = Date.now()): AdventureResult {
  requireTeacher(actor, 'build in the class world');
  getClass(data, classId);
  const def = LOCATIONS_BY_ID[id];
  if (!def) throw new AdventureError('There is no such place.', 'missing');
  if (!data.settings.classWorld) throw new AdventureError('The shared class world is switched off in Settings.', 'state');
  const st = locationState(data, classId, id);
  if (st.next === null) throw new AdventureError(`${def.name} is already fully built.`, 'state');
  if (!st.canUpgrade) throw new AdventureError(`${def.name} needs ${st.next} adventure points (the class has ${st.ap}).`, 'state');
  const c = ctxOf(data, now);
  patchClassAdv(c, classId, (a) => ({ ...a, locations: { ...a.locations, [id]: st.stage + 1 } }));
  addLog(c, { kind: 'location-upgraded', classId, ref: id, title: `${def.stageNames[st.stage]} built`, detail: `${def.name} grew to stage ${st.stage + 1}.` });
  return result(c);
}

/** How much of a region one student has completed (0..1): quests, treasure and the region's creatures. */
export function regionCompletion(data: AppData, s: Student, regionId: RegionId): { pct: number; quests: [number, number]; treasures: [number, number]; creatures: [number, number] } {
  const region = REGIONS_BY_ID[regionId];
  const quests = data.quests.filter((q) => q.regionId === regionId && !q.deleted && (q.classId === null || q.classId === s.classId) && (q.assign === 'class' || q.assign.includes(s.id)));
  const doneIds = new Set(data.questRecords.filter((r) => r.studentId === s.id && isDone(r.status)).map((r) => r.questId));
  const qDone = quests.filter((q) => doneIds.has(q.id)).length;
  const regionTreasures = TREASURES.filter((t) => t.regionId === regionId);
  const opened = new Set((s.adventure?.treasures ?? []).map((t) => t.id));
  const tDone = regionTreasures.filter((t) => opened.has(t.id)).length;
  const species = new Set(SPECIES.filter((sp) => region.elements.includes(sp.element)).map((sp) => sp.id));
  const forms = allForms().filter((k) => species.has(k.split('-')[0]));
  const disc = new Set(data.classes.find((c) => c.id === s.classId)?.discovered ?? []);
  const cDone = forms.filter((k) => disc.has(k)).length;
  const parts = [quests.length ? qDone / quests.length : null, regionTreasures.length ? tDone / regionTreasures.length : null, forms.length ? cDone / forms.length : null].filter((x): x is number => x !== null);
  const pct = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  return { pct, quests: [qDone, quests.length], treasures: [tDone, regionTreasures.length], creatures: [cDone, forms.length] };
}
