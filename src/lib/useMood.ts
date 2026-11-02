import { useEffect, useState } from 'react';
import { moodFor } from '../engine/mood';
import { useStore } from '../store/store';
import type { Mood, Student } from '../types';

/** Current time, refreshed every minute so moods fade naturally. */
export function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function useMood(student: Student | undefined): Mood {
  const events = useStore((s) => s.data.events);
  const pulse = useStore((s) => (student ? s.pulses[student.id] : undefined));
  const now = useMinuteClock();
  if (!student) return 'calm';
  // a fresh award re-evaluates immediately (pulse changes), otherwise once a minute
  return moodFor(student, events, Math.max(now, pulse ? Date.now() : 0));
}
