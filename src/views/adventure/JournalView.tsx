import { useState } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import { journalFor, type JournalEntry, type JournalFilter } from '../../engine/adventure';
import { ITEMS_BY_ID } from '../../data/defaults';
import { useStore } from '../../store/store';
import type { Student } from '../../types';
import { EmptyNote, Px, RewardLine, StudentChip, advPath, go, treasureArt } from './common';

const FILTERS: { id: JournalFilter; label: string; icon: IconName }[] = [
  { id: 'all', label: 'Everything', icon: 'journal' },
  { id: 'quests', label: 'Quests', icon: 'scroll' },
  { id: 'regions', label: 'Regions', icon: 'map' },
  { id: 'bosses', label: 'Bosses', icon: 'swords' },
  { id: 'treasures', label: 'Treasure', icon: 'chest' },
  { id: 'milestones', label: 'Milestones', icon: 'star' },
];

const ICON: Record<JournalEntry['group'], IconName> = { quests: 'scroll', regions: 'map', bosses: 'swords', treasures: 'chest', milestones: 'star' };
const TONE: Record<JournalEntry['group'], string> = { quests: 'bg-mist text-azure-800', regions: 'bg-leaf-pale text-leaf', bosses: 'bg-brick-pale text-brick', treasures: 'bg-gilt-pale text-gilt-ink', milestones: 'bg-[#efe6fb] text-berry' };

/** One student's adventure journal: every quest, region, boss, treasure and milestone, newest first. */
export function JournalView({ student, teacher }: { student: Student; teacher: boolean }) {
  const data = useStore((s) => s.data);
  const [filter, setFilter] = useState<JournalFilter>('all');
  const entries = journalFor(data, student.id, filter);
  const days = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const k = new Date(e.at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    days.set(k, [...(days.get(k) ?? []), e]);
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <StudentChip student={student} onClear={teacher ? () => go(advPath('journal')) : undefined} />
        <span className="text-sm font-bold text-ink-soft">{journalFor(data, student.id).length} moments</span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-[15px] font-semibold transition ${filter === f.id ? 'bg-azure-700 text-white' : 'bg-white text-ink ring-1 ring-rule hover:bg-wash'}`}>
            <Icon name={f.icon} size={15} />{f.label}
          </button>
        ))}
      </div>
      {!entries.length && <EmptyNote icon="journal" title="Nothing here yet">Quests, explorations, treasure and boss battles are written down here as they happen.</EmptyNote>}
      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <div className="mb-2 font-display text-[15px] font-bold text-ink-soft">{day}</div>
          <ol className="relative flex flex-col gap-2 border-l-[3px] border-rule pl-4" data-stagger>
            {list.map((e) => (
              <li key={e.id} className="paper relative flex items-start gap-3 p-3">
                <span className="absolute -left-[26px] top-4 h-4 w-4 rounded-full border-[3px] border-white bg-azure-700" aria-hidden />
                {e.group === 'treasures' && e.kind === 'treasure'
                  ? <Px name={treasureArt(data.adventureLog.find((l) => l.id === e.id)?.ref ?? '', true)} className="h-10 w-10 shrink-0 object-contain" />
                  : <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE[e.group]}`}><Icon name={ICON[e.group]} size={20} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-tight">{e.title}{e.classWide && <span className="ml-2 chip bg-mist align-middle text-azure-800">Class</span>}</span>
                  {e.detail && <span className="block text-sm text-ink-soft">{e.detail}</span>}
                  <RewardLine xp={e.xp} coins={e.coins} itemName={e.itemId ? ITEMS_BY_ID[e.itemId]?.name : undefined} className="!text-xs" />
                </span>
                <time className="shrink-0 text-xs font-bold tabular-nums text-ink-soft">{new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
