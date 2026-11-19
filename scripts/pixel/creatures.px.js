// The Pixel Pals: ten original creatures drawn as pixel art from the start (one per element), each in five
// evolution stages, each with six animations made from its body parts: idle (breathing, tail and ears), blink,
// happy hop, attack, sleep and hurt. Frames are 64 × 66 (62 × 64 drawn, plus the outline).
// Build: npm run art:creatures (claude-pxl, then scripts/pixel/pack-creatures.py makes the sheets).

const FW = 62, FH = 64, CX = 30, FY = 60
const STAGE_K = [0.5, 0.62, 0.75, 0.88, 1]
const HEAD_K = [1.45, 1.3, 1.18, 1.07, 1]
const EYE = { w: [2, 2, 3, 3, 3], h: [3, 3, 3, 4, 4] }
const ANIMS = { idle: 8, blink: 8, happy: 8, attack: 8, sleep: 4, hurt: 4 }
const FPS = { idle: 7, blink: 7, happy: 10, attack: 9, sleep: 3, hurt: 8 }

/** Body pose for one frame of one animation (everything is in pixels of the 62 × 64 frame). */
function poseFor(anim, f, k, floaty) {
  const n = ANIMS[anim], t = f / n, w = Math.sin(t * Math.PI * 2)
  const p = { cx: CX, fy: FY, sx: k, sy: k, dx: 0, dy: 0, headDy: 0, breath: 0, tail: 0, ear: 0, wing: 0, eyes: 'open', mouth: 'closed', leg: 0, k }
  if (anim === 'idle' || anim === 'blink') {
    p.breath = w > 0.15 ? 1 : 0
    p.headDy = -p.breath
    p.tail = Math.sin(t * Math.PI * 2 + 0.6)
    p.ear = f === 5 || f === 6 ? 1 : 0
    p.wing = w
    if (floaty) p.dy = Math.round(Math.sin(t * Math.PI * 2) * 1.6)
    if (anim === 'blink') p.eyes = 'shut'
  } else if (anim === 'happy') {
    const dy = [0, 1, -3, -6, -7, -5, -1, 1], sy = [1, 0.86, 1.1, 1.05, 1, 1.03, 0.88, 0.96], sx = [1, 1.1, 0.93, 0.96, 1, 0.97, 1.1, 1.03]
    p.dy = dy[f]; p.sx = k * sx[f]; p.sy = k * sy[f]
    p.eyes = 'happy'; p.mouth = 'smile'; p.tail = Math.sin(t * Math.PI * 4); p.wing = Math.sin(t * Math.PI * 4); p.ear = f % 2
  } else if (anim === 'attack') {
    const dx = [0, -2, -3, 3, 4, 3, 1, 0], sy = [1, 0.97, 0.93, 0.98, 1, 1, 1, 1], sx = [1, 1.02, 1.05, 1.06, 1.02, 1, 1, 1]
    p.dx = dx[f]; p.sx = k * sx[f]; p.sy = k * sy[f]
    p.eyes = f >= 1 && f <= 5 ? 'narrow' : 'open'; p.mouth = f >= 3 && f <= 5 ? 'open' : 'closed'
    p.tail = f < 3 ? -1 : 1; p.leg = f >= 3 && f <= 5 ? 1 : 0; p.wing = f < 3 ? -1 : 1; p.ear = f >= 1 && f <= 5 ? -1 : 0
  } else if (anim === 'sleep') {
    p.breath = [0, 1, 1, 0][f]; p.headDy = 1; p.eyes = 'shut'; p.tail = 0.4; p.wing = -0.6
    if (floaty) p.dy = 1 + p.breath
  } else if (anim === 'hurt') {
    const dx = [0, -2, -1, 0], sy = [0.82, 0.92, 1.04, 1], sx = [1.14, 1.06, 0.98, 1]
    p.dx = dx[f]; p.sx = k * sx[f]; p.sy = k * sy[f]; p.eyes = f < 3 ? 'x' : 'open'; p.mouth = f < 2 ? 'open' : 'closed'; p.tail = -0.5; p.ear = -1
  }
  return p
}

