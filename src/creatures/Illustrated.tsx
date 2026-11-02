import { useId } from 'react';
import ART from '../data/creatureArt.json';
import { ELEMENTS, RARITIES } from '../data/elements';
import type { Equipped, Species, Stage } from '../types';
import { Accessories, BackAccessories } from './accessories';
import type { Geo } from './CreatureSvg';
import { star } from './shapes';

/**
 * Illustrated creature art (generated with Higgsfield, one image per species × stage,
 * in public/creatures/). Accessories are placed from anchor points measured on each
 * image by scripts/creature-anchors.py, so hats and glasses still line up.
 */
interface Anchor { top: number; bottom: number; left: number; right: number; cx: number; headW: number; eyes: [number, number][] }
const ANCHORS = ART as unknown as Record<string, Anchor>;

export function hasIllustration(id: string, stage: Stage): boolean {
  return `${id}-${stage}` in ANCHORS;
}

export function illustrationUrl(id: string, stage: Stage): string {
  return `${import.meta.env.BASE_URL}creatures/${id}-${stage}.webp`;
}

// image (512px square) → svg viewBox coordinates
const IMG_X = -8, IMG_Y = -16, IMG_S = 216;
const map = (p: number) => (p * IMG_S) / 512;

/** Geometry for accessories, expressed in the vector creature's unscaled frame (eye gap ≈ 40). */
function geoFor(a: Anchor): { g: Geo; k: number; ox: number; oy: number } {
  const [[lx, ly], [rx, ry]] = a.eyes;
  const ex = IMG_X + map((lx + rx) / 2), ey = IMG_Y + map((ly + ry) / 2);
  const eyeDxSvg = map(Math.abs(rx - lx)) / 2;
  const headHalf = Math.max(map(a.headW) / 2, eyeDxSvg * 1.8);
  const k = Math.max(0.3, (headHalf / 50) * 0.82);  // accessory size follows the head, not the eyes
  const u = (d: number) => d / k;                    // svg distance → unscaled frame
  const headRx = u(headHalf);
  const eyeDx = u(eyeDxSvg);
  const headTop = Math.max(u(IMG_Y + map(a.top) - ey), -headRx * 0.95);
  const bottom = u(IMG_Y + map(a.bottom) - ey);
  const g: Geo = {
    cx: 0, headCx: 0, headCy: headTop + headRx * 0.85, headRx, headRy: headRx * 0.9, headTop,
    bodyCy: (headRx * 0.6 + bottom) / 2, bodyRx: headRx * 0.8, bodyRy: Math.max(20, (bottom - headRx * 0.6) / 2), bottom,
    eyeY: 0, eyeDx, eyeR: eyeDx * 0.36, mouthY: eyeDx * 0.8,
    armY: headRx * 0.8, armDx: headRx * 0.9, tailX: headRx, tailY: bottom - 20, neckY: headRx * 0.62, chestY: headRx * 0.95,
    floating: false, twoPiece: true, pinch: 1,
  };
  return { g, k, ox: ex, oy: ey };
}

export function IllustratedCreature({ sp, stage, equipped = {}, noShadow, effects = true, className, title }: {
  sp: Species; stage: Stage; equipped?: Equipped; noShadow?: boolean; effects?: boolean; className?: string; title?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const a = ANCHORS[`${sp.id}-${stage}`];
  const el = ELEMENTS[sp.element];
  const { g, k, ox, oy } = geoFor(a);
  const line = '#2b2140';
  const auraGrad = `cc-ill-aura-${uid}`;
  const shadowW = map(a.right - a.left) * 0.42;
  const rar = RARITIES[sp.rarity];
  const sparkles = [[30, 46], [172, 64], [24, 132], [178, 138]].slice(0, rar.stars - 1);
  const sparkleColor = sp.rarity === 'legendary' ? '#ffd23f' : sp.rarity === 'epic' ? '#e9b6ff' : '#ffffff';
  // accessories live in the vector frame, centred on the eyes and scaled to this head
  const frame = `translate(${ox} ${oy}) scale(${k})`;
  const hasBack = !!(equipped.wings || equipped.decoration === 'deco-cape' || equipped.magic === 'magic-rainbow');

  return (
    <svg viewBox="-8 -22 216 222" className={`${className ?? ''}${effects ? '' : ' cc-still'}`} role="img" aria-label={title ?? sp.name} overflow="visible">
      <defs>
        <radialGradient id={auraGrad}>
          <stop offset="0%" stopColor={el.glow} stopOpacity={0.7} />
          <stop offset="70%" stopColor={el.glow} stopOpacity={0.15} />
          <stop offset="100%" stopColor={el.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      {!noShadow && <ellipse cx={IMG_X + map((a.left + a.right) / 2)} cy={IMG_Y + map(a.bottom) - 2} rx={shadowW} ry={7} fill="#1a1033" opacity={0.2} />}
      {effects && stage >= 4 && <circle cx={100} cy={110} r={stage === 5 ? 100 : 86} fill={`url(#${auraGrad})`} className="cc-pulse" />}
      {effects && (sp.rarity === 'epic' || sp.rarity === 'legendary') && (
        <circle cx={100} cy={112} r={94} fill="none" stroke={sp.rarity === 'legendary' ? '#ffd23f' : '#d6a6ff'} strokeWidth={2.5} strokeDasharray="4 10" opacity={0.55} className="cc-spin-slow" style={{ transformOrigin: '100px 112px' }} />
      )}
      {hasBack && <g transform={frame}><BackAccessories equipped={equipped} g={g} line={line} /></g>}
      <image href={illustrationUrl(sp.id, stage)} x={IMG_X} y={IMG_Y} width={IMG_S} height={IMG_S} preserveAspectRatio="xMidYMid meet" style={{ imageRendering: 'auto' }} />
      <g transform={frame}><Accessories equipped={equipped} g={g} line={line} /></g>
      {effects && sparkles.map(([x, y], i) => (
        <polygon key={i} className="cc-twinkle" style={{ animationDelay: `${i * 0.45}s` }} points={star(x, y, 7, 4, 0.32)} fill={sparkleColor} stroke={sp.rarity === 'legendary' ? '#d08a00' : 'none'} strokeWidth={1} />
      ))}
    </svg>
  );
}
