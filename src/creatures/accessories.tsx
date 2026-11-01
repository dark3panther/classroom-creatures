import type { Equipped } from '../types';
import type { Geo } from './CreatureSvg';
import { WingPair } from './CreatureSvg';
import { star } from './shapes';

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
      {equipped.magic === 'magic-orbit' && (
        <g className="cc-orbit" style={{ transformOrigin: `100px ${g.headCy}px` }}>
          {[0, 120, 240].map((a) => { const r = (a * Math.PI) / 180; return <polygon key={a} points={star(100 + Math.cos(r) * 76, g.headCy + Math.sin(r) * 30, 8)} fill="#ffe066" stroke={line} strokeWidth={2} />; })}
        </g>
      )}
    </>
  );
}
