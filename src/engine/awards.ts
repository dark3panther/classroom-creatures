import { ACHIEVEMENTS, ITEMS } from '../data/defaults';
import type { AchievementDef } from '../data/defaults';
import type { AppData, AwardEvent, AwardOutcome, Category, Challenge, ClassRoom, MilestoneReward, Settings, Stage, Student } from '../types';
import { collectionStats, recordDiscoveries } from './collection';
import { autoEvolutionEntries } from './evolution';
import { displayStage, levelForXp, stageFloorXp, stageForXp } from './progression';
import { dayKey, periodStart, uid, weekKey } from './util';

type Prog = Pick<Settings, 'levelXp' | 'evolutionLevels'> & { evolutionMode?: Settings['evolutionMode'] };

/** Synthetic category used for a teacher's manual XP correction. */
export const ADJUST_CATEGORY_ID = 'teacher-adjust';

export function achievementMet(def: AchievementDef, s: Student, settings: Prog): boolean {
  const r = def.rule;
  switch (r.kind) {
    case 'xp': return s.xp >= r.min;
    case 'tagXp': return (s.tagXp[r.tag] ?? 0) >= r.min;
    case 'tagCount': {
      const tags = Array.isArray(r.tag) ? r.tag : [r.tag];
      return tags.reduce((n, t) => n + (s.tagCounts[t] ?? 0), 0) >= r.min;
    }
    case 'stage': return displayStage(s, settings) >= r.min;
    case 'level': return levelForXp(s.xp, settings.levelXp) >= r.min;
    case 'challenges': return s.challengeCompletions.length >= r.min;
    case 'items': return s.unlockedItems.filter((id) => id !== 'bg-habitat').length >= r.min;
    case 'equipped': return Object.entries(s.equipped).filter(([slot, id]) => id && !(slot === 'background' && id === 'bg-habitat')).length >= r.min;
    case 'skills': return Object.values(s.skills ?? {}).filter((v) => v > 0).length >= r.min;
    case 'skillMax': return Object.values(s.skills ?? {}).some((v) => v >= r.min);
    case 'branch': return s.bestStage >= 5 && s.branch === 'b';
    case 'interactions': { const i = s.interactions; return (i ? i.pet + i.feed + i.play : 0) >= r.min; }
  }
}

/**
 * Every item this student qualifies for (always includes free items). `cls` is the student's class,
 * needed for collection rewards; without it collection items are left as they are.
 */
export function qualifiedItems(s: Student, settings: Prog, cls?: Pick<ClassRoom, 'discovered'>): string[] {
  const level = levelForXp(s.xp, settings.levelXp);
  const stage = displayStage(s, settings);
  const have = new Set(s.achievements.map((a) => a.id));
  const pct = cls ? collectionStats(cls).pct : -1;
  return ITEMS.filter((it) => {
    const u = it.unlock;
    if (u.type === 'free') return true;
    if (u.type === 'level') return level >= u.level;
    if (u.type === 'achievement') return have.has(u.id);
    if (u.type === 'shop') return false; // bought with coins, never auto-unlocked
    if (u.type === 'stage') return stage >= u.stage;
    if (u.type === 'collection') return pct >= u.pct || (pct < 0 && s.unlockedItems.includes(it.id));
    return s.challengeCompletions.length >= u.count;
  }).map((i) => i.id);
}

/** Items that can only be unlocked (never bought) stay owned forever once a collection reward is reached. */
function keepsOnUndo(id: string): boolean {
  const it = ITEMS.find((i) => i.id === id);
  return !!it && (it.unlock.type === 'shop' || it.unlock.type === 'collection');
}

export function periodKey(period: Challenge['period'], t: number): string {
  return period === 'daily' ? dayKey(t) : weekKey(t);
}

/** Progress of one student on one challenge in the period containing `now`. */
export function challengeProgress(c: Challenge, studentId: string, events: AwardEvent[], now: number): { value: number; done: boolean } {
  const from = periodStart(c.period, now);
  let value = 0;
  for (const e of events) {
    if (e.studentId !== studentId || e.undone || e.at < from || e.at > now) continue;
    if (c.metric === 'xp') value += Math.max(0, e.xp);
    else if (!c.tag || e.tag === c.tag) { if (e.xp > 0) value += 1; }
  }
  return { value: Math.min(value, c.target), done: value >= c.target };
}

