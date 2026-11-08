import type { ReactNode } from 'react';
import type { MythicPath } from '../data/branches';
import { star } from './shapes';

/** Where ornaments go, in the creature svg's coordinates (viewBox -8 -22 216 222). */
export interface OrnamentBox { cx: number; top: number; headR: number; bottom: number; left: number; right: number }

/** The colour grade that turns the Legendary art into the mythical path (skipped when bespoke art exists). */
export function MythicFilter({ id, path }: { id: string; path: MythicPath }) {
  const { hue, sat, bright } = path.grade;
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix type="hueRotate" values={String(hue)} />
      <feColorMatrix type="saturate" values={String(sat)} />
      <feComponentTransfer>
        <feFuncR type="linear" slope={bright} />
        <feFuncG type="linear" slope={bright} />
        <feFuncB type="linear" slope={bright} />
      </feComponentTransfer>
    </filter>
  );
}

const LINE = '#2b2140';

function flame(x: number, y: number, w: number, h: number) {
  return `M${x} ${y} C${x - w} ${y - h * 0.35} ${x - w * 0.35} ${y - h * 0.7} ${x} ${y - h} C${x + w * 0.35} ${y - h * 0.7} ${x + w} ${y - h * 0.35} ${x} ${y} Z`;
}
function bolt(x: number, y: number, s: number) {
  return `${x},${y} ${x - 5 * s},${y + 11 * s} ${x - 0.5 * s},${y + 11 * s} ${x - 4 * s},${y + 22 * s} ${x + 6 * s},${y + 8 * s} ${x + 1.5 * s},${y + 8 * s} ${x + 4 * s},${y}`;
}
function crown(cx: number, base: number, w: number, h: number, n: number) {
  const pts: string[] = [`${cx - w / 2},${base}`];
  for (let i = 0; i < n; i++) {
    const x0 = cx - w / 2 + (w / n) * i;
    pts.push(`${x0 + w / n / 2},${base - h * (i % 2 === 0 ? 1 : 0.7)}`, `${x0 + w / n},${base}`);
  }
  return pts.join(' ');
}

/** Ornaments drawn behind the creature. */
export function MythicBack({ path, b }: { path: MythicPath; b: OrnamentBox }) {
  const [main, light, dark] = path.colors;
  const midY = (b.top + b.bottom) / 2;
  switch (path.motif) {
    case 'dawn':
      return (
        <g className="cc-pulse">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={b.cx + Math.cos(a) * b.headR * 1.25} y1={b.top + b.headR + Math.sin(a) * b.headR * 1.25} x2={b.cx + Math.cos(a) * b.headR * 1.75} y2={b.top + b.headR + Math.sin(a) * b.headR * 1.75} stroke={main} strokeWidth={4} strokeLinecap="round" opacity={0.8} />;
          })}
          <circle cx={b.cx} cy={b.top + b.headR} r={b.headR * 1.15} fill={light} opacity={0.85} />
        </g>
      );
    case 'amethyst':
      return (
        <g>
          {[[-0.9, 1.25, 0.9], [-0.35, 1.6, 1.15], [0.3, 1.5, 1.05], [0.85, 1.2, 0.85]].map(([dx, h, s], i) => {
            const x = b.cx + dx * b.headR, y = midY + 6;
            return <polygon key={i} points={`${x - 8 * s},${y} ${x},${y - 34 * h} ${x + 8 * s},${y}`} fill={i % 2 ? main : light} stroke={dark} strokeWidth={2} strokeLinejoin="round" />;
          })}
        </g>
      );
    case 'nebula':
      return <ellipse cx={b.cx} cy={midY + 8} rx={(b.right - b.left) * 0.66} ry={18} fill="none" stroke={main} strokeWidth={5} strokeDasharray="10 7" opacity={0.75} className="cc-spin-slow" style={{ transformOrigin: `${b.cx}px ${midY + 8}px` }} />;
    case 'voidvolt':
      return <ellipse cx={b.cx} cy={b.top - 4} rx={b.headR * 0.95} ry={9} fill="none" stroke={main} strokeWidth={4} strokeDasharray="6 5" className="cc-pulse" />;
    default:
      return null;
  }
}

