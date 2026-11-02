import type { AwardEvent, Mood, Student } from '../types';

const MIN = 60_000;
export const MOOD_WINDOW = 20 * MIN;

export const MOODS: Record<Mood, { label: string; icon: string; color: string }> = {
  excited: { label: 'Excited', icon: '🤩', color: '#ff8a3d' },
  happy: { label: 'Happy', icon: '😊', color: '#24b47e' },
  proud: { label: 'Proud', icon: '😎', color: '#8b5cf6' },
  calm: { label: 'Calm', icon: '🙂', color: '#4f8cff' },
  sad: { label: 'Sad', icon: '😢', color: '#64748b' },
  sleepy: { label: 'Sleepy', icon: '😴', color: '#94a3b8' },
};

/**
 * How a creature feels, from the student's recent events.
 * - a deduction in the last 20 min → sad (until a positive award cheers it up)
 * - 3+ positive awards in the last 20 min → excited
 * - a positive award in the last 20 min → happy
 * - a milestone or evolution today → proud
 * - nothing for 3 school days → sleepy, otherwise calm
 */
export function moodFor(s: Pick<Student, 'id' | 'milestoneRewards' | 'createdAt'>, events: AwardEvent[], now = Date.now()): Mood {
  let lastAny = 0;
  let lastGood = 0;
  let lastBad = 0;
  let recentGood = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.studentId !== s.id || e.undone) continue;
    if (!lastAny) lastAny = e.at;
    if (e.xp > 0) { if (!lastGood) lastGood = e.at; if (now - e.at < MOOD_WINDOW) recentGood++; }
    if (e.categoryId.startsWith('neg-') || e.xp < 0 || (e.xp === 0 && e.tag === 'other')) { if (!lastBad) lastBad = e.at; }
    if (now - e.at > MOOD_WINDOW && lastAny) break;
  }
  if (lastBad && now - lastBad < MOOD_WINDOW && lastBad >= lastGood) return 'sad';
  if (recentGood >= 3) return 'excited';
  if (lastGood && now - lastGood < MOOD_WINDOW) return 'happy';
  if ((s.milestoneRewards ?? []).some((r) => now - r.at < 8 * 60 * MIN)) return 'proud';
  const quietSince = lastAny || s.createdAt;
  if (now - quietSince > 3 * 24 * 60 * MIN) return 'sleepy';
  return 'calm';
}
