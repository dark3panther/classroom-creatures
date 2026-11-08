import type { CreatureSound } from '../types';

/**
 * All sounds are synthesised with the Web Audio API: original, tiny, and they work offline.
 * Every function is a no-op when sound is disabled or audio is unavailable.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.8;
let clicks = false;

export function setSoundEnabled(v: boolean) { enabled = v; }
/** 0..1 master volume (applied to every sound). */
export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}
/** soft clicks on buttons (teacher setting, off by default) */
export function setUiSounds(v: boolean) { clicks = v; }

function ac(): AudioContext | null {
  if (!enabled || volume <= 0) return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
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
  o.connect(g).connect(master ?? a.destination);
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

/** Rising shimmer while the creature glows: a heartbeat that speeds up under a climbing sparkle. */
export function playEvolutionCharge(duration = 2.2) {
  tone(220, 0, duration, 'sawtooth', 0.035, 880);
  tone(330, 0.2, duration - 0.2, 'triangle', 0.055, 1320);
  // heartbeat thumps, closer together as the light gathers
  let t = 0;
  for (let i = 0; i < 9 && t < duration - 0.2; i++) { tone(70, t, 0.16, 'sine', 0.22, 45); tone(95, t + 0.12, 0.12, 'sine', 0.12, 60); t += 0.5 - i * 0.045; }
  for (let i = 0; i < 12; i++) tone(semi(880, [0, 4, 7, 12, 16, 19][i % 6] + (i >= 6 ? 12 : 0)), 0.25 + i * (duration / 13), 0.1, 'sine', 0.045);
}

/** Triumphant reveal: a low boom, a bright chord, then a bell sparkle that rings out. */
export function playEvolutionReveal() {
  tone(110, 0, 0.6, 'sine', 0.25, 55);
  const chord = [0, 4, 7, 12];
  chord.forEach((n) => tone(semi(392, n), 0.02, 1.4, 'triangle', 0.1));
  [12, 16, 19, 24].forEach((n, i) => tone(semi(392, n), 0.15 + i * 0.1, 0.5, 'square', 0.035));
  [24, 28, 31, 36, 31, 36].forEach((n, i) => tone(semi(392, n), 0.6 + i * 0.09, 0.9, 'sine', 0.06));
}

/** Coins changing hands in the shop. */
export function playPurchase() {
  [0, 7, 12].forEach((n, i) => tone(semi(988, n), i * 0.06, 0.16, 'square', 0.04));
  tone(semi(988, 19), 0.2, 0.35, 'triangle', 0.1);
}

/** Putting an item on (or taking it off: pitch goes down). */
export function playEquip(on = true) {
  tone(on ? 523 : 659, 0, 0.09, 'triangle', 0.12, on ? 784 : 440);
  tone(on ? 1047 : 523, 0.07, 0.12, 'sine', 0.06);
}

/** An item or ability unlocked: a short sparkle run. */
export function playUnlock() {
  [0, 4, 7, 11, 14].forEach((n, i) => tone(semi(784, n), i * 0.05, 0.22, 'sine', 0.08));
}

/** Munching, for feeding a snack. */
export function playFeed() {
  for (let i = 0; i < 3; i++) tone(180 + i * 25, i * 0.13, 0.07, 'square', 0.05, 120);
  tone(880, 0.45, 0.18, 'triangle', 0.08, 1175);
}

/** A bouncy toy. */
export function playToy() {
  [0, 0.16, 0.3].forEach((t, i) => tone(440 - i * 40, t, 0.12, 'triangle', 0.1, 880 - i * 80));
}

/** An ability cast, coloured by element. */
export function playAbility(element: string) {
  const base: Record<string, number> = { fire: 330, water: 392, nature: 349, electric: 494, ice: 587, earth: 196, shadow: 233, light: 523, cosmic: 440, air: 466 };
  const b = base[element] ?? 392;
  tone(b, 0, 0.5, element === 'electric' ? 'square' : element === 'earth' ? 'sawtooth' : 'triangle', 0.08, b * (element === 'shadow' ? 0.5 : 2));
  [0, 7, 12].forEach((n, i) => tone(semi(b * 2, n), 0.18 + i * 0.07, 0.25, 'sine', 0.06));
}

/** Soft button click (only when the teacher turned interface sounds on). */
export function playClick() {
  if (!clicks) return;
  tone(1400, 0, 0.03, 'sine', 0.035, 900);
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
