import { memo, useId, type ReactElement, type ReactNode } from 'react';
import { darken, lighten, star } from '../shapes';

/**
 * The bosses of the World of Adventures, drawn as painted illustrations in the creature art's style:
 * clean dark outlines, soft cel shading (radial light from the top left), glossy highlights and big eyes.
 * Drawn in code so a boss can change its face in a battle: grumpy, hurt (it takes a hit), attack (it
 * strikes back) and happy (befriended). Every boss faces three quarters to the left, towards the class.
 *
 * The viewBox is 400 × 400 with the ground at y ≈ 385; BOSS_POINTS gives where hits land and where a
 * strike starts, as fractions of the box.
 */
export type BossMood = 'grumpy' | 'hurt' | 'attack' | 'happy';

const L = '#2b2140';
const SW = 5;

interface Paint {
  u: string;
  defs: ReactElement[];
  /** a rounded form lit from the top left */
  ball: (name: string, base: string, o?: { light?: number; dark?: number; cx?: string; cy?: string }) => string;
  /** a vertical gradient */
  lin: (name: string, stops: [number, string][]) => string;
}
function painter(u: string): Paint {
  const defs: ReactElement[] = [];
  const seen = new Set<string>();
  return {
    u, defs,
    ball: (name, base, o = {}) => {
      const id = `${u}-${name}`;
      if (!seen.has(id)) {
        seen.add(id);
        defs.push(
          <radialGradient key={id} id={id} cx={o.cx ?? '36%'} cy={o.cy ?? '30%'} r="78%">
            <stop offset="0" stopColor={lighten(base, o.light ?? 0.35)} />
            <stop offset="0.55" stopColor={base} />
            <stop offset="1" stopColor={darken(base, o.dark ?? 0.3)} />
          </radialGradient>,
        );
      }
      return `url(#${id})`;
    },
    lin: (name, stops) => {
      const id = `${u}-${name}`;
      if (!seen.has(id)) {
        seen.add(id);
        defs.push(<linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">{stops.map(([o, c], i) => <stop key={i} offset={o} stopColor={c} />)}</linearGradient>);
      }
      return `url(#${id})`;
    },
  };
}

/** A soft glossy highlight (blurred white). */
const Shine = ({ u, x, y, rx, ry, o = 0.55, rot = -25 }: { u: string; x: number; y: number; rx: number; ry: number; o?: number; rot?: number }) => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" opacity={o} filter={`url(#${u}-soft)`} transform={`rotate(${rot} ${x} ${y})`} />
);

/* ───────────────────────── faces ───────────────────────── */
interface FaceSpec {
  eyes: [number, number][];
  /** eye radius */
  r: number;
  mouth: [number, number];
  /** mouth half-width */
  m: number;
  /** colour of the eyelids (blink, half-shut eyes) */
  skin: string;
  blush?: boolean;
  /** sleepy boss: grumpy eyes are half shut */
  sleepy?: boolean;
  noBrows?: boolean;
}
function Face({ f, mood, u }: { f: FaceSpec; mood: BossMood; u: string }) {
  const { r, m } = f;
  const [mx, my] = f.mouth;
  const eyes = f.eyes.map(([x, y], i) => {
    const side = i === 0 ? -1 : 1;
    if (mood === 'happy') return <path key={i} d={`M ${x - r * 0.8} ${y + r * 0.2} Q ${x} ${y - r * 0.95} ${x + r * 0.8} ${y + r * 0.2}`} stroke={L} strokeWidth={SW + 1} fill="none" strokeLinecap="round" />;
    if (mood === 'hurt') return <path key={i} d={`M ${x - side * r * 0.75} ${y - r * 0.6} L ${x + side * r * 0.55} ${y} L ${x - side * r * 0.75} ${y + r * 0.6}`} stroke={L} strokeWidth={SW + 1} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    const lid = mood === 'attack' ? 0.45 : f.sleepy ? 0.52 : 0.18;
    return (
      <g key={i}>
        <ellipse cx={x} cy={y} rx={r * 0.86} ry={r} fill="#fff" stroke={L} strokeWidth={SW - 1} />
        <circle cx={x - r * 0.2} cy={y + r * 0.08} r={r * 0.6} fill={L} />
        <circle cx={x - r * 0.2} cy={y + r * 0.08} r={r * 0.32} fill="#0e0a1a" />
        <circle cx={x - r * 0.02} cy={y - r * 0.2} r={r * 0.22} fill="#fff" />
        <circle cx={x - r * 0.38} cy={y + r * 0.32} r={r * 0.1} fill="#fff" opacity={0.8} />
        {/* the upper lid: a frown sits low on the eye */}
        <path d={`M ${x - r * 0.95} ${y - r * 1.1} L ${x + r * 0.95} ${y - r * 1.1} L ${x + r * 0.95} ${y - r + r * 2 * lid + (side === 1 ? -r * 0.2 : r * 0.2)} L ${x - r * 0.95} ${y - r + r * 2 * lid + (side === 1 ? r * 0.2 : -r * 0.2)} Z`}
          fill={f.skin} stroke={L} strokeWidth={SW - 1} strokeLinejoin="round" clipPath={`url(#${u}-eye${i})`} />
        <clipPath id={`${u}-eye${i}`}><ellipse cx={x} cy={y} rx={r * 0.86 + 2} ry={r + 2} /></clipPath>
        {/* blink: the lid closes for a moment every few seconds */}
        <g className="bb-lid" style={{ transformOrigin: `${x}px ${y - r}px` }}>
          <ellipse cx={x} cy={y} rx={r * 0.9} ry={r * 1.04} fill={f.skin} stroke={L} strokeWidth={SW - 1} />
          <path d={`M ${x - r * 0.8} ${y + r * 0.1} Q ${x} ${y + r * 0.55} ${x + r * 0.8} ${y + r * 0.1}`} stroke={L} strokeWidth={SW - 1} fill="none" strokeLinecap="round" />
        </g>
      </g>
    );
  });
  const brows = f.noBrows || mood === 'happy' ? null : f.eyes.map(([x, y], i) => {
    const side = i === 0 ? 1 : -1; // inner end points towards the middle
    const tilt = mood === 'attack' ? 0.75 : mood === 'hurt' ? -0.45 : 0.5;
    const y0 = y - r * 1.35, inner = x + side * r * 0.75, outer = x - side * r * 0.95;
    return <path key={i} d={`M ${outer} ${y0 - r * tilt * 0.5} L ${inner} ${y0 + r * tilt * 0.5}`} stroke={L} strokeWidth={SW + 3} strokeLinecap="round" />;
  });
  let mouth: ReactNode;
  if (mood === 'happy') {
    mouth = (
      <g>
        <path d={`M ${mx - m} ${my - m * 0.15} Q ${mx} ${my + m * 1.25} ${mx + m} ${my - m * 0.15} Z`} fill="#7a2235" stroke={L} strokeWidth={SW - 1} strokeLinejoin="round" />
        <path d={`M ${mx - m * 0.45} ${my + m * 0.55} Q ${mx} ${my + m * 0.25} ${mx + m * 0.45} ${my + m * 0.55} Q ${mx} ${my + m * 0.95} ${mx - m * 0.45} ${my + m * 0.55} Z`} fill="#ff8fa3" />
      </g>
    );
  } else if (mood === 'attack') {
    mouth = (
      <g>
        <path d={`M ${mx - m} ${my - m * 0.25} Q ${mx} ${my - m * 0.55} ${mx + m} ${my - m * 0.25} Q ${mx + m * 0.9} ${my + m * 0.9} ${mx} ${my + m * 0.95} Q ${mx - m * 0.9} ${my + m * 0.9} ${mx - m} ${my - m * 0.25} Z`} fill="#7a2235" stroke={L} strokeWidth={SW - 1} strokeLinejoin="round" />
        <path d={`M ${mx - m * 0.8} ${my - m * 0.28} L ${mx + m * 0.8} ${my - m * 0.28} L ${mx + m * 0.7} ${my} L ${mx - m * 0.7} ${my} Z`} fill="#fff" />
        <ellipse cx={mx} cy={my + m * 0.62} rx={m * 0.45} ry={m * 0.2} fill="#ff8fa3" />
      </g>
    );
  } else if (mood === 'hurt') {
    mouth = <path d={`M ${mx - m * 0.7} ${my + m * 0.1} q ${m * 0.23} -${m * 0.3} ${m * 0.47} 0 t ${m * 0.47} 0 t ${m * 0.47} 0`} stroke={L} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  } else {
    mouth = <path d={`M ${mx - m * 0.75} ${my + m * 0.3} Q ${mx} ${my - m * 0.35} ${mx + m * 0.75} ${my + m * 0.3}`} stroke={L} strokeWidth={SW + 1} fill="none" strokeLinecap="round" />;
  }
  const blush = (f.blush ?? true) && mood !== 'attack';
  return (
    <g>
      {blush && f.eyes.map(([x, y], i) => <ellipse key={i} cx={x + (i === 0 ? -r * 0.35 : r * 0.35)} cy={y + r * 1.45} rx={r * 0.62} ry={r * 0.32} fill="#ff7a9a" opacity={mood === 'happy' ? 0.55 : 0.3} />)}
      {eyes}
      {brows}
      {mouth}
      {mood === 'hurt' && <path d={`M ${f.eyes[1][0] + r * 1.5} ${f.eyes[1][1] - r * 1.6} q ${r * 0.45} ${r * 0.7} 0 ${r * 1.05} q -${r * 0.45} -${r * 0.35} 0 -${r * 1.05} Z`} fill="#bfe8ff" stroke={L} strokeWidth={3} />}
    </g>
  );
}

