import { useMemo, useState } from 'react';
import { ElementBadge, ElementIcon, Modal, RarityStars } from '../components/ui';
import { Creature } from '../creatures/Creature';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import { ELEMENT_ORDER, ELEMENTS, RARITIES, STAGE_NAMES } from '../data/elements';
import { SPECIES } from '../data/species';
import { stageForXp } from '../engine/progression';
import { firstName } from '../engine/util';
import { useClassStudents } from '../lib/stats';
import { useCurrentClass, useStore } from '../store/store';
import type { ElementType, Species, Stage } from '../types';

/** The creature collection: every species, its family, and who in the class has it. */
export function Creaturedex() {
  const cls = useCurrentClass();
  const students = useClassStudents(cls?.id);
  const settings = useStore((s) => s.data.settings);
  const [filter, setFilter] = useState<ElementType | 'all'>('all');
  const [open, setOpen] = useState<Species | null>(null);
  const owners = useMemo(() => {
    const m = new Map<string, typeof students>();
    for (const s of students) m.set(s.speciesId, [...(m.get(s.speciesId) ?? []), s]);
    return m;
  }, [students]);
  const list = SPECIES.filter((s) => filter === 'all' || s.element === filter);
  const discovered = new Set(students.map((s) => s.speciesId)).size;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Creature Collection</h1>
          <p className="text-white/70">{SPECIES.length} original creatures across 10 elements. {cls && <>Your class has discovered <b className="text-sun">{discovered}</b>.</>}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <button onClick={() => setFilter('all')} className={`chip !px-3 !py-1.5 !text-sm ${filter === 'all' ? 'bg-white text-ink' : 'bg-white/10 text-white'}`}>All</button>
        {ELEMENT_ORDER.map((e) => (
          <button key={e} onClick={() => setFilter(e)} className="chip !px-3 !py-1.5 !text-sm text-white transition" style={{ background: filter === e ? ELEMENTS[e].color : 'rgb(255 255 255 / .1)' }}>
            <ElementIcon element={e} size={12} /> {ELEMENTS[e].name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {list.map((sp) => {
          const own = owners.get(sp.id) ?? [];
          return (
            <button key={sp.id} onClick={() => setOpen(sp)} className="paper overflow-hidden text-left transition hover:-translate-y-1">
              <Habitat element={sp.element} className="m-2 mb-0 h-40" rounded="rounded-[1.1rem]">
                <CreatureSvg species={sp} stage={own.length ? Math.max(...own.map((o) => stageForXp(o.xp, settings))) as Stage : 1} className={`mx-auto h-full w-[80%] idle-${sp.idle}`} />
                {own.length > 0 && <span className="chip absolute right-2 top-2 bg-white/85 text-ink">In class ×{own.length}</span>}
              </Habitat>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold">{sp.name}</span>
                  <ElementBadge element={sp.element} small />
                </div>
                <RarityStars rarity={sp.rarity} />
                <p className="mt-1 line-clamp-2 text-xs font-bold text-ink-soft">{sp.personality}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} label={open?.name ?? 'Creature'} wide>
        {open && <SpeciesDetail sp={open} owners={(owners.get(open.id) ?? []).map((s) => firstName(s.name))} />}
      </Modal>
    </div>
  );
}

function SpeciesDetail({ sp, owners }: { sp: Species; owners: string[] }) {
  const [stage, setStage] = useState<Stage>(1);
  const [k, setK] = useState(0);
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-3xl font-bold">{sp.name}</h2>
        <ElementBadge element={sp.element} />
        <RarityStars rarity={sp.rarity} />
      </div>
      <p className="mt-1 text-ink-soft">{sp.personality} Special ability: <b className="text-ink">{sp.ability}</b>. Legendary title: <b className="text-ink">{sp.legendTitle}</b>.</p>
      <Habitat element={sp.element} className="mt-4 h-72" rounded="rounded-[1.5rem]">
        <Creature key={stage} speciesId={sp.id} stage={stage} interactive className="mx-auto h-full w-[60%]" action={k ? { type: 'celebrate', key: k } : null} />
      </Habitat>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as Stage[]).map((st) => (
          <button key={st} onClick={() => { setStage(st); setK(Date.now()); }} className={`rounded-2xl p-1.5 text-center ${stage === st ? 'bg-grape/15 ring-2 ring-grape' : 'bg-ink/5 hover:bg-ink/10'}`}>
            <CreatureSvg species={sp} stage={st} effects={false} noShadow className="aspect-square w-full" />
            <div className="text-[11px] font-extrabold">{STAGE_NAMES[st]}</div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        Rarity changes only how a creature looks ({RARITIES[sp.rarity].name}: {RARITIES[sp.rarity].stars > 1 ? 'extra sparkles' : 'classic look'}). It never changes how much XP a student earns.
      </p>
      {owners.length > 0 && <p className="mt-2 text-sm font-bold">In this class: {owners.join(', ')}</p>}
    </div>
  );
}
