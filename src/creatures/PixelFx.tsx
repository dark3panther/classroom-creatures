import { useEffect, useRef } from 'react';
import { clearFrame, createFrame, createFx } from '../vendor/pixelfx/core/index.js';
import * as cartoonPow from '../vendor/pixelfx/fx/explosions/cartoon-pow.js';
import * as halo from '../vendor/pixelfx/fx/holy/halo.js';
import * as blessing from '../vendor/pixelfx/fx/holy/blessing.js';
import * as sunburst from '../vendor/pixelfx/fx/holy/sunburst.js';
import * as chocoStick from '../vendor/pixelfx/fx/pickups/choco-stick.js';
import * as collectBurst from '../vendor/pixelfx/fx/pickups/collect-burst.js';
import * as powerStar from '../vendor/pixelfx/fx/pickups/power-star.js';
import * as heartPickup from '../vendor/pixelfx/fx/pickups/heart-pickup.js';
import * as charmed from '../vendor/pixelfx/fx/status/charmed.js';
import * as confused from '../vendor/pixelfx/fx/status/confused.js';
import * as sleep from '../vendor/pixelfx/fx/status/sleep.js';
import * as slowed from '../vendor/pixelfx/fx/status/slowed.js';
import * as stunned from '../vendor/pixelfx/fx/status/stunned.js';
import * as confetti from '../vendor/pixelfx/fx/ui/confetti.js';
import * as exclamation from '../vendor/pixelfx/fx/ui/exclamation.js';
import * as levelUp from '../vendor/pixelfx/fx/ui/level-up.js';

/**
 * Pixel art effects from the pixelfx library, played live over a creature.
 * The effects are drawn for a 24×38 px stand-in character; we map that to the creature's size.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FxModule = any;
/** effects that paint the stand-in's face (eyes, blush): those pixels are dropped so our creature shows through */
const PAINTS_BODY = new Set(['holy/halo', 'status/charmed']);
const FX: Record<string, FxModule> = {
  'explosions/cartoon-pow': cartoonPow, 'holy/halo': halo, 'holy/blessing': blessing, 'holy/sunburst': sunburst,
  'pickups/choco-stick': chocoStick, 'pickups/collect-burst': collectBurst, 'pickups/power-star': powerStar, 'pickups/heart-pickup': heartPickup,
  'status/charmed': charmed, 'status/confused': confused, 'status/sleep': sleep, 'status/slowed': slowed, 'status/stunned': stunned,
  'ui/confetti': confetti, 'ui/exclamation': exclamation, 'ui/level-up': levelUp,
};
export type PixelFxId = keyof typeof FX;

export interface PixelFxProps {
  id: PixelFxId;
  /** where the effect's anchor (usually the stand-in's feet) sits, as fractions of the box */
  anchor?: [number, number];
  /** stand-in character height as a fraction of the box height (sets the pixel size) */
  bodyFrac?: number;
  /** multiply the effect size (e.g. a smaller treat in the creature's hand) */
  size?: number;
  options?: Record<string, unknown>;
  /** play a loop for this long then fade it out; one-shots end on their own */
  duration?: number;
  onDone?: () => void;
  fps?: number;
  className?: string;
}

// one shared animation clock for every effect on screen (cheap on classroom computers)
type Tick = (dt: number) => void;
const ticks = new Set<Tick>();
let raf = 0, last = 0;
function loop(now: number) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
  last = now;
  ticks.forEach((t) => t(dt));
  raf = ticks.size ? requestAnimationFrame(loop) : 0;
  if (!raf) last = 0;
}
function subscribe(t: Tick) {
  ticks.add(t);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => { ticks.delete(t); };
}

export function PixelFx({ id, anchor = [0.5, 0.93], bodyFrac = 0.62, size = 1, options, duration, onDone, fps = 30, className = '' }: PixelFxProps) {
  const box = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const mod = FX[id];
  const [W, H] = mod.meta.size as [number, number];
  const [OX, OY] = mod.meta.origin as [number, number];

  useEffect(() => {
    const cc = colorRef.current, lc = lightRef.current, host = box.current;
    if (!cc || !lc || !host) return;
    const cx = cc.getContext('2d')!, lx = lc.getContext('2d')!;
    const frame = createFrame(W, H, -OX, -OY);
    const fx = createFx(mod, { x: 0, y: 0, ...(options ?? {}) });
    const colorImg = cx.createImageData(W, H), lightImg = lx.createImageData(W, H);
    // effects written for the stand-in character also paint on its body (eyes, blush, tint): our creature
    // is underneath instead, so anything inside the stand-in's silhouette is dropped
    const actor = PAINTS_BODY.has(id) ? fx.options.actor : null;
    const hide = new Uint8Array(W * H);
    if (actor?.mask) {
      const m = actor.mask, bits = m.bits ?? m.data ?? m;
      for (let j = 0; j < actor.h; j++) for (let i = 0; i < actor.w; i++) {
        const on = typeof m.get === 'function' ? m.get(i, j) : bits[j * actor.w + i];
        if (!on) continue;
        const x = actor.x + i + OX, y = actor.y + j + OY;
        if (x >= 0 && y >= 0 && x < W && y < H) hide[y * W + x] = 1;
      }
    }
    let acc = 0, life = 0, stopped = false, finished = false;
    const step = 1 / fps;

    // keep the canvases sized to the creature box
    const place = () => {
      const r = host.getBoundingClientRect();
      const k = ((r.height * bodyFrac) / 38) * size;
      for (const c of [cc, lc]) {
        c.style.width = `${W * k}px`;
        c.style.height = `${H * k}px`;
        c.style.left = `${anchor[0] * r.width - OX * k}px`;
        c.style.top = `${anchor[1] * r.height - OY * k}px`;
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(host);

    const paint = () => {
      clearFrame(frame);
      fx.draw(frame, 'back');
      fx.draw(frame, 'front');
      const C = frame.color, L = frame.light, cd = colorImg.data, ld = lightImg.data;
      for (let i = 0; i < W * H; i++) {
        const c = hide[i] ? 0 : C[i], o = i * 4;
        cd[o] = c & 255; cd[o + 1] = (c >>> 8) & 255; cd[o + 2] = (c >>> 16) & 255; cd[o + 3] = c >>> 24;
        const l = L[i], r = l & 255, g = (l >>> 8) & 255, b = (l >>> 16) & 255;
        ld[o] = r; ld[o + 1] = g; ld[o + 2] = b; ld[o + 3] = Math.max(r, g, b);
      }
      cx.putImageData(colorImg, 0, 0);
      lx.putImageData(lightImg, 0, 0);
    };
    paint();

    const off = subscribe((dt) => {
      if (finished) return;
      acc += dt;
      life += dt;
      if (acc < step) return;
      fx.update(acc);
      acc = 0;
      if (duration && !stopped && life > duration) { fx.stop(); stopped = true; }
      paint();
      if (fx.done()) { finished = true; done.current?.(); }
    });
    return () => { off(); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, duration, fps, size, bodyFrac, anchor[0], anchor[1], JSON.stringify(options ?? {})]);

  return (
    <div ref={box} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      <canvas ref={colorRef} width={W} height={H} className="absolute" style={{ imageRendering: 'pixelated' }} />
      <canvas ref={lightRef} width={W} height={H} className="absolute" style={{ imageRendering: 'pixelated', mixBlendMode: 'screen' }} />
    </div>
  );
}
