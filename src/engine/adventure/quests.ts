import { REGIONS_BY_ID } from '../../data/adventure';
import { ITEMS_BY_ID } from '../../data/defaults';
import type { AppData, AwardEvent, Quest, QuestRecord, QuestStatus, Student } from '../../types';
import { applyReward } from '../awards';
import { dayKey, periodStart, uid, weekKey } from '../util';
import { hitBoss } from './bosses';
import { AdventureError, type Actor, type AdventureResult, type Ctx, addLog, clampInt, ctxOf, getStudent, patchStudent, refreshBadges, requireSelfOrTeacher, requireTeacher, result } from './core';
import { regionStates, syncWorld } from './world';
import { questHit } from '../../data/adventure';

const DAY = 86_400_000;

/** The period a quest is counted in at `now`: a day, a week, or 'once' for custom quests. */
export function questPeriod(q: Pick<Quest, 'kind'>, now: number): string {
  return q.kind === 'daily' ? dayKey(now) : q.kind === 'weekly' ? weekKey(now) : 'once';
}

/** The time window a quest's progress is counted over. */
export function questWindow(q: Quest, now: number): { from: number; to: number } {
  if (q.kind === 'daily') { const from = periodStart('daily', now); return { from, to: from + DAY }; }
  if (q.kind === 'weekly') { const from = periodStart('weekly', now); return { from, to: from + 7 * DAY }; }
  return { from: q.startAt ?? q.createdAt, to: q.endAt ?? Number.POSITIVE_INFINITY };
}

export const isAssigned = (q: Quest, s: Pick<Student, 'id' | 'classId'>) =>
  !q.deleted && (q.classId === null || q.classId === s.classId) && (q.assign === 'class' || q.assign.includes(s.id));

/** Is the quest running at `now` (switched on, and inside its start and end dates)? */
export function questTiming(q: Quest, now: number): 'live' | 'off' | 'upcoming' | 'ended' {
  if (q.deleted || !q.active) return 'off';
  if (q.startAt && now < q.startAt) return 'upcoming';
  if (q.endAt && now > q.endAt) return 'ended';
  return 'live';
}

/** Progress of one student on a tracked quest in the current period (adventure rewards never count). */
export function questProgress(q: Quest, studentId: string, events: AwardEvent[], now: number): { value: number; target: number; done: boolean } {
  const req = q.requirement;
  if (req.type !== 'tracked') return { value: 0, target: 1, done: false };
  const { from, to } = questWindow(q, now);
  let value = 0;
  for (const e of events) {
    if (e.studentId !== studentId || e.undone || e.reward || e.at < from || e.at >= to || e.at > now) continue;
    if (req.metric === 'xp') value += Math.max(0, e.xp);
    else if ((!req.tag || e.tag === req.tag) && e.xp > 0 && !e.adjust) value += 1;
  }
  return { value: Math.min(value, req.target), target: req.target, done: value >= req.target };
}

export const findRecord = (data: AppData, questId: string, studentId: string, period: string) =>
  data.questRecords.find((r) => r.questId === questId && r.studentId === studentId && r.period === period);

export type QuestState = 'locked' | 'upcoming' | 'ended' | 'todo' | 'submitted' | 'approved' | 'rejected' | 'collected';

export interface QuestView {
  quest: Quest;
  record?: QuestRecord;
  period: string;
  state: QuestState;
  progress: { value: number; target: number; done: boolean };
}

