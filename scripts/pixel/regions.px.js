// Region places (96×72): the region page artwork and the six region backgrounds a creature can wear.
// Also the sea the world map's islands float on.
include("palette.px.js")

const RW = 96, RH = 72
const hills = (c, base, amp, f, ph, col, top) => { for (let x = 0; x < RW; x++) { const y = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * f + ph)) - amp * 0.3 * Math.sin(x * f * 2.3 + ph * 1.7)); c.vline(x, y, RH - y, col); if (top) c.px(x, y, top) } }
const cloud = (c, x, y, s = 1) => { c.circ(x, y, 3 * s, "w"); c.circ(x + 4 * s, y - 1, 4 * s, "w"); c.circ(x + 9 * s, y, 3 * s, "w"); c.rect(x - 2 * s, y + 1, 13 * s, 2 * s, "w"); c.hline(x - 2 * s, y + 3 * s, 13 * s, "c") }
const tree = (c, x, base, h) => { c.rect(x - 1, base - Math.round(h * 0.45), 3, Math.round(h * 0.45), "B"); const r = Math.round(h * 0.32); c.circ(x, base - Math.round(h * 0.62), r, "G"); c.circ(x - 1, base - Math.round(h * 0.66), r - 1, "g"); c.circ(x - 2, base - Math.round(h * 0.72), Math.max(1, r - 3), "l") }
const stars = (c, n, seed, maxY, col = "w") => { const r = c.rng(seed); for (let i = 0; i < n; i++) c.px(Math.floor(r() * RW), Math.floor(r() * maxY), i % 4 ? col : "y") }

scene("region-verdant", { w: RW, h: RH, bg: "c" },
  grad(0, 0, RW, 40, "Cc", "v"), (c) => { cloud(c, 12, 10); cloud(c, 60, 6, 1) },
  (c) => hills(c, 40, 8, 0.07, 1, "G"), (c) => hills(c, 50, 6, 0.09, 3, "g", "l"),
  // the Great Oak
  (c) => { c.rect(62, 30, 6, 24, "B"); c.rect(63, 30, 2, 24, "b"); c.circ(65, 24, 13, "G"); c.circ(62, 22, 10, "g"); c.circ(70, 21, 8, "g"); c.circ(60, 18, 4, "l"); c.circ(68, 16, 3, "l") },
  (c) => { const pts = [[30, 50], [26, 56], [34, 62], [24, 72]]; for (let i = 1; i < pts.length; i++) c.line(...pts[i - 1], ...pts[i], "n", 4); for (let i = 1; i < pts.length; i++) c.line(...pts[i - 1], ...pts[i], "a", 1) },
  (c) => { tree(c, 10, 56, 16); tree(c, 86, 60, 14); const r = c.rng(5); for (let i = 0; i < 40; i++) { const x = Math.floor(r() * RW), y = 54 + Math.floor(r() * 18); if (c.is(x, y, "gl")) c.px(x, y, i % 3 ? "m" : "y") } },
)

scene("region-crystal", { w: RW, h: RH, bg: "P" },
  grad(0, 0, RW, RH, "kPP", "v"),
  // the cave roof and floor
  (c) => { for (let x = 0; x < RW; x++) { const y = Math.round(10 + 5 * Math.sin(x / 7) + 3 * Math.sin(x / 3)); c.vline(x, 0, y, "k") } },
  (c) => hills(c, 60, 6, 0.12, 2, "S", "s"),
  (c) => { for (const [x, y, h] of [[10, 60, 18], [22, 62, 10], [44, 58, 22], [56, 62, 12], [76, 60, 20], [88, 63, 9]]) { c.poly([x - 4, y, x, y - h, x + 4, y], "p"); c.poly([x, y - h, x + 4, y, x, y], "P"); c.vline(x - 1, y - h + 3, h - 5, "q") } },
  (c) => { for (const [x, h] of [[18, 10], [38, 14], [66, 9], [84, 12]]) { c.poly([x - 4, 6, x, 6 + h, x + 4, 6], "S"); c.poly([x - 2, 6 + h - 5, x, 6 + h + 2, x + 2, 6 + h - 5], "q") } },
  glow("q", { r: 6, strength: 0.5 }),
)

