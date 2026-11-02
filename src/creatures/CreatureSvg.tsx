import { Fragment, memo, useId, type ReactNode } from 'react';
import { ELEMENTS, RARITIES } from '../data/elements';
import type { Equipped, Expression, Species, Stage } from '../types';
import { blob, bolt, cloud, crystal, darken, droplet, flame, leaf, lighten, luminance, star } from './shapes';
import { Accessories, BackAccessories } from './accessories';
import { IllustratedCreature, hasIllustration } from './Illustrated';
import { useStore } from '../store/store';

/**
 * Parametric, original creature artwork. Every species is drawn from its
 * parameters (body, ears, tail, wings, face, pattern, palette) and every stage
 * adds element-specific features, so silhouettes stay recognisable while
 * evolutions look clearly different.
 */

export interface Geo {
  cx: number;
  headCx: number; headCy: number; headRx: number; headRy: number; headTop: number;
  bodyCy: number; bodyRx: number; bodyRy: number; bottom: number;
  eyeY: number; eyeDx: number; eyeR: number; mouthY: number;
  armY: number; armDx: number; tailX: number; tailY: number; neckY: number; chestY: number;
  floating: boolean; twoPiece: boolean; pinch: number;
}

const STAGE_SCALE: Record<Stage, number> = { 1: 0.64, 2: 0.75, 3: 0.86, 4: 0.94, 5: 1 };
const GROW: Record<Stage, number> = { 1: 0.35, 2: 0.55, 3: 0.75, 4: 0.9, 5: 1 };

export function geometry(sp: Species, stage: Stage): Geo {
  const baby = stage === 1 ? 1.18 : stage === 2 ? 1.08 : stage >= 4 ? 0.94 : 1;
  const tallness = stage >= 4 ? 1.04 : stage === 1 ? 0.93 : 1;
  switch (sp.body) {
    case 'tall': {
      const headCy = 88, headRx = 45, headRy = 41;
      return {
        cx: 100, headCx: 100, headCy, headRx, headRy, headTop: headCy - headRy,
        bodyCy: 146, bodyRx: 37, bodyRy: 31 * tallness, bottom: 177,
        eyeY: 88, eyeDx: 19, eyeR: 9.5 * baby, mouthY: 104,
        armY: 142, armDx: 34, tailX: 130, tailY: 160, neckY: 124, chestY: 146,
        floating: false, twoPiece: true, pinch: 1,
      };
    }
    case 'pear': {
      const cy = 118, ry = 55 * tallness;
      return {
        cx: 100, headCx: 100, headCy: 104, headRx: 50, headRy: 44, headTop: cy - ry,
        bodyCy: cy, bodyRx: 60, bodyRy: ry, bottom: cy + ry,
        eyeY: 100, eyeDx: 19, eyeR: 9.5 * baby, mouthY: 117,
        armY: 134, armDx: 56, tailX: 150, tailY: 152, neckY: 133, chestY: 150,
        floating: false, twoPiece: false, pinch: 0.62,
      };
    }
    case 'wisp': {
      const cy = 100, ry = 48 * tallness;
      return {
        cx: 100, headCx: 100, headCy: cy, headRx: 54, headRy: ry, headTop: cy - ry,
        bodyCy: cy, bodyRx: 54, bodyRy: ry, bottom: cy + ry,
        eyeY: 98, eyeDx: 21, eyeR: 10 * baby, mouthY: 116,
        armY: 122, armDx: 52, tailX: 140, tailY: 136, neckY: 130, chestY: 136,
        floating: true, twoPiece: false, pinch: 1.05,
      };
    }
    default: {
      const cy = 120, ry = 52 * tallness;
      return {
        cx: 100, headCx: 100, headCy: 110, headRx: 58, headRy: 50, headTop: cy - ry,
        bodyCy: cy, bodyRx: 58, bodyRy: ry, bottom: cy + ry,
        eyeY: 108, eyeDx: 21, eyeR: 10 * baby, mouthY: 125,
        armY: 134, armDx: 56, tailX: 148, tailY: 152, neckY: 139, chestY: 152,
        floating: false, twoPiece: false, pinch: 0.95,
      };
    }
  }
}

interface Ctx {
  sp: Species; stage: Stage; g: Geo; id: string; line: string; grow: number;
  el: (typeof ELEMENTS)[keyof typeof ELEMENTS];
}

const W = 3; // outline width

/* ───────────────────────────── EARS ───────────────────────────── */
function Ears({ c, front }: { c: Ctx; front: boolean }) {
  const { sp, g, line } = c;
  const p = sp.palette;
  const hx = g.headCx, top = g.headTop, rx = g.headRx, ry = g.headRy;
  const s = 0.8 + c.grow * 0.25;
  const both = (fn: (d: 1 | -1) => ReactNode) => <>{fn(-1)}{fn(1)}</>;
  if (front) {
    if (sp.ears !== 'droop') return null;
    return both((d) => (
      <g transform={`rotate(${d * -8} ${hx + d * rx * 0.86} ${g.headCy - 10})`}>
        <ellipse cx={hx + d * rx * 0.9} cy={g.headCy + 6} rx={13 * s} ry={27 * s} fill={p.shade} stroke={line} strokeWidth={W} />
      </g>
    ));
  }
  switch (sp.ears) {
    case 'cat': return both((d) => {
      const a = [hx + d * rx * 0.82, top + ry * 0.45], b = [hx + d * rx * 0.18, top + ry * 0.06], t = [hx + d * rx * 0.68, top - ry * 0.42 * s];
      const i = (k: number[], m: number) => [k[0] + (g.headCx + d * rx * 0.55 - k[0]) * m, k[1] + (top + ry * 0.12 - k[1]) * m];
      const [ia, ib, it] = [i(a, 0.35), i(b, 0.35), i(t, 0.3)];
      return <g>
        <polygon points={`${a} ${b} ${t}`} fill={p.main} stroke={line} strokeWidth={W} strokeLinejoin="round" />
        <polygon points={`${ia} ${ib} ${it}`} fill={sp.element === 'shadow' || sp.element === 'cosmic' ? p.accent : '#ffb3c7'} opacity={0.85} />
      </g>;
    });
    case 'bunny': return both((d) => (
      <g transform={`rotate(${d * 14} ${hx + d * rx * 0.32} ${top + 6})`}>
        <ellipse cx={hx + d * rx * 0.32} cy={top - 26 * s} rx={13 * s} ry={34 * s} fill={p.main} stroke={line} strokeWidth={W} />
        <ellipse cx={hx + d * rx * 0.32} cy={top - 22 * s} rx={6.5 * s} ry={24 * s} fill={sp.element === 'shadow' ? p.accent : '#ffc2d4'} opacity={0.8} />
      </g>
    ));
    case 'round': return both((d) => (
      <g>
        <circle cx={hx + d * rx * 0.66} cy={top + ry * 0.2} r={15 * s} fill={p.main} stroke={line} strokeWidth={W} />
        <circle cx={hx + d * rx * 0.66} cy={top + ry * 0.22} r={7.5 * s} fill={p.belly} />
      </g>
    ));
    case 'fin': return both((d) => (
      <path d={`M ${hx + d * rx * 0.9} ${g.headCy - 16} Q ${hx + d * (rx + 30 * s)} ${g.headCy - 34 * s} ${hx + d * (rx + 22 * s)} ${g.headCy + 4} Q ${hx + d * (rx + 8)} ${g.headCy + 2} ${hx + d * rx * 0.95} ${g.headCy + 6} Z`}
        fill={p.accent} stroke={line} strokeWidth={W} strokeLinejoin="round" />
    ));
    case 'antenna': return both((d) => (
      <g>
        <path d={`M ${hx + d * 12} ${top + 6} Q ${hx + d * 20} ${top - 22 * s} ${hx + d * 30 * s} ${top - 30 * s}`} stroke={line} strokeWidth={4} fill="none" strokeLinecap="round" />
        <circle cx={hx + d * 30 * s} cy={top - 30 * s} r={6.5 * s} fill={p.accent} stroke={line} strokeWidth={2.5} />
      </g>
    ));
    case 'leaf': return both((d) => (
      <g transform={`translate(${hx + d * rx * 0.35} ${top + 10}) rotate(${d * 38})`}>
        <path d={leaf(44 * s)} fill={lighten(p.main, 0.1)} stroke={line} strokeWidth={W} strokeLinejoin="round" />
        <path d={`M 0 -4 L 0 ${-40 * s}`} stroke={darken(p.main, 0.2)} strokeWidth={2} />
      </g>
    ));
    case 'horn': return both((d) => (
      <path d={`M ${hx + d * rx * 0.28} ${top + 10} Q ${hx + d * rx * 0.4} ${top - 22 * s} ${hx + d * rx * 0.7} ${top - 26 * s} Q ${hx + d * rx * 0.55} ${top - 2} ${hx + d * rx * 0.6} ${top + 16} Z`}
        fill={p.accent} stroke={line} strokeWidth={W} strokeLinejoin="round" />
    ));
    case 'feather': return (
      <g>
        {[-1, 0, 1].map((k) => (
          <g key={k} transform={`translate(${hx + k * 9} ${top + 8}) rotate(${k * 26})`}>
            <path d={leaf(30 * s * (k === 0 ? 1.15 : 0.9), 9)} fill={k === 0 ? p.accent : p.main} stroke={line} strokeWidth={W} strokeLinejoin="round" />
          </g>
        ))}
      </g>
    );
    default: return null;
  }
}

