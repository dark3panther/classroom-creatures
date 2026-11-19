// Pixel mode bits of the interface: the sun in the sky.
include("palette.px.js")

sprite("pixel-sun", { w: 40, h: 40 }, (c) => {
  // rays: short stepped beams in eight directions
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x0 = 20 + Math.cos(a) * 13, y0 = 20 + Math.sin(a) * 13, x1 = 20 + Math.cos(a) * 19, y1 = 20 + Math.sin(a) * 19
    c.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), i % 2 ? "h" : "y", i % 2 ? 1 : 2)
  }
  c.circ(20, 20, 11, "o"); c.circ(20, 20, 10, "y"); c.circ(18, 18, 7, "h"); c.circ(16, 16, 3, "w")
})
