import { useMemo, useState } from 'react';
import { AbilityIcon } from '../components/Abilities';
import { Glyph, Icon } from '../components/Icon';
import { ElementBadge, ElementIcon, Modal, ProgressBar, RarityStars } from '../components/ui';
import { Creature } from '../creatures/Creature';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import { abilitiesFor } from '../data/abilities';
import { BRANCHES, formKey } from '../data/branches';
import { ACHIEVEMENTS_BY_ID } from '../data/defaults';
import { ELEMENT_ORDER, ELEMENTS, RARITIES, STAGE_NAMES } from '../data/elements';
import { personalityOf } from '../data/personality';
import { fieldNo, SPECIES } from '../data/species';
import { collectionStats } from '../engine/collection';
import { firstName } from '../engine/util';
import { useClassStudents } from '../lib/stats';
import { useCurrentClass } from '../store/store';
import type { ElementType, Rarity, Species, Stage } from '../types';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
type Status = 'all' | 'discovered' | 'undiscovered';

/** Class milestones: share of the field guide discovered, and the achievement (with its reward) each one unlocks for every student. */
const MILESTONES: { pct: number; achievement: string }[] = [
  { pct: 0.25, achievement: 'creature-collector' }, { pct: 0.5, achievement: 'field-researcher' },
  { pct: 0.75, achievement: 'master-collector' }, { pct: 1, achievement: 'grand-naturalist' },
];