/** Drawing helpers bound to a pose: design coordinates (adult size, feet at FY) → frame pixels. */
function kit(c, p) {
  const X = (x) => p.cx + (x - p.cx) * p.sx + p.dx
  const Y = (y) => p.fy - (p.fy - y) * p.sy + p.dy
  const r = Math.round
  const E = (x, y, rx, ry, col) => c.ellipse(r(X(x)), r(Y(y)), Math.max(1, r(rx * p.sx)), Math.max(1, r(ry * p.sy)), col)
  const PL = (pts, col) => c.poly(pts.map((v, i) => (i % 2 ? Y(v) : X(v))), col)
  const L = (x0, y0, x1, y1, col, wd = 1) => c.line(r(X(x0)), r(Y(y0)), r(X(x1)), r(Y(y1)), col, Math.max(1, r(wd * p.sx)))
  const PX = (x, y, col) => c.px(r(X(x)), r(Y(y)), col)
  /** a shaded blob: shade underneath, the base colour up-left, a light spot */
  const blob = (x, y, rx, ry, s = 's', a = 'a', l = 'l') => {
    E(x, y, rx, ry, s)
    E(x - rx * 0.1, y - ry * 0.12, rx * 0.88, ry * 0.84, a)
    if (rx * p.sx > 3.5) E(x - rx * 0.36, y - ry * 0.42, rx * 0.34, ry * 0.28, l)
  }
  /** a limb as a thick line from (x0, y0) to (x1, y1) with a paw */
  const limb = (x0, y0, x1, y1, wd, col, paw) => { L(x0, y0, x1, y1, col, wd); if (paw) E(x1, y1, wd * 0.6, wd * 0.4, paw) }
  /** a tapering curve (tails, tentacles, wisps) through control points */
  const curve = (pts, w0, w1, col) => {
    const n = 18
    for (let i = 0; i <= n; i++) {
      const t = i / n, seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), lt = t * (pts.length - 1) - seg
      const x = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * lt, y = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * lt
      E(x, y, (w0 + (w1 - w0) * t) / 2, (w0 + (w1 - w0) * t) / 2, col)
    }
  }
  return { X, Y, E, PL, L, PX, blob, limb, curve, r }
}

/** Eyes and mouth, drawn at the final pixel size so they stay crisp whatever the body does. */
function face(c, h, p, st, { near, far, mouth, blush = true }) {
  const ew = EYE.w[st - 1], eh = EYE.h[st - 1]
  const eye = ([x, y], small) => {
    const X = Math.round(h.X(x)), Y = Math.round(h.Y(y)), w = small ? Math.max(1, ew - 1) : ew
    if (p.eyes === 'open') { c.rect(X, Y, w, eh, 'o'); c.px(X, Y, 'w'); if (eh >= 4 && w >= 3) c.px(X + 1, Y + eh - 1, 'v') }
    else if (p.eyes === 'shut') c.hline(X - (small ? 0 : 1) + (small ? 0 : 0), Y + eh - 1, w + 1, 'o')
    else if (p.eyes === 'happy') { c.px(X, Y + 1, 'o'); c.hline(X + 1, Y, Math.max(1, w - 1), 'o'); c.px(X + w, Y + 1, 'o') }
    else if (p.eyes === 'narrow') { c.hline(X, Y + 1, w + 1, 'o'); c.hline(X, Y + 2, w, 'o'); c.px(X + (small ? w : 0), Y, 'o') }
    else if (p.eyes === 'x') { c.px(X, Y, 'o'); c.px(X + 2, Y, 'o'); c.px(X + 1, Y + 1, 'o'); c.px(X, Y + 2, 'o'); c.px(X + 2, Y + 2, 'o') }
  }
  eye(far, true); eye(near, false)
  if (blush && p.eyes !== 'x') { c.px(Math.round(h.X(near[0] + 1)), Math.round(h.Y(near[1])) + eh + 1, 'p'); c.px(Math.round(h.X(near[0] + 2)), Math.round(h.Y(near[1])) + eh + 1, 'p') }
  const mx = Math.round(h.X(mouth[0])), my = Math.round(h.Y(mouth[1]))
  if (p.mouth === 'open') { c.rect(mx - 1, my, 3, 2, 'm'); c.px(mx, my + 1, 'p') }
  else if (p.mouth === 'smile') { c.px(mx - 1, my, 'm'); c.hline(mx, my + 1, 2, 'm'); c.px(mx + 2, my, 'm') }
  else c.hline(mx, my, 2, 'm')
}

/* ─────────────────────── the ten species ─────────────────────── */
// Every species: palette keys k outline · s shade · a base · l light · d belly · x dark accent · e accent ·
// f bright accent · o eye · w eye shine · v eye glint · m mouth · p blush · n paws/feet

const SPECIES = {}

