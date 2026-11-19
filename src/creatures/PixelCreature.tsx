import { useEffect, useMemo, useState } from 'react';
import type { Equipped, Expression, Species, Stage } from '../types';
import { pixelSprite, readySprite, spriteKey, type PixelSprite } from './pixelSprite';

/**
 * A creature as a pixel sprite (Pixel mode). Same box as the illustrated creature, so every screen keeps
 * its layout. It bobs a whole pixel at a time and blinks now and then (each creature on its own rhythm).
 */
export function PixelCreature({ species, stage, equipped, branch, expression, effects = true, className = '', title }: {
  species: Species; stage: Stage; equipped?: Equipped; branch?: 'a' | 'b'; expression?: Expression; effects?: boolean; className?: string; title?: string;
}) {
  const sprite = usePixelSprite({ species, stage, equipped, branch });
  // a stable, per-creature rhythm so a class never bobs or blinks in unison
  const timing = useMemo(() => {
    let h = 0;
    for (const ch of `${species.id}${stage}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return { bob: 1.1 + (h % 5) * 0.12, delay: -((h >> 3) % 11) * 0.13, blink: 3.4 + ((h >> 6) % 7) * 0.55 };
  }, [species.id, stage]);
  const shut = expression === 'sleepy';
  const style = { '--pc-bob': `${timing.bob}s`, '--pc-d': `${timing.delay}s`, '--pc-blink': `${timing.blink}s` } as React.CSSProperties;
  return (
    <span className={`pc ${effects ? 'pc-live' : ''} ${className}`} role="img" aria-label={title ?? species.name} style={style}>
      {sprite && <img src={shut ? sprite.shutUrl : sprite.openUrl} alt="" draggable={false} className="pc-frame" />}
      {sprite && effects && !shut && <img src={sprite.shutUrl} alt="" draggable={false} className="pc-frame pc-shut" />}
    </span>
  );
}

/** The pixel sprite for a creature in its outfit (null until it has been made, usually a few milliseconds). */
export function usePixelSprite(req: { species: Species; stage: Stage; equipped?: Equipped; branch?: 'a' | 'b' } | null): PixelSprite | null {
  const key = req ? spriteKey(req) : '';
  const [sprite, setSprite] = useState<PixelSprite | null>(() => (req ? readySprite(req) ?? null : null));
  useEffect(() => {
    if (!req) { setSprite(null); return; }
    const now = readySprite(req);
    if (now) { setSprite(now); return; }
    let live = true;
    pixelSprite(req).then((s) => { if (live) setSprite(s); }).catch(() => { /* keeps the empty box */ });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return sprite;
}
