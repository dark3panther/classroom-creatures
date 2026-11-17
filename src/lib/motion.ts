import { animate, createTimeline, spring, stagger, utils, type JSAnimation } from '../vendor/animejs/index.js';

/**
 * The app's motion vocabulary, built on anime.js (src/vendor/animejs). Everything here checks
 * reducedMotion() first: with Reduce Motion on (app setting or the OS), changes happen instantly.
 */
export function reducedMotion(): boolean {
  return document.documentElement.classList.contains('reduce-motion')
    || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** a soft, bouncy spring for presses, pops and arrivals */
export const bouncy = spring({ bounce: 0.45, duration: 520 });
export const settle = spring({ bounce: 0.2, duration: 640 });

/** Press feedback: squash down while held. */
export function pressIn(el: Element) {
  if (reducedMotion()) return;
  animate(el, { scale: 0.93, duration: 110, ease: 'out(3)' });
}
/** Release: spring back past rest and settle. */
export function pressOut(el: Element) {
  if (reducedMotion()) return;
  animate(el, { scale: 1, ease: bouncy });
}
/** Hover lift for buttons and cards. */
export function hoverLift(el: Element, on: boolean, lift = -2) {
  if (reducedMotion()) return;
  animate(el, { y: on ? lift : 0, duration: 260, ease: 'out(3)' });
}

/** A short celebratory bounce (a card that just got an award, a coin pill that changed). */
export function pop(el: Element | null | undefined, amount = 1.07) {
  if (!el || reducedMotion()) return;
  createTimeline().add(el, { scale: amount, duration: 130, ease: 'out(2)' }).add(el, { scale: 1, ease: bouncy });
}

/** Little sparks that burst from a point (a click on a primary button). */
export function sparkle(x: number, y: number, colors = ['#ffc23d', '#ffffff', '#5bb8f0', '#ff8fb1']) {
  if (reducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'spark-layer';
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.style.background = colors[i % colors.length];
    layer.appendChild(d);
  }
  document.body.appendChild(layer);
  Array.from(layer.children).forEach((dot, i) => {
    const a = (i / n) * Math.PI * 2 + utils.random(-0.25, 0.25), r = utils.random(26, 46);
    animate(dot, {
      x: Math.cos(a) * r, y: Math.sin(a) * r,
      scale: [{ to: 1.2, duration: 160 }, { to: 0, duration: 380 }],
      duration: 540, ease: 'out(3)',
      ...(i === n - 1 ? { onComplete: () => layer.remove() } : {}),
    });
  });
}

/** Elements rising into place one after another (cards on a page, rows in a list). */
export function riseIn(targets: ArrayLike<Element>, opts: { gap?: number; distance?: number; from?: 'first' | 'center' } = {}): JSAnimation | null {
  const list = Array.from(targets);
  if (!list.length) return null;
  if (reducedMotion()) { utils.set(list, { opacity: 1, y: 0, scale: 1 }); return null; }
  utils.set(list, { opacity: 0, y: opts.distance ?? 18 });
  return animate(list, {
    opacity: 1, y: 0,
    delay: stagger(Math.min(opts.gap ?? 40, 900 / list.length), { from: opts.from ?? 'first' }),
    duration: 620,
    ease: 'out(4)',
  });
}

/** Count a number up (or down) inside an element. */
export function countTo(el: HTMLElement, from: number, to: number, format: (n: number) => string = (n) => Math.round(n).toLocaleString()) {
  if (reducedMotion() || from === to) { el.textContent = format(to); return null; }
  const o = { v: from };
  return animate(o, {
    v: to,
    duration: Math.min(1400, 380 + Math.abs(to - from) * 6),
    ease: 'out(3)',
    onUpdate: () => { el.textContent = format(o.v); },
  });
}

export { animate, createTimeline, spring, stagger, utils };

/**
 * A highlight pill that slides to the selected tab inside a tab row (anime.js). The row needs
 * `position: relative` and a child `[data-pill]`; the selected tab is the one with
 * aria-selected="true" (or aria-current / aria-pressed="true").
 */
export function slidePill(row: HTMLElement | null, instant = false) {
  const pill = row?.querySelector<HTMLElement>('[data-pill]');
  const on = row?.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="page"], [aria-pressed="true"]');
  if (!row || !pill) return;
  if (!on) { pill.style.opacity = '0'; return; }
  const x = on.offsetLeft, y = on.offsetTop, w = on.offsetWidth, h = on.offsetHeight;
  pill.style.opacity = '1';
  if (instant || reducedMotion() || !pill.dataset.ready) {
    Object.assign(pill.style, { width: `${w}px`, height: `${h}px`, transform: `translate(${x}px, ${y}px)` });
    pill.dataset.ready = '1';
    return;
  }
  pill.style.height = `${h}px`;
  animate(pill, { x, y, width: w, ease: spring({ bounce: 0.25, duration: 520 }) });
  // keep the selected tab in view when the row scrolls (phones)
  on.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
}
