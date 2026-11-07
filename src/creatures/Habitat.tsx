import { useId, type ReactNode } from 'react';
import { ELEMENTS } from '../data/elements';
import type { ElementType } from '../types';

/** Watercolour tints per element: [pale under-wash, pooled pigment]. Light enough for a projector in a lit room. */
const WASH: Record<ElementType, [string, string]> = {
  fire: ['#ffe2cc', '#ffab7c'],
  water: ['#d6efff', '#84c7f2'],
  nature: ['#ddf2cb', '#9cd681'],
  electric: ['#fff3bb', '#ffd75a'],
  ice: ['#e7f8ff', '#a6def3'],
  earth: ['#f3e4cb', '#d8ae80'],
  shadow: ['#e6defa', '#ab96e4'],
  light: ['#fff6da', '#ffe197'],
  cosmic: ['#e3ddff', '#a493ff'],
  air: ['#ebf7ff', '#b4dcf1'],
};

type Pt = [number, number];
interface WashShape { under: string; main: string; second: string; bloom: string; specks: [number, number, number][] }

/** small deterministic generator, so a species always gets the same painted plate */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blob(r: () => number, cx: number, cy: number, rx: number, ry: number, n = 34, wobble = 0.09): string {
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wobble * (Math.sin(2 * a + ph[0]) * 0.55 + Math.sin(3 * a + ph[1]) * 0.45 + Math.sin(5 * a + ph[2]) * 0.25) + (r() - 0.5) * wobble * 0.55;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return `${d}Z`;
}

const shapes = new Map<string, WashShape>();
function washShape(seed: string): WashShape {
  let w = shapes.get(seed);
  if (!w) {
    const r = rng(seed);
    const dx = (r() - 0.5) * 8;
    w = {
      under: blob(r, 100 + dx * 1.6, 74, 92, 66, 30, 0.11),
      main: blob(r, 100 - dx, 80, 80, 57, 40, 0.15),
      second: blob(r, 100 + dx, 86, 62, 44, 30, 0.2),
      bloom: blob(r, 82 + r() * 30, 58 + r() * 14, 26 + r() * 10, 16 + r() * 6, 18, 0.18),
      specks: Array.from({ length: 16 }, () => [30 + r() * 140, 34 + r() * 90, 0.5 + r() * 1.3] as [number, number, number]),
    };
    shapes.set(seed, w);
  }
  return w;
}

/**
 * The field-guide plate behind a creature: a watercolour wash in its element's colour, painted once per species
 * (pass the species id as `seed`). Unlockable backgrounds are painted inside the same wash shape.
 */
