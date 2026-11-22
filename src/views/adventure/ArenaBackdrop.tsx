import { memo, useId, type ReactNode } from 'react';
import { star } from '../../creatures/shapes';
import type { RegionId } from '../../types';

/**
 * The painted place a lesson battle happens in, one per region: a soft sky, two misty distant layers and a
 * ground for the class and the boss to stand on, with the region's landmarks kept to the edges so the
 * characters stay the focus. Low contrast and soft shapes on purpose: it is a stage, not the subject.
 * viewBox 1600 × 900; the ground starts around y = 610.
 */
interface Scene { sky: [string, string, string]; far: string; mid: string; ground: [string, string]; props: (u: string) => ReactNode; dust?: string }

const hills = (y: number, amp: number, f: number, ph: number) => {
  let d = `M 0 900 L 0 ${y}`;
  for (let x = 0; x <= 1600; x += 40) d += ` L ${x} ${y - amp * (0.6 + 0.4 * Math.sin(x * f + ph)) - amp * 0.3 * Math.sin(x * f * 2.6 + ph * 1.7)}`;
  return `${d} L 1600 900 Z`;
};
const tree = (x: number, y: number, s: number, c: string) => (
  <g key={`${x}-${y}`}><rect x={x - 6 * s} y={y - 50 * s} width={12 * s} height={50 * s} rx={4} fill="#7a5a3a" /><circle cx={x} cy={y - 70 * s} r={38 * s} fill={c} /><circle cx={x - 14 * s} cy={y - 84 * s} r={18 * s} fill="#fff" opacity={0.18} /></g>
);
const cloud = (x: number, y: number, s: number, o = 0.9) => (
  <g key={`c${x}-${y}`} opacity={o}><ellipse cx={x} cy={y} rx={90 * s} ry={34 * s} fill="#fff" /><circle cx={x - 40 * s} cy={y - 18 * s} r={34 * s} fill="#fff" /><circle cx={x + 18 * s} cy={y - 30 * s} r={44 * s} fill="#fff" /></g>
);
const crystal = (x: number, y: number, h: number, w: number, c: string, u: string) => (
  <g key={`k${x}`}><path d={`M ${x - w} ${y} L ${x - w * 0.7} ${y - h * 0.8} L ${x} ${y - h} L ${x + w * 0.7} ${y - h * 0.8} L ${x + w} ${y} Z`} fill={c} opacity={0.9} /><path d={`M ${x} ${y - h} L ${x} ${y}`} stroke="#fff" strokeWidth={4} opacity={0.4} /><ellipse cx={x} cy={y - h * 0.5} rx={w * 2.2} ry={h * 0.7} fill={c} opacity={0.25} filter={`url(#${u}-blur)`} /></g>
);
const mushroom = (x: number, y: number, s: number, cap: string) => (
  <g key={`m${x}`}><path d={`M ${x - 22 * s} ${y} Q ${x - 16 * s} ${y - 120 * s} ${x} ${y - 130 * s} Q ${x + 16 * s} ${y - 120 * s} ${x + 22 * s} ${y} Z`} fill="#f2e2cc" /><path d={`M ${x - 110 * s} ${y - 120 * s} Q ${x} ${y - 230 * s} ${x + 110 * s} ${y - 120 * s} Q ${x} ${y - 100 * s} ${x - 110 * s} ${y - 120 * s} Z`} fill={cap} />{[[-50, -150], [10, -175], [55, -140]].map(([dx, dy], i) => <ellipse key={i} cx={x + dx * s} cy={y + dy * s} rx={14 * s} ry={9 * s} fill="#fff" opacity={0.7} />)}</g>
);
const palm = (x: number, y: number, s: number) => (
  <g key={`p${x}`}><path d={`M ${x} ${y} Q ${x + 10 * s} ${y - 90 * s} ${x - 6 * s} ${y - 170 * s}`} stroke="#9a6a3a" strokeWidth={14 * s} fill="none" strokeLinecap="round" />{[-1, 1].flatMap((d) => [0.2, 0.7].map((k, i) => <path key={`${d}${i}`} d={`M ${x - 6 * s} ${y - 170 * s} q ${d * 60 * s} ${-30 * s * k} ${d * 120 * s} ${30 * s + 30 * s * k}`} stroke="#3f9a5a" strokeWidth={16 * s} fill="none" strokeLinecap="round" />))}</g>
);
const coral = (x: number, y: number, s: number, c: string) => (
  <g key={`co${x}`} stroke={c} strokeWidth={16 * s} strokeLinecap="round" fill="none"><path d={`M ${x} ${y} L ${x} ${y - 90 * s} M ${x} ${y - 40 * s} L ${x - 34 * s} ${y - 80 * s} M ${x} ${y - 55 * s} L ${x + 30 * s} ${y - 100 * s} M ${x - 34 * s} ${y - 80 * s} L ${x - 40 * s} ${y - 110 * s}`} /></g>
);
const stars = (n: number, seed: number, maxY: number) => {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: n }, (_, i) => { const x = r() * 1600, y = r() * maxY; return i % 7 === 0 ? <polygon key={i} points={star(x, y, 7, 4, 0.4)} fill="#fff" opacity={0.85} /> : <circle key={i} cx={x} cy={y} r={1.5 + r() * 2} fill="#fff" opacity={0.6 + r() * 0.4} />; });
};

