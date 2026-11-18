import { create } from 'zustand';
import { DEFAULT_NEGATIVE_CATEGORIES, ITEMS_BY_ID } from '../data/defaults';
import { ADJUST_CATEGORY_ID, applyAward, refreshAll, refreshStudent as refreshStudentPure } from '../engine/awards';
import * as adv from '../engine/adventure';
import type { BattleSetup } from '../engine/adventure';
import { equipItem, purchase } from '../engine/shop';
import { raiseAbility as raiseAbilityPure, resetAbilities as resetAbilitiesPure } from '../engine/abilities';
import { approveEvolution as approveEvolutionPure, canChooseBranch, chooseBranch as chooseBranchPure, needsBranchChoice, pendingStage } from '../engine/evolution';
import { buildDemoData, removeDemo } from '../engine/demo';
import { validateProgression } from '../engine/progression';
import { migrate } from '../engine/backup';
import { addStudents as addStudentsPure, emptyData, newClass, pickSpecies, resetProgress as resetProgressPure } from '../engine/roster';
import { uid } from '../engine/util';
import type { AppData, AwardOutcome, Category, ClassRoom, ItemSlot, LocationId, Quest, RegionId, Settings, Stage, Student } from '../types';
import { addSnapshot, dailySnapshot, loadData, requestPersistence, scheduleSave } from './storage';

export type Celebration =
  | { id: string; type: 'evolution'; studentId: string; from: Stage; to: Stage; replay?: boolean; branch?: 'a' | 'b' }
  | { id: string; type: 'ready'; studentId: string; stage: Stage }
  | { id: string; type: 'levelup'; studentId: string; level: number }
  | { id: string; type: 'achievement'; studentId: string; achievementId: string }
  | { id: string; type: 'classGoal'; classId: string; goal: number }
  | { id: string; type: 'milestone'; studentId: string; label: string; icon: string; atXp: number; others?: string[] }
  // World of Adventures
  | { id: string; type: 'quest'; studentId: string; questId: string; waiting: boolean; others?: string[] }
  | { id: string; type: 'bossWon'; classId: string; bossId: string; battleId: string }
  | { id: string; type: 'region'; classId: string; regionId: RegionId }
  | { id: string; type: 'treasure'; studentId: string; treasureId: string; coins: number; itemId?: string }
  | { id: string; type: 'decoration'; classId: string; name: string };

export interface Pulse { n: number; xp: number; icon: string; coins: number; kind: 'good' | 'bad'; categoryId: string; levelUp: boolean; achievement: boolean; milestone: boolean }

export interface LastAward { batchId: string; label: string; icon: string; count: number; xp: number; at: number }

export type ToastTone = 'info' | 'success' | 'warn';

interface UiState {
  ready: boolean;
  celebrations: Celebration[];
  pulses: Record<string, Pulse>;
  lastAward: LastAward | null;
  toast: { id: string; text: string; tone: ToastTone } | null;
  locked: boolean;
  /** the final-path chooser is open for this student */
  branchPick: { studentId: string; mode: 'approve' | 'choose' } | null;
}

interface Actions {
  init: () => Promise<void>;
  award: (studentIds: string[], categoryId: string) => AwardOutcome[];
  undo: (batchId: string) => void;
  /** buy with coins: checks price overrides, season, teacher switches and duplicates */
  buy: (studentId: string, itemId: string) => boolean;
  setRewardGiven: (studentId: string, rewardId: string, given: boolean) => void;
  /** spin result for a class whose goal was reached: records the prize and raises the goal */
  recordPrize: (classId: string, prizeId: string) => void;
  dismissCelebration: (id: string) => void;
  replayEvolution: (studentId: string, stage: Stage) => void;
  /** confirm a pending evolution (approval mode); `branch` picks the final path where a species branches */
  approveEvolution: (studentId: string, branch?: 'a' | 'b') => boolean;
  /** pick the final path for a creature that reached its final stage without choosing */
  chooseBranch: (studentId: string, branch: 'a' | 'b') => boolean;
  /** teacher correction of a student's XP (logged, undoable, never changes coins) */
  adjustXp: (studentId: string, delta: number, note?: string) => boolean;
  /** one entry point for "Evolve": approves, or opens the path chooser when this evolution branches */
  startEvolution: (studentId: string) => void;
  /** spend a skill point on an ability (cosmetic) */
  raiseAbility: (studentId: string, abilityId: string) => boolean;
  resetAbilities: (studentId: string) => void;
  /** cosmetic interaction (pet / feed / play): only counts toward the Best Friends badge */
  interact: (studentId: string, kind: 'pet' | 'feed' | 'play') => void;
  /** teacher only: start one student's game progress over (a safety snapshot is saved first) */
  resetStudent: (studentId: string) => Promise<void>;
  closeBranchPick: () => void;
  notify: (text: string, tone?: ToastTone) => void;
  setLocked: (v: boolean) => void;

