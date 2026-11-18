// The shared class world: five places, each in three stages, plus decorations and the meadow they stand on.
include("palette.px.js")

const W = 64, H = 52

/** A cottage: front wall, door, window, pitched roof. */
function cottage(c, x, y, w, h, wall, wallD, roof, roofD) {
  c.rect(x, y, w, h, wall); c.rect(x, y + h - 2, w, 2, wallD); c.vline(x + w - 1, y, h, wallD)
  const rh = Math.round(w * 0.45)
  c.poly([x - 2, y + 1, x + w / 2, y - rh, x + w + 2, y + 1], roofD); c.poly([x, y, x + w / 2, y - rh + 2, x + w / 2, y], roof)
  c.rect(x + Math.round(w / 2) - 2, y + h - 7, 4, 7, "B"); c.px(x + Math.round(w / 2) + 1, y + h - 4, "y")
  if (w >= 12) { c.rect(x + 2, y + 3, 3, 3, "a"); c.px(x + 2, y + 3, "w") }
}
/** A stone tower with battlements. */
function tower(c, x, y, w, h, roof) {
  c.rect(x, y, w, h, "s"); c.rect(x + w - 3, y, 3, h, "S"); c.hline(x, y, w, "z")
  for (let i = 0; i < w; i += 3) c.rect(x + i, y - 2, 2, 2, "s")
  for (let r = y + 4; r < y + h; r += 4) c.hline(x + (r % 8 ? 0 : 2), r, w - 3, "S")
  c.rect(x + Math.floor(w / 2) - 1, y + 4, 2, 3, "k")
  if (roof) { c.poly([x - 1, y, x + w / 2, y - Math.round(w * 0.9), x + w + 1, y], roof); c.poly([x + w / 2, y - Math.round(w * 0.9), x + w + 1, y, x + w / 2, y], "N") }
}
const flag = (c, x, y, col) => { c.vline(x, y, 7, "B"); c.rect(x + 1, y, 4, 3, col); c.px(x + 5, y + 1, col) }
const fence = (c, x, y, w) => { c.hline(x, y, w, "b"); c.hline(x, y + 2, w, "b"); for (let i = 0; i <= w; i += 4) c.vline(x + i, y - 1, 5, "B") }
const shadow = (c, cx, y, rx) => c.ellipse(cx, y, rx, 2, "G")
const pine = (c, x, y) => { c.poly([x, y - 10, x + 5, y, x - 5, y], "G"); c.poly([x, y - 10, x + 3, y - 3, x - 3, y - 3], "g"); c.vline(x, y, 2, "B") }
const roundTree = (c, x, y) => { c.vline(x, y - 4, 5, "B"); c.circ(x, y - 7, 5, "G"); c.circ(x - 1, y - 8, 4, "g"); c.px(x - 2, y - 10, "l") }
const flowers = (c, pts) => pts.forEach(([x, y], i) => c.px(x, y, i % 3 ? "m" : "y"))

sprite("place-plot", { w: W, h: H },
  (c) => { c.ellipse(32, 40, 18, 6, "B"); c.ellipse(32, 39, 16, 5, "b"); for (const x of [16, 48]) c.vline(x, 30, 10, "t"); c.line(16, 31, 48, 31, "d")
    c.vline(32, 24, 14, "B"); c.rect(26, 22, 13, 8, "t"); c.rect(27, 23, 11, 6, "d"); c.text(30, 23, "?", "B") })

// ── Creature Sanctuary ──
sprite("place-sanctuary-1", { w: W, h: H, outline: "k" }, (c) => {
  c.poly([16, 40, 30, 18, 44, 40], "o"); c.poly([30, 18, 44, 40, 30, 40], "r"); c.poly([27, 40, 30, 30, 33, 40], "k")
  fence(c, 4, 41, 16); fence(c, 44, 41, 16); flowers(c, [[8, 46], [12, 47], [50, 46], [56, 47], [24, 46]])
})
sprite("place-sanctuary-2", { w: W, h: H, outline: "k" }, (c) => {
  c.ellipse(40, 40, 16, 6, "N"); c.ellipse(40, 39, 15, 5, "n"); c.hline(34, 37, 6, "a"); c.px(46, 40, "a")
  roundTree(c, 12, 38); roundTree(c, 22, 30)
  c.rect(52, 22, 2, 14, "B"); c.rect(49, 18, 8, 6, "t"); c.poly([48, 18, 53, 13, 58, 18], "r"); c.circ(53, 21, 1, "k")
  fence(c, 2, 44, 28); flowers(c, [[6, 48], [14, 49], [20, 48], [30, 48], [58, 47]])
})
sprite("place-sanctuary-3", { w: W, h: H, outline: "k" }, (c) => {
  c.ellipse(16, 42, 14, 5, "N"); c.ellipse(16, 41, 13, 4, "n"); c.hline(10, 40, 5, "a")
  // gazebo
  for (const x of [34, 40, 46, 52]) c.rect(x, 24, 2, 16, "w")
  c.rect(32, 39, 24, 3, "z"); c.poly([30, 25, 44, 12, 58, 25], "M"); c.poly([34, 25, 44, 15, 44, 25], "m"); c.px(44, 10, "y")
  roundTree(c, 8, 30); roundTree(c, 60, 44)
  // flower arch
  c.ellipse(20, 30, 8, 10, "g", true); c.rect(12, 30, 17, 12, "_"); flowers(c, [[13, 26], [17, 21], [23, 21], [27, 26], [12, 30], [28, 30]])
})