/* ───────────────────────────── TAIL ───────────────────────────── */
function Tail({ c }: { c: Ctx }) {
  const { sp, g, line, el } = c;
  const p = sp.palette;
  const s = 0.55 + c.grow * 0.55;
  const x = g.tailX, y = g.tailY;
  switch (sp.tail) {
    case 'flame': return (
      <g className="cc-flicker">
        <path d={`M ${x - 8} ${y} Q ${x + 22 * s} ${y + 4} ${x + 26 * s} ${y - 24 * s}`} stroke={line} strokeWidth={14 * s + 3} fill="none" strokeLinecap="round" />
        <path d={`M ${x - 8} ${y} Q ${x + 22 * s} ${y + 4} ${x + 26 * s} ${y - 24 * s}`} stroke={p.main} strokeWidth={14 * s} fill="none" strokeLinecap="round" />
        <path d={flame(x + 26 * s, y - 20 * s, 15 * s * (0.8 + c.grow * 0.5), 40 * s * (0.8 + c.grow * 0.5))} fill={el.color} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={flame(x + 26 * s, y - 22 * s, 8 * s, 24 * s * (0.8 + c.grow * 0.4))} fill={p.accent} />
      </g>
    );
    case 'fluffy': return (
      <g transform={`rotate(-38 ${x} ${y})`}>
        <ellipse cx={x + 6} cy={y - 24 * s} rx={17 * s} ry={30 * s} fill={p.main} stroke={line} strokeWidth={W} />
        <ellipse cx={x + 6} cy={y - 44 * s} rx={10 * s} ry={11 * s} fill={p.belly} />
      </g>
    );
    case 'fish': return (
      <g>
        <path d={`M ${x - 10} ${y} Q ${x + 10} ${y - 4} ${x + 18 * s} ${y - 10 * s}`} stroke={line} strokeWidth={12 * s + 3} strokeLinecap="round" fill="none" />
        <path d={`M ${x - 10} ${y} Q ${x + 10} ${y - 4} ${x + 18 * s} ${y - 10 * s}`} stroke={p.main} strokeWidth={12 * s} strokeLinecap="round" fill="none" />
        <path d={`M ${x + 16 * s} ${y - 10 * s} Q ${x + 30 * s} ${y - 44 * s} ${x + 46 * s} ${y - 36 * s} Q ${x + 34 * s} ${y - 16 * s} ${x + 48 * s} ${y + 2 * s} Q ${x + 30 * s} ${y + 4 * s} ${x + 16 * s} ${y - 10 * s} Z`}
          fill={p.accent} stroke={line} strokeWidth={W} strokeLinejoin="round" />
      </g>
    );
    case 'leaf': return (
      <g>
        <path d={`M ${x - 6} ${y} Q ${x + 16 * s} ${y + 2} ${x + 20 * s} ${y - 16 * s}`} stroke={darken(p.main, 0.3)} strokeWidth={5} fill="none" strokeLinecap="round" />
        <g transform={`translate(${x + 20 * s} ${y - 14 * s}) rotate(30)`}>
          <path d={leaf(40 * s)} fill={sp.element === 'nature' ? '#6cc24a' : p.accent} stroke={line} strokeWidth={W} strokeLinejoin="round" />
          <path d={`M 0 -3 L 0 ${-36 * s}`} stroke="#3f8a2c" strokeWidth={2} />
        </g>
      </g>
    );
    case 'bolt': return (
      <g transform={`rotate(-20 ${x} ${y})`}>
        <polygon points={bolt(x + 18 * s, y - 20 * s, 54 * s)} fill={p.accent === '#3d8bff' ? p.main : p.accent} stroke={line} strokeWidth={W} strokeLinejoin="round" />
      </g>
    );
    case 'curl': return (
      <g>
        <path d={`M ${x - 8} ${y} C ${x + 30 * s} ${y + 4} ${x + 40 * s} ${y - 36 * s} ${x + 20 * s} ${y - 40 * s} C ${x + 6 * s} ${y - 42 * s} ${x + 4 * s} ${y - 24 * s} ${x + 18 * s} ${y - 22 * s}`}
          stroke={line} strokeWidth={13 * s + 3} fill="none" strokeLinecap="round" />
        <path d={`M ${x - 8} ${y} C ${x + 30 * s} ${y + 4} ${x + 40 * s} ${y - 36 * s} ${x + 20 * s} ${y - 40 * s} C ${x + 6 * s} ${y - 42 * s} ${x + 4 * s} ${y - 24 * s} ${x + 18 * s} ${y - 22 * s}`}
          stroke={p.main} strokeWidth={13 * s} fill="none" strokeLinecap="round" />
      </g>
    );
    case 'crystal': return (
      <g>
        {[-30, 0, 30].map((r, i) => (
          <g key={r} transform={`translate(${x + 6} ${y - 2}) rotate(${50 + r})`}>
            <polygon points={crystal((i === 1 ? 40 : 28) * s)} fill={i === 1 ? p.accent : lighten(p.accent, 0.35)} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
          </g>
        ))}
      </g>
    );
    case 'wisp': return (
      <path d={`M ${x - 12} ${y + 4} C ${x + 20 * s} ${y + 8} ${x + 34 * s} ${y - 10 * s} ${x + 28 * s} ${y - 34 * s} C ${x + 44 * s} ${y - 20 * s} ${x + 40 * s} ${y + 14 * s} ${x - 4} ${y + 14}`}
        fill={p.main} stroke={line} strokeWidth={W} strokeLinejoin="round" opacity={0.95} />
    );
    case 'star': return (
      <g>
        <path d={`M ${x - 6} ${y} Q ${x + 20 * s} ${y} ${x + 26 * s} ${y - 22 * s}`} stroke={line} strokeWidth={6} fill="none" strokeLinecap="round" />
        <polygon className="cc-twinkle" points={star(x + 28 * s, y - 28 * s, 15 * s)} fill={p.accent} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      </g>
    );
    case 'cloud': return (
      <g>
        <circle cx={x + 8 * s} cy={y - 6 * s} r={14 * s} fill={lighten(p.main, 0.3)} stroke={line} strokeWidth={W} />
        <circle cx={x + 26 * s} cy={y - 16 * s} r={11 * s} fill={lighten(p.main, 0.3)} stroke={line} strokeWidth={W} />
        <circle cx={x + 38 * s} cy={y - 30 * s} r={7 * s} fill={lighten(p.main, 0.3)} stroke={line} strokeWidth={W} />
      </g>
    );
    default: return null;
  }
}

