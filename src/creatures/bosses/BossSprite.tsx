import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import manifest from '../../data/bossSprites.json';
import { reducedMotion } from '../../lib/motion';
import type { BossMood } from './BossArt';

/**
 * The animated bosses (1.7): each boss is a rigged 3D model built in Blender (scripts/bosses-3d/) and rendered by
 * SpriteCast into sprite strips (public/bosses3d/<id>/), one strip per action, all at one scale with the feet on one
 * spot. This player draws them on a canvas: idle breathes and blinks, hurt and attack play once and fall back to idle,
 * happy hops. In Pixel mode the same frames are drawn small and blown up, so the boss is pixel art that still moves.
 */
export type SpriteAction = 'idle' | 'attack' | 'hurt' | 'happy' | 'walkEast' | 'walkWest';
/** w, h, ax, ay, x, y are in render units (shared by every action of a boss); the strip's frames are sw × sh pixels */
interface Act { file: string; frames: number; fps: number; loop: boolean; w: number; h: number; ax: number; ay: number; x: number; y: number; sw: number; sh: number }
interface Entry { stage: [number, number]; anchor: [number, number]; body: [number, number]; actions: Partial<Record<SpriteAction, Act>> }

const SPRITES = manifest as unknown as Record<string, Entry>;
const ALIAS: Record<string, string> = { gloomwing: 'murkmoth' };
const entryOf = (id: string): Entry | undefined => SPRITES[ALIAS[id] ?? id];
export const hasBossSprite = (id: string) => !!entryOf(id)?.actions.idle;

/** where the boss stands in its square box (as BossArt draws them): feet at 92 % down, the body 80 % of the box tall */
const FEET = 0.92, BODY = 0.8, WIDE = 0.96;
/** the canvas reaches past the square on every side, so a lunge or a hop is never cut off */
const BLEED = 0.25;
/** Pixel mode: the boss about this many pixels tall */
const PIXEL_BODY = 92;

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(file: string): Promise<HTMLImageElement> {
  let p = images.get(file);
  if (!p) {
    p = new Promise<HTMLImageElement>((ok, fail) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { (im.decode ? im.decode().catch(() => undefined) : Promise.resolve()).then(() => ok(im)); };
      im.onerror = () => fail(new Error(`boss sprite ${file} did not load`));
      im.src = `${import.meta.env.BASE_URL}${file}`;
    });
    images.set(file, p);
    p.catch(() => images.delete(file));
  }
  return p;
}

/** a strip's frames made small for Pixel mode: crisp edges (alpha cut at half), drawn once and kept */
const pixelStrips = new Map<string, HTMLCanvasElement>();
function pixelStrip(im: HTMLImageElement, a: Act, k: number): HTMLCanvasElement {
  const key = `${a.file}@${k.toFixed(4)}`;
  const hit = pixelStrips.get(key);
  if (hit) return hit;
  const fw = Math.max(1, Math.round(a.w * k)), fh = Math.max(1, Math.round(a.h * k));
  const c = document.createElement('canvas');
  c.width = fw * a.frames; c.height = fh;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (let i = 0; i < a.frames; i++) g.drawImage(im, i * a.sw, 0, a.sw, a.sh, i * fw, 0, fw, fh);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 110) { px[i + 3] = 0; continue; }
    const a8 = px[i + 3] / 255;             // un-premultiply the soft edge, then make it solid
    px[i] = Math.min(255, px[i] / a8); px[i + 1] = Math.min(255, px[i + 1] / a8); px[i + 2] = Math.min(255, px[i + 2] / a8); px[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  pixelStrips.set(key, c);
  if (pixelStrips.size > 80) pixelStrips.delete(pixelStrips.keys().next().value!);
  return c;
}

function actionFor(mood: BossMood): SpriteAction {
  return mood === 'happy' ? 'happy' : mood === 'hurt' ? 'hurt' : mood === 'attack' ? 'attack' : 'idle';
}

export interface BossSpriteProps {
  id: string;
  mood?: BossMood;
  /** play this action instead of the mood's (a wandering boss walking) */
  play?: SpriteAction;
  /** bump to play hurt or attack again while the mood stays the same (hit after hit) */
  beat?: number;
  /** one frame, no animation (lists, small markers) */
  still?: boolean;
  pixel?: boolean;
  title?: string;
  className?: string;
  /** what to show if the sprites cannot load (the painted boss) */
  fallback?: ReactNode;
}