// ── Fantasy Village ──
sprite("place-village-1", { w: W, h: H, outline: "k" }, (c) => {
  cottage(c, 10, 28, 16, 14, "d", "t", "r", "R"); cottage(c, 36, 30, 14, 12, "z", "s", "n", "N")
  flowers(c, [[6, 44], [30, 45], [54, 44]])
})
sprite("place-village-2", { w: W, h: H, outline: "k" }, (c) => {
  cottage(c, 4, 26, 14, 14, "d", "t", "r", "R"); cottage(c, 24, 20, 16, 16, "z", "s", "n", "N"); cottage(c, 46, 28, 14, 12, "d", "t", "g", "G")
  // market stall and well
  c.rect(26, 40, 2, 7, "B"); c.rect(38, 40, 2, 7, "B"); for (let i = 0; i < 14; i += 4) c.rect(26 + i, 38, 2, 3, "r"), c.rect(28 + i, 38, 2, 3, "w"); c.rect(27, 44, 12, 3, "t"); c.px(30, 43, "o"); c.px(34, 43, "l")
  c.ellipse(53, 46, 5, 2, "s"); c.rect(48, 42, 10, 4, "s"); c.vline(48, 36, 6, "B"); c.vline(57, 36, 6, "B"); c.poly([46, 36, 53, 32, 60, 36], "R")
})
sprite("place-village-3", { w: W, h: H, outline: "k" }, (c) => {
  cottage(c, 2, 30, 12, 12, "d", "t", "r", "R"); cottage(c, 16, 22, 12, 20, "z", "s", "n", "N"); cottage(c, 30, 18, 14, 24, "d", "t", "p", "P"); cottage(c, 47, 28, 14, 14, "z", "s", "g", "G")
  c.rect(35, 12, 4, 6, "s"); c.circ(37, 9, 1, "z")
  for (const x of [14, 29, 45]) { c.vline(x, 38, 9, "S"); c.rect(x - 1, 36, 3, 3, "y") }
  for (let x = 2; x < 62; x += 5) c.px(x, 15 + Math.round(Math.sin(x / 6) * 2), "y")
})

// ── Magical Library ──
sprite("place-library-1", { w: W, h: H, outline: "k" }, (c) => {
  c.poly([14, 42, 30, 16, 46, 42], "n"); c.poly([30, 16, 46, 42, 30, 42], "N"); c.poly([26, 42, 30, 30, 34, 42], "k")
  for (const [x, col] of [[48, "r"], [51, "y"], [54, "g"], [57, "p"]]) c.rect(x, 36, 3, 8, col)
  c.rect(47, 44, 14, 2, "B"); c.rect(6, 32, 2, 12, "B"); c.rect(1, 26, 12, 8, "t"); c.rect(3, 28, 4, 4, "w"); c.rect(7, 28, 4, 4, "w"); c.vline(7, 28, 4, "s"); c.hline(4, 29, 2, "s"); c.hline(8, 29, 2, "s")
})
sprite("place-library-2", { w: W, h: H, outline: "k" }, (c) => {
  tower(c, 22, 18, 20, 28, "n"); c.circ(32, 26, 3, "a"); c.circ(32, 26, 1, "w")
  c.rect(29, 38, 6, 8, "B"); for (const [x, col] of [[8, "r"], [11, "y"], [14, "p"]]) c.rect(x, 38, 3, 8, col)
  c.rect(7, 46, 12, 2, "B"); roundTree(c, 52, 46)
})
sprite("place-library-3", { w: W, h: H, outline: "k" }, (c) => {
  tower(c, 8, 22, 14, 24, "n"); tower(c, 42, 22, 14, 24, "n")
  c.rect(18, 20, 28, 26, "z"); c.rect(18, 20, 28, 2, "w"); c.ellipse(32, 20, 13, 10, "N"); c.rect(19, 20, 27, 10, "_"); c.ellipse(32, 20, 12, 9, "N"); c.rect(19, 21, 27, 10, "z"); c.rect(18, 20, 28, 2, "w")
  c.ellipse(32, 15, 12, 8, "N"); c.rect(20, 16, 25, 5, "z")
  for (const [x, y] of [[28, 10], [34, 9], [38, 13], [25, 14]]) c.px(x, y, "y")
  c.line(36, 9, 44, 4, "s", 2); c.rect(28, 34, 8, 12, "B"); c.rect(29, 35, 6, 1, "y")
  for (const x of [22, 40]) c.rect(x, 28, 3, 4, "a")
})