/* ───────────────────────────── WINGS ───────────────────────────── */
export function WingPair({ type, g, line, fill, accent, scale, cls }: { type: string; g: Geo; line: string; fill: string; accent: string; scale: number; cls?: string }) {
  if (scale <= 0) return null;
  const ay = g.twoPiece ? g.bodyCy - 12 : g.bodyCy - 8;
  const ax = g.twoPiece ? g.bodyRx * 0.5 : g.bodyRx * 0.55;
  const side = (d: 1 | -1) => {
    const T = `translate(${100 + d * ax} ${ay}) scale(${d * scale} ${scale})`;
    switch (type) {
      case 'feather': return (
        <g transform={T}>
          <path d="M 0 2 C 14 -30 50 -44 70 -34 C 64 -26 66 -18 58 -12 C 62 -4 54 2 46 2 C 46 10 36 14 26 10 C 22 16 10 14 0 8 Z" fill={fill} stroke={line} strokeWidth={W} strokeLinejoin="round" />
          <path d="M 8 0 C 20 -18 40 -26 54 -24 C 46 -16 40 -10 30 -6 C 22 -3 14 -1 8 0 Z" fill={accent} opacity={0.9} />
        </g>
      );
      case 'bat': return (
        <g transform={T}>
          <path d="M 0 0 L 22 -40 L 62 -30 Q 58 -14 64 2 Q 50 -4 44 8 Q 34 0 26 14 Q 16 4 0 12 Z" fill={fill} stroke={line} strokeWidth={W} strokeLinejoin="round" />
          <path d="M 22 -40 L 26 14 M 22 -40 L 44 8" stroke={line} strokeWidth={2} opacity={0.5} />
        </g>
      );
      case 'fairy': return (
        <g transform={T}>
          <ellipse cx={30} cy={-24} rx={30} ry={20} transform="rotate(-24 30 -24)" fill={fill} fillOpacity={0.55} stroke={accent} strokeWidth={2.5} />
          <ellipse cx={22} cy={10} rx={18} ry={12} transform="rotate(22 22 10)" fill={fill} fillOpacity={0.5} stroke={accent} strokeWidth={2.5} />
          <circle cx={38} cy={-28} r={4} fill="#fff" opacity={0.8} />
        </g>
      );
      case 'crystal': return (
        <g transform={T}>
          {[-50, -25, 0].map((r, i) => (
            <g key={r} transform={`rotate(${r + 70})`}><polygon points={crystal(56 - i * 10)} fill={i === 1 ? accent : fill} fillOpacity={0.85} stroke={line} strokeWidth={2.5} strokeLinejoin="round" /></g>
          ))}
        </g>
      );
      case 'leaf': return (
        <g transform={T}>
          {[-55, -25, 5].map((r, i) => (
            <g key={r} transform={`rotate(${r + 62})`}><path d={leaf(54 - i * 8)} fill={i === 1 ? accent : fill} stroke={line} strokeWidth={W} strokeLinejoin="round" /></g>
          ))}
        </g>
      );
      case 'energy': return (
        <g transform={T} className="cc-pulse">
          <polygon points="0,0 30,-46 26,-18 62,-34 34,4 52,10 6,14" fill={fill} fillOpacity={0.9} stroke={accent} strokeWidth={3} strokeLinejoin="round" />
        </g>
      );
      case 'light': return (
        <g transform={T} className="cc-pulse">
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`rotate(${-50 + i * 24})`}><path d={`M 4 0 Q 30 -10 ${70 - i * 8} 0 Q 30 10 4 0 Z`} fill={fill} fillOpacity={0.8} stroke={accent} strokeWidth={2} /></g>
          ))}
        </g>
      );
      case 'cloud': return (
        <g transform={T}>
          <path d={cloud(36, -6, 26)} fill="#fff" stroke={line} strokeWidth={W} />
          <path d={cloud(24, -26, 18)} fill="#fff" stroke={line} strokeWidth={W} />
        </g>
      );
      case 'butterfly': return (
        <g transform={T}>
          <path d="M 0 0 C 10 -50 60 -56 56 -22 C 54 -8 26 -2 0 0 Z" fill={fill} stroke={line} strokeWidth={W} />
          <path d="M 0 2 C 30 4 48 18 36 34 C 24 44 6 26 0 2 Z" fill={accent} stroke={line} strokeWidth={W} />
          <circle cx={34} cy={-26} r={6} fill="#fff" opacity={0.85} />
        </g>
      );
      default: return null;
    }
  };
  return <g className={cls}>{side(-1)}{side(1)}</g>;
}

