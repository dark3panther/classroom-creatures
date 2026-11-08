import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Creature } from '../creatures/Creature';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import { BRANCHES } from '../data/branches';
import { ELEMENTS, RARITIES, STAGE_NAMES } from '../data/elements';
import { fieldNo, getSpecies } from '../data/species';
import { canChooseBranch, needsBranchChoice, pendingStage } from '../engine/evolution';
import { firstName } from '../engine/util';
import { useStore } from '../store/store';
import type { Stage, Student } from '../types';
import { Icon } from './Icon';
import { ElementIcon, Modal } from './ui';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** Students whose creature is waiting for the teacher: ready to evolve, or at the final stage without a path. */
export function useEvolutionQueue(classId: string | undefined): { ready: Student[]; choose: Student[] } {
  const data = useStore((s) => s.data);
  return useMemo(() => {
    const inClass = data.students.filter((s) => s.classId === classId);
    return {
      ready: inClass.filter((s) => pendingStage(s, data)),
      choose: inClass.filter((s) => canChooseBranch(s)),
    };
  }, [data, classId]);
}

/** Marigold "Evolve" / "Choose path" pill for a student card; renders nothing when nothing is waiting. */
export function EvolveBadge({ student, className = '' }: { student: Student; className?: string }) {
  const data = useStore((s) => s.data);
  const locked = useStore((s) => s.locked);
  const start = useStore((s) => s.startEvolution);
  const ready = !!pendingStage(student, data);
  const choose = !ready && canChooseBranch(student);
  if ((!ready && !choose) || locked) return null;
  return (
    <motion.button type="button" onClick={(e) => { e.stopPropagation(); start(student.id); }}
      className={`flex items-center gap-1 rounded-full bg-gilt px-2.5 py-1 font-display text-[13px] font-bold text-gilt-ink shadow-[var(--shadow-glow)] ${className}`}
      initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [1, 1.06, 1], opacity: 1 }} transition={{ scale: { repeat: Infinity, duration: 1.8 } }}
      aria-label={ready ? `Evolve ${student.name}'s creature` : `Choose ${student.name}'s final path`}>
      <Icon name="sparkle" size={14} strokeWidth={2.4} />{ready ? 'Evolve' : 'Choose path'}
    </motion.button>
  );
}