// ── Training Arena ──
sprite("place-arena-1", { w: W, h: H, outline: "k" }, (c) => {
  c.ellipse(32, 38, 24, 9, "t"); c.ellipse(32, 38, 22, 7, "d")
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.vline(Math.round(32 + Math.cos(a) * 24), Math.round(36 + Math.sin(a) * 9), 4, "B") }
  c.vline(32, 26, 12, "B"); c.hline(27, 29, 11, "B"); c.circ(32, 25, 3, "o"); c.rect(29, 28, 7, 7, "y")
})
sprite("place-arena-2", { w: W, h: H, outline: "k" }, (c) => {
  c.ellipse(32, 40, 26, 9, "t"); c.ellipse(32, 40, 24, 7, "d")
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; c.vline(Math.round(32 + Math.cos(a) * 26), Math.round(38 + Math.sin(a) * 9), 4, "B") }
  flag(c, 6, 18, "r"); flag(c, 56, 18, "n"); flag(c, 30, 12, "y")
  c.circ(44, 34, 5, "w"); c.circ(44, 34, 3, "r"); c.circ(44, 34, 1, "y"); c.vline(44, 39, 4, "B")
  c.vline(20, 30, 10, "B"); c.hline(16, 33, 9, "B"); c.circ(20, 29, 3, "o"); c.rect(17, 32, 7, 6, "y")
})
sprite("place-arena-3", { w: W, h: H, outline: "k" }, (c) => {
  c.ellipse(32, 34, 30, 14, "s"); c.ellipse(32, 30, 28, 11, "z"); c.ellipse(32, 31, 22, 7, "d"); c.rect(2, 34, 61, 12, "s")
  for (let x = 6; x < 60; x += 7) { c.rect(x, 37, 4, 6, "S"); c.ellipse(x + 2, 37, 2, 1, "S") }
  c.hline(2, 34, 61, "z"); c.rect(28, 38, 8, 8, "k")
  flag(c, 4, 14, "r"); flag(c, 58, 14, "n"); flag(c, 20, 12, "y"); flag(c, 42, 12, "g")
})

// ── Royal Castle ──
sprite("place-castle-1", { w: W, h: H, outline: "k" }, (c) => { tower(c, 24, 16, 16, 30, null); flag(c, 31, 6, "r"); c.rect(29, 38, 6, 8, "B") })
sprite("place-castle-2", { w: W, h: H, outline: "k" }, (c) => {
  tower(c, 6, 18, 12, 28, null); tower(c, 46, 18, 12, 28, null); c.rect(16, 24, 32, 22, "s"); c.rect(44, 24, 4, 22, "S")
  for (let i = 16; i < 48; i += 4) c.rect(i, 22, 3, 2, "s"); c.ellipse(32, 38, 5, 5, "B"); c.rect(27, 38, 11, 8, "B"); flag(c, 11, 8, "r"); flag(c, 51, 8, "n")
})
sprite("place-castle-3", { w: W, h: H, outline: "k" }, (c) => {
  tower(c, 2, 24, 10, 22, "n"); tower(c, 52, 24, 10, 22, "n"); tower(c, 14, 18, 10, 28, "n"); tower(c, 40, 18, 10, 28, "n")
  c.rect(22, 14, 20, 32, "z"); c.rect(38, 14, 4, 32, "s"); for (let i = 22; i < 42; i += 4) c.rect(i, 12, 3, 2, "z")
  c.poly([21, 14, 32, 2, 43, 14], "n"); c.poly([32, 2, 43, 14, 32, 14], "N"); flag(c, 32, -4 + 4, "y")
  c.ellipse(32, 38, 5, 5, "B"); c.rect(27, 38, 11, 8, "B"); c.rect(28, 22, 2, 4, "a"); c.rect(35, 22, 2, 4, "a")
})