/* ───────────────────────── the bosses ───────────────────────── */
type Draw = (p: Paint, mood: BossMood) => ReactNode;

const thorn = (x: number, y: number, a: number, len: number, w: number, fill: string) => {
  const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
  return <path d={`M ${x + nx * w} ${y + ny * w} L ${x + c * len} ${y + s * len} L ${x - nx * w} ${y - ny * w} Z`} fill={fill} stroke={L} strokeWidth={3.5} strokeLinejoin="round" />;
};
const flower = (x: number, y: number, r: number, petal = '#ff8fb1', centre = '#ffd23f') => (
  <g>
    {[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return <circle key={i} cx={x + Math.cos(a) * r * 0.9} cy={y + Math.sin(a) * r * 0.9} r={r * 0.72} fill={petal} stroke={L} strokeWidth={3} />; })}
    <circle cx={x} cy={y} r={r * 0.55} fill={centre} stroke={L} strokeWidth={3} />
  </g>
);

const grumblethorn: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const body = p.ball('gt-body', '#4f9a3c'), patch = p.ball('gt-face', '#9fbf6a', { light: 0.25 });
  const vine = '#2f6b2a', vine2 = '#6fbf4a';
  const thorns = Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2 + 0.1);
  return (
    <g>
      <ellipse cx={200} cy={382} rx={120} ry={12} fill="#1a1033" opacity={0.15} />
      {[150, 250].map((x, i) => <path key={i} d={`M ${x - 32} 380 Q ${x - 30} 335 ${x} 330 Q ${x + 30} 335 ${x + 32} 380 Z`} fill={p.ball('gt-root', '#8a5a2b')} stroke={L} strokeWidth={SW} strokeLinejoin="round" />)}
      {thorns.map((a, i) => (happy && i % 2 === 0 ? null : <g key={i}>{thorn(200 + Math.cos(a) * 140, 205 + Math.sin(a) * 140, a, 44, 13, i % 2 ? '#a8743a' : '#8a5a2b')}</g>))}
      <circle cx={200} cy={205} r={150} fill={body} stroke={L} strokeWidth={SW} />
      {/* the bramble tangle */}
      {[
        'M 70 160 Q 150 120 230 170 T 330 150', 'M 80 250 Q 160 300 250 240 T 335 270', 'M 120 90 Q 180 200 140 330', 'M 280 80 Q 230 190 290 320',
        'M 60 205 Q 120 230 160 190', 'M 240 110 Q 300 140 340 210', 'M 170 350 Q 210 300 260 345',
      ].map((d, i) => <g key={i}><path d={d} stroke={vine} strokeWidth={14} fill="none" strokeLinecap="round" /><path d={d} stroke={vine2} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.8} /></g>)}
      {[[120, 120, 26], [300, 180, 22], [250, 310, 24], [95, 280, 20], [205, 75, 18]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.7} fill="#3f7f33" stroke={L} strokeWidth={3} transform={`rotate(${i * 40} ${x} ${y})`} />)}
      <Shine u={p.u} x={130} y={110} rx={48} ry={24} o={0.35} />
      <circle cx={178} cy={210} r={72} fill={patch} stroke={L} strokeWidth={SW - 1} />
      <Face u={p.u} mood={mood} f={{ eyes: [[150, 198], [204, 196]], r: 19, mouth: [176, 246], m: 22, skin: '#9fbf6a' }} />
      {happy && [[110, 105], [290, 110], [330, 230], [90, 300], [250, 335], [300, 300], [70, 190], [215, 62]].map(([x, y], i) => <g key={i}>{flower(x, y, i % 2 ? 13 : 16, i % 3 === 0 ? '#ffb3d1' : '#ff8fb1')}</g>)}
    </g>
  );
};

