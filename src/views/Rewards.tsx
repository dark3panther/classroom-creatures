import { useState } from 'react';
import { Modal, ProgressBar, SectionTitle } from '../components/ui';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { ACHIEVEMENTS, ITEMS, TAG_LABELS } from '../data/defaults';
import { getSpecies } from '../data/species';
import { challengeProgress } from '../engine/awards';
import { uid } from '../engine/util';
import { useClassStudents } from '../lib/stats';
import { useCurrentClass, useStore } from '../store/store';
import type { CategoryTag, Challenge, ItemSlot } from '../types';

const SLOT_LABEL: Record<ItemSlot, string> = { hat: 'Hat', glasses: 'Glasses', wings: 'Wings', magic: 'Magic', background: 'Background', decoration: 'Decoration' };

export function Rewards() {
  const cls = useCurrentClass();
  const students = useClassStudents(cls?.id);
  const challenges = useStore((s) => s.data.challenges);
  const events = useStore((s) => s.data.events);
  const upsert = useStore((s) => s.upsertChallenge);
  const del = useStore((s) => s.deleteChallenge);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const now = Date.now();
  const n = Math.max(1, students.length);
  const preview = getSpecies('lumifox');

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Rewards & Challenges</h1>
      <p className="text-white/70">Badges, collectibles and challenges unlock automatically as students earn XP.</p>

      <section className="mt-6">
        <SectionTitle action={<button className="btn btn-primary !py-2" onClick={() => setEditing({ id: uid('ch'), title: '', period: 'daily', metric: 'count', tag: 'participation', target: 3, active: true })}>＋ New challenge</button>}>
          Daily & weekly challenges
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {challenges.map((c) => {
            const done = students.filter((s) => challengeProgress(c, s.id, events, now).done).length;
            return (
              <div key={c.id} className={`paper p-4 ${c.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="chip bg-sky/15 text-sky">{c.period === 'daily' ? '☀️ Daily' : '📅 Weekly'}</span>
                    <div className="mt-1 font-display text-lg font-semibold">{c.title}</div>
                    <div className="text-xs font-bold text-ink-soft">{c.metric === 'xp' ? `Earn ${c.target} XP` : `${c.target}× ${c.tag ? TAG_LABELS[c.tag] : 'any award'}`}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-light !px-3 !py-1 !text-xs" onClick={() => setEditing(c)}>Edit</button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm font-bold">
                  <ProgressBar pct={done / n} color="#34d399" className="flex-1" />
                  <span className="tabular-nums text-ink-soft">{done}/{students.length} done</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>Achievements</SectionTitle>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = students.filter((s) => s.achievements.some((x) => x.id === a.id)).length;
            return (
              <div key={a.id} className="panel flex items-center gap-3 p-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `${a.color}44` }}>{a.icon}</span>
                <div className="min-w-0">
                  <div className="font-display text-lg font-semibold leading-tight">{a.name}</div>
                  <div className="text-xs text-white/70">{a.description}</div>
                  <div className="mt-0.5 text-xs font-extrabold text-sun">{got} student{got === 1 ? '' : 's'} earned this</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>Collectibles</SectionTitle>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {ITEMS.filter((i) => i.slot !== 'background').map((it) => {
            const owners = students.filter((s) => s.unlockedItems.includes(it.id)).length;
            const u = it.unlock;
            const rule = u.type === 'level' ? `Level ${u.level}` : u.type === 'achievement' ? ACHIEVEMENTS.find((a) => a.id === u.id)?.name : u.type === 'challenges' ? `${u.count} challenges` : 'Free';
            return (
              <div key={it.id} className="paper p-2 text-center">
                <div className="aspect-square rounded-xl bg-cream"><CreatureSvg species={preview} stage={3} equipped={{ [it.slot]: it.id }} effects={false} className="h-full w-full" /></div>
                <div className="mt-1 font-display font-semibold leading-tight">{it.name}</div>
                <div className="text-[11px] font-bold text-ink-soft">{SLOT_LABEL[it.slot]} · {rule}</div>
                <div className="text-[11px] font-extrabold text-grape">{owners} unlocked</div>
              </div>
            );
          })}
        </div>
      </section>

      <ChallengeEditor c={editing} onClose={() => setEditing(null)} onSave={(c) => { upsert(c); setEditing(null); }} onDelete={(cid) => { del(cid); setEditing(null); }} exists={!!editing && challenges.some((x) => x.id === editing.id)} />
    </div>
  );
}

function ChallengeEditor({ c, onClose, onSave, onDelete, exists }: { c: Challenge | null; onClose: () => void; onSave: (c: Challenge) => void; onDelete: (id: string) => void; exists: boolean }) {
  const [draft, setDraft] = useState<Challenge | null>(c);
  if (c && draft?.id !== c.id) setDraft(c);
  const d = draft;
  return (
    <Modal open={!!c} onClose={onClose} label="Edit challenge">
      {d && (
        <form className="p-6" onSubmit={(e) => { e.preventDefault(); if (d.title.trim() && d.target > 0) onSave({ ...d, title: d.title.trim() }); }}>
          <h2 className="font-display text-2xl font-bold">{exists ? 'Edit challenge' : 'New challenge'}</h2>
          <label className="mt-4 block text-sm font-bold">Title
            <input className="input mt-1" value={d.title} onChange={(e) => setDraft({ ...d, title: e.target.value })} placeholder="e.g. Read aloud twice today" autoFocus maxLength={60} />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">Repeats
              <select className="input mt-1" value={d.period} onChange={(e) => setDraft({ ...d, period: e.target.value as Challenge['period'] })}>
                <option value="daily">Every day</option><option value="weekly">Every week</option>
              </select>
            </label>
            <label className="text-sm font-bold">Goal type
              <select className="input mt-1" value={d.metric} onChange={(e) => setDraft({ ...d, metric: e.target.value as Challenge['metric'] })}>
                <option value="count">Number of awards</option><option value="xp">XP earned</option>
              </select>
            </label>
            {d.metric === 'count' && (
              <label className="text-sm font-bold">Behaviour
                <select className="input mt-1" value={d.tag ?? ''} onChange={(e) => setDraft({ ...d, tag: (e.target.value || undefined) as CategoryTag | undefined })}>
                  <option value="">Any positive award</option>
                  {(Object.keys(TAG_LABELS) as CategoryTag[]).filter((t) => t !== 'other').map((t) => <option key={t} value={t}>{TAG_LABELS[t]}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm font-bold">Target
              <input type="number" min={1} max={500} className="input mt-1" value={d.target} onChange={(e) => setDraft({ ...d, target: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5 accent-[#8b5cf6]" checked={d.active} onChange={(e) => setDraft({ ...d, active: e.target.checked })} /> Active
          </label>
          <div className="mt-6 flex justify-between gap-2">
            {exists ? <button type="button" className="btn btn-danger" onClick={() => onDelete(d.id)}>Delete</button> : <span />}
            <div className="flex gap-2">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!d.title.trim()}>Save</button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
