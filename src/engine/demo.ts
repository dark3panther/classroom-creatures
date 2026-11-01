import type { AppData } from '../types';
import { applyAward } from './awards';
import { addStudents, emptyData, newClass } from './roster';
import { mulberry32 } from './util';

/** Demo names are clearly fictional and the whole class is tagged `isDemo`. */
const DEMO_NAMES = [
  'Ava Demo', 'Leo Demo', 'Mia Demo', 'Noah Demo', 'Zara Demo', 'Kai Demo', 'Lina Demo', 'Omar Demo',
  'Yuki Demo', 'Sofia Demo', 'Arjun Demo', 'Emma Demo', 'Mateo Demo', 'Hana Demo', 'Ivan Demo', 'Nora Demo',
];

const DAY = 86_400_000;

/** A populated, clearly-labelled sample class so the app looks alive on first open. */
export function buildDemoData(now = Date.now(), base: AppData = emptyData()): AppData {
  const rand = mulberry32(20261101);
  const cls = { ...newClass('Demo Class · Sunflowers', 'Grade 2', now - 21 * DAY), isDemo: true };
  let data: AppData = { ...base, classes: [...base.classes, cls] };
  data = addStudents(data, cls.id, DEMO_NAMES, rand, now - 21 * DAY);
  data = { ...data, students: data.students.map((s) => (s.classId === cls.id ? { ...s, isDemo: true } : s)) };

  const ids = data.students.filter((s) => s.classId === cls.id).map((s) => s.id);
  const cats = data.categories.filter((c) => c.xp > 0).map((c) => c.id);
  // each demo student has a different "energy" so the class shows every stage
  const energy = ids.map((_, i) => [3.4, 2.6, 1.2, 0.5, 1.8, 0.9, 2.1, 0.3, 1.5, 0.7, 2.9, 1.0, 0.4, 1.3, 0.6, 2.3][i] ?? 1);
  for (let d = 20; d >= 0; d--) {
    if (new Date(now - d * DAY).getDay() % 6 === 0) continue; // skip weekends
    ids.forEach((id, i) => {
      const n = Math.round(energy[i] * (2 + rand() * 3));
      for (let k = 0; k < n; k++) {
        const t = now - d * DAY - Math.floor(rand() * 6 * 3_600_000) - 60_000;
        data = applyAward(data, [id], cats[Math.floor(rand() * cats.length)], t).data;
      }
    });
  }
  // a whole-class award a little earlier today
  data = applyAward(data, ids, 'cat-teamwork', now - 40 * 60_000).data;
  // set the class goal just above the current total so a few whole-class awards trigger the celebration
  const total = data.students.filter((s) => s.classId === cls.id).reduce((n, s) => n + s.xp, 0);
  data.classes = data.classes.map((c) => (c.id === cls.id ? { ...c, goal: Math.ceil((total + 200) / 100) * 100 } : c));
  data.settings = { ...data.settings, currentClassId: cls.id };
  return data;
}

export function removeDemo(data: AppData): AppData {
  const demoClassIds = new Set(data.classes.filter((c) => c.isDemo).map((c) => c.id));
  const classes = data.classes.filter((c) => !demoClassIds.has(c.id));
  return {
    ...data,
    classes,
    students: data.students.filter((s) => !demoClassIds.has(s.classId)),
    events: data.events.filter((e) => !demoClassIds.has(e.classId)),
    settings: {
      ...data.settings,
      currentClassId: demoClassIds.has(data.settings.currentClassId ?? '') ? classes.find((c) => !c.archived)?.id ?? null : data.settings.currentClassId,
    },
  };
}
