/**
 * Pixel-art places for creature backgrounds, painted once at 96×72 on a canvas and cached as images.
 * Drawn from code so they stay crisp and tiny; shown with image-rendering: pixelated.
 */
type Ctx = CanvasRenderingContext2D;
const W = 96, H = 72;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const px = (c: Ctx, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function disc(c: Ctx, cx: number, cy: number, r: number, col: string) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(c, cx + x, cy + y, col);
}
/** Banded sky with a 2-pixel ordered dither between bands. */
function sky(c: Ctx, bands: string[], to = H) {
  const bh = to / bands.length;
  bands.forEach((col, i) => {
    rect(c, 0, i * bh, W, bh + 1, col);
    if (i > 0) for (let x = 0; x < W; x++) if ((x + i) % 2 === 0) px(c, x, i * bh, bands[i - 1]);
  });
}
function hill(c: Ctx, base: number, amp: number, freq: number, phase: number, col: string, top?: string) {
  for (let x = 0; x < W; x++) {
    const y = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * freq + phase)) - amp * 0.3 * Math.sin(x * freq * 2.3 + phase * 1.7));
    rect(c, x, y, 1, H - y, col);
    if (top) px(c, x, y, top);
  }
}
function cloud(c: Ctx, x: number, y: number, s: number) {
  disc(c, x, y, 3 * s, '#ffffff'); disc(c, x + 4 * s, y - 1, 4 * s, '#ffffff'); disc(c, x + 9 * s, y, 3 * s, '#ffffff');
  rect(c, x - 2 * s, y + 1, 13 * s, 2 * s, '#ffffff');
  for (let i = 0; i < 12 * s; i++) px(c, x - 2 * s + i, y + 3 * s - 0, '#d8eefc');
}
function tree(c: Ctx, x: number, base: number, h: number, dark: string, mid: string, light: string) {
  rect(c, x - 1, base - h * 0.45, 3, h * 0.45, '#6b3a1f'); px(c, x + 1, base - h * 0.3, '#8a5530');
  const r = Math.round(h * 0.32);
  disc(c, x, base - h * 0.62, r, dark); disc(c, x - 1, base - h * 0.66, r - 1, mid); disc(c, x - 2, base - h * 0.72, Math.max(1, r - 3), light);
}

function meadow(c: Ctx) {
  const r = rng(11);
  sky(c, ['#7fc8f2', '#96d3f5', '#aedcf7', '#c6e7f9'], 42);
  disc(c, 78, 12, 6, '#ffe066'); disc(c, 78, 12, 4, '#fff3a6');
  cloud(c, 10, 10, 1); cloud(c, 44, 16, 1);
  hill(c, 44, 8, 0.05, 1.2, '#8fcf74', '#a9dd8f');
  hill(c, 52, 6, 0.08, 4.0, '#6fb85a', '#86c96f');
  rect(c, 0, 56, W, 16, '#5aa64e');
  for (let i = 0; i < 140; i++) px(c, r() * W, 52 + r() * 20, r() > 0.5 ? '#4c9443' : '#76c062');
  // fence
  for (let x = 4; x < 40; x += 7) { rect(c, x, 47, 2, 10, '#a0602e'); px(c, x, 47, '#c47d42'); }
  rect(c, 3, 50, 38, 1, '#c47d42'); rect(c, 3, 54, 38, 1, '#a0602e');
  // flowers
  for (let i = 0; i < 26; i++) { const x = r() * W, y = 57 + r() * 13; const col = ['#ff9ccd', '#ffffff', '#ffe066', '#ff6b6b'][i % 4]; px(c, x, y, col); px(c, x, y + 1, '#3e7d2f'); }
}

function forest(c: Ctx) {
  const r = rng(23);
  sky(c, ['#9ed8c8', '#b6e3d2', '#cdebd9'], 30);
  for (let i = 0; i < 7; i++) tree(c, 6 + i * 14 + (i % 2) * 3, 46, 30, '#2f6b3a', '#3e8a47', '#5aa65a');
  rect(c, 0, 44, W, 28, '#4a8a3c');
  for (let i = 0; i < 9; i++) tree(c, 2 + i * 11 + (i % 3) * 2, 60, 38, '#255a30', '#33763d', '#4c9a4c');
  rect(c, 0, 58, W, 14, '#3e7a34');
  for (let i = 0; i < 120; i++) px(c, r() * W, 58 + r() * 14, r() > 0.5 ? '#356d2d' : '#5a9a48');
  // mushrooms
  for (const [x, y, s] of [[18, 64, 3], [26, 66, 2], [70, 63, 3], [80, 66, 2]] as const) {
    rect(c, x - 0, y - s, 2, s + 1, '#f3e6cf');
    for (let dx = -s - 1; dx <= s + 2; dx++) rect(c, x + dx, y - s - 2 + Math.abs(dx - 0.5) * 0.4, 1, 2, '#d8342c');
    px(c, x - 1, y - s - 2, '#ffffff'); px(c, x + 2, y - s - 1, '#ffffff');
  }
  for (let i = 0; i < 14; i++) px(c, r() * W, 20 + r() * 34, '#fff36b');
}