/* ───────────────────────────── FACE ───────────────────────────── */
function Face({ c, expression }: { c: Ctx; expression: Expression }) {
  const { sp, g, line } = c;
  const p = sp.palette;
  const er = g.eyeR;
  const eyes = [g.headCx - g.eyeDx, g.headCx + g.eyeDx];
  const glowEyes = luminance(p.eye) > 0.6;
  const shadowMask = sp.element === 'shadow' && c.stage >= 3;

  let eyeNodes: ReactNode;
  if (expression === 'excited') {
    eyeNodes = eyes.map((x) => <path key={x} d={`M ${x - er * 0.9} ${g.eyeY + 2} Q ${x} ${g.eyeY - er * 1.3} ${x + er * 0.9} ${g.eyeY + 2}`} stroke={glowEyes ? line : p.eye} strokeWidth={4.5} fill="none" strokeLinecap="round" />);
  } else if (expression === 'sleepy') {
    eyeNodes = eyes.map((x) => <path key={x} d={`M ${x - er * 0.8} ${g.eyeY} Q ${x} ${g.eyeY + er * 0.7} ${x + er * 0.8} ${g.eyeY}`} stroke={glowEyes ? line : p.eye} strokeWidth={4} fill="none" strokeLinecap="round" />);
  } else {
    const big = expression === 'wow' ? 1.18 : 1;
    eyeNodes = (
      <g className="cc-blink">
        {eyes.map((x) => (
          <g key={x}>
            {glowEyes && <ellipse cx={x} cy={g.eyeY} rx={er * 1.15 * big} ry={er * 1.3 * big} fill={p.eye} opacity={0.35} />}
            <ellipse cx={x} cy={g.eyeY} rx={er * 0.82 * big} ry={er * big} fill={glowEyes ? p.eye : p.eye} />
            {glowEyes && <ellipse cx={x} cy={g.eyeY + 1} rx={er * 0.28} ry={er * 0.62 * big} fill={darken(p.main, 0.6)} />}
            <circle cx={x + er * 0.28} cy={g.eyeY - er * 0.38} r={er * 0.36 * big} fill="#fff" />
            <circle cx={x - er * 0.3} cy={g.eyeY + er * 0.42} r={er * 0.16 * big} fill="#fff" opacity={0.9} />
            {expression === 'wow' && <polygon points={star(x + er * 0.35, g.eyeY - er * 0.35, er * 0.42, 4, 0.4)} fill="#fff" />}
          </g>
        ))}
      </g>
    );
  }

  const my = g.mouthY;
  const mx = g.headCx;
  const open = expression === 'excited' || expression === 'wow';
  const mouthColor = darken(p.main, 0.7);
  let mouth: ReactNode;
  if (sp.face === 'beak') {
    mouth = open ? (
      <g>
        <polygon points={`${mx - 9},${my - 6} ${mx + 9},${my - 6} ${mx},${my + 2}`} fill="#ffb02e" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        <polygon points={`${mx - 7},${my + 1} ${mx + 7},${my + 1} ${mx},${my + 9}`} fill="#f08c1a" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      </g>
    ) : (
      <polygon points={`${mx - 9},${my - 5} ${mx + 9},${my - 5} ${mx},${my + 7}`} fill="#ffb02e" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
    );
  } else {
    const smile = open
      ? <path d={`M ${mx - 8} ${my} Q ${mx} ${my + 13} ${mx + 8} ${my} Z`} fill={mouthColor} stroke={line} strokeWidth={2} strokeLinejoin="round" />
      : sp.face === 'whisker'
        ? <path d={`M ${mx - 8} ${my} Q ${mx - 4} ${my + 5} ${mx} ${my} Q ${mx + 4} ${my + 5} ${mx + 8} ${my}`} stroke={mouthColor} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        : <path d={`M ${mx - 7} ${my} Q ${mx} ${my + (expression === 'sleepy' ? 3 : 7)} ${mx + 7} ${my}`} stroke={mouthColor} strokeWidth={2.8} fill="none" strokeLinecap="round" />;
    const tongue = open && <ellipse cx={mx} cy={my + 6.5} rx={4} ry={2.6} fill="#ff7a9a" />;
    if (sp.face === 'snout') {
      mouth = (
        <g>
          <ellipse cx={mx} cy={my - 4} rx={15} ry={10.5} fill={p.belly} />
          <ellipse cx={mx} cy={my - 8} rx={4.5} ry={3.2} fill={darken(p.main, 0.75)} />
          <g transform={`translate(0 2)`}>{smile}{tongue}</g>
        </g>
      );
    } else {
      mouth = (
        <g>
          {sp.face === 'whisker' && (
            <g stroke={darken(p.main, 0.5)} strokeWidth={1.8} strokeLinecap="round" opacity={0.7}>
              <path d={`M ${mx - 22} ${my - 6} L ${mx - 36} ${my - 9}`} /><path d={`M ${mx - 22} ${my - 2} L ${mx - 36} ${my}`} />
              <path d={`M ${mx + 22} ${my - 6} L ${mx + 36} ${my - 9}`} /><path d={`M ${mx + 22} ${my - 2} L ${mx + 36} ${my}`} />
              <ellipse cx={mx} cy={my - 5} rx={3} ry={2.2} fill={darken(p.main, 0.75)} stroke="none" />
            </g>
          )}
          {smile}{tongue}
        </g>
      );
    }
  }

  return (
    <g>
      {shadowMask && (
        <path d={`M ${mx - g.eyeDx - er * 2} ${g.eyeY - er * 0.6} Q ${mx} ${g.eyeY - er * 2.2} ${mx + g.eyeDx + er * 2} ${g.eyeY - er * 0.6} Q ${mx + g.eyeDx + er} ${g.eyeY + er * 1.6} ${mx} ${g.eyeY + er * 0.6} Q ${mx - g.eyeDx - er} ${g.eyeY + er * 1.6} ${mx - g.eyeDx - er * 2} ${g.eyeY - er * 0.6} Z`}
          fill={darken(p.main, 0.45)} opacity={0.75} />
      )}
      <ellipse cx={mx - g.eyeDx - er * 1.25} cy={g.eyeY + er * 1.25} rx={er * 0.75} ry={er * 0.45} fill="#ff7fa8" opacity={0.45} />
      <ellipse cx={mx + g.eyeDx + er * 1.25} cy={g.eyeY + er * 1.25} rx={er * 0.75} ry={er * 0.45} fill="#ff7fa8" opacity={0.45} />
      {eyeNodes}
      {mouth}
    </g>
  );
}

/* ───────────────────────── BODY PATTERN ───────────────────────── */
function Pattern({ c }: { c: Ctx }) {
  const { sp, g } = c;
  const p = sp.palette;
  const cx = g.cx, cy = g.twoPiece ? g.headCy : g.bodyCy;
  const r = g.headRx;
  switch (sp.pattern) {
    case 'spots': return (
      <g fill={lighten(p.main, 0.35)} opacity={0.75}>
        <circle cx={cx - r * 0.7} cy={cy - r * 0.15} r={6} /><circle cx={cx - r * 0.58} cy={cy + r * 0.12} r={3.5} />
        <circle cx={cx + r * 0.68} cy={cy - r * 0.1} r={5} /><circle cx={cx + r * 0.55} cy={cy - r * 0.42} r={3.5} />
        <circle cx={cx - r * 0.25} cy={g.headTop + 12} r={4.5} />
      </g>
    );
    case 'stripes': return (
      <g stroke={p.shade} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.8}>
        <path d={`M ${cx - 12} ${g.headTop + 3} Q ${cx - 10} ${g.headTop + 14} ${cx - 15} ${g.headTop + 20}`} />
        <path d={`M ${cx} ${g.headTop + 2} L ${cx} ${g.headTop + 18}`} />
        <path d={`M ${cx + 12} ${g.headTop + 3} Q ${cx + 10} ${g.headTop + 14} ${cx + 15} ${g.headTop + 20}`} />
      </g>
    );
    case 'stars': return (
      <g fill={p.accent} className="cc-twinkle-slow">
        <polygon points={star(cx - r * 0.66, cy - r * 0.25, 5)} /><polygon points={star(cx + r * 0.7, cy + r * 0.05, 4)} />
        <polygon points={star(cx + r * 0.3, g.headTop + 12, 3.5)} /><polygon points={star(cx - r * 0.35, cy + r * 0.5, 3)} />
      </g>
    );
    case 'cracks': {
      const glow = sp.element === 'fire';
      return (
        <g stroke={glow ? p.accent : p.shade} strokeWidth={glow ? 3.2 : 2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" className={glow ? 'cc-pulse' : undefined}>
          <path d={`M ${cx - r * 0.82} ${cy - 6} l 8 6 l -3 9 l 8 5`} />
          <path d={`M ${cx + r * 0.84} ${cy - 12} l -8 5 l 4 8 l -7 6`} />
          <path d={`M ${cx - 6} ${g.headTop + 4} l 4 9 l -5 6`} />
        </g>
      );
    }
    case 'swirl': return (
      <path d={`M ${cx + r * 0.55} ${cy - r * 0.05} q 10 -4 8 -14 q -3 -9 -12 -5 q -6 4 -1 9`} stroke={lighten(p.main, 0.5)} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.8} />
    );
    default: return null;
  }
}