/** One student's quest board: every quest assigned to them, with its state right now. */
export function questBoard(data: AppData, s: Student, now = Date.now()): QuestView[] {
  const regions = regionStates(data, s.classId);
  const order: Record<QuestState, number> = { approved: 0, rejected: 1, todo: 2, submitted: 3, collected: 4, upcoming: 5, ended: 6, locked: 7 };
  return data.quests
    .filter((q) => isAssigned(q, s) && q.active)
    .map((q) => {
      const period = questPeriod(q, now);
      const record = findRecord(data, q.id, s.id, period);
      const timing = questTiming(q, now);
      const progress = questProgress(q, s.id, data.events, now);
      let state: QuestState;
      if (record) state = record.status;
      else if (!regions[q.regionId]?.open) state = 'locked';
      else if (timing === 'upcoming') state = 'upcoming';
      else if (timing !== 'live') state = 'ended';
      else state = 'todo';
      return { quest: q, record, period, state, progress };
    })
    .sort((a, b) => order[a.state] - order[b.state] || a.quest.kind.localeCompare(b.quest.kind) || a.quest.title.localeCompare(b.quest.title));
}

/* ───────────── teacher: create, edit, duplicate, delete ───────────── */

/** Clean and check a quest from the editor. Throws a readable error when something is missing. */
export function validateQuest(q: Quest): Quest {
  const title = (q.title ?? '').trim().slice(0, 80);
  if (!title) throw new AdventureError('Give the quest a title.', 'invalid');
  if (!REGIONS_BY_ID[q.regionId]) throw new AdventureError('Pick a region for the quest.', 'invalid');
  if (Array.isArray(q.assign) && !q.assign.length) throw new AdventureError('Choose at least one student, or assign the quest to the whole class.', 'invalid');
  if (q.reward.itemId && !ITEMS_BY_ID[q.reward.itemId]) throw new AdventureError('That reward item no longer exists.', 'invalid');
  if (q.reward.itemId && ITEMS_BY_ID[q.reward.itemId].unlock.type !== 'shop') throw new AdventureError('Quest rewards can only be shop items.', 'invalid');
  if (q.kind === 'custom' && q.startAt && q.endAt && q.endAt <= q.startAt) throw new AdventureError('The end date must be after the start date.', 'invalid');
  const requirement: Quest['requirement'] = q.requirement.type === 'tracked'
    ? { type: 'tracked', metric: q.requirement.metric === 'xp' ? 'xp' : 'count', ...(q.requirement.metric !== 'xp' && q.requirement.tag ? { tag: q.requirement.tag } : {}), target: clampInt(q.requirement.target, 1, 1000, 1) }
    : { type: 'check' };
  return {
    ...q, title, description: (q.description ?? '').trim().slice(0, 300), requirement,
    reward: { xp: clampInt(q.reward.xp, 0, 100, 0), coins: clampInt(q.reward.coins, 0, 500, 0), ...(q.reward.itemId ? { itemId: q.reward.itemId } : {}) },
    ...(q.kind !== 'custom' ? { startAt: undefined, endAt: undefined } : {}),
  };
}

export function saveQuest(data: AppData, actor: Actor, quest: Quest, now = Date.now()): AppData {
  requireTeacher(actor, 'create or change quests');
  const q = validateQuest(quest);
  const exists = data.quests.some((x) => x.id === q.id);
  const saved = { ...q, updatedAt: now, createdAt: exists ? q.createdAt : now };
  return { ...data, quests: exists ? data.quests.map((x) => (x.id === q.id ? saved : x)) : [...data.quests, saved] };
}

export function duplicateQuest(data: AppData, actor: Actor, questId: string, now = Date.now()): { data: AppData; quest: Quest } {
  requireTeacher(actor, 'duplicate quests');
  const q = data.quests.find((x) => x.id === questId);
  if (!q) throw new AdventureError('That quest could not be found.', 'missing');
  const copy: Quest = { ...q, id: uid('q'), title: `${q.title} (copy)`.slice(0, 80), createdAt: now, updatedAt: now, fromChallenge: undefined, deleted: false };
  return { data: { ...data, quests: [...data.quests, copy] }, quest: copy };
}

/** Delete a quest: it disappears from every board, but stays in the data so its history keeps its title. */
export function deleteQuest(data: AppData, actor: Actor, questId: string, now = Date.now()): AppData {
  requireTeacher(actor, 'delete quests');
  return { ...data, quests: data.quests.map((q) => (q.id === questId ? { ...q, deleted: true, active: false, updatedAt: now } : q)) };
}