  setCurrentClass: (id: string) => void;
  createClass: (name: string, grade: string) => string;
  updateClass: (id: string, patch: Partial<ClassRoom>) => void;
  deleteClass: (id: string) => Promise<void>;

  addStudents: (classId: string, names: string[]) => number;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => Promise<void>;
  moveStudent: (id: string, classId: string) => void;
  assignSpecies: (id: string, speciesId: string) => void;
  randomizeSpecies: (id: string) => void;
  randomizeClass: (classId: string) => void;
  equip: (id: string, slot: ItemSlot, itemId: string | null) => void;

  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  /* World of Adventures. Teacher actions need controls unlocked; `as` is the student using the kiosk while locked. */
  saveQuest: (q: Quest) => boolean;
  duplicateQuest: (id: string) => string | null;
  deleteQuest: (id: string) => boolean;
  submitQuest: (questId: string, studentId: string, note?: string) => boolean;
  approveQuest: (recordId: string) => boolean;
  rejectQuest: (recordId: string, reason: string) => boolean;
  collectQuest: (recordId: string) => boolean;
  approveAllQuests: (classId: string) => boolean;
  collectAllQuests: (classId: string) => boolean;
  startBattle: (setup: BattleSetup) => boolean;
  controlBattle: (battleId: string, action: 'pause' | 'resume' | 'end') => boolean;
  classActivity: (classId: string, amount: number, label: string) => boolean;
  setRegion: (classId: string, regionId: RegionId, mode: 'open' | 'locked' | 'auto') => boolean;
  visitRegion: (studentIds: string[], regionId: RegionId) => boolean;
  upgradeLocation: (classId: string, id: LocationId) => boolean;
  openTreasure: (studentId: string, treasureId: string) => boolean;
  /** run the boss battle clock (App calls this every minute) */
  tickAdventure: () => void;
  updateSettings: (patch: Partial<Settings>) => string | null;

  replaceData: (data: AppData, reason: string) => Promise<void>;
  clearDemo: () => Promise<void>;
  addDemo: () => void;
  snapshot: (reason: string) => Promise<void>;
}

export type Store = UiState & { data: AppData } & Actions;

const id = () => uid('u');