// FIRE · Blazard: a salamander whose tail tip is a living flame. Grows a frill, then little dragon wings.
SPECIES.blazard = {
  pal: { k: '#3a1420', s: '#b8382e', a: '#e8603a', l: '#ff9a5c', d: '#ffd08a', x: '#c2341a', e: '#ffae2e', f: '#fff27a', n: '#8a2a22' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1]
    const tw = p.tail * 3
    // tail with its flame
    h.curve([[16, 49], [9, 47 + tw * 0.3], [5, 41 + tw * 0.6], [6, 34 + tw]], 6, 3, 's')
    h.curve([[16, 48], [10, 46 + tw * 0.3], [6, 40 + tw * 0.6], [6.5, 34 + tw]], 4, 2, 'a')
    const fx = 6 + tw * 0.4, fy = 31 + tw
    h.E(fx, fy, 3, 5, 'x'); h.E(fx, fy + 1, 2, 3.5, 'e'); h.E(fx, fy + 2, 1, 2, 'f')
    // far legs, body, near legs
    h.limb(19, 50, 18 + p.leg, 59, 3.5, 'n'); h.limb(33, 50, 34 + p.leg * 2, 59, 3.5, 'n')
    h.blob(26, 49 + p.breath * 0.4, 13, 7 + p.breath * 0.6)
    h.E(27, 53, 9, 2.5, 'd')
    if (st >= 3) for (let i = 0; i < st - 1; i++) h.PL([16 + i * 4, 43, 18 + i * 4, 37 - (i % 2) * 2, 20 + i * 4, 43], i % 2 ? 'e' : 'x')
    if (st >= 5) { const wy = p.wing * 2; h.PL([20, 44, 10, 31 + wy, 14, 36 + wy, 18, 33 + wy, 24, 42], 'x'); h.PL([21, 43, 14, 34 + wy, 17, 37 + wy, 23, 42], 'e') }
    h.limb(22, 52, 21 + p.leg, 59, 4, 'a', 'n'); h.limb(35, 52, 37 + p.leg * 2, 59, 4, 'a', 'n')
    // head
    const hx = 39, hy = 41 + hd, R = 7.5 * hk
    if (st >= 3) for (let i = -1; i <= 1; i++) h.PL([hx - R * 0.6, hy - R * 0.2, hx - R * 1.2 + i * 2, hy - R * 0.9 + i * 4 - 2, hx - R * 0.2, hy - R * 0.5], 'e')
    h.blob(hx, hy, R, R * 0.9)
    h.E(hx + R * 0.75, hy + R * 0.25, R * 0.55, R * 0.4, 'a'); h.E(hx + R * 0.8, hy + R * 0.38, R * 0.4, R * 0.2, 'd')
    h.PX(hx + R * 1.15, hy + R * 0.05, 'x')
    if (st === 5) h.PL([hx - 2, hy - R * 0.9, hx, hy - R * 1.5, hx + 2, hy - R * 0.9], 'f')
    face(c, h, p, st, { near: [hx + R * 0.2, hy - R * 0.35], far: [hx - R * 0.42, hy - R * 0.38], mouth: [hx + R * 0.7, hy + R * 0.45] })
  },
}

// WATER · Otterpop: a sleek otter with a paddle tail. Grows a fin crest, then a mane of waves.
SPECIES.otterpop = {
  pal: { k: '#13233a', s: '#2a6f9e', a: '#3f96c8', l: '#7cc7ee', d: '#e6f4ff', x: '#1f5a8a', e: '#5fd0e8', f: '#d0fbff', n: '#24527a' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1], tw = p.tail * 2
    h.curve([[17, 50], [10, 53 + tw * 0.4], [5, 52 + tw]], 7, 5, 's')
    h.E(5, 52 + tw, 3.5, 2.5, 'x')
    h.limb(20, 51, 19, 59, 3.5, 'n'); h.limb(34, 51, 35 + p.leg * 2, 59, 3.5, 'n')
    h.blob(27, 49 + p.breath * 0.4, 13, 7.5 + p.breath * 0.6)
    h.E(29, 53, 10, 3, 'd')
    if (st >= 3) h.PL([18, 43, 22, 36 - st, 26, 42], 'e')
    if (st >= 4) h.PL([24, 42, 29, 34 - st, 32, 42], 'e')
    h.limb(23, 53, 22, 59, 4, 'a', 'n'); h.limb(36, 53, 38 + p.leg * 2, 59, 4, 'a', 'n')
    const hx = 39, hy = 40 + hd, R = 7.5 * hk
    if (st === 5) for (let i = 0; i < 4; i++) h.E(hx - R * 0.9 + i * 0.5, hy - R * 0.5 + i * 2.6, 2.5, 2, i % 2 ? 'e' : 'f')
    h.blob(hx, hy, R, R * 0.92)
    h.E(hx - R * 0.55, hy - R * 0.8, R * 0.28, R * 0.24, 's'); h.E(hx + R * 0.35, hy - R * 0.85, R * 0.26, R * 0.22, 's')
    h.E(hx + R * 0.55, hy + R * 0.32, R * 0.6, R * 0.42, 'd')
    h.PX(hx + R * 1.0, hy + R * 0.12, 'k')
    h.L(hx + R * 0.9, hy + R * 0.42, hx + R * 1.5, hy + R * 0.3, 'f'); h.L(hx + R * 0.9, hy + R * 0.55, hx + R * 1.5, hy + R * 0.62, 'f')
    face(c, h, p, st, { near: [hx + R * 0.15, hy - R * 0.32], far: [hx - R * 0.45, hy - R * 0.34], mouth: [hx + R * 0.6, hy + R * 0.55] })
  },
}

