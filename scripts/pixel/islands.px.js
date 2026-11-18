// World map: six region islands on a bright sea. Each island is its own sprite so the map can lift,
// glow and fog them one by one. Build: node <claude-pxl>/bin/pxl.js build scripts/pixel/adventure.px.js
include("palette.px.js")

/** An irregular island outline (seeded, so it never changes between builds). */
function blob(cx, cy, rx, ry, seed, wob = 0.12, n = 40) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = 1 + wob * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 5 + seed * 2.1) * 0.4)
    pts.push(Math.round(cx + Math.cos(a) * rx * r), Math.round(cy + Math.sin(a) * ry * r))
  }
  return pts
}
const shift = (pts, dx, dy) => pts.map((v, i) => (i % 2 ? v + dy : v + dx))

/** Sea halo, cliff and top surface shared by the islands. */
function ground(c, o) {
  const { cx, cy, rx, ry, seed, top, topD, topL, cliff, cliffD, depth = 6, wob } = o
  const outline = blob(cx, cy, rx, ry, seed, wob)
  c.poly(shift(blob(cx, cy, rx + 5, ry + 4, seed, wob), 0, depth), "a")
  c.poly(shift(blob(cx, cy, rx + 2, ry + 2, seed, wob), 0, depth), "w")
  for (let d = depth; d > 0; d--) c.poly(shift(outline, 0, d), d > depth - 2 ? cliffD : cliff)
  c.poly(outline, topD)
  c.poly(shift(blob(cx, cy, rx - 1, ry - 1, seed, wob), 0, -1), top)
  if (topL) c.poly(shift(blob(cx - rx * 0.2, cy - ry * 0.25, rx * 0.55, ry * 0.45, seed + 1, wob), 0, -1), topL)
}

// ── little parts ──
sprite("_tree", { outline: "k" }, `
  .GGG.
  GgggG
  GglgG
  GgggG
  .GGG.
  ..B..`)
sprite("_pine", { outline: "k" }, `
  ..G..
  .GgG.
  .GgG.
  GgggG
  GGgGG
  ..B..`)
sprite("_flower", "m")
sprite("_flower2", "y")
group("_flowers", ["_flower", "_flower", "_flower2"])
sprite("_oak", { outline: "k" }, `
  ...GGGGG...
  .GGggggGGG.
  GGgglggggGG
  GgglllgggGG
  GGggggggGGG
  .GGgggGGGG.
  ...GBBG....
  ....BB.....
  ....BB.....
  ...BBBB....`)
sprite("_crystal", { outline: "k" }, `
  .q.
  qpp
  qpP
  ppP
  pPP`)
sprite("_crystal_big", { outline: "k" }, `
  ..q..
  .qqp.
  .qpp.
  qqpPP
  qppPP
  qppPP
  ppPPP`)
sprite("_peak", { outline: "k" }, `
  .....w.....
  ....www....
  ...wwwiw...
  ..wwiIsww..
  ..wIssszi..
  .sIsSsszss.
  .sSsSsszss.
  sSSsSsszsss
  SSSsSSszsss`)
sprite("_peak_big", { outline: "k" }, `
  .......w.......
  ......www......
  .....wwwww.....
  ....wwwiwww....
  ...wwiIzwiww...
  ...wIssszIiw...
  ..sIsSsszsiss..
  ..sSsSsszssss..
  .sSSsSsszzsss..
  .SSSsSSszsssss.
  SSSSsSSszzssss.
  SSSSSSSszsssss.`)
sprite("_column", { outline: "k" }, `
  zzz
  .z.
  .z.
  .s.
  .z.
  sss`)
sprite("_broken", { outline: "k" }, `
  .z.
  .zz
  .s.
  .z.
  sss`)
sprite("_cloudpuff", { outline8: false }, `
  ..www..
  .wwwww.
  wwwwwww
  ccwwwcc`)

// ── the six islands ──
sprite("isle-verdant", { w: 90, h: 64 },
  (c) => ground(c, { cx: 45, cy: 28, rx: 40, ry: 22, seed: 1, top: "g", topD: "G", topL: "l", cliff: "b", cliffD: "B" }),
  // a winding river from the hills to the sea
  (c) => { const pts = [[60, 9], [56, 17], [60, 24], [52, 32], [55, 40], [49, 49]]; for (let i = 1; i < pts.length; i++) c.line(...pts[i - 1], ...pts[i], "n", 3); for (let i = 1; i < pts.length; i++) c.line(...pts[i - 1], ...pts[i], "a", 1) },
  scatter("_flowers", 10, 14, 70, 32, 40, { on: "gl" }),
  stamp("_tree", 12, 18), stamp("_tree", 20, 12), stamp("_tree", 66, 16), stamp("_tree", 72, 24), stamp("_tree", 24, 30), stamp("_tree", 64, 34),
  stamp("_oak", 30, 6),
)

sprite("isle-crystal", { w: 80, h: 58 },
  (c) => ground(c, { cx: 40, cy: 26, rx: 34, ry: 19, seed: 4, top: "s", topD: "S", topL: "z", cliff: "S", cliffD: "P" }),
  // the hill with the cave mouth
  (c) => { c.poly(blob(40, 22, 20, 14, 7, 0.08), "S"); c.poly(blob(38, 20, 18, 12, 7, 0.08), "s"); c.ellipse(40, 28, 7, 6, "k"); c.ellipse(40, 29, 5, 4, "P"); c.rect(33, 29, 15, 6, "s") },
  (c) => { c.ellipse(40, 31, 6, 2, "S"); c.ellipse(40, 28, 7, 6, "k", true) },
  stamp("_crystal_big", 14, 14), stamp("_crystal", 24, 22), stamp("_crystal_big", 56, 12), stamp("_crystal", 64, 24), stamp("_crystal", 47, 6), stamp("_crystal", 29, 7),
  glow("q", { r: 4, strength: 0.4 }),
)

