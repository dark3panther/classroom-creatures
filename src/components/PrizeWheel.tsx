import { motion, useAnimationControls } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { playPrizeWin, playTick } from '../audio/sfx';
import { Burst } from '../creatures/Burst';
import { useStore } from '../store/store';
import { Icon } from './Icon';
import type { Prize } from '../types';

/**
 * The class prize wheel. Shown when the class reaches its XP goal: spin it, land on a prize
 * (funny video, gaming class, movie class, chocolate for everyone…), and the next goal is set.
 */
export function PrizeWheel({ classId, onClose }: { classId: string; onClose: () => void }) {
  const prizes = useStore((s) => s.data.settings.prizes);
  const cls = useStore((s) => s.data.classes.find((c) => c.id === classId));
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const recordPrize = useStore((s) => s.recordPrize);
  const controls = useAnimationControls();
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'won'>('ready');
  const [won, setWon] = useState<Prize | null>(null);
  const rotation = useRef(0);
  const n = Math.max(prizes.length, 1);
  const seg = 360 / n;

  const slices = useMemo(() => prizes.map((p, i) => {
    const a0 = (i * seg - 90) * (Math.PI / 180);
    const a1 = ((i + 1) * seg - 90) * (Math.PI / 180);
    const large = seg > 180 ? 1 : 0;
    const path = `M 150 150 L ${150 + 140 * Math.cos(a0)} ${150 + 140 * Math.sin(a0)} A 140 140 0 ${large} 1 ${150 + 140 * Math.cos(a1)} ${150 + 140 * Math.sin(a1)} Z`;
    const mid = (i + 0.5) * seg;
    return { p, path, mid };
  }), [prizes, seg]);

  const spin = async () => {
    if (phase !== 'ready' || !prizes.length) return;
    setPhase('spinning');
    const idx = Math.floor(Math.random() * prizes.length);
    const target = rotation.current + 360 * 6 + (360 - ((idx + 0.5) * seg) - (rotation.current % 360)) + (Math.random() - 0.5) * seg * 0.6;
    rotation.current = target;
    if (sound) {
      // ticks that slow down with the wheel
      let t = 0;
      for (let k = 0; k < 40; k++) { t += 40 + k * k * 1.6; setTimeout(() => playTick(k), t); }
    }
    await controls.start({ rotate: target, transition: { duration: 5.2, ease: [0.12, 0.7, 0.18, 1] } });
    setWon(prizes[idx]);
    setPhase('won');
    if (sound) playPrizeWin();
  };

  const accept = () => {
    if (won) recordPrize(classId, won.id);
    onClose();
  };

  return (
    <motion.div className="on-cloth fixed inset-0 z-[55] flex flex-col items-center justify-center overflow-hidden px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Class prize wheel">
      <div className="cloth-deep absolute inset-0" />
      <div className="relative text-center">
        <h2 className="gilt-text font-display text-5xl font-extrabold tracking-[-0.02em] sm:text-6xl">Spin the prize wheel!</h2>
        <p className="mt-1 text-xl font-bold text-white">Class goal reached{cls ? ` · ${cls.goal.toLocaleString()} XP` : ''}</p>
      </div>
      <div className="relative mt-6 h-[min(62vh,520px)] w-[min(62vh,520px)]">
        {/* pointer */}
        <svg viewBox="0 0 40 50" className="absolute left-1/2 top-[-18px] z-10 h-14 w-12 -translate-x-1/2 drop-shadow-lg"><path d="M20 48 L4 10 A18 18 0 1 1 36 10 Z" fill="#f4b631" stroke="#3b2800" strokeWidth="3" /><circle cx="20" cy="16" r="6" fill="#fff" /></svg>
        <motion.div animate={controls} className="h-full w-full" style={{ rotate: rotation.current }}>
          <svg viewBox="0 0 300 300" className="h-full w-full drop-shadow-[0_10px_40px_rgba(0,0,0,.5)]">
            <circle cx="150" cy="150" r="148" fill="#ffffff" stroke="#0d2e23" strokeWidth="4" />
            {slices.map(({ p, path, mid }) => (
              <g key={p.id}>
                <path d={path} fill={p.color} stroke="#ffffff" strokeWidth="3" />
                <g transform={`rotate(${mid} 150 150)`}>
                  <text x="150" y="52" textAnchor="middle" fontSize="28">{p.icon}</text>
                  {wrap(p.label).map((line, li, arr) => (
                    <text key={li} x="150" y={78 + li * 12 - (arr.length - 1) * 4} textAnchor="middle" fontSize={arr.length > 1 ? 10 : 11} fontWeight="800" fill="#fff" style={{ fontFamily: 'var(--font-display)' }}>{line}</text>
                  ))}
                </g>
              </g>
            ))}
            {Array.from({ length: n * 2 }).map((_, i) => {
              const a = (i * (seg / 2) - 90) * (Math.PI / 180);
              return <circle key={i} cx={150 + 142 * Math.cos(a)} cy={150 + 142 * Math.sin(a)} r="3.5" fill="#f4b631" stroke="#3b2800" strokeWidth="1" />;
            })}
            <circle cx="150" cy="150" r="26" fill="#1d5643" stroke="#ffffff" strokeWidth="4" />
            <path d="M150 136l4.2 8.6 9.4 1.3-6.8 6.6 1.6 9.4-8.4-4.5-8.4 4.5 1.6-9.4-6.8-6.6 9.4-1.3z" fill="#f4b631" />
          </svg>
        </motion.div>
        {phase === 'won' && <Burst kind="confetti" count={40} spread={340} size={18} duration={2.2} />}
      </div>
      <div className="relative mt-6 min-h-[110px] text-center">
        {phase === 'won' && won ? (
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
            <div className="font-display text-5xl font-extrabold tracking-[-0.02em] text-white sm:text-6xl">{won.icon} {won.label}!</div>
            <button className="btn btn-primary mt-4 px-10 text-xl" onClick={accept} autoFocus>Hooray! Set the next goal</button>
          </motion.div>
        ) : (
          <div className="flex justify-center gap-3">
            <button className="btn btn-primary px-12 py-4 text-2xl" onClick={spin} disabled={phase !== 'ready'} autoFocus>{phase === 'spinning' ? 'Spinning…' : <><Icon name="wheel" size={26} />Spin!</>}</button>
            {phase === 'ready' && <button className="btn btn-ghost px-6 text-lg" onClick={onClose}>Later</button>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Split a prize label into at most two short lines for the wheel. */
function wrap(label: string): string[] {
  if (label.length <= 14) return [label];
  const words = label.split(' ');
  let a = '';
  while (words.length && (a + ' ' + words[0]).trim().length <= 14) a = (a + ' ' + words.shift()).trim();
  const b = words.join(' ');
  return [a || label.slice(0, 14), b.length > 16 ? b.slice(0, 15) + '…' : b].filter(Boolean);
}
