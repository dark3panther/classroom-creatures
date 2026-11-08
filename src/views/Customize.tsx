import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { playEquip, playPurchase, playUnlock } from '../audio/sfx';
import { CoinIcon, Icon } from '../components/Icon';
import { ItemThumb } from '../components/ItemThumb';
import { ElementIcon } from '../components/ui';
import { Creature } from '../creatures/Creature';
import { Habitat } from '../creatures/Habitat';
import { ACHIEVEMENTS_BY_ID, ITEMS_BY_ID, SLOTS, SLOT_ONE } from '../data/defaults';
import { ELEMENTS, STAGE_NAMES } from '../data/elements';
import { getSpecies } from '../data/species';
import { displayStage } from '../engine/progression';
import { itemPrice, itemState, seasonEnds, unlockLabel, visibleItems, type ItemState } from '../engine/shop';
import { firstName } from '../engine/util';
import { navigate } from '../lib/router';
import { useStore } from '../store/store';
import type { Equipped, Item, ItemSlot, Student } from '../types';

const SLOT_ICON: Record<ItemSlot, string> = {
  hat: 'crown', glasses: 'target', outfit: 'user', armor: 'shield', wings: 'wings', decoration: 'star', background: 'book', trail: 'sparkle', magic: 'bolt',
};

/** Dressing room: the creature in the middle, categories on the left, items on the right. Try anything on before buying. */
export function Customize({ studentId }: { studentId: string }) {
  const student = useStore((s) => s.data.students.find((x) => x.id === studentId));
  if (!student) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">This creature could not be found</h1>
        <button className="btn btn-primary mt-5" onClick={() => navigate('/')}>Back to the classroom</button>
      </div>
    );
  }
  return <Room student={student} />;
}

