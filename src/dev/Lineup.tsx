import { CreatureSvg } from '../creatures/CreatureSvg';
import { getSpecies } from '../data/species';
import type { Stage } from '../types';

/** Dev-only: the five stages of one species on a transparent 1600×900 board (?lineup=<id>). */
export function Lineup({ id }: { id: string }) {
  const sp = getSpecies(id);
  return (
    <div style={{ width: 1600, height: 900, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 20px 120px' }}>
      {([1, 2, 3, 4, 5] as Stage[]).map((st) => (
        <div key={st} style={{ width: 300, height: 300 + st * 40 }}>
          <CreatureSvg species={sp} stage={st} effects={false} noShadow className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}