// NATURE · Mossling: a round hedgehog with leaf spines. Spines grow, then flowers bloom on its back.
SPECIES.mossling = {
  pal: { k: '#1d2b17', s: '#3c7a34', a: '#5fa845', l: '#9ad66a', d: '#f0d9a8', x: '#2c5e2a', e: '#7cc95a', f: '#ff8fb1', n: '#7a5a3a' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1]
    h.limb(21, 52, 20, 59, 3.5, 'n'); h.limb(33, 52, 34 + p.leg * 2, 59, 3.5, 'n')
    // leaf spines fan around the back
    const n = 5 + st
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.95 + (i / (n - 1)) * 0.95) + p.tail * 0.05, x0 = 26 + Math.cos(a) * 8, y0 = 47 + Math.sin(a) * 8
      const len = 6 + st * 0.6
      h.PL([x0 - 2, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, x0 + 2, y0 + 1], i % 2 ? 'x' : 'e')
    }
    h.blob(26, 48 + p.breath * 0.4, 12, 9 + p.breath * 0.6)
    h.E(31, 53, 7, 3, 'd')
    if (st >= 4) for (const [fx, fy] of st === 5 ? [[18, 38], [26, 35], [33, 38]] : [[22, 37], [30, 37]]) { h.E(fx, fy, 2, 2, 'f'); h.PX(fx, fy, 'f'); h.PX(fx, fy, 'd') }
    h.limb(24, 54, 23, 59, 4, 'a', 'n'); h.limb(35, 54, 37 + p.leg * 2, 59, 4, 'a', 'n')
    const hx = 37, hy = 44 + hd, R = 6.8 * hk
    h.blob(hx, hy, R, R * 0.9, 's', 'd', 'h')
    h.E(hx + R * 0.8, hy + R * 0.25, R * 0.4, R * 0.32, 'd'); h.PX(hx + R * 1.15, hy + R * 0.15, 'k')
    h.PL([hx - R * 0.9, hy - R * 0.4, hx - R * 0.5, hy - R * 1.25 - p.ear, hx - R * 0.1, hy - R * 0.6], 'e')
    face(c, h, p, st, { near: [hx + R * 0.15, hy - R * 0.3], far: [hx - R * 0.42, hy - R * 0.32], mouth: [hx + R * 0.6, hy + R * 0.45] })
  },
}

