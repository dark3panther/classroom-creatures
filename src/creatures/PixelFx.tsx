import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { clearFrame, createFrame, createFx } from '../vendor/pixelfx/core/index.js';

/**
 * Pixel art effects from the pixelfx library, played live over a creature.
 * The effects are drawn for a 24×38 px stand-in character; we map that to the creature's size.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FxModule = any;
/** effects that paint the stand-in's face (eyes, blush): those pixels are dropped so our creature shows through */
const PAINTS_BODY = new Set(['holy/blessing', 'holy/halo', 'status/charmed', 'status/burning', 'status/frozen', 'status/cursed', 'status/petrified', 'status/rage', 'holy/divine-shield']);
const FX = {
  'explosions/cartoon-pow': () => import('../vendor/pixelfx/fx/explosions/cartoon-pow.js'),
  'holy/halo': () => import('../vendor/pixelfx/fx/holy/halo.js'),
  'holy/blessing': () => import('../vendor/pixelfx/fx/holy/blessing.js'),
  'holy/sunburst': () => import('../vendor/pixelfx/fx/holy/sunburst.js'),
  'pickups/choco-stick': () => import('../vendor/pixelfx/fx/pickups/choco-stick.js'),
  'pickups/collect-burst': () => import('../vendor/pixelfx/fx/pickups/collect-burst.js'),
  'pickups/power-star': () => import('../vendor/pixelfx/fx/pickups/power-star.js'),
  'pickups/heart-pickup': () => import('../vendor/pixelfx/fx/pickups/heart-pickup.js'),
  'status/charmed': () => import('../vendor/pixelfx/fx/status/charmed.js'),
  'status/confused': () => import('../vendor/pixelfx/fx/status/confused.js'),
  'status/sleep': () => import('../vendor/pixelfx/fx/status/sleep.js'),
  'status/slowed': () => import('../vendor/pixelfx/fx/status/slowed.js'),
  'status/stunned': () => import('../vendor/pixelfx/fx/status/stunned.js'),
  'ui/confetti': () => import('../vendor/pixelfx/fx/ui/confetti.js'),
  'ui/exclamation': () => import('../vendor/pixelfx/fx/ui/exclamation.js'),
  'ui/level-up': () => import('../vendor/pixelfx/fx/ui/level-up.js'),
  'status/burning': () => import('../vendor/pixelfx/fx/status/burning.js'),
  'status/frozen': () => import('../vendor/pixelfx/fx/status/frozen.js'),
  'status/haste': () => import('../vendor/pixelfx/fx/status/haste.js'),
  'status/cursed': () => import('../vendor/pixelfx/fx/status/cursed.js'),
  'status/petrified': () => import('../vendor/pixelfx/fx/status/petrified.js'),
  'status/rage': () => import('../vendor/pixelfx/fx/status/rage.js'),
  'holy/divine-shield': () => import('../vendor/pixelfx/fx/holy/divine-shield.js'),
  'holy/heal': () => import('../vendor/pixelfx/fx/holy/heal.js'),
  'holy/holy-pillar': () => import('../vendor/pixelfx/fx/holy/holy-pillar.js'),
  'holy/resurrection': () => import('../vendor/pixelfx/fx/holy/resurrection.js'),
  'holy/feather-burst': () => import('../vendor/pixelfx/fx/holy/feather-burst.js'),
  'pickups/gem-spin': () => import('../vendor/pixelfx/fx/pickups/gem-spin.js'),
  'pickups/crystal-shard': () => import('../vendor/pixelfx/fx/pickups/crystal-shard.js'),
  'pickups/xp-orb': () => import('../vendor/pixelfx/fx/pickups/xp-orb.js'),
  'pickups/loot-beam': () => import('../vendor/pixelfx/fx/pickups/loot-beam.js'),
  'explosions/plasma-explosion': () => import('../vendor/pixelfx/fx/explosions/plasma-explosion.js'),
  'explosions/firework-burst': () => import('../vendor/pixelfx/fx/explosions/firework-burst.js'),
  'explosions/implosion': () => import('../vendor/pixelfx/fx/explosions/implosion.js'),
  'explosions/dirt-explosion': () => import('../vendor/pixelfx/fx/explosions/dirt-explosion.js'),
  'explosions/small-explosion': () => import('../vendor/pixelfx/fx/explosions/small-explosion.js'),
} satisfies Record<string, () => Promise<FxModule>>;
export type PixelFxId = keyof typeof FX;

// each effect's code loads the first time it plays (and all of them are warmed up once the app is idle)
const loaded = new Map<PixelFxId, FxModule>();
const loading = new Map<PixelFxId, Promise<FxModule>>();
function loadFx(id: PixelFxId): Promise<FxModule> {
  let p = loading.get(id);
  if (!p) {
    p = FX[id]().then((m) => { loaded.set(id, m); return m; });
    loading.set(id, p);
  }
  return p;
}
/** Load every effect in the background so the first evolution or ability plays without a gap. */
export function warmPixelFx() {
  const run = () => { for (const id of Object.keys(FX) as PixelFxId[]) void loadFx(id); };
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(run); else setTimeout(run, 1500);
}

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
  /** extra styles on the effect layer (e.g. a mask that keeps the creature's face clear) */
  style?: CSSProperties;
  /** strength of the additive light layer (big effects can wash out a light page) */
  lightOpacity?: number;
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
/** Join the shared animation clock (one requestAnimationFrame for every effect on screen). */
export function subscribe(t: Tick) {
  ticks.add(t);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => { ticks.delete(t); };
}

export function PixelFx(props: PixelFxProps) {
  const [mod, setMod] = useState<FxModule | null>(() => loaded.get(props.id) ?? null);
  useEffect(() => {
    let live = true;
    const ready = loaded.get(props.id);
    if (ready) setMod(() => ready);
    else void loadFx(props.id).then((m) => { if (live) setMod(() => m); });
    return () => { live = false; };
  }, [props.id]);
  if (!mod || mod !== loaded.get(props.id)) return null;
  return <FxCanvas {...props} mod={mod} />;
}

function FxCanvas({ id, anchor = [0.5, 0.93], bodyFrac = 0.62, size = 1, options, duration, onDone, fps = 30, className = '', style, lightOpacity = 1, mod }: PixelFxProps & { mod: FxModule }) {
  const box = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
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
    <div ref={box} className={`pointer-events-none absolute inset-0 ${className}`} style={style} aria-hidden>
      <canvas ref={colorRef} width={W} height={H} className="absolute" style={{ imageRendering: 'pixelated' }} />
      <canvas ref={lightRef} width={W} height={H} className="absolute" style={{ imageRendering: 'pixelated', mixBlendMode: 'screen', opacity: lightOpacity }} />
    </div>
  );
}
