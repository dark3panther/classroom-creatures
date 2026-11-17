import { useEffect, useRef } from 'react';
import { countTo } from '../lib/motion';

/**
 * A number that rolls to its new value when it changes (anime.js). With `fromZero` it also counts up
 * from 0 the first time it appears, for the big numbers on profiles and Present.
 */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString(), fromZero = false, className }: {
  value: number; format?: (n: number) => string; fromZero?: boolean; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(fromZero ? 0 : value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = countTo(el, prev.current, value, format);
    prev.current = value;
    return () => { a?.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} className={className}>{format(fromZero ? 0 : value)}</span>;
}
