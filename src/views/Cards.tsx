import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CoinIcon, Icon } from '../components/Icon';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { ELEMENTS, RARITIES } from '../data/elements';
import { CARD_FORMS, binderCount, cardForm, packPrice, packsOn, type CardForm, type DrawnCard } from '../engine/cards';
import { firstName } from '../engine/util';
import { navigate } from '../lib/router';
import { reducedMotion } from '../lib/motion';
import { playAchievement, playMultiAward } from '../audio/sfx';
import { useClassStudents } from '../lib/stats';
import { useCurrentClass, useStore } from '../store/store';
import type { Species, Student } from '../types';

/**
 * Creature cards (1.9): students spend coins (or a pack won from a boss) on packs of three creature cards and
 * collect every form of every creature in their binder. Rarity is the stage; mythical forms are the rarest.
 */
export function Cards({ id }: { id?: string }) {
  const cls = useCurrentClass();
  const students = useClassStudents(cls?.id);
  const settings = useStore((s) => s.data.settings);
  const locked = useStore((s) => s.locked);
  const openPack = useStore((s) => s.openPack);
  const current = students.find((s) => s.id === id) ?? null;
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);
  const canSpend = !locked || settings.shopWhileLocked;
  const price = packPrice(settings);

  if (!packsOn(settings)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="font-display text-3xl font-bold">Creature cards</h1>
        <p className="paper mt-4 p-5">Card packs are switched off. Turn them on in <b>Settings → Classroom → Creature card packs</b>.</p>
      </div>
    );
  }
  const open = () => {
    if (!current) return;
    const cards = openPack(current.id);
    if (cards) { setDrawn(cards); if (settings.soundEnabled) playMultiAward(); }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-20 pt-5 sm:px-6">
      <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Creature cards</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">Spend coins on a pack of three creature cards and collect every creature in your binder. The third card is always Rare or better, and a card you already have turns back into coins.</p>

      <div className="mt-5 flex flex-wrap gap-2" role="list" aria-label="Choose a student" data-card-students>
        {students.map((s) => {
          const b = binderCount(s);
          return (
            <button key={s.id} role="listitem" className={`flex items-center gap-2 rounded-full border-2 py-1.5 pl-3 pr-3.5 text-left font-bold transition ${current?.id === s.id ? 'border-azure-700 bg-azure-700 text-white' : 'border-ink/10 bg-white hover:border-azure-700/40'}`}
              onClick={() => navigate(`/cards/${s.id}`)} aria-pressed={current?.id === s.id} data-card-student={s.id}>
              {firstName(s.name)}
              <span className={`text-xs font-bold ${current?.id === s.id ? 'text-white/80' : 'text-ink-soft'}`}>{b.have}/{b.total}</span>
              {(s.packs ?? 0) > 0 && <span className="rounded-full bg-[#ffd166] px-1.5 text-xs text-[#5a3a00]">{s.packs} pack{s.packs === 1 ? '' : 's'}</span>}
            </button>
          );
        })}
      </div>

      {!current && <p className="paper mt-5 p-5 text-lg">Choose a student to open card packs and see their binder.</p>}
      {current && (
        <>
          <section className="paper mt-5 flex flex-wrap items-center gap-5 p-5" data-card-shop>
            <PackArt />
            <div className="min-w-[220px] flex-1">
              <div className="font-display text-2xl font-bold">{firstName(current.name)}'s card packs</div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[15px]">
                <span className="flex items-center gap-1 font-bold"><CoinIcon size={18} />{current.coins ?? 0} coins</span>
                {(current.packs ?? 0) > 0 && <span className="font-bold text-[#8a5a00]">{current.packs} free pack{current.packs === 1 ? '' : 's'} from bosses</span>}
                <span className="text-ink-soft">{binderCount(current).have} of {binderCount(current).total} cards collected</span>
              </div>
              <BinderBar s={current} />
            </div>
            {canSpend ? (
              <button className="btn btn-primary px-6 py-3 text-lg" onClick={open} disabled={(current.packs ?? 0) === 0 && (current.coins ?? 0) < price} data-open-pack>
                <Icon name="cards" size={22} />{(current.packs ?? 0) > 0 ? 'Open a free pack' : <>Open a pack · <CoinIcon size={18} />{price}</>}
              </button>
            ) : <span className="text-sm text-ink-soft">Your teacher opens packs while the controls are locked.</span>}
          </section>
          <Binder s={current} />
        </>
      )}
      <AnimatePresence>{drawn && current && <PackOpening key={drawn.map((d) => d.key).join()} cards={drawn} student={current} onClose={() => setDrawn(null)} onAgain={open}
        again={canSpend && ((current.packs ?? 0) > 0 || (current.coins ?? 0) >= price)} sound={settings.soundEnabled} />}</AnimatePresence>
    </div>
  );
}

