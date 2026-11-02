import { useEffect, useState } from 'react';
import { Modal, Toggle } from '../components/ui';
import { DEFAULT_EVOLUTION_LEVELS, DEFAULT_LEVEL_XP, TAG_LABELS } from '../data/defaults';
import { STAGE_NAMES } from '../data/elements';
import { parseBackup, toBackup } from '../engine/backup';
import { hashPin, isValidPin } from '../engine/pin';
import { uid } from '../engine/util';
import { navigate } from '../lib/router';
import { listSnapshots, type Snapshot } from '../store/storage';
import { useStore } from '../store/store';
import type { Category, CategoryTag, Settings as SettingsT } from '../types';
import { CreateClassModal } from './Dashboard';

const TABS = [
  ['classes', 'Classes'], ['behaviours', 'Behaviours'], ['progression', 'XP & Evolution'], ['classroom', 'Classroom & PIN'], ['backup', 'Backup & Data'],
] as const;

export function SettingsView({ tab = 'classes' }: { tab?: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-5 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Settings</h1>
      <div className="mt-4 flex gap-1 overflow-x-auto rounded-full bg-white/10 p-1">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => navigate(`/settings/${k}`)} className={`whitespace-nowrap rounded-full px-4 py-2 font-display font-semibold ${tab === k ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`}>{l}</button>
        ))}
      </div>
      <div className="paper mt-4 p-5 sm:p-6">
        {tab === 'classes' && <ClassesTab />}
        {tab === 'behaviours' && <BehavioursTab />}
        {tab === 'progression' && <ProgressionTab />}
        {tab === 'classroom' && <ClassroomTab />}
        {tab === 'backup' && <BackupTab />}
      </div>
    </div>
  );
}

