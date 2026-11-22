import { BossArt, type BossMood } from '../creatures/bosses/BossArt';
import { BOSSES } from '../data/adventure';

/** Dev-only sheet of every boss in every mood: open with ?bosses (or ?bosses=<id>). */
export function BossSheet() {
  const only = new URLSearchParams(location.search).get('bosses');
  const list = only ? BOSSES.filter((b) => b.id === only) : BOSSES;
  const moods: BossMood[] = ['grumpy', 'hurt', 'attack', 'happy'];
  return (
    <div className="bg-white p-3 text-black" data-boss-sheet>
      {list.map((b) => (
        <div key={b.id} className="flex items-center gap-2 border-b py-1">
          <div className="w-28 text-sm font-bold">{b.name}</div>
          {moods.map((m) => <div key={m} className="h-44 w-44" style={{ background: `linear-gradient(${b.colors[0]}33, ${b.colors[1]}44)` }}><BossArt id={b.id} mood={m} still /></div>)}
        </div>
      ))}
    </div>
  );
}
