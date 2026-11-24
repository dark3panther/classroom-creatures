import { createElement } from 'react';
import ART from '../data/creatureArt.json';
import PALS from '../data/pixelPals.json';
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
  /** the same two frames breathing in: everything above the chest one pixel up, the chest one row taller */
  openIn?: HTMLCanvasElement;
  shutIn?: HTMLCanvasElement;
  openUrl: string;
  shutUrl: string;
  /** opaque bounds in sprite pixels */
  box: { left: number; right: number; top: number; bottom: number };
  /** eye centre and mouth (where breath attacks start), in sprite pixels */
  eye: [number, number];
  mouth: [number, number];
  /** the top of the head above the eyes (a Pixel Pal's tail or crest can reach higher than its head) */
  headTop?: number;
}

export interface SpriteRequest { species: Species; stage: Stage; equipped?: Equipped; branch?: 'a' | 'b' }

const cache = new Map<string, Promise<PixelSprite>>();
const dataUrls = new Map<string, Promise<string>>();

export const spriteKey = (r: SpriteRequest) => `${r.species.id}|${r.stage}|${r.stage === 5 ? r.branch ?? 'a' : ''}|${JSON.stringify(r.equipped ?? {})}`;

/** Get (or start making) the pixel sprite for a creature in its outfit. */
export function pixelSprite(r: SpriteRequest): Promise<PixelSprite> {
  if (r.species.pixelArt) return Promise.resolve(palSprite(r));
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
export const readySprite = (r: SpriteRequest) => (r.species.pixelArt ? palSprite(r) : ready.get(spriteKey(r)));

/** A Pixel Pal is pixel art already: its geometry comes straight from the measured sheet. */
type PalForm = { box: number[]; eyes: number[][]; mouth: number[]; anchor: { top: number } };
const palCache = new Map<string, PixelSprite>();
function palSprite(r: SpriteRequest): PixelSprite {
  const k = `${r.species.id}-${r.stage}`;
  let s = palCache.get(k);
  if (!s) {
    const f = (PALS.forms as unknown as Record<string, PalForm>)[k];
    const blank = typeof document !== 'undefined' ? document.createElement('canvas') : (null as unknown as HTMLCanvasElement);
    const [l, t, rr, b] = f?.box ?? [16, 20, 48, 62];
    const eye = f ? [Math.round((f.eyes[0][0] + f.eyes[1][0]) / 2), Math.round((f.eyes[0][1] + f.eyes[1][1]) / 2)] : [32, 40];
    s = { open: blank, shut: blank, openUrl: '', shutUrl: '', box: { left: l, top: t, right: rr, bottom: b }, eye: eye as [number, number], mouth: (f ? [Math.round(f.mouth[0]), Math.round(f.mouth[1])] : [40, 46]) as [number, number],
      // anchor.top is in the 512 px illustration frame (see scripts/pixel/pack-creatures.py)
      headTop: f ? Math.round(((f.anchor.top * 216) / 512 + 6) * SPRITE_H / 222) : t };
    palCache.set(k, s);
  }
  return s;
}

/**
 * The creature in its outfit as a PNG data URL about `px` tall, trimmed to the creature (feet on the bottom edge), for
 * the 3D stage (1.8). Pixel Pals come out crisp (no smoothing).
 */
const pictures = new Map<string, Promise<string>>();
export function creaturePicture(r: SpriteRequest, px = 300): Promise<string> {
  const key = `${spriteKey(r)}|${px}`;
  let p = pictures.get(key);
  if (!p && r.species.pixelArt) {
    // a Pixel Pal: its sheet's first frame with its pixel outfit, blown up crisp
    p = (async () => {
      const [FW, FH] = (PALS as unknown as { frame: [number, number] }).frame;
      const sheet = new Image();
      sheet.src = `${import.meta.env.BASE_URL}creatures-pixel/${r.species.id}-${r.stage}.png`;
      await sheet.decode();
      const outfit = await outfitSprite(r).catch(() => null);
      const c = document.createElement('canvas'); c.width = FW; c.height = FH;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.imageSmoothingEnabled = false;
      if (outfit?.back) x.drawImage(outfit.back, 0, 0, FW, FH);
      x.drawImage(sheet, 0, 0, FW, FH, 0, 0, FW, FH);
      if (outfit?.front) x.drawImage(outfit.front, 0, 0, FW, FH);
      const d = x.getImageData(0, 0, FW, FH);
      let l = FW, t = FH, rr = 0, b = 0;
      for (let y = 0; y < FH; y++) for (let xx = 0; xx < FW; xx++) if (d.data[(y * FW + xx) * 4 + 3] > 24) { if (xx < l) l = xx; if (xx > rr) rr = xx; if (y < t) t = y; if (y > b) b = y; }
      if (rr < l) throw new Error('empty Pixel Pal frame');
      const k = Math.max(1, Math.floor(px / (b - t + 1))), out = document.createElement('canvas');
      out.width = (rr - l + 1) * k; out.height = (b - t + 1) * k;
      const o = out.getContext('2d')!; o.imageSmoothingEnabled = false;
      o.drawImage(c, l, t, rr - l + 1, b - t + 1, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    })();
    pictures.set(key, p);
    p.catch(() => pictures.delete(key));
  }
  if (!p) {
    p = inTurn(async () => {
      const big = px * 1.4;
      const svg = (await svgMarkup(r, false)).replace(/width="\d+" height="\d+" /, `width="${Math.round(big)}" height="${Math.round((big * SPRITE_H) / SPRITE_W)}" `);
      let img = await loadSvg(svg);
      const c = document.createElement('canvas');
      c.width = Math.round(big); c.height = Math.round((big * SPRITE_H) / SPRITE_W);
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.imageSmoothingEnabled = !r.species.pixelArt; x.imageSmoothingQuality = 'high';
      let d: ImageData | null = null;
      for (const [ms, fresh] of [[0, false], [60, false], [200, true], [450, false]] as const) {
        if (ms) await new Promise((res) => setTimeout(res, ms));
        if (fresh) img = await loadSvg(svg);
        x.clearRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        d = x.getImageData(0, 0, c.width, c.height);
        if (solidShare(d) >= MIN_SOLID) break;
      }
      if (!d || solidShare(d) < MIN_SOLID) throw new Error('the creature painting did not draw');
      // trim to the creature, with a little room
      let l = c.width, t = c.height, rr = 0, b = 0;
      for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d.data[(y * c.width + xx) * 4 + 3] > 24) { if (xx < l) l = xx; if (xx > rr) rr = xx; if (y < t) t = y; if (y > b) b = y; }
      const m = Math.round(c.width * 0.02);
      l = Math.max(0, l - m); t = Math.max(0, t - m); rr = Math.min(c.width - 1, rr + m); b = Math.min(c.height - 1, b + 1);
      const k = px / (b - t + 1), out = document.createElement('canvas');
      out.width = Math.max(1, Math.round((rr - l + 1) * k)); out.height = px;
      const o = out.getContext('2d')!;
      o.imageSmoothingEnabled = !r.species.pixelArt; o.imageSmoothingQuality = 'high';
      o.drawImage(c, l, t, rr - l + 1, b - t + 1, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    });
    pictures.set(key, p);
    p.catch(() => pictures.delete(key));
    if (pictures.size > 200) pictures.delete(pictures.keys().next().value as string);
  }
  return p;
}

/** What a Pixel Pal wears, as two pixel layers: behind it (wings, capes) and in front (null: nothing drawn). */
export interface Outfit { back: HTMLCanvasElement | null; front: HTMLCanvasElement | null }
const outfits = new Map<string, Promise<Outfit | null>>();
export function outfitSprite(r: SpriteRequest): Promise<Outfit | null> {
  const worn = Object.fromEntries(Object.entries(r.equipped ?? {}).filter(([slot, v]) => v && slot !== 'background' && slot !== 'trail'));
  if (!Object.keys(worn).length) return Promise.resolve(null);
  const key = `${r.species.id}|${r.stage}|${JSON.stringify(worn)}`;
  let p = outfits.get(key);
  if (!p) {
    p = (async () => {
      const [{ renderToStaticMarkup }, { IllustratedCreature }] = await Promise.all([import('react-dom/server'), import('./Illustrated')]);
      const layer = async (bare: 'back' | 'front') => {
        const svg = renderToStaticMarkup(createElement(IllustratedCreature, { sp: r.species, stage: r.stage, equipped: worn, noShadow: true, effects: false, bare }))
          .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${SPRITE_W * SUPER}" height="${SPRITE_H * SUPER}" `);
        const d = downsample(await rasterise(svg));
        if (!d.cover.some((c) => c >= 0.3)) return null;
        // a Pixel Pal's head is only a dozen pixels wide, so worn things keep their thin lines (glasses frames)
        return canvasOf(toPixels(d.rgb, d.cover, null, 0.3).px);
      };
      const [back, front] = await Promise.all([layer('back'), layer('front')]);
      return back || front ? { back, front } : null;
    })();
    outfits.set(key, p);
    p.catch(() => outfits.delete(key));
  }
  return p;
}

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
  const hrefs = [...new Set([...svg.matchAll(/href="([^"]+\.(?:webp|png))"/g)].map((m) => m[1]))];
  for (const h of hrefs) svg = svg.split(`href="${h}"`).join(`href="${await inline(h)}"`);
  const w = SPRITE_W * SUPER, h = SPRITE_H * SUPER;
  return svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" `);
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { void img.decode().catch(() => undefined).then(() => res(img)); };
    img.onerror = () => rej(new Error('could not draw the creature'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Share of a drawing that is solid (sampled), to tell a drawn creature from an empty frame. */
function solidShare(d: ImageData): number {
  let n = 0, all = 0;
  for (let k = 3; k < d.data.length; k += 4 * 7) { all++; if (d.data[k] > 128) n++; }
  return all ? n / all : 0;
}
const MIN_SOLID = 0.02;

/** Tests can make the first draws of every creature come out empty (as some Macs do), to check the retries. */
const fault = () => (import.meta.env.DEV ? Number((globalThis as { __ccPixelFault?: number }).__ccPixelFault ?? 0) : 0);

// a few creatures at a time: drawing a whole class at once can leave the painting decoder behind
let active = 0;
const waiting: (() => void)[] = [];
async function inTurn<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 4) await new Promise<void>((r) => waiting.push(r));
  active++;
  try { return await fn(); } finally { active--; waiting.shift()?.(); }
}

/**
 * Draw the creature's SVG (its painting embedded as a data URL) at 4× sprite size. `painted`: the drawing must
 * contain the painting. On some computers (macOS with GPU drawing) the painting inside an SVG image is decoded a
 * moment after the image loads, and the first draw comes out empty: then we wait, draw again, and in the end
 * load the image afresh. Still empty after that: the sprite fails and the painted creature is shown instead.
 */
async function rasterise(svg: string, painted = false): Promise<ImageData> {
  const c = document.createElement('canvas');
  c.width = SPRITE_W * SUPER; c.height = SPRITE_H * SUPER;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.imageSmoothingQuality = 'high';
  let drawsLeftEmpty = painted ? fault() : 0;
  const draw = (img: HTMLImageElement) => {
    x.clearRect(0, 0, c.width, c.height);
    if (drawsLeftEmpty-- <= 0) x.drawImage(img, 0, 0, c.width, c.height);
    return x.getImageData(0, 0, c.width, c.height);
  };
  if (!painted) return draw(await loadSvg(svg));
  return inTurn(async () => {
    let img = await loadSvg(svg);
    let data = draw(img);
    const pause = (ms: number) => new Promise<void>((r) => setTimeout(() => requestAnimationFrame(() => r()), ms));
    for (const [ms, fresh] of [[30, false], [120, false], [250, true], [500, false]] as const) {
      if (solidShare(data) >= MIN_SOLID) return data;
      await pause(ms);
      if (fresh) img = await loadSvg(svg);
      data = draw(img);
    }
    if (solidShare(data) < MIN_SOLID) throw new Error('the creature painting did not draw');
    return data;
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
/** `keep`: how much of a sprite pixel must be covered to draw it (lower keeps thin lines, like glasses frames) */
function toPixels(rgb: Float32Array, cover: Float32Array, palette: RGB[] | null, keep = 0.5): { px: Uint8ClampedArray; palette: RGB[] } {
  const W = SPRITE_W, H = SPRITE_H, N = W * H;
  const solid = new Uint8Array(N);
  for (let k = 0; k < N; k++) solid[k] = cover[k] >= keep ? 1 : 0;
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

/** Breathing in, the way sprites are animated by hand: rows above the chest rise a pixel, the chest row repeats. */
function inhale(px: Uint8ClampedArray, chest: number): Uint8ClampedArray {
  const W = SPRITE_W, out = px.slice();
  for (let y = 0; y < chest; y++) out.set(px.subarray((y + 1) * W * 4, (y + 2) * W * 4), y * W * 4);
  return out;
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

// a computer where no painting ever draws (after several creatures in a row) stops trying: painted creatures stand in
let drawn = 0, failedInRow = 0;
async function make(r: SpriteRequest): Promise<PixelSprite> {
  if (!drawn && failedInRow >= 3) throw new Error('pixel sprites cannot be drawn on this computer');
  const [openSvg, shutSvg] = await Promise.all([svgMarkup(r, false), svgMarkup(r, true)]);
  let openBig: ImageData, shutBig: ImageData;
  try {
    // the open frame first: if it cannot be drawn there is no point drawing the blink frame
    openBig = await rasterise(openSvg, true);
    shutBig = await rasterise(shutSvg, true);
  } catch (e) {
    failedInRow++;
    throw e;
  }
  drawn++; failedInRow = 0;
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
  // the chest: a little below the middle of eyes-to-feet
  const chest = Math.max(top + 2, Math.min(bottom - 3, Math.round(ey + (bottom - ey) * 0.45)));
  const sprite: PixelSprite = {
    open, shut, openUrl: open.toDataURL(), shutUrl: shut.toDataURL(),
    openIn: canvasOf(inhale(a.px, chest)), shutIn: canvasOf(inhale(b.px, chest)),
    box: { left, right, top, bottom },
    eye: [Math.round(ex), Math.round(ey)],
    mouth: [Math.round(ex + gap * 0.9), Math.round(ey + gap * 0.7)],
  };
  ready.set(spriteKey(r), sprite);
  return sprite;
}
