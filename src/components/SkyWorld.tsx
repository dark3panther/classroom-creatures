import { useEffect, useRef } from 'react';
import { illustrationUrl } from '../creatures/Illustrated';
import { animate, createAnimatable, createScope, utils } from '../vendor/animejs/index.js';
import { useStore } from '../store/store';
import { getSpecies } from '../data/species';
import { pixelSprite } from '../creatures/pixelSprite';

/**
 * The painted sky world behind every screen: a daytime sky, the sun, drifting clouds, far mountains,
 * floating islands, hills and a flower meadow, all watercolour layers painted by scripts/sky/paint.mjs.
 * anime.js moves it: clouds drift across, islands bob, the sun's rays turn, pollen floats, now and then a
 * winged creature flies past, and every layer shifts a little with the pointer (deeper layers less).
 * With Reduce Motion, or "Animated background" off, it stays a still painting.
 */
const SKY = `${import.meta.env.BASE_URL}sky/`;
/** Pixel mode draws chunky pixel copies of the same layers (scripts/sky/pixelate.py) */
const SKY_PIXEL = `${import.meta.env.BASE_URL}sky-pixel/`;

// [image, top (vh), width (vw), min width (px), depth, start position (0-1 across the screen), seconds to cross]
const CLOUDS: [string, number, number, number, number, number, number][] = [
  ['cloud-4', 7, 30, 260, 0.35, 0.08, 210],
  ['cloud-2', 3, 22, 200, 0.25, 0.55, 260],
  ['cloud-6', 18, 14, 140, 0.3, 0.86, 180],
  ['cloud-3', 26, 17, 160, 0.45, 0.32, 230],
  ['cloud-1', 12, 26, 240, 0.4, 0.7, 300],
  ['cloud-5', 34, 16, 150, 0.5, 0.15, 250],
];
// [image, left (vw), top (vh), width (vw), min width (px), bob seconds]
const ISLANDS: [string, number, number, number, number, number][] = [
  ['island-blossom', 45, 8.5, 7, 80, 5.8],
  ['island-crystal', 62, 11, 6, 70, 6.4],
  ['island-meadow', 2, 52, 13, 140, 5.2],
  ['island-rock', 90, 44, 6, 70, 4.6],
];
const FLYERS = ['cinderwing-1', 'sparkfinch-1', 'gustowl-1', 'snowmoth-1', 'halowl-2', 'sparkfinch-2', 'gustowl-2', 'snowmoth-2'];