function Room({ student }: { student: Student }) {
  const data = useStore((s) => s.data);
  const settings = data.settings;
  const buy = useStore((s) => s.buy);
  const equip = useStore((s) => s.equip);
  const locked = useStore((s) => s.locked);
  const sound = settings.soundEnabled;
  const sp = getSpecies(student.speciesId);
  const stage = displayStage(student, settings);
  const [slot, setSlot] = useState<ItemSlot>('hat');
  const [preview, setPreview] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const items = useMemo(() => visibleItems(settings, student), [settings, student]);
  const inSlot = items.filter((it) => it.slot === slot);
  const canShop = !locked || settings.shopWhileLocked;

  // Escape stops a preview
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const previewItem = preview ? ITEMS_BY_ID[preview] : null;
  const shown: Equipped = previewItem ? { ...student.equipped, [previewItem.slot]: previewItem.id } : student.equipped;
  const selected = previewItem ?? null;
  const selState = selected ? itemState(selected, student, settings) : null;

  const doEquip = (it: Item) => { equip(student.id, it.slot, it.id); if (sound) playEquip(true); setPreview(null); setCelebrate((n) => n + 1); };
  const doRemove = (s: ItemSlot) => { equip(student.id, s, null); if (sound) playEquip(false); };
  const doBuy = (it: Item) => {
    if (buy(student.id, it.id)) {
      if (sound) { playPurchase(); setTimeout(playUnlock, 260); }
      equip(student.id, it.slot, it.id);
      setPreview(null);
      setCelebrate((n) => n + 1);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost !px-3" onClick={() => navigate(`/creature/${student.id}`)} aria-label="Back to the creature profile"><Icon name="back" size={18} /></button>
        <div className="min-w-0 flex-1">
          <h1 className="whitespace-nowrap font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[38px]">Dressing room</h1>
          <p className="text-[15px] leading-snug text-ink-soft">
            <span className="mr-1 inline-block align-[-2px]"><ElementIcon element={sp.element} size={14} color={ELEMENTS[sp.element].color} /></span>
            <b className="text-ink">{student.nickname ?? sp.name}</b> · {firstName(student.name)}’s {sp.name}, {STAGE_NAMES[stage]}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#fdf2d6] px-4 py-2 ring-1 ring-[#e7c77a]" aria-label={`${student.coins} coins`}>
          <CoinIcon size={22} /><span className="font-display text-2xl font-extrabold text-[#6b4806] tabular">{student.coins ?? 0}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* categories */}
        <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Item categories">
          {SLOTS.map(({ slot: s, many }) => {
            const all = items.filter((it) => it.slot === s && !(s === 'background' && it.id === 'bg-habitat'));
            const owned = all.filter((it) => student.unlockedItems.includes(it.id)).length;
            const on = s === slot;
            return (
              <button key={s} onClick={() => { setSlot(s); setPreview(null); }} aria-current={on ? 'true' : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${on ? 'bg-cloth-800 text-white shadow-[var(--shadow-card)]' : 'bg-white text-ink ring-1 ring-rule hover:bg-wash'}`}>
                <Icon name={SLOT_ICON[s] as never} size={18} />
                <span className="flex-1 font-display font-bold">{many}</span>
                <span className={`text-[12px] font-bold tabular ${on ? 'text-white/80' : 'text-ink-soft'}`}>{owned}/{all.length}</span>
                {student.equipped[s] && !(s === 'background' && student.equipped[s] === 'bg-habitat') && <span className={`h-2 w-2 rounded-full ${on ? 'bg-gilt' : 'bg-leaf'}`} aria-label="something equipped" />}
              </button>
            );
          })}
        </nav>

        {/* the creature */}
        <section className="lg:sticky lg:top-24 lg:self-start">
          <div className="paper p-3">
            <Habitat element={sp.element} seed={sp.id} background={shown.background} className="aspect-square w-full" rounded="rounded-[10px]">
              <Creature speciesId={sp.id} stage={stage} branch={student.branch} equipped={shown} interactive sound={sound} ambient={6}
                action={celebrate ? { type: 'celebrate', key: celebrate } : null} className="mx-auto h-full w-[78%]" />
            </Habitat>
            <AnimatePresence>
              {selected && (
                <motion.div className={`mt-3 rounded-xl p-3 ring-1 ${selected.rare ? 'bg-gilt-pale ring-gilt-deep/40' : 'bg-wash ring-rule'}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-[13px] font-bold text-ink-soft">{selState === 'equipped' ? 'Wearing' : selState === 'owned' ? 'In the wardrobe' : 'Trying on'} · {SLOT_ONE[selected.slot]}</div>
                  <div className="font-display text-xl font-extrabold">{selected.name}{selected.rare && <span className="ml-2 align-middle text-[12px] font-bold text-gilt-deep">Rare collectible</span>}</div>
                  <div className="text-[14px] text-ink-soft">{selected.description}</div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Action item={selected} state={selState!} student={student} canShop={canShop} onEquip={doEquip} onRemove={() => doRemove(selected.slot)} onBuy={doBuy} />
                    <button className="btn btn-ghost ml-auto" onClick={() => setPreview(null)}>Stop trying on</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* what is worn */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SLOTS.map(({ slot: s }) => {
              const id = student.equipped[s];
              if (!id || (s === 'background' && id === 'bg-habitat')) return null;
              return (
                <span key={s} className="chip bg-white !py-1 !pl-2.5 !pr-1 !text-[13px] text-ink ring-1 ring-rule">
                  <span className="text-ink-soft">{SLOT_ONE[s]}:</span> {ITEMS_BY_ID[id]?.name ?? id}
                  <button className="grid h-6 w-6 place-items-center rounded-full hover:bg-wash" onClick={() => doRemove(s)} aria-label={`Take off ${ITEMS_BY_ID[id]?.name ?? id}`}><Icon name="close" size={12} strokeWidth={2.8} /></button>
                </span>
              );
            })}
          </div>
        </section>

        {/* items */}
        <section aria-label={`${SLOTS.find((x) => x.slot === slot)?.many} items`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {inSlot.map((it) => {
              const st = itemState(it, student, settings);
              return <ItemCard key={it.id} item={it} state={st} student={student} active={preview === it.id} onClick={() => setPreview(preview === it.id ? null : it.id)} />;
            })}
          </div>
          {!canShop && <p className="mt-3 text-[14px] text-ink-soft">Buying is switched off while teacher controls are locked. Students can still try things on and wear what they own.</p>}
        </section>
      </div>
    </div>
  );
}

function Action({ item, state, student, canShop, onEquip, onRemove, onBuy }: { item: Item; state: ItemState; student: Student; canShop: boolean; onEquip: (it: Item) => void; onRemove: () => void; onBuy: (it: Item) => void }) {
  const settings = useStore((s) => s.data.settings);
  const price = itemPrice(item, settings);
  switch (state) {
    case 'equipped': return item.slot === 'background' && item.id === 'bg-habitat' ? null : <button className="btn btn-light" onClick={onRemove}><Icon name="close" size={16} />Take off</button>;
    case 'owned': return <button className="btn btn-cloth" onClick={() => onEquip(item)}><Icon name="check" size={16} strokeWidth={2.6} />Wear it</button>;
    case 'buyable': return canShop ? <button className="btn btn-cloth" onClick={() => onBuy(item)}><CoinIcon size={16} />Buy and wear · {price}</button> : null;
    case 'short': return <span className="text-[14px] font-bold text-ink-soft">{price! - (student.coins ?? 0)} more coins needed</span>;
    case 'unavailable': return <span className="text-[14px] font-bold text-ink-soft">Comes back in {item.season?.label.toLowerCase()}</span>;
    default: return <span className="flex items-center gap-1 text-[14px] font-bold text-ink-soft"><Icon name="lock" size={14} />{unlockLabel(item, (id) => ACHIEVEMENTS_BY_ID[id]?.name ?? id)}</span>;
  }
}

function ItemCard({ item, state, student, active, onClick }: { item: Item; state: ItemState; student: Student; active: boolean; onClick: () => void }) {
  const settings = useStore((s) => s.data.settings);
  const price = itemPrice(item, settings);
  const dim = state === 'locked' || state === 'unavailable';
  const badge = (() => {
    switch (state) {
      case 'equipped': return <span className="chip bg-leaf text-white">Wearing</span>;
      case 'owned': return <span className="chip bg-leaf-pale text-leaf ring-1 ring-leaf/30">Owned</span>;
      case 'buyable': return <span className="chip bg-white text-[#6b4806] ring-1 ring-[#e7c77a]"><CoinIcon size={12} />{price}</span>;
      case 'short': return <span className="chip bg-white text-ink-soft ring-1 ring-rule"><CoinIcon size={12} />{price}</span>;
      case 'unavailable': return <span className="chip bg-white text-ink-soft ring-1 ring-rule">{item.season?.label}</span>;
      default: return <span className="chip bg-white text-ink-soft ring-1 ring-rule"><Icon name="lock" size={11} strokeWidth={2.6} />Locked</span>;
    }
  })();
  const ends = item.season && state !== 'unavailable' && state !== 'owned' && state !== 'equipped' ? seasonEnds(item.season) : null;
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`group relative flex flex-col rounded-xl bg-white p-2 text-left transition ${active ? 'ring-[3px] ring-gilt shadow-[var(--shadow-glow)]' : item.rare ? 'ring-2 ring-gilt-deep/50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]' : 'ring-1 ring-rule shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]'}`}>
      <div className={dim ? 'opacity-55 grayscale-[.6]' : ''}><ItemThumb item={item} speciesId={student.speciesId} stage={displayStage(student, settings)} branch={student.branch} /></div>
      {item.rare && <span className="chip absolute left-3 top-3 bg-gilt text-gilt-ink">Rare</span>}
      <div className="mt-2 line-clamp-1 font-display text-[15px] font-bold">{item.name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1">{badge}</div>
      {ends && <div className="mt-1 text-[12px] font-bold text-gilt-deep">Limited · until {ends.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>}
      {state === 'locked' && <div className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{unlockLabel(item, (id) => ACHIEVEMENTS_BY_ID[id]?.name ?? id)}</div>}
    </button>
  );
}

/** Small link card used on profiles. */
export function DressingRoomLink({ student }: { student: Student }) {
  return (
    <button className="btn btn-cloth" onClick={() => navigate(`/creature/${student.id}/customize`)}><Icon name="sparkle" size={16} />Dressing room</button>
  );
}