export const useStore = create<Store>()((set, get) => {
  /** Commit a data change: update state and auto-save. */
  const commit = (data: AppData) => {
    set({ data });
    scheduleSave(data);
  };

  /** The person acting: the teacher when controls are unlocked, otherwise the student at the kiosk. */
  const actorFor = (studentId?: string): adv.Actor | null => (!get().locked ? adv.TEACHER : studentId ? adv.asStudent(studentId) : null);

  /** Celebrations for adventure moments and for the levels, evolutions and treats rewards brought. */
  const adventureCelebrations = (r: adv.AdventureResult): Celebration[] => {
    const out: Celebration[] = [];
    for (const o of r.outcomes) {
      for (const m of o.newMilestoneRewards) out.push({ id: id(), type: 'milestone', studentId: o.studentId, label: m.label, icon: m.icon, atXp: m.atXp });
      if (o.evolved) out.push({ id: id(), type: 'evolution', studentId: o.studentId, from: o.stageBefore, to: o.stageAfter });
      else if (o.readyToEvolve) out.push({ id: id(), type: 'ready', studentId: o.studentId, stage: o.stageAfter });
      else if (o.levelAfter > o.levelBefore && r.outcomes.length <= 3) out.push({ id: id(), type: 'levelup', studentId: o.studentId, level: o.levelAfter });
    }
    const quests = r.notes.filter((n): n is Extract<adv.AdventureNote, { type: 'quest-done' }> => n.type === 'quest-done' && !n.waiting);
    if (quests.length) out.push({ id: id(), type: 'quest', studentId: quests[0].studentId, questId: quests[0].questId, waiting: false, ...(quests.length > 1 ? { others: quests.slice(1).map((q) => q.studentId) } : {}) });
    const achievements = r.notes.filter((n): n is Extract<adv.AdventureNote, { type: 'achievement' }> => n.type === 'achievement');
    if (achievements.length <= 3) for (const a of achievements) out.push({ id: id(), type: 'achievement', studentId: a.studentId, achievementId: a.achievementId });
    for (const n of r.notes) {
      if (n.type === 'boss-won') out.push({ id: id(), type: 'bossWon', classId: n.classId, bossId: n.bossId, battleId: n.battleId });
      else if (n.type === 'region-opened') out.push({ id: id(), type: 'region', classId: n.classId, regionId: n.regionId });
      else if (n.type === 'treasure') out.push({ id: id(), type: 'treasure', studentId: n.studentId, treasureId: n.treasureId, coins: n.coins, itemId: n.itemId });
      else if (n.type === 'decoration') out.push({ id: id(), type: 'decoration', classId: n.classId, name: n.name });
    }
    return out;
  };

  /** A newly given item goes straight on when its slot is empty (not backgrounds). */
  const wearNew = (data: AppData, pairs: { studentId: string; itemId?: string }[]): AppData => {
    let d = data;
    for (const { studentId, itemId } of pairs) {
      const it = itemId ? ITEMS_BY_ID[itemId] : undefined;
      if (!it || it.slot === 'background') continue;
      d = { ...d, students: d.students.map((s) => (s.id === studentId && !s.equipped[it.slot] ? { ...s, equipped: { ...s.equipped, [it.slot]: it.id } } : s)) };
    }
    return d;
  };

  /** Run one adventure change: refusals become a gentle notice, results are celebrated and saved. */
  const runAdventure = (fn: (data: AppData, actor: adv.Actor) => adv.AdventureResult | AppData, studentId?: string, ok?: string): boolean => {
    const actor = actorFor(studentId);
    if (!actor) { get().notify('Ask your teacher to unlock the controls', 'warn'); return false; }
    try {
      const out = fn(get().data, actor);
      const r: adv.AdventureResult = 'notes' in out ? out : { data: out, notes: [], outcomes: [] };
      const items = r.notes.flatMap((n) => (n.type === 'treasure' || n.type === 'quest-collected' ? [{ studentId: n.studentId, itemId: n.itemId }] : []));
      const celebrations = adventureCelebrations(r);
      if (celebrations.length) set({ celebrations: [...get().celebrations, ...celebrations] });
      commit(wearNew(r.data, items));
      if (ok) get().notify(ok, 'success');
      return true;
    } catch (e) {
      if (e instanceof adv.AdventureError) { get().notify(e.message, 'warn'); return false; }
      throw e;
    }
  };

  return {
    ready: false,
    data: emptyData(),
    celebrations: [],
    pulses: {},
    lastAward: null,
    toast: null,
    locked: false,
    branchPick: null,

    init: async () => {
      let data = await loadData();
      if (!data) {
        data = migrate(buildDemoData());
        scheduleSave(data, 0);
      } else {
        const before = data.version;
        data = migrate(data);
        // keep a copy of the pre-upgrade data the first time a newer version opens it
        if (before !== data.version) { void addSnapshot(await loadData() ?? data, `Before upgrading to Classroom Creatures ${__APP_VERSION__}`); scheduleSave(data, 0); }
      }
      // the boss clock kept running while the app was closed
      const synced = adv.syncAllWorlds(data);
      if (synced !== data) { data = synced; scheduleSave(data); }
      set({ data, ready: true, locked: !!data.settings.pinHash });
      void requestPersistence();
      void dailySnapshot(data);
    },

    award: (studentIds, categoryId) => {
      const before = get().data;
      const awarded = applyAward(before, studentIds, categoryId);
      const { outcomes, batchId } = awarded;
      if (!outcomes.length) return [];
      // the adventure follows the award: boss hits, tracked quests, regions opening
      const adventure = adv.afterAward(awarded);
      const data = adventure.data;
      const cat = before.categories.find((c) => c.id === categoryId)!;
      const celebrations: Celebration[] = [];
      const pulses = { ...get().pulses };
      for (const o of outcomes) {
        pulses[o.studentId] = { n: (pulses[o.studentId]?.n ?? 0) + 1, xp: o.xp, icon: cat.icon, coins: o.coins, kind: cat.xp < 0 ? 'bad' : 'good', categoryId: cat.id, levelUp: o.levelAfter > o.levelBefore, achievement: o.newAchievements.length > 0, milestone: o.newMilestoneRewards.length > 0 };
        for (const r of o.newMilestoneRewards) celebrations.push({ id: id(), type: 'milestone', studentId: o.studentId, label: r.label, icon: r.icon, atXp: r.atXp });
        if (o.evolved) celebrations.push({ id: id(), type: 'evolution', studentId: o.studentId, from: o.stageBefore, to: o.stageAfter });
        else if (o.readyToEvolve) celebrations.push({ id: id(), type: 'ready', studentId: o.studentId, stage: o.stageAfter });
        else if (o.levelAfter > o.levelBefore) celebrations.push({ id: id(), type: 'levelup', studentId: o.studentId, level: o.levelAfter });
        for (const a of o.newAchievements) celebrations.push({ id: id(), type: 'achievement', studentId: o.studentId, achievementId: a });
      }
      // newly earned accessories go straight on, into any empty slot
      let next = data;
      next = { ...next, students: next.students.map((s) => {
        const o = outcomes.find((x) => x.studentId === s.id);
        if (!o || !o.newItems.length) return s;
        const equipped = { ...s.equipped };
        for (const itemId of o.newItems) {
          const it = ITEMS_BY_ID[itemId];
          if (it && it.slot !== 'background' && !equipped[it.slot]) equipped[it.slot] = itemId;
        }
        return { ...s, equipped };
      }) };
      // class-wide goal
      const cls = next.classes.find((c) => c.id === next.settings.currentClassId);
      if (cls && !cls.goalReachedAt) {
        const total = next.students.filter((s) => s.classId === cls.id).reduce((n, s) => n + s.xp, 0);
        if (total >= cls.goal) {
          next = { ...next, classes: next.classes.map((c) => (c.id === cls.id ? { ...c, goalReachedAt: Date.now(), pendingSpin: true } : c)) };
          celebrations.push({ id: id(), type: 'classGoal', classId: cls.id, goal: cls.goal });
        }
      }
      // whole-class awards would queue one popup per student: keep evolutions, fold the rest
      const many = outcomes.length > 3;
      let queued = many ? celebrations.filter((c) => c.type === 'evolution' || c.type === 'classGoal' || c.type === 'milestone') : celebrations;
      // several creatures became ready at once: one notice is enough, the queue lists them all
      const ready = celebrations.filter((c) => c.type === 'ready');
      if (many && ready.length) queued = [...queued, ready[0]];
      // several milestone rewards at once (whole-class award) → one combined popup
      const ms = queued.filter((c): c is Extract<Celebration, { type: 'milestone' }> => c.type === 'milestone');
      if (ms.length > 1) {
        const first = ms[0];
        queued = [...queued.filter((c) => c.type !== 'milestone' || c === first)].map((c) => (c === first ? { ...first, others: ms.slice(1).map((m) => m.studentId) } : c));
      }
      queued = [...queued, ...adventureCelebrations(adventure)];
      set({
        pulses,
        celebrations: [...get().celebrations, ...queued],
        lastAward: { batchId, label: cat.name, icon: cat.icon, count: outcomes.length, xp: cat.xp > 0 ? cat.xp : Math.min(0, ...outcomes.map((o) => o.xp)), at: Date.now() },
      });
      commit(next);
      return outcomes;
    },

    buy: (studentId, itemId) => {
      const before = get().data;
      const r = purchase(before, studentId, itemId);
      if ('error' in r) {
        const msg: Record<string, string> = { coins: 'Not enough coins yet', season: 'This item is out of season', disabled: 'This item is switched off in Settings', owned: 'Already owned' };
        if (msg[r.error]) get().notify(msg[r.error], 'warn');
        return false;
      }
      const st = before.students.find((x) => x.id === studentId)!;
      const after = r.data.students.find((x) => x.id === studentId)!;
      const fresh = after.achievements.filter((a) => !st.achievements.some((b) => b.id === a.id));
      if (fresh.length) set({ celebrations: [...get().celebrations, ...fresh.map((a) => ({ id: id(), type: 'achievement' as const, studentId, achievementId: a.id }))] });
      commit(r.data);
      return true;
    },
    setRewardGiven: (studentId, rewardId, given) => {
      const d = get().data;
      commit({ ...d, students: d.students.map((s) => (s.id === studentId ? { ...s, milestoneRewards: s.milestoneRewards.map((r) => (r.id === rewardId ? { ...r, given } : r)) } : s)) });
    },
    recordPrize: (classId, prizeId) => {
      const d = get().data;
      const prize = d.settings.prizes.find((p) => p.id === prizeId);
      if (!prize) return;
      commit({
        ...d,
        classes: d.classes.map((c) => (c.id !== classId ? c : {
          ...c, pendingSpin: false, goalReachedAt: undefined, goal: c.goal + (c.goalStep || 1000),
          prizeHistory: [...(c.prizeHistory ?? []), { prizeId, label: prize.label, icon: prize.icon, goal: c.goal, at: Date.now() }],
        })),
      });
    },
    undo: (batchId) => {
      const d = adv.undoAdventure(get().data, batchId);
      const removedStudents = new Set(get().data.events.filter((e) => e.batchId === batchId).map((e) => e.studentId));
      set({
        lastAward: null,
        celebrations: get().celebrations.filter((c) => !('studentId' in c) || !removedStudents.has(c.studentId) || c.type === 'evolution' && c.replay),
      });
      commit(d);
      get().notify('Award undone', 'info');
    },

    dismissCelebration: (cid) => set({ celebrations: get().celebrations.filter((c) => c.id !== cid) }),
    approveEvolution: (studentId, branch) => {
      const r = approveEvolutionPure(get().data, studentId, branch);
      if (!r) return false;
      const celebrations: Celebration[] = [{ id: id(), type: 'evolution', studentId, from: r.from, to: r.to, branch: r.branch }];
      for (const a of r.newAchievements) celebrations.push({ id: id(), type: 'achievement', studentId, achievementId: a });
      set({ celebrations: [...get().celebrations.filter((c) => !(c.type === 'ready' && c.studentId === studentId)), ...celebrations] });
      commit(r.data);
      return true;
    },
    chooseBranch: (studentId, branch) => {
      const r = chooseBranchPure(get().data, studentId, branch);
      if (!r) return false;
      set({ celebrations: [...get().celebrations, { id: id(), type: 'evolution', studentId, from: 4, to: 5, branch, replay: true }] });
      commit(r.data);
      return true;
    },
    adjustXp: (studentId, delta, note) => {
      const corrected = applyAward(get().data, [studentId], ADJUST_CATEGORY_ID, Date.now(), { xp: delta, note });
      // a correction is not activity, but it can still open a region (adventure points come from XP)
      const r = { ...corrected, data: corrected.outcomes.length ? adv.afterAward(corrected).data : corrected.data };
      if (!r.outcomes.length) return false;
      const o = r.outcomes[0];
      const celebrations: Celebration[] = [];
      if (o.evolved) celebrations.push({ id: id(), type: 'evolution', studentId, from: o.stageBefore, to: o.stageAfter });
      else if (o.readyToEvolve) celebrations.push({ id: id(), type: 'ready', studentId, stage: o.stageAfter });
      set({ celebrations: [...get().celebrations, ...celebrations], lastAward: { batchId: r.batchId, label: 'Teacher adjustment', icon: '✏️', count: 1, xp: o.xp, at: Date.now() } });
      commit(r.data);
      return true;
    },
    startEvolution: (studentId) => {
      const d = get().data;
      const st = d.students.find((s) => s.id === studentId);
      if (!st) return;
      if (pendingStage(st, d)) {
        if (needsBranchChoice(st)) set({ branchPick: { studentId, mode: 'approve' } });
        else get().approveEvolution(studentId);
      } else if (canChooseBranch(st)) set({ branchPick: { studentId, mode: 'choose' } });
    },
    closeBranchPick: () => set({ branchPick: null }),
    raiseAbility: (studentId, abilityId) => {
      const before = get().data;
      const next = raiseAbilityPure(before, studentId, abilityId);
      if (!next) return false;
      const st = before.students.find((x) => x.id === studentId)!;
      const after = next.students.find((x) => x.id === studentId)!;
      const fresh = after.achievements.filter((a) => !st.achievements.some((b) => b.id === a.id));
      if (fresh.length) set({ celebrations: [...get().celebrations, ...fresh.map((a) => ({ id: id(), type: 'achievement' as const, studentId, achievementId: a.id }))] });
      commit(next);
      return true;
    },
    resetAbilities: (studentId) => commit(resetAbilitiesPure(get().data, studentId)),
    resetStudent: async (studentId) => {
      const d = get().data;
      await addSnapshot(d, `Before resetting ${d.students.find((s) => s.id === studentId)?.name ?? 'a student'}`);
      set({ celebrations: get().celebrations.filter((c) => !('studentId' in c) || c.studentId !== studentId), lastAward: null });
      commit(resetProgressPure(get().data, studentId));
    },
    interact: (studentId, kind) => {
      const before = get().data;
      const st = before.students.find((x) => x.id === studentId);
      if (!st) return;
      const i = st.interactions ?? { pet: 0, feed: 0, play: 0 };
      const bumped: AppData = { ...before, students: before.students.map((x) => (x.id === studentId ? { ...x, interactions: { ...i, [kind]: i[kind] + 1 } } : x)) };
      const next = refreshStudentPure(bumped, studentId).data;
      const after = next.students.find((x) => x.id === studentId)!;
      const fresh = after.achievements.filter((a) => !st.achievements.some((b) => b.id === a.id));
      if (fresh.length) set({ celebrations: [...get().celebrations, ...fresh.map((a) => ({ id: id(), type: 'achievement' as const, studentId, achievementId: a.id }))] });
      commit(next);
    },
    replayEvolution: (studentId, stage) => {
      const from = Math.max(1, stage - 1) as Stage;
      const st = get().data.students.find((s) => s.id === studentId);
      set({ celebrations: [...get().celebrations, { id: id(), type: 'evolution', studentId, from, to: stage, replay: true, branch: stage === 5 ? st?.branch : undefined }] });
    },
    notify: (text, tone = 'success') => set({ toast: { id: id(), text, tone } }),
    setLocked: (v) => set({ locked: v }),

    setCurrentClass: (cid) => commit({ ...get().data, settings: { ...get().data.settings, currentClassId: cid } }),
    createClass: (name, grade) => {
      const c = newClass(name, grade);
      const d = get().data;
      commit({ ...d, classes: [...d.classes, c], settings: { ...d.settings, currentClassId: c.id } });
      return c.id;
    },
    updateClass: (cid, patch) => {
      const d = get().data;
      let classes = d.classes.map((c) => (c.id === cid ? { ...c, ...patch } : c));
      let settings = d.settings;
      if (patch.archived && settings.currentClassId === cid) settings = { ...settings, currentClassId: classes.find((c) => !c.archived)?.id ?? null };
      if (patch.goal !== undefined) classes = classes.map((c) => (c.id === cid ? { ...c, goalReachedAt: undefined } : c));
      commit({ ...d, classes, settings });
    },
    deleteClass: async (cid) => {
      const d = get().data;
      await addSnapshot(d, `Before deleting class "${d.classes.find((c) => c.id === cid)?.name ?? ''}"`);
      const classes = d.classes.filter((c) => c.id !== cid);
      commit({
        ...d, classes,
        students: d.students.filter((s) => s.classId !== cid),
        events: d.events.filter((e) => e.classId !== cid),
        quests: d.quests.filter((q) => q.classId !== cid),
        questRecords: d.questRecords.filter((r) => r.classId !== cid),
        bosses: d.bosses.filter((b) => b.classId !== cid),
        adventureLog: d.adventureLog.filter((l) => l.classId !== cid),
        settings: { ...d.settings, currentClassId: d.settings.currentClassId === cid ? classes.find((c) => !c.archived)?.id ?? null : d.settings.currentClassId },
      });
    },

    addStudents: (classId, names) => {
      const d = get().data;
      const next = addStudentsPure(d, classId, names);
      commit(next);
      return next.students.length - d.students.length;
    },
    updateStudent: (sid, patch) => {
      const d = get().data;
      commit({ ...d, students: d.students.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
    },
    removeStudent: async (sid) => {
      const d = get().data;
      await addSnapshot(d, `Before removing ${d.students.find((s) => s.id === sid)?.name ?? 'a student'}`);
      commit({
        ...d, students: d.students.filter((s) => s.id !== sid), events: d.events.filter((e) => e.studentId !== sid),
        questRecords: d.questRecords.filter((r) => r.studentId !== sid), adventureLog: d.adventureLog.filter((l) => l.studentId !== sid),
      });
    },
    moveStudent: (sid, classId) => {
      const d = get().data;
      // progress travels with the student; its event history moves too so challenge progress stays correct
      commit({
        ...d,
        students: d.students.map((s) => (s.id === sid ? { ...s, classId } : s)),
        events: d.events.map((e) => (e.studentId === sid ? { ...e, classId } : e)),
        questRecords: d.questRecords.map((r) => (r.studentId === sid ? { ...r, classId } : r)),
      });
    },
    assignSpecies: (sid, speciesId) => get().updateStudent(sid, { speciesId }),
    randomizeSpecies: (sid) => {
      const d = get().data;
      const st = d.students.find((s) => s.id === sid);
      if (!st) return;
      const others = d.students.filter((s) => s.classId === st.classId && s.id !== sid);
      get().updateStudent(sid, { speciesId: pickSpecies(others, Math.random, [st.speciesId, ...(d.settings.disabledSpecies ?? [])]) });
    },
    randomizeClass: (classId) => {
      const d = get().data;
      const assigned: Pick<Student, 'speciesId'>[] = [];
      const students = d.students.map((s) => {
        if (s.classId !== classId) return s;
        const speciesId = pickSpecies(assigned, Math.random, d.settings.disabledSpecies ?? []);
        assigned.push({ speciesId });
        return { ...s, speciesId };
      });
      commit({ ...d, students });
    },
    equip: (sid, slot, itemId) => {
      const d = get().data;
      const st = d.students.find((x) => x.id === sid);
      const next = equipItem(d, sid, slot, itemId);
      const after = next.students.find((x) => x.id === sid);
      const fresh = st && after ? after.achievements.filter((a) => !st.achievements.some((b) => b.id === a.id)) : [];
      if (fresh.length) set({ celebrations: [...get().celebrations, ...fresh.map((a) => ({ id: id(), type: 'achievement' as const, studentId: sid, achievementId: a.id }))] });
      commit(next);
    },

    upsertCategory: (c) => {
      const d = get().data;
      const exists = d.categories.some((x) => x.id === c.id);
      commit({ ...d, categories: exists ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c] });
    },
    deleteCategory: (cid) => {
      const d = get().data;
      commit({ ...d, categories: d.categories.filter((c) => c.id !== cid) });
    },
    saveQuest: (q) => runAdventure((d, a) => adv.saveQuest(d, a, q), undefined, 'Quest saved'),
    duplicateQuest: (qid) => {
      let copy: string | null = null;
      runAdventure((d, a) => { const r = adv.duplicateQuest(d, a, qid); copy = r.quest.id; return r.data; }, undefined, 'Quest duplicated');
      return copy;
    },
    deleteQuest: (qid) => runAdventure((d, a) => adv.deleteQuest(d, a, qid), undefined, 'Quest deleted (its history is kept)'),
    submitQuest: (questId, studentId, note) => runAdventure((d, a) => adv.submitQuest(d, a, questId, studentId, Date.now(), note), studentId,
      get().locked ? 'Handed in! Your teacher will check it.' : undefined),
    approveQuest: (rid) => runAdventure((d, a) => adv.approveQuest(d, a, rid)),
    rejectQuest: (rid, reason) => runAdventure((d, a) => adv.rejectQuest(d, a, rid, reason), undefined, 'Sent back with your note'),
    collectQuest: (rid) => runAdventure((d, a) => adv.collectQuest(d, a, rid), get().data.questRecords.find((r) => r.id === rid)?.studentId),
    approveAllQuests: (classId) => runAdventure((d, a) => adv.approveAll(d, a, classId), undefined, 'Every handed-in quest approved'),
    collectAllQuests: (classId) => runAdventure((d, a) => adv.collectAll(d, a, classId), undefined, 'Rewards handed out'),
    startBattle: (setup) => runAdventure((d, a) => adv.startBattle(d, a, setup)),
    controlBattle: (bid, action) => runAdventure((d, a) => adv.controlBattle(d, a, bid, action)),
    classActivity: (classId, amount, label) => runAdventure((d, a) => adv.classActivity(d, a, classId, amount, label)),
    setRegion: (classId, regionId, mode) => runAdventure((d, a) => adv.setRegion(d, a, classId, regionId, mode)),
    visitRegion: (studentIds, regionId) => runAdventure((d, a) => adv.visitRegion(d, a, studentIds, regionId), studentIds.length === 1 ? studentIds[0] : undefined),
    upgradeLocation: (classId, lid) => runAdventure((d, a) => adv.upgradeLocation(d, a, classId, lid)),
    openTreasure: (studentId, tid) => runAdventure((d, a) => adv.openTreasure(d, a, studentId, tid), studentId),
    tickAdventure: () => {
      const d = get().data;
      if (!d.bosses.some((b) => b.status === 'active')) return;
      const r = adv.tickBattles(d);
      if (r.data !== d) commit(r.data);
    },
    updateSettings: (patch) => {
      const d = get().data;
      const settings = { ...d.settings, ...patch };
      // switching back to automatic evolves every creature that was waiting for approval
      if (patch.evolutionMode === 'auto' && d.settings.evolutionMode === 'approval') {
        const waiting = d.students.filter((s) => pendingStage(s, d)).length;
        commit(refreshAll({ ...d, settings }));
        if (waiting) get().notify(`${waiting} creature${waiting === 1 ? '' : 's'} evolved`, 'success');
        return null;
      }
      if (patch.levelXp || patch.evolutionLevels) {
        const err = validateProgression(settings.levelXp, settings.evolutionLevels);
        if (err) return err;
      }
      let categories = d.categories;
      if (patch.negativeEnabled === true && !categories.some((c) => c.xp < 0)) categories = [...categories, ...DEFAULT_NEGATIVE_CATEGORIES.map((c) => ({ ...c }))];
      let next: AppData = { ...d, settings, categories };
      if (patch.levelXp || patch.evolutionLevels) next = refreshAll(next);
      commit(next);
      return null;
    },

    replaceData: async (data, reason) => {
      await addSnapshot(get().data, reason);
      commit(data);
      set({ celebrations: [], lastAward: null, pulses: {} });
    },
    clearDemo: async () => {
      await addSnapshot(get().data, 'Before removing demo class');
      commit(removeDemo(get().data));
    },
    addDemo: () => {
      commit(buildDemoData(Date.now(), removeDemo(get().data)));
    },
    snapshot: (reason) => addSnapshot(get().data, reason),
  };
});

/* ───────────── selectors ───────────── */
export function useCurrentClass(): ClassRoom | undefined {
  return useStore((s) => s.data.classes.find((c) => c.id === s.data.settings.currentClassId) ?? s.data.classes.find((c) => !c.archived));
}

// development builds expose the store for automated UI checks (never in production builds)
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __cc: typeof useStore }).__cc = useStore;
