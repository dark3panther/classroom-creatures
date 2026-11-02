import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import { MOODS } from '../engine/mood';
import { useMood } from '../lib/useMood';
import { awardSound } from '../audio/sfx';
import { Creature } from '../creatures/Creature';
import { Habitat } from '../creatures/Habitat';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { studentView } from '../lib/stats';
import { useStore } from '../store/store';
import type { Category, Student } from '../types';
import { ElementIcon, LevelBadge, ProgressBar, StagePips } from './ui';

export function FloatingXP({ pulse }: { pulse?: { n: number; xp: number; icon: string; coins?: number; kind?: 'good' | 'bad' } }) {
  return (
    <AnimatePresence>
      {pulse && (
        <motion.div key={pulse.n} className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap font-display text-3xl font-bold ${pulse.kind === 'bad' ? 'top-24' : 'top-6'}`}
          initial={{ y: 10, opacity: 0, scale: 0.6 }} animate={{ y: -46, opacity: [0, 1, 1, 0], scale: [0.6, 1.25, 1, 1] }} transition={{ duration: 1.5, times: [0, 0.2, 0.7, 1] }}
          style={pulse.kind === 'bad'
            ? { color: '#e2e8f0', textShadow: '0 3px 0 #475569', WebkitTextStroke: '1px #475569' }
            : { color: '#fff', textShadow: '0 3px 0 #c98400, 0 0 18px rgb(255 201 59 / .9)', WebkitTextStroke: '1px #c98400' }}>
          {pulse.kind === 'bad' && pulse.xp === 0 ? 'Oops!' : `${pulse.xp > 0 ? '+' : ''}${pulse.xp} XP`}
          {!!pulse.coins && pulse.coins > 0 && <span className="ml-1 text-2xl" style={{ WebkitTextStroke: '0' }}>🪙+{pulse.coins}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface Props {
  student: Student;
  quick: Category[];
  selecting: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}

function StudentCardImpl({ student, quick, selecting, selected, onOpen, onToggle }: Props) {
  const settings = useStore((s) => s.data.settings);
  const pulse = useStore((s) => s.pulses[student.id]);
  const award = useStore((s) => s.award);
  const negatives = useStore((s) => s.data.categories);
  const mood = useMood(student);
  const [deductOpen, setDeductOpen] = useState(false);
  const v = studentView(student, settings);
  const { species, prog, stage } = v;
  const deductions = settings.negativeEnabled ? negatives.filter((c) => c.xp < 0) : [];
  const m = MOODS[mood];

  const quickAward = (c: Category) => {
    const out = award([student.id], c.id);
    if (out.length && settings.soundEnabled) awardSound(c.xp);
  };

  return (
    <motion.div layout="position" className={`group relative flex flex-col paper overflow-hidden transition-shadow ${selected ? 'ring-4 ring-sun shadow-[var(--shadow-glow)]' : ''}`}
      whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
      <button type="button" className="relative block text-left" onClick={() => (selecting ? onToggle(student.id) : onOpen(student.id))}
        aria-label={selecting ? `${selected ? 'Deselect' : 'Select'} ${student.name}` : `Open ${student.name}`}>
        <Habitat element={species.element} background={student.equipped.background} className="m-2 mb-0 h-36 sm:h-40" rounded="rounded-[1.1rem]">
          <Creature speciesId={student.speciesId} stage={stage} equipped={student.equipped} celebrateKey={pulse?.n} reactKind={pulse?.kind} mood={mood} ambient={3} compact className="mx-auto h-full w-[82%]" />
          {!selecting && mood !== 'calm' && (
            <span className="chip absolute bottom-1.5 left-2 bg-white/85 !px-2 text-[10px]" style={{ color: m.color }} title={`${species.name} feels ${m.label.toLowerCase()}`}>{m.icon} {m.label}</span>
          )}
          <div className="absolute left-2 top-2"><LevelBadge level={prog.level} size="sm" /></div>
          {student.isDemo && <span className="chip absolute right-2 top-2 bg-white/80 text-[10px] text-ink">DEMO</span>}
          {selecting && (
            <span className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border-[3px] text-lg font-bold ${selected ? 'border-white bg-sun text-[#3a2400]' : 'border-white/90 bg-white/40'}`}>{selected ? '✓' : ''}</span>
          )}
        </Habitat>
        <FloatingXP pulse={pulse} />
        <div className="px-3 pt-2">
          <div className="truncate font-display text-lg font-semibold leading-tight">{student.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-ink-soft">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full" style={{ background: ELEMENTS[species.element].color }}><ElementIcon element={species.element} size={10} /></span>
            <span className="truncate">{species.name}</span>
            <span className="ml-auto shrink-0"><StagePips stage={stage} dark /></span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar pct={prog.pct} className="flex-1" height={10} color={stage === 5 ? '#f2a20c' : '#8b5cf6'} />
            <span className="w-14 text-right text-[11px] font-extrabold tabular-nums text-ink-soft">{prog.isMax ? 'MAX' : `${prog.into}/${prog.span}`}</span>
          </div>
          <div className="mt-0.5 flex items-center text-[11px] font-bold text-ink-soft/80">
            <span className="truncate">{STAGE_NAMES[stage]} · {student.xp} XP</span>
            <span className="ml-auto shrink-0 font-extrabold text-[#b7791f]" title="Coins">🪙 {student.coins ?? 0}</span>
          </div>
        </div>
      </button>
      {!selecting && quick.length > 0 && (
        <div className="mt-auto flex gap-1.5 px-3 pb-3 pt-2">
          {quick.map((c) => (
            <button key={c.id} type="button" onClick={() => quickAward(c)} title={`${c.name} (+${c.xp} XP)`} aria-label={`Award ${c.name} to ${student.name}`}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full text-sm font-extrabold text-white shadow-[0_3px_0_rgb(0_0_0/.18)] transition active:translate-y-[2px] active:shadow-none"
              style={{ background: c.color }}>
              <span aria-hidden>{c.icon}</span><span>+{c.xp}</span>
            </button>
          ))}
          {deductions.length > 0 && (
            <button type="button" onClick={() => setDeductOpen((o) => !o)} title="Behaviour reminders (deduct XP)" aria-label={`Deduct points from ${student.name}`} aria-expanded={deductOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500 text-sm font-extrabold text-white shadow-[0_3px_0_rgb(0_0_0/.18)] transition active:translate-y-[2px] active:shadow-none">−</button>
          )}
        </div>
      )}
      <AnimatePresence>
        {deductOpen && !selecting && (
          <motion.div className="absolute inset-x-2 bottom-14 z-20 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-ink/10" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
            {deductions.map((c) => (
              <button key={c.id} type="button" onClick={() => { quickAward(c); setDeductOpen(false); }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-bold text-ink hover:bg-slate-100">
                <span className="text-base" aria-hidden>{c.icon}</span><span className="flex-1 leading-tight">{c.name}</span><span className="text-slate-500">{c.xp}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {selecting && <div className="pb-3" />}
    </motion.div>
  );
}

export const StudentCard = memo(StudentCardImpl);
