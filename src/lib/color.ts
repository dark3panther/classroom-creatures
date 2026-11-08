/** Mix two hex colours: t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

/** A dark → light palette for pixel effects, built from an element's colours. */
export function elementPalette(el: { color: string; glow: string; particle: string }): string[] {
  return [mix(el.color, '#000000', 0.55), mix(el.color, '#000000', 0.25), el.color, el.glow, el.particle, '#ffffff'];
}
