import { useEffect, useRef, useState } from 'react';
import { subscribe } from './PixelFx';
import { IllustratedCreature } from './Illustrated';
import type { Equipped, Expression, Species, Stage } from '../types';
import { SPRITE_H, SPRITE_W, pixelSprite, readySprite, spriteKey, type PixelSprite } from './pixelSprite';

/**
 * A painted creature as a pixel sprite (Pixel mode). Same box as the illustrated creature, so every screen
 * keeps its layout. It breathes like a hand-animated sprite (upper body up a pixel, chest a row taller) and
 * blinks at random moments, each creature on its own rhythm.
 */
export function PixelCreature({ species, stage, equipped, branch, expression, effects = true, className = '', title }: {
  species: Species; stage: Stage; equipped?: Equipped; branch?: 'a' | 'b'; expression?: Expression; effects?: boolean; className?: string; title?: string;
}) {
  const { sprite, failed } = usePixelSpriteState({ species, stage, equipped, branch });
  const canvas = useRef<HTMLCanvasElement>(null);
  const shut = expression === 'sleepy';
  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !sprite) return;
    const ctx = cv.getContext('2d')!;
    let last = '';
    const draw = (eyes: 'open' | 'shut', inhaled: boolean) => {
      const key = `${eyes}${inhaled}`;
      if (key === last) return;
      last = key;
      const src = eyes === 'open' ? (inhaled ? sprite.openIn : sprite.open) : (inhaled ? sprite.shutIn : sprite.shut);
      ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
      ctx.drawImage(src ?? sprite.open, 0, 0);
    };
    const still = !effects || document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { draw(shut ? 'shut' : 'open', false); return; }
    // each creature breathes and blinks on its own rhythm, so a class never moves in unison
    let seed = 0;
    for (const ch of `${species.id}${stage}`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const period = (shut ? 2.6 : 1.3) + (seed % 5) * 0.12;
    let t = (seed % 97) / 97 * period, nextBlink = 1.5 + (seed % 7) * 0.6, blinkLeft = 0;
    // the first frame now, not on the next tick of the animation clock (it can be paused, e.g. a window in the background)
    draw(shut ? 'shut' : 'open', false);
    return subscribe((dt) => {
      t = (t + dt) % period;
      nextBlink -= dt;
      if (nextBlink <= 0) { blinkLeft = 0.2; nextBlink = 2.6 + ((seed = (seed * 1103515245 + 12345) >>> 0) % 4000) / 1000; }
      if (blinkLeft > 0) blinkLeft -= dt;
      draw(shut || blinkLeft > 0 ? 'shut' : 'open', t > period * 0.5);
    });
  }, [sprite, effects, shut, species.id, stage]);
  // a sprite that could not be made never leaves an empty space: the painted creature stands in
  if (failed) return <IllustratedCreature sp={species} stage={stage} equipped={equipped} branch={branch} expression={expression} effects={effects} className={className} title={title} />;
  return (
    <span className={`pc ${className}`} role="img" aria-label={title ?? species.name}>
      <canvas ref={canvas} width={SPRITE_W} height={SPRITE_H} className="pc-frame" />
    </span>
  );
}

/** The pixel sprite for a creature in its outfit (null until it has been made, usually a few milliseconds). */
export function usePixelSprite(req: { species: Species; stage: Stage; equipped?: Equipped; branch?: 'a' | 'b' } | null): PixelSprite | null {
  return usePixelSpriteState(req).sprite;
}

/** The sprite, and whether making it failed (then try again the next time it is shown). */
export function usePixelSpriteState(req: { species: Species; stage: Stage; equipped?: Equipped; branch?: 'a' | 'b' } | null): { sprite: PixelSprite | null; failed: boolean } {
  const key = req ? spriteKey(req) : '';
  const [state, setState] = useState<{ key: string; sprite: PixelSprite | null; failed: boolean }>(() => ({ key, sprite: req ? readySprite(req) ?? null : null, failed: false }));
  useEffect(() => {
    if (!req) { setState({ key, sprite: null, failed: false }); return; }
    const now = readySprite(req);
    if (now) { setState({ key, sprite: now, failed: false }); return; }
    let live = true;
    setState((s) => (s.key === key ? s : { key, sprite: null, failed: false }));
    pixelSprite(req).then((sp) => { if (live) setState({ key, sprite: sp, failed: false }); })
      .catch(() => { if (live) setState({ key, sprite: null, failed: true }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? { sprite: state.sprite, failed: state.failed } : { sprite: null, failed: false };
}
