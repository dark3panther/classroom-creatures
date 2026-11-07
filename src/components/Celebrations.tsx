import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { playAchievement, playClassCelebration, playEvolutionCharge, playEvolutionReveal, playLevelUp, playMilestone } from '../audio/sfx';
import { Icon } from './Icon';
import { PrizeWheel } from './PrizeWheel';
import { Burst } from '../creatures/Burst';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import { ElementIcon } from './ui';
import { Creature } from '../creatures/Creature';
import { ACHIEVEMENTS_BY_ID } from '../data/defaults';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { fieldNo, getSpecies } from '../data/species';
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
  const roman = (n: Stage) => ['I', 'II', 'III', 'IV', 'V'][n - 1];

  return (
    <motion.div className="cloth-deep on-cloth fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-4" role="dialog" aria-label="Evolution"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative flex w-full max-w-5xl flex-col items-center">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* the old entry steps aside once the new one is painted */}
          <AnimatePresence>
            {phase === 'reveal' && (
              <motion.div className="hidden w-[min(22vh,190px)] flex-col items-center sm:flex" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 0.85, x: 0 }} transition={{ delay: 0.35 }}>
                <div className="paper w-full p-1.5">
                  <Habitat element={sp.element} seed={sp.id} className="aspect-square w-full" rounded="rounded-[6px]">
                    <CreatureSvg species={sp} stage={c.from} equipped={student.equipped} effects={false} className="mx-auto h-full w-[82%]" />
                  </Habitat>
                </div>
                <div className="mt-2 text-center font-display text-lg font-bold text-white/80">Stage {roman(c.from)} · {STAGE_NAMES[c.from]}</div>
              </motion.div>
            )}
          </AnimatePresence>
          {phase === 'reveal' && <motion.span className="hidden text-gilt sm:block" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}><Icon name="arrowRight" size={44} strokeWidth={2.4} /></motion.span>}

          {/* the hero plate: the specimen as it changes */}
          <div className="flex flex-col items-center">
            <div className="paper relative w-[min(50vh,420px)] p-2 shadow-[var(--shadow-lift)]">
              <motion.div key={showNew ? 'new' : 'old'} className="relative"
                initial={showNew ? { clipPath: 'circle(0% at 50% 55%)' } : false}
                animate={{ clipPath: 'circle(80% at 50% 55%)' }} transition={{ duration: showNew ? 0.9 : 0, ease: [0.2, 0.7, 0.2, 1] }}>
                <Habitat element={sp.element} seed={sp.id} className="aspect-square w-full" rounded="rounded-[10px]">
                  {/* gathering energy */}
                  {phase === 'charge' && Array.from({ length: 14 }).map((_, i) => {
                    const a = (i / 14) * Math.PI * 2;
                    return (
                      <motion.div key={i} className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full" style={{ background: el.color }}
                        initial={{ x: Math.cos(a) * 200, y: Math.sin(a) * 200, opacity: 0 }}
                        animate={{ x: 0, y: 0, opacity: [0, 1, 0] }} transition={{ duration: 1.1, delay: (i % 7) * 0.18, repeat: 1 }} />
                    );
                  })}
                  <motion.div className="absolute inset-0"
                    initial={showNew ? { scale: 0.6, opacity: 0 } : { scale: 0.9, opacity: 0 }}
                    animate={showNew ? { scale: 1, opacity: 1 } : { scale: phase === 'charge' ? [1, 1.06, 0.96, 1.08, 1] : 1, opacity: 1 }}
                    transition={showNew ? { type: 'spring', stiffness: 160, damping: 11, delay: 0.25 } : { duration: phase === 'charge' ? 2.4 : 0.5 }}
                    style={{ filter: phase === 'charge' ? 'brightness(2.2) saturate(0)' : 'none', transition: 'filter 2.2s ease-in' }}>
                    <CreatureSvg species={sp} stage={stage} equipped={student.equipped} expression={phase === 'reveal' ? 'excited' : 'wow'} className="mx-auto h-full w-[84%]" />
                  </motion.div>
                </Habitat>
              </motion.div>
              {phase === 'reveal' && (
                <motion.div className="pointer-events-none absolute -right-4 -top-4 grid h-24 w-24 rotate-[-12deg] place-items-center rounded-full border-[3px] border-gilt bg-cloth-950/90 text-center font-display font-extrabold leading-none text-gilt shadow-[var(--shadow-lift)]"
                  initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 16 }} aria-hidden>
                  <span><span className="block text-[13px]">{fieldNo(sp.id)}</span><span className="block text-[26px]">{roman(c.to)}</span></span>
                </motion.div>
              )}
              {phase === 'reveal' && <><Burst key={`c${run}`} kind="confetti" count={28} spread={260} size={16} duration={1.8} /><Burst key={`e${run}`} kind={sp.element} count={16} spread={200} size={26} duration={1.4} /></>}
            </div>
            <div className="mt-3 flex items-center gap-2 font-display text-xl font-bold text-white">
              <ElementIcon element={sp.element} size={20} color={el.color} />
              <span className="tabular text-white/75">{fieldNo(sp.id)}</span> {sp.name} · Stage {roman(stage)} · {STAGE_NAMES[stage]}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div className="mt-5 text-center" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 16 }}>
              <h2 className="gilt-text font-display text-5xl font-extrabold tracking-[-0.02em] sm:text-7xl">Your creature evolved!</h2>
              <p className="mt-3 text-lg font-bold text-white sm:text-2xl">
                {firstName(student.name)}’s {sp.name} became {STAGE_NAMES[c.to]}{c.to === 5 ? `, ${sp.legendTitle}!` : '!'} A new entry for the field guide.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button className="btn btn-ghost" onClick={() => setRun((r) => r + 1)}><Icon name="replay" size={18} />Replay</button>
                <button className="btn btn-primary px-8 text-lg" onClick={onDone} autoFocus>Hooray!</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {phase !== 'reveal' && (
          <motion.p className="mt-5 font-display text-2xl font-semibold text-white" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            What? {firstName(student.name)}’s {sp.name} is evolving…
          </motion.p>
        )}
      </div>
      {phase === 'flash' && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.6 }} />}
      {phase !== 'reveal' && <button className="absolute bottom-6 right-6 flex items-center gap-1 text-sm font-bold text-white/70 hover:text-white" onClick={() => setPhase('reveal')}>Skip<Icon name="next" size={16} /></button>}
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
      <div className="relative flex items-center gap-4 rounded-[20px] bg-white py-3 pl-3 pr-8 text-ink shadow-[var(--shadow-lift)] ring-[3px] ring-gilt">
        <div className="relative h-24 w-24 overflow-hidden rounded-full bg-wash ring-1 ring-rule">
          <Creature speciesId={student.speciesId} stage={stage} equipped={student.equipped} action={{ type: 'jump', key: 1 }} className="h-full w-full" sound={false} />
          <Burst kind="sparkle" count={10} spread={80} />
        </div>
        <div>
          <div className="font-display text-3xl font-extrabold tracking-[-0.01em]">{firstName(student.name)} reached Level {level}!</div>
          <div className="mt-0.5 text-[15px] font-bold text-ink-soft">{sp.name} is getting stronger.</div>
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
      <div className="relative flex items-center gap-4 rounded-[20px] bg-white py-3 pl-3 pr-8 text-ink shadow-[var(--shadow-lift)] ring-[3px]" style={{ ['--tw-ring-color' as string]: a.color }}>
        <div className="relative grid h-20 w-20 place-items-center rounded-full text-4xl" style={{ background: `color-mix(in srgb, ${a.color} 20%, white)` }}>
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>{a.icon}</motion.span>
          <Burst kind="sparkle" count={10} spread={70} />
        </div>
        <div>
          <div className="font-display text-2xl font-extrabold tracking-[-0.01em]">{a.name}</div>
          <div className="text-[13px] font-bold text-ink-soft">Achievement unlocked</div>
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
    <motion.div className="cloth-deep on-cloth fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Burst kind="confetti" count={40} spread={420} size={18} duration={2.4} />
      <motion.div className="relative text-center" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
        <h2 className="gilt-text font-display text-5xl font-extrabold tracking-[-0.02em] sm:text-7xl">Amazing teamwork!</h2>
        <p className="mt-3 text-2xl font-bold text-white">{name} reached the class goal: {c.goal.toLocaleString()} XP together!</p>
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
      <button className="btn btn-primary relative mt-8 px-10 py-4 text-xl" onClick={() => setWheel(true)} autoFocus><Icon name="wheel" size={24} />Spin the prize wheel!</button>
      <button className="relative mt-3 text-sm font-bold text-white/75 hover:text-white" onClick={onDone}>Spin later (the button stays on the Classroom page)</button>
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
      <div className="relative flex items-center gap-4 rounded-[20px] bg-[#5a341c] py-3 pl-3 pr-8 text-white shadow-[var(--shadow-lift)] ring-[3px] ring-gilt">
        <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white/10">
          <motion.div initial={{ rotate: -30, scale: 0 }} animate={{ rotate: [-30, 10, 0], scale: [0, 1.3, 1] }} transition={{ duration: 0.7 }}><ChocoStick /></motion.div>
          <Burst kind="sparkle" count={12} spread={90} />
        </div>
        <div>
          <div className="font-display text-[15px] font-semibold text-[#f6cb62]">Milestone reward{names.length > 1 ? 's' : ` · ${c.atXp} XP`}</div>
          <div className={`font-display font-bold text-white ${names.length > 3 ? 'text-2xl' : 'text-3xl'}`}>{who} earned {names.length > 1 ? `a ${c.label} each` : `a ${c.label}`}! {c.icon}</div>
          <div className="text-sm font-bold text-white/85">Hand it out, then tick it off in Rewards.</div>
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
