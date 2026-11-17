import { useEffect, useRef } from 'react';
import { illustrationUrl } from '../creatures/Illustrated';
import { animate, createAnimatable, createScope, utils } from '../vendor/animejs/index.js';
import { reducedMotion } from '../lib/motion';
import { useStore } from '../store/store';

/**
 * The painted sky world behind every screen: a daytime sky, the sun, drifting clouds, far mountains,
 * floating islands, hills and a flower meadow, all watercolour layers painted by scripts/sky/paint.mjs.
 * anime.js moves it: clouds drift across, islands bob, the sun's rays turn, pollen floats, now and then a
 * winged creature flies past, and every layer shifts a little with the pointer (deeper layers less).
 * With Reduce Motion, or "Animated background" off, it stays a still painting.
 */
const SKY = `${import.meta.env.BASE_URL}sky/`;

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

  useEffect(() => {
    const el = root.current;
    if (!el || !motion || reduced || reducedMotion()) return;
    let flyerTimer = 0;
    const scope = createScope({ root: el }).add(() => {
      // clouds drift left to right and wrap around, each at its own speed and starting point
      el.querySelectorAll<HTMLElement>('[data-cloud]').forEach((c, i) => {
        const [, , , , , start, secs] = CLOUDS[i];
        const a = animate(c, { x: ['-40vw', '115vw'], duration: secs * 1000, loop: true, ease: 'linear' });
        a.seek(start * secs * 1000);
      });
      // islands bob and sway
      el.querySelectorAll<HTMLElement>('[data-island]').forEach((isl, i) => {
        animate(isl, { y: [-9, 9], rotate: [-1.4, 1.2], duration: ISLANDS[i][5] * 1000, loop: true, alternate: true, ease: 'inOutSine', delay: i * 600 });
      });
      // the sun breathes and its rays turn
      animate('[data-sun-rays]', { rotate: 360, duration: 120000, loop: true, ease: 'linear' });
      animate('[data-sun-glow]', { scale: [1, 1.1], opacity: [0.75, 1], duration: 3600, loop: true, alternate: true, ease: 'inOutSine' });
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
    const fly = () => {
      const img = document.createElement('img');
      const id = FLYERS[Math.floor(Math.random() * FLYERS.length)];
      const [sp, st] = id.split('-');
      img.src = illustrationUrl(sp, Number(st) as 1 | 2);
      img.alt = '';
      img.className = 'sky-flyer';
      const rtl = Math.random() < 0.5;
      img.style.top = `${utils.random(9, 24)}vh`;
      if (rtl) img.style.transform = 'scaleX(-1)';
      el.querySelector('[data-flyers]')?.appendChild(img);
      const secs = utils.random(16, 24);
      animate(img, {
        x: rtl ? ['110vw', '-14vw'] : ['-14vw', '110vw'],
        duration: secs * 1000, ease: 'linear',
        onComplete: () => { img.remove(); flyerTimer = window.setTimeout(fly, utils.random(9000, 22000)); },
      });
      animate(img, { y: [0, -34, 8, -26, 0], duration: secs * 1000, ease: 'inOutSine' });
      animate(img, { rotate: rtl ? [4, -4] : [-4, 4], duration: 900, loop: true, alternate: true, ease: 'inOutSine' });
    };
    flyerTimer = window.setTimeout(fly, 4000);

    return () => {
      scope.revert();
      layers.forEach((l) => l.anim.revert());
      removeEventListener('pointermove', onMove);
      clearTimeout(flyerTimer);
      el.querySelectorAll('.sky-flyer').forEach((f) => f.remove());
    };
  }, [motion, reduced]);

  return (
    <div ref={root} className="sky-world" aria-hidden>
      <div className="sky-gradient" />
      {/* the sun, top right */}
      <div className="sky-sun" data-depth="0.15">
        <svg data-sun-rays viewBox="-100 -100 200 200" className="sky-sun-rays">
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M -5 -36 L 0 -98 L 5 -36 Z" fill="#fff6c8" opacity={i % 2 ? 0.35 : 0.6} transform={`rotate(${i * 22.5})`} />
          ))}
        </svg>
        <div data-sun-glow className="sky-sun-glow" />
        <div className="sky-sun-disc" />
      </div>
      {/* far clouds */}
      <div className="sky-layer" data-depth="0.3">
        {CLOUDS.map(([img, top, w, minW], i) => (
          <img key={i} data-cloud src={`${SKY}${img}.webp`} alt="" draggable={false}
            style={{ top: `${top}vh`, width: `max(${w}vw, ${minW}px)`, transform: `translateX(${CLOUDS[i][5] * 100}vw)` }} />
        ))}
      </div>
      <img className="sky-strip sky-mountains" data-depth="0.25" src={`${SKY}mountains.webp`} alt="" draggable={false} />
      <div className="sky-layer" data-depth="0.6">
        {ISLANDS.map(([img, left, top, w, minW], i) => (
          <img key={i} data-island src={`${SKY}${img}.webp`} alt="" draggable={false} style={{ left: `${left}vw`, top: `${top}vh`, width: `max(${w}vw, ${minW}px)` }} />
        ))}
      </div>
      <div className="sky-layer" data-flyers data-depth="0.8" />
      <img className="sky-strip sky-hills" data-depth="0.5" src={`${SKY}hills.webp`} alt="" draggable={false} />
      <div className="sky-strip-wrap" data-depth="0.9">
        <img className="sky-strip sky-meadow" data-meadow src={`${SKY}meadow.webp`} alt="" draggable={false} />
      </div>
      <div className="sky-layer" data-depth="1">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} data-pollen className="sky-pollen" style={{ left: `${(i * 61) % 100}vw`, top: `${48 + ((i * 37) % 46)}vh` }} />
        ))}
      </div>
    </div>
  );
}
