import { createAnimatable } from '../vendor/animejs/index.js';
import { hoverLift, pressIn, pressOut, reducedMotion, sparkle } from './motion';

/**
 * App-wide interaction feel, installed once (App.tsx) with delegated listeners, so every button and
 * card gets it without each component wiring anything:
 *   - every .btn (and [data-press]) squashes when pressed and springs back when released
 *   - buttons lift a little under the mouse
 *   - primary, buy and azure buttons throw a few sparks on click
 *   - [data-tilt] cards lean towards the pointer and settle back when it leaves
 * All of it stands down under Reduce Motion (the helpers check).
 */
const PRESS = '.btn:not(:disabled), [data-press]';
const SPARK = '.btn-primary:not(:disabled), .btn-buy:not(:disabled), [data-spark]';

export function installInteractions(): () => void {
  let pressed: Element | null = null;
  let hovered: Element | null = null;
  let tilted: { el: HTMLElement; anim: ReturnType<typeof createAnimatable> } | null = null;
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

  const onDown = (e: PointerEvent) => {
    const el = (e.target as Element | null)?.closest(PRESS);
    if (!el) return;
    pressed = el;
    pressIn(el);
  };
  const release = () => { if (pressed) { pressOut(pressed); pressed = null; } };
  const onClick = (e: MouseEvent) => {
    if (!e.isTrusted || e.detail === 0) return; // keyboard activation: no sparks
    if ((e.target as Element | null)?.closest(SPARK)) sparkle(e.clientX, e.clientY);
  };

  const onOver = (e: PointerEvent) => {
    if (!fine || e.pointerType !== 'mouse') return;
    const t = e.target as Element | null;
    const btn = t?.closest('.btn:not(:disabled)') ?? null;
    if (btn !== hovered) {
      if (hovered && hovered !== pressed) hoverLift(hovered, false);
      if (btn && btn !== pressed) hoverLift(btn, true);
      hovered = btn;
    }
    const card = (t?.closest('[data-tilt]') as HTMLElement | null) ?? null;
    if (card !== tilted?.el) {
      if (tilted) { tilted.anim.rotateX(0); tilted.anim.rotateY(0); }
      tilted = card && !reducedMotion() ? { el: card, anim: createAnimatable(card, { rotateX: 500, rotateY: 500, ease: 'out(3)' }) } : null;
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!tilted || e.pointerType !== 'mouse') return;
    const r = tilted.el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    const max = Number(tilted.el.dataset.tilt) || 6;
    tilted.anim.rotateY(nx * max);
    tilted.anim.rotateX(-ny * max);
  };
  const onLeaveWindow = () => {
    if (hovered) { hoverLift(hovered, false); hovered = null; }
    if (tilted) { tilted.anim.rotateX(0); tilted.anim.rotateY(0); tilted = null; }
  };

  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });
  document.addEventListener('click', onClick, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeaveWindow);
  return () => {
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', release);
    document.removeEventListener('pointercancel', release);
    document.removeEventListener('click', onClick);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
  };
}
