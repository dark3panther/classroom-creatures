import type { Equipped } from '../types';
import type { Geo } from './CreatureSvg';
import { WingPair } from './CreatureSvg';
import { bolt, star } from './shapes';

/** Accessories drawn behind the body (wings, capes, rainbow). */
export function BackAccessories({ equipped, g, line }: { equipped: Equipped; g: Geo; line: string }) {
  return (
    <>
      {equipped.magic === 'magic-rainbow' && (
        <g opacity={0.85} fill="none" strokeWidth={7}>
          {['#ff6b6b', '#ffb84d', '#ffe066', '#6fdc8c', '#5ab8f0', '#a78bfa'].map((c, i) => (
            <path key={c} d={`M ${16 + i * 7} 160 A ${84 - i * 7} ${96 - i * 7} 0 0 1 ${184 - i * 7} 160`} stroke={c} />
          ))}
        </g>
      )}
      {equipped.decoration === 'deco-cape' && (
        <path d={`M ${g.cx - g.headRx * 0.55} ${g.neckY - 4} Q ${g.cx - 66} ${g.bottom - 6} ${g.cx - 48} ${g.bottom + 2} L ${g.cx + 48} ${g.bottom + 2} Q ${g.cx + 66} ${g.bottom - 6} ${g.cx + g.headRx * 0.55} ${g.neckY - 4} Z`}
          fill="#e5484d" stroke={line} strokeWidth={3} strokeLinejoin="round" />
      )}
      {equipped.wings === 'wings-fairy' && <WingPair type="fairy" g={g} line={line} fill="#d7f3ff" accent="#9b7bff" scale={1} cls="cc-flap" />}
      {equipped.wings === 'wings-angel' && <WingPair type="feather" g={g} line={line} fill="#ffffff" accent="#e6f0ff" scale={1} cls="cc-flap" />}
      {equipped.wings === 'wings-butterfly' && <WingPair type="butterfly" g={g} line={line} fill="#ff9ad5" accent="#ffd36b" scale={1} cls="cc-flap" />}
      {equipped.wings === 'wings-dragon' && <WingPair type="bat" g={g} line={line} fill="#3fb37f" accent="#ffd23f" scale={1.25} cls="cc-flap" />}
    </>
  );
}

