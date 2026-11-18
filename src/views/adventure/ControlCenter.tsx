import { useState } from 'react';
import { BOSSES_BY_ID, REGIONS, TREASURES } from '../../data/adventure';
import { Icon, type IconName } from '../../components/Icon';
import { ProgressBar, SectionTitle } from '../../components/ui';
import {
  adventurePoints, battleTotal, classHistory, contributionsByStudent, currentBattle, isAssigned, questPeriod, regionStates, treasureState,
  type JournalFilter,
} from '../../engine/adventure';
import { firstName, timeAgo } from '../../engine/util';
import { useStore } from '../../store/store';
import type { RegionId } from '../../types';
import { Px, StudentChip, advPath, go } from './common';

/**
 * The teacher's Adventure Control Center: everything at a glance and the quick actions.
 * Teacher only (the whole Adventure section hides it while controls are locked, and the engine refuses
 * every teacher action from a student).
 */
export function ControlCenter({ classId }: { classId: string }) {
  const data = useStore((s) => s.data);
  const approveAll = useStore((s) => s.approveAllQuests);
  const collectAll = useStore((s) => s.collectAllQuests);
  const setRegion = useStore((s) => s.setRegion);
  const updateSettings = useStore((s) => s.updateSettings);
  const [hist, setHist] = useState<JournalFilter>('all');
  const students = data.students.filter((s) => s.classId === classId);
  const ap = adventurePoints(data, classId);
  const regions = regionStates(data, classId);
  const battle = currentBattle(data, classId);
  const waiting = data.questRecords.filter((r) => r.classId === classId && r.status === 'submitted').length;
  const toCollect = data.questRecords.filter((r) => r.classId === classId && r.status === 'approved').length;
  const now = Date.now();
  const live = data.quests.filter((q) => !q.deleted && q.active && (q.classId === null || q.classId === classId) && regions[q.regionId]?.open);
  const readyChests = students.reduce((n, s) => n + TREASURES.filter((t) => treasureState(data, s, t).state === 'ready').length, 0);
  const openedChests = students.reduce((n, s) => n + (s.adventure?.treasures.length ?? 0), 0);
  const nextRegion = REGIONS.find((r) => !regions[r.id].open && regions[r.id].why !== 'teacher-locked');

  const stats: { icon: IconName; label: string; value: string; sub?: string; to?: string }[] = [
    { icon: 'compass', label: 'Adventure points', value: String(ap.total), sub: nextRegion ? `${nextRegion.name} at ${nextRegion.unlockAp}` : 'Every region reached' },
    { icon: 'map', label: 'Regions open', value: `${REGIONS.filter((r) => regions[r.id].open).length}/6`, to: advPath('map') },
    { icon: 'scroll', label: 'Active quests', value: String(live.length), sub: waiting ? `${waiting} waiting for you` : 'Nothing waiting', to: advPath('quests') },
    { icon: 'swords', label: 'Boss battle', value: battle ? `${battleTotal(battle)}/${battle.hp}` : 'None', sub: battle ? BOSSES_BY_ID[battle.bossId]?.name : `${ap.bosses} befriended`, to: advPath('boss') },
    { icon: 'chest', label: 'Treasure', value: String(openedChests), sub: `${readyChests} chest${readyChests === 1 ? '' : 's'} ready to open`, to: advPath('treasure') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-stagger>
        {stats.map((s) => (
          <button key={s.label} className="paper flex items-center gap-3 p-4 text-left transition hover:bg-wash disabled:hover:bg-white" disabled={!s.to} onClick={() => s.to && go(s.to)} data-press>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mist text-azure-800"><Icon name={s.icon} size={22} /></span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wide text-ink-soft">{s.label}</span>
              <span className="block font-display text-2xl font-extrabold tabular-nums leading-tight">{s.value}</span>
              {s.sub && <span className="block truncate text-xs font-bold text-ink-soft">{s.sub}</span>}
            </span>
          </button>
        ))}
      </div>

      <section>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-buy" disabled={!waiting} onClick={() => approveAll(classId)}><Icon name="check" size={18} strokeWidth={2.6} />Approve all handed-in quests{waiting ? ` (${waiting})` : ''}</button>
          <button className="btn btn-primary" disabled={!toCollect} onClick={() => collectAll(classId)}><Icon name="gift" size={18} />Hand out approved rewards{toCollect ? ` (${toCollect})` : ''}</button>
          <button className="btn btn-azure" onClick={() => go('/adventure/quests')}><Icon name="plus" size={18} />New quest</button>
          <button className="btn btn-light" onClick={() => go(advPath('boss'))}><Icon name="swords" size={18} />{battle ? 'Go to the battle' : 'Start a boss battle'}</button>
          <button className="btn btn-light" onClick={() => go(advPath('world'))}><Icon name="castle" size={18} />Build in the class world</button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="paper p-5">
          <h3 className="mb-1 font-display text-xl font-bold">Regions</h3>
          <p className="mb-3 text-sm text-ink-soft">Regions open by themselves at their adventure points. You can open one early or close one for now.</p>
          <ul className="flex flex-col gap-2">
            {REGIONS.map((r) => {
              const st = regions[r.id];
              const mode = data.classes.find((c) => c.id === classId)?.adventure?.regions[r.id] ?? 'auto';
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-wash p-2 ring-1 ring-rule">
                  <Px name={`isle-${r.id}`} className={`w-14 ${st.open ? '' : 'grayscale'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{r.name}</span>
                    <span className="block text-xs font-bold text-ink-soft">{st.open ? 'Open' : 'Locked'} · {r.id === 'verdant' ? 'always open' : `${r.unlockAp} points`}</span>
                  </span>
                  {r.id !== 'verdant' && (
                    <span className="flex overflow-hidden rounded-full ring-1 ring-rule" role="radiogroup" aria-label={`${r.name} access`}>
                      {(['auto', 'open', 'locked'] as const).map((m) => (
                        <button key={m} role="radio" aria-checked={mode === m} onClick={() => setRegion(classId, r.id as RegionId, m)}
                          className={`px-3 py-1 text-xs font-bold ${mode === m ? 'bg-azure-700 text-white' : 'bg-white text-ink hover:bg-wash'}`}>
                          {m === 'auto' ? 'By points' : m === 'open' ? 'Open' : 'Closed'}
                        </button>
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="paper p-5">
          <h3 className="mb-3 font-display text-xl font-bold">Quest completion</h3>
          <ul className="flex flex-col gap-2">
            {live.slice(0, 10).map((q) => {
              const assigned = students.filter((s) => isAssigned(q, s));
              const period = questPeriod(q, now);
              const done = data.questRecords.filter((r) => r.questId === q.id && r.period === period && (r.status === 'approved' || r.status === 'collected') && assigned.some((s) => s.id === r.studentId)).length;
              return (
                <li key={q.id}>
                  <div className="flex justify-between gap-2 text-sm font-bold"><span className="truncate">{q.title}</span><span className="shrink-0 tabular-nums text-ink-soft">{done}/{assigned.length}</span></div>
                  <ProgressBar pct={assigned.length ? done / assigned.length : 0} height={7} className="mt-1" />
                </li>
              );
            })}
            {!live.length && <li className="text-sm text-ink-soft">No active quests in open regions.</li>}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="paper p-5">
          <h3 className="mb-3 font-display text-xl font-bold">Who is helping the boss</h3>
          {battle ? (
            <div className="flex flex-wrap gap-2">
              {[...contributionsByStudent(battle).entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => { const st = students.find((s) => s.id === id); return st ? <span key={id} className="flex items-center gap-1"><StudentChip student={st} /><span className="text-xs font-bold tabular-nums text-coin">+{n}</span></span> : null; })}
              {!battle.contributions.length && <span className="text-sm text-ink-soft">No points yet.</span>}
            </div>
          ) : <p className="text-sm text-ink-soft">Start a battle to see contributions here.</p>}
          <h3 className="mb-2 mt-5 font-display text-xl font-bold">Students with treasure waiting</h3>
          <div className="flex flex-wrap gap-2">
            {students.map((s) => ({ s, n: TREASURES.filter((t) => treasureState(data, s, t).state === 'ready').length })).filter((x) => x.n).map(({ s, n }) => (
              <button key={s.id} className="flex items-center gap-1" onClick={() => go(advPath('treasure', undefined, s.id))}><StudentChip student={s} /><span className="text-xs font-bold text-gilt-deep">{n}</span></button>
            ))}
            {!readyChests && <span className="text-sm text-ink-soft">No chests waiting.</span>}
          </div>
        </section>

        <section className="paper p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-bold">Adventure history</h3>
            <select className="input !w-auto !py-1 text-sm" value={hist} onChange={(e) => setHist(e.target.value as JournalFilter)} aria-label="Show">
              <option value="all">Everything</option><option value="quests">Quests</option><option value="regions">Regions</option><option value="bosses">Bosses</option><option value="treasures">Treasure</option><option value="milestones">Milestones</option>
            </select>
          </div>
          <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1 text-sm scroll-thin">
            {classHistory(data, classId, hist, 80).map((e) => (
              <li key={e.id} className="flex justify-between gap-3"><span className="min-w-0">{e.title}</span><time className="shrink-0 text-xs font-bold text-ink-soft">{timeAgo(e.at)}</time></li>
            ))}
            {!classHistory(data, classId, hist, 1).length && <li className="text-ink-soft">Nothing yet.</li>}
          </ul>
        </section>
      </div>

      <section className="paper flex flex-wrap items-center gap-4 p-5">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold">Settings</span>
          <span className="block text-sm text-ink-soft">{students.length} students · {firstName(students[0]?.name ?? '')}{students.length > 1 ? ' and the rest of the class' : ''} can use Adventure from Presentation Mode while your controls are locked.</span>
        </span>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={data.settings.adventureWhileLocked} onChange={(e) => updateSettings({ adventureWhileLocked: e.target.checked })} />Students may use Adventure</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={data.settings.classWorld} onChange={(e) => updateSettings({ classWorld: e.target.checked })} />Shared class world</label>
      </section>
    </div>
  );
}
