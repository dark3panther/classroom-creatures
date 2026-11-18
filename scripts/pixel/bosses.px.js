// The six bosses: original characters, each in a grumpy and a befriended form, plus a stone statue for
// the class sanctuary. Bosses are never defeated, only befriended.
include("palette.px.js")

/** Eyes, brows and mouth. mood: "grumpy" or "happy". */
function face(c, cx, cy, gap, mood, mw = 6) {
  for (const s of [-1, 1]) {
    const x = cx + s * gap
    if (mood === "grumpy") {
      c.rect(x - 1, cy, 3, 3, "e"); c.px(x - 1, cy, "w")
      c.line(x + 2 * s, cy - 3, x - 2 * s, cy - 1, "k")
    } else {
      c.px(x - 2, cy + 2, "e"); c.px(x - 1, cy + 1, "e"); c.px(x, cy, "e"); c.px(x + 1, cy + 1, "e"); c.px(x + 2, cy + 2, "e")
      c.px(x + 2 * s, cy + 4, "m"); c.px(x + 2 * s + s, cy + 4, "m")
    }
  }
  const l = cx - Math.floor(mw / 2)
  if (mood === "grumpy") { c.hline(l + 1, cy + 5, mw - 2, "k"); c.px(l, cy + 6, "k"); c.px(l + mw - 1, cy + 6, "k") }
  else { c.hline(l + 1, cy + 7, mw - 2, "k"); c.px(l, cy + 6, "k"); c.px(l + mw - 1, cy + 6, "k"); c.hline(l + 2, cy + 6, mw - 4, "r") }
}

const STONE = { S: "s", G: "s", g: "z", l: "w", B: "s", b: "z", t: "w", N: "s", n: "z", a: "w", P: "s", p: "z", q: "w", I: "z", i: "w", s: "z", z: "w", R: "s", r: "z", o: "z", y: "w", M: "s", m: "z", C: "z", c: "w", D: "s", d: "z", e: "S", h: "w" }

/** Define boss-<id> (grumpy), boss-<id>-friend and statue-<id> from one body drawing. */
function boss(id, size, body) {
  sprite(`boss-${id}`, { ...size, outline: "k" }, (c) => body(c, "grumpy"))
  sprite(`boss-${id}-friend`, { ...size, outline: "k" }, (c) => body(c, "happy"))
  sprite(`statue-${id}`, { base: `boss-${id}-friend`, swap: STONE })
}

sprite("_bloom", `
  .m.
  mym
  .m.`)
sprite("_gem", { outline: "k" }, `
  .q.
  qpa
  .p.`)

// Grumblethorn: a grumpy tangle of brambles. Befriended, it bursts into flowers.
boss("grumblethorn", { w: 44, h: 40 }, (c, mood) => {
  const happy = mood === "happy"
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, x = 22 + Math.cos(a) * 16, y = 20 + Math.sin(a) * 15
    const tx = 22 + Math.cos(a) * 20, ty = 20 + Math.sin(a) * 19
    if (y < 33) c.poly([Math.round(x - Math.sin(a) * 2), Math.round(y + Math.cos(a) * 2), Math.round(tx), Math.round(ty), Math.round(x + Math.sin(a) * 2), Math.round(y - Math.cos(a) * 2)], happy ? "l" : "b")
  }
  c.circ(22, 20, 16, "G"); c.circ(21, 19, 14, "g")
  c.ellipse(15, 13, 6, 4, "l", true); c.ellipse(29, 26, 6, 4, "G", true); c.ellipse(28, 11, 5, 3, "G", true); c.ellipse(13, 26, 5, 3, "G", true)
  c.rect(13, 34, 6, 4, "B"); c.rect(25, 34, 6, 4, "B")
  face(c, 22, 18, 6, mood, 8)
  if (happy) for (const [x, y] of [[9, 10], [31, 7], [35, 20], [8, 23], [20, 4], [30, 30], [13, 31]]) c.stamp("_bloom", x, y)
})