/**
 * Re-derive achievements, items and challenge completions after XP changed.
 * Only ever ADDS. Returns the newly unlocked ids.
 */
function refreshUnlocks(s: Student, data: AppData, now: number) {
  const newChallenges: string[] = [];
  for (const c of data.challenges) {
    if (!c.active) continue;
    const key = periodKey(c.period, now);
    if (s.challengeCompletions.some((cc) => cc.challengeId === c.id && cc.periodKey === key)) continue;
    if (challengeProgress(c, s.id, data.events, now).done) {
      s.challengeCompletions = [...s.challengeCompletions, { challengeId: c.id, periodKey: key, at: now }];
      newChallenges.push(c.id);
    }
  }
  const newAchievements: string[] = [];
  const have = new Set(s.achievements.map((a) => a.id));
  for (const def of ACHIEVEMENTS) {
    if (!have.has(def.id) && achievementMet(def, s, data.settings)) {
      s.achievements = [...s.achievements, { id: def.id, at: now }];
      newAchievements.push(def.id);
    }
  }
  const owned = new Set(s.unlockedItems);
  const cls = data.classes.find((c) => c.id === s.classId);
  const newItems = qualifiedItems(s, data.settings, cls).filter((id) => !owned.has(id));
  if (newItems.length) s.unlockedItems = [...s.unlockedItems, ...newItems];
  return { newAchievements, newItems, newChallenges };
}

/** Re-run unlock checks for one student (after an evolution, a purchase or a skill change). */
export function refreshStudent(data: AppData, studentId: string, now = Date.now()): { data: AppData; newAchievements: string[]; newItems: string[] } {
  const st = data.students.find((s) => s.id === studentId);
  if (!st) return { data, newAchievements: [], newItems: [] };
  const copy: Student = { ...st };
  const un = refreshUnlocks(copy, data, now);
  return { data: { ...data, students: data.students.map((s) => (s.id === studentId ? copy : s)) }, newAchievements: un.newAchievements, newItems: un.newItems };
}

/** Milestone rewards newly reached (e.g. a chocolate every 100 XP earned). */
export function milestoneRewardsFor(s: Student, milestones: AppData['settings']['milestones'], now: number): MilestoneReward[] {
  const out: MilestoneReward[] = [];
  for (const m of milestones) {
    if (!m.every || m.every <= 0) continue;
    const reached = Math.floor((s.lifetimeXp ?? 0) / m.every);
    const have = (s.milestoneRewards ?? []).filter((r) => r.milestoneId === m.id).length;
    for (let i = have + 1; i <= reached; i++) {
      out.push({ id: `${s.id}-${m.id}-${i}-${now}`, milestoneId: m.id, label: m.label, icon: m.icon, atXp: i * m.every, at: now, given: false });
    }
  }
  return out;
}

/** Buy a shop item with coins. Returns null when not affordable / already owned / not a shop item. */
export function buyItem(data: AppData, studentId: string, itemId: string, price: number): AppData | null {
  const s = data.students.find((x) => x.id === studentId);
  if (!s || s.unlockedItems.includes(itemId) || (s.coins ?? 0) < price) return null;
  return { ...data, students: data.students.map((x) => (x.id === studentId ? { ...x, coins: (x.coins ?? 0) - price, unlockedItems: [...x.unlockedItems, itemId] } : x)) };
}

export interface AwardResult {
  data: AppData;
  outcomes: AwardOutcome[];
  batchId: string;
}

/**
 * Award a behaviour category to one or more students. Pure: returns new data.
 * Negative categories are ignored unless enabled, and can never push a student
 * below the start of their current evolution stage (creatures never de-evolve).
 */