const SCENES: Record<RegionId, Scene> = {
  verdant: {
    sky: ['#8fd3ff', '#c9ecff', '#f2fbff'], far: '#9fd3b8', mid: '#6fbf6a', ground: ['#8fd36a', '#5aa84a'],
    props: () => <>{cloud(260, 150, 1.2)}{cloud(1200, 110, 1)}{tree(120, 640, 1.6, '#4f9a3c')}{tree(250, 650, 1.2, '#5fae48')}{tree(1500, 640, 1.5, '#4f9a3c')}</>,
  },
  crystal: {
    sky: ['#2a1f55', '#4a3a8c', '#6a5ab0'], far: '#3a2f6e', mid: '#4f3f8a', ground: ['#5a4a9c', '#3a2f6e'], dust: '#7fe0ff',
    props: (u) => <>{[120, 260, 420, 1180, 1340, 1500].map((x, i) => <path key={x} d={`M ${x - 40} 0 L ${x} ${100 + (i % 3) * 50} L ${x + 40} 0 Z`} fill="#241a4a" />)}{crystal(110, 660, 180, 40, '#7fe0ff', u)}{crystal(220, 660, 120, 30, '#d08aff', u)}{crystal(1480, 660, 200, 44, '#d08aff', u)}{crystal(1370, 660, 110, 28, '#7fe0ff', u)}</>,
  },
  lagoon: {
    sky: ['#8fe0ff', '#c6f2ff', '#fff6e0'], far: '#5fc8d8', mid: '#2fa6c0', ground: ['#f6e2a8', '#e8c37a'],
    props: () => <>{cloud(300, 130, 1)}{cloud(1250, 170, 0.8)}<path d="M 1180 520 L 1200 330 L 1215 520 Z M 1120 400 L 1290 410" stroke="#7a5a3a" strokeWidth={10} fill="#7a5a3a" opacity={0.5} />{coral(110, 680, 1.4, '#ff8f80')}{coral(220, 690, 1, '#ffb36b')}{coral(1490, 680, 1.4, '#ff8fb1')}{coral(1380, 690, 1, '#ff8f80')}</>,
  },
  frostpeak: {
    sky: ['#2a3f7a', '#5a7fc0', '#bfe0ff'], far: '#c6d9f2', mid: '#eaf4ff', ground: ['#f4f9ff', '#d6e6f8'],
    props: (u) => <>{stars(40, 3, 260)}<path d="M 0 180 Q 400 80 800 170 T 1600 140" stroke="#7fffc6" strokeWidth={60} fill="none" opacity={0.35} filter={`url(#${u}-blur)`} /><path d="M 0 230 Q 500 140 900 220 T 1600 200" stroke="#9fd0ff" strokeWidth={40} fill="none" opacity={0.3} filter={`url(#${u}-blur)`} />{[[100, 660], [210, 670], [1500, 660], [1400, 670]].map(([x, y], i) => <path key={i} d={`M ${x} ${y - 170} L ${x - 50} ${y} L ${x + 50} ${y} Z`} fill="#3f7a6a" />)}</>,
  },
  ember: {
    sky: ['#5a1f2a', '#c0502f', '#ffb36b'], far: '#7a3a3a', mid: '#4a2a2f', ground: ['#5a3a3a', '#3a2328'], dust: '#ffb43d',
    props: (u) => <><path d="M 1150 560 L 1290 260 L 1360 260 L 1520 560 Z" fill="#3a2328" /><ellipse cx={1325} cy={262} rx={40} ry={12} fill="#ffb43d" /><ellipse cx={1325} cy={250} rx={120} ry={80} fill="#ff7a1a" opacity={0.35} filter={`url(#${u}-blur)`} /><path d="M 1325 270 L 1300 400 L 1340 480 L 1310 600" stroke="#ff9a2b" strokeWidth={14} fill="none" opacity={0.85} />{cloud(300, 140, 1.3, 0.5)}<path d="M 330 190 l -20 40 h 24 l -20 44" stroke="#ffd23f" strokeWidth={8} fill="none" /></>,
  },
  hollow: {
    sky: ['#1f1a4a', '#4a3a7a', '#8a6ab0'], far: '#3a2f62', mid: '#4f3f7a', ground: ['#5a7a4a', '#3a5a3a'], dust: '#fff2a8',
    props: () => <>{stars(30, 7, 300)}{mushroom(130, 680, 1.8, '#c06ad8')}{mushroom(300, 690, 1, '#ff8fd0')}{mushroom(1480, 680, 1.9, '#9b6ad8')}{mushroom(1320, 690, 1.1, '#ff8fd0')}</>,
  },
  sky: {
    sky: ['#7fc6ff', '#bfe6ff', '#fff7e0'], far: '#ffffff', mid: '#eaf6ff', ground: ['#ffffff', '#dceeff'],
    props: () => <>{['#ff5d5d', '#ffa53d', '#ffe066', '#6fdc8c', '#5ab8f0', '#a78bfa'].map((c, i) => <path key={i} d={`M ${150 + i * 18} 640 A ${650 - i * 18} ${520 - i * 18} 0 0 1 ${1450 - i * 18} 640`} stroke={c} strokeWidth={18} fill="none" opacity={0.45} />)}{[[230, 330, 1], [1350, 280, 1.2]].map(([x, y, s], i) => <g key={i}><path d={`M ${x - 90 * s} ${y} L ${x + 90 * s} ${y} L ${x + 20 * s} ${y + 110 * s} L ${x - 20 * s} ${y + 110 * s} Z`} fill="#9a7a5a" /><ellipse cx={x} cy={y} rx={92 * s} ry={20 * s} fill="#6fbf6a" /></g>)}{cloud(700, 140, 1.4)}{cloud(1100, 200, 1)}</>,
  },
  ancient: {
    sky: ['#2a1f4a', '#6a4a8a', '#e0b88a'], far: '#7a5a6a', mid: '#a88a6a', ground: ['#e3c98f', '#b8975a'],
    props: () => <>{stars(50, 11, 280)}<g opacity={0.55}>{[0, 1, 2, 3].map((k) => <rect key={k} x={700 + k * 30} y={330 + k * 50} width={200 - k * 60} height={50} fill="#8a6a4a" transform={`translate(${-k * 0} 0)`} />)}</g>{[110, 230, 1370, 1490].map((x) => <g key={x}><rect x={x - 26} y={360} width={52} height={300} fill="#d6c094" /><rect x={x - 38} y={340} width={76} height={24} fill="#c9ad7a" /></g>)}</>,
  },
  dunes: {
    sky: ['#ff9a6a', '#ffcf8a', '#fff1c4'], far: '#f2b46b', mid: '#e8a85a', ground: ['#f6d290', '#e0aa5a'],
    props: (u) => <><circle cx={1250} cy={260} r={110} fill="#fff1a8" /><circle cx={1250} cy={260} r={180} fill="#ffd36b" opacity={0.35} filter={`url(#${u}-blur)`} /><path d="M 820 560 L 1000 330 L 1180 560 Z" fill="#d89a4a" /><path d="M 1000 330 L 1180 560 L 1060 560 Z" fill="#b5762e" />{palm(120, 680, 1.3)}{palm(1500, 680, 1.4)}</>,
  },
};

