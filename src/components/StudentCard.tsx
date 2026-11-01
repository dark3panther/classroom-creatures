import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import { playAward } from '../audio/sfx';
import { Creature } from '../creatures/Creature';
import { Habitat } from '../creatures/Habitat';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { studentView } from '../lib/stats';
import { useStore } from '../store/store';
import type { Category, Student } from '../types';
import { ElementIcon, LevelBadge, ProgressBar, StagePips } from './ui';

export function FloatingXP({ pulse }: { pulse?: { n: number; xp: number; icon: string } }) {
  return (
    <AnimatePresence>
      {pulse && (
        <motion.div key={pulse.n} className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 whitespace-nowrap font-display text-3xl font-bold"
          initial={{ y: 10, opacity: 0, scale: 0.6 }} animate={{ y: -46, opacity: [0, 1, 1, 0], scale: [0.6, 1.25, 1, 1] }} transition={{ duration: 1.5, times: [0, 0.2, 0.7, 1] }}
          style={{ color: pulse.xp >= 0 ? '#fff' : '#cbd5e1', textShadow: '0 3px 0 #c98400, 0 0 18px rgb(255 201 59 / .9)', WebkitTextStroke: '1px #c98400' }}>
          {pulse.xp === 0 ? '♡' : `${pulse.xp > 0 ? '+' : ''}${pulse.xp} XP`}
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
  const v = studentView(student, settings);
  const { species, prog, stage } = v;

  const quickAward = (c: Category) => {
    const out = award([student.id], c.id);
    if (out.length && settings.soundEnabled) playAward(c.xp);
  };

  return (
    <motion.div layout="position" className={`group relative flex flex-col paper overflow-hidden transition-shadow ${selected ? 'ring-4 ring-sun shadow-[var(--shadow-glow)]' : ''}`}
      whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
      <button type="button" className="relative block text-left" onClick={() => (selecting ? onToggle(student.id) : onOpen(student.id))}
        aria-label={selecting ? `${selected ? 'Deselect' : 'Select'} ${student.name}` : `Open ${student.name}`}>
        <Habitat element={species.element} background={student.equipped.background} className="m-2 mb-0 h-36 sm:h-40" rounded="rounded-[1.1rem]">
          <Creature speciesId={student.speciesId} stage={stage} equipped={student.equipped} celebrateKey={pulse?.n} className="mx-auto h-full w-[82%]" />
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
          <div className="mt-0.5 text-[11px] font-bold text-ink-soft/80">{STAGE_NAMES[stage]} · {student.xp} XP</div>
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
        </div>
      )}
      {selecting && <div className="pb-3" />}
    </motion.div>
  );
}

export const StudentCard = memo(StudentCardImpl);