// ELECTRIC · Boltbat: a hamster-bat with zigzag ears and wing arms that crackle. Stands on two feet.
SPECIES.boltbat = {
  pal: { k: '#2a2010', s: '#d39a1a', a: '#f5c83a', l: '#ffe680', d: '#fff4cc', x: '#3a3a6a', e: '#6a6ad8', f: '#bfe8ff', n: '#a86a10' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1], wg = p.wing * 3
    // wings (behind), lightning tail
    const wingSpan = 8 + st * 2.2
    for (const s of [-1, 1]) h.PL([30, 40, 30 + s * wingSpan, 30 + wg, 30 + s * wingSpan * 0.8, 40 + wg, 30 + s * wingSpan * 0.55, 37 + wg, 30 + s * wingSpan * 0.4, 45], 'x')
    for (const s of [-1, 1]) h.PL([30, 41, 30 + s * wingSpan * 0.85, 32 + wg, 30 + s * wingSpan * 0.65, 39 + wg, 30 + s * wingSpan * 0.35, 43], 'e')
    h.PL([22, 50, 16, 47 + p.tail * 2, 18, 45 + p.tail * 2, 12, 41 + p.tail * 3, 19, 44 + p.tail * 2, 17, 46 + p.tail * 2], 'f')
    h.blob(30, 49 + p.breath * 0.4, 9, 9 + p.breath * 0.6)
    h.E(31, 51, 6, 6, 'd')
    h.limb(26, 56, 25, 60, 3.5, 'n'); h.limb(34, 56, 35 + p.leg, 60, 3.5, 'n')
    const hx = 31, hy = 37 + hd, R = 7.8 * hk
    // zigzag ears
    for (const s of [-1, 1]) {
      const ex = hx + s * R * 0.55, eu = p.ear * s * 1.5
      h.PL([ex - 2.5, hy - R * 0.6, ex - 1 + eu, hy - R * 1.6, ex + 1 + eu, hy - R * 1.25, ex + 2.5 + eu, hy - R * 2.0, ex + 2.5, hy - R * 0.6], 's')
      h.PL([ex - 1, hy - R * 0.7, ex + eu, hy - R * 1.45, ex + 1.5, hy - R * 0.7], 'f')
    }
    h.blob(hx, hy, R, R * 0.88)
    h.E(hx, hy + R * 0.38, R * 0.55, R * 0.35, 'd')
    if (st >= 3) { h.PX(hx - R * 0.95, hy + R * 0.1, 'e'); h.PX(hx + R * 0.95, hy + R * 0.1, 'e') }
    if (st === 5) h.PL([hx - 3, hy - R * 0.8, hx - 1, hy - R * 1.3, hx, hy - R * 0.95, hx + 1, hy - R * 1.4, hx + 3, hy - R * 0.8], 'f')
    face(c, h, p, st, { near: [hx + R * 0.22, hy - R * 0.22], far: [hx - R * 0.5, hy - R * 0.22], mouth: [hx, hy + R * 0.4] })
  },
}

// ICE · Icicub: a chunky polar bear cub with ice crystals growing from its shoulders, then a crown of ice.
SPECIES.icicub = {
  pal: { k: '#1d2a40', s: '#a9c4e0', a: '#e4f0fb', l: '#ffffff', d: '#c8dcf0', x: '#4a86c8', e: '#8fd0f5', f: '#e8fbff', n: '#7f9cbf' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1]
    h.E(15, 46 + p.tail, 3, 2.5, 's')
    h.limb(20, 50, 19, 59, 5, 'n'); h.limb(34, 50, 35 + p.leg * 2, 59, 5, 'n')
    h.blob(27, 48 + p.breath * 0.4, 13, 9 + p.breath * 0.6)
    if (st >= 3) for (let i = 0; i < st - 1; i++) { const x = 19 + i * 4.2, tall = 5 + (i % 2) * 3 + st * 0.6; h.PL([x - 2, 41, x, 41 - tall, x + 2, 41], i % 2 ? 'x' : 'e'); h.L(x, 40, x, 41 - tall + 2, 'f') }
    h.limb(23, 53, 22, 59, 5.5, 'a', 'n'); h.limb(36, 53, 38 + p.leg * 2, 59, 5.5, 'a', 'n')
    const hx = 39, hy = 39 + hd, R = 7.8 * hk
    h.E(hx - R * 0.6, hy - R * 0.72 - p.ear * 0.5, R * 0.3, R * 0.3, 's'); h.E(hx + R * 0.5, hy - R * 0.78, R * 0.28, R * 0.28, 's')
    h.blob(hx, hy, R, R * 0.9)
    h.E(hx + R * 0.55, hy + R * 0.3, R * 0.5, R * 0.38, 'd'); h.E(hx + R * 0.95, hy + R * 0.12, R * 0.17, R * 0.14, 'k')
    if (st === 5) h.PL([hx - 5, hy - R * 0.8, hx - 4, hy - R * 1.45, hx - 2, hy - R * 1.0, hx, hy - R * 1.6, hx + 2, hy - R * 1.0, hx + 4, hy - R * 1.45, hx + 5, hy - R * 0.8], 'e')
    face(c, h, p, st, { near: [hx + R * 0.12, hy - R * 0.28], far: [hx - R * 0.48, hy - R * 0.3], mouth: [hx + R * 0.55, hy + R * 0.5] })
  },
}