export function applyAward(data: AppData, studentIds: string[], categoryId: string, now = Date.now(), adjust?: { xp: number; note?: string }): AwardResult {
  const cat: Category | undefined = adjust
    ? { id: ADJUST_CATEGORY_ID, name: adjust.note?.trim() ? `Teacher adjustment: ${adjust.note.trim()}` : 'Teacher adjustment', xp: Math.round(adjust.xp), icon: '✏️', color: '#46584c', tag: 'other' }
    : data.categories.find((c) => c.id === categoryId);
  const batchId = uid('b');
  if (!cat || cat.xp === 0 || (cat.xp < 0 && !adjust && !data.settings.negativeEnabled) || studentIds.length === 0) {
    return { data, outcomes: [], batchId };
  }
  const auto = data.settings.evolutionMode !== 'approval';
  const ids = new Set(studentIds);
  const newEvents: AwardEvent[] = [];
  const students = data.students.map((s) => {
    if (!ids.has(s.id)) return s;
    const stageBefore = stageForXp(s.xp, data.settings);
    let applied = cat.xp;
    // behaviour deductions never undo an evolution; a teacher correction may go down to 0 (the stage shown is kept)
    if (applied < 0) applied = adjust ? Math.max(applied, -s.xp) : Math.max(applied, stageFloorXp(stageBefore, data.settings) - s.xp);
    // corrections never mint coins
    const coins = applied > 0 && !adjust ? Math.round(applied * (data.settings.coinRate ?? 1)) : 0;
    newEvents.push({
      id: uid('e'), classId: s.classId, studentId: s.id, batchId, categoryId: cat.id, categoryName: cat.name,
      icon: cat.icon, tag: cat.tag, xp: applied, at: now, bestStageBefore: s.bestStage, coins,
      ...(adjust ? { adjust: true, ...(adjust.note?.trim() ? { note: adjust.note.trim() } : {}) } : {}),
    });
    const tagCounts = { ...s.tagCounts };
    const tagXp = { ...s.tagXp };
    if (cat.xp > 0 && !adjust) {
      tagCounts[cat.tag] = (tagCounts[cat.tag] ?? 0) + 1;
      tagXp[cat.tag] = (tagXp[cat.tag] ?? 0) + applied;
    }
    return { ...s, xp: Math.max(0, s.xp + applied), tagCounts, tagXp, coins: (s.coins ?? 0) + coins, lifetimeXp: (s.lifetimeXp ?? s.xp) + Math.max(0, applied) };
  });

  const next: AppData = { ...data, students, events: [...data.events, ...newEvents] };
  const outcomes: AwardOutcome[] = [];
  next.students = next.students.map((s) => {
    if (!ids.has(s.id)) return s;
    const before = data.students.find((b) => b.id === s.id)!;
    const copy: Student = { ...s };
    const stageAfter = stageForXp(copy.xp, data.settings);
    const evolved = auto && stageAfter > before.bestStage;
    if (evolved) {
      copy.bestStage = stageAfter;
      copy.evolutionLog = [...(copy.evolutionLog ?? []), ...autoEvolutionEntries(copy, before.bestStage, stageAfter, now)];
      if (stageAfter === 5 && !copy.branch) copy.branch = undefined; // automatic mode keeps the classic path until a teacher picks
    }
    const readyToEvolve = !auto && stageAfter > before.bestStage && stageForXp(before.xp, data.settings) <= before.bestStage;
    const un = refreshUnlocks(copy, next, now);
    const newMilestoneRewards = milestoneRewardsFor(copy, data.settings.milestones ?? [], now);
    if (newMilestoneRewards.length) copy.milestoneRewards = [...(copy.milestoneRewards ?? []), ...newMilestoneRewards];
    outcomes.push({
      studentId: s.id,
      xp: copy.xp - before.xp,
      levelBefore: levelForXp(before.xp, data.settings.levelXp),
      levelAfter: levelForXp(copy.xp, data.settings.levelXp),
      stageBefore: stageForXp(before.xp, data.settings),
      stageAfter,
      evolved,
      newAchievements: un.newAchievements,
      newItems: un.newItems,
      completedChallenges: un.newChallenges,
      coins: (copy.coins ?? 0) - (before.coins ?? 0),
      newMilestoneRewards,
      readyToEvolve,
      discovered: [],
    });
    return copy;
  });
  // evolutions reveal new forms in the class encyclopedia
  const evolvedIds = outcomes.filter((o) => o.evolved).map((o) => o.studentId);
  if (evolvedIds.length) {
    const disc = recordDiscoveries(next, evolvedIds);
    for (const o of outcomes) {
      const st = disc.data.students.find((x) => x.id === o.studentId);
      if (st && o.evolved) o.discovered = disc.added.filter((k) => k.startsWith(`${st.speciesId}-`));
    }
    return { data: disc.data, outcomes, batchId };
  }
  return { data: next, outcomes, batchId };
}