const mudsnout: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const skin = '#c7aeb3', body = p.ball('ms-body', skin), snout = p.ball('ms-snout', '#e3c3c6', { light: 0.3 });
  const mud = '#8a5a2b';
  return (
    <g>
      <ellipse cx={210} cy={372} rx={170} ry={26} fill={happy ? '#7fc4ef' : '#7a4b22'} stroke={L} strokeWidth={SW} />
      <ellipse cx={210} cy={368} rx={140} ry={14} fill={happy ? '#bfe6ff' : '#9a6a38'} opacity={0.7} />
      {[[130, 325], [180, 340], [265, 340], [310, 325]].map(([x, y], i) => <rect key={i} x={x - 26} y={y - 30} width={52} height={60} rx={22} fill={body} stroke={L} strokeWidth={SW} />)}
      <ellipse cx={235} cy={250} rx={135} ry={105} fill={body} stroke={L} strokeWidth={SW} />
      <path d="M 360 230 q 26 -10 22 18" stroke={L} strokeWidth={SW} fill="none" strokeLinecap="round" />
      <ellipse cx={240} cy={300} rx={90} ry={40} fill="#e3c3c6" opacity={0.6} />
      {/* head */}
      <circle cx={150} cy={190} r={88} fill={body} stroke={L} strokeWidth={SW} />
      {[[100, 112], [196, 104]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx={20} ry={16} fill={body} stroke={L} strokeWidth={SW} /><ellipse cx={x} cy={y + 2} rx={10} ry={8} fill="#e8a5b5" /></g>)}
      <ellipse cx={120} cy={240} rx={82} ry={56} fill={snout} stroke={L} strokeWidth={SW} />
      {[[92, 226], [140, 222]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={9} ry={12} fill="#7a4b5a" />)}
      <Shine u={p.u} x={120} y={140} rx={36} ry={16} o={0.4} />
      <Face u={p.u} mood={mood} f={{ eyes: [[118, 168], [174, 164]], r: 17, mouth: [120, 272], m: 26, skin }} />
      {/* mud: on it while grumpy, washed off when friends */}
      {!happy && [[150, 104, 26, 18], [250, 200, 32, 22], [300, 270, 26, 30], [200, 290, 22, 16], [88, 300, 20, 30], [330, 205, 16, 20]].map(([x, y, rx, ry], i) => (
        <path key={i} d={`M ${x - rx} ${y} q ${rx * 0.3} -${ry} ${rx} -${ry * 0.8} q ${rx * 0.8} 0 ${rx} ${ry * 0.6} q -${rx * 0.1} ${ry} -${rx * 0.7} ${ry * 1.1} q -${rx} ${ry * 0.2} -${rx * 1.3} -${ry * 0.9} Z`} fill={mud} stroke={L} strokeWidth={3} opacity={0.95} />
      ))}
      {!happy && <path d="M 130 92 q 20 -34 40 -6 q 14 -18 26 4 q 10 -20 20 6 q -40 18 -86 -4 Z" fill="#7a4b22" stroke={L} strokeWidth={3.5} />}
      {happy && [[70, 120, 12], [250, 120, 9], [330, 160, 14], [300, 90, 8]].map(([x, y, r], i) => <g key={i}><circle cx={x} cy={y} r={r} fill="#d6f2ff" stroke={L} strokeWidth={3} opacity={0.9} /><circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#fff" /></g>)}
    </g>
  );
};

const crystal = (x: number, y: number, h: number, w: number, fill: string, rot = 0) => (
  <g transform={`rotate(${rot} ${x} ${y})`}>
    <path d={`M ${x - w} ${y} L ${x - w * 0.8} ${y - h * 0.75} L ${x} ${y - h} L ${x + w * 0.8} ${y - h * 0.75} L ${x + w} ${y} Z`} fill={fill} stroke={L} strokeWidth={3.5} strokeLinejoin="round" />
    <path d={`M ${x} ${y - h} L ${x} ${y}`} stroke="#fff" strokeWidth={2.5} opacity={0.5} />
    <path d={`M ${x - w * 0.55} ${y - h * 0.55} L ${x - w * 0.35} ${y - h * 0.15}`} stroke="#fff" strokeWidth={4} opacity={0.7} strokeLinecap="round" />
  </g>
);

const glimmerjaw: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const shell = p.ball('gj-body', '#7d55d8'), claw = p.ball('gj-claw', '#8f66e6'), cyan = p.ball('gj-cyan', '#5fd4ff', { light: 0.5 }), pink = p.ball('gj-pink', '#c77dff', { light: 0.5 });
  const clawUp = mood === 'attack' || happy;
  return (
    <g>
      <ellipse cx={200} cy={382} rx={150} ry={12} fill="#1a1033" opacity={0.15} />
      {[-1, 1].flatMap((s) => [0, 1, 2].map((k) => <path key={`${s}${k}`} d={`M ${200 + s * (70 + k * 22)} 300 Q ${200 + s * (120 + k * 30)} ${300 + k * 6} ${200 + s * (130 + k * 26)} ${372}`} stroke={L} strokeWidth={16} fill="none" strokeLinecap="round" />))}
      {[-1, 1].flatMap((s) => [0, 1, 2].map((k) => <path key={`i${s}${k}`} d={`M ${200 + s * (70 + k * 22)} 300 Q ${200 + s * (120 + k * 30)} ${300 + k * 6} ${200 + s * (130 + k * 26)} ${372}`} stroke="#6a44c4" strokeWidth={9} fill="none" strokeLinecap="round" />))}
      {/* eye stalks */}
      {[[165, 112], [228, 104]].map(([x, y], i) => <path key={i} d={`M ${x + (i ? -8 : 8)} 210 Q ${x + (i ? 6 : -6)} 160 ${x} ${y + 20}`} stroke={L} strokeWidth={16} fill="none" strokeLinecap="round" />)}
      {[[165, 112], [228, 104]].map(([x, y], i) => <path key={`s${i}`} d={`M ${x + (i ? -8 : 8)} 210 Q ${x + (i ? 6 : -6)} 160 ${x} ${y + 20}`} stroke="#8f66e6" strokeWidth={9} fill="none" strokeLinecap="round" />)}
      {[[165, 112], [228, 104]].map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r={30} fill={claw} stroke={L} strokeWidth={SW} />)}
      <ellipse cx={200} cy={260} rx={150} ry={88} fill={shell} stroke={L} strokeWidth={SW} />
      {crystal(150, 200, 70, 24, cyan, -18)}{crystal(205, 186, 96, 30, pink)}{crystal(262, 196, 78, 26, cyan, 16)}{crystal(305, 220, 50, 18, pink, 28)}{crystal(108, 220, 46, 16, pink, -30)}
      <ellipse cx={200} cy={300} rx={110} ry={36} fill="#9b7bff" opacity={0.45} />
      <Shine u={p.u} x={130} y={232} rx={40} ry={14} o={0.4} />
      {/* claws */}
      {[[-1, 70], [1, 330]].map(([s, x], i) => (
        <g key={i} transform={`rotate(${clawUp ? s * -18 : 0} ${x} 270)`}>
          <circle cx={x} cy={clawUp ? 220 : 270} r={52} fill={claw} stroke={L} strokeWidth={SW} />
          <path d={`M ${x - 46} ${clawUp ? 196 : 246} Q ${x - 10} ${clawUp ? 130 : 180} ${x + 40} ${clawUp ? 176 : 226} Q ${x} ${clawUp ? 196 : 246} ${x - 46} ${clawUp ? 196 : 246} Z`} fill={claw} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
          <Shine u={p.u} x={x - 16} y={clawUp ? 205 : 255} rx={16} ry={9} o={0.45} />
        </g>
      ))}
      {!happy && [[150, 352], [200, 360], [250, 352]].map(([x, y], i) => <g key={i}>{crystal(x, y, 40, 16, i === 1 ? pink : cyan, (i - 1) * 14)}</g>)}
      {happy && [[60, 120], [340, 110], [40, 330], [360, 320]].map(([x, y], i) => <polygon key={i} points={star(x, y, 14)} fill="#7fe0ff" stroke={L} strokeWidth={3} />)}
      <Face u={p.u} mood={mood} f={{ eyes: [[165, 112], [228, 104]], r: 17, mouth: [196, 296], m: 26, skin: '#8f66e6', blush: true }} />
    </g>
  );
};

