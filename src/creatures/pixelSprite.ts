import { createElement } from 'react';
import ART from '../data/creatureArt.json';
import type { Equipped, Species, Stage } from '../types';

/**
 * Pixel mode: turns a creature (its painting plus everything it wears) into a real pixel-art sprite.
 * The creature is drawn as SVG, rasterised at 4× the sprite size, then each 4×4 block becomes one pixel:
 * alpha-weighted colour, a hard alpha edge, a reduced palette (median cut) and a one-pixel selective
 * outline (each edge pixel darkens the colour next to it), the way sprites are drawn by hand.
 * Two frames: eyes open and eyes shut (for blinking). Results are cached per creature and outfit.
 */
export const SPRITE_W = 64;
/** the creature SVG frame is 216 × 222 units (see Illustrated.tsx), so the sprite keeps that shape */
export const SPRITE_H = Math.round((SPRITE_W * 222) / 216);
const SUPER = 4;
const VIEW_X = -8, VIEW_Y = -22, VIEW_W = 216;
const IMG_X = -8, IMG_Y = -16, IMG_S = 216;

export interface PixelSprite {
  open: HTMLCanvasElement;
  shut: HTMLCanvasElement;
  openUrl: string;
  shutUrl: string;
  /** opaque bounds in sprite pixels */
  box: { left: number; right: number; top: number; bottom: number };
  /** eye centre and mouth (where breath attacks start), in sprite pixels */
  eye: [number, number];
  mouth: [number, number];
}

export interface SpriteRequest { species: Species; stage: Stage; equipped?: Equipped; branch?: 'a' | 'b' }

const cache = new Map<string, Promise<PixelSprite>>();
const dataUrls = new Map<string, Promise<string>>();

export const spriteKey = (r: SpriteRequest) => `${r.species.id}|${r.stage}|${r.stage === 5 ? r.branch ?? 'a' : ''}|${JSON.stringify(r.equipped ?? {})}`;

/** Get (or start making) the pixel sprite for a creature in its outfit. */
export function pixelSprite(r: SpriteRequest): Promise<PixelSprite> {
  const key = spriteKey(r);
  let p = cache.get(key);
  if (!p) {
    p = make(r);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    // keep the cache from growing without end in a long lesson
    if (cache.size > 400) cache.delete(cache.keys().next().value as string);
  }
  return p;
}
/** A sprite already made (for synchronous first paint), or undefined. */
const ready = new Map<string, PixelSprite>();
export const readySprite = (r: SpriteRequest) => ready.get(spriteKey(r));

function inline(url: string): Promise<string> {
  let p = dataUrls.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.blob()).then((b) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(b); }));
    dataUrls.set(url, p);
  }
  return p;
}

