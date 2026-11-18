import { useRef, useState } from 'react';
import { QUEST_CATEGORIES, REGIONS, REGIONS_BY_ID } from '../../data/adventure';
import { ITEMS, ITEMS_BY_ID, TAG_LABELS } from '../../data/defaults';
import { Icon } from '../../components/Icon';
import { Modal, ProgressBar, SectionTitle } from '../../components/ui';
import { playQuest } from '../../audio/sfx';
import { isAssigned, questBoard, questPeriod, regionStates, type QuestState, type QuestView } from '../../engine/adventure';
import { firstName, timeAgo, uid } from '../../engine/util';
import { pop, sparkle } from '../../lib/motion';
import { useStore } from '../../store/store';
import type { CategoryTag, Quest, QuestCategory, QuestKind, QuestRecord, RegionId, Student } from '../../types';
import { EmptyNote, RewardLine, StudentChip, advPath, go } from './common';

export const QUEST_STATE_TEXT: Record<QuestState, string> = {
  todo: 'To do', submitted: 'Waiting for teacher', approved: 'Reward ready', rejected: 'Try again', collected: 'Done', locked: 'Region locked', upcoming: 'Starts soon', ended: 'Ended',
};
const KIND_LABEL: Record<QuestKind, string> = { daily: 'Daily', weekly: 'Weekly', custom: 'Special' };
const KIND_ICON = { daily: 'sun', weekly: 'calendar', custom: 'scroll' } as const;

export function requirementText(q: Quest): string {
  const r = q.requirement;
  if (r.type === 'check') return q.approval ? 'Hand it in; your teacher checks it' : 'Your teacher marks it done';
  const when = q.kind === 'daily' ? 'today' : q.kind === 'weekly' ? 'this week' : '';
  return r.metric === 'xp' ? `Earn ${r.target} XP ${when}`.trim() : `${r.target}× ${r.tag ? TAG_LABELS[r.tag] : 'any award'} ${when}`.trim();
}

/** Quests: the teacher's quest book and approvals, or one student's quest board. */
export function QuestsView({ classId, student, teacher }: { classId: string; student: Student | null; teacher: boolean }) {
  if (student) return <QuestBoard student={student} teacher={teacher} />;
  if (!teacher) return null;
  return <QuestBook classId={classId} />;
}

/* ───────────── student board ───────────── */

