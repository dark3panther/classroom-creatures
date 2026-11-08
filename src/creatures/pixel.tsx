import { memo, useEffect, useRef } from 'react';
import { subscribe } from './PixelFx';

/**
 * A tiny sprite format for the pixel-art layer (trails, effect and ability icons, snacks and toys):
 * rows of characters, each mapped to a colour in `pal`; '.' is transparent. Rendered crisp at any size.
 */
export interface Sprite { rows: string[]; pal: Record<string, string> }

export const PixelSprite = memo(function PixelSprite({ sprite, size = 32, className = '', title }: { sprite: Sprite; size?: number; className?: string; title?: string }) {
  const h = sprite.rows.length, w = sprite.rows[0].length;
  const rects: JSX.Element[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const c = row[x];
      if (c === '.' || !sprite.pal[c]) { x++; continue; }
      let run = 1;
      while (x + run < w && row[x + run] === c) run++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={sprite.pal[c]} />);
      x += run;
    }
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size} height={(size * h) / w} className={className} shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects}
    </svg>
  );
});

const O = '#2b2140'; // shared outline

export const SPRITES: Record<string, Sprite> = {
  spark: { rows: ['...a...', '...b...', '.a.b.a.', 'abbwbba', '.a.b.a.', '...b...', '...a...'], pal: { a: '#ffd23f', b: '#fff1a8', w: '#ffffff' } },
  ember: { rows: ['...a....', '..aba...', '..abba..', '.abccba.', '.abccba.', '..abba..', '...aa...'], pal: { a: '#c9281f', b: '#ff8a2a', c: '#ffe26b' } },
  bubble: { rows: ['..aaaa..', '.a.ww.a.', 'a.w....a', 'a......a', 'a......a', 'a......a', '.a....a.', '..aaaa..'], pal: { a: '#4fb6f0', w: '#ffffff' } },
  leaf: { rows: ['......aa', '....aaba', '...abba.', '..abba..', '.abba...', '.aba....', 'a.a.....', 'a.......'], pal: { a: '#3e7d2f', b: '#7cc46a' } },
  snow: { rows: ['...a...', '.a.a.a.', '..aaa..', 'aaawaaa', '..aaa..', '.a.a.a.', '...a...'], pal: { a: '#cfe8ff', w: '#ffffff' } },
  star: { rows: ['....a....', '....a....', '...aba...', 'aaabwbaaa', '.aabbbaa.', '..abbba..', '.aab.baa.', '.aa...aa.', 'a.......a'], pal: { a: '#e8a21e', b: '#ffd23f', w: '#fff6c4' } },
  heart: { rows: ['.aa.aa.', 'abbabba', 'abwbbba', 'abbbbba', '.abbba.', '..aba..', '...a...'], pal: { a: '#c42a6e', b: '#ff6fa3', w: '#ffd1e6' } },
  rainbow: { rows: ['..rrrr..', '.roooor.', 'roy..yor', 'oyg..gyo', 'ygb..bgy', 'gbp..pbg'], pal: { r: '#ff5d5d', o: '#ffa53d', y: '#ffe066', g: '#6fdc8c', b: '#5ab8f0', p: '#a78bfa' } },
  shield: { rows: ['.aaaaaa.', 'abbbbbba', 'abwwbbba', 'abwbbbba', 'abbbbbba', '.abbbba.', '..abba..', '...aa...'], pal: { a: O, b: '#7fd6ff', w: '#e6fbff' } },
  orb: { rows: ['..aaaa..', '.abbbba.', 'abwwbbba', 'abwbbbba', 'abbbbbba', 'abbbbbca', '.abbbca.', '..aaaa..'], pal: { a: '#1f7a2e', b: '#6fdc8c', c: '#3fa34f', w: '#e3ffe8' } },
  crystal: { rows: ['...a...', '..aba..', '.abwba.', '.abbba.', '.abbba.', '.abbca.', '..aca..', '...a...'], pal: { a: O, b: '#c9b6ff', c: '#9b7bff', w: '#ffffff' } },
  gem: { rows: ['.aaaaa.', 'abwbbca', 'aaaaaaa', '.abbbc.', '..abc..', '...a...'], pal: { a: O, b: '#ff7ac8', c: '#c42a6e', w: '#ffe1f3' } },
  beam: { rows: ['..ww..', '.wbbw.', '.bwwb.', '.bwwb.', '.bwwb.', '.bwwb.', 'bbwwbb', 'baaaab'], pal: { a: '#e8a21e', b: '#ffe26b', w: '#fffbe0' } },
  // snacks and toys (interactions)
  berry: { rows: ['...g....', '..gg....', '.aaaa...', 'abwaaa..', 'abaaaa..', 'aaaaaa..', '.aaaa...'], pal: { a: '#c42a6e', b: '#ff6fa3', w: '#ffffff', g: '#3e7d2f' } },
  fish: { rows: ['........', '.aaaa..a', 'abbbbaaa', 'abwbbbba', 'abbbbaaa', '.aaaa..a'], pal: { a: '#2b6e8f', b: '#7fd6ff', w: '#ffffff' } },
  cookie: { rows: ['..aaaa..', '.abbbba.', 'abcbbcba', 'abbbbbba', 'abbcbbba', '.abbbca.', '..aaaa..'], pal: { a: '#7a4b2a', b: '#e0a35a', c: '#5a341c' } },
  ball: { rows: ['..aaaa..', '.abbbba.', 'abwwbbca', 'abccbbca', 'acbbbcca', 'abbbbbba', '.abbbba.', '..aaaa..'], pal: { a: O, b: '#ff5d5d', c: '#ffe066', w: '#ffffff' } },
  yarn: { rows: ['..aaaa..', '.abcbca.', 'abcbcbca', 'acbcbcba', 'abcbcbca', '.acbcba.', '..aaaa.d', '.......d'], pal: { a: O, b: '#a78bfa', c: '#c9b6ff', d: '#a78bfa' } },
  wand: { rows: ['......a.', '.....aba', '......a.', '.....c..', '....c...', '...c....', '..c.....', '.c......'], pal: { a: '#e8a21e', b: '#fff6c4', c: '#7a4b2a' } },
};

