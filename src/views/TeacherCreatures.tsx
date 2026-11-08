import { useMemo, useState } from 'react';
import { EvolutionQueue, useEvolutionQueue } from '../components/Evolve';
import { CoinIcon, Icon } from '../components/Icon';
import { ItemThumb } from '../components/ItemThumb';
import { Modal, Toggle } from '../components/ui';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { abilitiesFor } from '../data/abilities';
import { ACHIEVEMENTS_BY_ID, ITEMS, SLOTS } from '../data/defaults';
import { STAGE_NAMES } from '../data/elements';
import { getSpecies, SPECIES } from '../data/species';
import { skillPoints } from '../engine/abilities';
import { pendingStage } from '../engine/evolution';
import { displayStage, levelForXp } from '../engine/progression';
import { itemPrice, unlockLabel } from '../engine/shop';
import { firstName } from '../engine/util';
import { navigate } from '../lib/router';
import { useClassStudents } from '../lib/stats';
import { useCurrentClass, useStore } from '../store/store';
import type { ItemSlot, Student } from '../types';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** Teacher controls for the creature game: evolution mode, progression, available creatures, shop items. */
export function CreaturesTab() {
  const settings = useStore((s) => s.data.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const cls = useCurrentClass();
  const queue = useEvolutionQueue(cls?.id);
  const [queueOpen, setQueueOpen] = useState(false);
  const waiting = queue.ready.length + queue.choose.length;
  return (
    <div className="flex flex-col gap-8">
      {/* evolution */}
      <section>
        <h2 className="font-display text-2xl font-bold">Evolution</h2>
        <p className="text-sm text-ink-soft">Decide who starts an evolution. XP still decides when a creature is ready; nothing here changes points.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Evolution mode">
          {([['auto', 'Automatic', 'Creatures evolve the moment they have enough XP, with the full animation.'], ['approval', 'Teacher approval', 'Creatures show “Ready to evolve” and wait in a queue until you press Evolve, so every evolution can be a class moment.']] as const).map(([mode, title, text]) => {
            const on = settings.evolutionMode === mode;
            return (
              <button key={mode} role="radio" aria-checked={on} onClick={() => updateSettings({ evolutionMode: mode })}
                className={`rounded-xl p-3 text-left ring-1 transition ${on ? 'bg-cloth-800 text-white ring-cloth-800' : 'bg-white ring-rule hover:bg-wash'}`}>
                <span className="flex items-center gap-2 font-display text-lg font-bold">{on ? <Icon name="checkCircle" size={18} /> : <span className="h-[18px] w-[18px] rounded-full ring-2 ring-rule" />}{title}</span>
                <span className={`mt-1 block text-[14px] ${on ? 'text-white/85' : 'text-ink-soft'}`}>{text}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-wash p-3 ring-1 ring-rule">
          <span className="font-bold">{waiting ? `${waiting} creature${waiting === 1 ? '' : 's'} waiting${cls ? ` in ${cls.name}` : ''}` : 'Nothing is waiting for an evolution right now.'}</span>
          {waiting > 0 && cls && <button className="btn btn-primary ml-auto" onClick={() => setQueueOpen(true)}><Icon name="sparkle" size={16} />Review evolutions</button>}
        </div>
        {cls && <EvolutionQueue classId={cls.id} open={queueOpen} onClose={() => setQueueOpen(false)} />}
      </section>

      {cls && <ProgressionTable classId={cls.id} className={cls.name} />}
      <SpeciesSection />
      <ShopSection />
      <section>
        <h2 className="font-display text-2xl font-bold">Students and the dressing room</h2>
        <Toggle label="Let students open their creature while teacher controls are locked" hint="From Presentation Mode, students can open their creature’s profile, play with it, awaken abilities and use the dressing room (buy with their own coins). They can never change XP or coins directly."
          checked={settings.shopWhileLocked} onChange={(v) => updateSettings({ shopWhileLocked: v })} />
      </section>
    </div>
  );
}

function ProgressionTable({ classId, className }: { classId: string; className: string }) {
  const settings = useStore((s) => s.data.settings);
  const data = useStore((s) => s.data);
  const students = useClassStudents(classId);
  const [adjusting, setAdjusting] = useState<Student | null>(null);
  const [resetting, setResetting] = useState<Student | null>(null);
  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">Creature progression · {className}</h2>
      <p className="text-sm text-ink-soft">Every creature at a glance. Adjust XP to correct a mistake (logged in the student’s history and undoable), or start a student over.</p>
      {sorted.length === 0 ? <p className="mt-3 rounded-xl bg-wash p-4 font-bold text-ink-soft ring-1 ring-rule">No students in this class yet.</p> : (
        <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-rule">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="bg-wash text-[12px] font-bold text-ink-soft">
              <tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2 text-right">Level</th><th className="px-3 py-2 text-right">XP</th><th className="px-3 py-2 text-right">Coins</th><th className="px-3 py-2 text-right">Abilities</th><th className="px-3 py-2 text-right">Items</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-rule bg-white">
              {sorted.map((s) => {
                const sp = getSpecies(s.speciesId);
                const stage = displayStage(s, settings);
                const ready = pendingStage(s, data);
                const awake = abilitiesFor(sp, s.branch).filter((a) => (s.skills?.[a.id] ?? 0) > 0).length;
                return (
                  <tr key={s.id}>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="h-9 w-9 shrink-0"><CreatureSvg species={sp} stage={stage} branch={s.branch} effects={false} noShadow className="h-full w-full" /></span>
                        <span className="min-w-0"><span className="block truncate font-bold">{s.name}</span><span className="block truncate text-[12px] text-ink-soft">{s.nickname ? `${s.nickname} · ` : ''}{sp.name}</span></span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{ROMAN[stage - 1]} · {STAGE_NAMES[stage]}{ready && <span className="chip ml-1.5 bg-gilt text-gilt-ink">Ready</span>}</td>
                    <td className="px-3 py-1.5 text-right tabular">{levelForXp(s.xp, settings.levelXp)}</td>
                    <td className="px-3 py-1.5 text-right tabular">{s.xp}</td>
                    <td className="px-3 py-1.5 text-right tabular">{s.coins ?? 0}</td>
                    <td className="px-3 py-1.5 text-right tabular">{awake}/4 <span className="text-ink-soft">({skillPoints(s, settings).free} pts)</span></td>
                    <td className="px-3 py-1.5 text-right tabular">{s.unlockedItems.filter((i) => i !== 'bg-habitat').length}</td>
                    <td className="px-3 py-1.5">
                      <span className="flex justify-end gap-1">
                        <button className="btn btn-light !px-2.5 !py-1 !text-[13px]" onClick={() => navigate(`/creature/${s.id}`)}>Profile</button>
                        <button className="btn btn-light !px-2.5 !py-1 !text-[13px]" onClick={() => setAdjusting(s)}>Adjust XP</button>
                        <button className="btn btn-light !px-2.5 !py-1 !text-[13px] !text-brick" onClick={() => setResetting(s)}>Reset</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <AdjustXp student={adjusting} onClose={() => setAdjusting(null)} />
      <ResetProgress student={resetting} onClose={() => setResetting(null)} />
    </section>
  );
}

function AdjustXp({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const adjust = useStore((s) => s.adjustXp);
  const notify = useStore((s) => s.notify);
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState('');
  const after = student ? Math.max(0, student.xp + delta) : 0;
  return (
    <Modal open={!!student} onClose={() => { onClose(); setDelta(0); setNote(''); }} label="Adjust XP">
      {student && (
        <form className="p-6" onSubmit={(e) => { e.preventDefault(); if (delta && adjust(student.id, delta, note)) { notify(`${firstName(student.name)}: ${delta > 0 ? '+' : ''}${delta} XP (teacher adjustment)`); onClose(); setDelta(0); setNote(''); } }}>
          <h2 className="font-display text-2xl font-bold">Adjust {firstName(student.name)}’s XP</h2>
          <p className="mt-1 text-sm text-ink-soft">For correcting mistakes. It is logged in the student’s history, can be undone like any award, never changes coins, and never takes away an evolution.</p>
          <div className="mt-4 flex items-center gap-2">
            {[-10, -5, 5, 10].map((n) => <button type="button" key={n} className="btn btn-light !px-3 !py-1.5 tabular" onClick={() => setDelta((d) => d + n)}>{n > 0 ? `+${n}` : `−${-n}`}</button>)}
            <input type="number" className="input !w-28 !py-1.5 tabular" value={delta} onChange={(e) => setDelta(Math.round(Number(e.target.value) || 0))} aria-label="XP change" />
          </div>
          <label className="mt-3 block text-sm font-bold">Reason (optional)
            <input className="input mt-1" value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="e.g. points given to the wrong student" />
          </label>
          <p className="mt-3 text-[15px]">XP: <b className="tabular">{student.xp}</b> → <b className="tabular">{after}</b></p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-cloth" disabled={!delta}>Apply</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ResetProgress({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const reset = useStore((s) => s.resetStudent);
  const notify = useStore((s) => s.notify);
  const [confirm, setConfirm] = useState('');
  const name = student ? firstName(student.name) : '';
  const ok = !!student && confirm.trim().toLowerCase() === name.toLowerCase();
  return (
    <Modal open={!!student} onClose={() => { onClose(); setConfirm(''); }} label="Reset progress">
      {student && (
        <form className="p-6" onSubmit={async (e) => { e.preventDefault(); if (!ok) return; await reset(student.id); notify(`${name}’s game progress was reset. A safety snapshot was saved first.`); onClose(); setConfirm(''); }}>
          <h2 className="font-display text-2xl font-bold text-brick">Start {name} over?</h2>
          <p className="mt-2 text-ink-soft">XP, coins, evolution, abilities, items, badges and award history go back to the start. The student, their creature and its nickname stay. A safety snapshot is saved first (Settings → Backup & Data).</p>
          <label className="mt-4 block text-sm font-bold">Type <b>{name}</b> to confirm
            <input className="input mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={!ok}>Reset progress</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function SpeciesSection() {
  const settings = useStore((s) => s.data.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const off = new Set(settings.disabledSpecies ?? []);
  const toggle = (id: string) => {
    const next = new Set(off);
    if (next.has(id)) next.delete(id); else next.add(id);
    if (next.size >= SPECIES.length) return; // keep at least one creature available
    updateSettings({ disabledSpecies: [...next] });
  };
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">Creatures offered to new students</h2>
      <p className="text-sm text-ink-soft">Switched-off creatures are not given to new students or offered as choices. Students who already have one keep it.</p>
      <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-10">
        {SPECIES.map((sp) => {
          const on = !off.has(sp.id);
          return (
            <button key={sp.id} role="switch" aria-checked={on} onClick={() => toggle(sp.id)}
              className={`rounded-xl p-1.5 text-center ring-1 transition ${on ? 'bg-white ring-rule hover:bg-wash' : 'bg-wash ring-rule/60 opacity-60'}`}>
              <div className="aspect-square" style={on ? undefined : { filter: 'grayscale(1)' }}><CreatureSvg species={sp} stage={1} effects={false} noShadow className="h-full w-full" /></div>
              <div className="truncate text-[12px] font-bold">{sp.name}</div>
              <div className={`text-[11px] font-bold ${on ? 'text-leaf' : 'text-ink-soft'}`}>{on ? 'Offered' : 'Off'}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ShopSection() {
  const settings = useStore((s) => s.data.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [slot, setSlot] = useState<ItemSlot>('hat');
  const off = new Set(settings.disabledItems ?? []);
  const items = ITEMS.filter((it) => it.slot === slot && it.id !== 'bg-habitat');
  const setPrice = (id: string, v: number) => updateSettings({ itemPrices: { ...settings.itemPrices, [id]: Math.max(0, Math.round(v)) } });
  const resetPrice = (id: string) => { const p = { ...settings.itemPrices }; delete p[id]; updateSettings({ itemPrices: p }); };
  const toggle = (id: string) => { const n = new Set(off); if (n.has(id)) n.delete(id); else n.add(id); updateSettings({ disabledItems: [...n] }); };
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">Dressing room items</h2>
      <p className="text-sm text-ink-soft">Choose which items appear and what shop items cost. Students keep anything they already own, even if you switch it off.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SLOTS.map((x) => <button key={x.slot} onClick={() => setSlot(x.slot)} aria-pressed={slot === x.slot} className={`chip !px-3.5 !py-1.5 !text-sm ring-1 ${slot === x.slot ? 'bg-cloth-800 text-white ring-cloth-800' : 'bg-white text-ink ring-rule hover:bg-wash'}`}>{x.many}</button>)}
      </div>
      <ul className="mt-3 divide-y divide-rule rounded-xl bg-white ring-1 ring-rule">
        {items.map((it) => {
          const price = itemPrice(it, settings);
          const custom = settings.itemPrices?.[it.id] !== undefined;
          const on = !off.has(it.id);
          return (
            <li key={it.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${on ? '' : 'opacity-60'}`}>
              <span className="w-12 shrink-0"><ItemThumb item={it} speciesId="lumifox" stage={3} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{it.name}{it.rare && <span className="ml-1.5 text-[12px] text-gilt-deep">Rare</span>}{it.season && <span className="ml-1.5 text-[12px] text-ink-soft">{it.season.label} only</span>}</span>
                <span className="block text-[13px] text-ink-soft">{it.unlock.type === 'shop' ? 'Sold in the shop' : unlockLabel(it, (id) => ACHIEVEMENTS_BY_ID[id]?.name ?? id)}</span>
              </span>
              {price !== null && (
                <span className="flex items-center gap-1.5">
                  <CoinIcon size={16} />
                  <input type="number" min={0} className="input !w-20 !py-1 tabular" value={price} onChange={(e) => setPrice(it.id, Number(e.target.value) || 0)} aria-label={`${it.name} price`} />
                  {custom && <button className="text-[12px] font-bold text-cloth-800 underline-offset-2 hover:underline" onClick={() => resetPrice(it.id)}>Default</button>}
                </span>
              )}
              <button role="switch" aria-checked={on} aria-label={`${it.name} ${on ? 'shown' : 'hidden'}`} onClick={() => toggle(it.id)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-leaf' : 'bg-ink/20'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
