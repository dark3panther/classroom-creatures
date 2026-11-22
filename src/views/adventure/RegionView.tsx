import { BossPortrait } from '../../creatures/bosses/BossPortrait';
import { BOSSES_BY_ID, REGIONS_BY_ID, TREASURES } from '../../data/adventure';
import { BOSSES } from '../../data/adventure';
import { ITEMS_BY_ID as ITEMS_LOOKUP } from '../../data/defaults';
import { SPECIES } from '../../data/species';
import { CreatureSvg } from '../../creatures/CreatureSvg';
import { Icon } from '../../components/Icon';
import { ProgressBar } from '../../components/ui';
import { questBoard, regionCompletion, regionStates, treasureState } from '../../engine/adventure';
import { firstName } from '../../engine/util';
import { useStore } from '../../store/store';
import type { RegionId, Student } from '../../types';
import { EmptyNote, Px, RewardLine, advPath, chestArt, go, useIsTeacher } from './common';
import { QUEST_STATE_TEXT } from './QuestsView';

/** One region: its place, what it needs, its quests, treasure, creatures and boss. */
export function RegionView({ classId, regionId, student }: { classId: string; regionId: RegionId; student: Student | null }) {
  const data = useStore((s) => s.data);
  const visit = useStore((s) => s.visitRegion);
  const teacher = useIsTeacher();
  const region = REGIONS_BY_ID[regionId];
  if (!region) return <EmptyNote icon="map" title="That region does not exist" />;
  const st = regionStates(data, classId)[regionId];
  const classStudents = data.students.filter((s) => s.classId === classId);
  const boss = BOSSES_BY_ID[region.bossId];
  const befriended = data.bosses.filter((b) => b.classId === classId && b.bossId === boss.id && b.status === 'won').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];
  const live = data.bosses.find((b) => b.classId === classId && b.bossId === boss.id && (b.status === 'active' || b.status === 'paused'));
  const comp = student ? regionCompletion(data, student, regionId) : null;
  const visited = student?.adventure?.visited.some((v) => v.regionId === regionId);
  const explorers = classStudents.filter((s) => s.adventure?.visited.some((v) => v.regionId === regionId)).length;
  const quests = data.quests.filter((q) => q.regionId === regionId && !q.deleted && q.active && (q.classId === null || q.classId === classId));
  const board = student ? questBoard(data, student).filter((v) => v.quest.regionId === regionId) : [];
  const disc = new Set(data.classes.find((c) => c.id === classId)?.discovered ?? []);
  const species = SPECIES.filter((sp) => region.elements.includes(sp.element));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button className="btn btn-light !py-1.5 !text-sm" onClick={() => go(advPath('map', undefined, student?.id))}><Icon name="back" size={16} />World map</button>
      </div>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="paper p-2">
          <div className="relative">
            <Px name={`region-${regionId}`} alt={`${region.name}: ${region.description}`} className={`adv-scene ${st.open ? '' : 'grayscale-[.7]'}`} />
            {!st.open && <div className="absolute inset-0 grid place-items-center rounded-[14px] bg-white/45"><span className="flex items-center gap-2 rounded-full bg-ink/85 px-4 py-2 font-display text-lg font-bold text-white"><Icon name="lock" size={18} />{st.why === 'teacher-locked' ? 'Closed by your teacher' : `Opens at ${st.need} adventure points`}</span></div>}
          </div>
        </div>
        <div className="paper flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <Px name={`isle-${regionId}`} className="w-24 shrink-0" />
            <div>
              <h2 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.01em]">{region.name}</h2>
              <div className="font-bold text-ink-soft">{region.tagline}</div>
            </div>
          </div>
          <p className="text-[15px] leading-relaxed">{region.description}</p>
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <span className={`chip ${st.open ? 'bg-leaf-pale text-leaf' : 'bg-mist text-ink-soft'}`}>{st.open ? (st.why === 'teacher-open' ? 'Opened by your teacher' : 'Open') : 'Locked'}</span>
            {regionId !== 'verdant' && <span className="chip bg-mist text-azure-800">Needs {st.need} adventure points · class has {st.ap}</span>}
            <span className="chip bg-mist text-azure-800">{explorers}/{classStudents.length} explored</span>
          </div>
          {comp && (
            <div className="rounded-2xl bg-wash p-3 ring-1 ring-rule">
              <div className="flex items-center justify-between text-sm font-bold"><span>{firstName(student!.name)}'s progress here</span><span className="tabular-nums">{Math.round(comp.pct * 100)}%</span></div>
              <ProgressBar pct={comp.pct} className="mt-1.5" />
              <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs font-bold text-ink-soft">
                <span>Quests {comp.quests[0]}/{comp.quests[1]}</span><span>Treasure {comp.treasures[0]}/{comp.treasures[1]}</span><span>Creatures found {comp.creatures[0]}/{comp.creatures[1]}</span>
              </div>
            </div>
          )}
          {st.open && (
            <div className="flex flex-wrap gap-2">
              {student && (visited
                ? <span className="chip bg-gilt-pale py-1.5 text-gilt-ink"><Icon name="check" size={14} strokeWidth={2.6} />{firstName(student.name)} explored {region.landmark}</span>
                : <button className="btn btn-primary" data-spark onClick={() => visit([student.id], regionId)}><Icon name="compass" size={18} />Explore {region.name}</button>)}
              {teacher && explorers < classStudents.length && (
                <button className="btn btn-azure" onClick={() => visit(classStudents.filter((s) => !s.adventure?.visited.some((v) => v.regionId === regionId)).map((s) => s.id), regionId)}><Icon name="people" size={18} />Explore together (whole class)</button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="paper p-5">
          <h3 className="mb-3 font-display text-xl font-bold">The boss of {region.name}</h3>
          <div className="flex items-center gap-4">
            <span className="w-28 shrink-0 idle-bob"><BossPortrait id={boss.id} friend={!!befriended} title={boss.name} /></span>
            <div className="min-w-0">
              <div className="font-display text-2xl font-bold">{boss.name}</div>
              <div className="text-sm font-bold text-ink-soft">{boss.theme}</div>
              <p className="mt-1 text-sm">{befriended ? boss.friendly : boss.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {befriended && <span className="chip bg-leaf-pale text-leaf">Befriended {new Date(befriended.endedAt ?? befriended.startedAt).toLocaleDateString()}</span>}
                {live && <button className="btn btn-primary !py-1.5 !text-sm" onClick={() => go(advPath('boss', undefined, student?.id))}><Icon name="swords" size={16} />Battle on now</button>}
                {!live && teacher && st.open && <button className="btn btn-light !py-1.5 !text-sm" onClick={() => go(`/adventure/boss?start=${boss.id}`)}>Start a battle</button>}
              </div>
            </div>
          </div>
          {BOSSES.filter((b) => b.regionId === regionId && b.wandering).map((w) => (
            <div key={w.id} className="mt-4 flex items-center gap-3 border-t border-rule pt-3">
              <span className="w-16 shrink-0"><BossPortrait id={w.id} still title={w.name} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">Also wandering here: {w.name}</div>
                <p className="text-[13px] text-ink-soft">{w.description}</p>
              </div>
              {!live && teacher && st.open && <button className="btn btn-light !py-1.5 !text-sm" onClick={() => go(`/adventure/boss?start=${w.id}`)}>Battle</button>}
            </div>
          ))}
        </div>

        <div className="paper p-5">
          <h3 className="mb-3 font-display text-xl font-bold">Treasure</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TREASURES.filter((t) => t.regionId === regionId).map((t) => {
              const ts = student ? treasureState(data, student, t) : null;
              const item = t.itemId ? ITEMS_LOOKUP[t.itemId]?.name : undefined;
              return (
                <button key={t.id} className="flex flex-col items-center gap-1 rounded-2xl bg-wash p-2 text-center ring-1 ring-rule transition hover:bg-mist" onClick={() => go(advPath('treasure', undefined, student?.id))} data-press>
                  <Px name={chestArt(t, ts?.state === 'opened')} className={`adv-chest w-14 ${ts?.state === 'ready' ? 'ready' : ''} ${ts && ts.state === 'locked' ? 'opacity-70' : ''}`} />
                  <span className="text-[13px] font-bold leading-tight">{t.name}</span>
                  <RewardLine coins={t.itemId ? undefined : t.coins} itemName={item} className="!text-[11px]" />
                  {ts && <span className="text-[11px] font-bold text-ink-soft">{ts.state === 'opened' ? 'Opened' : ts.state === 'ready' ? 'Ready to open!' : `${ts.value}/${ts.target}`}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="paper p-5">
          <h3 className="mb-3 font-display text-xl font-bold">Quests in {region.name}</h3>
          {!quests.length && <p className="text-sm text-ink-soft">No quests here yet.{teacher ? ' Add one on the Quests page.' : ''}</p>}
          <ul className="flex flex-col gap-2">
            {(student ? board.map((v) => ({ q: v.quest, state: v.state })) : quests.map((q) => ({ q, state: null }))).map(({ q, state }) => (
              <li key={q.id} className="flex items-center gap-3 rounded-2xl bg-wash p-3 ring-1 ring-rule">
                <Icon name={q.kind === 'daily' ? 'sun' : q.kind === 'weekly' ? 'calendar' : 'scroll'} size={18} className="shrink-0 text-azure-700" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{q.title}</span>
                  <RewardLine xp={q.reward.xp} coins={q.reward.coins} itemName={q.reward.itemId ? ITEMS_LOOKUP[q.reward.itemId]?.name : undefined} className="!text-xs" />
                </span>
                {state && <span className="text-xs font-bold text-ink-soft">{QUEST_STATE_TEXT[state]}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="paper p-5">
          <h3 className="mb-1 font-display text-xl font-bold">Creatures of {region.name}</h3>
          <p className="mb-3 text-sm text-ink-soft">{region.elements.map((e) => e[0].toUpperCase() + e.slice(1)).join(' and ')} creatures grow up here. Coloured ones are already in your class field guide.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
            {species.map((sp) => {
              const found = [1, 2, 3, 4, 5].some((stg) => disc.has(`${sp.id}-${stg}`));
              return (
                <span key={sp.id} className="flex flex-col items-center gap-0.5 text-center" title={found ? sp.name : 'Not discovered yet'}>
                  <span className="h-14 w-14" style={found ? undefined : { filter: 'brightness(0) opacity(.18)' }}><CreatureSvg species={sp} stage={1} effects={false} className="h-full w-full" /></span>
                  <span className="text-[11px] font-bold leading-tight text-ink-soft">{found ? sp.name : '?'}</span>
                </span>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