// EARTH · Rumbadillo: an armadillo whose shell bands sprout gemstones as it grows.
SPECIES.rumbadillo = {
  pal: { k: '#2a1a10', s: '#8a6a4a', a: '#b48a5e', l: '#d8b483', d: '#f0d6b0', x: '#6a4a30', e: '#d98a3a', f: '#7fe0c8', n: '#5a3e28' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1]
    h.curve([[15, 51], [10, 54 + p.tail], [7, 55 + p.tail * 1.5]], 4, 2, 's')
    h.limb(20, 52, 19, 59, 4, 'n'); h.limb(33, 52, 34 + p.leg * 2, 59, 4, 'n')
    // the domed shell in bands
    h.E(26, 49 + p.breath * 0.4, 14, 10 + p.breath * 0.6, 'x')
    h.E(25.5, 48, 13, 9, 's')
    for (let i = 0; i < 5; i++) h.L(16 + i * 4.4, 41 + Math.abs(i - 2) * 1.5, 16 + i * 4.4, 55, 'x')
    h.E(22, 43, 6, 3, 'a')
    if (st >= 3) for (let i = 0; i < st - 2; i++) { const x = 18 + i * 6, y = 41 - (i === 1 ? 2 : 0); h.PL([x - 2, y + 2, x, y - 3 - st * 0.4, x + 2, y + 2], 'f'); h.PX(x, y - 1, 'd') }
    h.limb(23, 54, 22, 59, 4.5, 'a', 'n'); h.limb(36, 54, 38 + p.leg * 2, 59, 4.5, 'a', 'n')
    const hx = 40, hy = 45 + hd, R = 6.2 * hk
    h.E(hx - R * 0.4, hy - R * 0.9 - p.ear * 0.6, R * 0.25, R * 0.4, 's')
    h.blob(hx, hy, R, R * 0.85, 's', 'a', 'l')
    h.PL([hx + R * 0.6, hy - R * 0.2, hx + R * 1.75, hy + R * 0.25, hx + R * 0.6, hy + R * 0.6], 'a'); h.PX(hx + R * 1.7, hy + R * 0.2, 'k')
    if (st === 5) { h.E(hx - R * 0.1, hy - R * 0.95, 2, 2, 'f'); h.PX(hx - R * 0.1, hy - R * 1.05, 'd') }
    face(c, h, p, st, { near: [hx + R * 0.1, hy - R * 0.3], far: [hx - R * 0.5, hy - R * 0.3], mouth: [hx + R * 0.95, hy + R * 0.48], blush: true })
  },
}

// SHADOW · Wispurr: a ghost kitten that floats on a curling wisp; its ears and tail tips catch violet fire.
SPECIES.wispurr = {
  floaty: true,
  pal: { k: '#160f2a', s: '#4a3a8a', a: '#6c5ab8', l: '#9f8ce0', d: '#c8bdf0', x: '#2e2260', e: '#b06cff', f: '#ffd0ff', n: '#3a2e70' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1], tw = p.tail * 3
    // the wisp: a tapering curl under the body
    h.curve([[30, 50], [25, 55 + tw * 0.3], [18, 56 + tw * 0.5], [14, 51 + tw], [17, 47 + tw]], 12, 2, 's')
    h.curve([[30, 49], [25, 54 + tw * 0.3], [19, 55 + tw * 0.5], [15, 51 + tw]], 8, 2, 'a')
    if (st >= 3) { h.E(17, 46 + tw, 2, 3, 'e'); h.PX(17, 45 + tw, 'f') }
    h.blob(31, 45 + p.breath * 0.3, 10, 8 + p.breath * 0.5)
    h.E(32, 48, 6, 4, 'd')
    // tiny paws
    h.E(28, 52, 2, 1.5, 'l'); h.E(35, 52, 2, 1.5, 'l')
    const hx = 33, hy = 35 + hd, R = 7.6 * hk
    for (const [ex, s] of [[hx - R * 0.55, -1], [hx + R * 0.5, 1]]) {
      h.PL([ex - 2.5, hy - R * 0.5, ex + s * 0.5 + p.ear * s, hy - R * 1.35, ex + 2.5, hy - R * 0.5], 's')
      h.PL([ex - 1, hy - R * 0.6, ex + s * 0.5 + p.ear * s, hy - R * 1.15, ex + 1, hy - R * 0.6], 'e')
      if (st >= 4) h.PX(ex + s * 0.5 + p.ear * s, hy - R * 1.45, 'e')
    }
    h.blob(hx, hy, R, R * 0.88)
    h.E(hx + R * 0.35, hy + R * 0.38, R * 0.45, R * 0.3, 'd')
    if (st === 5) { h.E(hx - R * 0.95, hy + 1, 1.5, 2.5, 'e'); h.E(hx + R * 1.0, hy + 1, 1.5, 2.5, 'e') }
    h.L(hx + R * 0.7, hy + R * 0.35, hx + R * 1.35, hy + R * 0.25, 'd'); h.L(hx + R * 0.7, hy + R * 0.5, hx + R * 1.35, hy + R * 0.58, 'd')
    face(c, h, p, st, { near: [hx + R * 0.1, hy - R * 0.25], far: [hx - R * 0.5, hy - R * 0.27], mouth: [hx + R * 0.35, hy + R * 0.42] })
  },
}