export function SkyWorld() {
  const root = useRef<HTMLDivElement>(null);
  const motion = useStore((s) => s.data.settings.skyMotion ?? true);
  const reduced = useStore((s) => s.data.settings.reducedMotion);
  const pixel = useStore((s) => !!s.data.settings.pixelMode);
  const layer = (name: string) => (pixel ? `${SKY_PIXEL}${name}.png` : `${SKY}${name}.webp`);
  const pix = pixel ? 'pixel' : undefined;

  useEffect(() => {
    const el = root.current;
    // read the setting itself, not the page's reduce-motion class: App updates that class after this effect runs
    const osReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || !motion || reduced || osReduced) return;
    let flyerTimer = 0;
    // Pixel mode moves things a whole pixel at a time (about 6 screen pixels), like a sprite game
    const snapVw: { modifier?: (v: number) => number } = pixel ? { modifier: (v: number) => Math.round(v * 2.5) / 2.5 } : {};
    const snapPx: { modifier?: (v: number) => number } = pixel ? { modifier: (v: number) => Math.round(v / 6) * 6 } : {};
    const snap = (o: object, k: { modifier?: (v: number) => number }) => (k.modifier ? { ...o, modifier: k.modifier } : o) as Parameters<typeof animate>[1];
    const scope = createScope({ root: el }).add(() => {
      // clouds drift left to right and wrap around, each at its own speed and starting point
      el.querySelectorAll<HTMLElement>('[data-cloud]').forEach((c, i) => {
        const [, , , , , start, secs] = CLOUDS[i];
        const a = animate(c, snap({ x: ['-40vw', '115vw'], duration: secs * 1000, loop: true, ease: 'linear' }, snapVw));
        a.seek(start * secs * 1000);
      });
      // islands bob and sway
      el.querySelectorAll<HTMLElement>('[data-island]').forEach((isl, i) => {
        animate(isl, pixel
          ? snap({ y: [-9, 9], duration: ISLANDS[i][5] * 1000, loop: true, alternate: true, ease: 'inOutSine', delay: i * 600 }, snapPx)
          : { y: [-9, 9], rotate: [-1.4, 1.2], duration: ISLANDS[i][5] * 1000, loop: true, alternate: true, ease: 'inOutSine', delay: i * 600 });
      });
      // the sun breathes and its rays turn (the pixel sun just pulses)
      if (pixel) animate('[data-sun-pixel]', { scale: [1, 1.08], duration: 1800, loop: true, alternate: true, ease: 'steps(2)' });
      else {
        animate('[data-sun-rays]', { rotate: 360, duration: 120000, loop: true, ease: 'linear' });
        animate('[data-sun-glow]', { scale: [1, 1.1], opacity: [0.75, 1], duration: 3600, loop: true, alternate: true, ease: 'inOutSine' });
      }
      // pollen and sparkles float up through the light
      el.querySelectorAll<HTMLElement>('[data-pollen]').forEach((p, i) => {
        animate(p, {
          y: [0, -utils.random(60, 140)], x: [0, utils.random(-40, 40)],
          opacity: [{ to: 0.9, duration: 1200 }, { to: 0, duration: 2400, delay: 1800 }],
          duration: utils.random(5200, 8200), loop: true, delay: i * 520, ease: 'inOutSine',
        });
      });
      // meadow and hills sway very slightly, like wind in the grass
      animate('[data-meadow]', { skewX: [-0.4, 0.4], duration: 5200, loop: true, alternate: true, ease: 'inOutSine' });
    });

    // every layer follows the pointer a little: near layers more, far layers less (parallax)
    const layers = Array.from(el.querySelectorAll<HTMLElement>('[data-depth]')).map((l) => ({
      depth: Number(l.dataset.depth), anim: createAnimatable(l, { x: 900, y: 900, ease: 'out(3)' }),
    }));
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      for (const { depth, anim } of layers) { anim.x(-nx * 36 * depth); anim.y(-ny * 18 * depth); }
    };
    addEventListener('pointermove', onMove, { passive: true });

    // now and then a little winged creature flies across the sky
    const fly = async () => {
      const img = document.createElement('img');
      const id = FLYERS[Math.floor(Math.random() * FLYERS.length)];
      const [sp, st] = id.split('-');
      img.src = pixel ? (await pixelSprite({ species: getSpecies(sp), stage: Number(st) as 1 | 2 }).catch(() => null))?.openUrl ?? illustrationUrl(sp, Number(st) as 1 | 2) : illustrationUrl(sp, Number(st) as 1 | 2);
      img.alt = '';
      img.className = pixel ? 'sky-flyer pixel' : 'sky-flyer';
      const rtl = Math.random() < 0.5;
      img.style.top = `${utils.random(9, 24)}vh`;
      if (rtl) img.style.transform = 'scaleX(-1)';
      el.querySelector('[data-flyers]')?.appendChild(img);
      const secs = utils.random(16, 24);
      animate(img, {
        x: rtl ? ['110vw', '-14vw'] : ['-14vw', '110vw'],
        duration: secs * 1000, ease: 'linear', ...(snapVw.modifier ? { modifier: snapVw.modifier } : {}),
        onComplete: () => { img.remove(); flyerTimer = window.setTimeout(() => void fly(), utils.random(9000, 22000)); },
      });
      animate(img, snap({ y: [0, -34, 8, -26, 0], duration: secs * 1000, ease: 'inOutSine' }, snapPx));
      if (!pixel) animate(img, { rotate: rtl ? [4, -4] : [-4, 4], duration: 900, loop: true, alternate: true, ease: 'inOutSine' });
    };
    flyerTimer = window.setTimeout(() => void fly(), 4000);

    return () => {
      scope.revert();
      layers.forEach((l) => l.anim.revert());
      removeEventListener('pointermove', onMove);
      clearTimeout(flyerTimer);
      el.querySelectorAll('.sky-flyer').forEach((f) => f.remove());
    };
  }, [motion, reduced, pixel]);

  return (
    <div ref={root} className="sky-world" aria-hidden>
      <div className="sky-gradient" />
      {/* the sun, top right */}
      {pixel ? (
        <div className="sky-sun" data-depth="0.15">
          <img data-sun-pixel src={`${import.meta.env.BASE_URL}adventure/pixel-sun.png`} alt="" draggable={false} className="pixel sky-sun-pixel" />
        </div>
      ) : <div className="sky-sun" data-depth="0.15">
        <svg data-sun-rays viewBox="-100 -100 200 200" className="sky-sun-rays">
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M -5 -36 L 0 -98 L 5 -36 Z" fill="#fff6c8" opacity={i % 2 ? 0.35 : 0.6} transform={`rotate(${i * 22.5})`} />
          ))}
        </svg>
        <div data-sun-glow className="sky-sun-glow" />
        <div className="sky-sun-disc" />
      </div>}
      {/* far clouds */}
      <div className="sky-layer" data-depth="0.3">
        {CLOUDS.map(([img, top, w, minW], i) => (
          <img key={i} data-cloud src={layer(img)} alt="" draggable={false} className={pix}
            style={{ top: `${top}vh`, width: `max(${w}vw, ${minW}px)`, transform: `translateX(${CLOUDS[i][5] * 100}vw)` }} />
        ))}
      </div>
      <img className={`sky-strip sky-mountains ${pix ?? ''}`} data-depth="0.25" src={layer('mountains')} alt="" draggable={false} />
      <div className="sky-layer" data-depth="0.6">
        {ISLANDS.map(([img, left, top, w, minW], i) => (
          <img key={i} data-island src={layer(img)} alt="" draggable={false} className={pix} style={{ left: `${left}vw`, top: `${top}vh`, width: `max(${w}vw, ${minW}px)` }} />
        ))}
      </div>
      <div className="sky-layer" data-flyers data-depth="0.8" />
      <img className={`sky-strip sky-hills ${pix ?? ''}`} data-depth="0.5" src={layer('hills')} alt="" draggable={false} />
      <div className="sky-strip-wrap" data-depth="0.9">
        <img className={`sky-strip sky-meadow ${pix ?? ''}`} data-meadow src={layer('meadow')} alt="" draggable={false} />
      </div>
      <div className="sky-layer" data-depth="1">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} data-pollen className="sky-pollen" style={{ left: `${(i * 61) % 100}vw`, top: `${48 + ((i * 37) % 46)}vh` }} />
        ))}
      </div>
    </div>
  );
}