export function BossSprite({ id, mood = 'grumpy', play, beat = 0, still, pixel, title, className = '', fallback = null }: BossSpriteProps) {
  const entry = entryOf(id);
  const box = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState(0);
  const [failed, setFailed] = useState(false);
  const want = play ?? actionFor(mood);
  const rest: SpriteAction = play && entry?.actions[play]?.loop ? play : mood === 'happy' ? 'happy' : 'idle';
  // what the running animation reads: the action asked for (with a counter, so a hit replays) and where it settles
  const asked = useRef({ want, rest, beat, n: 0 });
  if (asked.current.want !== want || asked.current.beat !== beat || asked.current.rest !== rest) asked.current = { want, rest, beat, n: asked.current.n + 1 };

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSide(el.offsetWidth));
    ro.observe(el);
    setSide(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // one animation per size and look; the actions it plays come from `asked`, so a new mood never restarts it
  useEffect(() => {
    const c = canvas.current;
    if (!entry || !c || !side) return;
    const idle = entry.actions.idle!;
    const css = side * (1 + 2 * BLEED);
    // the boss's scale in css px per render unit, and the feet's place on the canvas
    const scale = Math.min((BODY * side) / idle.h, (WIDE * side) / idle.w);
    const footX = css / 2, footY = side * (BLEED + FEET);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const res = pixel ? (PIXEL_BODY / (BODY * side)) * css : css * dpr;   // canvas pixels across
    const px = res / css;                                   // canvas px per css px
    const k = scale * px;                                   // render unit -> canvas px
    c.width = Math.max(1, Math.round(res)); c.height = Math.max(1, Math.round(res));
    const g = c.getContext('2d')!;
    const strips = new Map<SpriteAction, HTMLImageElement>();
    let live = true, raf = 0;
    const get = (name: SpriteAction): SpriteAction => (entry.actions[name] ? name : 'idle');
    const need = (name: SpriteAction) => loadImage(entry.actions[get(name)]!.file).then((im) => { strips.set(get(name), im); return im; });
    const draw = (name: SpriteAction, i: number) => {
      const a = entry.actions[name]!, im = strips.get(name);
      if (!im) return;
      g.clearRect(0, 0, c.width, c.height);
      g.imageSmoothingEnabled = !pixel; g.imageSmoothingQuality = 'high';
      if (pixel) {
        const strip = pixelStrip(im, a, k);                 // already at canvas size: drawn 1:1, whole pixels
        const fw = strip.width / a.frames, fh = strip.height;
        g.drawImage(strip, i * fw, 0, fw, fh, Math.round(footX * px - a.ax * k), Math.round(footY * px - a.ay * k), fw, fh);
      } else {
        g.drawImage(im, i * a.sw, 0, a.sw, a.sh, footX * px - a.ax * k, footY * px - a.ay * k, a.w * k, a.h * k);
      }
    };
    const mark = (name: SpriteAction) => { if (box.current && box.current.dataset.action !== name) box.current.dataset.action = name; };

    if (still || reducedMotion()) {
      // one still picture for the mood: a loop's first frame, a one-shot's middle
      let seen = -1;
      const show = () => {
        const q = asked.current; if (q.n === seen) return; seen = q.n;
        const name = get(q.want), a = entry.actions[name]!;
        void need(name).then(() => { if (live) { draw(name, a.loop ? 0 : Math.floor(a.frames * 0.45)); mark(name); } }).catch(() => live && setFailed(true));
      };
      show();
      const t = setInterval(show, 120);
      return () => { live = false; clearInterval(t); };
    }

    let cur: SpriteAction = get(asked.current.want), t0 = 0, last = -1, seen = -1;
    const tick = (now: number) => {
      if (!live) return;
      const q = asked.current;
      if (q.n !== seen) {
        seen = q.n;
        const next = get(q.want), a = entry.actions[cur];
        // a hurt or an attack always starts now (again, if asked again); a loop waits for a playing one-shot to finish
        const playing = a && !a.loop && (now - t0) / 1000 * a.fps < a.frames;
        if (!entry.actions[next]!.loop || !playing) { if (next !== cur || !entry.actions[next]!.loop) { cur = next; t0 = now; last = -1; } }
      }
      const a = entry.actions[cur]!;
      if (!strips.has(cur)) { void need(cur).catch(() => live && setFailed(true)); raf = requestAnimationFrame(tick); return; }
      let i = Math.floor(((now - t0) / 1000) * a.fps);
      if (!a.loop && i >= a.frames) {               // a one-shot is over: settle into idle (or the happy hop)
        const r = get(asked.current.rest);
        if (!strips.has(r)) { void need(r).catch(() => live && setFailed(true)); i = a.frames - 1; }
        else { cur = r; t0 = now; i = 0; last = -1; }
      }
      const b = entry.actions[cur]!;
      i = b.loop ? i % b.frames : Math.min(b.frames - 1, i);
      if (i !== last && strips.has(cur)) { draw(cur, i); last = i; mark(cur); }
      raf = requestAnimationFrame(tick);
    };
    // the strips this boss is likely to need, fetched up front so a hit never waits for a download
    void Promise.all([need(cur), need(asked.current.rest)]).then(() => { if (live) { t0 = performance.now(); raf = requestAnimationFrame(tick); } }).catch(() => live && setFailed(true));
    for (const n of ['hurt', 'attack'] as SpriteAction[]) if (entry.actions[n] && !play) void need(n).catch(() => undefined);
    return () => { live = false; cancelAnimationFrame(raf); };
  }, [entry, side, still, pixel, play]);

  if (!entry || failed) return <>{fallback}</>;
  return (
    <span ref={box} className={`relative block aspect-square w-full ${className}`} role={title ? 'img' : undefined} aria-label={title} data-boss-sprite={ALIAS[id] ?? id}>
      <canvas ref={canvas} aria-hidden className={`pointer-events-none absolute ${pixel ? 'pixel' : ''}`} style={{ left: `${-BLEED * 100}%`, top: `${-BLEED * 100}%`, width: `${(1 + 2 * BLEED) * 100}%`, height: `${(1 + 2 * BLEED) * 100}%` }} />
    </span>
  );
}
