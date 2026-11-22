import { useEffect, useRef } from 'react';
import { BOSSES_BY_ID, REGIONS } from '../../data/adventure';
import { Icon } from '../../components/Icon';
import { ProgressBar } from '../../components/ui';
import { currentBattle, regionCompletion, regionStates } from '../../engine/adventure';
import { animate, reducedMotion } from '../../lib/motion';
import { useStore } from '../../store/store';
import type { RegionId } from '../../types';
import { BossPortrait } from '../../creatures/bosses/BossPortrait';
import { Px, advPath, go } from './common';

// island picture size (pixels) for the height of each island box
const ART: Record<RegionId, [number, number]> = { verdant: [90, 64], crystal: [80, 58], lagoon: [88, 60], frostpeak: [86, 62], ember: [90, 64], hollow: [84, 62], sky: [86, 62], ancient: [76, 56], dunes: [90, 60] };
const MAP_RATIO = 10 / 16;

/**
 * The world map: nine islands on a pixel sea, joined by the route the class travels. Open islands bob and
 * lift under the pointer; locked ones sit under fog with what they need. Click an island to visit it.
 */
export function WorldMap({ classId, student }: { classId: string; student: string | null }) {
  const data = useStore((s) => s.data);
  const states = regionStates(data, classId);
  const battle = currentBattle(data, classId);
  const bossRegion = battle ? BOSSES_BY_ID[battle.bossId]?.regionId : undefined;
  const me = student ? data.students.find((s) => s.id === student) : undefined;
  const map = useRef<HTMLDivElement>(null);

  // islands bob gently, each at its own pace; the route's open legs march like ants
  useEffect(() => {
    const el = map.current;
    if (!el || reducedMotion()) return;
    const anims = Array.from(el.querySelectorAll<HTMLElement>('[data-bob]')).map((isle, i) =>
      animate(isle, { y: [-3, 3], duration: 2600 + i * 370, loop: true, alternate: true, ease: 'inOutSine', delay: i * 180 }));
    const ants = animate(el.querySelectorAll('[data-ants]'), { strokeDashoffset: [0, -17], duration: 900, loop: true, ease: 'linear' });
    return () => { anims.forEach((a) => a.revert()); ants.revert(); };
  }, []);

  const lift = (e: React.PointerEvent<HTMLElement>, on: boolean) => {
    if (reducedMotion()) return;
    const img = e.currentTarget.querySelector('img');
    if (img) animate(img, { y: on ? -8 : 0, scale: on ? 1.05 : 1, duration: 380, ease: 'out(3)' });
  };

  const centre = (id: RegionId) => {
    const r = REGIONS.find((x) => x.id === id)!;
    const [w, h] = ART[id];
    return { x: r.map.x + r.map.w / 2, y: (r.map.y + (r.map.w * h / w) / MAP_RATIO / 2) * MAP_RATIO };
  };

  return (
    <div className="flex flex-col gap-4">
      <div ref={map} className="adv-map" role="group" aria-label="World map">
        <Px name="worldmap-sea" className="sea" />
        {/* the route, in the order regions open */}
        <svg className="adv-route" viewBox={`0 0 100 ${100 * MAP_RATIO}`} preserveAspectRatio="none" aria-hidden>
          {REGIONS.slice(1).map((r, i) => {
            const a = centre(REGIONS[i].id), b = centre(r.id), open = states[r.id].open;
            return <line key={r.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={open ? '#ffd23f' : '#ffffff'} strokeOpacity={open ? 1 : 0.55} strokeDasharray={open ? '10 7' : '3 9'} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...(open ? { 'data-ants': '' } : {})} style={{ strokeWidth: open ? 5 : 3 }} />;
          })}
        </svg>
        {REGIONS.map((r) => {
          const st = states[r.id];
          const [w, h] = ART[r.id];
          const pct = me ? Math.round(regionCompletion(data, me, r.id).pct * 100) : null;
          return (
            <button key={r.id} className={`adv-isle ${st.open ? '' : 'locked'}`} data-bob
              style={{ left: `${r.map.x}%`, top: `${r.map.y}%`, width: `${r.map.w}%`, aspectRatio: `${w} / ${h}` }}
              onPointerEnter={(e) => lift(e, true)} onPointerLeave={(e) => lift(e, false)}
              onClick={() => go(advPath('region', r.id, student))}
              aria-label={`${r.name}: ${st.open ? 'open' : st.why === 'teacher-locked' ? 'closed by your teacher' : `opens at ${st.need} adventure points`}`}>
              <Px name={`isle-${r.id}`} />
              {!st.open && <span className="adv-fog" aria-hidden />}
              {!st.open && (
                <span className="absolute left-1/2 top-[38%] flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-ink/80 px-2.5 py-1 text-[clamp(10px,1vw,13px)] font-bold text-white">
                  <Icon name="lock" size={13} strokeWidth={2.4} />{st.why === 'teacher-locked' ? 'Closed' : `${st.need} points`}
                </span>
              )}
              {bossRegion === r.id && battle && (
                <span className="absolute -right-[4%] -top-[14%] w-[34%] idle-bob" title={`${BOSSES_BY_ID[battle.bossId].name} is here!`}>
                  <BossPortrait id={battle.bossId} still className="drop-shadow-[0_3px_0_rgb(14_42_82/.35)]" />
                  <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brick text-[12px] font-extrabold text-white">!</span>
                </span>
              )}
              <span className="adv-plate" style={{ bottom: '-6%' }}>
                {r.name}{pct !== null && st.open ? <span className="ml-1.5 text-azure-700">{pct}%</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* the same regions as a list: readable on a phone and for screen readers */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-stagger>
        {REGIONS.map((r) => {
          const st = states[r.id];
          const pct = me ? regionCompletion(data, me, r.id).pct : null;
          return (
            <button key={r.id} onClick={() => go(advPath('region', r.id, student))} data-press
              className="paper flex items-center gap-3 p-3 text-left transition hover:bg-wash">
              <span className="relative w-20 shrink-0"><Px name={`isle-${r.id}`} className={`w-full ${st.open ? '' : 'grayscale'}`} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-display text-lg font-bold">{r.name}{!st.open && <Icon name="lock" size={15} className="text-ink-soft" />}</span>
                <span className="block text-[13px] text-ink-soft">{r.tagline}</span>
                {st.open
                  ? pct !== null ? <span className="mt-1 flex items-center gap-2"><ProgressBar pct={pct} height={8} className="flex-1" /><span className="text-xs font-bold tabular-nums text-ink-soft">{Math.round(pct * 100)}%</span></span>
                    : <span className="text-xs font-bold text-leaf">Open</span>
                  : <span className="text-xs font-bold text-ink-soft">{st.why === 'teacher-locked' ? 'Closed by your teacher' : `Opens at ${st.need} adventure points (now ${st.ap})`}</span>}
              </span>
              <Icon name="next" size={18} className="text-ink-soft" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

