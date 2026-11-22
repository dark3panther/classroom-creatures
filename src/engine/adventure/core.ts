import type { AdventureLogEntry, AppData, AwardOutcome, ClassAdventure, ClassRoom, RegionId, Student, StudentAdventure } from '../../types';
import { refreshStudent } from '../awards';
import { newClassAdventure } from '../roster';
import { uid } from '../util';

/**
 * Who is asking. The teacher (controls unlocked) or one student (the kiosk, controls locked).
 * Every adventure change checks it here in the engine, not only by hiding buttons.
 */
export type Actor = { role: 'teacher' } | { role: 'student'; studentId: string };
export const TEACHER: Actor = { role: 'teacher' };
export const asStudent = (studentId: string): Actor => ({ role: 'student', studentId });

/** A refused adventure action, with a message a teacher or a child can read. */
export class AdventureError extends Error {
  constructor(message: string, readonly code: 'forbidden' | 'invalid' | 'state' | 'missing' = 'invalid') {
    super(message);
    this.name = 'AdventureError';
  }
}

export function requireTeacher(actor: Actor, what: string): void {
  if (actor.role !== 'teacher') throw new AdventureError(`Only your teacher can ${what}.`, 'forbidden');
}
export function requireSelfOrTeacher(actor: Actor, studentId: string, what: string): void {
  if (actor.role === 'student' && actor.studentId !== studentId) throw new AdventureError(`You can only ${what} for yourself.`, 'forbidden');
}

/** Something worth celebrating or reporting that an adventure change caused. */
export type AdventureNote =
  | { type: 'quest-done'; studentId: string; questId: string; recordId: string; waiting: boolean }
  | { type: 'quest-collected'; studentId: string; questId: string; xp: number; coins: number; itemId?: string }
  | { type: 'boss-won'; classId: string; battleId: string; bossId: string }
  | { type: 'boss-ended'; classId: string; battleId: string; bossId: string }
  /** a lesson battle's clock ran out: it is paused until the next lesson */
  | { type: 'boss-timeup'; classId: string; battleId: string; bossId: string }
  | { type: 'region-opened'; classId: string; regionId: RegionId }
  | { type: 'decoration'; classId: string; id: string; name: string }
  | { type: 'treasure'; studentId: string; treasureId: string; coins: number; itemId?: string }
  | { type: 'visited'; studentId: string; regionId: RegionId }
  | { type: 'achievement'; studentId: string; achievementId: string };

export interface AdventureResult {
  data: AppData;
  notes: AdventureNote[];
  /** outcomes of rewards given on the way (levels, evolutions, badges), for the usual celebrations */
  outcomes: AwardOutcome[];
}

/** A working context: engine steps replace ctx.data and append notes. */
export interface Ctx extends AdventureResult { now: number }
export const ctxOf = (data: AppData, now: number): Ctx => ({ data, notes: [], outcomes: [], now });
export const result = (c: Ctx): AdventureResult => ({ data: c.data, notes: c.notes, outcomes: c.outcomes });

export const studentAdv = (s: Student | undefined): StudentAdventure => s?.adventure ?? { visited: [], treasures: [], bosses: [] };
export const classAdv = (c: ClassRoom | undefined): ClassAdventure => c?.adventure ?? newClassAdventure();

export function getStudent(data: AppData, id: string): Student {
  const s = data.students.find((x) => x.id === id);
  if (!s) throw new AdventureError('That student is not in this class any more.', 'missing');
  return s;
}
export function getClass(data: AppData, id: string): ClassRoom {
  const c = data.classes.find((x) => x.id === id);
  if (!c) throw new AdventureError('That class could not be found.', 'missing');
  return c;
}

export function patchStudent(c: Ctx, id: string, fn: (s: Student) => Student): void {
  c.data = { ...c.data, students: c.data.students.map((s) => (s.id === id ? fn(s) : s)) };
}
export function patchStudentAdv(c: Ctx, id: string, fn: (a: StudentAdventure) => StudentAdventure): void {
  patchStudent(c, id, (s) => ({ ...s, adventure: fn(studentAdv(s)) }));
}
export function patchClassAdv(c: Ctx, id: string, fn: (a: ClassAdventure) => ClassAdventure): void {
  c.data = { ...c.data, classes: c.data.classes.map((x) => (x.id === id ? { ...x, adventure: fn(classAdv(x)) } : x)) };
}

export function addLog(c: Ctx, entry: Omit<AdventureLogEntry, 'id' | 'at'> & { at?: number }): void {
  c.data = { ...c.data, adventureLog: [...c.data.adventureLog, { id: uid('log'), at: c.now, ...entry }] };
}

/** Re-check badges and items for these students (after something adventure-related changed). */
export function refreshBadges(c: Ctx, studentIds: string[]): void {
  for (const id of new Set(studentIds)) {
    const r = refreshStudent(c.data, id, c.now);
    c.data = r.data;
    for (const a of r.newAchievements) c.notes.push({ type: 'achievement', studentId: id, achievementId: a });
  }
}

export const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