scene("region-frostpeak", { w: RW, h: RH, bg: "N" },
  grad(0, 0, RW, 44, "kNI", "v"), (c) => stars(c, 30, 4, 30),
  // northern lights
  (c) => { for (let x = 0; x < RW; x++) { const y = Math.round(12 + 6 * Math.sin(x / 11) + 2 * Math.sin(x / 4)); const len = 6 + Math.round(4 * Math.sin(x / 3.3) + 3 * Math.sin(x / 1.7)); for (let k = 0; k < len; k++) if (k < len / 3 || (x + k) % 2 === 0) c.px(x, y + k, k < 2 ? "l" : k < len / 2 ? "g" : "a") } },
  (c) => { for (const [x, h, w] of [[18, 30, 22], [50, 38, 28], [80, 28, 20]]) { c.poly([x - w, 56, x, 56 - h, x + w, 56], "s"); c.poly([x, 56 - h, x + w, 56, x, 56], "S"); c.poly([x - w * 0.35, 56 - h * 0.65, x, 56 - h, x + w * 0.35, 56 - h * 0.65], "w") } },
  (c) => { c.rect(0, 56, RW, 16, "w"); c.ellipse(60, 64, 22, 4, "I"); c.ellipse(60, 63, 20, 3, "a"); c.hline(46, 62, 6, "w") },
)

scene("region-ember", { w: RW, h: RH, bg: "R" },
  grad(0, 0, RW, 48, "Rro", "v"),
  (c) => { c.circ(18, 12, 6, "S"); c.circ(26, 10, 7, "S"); c.circ(34, 13, 5, "S"); c.rect(14, 13, 24, 4, "S"); c.line(26, 17, 23, 24, "y"); c.line(23, 24, 27, 24, "y"); c.line(27, 24, 24, 31, "y") },
  (c) => { c.poly([40, 60, 64, 16, 76, 16, 96, 60], "B"); c.poly([46, 60, 66, 18, 70, 18, 70, 60], "b"); c.rect(64, 14, 12, 3, "y"); c.circ(70, 8, 4, "s"); c.circ(76, 4, 3, "z") },
  (c) => { const lava = [[70, 18], [72, 30], [66, 42], [70, 54], [62, 72]]; for (let i = 1; i < lava.length; i++) c.line(...lava[i - 1], ...lava[i], "r", 4); for (let i = 1; i < lava.length; i++) c.line(...lava[i - 1], ...lava[i], "y", 1) },
  (c) => hills(c, 62, 4, 0.1, 1, "S", "s"),
  glow("yo", { r: 5, strength: 0.4 }),
)

scene("region-sky", { w: RW, h: RH, bg: "c" },
  grad(0, 0, RW, RH, "Cca", "v"),
  (c) => { ;["r", "o", "y", "g", "n", "p"].forEach((col, i) => { c.ellipse(48, 70, 44 - i * 2, 40 - i * 2, col, true); c.ellipse(48, 70, 43 - i * 2, 39 - i * 2, col, true) }) },
  (c) => { const isle = (x, y, w) => { c.poly([x, y, x + w, y, x + w / 2 + 2, y + w * 0.7, x + w / 2 - 2, y + w * 0.7], "B"); c.ellipse(x + w / 2, y, w / 2, 3, "G"); c.ellipse(x + w / 2, y - 1, w / 2 - 1, 2, "g") }; isle(6, 30, 20); isle(64, 22, 24); isle(38, 44, 14) },
  (c) => { tree(c, 16, 30, 12); tree(c, 76, 22, 14) },
  (c) => { cloud(c, 4, 60, 1.5); cloud(c, 54, 62, 1.5); cloud(c, 30, 12); cloud(c, 80, 50) },
)

