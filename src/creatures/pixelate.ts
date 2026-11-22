/**
 * Turn an SVG drawing into pixel art at any size, the way the creature sprites are made (pixelSprite.ts):
 * draw it 4× larger, average each 4 × 4 block (alpha weighted), keep the solid blocks, reduce to a median-cut
 * palette with a little extra saturation, and add a one-pixel selective outline. Used for the bosses and their
 * statues in Pixel mode.
 */
type RGB = [number, number, number];
const SUPER = 4;

function rasterise(svg: string, w: number, h: number): Promise<ImageData> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w * SUPER; c.height = h * SUPER;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, c.width, c.height);
      res(x.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = () => rej(new Error('could not draw the picture'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

const punch = ([r, g, b]: RGB): RGB => {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const f = (v: number) => Math.max(0, Math.min(255, ((l + (v - l) * 1.15) - 128) * 1.05 + 128));
  return [f(r), f(g), f(b)];
};

function medianCut(cols: RGB[], n: number): RGB[] {
  if (!cols.length) return [];
  let boxes: RGB[][] = [cols];
  while (boxes.length < n) {
    let bi = -1, best = -1, axis = 0;
    boxes.forEach((bx, i) => {
      if (bx.length < 2) return;
      for (let a = 0; a < 3; a++) {
        let lo = 255, hi = 0;
        for (const c of bx) { if (c[a] < lo) lo = c[a]; if (c[a] > hi) hi = c[a]; }
        const range = (hi - lo) * Math.sqrt(bx.length);
        if (range > best) { best = range; bi = i; axis = a; }
      }
    });
    if (bi < 0 || best <= 0) break;
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
    const d = 2 * (q[0] - c[0]) ** 2 + 4 * (q[1] - c[1]) ** 2 + 3 * (q[2] - c[2]) ** 2;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

export interface PixelOptions {
  colors?: number;
  /** recolour every pixel from its brightness (a statue in stone) */
  ramp?: string[];
}

/** Pixel art of `svg` (any viewBox; it is drawn into w × h) as a canvas. */
export async function pixelateSvg(svg: string, w: number, h: number, o: PixelOptions = {}): Promise<HTMLCanvasElement> {
  const sized = svg.replace(/<svg /, `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SUPER}" height="${h * SUPER}" `);
  const big = await rasterise(sized, w, h);
  const N = w * h, d = big.data, BW = big.width;
  const rgb = new Float32Array(N * 3), cover = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < SUPER; j++) for (let i = 0; i < SUPER; i++) {
      const k = ((y * SUPER + j) * BW + x * SUPER + i) * 4, al = d[k + 3] / 255;
      r += d[k] * al; g += d[k + 1] * al; b += d[k + 2] * al; a += al;
    }
    const k = y * w + x;
    cover[k] = a / (SUPER * SUPER);
    if (a > 0) { rgb[k * 3] = r / a; rgb[k * 3 + 1] = g / a; rgb[k * 3 + 2] = b / a; }
  }
  const solid = new Uint8Array(N);
  for (let k = 0; k < N; k++) solid[k] = cover[k] >= 0.45 ? 1 : 0;
  const cols: RGB[] = [];
  for (let k = 0; k < N; k++) if (solid[k]) cols.push(punch([rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]]));
  const pal = medianCut(cols, o.colors ?? 20);
  const ramp = o.ramp?.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as RGB);
  const px = new Uint8ClampedArray(N * 4);
  for (let k = 0; k < N; k++) {
    if (!solid[k]) continue;
    let c = nearest(pal, punch([rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]]));
    if (ramp) { const l = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; c = ramp[Math.min(ramp.length - 1, Math.floor(l * ramp.length))]; }
    px[k * 4] = c[0]; px[k * 4 + 1] = c[1]; px[k * 4 + 2] = c[2]; px[k * 4 + 3] = 255;
  }
  const out = px.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    if (solid[k]) continue;
    let nb = -1;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && solid[Y * w + X]) { nb = Y * w + X; break; } }
    if (nb < 0) continue;
    out[k * 4] = px[nb * 4] * 0.28 + 12; out[k * 4 + 1] = px[nb * 4 + 1] * 0.24 + 10; out[k * 4 + 2] = px[nb * 4 + 2] * 0.3 + 22; out[k * 4 + 3] = 255;
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.putImageData(new ImageData(out, w, h), 0, 0);
  return c;
}