export function Habitat({ element, background, children, className = '', rounded = 'rounded-[10px]', seed }: {
  element: ElementType; background?: string; children?: ReactNode; className?: string; rounded?: string; seed?: string;
}) {
  const el = ELEMENTS[element];
  const id = useId().replace(/:/g, '');
  const shape = washShape(seed ?? element);
  const bg = background && background !== 'bg-habitat' ? background : `home-${element}`;
  const scenes: Record<string, { style: string; deco: ReactNode }> = {
    'bg-meadow': {
      style: 'linear-gradient(180deg,#9ee3ff 0%,#d8f6ff 55%,#9be27d 56%,#6cc95a 100%)',
      deco: <>
        <circle cx="86%" cy="18%" r="18" fill="#ffe066" />
        {[12, 30, 62, 80].map((x, i) => <circle key={x} cx={`${x}%`} cy={`${70 + (i % 2) * 12}%`} r="4" fill={i % 2 ? '#ff8fc7' : '#fff'} />)}
      </>,
    },
    'bg-ocean': {
      style: 'linear-gradient(180deg,#5fd0ff 0%,#2a8fd6 60%,#1d6aa8 100%)',
      deco: <>
        {[15, 40, 72, 88].map((x, i) => <circle key={x} cx={`${x}%`} cy={`${20 + i * 15}%`} r={4 + (i % 2) * 3} fill="none" stroke="#bdf0ff" strokeWidth="2" opacity=".7" />)}
        <rect x="0" y="88%" width="100%" height="12%" fill="#f6dfa8" opacity=".85" />
      </>,
    },
    'bg-night': {
      style: 'linear-gradient(180deg,#1b1240 0%,#3b2a7a 70%,#4f3a9c 100%)',
      deco: <>
        <circle cx="80%" cy="20%" r="14" fill="#fff6c4" />
        {[[10, 15], [25, 35], [45, 12], [65, 30], [90, 50], [15, 60], [55, 55]].map(([x, y], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r="1.8" fill="#fff" className="cc-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />)}
      </>,
    },
    'bg-castle': {
      style: 'linear-gradient(180deg,#ffd6f2 0%,#c8b6ff 55%,#ffffff 100%)',
      deco: <>
        <g fill="#fff" opacity=".95"><ellipse cx="20%" cy="85%" rx="60" ry="16" /><ellipse cx="80%" cy="88%" rx="70" ry="18" /></g>
        <g fill="#b9a6e8" opacity=".55"><rect x="74%" y="26%" width="10%" height="40%" rx="4" /><rect x="70%" y="40%" width="18%" height="30%" rx="4" /></g>
      </>,
    },
    'bg-aurora': {
      style: 'linear-gradient(180deg,#0f2a44 0%,#1f5a6a 45%,#2b2a6b 100%)',
      deco: <>
        <path d="M0 40 Q 25 10 50 35 T 100 25" transform="scale(4 1)" stroke="#7effc8" strokeWidth="8" fill="none" opacity=".35" />
        <path d="M0 55 Q 30 30 60 50 T 120 40" transform="scale(4 1)" stroke="#ff8ef5" strokeWidth="6" fill="none" opacity=".3" />
        <polygon points="0,100 25,60 45,85 70,50 100,100" transform="scale(4 1.6) translate(0 -38)" fill="#e9f6ff" opacity=".25" />
      </>,
    },
  };
  scenes['bg-candy'] = {
    style: 'linear-gradient(180deg,#ffd6ec 0%,#ffeaf5 55%,#b8f0d8 56%,#8fe0bd 100%)',
    deco: <>
      {[[12, 70, '#ff6fa3'], [86, 74, '#8b5cf6'], [70, 64, '#ffb020']].map(([x, y, c], i) => <g key={i}><rect x={`${x}%`} y={`${y}%`} width="3" height="24" fill="#fff" /><circle cx={`${Number(x) + 0.6}%`} cy={`${y}%`} r="11" fill={String(c)} stroke="#fff" strokeWidth="3" /></g>)}
      <circle cx="18%" cy="22%" r="9" fill="#fff" opacity=".8" /><circle cx="78%" cy="18%" r="12" fill="#fff" opacity=".8" />
    </>,
  };
  scenes['bg-space'] = {
    style: 'radial-gradient(120% 90% at 50% 0%, #3b2a7a 0%, #120b2e 100%)',
    deco: <>
      <circle cx="82%" cy="22%" r="20" fill="#ff9ee8" opacity=".85" /><ellipse cx="82%" cy="22%" rx="34" ry="7" fill="none" stroke="#ffe066" strokeWidth="3" opacity=".8" />
      {[[10, 14], [30, 30], [52, 10], [66, 42], [16, 56], [90, 60]].map(([x, y], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r="1.8" fill="#fff" className="cc-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />)}
      <rect x="0" y="86%" width="100%" height="14%" fill="#5b6680" opacity=".7" />
    </>,
  };
  const scene = scenes[bg];
  const [pale, pooled] = WASH[element];
  const mask = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150' preserveAspectRatio='none'><path d='${shape.main}' fill='black'/></svg>`)}")`;
  return (
    <div className={`relative overflow-hidden bg-white ${rounded} ${className}`}>
      {scene ? (
        <>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 150" preserveAspectRatio="none" aria-hidden><path d={shape.under} fill={pale} opacity=".6" /></svg>
          <div className="absolute inset-0" style={{ background: scene.style, maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}>
            <svg className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">{scene.deco}</svg>
          </div>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 150" preserveAspectRatio="none" aria-hidden>
            <path d={shape.main} fill="none" stroke="#16241c" strokeOpacity=".22" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
        </>
      ) : (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 150" preserveAspectRatio="none" aria-hidden>
          <defs>
            <radialGradient id={`w${id}`} cx="50%" cy="44%" r="62%">
              <stop offset="0" stopColor={pale} stopOpacity=".7" />
              <stop offset=".7" stopColor={pooled} stopOpacity=".72" />
              <stop offset="1" stopColor={pooled} stopOpacity="1" />
            </radialGradient>
          </defs>
          <path d={shape.under} fill={pale} opacity=".75" />
          <path d={shape.main} fill={`url(#w${id})`} />
          <path d={shape.second} fill={pooled} opacity=".22" />
          <path d={shape.bloom} fill="#fff" opacity=".32" />
          <path d={shape.main} fill="none" stroke={pooled} strokeOpacity=".9" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          <path d={shape.main} fill="none" stroke={el.color} strokeOpacity=".4" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
          {shape.specks.map(([x, y, rr], i) => <ellipse key={i} cx={x} cy={y} rx={rr} ry={rr * 0.8} fill={el.color} opacity=".16" />)}
        </svg>
      )}
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}
