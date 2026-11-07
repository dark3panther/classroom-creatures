import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { awardSound } from '../audio/sfx';
import { AwardGrid } from '../components/AwardGrid';
import { PrizeWheel } from '../components/PrizeWheel';
import { StudentCard } from '../components/StudentCard';
import { Glyph, Icon } from '../components/Icon';
import { Modal, ProgressBar, SectionTitle } from '../components/ui';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { ACHIEVEMENTS_BY_ID } from '../data/defaults';
import { ELEMENT_ORDER, ELEMENTS, STAGE_NAMES } from '../data/elements';
import { getSpecies } from '../data/species';
import { displayStage } from '../engine/progression';
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
  const [wheel, setWheel] = useState(false);

  const lastAwardAt = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of data.events) if (!e.undone && e.classId === cls?.id) m.set(e.studentId, Math.max(m.get(e.studentId) ?? 0, e.at));
    return m;
  }, [data.events, cls?.id]);

  // plates in the most recent award keep their ribbon until the next award
  const fresh = useMemo(() => {
    for (let i = data.events.length - 1; i >= 0; i--) {
      const e = data.events[i];
      if (e.classId !== cls?.id || e.undone) continue;
      const batch = data.events.filter((x) => x.batchId === e.batchId && !x.undone);
      return { ids: new Set(batch.length <= 3 ? batch.map((x) => x.studentId) : []), count: batch.length, icon: e.icon, name: e.categoryName, xp: e.xp, at: e.at };
    }
    return null;
  }, [data.events, cls?.id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((s) => {
      const sp = getSpecies(s.speciesId);
      if (q && !s.name.toLowerCase().includes(q) && !sp.name.toLowerCase().includes(q)) return false;
      if (element !== 'all' && sp.element !== element) return false;
      if (stageFilter && displayStage(s, settings) !== stageFilter) return false;
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
    if (out.length && settings.soundEnabled) awardSound(c.xp, ids.length);
    return out.length;
  };

  if (!cls) return <NoClass onCreate={() => setCreating(true)} creating={creating} close={() => setCreating(false)} />;

  const totalXp = students.reduce((n, s) => n + s.xp, 0);
  const goalPct = cls.goal > 0 ? totalXp / cls.goal : 0;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-32 pt-6 sm:px-6">
      {/* header */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:truncate sm:text-[44px]">{cls.name.replace(/ ([·\-–]) /g, '\u00a0$1 ')}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-soft">
            {cls.grade && <span className="font-bold text-ink">{cls.grade}</span>}
            <span><b className="text-ink tabular">{students.length}</b> students</span>
            <span><b className="text-ink tabular">{totalXp.toLocaleString()}</b> class XP</span>
            {cls.isDemo && <span className="chip bg-berry/10 text-berry ring-1 ring-berry/30">Demo data · not real students</span>}
          </div>
        </div>
        <div className="w-full sm:w-[360px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[17px] font-bold">Class goal</span>
            <span className="text-[14px] text-ink-soft tabular"><b className="text-ink">{Math.min(totalXp, cls.goal).toLocaleString()}</b> of {cls.goal.toLocaleString()} XP</span>
          </div>
          <ProgressBar pct={goalPct} height={14} color="#23864a" className="mt-1.5 ring-1 ring-rule" glow={goalPct >= 1} />
          {cls.pendingSpin && (
            <button className="btn btn-primary mt-2.5 w-full !py-2" onClick={() => setWheel(true)}><Icon name="wheel" size={18} />Spin the prize wheel</button>
          )}
          {fresh && fresh.count > 3 && (
            <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-soft" title="The latest award, marked until you give the next one">
              <span className="ribbon h-5 w-3 shrink-0" aria-hidden />
              <span className="truncate">Last award: <b className="text-ink">whole class</b> · {fresh.name} <b className={`tabular ${fresh.xp >= 0 ? 'text-leaf' : 'text-brick'}`}>{fresh.xp >= 0 ? '+' : ''}{fresh.xp}</b> · {timeAgo(fresh.at)}</span>
            </div>
          )}
          {!cls.pendingSpin && (cls.prizeHistory?.length ?? 0) > 0 && (
            <div className="mt-1.5 truncate text-[13px] text-ink-soft">Last prize: {cls.prizeHistory[cls.prizeHistory.length - 1].icon} {cls.prizeHistory[cls.prizeHistory.length - 1].label}</div>
          )}
        </div>
      </div>

      {/* toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
        <button className="btn btn-primary" onClick={() => setWholeClass(true)} disabled={!students.length}><Icon name="sparkle" size={18} />Award whole class</button>
        <button className={`btn ${selecting ? 'btn-cloth' : 'btn-ghost'}`} onClick={() => { setSelecting(!selecting); setSelected(new Set()); }} disabled={!students.length} aria-pressed={selecting}>
          <Icon name={selecting ? 'check' : 'select'} size={18} />{selecting ? 'Done selecting' : 'Select students'}
        </button>
        <button className="btn btn-ghost" onClick={() => setAdding(true)}><Icon name="plus" size={18} />Add students</button>
        <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
          <label className="relative min-w-[150px] flex-1 sm:flex-none">
            <span className="sr-only">Search students by name or creature</span>
            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input className="input !rounded-full !py-2 !pl-10 sm:!w-44" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
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
            <div className="panel p-10 text-center"><p className="font-display text-xl font-bold">No students match those filters.</p><button className="btn btn-ghost mt-3" onClick={() => { setQuery(''); setElement('all'); setStageFilter(0); }}>Clear filters</button></div>
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))] sm:gap-4">
              {visible.map((s) => (
                <StudentCard key={s.id} student={s} quick={quick} selecting={selecting} selected={selected.has(s.id)} onOpen={setProfile} onToggle={toggle} fresh={!!fresh?.ids.has(s.id)} />
              ))}
            </motion.div>
          )}
        </div>
        <ActivityPanel classId={cls.id} onOpen={setProfile} />
      </div>

      {/* selection bar */}
      <AnimatePresence>
        {selecting && (
          <motion.div className="cloth on-cloth fixed inset-x-0 bottom-0 z-30 px-4 pb-4 pt-3 shadow-[0_-10px_30px_-12px_rgb(13_46_35/.6)] sm:px-6"
            initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="mx-auto max-w-[1600px]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-display text-xl font-bold tabular"><span className="gilt-text">{selected.size}</span> selected</span>
                <button className="btn btn-ghost !py-1 !text-sm" onClick={() => setSelected(new Set(visible.map((s) => s.id)))}>Select all shown</button>
                <button className="btn btn-ghost !py-1 !text-sm" onClick={() => setSelected(new Set())}>Clear</button>
                <span className="ml-auto text-sm text-white/80">Tap a behaviour to award everyone selected</span>
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
          <p className="mb-4 mt-1 text-ink-soft">Everyone in {cls.name} ({students.length} students) gets the points.</p>
          <AwardGrid onPick={(c) => { doAward(students.map((s) => s.id), c); setWholeClass(false); }} />
        </div>
      </Modal>
      <AnimatePresence>{wheel && <PrizeWheel classId={cls.id} onClose={() => setWheel(false)} />}</AnimatePresence>
      <AddStudentsModal open={adding} onClose={() => setAdding(false)} classId={cls.id} />
      <StudentProfile studentId={profile} onClose={() => setProfile(null)} />
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
        {batches.length === 0 && <p className="text-sm text-ink-soft">Awards you give will show up here.</p>}
        <ul className="-mx-1 flex flex-col divide-y divide-rule/70">
          {batches.map((b, i) => (
            <li key={b.batchId} className="group flex items-center gap-2.5 px-1 py-2">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${b.xp >= 0 ? 'bg-leaf-pale text-leaf' : 'bg-brick-pale text-brick'}`} aria-hidden><Glyph icon={b.icon} size={18} /></span>
              <div className="min-w-0 flex-1 text-sm leading-tight">
                <div className="truncate font-bold">
                  {b.ids.length > 3 ? `${b.ids.length} students` : b.ids.map((id) => firstName(byId.get(id)?.name ?? '?')).join(', ')}
                </div>
                <div className="truncate text-[13px] text-ink-soft">{b.name} · <b className={`tabular ${b.xp >= 0 ? 'text-leaf' : 'text-brick'}`}>{b.xp >= 0 ? '+' : ''}{b.xp}</b> · {timeAgo(b.at)}</div>
              </div>
              {i === 0 ? (
                <button className="flex min-h-9 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-ink-soft ring-1 ring-rule transition hover:bg-wash hover:text-ink" onClick={() => undo(b.batchId)} title="Undo this award"><Icon name="undo" size={14} strokeWidth={2.4} />Undo</button>
              ) : (
                <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft/70 transition hover:bg-wash hover:text-ink" onClick={() => undo(b.batchId)} title="Undo this award" aria-label={`Undo ${b.name}`}><Icon name="undo" size={16} strokeWidth={2.2} /></button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="panel p-4">
        <SectionTitle>Level ups</SectionTitle>
        {levelUps.length === 0 && <p className="text-sm text-ink-soft">No level ups yet.</p>}
        <ul className="flex flex-col gap-1">
          {levelUps.map(({ s, at, level }) => (
            <li key={`${s.id}-${at}`}>
              <button className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-wash" onClick={() => onOpen(s.id)}>
                <span className="h-10 w-10"><CreatureSvg species={getSpecies(s.speciesId)} stage={displayStage(s, settings)} effects={false} noShadow className="h-full w-full" /></span>
                <span className="flex-1 text-sm"><b>{firstName(s.name)}</b> reached <b className="text-cloth-800">Level {level}</b><br /><span className="text-[13px] text-ink-soft">{timeAgo(at)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="panel p-4">
        <SectionTitle>Achievements</SectionTitle>
        {recentAch.length === 0 && <p className="text-sm text-ink-soft">Badges students unlock appear here.</p>}
        <ul className="flex flex-col gap-1">
          {recentAch.map(({ s, a }) => (
            <li key={`${s.id}-${a.id}`} className="flex items-center gap-2 px-1 py-1 text-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full text-lg" style={{ background: `color-mix(in srgb, ${ACHIEVEMENTS_BY_ID[a.id]?.color ?? '#888'} 18%, white)` }}>{ACHIEVEMENTS_BY_ID[a.id]?.icon}</span>
              <span className="flex-1"><b>{firstName(s.name)}</b> · {ACHIEVEMENTS_BY_ID[a.id]?.name}<br /><span className="text-[13px] text-ink-soft">{timeAgo(a.at)}</span></span>
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
      <p className="mt-1 max-w-md text-ink-soft">Add your students and every one of them gets their own creature automatically.</p>
      <button className="btn btn-primary mt-5 px-8 text-lg" onClick={onAdd}><Icon name="plus" size={20} />Add students</button>
    </div>
  );
}

function NoClass({ onCreate, creating, close }: { onCreate: () => void; creating: boolean; close: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <span className="h-36 w-36"><CreatureSvg species={getSpecies('glowbun')} stage={2} /></span>
      <h1 className="mt-3 font-display text-3xl font-bold">Create your first class</h1>
      <p className="mt-2 text-ink-soft">Make a class for your Grade 2 or Grade 3 students. You can have as many classes as you like.</p>
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
          <label className="btn btn-light cursor-pointer"><Icon name="file" size={18} />Import CSV
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <span className="text-sm font-bold text-ink-soft">{names.length} name{names.length === 1 ? '' : 's'} found</span>
        </div>
        {names.length > 0 && (
          <div className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto scroll-thin">
            {names.map((n, i) => <span key={i} className="chip bg-wash text-ink ring-1 ring-rule">{n}</span>)}
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
