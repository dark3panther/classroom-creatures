import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { ElementType } from '../types';
import { ELEMENTS } from '../data/elements';

export type BurstKind = ElementType | 'sparkle' | 'confetti';

const CONFETTI = ['#ff5fa2', '#ffc93b', '#4fb6f0', '#34d399', '#8b5cf6', '#ff8a3d'];

export function Particle({ kind, color, size }: { kind: BurstKind; color: string; size: number }) {
  const s = size;
  switch (kind) {
    case 'fire': return <svg width={s} height={s} viewBox="0 0 20 20"><path d="M10 1 C 4 8 4 12 6 16 C 8 19 12 19 14 16 C 16 12 15 8 10 1 Z" fill={color} /><circle cx="10" cy="14" r="3" fill="#fff3b0" /></svg>;
    case 'water': return <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="2.5" /><circle cx="7" cy="7" r="2" fill="#fff" /></svg>;
    case 'nature': return <svg width={s} height={s} viewBox="0 0 20 20"><path d="M10 19 Q 2 10 10 1 Q 18 10 10 19 Z" fill={color} /><path d="M10 18 L10 3" stroke="#3f8a2c" strokeWidth="1.5" /></svg>;
    case 'electric': return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="12,1 4,11 9,11 7,19 16,8 11,8" fill={color} stroke="#c78a00" strokeWidth="1" /></svg>;
    case 'ice': return <svg width={s} height={s} viewBox="0 0 20 20" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M10 2 V18 M3 6 L17 14 M3 14 L17 6" /></svg>;
    case 'earth': return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="4,6 12,2 18,9 14,17 5,16 2,11" fill={color} stroke="#7a5a3a" strokeWidth="1.5" /></svg>;
    case 'shadow': return <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill={color} opacity=".75" /></svg>;
    case 'air': return <svg width={s} height={s} viewBox="0 0 20 20"><path d="M3 10 Q 8 3 13 8 Q 16 12 11 13" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>;
    case 'confetti': return <div style={{ width: s * 0.5, height: s, background: color, borderRadius: 3 }} />;
    default: return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="10,0 12.5,7.5 20,10 12.5,12.5 10,20 7.5,12.5 0,10 7.5,7.5" fill={color} /></svg>;
  }
}

/**
 * One-shot particle burst. Remount it (change `key`) to replay.
 * Kept to ~16 DOM nodes so it stays smooth on classroom hardware.
 */
export function Burst({ kind, count = 14, spread = 120, size = 18, duration = 1.1 }: { kind: BurstKind; count?: number; spread?: number; size?: number; duration?: number }) {
  const parts = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const r = spread * (0.55 + Math.random() * 0.6);
    const color = kind === 'confetti' ? CONFETTI[i % CONFETTI.length]
      : kind === 'sparkle' ? (i % 3 === 0 ? '#ffffff' : '#ffd23f')
      : i % 3 === 0 ? ELEMENTS[kind].glow : i % 3 === 1 ? ELEMENTS[kind].particle : ELEMENTS[kind].color;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r - (kind === 'fire' || kind === 'shadow' ? 40 : 0), rot: Math.random() * 360, color, s: size * (0.6 + Math.random() * 0.7), d: Math.random() * 0.12 };
  }), [kind, count, spread, size]);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {parts.map((p, i) => (
        <motion.div key={i} className="absolute"
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y + (kind === 'confetti' ? 60 : 0), scale: 1, opacity: 0, rotate: p.rot }}
          transition={{ duration, delay: p.d, ease: [0.15, 0.8, 0.3, 1] }}>
          <Particle kind={kind} color={p.color} size={p.s} />
        </motion.div>
      ))}
    </div>
  );
}