// ── decorations ──
sprite("deco-bunting", { w: 60, h: 10 }, (c) => {
  const yAt = (x) => 1 + Math.round(3 * Math.sin((x / 59) * Math.PI))
  for (let x = 0; x < 60; x++) c.px(x, yAt(x), "k")
  const cols = ["r", "y", "n", "g", "m"]
  for (let i = 0; i < 11; i++) { const x = 2 + i * 5, y = yAt(x + 2) + 1; c.poly([x, y, x + 4, y, x + 2, y + 5], cols[i % 5]) }
})
sprite("deco-lanterns", { w: 60, h: 12 }, (c) => {
  c.line(0, 1, 30, 4, "k"); c.line(30, 4, 59, 1, "k")
  for (let i = 0; i < 6; i++) { const x = 4 + i * 10, y = 2 + Math.round(2.5 * Math.sin((i / 5) * Math.PI)); c.vline(x + 1, y, 2, "k"); c.rect(x, y + 2, 3, 4, "o"); c.px(x + 1, y + 3, "y") }
  glow("y", { r: 3, strength: 0.5 })
})
sprite("deco-fountain", { w: 26, h: 22, outline: "k" }, (c) => {
  c.ellipse(13, 17, 12, 4, "s"); c.ellipse(13, 16, 10, 3, "n"); c.rect(11, 6, 4, 10, "z"); c.ellipse(13, 7, 5, 2, "z")
  c.line(13, 2, 8, 9, "a"); c.line(13, 2, 18, 9, "a"); c.px(13, 1, "w"); c.px(7, 11, "a"); c.px(19, 11, "a")
})
sprite("deco-rainbow", { w: 44, h: 24 }, (c) => {
  ;["r", "o", "y", "g", "n", "p"].forEach((col, i) => { c.ellipse(22, 23, 21 - i * 2, 21 - i * 2, col, true); c.ellipse(22, 23, 20 - i * 2, 20 - i * 2, col, true) })
  c.circ(3, 21, 3, "w"); c.circ(41, 21, 3, "w"); c.circ(6, 22, 2, "w"); c.circ(38, 22, 2, "w")
})

// the meadow the class world stands on (places are positioned over it by the app)
scene("world-ground", { w: 320, h: 200, bg: "g" },
  layer("hills", grad(0, 0, 320, 34, "cc", "v"), (c) => { for (let x = 0; x < 320; x++) { const y = Math.round(26 - 8 * Math.sin(x / 31) - 4 * Math.sin(x / 13 + 1)); c.vline(x, y, 40 - y, "G") } },
    (c) => { for (let x = 0; x < 320; x++) { const y = Math.round(36 - 5 * Math.sin(x / 23 + 2)); c.vline(x, y, 8, "g") } }),
  layer("grass", (c) => { const r = c.rng(3); for (let i = 0; i < 260; i++) { const x = Math.floor(r() * 320), y = 44 + Math.floor(r() * 156); c.px(x, y, "l"); if (r() < 0.5) c.px(x + 1, y - 1, "l") } }),
  // a winding loop of path joining the five places
  layer("path", (c) => {
    const at = (t) => [Math.round(160 + 112 * Math.cos(t * Math.PI * 2) + 9 * Math.sin(t * Math.PI * 6)), Math.round(110 + 52 * Math.sin(t * Math.PI * 2) + 7 * Math.cos(t * Math.PI * 4))]
    for (const [col, w] of [["t", 10], ["d", 7]]) for (let i = 0; i < 240; i++) c.line(...at(i / 240), ...at((i + 1) / 240), col, w)
    const r = c.rng(4); for (let i = 0; i < 40; i++) { const [x, y] = at(r()); c.px(x + Math.floor(r() * 5) - 2, y + Math.floor(r() * 3) - 1, "t") }
  }),
  layer("pond", (c) => { c.ellipse(160, 112, 22, 9, "N"); c.ellipse(160, 111, 21, 8, "n"); c.hline(150, 108, 8, "a"); c.hline(166, 114, 5, "a") }),
  layer("flowers", (c) => { const r = c.rng(8); for (let i = 0; i < 70; i++) { const x = Math.floor(r() * 320), y = 46 + Math.floor(r() * 150); if (c.is(x, y, "gl")) c.px(x, y, i % 3 ? "m" : "y") } }),
)