export const ArenaBackdrop = memo(function ArenaBackdrop({ regionId }: { regionId: RegionId }) {
  const u = `ab${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const s = SCENES[regionId] ?? SCENES.verdant;
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${u}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.sky[0]} /><stop offset="0.55" stopColor={s.sky[1]} /><stop offset="1" stopColor={s.sky[2]} /></linearGradient>
        <linearGradient id={`${u}-ground`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.ground[0]} /><stop offset="1" stopColor={s.ground[1]} /></linearGradient>
        <filter id={`${u}-blur`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
        <filter id={`${u}-soft`}><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <rect width="1600" height="900" fill={`url(#${u}-sky)`} />
      <path d={hills(470, 70, 0.004, 1)} fill={s.far} opacity={0.7} filter={`url(#${u}-soft)`} />
      <path d={hills(560, 50, 0.006, 3)} fill={s.mid} opacity={0.9} />
      {s.props(u)}
      {/* the stage: a broad soft ground, lighter where the class and the boss stand */}
      <path d="M 0 900 L 0 640 Q 800 560 1600 640 L 1600 900 Z" fill={`url(#${u}-ground)`} />
      <ellipse cx={800} cy={760} rx={760} ry={120} fill="#fff" opacity={0.14} />
      {s.dust && Array.from({ length: 18 }, (_, i) => <circle key={i} cx={(i * 211) % 1600} cy={120 + ((i * 97) % 420)} r={3 + (i % 3)} fill={s.dust} opacity={0.55} className="ab-dust" style={{ animationDelay: `${(i % 6) * 0.7}s` }} />)}
    </svg>
  );
});