async function svgMarkup(r: SpriteRequest, shut: boolean): Promise<string> {
  const [{ renderToStaticMarkup }, { IllustratedCreature }] = await Promise.all([import('react-dom/server'), import('./Illustrated')]);
  // effects off: no aura, sparkles or rings, just the creature and what it wears; "sleepy" shows the eyelids
  let svg = renderToStaticMarkup(createElement(IllustratedCreature, { sp: r.species, stage: r.stage, equipped: r.equipped, branch: r.branch, noShadow: true, effects: false, expression: shut ? 'sleepy' : 'happy' }));
  const hrefs = [...new Set([...svg.matchAll(/href="([^"]+\.webp)"/g)].map((m) => m[1]))];
  for (const h of hrefs) svg = svg.split(`href="${h}"`).join(`href="${await inline(h)}"`);
  const w = SPRITE_W * SUPER, h = SPRITE_H * SUPER;
  return svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" `);
}

function rasterise(svg: string): Promise<ImageData> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = SPRITE_W * SUPER; c.height = SPRITE_H * SUPER;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, c.width, c.height);
      res(x.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = () => rej(new Error('could not draw the creature'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

type RGB = [number, number, number];

/** 4×4 blocks → one pixel each: alpha-weighted colour and coverage. */
function downsample(big: ImageData): { rgb: Float32Array; cover: Float32Array } {
  const W = SPRITE_W, H = SPRITE_H, BW = big.width, d = big.data;
  const rgb = new Float32Array(W * H * 3), cover = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < SUPER; j++) for (let i = 0; i < SUPER; i++) {
      const o = ((y * SUPER + j) * BW + x * SUPER + i) * 4, al = d[o + 3] / 255;
      r += d[o] * al; g += d[o + 1] * al; b += d[o + 2] * al; a += al;
    }
    const k = y * W + x;
    cover[k] = a / (SUPER * SUPER);
    if (a > 0) { rgb[k * 3] = r / a; rgb[k * 3 + 1] = g / a; rgb[k * 3 + 2] = b / a; }
  }
  return { rgb, cover };
}

/** A little more punch before the palette is reduced: pixel art reads with saturated, contrasting colour. */
function punch([r, g, b]: RGB): RGB {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const s = 1.18, c = 1.06;
  const f = (v: number) => Math.max(0, Math.min(255, ((l + (v - l) * s) - 128) * c + 128));
  return [f(r), f(g), f(b)];
}

/** Median-cut palette of `n` colours. */
function medianCut(cols: RGB[], n: number): RGB[] {
  if (!cols.length) return [];
  let boxes: RGB[][] = [cols];
  while (boxes.length < n) {
    let bi = -1, bestRange = -1, axis = 0;
    boxes.forEach((bx, i) => {
      if (bx.length < 2) return;
      for (let a = 0; a < 3; a++) {
        let lo = 255, hi = 0;
        for (const c of bx) { if (c[a] < lo) lo = c[a]; if (c[a] > hi) hi = c[a]; }
        // weight by population so big flat areas get more shades
        const range = (hi - lo) * Math.sqrt(bx.length);
        if (range > bestRange) { bestRange = range; bi = i; axis = a; }
      }
    });
    if (bi < 0 || bestRange <= 0) break;
    const bx = boxes[bi].slice().sort((p, q) => p[axis] - q[axis]);
    const mid = bx.length >> 1;
    boxes = [...boxes.slice(0, bi), bx.slice(0, mid), bx.slice(mid), ...boxes.slice(bi + 1)];
  }
  return boxes.map((bx) => {
    const s = [0, 0, 0];
    for (const c of bx) { s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; }
    return [s[0] / bx.length, s[1] / bx.length, s[2] / bx.length] as RGB;
  });
}

function nearest(p: RGB[], c: RGB): RGB {
  let best = p[0], bd = Infinity;
  for (const q of p) {
    // perceptual-ish weighting (green matters most)
    const d = 2 * (q[0] - c[0]) ** 2 + 4 * (q[1] - c[1]) ** 2 + 3 * (q[2] - c[2]) ** 2;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

/** Build the final pixels: palette, hard edges and a selective outline. Returns RGBA bytes. */
function toPixels(rgb: Float32Array, cover: Float32Array, palette: RGB[] | null): { px: Uint8ClampedArray; palette: RGB[] } {
  const W = SPRITE_W, H = SPRITE_H, N = W * H;
  const solid = new Uint8Array(N);
  for (let k = 0; k < N; k++) solid[k] = cover[k] >= 0.5 ? 1 : 0;
  // drop lonely pixels (anti-aliasing dust)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (!solid[k]) continue;
    let n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && solid[Y * W + X]) n++; }
    if (n === 0) solid[k] = 0;
  }
  const cols: RGB[] = [];
  for (let k = 0; k < N; k++) if (solid[k]) cols.push(punch([rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]]));
  const pal = palette ?? medianCut(cols, 22);
  const px = new Uint8ClampedArray(N * 4);
  for (let k = 0; k < N; k++) {
    if (!solid[k]) continue;
    const c = nearest(pal, punch([rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]]));
    px[k * 4] = c[0]; px[k * 4 + 1] = c[1]; px[k * 4 + 2] = c[2]; px[k * 4 + 3] = 255;
  }
  // selective outline: a transparent pixel touching the sprite takes the darkened colour of its neighbour
  const out = px.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (solid[k]) continue;
    let nb = -1;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && solid[Y * W + X]) { nb = Y * W + X; break; } }
    if (nb < 0) continue;
    const r = px[nb * 4], g = px[nb * 4 + 1], b = px[nb * 4 + 2];
    out[k * 4] = r * 0.28 + 12; out[k * 4 + 1] = g * 0.24 + 10; out[k * 4 + 2] = b * 0.3 + 22; out[k * 4 + 3] = 255;
  }
  return { px: out, palette: pal };
}

function canvasOf(px: Uint8ClampedArray): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SPRITE_W; c.height = SPRITE_H;
  c.getContext('2d')!.putImageData(new ImageData(px, SPRITE_W, SPRITE_H), 0, 0);
  return c;
}

interface Anchor { eyes: [number, number][] }
const ANCHORS = ART as unknown as Record<string, Anchor>;
const toSprite = (p512: number, isX: boolean) => {
  const svg = (isX ? IMG_X : IMG_Y) + (p512 * IMG_S) / 512;
  return ((svg - (isX ? VIEW_X : VIEW_Y)) * SPRITE_W) / VIEW_W;
};

async function make(r: SpriteRequest): Promise<PixelSprite> {
  const [openSvg, shutSvg] = await Promise.all([svgMarkup(r, false), svgMarkup(r, true)]);
  const [openBig, shutBig] = await Promise.all([rasterise(openSvg), rasterise(shutSvg)]);
  const o = downsample(openBig), s = downsample(shutBig);
  const a = toPixels(o.rgb, o.cover, null);
  const b = toPixels(s.rgb, s.cover, a.palette);
  let left = SPRITE_W, right = 0, top = SPRITE_H, bottom = 0;
  for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) if (a.px[(y * SPRITE_W + x) * 4 + 3]) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const art = ANCHORS[r.stage === 5 && r.branch === 'b' && `${r.species.id}-5b` in ANCHORS ? `${r.species.id}-5b` : `${r.species.id}-${r.stage}`];
  const eyes = art?.eyes ?? [[230, 230], [282, 230]];
  const ex = toSprite((eyes[0][0] + eyes[1][0]) / 2, true), ey = toSprite((eyes[0][1] + eyes[1][1]) / 2, false);
  const gap = Math.abs(toSprite(eyes[1][0], true) - toSprite(eyes[0][0], true));
  const open = canvasOf(a.px), shut = canvasOf(b.px);
  const sprite: PixelSprite = {
    open, shut, openUrl: open.toDataURL(), shutUrl: shut.toDataURL(),
    box: { left, right, top, bottom },
    eye: [Math.round(ex), Math.round(ey)],
    mouth: [Math.round(ex + gap * 0.9), Math.round(ey + gap * 0.7)],
  };
  ready.set(spriteKey(r), sprite);
  return sprite;
}
