import { BossStatue } from '../../creatures/bosses/BossPortrait';
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
import { GodotStage, useStage3d, type GodotStageHandle, type StageMessage } from '../../components/GodotStage';
import { sendClass } from '../../lib/stage';

// where each place stands on the 320×200 meadow (top-left, in pixels of the meadow picture)
const SPOT: Record<LocationId, [number, number]> = { castle: [137, 5], arena: [16, 71], library: [240, 71], sanctuary: [65, 104], village: [197, 104] };
const DECO_SPOT: Record<string, [number, number, number]> = { bunting: [199, 112, 60], lanterns: [238, 64, 60], fountain: [110, 150, 26], rainbow: [138, 156, 44] };
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
  // the class world in 3D (Godot, 1.8): walk round the island, every creature wandering it; the pixel map stays one tap away
  const want3d = useStage3d();
  const [stageFailed, setStageFailed] = useState(false);
  const [flat, setFlat] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const on3d = want3d && !stageFailed && !flat;
  const stage = useRef<GodotStageHandle>(null);
  const everyone = data.students.filter((s) => s.classId === classId);
  const placeStages = Object.fromEntries(LOCATIONS.map((l) => [l.id, locationState(data, classId, l.id).stage]));
  const placesKey = JSON.stringify(placeStages);
  const decoIds = decos.filter((d) => d.kind === 'quest').map((d) => d.id);
  const visitors = decos.filter((d) => d.kind === 'statue').map((d) => d.bossId!).filter(Boolean);
  const decoKey = JSON.stringify([decoIds, visitors]);
  const classKey = everyone.map((s) => `${s.id}:${s.speciesId}:${displayStage(s, data.settings)}:${JSON.stringify(s.equipped ?? {})}`).join('|');
  useEffect(() => {
    if (!stageReady) return;
    stage.current?.send('init', { students: [], places: placeStages, decorations: decoIds, visitors, reduced: reducedMotion() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageReady]);
  useEffect(() => { if (stageReady) stage.current?.send('places', { places: placeStages }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [placesKey]);
  useEffect(() => { if (stageReady) { stage.current?.send('decorations', { decorations: decoIds }); stage.current?.send('visitors', { visitors }); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [decoKey]);
  useEffect(() => {
    if (!stageReady) return;
    return sendClass(everyone, data.settings, (list) => stage.current?.send('students', { students: list }), (pics) => stage.current?.send('pictures', { list: pics }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageReady, classKey]);
  useEffect(() => { if (!picked) return; const t = setTimeout(() => setPicked(null), 3500); return () => clearTimeout(t); }, [picked]);
  const onStage = (m: StageMessage) => {
    if (m.type === 'place' && typeof m.id === 'string') setOpen(m.id as LocationId);
    if (m.type === 'tap' && typeof m.studentId === 'string') setPicked(m.studentId);
  };
  const pickedStudent = picked ? everyone.find((s) => s.id === picked) : undefined;

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
      {on3d && (
        <div className="adv-map relative" style={{ aspectRatio: '16 / 10' }} data-world3d>
          <GodotStage ref={stage} scene="world" className="absolute inset-0" title="The class world in 3D: drag to turn round the island, scroll to zoom, tap a creature or a place"
            onReady={() => setStageReady(true)} onFail={() => setStageFailed(true)} onMessage={onStage} />
          {pickedStudent && (
            <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 font-display text-lg font-bold shadow" role="status">
              {pickedStudent.name.split(' ')[0]}'s {getSpecies(pickedStudent.speciesId).name}
            </div>
          )}
          <div className="absolute bottom-2 left-2 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-ink-soft shadow-sm">Drag to look around · scroll to zoom · tap a creature or a place</div>
          <button className="btn btn-light absolute bottom-2 right-2 !py-1 !text-xs" onClick={() => setFlat(true)}>Pixel map</button>
        </div>
      )}
      {!on3d && want3d && !stageFailed && flat && <button className="btn btn-light self-start !py-1 !text-sm" onClick={() => setFlat(false)}>Walk around in 3D</button>}
      {!on3d && <div className="adv-map" style={{ aspectRatio: '16 / 10' }}>
        <Px name="world-ground" className="sea" />
        {decos.filter((d) => d.kind === 'quest').map((d) => { const [x, y, w] = DECO_SPOT[d.id]; return <Px key={d.id} name={`deco-${d.id}`} alt={d.name} className="absolute" style={{ left: pct(x, 320), top: pct(y, 200), width: pct(w, 320) }} />; })}
        {decos.filter((d) => d.kind === 'statue').map((d, i) => (
          <BossStatue key={d.id} id={d.bossId!} alt={`Statue of ${BOSSES_BY_ID[d.bossId!]?.name}`} className="absolute drop-shadow-[0_3px_0_rgb(14_42_82/.25)]" style={{ left: pct(4 + (i % 12) * 26, 320), top: pct(i < 12 ? 166 : 140, 200), width: pct(22, 320) }} />
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
      </div>}

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