function beach(c: Ctx) {
  const r = rng(31);
  sky(c, ['#6ec2f0', '#8bd0f4', '#a8ddf7', '#c4e9fa'], 34);
  cloud(c, 58, 9, 1);
  disc(c, 16, 10, 5, '#fff3a6');
  sky; // sea bands
  for (let y = 34; y < 50; y++) rect(c, 0, y, W, 1, y < 38 ? '#3aa0d8' : y < 44 ? '#2e8bc4' : '#2a7db4');
  for (let i = 0; i < 40; i++) { const x = r() * W, y = 35 + r() * 14; rect(c, x, y, 3, 1, '#bde8fb'); }
  for (let x = 0; x < W; x++) { const y = 50 + Math.round(Math.sin(x * 0.3) * 1); rect(c, x, y - 1, 1, 2, '#ffffff'); }
  rect(c, 0, 51, W, 21, '#f3dca2');
  for (let i = 0; i < 120; i++) px(c, r() * W, 52 + r() * 20, r() > 0.5 ? '#e5c788' : '#fbe9bd');
  // shells
  for (const [x, y] of [[20, 63], [44, 67], [66, 61]] as const) { px(c, x, y, '#ff9ccd'); px(c, x + 1, y, '#ffc7e2'); px(c, x, y - 1, '#ffc7e2'); }
  // palm
  for (let i = 0; i < 26; i++) rect(c, 80 + Math.sin(i * 0.12) * 3, 66 - i, 2, 1, i % 4 === 0 ? '#7a4b2a' : '#a0602e');
  const top = 40;
  for (const [dx, dy] of [[-10, 3], [-6, -2], [0, -4], [6, -2], [10, 3]] as const) {
    for (let k = 0; k <= 8; k++) px(c, 81 + (dx * k) / 8, top + (dy * k) / 8 + (k * k) / 14, k % 2 ? '#3e9d3a' : '#5abf4f');
  }
}

function cave(c: Ctx) {
  const r = rng(47);
  sky(c, ['#1b1032', '#24143f', '#2d1a4d', '#36205a'], H);
  // stalactites
  for (let x = 2; x < W; x += 6 + Math.floor(r() * 5)) { const h = 4 + r() * 10; for (let y = 0; y < h; y++) rect(c, x + y * 0.15, y, Math.max(1, 4 - y * 0.35), 1, '#4a2f6e'); }
  rect(c, 0, 58, W, 14, '#2a1a40');
  for (let i = 0; i < 80; i++) px(c, r() * W, 58 + r() * 14, '#3b2558');
  // crystals
  const crystal = (x: number, base: number, h: number, a: string, b: string) => {
    for (let y = 0; y < h; y++) { const w = Math.max(1, Math.round((h - y) / h * 5)); rect(c, x - w / 2, base - y, w, 1, y % 3 === 0 ? b : a); }
    px(c, x, base - h, '#ffffff');
  };
  crystal(14, 64, 16, '#7fd6ff', '#c6efff'); crystal(22, 66, 10, '#5ab8f0', '#a6e3ff');
  crystal(74, 63, 18, '#c46bff', '#efc6ff'); crystal(84, 66, 11, '#a14ee0', '#dca8ff'); crystal(48, 67, 7, '#ff7ac8', '#ffd1ea');
  for (let i = 0; i < 24; i++) px(c, r() * W, 14 + r() * 40, r() > 0.5 ? '#c6efff' : '#efc6ff');
}

function village(c: Ctx) {
  const r = rng(59);
  sky(c, ['#141d3a', '#1c2a4f', '#253766', '#2f457c'], 50);
  for (let i = 0; i < 36; i++) px(c, r() * W, r() * 34, r() > 0.7 ? '#fff6c4' : '#b6c8f2');
  disc(c, 80, 11, 5, '#f5f0d8'); disc(c, 82, 10, 4, '#253766');
  // rooftops
  const house = (x: number, w: number, base: number, roof: string) => {
    rect(c, x, base - 12, w, 12, '#3a2a4a');
    for (let k = 0; k < w / 2 + 2; k++) rect(c, x - 1 + k, base - 13 - k * 0.8, w + 2 - k * 2, 1, roof);
    rect(c, x + 2, base - 9, 3, 3, '#ffc94a'); if (w > 10) rect(c, x + w - 5, base - 9, 3, 3, '#ffc94a');
    rect(c, x + Math.floor(w / 2) - 1, base - 5, 3, 5, '#6b3a1f');
  };
  house(4, 14, 56, '#8a3a4a'); house(24, 12, 58, '#4a5a8a'); house(42, 16, 55, '#7a5a2a'); house(64, 12, 58, '#8a3a4a'); house(80, 14, 56, '#4a6a5a');
  rect(c, 0, 58, W, 14, '#2a3a2a');
  for (let i = 0; i < 70; i++) px(c, r() * W, 58 + r() * 14, '#344a34');
  // lantern string
  for (let x = 0; x < W; x++) { const y = Math.round(36 + Math.sin(x * 0.07) * 3 + (x % 24) * 0); px(c, x, y, '#5a4a3a'); if (x % 9 === 4) { rect(c, x - 1, y + 1, 3, 3, '#ffb347'); px(c, x, y + 2, '#fff1cc'); } }
}

const PAINTERS: Record<string, (c: Ctx) => void> = {
  'bg-pixel-meadow': meadow, 'bg-pixel-forest': forest, 'bg-pixel-beach': beach, 'bg-pixel-cave': cave, 'bg-pixel-village': village,
};
const cache = new Map<string, string>();

export function isPixelScene(id: string | undefined): boolean {
  return !!id && id in PAINTERS;
}

/** Data URL of a pixel scene (painted on first use, then cached). */
export function pixelScene(id: string): string | null {
  const paint = PAINTERS[id];
  if (!paint || typeof document === 'undefined') return null;
  let url = cache.get(id);
  if (!url) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    if (!c) return null;
    paint(c);
    url = cv.toDataURL('image/png');
    cache.set(id, url);
  }
  return url;
}
