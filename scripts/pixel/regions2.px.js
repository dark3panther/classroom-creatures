// World of Adventures 1.6: the three newer regions (Coral Lagoon, Mushroom Hollow, Sunstone Desert):
// their islands for the world map, their region places (96 × 72, also a background a creature can wear)
// and their relics. Uses the helpers of islands.px.js and regions.px.js (included before this file).

// ── little parts ──
sprite("_coral", { outline: "k" }, `
  m..m..m
  m..m.m.
  .m.m.m.
  .mmMmm.
  ...M...
  ...M...`)
sprite("_coral2", { outline: "k" }, `
  o..o.
  oo.o.
  .ooo.
  ..o..`)
sprite("_palm", { outline: "k" }, `
  .GG.GG.
  GggGggG
  ..GbG..
  ...b...
  ...b...
  ..b....
  ..b....`)
sprite("_shroom", { outline: "k" }, `
  .pppp.
  pqpppp
  ppppqp
  ..ww..
  ..ww..`)
sprite("_shroom_big", { outline: "k" }, `
  ..mmmmm..
  .mmwmmmm.
  mmmmmmwmm
  mMmmmmmMm
  ...www...
  ...www...
  ...www...`)

// ── islands ──
sprite("isle-lagoon", { w: 88, h: 60 },
  (c) => ground(c, { cx: 44, cy: 28, rx: 39, ry: 20, seed: 31, top: "d", topD: "D", topL: "w", cliff: "t", cliffD: "D" }),
  // the turquoise lagoon in the middle, with a little reef
  (c) => { c.poly(blob(44, 27, 20, 10, 33, 0.1), "a"); c.poly(blob(44, 28, 17, 8, 33, 0.1), "n"); c.ellipse(40, 26, 6, 2, "a") },
  // the sunken ship's mast
  (c) => { c.vline(52, 14, 14, "B"); c.hline(47, 17, 11, "B"); c.poly([53, 15, 60, 19, 53, 23], "w"); c.ellipse(52, 28, 6, 2, "B") },
  stamp("_coral", 30, 26), stamp("_coral2", 36, 29), stamp("_palm", 10, 14), stamp("_palm", 72, 18), stamp("_palm", 66, 12),
  (c) => { c.px(20, 34, "m"); c.px(68, 32, "o"); c.px(24, 20, "w"); c.px(62, 36, "m") },
)

sprite("isle-hollow", { w: 84, h: 62 },
  (c) => ground(c, { cx: 42, cy: 32, rx: 37, ry: 20, seed: 41, top: "G", topD: "k", topL: "g", cliff: "B", cliffD: "k" }),
  (c) => { c.poly(blob(42, 30, 26, 12, 43, 0.12), "g") },
  // the Lantern Toadstool in the middle of the hollow
  (c) => { c.rect(39, 12, 6, 18, "w"); c.rect(42, 12, 3, 18, "z"); c.ellipse(42, 11, 14, 6, "k"); c.ellipse(42, 10, 13, 5, "p"); c.ellipse(42, 9, 11, 4, "q"); for (const [x, y] of [[36, 9], [44, 7], [49, 10]]) c.px(x, y, "h") },
  stamp("_shroom_big", 12, 16), stamp("_shroom", 60, 16), stamp("_shroom", 54, 30), stamp("_shroom", 22, 32), stamp("_shroom", 66, 28),
  // fireflies
  (c) => { for (const [x, y] of [[10, 12], [70, 8], [48, 6], [64, 28], [26, 14], [40, 36]]) c.px(x, y, "h") },
  glow("h", { r: 3, strength: 0.5 }),
)

sprite("isle-dunes", { w: 90, h: 60 },
  (c) => ground(c, { cx: 45, cy: 30, rx: 40, ry: 19, seed: 51, top: "d", topD: "D", topL: "h", cliff: "t", cliffD: "D" }),
  // dunes
  (c) => { c.ellipse(24, 32, 14, 4, "t"); c.ellipse(64, 34, 12, 3, "t") },
  // the Sunstone Pyramid: a lit left face, a shaded right face, a glowing stone on top
  (c) => { c.poly([30, 32, 45, 8, 60, 32], "d"); c.poly([45, 8, 60, 32, 45, 32], "D"); for (let y = 14; y < 32; y += 5) c.hline(46 - (y - 8) * 0.6, y, (y - 8) * 0.6, "t"); c.rect(43, 26, 4, 6, "k"); c.px(45, 7, "o"); c.px(44, 6, "y"); c.px(46, 6, "y"); c.px(45, 5, "h") },
  // an oasis
  (c) => { c.ellipse(70, 26, 6, 2, "n"); c.ellipse(70, 26, 4, 1, "a") },
  stamp("_palm", 72, 14), stamp("_palm", 12, 18),
  glow("yo", { r: 3, strength: 0.4 }),
)

