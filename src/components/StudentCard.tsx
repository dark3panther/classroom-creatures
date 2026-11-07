import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import { MOODS } from '../engine/mood';
import { useMood } from '../lib/useMood';
import { awardSound } from '../audio/sfx';
import { Creature } from '../creatures/Creature';
import { Habitat } from '../creatures/Habitat';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { fieldNo } from '../data/species';
import { studentView } from '../lib/stats';
import { useStore } from '../store/store';
import type { Category, Student } from '../types';
import { CoinIcon, Glyph, Icon } from './Icon';
import { ElementIcon, LevelBadge, ProgressBar, StagePips } from './ui';

export function FloatingXP({ pulse }: { pulse?: { n: number; xp: number; icon: string; coins?: number; kind?: 'good' | 'bad' } }) {
  return (
    <AnimatePresence>
      {pulse && (
        <motion.div key={pulse.n} className={`pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap font-display text-[32px] font-extrabold tabular ${pulse.kind === 'bad' ? 'top-24' : 'top-6'}`}
          initial={{ y: 10, opacity: 0, scale: 0.6 }} animate={{ y: -46, opacity: [0, 1, 1, 0], scale: [0.6, 1.25, 1, 1] }} transition={{ duration: 1.5, times: [0, 0.2, 0.7, 1] }}
          style={{ color: pulse.kind === 'bad' ? '#9a3522' : '#1b7a40', textShadow: '0 0 2px #fff, 0 2px 0 #fff, 0 0 12px rgb(255 255 255 / .95)' }}>
          {pulse.kind === 'bad' && pulse.xp === 0 ? 'Oops!' : `${pulse.xp > 0 ? '+' : ''}${pulse.xp} XP`}
          {!!pulse.coins && pulse.coins > 0 && <span className="flex items-center gap-1 text-2xl text-coin"><CoinIcon size={22} />+{pulse.coins}</span>}
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
  /** part of the most recent award: the plate keeps its marigold ribbon until the next one */
  fresh?: boolean;
}

function StudentCardImpl({ student, quick, selecting, selected, onOpen, onToggle, fresh }: Props) {
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

  const el = ELEMENTS[species.element];
  const treats = (student.milestoneRewards ?? []).filter((r) => !r.given).length;

  return (
    <motion.div layout="position" className={`group relative flex flex-col paper transition-shadow hover:shadow-[var(--shadow-lift)] ${selected ? '!border-gilt-deep shadow-[var(--shadow-glow)]' : ''}`}
      whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
      <button type="button" className="relative block rounded-[var(--radius-card)] text-left" onClick={() => (selecting ? onToggle(student.id) : onOpen(student.id))}
        aria-label={selecting ? `${selected ? 'Deselect' : 'Select'} ${student.name}` : `Open ${student.name}`} aria-pressed={selecting ? selected : undefined}>
        <Habitat element={species.element} seed={species.id} background={student.equipped.background} className="mx-2 mt-2 h-36 sm:h-40" rounded="rounded-[8px]">
          <Creature speciesId={student.speciesId} stage={stage} equipped={student.equipped} celebrateKey={pulse?.n} reactKind={pulse?.kind} event={pulse} treats={treats} mood={mood} ambient={3} compact className="mx-auto h-full w-[82%]" />
          {!selecting && mood !== 'calm' && (
            <span className="chip absolute bottom-1.5 left-1.5 bg-white/90 !px-2 text-[11px] text-ink ring-1 ring-rule" title={`${species.name} feels ${m.label.toLowerCase()}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />{m.label}
            </span>
          )}
          <div className="absolute left-1.5 top-1.5"><LevelBadge level={prog.level} size="sm" /></div>
          {selecting && (
            <span className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full ring-2 ${selected ? 'bg-gilt text-gilt-ink ring-white' : 'bg-white/80 text-transparent ring-ink/30'}`}>
              <Icon name="check" size={18} strokeWidth={3} />
            </span>
          )}
        </Habitat>
        <AnimatePresence>
          {fresh && !selecting && (
            <motion.span className="ribbon pointer-events-none absolute right-4 top-0 z-10 h-10 w-4" title="Just rewarded"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0, opacity: 0 }} style={{ transformOrigin: 'top' }} transition={{ type: 'spring', stiffness: 380, damping: 22 }} />
          )}
        </AnimatePresence>
        <FloatingXP pulse={pulse} />
        <div className="px-3 pt-2">
          <div className="mb-2 h-[3px] rounded-full" style={{ background: el.color }} aria-hidden />
          <div className="truncate font-display text-[20px] font-bold leading-tight tracking-[-0.01em]">{student.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
            <ElementIcon element={species.element} size={13} color={el.color} />
            <span className="truncate"><span className="tabular">{fieldNo(species.id)}</span> · <b className="font-bold text-ink">{species.name}</b></span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar pct={prog.pct} className="flex-1" height={9} color={el.color} />
            <span className="w-14 text-right text-[12px] font-bold text-ink-soft tabular">{prog.isMax ? 'Max' : `${prog.into}/${prog.span}`}</span>
          </div>
          <div className="mt-1 flex items-center text-[12px] text-ink-soft">
            <span title={STAGE_NAMES[stage]}><StagePips stage={stage} color={el.color} /></span>
            <span className="ml-2 truncate"><span className="tabular">{student.xp}</span> XP</span>
            <span className="ml-auto flex shrink-0 items-center gap-1 font-bold text-coin tabular" title="Coins"><CoinIcon size={14} />{student.coins ?? 0}</span>
          </div>
        </div>
      </button>
      {!selecting && quick.length > 0 && (
        <div className="mt-auto flex gap-1.5 px-3 pb-3 pt-2.5">
          {quick.map((c) => (
            <button key={c.id} type="button" onClick={() => quickAward(c)} title={`${c.name} (+${c.xp} XP)`} aria-label={`Award ${c.name} to ${student.name}`}
              className="flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] font-bold leading-none text-ink transition hover:brightness-[.97] active:translate-y-[1px]"
              style={{ background: `color-mix(in srgb, ${c.color} 15%, white)`, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${c.color} 45%, white)` }}>
              <span style={{ color: `color-mix(in srgb, ${c.color} 70%, #16241c)` }}><Glyph icon={c.icon} size={19} /></span><span className="tabular">+{c.xp}</span>
            </button>
          ))}
          {deductions.length > 0 && (
            <button type="button" onClick={() => setDeductOpen((o) => !o)} title="Behaviour reminders (deduct XP)" aria-label={`Deduct points from ${student.name}`} aria-expanded={deductOpen}
              className={`grid h-12 w-9 shrink-0 place-items-center rounded-xl transition active:translate-y-[1px] ${deductOpen ? 'bg-brick text-white' : 'bg-brick-pale text-brick ring-1 ring-brick/30 hover:bg-[#f3d4cc]'}`}>
              <Icon name="minus" size={18} strokeWidth={2.8} />
            </button>
          )}
        </div>
      )}
      <AnimatePresence>
        {deductOpen && !selecting && (
          <motion.div className="absolute inset-x-2 bottom-14 z-20 rounded-xl bg-white p-1.5 shadow-[var(--shadow-lift)] ring-1 ring-rule" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
            {deductions.map((c) => (
              <button key={c.id} type="button" onClick={() => { quickAward(c); setDeductOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-bold text-ink hover:bg-brick-pale">
                <span className="text-brick"><Glyph icon={c.icon} size={18} /></span><span className="flex-1 leading-tight">{c.name}</span><span className="text-brick tabular">{c.xp}</span>
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