/** Accessories drawn in front of the creature. */
export function Accessories({ equipped, g, line }: { equipped: Equipped; g: Geo; line: string }) {
  const hx = g.headCx, top = g.headTop;
  const ex = [hx - g.eyeDx, hx + g.eyeDx];
  const er = g.eyeR;
  return (
    <>
      {equipped.outfit && <Outfit id={equipped.outfit} g={g} line={line} />}
      {equipped.decoration === 'deco-bowtie' && (
        <g transform={`translate(${hx} ${g.neckY + 4})`}>
          <path d="M0 0 L-16 -9 L-16 9 Z M0 0 L16 -9 L16 9 Z" fill="#e5484d" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
          <circle r={4.5} fill="#ff7b7f" stroke={line} strokeWidth={2.5} />
        </g>
      )}
      {equipped.decoration === 'deco-necklace' && (
        <g>
          <path d={`M ${hx - g.headRx * 0.5} ${g.neckY - 4} Q ${hx} ${g.neckY + 16} ${hx + g.headRx * 0.5} ${g.neckY - 4}`} stroke="#ffd23f" strokeWidth={3} fill="none" />
          <polygon points={`${hx},${g.neckY + 6} ${hx + 7},${g.neckY + 14} ${hx},${g.neckY + 24} ${hx - 7},${g.neckY + 14}`} fill="#5ff0d2" stroke={line} strokeWidth={2} />
        </g>
      )}
      {equipped.decoration === 'deco-scarf' && (
        <g>
          <path d={`M ${hx - g.headRx * 0.72} ${g.neckY - 6} Q ${hx} ${g.neckY + 12} ${hx + g.headRx * 0.72} ${g.neckY - 6} L ${hx + g.headRx * 0.7} ${g.neckY + 6} Q ${hx} ${g.neckY + 24} ${hx - g.headRx * 0.7} ${g.neckY + 6} Z`} fill="#4f8cff" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M ${hx + 16} ${g.neckY + 10} l 6 26 l 12 -4 l -6 -24 Z`} fill="#3b6fd6" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M ${hx - 30} ${g.neckY + 2} l 0 10 M ${hx - 10} ${g.neckY + 8} l 0 10 M ${hx + 10} ${g.neckY + 8} l 0 10`} stroke="#fff" strokeWidth={3} opacity={0.6} />
        </g>
      )}
      {equipped.decoration === 'deco-medal' && (
        <g>
          <path d={`M ${hx - 10} ${g.chestY - 22} L ${hx - 4} ${g.chestY - 4} L ${hx + 4} ${g.chestY - 4} L ${hx + 10} ${g.chestY - 22} Z`} fill="#e5484d" stroke={line} strokeWidth={2} />
          <circle cx={hx} cy={g.chestY + 4} r={10} fill="#ffd23f" stroke={line} strokeWidth={2.5} />
          <polygon points={star(hx, g.chestY + 4, 5.5)} fill="#fff6c4" />
        </g>
      )}
      {equipped.decoration === 'deco-bow' && (
        <g transform={`translate(${hx + g.headRx * 0.62} ${top + g.headRy * 0.28}) rotate(18)`}>
          <path d="M 0 0 L -16 -10 L -16 10 Z M 0 0 L 16 -10 L 16 10 Z" fill="#ff5fa2" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
          <circle r={5} fill="#ff86bb" stroke={line} strokeWidth={2.5} />
        </g>
      )}

      {equipped.glasses === 'glasses-round' && (
        <g fill="#cfefff" fillOpacity={0.25} stroke="#2b2140" strokeWidth={3}>
          {ex.map((x) => <circle key={x} cx={x} cy={g.eyeY} r={er * 1.45} />)}
          <path d={`M ${ex[0] + er * 1.45} ${g.eyeY} Q ${hx} ${g.eyeY - 6} ${ex[1] - er * 1.45} ${g.eyeY}`} fill="none" />
        </g>
      )}
      {equipped.glasses === 'glasses-star' && (
        <g stroke="#2b2140" strokeWidth={2.5} strokeLinejoin="round">
          {ex.map((x) => <polygon key={x} points={star(x, g.eyeY, er * 1.9, 5, 0.55)} fill="#ff7ac6" fillOpacity={0.55} />)}
          <path d={`M ${ex[0] + er * 1.2} ${g.eyeY - 2} L ${ex[1] - er * 1.2} ${g.eyeY - 2}`} />
        </g>
      )}
      {equipped.glasses === 'glasses-cool' && (
        <g>
          {ex.map((x) => <rect key={x} x={x - er * 1.6} y={g.eyeY - er * 1.05} width={er * 3.2} height={er * 2.1} rx={er * 0.8} fill="#1f1636" stroke="#0e0a1a" strokeWidth={2.5} />)}
          <path d={`M ${ex[0] + er * 1.6} ${g.eyeY - 3} L ${ex[1] - er * 1.6} ${g.eyeY - 3}`} stroke="#0e0a1a" strokeWidth={3} />
          {ex.map((x) => <path key={`s${x}`} d={`M ${x - er * 0.9} ${g.eyeY - er * 0.3} l ${er * 0.7} ${-er * 0.5}`} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.75} />)}
        </g>
      )}

      {equipped.glasses === 'glasses-heart' && (
        <g stroke="#2b2140" strokeWidth={2.5} strokeLinejoin="round">
          {ex.map((x) => <path key={x} d={`M ${x} ${g.eyeY + er * 1.3} C ${x - er * 2.4} ${g.eyeY - er * 0.2} ${x - er * 1.2} ${g.eyeY - er * 2} ${x} ${g.eyeY - er * 0.7} C ${x + er * 1.2} ${g.eyeY - er * 2} ${x + er * 2.4} ${g.eyeY - er * 0.2} ${x} ${g.eyeY + er * 1.3} Z`} fill="#ff5fa2" fillOpacity={0.6} />)}
          <path d={`M ${ex[0] + er * 1.3} ${g.eyeY - er * 0.6} L ${ex[1] - er * 1.3} ${g.eyeY - er * 0.6}`} />
        </g>
      )}
      {equipped.hat === 'hat-beanie' && (
        <g>
          <path d={`M ${hx - 30} ${top + 12} Q ${hx - 30} ${top - 26} ${hx} ${top - 26} Q ${hx + 30} ${top - 26} ${hx + 30} ${top + 12} Z`} fill="#4fb6f0" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <rect x={hx - 32} y={top + 2} width={64} height={13} rx={6} fill="#2f8fd0" stroke={line} strokeWidth={3} />
          <path d={`M ${hx - 18} ${top - 14} v 14 M ${hx} ${top - 20} v 20 M ${hx + 18} ${top - 14} v 14`} stroke="#ffffff" strokeWidth={3} opacity={0.5} />
          <circle cx={hx} cy={top - 30} r={9} fill="#ffffff" stroke={line} strokeWidth={2.5} />
        </g>
      )}
      {equipped.hat === 'hat-pirate' && (
        <g>
          <path d={`M ${hx - 42} ${top + 8} Q ${hx} ${top - 44} ${hx + 42} ${top + 8} Q ${hx} ${top - 4} ${hx - 42} ${top + 8} Z`} fill="#2b2140" stroke="#0e0a1a" strokeWidth={3} strokeLinejoin="round" />
          <circle cx={hx} cy={top - 14} r={7} fill="#ffffff" />
          <path d={`M ${hx - 4} ${top - 10} l 8 8 M ${hx + 4} ${top - 10} l -8 8`} stroke="#2b2140" strokeWidth={2} />
          <path d={`M ${hx - 40} ${top + 6} Q ${hx} ${top - 6} ${hx + 40} ${top + 6}`} stroke="#ffd23f" strokeWidth={3} fill="none" />
        </g>
      )}
      {equipped.hat === 'hat-chef' && (
        <g>
          <rect x={hx - 22} y={top - 6} width={44} height={18} rx={4} fill="#ffffff" stroke={line} strokeWidth={3} />
          <path d={`M ${hx - 24} ${top - 4} a 14 14 0 0 1 8 -26 a 16 16 0 0 1 32 0 a 14 14 0 0 1 8 26 Z`} fill="#ffffff" stroke={line} strokeWidth={3} strokeLinejoin="round" />
        </g>
      )}
      {equipped.hat === 'hat-party' && (
        <g transform={`rotate(-12 ${hx} ${top + 8})`}>
          <polygon points={`${hx - 20},${top + 10} ${hx + 20},${top + 10} ${hx},${top - 38}`} fill="#a78bfa" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M ${hx - 12} ${top - 8} L ${hx + 12} ${top - 2} M ${hx - 6} ${top - 24} L ${hx + 7} ${top - 20}`} stroke="#ffe066" strokeWidth={4} strokeLinecap="round" />
          <circle cx={hx} cy={top - 40} r={6} fill="#ff6fa3" stroke={line} strokeWidth={2.5} />
        </g>
      )}
      {equipped.hat === 'hat-wizard' && (
        <g>
          <path d={`M ${hx - 26} ${top + 10} Q ${hx - 6} ${top - 20} ${hx + 6} ${top - 56} Q ${hx + 14} ${top - 40} ${hx + 30} ${top - 46} Q ${hx + 14} ${top - 24} ${hx + 26} ${top + 10} Z`} fill="#4c3aa6" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <ellipse cx={hx} cy={top + 10} rx={38} ry={8} fill="#3a2b88" stroke={line} strokeWidth={3} />
          <polygon points={star(hx - 4, top - 14, 6)} fill="#ffe066" /><polygon points={star(hx + 10, top - 30, 4)} fill="#ffe066" />
        </g>
      )}
      {equipped.hat === 'hat-flower' && (
        <g>
          {[-34, -18, 0, 18, 34].map((dx, i) => {
            const y = top + 6 + Math.abs(dx) * 0.28;
            const col = ['#ff8fc7', '#ffd43b', '#ffffff', '#ffd43b', '#ff8fc7'][i];
            return <g key={dx}>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={hx + dx + Math.cos((a * Math.PI) / 180) * 5} cy={y + Math.sin((a * Math.PI) / 180) * 5} r={4.5} fill={col} stroke={line} strokeWidth={1.4} />)}<circle cx={hx + dx} cy={y} r={3.2} fill="#ff9f1c" /></g>;
          })}
        </g>
      )}
      {equipped.hat === 'hat-explorer' && (
        <g>
          <path d={`M ${hx - 30} ${top + 14} Q ${hx - 30} ${top - 22} ${hx} ${top - 22} Q ${hx + 30} ${top - 22} ${hx + 30} ${top + 14} Z`} fill="#3fb37f" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M ${hx + 4} ${top + 12} Q ${hx + 34} ${top + 6} ${hx + 50} ${top + 16} Q ${hx + 30} ${top + 22} ${hx + 4} ${top + 18} Z`} fill="#2e8f63" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <circle cx={hx} cy={top - 22} r={4} fill="#ffe066" stroke={line} strokeWidth={2} />
        </g>
      )}
      {equipped.hat === 'hat-crown' && (
        <g className="cc-shine">
          <polygon points={`${hx - 28},${top + 10} ${hx - 32},${top - 22} ${hx - 14},${top - 6} ${hx},${top - 30} ${hx + 14},${top - 6} ${hx + 32},${top - 22} ${hx + 28},${top + 10}`} fill="#ffd23f" stroke={line} strokeWidth={3} strokeLinejoin="round" />
          <circle cx={hx} cy={top} r={4.5} fill="#e5484d" /><circle cx={hx - 17} cy={top + 2} r={3.5} fill="#4f8cff" /><circle cx={hx + 17} cy={top + 2} r={3.5} fill="#24b47e" />
        </g>
      )}

      {equipped.magic === 'magic-halo' && (
        <ellipse cx={hx} cy={top - (equipped.hat ? 46 : 18)} rx={26} ry={7} fill="none" stroke="#ffe066" strokeWidth={5} className="cc-pulse" />
      )}
      {equipped.magic === 'magic-sparkles' && (
        <g fill="#fff6a8">
          {[[18, 60], [182, 80], [30, 150], [170, 160], [100, 18]].map(([x, y], i) => <polygon key={i} className="cc-twinkle" style={{ animationDelay: `${i * 0.35}s` }} points={star(x, y, 8, 4, 0.3)} stroke="#e8b400" strokeWidth={1} />)}
        </g>
      )}
      {equipped.magic === 'magic-bubbles' && (
        <g>
          {[[16, 80, 9], [180, 60, 11], [30, 150, 7], [176, 150, 8], [100, 10, 6], [60, 30, 5]].map(([x, y, rr], i) => (
            <g key={i} className="cc-ambient-float" style={{ animationDelay: `${-i * 0.7}s` }}>
              <circle cx={x} cy={y} r={rr} fill="#bdf0ff" fillOpacity={0.35} stroke="#7fd6ff" strokeWidth={2} />
              <circle cx={x - rr * 0.35} cy={y - rr * 0.35} r={rr * 0.25} fill="#fff" />
            </g>
          ))}
        </g>
      )}
      {equipped.magic === 'magic-orbit' && (
        <g className="cc-orbit" style={{ transformOrigin: `100px ${g.headCy}px` }}>
          {[0, 120, 240].map((a) => { const r = (a * Math.PI) / 180; return <polygon key={a} points={star(100 + Math.cos(r) * 76, g.headCy + Math.sin(r) * 30, 8)} fill="#ffe066" stroke={line} strokeWidth={2} />; })}
        </g>
      )}
    </>
  );
}

