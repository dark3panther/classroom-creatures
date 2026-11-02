import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { playAchievement, playClassCelebration, playEvolutionCharge, playEvolutionReveal, playLevelUp, playMilestone } from '../audio/sfx';
import { PrizeWheel } from './PrizeWheel';
import { Burst } from '../creatures/Burst';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Creature } from '../creatures/Creature';
import { ACHIEVEMENTS_BY_ID } from '../data/defaults';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { getSpecies } from '../data/species';
import { displayStage } from '../engine/progression';
import { firstName } from '../engine/util';
import { type Celebration, useStore } from '../store/store';
import type { Stage, Student } from '../types';

/** Shows queued celebrations one at a time. */
export function CelebrationHost() {
  const queue = useStore((s) => s.celebrations);
  const dismiss = useStore((s) => s.dismissCelebration);
  const students = useStore((s) => s.data.students);
  const classes = useStore((s) => s.data.classes);
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const reduced = useStore((s) => s.data.settings.reducedMotion);
  const current = queue[0];
  if (!current) return null;
  const student = 'studentId' in current ? students.find((s) => s.id === current.studentId) : undefined;
  const close = () => dismiss(current.id);
  if ('studentId' in current && !student) { queueMicrotask(close); return null; }
  switch (current.type) {
    case 'evolution': return <EvolutionOverlay key={current.id} c={current} student={student!} onDone={close} sound={sound} reduced={reduced} />;
    case 'levelup': return <LevelUpPopup key={current.id} level={current.level} student={student!} onDone={close} sound={sound} />;
    case 'achievement': return <AchievementBanner key={current.id} id={current.achievementId} student={student!} onDone={close} sound={sound} />;
    case 'milestone': return <MilestonePopup key={current.id} c={current} student={student!} onDone={close} sound={sound} />;
    case 'classGoal': return <ClassGoalOverlay key={current.id} c={current} name={classes.find((x) => x.id === current.classId)?.name ?? 'Your class'} onDone={close} sound={sound} />;
  }
}

type Phase = 'intro' | 'charge' | 'flash' | 'reveal';

export function EvolutionOverlay({ c, student, onDone, sound, reduced }: {
  c: Extract<Celebration, { type: 'evolution' }>; student: Student; onDone: () => void; sound: boolean; reduced: boolean;
}) {
  const sp = getSpecies(student.speciesId);
  const el = ELEMENTS[sp.element];
  const [phase, setPhase] = useState<Phase>(reduced ? 'reveal' : 'intro');
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) { if (sound) playEvolutionReveal(); return; }
    setPhase('intro');
    const t = [
      setTimeout(() => { setPhase('charge'); if (sound) playEvolutionCharge(2.4); }, 700),
      setTimeout(() => setPhase('flash'), 3200),
      setTimeout(() => { setPhase('reveal'); if (sound) playEvolutionReveal(); }, 3450),
    ];
    return () => t.forEach(clearTimeout);
  }, [run, reduced, sound]);

  const showNew = phase === 'flash' || phase === 'reveal';
  const stage: Stage = showNew ? c.to : c.from;

  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-4" role="dialog" aria-label="Evolution"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgb(14 8 36 / .95)' }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 45%, ${el.color}55, transparent 70%)` }} />
      <div className="starfield absolute inset-0" />

      {/* rotating light rays on reveal */}
      {phase === 'reveal' && (
        <motion.div className="pointer-events-none absolute left-1/2 top-[44%] h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 0.55, rotate: 60 }} transition={{ opacity: { duration: 0.6 }, rotate: { duration: 20, ease: 'linear' } }}
          style={{ background: `repeating-conic-gradient(from 0deg, ${el.glow}55 0deg 8deg, transparent 8deg 24deg)`, maskImage: 'radial-gradient(circle, black 0%, transparent 55%)', WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 55%)' }} />
      )}

      <div className="relative flex flex-col items-center">
        <div className="relative h-[min(52vh,420px)] w-[min(52vh,420px)]">
          {/* gathering energy */}
          {phase === 'charge' && Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return (
              <motion.div key={i} className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full" style={{ background: i % 2 ? el.glow : '#fff', boxShadow: `0 0 12px ${el.glow}` }}
                initial={{ x: Math.cos(a) * 260, y: Math.sin(a) * 260, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: [0, 1, 0] }} transition={{ duration: 1.1, delay: (i % 7) * 0.18, repeat: 1 }} />
            );
          })}
          <motion.div className="absolute inset-x-[14%] bottom-[2%] top-[26%] rounded-full" style={{ background: `radial-gradient(circle, #ffffff, ${el.glow}aa 40%, transparent 70%)` }}
            animate={{ scale: phase === 'charge' ? [0.6, 1.3] : phase === 'reveal' ? 1.15 : 0.4, opacity: phase === 'intro' ? 0.2 : phase === 'reveal' ? 0.55 : 0.95 }}
            transition={{ duration: phase === 'charge' ? 2.4 : 0.5 }} />
          <motion.div className="absolute inset-0"
            key={showNew ? 'new' : 'old'}
            initial={showNew ? { scale: 0.5, opacity: 0 } : { scale: 0.9, opacity: 0 }}
            animate={showNew ? { scale: 1, opacity: 1 } : { scale: phase === 'charge' ? [1, 1.06, 0.96, 1.08, 1] : 1, opacity: 1 }}
            transition={showNew ? { type: 'spring', stiffness: 160, damping: 11 } : { duration: phase === 'charge' ? 2.4 : 0.5, repeat: 0 }}
            style={{ filter: phase === 'charge' ? 'brightness(2.4) saturate(0)' : 'none', transition: 'filter 2.2s ease-in' }}>
            <CreatureSvg species={sp} stage={stage} equipped={student.equipped} expression={phase === 'reveal' ? 'excited' : 'wow'} className="h-full w-full drop-shadow-[0_10px_30px_rgba(0,0,0,.4)]" />
          </motion.div>
          {phase === 'reveal' && <><Burst key={`c${run}`} kind="confetti" count={28} spread={260} size={16} duration={1.8} /><Burst key={`e${run}`} kind={sp.element} count={16} spread={200} size={26} duration={1.4} /></>}
        </div>

        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div className="mt-2 text-center" initial={{ y: 30, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 14 }}>
              <h2 className="font-display text-4xl font-bold tracking-wide text-sun drop-shadow-[0_4px_0_#7a4b00] sm:text-6xl">YOUR CREATURE EVOLVED!</h2>
              <p className="mt-3 text-lg font-bold text-white/90 sm:text-2xl">
                {firstName(student.name)}’s {sp.name} became <span style={{ color: el.glow }}>{STAGE_NAMES[c.to]}</span>{c.to === 5 ? `, ${sp.legendTitle}!` : '!'}
              </p>
              <motion.div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-2 ring-2 ring-sun/60" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }}>
                <span className="text-2xl" aria-hidden>🧬</span><span className="font-display text-lg font-semibold">Evolution Badge · {STAGE_NAMES[c.to]}</span>
              </motion.div>
              <div className="mt-6 flex justify-center gap-3">
                <button className="btn btn-ghost" onClick={() => setRun((r) => r + 1)}>↻ Replay</button>
                <button className="btn btn-primary px-8 text-lg" onClick={onDone} autoFocus>Hooray!</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {phase !== 'reveal' && (
          <motion.p className="mt-4 font-display text-2xl font-semibold text-white/90" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            What? {firstName(student.name)}’s {sp.name} is evolving…
          </motion.p>
        )}
      </div>
      {phase === 'flash' && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.6 }} />}
      {phase !== 'reveal' && <button className="absolute bottom-6 right-6 text-sm font-bold text-white/50 hover:text-white" onClick={() => setPhase('reveal')}>Skip ›</button>}
    </motion.div>
  );
}