// LIGHT · Solcub: a lion cub whose mane is a little sun, a few rays at first and a full sunburst at the end.
SPECIES.solcub = {
  pal: { k: '#3a2410', s: '#d89a3a', a: '#f5c46a', l: '#ffe2a0', d: '#fff2d6', x: '#e0701a', e: '#ffb02e', f: '#fff27a', n: '#a86a28' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1], tw = p.tail * 2.5
    h.curve([[16, 47], [10, 42 + tw * 0.5], [8, 36 + tw]], 3, 2, 's')
    h.E(8, 35 + tw, 2.5, 2.5, 'x'); h.PX(8, 34 + tw, 'e')
    h.limb(20, 50, 19, 59, 4, 'n'); h.limb(34, 50, 35 + p.leg * 2, 59, 4, 'n')
    h.blob(27, 48 + p.breath * 0.4, 12.5, 7.5 + p.breath * 0.6)
    h.E(29, 52, 9, 2.5, 'd')
    h.limb(23, 52, 22, 59, 4.5, 'a', 'n'); h.limb(36, 52, 38 + p.leg * 2, 59, 4.5, 'a', 'n')
    const hx = 39, hy = 40 + hd, R = 7.2 * hk
    // the sun mane
    const rays = 5 + st * 2, len = R * (0.45 + st * 0.12)
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + (p.breath ? 0.12 : 0), x0 = hx + Math.cos(a) * R * 0.85, y0 = hy + Math.sin(a) * R * 0.85
      h.PL([x0 + Math.cos(a + 1.6) * 2, y0 + Math.sin(a + 1.6) * 2, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, x0 + Math.cos(a - 1.6) * 2, y0 + Math.sin(a - 1.6) * 2], i % 2 ? 'e' : 'x')
    }
    if (st >= 3) h.E(hx, hy, R * 1.12, R * 1.05, 'e')
    h.blob(hx, hy, R, R * 0.92)
    h.E(hx - R * 0.55, hy - R * 0.75 - p.ear * 0.5, R * 0.25, R * 0.25, 's'); h.E(hx + R * 0.45, hy - R * 0.8, R * 0.24, R * 0.24, 's')
    h.E(hx + R * 0.45, hy + R * 0.35, R * 0.5, R * 0.36, 'd'); h.PX(hx + R * 0.85, hy + R * 0.15, 'x')
    if (st === 5) h.PX(hx - R * 0.2, hy - R * 0.55, 'f')
    face(c, h, p, st, { near: [hx + R * 0.08, hy - R * 0.3], far: [hx - R * 0.5, hy - R * 0.32], mouth: [hx + R * 0.48, hy + R * 0.52] })
  },
}

// COSMIC · Nebuloop: a starry jellyfish that drifts on curling tentacles, more of them with every stage.
SPECIES.nebuloop = {
  floaty: true,
  pal: { k: '#140c30', s: '#5a3aa8', a: '#8a5ad8', l: '#c09cff', d: '#e8dcff', x: '#3a2280', e: '#ff8fd0', f: '#fff6a8', n: '#4a2e90' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1]
    // tentacles: thin, apart, each curling on its own beat
    const n = 3 + Math.min(st, 4), t = p.tail
    for (let i = 0; i < n; i++) {
      const x0 = 23 + (i / (n - 1)) * 16, ph = i * 1.9 + t * 1.8, sway = Math.sin(ph) * 3.5, len = 12 + (i % 2) * 3
      h.curve([[x0, 44], [x0 + sway * 0.4, 44 + len * 0.35], [x0 - sway * 0.5, 44 + len * 0.7], [x0 + sway * 0.8, 44 + len]], 2.2, 1, i % 2 ? 'e' : 'x')
    }
    const hx = 31, hy = 38 + hd, R = 10 * Math.max(0.75, hk * 0.82)
    // the bell, with a frill along its rim
    h.blob(hx, hy, R, R * 0.82)
    for (let i = 0; i < 7; i++) h.E(hx - R * 0.9 + i * R * 0.3, hy + R * 0.62, 1.8, 1.4, i % 2 ? 'l' : 'd')
    for (const [sx, sy] of [[-0.5, -0.45], [0.55, -0.35], [-0.2, 0.15], [0.7, 0.2]].slice(0, 1 + st)) h.PX(hx + sx * R, hy + sy * R, 'f')
    if (st >= 4) { h.E(hx, hy - R * 0.95, 1.5, 1.5, 'f'); h.L(hx, hy - R * 0.82, hx, hy - R * 0.92, 'l') }
    if (st === 5) for (const s of [-1, 1]) h.E(hx + s * R * 1.25, hy - R * 0.4 + p.breath, 1.5, 1.5, 'f')
    face(c, h, p, st, { near: [hx + R * 0.15, hy - R * 0.05], far: [hx - R * 0.4, hy - R * 0.05], mouth: [hx - 0.5, hy + R * 0.32] })
  },
}

