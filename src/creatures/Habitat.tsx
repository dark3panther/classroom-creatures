import type { ReactNode } from 'react';
import { SPECIES } from '../data/species';
import type { ElementType } from '../types';

/**
 * The field-guide plate behind a creature: a painted watercolour wash in its element's colour.
 * The washes are rasters in `public/plates/<element>-<1|2|3>.webp`, rendered once by `scripts/plates/` (pooled
 * edges, blooms, granulation). Each species of an element keeps its own wash, so a creature's plate never changes.
 * Unlockable backgrounds are painted inside the same wash shape.
 */
function washVariant(element: ElementType, seed?: string): number {
  const same = SPECIES.filter((s) => s.element === element);
  const at = seed ? same.findIndex((s) => s.id === seed) : -1;
  if (at >= 0) return (at % 3) + 1;
  let h = 0;
  for (const c of seed ?? element) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % 3) + 1;
}

export function Habitat({ element, background, children, className = '', rounded = 'rounded-[10px]', seed }: {
  element: ElementType; background?: string; children?: ReactNode; className?: string; rounded?: string; seed?: string;
}) {
  const bg = background && background !== 'bg-habitat' ? background : `home-${element}`;
  const wash = `${import.meta.env.BASE_URL}plates/${element}-${washVariant(element, seed)}.webp`;
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
  const mask = `url("${wash}")`;
  return (
    <div className={`relative overflow-hidden bg-white ${rounded} ${className}`}>
      {scene ? (
        <>
          <div className="absolute inset-0" style={{ background: scene.style, maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}>
            <svg className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">{scene.deco}</svg>
          </div>
          <img src={wash} alt="" aria-hidden draggable={false} className="pointer-events-none absolute inset-0 h-full w-full mix-blend-multiply opacity-35" />
        </>
      ) : (
        <img src={wash} alt="" aria-hidden draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
      )}
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}