/**
 * Reverse every award in a batch. Anything unlocked only because of that batch
 * (and no longer earned) is taken back too, so an accidental click leaves no trace.
 */
export function undoBatch(data: AppData, batchId: string): AppData {
  const batch = data.events.filter((e) => e.batchId === batchId && !e.undone);
  if (!batch.length) return data;
  const byStudent = new Map(batch.map((e) => [e.studentId, e]));
  const events = data.events.map((e) => (e.batchId === batchId ? { ...e, undone: true } : e));
  const students = data.students.map((s) => {
    const e = byStudent.get(s.id);
    if (!e) return s;
    const tagCounts = { ...s.tagCounts };
    const tagXp = { ...s.tagXp };
    if (e.xp > 0) {
      tagCounts[e.tag] = Math.max(0, (tagCounts[e.tag] ?? 0) - 1);
      tagXp[e.tag] = Math.max(0, (tagXp[e.tag] ?? 0) - e.xp);
    }
    const xp = Math.max(0, s.xp - e.xp);
    const lifetimeXp = Math.max(0, (s.lifetimeXp ?? s.xp) - Math.max(0, e.xp));
    const coins = Math.max(0, (s.coins ?? 0) - (e.coins ?? 0));
    // milestone rewards earned by this award and not handed out yet are taken back
    const milestoneRewards = (s.milestoneRewards ?? []).filter((r) => r.given || r.at < e.at || r.atXp <= lifetimeXp);
    const draft: Student = { ...s, xp, tagCounts, tagXp, lifetimeXp, coins, milestoneRewards };
    // an evolution that only happened because of this award is reversed (also one a teacher approved afterwards)
    draft.bestStage = Math.min(s.bestStage, Math.max(e.bestStageBefore ?? 1, stageForXp(xp, data.settings))) as Stage;
    if (draft.bestStage < s.bestStage) {
      draft.evolutionLog = (s.evolutionLog ?? []).filter((x) => x.stage <= draft.bestStage);
      if (draft.bestStage < 5) delete draft.branch;
    }
    // challenge completions unlocked at/after this event that are no longer met
    draft.challengeCompletions = s.challengeCompletions.filter((cc) => {
      if (cc.at < e.at) return true;
      const c = data.challenges.find((x) => x.id === cc.challengeId);
      return c ? challengeProgress(c, s.id, events, cc.at).done : true;
    });
    draft.achievements = s.achievements.filter((a) => {
      if (a.at < e.at) return true;
      const def = ACHIEVEMENTS.find((d) => d.id === a.id);
      return def ? achievementMet(def, draft, data.settings) : true;
    });
    const q = new Set(qualifiedItems(draft, data.settings));
    draft.unlockedItems = s.unlockedItems.filter((id) => q.has(id) || keepsOnUndo(id));
    const equipped = { ...s.equipped };
    for (const [slot, id] of Object.entries(equipped)) if (id && !q.has(id) && !keepsOnUndo(id)) delete equipped[slot as keyof typeof equipped];
    draft.equipped = equipped;
    return draft;
  });
  return { ...data, students, events };
}

/** Re-run unlock checks for every student (after the teacher edits the progression table). */
export function refreshAll(data: AppData, now = Date.now()): AppData {
  const next = { ...data };
  next.students = data.students.map((s) => {
    const copy = { ...s };
    if (data.settings.evolutionMode !== 'approval') {
      const to = Math.max(s.bestStage, stageForXp(s.xp, data.settings)) as Stage;
      if (to > s.bestStage) copy.evolutionLog = [...(s.evolutionLog ?? []), ...autoEvolutionEntries(s, s.bestStage, to, now)];
      copy.bestStage = to;
    }
    refreshUnlocks(copy, next, now);
    return copy;
  });
  return recordDiscoveries(next, next.students.map((s) => s.id)).data;
}
