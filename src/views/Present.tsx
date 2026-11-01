import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { playAward, playMultiAward, playTick, playCreature, playLevelUp } from '../audio/sfx';
import { AwardGrid } from '../components/AwardGrid';
import { FloatingXP } from '../components/StudentCard';
import { ProgressBar, StagePips } from '../components/ui';
import { Burst } from '../creatures/Burst';
import { Creature, type CreatureAction } from '../creatures/Creature';
import { Habitat } from '../creatures/Habitat';
import { ACHIEVEMENTS_BY_ID } from '../data/defaults';
import { STAGE_NAMES } from '../data/elements';
import { getSpecies } from '../data/species';
import { displayStage } from '../engine/progression';
import { firstName } from '../engine/util';
import { useClassStudents } from '../lib/stats';
import { navigate } from '../lib/router';
import { useCurrentClass, useStore } from '../store/store';
import type { Student } from '../types';

/**
 * Projector / whiteboard mode. Shows first names and creatures only:
 * no XP totals, no rankings, nothing sensitive.
 */
export function Present() {
  const cls = useCurrentClass();
  const students = useClassStudents(cls?.id);
  const settings = useStore((s) => s.data.settings);
  const events = useStore((s) => s.data.events);
  const award = useStore((s) => s.award);
  const setLocked = useStore((s) => s.setLocked);
  const locked = useStore((s) => s.locked);
  const [spot, setSpot] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [wholeClass, setWholeClass] = useState(false);
  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);

  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    if (settings.pinHash && !locked) setLocked(true);
    navigate('/');
  };
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const ticker = useMemo(() => {
    const byId = new Map(students.map((s) => [s.id, s]));
    const out: string[] = [];
    const seen = new Set<string>();
    for (let i = events.length - 1; i >= 0 && out.length < 8; i--) {
      const e = events[i];
      if (e.classId !== cls?.id || e.undone || e.xp <= 0 || seen.has(e.batchId)) continue;
      seen.add(e.batchId);
      const many = events.filter((x) => x.batchId === e.batchId).length;
      out.push(`${e.icon} ${many > 1 ? `${many} friends` : firstName(byId.get(e.studentId)?.name ?? '')} · ${e.categoryName}`);
    }
    for (const s of students) for (const a of s.achievements) if (Date.now() - a.at < 86_400_000 && out.length < 12) out.push(`🏅 ${firstName(s.name)} unlocked ${ACHIEVEMENTS_BY_ID[a.id]?.name}`);
    return out;
  }, [events, students, cls?.id]);

  const total = students.reduce((n, s) => n + s.xp, 0);
  const cols = students.length > 24 ? 'grid-cols-[repeat(auto-fill,minmax(120px,1fr))]' : students.length > 14 ? 'grid-cols-[repeat(auto-fill,minmax(170px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(220px,1fr))]';

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-night-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[60vh] w-[60vh] rounded-full bg-grape/40 blur-3xl idle-float" />
        <div className="absolute -right-40 top-20 h-[50vh] w-[50vh] rounded-full bg-berry/25 blur-3xl idle-float" style={{ animationDelay: '-1.5s' }} />
        <div className="absolute bottom-0 left-1/3 h-[40vh] w-[60vh] rounded-full bg-mint/20 blur-3xl idle-float" style={{ animationDelay: '-2.5s' }} />
        <div className="starfield absolute inset-0" />
      </div>

      <header className="present-header relative flex flex-wrap items-center gap-4 px-6 pt-5">
        <h1 className="font-display text-4xl font-bold tracking-wide sm:text-5xl">{cls?.name ?? 'Classroom Creatures'}</h1>
        {cls && (
          <div className="ml-auto w-full max-w-md">
            <div className="flex justify-between font-display text-lg font-semibold"><span>🌈 Class goal</span><span className="tabular-nums">{Math.round(Math.min(1, total / cls.goal) * 100)}%</span></div>
            <ProgressBar pct={total / cls.goal} height={20} color="#34d399" track="rgb(255 255 255 / .15)" glow className="mt-1" />
          </div>
        )}
      </header>

      <main className="relative flex-1 overflow-y-auto px-6 pb-40 pt-6">
        {students.length === 0 ? (
          <div className="grid h-full place-items-center text-2xl font-bold text-white/70">Add students to see their creatures here.</div>
        ) : (
          <div className={`grid ${cols} gap-4`}>
            {sorted.map((s) => <PresentTile key={s.id} s={s} onClick={() => setSpot(s.id)} />)}
          </div>
        )}
      </main>

      {ticker.length > 0 && (
        <div className="absolute inset-x-0 bottom-24 overflow-hidden whitespace-nowrap py-2 font-display text-xl font-semibold text-white/85" aria-hidden>
          <motion.div className="inline-block" animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: Math.max(18, ticker.length * 5), ease: 'linear' }}>
            {[...ticker, ...ticker].map((t, i) => <span key={i} className="mx-8">{t}</span>)}
          </motion.div>
        </div>
      )}

      <nav className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-night-950/80 px-4 py-4 backdrop-blur">
        <button className="btn btn-primary px-7 py-4 text-xl" onClick={() => setPicking(true)} disabled={!students.length}>🎲 Pick a student</button>
        {!locked && <button className="btn btn-ghost px-7 py-4 text-xl" onClick={() => setWholeClass(true)} disabled={!students.length}>✨ Whole class</button>}
        <button className="btn btn-ghost px-5 py-4 text-xl" onClick={fullscreen} aria-label="Toggle full screen">⛶ Full screen</button>
        <button className="btn btn-ghost px-5 py-4 text-xl" onClick={exit}>✕ Exit</button>
      </nav>

      <AnimatePresence>{spot && <Spotlight key={spot} id={spot} onClose={() => setSpot(null)} />}</AnimatePresence>
      <AnimatePresence>{picking && <RandomPicker students={sorted} onDone={(id) => { setPicking(false); if (id) setSpot(id); }} />}</AnimatePresence>
      <AnimatePresence>
        {wholeClass && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-night-950/85 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-full max-w-4xl">
              <h2 className="mb-4 text-center font-display text-4xl font-bold">Award the whole class</h2>
              <AwardGrid dark onPick={(c) => { const o = award(students.map((s) => s.id), c.id); if (o.length && settings.soundEnabled) playMultiAward(); setWholeClass(false); }} />
              <div className="mt-6 text-center"><button className="btn btn-ghost px-8 py-3 text-xl" onClick={() => setWholeClass(false)}>Cancel</button></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PresentTile({ s, onClick }: { s: Student; onClick: () => void }) {
  const settings = useStore((st) => st.data.settings);
  const pulse = useStore((st) => st.pulses[s.id]);
  const sp = getSpecies(s.speciesId);
  const stage = displayStage(s, settings);
  return (
    <button onClick={onClick} className="group relative flex flex-col items-center rounded-[1.75rem] bg-white/[.06] p-2 ring-1 ring-white/10 transition hover:bg-white/[.12]">
      <Habitat element={sp.element} background={s.equipped.background} className="aspect-square w-full" rounded="rounded-[1.4rem]">
        <Creature speciesId={s.speciesId} stage={stage} equipped={s.equipped} celebrateKey={pulse?.n} className="mx-auto h-full w-[86%]" />
      </Habitat>
      <FloatingXP pulse={pulse} />
      <div className="mt-1.5 max-w-full truncate font-display text-xl font-semibold">{firstName(s.name)}</div>
      <StagePips stage={stage} />
    </button>
  );
}

function Spotlight({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore((st) => st.data.students.find((x) => x.id === id));
  const settings = useStore((st) => st.data.settings);
  const pulse = useStore((st) => st.pulses[id]);
  const award = useStore((st) => st.award);
  const locked = useStore((st) => st.locked);
  const [act, setAct] = useState<{ type: CreatureAction; key: number } | null>({ type: 'celebrate', key: 1 });
  const [showAward, setShowAward] = useState(false);
  if (!s) return null;
  const sp = getSpecies(s.speciesId);
  const stage = displayStage(s, settings);
  const doAct = (type: CreatureAction) => { if (settings.soundEnabled) playCreature(sp.sound, true); setAct({ type, key: Date.now() }); };
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-night-950/85 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="relative grid w-full max-w-5xl items-center gap-6 md:grid-cols-[1.1fr_1fr]" initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} onClick={(e) => e.stopPropagation()}>
        <Habitat element={sp.element} background={s.equipped.background} className="aspect-square w-full shadow-2xl" rounded="rounded-[2.5rem]">
          <Creature speciesId={sp.id} stage={stage} equipped={s.equipped} celebrateKey={pulse?.n} action={act} interactive sound={settings.soundEnabled} className="mx-auto h-full w-[84%]" />
          <FloatingXP pulse={pulse} />
        </Habitat>
        <div>
          <div className="font-display text-6xl font-bold leading-none">{firstName(s.name)}</div>
          <div className="mt-2 font-display text-3xl font-semibold text-sun">{sp.name}</div>
          <div className="mt-1 text-xl font-bold text-white/80">{STAGE_NAMES[stage]}{stage === 5 ? ` · ${sp.legendTitle}` : ''}</div>
          <p className="mt-3 text-lg text-white/75">{sp.personality}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="btn btn-ghost py-4 text-xl" onClick={() => doAct('jump')}>⤒ Jump</button>
            <button className="btn btn-ghost py-4 text-xl" onClick={() => doAct('wave')}>👋 Wave</button>
            <button className="btn btn-ghost py-4 text-xl" onClick={() => doAct('ability')}>✨ {sp.ability}</button>
            <button className="btn btn-ghost py-4 text-xl" onClick={() => doAct('happy')}>💖 Happy</button>
          </div>
          {showAward ? (
            <div className="mt-4"><AwardGrid compact dark onPick={(c) => { const o = award([s.id], c.id); if (o.length && settings.soundEnabled) playAward(c.xp); setShowAward(false); }} /></div>
          ) : (
            <div className="mt-4 flex gap-3">
              {!locked && <button className="btn btn-primary flex-1 py-4 text-xl" onClick={() => setShowAward(true)}>⭐ Give points</button>}
              <button className="btn btn-ghost py-4 text-xl" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Spinning reel that slows down and lands on a random student. */
function RandomPicker({ students, onDone }: { students: Student[]; onDone: (id: string | null) => void }) {
  const settings = useStore((s) => s.data.settings);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const target = useRef(Math.floor(Math.random() * students.length));
  useEffect(() => {
    let i = Math.floor(Math.random() * students.length);
    let delay = 50;
    const steps = students.length * 2 + 18 + ((target.current - i + students.length) % students.length);
    let n = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i = (i + 1) % students.length;
      n++;
      setIdx(i);
      if (settings.soundEnabled) playTick(n);
      if (n >= steps) {
        setDone(true);
        if (settings.soundEnabled) playLevelUp();
        return;
      }
      delay = n > steps - 12 ? delay * 1.22 : delay;
      t = setTimeout(tick, delay);
    };
    t = setTimeout(tick, delay);
    return () => clearTimeout(t);
  }, [students.length, settings.soundEnabled]);

  const s = students[idx];
  const sp = getSpecies(s.speciesId);
  const stage = displayStage(s, settings);
  const prev = students[(idx - 1 + students.length) % students.length];
  const next = students[(idx + 1) % students.length];
  return (
    <motion.div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-night-950/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="font-display text-3xl font-semibold uppercase tracking-[0.3em] text-sun">{done ? 'It’s your turn!' : 'Who will it be?'}</div>
      <div className="mt-6 flex items-center gap-6">
        {!done && <Mini s={prev} />}
        <motion.div key={done ? 'done' : 'spin'} className="relative h-[46vh] w-[46vh] max-w-[80vw]" animate={done ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.5 }}>
          <Habitat element={sp.element} background={s.equipped.background} className="h-full w-full ring-8 ring-sun/70" rounded="rounded-full">
            {done ? <Creature speciesId={sp.id} stage={stage} equipped={s.equipped} action={{ type: 'celebrate', key: 1 }} className="mx-auto h-full w-[80%]" sound={false} />
              : <Creature speciesId={sp.id} stage={stage} equipped={s.equipped} effects={false} className="mx-auto h-full w-[80%]" sound={false} />}
          </Habitat>
          {done && <Burst kind="confetti" count={30} spread={300} />}
        </motion.div>
        {!done && <Mini s={next} />}
      </div>
      <div className="mt-6 font-display text-6xl font-bold">{firstName(s.name)}</div>
      <div className="mt-6 flex gap-3">
        {done && <button className="btn btn-primary px-8 py-4 text-xl" onClick={() => onDone(s.id)}>Open spotlight</button>}
        <button className="btn btn-ghost px-8 py-4 text-xl" onClick={() => onDone(null)}>{done ? 'Close' : 'Cancel'}</button>
      </div>
    </motion.div>
  );
}

function Mini({ s }: { s: Student }) {
  const settings = useStore((st) => st.data.settings);
  const sp = getSpecies(s.speciesId);
  return (
    <div className="hidden h-[22vh] w-[22vh] opacity-40 md:block">
      <Habitat element={sp.element} className="h-full w-full" rounded="rounded-full">
        <Creature speciesId={sp.id} stage={displayStage(s, settings)} effects={false} className="mx-auto h-full w-[80%]" sound={false} />
      </Habitat>
    </div>
  );
}
