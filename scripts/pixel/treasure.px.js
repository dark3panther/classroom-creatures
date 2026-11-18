// Treasure chests (closed and open), the six region relics and small map markers.
include("palette.px.js")

/** A chest. kind picks the wood and trim; open shows the lid up and the glow inside. */
function chest(name, wood, woodD, trim, trimD, open) {
  sprite(name, { w: 24, h: 22, outline: "k" }, (c) => {
    // body
    c.rect(1, 10, 22, 11, wood); c.rect(1, 18, 22, 3, woodD); c.hline(1, 13, 22, woodD)
    c.rect(1, 10, 2, 11, trim); c.rect(21, 10, 2, 11, trim); c.rect(11, 10, 2, 11, trim)
    if (open) {
      // the lid tipped back (we see its inside), a heap of treasure glowing over the rim
      c.poly([3, 0, 21, 0, 22, 7, 2, 7], woodD); c.poly([5, 1, 19, 1, 20, 6, 4, 6], "k"); c.rect(3, 0, 2, 7, trim); c.rect(19, 0, 2, 7, trim)
      c.rect(1, 8, 22, 3, "k")
      c.ellipse(12, 9, 9, 3, "o"); c.ellipse(12, 8, 7, 3, "y"); c.ellipse(10, 7, 3, 1, "h")
      c.px(6, 8, "h"); c.px(16, 7, "h"); c.px(13, 5, "w"); c.px(8, 4, "w"); c.px(18, 4, "h")
    } else {
      c.rect(1, 3, 22, 7, wood); c.rect(3, 1, 18, 2, wood); c.hline(1, 9, 22, woodD); c.hline(3, 2, 18, "h")
      c.rect(1, 3, 2, 7, trim); c.rect(21, 3, 2, 7, trim); c.rect(3, 1, 2, 2, trim); c.rect(19, 1, 2, 2, trim)
      c.rect(10, 8, 4, 5, trimD); c.rect(11, 9, 2, 2, "k")
    }
    c.px(2, 11, "h")
  })
}
chest("chest-coins", "b", "B", "z", "s", false)
chest("chest-coins-open", "b", "B", "z", "s", true)
chest("chest-cosmetic", "n", "N", "z", "s", false)
chest("chest-cosmetic-open", "n", "N", "z", "s", true)
chest("chest-accessory", "p", "P", "y", "o", false)
chest("chest-accessory-open", "p", "P", "y", "o", true)
chest("chest-special", "r", "R", "y", "o", false)
chest("chest-special-open", "r", "R", "y", "o", true)

// relics (16×16): one keepsake from each region
sprite("relic-verdant", { outline: "k" }, `
  .....B......
  ....BbB.....
  ..BBbBbBB...
  .BbBbBbBbB..
  .BBBBBBBBB..
  ..tdddddt...
  ..tdhhddt...
  ..tdhdddt...
  ..ttddddt...
  ...ttddt....
  ....ttt.....
  .....t......`)
sprite("relic-crystal", { outline: "k" }, `
  ....SSSSS....
  ..SSsssssSS..
  .SsspqqppsS..
  .SspqqqpppsS.
  .SspqqhqppsS.
  .SsppqqpPPsS.
  ..SspppPPsS..
  ...SSsssSS...
  .....SSS.....`)
sprite("relic-frostpeak", { outline: "k" }, `
  .....a.....
  ...a.a.a...
  ....aia....
  .a..aia..a.
  ..aaiwiaa..
  aaiiiwiiiaa
  ..aaiwiaa..
  .a..aia..a.
  ....aia....
  ...a.a.a...
  .....a.....`)
sprite("relic-ember", { outline: "k" }, `
  ....RRRR....
  ..RRrrrrRR..
  .RrroyyorrR.
  .RroyhhyorR.
  .RroyhhyorR.
  .RrroyyorrR.
  ..RRrrrrRR..
  ....RRRR....`)
sprite("relic-sky", { outline: "k" }, `
  .........ww
  .......wwcw
  ......wwcw.
  .....wwcw..
  ....wwcw...
  ...wwcw....
  ..wccw.....
  .wcw.......
  .cw........
  c..........`)
sprite("relic-ancient", { outline: "k" }, `
  ...DDDDDD...
  ..DddddddD..
  .DddyddyddD.
  .DdyyyyyydD.
  .DddyyyyddD.
  .DdyyddyydD.
  .DddddddddD.
  ..DddddddD..
  ...DDDDDD...`)

// map marker flag and a lock seal
sprite("marker-flag", { outline: "k" }, `
  Brrrr.
  Brrrrr
  Brrrr.
  B.....
  B.....
  B.....`)
