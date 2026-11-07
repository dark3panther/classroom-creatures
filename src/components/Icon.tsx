import type { ReactNode } from 'react';

/**
 * The app's drawn icon set: one 24px grid, 2px rounded strokes, so every control speaks the same hand.
 * Emoji stay only where they are the teacher's own content (behaviour, prize and badge icons).
 */
const PATHS: Record<string, ReactNode> = {
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" /></>,
  select: <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M8 12.5l2.8 2.8L16.5 9" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  wheel: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" /><circle cx="12" cy="12" r="2" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  upload: <><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" /></>,
  download: <><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" /><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" /></>,
  present: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 21h8M12 16v5" /></>,
  lock: <><rect x="4.5" y="11" width="15" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><circle cx="9" cy="15" r="1.2" fill="currentColor" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  jump: <><path d="M12 20V8M6.5 13.5L12 8l5.5 5.5" /><path d="M5 4h14" /></>,
  wave: <><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12" /><path d="M11 11V5a1.5 1.5 0 0 1 3 0v6" /><path d="M14 11V6.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3.7 16a1.6 1.6 0 0 1 2.4-2l1.9 1.6" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  crown: <><path d="M4 18h16M5 18l-1.5-10 5 4L12 5l3.5 7 5-4L19 18" /></>,
  replay: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  backspace: <><path d="M9 5h10.5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z" /><path d="M12 9.5l5 5M17 9.5l-5 5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>,
  choose: <><rect x="3" y="7" width="5" height="10" rx="1.5" /><rect x="9.5" y="4" width="5" height="16" rx="1.5" /><rect x="16" y="7" width="5" height="10" rx="1.5" /></>,
  gift: <><rect x="3.5" y="9" width="17" height="11.5" rx="2" /><path d="M2.5 9h19M12 9v11.5M12 9C9 9 7 4 9.5 4S12 9 12 9zM12 9c3 0 5-5 2.5-5S12 9 12 9z" /></>,
  trash: <><path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5a2 2 0 0 0 2 1.5h6a2 2 0 0 0 2-1.5L18 7M9 7V4.5h6V7" /></>,
  pin: <><path d="M12 17v4.5M8 3.5h8l-1 6 3.5 3.5v2H5.5v-2L9 9.5z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = '', strokeWidth = 2, title }: { name: IconName; size?: number; className?: string; strokeWidth?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}

/** A drawn coin: the class currency, in its own ochre so it never borrows the marigold "now" colour. */
export function CoinIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="8.6" fill="#e7a92a" stroke="#9a6608" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="5.6" fill="none" stroke="#fbe3a2" strokeWidth="1.3" />
      <path d="M10 7.2v5.6" stroke="#9a6608" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