// Glimmerjaw: a crystal crab guarding a pile of gems.
boss("glimmerjaw", { w: 50, h: 36 }, (c, mood) => {
  const happy = mood === "happy"
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) c.line(25 + s * (8 + i * 3), 26, 25 + s * (14 + i * 4), 33, "P", 2)
    const cx = 25 + s * 19, cy = happy ? 9 : 17
    c.line(25 + s * 12, 22, cx, cy + 4, "P", 3)
    c.circ(cx, cy, 6, "p"); c.circ(cx - s, cy - 1, 4, "q")
    c.poly([cx + s * 2, cy - 7, cx + s * 7, cy - 3, cx + s * 3, cy], "_")
    if (happy) c.stamp("_gem", cx - 1, cy - 9)
  }
  c.ellipse(25, 22, 15, 10, "P"); c.ellipse(25, 21, 14, 9, "p"); c.ellipse(22, 18, 7, 4, "q")
  for (const [x, y] of [[16, 9], [22, 6], [29, 7], [34, 11]]) c.poly([x, y + 6, x + 2, y, x + 4, y + 6], "q")
  for (const s of [-1, 1]) { c.vline(25 + s * 5, 7, 6, "P"); c.circ(25 + s * 5, 6, 2, "w"); c.px(25 + s * 5, 6, "e") }
  if (!happy) { c.line(18, 3, 22, 4, "k"); c.line(32, 3, 28, 4, "k") }
  const mw = 8, l = 21
  if (happy) { c.hline(l + 1, 27, mw - 2, "k"); c.px(l, 26, "k"); c.px(l + mw - 1, 26, "k"); c.px(17, 24, "m"); c.px(33, 24, "m") }
  else { c.hline(l + 1, 25, mw - 2, "k"); c.px(l, 26, "k"); c.px(l + mw - 1, 26, "k") }
})

// Sir Snowsulk: a snow giant who froze the pass because nobody said hello.
boss("snowsulk", { w: 42, h: 46 }, (c, mood) => {
  const happy = mood === "happy"
  c.ellipse(21, 33, 17, 12, "i"); c.ellipse(19, 31, 14, 9, "w")
  c.circ(21, 15, 11, "i"); c.circ(20, 14, 9, "w")
  // ice crown
  c.rect(12, 4, 18, 3, "I"); for (const x of [12, 17, 22, 27]) c.poly([x, 4, x + 1.5, 0, x + 3, 4], "a")
  // arms: crossed when sulking, waving when happy
  if (happy) { c.line(6, 30, 1, 20, "B", 2); c.line(36, 30, 41, 20, "B", 2); c.line(1, 20, 0, 17, "B"); c.line(41, 20, 42, 17, "B") }
  else { c.line(8, 30, 30, 34, "s", 3); c.line(34, 30, 12, 34, "s", 3) }
  for (const y of [28, 34, 40]) c.circ(21, y, 1, "S")
  if (happy) { c.rect(10, 22, 22, 3, "r"); c.rect(24, 24, 3, 7, "r"); c.hline(10, 24, 22, "R") }
  face(c, 21, 12, 5, mood, 6)
})

// Magmaw: a lava toad with the hiccups. Every hiccup makes the volcano rumble.
boss("magmaw", { w: 48, h: 38 }, (c, mood) => {
  const happy = mood === "happy"
  c.ellipse(24, 25, 21, 12, "k"); c.ellipse(24, 24, 20, 11, "S")
  c.circ(14, 12, 6, "S"); c.circ(34, 12, 6, "S"); c.ellipse(22, 19, 11, 4, "s"); c.circ(13, 10, 3, "s"); c.circ(33, 10, 3, "s")
  const crack = happy ? "o" : "r"
  for (const pts of [[[8, 22], [12, 26], [10, 31]], [[38, 20], [35, 26], [39, 30]], [[20, 31], [24, 34], [28, 31]], [[17, 16], [21, 19]], [[31, 16], [27, 19]]]) {
    for (let i = 1; i < pts.length; i++) c.line(...pts[i - 1], ...pts[i], crack)
  }
  c.px(11, 26, "y"); c.px(36, 26, "y")
  for (const s of [-1, 1]) {
    const x = 24 + s * 10
    if (happy) { c.px(x - 2, 13, "e"); c.px(x - 1, 12, "e"); c.px(x, 11, "e"); c.px(x + 1, 12, "e"); c.px(x + 2, 13, "e") }
    else { c.rect(x - 2, 11, 4, 3, "y"); c.rect(x - 1, 11, 2, 3, "e"); c.line(x + 3 * s, 7, x - 3 * s, 9, "k") }
  }
  // the wide mouth
  if (happy) { c.line(10, 22, 16, 25, "k"); c.hline(16, 25, 16, "k"); c.line(32, 25, 38, 22, "k"); c.px(14, 20, "m"); c.px(34, 20, "m") }
  else { c.hline(12, 23, 24, "k"); c.px(11, 24, "k"); c.px(36, 24, "k"); c.circ(41, 9, 3, "z"); c.circ(45, 4, 2, "z") }
  c.rect(6, 33, 8, 3, "S"); c.rect(34, 33, 8, 3, "S")
})

