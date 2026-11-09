import { CreatureSvg } from '../creatures/CreatureSvg';
import { SPECIES } from '../data/species';
import { ELEMENTS } from '../data/elements';
import type { Stage } from '../types';
import { BRANCHES } from '../data/branches';

/** Dev-only contact sheet of every species at every stage: open with ?sheet (&art for the paintings, &lids to show every eyelid closed) */
export function Sheet() {
  const only = new URLSearchParams(location.search).get('sheet');
  const list = only ? SPECIES.filter((s) => s.element === only || s.id === only) : SPECIES;
  const eq = new URLSearchParams(location.search).get('eq');
  const closed = new URLSearchParams(location.search).has('lids');
  return (
    <div className="p-4 bg-white text-black">
      {list.map((s) => (
        <div key={s.id} className="flex items-center gap-2 border-b">
          <div className="w-28 text-sm font-bold">{s.name}<br /><span className="font-normal">{s.element} · {s.rarity}</span></div>
          {([1, 2, 3, 4, 5, 6] as const).filter((st) => st < 6 || BRANCHES[s.id]).map((st) => (
            <div key={st} className="w-40 h-40 rounded-xl" style={{ background: `linear-gradient(${ELEMENTS[s.element].sky[0]}, ${ELEMENTS[s.element].sky[1]})` }}>
              <CreatureSvg species={s} stage={(st === 6 ? 5 : st) as Stage} branch={st === 6 ? 'b' : undefined} effects={false} expression={closed ? 'sleepy' : undefined}
                classic={!new URLSearchParams(location.search).has('art')} equipped={eq ? Object.fromEntries(eq.split(',').map((e) => [e.split(':')[0], e.split(':')[1]])) : {}} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
