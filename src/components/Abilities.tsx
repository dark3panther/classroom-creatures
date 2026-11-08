import { motion } from 'framer-motion';
import { playUnlock } from '../audio/sfx';
import { MAX_RANK, type AbilityDef } from '../data/abilities';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { getSpecies } from '../data/species';
import { abilityTree, skillPoints } from '../engine/abilities';
import { useStore } from '../store/store';
import type { ElementType, Student } from '../types';
import { Icon } from './Icon';

/** 8×8 pixel glyph per element ('a' outline/main, 'b' fill, 'c' shade, 'w' light). */
const GLYPHS: Record<ElementType, string[]> = {
  fire: ['...a....', '..aab...', '..abba..', '.abbcba.', '.abccba.', '.abccba.', '..abba..', '...aa...'],
  water: ['...a....', '...a....', '..aba...', '.abbba..', '.abwbba.', '.abbbba.', '..abba..', '...aa...'],
  nature: ['.....aa.', '...aabb.', '..abbba.', '.abbbba.', '.abbba..', '.abba...', '.a.a....', 'a.......'],
  electric: ['....aa..', '...ab...', '..ab....', '.abbbba.', '...bba..', '..ba....', '.ba.....', '.a......'],
  ice: ['...a....', '.a.a.a..', '..aaa...', 'aaawaaa.', '..aaa...', '.a.a.a..', '...a....', '........'],
  earth: ['........', '..aaaa..', '.abbbba.', 'abbcbbba', 'abbbbcba', 'abcbbbba', '.abbbba.', '..aaaa..'],
  shadow: ['..aaa...', '.aab....', 'aab.....', 'aab.....', 'aab.....', 'aabb....', '.aabbaa.', '..aaaa..'],
  light: ['...a....', '.a.a.a..', '..bbb...', 'aabwbaa.', '..bbb...', '.a.a.a..', '...a....', '........'],
  cosmic: ['...a....', '...a....', '..aba...', 'aabwbaa.', '.abbba..', '..aba...', '.aa.aa..', '.a...a..'],
  air: ['..aaaa..', '.a....a.', 'a..aa..a', 'a.a..a.a', 'a.a.a..a', 'a..a..a.', '.a....a.', '..aaaa..'],
};
const TIER_FRAME = ['#b87333', '#9aa8b8', '#e8a21e', '#c42a6e'];

/** A pixel-art ability icon: tier-coloured frame around the element glyph. Greyed when asleep. */
export function AbilityIcon({ def, element, size = 48, asleep }: { def: AbilityDef; element: ElementType; size?: number; asleep?: boolean }) {
  const el = ELEMENTS[element];
  const pal: Record<string, string> = { a: asleep ? '#7a857d' : el.color, b: asleep ? '#c9d0c4' : el.glow, c: asleep ? '#a7b0a3' : el.color, w: '#ffffff' };
  const frame = asleep ? '#9aa39b' : TIER_FRAME[def.tier - 1];
  const rects: JSX.Element[] = [];
  GLYPHS[element].forEach((row, y) => row.split('').forEach((ch, x) => { if (ch !== '.') rects.push(<rect key={`${x}-${y}`} x={x + 2} y={y + 2} width={1} height={1} fill={pal[ch]} />); }));
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      <rect x={0} y={0} width={12} height={12} fill={frame} />
      <rect x={1} y={1} width={10} height={10} fill={asleep ? '#e6ebe1' : '#16241c'} />
      {/* corner rivets show the kind: bursts get rays, shields a full rim, signature a star, ultimate a crown */}
      {def.kind === 'shield' && <rect x={1} y={1} width={10} height={10} fill="none" stroke={frame} strokeWidth={0.5} opacity={0.6} />}
      {def.kind === 'signature' && <rect x={9} y={1} width={2} height={2} fill="#fff6c4" />}
      {def.kind === 'ultimate' && <><rect x={3} y={0} width={1} height={1} fill="#fff6c4" /><rect x={6} y={0} width={1} height={1} fill="#fff6c4" /><rect x={8} y={0} width={1} height={1} fill="#fff6c4" /></>}
      {rects}
    </svg>
  );
}

