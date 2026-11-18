import { useEffect, useRef, useState } from 'react';
import { BOSSES_BY_ID, LOCATIONS, LOCATIONS_BY_ID, QUEST_DECORATIONS } from '../../data/adventure';
import { getSpecies } from '../../data/species';
import { CreatureSvg } from '../../creatures/CreatureSvg';
import { Icon } from '../../components/Icon';
import { Modal, ProgressBar } from '../../components/ui';
import { adventurePoints, classDecorations, locationState } from '../../engine/adventure';
import { displayStage } from '../../engine/progression';
import { animate, reducedMotion } from '../../lib/motion';
import { useStore } from '../../store/store';
import type { LocationId } from '../../types';
import { EmptyNote, Px } from './common';

// where each place stands on the 320×200 meadow (top-left, in pixels of the meadow picture)
const SPOT: Record<LocationId, [number, number]> = { castle: [137, 5], arena: [16, 71], library: [240, 71], sanctuary: [65, 104], village: [197, 104] };
const DECO_SPOT: Record<string, [number, number, number]> = { bunting: [199, 98, 60], lanterns: [238, 64, 60], fountain: [110, 150, 26], rainbow: [138, 156, 44] };
const pct = (x: number, total: number) => `${(x / total) * 100}%`;
/** the meadow path, as in scripts/pixel/world.px.js */
const pathAt = (t: number): [number, number] => [160 + 112 * Math.cos(t * Math.PI * 2) + 9 * Math.sin(t * Math.PI * 6), 110 + 52 * Math.sin(t * Math.PI * 2) + 7 * Math.cos(t * Math.PI * 4)];

