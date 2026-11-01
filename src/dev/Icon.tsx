import { CreatureSvg } from '../creatures/CreatureSvg';
import { getSpecies } from '../data/species';

/** Dev-only app icon artboard (1024×1024): open with ?icon and screenshot. */
export function Icon() {
  return (
    <div style={{ width: 1024, height: 1024, display: 'grid', placeItems: 'center', background: 'transparent' }}>
      <div style={{ width: 824, height: 824, borderRadius: 185, overflow: 'hidden', position: 'relative',
        background: 'radial-gradient(120% 100% at 50% 0%, #7c5cff 0%, #3b2a7a 55%, #1b1240 100%)', boxShadow: 'inset 0 0 0 6px rgb(255 255 255 / .12)' }}>
        <div style={{ position: 'absolute', left: '50%', top: '56%', width: 700, height: 700, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgb(255 201 59 / .55), transparent 65%)' }} />
        <div style={{ position: 'absolute', left: -40, right: -40, top: -150, bottom: -10 }}>
          <CreatureSvg species={getSpecies('emberpup')} stage={3} expression="happy" effects={false} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