const murkmoth: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const fur = p.ball('gw-fur', '#a98ae6', { light: 0.45 }), wingA = p.ball('gw-wing', '#7f5be0'), wingB = p.ball('gw-wing2', '#5a3fb0'), teal = p.ball('gw-teal', '#4fd6c8', { light: 0.45 });
  const glow = happy ? '#c6fff6' : '#7fe0ff';
  const fluff = (cx: number, cy: number, r: number, n: number) => {
    let d = '';
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const rr = r + (i % 2 ? 10 : -2); d += `${i ? 'L' : 'M'} ${cx + Math.cos(a) * rr} ${cy + Math.sin(a) * rr} `; }
    return d + 'Z';
  };
  return (
    <g>
      <ellipse cx={200} cy={382} rx={110} ry={12} fill="#1a1033" opacity={0.15} />
      {/* wings */}
      <path d="M 240 220 Q 380 60 375 170 Q 395 250 300 290 Z" fill={wingB} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 230 230 Q 330 30 360 120 Q 395 210 300 250 Q 360 300 330 350 Q 270 360 230 290 Z" fill={wingA} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      {[[310, 120, 22], [335, 190, 16], [300, 300, 18], [280, 175, 12]].map(([x, y, r], i) => <path key={i} d={`M ${x} ${y - r} L ${x + r * 0.7} ${y} L ${x} ${y + r} L ${x - r * 0.7} ${y} Z`} fill={glow} stroke={L} strokeWidth={3} opacity={0.95} />)}
      <path d="M 85 230 Q 20 120 70 110 Q 120 110 150 200 Z" fill={wingB} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      {/* antennae */}
      {[[170, 130, -1], [215, 125, 1]].map(([x, y, s], i) => <path key={i} d={`M ${x} ${y} Q ${x + s * 10} 70 ${x + s * 34} 60 q ${s * 24} -6 ${s * 18} 18 q ${-s * 8} 12 ${-s * 18} 2`} stroke={L} strokeWidth={6} fill="none" strokeLinecap="round" />)}
      <path d={fluff(195, 270, 92, 30)} fill={fur} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <path d={fluff(190, 190, 78, 26)} fill={fur} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx={195} cy={300} rx={62} ry={50} fill={teal} opacity={0.75} />
      <Shine u={p.u} x={150} y={150} rx={30} ry={14} o={0.45} />
      <Face u={p.u} mood={mood} f={{ eyes: [[165, 186], [216, 182]], r: 18, mouth: [190, 226], m: 18, skin: '#a98ae6' }} />
      {/* the crystal it hugs (it lets it shine for everyone once befriended) */}
      <g transform={happy ? 'translate(-20 -10) rotate(-12 120 280)' : ''}>
        {happy && <circle cx={150} cy={280} r={56} fill="#c6fff6" opacity={0.35} filter={`url(#${p.u}-soft)`} />}
        {crystal(150, 320, 78, 28, p.ball('gw-crys', '#5fe4ff', { light: 0.55 }))}
      </g>
      {[[120, 300], [182, 300]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={20} ry={14} fill={fur} stroke={L} strokeWidth={SW - 1} />)}
    </g>
  );
};

const snowsulk: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const snow = p.ball('ss-snow', '#eaf5ff', { light: 0.6, dark: 0.18 }), cape = p.ball('ss-cape', '#3f78c8'), ice = p.ball('ss-ice', '#7fd0ff', { light: 0.55 });
  return (
    <g>
      <ellipse cx={200} cy={384} rx={130} ry={12} fill="#1a1033" opacity={0.15} />
      <path d="M 120 150 Q 60 260 70 372 L 330 372 Q 340 260 280 150 Z" fill={cape} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 120 150 Q 200 120 280 150 Q 290 180 270 190 Q 200 170 130 190 Q 110 180 120 150 Z" fill="#fff" stroke={L} strokeWidth={SW - 1} />
      {[[100, 300], [300, 300], [90, 230], [310, 240]].map(([x, y], i) => <polygon key={i} points={star(x, y, 9, 6, 0.45)} fill="#cfe9ff" opacity={0.8} />)}
      <circle cx={200} cy={305} r={88} fill={snow} stroke={L} strokeWidth={SW} />
      <circle cx={200} cy={200} r={66} fill={snow} stroke={L} strokeWidth={SW} />
      {[[200, 270], [200, 305], [200, 340]].map(([x, y], i) => <path key={i} d={`M ${x} ${y - 9} L ${x + 7} ${y} L ${x} ${y + 9} L ${x - 7} ${y} Z`} fill={ice} stroke={L} strokeWidth={3} />)}
      {/* arms: crossed while sulking, waving once friends */}
      {happy ? (
        <g>
          <path d="M 140 195 L 70 130 M 92 150 L 72 158 M 86 142 L 84 120" stroke="#7a4b2a" strokeWidth={10} strokeLinecap="round" fill="none" />
          <path d="M 260 195 L 330 130 M 308 150 L 328 158 M 314 142 L 316 120" stroke="#7a4b2a" strokeWidth={10} strokeLinecap="round" fill="none" />
          <path d="M 150 168 Q 200 190 250 168 L 252 186 Q 200 206 148 186 Z" fill="#e64b4b" stroke={L} strokeWidth={4} />
          <path d="M 228 184 L 240 236 L 222 238 L 214 188 Z" fill="#e64b4b" stroke={L} strokeWidth={4} />
        </g>
      ) : (
        <g>
          <path d="M 130 215 L 262 190" stroke="#5a3418" strokeWidth={15} strokeLinecap="round" />
          <path d="M 130 215 L 262 190" stroke="#8a5a2b" strokeWidth={8} strokeLinecap="round" />
          <path d="M 270 215 L 138 190" stroke="#5a3418" strokeWidth={15} strokeLinecap="round" />
          <path d="M 270 215 L 138 190" stroke="#8a5a2b" strokeWidth={8} strokeLinecap="round" />
        </g>
      )}
      <circle cx={196} cy={112} r={58} fill={snow} stroke={L} strokeWidth={SW} />
      <Shine u={p.u} x={170} y={84} rx={22} ry={10} o={0.6} />
      {/* icicle crown */}
      {[[-34, 26], [-17, 36], [0, 44], [17, 36], [34, 26]].map(([dx, h], i) => <path key={i} d={`M ${196 + dx - 10} 66 L ${196 + dx} ${66 - h} L ${196 + dx + 10} 66 Z`} fill={ice} stroke={L} strokeWidth={3.5} strokeLinejoin="round" />)}
      <rect x={156} y={62} width={80} height={12} rx={5} fill={ice} stroke={L} strokeWidth={3.5} />
      <Face u={p.u} mood={mood} f={{ eyes: [[174, 108], [218, 106]], r: 13, mouth: [194, 146], m: 16, skin: '#eaf5ff' }} />
      <path d="M 192 122 L 158 130 L 192 134 Z" fill="#ff8c2b" stroke={L} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
};

