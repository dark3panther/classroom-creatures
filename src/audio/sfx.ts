import type { CreatureSound } from '../types';

/**
 * All sounds are synthesised with the Web Audio API: original, tiny, and they work offline.
 * Every function is a no-op when sound is disabled or audio is unavailable.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) { enabled = v; }

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const semi = (base: number, n: number) => base * Math.pow(2, n / 12);

/** Bright two-note chime for an XP award. */
export function playAward(xp = 3) {
  const base = xp >= 5 ? 784 : 659;
  tone(base, 0, 0.18, 'triangle', 0.16);
  tone(semi(base, 7), 0.07, 0.26, 'triangle', 0.14);
  tone(semi(base, 19), 0.07, 0.2, 'sine', 0.05);
}

export function playMultiAward() {
  [0, 4, 7, 12].forEach((n, i) => tone(semi(659, n), i * 0.05, 0.25, 'triangle', 0.12));
}

export function playLevelUp() {
  [0, 4, 7, 12, 16].forEach((n, i) => tone(semi(523, n), i * 0.08, 0.3, 'square', 0.06));
  [0, 4, 7, 12, 16].forEach((n, i) => tone(semi(523, n), i * 0.08, 0.35, 'triangle', 0.12));
}

export function playAchievement() {
  [12, 7, 12, 19].forEach((n, i) => tone(semi(523, n), i * 0.09, 0.28, 'triangle', 0.13));
}

/** Rising shimmer while the creature glows. */
export function playEvolutionCharge(duration = 2.2) {
  tone(220, 0, duration, 'sawtooth', 0.04, 880);
  tone(330, 0.2, duration - 0.2, 'triangle', 0.06, 1320);
  for (let i = 0; i < 10; i++) tone(semi(880, (i * 5) % 24), 0.2 + i * (duration / 11), 0.12, 'sine', 0.05);
}

/** Triumphant fanfare on the reveal. */
export function playEvolutionReveal() {
  const chord = [0, 4, 7, 12];
  chord.forEach((n) => tone(semi(392, n), 0, 1.2, 'triangle', 0.1));
  [12, 16, 19, 24].forEach((n, i) => tone(semi(392, n), 0.15 + i * 0.1, 0.5, 'square', 0.04));
  tone(semi(392, 24), 0.6, 1.0, 'sine', 0.1);
}

export function playClassCelebration() {
  [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) => tone(semi(523, n), i * 0.09, 0.3, 'triangle', 0.12));
}

/** A creature's own little voice. */
export function playCreature(s: CreatureSound, excited = false) {
  const speed = excited ? 0.07 : 0.1;
  s.notes.forEach((n, i) => {
    const f = semi(s.base, n);
    tone(f, i * speed, speed * 1.6, s.wave, s.wave === 'square' || s.wave === 'sawtooth' ? 0.05 : 0.14, f * (i % 2 ? 0.94 : 1.06));
  });
}

export function playTick(i = 0) {
  tone(900 + (i % 3) * 120, 0, 0.05, 'square', 0.04);
}

export function playPop() {
  tone(500, 0, 0.12, 'sine', 0.15, 900);
}

/** Cartoon "bonk": a hollow knock, a wobbly boing and a little sad slide. Silly, not scary. */
export function playBonk() {
  tone(180, 0, 0.09, 'square', 0.12, 90);
  tone(620, 0.01, 0.06, 'triangle', 0.1, 300);
  tone(300, 0.08, 0.35, 'sine', 0.12, 140);
  tone(392, 0.45, 0.22, 'triangle', 0.06, 330);
  tone(330, 0.62, 0.3, 'triangle', 0.06, 262);
}

export function playCoin() {
  tone(988, 0, 0.08, 'square', 0.04);
  tone(1319, 0.07, 0.22, 'square', 0.04);
}

export function playMilestone() {
  [0, 7, 12, 16, 19, 24].forEach((n, i) => tone(semi(523, n), i * 0.07, 0.3, 'triangle', 0.12));
  tone(semi(523, 24), 0.45, 0.6, 'sine', 0.08);
}

export function playPrizeWin() {
  [0, 4, 7, 12].forEach((n) => tone(semi(523, n), 0, 0.9, 'triangle', 0.08));
  [12, 16, 19, 24, 28].forEach((n, i) => tone(semi(523, n), 0.12 + i * 0.09, 0.4, 'square', 0.035));
}

export function playPet() {
  tone(880, 0, 0.12, 'sine', 0.08, 1175);
}

/** The right sound for an award: a bonk for deductions, chime + coin clink otherwise. */
export function awardSound(xp: number, count = 1) {
  if (xp < 0) { playBonk(); return; }
  if (count > 1) playMultiAward(); else playAward(xp);
  setTimeout(playCoin, 260);
}