/** The class field guide: every creature form, discovered as students' creatures evolve. Undiscovered forms are silhouettes. */
export function Creaturedex() {
  const cls = useCurrentClass();
  const students = useClassStudents(cls?.id);
  const [element, setElement] = useState<ElementType | 'all'>('all');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [status, setStatus] = useState<Status>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Species | null>(null);
  const found = useMemo(() => new Set(cls?.discovered ?? []), [cls?.discovered]);
  const stats = collectionStats(cls);
  const owners = useMemo(() => {
    const m = new Map<string, typeof students>();
    for (const s of students) m.set(s.speciesId, [...(m.get(s.speciesId) ?? []), s]);
    return m;
  }, [students]);

  const known = (sp: Species) => found.has(`${sp.id}-1`) || [2, 3, 4, 5].some((st) => found.has(`${sp.id}-${st}`));
  const formsOf = (sp: Species) => [1, 2, 3, 4, 5].filter((st) => found.has(`${sp.id}-${st}`)).length + (found.has(`${sp.id}-5b`) ? 1 : 0);
  const totalOf = (sp: Species) => 5 + (BRANCHES[sp.id] ? 1 : 0);
  const q = query.trim().toLowerCase();
  const list = SPECIES.filter((sp) => {
    if (element !== 'all' && sp.element !== element) return false;
    if (rarity === 'mythical' ? !BRANCHES[sp.id] : rarity !== 'all' && sp.rarity !== rarity) return false;
    const k = known(sp);
    if (status === 'discovered' && !k) return false;
    if (status === 'undiscovered' && k) return false;
    if (q && !(k && (sp.name.toLowerCase().includes(q) || BRANCHES[sp.id]?.b.title.toLowerCase().includes(q))) && !fieldNo(sp.id).toLowerCase().includes(q) && !ELEMENTS[sp.element].name.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Creature field guide</h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">{SPECIES.length} original creatures across 10 elements, each with five forms, and ten with a mythical final path. Forms are discovered as your class’s creatures evolve.</p>
        </div>
        <div className="w-full sm:w-[380px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[17px] font-bold">{cls ? `${cls.name} has discovered` : 'Discovered'}</span>
            <span className="font-display text-[28px] font-extrabold leading-none tabular">{Math.round(stats.pct * 100)}%</span>
          </div>
          <ProgressBar pct={stats.pct} height={14} color="#1d5643" className="mt-1.5 ring-1 ring-rule" />
          <div className="mt-1 text-[13px] text-ink-soft"><b className="text-ink tabular">{stats.discovered}</b> of {stats.total} forms · <b className="text-ink tabular">{stats.species}</b> of {SPECIES.length} creatures · <b className="text-ink tabular">{stats.mythical}</b> mythical</div>
        </div>
      </div>

      {/* milestones */}
      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {MILESTONES.map((m) => {
          const a = ACHIEVEMENTS_BY_ID[m.achievement];
          const done = stats.pct >= m.pct;
          return (
            <div key={m.pct} className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${done ? 'bg-white ring-gilt-deep/50 shadow-[var(--shadow-card)]' : 'bg-white/70 ring-rule'}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: done ? `color-mix(in srgb, ${a.color} 20%, white)` : 'rgb(22 36 28 / .06)', color: done ? `color-mix(in srgb, ${a.color} 75%, #16241c)` : '#8a958c' }}>
                {done ? <Glyph icon={a.icon} size={22} /> : <Icon name="lock" size={18} />}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block font-display font-bold">{a.name} <span className="font-normal text-ink-soft tabular">· {Math.round(m.pct * 100)}%</span></span>
                <span className="block text-[12px] text-ink-soft">{done ? 'Reached! ' : ''}Reward for everyone: {a.reward}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[160px] flex-1 sm:max-w-[240px]">
          <span className="sr-only">Search the field guide</span>
          <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input className="input !rounded-full !py-2 !pl-10" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="input !w-auto !rounded-full !py-2" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | 'all')} aria-label="Filter by rarity">
          <option value="all">All rarities</option>
          {(Object.keys(RARITIES) as Rarity[]).map((r) => <option key={r} value={r}>{RARITIES[r].name}{r === 'mythical' ? ' (has a mythical path)' : ''}</option>)}
        </select>
        <select className="input !w-auto !rounded-full !py-2" value={status} onChange={(e) => setStatus(e.target.value as Status)} aria-label="Filter by discovery">
          <option value="all">Discovered and not yet</option><option value="discovered">Discovered</option><option value="undiscovered">Not discovered yet</option>
        </select>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => setElement('all')} aria-pressed={element === 'all'} className={`chip !px-3.5 !py-1.5 !text-sm ring-1 transition ${element === 'all' ? 'bg-cloth-800 text-white ring-cloth-800' : 'bg-white text-ink ring-rule hover:bg-wash'}`}>All</button>
        {ELEMENT_ORDER.map((e) => (
          <button key={e} onClick={() => setElement(e)} aria-pressed={element === e} className={`chip !px-3.5 !py-1.5 !text-sm ring-1 transition ${element === e ? 'text-white' : 'bg-white text-ink ring-rule hover:bg-wash'}`}
            style={element === e ? { background: ELEMENTS[e].color, ['--tw-ring-color' as string]: ELEMENTS[e].color } : undefined}>
            <ElementIcon element={e} size={13} color={element === e ? '#fff' : ELEMENTS[e].color} /> {ELEMENTS[e].name}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="panel mt-5 p-10 text-center">
          <p className="font-display text-xl font-bold">No creatures match those filters.</p>
          <button className="btn btn-ghost mt-3" onClick={() => { setQuery(''); setElement('all'); setRarity('all'); setStatus('all'); }}>Clear filters</button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {list.map((sp) => {
            const k = known(sp);
            const own = owners.get(sp.id) ?? [];
            const top = ([5, 4, 3, 2, 1] as Stage[]).find((st) => found.has(`${sp.id}-${st}`)) ?? 1;
            const n = formsOf(sp), t = totalOf(sp);
            return (
              <button key={sp.id} onClick={() => setOpen(sp)} className="paper overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]" style={{ contentVisibility: 'auto', containIntrinsicSize: '200px 330px' }}
                aria-label={k ? `${sp.name}, ${n} of ${t} forms discovered` : `${fieldNo(sp.id)}, not discovered yet`}>
                <Habitat element={sp.element} seed={sp.id} className="mx-2 mt-2 h-40" rounded="rounded-[8px]">
                  <div className="h-full w-full" style={k ? undefined : { filter: 'brightness(0)', opacity: 0.2 }}>
                    <CreatureSvg species={sp} stage={top} effects={false} className={`mx-auto h-full w-[80%] ${k ? `idle-${sp.idle}` : ''}`} />
                  </div>
                  {own.length > 0 && <span className="chip absolute right-1.5 top-1.5 bg-white/90 text-ink ring-1 ring-rule">In class ×{own.length}</span>}
                  {BRANCHES[sp.id] && <span className="chip absolute left-1.5 top-1.5 bg-white/90 ring-1 ring-rule" style={{ color: RARITIES.mythical.color }}>Mythical path</span>}
                </Habitat>
                <div className="p-3">
                  <div className="flex items-center justify-between text-[13px] text-ink-soft"><span className="tabular">{fieldNo(sp.id)}</span><span className="tabular font-bold">{n}/{t} forms</span></div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[20px] font-bold leading-tight tracking-[-0.01em]">{k ? sp.name : '???'}</span>
                    <ElementBadge element={sp.element} small />
                  </div>
                  <RarityStars rarity={sp.rarity} />
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">{k ? sp.personality : 'Not discovered yet. A classmate’s creature might be this one…'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} label={open?.name ?? 'Creature'} wide="xl">
        {open && <SpeciesDetail sp={open} found={found} owners={(owners.get(open.id) ?? []).map((s) => firstName(s.name))} />}
      </Modal>
    </div>
  );
}

function SpeciesDetail({ sp, found, owners }: { sp: Species; found: Set<string>; owners: string[] }) {
  const known = [1, 2, 3, 4, 5].some((st) => found.has(`${sp.id}-${st}`));
  const firstSeen = (([1, 2, 3, 4, 5] as Stage[]).find((st) => found.has(`${sp.id}-${st}`)) ?? 1) as Stage;
  const [stage, setStage] = useState<Stage>(firstSeen);
  const [branch, setBranch] = useState<'a' | 'b'>('a');
  const [k, setK] = useState(0);
  const def = BRANCHES[sp.id];
  const p = personalityOf(sp.id);
  const seen = (st: Stage, b?: 'a' | 'b') => found.has(formKey(sp.id, st, b));
  const showSeen = seen(stage, stage === 5 ? branch : undefined);
  const path = stage === 5 && def ? def[branch] : undefined;
  const abilities = abilitiesFor(sp, branch);
  const families: { st: Stage; b?: 'a' | 'b' }[] = [{ st: 1 }, { st: 2 }, { st: 3 }, { st: 4 }, { st: 5, b: 'a' }, ...(def ? [{ st: 5 as Stage, b: 'b' as const }] : [])];
  return (
    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <Habitat element={sp.element} seed={sp.id} className="aspect-[4/3] w-full border border-rule" rounded="rounded-[12px]">
          <div className="h-full w-full" style={showSeen ? undefined : { filter: 'brightness(0)', opacity: 0.2 }}>
            <Creature key={`${stage}${branch}`} speciesId={sp.id} stage={stage} branch={stage === 5 ? branch : undefined} interactive={showSeen} effects={showSeen} className="mx-auto h-full w-[62%]" action={k && showSeen ? { type: 'celebrate', key: k } : null} />
          </div>
          {!showSeen && <span className="absolute inset-x-0 bottom-4 text-center font-display text-lg font-bold text-ink-soft">Not discovered yet</span>}
        </Habitat>
        <h3 className="mt-4 font-display text-[17px] font-bold">Evolution family</h3>
        <div className={`mt-2 grid gap-1.5 ${def ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {families.map(({ st, b }) => {
            const ok = seen(st, b);
            const on = st === stage && (st < 5 || b === branch);
            return (
              <button key={`${st}${b ?? ''}`} onClick={() => { setStage(st); if (b) setBranch(b); setK(Date.now()); }} aria-pressed={on}
                className={`rounded-xl p-1 text-center transition ${on ? 'bg-gilt-pale ring-2 ring-gilt-deep' : 'bg-wash ring-1 ring-rule hover:bg-endpaper'}`}>
                <div className="aspect-square" style={ok ? undefined : { filter: 'brightness(0)', opacity: 0.2 }}>
                  <CreatureSvg species={sp} stage={st} branch={b} effects={false} noShadow className="h-full w-full" />
                </div>
                <div className="text-[11px] font-bold leading-tight" style={b === 'b' ? { color: RARITIES.mythical.color } : undefined}>{b === 'b' ? 'Mythical' : `${ROMAN[st - 1]} ${STAGE_NAMES[st]}`}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[15px] text-ink-soft tabular">{fieldNo(sp.id)}</div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em]">{known ? sp.name : '???'}</h2>
          <ElementBadge element={sp.element} />
          <RarityStars rarity={path?.rarity === 'mythical' ? 'mythical' : sp.rarity} />
        </div>
        {known ? (
          <>
            <p className="mt-1 text-[15px]">{sp.personality} <span className="text-ink-soft">Personality: {p.label}.</span></p>
            {path && <p className="mt-2 rounded-xl bg-wash p-3 text-[14px] ring-1 ring-rule"><b>{path.id === 'b' ? 'Mythical path' : 'Classic path'}: {path.title}.</b> {path.description}</p>}
            {!path && <p className="mt-2 text-[14px] text-ink-soft">Final form: {def ? `${def.a.title}, or the mythical ${def.b.title}` : sp.legendTitle}.</p>}
            <h3 className="mt-4 font-display text-[17px] font-bold">Abilities</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {abilities.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-rule">
                  <AbilityIcon def={a} element={sp.element} size={40} />
                  <span className="min-w-0 leading-tight"><span className="block font-bold">{a.name} <span className="text-[12px] font-bold text-ink-soft">Tier {a.tier} · awakens at {STAGE_NAMES[a.stage]}</span></span><span className="block text-[13px] text-ink-soft">{a.description}</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-ink-soft">Rarity only changes how a creature looks. It never changes how much XP a student earns.</p>
            {owners.length > 0 && <p className="mt-2 text-sm font-bold">In this class: {owners.join(', ')}</p>}
          </>
        ) : (
          <p className="mt-2 text-[15px] text-ink-soft">Nobody in your class has met this creature yet. When a student’s creature is one of these, its baby form appears here, and every evolution reveals one more form.</p>
        )}
        <div className="mt-4 flex items-center gap-1.5 text-[13px] text-ink-soft"><ElementIcon element={sp.element} size={12} color={ELEMENTS[sp.element].color} />{[1, 2, 3, 4, 5].filter((st) => found.has(`${sp.id}-${st}`)).length + (found.has(`${sp.id}-5b`) ? 1 : 0)} of {5 + (def ? 1 : 0)} forms discovered</div>
      </div>
    </div>
  );
}