/* ───────────── the state machine ───────────── */

function setStatus(c: Ctx, rec: QuestRecord, status: QuestStatus, by: 'teacher' | 'student' | 'auto', note?: string, patch: Partial<QuestRecord> = {}): QuestRecord {
  const next: QuestRecord = { ...rec, ...patch, status, updatedAt: c.now, history: [...rec.history, { status, at: c.now, by, ...(note ? { note } : {}) }] };
  c.data = { ...c.data, questRecords: c.data.questRecords.some((r) => r.id === rec.id) ? c.data.questRecords.map((r) => (r.id === rec.id ? next : r)) : [...c.data.questRecords, next] };
  return next;
}

/** A completion became approved: it counts for badges, adventure points and an active boss battle. */
function onApproved(c: Ctx, rec: QuestRecord, q: Quest, by: 'teacher' | 'auto'): void {
  patchStudent(c, rec.studentId, (s) => (s.challengeCompletions.some((x) => x.challengeId === q.id && x.periodKey === rec.period) ? s
    : { ...s, challengeCompletions: [...s.challengeCompletions, { challengeId: q.id, periodKey: rec.period, at: c.now }] }));
  addLog(c, { kind: 'quest-approved', classId: rec.classId, studentId: rec.studentId, ref: rec.id, regionId: q.regionId, title: `Quest complete: ${q.title}`, detail: by === 'auto' ? 'Counted from the points your teacher gave.' : 'Approved by your teacher.' });
  c.notes.push({ type: 'quest-done', studentId: rec.studentId, questId: q.id, recordId: rec.id, waiting: false });
  hitBoss(c, rec.classId, { studentId: rec.studentId, amount: questHit(q.reward.xp), source: 'quest', ref: rec.id, label: q.title });
  refreshBadges(c, [rec.studentId]);
  syncWorld(c, rec.classId);
}

function questOrThrow(data: AppData, questId: string): Quest {
  const q = data.quests.find((x) => x.id === questId && !x.deleted);
  if (!q) throw new AdventureError('That quest could not be found.', 'missing');
  return q;
}

/**
 * "I did it": a student submits their own quest (always waits for the teacher), or the teacher marks a
 * student's quest done (approved at once). A rejected quest can be submitted again.
 */
export function submitQuest(data: AppData, actor: Actor, questId: string, studentId: string, now = Date.now(), note?: string): AdventureResult {
  requireSelfOrTeacher(actor, studentId, 'hand in quests');
  const q = questOrThrow(data, questId);
  const s = getStudent(data, studentId);
  if (!isAssigned(q, s)) throw new AdventureError('This quest is not on your quest board.', 'state');
  if (!regionStates(data, s.classId)[q.regionId]?.open) throw new AdventureError(`This quest waits in ${REGIONS_BY_ID[q.regionId].name}, which is not open yet.`, 'state');
  const timing = questTiming(q, now);
  if (timing !== 'live') throw new AdventureError(timing === 'upcoming' ? 'This quest has not started yet.' : 'This quest is not running right now.', 'state');
  if (actor.role === 'student' && q.requirement.type === 'tracked') throw new AdventureError('This quest counts by itself when your teacher gives you points.', 'state');
  const c = ctxOf(data, now);
  const period = questPeriod(q, now);
  const existing = findRecord(data, q.id, studentId, period);
  if (existing && existing.status !== 'rejected') throw new AdventureError(existing.status === 'submitted' ? 'Already handed in: waiting for your teacher.' : 'This quest is already complete.', 'state');
  const by = actor.role === 'teacher' ? 'teacher' : 'student';
  const base: QuestRecord = existing ?? { id: uid('qr'), questId: q.id, studentId, classId: s.classId, period, status: 'submitted', history: [], createdAt: now, updatedAt: now };
  const clean = note?.trim().slice(0, 200) || undefined;
  if (by === 'teacher') {
    const rec = setStatus(c, base, 'approved', 'teacher', clean, { reason: undefined });
    onApproved(c, rec, q, 'teacher');
  } else {
    const rec = setStatus(c, base, 'submitted', 'student', clean, { reason: undefined });
    addLog(c, { kind: 'quest-submitted', classId: s.classId, studentId, ref: rec.id, regionId: q.regionId, title: `Handed in: ${q.title}`, detail: 'Waiting for your teacher.' });
    c.notes.push({ type: 'quest-done', studentId, questId: q.id, recordId: rec.id, waiting: true });
  }
  return result(c);
}