/** Clothes, drawn over the chest so they fit both illustrated and classic creatures. */
function Outfit({ id, g, line }: { id: string; g: Geo; line: string }) {
  const hx = g.headCx;
  const top = g.neckY - 4;
  const w = Math.max(28, g.bodyRx * 0.95);
  const h = Math.max(26, Math.min(g.bottom - top - 12, w * 1.15));
  const body = `M ${hx - w * 0.62} ${top} Q ${hx} ${top + 8} ${hx + w * 0.62} ${top} L ${hx + w * 0.86} ${top + h * 0.85} Q ${hx} ${top + h * 1.05} ${hx - w * 0.86} ${top + h * 0.85} Z`;
  const sleeves = (c: string) => (
    <>
      <path d={`M ${hx - w * 0.6} ${top + 1} l ${-w * 0.42} ${h * 0.22} l ${w * 0.16} ${h * 0.24} l ${w * 0.32} ${-h * 0.12} Z`} fill={c} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
      <path d={`M ${hx + w * 0.6} ${top + 1} l ${w * 0.42} ${h * 0.22} l ${-w * 0.16} ${h * 0.24} l ${-w * 0.32} ${-h * 0.12} Z`} fill={c} stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
    </>
  );
  switch (id) {
    case 'outfit-tee': return (
      <g>{sleeves('#4fb6f0')}<path d={body} fill="#4fb6f0" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        <polygon points={star(hx, top + h * 0.45, w * 0.22)} fill="#ffd23f" stroke={line} strokeWidth={1.5} /></g>
    );
    case 'outfit-hoodie': return (
      <g>{sleeves('#8b5cf6')}<path d={body} fill="#8b5cf6" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={`M ${hx - w * 0.5} ${top - 2} Q ${hx} ${top + 22} ${hx + w * 0.5} ${top - 2}`} fill="#a78bfa" stroke={line} strokeWidth={2.5} />
        <rect x={hx - w * 0.38} y={top + h * 0.52} width={w * 0.76} height={h * 0.22} rx={6} fill="#7c4ee0" stroke={line} strokeWidth={2} />
        <path d={`M ${hx - 6} ${top + 6} v 14 M ${hx + 6} ${top + 6} v 14`} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" /></g>
    );
    case 'outfit-overalls': return (
      <g><path d={`M ${hx - w * 0.6} ${top + h * 0.3} L ${hx + w * 0.6} ${top + h * 0.3} L ${hx + w * 0.8} ${top + h * 0.95} Q ${hx} ${top + h * 1.08} ${hx - w * 0.8} ${top + h * 0.95} Z`} fill="#3b82c4" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={`M ${hx - w * 0.45} ${top + h * 0.32} L ${hx - w * 0.4} ${top} M ${hx + w * 0.45} ${top + h * 0.32} L ${hx + w * 0.4} ${top}`} stroke="#3b82c4" strokeWidth={6} strokeLinecap="round" />
        <circle cx={hx - w * 0.44} cy={top + h * 0.34} r={3} fill="#ffd23f" /><circle cx={hx + w * 0.44} cy={top + h * 0.34} r={3} fill="#ffd23f" />
        <rect x={hx - w * 0.22} y={top + h * 0.45} width={w * 0.44} height={h * 0.22} rx={4} fill="#2f6aa8" stroke={line} strokeWidth={2} /></g>
    );
    case 'outfit-dress': return (
      <g><path d={`M ${hx - w * 0.5} ${top} Q ${hx} ${top + 8} ${hx + w * 0.5} ${top} L ${hx + w * 1.05} ${top + h} Q ${hx} ${top + h * 1.18} ${hx - w * 1.05} ${top + h} Z`} fill="#ff6fa3" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        {[-0.6, -0.2, 0.2, 0.6].map((k) => <circle key={k} cx={hx + w * k} cy={top + h * 0.7} r={3} fill="#fff" opacity={0.85} />)}
        <path d={`M ${hx - w * 0.55} ${top + h * 0.3} Q ${hx} ${top + h * 0.38} ${hx + w * 0.55} ${top + h * 0.3}`} stroke="#ffd23f" strokeWidth={4} fill="none" /></g>
    );
    case 'outfit-hero': return (
      <g>{sleeves('#e5484d')}<path d={body} fill="#e5484d" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={`M ${hx} ${top + h * 0.18} L ${hx + w * 0.3} ${top + h * 0.4} L ${hx} ${top + h * 0.7} L ${hx - w * 0.3} ${top + h * 0.4} Z`} fill="#ffd23f" stroke={line} strokeWidth={2} />
        <polygon points={bolt(hx, top + h * 0.44, w * 0.34)} fill="#e5484d" />
        <rect x={hx - w * 0.82} y={top + h * 0.8} width={w * 1.64} height={6} rx={3} fill="#ffd23f" stroke={line} strokeWidth={1.5} /></g>
    );
    case 'outfit-raincoat': return (
      <g>{sleeves('#ffd23f')}<path d={body} fill="#ffd23f" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={`M ${hx} ${top + 6} v ${h * 0.85}`} stroke={line} strokeWidth={2} />
        {[0.3, 0.55, 0.8].map((k) => <circle key={k} cx={hx + 6} cy={top + h * k} r={2.6} fill="#e5a400" stroke={line} strokeWidth={1.2} />)}</g>
    );
    default: return null;
  }
}