const puffington: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const r = happy ? 112 : 140, cy = happy ? 235 : 210;
  const body = p.lin('pf-body', [[0, '#7fd0ff'], [0.48, '#3f9fe0'], [0.5, '#ffe9a0'], [1, '#f2c45a']]);
  const spikes = Array.from({ length: 22 }, (_, i) => (i / 22) * Math.PI * 2);
  return (
    <g>
      {[[70, 90, 16], [110, 50, 10], [330, 70, 13], [350, 120, 8], [60, 300, 9]].map(([x, y, rr], i) => <g key={i}><circle cx={x} cy={y} r={rr} fill="#d6f2ff" stroke={L} strokeWidth={3} opacity={0.85} /><circle cx={x - rr * 0.35} cy={y - rr * 0.35} r={rr * 0.3} fill="#fff" /></g>)}
      {/* tail fin and fins */}
      <path d={`M ${200 + r - 10} ${cy} L ${200 + r + 50} ${cy - 45} Q ${200 + r + 34} ${cy} ${200 + r + 50} ${cy + 45} Z`} fill="#3f9fe0" stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      {spikes.map((a, i) => (happy ? <circle key={i} cx={200 + Math.cos(a) * (r + 2)} cy={cy + Math.sin(a) * (r + 2)} r={6} fill={Math.sin(a) < 0 ? '#3f9fe0' : '#f2c45a'} stroke={L} strokeWidth={3} />
        : <g key={i}>{thorn(200 + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4), a, 34, 9, Math.sin(a) < 0 ? '#2f86c8' : '#e8b440')}</g>))}
      <circle cx={200} cy={cy} r={r} fill={body} stroke={L} strokeWidth={SW} />
      {[[150, cy - r * 0.55], [230, cy - r * 0.62], [260, cy - r * 0.3], [120, cy - r * 0.2]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7} fill="#2f86c8" opacity={0.7} />)}
      <Shine u={p.u} x={150} y={cy - r * 0.6} rx={r * 0.32} ry={r * 0.13} o={0.55} />
      <path d={`M ${200 + r * 0.25} ${cy + r * 0.15} q 40 -20 46 22 q -30 6 -46 -22 Z`} fill="#3f9fe0" stroke={L} strokeWidth={SW - 1} strokeLinejoin="round" />
      <Face u={p.u} mood={mood} f={{ eyes: [[155, cy - r * 0.18], [210, cy - r * 0.22]], r: happy ? 18 : 20, mouth: [150, cy + r * 0.32], m: 18, skin: '#5fb8f0' }} />
      {!happy && mood === 'grumpy' && <ellipse cx={150} cy={cy + r * 0.34} rx={16} ry={10} fill="#ff9f8a" stroke={L} strokeWidth={4} />}
      {/* the captain's hat he lost, back on his head */}
      {happy && (
        <g>
          <path d={`M 120 ${cy - r + 8} Q 190 ${cy - r - 70} 270 ${cy - r + 4} Q 195 ${cy - r - 18} 120 ${cy - r + 8} Z`} fill="#22335e" stroke={L} strokeWidth={SW} strokeLinejoin="round" />
          <path d={`M 112 ${cy - r + 10} Q 195 ${cy - r - 10} 282 ${cy - r + 6}`} stroke="#ffd23f" strokeWidth={6} fill="none" strokeLinecap="round" />
          <circle cx={194} cy={cy - r - 26} r={11} fill="#ffd23f" stroke={L} strokeWidth={3} />
          <path d={`M 194 ${cy - r - 34} v 16 m -7 -6 q 7 8 14 0`} stroke={L} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

const magmaw: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const rock = p.ball('mm-rock', '#4a3a40', { light: 0.25, dark: 0.35 }), belly = p.ball('mm-belly', '#ff8a2b', { light: 0.55 }), lava = '#ffb43d';
  const crack = (d: string, i: number) => <g key={i}><path d={d} stroke="#ff7a1a" strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} filter={`url(#${p.u}-soft)`} /><path d={d} stroke={lava} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
  return (
    <g>
      <ellipse cx={200} cy={384} rx={160} ry={12} fill="#1a1033" opacity={0.18} />
      {/* smoke from the volcano on its head */}
      {(happy ? [[208, 54, 16], [226, 30, 12]] : [[214, 50, 22], [240, 26, 28], [270, 6, 22]]).map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={happy ? '#e8e2ee' : '#8a8494'} stroke={L} strokeWidth={3.5} opacity={0.9} />)}
      {[[95, 350], [305, 350]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={58} ry={34} fill={rock} stroke={L} strokeWidth={SW} />)}
      <path d="M 40 320 Q 40 170 200 160 Q 360 170 360 320 Q 360 380 200 380 Q 40 380 40 320 Z" fill={rock} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 170 168 L 186 92 L 230 92 L 250 170 Z" fill={rock} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx={208} cy={94} rx={23} ry={8} fill={lava} stroke={L} strokeWidth={4} />
      {/* eye bumps */}
      {[[130, 180], [262, 176]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={42} fill={rock} stroke={L} strokeWidth={SW} />)}
      <ellipse cx={200} cy={318} rx={118} ry={58} fill={belly} stroke={L} strokeWidth={SW - 1} />
      {['M 70 260 L 96 240 L 90 214', 'M 330 250 L 300 236 L 310 210', 'M 150 330 L 172 306 L 200 318 L 228 300', 'M 260 350 L 280 330', 'M 200 108 L 196 134 L 212 152'].map(crack)}
      <Shine u={p.u} x={100} y={210} rx={36} ry={14} o={0.25} />
      <Face u={p.u} mood={mood} f={{ eyes: [[130, 176], [262, 172]], r: 22, mouth: [196, 250], m: 40, skin: '#4a3a40', blush: true }} />
      {/* the hiccup bubble */}
      {!happy && <g><circle cx={110} cy={250} r={26} fill="#ffe0f0" opacity={0.55} stroke={L} strokeWidth={3} /><circle cx={102} cy={242} r={7} fill="#fff" /></g>}
      {happy && [[70, 120], [330, 110]].map(([x, y], i) => <path key={i} d={`M ${x} ${y + 12} c -16 -14 -16 -26 -4 -28 c 6 0 4 6 4 6 c 0 0 -2 -6 4 -6 c 12 2 12 14 -4 28 Z`} transform={`scale(1.4) translate(${-x * 0.29} ${-y * 0.29})`} fill="#ff8fb1" stroke={L} strokeWidth={2.5} />)}
    </g>
  );
};