function recordOrThrow(data: AppData, recordId: string): { rec: QuestRecord; q: Quest } {
  const rec = data.questRecords.find((r) => r.id === recordId);
  if (!rec) throw new AdventureError('That quest entry could not be found.', 'missing');
  const q = data.quests.find((x) => x.id === rec.questId);
  if (!q) throw new AdventureError('That quest could not be found.', 'missing');
  return { rec, q };
}

/** Teacher: approve a submitted (or earlier rejected) quest. */
export function approveQuest(data: AppData, actor: Actor, recordId: string, now = Date.now(), note?: string): AdventureResult {
  requireTeacher(actor, 'approve quests');
  const { rec, q } = recordOrThrow(data, recordId);
  if (rec.status !== 'submitted' && rec.status !== 'rejected') throw new AdventureError('Only handed-in quests can be approved.', 'state');
  const c = ctxOf(data, now);
  const next = setStatus(c, rec, 'approved', 'teacher', note?.trim() || undefined, { reason: undefined });
  onApproved(c, next, q, 'teacher');
  return result(c);
}

/** Teacher: send a submission back with a short explanation; the student can try again. */
export function rejectQuest(data: AppData, actor: Actor, recordId: string, reason: string, now = Date.now()): AdventureResult {
  requireTeacher(actor, 'send quests back');
  const why = reason.trim().slice(0, 200);
  if (!why) throw new AdventureError('Write a short reason so the student knows what to do next.', 'invalid');
  const { rec, q } = recordOrThrow(data, recordId);
  if (rec.status !== 'submitted') throw new AdventureError('Only handed-in quests can be sent back.', 'state');
  const c = ctxOf(data, now);
  setStatus(c, rec, 'rejected', 'teacher', why, { reason: why });
  addLog(c, { kind: 'quest-rejected', classId: rec.classId, studentId: rec.studentId, ref: rec.id, regionId: q.regionId, title: `Try again: ${q.title}`, detail: why });
  return result(c);
}

/** Collect the reward of an approved quest. Granted exactly once (ledger key quest:<record id>). */
export function collectQuest(data: AppData, actor: Actor, recordId: string, now = Date.now()): AdventureResult {
  const { rec, q } = recordOrThrow(data, recordId);
  requireSelfOrTeacher(actor, rec.studentId, 'collect rewards');
  if (rec.status === 'collected') throw new AdventureError('This reward was already collected.', 'state');
  if (rec.status !== 'approved') throw new AdventureError('This quest is not approved yet.', 'state');
  const c = ctxOf(data, now);
  const key = `quest:${rec.id}`;
  const r = applyReward(c.data, [{ studentId: rec.studentId, key, xp: q.reward.xp, coins: q.reward.coins, itemId: q.reward.itemId }], { kind: 'quest', ref: rec.id, label: `Quest reward: ${q.title}`, icon: '📜' }, now);
  c.data = r.data;
  c.outcomes.push(...r.outcomes);
  const ev = r.data.events.find((e) => e.batchId === r.batchId);
  setStatus(c, rec, 'collected', actor.role === 'teacher' ? 'teacher' : 'student', undefined, r.granted.length ? { rewardBatchId: r.batchId } : {});
  if (r.granted.length) {
    addLog(c, { kind: 'quest-collected', classId: rec.classId, studentId: rec.studentId, ref: rec.id, regionId: q.regionId, title: `Reward collected: ${q.title}`, xp: ev?.xp, coins: ev?.coins, itemId: ev?.reward?.itemId });
    c.notes.push({ type: 'quest-collected', studentId: rec.studentId, questId: q.id, xp: ev?.xp ?? 0, coins: ev?.coins ?? 0, itemId: ev?.reward?.itemId });
    for (const o of r.outcomes) for (const a of o.newAchievements) c.notes.push({ type: 'achievement', studentId: o.studentId, achievementId: a });
  }
  return result(c);
}