/* ─────────────────────── ELEMENT FEATURES ─────────────────────── */
/** Features that appear and grow as the creature evolves. Layer: back | body | head | front */
function ElementFeatures({ c, layer, hatOn }: { c: Ctx; layer: 'back' | 'body' | 'head' | 'front'; hatOn: boolean }) {
  const { sp, stage, g, line, el } = c;
  const p = sp.palette;
  const hx = g.headCx, top = g.headTop, rx = g.headRx;
  const both = (fn: (d: 1 | -1) => ReactNode) => <>{fn(-1)}{fn(1)}</>;
  const cheekY = g.eyeY + g.eyeR * 1.6;
  const bodyMarkY = g.twoPiece ? g.bodyCy : g.bodyCy + g.bodyRy * 0.25;
  const crownY = top + 2;
  const showCrown = !hatOn;
  const n: ReactNode[] = [];

  switch (sp.element) {
    case 'fire':
      if (layer === 'head' && stage >= 2 && showCrown) {
        const k = stage >= 5 ? 1.5 : stage >= 4 ? 1.2 : stage >= 3 ? 1 : 0.75;
        n.push(<g key="tuft" className="cc-flicker">
          {stage >= 5 && <path d={flame(hx - 16, crownY + 6, 10, 26)} fill={el.color} stroke={line} strokeWidth={2.5} />}
          {stage >= 5 && <path d={flame(hx + 16, crownY + 6, 10, 26, -0.2)} fill={el.color} stroke={line} strokeWidth={2.5} />}
          <path d={flame(hx, crownY + 6, 13 * k, 34 * k)} fill={el.color} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
          <path d={flame(hx, crownY + 4, 6 * k, 18 * k)} fill={p.accent} />
        </g>);
      }
      if (layer === 'head' && stage >= 3) n.push(both((d) => (
        <path key={`h${d}`} d={`M ${hx + d * rx * 0.48} ${top + 12} Q ${hx + d * rx * 0.62} ${top - 14 * (stage >= 4 ? 1.3 : 1)} ${hx + d * rx * 0.86} ${top - 18 * (stage >= 4 ? 1.3 : 1)} Q ${hx + d * rx * 0.74} ${top + 2} ${hx + d * rx * 0.76} ${top + 20} Z`}
          fill={lighten(p.accent, 0.3)} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      )));
      if (layer === 'head' && stage >= 4) n.push(both((d) => (
        <path key={`m${d}`} d={`M ${hx + d * (g.eyeDx + g.eyeR * 1.4)} ${g.eyeY - 2} q ${d * 10} 4 ${d * 14} -6 q ${d * -2} 10 ${d * -12} 14`} fill={el.color} opacity={0.8} />
      )));
      if (layer === 'front' && stage >= 5) n.push(<Embers key="emb" color={p.accent} />);
      break;
    case 'water':
      if (layer === 'head' && stage >= 2) n.push(both((d) => (
        <path key={`f${d}`} d={`M ${hx + d * rx * 0.86} ${cheekY - 4} q ${d * 18} -6 ${d * 22} -18 q ${d * 2} 16 ${d * -12} 26 Z`} fill={p.accent} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      )));
      if (layer === 'head' && stage >= 3 && showCrown) n.push(
        <path key="dorsal" d={`M ${hx - 14} ${top + 8} Q ${hx - 4} ${top - 26 * GROW[stage]} ${hx + 18} ${top - 30 * GROW[stage]} Q ${hx + 10} ${top - 6} ${hx + 16} ${top + 8} Z`} fill={el.color} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      );
      if (layer === 'body' && stage >= 3) n.push(<g key="bub" fill="#fff" opacity={0.6}>
        <circle cx={hx - rx * 0.5} cy={bodyMarkY - 4} r={3.5} /><circle cx={hx - rx * 0.4} cy={bodyMarkY + 6} r={2.2} /><circle cx={hx + rx * 0.55} cy={bodyMarkY} r={3} />
      </g>);
      if (layer === 'body' && stage >= 4) n.push(both((d) => (
        <path key={`sh${d}`} d={`M ${hx + d * g.bodyRx * 0.55} ${g.neckY - 2} q ${d * 22} -2 ${d * 26} 18 q ${d * -12} 6 ${d * -24} 0 Z`} fill={lighten(el.color, 0.35)} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      )));
      if (layer === 'front' && stage >= 5) n.push(<g key="drops" className="cc-orbit" style={{ transformOrigin: '100px 110px' }}>
        {[0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180; return <path key={a} d={droplet(100 + Math.cos(r) * 82, 110 + Math.sin(r) * 70, 5)} fill={el.glow} stroke={line} strokeWidth={1.5} />; })}
      </g>);
      break;
    case 'nature':
      if (layer === 'head' && stage >= 2 && showCrown) {
        const k = GROW[stage];
        n.push(<g key="sprout">
          <path d={`M ${hx} ${top + 6} Q ${hx + 2} ${top - 10 * k} ${hx} ${top - 18 * k}`} stroke="#3f8a2c" strokeWidth={4} fill="none" strokeLinecap="round" />
          <g transform={`translate(${hx} ${top - 14 * k}) rotate(-55)`}><path d={leaf(26 * k + 6)} fill="#7fd95a" stroke={line} strokeWidth={2.5} /></g>
          <g transform={`translate(${hx} ${top - 14 * k}) rotate(55)`}><path d={leaf(26 * k + 6)} fill="#5fbf4a" stroke={line} strokeWidth={2.5} /></g>
          {stage >= 3 && <Flower x={hx} y={top - 20 * k} r={7} color={p.accent} line={line} />}
        </g>);
      }
      if (layer === 'head' && stage >= 4) n.push(both((d) => (
        <g key={`ant${d}`}>
          <path d={`M ${hx + d * rx * 0.5} ${top + 12} Q ${hx + d * rx * 0.62} ${top - 12} ${hx + d * rx * 0.9} ${top - 26} M ${hx + d * rx * 0.66} ${top - 8} Q ${hx + d * rx * 0.86} ${top - 8} ${hx + d * rx * 1.02} ${top - 4}`}
            stroke="#8a5a2b" strokeWidth={5} fill="none" strokeLinecap="round" />
          <g transform={`translate(${hx + d * rx * 0.9} ${top - 26}) rotate(${d * 40})`}><path d={leaf(16)} fill="#6cc24a" stroke={line} strokeWidth={2} /></g>
          {stage >= 5 && <Flower x={hx + d * rx * 1.02} y={top - 4} r={6} color="#ffd1e8" line={line} />}
        </g>
      )));
      if (layer === 'body' && stage >= 3) n.push(both((d) => (
        <g key={`bl${d}`} transform={`translate(${hx + d * g.bodyRx * 0.8} ${bodyMarkY - 6}) rotate(${d * 70})`}><path d={leaf(16)} fill="#7fd95a" stroke={line} strokeWidth={2} /></g>
      )));
      if (layer === 'front' && stage >= 5) n.push(<Petals key="pet" color="#ffc2df" />);
      break;
    case 'electric':
      if (layer === 'head' && stage >= 2) n.push(both((d) => (
        <polygon key={`z${d}`} points={bolt(hx + d * (g.eyeDx + g.eyeR * 1.3), cheekY - 2, 16)} fill={p.accent === '#3d8bff' ? '#ff5d5d' : p.accent} stroke={line} strokeWidth={1.8} strokeLinejoin="round" />
      )));
      if (layer === 'head' && stage >= 3 && showCrown) n.push(
        <polygon key="ant" points={bolt(hx + 4, top - 10 * GROW[stage], 36 * GROW[stage] + 10)} fill={el.glow} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      );
      if (layer === 'body' && stage >= 4) n.push(both((d) => (
        <polygon key={`bm${d}`} points={bolt(hx + d * g.bodyRx * 0.62, bodyMarkY, 22)} fill={darken(p.main, 0.25)} opacity={0.75} />
      )));
      if (layer === 'back' && stage >= 5 && sp.wings === 'none') n.push(<WingPair key="ew" type="energy" g={g} line={line} fill={el.glow} accent={p.accent} scale={1} />);
      if (layer === 'front' && stage >= 4) n.push(<Sparks key="sp" color={el.glow} count={stage >= 5 ? 6 : 3} />);
      break;
    case 'ice':
      if (layer === 'head' && stage >= 2) n.push(both((d) => <Snowflake key={`sf${d}`} x={hx + d * (g.eyeDx + g.eyeR * 1.4)} y={cheekY} r={5} color={darken(p.accent, 0.2)} />));
      if (layer === 'head' && stage >= 3 && showCrown) n.push(<g key="spk">{[-1, 0, 1].map((k) => (
        <g key={k} transform={`translate(${hx + k * 15} ${top + 8}) rotate(${k * 22})`}><polygon points={crystal((k === 0 ? 30 : 20) * GROW[stage] + 6)} fill={k === 0 ? lighten(p.accent, 0.2) : '#e9fbff'} stroke={line} strokeWidth={2.5} strokeLinejoin="round" /></g>
      ))}</g>);
      if (layer === 'body' && stage >= 4) n.push(both((d) => (
        <g key={`ia${d}`} transform={`translate(${hx + d * g.bodyRx * 0.72} ${g.neckY + 4}) rotate(${d * 60})`}><polygon points={crystal(22)} fill="#e9fbff" stroke={line} strokeWidth={2.5} strokeLinejoin="round" /></g>
      )));
      if (layer === 'back' && stage >= 5 && sp.wings === 'none') n.push(<WingPair key="cw" type="crystal" g={g} line={line} fill="#e9fbff" accent={p.accent} scale={0.9} />);
      if (layer === 'front' && stage >= 5) n.push(<Flurry key="fl" />);
      break;
    case 'earth':
      if (layer === 'head' && stage >= 2 && showCrown && stage < 4) n.push(<ellipse key="peb" cx={hx + 10} cy={top + 4} rx={9} ry={6} fill={darken(p.belly, 0.15)} stroke={line} strokeWidth={2.5} />);
      if (layer === 'body' && stage >= 3) n.push(both((d) => (
        <path key={`sp${d}`} d={`M ${hx + d * g.bodyRx * 0.5} ${g.neckY - 4} l ${d * 22} 0 l ${d * 8} 16 l ${d * -14} 8 l ${d * -16} -6 Z`} fill={darken(p.belly, 0.25)} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      )));
      if (layer === 'head' && stage >= 4 && showCrown) n.push(
        <g key="ch" transform={`translate(${hx} ${top + 8})`}><polygon points={crystal(26 * GROW[stage] + 10)} fill={p.accent} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
          {stage >= 5 && <><g transform="translate(-14 4) rotate(-25)"><polygon points={crystal(20)} fill={lighten(p.accent, 0.35)} stroke={line} strokeWidth={2.5} /></g><g transform="translate(14 4) rotate(25)"><polygon points={crystal(20)} fill={lighten(p.accent, 0.35)} stroke={line} strokeWidth={2.5} /></g></>}
        </g>
      );
      if (layer === 'front' && stage >= 5) n.push(<g key="rocks" className="cc-orbit" style={{ transformOrigin: '100px 120px' }}>
        {[30, 150, 270].map((a) => { const r = (a * Math.PI) / 180; return <polygon key={a} points={star(100 + Math.cos(r) * 84, 120 + Math.sin(r) * 62, 8, 6, 0.75)} fill={darken(p.belly, 0.2)} stroke={line} strokeWidth={2} />; })}
      </g>);
      break;
    case 'shadow':
      if (layer === 'head' && stage >= 2) n.push(both((d) => (
        <path key={`w${d}`} d={`M ${hx + d * rx * 0.7} ${top + 18} q ${d * 16} -10 ${d * 14} -30 q ${d * 12} 18 ${d * -4} 36 Z`} fill={darken(p.main, 0.2)} stroke={line} strokeWidth={2.5} strokeLinejoin="round" opacity={0.9} />
      )));
      if (layer === 'head' && stage >= 5 && showCrown) n.push(
        <path key="moon" className="cc-pulse" d={`M ${hx - 14} ${top - 6} A 18 18 0 1 0 ${hx + 16} ${top - 26} A 13 13 0 1 1 ${hx - 14} ${top - 6} Z`} fill={p.accent} stroke={line} strokeWidth={2.5} />
      );
      if (layer === 'back' && stage >= 4) n.push(<circle key="aur" cx={100} cy={116} r={92} fill={`url(#cc-aura-${c.id})`} className="cc-pulse" />);
      if (layer === 'front' && stage >= 4) n.push(<Wisps key="ws" color={el.particle} />);
      break;
    case 'light':
      if (layer === 'head' && stage === 2) n.push(<polygon key="spk" className="cc-twinkle" points={star(hx + 18, top - 4, 7, 4, 0.35)} fill={el.color} />);
      if (layer === 'head' && stage >= 3) n.push(
        <ellipse key="halo" cx={hx} cy={top - (hatOn ? 34 : 14)} rx={22 + 6 * GROW[stage]} ry={7} fill="none" stroke="#ffcf3b" strokeWidth={5} className="cc-pulse" />
      );
      if (layer === 'back' && stage >= 4) n.push(<g key="rays" className="cc-spin-slow" style={{ transformOrigin: '100px 112px' }}>
        {Array.from({ length: 12 }).map((_, i) => <path key={i} d="M 100 112 L 94 18 L 106 18 Z" transform={`rotate(${i * 30} 100 112)`} fill="#ffe27a" opacity={0.35} />)}
      </g>);
      if (layer === 'back' && stage >= 5 && sp.wings === 'none') n.push(<WingPair key="lw" type="light" g={g} line={line} fill="#fff8d6" accent="#ffcf3b" scale={1} />);
      break;
    case 'cosmic':
      if (layer === 'head' && stage >= 2) n.push(both((d) => (
        <g key={`fr${d}`} fill={p.accent}>
          <polygon points={star(hx + d * (g.eyeDx + g.eyeR * 1.2), cheekY + 2, 3.2, 4, 0.4)} />
          <polygon points={star(hx + d * (g.eyeDx + g.eyeR * 2), cheekY - 3, 2.4, 4, 0.4)} />
        </g>
      )));
      if (layer === 'back' && stage >= 3) n.push(<ellipse key="ring" cx={100} cy={g.headCy + 4} rx={g.headRx + 28} ry={14} fill="none" stroke={p.accent} strokeWidth={5} opacity={0.75} transform={`rotate(-12 100 ${g.headCy})`} />);
      if (layer === 'front' && stage >= 3) n.push(<path key="ringf" d={`M ${100 - g.headRx - 28} ${g.headCy + 4} A ${g.headRx + 28} 14 0 0 0 ${100 + g.headRx + 28} ${g.headCy + 4}`} fill="none" stroke={p.accent} strokeWidth={5} opacity={0.9} transform={`rotate(-12 100 ${g.headCy})`} />);
      if (layer === 'body' && stage >= 4) n.push(<g key="neb" opacity={0.45}><ellipse cx={hx - g.bodyRx * 0.45} cy={bodyMarkY} rx={14} ry={9} fill="#ff8ef5" /><ellipse cx={hx + g.bodyRx * 0.5} cy={bodyMarkY - 6} rx={10} ry={7} fill="#7ef7ff" /></g>);
      if (layer === 'head' && stage >= 5 && showCrown) n.push(<polygon key="cs" className="cc-twinkle" points={star(hx, top - 12, 16)} fill="#ffe066" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />);
      if (layer === 'front' && stage >= 5) n.push(<g key="pl" className="cc-orbit" style={{ transformOrigin: '100px 115px' }}>
        <circle cx={182} cy={115} r={8} fill="#ff9ee8" stroke={line} strokeWidth={2} /><circle cx={18} cy={115} r={6} fill="#7ef7ff" stroke={line} strokeWidth={2} /><circle cx={100} cy={30} r={5} fill="#ffe066" stroke={line} strokeWidth={2} />
      </g>);
      break;
    case 'air':
      if (layer === 'head' && stage >= 2 && showCrown) n.push(<path key="sw" d={`M ${hx - 4} ${top + 6} q -4 -18 10 -22 q 12 -2 10 10 q -2 8 -10 4`} stroke={line} strokeWidth={8} fill="none" strokeLinecap="round" />, <path key="sw2" d={`M ${hx - 4} ${top + 6} q -4 -18 10 -22 q 12 -2 10 10 q -2 8 -10 4`} stroke={lighten(p.main, 0.4)} strokeWidth={4.5} fill="none" strokeLinecap="round" />);
      if (layer === 'head' && stage >= 3) n.push(both((d) => (
        <g key={`ft${d}`} transform={`translate(${hx + d * rx * 0.92} ${g.headCy}) rotate(${d * 70})`}><path d={leaf(22, 7)} fill={lighten(p.main, 0.35)} stroke={line} strokeWidth={2.5} /></g>
      )));
      if (layer === 'back' && stage >= 5 && sp.wings === 'none') n.push(<WingPair key="cl" type="cloud" g={g} line={line} fill="#fff" accent={p.accent} scale={0.95} />);
      if (layer === 'front' && stage >= 4) n.push(<g key="wind" className="cc-drift" stroke="#fff" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.85}>
        <path d="M 14 70 q 20 -10 40 0 t 30 -4" /><path d="M 150 150 q 14 -8 30 0" /><path d="M 140 50 q 16 -10 34 -2" />
      </g>);
      break;
  }
  return <>{n.map((node, i) => <Fragment key={i}>{node}</Fragment>)}</>;
}