scene("region-ancient", { w: RW, h: RH, bg: "P" },
  grad(0, 0, RW, 50, "Ppm", "v"), (c) => stars(c, 24, 9, 26),
  (c) => { c.circ(78, 12, 5, "h"); c.circ(80, 11, 4, "p") },
  (c) => hills(c, 54, 4, 0.08, 2, "D", "d"), (c) => c.rect(0, 58, RW, 14, "d"),
  (c) => { const step = (x, y, w, h) => { c.rect(x, y, w, h, "d"); c.rect(x + Math.floor(w / 2), y, Math.ceil(w / 2), h, "t"); c.hline(x, y, w, "h"); c.hline(x, y + h - 1, w, "D") }; step(26, 50, 44, 8); step(32, 42, 32, 8); step(38, 34, 20, 8); step(43, 27, 10, 7); c.rect(45, 50, 6, 8, "k") },
  (c) => { c.px(48, 20, "y"); c.rect(47, 21, 3, 1, "y"); c.rect(45, 22, 7, 1, "y"); c.rect(46, 23, 5, 1, "y"); c.px(46, 24, "y"); c.px(50, 24, "y") },
  (c) => { for (const x of [8, 16, 80, 88]) { c.rect(x, 40, 4, 18, "z"); c.rect(x + 3, 40, 1, 18, "s"); c.rect(x - 1, 38, 6, 2, "z") } c.rect(14, 38, 2, 2, "_") },
  glow("y", { r: 4, strength: 0.5 }),
)

scene("region-worldmap", { w: RW, h: RH, bg: "d" },
  // an explorer's map on parchment: island outlines, a dotted route and an X
  (c) => { for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const d = Math.min(x, y, RW - 1 - x, RH - 1 - y); if (d < 2 || (d < 5 && (x + y) % 2 === 0)) c.px(x, y, "t") } },
  (c) => { for (const [x, y, rx, ry] of [[24, 46, 13, 9], [70, 22, 12, 8], [74, 52, 11, 7], [44, 20, 8, 5], [46, 58, 6, 4]]) { c.ellipse(x, y, rx, ry, "D", true); c.ellipse(x, y, rx - 1, ry - 1, "l", false) } },
  (c) => { c.poly([66, 26, 70, 16, 74, 26], "s"); c.poly([20, 44, 22, 40, 24, 44], "G"); c.poly([26, 47, 28, 43, 30, 47], "G"); c.poly([72, 56, 75, 48, 78, 56], "B") },
  (c) => { const pts = [[24, 46], [44, 20], [70, 22], [74, 52], [46, 58]]; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k < n; k += 3) c.px(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), "r") } },
  (c) => { c.line(43, 55, 49, 61, "R", 2); c.line(49, 55, 43, 61, "R", 2) },
  (c) => { const cx = 84, cy = 62; c.poly([cx, cy - 6, cx + 1, cy, cx - 1, cy], "D"); c.poly([cx, cy + 6, cx + 1, cy, cx - 1, cy], "t"); c.hline(cx - 5, cy, 11, "t"); c.px(cx, cy - 8, "D") },
)

// the sea under the world map
scene("worldmap-sea", { w: 320, h: 200, bg: "n" },
  grad(0, 0, 320, 200, "nnn", "v"),
  (c) => { for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) { const d = Math.min(x, y, 319 - x, 199 - y); if (d < 6 && (x + y) % 2 === 0) c.px(x, y, "N"); else if (d < 3) c.px(x, y, "N") } },
  (c) => { const r = c.rng(11); for (let i = 0; i < 90; i++) { const x = 8 + Math.floor(r() * 300), y = 8 + Math.floor(r() * 184); c.px(x, y, "a"); c.px(x + 1, y - 1, "a"); c.px(x + 2, y - 1, "a"); c.px(x + 3, y, "a") } },
  // a compass rose, bottom left
  (c) => { const cx = 22, cy = 178; c.circ(cx, cy, 9, "N"); c.circ(cx, cy, 8, "a", ); c.circ(cx, cy, 7, "n"); c.poly([cx, cy - 11, cx + 2, cy, cx - 2, cy], "w"); c.poly([cx, cy + 11, cx + 2, cy, cx - 2, cy], "a"); c.poly([cx - 11, cy, cx, cy - 2, cx, cy + 2], "a"); c.poly([cx + 11, cy, cx, cy - 2, cx, cy + 2], "a"); c.px(cx, cy, "r") },
)