/** Ornaments drawn in front of the creature. */
export function MythicFront({ path, b, still }: { path: MythicPath; b: OrnamentBox; still?: boolean }) {
  const [main, light, dark] = path.colors;
  const top = b.top + 4;
  const anim = (cls: string) => (still ? undefined : cls);
  const sparkles = (n: number, color: string): ReactNode =>
    Array.from({ length: n }).map((_, i) => {
      const x = b.left + ((b.right - b.left) / (n - 1 || 1)) * i + (i % 2 ? 6 : -4);
      const y = b.top + 10 + ((i * 37) % 70);
      return <polygon key={i} points={star(x, y, 6, 2.6, 0.3)} fill={color} stroke={dark} strokeWidth={0.8} className={anim('cc-twinkle')} style={{ animationDelay: `${i * 0.4}s` }} />;
    });
  switch (path.motif) {
    case 'frostflame':
      return (
        <g>
          {[-0.8, -0.4, 0, 0.4, 0.8].map((dx, i) => (
            <path key={i} d={flame(b.cx + dx * b.headR, top + 4, 7 + (i === 2 ? 3 : 0), 22 + (2 - Math.abs(i - 2)) * 7)} fill={i % 2 ? light : main} stroke={dark} strokeWidth={1.8} className={anim('cc-flicker')} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
          {sparkles(3, light)}
        </g>
      );
    case 'stormtide':
      return (
        <g>
          <polygon points={bolt(b.left + 4, b.top + 18, 1.1)} fill={main} stroke={dark} strokeWidth={1.6} strokeLinejoin="round" className={anim('cc-pulse')} />
          <polygon points={bolt(b.right - 2, b.top + 30, 0.9)} fill={light} stroke={dark} strokeWidth={1.6} strokeLinejoin="round" className={anim('cc-pulse')} style={{ animationDelay: '.6s' }} />
          <path d={`M${b.cx - 40} ${b.bottom - 2} q10 -12 20 0 t20 0 t20 0 t20 0`} fill="none" stroke={main} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
        </g>
      );
    case 'autumn':
      return (
        <g>
          {[-0.85, -0.45, 0, 0.45, 0.85].map((dx, i) => (
            <ellipse key={i} cx={b.cx + dx * b.headR} cy={top - 6 + Math.abs(dx) * 6} rx={6} ry={11} transform={`rotate(${dx * 40} ${b.cx + dx * b.headR} ${top - 6})`} fill={i % 2 ? light : main} stroke={dark} strokeWidth={1.6} />
          ))}
          {[0, 1, 2].map((i) => (
            <ellipse key={`f${i}`} cx={b.left + 12 + i * ((b.right - b.left) / 2.4)} cy={b.top + 6} rx={4} ry={7} fill={i === 1 ? light : main} stroke={dark} strokeWidth={1.2} className={anim('cc-fall')} style={{ animationDelay: `${i * 1.6}s` }} />
          ))}
        </g>
      );
    case 'voidvolt':
      return (
        <g>
          <g className={anim('cc-orbit')} style={{ transformOrigin: `${b.cx}px ${(b.top + b.bottom) / 2}px` }}>
            {[0, 1, 2].map((i) => {
              const a = (i / 3) * Math.PI * 2;
              const x = b.cx + Math.cos(a) * (b.right - b.left) * 0.55, y = (b.top + b.bottom) / 2 + Math.sin(a) * 30;
              return <polygon key={i} points={`${x},${y - 7} ${x + 5},${y} ${x},${y + 7} ${x - 5},${y}`} fill={light} stroke={dark} strokeWidth={1.4} />;
            })}
          </g>
          <polygon points={bolt(b.cx + b.headR * 0.95, b.top + 6, 0.8)} fill={main} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" className={anim('cc-pulse')} />
        </g>
      );
    case 'sunfrost':
      return (
        <g>
          <polygon points={crown(b.cx, top + 2, b.headR * 1.4, 20, 5)} fill={main} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
          <polygon points={crown(b.cx, top + 2, b.headR * 0.9, 11, 3)} fill={light} opacity={0.9} />
          {sparkles(4, light)}
        </g>
      );
    case 'amethyst':
      return (
        <g>
          {[[-0.7, 0.8], [0.75, 0.7]].map(([dx, s], i) => {
            const x = b.cx + dx * b.headR * 1.3, y = b.bottom - 2;
            return <polygon key={i} points={`${x - 7 * s},${y} ${x - 2 * s},${y - 22 * s} ${x + 4 * s},${y - 26 * s} ${x + 8 * s},${y}`} fill={i ? light : main} stroke={dark} strokeWidth={1.6} strokeLinejoin="round" />;
          })}
          {sparkles(3, light)}
        </g>
      );
    case 'dawn':
      return <g>{sparkles(4, light)}</g>;
    case 'moon': {
      const mx = b.cx + b.headR * 0.15, my = top - 18, r = 15;
      return (
        <g>
          <path d={`M${mx - r * 0.2} ${my - r} A${r} ${r} 0 1 0 ${mx - r * 0.2} ${my + r} A${r * 0.78} ${r * 0.78} 0 1 1 ${mx - r * 0.2} ${my - r} Z`} fill={light} stroke={dark} strokeWidth={1.8} />
          {sparkles(4, main)}
        </g>
      );
    }
    case 'nebula': {
      const midY = (b.top + b.bottom) / 2 + 8;
      const rx = (b.right - b.left) * 0.66;
      return (
        <g>
          <path d={`M${b.cx - rx} ${midY} A${rx} 18 0 0 0 ${b.cx + rx} ${midY}`} fill="none" stroke={light} strokeWidth={5} strokeDasharray="10 7" opacity={0.9} />
          {sparkles(4, light)}
        </g>
      );
    }
    case 'tempest':
      return (
        <g>
          <g fill={main} stroke={dark} strokeWidth={1.8}>
            <circle cx={b.cx - b.headR * 0.45} cy={top - 8} r={11} />
            <circle cx={b.cx + b.headR * 0.45} cy={top - 8} r={10} />
            <circle cx={b.cx} cy={top - 15} r={14} />
          </g>
          <ellipse cx={b.cx} cy={top - 4} rx={b.headR * 0.75} ry={6} fill={main} />
          <polygon points={bolt(b.cx + 3, top - 4, 0.7)} fill={light} stroke={dark} strokeWidth={1.4} strokeLinejoin="round" className={anim('cc-pulse')} />
          {[0, 1].map((i) => (
            <path key={i} d={`M${b.left - 4} ${b.top + 40 + i * 22} q14 -6 28 0`} fill="none" stroke={light} strokeWidth={3} strokeLinecap="round" className={anim('cc-drift')} style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** The line colour every ornament shares with the accessories. */
export const ORNAMENT_LINE = LINE;