// ── region places ──
scene("region-lagoon", { w: RW, h: RH, bg: "c" },
  grad(0, 0, RW, 34, "Cc", "v"), (c) => { cloud(c, 10, 8); cloud(c, 66, 12, 1) },
  // the sea, then the sand
  (c) => { c.rect(0, 30, RW, 18, "n"); for (let x = 0; x < RW; x += 6) { c.hline(x, 33 + (x % 12 ? 0 : 3), 3, "a"); c.hline(x + 3, 40 + (x % 18 ? 0 : 2), 2, "a") } },
  (c) => { c.vline(70, 12, 20, "B"); c.hline(62, 17, 16, "B"); c.poly([71, 13, 82, 19, 71, 25], "w"); c.poly([56, 30, 60, 26, 82, 26, 86, 30], "B") },
  (c) => hills(c, 54, 3, 0.09, 1, "d", "w"), (c) => c.rect(0, 58, RW, 14, "d"),
  (c) => { const r = c.rng(31); for (let i = 0; i < 30; i++) { const x = Math.floor(r() * RW), y = 56 + Math.floor(r() * 16); if (c.is(x, y, "dw")) c.px(x, y, i % 3 ? "t" : "w") } },
  stamp("_coral", 8, 50), stamp("_coral2", 18, 54), stamp("_coral", 84, 52), stamp("_palm", 30, 46), stamp("_palm", 88, 40),
  (c) => { c.ellipse(52, 64, 4, 2, "m"); c.px(51, 63, "M"); c.ellipse(70, 62, 3, 1, "o") },
)

scene("region-hollow", { w: RW, h: RH, bg: "P" },
  grad(0, 0, RW, 50, "kPp", "v"), (c) => stars(c, 22, 5, 26),
  (c) => hills(c, 52, 6, 0.08, 2, "G", "g"), (c) => c.rect(0, 58, RW, 14, "G"),
  stamp("_shroom_big", 6, 34), stamp("_shroom_big", 70, 30), stamp("_shroom", 32, 46), stamp("_shroom", 56, 48), stamp("_shroom", 86, 50),
  // the Lantern Toadstool, glowing in the middle
  (c) => { c.rect(45, 30, 6, 28, "w"); c.rect(48, 30, 3, 28, "z"); c.ellipse(48, 28, 18, 9, "p"); c.ellipse(48, 26, 16, 7, "q"); for (const [x, y] of [[40, 25], [50, 23], [56, 27]]) c.ellipse(x, y, 2, 1, "h") },
  (c) => { const r = c.rng(41); for (let i = 0; i < 18; i++) c.px(Math.floor(r() * RW), 10 + Math.floor(r() * 46), "h") },
  glow("hq", { r: 4, strength: 0.5 }),
)

scene("region-dunes", { w: RW, h: RH, bg: "o" },
  grad(0, 0, RW, 46, "ooh", "v"),
  (c) => { c.circ(74, 16, 9, "h"); c.circ(74, 16, 7, "y") },
  (c) => { c.poly([26, 46, 46, 16, 66, 46], "d"); c.poly([46, 16, 66, 46, 46, 46], "D"); for (let y = 22; y < 46; y += 6) c.hline(46 - (y - 16) * 0.66, y, (y - 16) * 0.66, "t"); c.rect(44, 38, 4, 8, "k"); c.px(46, 15, "o"); c.px(45, 14, "y"); c.px(47, 14, "y") },
  (c) => hills(c, 50, 5, 0.06, 1, "t", "d"), (c) => hills(c, 58, 4, 0.09, 3, "d", "h"), (c) => c.rect(0, 62, RW, 10, "d"),
  stamp("_palm", 6, 42), stamp("_palm", 84, 44),
  (c) => { c.ellipse(16, 62, 7, 2, "n"); c.ellipse(16, 62, 5, 1, "a") },
  glow("y", { r: 4, strength: 0.4 }),
)

// ── relics ──
sprite("relic-lagoon", { outline: "k" }, `
  ....mmm.....
  ..mmwwmm....
  .mwwmmmwm...
  .mwmMMmwm...
  mwmMwwMmwm..
  mwmMwmMmwm..
  .mwmMMMmwm..
  ..mwmmmwm...
  ...mmmmm....`)
sprite("relic-hollow", { outline: "k" }, `
  ....BB....
  ...BttB...
  ..BBBBBB..
  ..BhhhhB..
  ..BhyyhB..
  ..BhyyhB..
  ..BhhhhB..
  ..BBBBBB..
  ...tttt...`)
sprite("relic-dunes", { outline: "k" }, `
  .y......y.
  ..y....y..
  ...oooo...
  ..oyyyyo..
  .oyhhhhyo.
  .oyhoohyo.
  .oyhhhhyo.
  ..oyyyyo..
  ...oooo...
  ..o....o..`)