function LevelUpPopup({ level, student, onDone, sound }: { level: number; student: Student; onDone: () => void; sound: boolean }) {
  const settings = useStore((s) => s.data.settings);
  useEffect(() => {
    if (sound) playLevelUp();
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone, sound]);
  const sp = getSpecies(student.speciesId);
  const stage = displayStage(student, settings);
  return (
    <motion.div className="fixed inset-x-0 top-24 z-50 flex justify-center px-4" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} onClick={onDone}>
      <div className="relative flex items-center gap-4 rounded-[2rem] bg-gradient-to-br from-grape to-night-600 py-3 pl-3 pr-8 shadow-2xl ring-4 ring-sun/70">
        <div className="relative h-24 w-24 rounded-full bg-white/15">
          <Creature speciesId={student.speciesId} stage={stage} equipped={student.equipped} action={{ type: 'jump', key: 1 }} className="h-full w-full" sound={false} />
          <Burst kind="sparkle" count={10} spread={80} />
        </div>
        <div>
          <div className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-sun">Level up!</div>
          <div className="font-display text-3xl font-bold">{firstName(student.name)} · Level {level}</div>
          <div className="text-sm font-bold text-white/80">{sp.name} is getting stronger!</div>
        </div>
      </div>
    </motion.div>
  );
}

function AchievementBanner({ id, student, onDone, sound }: { id: string; student: Student; onDone: () => void; sound: boolean }) {
  const a = ACHIEVEMENTS_BY_ID[id];
  useEffect(() => {
    if (sound) playAchievement();
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone, sound]);
  if (!a) return null;
  return (
    <motion.div className="fixed inset-x-0 top-24 z-50 flex justify-center px-4" initial={{ y: -40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} onClick={onDone}>
      <div className="relative flex items-center gap-4 rounded-[2rem] bg-parchment py-3 pl-3 pr-8 text-ink shadow-2xl ring-4" style={{ ['--tw-ring-color' as string]: a.color }}>
        <div className="relative grid h-20 w-20 place-items-center rounded-full text-4xl" style={{ background: `${a.color}33` }}>
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>{a.icon}</motion.span>
          <Burst kind="sparkle" count={10} spread={70} />
        </div>
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: a.color }}>Achievement unlocked</div>
          <div className="font-display text-2xl font-bold">{a.name}</div>
          <div className="text-sm font-bold text-ink-soft">{firstName(student.name)} · {a.description}</div>
        </div>
      </div>
    </motion.div>
  );
}