function Flower({ x, y, r, color, line }: { x: number; y: number; r: number; color: string; line: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * r} cy={y + Math.sin((a * Math.PI) / 180) * r} r={r * 0.75} fill={color} stroke={line} strokeWidth={1.5} />)}
      <circle cx={x} cy={y} r={r * 0.6} fill="#ffd43b" stroke={line} strokeWidth={1.5} />
    </g>
  );
}
function Snowflake({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return <g stroke={color} strokeWidth={1.8} strokeLinecap="round">{[0, 60, 120].map((a) => <line key={a} x1={x - r} y1={y} x2={x + r} y2={y} transform={`rotate(${a} ${x} ${y})`} />)}</g>;
}
function Embers({ color }: { color: string }) {
  return <g>{[40, 70, 130, 160, 100].map((x, i) => <circle key={x} className="cc-rise" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy={150} r={3 + (i % 2)} fill={color} />)}</g>;
}
function Petals({ color }: { color: string }) {
  return <g>{[30, 60, 140, 170].map((x, i) => <ellipse key={x} className="cc-fall" style={{ animationDelay: `${i * 0.9}s` }} cx={x} cy={40} rx={4} ry={2.5} fill={color} />)}</g>;
}
function Sparks({ color, count }: { color: string; count: number }) {
  const pos = [[26, 70], [176, 90], [40, 150], [164, 40], [20, 110], [180, 150]];
  return <g>{pos.slice(0, count).map(([x, y], i) => <polygon key={i} className="cc-twinkle" style={{ animationDelay: `${i * 0.3}s` }} points={bolt(x, y, 18)} fill={color} />)}</g>;
}
function Flurry() {
  return <g>{[30, 70, 130, 172].map((x, i) => <g key={x} className="cc-fall" style={{ animationDelay: `${i * 0.7}s` }}><Snowflake x={x} y={30} r={5} color="#ffffff" /></g>)}</g>;
}
function Wisps({ color }: { color: string }) {
  return <g>{[36, 164, 60].map((x, i) => <circle key={x} className="cc-rise" style={{ animationDelay: `${i * 0.8}s` }} cx={x} cy={140} r={5} fill={color} opacity={0.7} />)}</g>;
}

/* ─────────────────────────── RARITY FX ─────────────────────────── */
function RarityFx({ sp }: { sp: Species }) {
  const r = RARITIES[sp.rarity];
  if (r.stars <= 1) return null;
  const spots = [[30, 46], [172, 64], [24, 132], [178, 138]].slice(0, r.stars - 1);
  const color = sp.rarity === 'legendary' ? '#ffd23f' : sp.rarity === 'epic' ? '#e9b6ff' : '#ffffff';
  return <g>{spots.map(([x, y], i) => <polygon key={i} className="cc-twinkle" style={{ animationDelay: `${i * 0.45}s` }} points={star(x, y, 7, 4, 0.32)} fill={color} stroke={sp.rarity === 'legendary' ? '#d08a00' : 'none'} strokeWidth={1} />)}</g>;
}

/* ─────────────────────────── MAIN ─────────────────────────── */
export interface CreatureSvgProps {
  species: Species;
  stage: Stage;
  expression?: Expression;
  equipped?: Equipped;
  /** hide floor shadow (e.g. inside badges) */
  noShadow?: boolean;
  /** draw ambient effects (particles, rarity sparkles). Off for tiny thumbnails. */
  effects?: boolean;
  className?: string;
  title?: string;
  /** force the original vector drawing (dev contact sheets) */
  classic?: boolean;
}

function CreatureSvgImpl(props: CreatureSvgProps) {
  const artStyle = useStore((s) => s.data.settings.artStyle ?? 'illustrated');
  if (artStyle === 'illustrated' && !props.classic && hasIllustration(props.species.id, props.stage)) {
    return <IllustratedCreature sp={props.species} stage={props.stage} equipped={props.equipped} noShadow={props.noShadow} effects={props.effects} className={props.className} title={props.title} />;
  }
  return <VectorCreature {...props} />;
}

function VectorCreature({ species: sp, stage, expression = 'happy', equipped = {}, noShadow, effects = true, className, title }: CreatureSvgProps) {
  const uid = useId().replace(/:/g, '');
  const g = geometry(sp, stage);
  const el = ELEMENTS[sp.element];
  const line = darken(sp.palette.shade, 0.55);
  const c: Ctx = { sp, stage, g, id: uid, line, grow: GROW[stage], el };
  const p = sp.palette;
  const scale = STAGE_SCALE[stage];
  const hatOn = !!equipped.hat;
  const bodyGrad = `cc-body-${uid}`;
  const auraGrad = `cc-aura-${uid}`;
  const wingScale = sp.wings === 'none' ? 0 : [0, 0.32, 0.55, 0.75, 0.9, 1.05][stage];

  return (
    <svg viewBox="-8 -22 216 222" className={`${className ?? ''}${effects ? '' : ' cc-still'}`} role="img" aria-label={title ?? `${sp.name}`} overflow="visible">
      <defs>
        <radialGradient id={bodyGrad} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor={lighten(p.main, 0.28)} />
          <stop offset="55%" stopColor={p.main} />
          <stop offset="100%" stopColor={p.shade} />
        </radialGradient>
        <radialGradient id={auraGrad}>
          <stop offset="0%" stopColor={el.glow} stopOpacity={0.75} />
          <stop offset="70%" stopColor={el.glow} stopOpacity={0.18} />
          <stop offset="100%" stopColor={el.glow} stopOpacity={0} />
        </radialGradient>
      </defs>

      {!noShadow && <ellipse cx={100} cy={186} rx={52 * scale} ry={8 * scale} fill="#1a1033" opacity={g.floating ? 0.12 : 0.2} className={g.floating ? 'cc-shadow-pulse' : undefined} />}
      {effects && stage >= 4 && <circle cx={100} cy={112} r={stage === 5 ? 98 : 84} fill={`url(#${auraGrad})`} className="cc-pulse" />}
      {effects && (sp.rarity === 'epic' || sp.rarity === 'legendary') && (
        <circle cx={100} cy={112} r={92} fill="none" stroke={sp.rarity === 'legendary' ? '#ffd23f' : '#d6a6ff'} strokeWidth={2.5} strokeDasharray="4 10" opacity={0.6} className="cc-spin-slow" style={{ transformOrigin: '100px 112px' }} />
      )}

      <g transform={`translate(100 184) scale(${scale}) translate(-100 -184)`}>
        <g className="cc-body-root">
          <ElementFeatures c={c} layer="back" hatOn={hatOn} />
          <BackAccessories equipped={equipped} g={g} line={line} />
          <WingPair type={sp.wings} g={g} line={line} fill={p.main} accent={p.accent} scale={wingScale} cls="cc-flap" />
          <Tail c={c} />

          {/* feet */}
          {!g.floating && <>
            <ellipse cx={g.cx - 22} cy={g.bottom - 2} rx={15} ry={9} fill={p.shade} stroke={line} strokeWidth={W} />
            <ellipse cx={g.cx + 22} cy={g.bottom - 2} rx={15} ry={9} fill={p.shade} stroke={line} strokeWidth={W} />
          </>}
          {g.floating && (
            <path d={`M ${g.cx - 30} ${g.bottom - 14} Q ${g.cx - 10} ${g.bottom + 26} ${g.cx + 26} ${g.bottom + 30} Q ${g.cx + 8} ${g.bottom + 12} ${g.cx + 30} ${g.bottom - 14} Z`} fill={p.shade} stroke={line} strokeWidth={W} strokeLinejoin="round" />
          )}

          <Ears c={c} front={false} />

          {/* body */}
          {g.twoPiece ? (
            <>
              <ellipse cx={g.cx} cy={g.bodyCy} rx={g.bodyRx} ry={g.bodyRy} fill={`url(#${bodyGrad})`} stroke={line} strokeWidth={W} />
              <ellipse cx={g.cx} cy={g.bodyCy + 6} rx={g.bodyRx * 0.62} ry={g.bodyRy * 0.7} fill={p.belly} />
              <ElementFeatures c={c} layer="body" hatOn={hatOn} />
              <ellipse cx={g.headCx} cy={g.headCy} rx={g.headRx} ry={g.headRy} fill={`url(#${bodyGrad})`} stroke={line} strokeWidth={W} />
            </>
          ) : (
            <>
              <path d={blob(g.cx, g.bodyCy, g.bodyRx, g.bodyRy, g.pinch)} fill={`url(#${bodyGrad})`} stroke={line} strokeWidth={W} strokeLinejoin="round" />
              <ellipse cx={g.cx} cy={g.bottom - g.bodyRy * 0.42} rx={g.bodyRx * 0.56} ry={g.bodyRy * 0.4} fill={p.belly} />
              <ElementFeatures c={c} layer="body" hatOn={hatOn} />
            </>
          )}
          <Pattern c={c} />
          {/* gloss */}
          <ellipse cx={g.headCx - g.headRx * 0.45} cy={g.headTop + g.headRy * 0.42} rx={g.headRx * 0.22} ry={g.headRy * 0.13} fill="#fff" opacity={0.35} transform={`rotate(-30 ${g.headCx - g.headRx * 0.45} ${g.headTop + g.headRy * 0.42})`} />

          {/* arms */}
          <ellipse cx={g.cx - g.armDx} cy={g.armY} rx={9} ry={14} fill={p.main} stroke={line} strokeWidth={W} transform={`rotate(25 ${g.cx - g.armDx} ${g.armY})`} />
          <g className="cc-arm-r" style={{ transformOrigin: `${g.cx + g.armDx - 4}px ${g.armY - 10}px` }}>
            <ellipse cx={g.cx + g.armDx} cy={g.armY} rx={9} ry={14} fill={p.main} stroke={line} strokeWidth={W} transform={`rotate(-25 ${g.cx + g.armDx} ${g.armY})`} />
          </g>

          <Ears c={c} front />
          <Face c={c} expression={expression} />
          <ElementFeatures c={c} layer="head" hatOn={hatOn} />
          <Accessories equipped={equipped} g={g} line={line} />
          <ElementFeatures c={c} layer="front" hatOn={hatOn} />
        </g>
      </g>
      {effects && <RarityFx sp={sp} />}
    </svg>
  );
}

export const CreatureSvg = memo(CreatureSvgImpl);
