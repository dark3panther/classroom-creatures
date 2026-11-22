import { createElement, useEffect, useState } from 'react';
import { ADVENTURE_ART } from '../../data/adventure';
import { useStore } from '../../store/store';
import { pixelateSvg } from '../pixelate';
import { BossArt, type BossMood } from './BossArt';

/**
 * A boss as the app shows it: the painted drawing (BossArt), or in Pixel mode the same drawing made into
 * pixel art. `friend` is the befriended look.
 *
 * Drop-in paintings: list a boss id in BOSS_PAINTINGS and put `public/bosses/<id>.webp` (grumpy) and
 * `<id>-friend.webp` (befriended) in place (transparent, 512 × 512, facing left, feet near the bottom);
 * the painted look then uses them for those two moods.
 */
export const BOSS_PAINTINGS = new Set<string>();
const paintingUrl = (id: string, friend: boolean) => `${import.meta.env.BASE_URL}bosses/${id}${friend ? '-friend' : ''}.webp`;

const PIXEL = 112;
const pixels = new Map<string, Promise<string>>();
function pixelBoss(id: string, mood: BossMood, statue: boolean): Promise<string> {
  const key = `${id}:${mood}:${statue ? 's' : ''}`;
  let p = pixels.get(key);
  if (!p) {
    p = (async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const svg = renderToStaticMarkup(createElement(BossArt, { id, mood, still: true }));
      const size = statue ? 44 : PIXEL;
      const c = await pixelateSvg(svg, size, size, statue ? { colors: 10, ramp: ['#4a4658', '#6f6a80', '#958fa6', '#bab4c8', '#dcd8e6', '#f4f2f8'] } : { colors: 22 });
      return c.toDataURL();
    })();
    pixels.set(key, p);
    p.catch(() => pixels.delete(key));
  }
  return p;
}

function usePixelBoss(id: string, mood: BossMood, statue = false, on = true): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!on) return;
    let live = true;
    void pixelBoss(id, mood, statue).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [id, mood, statue, on]);
  return url;
}

export function BossPortrait({ id, mood = 'grumpy', friend, className = '', title, still }: { id: string; mood?: BossMood; friend?: boolean; className?: string; title?: string; still?: boolean }) {
  const pixel = useStore((s) => !!s.data.settings.pixelMode);
  const m: BossMood = friend ? 'happy' : mood;
  const url = usePixelBoss(id, m, false, pixel);
  if (pixel) {
    return url ? <img src={url} alt={title ?? ''} draggable={false} className={`pixel block h-auto w-full ${className}`} /> : <span className={`block aspect-square w-full ${className}`} />;
  }
  if (BOSS_PAINTINGS.has(id) && (m === 'grumpy' || m === 'happy')) {
    return <img src={paintingUrl(id, m === 'happy')} alt={title ?? ''} draggable={false} className={`block h-auto w-full ${className}`} />;
  }
  return <BossArt id={id} mood={m} className={className} title={title} still={still} />;
}

/** The six first bosses have hand-made statues in the class world's pixel art; the rest are carved from their drawing. */
const HAND_MADE = new Set(['grumblethorn', 'glimmerjaw', 'snowsulk', 'magmaw', 'whirlwing', 'colossus']);
export function BossStatue({ id, className = '', style, alt }: { id: string; className?: string; style?: React.CSSProperties; alt?: string }) {
  const url = usePixelBoss(id, 'happy', true, !HAND_MADE.has(id));
  const src = HAND_MADE.has(id) ? `${ADVENTURE_ART}statue-${id}.png` : url;
  if (!src) return null;
  return (
    <span className={`block ${className}`} style={style}>
      <img src={src} alt={alt ?? ''} draggable={false} className="pixel block h-auto w-full" />
      {!HAND_MADE.has(id) && <span className="pixel mx-auto block h-[14%] w-[86%] bg-[#6f6a80] shadow-[inset_0_-3px_0_#4a4658,inset_0_3px_0_#bab4c8]" />}
    </span>
  );
}