function BinderBar({ s }: { s: Student }) {
  const b = binderCount(s);
  return (
    <div className="mt-2 h-3 w-full max-w-md overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-label="Binder" aria-valuemin={0} aria-valuemax={b.total} aria-valuenow={b.have}>
      <div className="h-full rounded-full bg-gradient-to-r from-azure-500 to-[#9b51e0]" style={{ width: `${(100 * b.have) / b.total}%` }} />
    </div>
  );
}

/** A card pack: a foil wrapper with the star. */
function PackArt() {
  return (
    <div className="relative grid h-28 w-20 shrink-0 place-items-center rounded-xl shadow-lg" style={{ background: 'linear-gradient(160deg,#5b8cff,#2a3f9e 60%,#7a3fd0)', boxShadow: 'inset 0 0 0 3px #ffd23f, 0 8px 18px rgb(20 30 80 / .3)' }} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#ffd23f]" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
      <span className="absolute inset-x-0 top-0 h-3 rounded-t-xl bg-white/25" />
    </div>
  );
}

/** One card: the creature on a wash of its element, framed in its rarity's colour; `locked`: a dark silhouette. */
export function CreatureCard({ form, count = 1, locked = false, big = false }: { form: CardForm; count?: number; locked?: boolean; big?: boolean }) {
  const r = RARITIES[form.rarity];
  // the wash is the creature's element; the frame and stars are its rarity
  const tint = ELEMENTS[form.species.element]?.color ?? r.color;
  return (
    <div className={`relative flex flex-col items-center rounded-2xl bg-white p-1.5 ${big ? 'w-[min(26vw,230px)]' : 'w-full'}`}
      style={{ boxShadow: locked ? 'inset 0 0 0 2px rgb(19 37 63 / .12)' : `inset 0 0 0 3px ${r.color}, 0 4px 10px rgb(19 37 63 / .12)` }} data-card={form.key} data-locked={locked || undefined}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl" style={{ background: locked ? '#e9edf3' : `linear-gradient(180deg, color-mix(in srgb, ${tint} 14%, white), color-mix(in srgb, ${tint} 42%, white))` }}>
        <CardPicture sp={form.species} stage={form.stage} mythic={form.mythic} locked={locked} />
        {!locked && count > 1 && <span className="absolute right-1 top-1 rounded-full bg-ink px-1.5 text-xs font-bold text-white">×{count}</span>}
      </div>
      <div className={`mt-1 w-full truncate text-center font-bold ${big ? 'text-lg' : 'text-[12px]'} ${locked ? 'text-ink-soft' : 'text-ink'}`}>{locked ? '?' : form.species.name}</div>
      <div className="text-center text-[11px] font-bold leading-none" style={{ color: locked ? '#9aa4b2' : r.color }}>{'★'.repeat(r.stars)}</div>
    </div>
  );
}

function CardPicture({ sp, stage, mythic, locked }: { sp: Species; stage: CardForm['stage']; mythic: boolean; locked: boolean }) {
  return (
    // the drawing leaves room above the creature for crowns and wings: a card shows the creature bigger
    <div className="absolute inset-[6%]" style={{ transform: 'scale(1.3)', transformOrigin: '50% 88%', ...(locked ? { filter: 'brightness(0)', opacity: 0.18 } : {}) }}>
      <CreatureSvg species={sp} stage={stage} branch={mythic ? 'b' : undefined} effects={false} noShadow className="h-full w-full" />
    </div>
  );
}

