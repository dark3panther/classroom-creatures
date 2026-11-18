import { useEffect, useRef, type ReactNode } from 'react';
import { ADVENTURE_ART, REGIONS_BY_ID, TREASURES_BY_ID, type TreasureDef } from '../../data/adventure';
import { getSpecies } from '../../data/species';
import { CreatureSvg } from '../../creatures/CreatureSvg';
import { Icon } from '../../components/Icon';
import { adventurePoints } from '../../engine/adventure';
import { displayStage } from '../../engine/progression';
import { firstName } from '../../engine/util';
import { navigate } from '../../lib/router';
import { animate, reducedMotion } from '../../lib/motion';
import { useCurrentClass, useStore } from '../../store/store';
import type { RegionId, Student } from '../../types';

/** A pixel-art image from public/adventure/, drawn crisp at any size. */
export function Px({ name, alt = '', className = '', style }: { name: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  return <img src={`${ADVENTURE_ART}${name}.png`} alt={alt} draggable={false} className={`pixel ${className}`} style={style} loading="lazy" decoding="async" />;
}

export const regionName = (id: RegionId) => REGIONS_BY_ID[id]?.name ?? id;

/** Which chest picture a treasure uses. */
export function chestArt(def: TreasureDef, open: boolean): string {
  if (def.kind === 'relic') return `relic-${def.regionId}`;
  const kind = def.kind === 'coins' ? 'coins' : def.kind === 'cosmetic' ? 'cosmetic' : def.kind === 'accessory' ? 'accessory' : 'special';
  return `chest-${kind}${open ? '-open' : ''}`;
}
export const treasureArt = (id: string, open: boolean) => { const d = TREASURES_BY_ID[id]; return d ? chestArt(d, open) : 'chest-coins'; };

/** Whether the teacher is in charge (controls unlocked) or a student is using the kiosk. */
export function useIsTeacher(): boolean {
  return useStore((s) => !s.locked);
}

/** Link to another adventure page, keeping the chosen student. */
export function advPath(tab: string, id?: string, student?: string | null): string {
  return `/adventure/${tab}${id ? `/${id}` : ''}${student ? `?student=${student}` : ''}`;
}

/** The class's adventure points, with what they need for the next region. */
export function ApMeter({ classId, compact }: { classId: string; compact?: boolean }) {
  const data = useStore((s) => s.data);
  const ap = adventurePoints(data, classId);
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(ap.total);
  useEffect(() => {
    if (prev.current !== ap.total && ref.current && !reducedMotion()) animate(ref.current, { scale: [1.35, 1], duration: 600, ease: 'out(3)' });
    prev.current = ap.total;
  }, [ap.total]);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-white/90 font-display font-bold text-ink shadow-[0_2px_0_rgb(14_42_82/.2)] ring-1 ring-rule ${compact ? 'px-3 py-1 text-sm' : 'px-4 py-1.5 text-base'}`}
      title={`Adventure points: the class average of XP earned and quests completed, plus ${20} for every boss befriended`}>
      <Icon name="compass" size={compact ? 16 : 18} className="text-azure-700" />
      <span ref={ref} className="tabular-nums">{ap.total}</span>
      <span className="font-semibold text-ink-soft">adventure points</span>
    </span>
  );
}

/** Choose whose adventure to look at (teacher), or "who are you?" (kiosk). */
export function StudentPicker({ students, value, onChange, prompt }: { students: Student[]; value: string | null; onChange: (id: string) => void; prompt: string }) {
  const settings = useStore((s) => s.data.settings);
  return (
    <div className="paper p-4">
      <div className="mb-3 font-display text-lg font-bold">{prompt}</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2" data-stagger>
        {students.map((s) => (
          <button key={s.id} onClick={() => onChange(s.id)} aria-pressed={value === s.id} aria-label={s.name} data-press
            className={`flex flex-col items-center gap-1 rounded-2xl p-2 transition ${value === s.id ? 'bg-gilt-pale ring-2 ring-gilt' : 'bg-wash ring-1 ring-rule hover:bg-mist'}`}>
            <span className="h-14 w-14"><CreatureSvg species={getSpecies(s.speciesId)} stage={displayStage(s, settings)} branch={s.branch} equipped={s.equipped} effects={false} className="h-full w-full" /></span>
            <span className="max-w-full truncate text-sm font-bold">{firstName(s.name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Small "who" chip with the student's creature. */
export function StudentChip({ student, onClear }: { student: Student; onClear?: () => void }) {
  const settings = useStore((s) => s.data.settings);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 font-bold shadow-[0_2px_0_rgb(14_42_82/.15)] ring-1 ring-rule">
      <span className="h-8 w-8"><CreatureSvg species={getSpecies(student.speciesId)} stage={displayStage(student, settings)} branch={student.branch} equipped={student.equipped} effects={false} className="h-full w-full" /></span>
      {firstName(student.name)}
      {onClear && <button className="-mr-1 grid h-6 w-6 place-items-center rounded-full text-ink-soft hover:bg-wash" onClick={onClear} aria-label="Choose someone else"><Icon name="close" size={14} strokeWidth={2.6} /></button>}
    </span>
  );
}

/** XP / coins / item reward line. */
export function RewardLine({ xp, coins, itemName, className = '' }: { xp?: number; coins?: number; itemName?: string; className?: string }) {
  const parts: ReactNode[] = [];
  if (xp) parts.push(<span key="xp" className="tabular-nums">+{xp} XP</span>);
  if (coins) parts.push(<span key="c" className="tabular-nums">+{coins} coins</span>);
  if (itemName) parts.push(<span key="i">{itemName}</span>);
  if (!parts.length) return null;
  return <span className={`inline-flex flex-wrap items-center gap-x-2 text-sm font-bold text-coin ${className}`}>{parts.map((p, i) => <span key={i} className="inline-flex items-center gap-2">{i > 0 && <span aria-hidden className="text-ink-soft/50">·</span>}{p}</span>)}</span>;
}

export function useClassStudentsSorted(): Student[] {
  const cls = useCurrentClass();
  const all = useStore((s) => s.data.students);
  return all.filter((s) => s.classId === cls?.id).sort((a, b) => a.name.localeCompare(b.name));
}

/** Format a duration left, e.g. "2 days 3 h" / "45 min". */
export function timeLeft(ms: number): string {
  if (ms <= 0) return 'time is up';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min left`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ${h % 24} h left`;
}

export function EmptyNote({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children?: ReactNode }) {
  return (
    <div className="paper flex flex-col items-center gap-2 p-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mist text-azure-800"><Icon name={icon} size={28} /></span>
      <div className="font-display text-xl font-bold">{title}</div>
      {children && <div className="max-w-md text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export const go = navigate;