/** The class's own shared world: places grow in three stages, bosses leave statues, creatures stroll the path. */
export function ClassWorldView({ classId, teacher }: { classId: string; teacher: boolean }) {
  const data = useStore((s) => s.data);
  const [open, setOpen] = useState<LocationId | null>(null);
  const walkers = useRef<HTMLDivElement>(null);
  const students = data.students.filter((s) => s.classId === classId).slice(0, 10);
  const decos = classDecorations(data, classId);
  const ap = adventurePoints(data, classId).total;

  // the class's creatures wander slowly around the path
  useEffect(() => {
    const host = walkers.current;
    if (!host) return;
    const els = Array.from(host.children) as HTMLElement[];
    const place = (el: HTMLElement, t: number) => { const [x, y] = pathAt(t); el.style.left = pct(x - 9, 320); el.style.top = pct(y - 17, 200); el.style.transform = Math.sin(t * Math.PI * 2 + Math.PI / 2) < 0 ? 'scaleX(-1)' : ''; };
    if (reducedMotion()) { els.forEach((el, i) => place(el, i / els.length)); return; }
    const anims = els.map((el, i) => {
      const o = { t: i / els.length };
      return animate(o, { t: o.t + 1, duration: 90_000 + i * 7000, loop: true, ease: 'linear', onUpdate: () => place(el, o.t % 1) });
    });
    return () => anims.forEach((a) => a.revert());
  }, [students.length]);

  if (!data.settings.classWorld) return <EmptyNote icon="castle" title="The shared class world is switched off">{teacher ? 'Turn it on in Settings → Adventure.' : 'Your teacher can turn it on.'}</EmptyNote>;
  return (
    <div className="flex flex-col gap-4">
      <div className="adv-map" style={{ aspectRatio: '16 / 10' }}>
        <Px name="world-ground" className="sea" />
        {decos.filter((d) => d.kind === 'quest').map((d) => { const [x, y, w] = DECO_SPOT[d.id]; return <Px key={d.id} name={`deco-${d.id}`} alt={d.name} className="absolute" style={{ left: pct(x, 320), top: pct(y, 200), width: pct(w, 320) }} />; })}
        {decos.filter((d) => d.kind === 'statue').map((d, i) => (
          <Px key={d.id} name={`statue-${d.bossId}`} alt={`Statue of ${BOSSES_BY_ID[d.bossId!]?.name}`} className="absolute drop-shadow-[0_3px_0_rgb(14_42_82/.25)]" style={{ left: pct(6 + i * 24, 320), top: pct(166, 200), width: pct(22, 320) }} />
        ))}
        <div ref={walkers} className="absolute inset-0" aria-hidden>
          {students.map((s) => (
            <div key={s.id} className="absolute aspect-square" style={{ width: pct(18, 320) }}>
              <CreatureSvg species={getSpecies(s.speciesId)} stage={displayStage(s, data.settings)} branch={s.branch} equipped={s.equipped} effects={false} className="h-full w-full" />
            </div>
          ))}
        </div>
        {LOCATIONS.map((l) => {
          const st = locationState(data, classId, l.id);
          const [x, y] = SPOT[l.id];
          return (
            <button key={l.id} className="adv-isle" style={{ left: pct(x, 320), top: pct(y, 200), width: pct(64, 320), aspectRatio: '64 / 52' }} onClick={() => setOpen(l.id)}
              aria-label={`${l.name}: ${st.stage ? l.stageNames[st.stage - 1] : 'not built yet'}`}>
              <Px name={st.stage ? `place-${l.id}-${st.stage}` : 'place-plot'} />
              {st.canUpgrade && teacher && <span className="absolute -right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-gilt text-gilt-ink shadow" title="Ready to build"><Icon name="plus" size={14} strokeWidth={3} /></span>}
              <span className="adv-plate" style={{ bottom: '-4%' }}>{l.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" data-stagger>
        {LOCATIONS.map((l) => {
          const st = locationState(data, classId, l.id);
          return (
            <button key={l.id} className="paper flex flex-col gap-1 p-3 text-left transition hover:bg-wash" onClick={() => setOpen(l.id)} data-press>
              <span className="font-display font-bold">{l.name}</span>
              <span className="text-xs font-bold text-ink-soft">{st.stage ? `Stage ${st.stage}: ${l.stageNames[st.stage - 1]}` : 'Not built yet'}</span>
              {st.next !== null ? <span className="flex items-center gap-1.5"><ProgressBar pct={Math.min(1, ap / st.next)} height={6} className="flex-1" /><span className="text-[11px] font-bold tabular-nums text-ink-soft">{Math.min(ap, st.next)}/{st.next}</span></span> : <span className="text-xs font-bold text-leaf">Fully built</span>}
            </button>
          );
        })}
      </div>
      <div className="paper p-4 text-sm">
        <span className="font-bold">Decorations: </span>
        {QUEST_DECORATIONS.map((d) => <span key={d.id} className={`mr-3 ${decos.some((x) => x.id === d.id) ? 'font-bold text-leaf' : 'text-ink-soft'}`}>{d.name} ({d.quests} class quests)</span>)}
        <span className="text-ink-soft">· every boss the class befriends leaves a statue.</span>
      </div>

      <PlaceModal id={open} classId={classId} teacher={teacher} onClose={() => setOpen(null)} />
    </div>
  );
}

function PlaceModal({ id, classId, teacher, onClose }: { id: LocationId | null; classId: string; teacher: boolean; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const upgrade = useStore((s) => s.upgradeLocation);
  const def = id ? LOCATIONS_BY_ID[id] : null;
  const st = id ? locationState(data, classId, id) : null;
  return (
    <Modal open={!!def} onClose={onClose} label="Class world place">
      {def && st && (
        <div className="p-6">
          <h2 className="font-display text-2xl font-bold">{def.name}</h2>
          <p className="mt-1 text-sm text-ink-soft">{def.description}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center ring-1 ${st.stage >= n ? 'bg-leaf-pale ring-leaf/30' : 'bg-wash ring-rule'}`}>
                <Px name={`place-${def.id}-${n}`} className={`w-full ${st.stage >= n ? '' : 'opacity-40 grayscale'}`} />
                <span className="text-xs font-bold leading-tight">{def.stageNames[n - 1]}</span>
                <span className="text-[11px] font-bold text-ink-soft">{def.stages[n - 1]} points</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm font-bold">
            {st.next === null ? 'Fully built. Wonderful work, everyone!' : st.canUpgrade ? `The class has ${st.ap} points: enough to build the next stage!` : `Next stage at ${st.next} adventure points (the class has ${st.ap}).`}
          </div>
          {teacher && st.next !== null && (
            <div className="mt-4 flex justify-end">
              <button className="btn btn-primary" disabled={!st.canUpgrade} onClick={() => { if (upgrade(classId, def.id)) onClose(); }} data-spark><Icon name="castle" size={18} />{st.stage ? 'Upgrade' : 'Build'} {def.stageNames[st.stage]}</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