const zapcrackle: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const cloud = p.ball('zc-cloud', happy ? '#f4f6ff' : '#6a6488', { light: happy ? 0.4 : 0.3, dark: happy ? 0.12 : 0.3 });
  const puffs: [number, number, number][] = [[120, 200, 62], [190, 160, 78], [270, 180, 66], [320, 230, 50], [95, 250, 48], [200, 250, 80], [280, 260, 58]];
  return (
    <g>
      {happy && ['#ff5d5d', '#ffa53d', '#ffe066', '#6fdc8c', '#5ab8f0', '#a78bfa'].map((c, i) => <path key={i} d={`M ${40 + i * 8} 300 A ${160 - i * 8} ${170 - i * 8} 0 0 1 ${360 - i * 8} 300`} stroke={c} strokeWidth={9} fill="none" />)}
      {/* lightning tail */}
      <path d="M 200 300 L 245 300 L 215 345 L 250 345 L 185 395 L 205 352 L 172 352 Z" fill={happy ? '#ffe066' : '#ffd23f'} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      {puffs.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r + 3} fill={L} />)}
      {puffs.map(([x, y, r], i) => <circle key={`f${i}`} cx={x} cy={y} r={r - 2} fill={cloud} />)}
      <Shine u={p.u} x={170} y={120} rx={40} ry={16} o={happy ? 0.7 : 0.3} />
      {/* little cloud arms */}
      {happy ? [[70, 210], [340, 190]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={22} fill={cloud} stroke={L} strokeWidth={SW} />)
        : <g>{[[150, 290, 238, 262], [250, 290, 162, 262]].map(([x1, y1, x2, y2], i) => <g key={i}><path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={L} strokeWidth={30} strokeLinecap="round" /><path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke="#7a7498" strokeWidth={21} strokeLinecap="round" /></g>)}</g>}
      <Face u={p.u} mood={mood} f={{ eyes: [[165, 196], [222, 192]], r: 19, mouth: [192, 236], m: 20, skin: happy ? '#f4f6ff' : '#6a6488' }} />
      {!happy && [[50, 140], [350, 150], [70, 300], [330, 310], [260, 80]].map(([x, y], i) => <path key={i} d={`M ${x} ${y - 16} l -8 14 h 10 l -8 16`} stroke="#ffd23f" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
    </g>
  );
};

const whirlwing: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const cols = happy ? ['#4f9ef0', '#ffd23f', '#ff8fb1', '#ff9f43'] : ['#8aa6c8', '#6a86aa', '#5a7698', '#9db6d6'];
  const top: [number, number] = [200, 50], right: [number, number] = [330, 185], bot: [number, number] = [200, 320], left: [number, number] = [70, 185], c: [number, number] = [200, 185];
  const tri = (a: [number, number], b: [number, number], fill: string, i: number) => <path key={i} d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]} Z`} fill={fill} stroke={L} strokeWidth={3} strokeLinejoin="round" />;
  return (
    <g>
      {/* wind swirls */}
      {[[60, 90, 1], [340, 290, -1], [330, 80, -1]].map(([x, y, s], i) => <path key={i} d={`M ${x - s * 30} ${y} q ${s * 30} -26 ${s * 50} 0 q ${s * 10} 18 ${-s * 8} 22 q ${-s * 14} 0 ${-s * 8} -12`} stroke="#bfe6ff" strokeWidth={6} fill="none" strokeLinecap="round" />)}
      {/* the ribbon tail with bows */}
      <path d="M 200 320 C 170 350 240 360 210 385 S 250 400 280 380" stroke={L} strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d="M 200 320 C 170 350 240 360 210 385 S 250 400 280 380" stroke={happy ? '#ff8fb1' : '#cfdced'} strokeWidth={4} fill="none" strokeLinecap="round" />
      {[[192, 345], [226, 375], [268, 384]].map(([x, y], i) => <g key={i}><path d={`M ${x} ${y} l -16 -10 v 20 Z M ${x} ${y} l 16 -10 v 20 Z`} fill={happy ? cols[i % 4] : '#9db6d6'} stroke={L} strokeWidth={3} strokeLinejoin="round" /><circle cx={x} cy={y} r={4} fill={L} /></g>)}
      {tri(top, right, cols[1], 0)}{tri(right, bot, cols[3], 1)}{tri(bot, left, cols[2], 2)}{tri(left, top, cols[0], 3)}
      <path d={`M ${top[0]} ${top[1]} L ${right[0]} ${right[1]} L ${bot[0]} ${bot[1]} L ${left[0]} ${left[1]} Z`} fill="none" stroke={L} strokeWidth={SW + 1} strokeLinejoin="round" />
      <path d={`M ${top[0]} ${top[1]} L ${bot[0]} ${bot[1]} M ${left[0]} ${left[1]} L ${right[0]} ${right[1]}`} stroke="#7a4b2a" strokeWidth={5} opacity={0.6} />
      <path d={`M ${left[0] + 20} ${left[1] - 12} L ${top[0] - 8} ${top[1] + 26}`} stroke="#fff" strokeWidth={8} strokeLinecap="round" opacity={0.5} />
      <circle cx={196} cy={196} r={62} fill={happy ? '#fff8e0' : '#dfe8f5'} stroke={L} strokeWidth={SW - 1} />
      <Face u={p.u} mood={mood} f={{ eyes: [[172, 186], [220, 184]], r: 15, mouth: [194, 222], m: 17, skin: happy ? '#fff8e0' : '#dfe8f5' }} />
      {[top, right, bot, left].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7} fill="#c8902e" stroke={L} strokeWidth={3} />)}
    </g>
  );
};

const snorecap: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const cap = p.ball('sc-cap', happy ? '#b58af0' : '#8a5ad0', { light: happy ? 0.5 : 0.35 }), stem = p.ball('sc-stem', '#f4e3cc', { light: 0.4, dark: 0.2 });
  return (
    <g>
      <ellipse cx={200} cy={384} rx={110} ry={12} fill="#1a1033" opacity={0.15} />
      {happy && <ellipse cx={200} cy={150} rx={200} ry={140} fill="#ffe7ff" opacity={0.4} filter={`url(#${p.u}-soft)`} />}
      {[[160, 370], [240, 370]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={34} ry={18} fill="#a77a5a" stroke={L} strokeWidth={SW} />)}
      <path d="M 120 220 Q 110 360 160 368 L 240 368 Q 292 360 280 220 Z" fill={stem} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 135 300 q 10 30 30 40 M 265 300 q -10 30 -30 40" stroke="#d9c2a3" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* the cap */}
      <path d="M 30 205 Q 30 40 200 38 Q 370 40 370 205 Q 300 232 200 232 Q 100 232 30 205 Z" fill={cap} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 52 205 Q 200 250 348 205 Q 300 226 200 228 Q 100 226 52 205 Z" fill="#f0a8c8" stroke={L} strokeWidth={3.5} />
      {[[100, 110, 26, 18], [200, 70, 30, 18], [290, 105, 28, 20], [150, 165, 22, 14], [255, 168, 24, 15], [60, 170, 14, 10], [335, 165, 16, 11]].map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={happy ? '#fff7d6' : '#f2e6ff'} stroke={L} strokeWidth={3} opacity={0.95} />)}
      <Shine u={p.u} x={110} y={78} rx={48} ry={18} o={0.4} />
      {/* arms crossed while grumpy, waving when friends */}
      {happy ? [[110, 260, -40], [290, 260, 40]].map(([x, y, a], i) => <ellipse key={i} cx={x} cy={y} rx={18} ry={34} fill={stem} stroke={L} strokeWidth={SW} transform={`rotate(${a} ${x} ${y})`} />)
        : <g>{[[128, 318, 236, 340], [272, 318, 164, 340]].map(([x1, y1, x2, y2], i) => <g key={i}><path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={L} strokeWidth={34} strokeLinecap="round" /><path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke="#ead6ba" strokeWidth={25} strokeLinecap="round" /></g>)}</g>}
      <Face u={p.u} mood={mood} f={{ eyes: [[176, 258], [224, 256]], r: 15, mouth: [198, 290], m: 16, skin: '#f4e3cc', sleepy: true }} />
      {/* spores */}
      {[[60, 60, 9], [340, 50, 12], [30, 130, 7], [370, 140, 8], [320, 280, 7], [80, 280, 6]].map(([x, y, r], i) => <g key={i}><circle cx={x} cy={y} r={r * 2} fill={happy ? '#fff2a8' : '#ff8fd0'} opacity={0.3} filter={`url(#${p.u}-soft)`} /><circle cx={x} cy={y} r={r} fill={happy ? '#fff2a8' : '#ff8fd0'} stroke={L} strokeWidth={2.5} /></g>)}
    </g>
  );
};

