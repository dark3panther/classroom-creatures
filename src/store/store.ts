import { create } from 'zustand';
import { DEFAULT_NEGATIVE_CATEGORIES } from '../data/defaults';
import { applyAward, refreshAll, undoBatch } from '../engine/awards';
import { buildDemoData, removeDemo } from '../engine/demo';
import { validateProgression } from '../engine/progression';
import { addStudents as addStudentsPure, emptyData, newClass, pickSpecies } from '../engine/roster';
import { uid } from '../engine/util';
import type { AppData, AwardOutcome, Category, Challenge, ClassRoom, ItemSlot, Settings, Stage, Student } from '../types';
import { addSnapshot, dailySnapshot, loadData, requestPersistence, scheduleSave } from './storage';

export type Celebration =
  | { id: string; type: 'evolution'; studentId: string; from: Stage; to: Stage; replay?: boolean }
  | { id: string; type: 'levelup'; studentId: string; level: number }
  | { id: string; type: 'achievement'; studentId: string; achievementId: string }
  | { id: string; type: 'classGoal'; classId: string; goal: number };

export interface Pulse { n: number; xp: number; icon: string }

export interface LastAward { batchId: string; label: string; icon: string; count: number; xp: number; at: number }

export type ToastTone = 'info' | 'success' | 'warn';

interface UiState {
  ready: boolean;
  celebrations: Celebration[];
  pulses: Record<string, Pulse>;
  lastAward: LastAward | null;
  toast: { id: string; text: string; tone: ToastTone } | null;
  locked: boolean;
}

interface Actions {
  init: () => Promise<void>;
  award: (studentIds: string[], categoryId: string) => AwardOutcome[];
  undo: (batchId: string) => void;
  dismissCelebration: (id: string) => void;
  replayEvolution: (studentId: string, stage: Stage) => void;
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
  upsertChallenge: (c: Challenge) => void;
  deleteChallenge: (id: string) => void;
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

  return {
    ready: false,
    data: emptyData(),
    celebrations: [],
    pulses: {},
    lastAward: null,
    toast: null,
    locked: false,

    init: async () => {
      let data = await loadData();
      if (!data) {
        data = buildDemoData();
        scheduleSave(data, 0);
      }
      set({ data, ready: true, locked: !!data.settings.pinHash });
      void requestPersistence();
      void dailySnapshot(data);
    },

    award: (studentIds, categoryId) => {
      const before = get().data;
      const { data, outcomes, batchId } = applyAward(before, studentIds, categoryId);
      if (!outcomes.length) return [];
      const cat = before.categories.find((c) => c.id === categoryId)!;
      const celebrations: Celebration[] = [];
      const pulses = { ...get().pulses };
      for (const o of outcomes) {
        pulses[o.studentId] = { n: (pulses[o.studentId]?.n ?? 0) + 1, xp: o.xp, icon: cat.icon };
        if (o.evolved) celebrations.push({ id: id(), type: 'evolution', studentId: o.studentId, from: o.stageBefore, to: o.stageAfter });
        else if (o.levelAfter > o.levelBefore) celebrations.push({ id: id(), type: 'levelup', studentId: o.studentId, level: o.levelAfter });
        for (const a of o.newAchievements) celebrations.push({ id: id(), type: 'achievement', studentId: o.studentId, achievementId: a });
      }
      // class-wide goal
      let next = data;
      const cls = next.classes.find((c) => c.id === next.settings.currentClassId);
      if (cls && !cls.goalReachedAt) {
        const total = next.students.filter((s) => s.classId === cls.id).reduce((n, s) => n + s.xp, 0);
        if (total >= cls.goal) {
          next = { ...next, classes: next.classes.map((c) => (c.id === cls.id ? { ...c, goalReachedAt: Date.now() } : c)) };
          celebrations.push({ id: id(), type: 'classGoal', classId: cls.id, goal: cls.goal });
        }
      }
      // whole-class awards would queue one popup per student: keep evolutions, fold the rest
      const many = outcomes.length > 3;
      const queued = many ? celebrations.filter((c) => c.type === 'evolution' || c.type === 'classGoal') : celebrations;
      set({
        pulses,
        celebrations: [...get().celebrations, ...queued],
        lastAward: { batchId, label: cat.name, icon: cat.icon, count: outcomes.length, xp: cat.xp > 0 ? cat.xp : Math.min(0, ...outcomes.map((o) => o.xp)), at: Date.now() },
      });
      commit(next);
      return outcomes;
    },

    undo: (batchId) => {
      const d = undoBatch(get().data, batchId);
      const removedStudents = new Set(get().data.events.filter((e) => e.batchId === batchId).map((e) => e.studentId));
      set({
        lastAward: null,
        celebrations: get().celebrations.filter((c) => !('studentId' in c) || !removedStudents.has(c.studentId) || c.type === 'evolution' && c.replay),
      });
      commit(d);
      get().notify('Award undone', 'info');
    },

    dismissCelebration: (cid) => set({ celebrations: get().celebrations.filter((c) => c.id !== cid) }),
    replayEvolution: (studentId, stage) => {
      const from = Math.max(1, stage - 1) as Stage;
      set({ celebrations: [...get().celebrations, { id: id(), type: 'evolution', studentId, from, to: stage, replay: true }] });
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
      commit({ ...d, students: d.students.filter((s) => s.id !== sid), events: d.events.filter((e) => e.studentId !== sid) });
    },
    moveStudent: (sid, classId) => {
      const d = get().data;
      // progress travels with the student; its event history moves too so challenge progress stays correct
      commit({
        ...d,
        students: d.students.map((s) => (s.id === sid ? { ...s, classId } : s)),
        events: d.events.map((e) => (e.studentId === sid ? { ...e, classId } : e)),
      });
    },
    assignSpecies: (sid, speciesId) => get().updateStudent(sid, { speciesId }),
    randomizeSpecies: (sid) => {
      const d = get().data;
      const st = d.students.find((s) => s.id === sid);
      if (!st) return;
      const others = d.students.filter((s) => s.classId === st.classId && s.id !== sid);
      get().updateStudent(sid, { speciesId: pickSpecies(others, Math.random, [st.speciesId]) });
    },
    randomizeClass: (classId) => {
      const d = get().data;
      const assigned: Pick<Student, 'speciesId'>[] = [];
      const students = d.students.map((s) => {
        if (s.classId !== classId) return s;
        const speciesId = pickSpecies(assigned);
        assigned.push({ speciesId });
        return { ...s, speciesId };
      });
      commit({ ...d, students });
    },
    equip: (sid, slot, itemId) => {
      const d = get().data;
      commit({
        ...d,
        students: d.students.map((s) => {
          if (s.id !== sid) return s;
          const equipped = { ...s.equipped };
          if (itemId && s.unlockedItems.includes(itemId)) equipped[slot] = itemId;
          else delete equipped[slot];
          return { ...s, equipped };
        }),
      });
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
    upsertChallenge: (c) => {
      const d = get().data;
      const exists = d.challenges.some((x) => x.id === c.id);
      commit({ ...d, challenges: exists ? d.challenges.map((x) => (x.id === c.id ? c : x)) : [...d.challenges, c] });
    },
    deleteChallenge: (cid) => {
      const d = get().data;
      commit({ ...d, challenges: d.challenges.filter((c) => c.id !== cid) });
    },
    updateSettings: (patch) => {
      const d = get().data;
      const settings = { ...d.settings, ...patch };
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