/** The skill tree: four tiers on a trunk, each awakened by evolving and ranked up with skill points. */
export function AbilityTree({ student, onCast, canEdit }: { student: Student; onCast: (def: AbilityDef) => void; canEdit: boolean }) {
  const data = useStore((s) => s.data);
  const commitRaise = useStore((s) => s.raiseAbility);
  const sp = getSpecies(student.speciesId);
  const tree = abilityTree(student, data.settings);
  const pts = skillPoints(student, data.settings);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[20px] font-extrabold">Abilities</h3>
        <span className={`chip !py-1 !text-[13px] ring-1 ${pts.free ? 'bg-gilt-pale text-gilt-ink ring-gilt-deep/40' : 'bg-wash text-ink-soft ring-rule'}`}>
          <Icon name="star" size={13} strokeWidth={2.4} /> {pts.free} skill point{pts.free === 1 ? '' : 's'} to spend
        </span>
        <span className="text-[13px] text-ink-soft">One point every level. Abilities are just for fun: they play an animation and never change points.</span>
      </div>
      <ol className="relative mt-3 flex flex-col gap-2.5">
        <span className="absolute bottom-6 left-[27px] top-6 w-[3px] rounded-full bg-rule" aria-hidden />
        {tree.map((v) => {
          const asleep = v.rank === 0;
          return (
            <li key={v.def.id} className="relative flex items-start gap-3">
              <div className={`relative z-10 shrink-0 rounded-[4px] ${!asleep ? 'shadow-[0_0_0_3px_#fff,0_4px_10px_-4px_rgb(22_36_28/.5)]' : 'shadow-[0_0_0_3px_#fff]'}`}>
                <AbilityIcon def={v.def} element={sp.element} size={56} asleep={asleep} />
              </div>
              <div className={`min-w-0 flex-1 rounded-xl p-2.5 ring-1 ${asleep ? 'bg-wash ring-rule' : 'bg-white ring-rule shadow-[var(--shadow-card)]'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[17px] font-bold">{v.def.name}</span>
                  <span className="text-[12px] font-bold text-ink-soft">Tier {v.def.tier}</span>
                  <span className="ml-auto inline-flex gap-1" aria-label={`Rank ${v.rank} of ${MAX_RANK}`}>
                    {Array.from({ length: MAX_RANK }).map((_, i) => <span key={i} className={`h-2.5 w-2.5 rotate-45 ${i < v.rank ? 'bg-gilt ring-1 ring-gilt-deep' : 'bg-rule'}`} />)}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-soft">{v.def.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
                  {v.status === 'needsStage' && <span className="flex items-center gap-1 font-bold text-ink-soft"><Icon name="lock" size={13} />Awakens at Stage {v.def.stage}: {STAGE_NAMES[v.def.stage]}</span>}
                  {v.status === 'needsLevel' && <span className="font-bold text-ink-soft">Rank {v.rank + 1} at Level {v.nextLevel} ({v.nextXp} XP)</span>}
                  {v.status === 'needsPoint' && <span className="font-bold text-ink-soft">Rank {v.rank + 1} ready: needs a skill point</span>}
                  {v.status === 'max' && <span className="font-bold text-leaf">Highest rank</span>}
                  {canEdit && (v.status === 'unlock' || v.status === 'upgrade') && (
                    <motion.button className="btn btn-primary !py-1.5 !text-[13px]" whileTap={{ scale: 0.95 }}
                      onClick={() => { if (commitRaise(student.id, v.def.id) && data.settings.soundEnabled) playUnlock(); }}>
                      <Icon name="star" size={14} strokeWidth={2.4} />{v.status === 'unlock' ? 'Awaken' : `Rank up to ${v.rank + 1}`} · 1 point
                    </motion.button>
                  )}
                  {!asleep && <button className="btn btn-light ml-auto !py-1.5 !text-[13px]" onClick={() => onCast(v.def)}><Icon name="sparkle" size={14} />Use</button>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