// Whirlwing: a giant storm kite spinning so fast the islands drift apart.
boss("whirlwing", { w: 44, h: 48 }, (c, mood) => {
  const happy = mood === "happy"
  const [a, b, d, e] = happy ? ["y", "o", "m", "n"] : ["S", "s", "C", "s"]
  c.poly([22, 1, 40, 18, 22, 18], a); c.poly([40, 18, 22, 35, 22, 18], b); c.poly([22, 35, 4, 18, 22, 18], d); c.poly([4, 18, 22, 1, 22, 18], e)
  c.line(22, 1, 22, 35, "k"); c.line(4, 18, 40, 18, "k")
  c.ellipse(22, 18, 9, 7, happy ? "w" : "z")
  // the tail with bows
  const tail = [[22, 35], [26, 39], [19, 43], [24, 47]]
  for (let i = 1; i < tail.length; i++) c.line(...tail[i - 1], ...tail[i], "k")
  const bows = happy ? ["r", "y", "g"] : ["y", "y", "y"]
  tail.slice(1).forEach(([x, y], i) => { c.poly([x - 3, y - 2, x, y, x - 3, y + 2], bows[i]); c.poly([x + 3, y - 2, x, y, x + 3, y + 2], bows[i]) })
  face(c, 22, 15, 4, mood, 6)
})

// The Clockwork Colossus: the ancient guardian of the Star Temple, wound up too tight.
boss("colossus", { w: 46, h: 48 }, (c, mood) => {
  const happy = mood === "happy"
  c.rect(8, 18, 30, 20, "D"); c.rect(9, 18, 22, 19, "d"); c.hline(8, 18, 30, "t")
  c.rect(14, 3, 18, 14, "D"); c.rect(15, 3, 13, 13, "d"); c.rect(21, 0, 4, 3, "D"); c.px(22, 0, "y")
  // visor
  c.rect(16, 7, 14, 5, "k")
  if (happy) { for (const x of [19, 26]) { c.px(x - 1, 10, "a"); c.px(x, 9, "a"); c.px(x + 1, 10, "a") } c.hline(20, 14, 6, "k"); c.px(19, 13, "k"); c.px(26, 13, "k") }
  else { c.hline(17, 9, 12, "r"); c.hline(18, 10, 10, "o"); c.hline(19, 14, 8, "k") }
  // chest gear
  c.circ(23, 27, 6, "B"); c.circ(23, 27, 4, happy ? "m" : "t"); c.circ(23, 27, 1, happy ? "w" : "D")
  for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; c.px(Math.round(23 + Math.cos(ang) * 7), Math.round(27 + Math.sin(ang) * 7), "B") }
  // arms and legs
  c.rect(2, 19, 5, 15, "D"); c.rect(39, 19, 5, 15, "D"); c.rect(2, 34, 5, 4, "B"); c.rect(39, 34, 5, 4, "B")
  c.rect(12, 38, 8, 9, "D"); c.rect(26, 38, 8, 9, "D"); c.rect(12, 44, 8, 3, "B"); c.rect(26, 44, 8, 3, "B")
  c.px(10, 21, "y"); c.px(35, 21, "y"); c.px(10, 35, "y"); c.px(35, 35, "y")
})