function ClassesTab() {
  const classes = useStore((s) => s.data.classes);
  const students = useStore((s) => s.data.students);
  const update = useStore((s) => s.updateClass);
  const remove = useStore((s) => s.deleteClass);
  const randomize = useStore((s) => s.randomizeClass);
  const setCurrent = useStore((s) => s.setCurrentClass);
  const notify = useStore((s) => s.notify);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const target = classes.find((c) => c.id === deleting);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Classes</h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>＋ New class</button>
      </div>
      <div className="flex flex-col gap-3">
        {classes.map((c) => {
          const count = students.filter((s) => s.classId === c.id).length;
          return (
            <div key={c.id} className={`rounded-2xl border-2 p-4 ${c.archived ? 'border-dashed border-ink/15 opacity-70' : 'border-ink/10'}`}>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
                <label className="text-xs font-extrabold uppercase text-ink-soft">Name
                  <input className="input mt-1 !text-base" defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c.id, { name: e.target.value.trim() })} />
                </label>
                <label className="text-xs font-extrabold uppercase text-ink-soft">Grade
                  <input className="input mt-1 !text-base" defaultValue={c.grade} onBlur={(e) => e.target.value !== c.grade && update(c.id, { grade: e.target.value })} />
                </label>
                <label className="text-xs font-extrabold uppercase text-ink-soft">Class XP goal
                  <input type="number" min={50} step={50} className="input mt-1 !text-base" defaultValue={c.goal} onBlur={(e) => { const g = Math.max(50, Number(e.target.value) || 0); if (g !== c.goal) { update(c.id, { goal: g }); notify('New class goal set'); } }} />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-ink-soft">{count} students{c.isDemo ? ' · demo' : ''}{c.archived ? ' · archived' : ''}</span>
                <span className="flex-1" />
                {!c.archived && <button className="btn btn-light !py-1.5 !text-sm" onClick={() => { setCurrent(c.id); navigate('/'); }}>Open</button>}
                {!c.archived && <button className="btn btn-light !py-1.5 !text-sm" onClick={() => { if (confirmBox(`Give every student in ${c.name} a new random creature? Their XP and progress stay.`)) { randomize(c.id); notify('Creatures shuffled!'); } }}>🎲 Re-roll creatures</button>}
                <button className="btn btn-light !py-1.5 !text-sm" onClick={() => update(c.id, { archived: !c.archived })}>{c.archived ? 'Restore' : 'Archive'}</button>
                <button className="btn btn-light !py-1.5 !text-sm !text-[#b91c1c]" onClick={() => { setDeleting(c.id); setConfirm(''); }}>Delete</button>
              </div>
            </div>
          );
        })}
        {classes.length === 0 && <p className="text-ink-soft">No classes yet.</p>}
      </div>
      <p className="mt-3 text-sm text-ink-soft">Archiving hides a class but keeps all progress. Students can be moved between classes from their profile (Manage tab).</p>
      <CreateClassModal open={creating} onClose={() => setCreating(false)} />
      <Modal open={!!target} onClose={() => setDeleting(null)} label="Delete class">
        {target && (
          <div className="p-6">
            <h2 className="font-display text-2xl font-bold text-[#b91c1c]">Delete “{target.name}”?</h2>
            <p className="mt-2 text-ink-soft">This removes the class and all its students’ progress. A safety snapshot is saved first, but consider <b>archiving</b> instead. Type <b>DELETE</b> to confirm.</p>
            <input className="input mt-3" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-light" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={confirm !== 'DELETE'} onClick={async () => { await remove(target.id); setDeleting(null); notify('Class deleted', 'info'); }}>Delete class</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const confirmBox = (msg: string) => window.confirm(msg);

const ICONS = ['🌟', '✋', '🤝', '💬', '✅', '📖', '👂', '🎨', '🧩', '🏠', '💪', '🎵', '🔢', '🧹', '🙋', '😊', '🚀', '🏆', '🌈', '🍎', '✏️', '🔬', '⚽', '🎯', '💛'];
const COLORS = ['#ffb020', '#4f8cff', '#ff6fa3', '#24b47e', '#36c2b4', '#8b5cf6', '#f97316', '#ec4899', '#0ea5e9', '#84cc16', '#ef4444', '#64748b'];

function BehavioursTab() {
  const categories = useStore((s) => s.data.categories);
  const negative = useStore((s) => s.data.settings.negativeEnabled);
  const upsert = useStore((s) => s.upsertCategory);
  const del = useStore((s) => s.deleteCategory);
  const [edit, setEdit] = useState<Category | null>(null);
  const pinnedCount = categories.filter((c) => c.pinned).length;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Behaviour categories</h2>
        <button className="btn btn-primary" onClick={() => setEdit({ id: uid('cat'), name: '', xp: 3, icon: '🌟', color: '#8b5cf6', tag: 'other' })}>＋ New</button>
      </div>
      <p className="mb-4 text-sm text-ink-soft">⭐ Pinned behaviours (up to 3) appear as quick buttons on every student card.</p>
      <div className="flex flex-col gap-2">
        {categories.filter((c) => c.xp > 0 || negative).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-ink/5 p-2 pr-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: c.xp < 0 ? '#94a3b8' : c.color }}>{c.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{c.name}</span>
              <span className="text-xs font-bold text-ink-soft">{c.xp > 0 ? '+' : ''}{c.xp} XP · counts as {TAG_LABELS[c.tag]}</span>
            </span>
            {c.xp > 0 && (
              <button className={`text-xl ${c.pinned ? '' : 'opacity-30 grayscale'}`} title={c.pinned ? 'Unpin from cards' : 'Pin to student cards'} aria-label={c.pinned ? `Unpin ${c.name}` : `Pin ${c.name}`}
                disabled={!c.pinned && pinnedCount >= 3} onClick={() => upsert({ ...c, pinned: !c.pinned })}>⭐</button>
            )}
            <button className="btn btn-light !px-3 !py-1.5 !text-sm" onClick={() => setEdit(c)}>Edit</button>
          </div>
        ))}
      </div>
      {!negative && <p className="mt-4 text-sm text-ink-soft">Negative points are turned off (recommended). You can enable them in Classroom & PIN.</p>}
      <Modal open={!!edit} onClose={() => setEdit(null)} label="Edit behaviour">
        {edit && <CategoryForm c={edit} negative={negative} exists={categories.some((x) => x.id === edit.id)} onSave={(c) => { upsert(c); setEdit(null); }} onDelete={() => { del(edit.id); setEdit(null); }} onCancel={() => setEdit(null)} />}
      </Modal>
    </div>
  );
}