function QuestBoard({ student, teacher }: { student: Student; teacher: boolean }) {
  const data = useStore((s) => s.data);
  const board = questBoard(data, student).filter((v) => v.state !== 'ended');
  const groups: QuestKind[] = ['daily', 'weekly', 'custom'];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <StudentChip student={student} onClear={teacher ? () => go(advPath('quests')) : undefined} />
        <span className="text-sm font-bold text-ink-soft">{student.challengeCompletions.length} quest{student.challengeCompletions.length === 1 ? '' : 's'} completed so far</span>
      </div>
      {!board.length && <EmptyNote icon="scroll" title="No quests right now">New quests appear here when your teacher adds them.</EmptyNote>}
      {groups.map((k) => {
        const list = board.filter((v) => v.quest.kind === k);
        if (!list.length) return null;
        return (
          <section key={k}>
            <SectionTitle>{k === 'daily' ? 'Today' : k === 'weekly' ? 'This week' : 'Special quests'}</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-stagger>
              {list.map((v) => <QuestCard key={v.quest.id} view={v} student={student} teacher={teacher} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function QuestCard({ view, student, teacher }: { view: QuestView; student: Student; teacher: boolean }) {
  const { quest: q, record, state, progress } = view;
  const submit = useStore((s) => s.submitQuest);
  const collect = useStore((s) => s.collectQuest);
  const approve = useStore((s) => s.approveQuest);
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const [rejecting, setRejecting] = useState<QuestRecord | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const tracked = q.requirement.type === 'tracked';
  const done = state === 'approved' || state === 'collected';
  const value = done ? progress.target : progress.value;
  const item = q.reward.itemId ? ITEMS_BY_ID[q.reward.itemId]?.name : undefined;
  const onCollect = (e: React.MouseEvent) => {
    if (!record) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (collect(record.id)) { if (sound) playQuest(); sparkle(r.left + r.width / 2, r.top + r.height / 2, ['#ffd23f', '#ffffff', '#ff8fb1', '#7fc4f0']); pop(card.current, 1.05); }
  };
  return (
    <div ref={card} className={`paper flex flex-col gap-2 p-4 ${state === 'approved' ? 'ring-2 ring-gilt shadow-[var(--shadow-glow)]' : ''} ${state === 'collected' || state === 'locked' ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${done ? 'bg-leaf-pale text-leaf' : 'bg-mist text-azure-800'}`}><Icon name={done ? 'check' : KIND_ICON[q.kind]} size={20} strokeWidth={2.4} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold leading-tight">{q.title}</div>
          {q.description && <div className="text-[13px] text-ink-soft">{q.description}</div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="chip bg-mist text-azure-800">{REGIONS_BY_ID[q.regionId].name}</span>
        <RewardLine xp={q.reward.xp} coins={q.reward.coins} itemName={item} className="!text-xs" />
      </div>
      {tracked && state !== 'locked' && (
        <div className="flex items-center gap-2">
          <ProgressBar pct={value / progress.target} height={10} color={done ? '#1a8f4c' : '#2563b8'} className="flex-1" />
          <span className="text-xs font-bold tabular-nums text-ink-soft">{value}/{progress.target}</span>
        </div>
      )}
      <div className="text-[12px] font-bold text-ink-soft">{requirementText(q)}</div>
      {state === 'rejected' && record?.reason && <div className="rounded-xl bg-brick-pale p-2 text-sm font-bold text-brick">Your teacher says: {record.reason}</div>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {state === 'approved' && <button className="btn btn-primary" onClick={onCollect} data-spark><Icon name="gift" size={18} />Collect reward</button>}
        {(state === 'todo' || state === 'rejected') && !tracked && (
          <button className={teacher ? 'btn btn-azure' : 'btn btn-buy'} onClick={() => submit(q.id, student.id)}>
            <Icon name="check" size={18} strokeWidth={2.6} />{teacher ? 'Mark done' : state === 'rejected' ? 'Try again: hand it in' : 'I did it!'}
          </button>
        )}
        {state === 'todo' && tracked && teacher && <button className="btn btn-light !text-sm" onClick={() => submit(q.id, student.id)}>Mark done anyway</button>}
        {state === 'submitted' && (teacher
          ? <><button className="btn btn-buy !py-1.5" onClick={() => record && approve(record.id)}>Approve</button><button className="btn btn-light !py-1.5" onClick={() => record && setRejecting(record)}>Send back</button></>
          : <span className="chip bg-gilt-pale py-1.5 text-gilt-ink"><Icon name="hourglass" size={14} />Waiting for your teacher</span>)}
        {state === 'collected' && <span className="chip bg-leaf-pale py-1.5 text-leaf"><Icon name="check" size={14} strokeWidth={2.6} />Done</span>}
        {state === 'locked' && <span className="chip bg-mist py-1.5 text-ink-soft"><Icon name="lock" size={14} />Opens with {REGIONS_BY_ID[q.regionId].name}</span>}
        {state === 'upcoming' && <span className="chip bg-mist py-1.5 text-ink-soft">Starts {q.startAt ? new Date(q.startAt).toLocaleDateString() : 'soon'}</span>}
      </div>
      <RejectModal record={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}

/* ───────────── teacher: quest book ───────────── */

function QuestBook({ classId }: { classId: string }) {
  const data = useStore((s) => s.data);
  const approveAll = useStore((s) => s.approveAllQuests);
  const collectAll = useStore((s) => s.collectAllQuests);
  const [editing, setEditing] = useState<Quest | null>(null);
  const [kind, setKind] = useState<QuestKind>('daily');
  const students = data.students.filter((s) => s.classId === classId);
  const waiting = data.questRecords.filter((r) => r.classId === classId && r.status === 'submitted').sort((a, b) => a.updatedAt - b.updatedAt);
  const toCollect = data.questRecords.filter((r) => r.classId === classId && r.status === 'approved').length;
  const quests = data.quests.filter((q) => !q.deleted && (q.classId === null || q.classId === classId));
  const regions = regionStates(data, classId);
  const now = Date.now();
  const blank = (): Quest => ({
    id: uid('q'), classId, title: '', description: '', category: 'participation', kind, regionId: 'verdant', assign: 'class',
    reward: { xp: kind === 'weekly' ? 10 : 3, coins: kind === 'weekly' ? 15 : 5 }, requirement: kind === 'custom' ? { type: 'check' } : { type: 'tracked', metric: 'count', tag: 'participation', target: 1 },
    approval: kind === 'custom', active: true, createdAt: now, updatedAt: now,
  });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionTitle action={waiting.length > 1 ? <button className="btn btn-buy !py-2" onClick={() => approveAll(classId)}><Icon name="check" size={18} strokeWidth={2.6} />Approve all {waiting.length}</button> : undefined}>
          Waiting for you {waiting.length ? `(${waiting.length})` : ''}
        </SectionTitle>
        {!waiting.length ? <p className="paper p-4 text-sm text-ink-soft">Nothing to check. Handed-in quests appear here.</p> : (
          <div className="grid gap-2 md:grid-cols-2" data-stagger>{waiting.map((r) => <ApprovalRow key={r.id} record={r} />)}</div>
        )}
        {toCollect > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-gilt-pale p-3 ring-1 ring-gilt/50">
            <Icon name="gift" size={20} className="text-gilt-ink" />
            <span className="flex-1 text-sm font-bold text-gilt-ink">{toCollect} approved reward{toCollect === 1 ? '' : 's'} not collected yet. Students can collect them in Presentation Mode, or you can hand them out now.</span>
            <button className="btn btn-primary !py-2" onClick={() => collectAll(classId)}>Hand out all</button>
          </div>
        )}
      </section>

      <section>
        <SectionTitle action={<button className="btn btn-primary !py-2" onClick={() => setEditing(blank())}><Icon name="plus" size={18} />New quest</button>}>Quest book</SectionTitle>
        <div className="mb-3 flex gap-1.5" role="tablist" aria-label="Quest type">
          {(['daily', 'weekly', 'custom'] as QuestKind[]).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 font-display font-semibold transition ${kind === k ? 'bg-azure-700 text-white' : 'bg-white text-ink ring-1 ring-rule hover:bg-wash'}`}>
              {KIND_LABEL[k]} <span className="tabular-nums opacity-70">{quests.filter((q) => q.kind === k).length}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-stagger>
          {quests.filter((q) => q.kind === kind).map((q) => {
            const assigned = students.filter((s) => isAssigned(q, s));
            const period = questPeriod(q, now);
            const done = data.questRecords.filter((r) => r.questId === q.id && r.period === period && (r.status === 'approved' || r.status === 'collected') && assigned.some((s) => s.id === r.studentId)).length;
            const open = regions[q.regionId]?.open;
            return (
              <div key={q.id} className={`paper flex flex-col gap-2 p-4 ${q.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-lg font-bold leading-tight">{q.title}</div>
                    <div className="text-[12px] font-bold text-ink-soft">{requirementText(q)}</div>
                  </div>
                  <span className="chip shrink-0 bg-mist text-azure-800"><Icon name={KIND_ICON[q.kind]} size={13} />{KIND_LABEL[q.kind]}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  <span className={`chip ${open ? 'bg-mist text-azure-800' : 'bg-white text-ink-soft ring-1 ring-rule'}`}>{!open && <Icon name="lock" size={11} />}{REGIONS_BY_ID[q.regionId].name}</span>
                  <span className="chip bg-mist text-azure-800">{QUEST_CATEGORIES[q.category].label}</span>
                  <span className="chip bg-mist text-azure-800">{q.assign === 'class' ? 'Whole class' : `${assigned.length} student${assigned.length === 1 ? '' : 's'}`}</span>
                  {q.approval && <span className="chip bg-gilt-pale text-gilt-ink">Needs approval</span>}
                  {!q.active && <span className="chip bg-white text-ink-soft ring-1 ring-rule">Paused</span>}
                </div>
                <RewardLine xp={q.reward.xp} coins={q.reward.coins} itemName={q.reward.itemId ? ITEMS_BY_ID[q.reward.itemId]?.name : undefined} />
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ProgressBar pct={assigned.length ? done / assigned.length : 0} height={8} className="flex-1" />
                  <span className="tabular-nums text-ink-soft">{done}/{assigned.length} {q.kind === 'daily' ? 'today' : q.kind === 'weekly' ? 'this week' : 'done'}</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  <button className="btn btn-light !px-3 !py-1 !text-xs" onClick={() => setEditing(q)}><Icon name="edit" size={14} />Edit</button>
                  <DuplicateButton id={q.id} onCopied={(id) => { const c = useStore.getState().data.quests.find((x) => x.id === id); if (c) setEditing(c); }} />
                </div>
              </div>
            );
          })}
          {!quests.some((q) => q.kind === kind) && <p className="text-sm text-ink-soft">No {KIND_LABEL[kind].toLowerCase()} quests yet.</p>}
        </div>
      </section>

      <section>
        <SectionTitle>Open a student's quest board</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {students.sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
            <button key={s.id} className="btn btn-light !py-1.5 !text-sm" onClick={() => go(advPath('quests', undefined, s.id))}>{firstName(s.name)}</button>
          ))}
        </div>
      </section>

      <QuestEditor quest={editing} classId={classId} onClose={() => setEditing(null)} />
    </div>
  );
}

function DuplicateButton({ id, onCopied }: { id: string; onCopied: (id: string) => void }) {
  const dup = useStore((s) => s.duplicateQuest);
  return <button className="btn btn-light !px-3 !py-1 !text-xs" onClick={() => { const c = dup(id); if (c) onCopied(c); }}><Icon name="copy" size={14} />Duplicate</button>;
}

function ApprovalRow({ record }: { record: QuestRecord }) {
  const data = useStore((s) => s.data);
  const approve = useStore((s) => s.approveQuest);
  const [rejecting, setRejecting] = useState(false);
  const st = data.students.find((s) => s.id === record.studentId);
  const q = data.quests.find((x) => x.id === record.questId);
  if (!st || !q) return null;
  const last = record.history[record.history.length - 1];
  return (
    <div className="paper flex flex-wrap items-center gap-3 p-3">
      <StudentChip student={st} />
      <div className="min-w-0 flex-1">
        <div className="font-bold leading-tight">{q.title}</div>
        <div className="text-xs font-bold text-ink-soft">{last?.by === 'auto' ? 'Target reached' : 'Handed in'} {timeAgo(record.updatedAt)}{last?.note ? ` · "${last.note}"` : ''}</div>
      </div>
      <button className="btn btn-buy !py-1.5" onClick={() => approve(record.id)}><Icon name="check" size={16} strokeWidth={2.6} />Approve</button>
      <button className="btn btn-light !py-1.5" onClick={() => setRejecting(true)}>Send back</button>
      <RejectModal record={rejecting ? record : null} onClose={() => setRejecting(false)} />
    </div>
  );
}

const QUICK_REASONS = ['Almost! Finish the last part.', 'Show me your work first.', 'Please try again neatly.', 'Not quite yet, keep going!'];

function RejectModal({ record, onClose }: { record: QuestRecord | null; onClose: () => void }) {
  const reject = useStore((s) => s.rejectQuest);
  const [reason, setReason] = useState('');
  return (
    <Modal open={!!record} onClose={onClose} label="Send the quest back">
      <form className="p-6" onSubmit={(e) => { e.preventDefault(); if (record && reject(record.id, reason)) { setReason(''); onClose(); } }}>
        <h2 className="font-display text-2xl font-bold">Send back with a note</h2>
        <p className="mt-1 text-sm text-ink-soft">The student sees your note and can hand the quest in again.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{QUICK_REASONS.map((r) => <button type="button" key={r} className="chip bg-mist py-1 text-azure-800 hover:bg-mist-deep" onClick={() => setReason(r)}>{r}</button>)}</div>
        <textarea className="input mt-3 min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="What should they do next?" autoFocus />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!reason.trim()}>Send back</button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────── editor ───────────── */

const toDate = (t?: number) => (t ? new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '');
const fromDate = (s: string, end = false) => (s ? new Date(`${s}T${end ? '23:59:59' : '00:00:00'}`).getTime() : undefined);

function QuestEditor({ quest, classId, onClose }: { quest: Quest | null; classId: string; onClose: () => void }) {
  const save = useStore((s) => s.saveQuest);
  const del = useStore((s) => s.deleteQuest);
  const all = useStore((s) => s.data.students);
  const exists = useStore((s) => !!quest && s.data.quests.some((q) => q.id === quest.id));
  const appData = useStore((s) => s.data);
  const regions = regionStates(appData, classId);
  const students = all.filter((s) => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name));
  const [d, setD] = useState<Quest | null>(quest);
  if (quest && d?.id !== quest.id) setD(quest);
  const shopItems = ITEMS.filter((i) => i.unlock.type === 'shop');
  if (!d) return <Modal open={false} onClose={onClose} label="Quest">{null}</Modal>;
  const req = d.requirement;
  const setReq = (patch: Partial<Extract<Quest['requirement'], { type: 'tracked' }>>) => req.type === 'tracked' && setD({ ...d, requirement: { ...req, ...patch } });
  return (
    <Modal open={!!quest} onClose={onClose} label="Edit quest" wide>
      <form className="p-6" onSubmit={(e) => { e.preventDefault(); if (save(d)) onClose(); }}>
        <h2 className="font-display text-2xl font-bold">{exists ? 'Edit quest' : 'New quest'}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold sm:col-span-2">Title
            <input className="input mt-1" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={80} placeholder="e.g. Read a page aloud" autoFocus />
          </label>
          <label className="text-sm font-bold sm:col-span-2">What to do (students see this)
            <input className="input mt-1" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={300} placeholder="A short, friendly description" />
          </label>
          <label className="text-sm font-bold">Repeats
            <select className="input mt-1" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as QuestKind })}>
              <option value="daily">Every day</option><option value="weekly">Every week</option><option value="custom">Once (special quest)</option>
            </select>
          </label>
          <label className="text-sm font-bold">Category
            <select className="input mt-1" value={d.category} onChange={(e) => { const category = e.target.value as QuestCategory; const tag = QUEST_CATEGORIES[category].tag; setD({ ...d, category, ...(req.type === 'tracked' && req.metric === 'count' ? { requirement: { ...req, tag } } : {}) }); }}>
              {(Object.keys(QUEST_CATEGORIES) as QuestCategory[]).map((c) => <option key={c} value={c}>{QUEST_CATEGORIES[c].label}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Region
            <select className="input mt-1" value={d.regionId} onChange={(e) => setD({ ...d, regionId: e.target.value as RegionId })}>
              {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}{regions[r.id]?.open ? '' : ' (locked: waits until it opens)'}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">How it is completed
            <select className="input mt-1" value={req.type} onChange={(e) => setD({ ...d, requirement: e.target.value === 'check' ? { type: 'check' } : { type: 'tracked', metric: 'count', tag: QUEST_CATEGORIES[d.category].tag, target: 1 }, approval: e.target.value === 'check' })}>
              <option value="tracked">Counts by itself from the points I give</option><option value="check">Students hand it in / I mark it</option>
            </select>
          </label>
          {req.type === 'tracked' && (
            <>
              <label className="text-sm font-bold">Count
                <select className="input mt-1" value={req.metric} onChange={(e) => setReq({ metric: e.target.value as 'count' | 'xp' })}>
                  <option value="count">Number of awards</option><option value="xp">XP earned</option>
                </select>
              </label>
              {req.metric === 'count' && (
                <label className="text-sm font-bold">Behaviour
                  <select className="input mt-1" value={req.tag ?? ''} onChange={(e) => setReq({ tag: (e.target.value || undefined) as CategoryTag | undefined })}>
                    <option value="">Any positive award</option>
                    {(Object.keys(TAG_LABELS) as CategoryTag[]).filter((t) => t !== 'other').map((t) => <option key={t} value={t}>{TAG_LABELS[t]}</option>)}
                  </select>
                </label>
              )}
              <label className="text-sm font-bold">Target
                <input type="number" min={1} max={1000} className="input mt-1" value={req.target} onChange={(e) => setReq({ target: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
            </>
          )}
          <label className="text-sm font-bold">Reward XP
            <input type="number" min={0} max={100} className="input mt-1" value={d.reward.xp} onChange={(e) => setD({ ...d, reward: { ...d.reward, xp: Math.max(0, Number(e.target.value) || 0) } })} />
          </label>
          <label className="text-sm font-bold">Reward coins
            <input type="number" min={0} max={500} className="input mt-1" value={d.reward.coins} onChange={(e) => setD({ ...d, reward: { ...d.reward, coins: Math.max(0, Number(e.target.value) || 0) } })} />
          </label>
          <label className="text-sm font-bold sm:col-span-2">Reward item (optional, from the shop)
            <select className="input mt-1" value={d.reward.itemId ?? ''} onChange={(e) => setD({ ...d, reward: { ...d.reward, itemId: e.target.value || undefined } })}>
              <option value="">No item</option>
              {shopItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          {d.kind === 'custom' && (
            <>
              <label className="text-sm font-bold">Starts (optional)
                <input type="date" className="input mt-1" value={toDate(d.startAt)} onChange={(e) => setD({ ...d, startAt: fromDate(e.target.value) })} />
              </label>
              <label className="text-sm font-bold">Ends (optional)
                <input type="date" className="input mt-1" value={toDate(d.endAt)} onChange={(e) => setD({ ...d, endAt: fromDate(e.target.value, true) })} />
              </label>
            </>
          )}
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-bold">Who does it</legend>
          <div className="mt-1 flex gap-2">
            <button type="button" aria-pressed={d.assign === 'class'} className={`rounded-full px-4 py-1.5 text-sm font-bold ${d.assign === 'class' ? 'bg-azure-700 text-white' : 'bg-white ring-1 ring-rule'}`} onClick={() => setD({ ...d, assign: 'class' })}>Whole class</button>
            <button type="button" aria-pressed={d.assign !== 'class'} className={`rounded-full px-4 py-1.5 text-sm font-bold ${d.assign !== 'class' ? 'bg-azure-700 text-white' : 'bg-white ring-1 ring-rule'}`} onClick={() => setD({ ...d, assign: d.assign === 'class' ? [] : d.assign })}>Chosen students</button>
          </div>
          {d.assign !== 'class' && (
            <div className="mt-2 grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-2xl bg-wash p-2 ring-1 ring-rule sm:grid-cols-3">
              {students.map((s) => {
                const on = (d.assign as string[]).includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold hover:bg-white">
                    <input type="checkbox" className="h-4 w-4" checked={on} onChange={() => setD({ ...d, assign: on ? (d.assign as string[]).filter((x) => x !== s.id) : [...(d.assign as string[]), s.id] })} />{s.name}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-4">
          {req.type === 'check' || d.kind === 'custom' ? (
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={d.approval} onChange={(e) => setD({ ...d, approval: e.target.checked })} />I approve each completion</label>
          ) : (
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={d.approval} onChange={(e) => setD({ ...d, approval: e.target.checked })} />Wait for my approval when the target is reached</label>
          )}
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} />Active</label>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Students can never complete a quest by themselves: what they hand in always waits for you, and every reward is given only once.</p>
        <div className="mt-6 flex justify-between gap-2">
          {exists ? <button type="button" className="btn btn-danger" onClick={() => { if (del(d.id)) onClose(); }}><Icon name="trash" size={16} />Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!d.title.trim()}>Save quest</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
