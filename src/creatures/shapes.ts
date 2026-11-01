/** Small geometry + colour helpers shared by the creature renderer. */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

export const darken = (hex: string, t: number) => mix(hex, '#1a1033', t);
export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t);

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const f = (n: number) => Math.round(n * 10) / 10;

/** Egg/blob body. `pinch` < 1 narrows the top (pear), > 1 widens it. */
export function blob(cx: number, cy: number, rx: number, ry: number, pinch = 1): string {
  const t = rx * 0.55 * pinch;
  const s = rx * Math.min(1, 0.85 + 0.15 * pinch);
  return [
    `M ${f(cx)} ${f(cy - ry)}`,
    `C ${f(cx + t)} ${f(cy - ry)} ${f(cx + s)} ${f(cy - ry * 0.45)} ${f(cx + rx)} ${f(cy + ry * 0.15)}`,
    `C ${f(cx + rx)} ${f(cy + ry * 0.78)} ${f(cx + rx * 0.6)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}`,
    `C ${f(cx - rx * 0.6)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ry * 0.78)} ${f(cx - rx)} ${f(cy + ry * 0.15)}`,
    `C ${f(cx - s)} ${f(cy - ry * 0.45)} ${f(cx - t)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)} Z`,
  ].join(' ');
}

/** Upward flame with base at (x, y). */
export function flame(x: number, y: number, w: number, h: number, lean = 0.15): string {
  return `M ${f(x)} ${f(y)} C ${f(x - w)} ${f(y - h * 0.25)} ${f(x - w * 0.55)} ${f(y - h * 0.7)} ${f(x + w * lean)} ${f(y - h)} C ${f(x + w * 0.1)} ${f(y - h * 0.62)} ${f(x + w)} ${f(y - h * 0.5)} ${f(x + w * 0.75)} ${f(y - h * 0.12)} C ${f(x + w * 0.55)} ${f(y + h * 0.05)} ${f(x + w * 0.2)} ${f(y)} ${f(x)} ${f(y)} Z`;
}

/** Leaf from (0,0) pointing up with length l (use with a transform). */
export function leaf(l: number, w = l * 0.42): string {
  return `M 0 0 Q ${f(w)} ${f(-l * 0.45)} 0 ${f(-l)} Q ${f(-w)} ${f(-l * 0.45)} 0 0 Z`;
}

export function star(x: number, y: number, r: number, points = 5, inner = 0.45, rot = -Math.PI / 2): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / points;
    pts.push(`${f(x + Math.cos(a) * rr)},${f(y + Math.sin(a) * rr)}`);
  }
  return pts.join(' ');
}

/** Lightning bolt roughly s tall, centred on (x, y). */
export function bolt(x: number, y: number, s: number): string {
  const p = [[0.1, -0.5], [-0.28, 0.05], [-0.02, 0.05], [-0.12, 0.5], [0.3, -0.08], [0.04, -0.08], [0.18, -0.5]];
  return p.map(([a, b]) => `${f(x + a * s)},${f(y + b * s)}`).join(' ');
}

/** Elongated crystal (hexagonal prism) from base (0,0) upward, length l. */
export function crystal(l: number, w = l * 0.32): string {
  return `0,0 ${f(-w)},${f(-l * 0.25)} ${f(-w * 0.7)},${f(-l * 0.85)} 0,${f(-l)} ${f(w * 0.7)},${f(-l * 0.85)} ${f(w)},${f(-l * 0.25)}`;
}

export function droplet(x: number, y: number, r: number): string {
  return `M ${f(x)} ${f(y - r * 1.7)} C ${f(x + r * 0.4)} ${f(y - r)} ${f(x + r)} ${f(y - r * 0.4)} ${f(x + r)} ${f(y + r * 0.2)} A ${f(r)} ${f(r)} 0 0 1 ${f(x - r)} ${f(y + r * 0.2)} C ${f(x - r)} ${f(y - r * 0.4)} ${f(x - r * 0.4)} ${f(y - r)} ${f(x)} ${f(y - r * 1.7)} Z`;
}

export function cloud(x: number, y: number, s: number): string {
  return `M ${f(x - s)} ${f(y)} a ${f(s * 0.5)} ${f(s * 0.5)} 0 0 1 ${f(s * 0.5)} ${f(-s * 0.55)} a ${f(s * 0.6)} ${f(s * 0.6)} 0 0 1 ${f(s * 1.05)} ${f(-s * 0.1)} a ${f(s * 0.45)} ${f(s * 0.45)} 0 0 1 ${f(s * 0.45)} ${f(s * 0.65)} Z`;
}
