import { useLayoutEffect, useRef } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import { slidePill } from '../../lib/motion';
import { useCurrentClass, useStore } from '../../store/store';
import type { RegionId } from '../../types';
import { BossView } from './BossView';
import { ClassWorldView } from './ClassWorldView';
import { ApMeter, EmptyNote, StudentChip, StudentPicker, advPath, go, useClassStudentsSorted, useIsTeacher } from './common';
import { ControlCenter } from './ControlCenter';
import { JournalView } from './JournalView';
import { QuestsView } from './QuestsView';
import { RegionView } from './RegionView';
import { TreasureView } from './TreasureView';
import { WorldMap } from './WorldMap';

const TABS: { id: string; label: string; icon: IconName; teacherOnly?: boolean; world?: boolean }[] = [
  { id: 'map', label: 'World Map', icon: 'map' },
  { id: 'quests', label: 'Quests', icon: 'scroll' },
  { id: 'boss', label: 'Boss Battle', icon: 'swords' },
  { id: 'treasure', label: 'Treasures', icon: 'chest' },
  { id: 'journal', label: 'Journal', icon: 'journal' },
  { id: 'world', label: 'Class World', icon: 'castle', world: true },
  { id: 'control', label: 'Control Center', icon: 'compass', teacherOnly: true },
];

/** The World of Adventures section: world map, quests, boss battles, treasure, journal, class world. */
export function Adventure({ tab, id, query }: { tab: string; id?: string; query: Record<string, string> }) {
  const teacher = useIsTeacher();
  const cls = useCurrentClass();
  const settings = useStore((s) => s.data.settings);
  const students = useClassStudentsSorted();
  const student = students.find((s) => s.id === query.student) ?? null;
  const row = useRef<HTMLDivElement>(null);
  const tabs = TABS.filter((t) => (!t.teacherOnly || teacher) && (!t.world || settings.classWorld));
  const current = tab === 'region' ? 'map' : tabs.some((t) => t.id === tab) ? tab : 'map';
  useLayoutEffect(() => slidePill(row.current), [current]);

  if (!cls) return <div className="mx-auto max-w-3xl px-4 pt-8"><EmptyNote icon="map" title="Create a class first">The adventure begins once your class is set up.</EmptyNote></div>;
  if (!settings.adventureEnabled) return <div className="mx-auto max-w-3xl px-4 pt-8"><EmptyNote icon="map" title="World of Adventures is switched off">{teacher ? 'Turn it on in Settings → Adventure.' : 'Ask your teacher to turn it on.'}</EmptyNote></div>;

  // pages that belong to one student need to know who
  const needsStudent = current === 'treasure' || current === 'journal' || (current === 'quests' && !teacher);
  const pick = (sid: string) => go(advPath(tab === 'region' ? 'region' : current, tab === 'region' ? id : undefined, sid));

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="on-sky font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">World of Adventures</h1>
          <p className="on-sky mt-1 text-[15px] font-semibold text-ink-soft">{cls.name}: explore, complete quests, find treasure and befriend bosses together.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {student && (current === 'map' || current === 'boss' || current === 'world' || current === 'control') && <StudentChip student={student} onClear={() => go(advPath(current))} />}
          <ApMeter classId={cls.id} />
        </div>
      </div>

      <div ref={row} className="relative mt-4 flex gap-1 overflow-x-auto rounded-full bg-white/80 p-1 shadow-[0_2px_0_rgb(14_42_82/.12)] ring-1 ring-rule backdrop-blur scroll-thin" role="tablist" aria-label="Adventure">
        <span data-pill className="pointer-events-none absolute left-0 top-0 rounded-full bg-azure-700 shadow-[0_6px_14px_-6px_rgb(27_79_151/.9)]" aria-hidden />
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={current === t.id} onClick={() => go(advPath(t.id, undefined, student?.id))}
            className={`relative z-[1] flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 font-display text-[15px] font-semibold transition-colors ${current === t.id ? 'text-white' : 'text-ink hover:text-azure-800'}`}>
            <Icon name={t.icon} size={17} />{t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {needsStudent && !student ? (
          <StudentPicker students={students} value={null} onChange={pick} prompt={teacher ? `Whose ${current === 'treasure' ? 'treasure' : current === 'journal' ? 'journal' : 'quests'} would you like to see?` : 'Who are you? Tap your creature.'} />
        ) : tab === 'region' && id ? (
          <RegionView classId={cls.id} regionId={id as RegionId} student={student} />
        ) : current === 'map' ? (
          <WorldMap classId={cls.id} student={student?.id ?? null} />
        ) : current === 'quests' ? (
          <QuestsView classId={cls.id} student={student} teacher={teacher} />
        ) : current === 'boss' ? (
          <BossView classId={cls.id} teacher={teacher} preselect={query.start} />
        ) : current === 'treasure' && student ? (
          <TreasureView student={student} teacher={teacher} />
        ) : current === 'journal' && student ? (
          <JournalView student={student} teacher={teacher} />
        ) : current === 'world' ? (
          <ClassWorldView classId={cls.id} teacher={teacher} />
        ) : current === 'control' && teacher ? (
          <ControlCenter classId={cls.id} />
        ) : null}
      </div>
    </div>
  );
}
