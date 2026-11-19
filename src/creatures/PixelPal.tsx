import { useEffect, useRef } from 'react';
import PALS from '../data/pixelPals.json';
import type { Equipped, Expression, Species, Stage } from '../types';
import { subscribe } from './PixelFx';
import { outfitSprite, type Outfit } from './pixelSprite';

/**
 * A Pixel Pal on screen: plays its hand-made animations from the sprite sheet (idle breathing with tail and
 * ears, a blink every few seconds, happy hop, attack, sleep, hurt) on the app's shared animation clock, and
 * draws what it wears on the head-following layer, so a hat bobs, hops and lunges with the head.
 * The animation follows the creature's feeling: sleepy → sleep, an ability → attack, celebrating → happy,
 * a behaviour reminder → hurt, otherwise idle.
 */
type Anim = 'idle' | 'blink' | 'happy' | 'attack' | 'sleep' | 'hurt';
interface Form { offsets: Record<Anim, [number, number][]> }
const META = PALS as unknown as { frame: [number, number]; anims: Record<Anim, { row: number; frames: number; fps: number }>; forms: Record<string, Form> };
const [FW, FH] = META.frame;

const sheets = new Map<string, HTMLImageElement>();
function sheetFor(url: string): HTMLImageElement {
  let img = sheets.get(url);
  if (!img) { img = new Image(); img.decoding = 'async'; img.src = url; sheets.set(url, img); }
  return img;
}
export const palSheetUrl = (id: string, stage: Stage) => `${import.meta.env.BASE_URL}creatures-pixel/${id}-${stage}.png`;

function animFor(expression?: Expression): Anim {
  if (expression === 'sleepy') return 'sleep';
  if (expression === 'wow') return 'attack';
  if (expression === 'excited') return 'happy';
  if (expression === 'sad') return 'hurt';
  return 'idle';
}

export function PixelPal({ species, stage, expression, equipped, effects = true, className = '', title }: {
  species: Species; stage: Stage; expression?: Expression; equipped?: Equipped; effects?: boolean; className?: string; title?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const want = animFor(expression);
  const form = META.forms[`${species.id}-${stage}`];
  const url = palSheetUrl(species.id, stage);
  const outfitKey = JSON.stringify(equipped ?? {});
  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !form) return;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const sheet = sheetFor(url);
    let outfit: Outfit | null = null;
    let live = true;
    let last = -1;
    const redraw = () => { last = -1; };
    void outfitSprite({ species, stage, equipped }).then((o) => { if (live) { outfit = o; redraw(); } });
    const still = !effects || document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    // a stable rhythm per creature, so a class never blinks in unison
    let seed = 0;
    for (const ch of `${species.id}${stage}`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    // the effect restarts whenever the wanted animation changes, so each one begins at its first frame
    let anim: Anim = want, t = want === 'idle' ? (seed % 97) / 97 : 0, nextBlink = 2 + (seed % 5), blinkLeft = 0;
    const draw = (a: Anim, f: number) => {
      const key = META.anims[a].row * 100 + f;
      if (key === last || !sheet.complete || !sheet.naturalWidth) return;
      last = key;
      ctx.clearRect(0, 0, FW, FH);
      // wings and capes behind the pal, then the pal, then what it wears in front; all follow its head
      const [dx, dy] = form.offsets[a][f] ?? [0, 0];
      if (outfit?.back) ctx.drawImage(outfit.back, dx, dy);
      ctx.drawImage(sheet, f * FW, META.anims[a].row * FH, FW, FH, 0, 0, FW, FH);
      if (outfit?.front) ctx.drawImage(outfit.front, dx, dy);
    };
    // a still creature (thumbnails, Reduce Motion) is drawn once, when its sheet and outfit are ready
    if (still) {
      const pose: Anim = anim === 'sleep' ? 'sleep' : 'idle';
      const paint = () => { redraw(); draw(pose, 0); };
      if (sheet.complete) paint(); else sheet.addEventListener('load', paint, { once: true });
      void outfitSprite({ species, stage, equipped }).then(() => { if (live) setTimeout(paint, 0); });
      return () => { live = false; };
    }
    if (!sheet.complete) sheet.addEventListener('load', redraw, { once: true });
    const off = subscribe((dt) => {
      t += dt;
      const m = META.anims[anim];
      let f = Math.floor(t * m.fps);
      if (anim === 'attack' && f >= m.frames) { anim = 'idle'; t = 0; f = 0; }        // one attack, then back to idle
      else if (anim === 'hurt') f = Math.min(f, m.frames - 1);                       // the recoil, then hold still
      else f %= m.frames;
      let a: Anim = anim;
      // a blink every few seconds while idle: two frames of the blink row, in the same breathing pose
      if (a === 'idle') {
        nextBlink -= dt;
        if (nextBlink <= 0) { blinkLeft = 0.24; nextBlink = 2.6 + ((seed = (seed * 1103515245 + 12345) >>> 0) % 4000) / 1000; }
        if (blinkLeft > 0) { blinkLeft -= dt; a = 'blink'; }
      }
      draw(a, Math.min(f, META.anims[a].frames - 1));
    });
    return () => { live = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, want, effects, outfitKey]);
  return (
    <span className={`pc ${className}`} role="img" aria-label={title ?? species.name} data-pal="">
      <canvas ref={canvas} width={FW} height={FH} className="pc-frame" />
    </span>
  );
}
