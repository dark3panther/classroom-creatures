import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import type { Category } from '../types';

/** Big, colourful behaviour buttons: one tap = award. */
export function AwardGrid({ onPick, compact, dark }: { onPick: (c: Category) => void; compact?: boolean; dark?: boolean }) {
  const categories = useStore((s) => s.data.categories);
  const negative = useStore((s) => s.data.settings.negativeEnabled);
  const list = categories.filter((c) => c.xp > 0 || negative);
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-[repeat(auto-fill,minmax(130px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]'}`}>
      {list.map((c) => (
        <motion.button key={c.id} type="button" onClick={() => onPick(c)} whileTap={{ scale: 0.94 }} whileHover={{ y: -2 }}
          className={`flex items-center gap-2 rounded-2xl px-3 text-left font-bold text-white shadow-[0_4px_0_rgb(0_0_0/.2)] ${compact ? 'py-2' : 'py-3'} ${c.xp < 0 ? 'opacity-90' : ''}`}
          style={{ background: c.xp < 0 ? '#64748b' : `linear-gradient(160deg, ${c.color}, ${c.color}cc)` }}
          aria-label={`${c.name}, ${c.xp > 0 ? '+' : ''}${c.xp} XP`}>
          <span className={`grid shrink-0 place-items-center rounded-xl bg-white/25 ${compact ? 'h-8 w-8 text-lg' : 'h-10 w-10 text-2xl'}`} aria-hidden>{c.icon}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className={`block truncate ${compact ? 'text-sm' : 'text-[15px]'}`}>{c.name}</span>
            <span className={`text-xs ${dark ? 'text-white/90' : 'text-white/85'}`}>{c.xp > 0 ? '+' : ''}{c.xp} XP</span>
          </span>
        </motion.button>
      ))}
    </div>
  );
}
