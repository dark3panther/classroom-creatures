import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { awardSound, playTick, playCreature, playLevelUp } from '../audio/sfx';
import { AwardGrid } from '../components/AwardGrid';
import { PrizeWheel } from '../components/PrizeWheel';
import { FloatingXP } from '../components/StudentCard';
import { Glyph, Icon } from '../components/Icon';
import { ElementIcon, ProgressBar, StagePips } from '../components/ui';
import { Burst } from '../creatures/Burst';
import { Creature, type CreatureAction } from '../creatures/Creature';
import { Habitat } from '../creatures/Habitat';
import { ACHIEVEMENTS_BY_ID } from '../data/defaults';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { fieldNo, getSpecies } from '../data/species';
import { displayStage, levelForXp } from '../engine/progression';
import { firstName } from '../engine/util';
import { useClassStudents } from '../lib/stats';
import { useMood } from '../lib/useMood';
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
  const [wheel, setWheel] = useState(false);
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
    const out: { icon: string; text: string }[] = [];
    const seen = new Set<string>();
    for (let i = events.length - 1; i >= 0 && out.length < 8; i--) {
      const e = events[i];
      if (e.classId !== cls?.id || e.undone || e.xp <= 0 || seen.has(e.batchId)) continue;
      seen.add(e.batchId);
      const many = events.filter((x) => x.batchId === e.batchId).length;
      out.push({ icon: e.icon, text: `${many > 1 ? `${many} friends` : firstName(byId.get(e.studentId)?.name ?? '')} · ${e.categoryName}` });
    }
    for (const s of students) for (const a of s.achievements) if (Date.now() - a.at < 86_400_000 && out.length < 12) out.push({ icon: ACHIEVEMENTS_BY_ID[a.id]?.icon ?? '', text: `${firstName(s.name)} unlocked ${ACHIEVEMENTS_BY_ID[a.id]?.name}` });
    return out;
  }, [events, students, cls?.id]);

  const total = students.reduce((n, s) => n + s.xp, 0);

  // fit the whole class on the projector: pick the column count that gives the biggest plates without scrolling
  const mainRef = useRef<HTMLElement>(null);
  const [fit, setFit] = useState({ cols: 6, w: 200 });
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const calc = () => {
      const W = el.clientWidth - 48, H = el.clientHeight - 36, gap = 16, n = Math.max(1, students.length);
      let best = { cols: 1, w: 0 };
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const byWidth = (W - gap * (cols - 1)) / cols;
        const byHeight = ((H - gap * (rows - 1)) / rows - TILE_EXTRA) / TILE_RATIO;
        const w = Math.min(byWidth, byHeight, 300);
        if (w > best.w) best = { cols, w };
      }
      setFit({ cols: best.cols, w: Math.max(112, Math.floor(best.w)) });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [students.length]);

  const goalPct = cls && cls.goal > 0 ? Math.min(1, total / cls.goal) : 0;

  return (
    <div className="relative flex h-full min-h-full flex-col overflow-hidden text-ink">
      <header className="present-header cloth on-cloth relative flex flex-wrap items-center gap-x-8 gap-y-3 px-6 pb-4 pt-5 shadow-[0_8px_20px_-14px_rgb(13_46_35/.9)]">
        <h1 className="gilt-text min-w-0 truncate font-display text-[44px] font-extrabold leading-none tracking-[-0.02em] sm:text-[56px]">{cls?.name ?? 'Classroom Creatures'}</h1>
        {cls && (
          <div className="ml-auto flex w-full max-w-lg items-center gap-4">
            <div className="flex-1">
              <div className="font-display text-xl font-bold text-white">Class goal</div>
              <ProgressBar pct={goalPct} height={22} color="#5cc47f" track="rgb(255 255 255 / .16)" glow={goalPct >= 1} className="mt-1.5" />
            </div>
            <div className="font-display text-[64px] font-extrabold leading-none text-white tabular" aria-label={`${Math.round(goalPct * 100)} percent of the class goal`}>{Math.round(goalPct * 100)}<span className="text-[0.5em] text-white/75">%</span></div>
          </div>
        )}
      </header>

      <main ref={mainRef} className="relative min-h-0 flex-1 overflow-y-auto px-6 pb-3 pt-5">
        {students.length === 0 ? (
          <div className="grid h-full place-items-center font-display text-3xl font-bold text-ink-soft">Add students to see their creatures here.</div>
        ) : (
          <div className="grid justify-center gap-4" style={{ gridTemplateColumns: `repeat(${fit.cols}, ${fit.w}px)` }}>
            {sorted.map((s) => <PresentTile key={s.id} s={s} w={fit.w} onClick={() => setSpot(s.id)} />)}
          </div>
        )}
      </main>

      {ticker.length > 0 && (
        <div className="shrink-0 overflow-hidden whitespace-nowrap border-y border-rule bg-white/90 py-2.5 font-display text-[22px] font-semibold text-ink" aria-hidden>
          <motion.div className="inline-block" animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: Math.max(18, ticker.length * 5), ease: 'linear' }}>
            {[...ticker, ...ticker].map((t, i) => <span key={i} className="mx-8 inline-flex items-center gap-2"><span className="text-cloth-700"><Glyph icon={t.icon} size={24} /></span>{t.text}</span>)}
          </motion.div>
        </div>
      )}

      <nav className="cloth on-cloth flex min-h-[92px] shrink-0 flex-wrap items-center justify-center gap-3 px-4 py-3">
        <button className="btn btn-primary px-7 py-4 text-xl" onClick={() => setPicking(true)} disabled={!students.length}><Icon name="dice" size={24} />Pick a student</button>
        {!locked && <button className="btn btn-ghost px-7 py-4 text-xl" onClick={() => setWholeClass(true)} disabled={!students.length}><Icon name="sparkle" size={24} />Whole class</button>}
        {cls?.pendingSpin && !locked && <button className="btn btn-primary px-7 py-4 text-xl" onClick={() => setWheel(true)}><Icon name="wheel" size={24} />Prize wheel</button>}
        <button className="btn btn-ghost px-5 py-4 text-xl" onClick={fullscreen} aria-label="Toggle full screen"><Icon name="expand" size={22} />Full screen</button>
        <button className="btn btn-ghost px-5 py-4 text-xl" onClick={exit}><Icon name="close" size={22} />Exit</button>
      </nav>

      <AnimatePresence>{wheel && cls && <PrizeWheel classId={cls.id} onClose={() => setWheel(false)} />}</AnimatePresence>
      <AnimatePresence>{spot && <Spotlight key={spot} id={spot} onClose={() => setSpot(null)} />}</AnimatePresence>
      <AnimatePresence>{picking && <RandomPicker students={sorted} onDone={(id) => { setPicking(false); if (id) setSpot(id); }} />}</AnimatePresence>
      <AnimatePresence>
        {wholeClass && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-endpaper/95 p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-full max-w-4xl">
              <h2 className="mb-5 text-center font-display text-5xl font-extrabold tracking-[-0.02em]">Award the whole class</h2>
              <AwardGrid onPick={(c) => { const o = award(students.map((s) => s.id), c.id); if (o.length && settings.soundEnabled) awardSound(c.xp, o.length); setWholeClass(false); }} />
              <div className="mt-6 text-center"><button className="btn btn-light px-8 py-3 text-xl" onClick={() => setWholeClass(false)}>Cancel</button></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** plate height + caption, as a multiple of the tile width plus fixed padding (used to fit the grid) */
const TILE_RATIO = 1.19;
const TILE_EXTRA = 26;

function PresentTile({ s, w, onClick }: { s: Student; w: number; onClick: () => void }) {
  const settings = useStore((st) => st.data.settings);
  const pulse = useStore((st) => st.pulses[s.id]);
  const mood = useMood(s);
  const sp = getSpecies(s.speciesId);
  const stage = displayStage(s, settings);
  const level = levelForXp(s.xp, settings.levelXp);
  const big = Math.max(22, Math.round(w * 0.17));
  return (
    <button onClick={onClick} className="paper group relative flex flex-col items-center p-2 pb-2.5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]" aria-label={`${firstName(s.name)}, level ${level}`}>
      <Habitat element={sp.element} seed={sp.id} background={s.equipped.background} className="aspect-square w-full" rounded="rounded-[8px]">
        <Creature speciesId={s.speciesId} stage={stage} equipped={s.equipped} celebrateKey={pulse?.n} reactKind={pulse?.kind} event={pulse} treats={(s.milestoneRewards ?? []).filter((r) => !r.given).length} mood={mood} ambient={3} compact className="mx-auto h-full w-[86%]" />
        <span className="absolute left-1.5 top-1.5 flex items-baseline gap-0.5 rounded-full bg-white/95 px-2 py-0.5 font-display font-extrabold leading-none text-cloth-800 shadow-[0_1px_3px_rgb(22_36_28/.25)] ring-2 ring-cloth-800 tabular" aria-hidden>
          <span style={{ fontSize: Math.max(12, big * 0.42) }}>Lv</span><span style={{ fontSize: big }}>{level}</span>
        </span>
      </Habitat>
      <FloatingXP pulse={pulse} />
      <div className="mt-1.5 max-w-full truncate font-display font-bold leading-tight tracking-[-0.01em]" style={{ fontSize: Math.max(18, Math.min(34, Math.round(w * 0.13))) }}>{firstName(s.name)}</div>
      <StagePips stage={stage} color={ELEMENTS[sp.element].color} />
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
  const mood = useMood(s);
  if (!s) return null;
  const sp = getSpecies(s.speciesId);
  const stage = displayStage(s, settings);
  const doAct = (type: CreatureAction) => { if (settings.soundEnabled) playCreature(sp.sound, true); setAct({ type, key: Date.now() }); };
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-endpaper/95 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="relative grid w-full max-w-5xl items-center gap-6 md:grid-cols-[1.1fr_1fr]" initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} onClick={(e) => e.stopPropagation()}>
        <Habitat element={sp.element} seed={sp.id} background={s.equipped.background} className="aspect-square w-full border border-rule p-0 shadow-[var(--shadow-lift)]" rounded="rounded-[18px]">
          <Creature speciesId={sp.id} stage={stage} equipped={s.equipped} celebrateKey={pulse?.n} reactKind={pulse?.kind} event={pulse} treats={(s.milestoneRewards ?? []).filter((r) => !r.given).length} mood={mood} ambient={8} action={act} interactive sound={settings.soundEnabled} className="mx-auto h-full w-[84%]" />
          <FloatingXP pulse={pulse} />
        </Habitat>
        <div>
          <div className="font-display text-[88px] font-extrabold leading-[0.9] tracking-[-0.03em]">{firstName(s.name)}</div>
          <div className="mt-3 flex items-center gap-2 font-display text-3xl font-bold" style={{ color: ELEMENTS[sp.element].color }}>
            <ElementIcon element={sp.element} size={26} color={ELEMENTS[sp.element].color} /><span className="text-ink">{sp.name}</span>
            <span className="text-xl font-semibold text-ink-soft tabular">{fieldNo(sp.id)}</span>
          </div>
          <div className="mt-1 text-xl font-bold text-ink-soft">{STAGE_NAMES[stage]}{stage === 5 ? ` · ${sp.legendTitle}` : ''}</div>
          <p className="mt-3 max-w-[40ch] text-xl text-ink">{sp.personality}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="btn btn-light py-4 text-xl" onClick={() => doAct('jump')}><Icon name="jump" size={22} />Jump</button>
            <button className="btn btn-light py-4 text-xl" onClick={() => doAct('wave')}><Icon name="wave" size={22} />Wave</button>
            <button className="btn btn-light py-4 text-xl" onClick={() => doAct('ability')}><Icon name="sparkle" size={22} /><span className="truncate">{sp.ability}</span></button>
            <button className="btn btn-light py-4 text-xl" onClick={() => doAct('happy')}><Icon name="heart" size={22} />Happy</button>
          </div>
          {showAward ? (
            <div className="mt-4"><AwardGrid compact onPick={(c) => { const o = award([s.id], c.id); if (o.length && settings.soundEnabled) awardSound(c.xp); setShowAward(false); }} /></div>
          ) : (
            <div className="mt-4 flex gap-3">
              {!locked && <button className="btn btn-primary flex-1 py-4 text-xl" onClick={() => setShowAward(true)}><Icon name="star" size={22} />Give points</button>}
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
    <motion.div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-endpaper/95 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="font-display text-4xl font-extrabold tracking-[-0.01em] text-cloth-800">{done ? 'It’s your turn!' : 'Who will it be?'}</div>
      <div className="mt-6 flex items-center gap-6">
        {!done && <Mini s={prev} />}
        <motion.div key={done ? 'done' : 'spin'} className="relative h-[46vh] w-[46vh] max-w-[80vw]" animate={done ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.5 }}>
          <Habitat element={sp.element} seed={sp.id} background={s.equipped.background} className={`h-full w-full shadow-[var(--shadow-lift)] ring-[6px] ${done ? 'ring-gilt' : 'ring-white'}`} rounded="rounded-full">
            {done ? <Creature speciesId={sp.id} stage={stage} equipped={s.equipped} action={{ type: 'celebrate', key: 1 }} className="mx-auto h-full w-[80%]" sound={false} />
              : <Creature speciesId={sp.id} stage={stage} equipped={s.equipped} effects={false} className="mx-auto h-full w-[80%]" sound={false} />}
          </Habitat>
          {done && <Burst kind="confetti" count={30} spread={300} />}
        </motion.div>
        {!done && <Mini s={next} />}
      </div>
      <div className="mt-6 font-display text-[88px] font-extrabold leading-none tracking-[-0.03em]">{firstName(s.name)}</div>
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
      <Habitat element={sp.element} seed={sp.id} className="h-full w-full ring-4 ring-white" rounded="rounded-full">
        <Creature speciesId={sp.id} stage={displayStage(s, settings)} effects={false} className="mx-auto h-full w-[80%]" sound={false} />
      </Habitat>
    </div>
  );
}
