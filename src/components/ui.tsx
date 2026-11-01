import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { ELEMENTS, RARITIES, STAGE_NAMES } from '../data/elements';
import type { ElementType, Rarity, Stage } from '../types';

export function Modal({ open, onClose, children, wide, label, tone = 'paper' }: {
  open: boolean; onClose: () => void; children: ReactNode; wide?: boolean | 'xl'; label: string; tone?: 'paper' | 'night';
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  const width = wide === 'xl' ? 'max-w-6xl' : wide ? 'max-w-3xl' : 'max-w-lg';
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-night-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal aria-label={label}
            className={`relative w-full ${width} max-h-[94vh] overflow-y-auto scroll-thin ${tone === 'paper' ? 'paper on-paper' : 'panel bg-night-800'} rounded-b-none sm:rounded-b-[1.5rem]`}
            initial={{ y: 40, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/5 text-xl font-bold text-ink hover:bg-black/10">×</button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ProgressBar({ pct, color = '#ffc93b', height = 12, className = '', track = 'rgb(43 33 64 / .12)', glow }: {
  pct: number; color?: string; height?: number; className?: string; track?: string; glow?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-full ${className}`} style={{ height, background: track }}>
      <motion.div className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)`, boxShadow: glow ? `0 0 12px ${color}` : undefined }}
        initial={false} animate={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
        <div className="absolute inset-x-1 top-[2px] h-[35%] rounded-full bg-white/45" />
      </motion.div>
    </div>
  );
}

export function ElementBadge({ element, small }: { element: ElementType; small?: boolean }) {
  const el = ELEMENTS[element];
  return (
    <span className={`chip ${small ? '!text-[10px] !px-2 !py-0' : ''}`} style={{ background: el.color, color: '#fff' }}>
      <ElementIcon element={element} size={small ? 10 : 12} />{el.name}
    </span>
  );
}

export function ElementIcon({ element, size = 14, color = '#fff' }: { element: ElementType; size?: number; color?: string }) {
  const p: Record<ElementType, ReactNode> = {
    fire: <path d="M8 1 C3 7 3 10 5 13 C6.5 15 9.5 15 11 13 C13 10 12 6 8 1 Z" fill={color} />,
    water: <path d="M8 1 C 10 5 13 7.5 13 10.5 A 5 5 0 0 1 3 10.5 C 3 7.5 6 5 8 1 Z" fill={color} />,
    nature: <path d="M8 15 Q1 8 8 1 Q15 8 8 15 Z" fill={color} />,
    electric: <polygon points="9,1 3,9 7.5,9 6,15 13,6.5 8.5,6.5" fill={color} />,
    ice: <path d="M8 1 V15 M2 4.5 L14 11.5 M2 11.5 L14 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" />,
    earth: <polygon points="3,6 9,2 14,7 12,14 4,13 1.5,9" fill={color} />,
    shadow: <path d="M10 1.5 A 6.5 6.5 0 1 0 14.5 11 A 5 5 0 1 1 10 1.5 Z" fill={color} />,
    light: <g fill={color}><circle cx="8" cy="8" r="3.5" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="7.3" y="0.5" width="1.4" height="3" transform={`rotate(${a} 8 8)`} />)}</g>,
    cosmic: <polygon points="8,0.5 9.8,6.2 15.5,6.2 10.9,9.7 12.6,15.3 8,11.9 3.4,15.3 5.1,9.7 0.5,6.2 6.2,6.2" fill={color} />,
    air: <path d="M1.5 6 H10 A2.5 2.5 0 1 0 7.5 3.5 M1.5 10 H12.5 A2.5 2.5 0 1 1 10 12.5" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />,
  };
  return <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>{p[element]}</svg>;
}

export function RarityStars({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  const r = RARITIES[rarity];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={r.name}>
      <span className="flex">{Array.from({ length: r.stars }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 16 16"><polygon points="8,0.5 9.8,6.2 15.5,6.2 10.9,9.7 12.6,15.3 8,11.9 3.4,15.3 5.1,9.7 0.5,6.2 6.2,6.2" fill={r.color} /></svg>
      ))}</span>
      <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: r.color }}>{r.name}</span>
    </span>
  );
}

export function StagePips({ stage, dark }: { stage: Stage; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${STAGE_NAMES[stage]} (stage ${stage} of 5)`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-2 w-2 rounded-full" style={{ background: i <= stage ? (i === 5 ? '#ffc93b' : dark ? '#8b5cf6' : '#fff') : dark ? 'rgb(43 33 64 / .15)' : 'rgb(255 255 255 / .3)' }} />
      ))}
    </span>
  );
}

export function LevelBadge({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-14 w-14 text-2xl' : size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-lg';
  return (
    <div className={`relative grid ${s} shrink-0 place-items-center font-display font-bold text-[#3a2400]`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full drop-shadow"><path d="M20 1 L36 10 L36 30 L20 39 L4 30 L4 10 Z" fill="url(#lvlg)" stroke="#c98400" strokeWidth="2.5" /><defs><linearGradient id="lvlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe48a" /><stop offset="1" stopColor="#ffb81f" /></linearGradient></defs></svg>
      <span className="relative leading-none">{level}</span>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold tracking-wide">{children}</h2>
      {action}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-mint' : 'bg-ink/20'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );
}