const gear = (x: number, y: number, r: number, teeth: number, fill: string) => {
  let d = '';
  for (let i = 0; i < teeth * 2; i++) { const a = (i / (teeth * 2)) * Math.PI * 2; const rr = i % 2 ? r : r * 1.22; d += `${i ? 'L' : 'M'} ${x + Math.cos(a) * rr} ${y + Math.sin(a) * rr} `; }
  return <g><path d={d + 'Z'} fill={fill} stroke={L} strokeWidth={3.5} strokeLinejoin="round" /><circle cx={x} cy={y} r={r * 0.4} fill="#5a3a1a" stroke={L} strokeWidth={3} /></g>;
};

const colossus: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const metal = p.ball('co-metal', '#c9a25a', { light: 0.45 }), stone = p.ball('co-stone', '#9a8a78', { light: 0.3 }), dark = p.ball('co-dark', '#6a5a48');
  const glow = happy ? '#7fe0ff' : mood === 'attack' ? '#ff5a2b' : '#ff9a2b';
  const visor = mood === 'happy' ? 'M 158 116 q 12 -14 24 0 M 208 116 q 12 -14 24 0'
    : mood === 'hurt' ? 'M 160 104 l 18 16 m 0 -16 l -18 16 M 212 104 l 18 16 m 0 -16 l -18 16'
    : mood === 'attack' ? 'M 156 104 L 186 118 M 234 104 L 204 118' : 'M 158 106 L 186 114 M 232 106 L 204 114';
  return (
    <g>
      <ellipse cx={200} cy={384} rx={130} ry={12} fill="#1a1033" opacity={0.18} />
      {/* wind-up key */}
      <g transform="translate(300 40)"><circle cx={0} cy={0} r={22} fill="none" stroke={L} strokeWidth={14} /><circle cx={0} cy={0} r={22} fill="none" stroke="#c9a25a" strokeWidth={7} /><rect x={-6} y={18} width={12} height={46} fill="#c9a25a" stroke={L} strokeWidth={3.5} /></g>
      {[[150, 380], [250, 380]].map(([x, y], i) => <rect key={i} x={x - 32} y={y - 66} width={64} height={66} rx={10} fill={stone} stroke={L} strokeWidth={SW} />)}
      {[[70, 250], [330, 250]].map(([x, y], i) => <g key={i}><rect x={x - 30} y={y - 50} width={60} height={110} rx={14} fill={stone} stroke={L} strokeWidth={SW} /><rect x={x - 34} y={y + 40} width={68} height={44} rx={14} fill={metal} stroke={L} strokeWidth={SW} /></g>)}
      <rect x={100} y={170} width={200} height={160} rx={30} fill={stone} stroke={L} strokeWidth={SW} />
      <path d="M 110 200 h 180 M 110 300 h 180" stroke="#7a6a58" strokeWidth={3} />
      {[[90, 180], [310, 180]].map(([x, y], i) => <g key={i}>{gear(x, y, 34, 9, metal)}</g>)}
      <circle cx={200} cy={250} r={52} fill={metal} stroke={L} strokeWidth={SW} />
      <circle cx={200} cy={250} r={36} fill={happy ? '#ffd6e6' : dark} stroke={L} strokeWidth={3.5} />
      <polygon points={star(200, 246, 16)} fill={happy ? '#ff8fb1' : '#2b2140'} />
      <rect x={140} y={60} width={120} height={104} rx={26} fill={metal} stroke={L} strokeWidth={SW} />
      <rect x={150} y={96} width={100} height={36} rx={12} fill="#2b2140" stroke={L} strokeWidth={3.5} />
      <path d={visor} stroke={glow} strokeWidth={8} strokeLinecap="round" fill="none" />
      <path d={visor} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.7} />
      <rect x={176} y={140} width={48} height={12} rx={5} fill={dark} stroke={L} strokeWidth={3} />
      {happy && <path d="M 182 144 q 18 12 36 0" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" />}
      <Shine u={p.u} x={168} y={72} rx={22} ry={8} o={0.6} rot={0} />
      <Shine u={p.u} x={130} y={190} rx={18} ry={8} o={0.4} />
    </g>
  );
};