sprite("isle-frostpeak", { w: 86, h: 62 },
  (c) => ground(c, { cx: 43, cy: 30, rx: 38, ry: 20, seed: 9, top: "i", topD: "I", topL: "w", cliff: "s", cliffD: "S" }),
  (c) => { c.ellipse(60, 36, 10, 4, "I"); c.ellipse(60, 35, 8, 3, "a"); c.px(56, 34, "w"); c.px(63, 36, "w") },
  (c) => { c.hline(12, 40, 10, "I"); c.hline(40, 44, 8, "I"); c.hline(22, 22, 6, "I") },
  stamp("_peak", 10, 12), stamp("_peak_big", 26, 0), stamp("_peak", 50, 10),
  stamp("_pine", 10, 30), stamp("_pine", 18, 36), stamp("_pine", 70, 24), stamp("_pine", 34, 34),
)

sprite("isle-ember", { w: 90, h: 64 },
  (c) => ground(c, { cx: 45, cy: 32, rx: 40, ry: 20, seed: 13, top: "S", topD: "k", topL: "s", cliff: "B", cliffD: "k" }),
  // the volcano, its crater glow and a lava river
  (c) => {
    c.poly([22, 38, 36, 10, 54, 10, 68, 38], "B"); c.poly([26, 38, 38, 12, 45, 12, 46, 38], "b")
    c.poly([36, 10, 54, 10, 51, 7, 39, 7], "k"); c.rect(39, 8, 12, 2, "r"); c.rect(41, 8, 8, 1, "y")
    const lava = [[45, 10], [46, 18], [42, 26], [46, 34], [40, 44]]
    for (let i = 1; i < lava.length; i++) c.line(...lava[i - 1], ...lava[i], "r", 3)
    for (let i = 1; i < lava.length; i++) c.line(...lava[i - 1], ...lava[i], "o", 1)
    c.px(45, 14, "y"); c.px(43, 27, "y")
    // smoke puffs
    c.circ(48, 4, 3, "s"); c.circ(53, 2, 2, "z"); c.circ(44, 3, 2, "z")
  },
  (c) => { c.rect(70, 26, 2, 6, "o"); c.rect(14, 30, 3, 5, "R"); c.px(15, 30, "y") },
  (c) => { c.circ(72, 8, 4, "S"); c.circ(78, 7, 5, "S"); c.circ(84, 9, 3, "S"); c.rect(70, 9, 16, 3, "S"); c.circ(77, 6, 3, "s"); c.line(77, 12, 75, 16, "y"); c.line(75, 16, 78, 16, "y"); c.line(78, 16, 76, 21, "y") },
  glow("roy", { r: 4, strength: 0.35 }),
)

sprite("isle-sky", { w: 86, h: 62 },
  // rainbow bridge (the lower half is erased), then a cloud bank instead of a beach
  (c) => { const cols = ["r", "o", "y", "g", "n", "p"]; cols.forEach((col, i) => c.ellipse(43, 40, 30 - i, 26 - i, col, true)); c.rect(0, 40, 86, 22, "_"); },
  (c) => { for (let i = 0; i < 9; i++) c.circ(10 + i * 8, 50 + (i % 2) * 2, 7, "c"); for (let i = 0; i < 9; i++) c.circ(10 + i * 8, 48 + (i % 2) * 2, 6, "w") },
  (c) => {
    const isle = (x, y, w) => { c.poly([x, y, x + w, y, x + w / 2 + 2, y + w * 0.7, x + w / 2 - 2, y + w * 0.7], "B"); c.poly([x + 2, y, x + w - 2, y, x + w / 2, y + w * 0.5], "b"); c.ellipse(x + w / 2, y, w / 2, 3, "G"); c.ellipse(x + w / 2, y - 1, w / 2 - 1, 2, "g") }
    isle(6, 30, 22); isle(58, 30, 22); isle(32, 14, 22)
  },
  stamp("_tree", 12, 21), stamp("_tree", 66, 21), stamp("_tree", 39, 4),
  (c) => { for (let i = 0; i < 9; i++) c.circ(10 + i * 8, 54 + (i % 2), 5, "w") },
)

sprite("isle-ancient", { w: 76, h: 56 },
  (c) => ground(c, { cx: 38, cy: 28, rx: 33, ry: 18, seed: 21, top: "d", topD: "D", topL: "t", cliff: "D", cliffD: "B" }),
  // the Star Temple: a stepped pyramid with a lit left face and a shaded right face, a star on top
  (c) => {
    const step = (x, y, w, h) => { c.rect(x, y, w, h, "d"); c.rect(x + Math.floor(w / 2), y, Math.ceil(w / 2), h, "t"); c.hline(x, y, w, "h"); c.hline(x, y + h - 1, w, "D") }
    step(20, 27, 36, 5); step(24, 21, 28, 6); step(28, 15, 20, 6); step(32, 9, 12, 6)
    c.rect(35, 27, 6, 5, "k"); c.rect(36, 28, 4, 4, "B")
    c.vline(19, 27, 5, "k"); c.vline(56, 27, 5, "k")
  },
  (c) => { c.px(38, 3, "y"); c.rect(37, 4, 3, 1, "y"); c.rect(35, 5, 7, 1, "y"); c.rect(36, 6, 5, 1, "y"); c.rect(37, 7, 3, 1, "y"); c.px(36, 8, "y"); c.px(40, 8, "y") },
  stamp("_column", 10, 22), stamp("_column", 16, 26), stamp("_broken", 58, 22), stamp("_column", 62, 28),
  glow("y", { r: 4, strength: 0.4 }),
)
