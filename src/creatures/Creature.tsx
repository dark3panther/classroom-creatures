import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { playCreature, playPop } from '../audio/sfx';
import { getSpecies } from '../data/species';
import type { Equipped, Expression, Stage } from '../types';
import { Burst, type BurstKind } from './Burst';
import { CreatureSvg } from './CreatureSvg';

export type CreatureAction = 'jump' | 'wave' | 'ability' | 'happy' | 'celebrate';

export interface CreatureProps {
  speciesId: string;
  stage: Stage;
  equipped?: Equipped;
  /** change this number to make the creature celebrate (e.g. after an XP award) */
  celebrateKey?: number;
  /** click to make the creature jump / wave / use ability / spin / sing */
  interactive?: boolean;
  /** externally triggered action (key must change to replay) */
  action?: { type: CreatureAction; key: number } | null;
  effects?: boolean;
  className?: string;
  sound?: boolean;
}

const CYCLE: CreatureAction[] = ['jump', 'wave', 'ability', 'happy'];

/** The animated creature: idle loop + reactions + particle bursts. */
export function Creature({ speciesId, stage, equipped, celebrateKey, interactive, action, effects = true, className = '', sound = true }: CreatureProps) {
  const sp = getSpecies(speciesId);
  const controls = useAnimationControls();
  const [expr, setExpr] = useState<Expression>('happy');
  const [burst, setBurst] = useState<{ kind: BurstKind; key: number } | null>(null);
  const [current, setCurrent] = useState<CreatureAction | null>(null);
  const cycle = useRef(0);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const run = async (a: CreatureAction) => {
    setCurrent(a);
    clearTimeout(timer.current);
    setExpr(a === 'ability' ? 'wow' : 'excited');
    if (a === 'ability') setBurst({ kind: sp.element, key: Date.now() });
    if (a === 'celebrate') setBurst({ kind: 'sparkle', key: Date.now() });
    switch (a) {
      case 'jump':
      case 'celebrate':
        await controls.start({ y: [0, 6, -60, 0, -18, 0], scaleX: [1, 1.12, 0.92, 1.1, 0.96, 1], scaleY: [1, 0.86, 1.1, 0.9, 1.04, 1], transition: { duration: 0.85, ease: 'easeOut' } });
        break;
      case 'happy':
        await controls.start({ rotate: [0, -12, 372, 360], y: [0, -20, -20, 0], transition: { duration: 0.9, ease: 'easeInOut' } });
        controls.set({ rotate: 0 });
        break;
      case 'ability':
        await controls.start({ scale: [1, 1.15, 0.95, 1.05, 1], transition: { duration: 0.8 } });
        break;
      case 'wave':
        await controls.start({ rotate: [0, -4, 4, -4, 0], transition: { duration: 1.6 } });
        break;
    }
    timer.current = setTimeout(() => { setExpr('happy'); setCurrent(null); }, a === 'wave' ? 300 : 500);
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (celebrateKey !== undefined) void run('celebrate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateKey]);

  useEffect(() => {
    if (action) void run(action.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.key]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = () => {
    if (!interactive) return;
    const a = CYCLE[cycle.current++ % CYCLE.length];
    if (sound) {
      if (a === 'ability') playPop();
      playCreature(sp.sound, a !== 'wave');
    }
    void run(a);
  };

  const idle = effects ? `idle-${sp.idle}` : '';
  return (
    <div className={`relative select-none ${className}`} data-action={current ?? undefined}>
      <div className={`h-full w-full ${idle}`}>
        <motion.div animate={controls} className="h-full w-full origin-bottom" style={{ transformOrigin: '50% 90%' }}>
          {interactive ? (
            <button type="button" onClick={onClick} className="block h-full w-full rounded-full" aria-label={`Play with ${sp.name}`}>
              <CreatureSvg species={sp} stage={stage} equipped={equipped} expression={expr} effects={effects} className="h-full w-full" />
            </button>
          ) : (
            <CreatureSvg species={sp} stage={stage} equipped={equipped} expression={expr} effects={effects} className="h-full w-full" />
          )}
        </motion.div>
      </div>
      {burst && <Burst key={burst.key} kind={burst.kind} count={burst.kind === 'sparkle' ? 12 : 16} />}
    </div>
  );
}
