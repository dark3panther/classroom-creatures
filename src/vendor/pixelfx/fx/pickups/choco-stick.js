// An original chocolate-stick treat pickup (a generic striped wrapper, no brand artwork).
// Hover, floor shadow and glints use this library's pickup helpers.
import { fit as ramp8, clamp, cycle, TAU, WHITE, hex, mix } from "../../core/index.js";
import { Layer, shadow, twinkle, bob } from "./_lib.js";

export const meta = {
  name: "Choco stick",
  desc: "A chocolate stick treat bobs over its shadow: glossy chocolate, a striped red and yellow wrapper peeled back at a foil edge, a shine sweeping up it, twinkles.",
  tags: ["pickup", "treat", "chocolate", "sweet", "reward", "food", "loop"],
  size: [56, 64],
  origin: [28, 56],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#140703", "#2a1006", "#41190a", "#5c2610", "#7a3718", "#9a4d25", "#c97f52", "#ffe6cf"],
    wrapper: ["#5a0710", "#a3121f", "#d8242f", "#ff5a4e"],
    stripe: ["#9a6a00", "#e9b400", "#ffe14a", "#fff6b0"],
    seed: 3,
    shadow: true,
  },
};

const L = new Layer(48, 56), INK = hex("#160805");
const LEN = 30, HALF = 4.2, TILT = -0.42, HOVER = 20;
const FOIL = [hex("#7d8798"), hex("#c3cad6"), hex("#ffffff")];

/** stick-space coordinates: u along the stick (tip at +LEN/2), v across it */
function toStick(x, y, cx, cy) {
  const dx = x - cx, dy = y - cy, c = Math.cos(TILT), s = Math.sin(TILT);
  return [dx * s * -1 + dy * c * -1, dx * c - dy * s];
}

export function drawBack(p, t, o) {
  const ph = t / meta.duration;
  const lift = bob(ph, 1.6);
  if (o.shadow !== false) shadow(p, 0, 7 - lift * 0.6, 0.75);
  p.glow(0, -HOVER + lift, 20, hex(o.stripe[2]), 0.12);
}

export function draw(p, t, o) {
  const C = ramp8(o.palette, 8), Wr = ramp8(o.wrapper, 4), St = ramp8(o.stripe, 4);
  const ph = t / meta.duration, cy = Math.round(-HOVER + bob(ph, 1.6)), cx = 0;
  const shine = ((ph * 1.0) % 1) * (LEN + 16) - LEN / 2 - 8; // a shine sweeps tip-ward once a loop
  L.begin(-24, cy - 28);
  L.fill(-24, cy - 28, 23, cy + 27, (x, y) => {
    const [u, v] = toStick(x, y, cx, cy);
    const r = u > LEN / 2 - HALF ? Math.hypot(u - (LEN / 2 - HALF), v) : Math.abs(v); // rounded tip
    const bottom = u < -LEN / 2;
    if (r > HALF || bottom) return 0;
    const lt = clamp(0.62 - v / HALF * 0.55, 0, 1); // round: lit on the upper-left side
    const wrapEdge = -1.5 + Math.sin(v * 1.3) * 1.2; // the wrapper ends in a zigzag tear
    if (u < wrapEdge) {
      // wrapper: red with yellow diagonal stripes, foil lip at the torn edge
      if (u > wrapEdge - 1.4) return lt > 0.5 ? FOIL[2] : lt > 0.25 ? FOIL[1] : FOIL[0];
      const stripe = (((u - v * 0.9) % 5) + 5) % 5 < 2;
      const P = stripe ? St : Wr;
      return lt > 0.82 ? P[3] : lt > 0.5 ? P[2] : lt > 0.22 ? P[1] : P[0];
    }
    // glossy chocolate, with a sweeping shine band
    const spec = Math.abs(v + HALF * 0.5) < 0.7; // the glossy highlight line along the lit side
    if (spec && Math.abs(u - shine) < 2.2) return WHITE;  // the sweep brightens it as it passes
    if (spec) return C[5];
    return lt > 0.82 ? C[4] : lt > 0.58 ? C[3] : lt > 0.3 ? C[2] : C[1];
  });
  L.outline(INK).draw(p);
  p.glow(cx, cy, 11, C[5], 0.18);
  // twinkles pop round it
  cycle(t, meta.duration, 3, o.seed, 0.5, (age, life, r) => {
    const k = age / life, s = Math.round(4 * Math.sin(k * Math.PI));
    const a = r.range(0, TAU), d = r.range(13, 19);
    const x = Math.round(Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.85);
    if (s > 0) { twinkle(p, x, y, s, St[1], St[2]); p.light(x, y, St[2], 0.5 * (1 - k)); }
  });
}
