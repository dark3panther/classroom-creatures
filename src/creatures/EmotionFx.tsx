import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { ELEMENTS } from '../data/elements';
import type { ElementType, Mood } from '../types';
import { Particle } from './Burst';

/** Visible feelings drawn around a creature (works for illustrated and vector art). */
export function EmotionFx({ mood, compact }: { mood: Mood; compact?: boolean }) {
  switch (mood) {
    case 'sad':
      return (
        <div className="pointer-events-none absolute inset-x-0 top-[2%] flex justify-center" aria-hidden>
          <div className="relative" style={{ width: compact ? '40%' : '34%' }}>
            <svg viewBox="0 0 100 60" className="w-full drop-shadow">
              <path d="M18 44 a14 14 0 0 1 4-27 a20 20 0 0 1 37-6 a15 15 0 0 1 25 12 a12 12 0 0 1-2 21 Z" fill="#9aa8bd" stroke="#5b6680" strokeWidth="3" />
              <path d="M30 30 q4-4 8 0 M58 30 q4-4 8 0" stroke="#5b6680" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
            {[18, 42, 66].map((x, i) => (
              <span key={x} className="cc-drop absolute top-[70%] block h-3 w-2 rounded-b-full rounded-t-[40%] bg-sky" style={{ left: `${x}%`, animationDelay: `${i * 0.35}s` }} />
            ))}
          </div>
        </div>
      );
    case 'happy':
      return (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[22, 70, 48].map((x, i) => (
            <span key={x} className="cc-heart absolute bottom-[45%] text-xl" style={{ left: `${x}%`, animationDelay: `${i * 1.1}s`, fontSize: compact ? 14 : 22 }}>💖</span>
          ))}
        </div>
      );
    case 'excited':
      return (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[[12, 20], [80, 14], [86, 52], [8, 60], [50, 4]].map(([x, y], i) => (
            <span key={i} className="cc-twinkle absolute" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.25}s` }}>
              <Particle kind="sparkle" color={i % 2 ? '#ffd23f' : '#ffffff'} size={compact ? 12 : 20} />
            </span>
          ))}
        </div>
      );
    case 'sleepy':
      return (
        <div className="pointer-events-none absolute right-[14%] top-[6%] font-display font-bold text-white" aria-hidden style={{ textShadow: '0 2px 0 #1d5643' }}>
          {['z', 'Z', 'Z'].map((z, i) => (
            <span key={i} className="cc-zzz absolute" style={{ animationDelay: `${i * 0.8}s`, fontSize: (compact ? 12 : 18) + i * 5 }}>{z}</span>
          ))}
        </div>
      );
    case 'proud':
      return (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center" aria-hidden>
          <span className="cc-twinkle" style={{ fontSize: compact ? 16 : 26 }}>👑</span>
        </div>
      );
    default:
      return null;
  }
}

/** Gentle element particles drifting around a creature (embers, bubbles, leaves…). */
export function ElementAmbient({ element, count = 6 }: { element: ElementType; count?: number }) {
  const el = ELEMENTS[element];
  const parts = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: 8 + ((i * 37) % 84), y: 30 + ((i * 53) % 60), d: (i * 0.7) % 4, s: 10 + ((i * 7) % 9),
    c: i % 3 === 0 ? el.glow : i % 3 === 1 ? el.particle : el.color,
  })), [count, el]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {parts.map((p, i) => (
        <span key={i} className={`cc-ambient-${element === 'fire' || element === 'shadow' || element === 'light' ? 'rise' : element === 'nature' || element === 'ice' ? 'fall' : 'float'} absolute`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${-p.d}s`, opacity: 0.85 }}>
          <Particle kind={element} color={p.c} size={p.s} />
        </span>
      ))}
    </div>
  );
}

/** Comic "BONK!" with dizzy stars, shown when a behaviour deduction is given. */
export function BonkFx() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <motion.div className="absolute left-1/2 top-[8%] -translate-x-1/2 font-display text-3xl font-bold text-white"
        style={{ WebkitTextStroke: '2px #8a2f1e', textShadow: '0 3px 0 #8a2f1e' }}
        initial={{ scale: 0, rotate: -20 }} animate={{ scale: [0, 1.4, 1], rotate: [-20, 8, -4] }} transition={{ duration: 0.45 }}>
        BONK!
      </motion.div>
      <motion.div className="absolute left-1/2 top-[24%] h-0 w-0" animate={{ rotate: 360 }} transition={{ repeat: 3, duration: 0.8, ease: 'linear' }}>
        {[0, 120, 240].map((a) => (
          <span key={a} className="absolute text-lg" style={{ transform: `rotate(${a}deg) translateX(34px) rotate(-${a}deg)` }}>⭐</span>
        ))}
      </motion.div>
    </div>
  );
}