/** The final-path chooser: two plates side by side, classic Legendary or Mythical. */
export function BranchChooserHost() {
  const pick = useStore((s) => s.branchPick);
  const close = useStore((s) => s.closeBranchPick);
  const approve = useStore((s) => s.approveEvolution);
  const choose = useStore((s) => s.chooseBranch);
  const st = useStore((s) => s.data.students.find((x) => x.id === pick?.studentId));
  const def = st ? BRANCHES[st.speciesId] : undefined;
  return (
    <AnimatePresence>
      {pick && st && def && (
        <motion.div className="cloth-deep on-cloth fixed inset-0 z-[52] flex items-center justify-center overflow-y-auto p-4" role="dialog" aria-label="Choose the final path"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="w-full max-w-4xl py-6 text-center">
            <h2 className="gilt-text font-display text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl">Choose {firstName(st.name)}’s final path</h2>
            <p className="mt-2 text-lg font-bold text-white">{getSpecies(st.speciesId).name} can become one of two final forms. This choice stays for good.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(['a', 'b'] as const).map((b) => {
                const path = def[b];
                const sp = getSpecies(st.speciesId);
                const r = RARITIES[path.rarity];
                return (
                  <div key={b} className="paper flex flex-col p-3 text-left">
                    <Habitat element={sp.element} seed={sp.id} className="aspect-[4/3] w-full" rounded="rounded-[10px]">
                      <Creature speciesId={sp.id} stage={5} branch={b} equipped={st.equipped} className="mx-auto h-full w-[72%]" sound={false} />
                    </Habitat>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="chip ring-1" style={{ color: r.color, background: `color-mix(in srgb, ${r.color} 12%, white)`, ['--tw-ring-color' as string]: `color-mix(in srgb, ${r.color} 40%, white)` }}>{r.name} form</span>
                      {b === 'a' && <span className="text-[13px] font-bold text-ink-soft">Classic path</span>}
                      {b === 'b' && <span className="text-[13px] font-bold text-ink-soft">Mythical path</span>}
                    </div>
                    <div className="mt-1 font-display text-2xl font-extrabold tracking-[-0.01em]">{sp.name}, {path.title}</div>
                    <p className="mt-1 flex-1 text-[15px] text-ink-soft">{path.description}</p>
                    <button className={`btn mt-3 w-full py-3 text-lg ${b === 'b' ? 'btn-primary' : 'btn-cloth'}`}
                      onClick={() => { close(); if (pick.mode === 'approve') approve(st.id, b); else choose(st.id, b); }}>
                      <Icon name="sparkle" size={18} />Choose {path.title}
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-ghost mt-5" onClick={close}>Not yet</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Teacher queue: every creature in the class that is waiting for an evolution or a path. */
export function EvolutionQueue({ classId, open, onClose }: { classId: string; open: boolean; onClose: () => void }) {
  const { ready, choose } = useEvolutionQueue(classId);
  const start = useStore((s) => s.startEvolution);
  const approve = useStore((s) => s.approveEvolution);
  const data = useStore((s) => s.data);
  const simple = ready.filter((s) => !needsBranchChoice(s));
  return (
    <Modal open={open} onClose={onClose} label="Evolutions waiting" wide>
      <div className="p-6">
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.01em]">Evolutions waiting</h2>
        <p className="mt-1 text-ink-soft">
          {data.settings.evolutionMode === 'approval'
            ? 'These creatures have enough XP to evolve. Evolve them when the moment is right, one by one in front of the class or all together.'
            : 'These creatures reached their final stage and can choose a path.'}
        </p>
        {ready.length + choose.length === 0 && (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-wash p-4 ring-1 ring-rule">
            <Icon name="check" size={20} className="text-leaf" strokeWidth={2.6} />
            <span className="font-bold">Nothing is waiting. New evolutions appear here as students earn XP.</span>
          </div>
        )}
        <ul className="mt-4 flex flex-col divide-y divide-rule">
          {[...ready, ...choose].map((s) => {
            const sp = getSpecies(s.speciesId);
            const to = (pendingStage(s, data) ?? s.bestStage) as Stage;
            const isChoose = !pendingStage(s, data);
            return (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="h-14 w-14 shrink-0"><CreatureSvg species={sp} stage={s.bestStage} branch={s.branch} effects={false} noShadow className="h-full w-full" /></span>
                <Icon name="arrowRight" size={20} className="shrink-0 text-gilt-deep" strokeWidth={2.4} />
                <span className="h-14 w-14 shrink-0"><CreatureSvg species={sp} stage={to} effects={false} noShadow className="h-full w-full" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-lg font-bold">{s.name}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                    <ElementIcon element={sp.element} size={12} color={ELEMENTS[sp.element].color} />
                    <span className="tabular">{fieldNo(sp.id)}</span> · {sp.name} · {isChoose ? 'Final path not chosen' : `Stage ${ROMAN[s.bestStage - 1]} → ${ROMAN[to - 1]} (${STAGE_NAMES[to]})`}
                    {needsBranchChoice(s) && !isChoose && ' · chooses a path'}
                  </div>
                </div>
                <button className="btn btn-primary shrink-0" onClick={() => { onClose(); start(s.id); }}><Icon name="sparkle" size={16} />{isChoose ? 'Choose path' : 'Evolve'}</button>
              </li>
            );
          })}
        </ul>
        {simple.length > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-gilt-pale p-3 ring-1 ring-gilt-deep/40">
            <span className="text-[15px] font-bold text-gilt-ink">Evolve {simple.length} creatures together (each plays its evolution). Creatures that choose a path wait for you.</span>
            <button className="btn btn-primary shrink-0" onClick={() => { onClose(); simple.forEach((s) => approve(s.id)); }}>Evolve all</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Notice shown when an award made a creature ready (approval mode). */
export function ReadyPopup({ student, stage, onDone }: { student: Student; stage: Stage; onDone: () => void }) {
  const start = useStore((s) => s.startEvolution);
  const locked = useStore((s) => s.locked);
  const sp = getSpecies(student.speciesId);
  useEffect(() => {
    const t = setTimeout(onDone, 6500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div className="fixed inset-x-0 top-24 z-50 flex justify-center px-4" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative flex items-center gap-4 rounded-[20px] bg-white py-3 pl-3 pr-4 text-ink shadow-[var(--shadow-lift)] ring-[3px] ring-gilt">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-wash ring-1 ring-rule">
          <Creature speciesId={sp.id} stage={student.bestStage} branch={student.branch} equipped={student.equipped} action={{ type: 'happy', key: 1 }} className="h-full w-full" sound={false} />
        </div>
        <div className="min-w-0">
          <div className="font-display text-2xl font-extrabold tracking-[-0.01em]">{firstName(student.name)}’s {sp.name} is ready to evolve!</div>
          <div className="text-[14px] font-bold text-ink-soft">Stage {ROMAN[stage - 1]}: {STAGE_NAMES[stage]} is waiting for your go.</div>
        </div>
        {!locked && <button className="btn btn-primary shrink-0" onClick={() => { onDone(); start(student.id); }}><Icon name="sparkle" size={16} />Evolve</button>}
        <button className="btn btn-ghost shrink-0" onClick={onDone}>Later</button>
      </div>
    </motion.div>
  );
}