// AIR · Cumulamb: a lamb made of cloud with a soft dark face; curly horns arrive, then a little rainbow.
SPECIES.cumulamb = {
  pal: { k: '#22304a', s: '#b8cce4', a: '#eef5ff', l: '#ffffff', d: '#dce8f8', x: '#5a6a8a', e: '#8fb0d8', f: '#ffd0e0', n: '#5a6a8a', r: '#ff8fa8', g: '#ffd96a', c: '#8fd6ff' },
  draw(c, h, p, st) {
    const hd = p.headDy, hk = HEAD_K[st - 1]
    h.limb(21, 52, 20, 59, 3, 'n'); h.limb(33, 52, 34 + p.leg * 2, 59, 3, 'n')
    if (st === 5) for (const [i, col] of [[0, 'r'], [1, 'g'], [2, 'c']]) h.curve([[11 + i * 1.5, 47], [12 + i * 1.5, 38 + i * 1.5], [18 + i, 32 + i * 1.5], [26, 31 + i * 1.6]], 2.4, 2.4, col)
    // the cloud fleece: overlapping puffs, darker underneath
    const puffs = [[17, 48, 6], [23, 44, 7], [31, 45, 6.5], [35, 50, 5], [25, 51, 6.5], [18, 52, 5]]
    for (const [x, y, rr] of puffs) h.E(x, y + p.breath * 0.4, rr, rr * 0.9, 's')
    for (const [x, y, rr] of puffs) h.E(x - 0.6, y - 0.8 + p.breath * 0.3, rr * 0.86, rr * 0.78, 'a')
    for (const [x, y, rr] of puffs.slice(0, 3)) h.E(x - rr * 0.35, y - rr * 0.4, rr * 0.3, rr * 0.24, 'l')
    h.E(13, 46 + p.tail, 3, 2.5, 'a')
    h.limb(24, 55, 23, 59, 3.5, 'x', 'n'); h.limb(36, 54, 38 + p.leg * 2, 59, 3.5, 'x', 'n')
    const hx = 40, hy = 41 + hd, R = 6 * hk
    h.E(hx - R * 0.2, hy - R * 0.85, R * 0.75, R * 0.5, 'a')
    h.E(hx - R * 0.95, hy - R * 0.1 + p.ear, R * 0.45, R * 0.22, 'x')
    h.blob(hx, hy, R, R, 'k', 'x', 'e')
    h.E(hx - R * 0.15, hy - R * 0.85, R * 0.7, R * 0.45, 'a'); h.E(hx - R * 0.3, hy - R * 1.0, R * 0.25, R * 0.18, 'l')
    if (st >= 3) for (const s of [-1, 1]) { const x = hx + s * R * 0.75; h.curve([[x, hy - R * 0.7], [x + s * R * 0.55, hy - R * 0.55], [x + s * R * 0.45, hy - R * 0.05]], 2.5, 1.5, 'e') }
    face(c, h, p, st, { near: [hx + R * 0.15, hy - R * 0.2], far: [hx - R * 0.5, hy - R * 0.22], mouth: [hx + R * 0.35, hy + R * 0.5], blush: true })
  },
}

/* ─────────────────────── build every form and animation ─────────────────────── */
const SHARED = { o: '#140c26', w: '#ffffff', v: '#cfd6ff', m: '#7a2235', p: '#ff8fb1', h: '#fffaf0' }
for (const [id, sp] of Object.entries(SPECIES)) {
  pal({ ...SHARED, ...sp.pal })
  for (let st = 1; st <= 5; st++) {
    const k = STAGE_K[st - 1]
    for (const [name, frames] of Object.entries(ANIMS)) {
      anim(`pc-${id}-${st}-${name}`, { w: FW, h: FH, frames, fps: FPS[name], outline: 'k' }, (c) => {
        const p = poseFor(name, c.frame, k, !!sp.floaty)
        sp.draw(c, kit(c, p), p, st)
      })
    }
  }
}
