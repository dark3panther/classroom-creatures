import type { ReactNode } from 'react';
import { ELEMENTS } from '../data/elements';
import type { ElementType } from '../types';

/**
 * Scenic backdrops behind a creature. "bg-habitat" is the creature's home element;
 * the rest are unlockable backgrounds. Pure CSS/SVG so they scale to a projector.
 */
export function Habitat({ element, background, children, className = '', rounded = 'rounded-[1.25rem]' }: {
  element: ElementType; background?: string; children?: ReactNode; className?: string; rounded?: string;
}) {
  const el = ELEMENTS[element];
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
  const style = scene ? scene.style : `radial-gradient(120% 90% at 50% 0%, ${el.sky[0]} 0%, ${el.sky[1]} 100%)`;
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ background: style }}>
      <svg className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
        {scene ? scene.deco : <HomeDeco element={element} />}
      </svg>
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

function HomeDeco({ element }: { element: ElementType }) {
  const el = ELEMENTS[element];
  const ground = <ellipse cx="50%" cy="104%" rx="70%" ry="22%" fill="#ffffff" opacity=".22" />;
  switch (element) {
    case 'cosmic':
    case 'shadow':
      return <>{[[12, 18], [30, 40], [78, 14], [88, 46], [60, 26], [20, 70]].map(([x, y], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r={1.6} fill="#fff" opacity=".85" className="cc-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />)}{ground}</>;
    case 'water':
      return <>{[[14, 30, 5], [84, 22, 7], [70, 60, 4], [24, 66, 3]].map(([x, y, r], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="none" stroke="#fff" strokeWidth="1.6" opacity=".6" />)}{ground}</>;
    case 'fire':
      return <><circle cx="82%" cy="20%" r="22" fill="#fff3c4" opacity=".55" />{ground}</>;
    case 'nature':
      return <><circle cx="16%" cy="22%" r="5" fill="#fff" opacity=".5" /><circle cx="84%" cy="30%" r="3.5" fill="#fff" opacity=".5" />{ground}</>;
    case 'ice':
    case 'air':
      return <><ellipse cx="18%" cy="22%" rx="26" ry="9" fill="#fff" opacity=".7" /><ellipse cx="82%" cy="34%" rx="20" ry="7" fill="#fff" opacity=".6" />{ground}</>;
    case 'light':
    case 'electric':
      return <><circle cx="50%" cy="38%" r="60" fill={el.glow} opacity=".35" />{ground}</>;
    default:
      return ground;
  }
}
