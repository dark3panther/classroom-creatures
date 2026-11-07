import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import type { Category } from '../types';

/** Big behaviour buttons: one tap = award. The teacher's own colour tints each one; the label stays ink so it reads from the back. */
export function AwardGrid({ onPick, compact }: { onPick: (c: Category) => void; compact?: boolean; dark?: boolean }) {
  const categories = useStore((s) => s.data.categories);
  const negative = useStore((s) => s.data.settings.negativeEnabled);
  const list = categories.filter((c) => c.xp > 0 || negative);
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(168px,1fr))]'}`}>
      {list.map((c) => {
        const bad = c.xp < 0;
        return (
          <motion.button key={c.id} type="button" onClick={() => onPick(c)} whileTap={{ scale: 0.96 }} whileHover={{ y: -2 }}
            className={`flex items-center gap-2.5 rounded-xl bg-white px-2.5 text-left text-ink shadow-[var(--shadow-card)] ring-1 transition-shadow hover:shadow-[var(--shadow-lift)] ${compact ? 'py-2' : 'py-2.5'} ${bad ? 'ring-brick/30' : 'ring-rule'}`}
            aria-label={`${c.name}, ${c.xp > 0 ? '+' : ''}${c.xp} XP`}>
            <span className={`grid shrink-0 place-items-center rounded-lg ${compact ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-2xl'}`}
              style={{ background: bad ? 'var(--color-brick-pale)' : `color-mix(in srgb, ${c.color} 22%, white)`, boxShadow: `inset 0 0 0 1.5px ${bad ? 'rgb(184 67 45 / .3)' : `color-mix(in srgb, ${c.color} 55%, white)`}` }} aria-hidden>{c.icon}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className={`line-clamp-2 block font-bold ${compact ? 'text-[14px]' : 'text-[15px]'}`}>{c.name}</span>
              <span className={`text-[13px] font-bold tabular ${bad ? 'text-brick' : 'text-leaf'}`}>{c.xp > 0 ? '+' : ''}{c.xp} XP</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