function ClassGoalOverlay({ c, name, onDone, sound }: { c: Extract<Celebration, { type: 'classGoal' }>; name: string; onDone: () => void; sound: boolean }) {
  const [wheel, setWheel] = useState(false);
  const all = useStore((s) => s.data.students);
  const students = all.filter((x) => x.classId === c.classId);
  const settings = useStore((s) => s.data.settings);
  useEffect(() => { if (sound) playClassCelebration(); }, [sound]);
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-night-950/90 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="starfield absolute inset-0" />
      <Burst kind="confetti" count={40} spread={420} size={18} duration={2.4} />
      <motion.div className="relative text-center" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
        <div className="font-display text-xl font-semibold uppercase tracking-[0.3em] text-mint">Class goal reached</div>
        <h2 className="mt-2 font-display text-5xl font-bold text-sun drop-shadow-[0_4px_0_#7a4b00] sm:text-7xl">AMAZING TEAMWORK!</h2>
        <p className="mt-3 text-xl font-bold text-white/90">{name} earned {c.goal.toLocaleString()} XP together!</p>
      </motion.div>
      <div className="relative mt-8 flex max-w-5xl flex-wrap justify-center gap-1">
        {students.slice(0, 32).map((s, i) => {
          const sp = getSpecies(s.speciesId);
          const stage = displayStage(s, settings);
          return (
            <motion.div key={s.id} className="h-16 w-16 sm:h-20 sm:w-20" initial={{ y: 40, opacity: 0 }} animate={{ y: [0, -24, 0], opacity: 1 }} transition={{ delay: 0.3 + i * 0.04, y: { repeat: Infinity, duration: 0.9, delay: i * 0.05 } }}>
              <CreatureSvg species={sp} stage={stage} equipped={s.equipped} expression="excited" effects={false} className="h-full w-full" />
            </motion.div>
          );
        })}
      </div>
      <button className="btn btn-primary relative mt-8 px-10 text-xl" onClick={() => setWheel(true)} autoFocus>🎡 Spin the prize wheel!</button>
      <button className="relative mt-3 text-sm font-bold text-white/60 hover:text-white" onClick={onDone}>Spin later (the button stays on the Classroom page)</button>
      <AnimatePresence>{wheel && <PrizeWheel classId={c.classId} onClose={onDone} />}</AnimatePresence>
    </motion.div>
  );
}

function MilestonePopup({ c, student, onDone, sound }: { c: Extract<Celebration, { type: 'milestone' }>; student: Student; onDone: () => void; sound: boolean }) {
  const all = useStore((s) => s.data.students);
  const names = [student, ...(c.others ?? []).map((id) => all.find((x) => x.id === id)).filter(Boolean) as Student[]].map((s) => firstName(s.name));
  const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  useEffect(() => {
    if (sound) playMilestone();
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [onDone, sound]);
  return (
    <motion.div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4" initial={{ y: -40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} onClick={onDone}>
      <div className="relative flex items-center gap-4 rounded-[2rem] bg-gradient-to-br from-[#7a4b2a] to-[#4a2c17] py-3 pl-3 pr-8 shadow-2xl ring-4 ring-sun">
        <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white/10">
          <motion.div initial={{ rotate: -30, scale: 0 }} animate={{ rotate: [-30, 10, 0], scale: [0, 1.3, 1] }} transition={{ duration: 0.7 }}><ChocoStick /></motion.div>
          <Burst kind="sparkle" count={12} spread={90} />
        </div>
        <div>
          <div className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-sun">Milestone reward{names.length > 1 ? 's' : ` · ${c.atXp} XP`}</div>
          <div className={`font-display font-bold text-white ${names.length > 3 ? 'text-2xl' : 'text-3xl'}`}>{who} earned {names.length > 1 ? `a ${c.label} each` : `a ${c.label}`}! {c.icon}</div>
          <div className="text-sm font-bold text-white/75">Hand it out, then tick it off in Rewards.</div>
        </div>
      </div>
    </motion.div>
  );
}

/** A generic chocolate-stick treat (drawn, no brand artwork). */
export function ChocoStick({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <g transform="rotate(-30 32 32)">
        <rect x="24" y="4" width="16" height="44" rx="7" fill="#6b3a1f" stroke="#3a1d0c" strokeWidth="2.5" />
        <rect x="27" y="8" width="4" height="34" rx="2" fill="#a0602e" opacity=".8" />
        <rect x="22" y="44" width="20" height="16" rx="4" fill="#ffd23f" stroke="#7a4b00" strokeWidth="2.5" />
        <path d="M26 50 h12 M26 55 h12" stroke="#ff5d5d" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