/** Teacher quick action: approve every handed-in quest of a class. */
export function approveAll(data: AppData, actor: Actor, classId: string, now = Date.now()): AdventureResult {
  requireTeacher(actor, 'approve quests');
  const c = ctxOf(data, now);
  for (const rec of data.questRecords.filter((r) => r.classId === classId && r.status === 'submitted')) {
    const q = c.data.quests.find((x) => x.id === rec.questId);
    if (!q) continue;
    const current = c.data.questRecords.find((r) => r.id === rec.id)!;
    onApproved(c, setStatus(c, current, 'approved', 'teacher'), q, 'teacher');
  }
  return result(c);
}

/** Teacher quick action: hand out every approved, uncollected reward of a class. */
export function collectAll(data: AppData, actor: Actor, classId: string, now = Date.now()): AdventureResult {
  requireTeacher(actor, 'hand out rewards');
  let acc: AdventureResult = { data, notes: [], outcomes: [] };
  for (const rec of data.questRecords.filter((r) => r.classId === classId && r.status === 'approved')) {
    const r = collectQuest(acc.data, actor, rec.id, now);
    acc = { data: r.data, notes: [...acc.notes, ...r.notes], outcomes: [...acc.outcomes, ...r.outcomes] };
  }
  return acc;
}

/**
 * Tracked quests complete by themselves when teacher awards reach the target: approved at once, or waiting
 * for the teacher when the quest asks for approval. Runs after every award. Idempotent.
 */
export function syncTrackedQuests(c: Ctx, studentIds: string[], sourceBatchId?: string): void {
  for (const sid of new Set(studentIds)) {
    const s = c.data.students.find((x) => x.id === sid);
    if (!s) continue;
    const regions = regionStates(c.data, s.classId);
    for (const q of c.data.quests) {
      if (q.requirement.type !== 'tracked' || !isAssigned(q, s) || questTiming(q, c.now) !== 'live' || !regions[q.regionId]?.open) continue;
      const period = questPeriod(q, c.now);
      if (findRecord(c.data, q.id, sid, period)) continue;
      // a 1.4 challenge already completed in this period (before the update) is not paid again
      if (q.fromChallenge && s.challengeCompletions.some((x) => x.challengeId === q.fromChallenge && x.periodKey === period)) continue;
      if (!questProgress(q, sid, c.data.events, c.now).done) continue;
      const base: QuestRecord = { id: uid('qr'), questId: q.id, studentId: sid, classId: s.classId, period, status: 'submitted', history: [], createdAt: c.now, updatedAt: c.now, ...(sourceBatchId ? { sourceBatchId } : {}) };
      if (q.approval) {
        const rec = setStatus(c, base, 'submitted', 'auto', 'Target reached');
        addLog(c, { kind: 'quest-submitted', classId: s.classId, studentId: sid, ref: rec.id, regionId: q.regionId, title: `Target reached: ${q.title}`, detail: 'Waiting for your teacher.' });
        c.notes.push({ type: 'quest-done', studentId: sid, questId: q.id, recordId: rec.id, waiting: true });
      } else {
        onApproved(c, setStatus(c, base, 'approved', 'auto', 'Target reached'), q, 'auto');
      }
    }
  }
}