function CategoryForm({ c, negative, exists, onSave, onDelete, onCancel }: { c: Category; negative: boolean; exists: boolean; onSave: (c: Category) => void; onDelete: () => void; onCancel: () => void }) {
  const [d, setD] = useState(c);
  const valid = d.name.trim() && d.xp !== 0 && (d.xp > 0 || negative) && Math.abs(d.xp) <= 100;
  return (
    <form className="p-6" onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...d, name: d.name.trim() }); }}>
      <h2 className="font-display text-2xl font-bold">{exists ? 'Edit behaviour' : 'New behaviour'}</h2>
      <label className="mt-4 block text-sm font-bold">Name<input className="input mt-1" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus maxLength={32} /></label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">XP{negative ? ' (negative allowed)' : ''}
          <input type="number" className="input mt-1" min={negative ? -20 : 1} max={100} value={d.xp} onChange={(e) => setD({ ...d, xp: Math.round(Number(e.target.value) || 0) })} />
        </label>
        <label className="text-sm font-bold">Counts toward
          <select className="input mt-1" value={d.tag} onChange={(e) => setD({ ...d, tag: e.target.value as CategoryTag })}>
            {(Object.keys(TAG_LABELS) as CategoryTag[]).map((t) => <option key={t} value={t}>{TAG_LABELS[t]}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 text-sm font-bold">Icon</div>
      <div className="mt-1 flex flex-wrap gap-1">{ICONS.map((i) => <button type="button" key={i} onClick={() => setD({ ...d, icon: i })} className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${d.icon === i ? 'bg-grape/20 ring-2 ring-grape' : 'bg-ink/5'}`}>{i}</button>)}</div>
      <div className="mt-3 text-sm font-bold">Colour</div>
      <div className="mt-1 flex flex-wrap gap-1.5">{COLORS.map((col) => <button type="button" key={col} aria-label={col} onClick={() => setD({ ...d, color: col })} className={`h-8 w-8 rounded-full ${d.color === col ? 'ring-4 ring-ink/30' : ''}`} style={{ background: col }} />)}</div>
      <div className="mt-6 flex justify-between gap-2">
        {exists ? <button type="button" className="btn btn-danger" onClick={onDelete}>Delete</button> : <span />}
        <div className="flex gap-2"><button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={!valid}>Save</button></div>
      </div>
      <p className="mt-3 text-xs text-ink-soft">Deleting a behaviour never removes XP students already earned with it.</p>
    </form>
  );
}

function ProgressionTab() {
  const settings = useStore((s) => s.data.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const notify = useStore((s) => s.notify);
  const [levels, setLevels] = useState<number[]>(settings.levelXp);
  const [evo, setEvo] = useState<number[]>(settings.evolutionLevels);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setLevels(settings.levelXp); setEvo(settings.evolutionLevels); }, [settings.levelXp, settings.evolutionLevels]);
  const save = (l = levels, e = evo) => {
    const r = updateSettings({ levelXp: l, evolutionLevels: e as SettingsT['evolutionLevels'] });
    setErr(r);
    if (!r) notify('XP progression saved');
  };
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">XP & evolution</h2>
      <p className="text-sm text-ink-soft">Total XP needed for each level, and the level at which creatures evolve. Changes apply to everyone right away; nobody loses badges or items.</p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-extrabold uppercase tracking-wider text-ink-soft">Levels</div>
          <div className="flex flex-col gap-1.5">
            {levels.map((x, i) => (
              <label key={i} className="flex items-center gap-3">
                <span className="w-20 font-bold">Level {i + 1}</span>
                <input type="number" className="input !py-1.5" disabled={i === 0} value={x} min={0} onChange={(e) => setLevels(levels.map((v, j) => (j === i ? Math.max(0, Math.round(Number(e.target.value) || 0)) : v)))} />
                <span className="w-8 text-sm text-ink-soft">XP</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button className="btn btn-light !py-1.5 !text-sm" onClick={() => setLevels([...levels, levels[levels.length - 1] + 250])} disabled={levels.length >= 30}>＋ Add level</button>
            <button className="btn btn-light !py-1.5 !text-sm" onClick={() => setLevels(levels.slice(0, -1))} disabled={levels.length <= Math.max(5, evo[4])}>− Remove last</button>
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-extrabold uppercase tracking-wider text-ink-soft">Evolution stages</div>
          {evo.map((lv, i) => (
            <label key={i} className="mb-1.5 flex items-center gap-3">
              <span className="w-36 font-bold">{STAGE_NAMES[(i + 1) as 1]}</span>
              <span className="text-sm text-ink-soft">at level</span>
              <input type="number" className="input !w-24 !py-1.5" disabled={i === 0} value={lv} min={1} max={levels.length} onChange={(e) => setEvo(evo.map((v, j) => (j === i ? Math.round(Number(e.target.value) || 1) : v)))} />
            </label>
          ))}
        </div>
      </div>
      {err && <div className="mt-4 rounded-xl bg-[#fee2e2] p-3 font-bold text-[#991b1b]">{err}</div>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => save()}>Save progression</button>
        <button className="btn btn-light" onClick={() => { setLevels(DEFAULT_LEVEL_XP); setEvo([...DEFAULT_EVOLUTION_LEVELS]); save(DEFAULT_LEVEL_XP, [...DEFAULT_EVOLUTION_LEVELS]); }}>Reset to recommended</button>
      </div>
    </div>
  );
}

function ClassroomTab() {
  const settings = useStore((s) => s.data.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const notify = useStore((s) => s.notify);
  const [pin, setPin] = useState('');
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Classroom</h2>
      <div className="mt-2 divide-y divide-ink/10">
        <Toggle label="Illustrated creature art" hint="Painted creature artwork. Turn off for the classic drawn style (blinks and changes expression, lighter on very old computers)."
          checked={(settings.artStyle ?? 'illustrated') === 'illustrated'} onChange={(v) => updateSettings({ artStyle: v ? 'illustrated' : 'classic' })} />
        <Toggle label="Sound effects" hint="Award chimes, level-up fanfares and creature voices." checked={settings.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} />
        <Toggle label="Reduce motion" hint="Calmer animations for sensitive learners or slower computers. The evolution sequence becomes a quick reveal." checked={settings.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
        <Toggle label="Allow negative points" hint="Off by default. When on, small reminder categories appear. Points can never make a creature lose an evolution or go below 0 XP, and students never lose their creature."
          checked={settings.negativeEnabled} onChange={(v) => updateSettings({ negativeEnabled: v })} />
      </div>
      <h3 className="mt-6 font-display text-xl font-bold">Teacher PIN</h3>
      <p className="text-sm text-ink-soft">{settings.pinHash ? 'A PIN protects teacher controls. Use the lock button in the top bar before leaving the computer.' : 'No PIN set. Anyone at this computer can change points.'} The PIN is stored only as a secure hash on this computer.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className="input !w-48 tracking-[0.4em]" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="New PIN" aria-label="New PIN" />
        <button className="btn btn-primary" disabled={!isValidPin(pin)} onClick={async () => { updateSettings({ pinHash: await hashPin(pin) }); setPin(''); notify('PIN saved'); }}>{settings.pinHash ? 'Change PIN' : 'Set PIN'}</button>
        {settings.pinHash && <button className="btn btn-light" onClick={() => { updateSettings({ pinHash: null }); notify('PIN removed', 'info'); }}>Remove PIN</button>}
      </div>
    </div>
  );
}

function BackupTab() {
  const data = useStore((s) => s.data);
  const replace = useStore((s) => s.replaceData);
  const clearDemo = useStore((s) => s.clearDemo);
  const addDemo = useStore((s) => s.addDemo);
  const notify = useStore((s) => s.notify);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [pending, setPending] = useState<{ data: typeof data; summary: string } | null>(null);
  const [error, setError] = useState('');
  const hasDemo = data.classes.some((c) => c.isDemo);
  const refresh = () => void listSnapshots().then(setSnaps);
  useEffect(refresh, []);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(toBackup(data), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `classroom-creatures-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    notify('Backup file downloaded');
  };
  const onFile = async (f?: File) => {
    setError('');
    if (!f) return;
    try {
      const { data: d, summary } = parseBackup(await f.text());
      setPending({ data: d, summary: `${summary.classes} classes, ${summary.students} students, ${summary.events} awards${summary.exportedAt ? ` · saved ${new Date(summary.exportedAt).toLocaleString()}` : ''}` });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const keepDevice = (d: typeof data) => ({ ...d, settings: { ...d.settings, pinHash: data.settings.pinHash, onboarded: true } });

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Backup & data</h2>
      <p className="text-sm text-ink-soft">Everything saves automatically in this browser on this computer. Download a backup file regularly (for example every Friday) and keep it on a USB stick or school drive.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={exportFile}>⬇ Download backup file</button>
        <label className="btn btn-light cursor-pointer">⬆ Restore from file
          <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      {error && <div className="mt-3 rounded-xl bg-[#fee2e2] p-3 font-bold text-[#991b1b]">{error}</div>}

      <h3 className="mt-6 font-display text-xl font-bold">Safety snapshots</h3>
      <p className="text-sm text-ink-soft">Saved automatically once a day and before anything is deleted or restored. The newest 12 are kept on this computer.</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {snaps.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-sm">
            <span className="font-bold">{new Date(s.at).toLocaleString()}</span>
            <span className="text-ink-soft">{s.reason} · {s.classes} classes, {s.students} students</span>
            <button className="btn btn-light ml-auto !py-1 !text-xs" onClick={() => setPending({ data: s.data, summary: `Snapshot from ${new Date(s.at).toLocaleString()} (${s.reason})` })}>Restore</button>
          </li>
        ))}
        {snaps.length === 0 && <li className="text-sm text-ink-soft">No snapshots yet.</li>}
      </ul>

      <h3 className="mt-6 font-display text-xl font-bold">Demo data</h3>
      <p className="text-sm text-ink-soft">The demo class uses made-up names ending in “Demo” and is labelled everywhere. Real classes are never touched.</p>
      <div className="mt-2 flex gap-2">
        {hasDemo ? <button className="btn btn-light" onClick={async () => { await clearDemo(); notify('Demo class removed'); }}>Remove demo class</button>
          : <button className="btn btn-light" onClick={() => { addDemo(); notify('Demo class added'); }}>Add demo class</button>}
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)} label="Confirm restore">
        {pending && (
          <div className="p-6">
            <h2 className="font-display text-2xl font-bold">Restore this data?</h2>
            <p className="mt-2 font-bold">{pending.summary}</p>
            <p className="mt-2 text-sm text-ink-soft">This replaces what is on this computer now. Your current data is saved as a snapshot first, so you can undo this. Your teacher PIN stays the same.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-light" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => { await replace(keepDevice(pending.data), 'Before restoring data'); setPending(null); refresh(); notify('Data restored'); }}>Restore</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
