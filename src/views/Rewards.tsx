import { SectionTitle } from '../components/ui';
import { ACHIEVEMENTS, ITEMS, SLOT_ONE } from '../data/defaults';
import { getSpecies } from '../data/species';
import { useClassStudents } from '../lib/stats';
import { useCurrentClass, useStore } from '../store/store';
import type { Student } from '../types';
import { ChocoStick } from '../components/Celebrations';
import { ItemThumb } from '../components/ItemThumb';
import { unlockLabel } from '../engine/shop';
import { Glyph, Icon } from '../components/Icon';
import { timeAgo } from '../engine/util';

const SLOT_LABEL = SLOT_ONE;

export function Rewards() {
  const cls = useCurrentClass();
  const students = useClassStudents(cls?.id);
  const preview = getSpecies('lumifox');

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-5 sm:px-6">
      <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Rewards</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">Badges and collectibles unlock automatically as students earn XP.</p>

      <MilestoneRewards students={students} />
      {cls && (cls.prizeHistory?.length ?? 0) > 0 && (
        <section className="mt-6">
          <SectionTitle>Class prizes won</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {[...cls.prizeHistory].reverse().map((p, i) => (
              <span key={i} className="panel px-4 py-2 font-bold">{p.icon} {p.label} <span className="font-normal text-ink-soft">· {p.goal.toLocaleString()} XP goal · {new Date(p.at).toLocaleDateString()}</span></span>
            ))}
          </div>
        </section>
      )}
      <section className="mt-6">
        <SectionTitle>Daily & weekly quests</SectionTitle>
        <a href="#/adventure/quests" className="paper flex items-center gap-4 p-4 transition hover:bg-wash" data-press>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-azure-700/10 text-azure-800"><Icon name="scroll" size={26} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold">Challenges are now quests</span>
            <span className="block text-sm text-ink-soft">Daily, weekly and custom quests with rewards live in Adventure → Quests. Your challenges came along.</span>
          </span>
          <Icon name="arrowRight" size={20} />
        </a>
      </section>

      <section className="mt-8">
        <SectionTitle>Achievements</SectionTitle>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = students.filter((s) => s.achievements.some((x) => x.id === a.id)).length;
            return (
              <div key={a.id} className="panel flex items-center gap-3 p-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-3xl" style={{ background: `color-mix(in srgb, ${a.color} 20%, white)`, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${a.color} 45%, white)`, color: `color-mix(in srgb, ${a.color} 75%, #13253f)` }}><Glyph icon={a.icon} size={28} /></span>
                <div className="min-w-0">
                  <div className="font-display text-lg font-bold leading-tight">{a.name}</div>
                  <div className="text-[13px] text-ink-soft">{a.description}</div>
                  <div className="mt-0.5 text-[13px] font-bold text-azure-800">{got} student{got === 1 ? '' : 's'} earned this</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>Collectibles</SectionTitle>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {ITEMS.filter((i) => i.slot !== 'background').map((it) => {
            const owners = students.filter((s) => s.unlockedItems.includes(it.id)).length;
            const rule = unlockLabel(it, (id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id);
            return (
              <div key={it.id} className="paper p-2 text-center">
                <ItemThumb item={it} speciesId={preview.id} stage={3} />
                <div className="mt-1.5 font-display font-bold leading-tight">{it.name}</div>
                <div className="text-[12px] text-ink-soft">{SLOT_LABEL[it.slot]} · {rule}</div>
                <div className="text-[12px] font-bold text-azure-800">{owners} unlocked</div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

function MilestoneRewards({ students }: { students: Student[] }) {
  const setGiven = useStore((s) => s.setRewardGiven);
  const milestones = useStore((s) => s.data.settings.milestones);
  const pending = students.flatMap((s) => (s.milestoneRewards ?? []).filter((r) => !r.given).map((r) => ({ s, r }))).sort((a, b) => a.r.at - b.r.at);
  const recent = students.flatMap((s) => (s.milestoneRewards ?? []).filter((r) => r.given).map((r) => ({ s, r }))).sort((a, b) => b.r.at - a.r.at).slice(0, 6);
  return (
    <section className="mt-6">
      <SectionTitle>Milestone rewards to hand out</SectionTitle>
      <p className="-mt-2 mb-3 text-sm text-ink-soft">{milestones.map((m) => `${m.icon} ${m.label} every ${m.every} XP`).join(' · ') || 'No milestone rewards set (Settings → Rewards).'}</p>
      {pending.length === 0 ? (
        <div className="panel flex items-center gap-2 p-4 text-ink-soft"><Icon name="check" size={18} className="text-leaf" strokeWidth={2.6} />All rewards have been handed out.</div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {pending.map(({ s, r }) => (
            <div key={r.id} className="paper flex items-center gap-3 p-3">
              <ChocoStick size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-semibold">{s.name}</div>
                <div className="text-xs font-bold text-ink-soft">{r.icon} {r.label} · reached {r.atXp} XP · {timeAgo(r.at)}</div>
              </div>
              <button className="btn btn-azure !py-1.5 !text-sm" onClick={() => setGiven(s.id, r.id, true)}><Icon name="check" size={16} strokeWidth={2.6} />Given</button>
            </div>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-soft">
          Recently handed out: {recent.map(({ s, r }) => (
            <button key={r.id} className="chip bg-white text-ink ring-1 ring-rule hover:bg-wash" title="Mark as not handed out" onClick={() => setGiven(s.id, r.id, false)}>{r.icon} {s.name.split(' ')[0]} <Icon name="undo" size={12} strokeWidth={2.4} /></button>
          ))}
        </div>
      )}
    </section>
  );
}