/** How each trail moves. */
interface TrailStyle { sprites: string[]; rate: number; life: number; vy: number; vx: number; wobble: number; from: 'feet' | 'top' | 'body'; fade: boolean }
const TRAILS: Record<string, TrailStyle> = {
  'trail-sparkle': { sprites: ['spark'], rate: 5, life: 1.6, vy: -6, vx: 0, wobble: 10, from: 'body', fade: true },
  'trail-ember': { sprites: ['ember'], rate: 6, life: 1.8, vy: -22, vx: 0, wobble: 6, from: 'feet', fade: true },
  'trail-bubble': { sprites: ['bubble'], rate: 4, life: 2.4, vy: -16, vx: 0, wobble: 8, from: 'feet', fade: false },
  'trail-leaf': { sprites: ['leaf'], rate: 3, life: 3, vy: 12, vx: 8, wobble: 14, from: 'top', fade: true },
  'trail-snow': { sprites: ['snow'], rate: 5, life: 3.2, vy: 10, vx: 2, wobble: 8, from: 'top', fade: true },
  'trail-star': { sprites: ['star', 'spark'], rate: 4, life: 2, vy: -12, vx: 0, wobble: 6, from: 'body', fade: true },
  'trail-heart': { sprites: ['heart'], rate: 3, life: 2.2, vy: -18, vx: 0, wobble: 8, from: 'feet', fade: true },
  'trail-rainbow': { sprites: ['spark', 'heart', 'star'], rate: 7, life: 1.8, vy: -14, vx: 0, wobble: 12, from: 'feet', fade: true },
};

export const TRAIL_ICON: Record<string, string> = {
  'trail-sparkle': 'spark', 'trail-ember': 'ember', 'trail-bubble': 'bubble', 'trail-leaf': 'leaf', 'trail-snow': 'snow', 'trail-star': 'star', 'trail-heart': 'heart', 'trail-rainbow': 'rainbow',
};
export const EFFECT_ICON: Record<string, string> = { 'fx-shield': 'shield', 'fx-orbs': 'orb', 'fx-crystals': 'crystal', 'fx-gems': 'gem', 'fx-beam': 'beam' };

const RAINBOW_TINT = ['#ff5d5d', '#ffa53d', '#ffe066', '#6fdc8c', '#5ab8f0', '#a78bfa'];

interface P { x: number; y: number; vx: number; vy: number; age: number; life: number; sprite: Sprite; phase: number; tint?: string }

/** Pixel particles that follow a creature. Drawn on a low-resolution canvas so every particle stays a crisp pixel sprite. */
export function Trail({ id, compact }: { id: string; compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, style = TRAILS[id];
    if (!cv || !style) return;
    const ctx = cv.getContext('2d')!;
    const px = compact ? 2 : 3; // screen pixels per sprite pixel
    let W = 0, H = 0;
    const size = () => { const r = cv.getBoundingClientRect(); W = Math.max(1, Math.round(r.width / px)); H = Math.max(1, Math.round(r.height / px)); cv.width = W; cv.height = H; };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const parts: P[] = [];
    let acc = 0, frame = 0;
    const rate = style.rate * (compact ? 0.6 : 1);
    const spawn = () => {
      const sprite = SPRITES[style.sprites[Math.floor(Math.random() * style.sprites.length)]];
      const x = W * (0.22 + Math.random() * 0.56);
      const y = style.from === 'feet' ? H * (0.78 + Math.random() * 0.12) : style.from === 'top' ? H * (0.02 + Math.random() * 0.1) : H * (0.2 + Math.random() * 0.6);
      parts.push({ x, y, vx: (Math.random() - 0.5) * style.vx * 2 + style.vx * 0.3, vy: style.vy * (0.7 + Math.random() * 0.6), age: 0, life: style.life * (0.7 + Math.random() * 0.6), sprite, phase: Math.random() * 6.28, tint: id === 'trail-rainbow' ? RAINBOW_TINT[Math.floor(Math.random() * 6)] : undefined });
    };
    const off = subscribe((dt) => {
      if (++frame % (compact ? 3 : 2)) return; // 20–30 fps is plenty for pixel particles
      const step = dt * (compact ? 3 : 2);
      acc += step * rate;
      while (acc > 1 && parts.length < (compact ? 10 : 22)) { spawn(); acc -= 1; }
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += step;
        if (p.age > p.life) { parts.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(p.age * 3 + p.phase) * style.wobble * 0.3) * step;
        p.y += p.vy * step;
        const a = style.fade ? Math.min(1, (1 - p.age / p.life) * 1.6) : (p.age / p.life > 0.9 ? 0 : 1);
        ctx.globalAlpha = a;
        const rows = p.sprite.rows;
        const sx = Math.round(p.x - rows[0].length / 2), sy = Math.round(p.y - rows.length / 2);
        for (let yy = 0; yy < rows.length; yy++) for (let xx = 0; xx < rows[yy].length; xx++) {
          const c = rows[yy][xx];
          if (c === '.') continue;
          ctx.fillStyle = p.tint && c !== 'w' ? p.tint : p.sprite.pal[c];
          ctx.fillRect(sx + xx, sy + yy, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    });
    return () => { off(); ro.disconnect(); };
  }, [id, compact]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" style={{ imageRendering: 'pixelated' }} aria-hidden />;
}
