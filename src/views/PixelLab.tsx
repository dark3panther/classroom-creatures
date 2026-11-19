import { useEffect, useState } from 'react';
import { Creature, type CreatureAction } from '../creatures/Creature';
import { Habitat } from '../creatures/Habitat';
import { ELEMENTS } from '../data/elements';
import { SPECIES } from '../data/species';
import { Icon } from '../components/Icon';
import { useStore } from '../store/store';
import type { ElementType, Mood, Stage } from '../types';

/** One creature of each element at a big stage, painted and as pixel art, with its element attack. */
const PICKS: [ElementType, string, Stage][] = (['fire', 'water', 'nature', 'electric', 'ice', 'earth', 'shadow', 'light', 'cosmic', 'air'] as ElementType[])
  .map((e) => [e, SPECIES.find((s) => s.element === e && !s.pixelArt)!.id, 3]);
const PALS = SPECIES.filter((s) => s.pixelArt);

/** One Pixel Pal with buttons for each of its animations. */
function PalCard({ id, stage }: { id: string; stage: Stage }) {
  const sp = SPECIES.find((s) => s.id === id)!;
  const [act, setAct] = useState<{ type: CreatureAction; key: number } | null>(null);
  const [mood, setMood] = useState<Mood>('calm');
  const play = (type: CreatureAction) => { setMood('calm'); setAct({ type, key: Date.now() }); };
  return (
    <div className="paper p-3">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="font-display text-lg font-bold">{sp.name} <span className="text-sm font-semibold text-ink-soft">· {ELEMENTS[sp.element].name}</span></span>
      </div>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1d1a2f]">
        <div className="flex h-full items-end justify-start pb-[3%] pl-[8%]"><Creature speciesId={id} stage={stage} action={act} mood={mood} className="h-[92%] w-[66%]" sound={false} /></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button className="btn btn-light !px-2.5 !py-1 !text-xs" onClick={() => play('celebrate')}>Hop</button>
        <button className="btn btn-light !px-2.5 !py-1 !text-xs" onClick={() => play('ability')}>Attack</button>
        <button className="btn btn-light !px-2.5 !py-1 !text-xs" onClick={() => play('bonk')}>Hurt</button>
        <button className="btn btn-light !px-2.5 !py-1 !text-xs" onClick={() => setMood(mood === 'sleepy' ? 'calm' : 'sleepy')}>{mood === 'sleepy' ? 'Wake' : 'Sleep'}</button>
      </div>
    </div>
  );
}

/**
 * Pixel mode preview (#/pixel-lab): compare the painted creatures with their pixel-art versions and watch
 * each element's aura and attack. Attacks play by themselves every few seconds, or press Attack.
 */
export function PixelLab() {
  const pixelMode = useStore((s) => !!s.data.settings.pixelMode);
  const update = useStore((s) => s.updateSettings);
  const [tick, setTick] = useState(1);
  const [auto, setAuto] = useState(true);
  const [stage, setStage] = useState<Stage>(3);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setTick((n) => n + 1), 3600);
    return () => clearInterval(t);
  }, [auto]);
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="on-sky font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Pixel mode preview</h1>
          <p className="on-sky mt-1 text-[15px] font-semibold text-ink-soft">Each creature painted (left) and as pixel art with its element's aura and attack (right).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex overflow-hidden rounded-full bg-white ring-1 ring-rule">
            {([1, 2, 3, 4, 5] as Stage[]).map((s) => <button key={s} className={`px-3 py-1.5 text-sm font-bold ${stage === s ? 'bg-azure-700 text-white' : 'hover:bg-wash'}`} onClick={() => setStage(s)}>Stage {s}</button>)}
          </span>
          <button className="btn btn-light" onClick={() => setAuto(!auto)}><Icon name={auto ? 'pause' : 'play'} size={16} />{auto ? 'Pause attacks' : 'Auto attacks'}</button>
          <button className="btn btn-primary" onClick={() => update({ pixelMode: !pixelMode })}><Icon name="sparkle" size={18} />{pixelMode ? 'Turn Pixel mode off' : 'Turn Pixel mode on for the whole app'}</button>
        </div>
      </div>
      <h2 className="on-sky mt-6 font-display text-2xl font-extrabold">The Pixel Pals <span className="text-base font-semibold text-ink-soft">· ten new creatures drawn as pixel art, animated frame by frame</span></h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-stagger>
        {PALS.map((sp) => <PalCard key={`${sp.id}-${stage}`} id={sp.id} stage={stage} />)}
      </div>
      <h2 className="on-sky mt-8 font-display text-2xl font-extrabold">Painted creatures in Pixel mode</h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2" data-stagger>
        {PICKS.map(([el, id], i) => {
          const sp = SPECIES.find((s) => s.id === id)!;
          const act = { type: 'ability' as CreatureAction, key: tick * 100 + i };
          return (
            <div key={el} className="paper p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="font-display text-lg font-bold">{sp.name} <span className="text-sm font-semibold text-ink-soft">· {ELEMENTS[el].name}</span></span>
                <button className="btn btn-light !py-1 !text-sm" onClick={() => setTick((n) => n + 1)}><Icon name="bolt" size={14} />Attack</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Habitat element={el} seed={sp.id} className="aspect-[4/3] w-full">
                  <div className="flex h-full items-end justify-center pb-[4%]"><Creature speciesId={id} stage={stage} pixel={false} className="h-[86%] w-[64%]" sound={false} /></div>
                </Habitat>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1d1a2f]">
                  <div className="flex h-full items-end justify-start pb-[4%] pl-[6%]"><Creature speciesId={id} stage={stage} pixel action={auto || tick > 1 ? act : null} className="h-[86%] w-[64%]" sound={false} /></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