/** Every card there is, a row per creature: the ones the student has, the rest as silhouettes. */
function Binder({ s }: { s: Student }) {
  const rows = useMemo(() => {
    const m = new Map<string, CardForm[]>();
    for (const f of CARD_FORMS) m.set(f.species.id, [...(m.get(f.species.id) ?? []), f]);
    return [...m.values()];
  }, []);
  const [onlyMine, setOnlyMine] = useState(false);
  const has = (k: string) => (s.cards?.[k] ?? 0) > 0;
  const shown = onlyMine ? rows.filter((r) => r.some((f) => has(f.key))) : rows;
  return (
    <section className="mt-6" data-binder>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-bold">Binder</h2>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />Only creatures with cards</label>
      </div>
      {onlyMine && !shown.length && <p className="mt-3 text-ink-soft">No cards yet: open a pack!</p>}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {shown.map((forms) => (
          <div key={forms[0].species.id} className="paper p-3">
            <div className="mb-2 flex items-center justify-between font-display text-lg font-bold">{forms[0].species.name}<span className="text-sm font-bold text-ink-soft">{forms.filter((f) => has(f.key)).length}/{forms.length}</span></div>
            <div className="grid grid-cols-6 gap-2">
              {forms.map((f) => <CreatureCard key={f.key} form={f} count={s.cards?.[f.key] ?? 0} locked={!has(f.key)} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Opening a pack: three cards, face down, turn over one after another; new ones say so, copies give coins back. */
function PackOpening({ cards, student, onClose, onAgain, again, sound }: { cards: DrawnCard[]; student: Student; onClose: () => void; onAgain: () => void; again: boolean; sound: boolean }) {
  const quick = reducedMotion();
  return (
    <motion.div className="azure-deep on-azure fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-auto px-4 py-8 text-center" role="dialog" aria-label="A card pack"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-pack-opening>
      <div className="font-display text-3xl font-extrabold text-white sm:text-4xl">{firstName(student.name)} opened a pack!</div>
      <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6">
        {cards.map((c, i) => {
          const f = cardForm(c.key);
          if (!f) return null;
          const delay = quick ? 0 : 0.5 + i * 0.75;
          return (
            <div key={i} className="relative" style={{ perspective: 900 }}>
              <motion.div className="relative" style={{ transformStyle: 'preserve-3d' }} initial={{ rotateY: quick ? 0 : 180, y: quick ? 0 : 30 }} animate={{ rotateY: 0, y: 0 }}
                transition={{ delay, duration: quick ? 0 : 0.6, ease: 'easeOut' }} onAnimationComplete={() => { if (sound && (f.rarity === 'legendary' || f.rarity === 'mythical' || f.rarity === 'epic')) playAchievement(); }}>
                <div style={{ backfaceVisibility: 'hidden' }}><CreatureCard form={f} big /></div>
                <div className="absolute inset-0 grid place-items-center rounded-2xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(160deg,#5b8cff,#2a3f9e 60%,#7a3fd0)', boxShadow: 'inset 0 0 0 4px #ffd23f' }}>
                  <svg viewBox="0 0 24 24" className="h-16 w-16 text-[#ffd23f]" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
                </div>
              </motion.div>
              <motion.div className={`mx-auto mt-2 w-fit rounded-full px-3 py-0.5 text-sm font-extrabold ${c.isNew ? 'bg-[#ffd166] text-[#5a3a00]' : 'bg-white/90 text-ink'}`}
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + (quick ? 0 : 0.5) }}>
                {c.isNew ? 'NEW!' : 'Copy: +2 coins'} · {RARITIES[c.rarity].name}
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {again && <button className="btn btn-primary px-6 py-3 text-lg" onClick={onAgain} data-pack-again><Icon name="cards" size={20} />Open another</button>}
        <button className="btn btn-light px-6 py-3 text-lg" onClick={onClose} autoFocus data-pack-done>Done</button>
      </div>
    </motion.div>
  );
}
