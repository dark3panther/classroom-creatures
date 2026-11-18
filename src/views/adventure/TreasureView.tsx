import { useState } from 'react';
import { REGIONS, TREASURES_BY_ID, type TreasureDef } from '../../data/adventure';
import { ITEMS_BY_ID } from '../../data/defaults';
import { Icon } from '../../components/Icon';
import { Modal, ProgressBar, SectionTitle } from '../../components/ui';
import { ItemThumb } from '../../components/ItemThumb';
import { playChest } from '../../audio/sfx';
import { treasureList } from '../../engine/adventure';
import { firstName } from '../../engine/util';
import { createTimeline, reducedMotion, sparkle } from '../../lib/motion';
import { useStore } from '../../store/store';
import type { Student } from '../../types';
import { Px, RewardLine, StudentChip, advPath, chestArt, go } from './common';

const RULE_TEXT = (def: TreasureDef): string => {
  const r = def.rule;
  switch (r.kind) {
    case 'visit': return `Explore ${REGIONS.find((x) => x.id === r.regionId)?.name}`;
    case 'regionQuests': return `Complete ${r.count} quests in ${REGIONS.find((x) => x.id === r.regionId)?.name}`;
    case 'boss': return 'Help the class befriend this region\'s boss';
    case 'visitAll': return 'Explore all six regions';
    case 'quests': return `Complete ${r.count} quests`;
    case 'level': return `Reach level ${r.level}`;
    case 'relics': return 'Find all six relics';
  }
};

/** Treasure chests for one student: what each holds, what it needs, and opening it (once). */
export function TreasureView({ student, teacher }: { student: Student; teacher: boolean }) {
  const data = useStore((s) => s.data);
  const list = treasureList(data, student);
  const [opening, setOpening] = useState<string | null>(null);
  const opened = list.filter((t) => t.state === 'opened').length;
  const ready = list.filter((t) => t.state === 'ready').length;
  const groups = [...REGIONS.map((r) => ({ id: r.id as string, name: r.name })), { id: 'special', name: 'Special treasure' }];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <StudentChip student={student} onClear={teacher ? () => go(advPath('treasure')) : undefined} />
        <span className="text-sm font-bold text-ink-soft">{opened} of {list.length} found{ready ? ` · ${ready} ready to open!` : ''}</span>
        <ProgressBar pct={opened / list.length} height={10} className="min-w-40 flex-1" />
      </div>
      <p className="text-sm text-ink-soft">Every chest says exactly what is inside and what it needs. No luck involved: do the adventure, open the chest.</p>
      {groups.map((g) => {
        const items = list.filter((t) => (t.def.regionId ?? 'special') === g.id);
        return (
          <section key={g.id}>
            <SectionTitle>{g.name}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-stagger>
              {items.map(({ def, state, value, target, contents }) => {
                const item = contents.itemId ? ITEMS_BY_ID[contents.itemId] : def.itemId ? ITEMS_BY_ID[def.itemId] : undefined;
                return (
                  <div key={def.id} className={`paper flex flex-col items-center gap-1.5 p-3 text-center ${state === 'ready' ? 'ring-2 ring-gilt shadow-[var(--shadow-glow)]' : ''}`}>
                    <Px name={chestArt(def, state === 'opened')} alt={def.name} className={`adv-chest h-16 w-auto ${state === 'ready' ? 'ready' : ''} ${state === 'locked' ? 'opacity-60 grayscale-[.4]' : ''}`} />
                    <div className="font-display font-bold leading-tight">{def.name}</div>
                    <RewardLine coins={contents.coins || undefined} itemName={contents.itemId ? item?.name : undefined} className="!justify-center !text-xs" />
                    {def.itemId && !contents.itemId && <span className="text-[11px] font-bold text-ink-soft">({item?.name} already owned: coins instead)</span>}
                    <div className="text-[12px] text-ink-soft">{RULE_TEXT(def)}</div>
                    {state === 'locked' && <div className="flex w-full items-center gap-1.5"><ProgressBar pct={value / target} height={6} className="flex-1" /><span className="text-[11px] font-bold tabular-nums text-ink-soft">{value}/{target}</span></div>}
                    {state === 'ready' && <button className="btn btn-primary !py-1.5 !text-sm" onClick={() => setOpening(def.id)} data-spark><Icon name="chest" size={16} />Open</button>}
                    {state === 'opened' && <span className="chip bg-leaf-pale text-leaf"><Icon name="check" size={12} strokeWidth={2.6} />Found</span>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <OpenChest studentId={student.id} treasureId={opening} onClose={() => setOpening(null)} />
    </div>
  );
}

/** The chest-opening moment: it shakes, pops open and shows exactly what was inside. */
function OpenChest({ studentId, treasureId, onClose }: { studentId: string; treasureId: string | null; onClose: () => void }) {
  const open = useStore((s) => s.openTreasure);
  const student = useStore((s) => s.data.students.find((x) => x.id === studentId));
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const [phase, setPhase] = useState<'closed' | 'open'>('closed');
  const [got, setGot] = useState<{ coins: number; itemId?: string } | null>(null);
  const def = treasureId ? TREASURES_BY_ID[treasureId] : null;
  const close = () => { setPhase('closed'); setGot(null); onClose(); };
  const doOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!def || !student) return;
    const before = student;
    const r = e.currentTarget.getBoundingClientRect();
    const chest = document.querySelector<HTMLElement>('[data-opening-chest]');
    const finish = () => {
      if (!open(studentId, def.id)) { close(); return; }
      const after = useStore.getState().data.students.find((x) => x.id === studentId);
      const t = after?.adventure?.treasures.find((x) => x.id === def.id);
      setGot({ coins: t?.coins ?? 0, itemId: t?.itemId });
      setPhase('open');
      if (sound) playChest();
      sparkle(r.left + r.width / 2, r.top - 120, ['#ffd23f', '#fff1a8', '#ffffff', '#ff8fb1']);
      void before;
    };
    if (!chest || reducedMotion()) { finish(); return; }
    createTimeline({ onComplete: finish })
      .add(chest, { rotate: [0, -8, 8, -10, 10, -6, 0], scale: [1, 1.08], duration: 700, ease: 'inOut(2)' });
  };
  const item = got?.itemId ? ITEMS_BY_ID[got.itemId] : undefined;
  return (
    <Modal open={!!def} onClose={close} label="Open treasure">
      {def && student && (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="font-display text-2xl font-bold">{def.name}</div>
          <div data-opening-chest className="h-36"><Px name={chestArt(def, phase === 'open')} alt="" className="h-full w-auto drop-shadow-[0_8px_0_rgb(14_42_82/.25)]" /></div>
          {phase === 'closed' ? (
            <>
              <p className="text-ink-soft">{def.description}</p>
              <button className="btn btn-primary px-8 py-3 text-lg" onClick={doOpen} autoFocus><Icon name="chest" size={22} />Open it, {firstName(student.name)}!</button>
            </>
          ) : (
            <>
              <div className="font-display text-xl font-bold text-leaf">{def.kind === 'relic' ? 'A keepsake for your collection!' : 'Inside you found:'}</div>
              {got && got.coins > 0 && <div className="font-display text-3xl font-extrabold text-coin">+{got.coins} coins</div>}
              {item && <div className="flex flex-col items-center gap-1"><div className="w-28"><ItemThumb item={item} speciesId={student.speciesId} stage={3} /></div><div className="font-bold">{item.name}</div><div className="text-xs text-ink-soft">Now in {firstName(student.name)}'s dressing room</div></div>}
              <button className="btn btn-light mt-2" onClick={close}>Close</button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
