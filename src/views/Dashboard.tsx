import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { playAward, playMultiAward } from '../audio/sfx';
import { AwardGrid } from '../components/AwardGrid';
import { StudentCard } from '../components/StudentCard';
import { Modal, ProgressBar, SectionTitle } from '../components/ui';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { ACHIEVEMENTS_BY_ID } from '../data/defaults';
import { ELEMENT_ORDER, ELEMENTS, STAGE_NAMES } from '../data/elements';
import { getSpecies } from '../data/species';
import { stageForXp } from '../engine/progression';
import { parseNames } from '../engine/roster';
import { firstName, timeAgo } from '../engine/util';
import { useClassStudents } from '../lib/stats';
import { navigate } from '../lib/router';
import { useCurrentClass, useStore } from '../store/store';
import type { Category, ElementType, Stage } from '../types';
import { StudentProfile } from './StudentProfile';

type Sort = 'name' | 'creature' | 'recent';

export function Dashboard() {
  const cls = useCurrentClass();
  const students = useClassStudents(cls?.id);
  const data = useStore((s) => s.data);
  const award = useStore((s) => s.award);
  const settings = data.settings;

  const [query, setQuery] = useState('');
  const [element, setElement] = useState<ElementType | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<Stage | 0>(0);
  const [sort, setSort] = useState<Sort>('name');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<string | null>(null);
  const [wholeClass, setWholeClass] = useState(false);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  const lastAwardAt = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of data.events) if (!e.undone && e.classId === cls?.id) m.set(e.studentId, Math.max(m.get(e.studentId) ?? 0, e.at));
    return m;
  }, [data.events, cls?.id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((s) => {
      const sp = getSpecies(s.speciesId);
      if (q && !s.name.toLowerCase().includes(q) && !sp.name.toLowerCase().includes(q)) return false;
      if (element !== 'all' && sp.element !== element) return false;
      if (stageFilter && stageForXp(s.xp, settings) !== stageFilter) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'creature') return getSpecies(a.speciesId).name.localeCompare(getSpecies(b.speciesId).name);
      if (sort === 'recent') return (lastAwardAt.get(b.id) ?? 0) - (lastAwardAt.get(a.id) ?? 0);
      return a.name.localeCompare(b.name);
    });
  }, [students, query, element, stageFilter, sort, settings, lastAwardAt]);

  const quick = useMemo(() => {
    const pinned = data.categories.filter((c) => c.pinned && c.xp > 0);
    return (pinned.length ? pinned : data.categories.filter((c) => c.xp > 0)).slice(0, 3);
  }, [data.categories]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const doAward = (ids: string[], c: Category) => {
    const out = award(ids, c.id);
    if (out.length && settings.soundEnabled) (ids.length > 1 ? playMultiAward() : playAward(c.xp));
    return out.length;
  };

  if (!cls) return <NoClass onCreate={() => setCreating(true)} creating={creating} close={() => setCreating(false)} />;

  const totalXp = students.reduce((n, s) => n + s.xp, 0);
  const goalPct = cls.goal > 0 ? totalXp / cls.goal : 0;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-32 pt-5 sm:px-6">
      {/* header */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-white/70">
            {cls.grade && <span>{cls.grade}</span>}
            {cls.isDemo && <span className="chip bg-berry text-white">DEMO DATA · not real students</span>}
          </div>
          <h1 className="truncate font-display text-3xl font-bold sm:text-4xl">{cls.name}</h1>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Stat label="Students" value={students.length} />
          <Stat label="Class XP" value={totalXp.toLocaleString()} />
          <div className="panel min-w-[220px] px-4 py-2">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-white/70">
              <span>Class goal</span><span className="tabular-nums">{Math.min(totalXp, cls.goal).toLocaleString()} / {cls.goal.toLocaleString()}</span>
            </div>
            <ProgressBar pct={goalPct} color="#34d399" track="rgb(255 255 255 / .12)" className="mt-1.5" glow={goalPct >= 1} />
            {cls.goalReachedAt && <div className="mt-1 text-xs font-bold text-mint">Goal reached! Set a new goal in Settings.</div>}
          </div>
        </div>
      </div>

      {/* toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={() => setWholeClass(true)} disabled={!students.length}>✨ Award whole class</button>
        <button className={`btn ${selecting ? 'btn-light' : 'btn-ghost'}`} onClick={() => { setSelecting(!selecting); setSelected(new Set()); }} disabled={!students.length}>
          {selecting ? 'Done selecting' : '☑ Select students'}
        </button>
        <button className="btn btn-ghost" onClick={() => setAdding(true)}>＋ Add students</button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input className="input !rounded-full !py-2 sm:!w-48" placeholder="Search name or creature" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search students" />
          <select className="input !w-auto !rounded-full !py-2" value={element} onChange={(e) => setElement(e.target.value as ElementType | 'all')} aria-label="Filter by element">
            <option value="all">All elements</option>
            {ELEMENT_ORDER.map((e) => <option key={e} value={e}>{ELEMENTS[e].name}</option>)}
          </select>
          <select className="input !w-auto !rounded-full !py-2" value={stageFilter} onChange={(e) => setStageFilter(Number(e.target.value) as Stage | 0)} aria-label="Filter by stage">
            <option value={0}>All stages</option>
            {([1, 2, 3, 4, 5] as Stage[]).map((s) => <option key={s} value={s}>{STAGE_NAMES[s]}</option>)}
          </select>
          <select className="input !w-auto !rounded-full !py-2" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort students">
            <option value="name">Name A–Z</option>
            <option value="creature">Creature</option>
            <option value="recent">Recently awarded</option>
          </select>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {students.length === 0 ? (
            <EmptyClass onAdd={() => setAdding(true)} />
          ) : visible.length === 0 ? (
            <div className="panel p-10 text-center font-bold text-white/70">No students match those filters.</div>
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(176px,1fr))] sm:gap-4">
              {visible.map((s) => (
                <StudentCard key={s.id} student={s} quick={quick} selecting={selecting} selected={selected.has(s.id)} onOpen={setProfile} onToggle={toggle} />
              ))}
            </motion.div>
          )}
        </div>
        <ActivityPanel classId={cls.id} onOpen={setProfile} />
      </div>

      {/* selection bar */}
      <AnimatePresence>
        {selecting && (
          <motion.div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-night-950/95 px-4 pb-4 pt-3 backdrop-blur sm:px-6"
            initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="mx-auto max-w-[1600px]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold">{selected.size} selected</span>
                <button className="btn btn-ghost !py-1 !text-sm" onClick={() => setSelected(new Set(visible.map((s) => s.id)))}>Select all shown</button>
                <button className="btn btn-ghost !py-1 !text-sm" onClick={() => setSelected(new Set())}>Clear</button>
                <span className="ml-auto text-sm text-white/60">Tap a behaviour to award everyone selected</span>
              </div>
              <div className={selected.size ? '' : 'pointer-events-none opacity-40'}>
                <AwardGrid compact dark onPick={(c) => { if (doAward([...selected], c)) { setSelected(new Set()); } }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={wholeClass} onClose={() => setWholeClass(false)} label="Award the whole class" wide>
        <div className="p-6">
          <h2 className="font-display text-2xl font-bold">Award the whole class</h2>
          <p className="mb-4 text-ink-soft">Everyone in {cls.name} ({students.length} students) gets the points.</p>
          <AwardGrid onPick={(c) => { doAward(students.map((s) => s.id), c); setWholeClass(false); }} />
        </div>
      </Modal>
      <AddStudentsModal open={adding} onClose={() => setAdding(false)} classId={cls.id} />
      <StudentProfile studentId={profile} onClose={() => setProfile(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel px-4 py-2">
      <div className="text-xs font-extrabold uppercase tracking-wider text-white/70">{label}</div>
      <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ActivityPanel({ classId, onOpen }: { classId: string; onOpen: (id: string) => void }) {
  const events = useStore((s) => s.data.events);
  const students = useStore((s) => s.data.students);
  const undo = useStore((s) => s.undo);
  const settings = useStore((s) => s.data.settings);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const batches = useMemo(() => {
    const list: { batchId: string; at: number; icon: string; name: string; xp: number; ids: string[] }[] = [];
    const seen = new Map<string, number>();
    for (let i = events.length - 1; i >= 0 && list.length < 14; i--) {
      const e = events[i];
      if (e.classId !== classId || e.undone) continue;
      const idx = seen.get(e.batchId);
      if (idx !== undefined) list[idx].ids.push(e.studentId);
      else { seen.set(e.batchId, list.length); list.push({ batchId: e.batchId, at: e.at, icon: e.icon, name: e.categoryName, xp: e.xp, ids: [e.studentId] }); }
    }
    return list;
  }, [events, classId]);

  const recentAch = useMemo(() => students.filter((s) => s.classId === classId)
    .flatMap((s) => s.achievements.map((a) => ({ s, a })))
    .sort((x, y) => y.a.at - x.a.at).slice(0, 5), [students, classId]);

  const levelUps = useMemo(() => {
    // derived from events: newest events that crossed a level threshold
    const out: { s: (typeof students)[number]; at: number; level: number }[] = [];
    const xpBy = new Map<string, number>();
    const cls = events.filter((e) => e.classId === classId && !e.undone);
    for (const e of cls) {
      const before = xpBy.get(e.studentId) ?? 0;
      const after = Math.max(0, before + e.xp);
      xpBy.set(e.studentId, after);
      const lb = settings.levelXp.filter((x) => before >= x).length;
      const la = settings.levelXp.filter((x) => after >= x).length;
      const st = byId.get(e.studentId);
      if (la > lb && st) out.push({ s: st, at: e.at, level: la });
    }
    return out.reverse().slice(0, 5);
  }, [events, classId, settings, byId]);

  return (
    <aside className="flex flex-col gap-4">
      <div className="panel p-4">
        <SectionTitle>Recent activity</SectionTitle>
        {batches.length === 0 && <p className="text-sm text-white/60">Awards you give will show up here.</p>}
        <ul className="flex flex-col gap-1.5">
          {batches.map((b) => (
            <li key={b.batchId} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="text-xl" aria-hidden>{b.icon}</span>
              <div className="min-w-0 flex-1 text-sm leading-tight">
                <div className="truncate font-bold">
                  {b.ids.length > 3 ? `${b.ids.length} students` : b.ids.map((id) => firstName(byId.get(id)?.name ?? '?')).join(', ')}
                </div>
                <div className="truncate text-white/60">{b.name} · <span className={b.xp >= 0 ? 'text-sun' : ''}>{b.xp >= 0 ? '+' : ''}{b.xp}</span> · {timeAgo(b.at)}</div>
              </div>
              <button className="rounded-full px-2 py-1 text-xs font-bold text-white/50 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100" onClick={() => undo(b.batchId)} title="Undo this award">Undo</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="panel p-4">
        <SectionTitle>Level ups</SectionTitle>
        {levelUps.length === 0 && <p className="text-sm text-white/60">No level ups yet.</p>}
        <ul className="flex flex-col gap-1">
          {levelUps.map(({ s, at, level }) => (
            <li key={`${s.id}-${at}`}>
              <button className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-white/5" onClick={() => onOpen(s.id)}>
                <span className="h-10 w-10"><CreatureSvg species={getSpecies(s.speciesId)} stage={stageForXp(s.xp, settings)} effects={false} noShadow className="h-full w-full" /></span>
                <span className="flex-1 text-sm"><b>{firstName(s.name)}</b> reached <b className="text-sun">Level {level}</b><br /><span className="text-white/60">{timeAgo(at)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="panel p-4">
        <SectionTitle>Achievements</SectionTitle>
        {recentAch.length === 0 && <p className="text-sm text-white/60">Badges students unlock appear here.</p>}
        <ul className="flex flex-col gap-1">
          {recentAch.map(({ s, a }) => (
            <li key={`${s.id}-${a.id}`} className="flex items-center gap-2 px-1 py-1 text-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full text-lg" style={{ background: `${ACHIEVEMENTS_BY_ID[a.id]?.color ?? '#888'}44` }}>{ACHIEVEMENTS_BY_ID[a.id]?.icon}</span>
              <span className="flex-1"><b>{firstName(s.name)}</b> · {ACHIEVEMENTS_BY_ID[a.id]?.name}<br /><span className="text-white/60">{timeAgo(a.at)}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function EmptyClass({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="panel flex flex-col items-center p-10 text-center">
      <div className="flex gap-2">
        {['sproutling', 'splashlet', 'emberpup'].map((id) => <span key={id} className="h-24 w-24"><CreatureSvg species={getSpecies(id)} stage={1} /></span>)}
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold">Your creatures are waiting to hatch!</h2>
      <p className="mt-1 max-w-md text-white/70">Add your students and every one of them gets their own creature automatically.</p>
      <button className="btn btn-primary mt-5 px-8 text-lg" onClick={onAdd}>＋ Add students</button>
    </div>
  );
}

function NoClass({ onCreate, creating, close }: { onCreate: () => void; creating: boolean; close: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <span className="h-36 w-36"><CreatureSvg species={getSpecies('glowbun')} stage={2} /></span>
      <h1 className="mt-3 font-display text-3xl font-bold">Create your first class</h1>
      <p className="mt-2 text-white/70">Make a class for your Grade 2 or Grade 3 students. You can have as many classes as you like.</p>
      <button className="btn btn-primary mt-6 px-8 text-lg" onClick={onCreate}>Create a class</button>
      <CreateClassModal open={creating} onClose={close} />
    </div>
  );
}

export function CreateClassModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createClass = useStore((s) => s.createClass);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Grade 2');
  const submit = () => {
    if (!name.trim()) return;
    createClass(name, grade);
    setName('');
    onClose();
    navigate('/');
  };
  return (
    <Modal open={open} onClose={onClose} label="Create a class">
      <form className="p-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h2 className="font-display text-2xl font-bold">New class</h2>
        <label className="mt-4 block text-sm font-bold">Class name
          <input className="input mt-1" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2B Rainbows" maxLength={40} />
        </label>
        <label className="mt-3 block text-sm font-bold">Grade
          <select className="input mt-1" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Other'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Create class</button>
        </div>
      </form>
    </Modal>
  );
}

export function AddStudentsModal({ open, onClose, classId }: { open: boolean; onClose: () => void; classId: string }) {
  const addStudents = useStore((s) => s.addStudents);
  const notify = useStore((s) => s.notify);
  const [text, setText] = useState('');
  const names = parseNames(text);
  const onFile = async (f: File | undefined) => { if (f) setText(await f.text()); };
  const submit = () => {
    const n = addStudents(classId, names);
    notify(`${n} student${n === 1 ? '' : 's'} added. Each got a new creature!`);
    setText('');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} label="Add students" wide>
      <div className="p-6">
        <h2 className="font-display text-2xl font-bold">Add students</h2>
        <p className="text-ink-soft">Type or paste one name per line, or import a CSV file (a “Name” column, or “First name” and “Last name”). First names are enough. No emails or accounts needed.</p>
        <textarea className="input mt-4 h-48 resize-y font-bold" value={text} onChange={(e) => setText(e.target.value)} placeholder={'Amira\nBen\nChloe\n…'} aria-label="Student names" autoFocus />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="btn btn-light cursor-pointer">📄 Import CSV
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <span className="text-sm font-bold text-ink-soft">{names.length} name{names.length === 1 ? '' : 's'} found</span>
        </div>
        {names.length > 0 && (
          <div className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto scroll-thin">
            {names.map((n, i) => <span key={i} className="chip bg-grape/15 text-grape">{n}</span>)}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!names.length} onClick={submit}>Add {names.length || ''} & hatch creatures</button>
        </div>
      </div>
    </Modal>
  );
}
