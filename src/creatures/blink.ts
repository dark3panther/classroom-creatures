/**
 * One blink timer for every painted creature on screen. Nothing animates between blinks: the timer
 * sets `data-blink` on a creature's eyelid group for a moment and CSS closes the lids. Each creature
 * has its own rhythm (every 2.5 to 7 seconds, now and then a double blink), so a class never blinks
 * in unison. Blinking stops under Reduce Motion and while the window is hidden.
 */
interface Blinker { el: Element; next: number; double: number }

const blinkers = new Set<Blinker>();
let timer = 0;
const BLINK_MS = 120;

function reduced(): boolean {
  return document.documentElement.classList.contains('reduce-motion')
    || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function close(el: Element, ms: number, then?: () => void) {
  el.setAttribute('data-blink', '');
  window.setTimeout(() => { el.removeAttribute('data-blink'); then?.(); }, ms);
}

function blink(b: Blinker) {
  if (Math.random() < b.double) close(b.el, BLINK_MS, () => window.setTimeout(() => close(b.el, BLINK_MS - 20), 110));
  else close(b.el, BLINK_MS);
}

const gap = () => 2500 + Math.random() * 4500;

function tick() {
  timer = 0;
  if (!blinkers.size) return;
  if (!document.hidden && !reduced()) {
    const now = performance.now();
    for (const b of blinkers) if (now >= b.next) { blink(b); b.next = now + gap(); }
  }
  timer = window.setTimeout(tick, 150);
}

/** Start blinking an eyelid group; returns the function that stops it. */
export function registerBlink(el: Element): () => void {
  const b: Blinker = { el, next: performance.now() + 600 + Math.random() * 4000, double: 0.12 + Math.random() * 0.18 };
  blinkers.add(b);
  if (!timer) timer = window.setTimeout(tick, 150);
  return () => { blinkers.delete(b); el.removeAttribute('data-blink'); };
}

if (import.meta.env.DEV) {
  // screenshots and visual checks: close (or open) every registered eyelid group at once
  (window as unknown as { __ccLids: (closed: boolean) => number }).__ccLids = (closed) => {
    for (const b of blinkers) if (closed) b.el.setAttribute('data-blink', ''); else b.el.removeAttribute('data-blink');
    return blinkers.size;
  };
}
