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
  // behaviour icons (the default categories and the Settings icon picker)
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.6" /><path d="M15.5 14.4A5 5 0 0 1 21.5 19" /></>,
  speech: <><path d="M4.5 5h15A1.5 1.5 0 0 1 21 6.5v9a1.5 1.5 0 0 1-1.5 1.5H11l-5 4v-4H4.5A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z" /><path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth={3} /></>,
  speechOff: <><path d="M4.5 5h15A1.5 1.5 0 0 1 21 6.5v9a1.5 1.5 0 0 1-1.5 1.5H11l-5 4v-4H4.5A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z" /><path d="M8 8l8 6" /></>,
  checkCircle: <><circle cx="12" cy="12" r="8.5" /><path d="M8 12.3l2.8 2.8L16.5 9.5" /></>,
  ear: <><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 3.2-3.5 4.3-3.5 7.5a3 3 0 0 1-6 0" /><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.6-2 2.2-2 3.8" /></>,
  earOff: <><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 3.2-3.5 4.3-3.5 7.5a3 3 0 0 1-6 0" /><path d="M4 4l16 16" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.2-1-1.6-1-2.6 0-1.1.9-1.6 2.3-1.6H18a3 3 0 0 0 3-3C21 6.9 17 3 12 3z" /><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" /><circle cx="9.5" cy="7.5" r="1.2" fill="currentColor" /><circle cx="14.5" cy="7.5" r="1.2" fill="currentColor" /></>,
  puzzle: <path d="M4 4h5v1.5a2 2 0 0 0 4 0V4h5v5h-1.5a2 2 0 0 0 0 4H18v5h-5v-1.5a2 2 0 0 0-4 0V18H4v-5h1.5a2 2 0 0 0 0-4H4z" />,
  house: <><path d="M3.5 11L12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></>,
  dumbbell: <><path d="M6.5 7.5v9M3.5 10v4M17.5 7.5v9M20.5 10v4M6.5 12h11" /></>,
  hash: <path d="M4.5 9h15M4.5 15h15M10 4l-2 16M16 4l-2 16" />,
  broom: <><path d="M15 3l-3.5 8" /><path d="M7.5 11h8l2.5 9.5H5z" /><path d="M9 15.5V20M12.5 15.5V20" /></>,
  smile: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14a4 4 0 0 0 7 0" /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth={3} /></>,
  rocket: <><path d="M12 3c3 2.2 4.8 6 4 11.5H8C7.2 9 9 5.2 12 3z" /><circle cx="12" cy="9.5" r="1.6" /><path d="M8 13l-3 3.5 3.2.8M16 13l3 3.5-3.2.8M10.5 17.5L12 21l1.5-3.5" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13v3.5M8.5 20.5h7M9.5 16.5h5v4h-5z" /></>,
  rainbow: <path d="M3 18a9 9 0 0 1 18 0M6.5 18a5.5 5.5 0 0 1 11 0M10 18a2 2 0 0 1 4 0" />,
  apple: <><path d="M12 7.5c-2-1.6-6.5-1.2-6.5 3.8 0 4.3 3 9.2 6.5 8.2 3.5 1 6.5-3.9 6.5-8.2 0-5-4.5-5.4-6.5-3.8z" /><path d="M12 7.5c0-2.2 1-3.6 3-4.5" /></>,
  pencil: <><path d="M4 20l1.2-4.3L16 4.9l3.1 3.1L8.3 18.8z" /><path d="M14 7l3 3" /></>,
  microscope: <><path d="M9.5 3.5h4l-1.2 8h-1.6z" /><path d="M11 11.5v2M6 20.5h13M8 20.5v-1.5a4 4 0 0 1 4-4M14 17.5a5 5 0 0 0 3-6.5" /></>,
  ball: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8.2l3.3 2.4-1.3 3.9h-4l-1.3-3.9z" /><path d="M12 8.2V3.5M15.3 10.6l4.5-1.4M14 14.5l2.8 3.8M10 14.5l-2.8 3.8M8.7 10.6L4.2 9.2" /></>,
  runner: <><circle cx="14.5" cy="4.8" r="1.8" /><path d="M9 21l2.4-5.4L8.8 13l1.7-5 4 3.2 3.3.3" /><path d="M11.4 15.6l3.4 2V21M10.5 8L6.5 9.5 5 12.5" /></>,
  hourglass: <><path d="M7 3.5h10M7 20.5h10" /><path d="M8 3.5c0 5 8 5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 5-8 8.5s8 3.5 8 8.5" /></>,
};

/** The teacher picks behaviour icons as emoji; every one in the picker (and the defaults) has a drawn twin. */
const EMOJI_ICON: Record<string, string> = {
  '🌟': 'star', '⭐': 'star', '✋': 'wave', '🙋': 'wave', '🤝': 'people', '💬': 'speech', '✅': 'checkCircle', '📖': 'book', '👂': 'ear',
  '🎨': 'palette', '🧩': 'puzzle', '🏠': 'house', '💪': 'dumbbell', '🎵': 'music', '🔢': 'hash', '🧹': 'broom', '😊': 'smile',
  '🚀': 'rocket', '🏆': 'trophy', '🌈': 'rainbow', '🍎': 'apple', '✏️': 'pencil', '🔬': 'microscope', '⚽': 'ball', '🎯': 'target',
  '💛': 'heart', '🙊': 'speechOff', '🏃': 'runner', '📝': 'hourglass', '🙉': 'earOff',
};

export type IconName = keyof typeof PATHS;

/** A behaviour's icon: the drawn twin of the teacher's emoji when there is one, the emoji itself otherwise. */
export function Glyph({ icon, size = 20, className = '', strokeWidth = 2 }: { icon: string; size?: number; className?: string; strokeWidth?: number }) {
  const name = EMOJI_ICON[icon];
  if (name) return <Icon name={name} size={size} className={className} strokeWidth={strokeWidth} />;
  return <span aria-hidden className={`leading-none ${className}`} style={{ fontSize: size * 0.9 }}>{icon}</span>;
}

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