const riddlepaw: Draw = (p, mood) => {
  const happy = mood === 'happy';
  const fur = p.ball('rp-fur', '#f2c46b', { light: 0.4 }), blue = '#2f6fd0', gold = '#ffd23f';
  return (
    <g>
      <ellipse cx={210} cy={384} rx={140} ry={12} fill="#1a1033" opacity={0.15} />
      {/* tail */}
      <path d="M 300 360 Q 380 360 370 290 Q 362 250 340 262" stroke={L} strokeWidth={22} fill="none" strokeLinecap="round" />
      <path d="M 300 360 Q 380 360 370 290 Q 362 250 340 262" stroke="#f2c46b" strokeWidth={13} fill="none" strokeLinecap="round" />
      <circle cx={340} cy={262} r={15} fill={blue} stroke={L} strokeWidth={4} />
      {/* body and haunches */}
      <path d="M 110 370 Q 100 230 190 210 Q 300 200 315 300 Q 325 372 280 372 Z" fill={fur} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx={275} cy={330} rx={48} ry={44} fill={fur} stroke={L} strokeWidth={SW} />
      <ellipse cx={200} cy={300} rx={50} ry={60} fill="#fff1c9" opacity={0.7} />
      {/* front paws: crossed while sulking, open once friends */}
      {happy ? [[150, 360], [215, 362]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={30} ry={16} fill={fur} stroke={L} strokeWidth={SW} />)
        : <g><path d="M 135 300 Q 200 320 250 290 Q 256 312 240 318 Q 190 340 140 322 Z" fill={fur} stroke={L} strokeWidth={SW} /><path d="M 250 300 Q 190 330 140 300" stroke={L} strokeWidth={3} fill="none" /></g>}
      {/* headdress */}
      <path d="M 110 130 Q 100 240 120 270 L 165 250 L 160 140 Z" fill={blue} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 260 130 Q 270 240 250 270 L 205 250 L 210 140 Z" fill={blue} stroke={L} strokeWidth={SW} strokeLinejoin="round" />
      {[160, 190, 220].map((y, i) => <g key={i}><path d={`M 112 ${y} L 162 ${y - 6}`} stroke={gold} strokeWidth={9} /><path d={`M 258 ${y} L 208 ${y - 6}`} stroke={gold} strokeWidth={9} /></g>)}
      {/* ears */}
      {[[130, 70, -1], [242, 66, 1]].map(([x, y, s], i) => <path key={i} d={`M ${x - 26} ${y + 50} L ${x + s * 4} ${y} L ${x + 30} ${y + 46} Z`} fill={fur} stroke={L} strokeWidth={SW} strokeLinejoin="round" />)}
      <circle cx={186} cy={150} r={76} fill={fur} stroke={L} strokeWidth={SW} />
      <path d="M 112 118 Q 186 64 260 118 L 252 132 Q 186 86 120 132 Z" fill={blue} stroke={L} strokeWidth={4} />
      <path d="M 120 120 Q 186 76 252 120" stroke={gold} strokeWidth={6} fill="none" />
      <circle cx={186} cy={98} r={16} fill={p.ball('rp-gem', '#ff8a2b', { light: 0.6 })} stroke={L} strokeWidth={4} />
      {happy && <circle cx={186} cy={98} r={28} fill="#ffd23f" opacity={0.35} filter={`url(#${p.u}-soft)`} />}
      <Shine u={p.u} x={150} y={118} rx={20} ry={9} o={0.5} />
      <Face u={p.u} mood={mood} f={{ eyes: [[160, 150], [212, 148]], r: 16, mouth: [184, 190], m: 15, skin: '#f2c46b' }} />
      <path d="M 180 168 l 8 0 l -4 6 Z" fill="#c25a6a" />
      {[[-1, 140], [1, 232]].map(([s, x], i) => <path key={i} d={`M ${x} 178 l ${s * 34} -6 M ${x} 186 l ${s * 34} 4`} stroke={L} strokeWidth={2.5} strokeLinecap="round" />)}
    </g>
  );
};

/** a boss renamed after a release (BOSS_ALIASES in data/adventure.ts) */
const ALIAS: Record<string, string> = { gloomwing: 'murkmoth' };
const DRAW: Record<string, Draw> = { grumblethorn, mudsnout, glimmerjaw, murkmoth, snowsulk, puffington, magmaw, zapcrackle, whirlwing, snorecap, colossus, riddlepaw };

/** Where a creature's attack lands, where the boss's strike starts and where its head is (fractions of the box). */
export const BOSS_POINTS: Record<string, { hit: [number, number]; from: [number, number]; head: [number, number] }> = {
  grumblethorn: { hit: [0.5, 0.52], from: [0.3, 0.6], head: [0.45, 0.2] },
  mudsnout: { hit: [0.55, 0.6], from: [0.24, 0.66], head: [0.38, 0.28] },
  glimmerjaw: { hit: [0.5, 0.62], from: [0.18, 0.6], head: [0.48, 0.22] },
  murkmoth: { hit: [0.48, 0.6], from: [0.36, 0.72], head: [0.48, 0.3] },
  snowsulk: { hit: [0.5, 0.66], from: [0.3, 0.52], head: [0.49, 0.2] },
  puffington: { hit: [0.5, 0.55], from: [0.34, 0.66], head: [0.45, 0.16] },
  magmaw: { hit: [0.5, 0.72], from: [0.42, 0.62], head: [0.5, 0.3] },
  zapcrackle: { hit: [0.5, 0.52], from: [0.48, 0.92], head: [0.48, 0.3] },
  whirlwing: { hit: [0.5, 0.48], from: [0.3, 0.5], head: [0.5, 0.25] },
  snorecap: { hit: [0.5, 0.7], from: [0.2, 0.3], head: [0.5, 0.3] },
  colossus: { hit: [0.5, 0.62], from: [0.18, 0.66], head: [0.5, 0.2] },
  riddlepaw: { hit: [0.52, 0.72], from: [0.42, 0.5], head: [0.46, 0.22] },
};

/** A boss drawn in its painted style. `still`: no blinking (thumbnails, pictures for Pixel mode). */
export const BossArt = memo(function BossArt({ id, mood = 'grumpy', className = '', title, still }: { id: string; mood?: BossMood; className?: string; title?: string; still?: boolean }) {
  const u = `bb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const draw = DRAW[id] ?? DRAW[ALIAS[id]];
  if (!draw) return null;
  const p = painter(u);
  const body = draw(p, mood);
  return (
    <svg viewBox="0 0 400 400" className={`boss-art ${still ? '' : 'bb-live'} ${className}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} overflow="visible">
      <defs>
        <filter id={`${u}-soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        {p.defs}
      </defs>
      {body}
    </svg>
  );
});

export const hasBossArt = (id: string) => id in DRAW || id in ALIAS;
