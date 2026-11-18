import { useEffect, useRef, useState } from 'react';
import { BOSSES, BOSSES_BY_ID, DIFFICULTY, DURATIONS, REGIONS_BY_ID, suggestedHp, type BossDef } from '../../data/adventure';
import { Icon } from '../../components/Icon';
import { Modal, SectionTitle } from '../../components/ui';
import { playBossHit } from '../../audio/sfx';
import { battleRemaining, battleTimeLeft, battleTotal, contributionsByStudent, currentBattle, regionStates } from '../../engine/adventure';
import { firstName } from '../../engine/util';
import { animate, createTimeline, reducedMotion } from '../../lib/motion';
import { useStore } from '../../store/store';
import type { BossBattle } from '../../types';
import { EmptyNote, Px, RewardLine, StudentChip, timeLeft } from './common';

/** Cooperative boss battles: the whole class calms a grumpy boss with approved activity. */
export function BossView({ classId, teacher, preselect }: { classId: string; teacher: boolean; preselect?: string }) {
  const data = useStore((s) => s.data);
  const battle = currentBattle(data, classId);
  const [setup, setSetup] = useState<BossDef | null>(() => (preselect && teacher ? BOSSES_BY_ID[preselect] ?? null : null));
  const past = data.bosses.filter((b) => b.classId === classId && (b.status === 'won' || b.status === 'ended')).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
  const regions = regionStates(data, classId);
  return (
    <div className="flex flex-col gap-6">
      {battle ? <Battle battle={battle} teacher={teacher} /> : (
        <EmptyNote icon="swords" title="No boss battle right now">
          {teacher ? 'Pick a boss below to start a class battle. Every point you award and every approved quest calms it down.' : 'When your teacher starts a battle, everyone works together to befriend the boss.'}
        </EmptyNote>
      )}

      <section>
        <SectionTitle>Bosses of the world</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-stagger>
          {BOSSES.map((b) => {
            const open = regions[b.regionId]?.open;
            const friend = past.some((p) => p.bossId === b.id && p.status === 'won');
            return (
              <div key={b.id} className={`paper flex gap-3 p-4 ${open ? '' : 'opacity-70'}`}>
                <Px name={`boss-${b.id}${friend ? '-friend' : ''}`} alt={b.name} className={`w-24 shrink-0 self-center ${open ? '' : 'grayscale'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-bold leading-tight">{b.name}</div>
                  <div className="text-xs font-bold text-ink-soft">{REGIONS_BY_ID[b.regionId].name} · <span style={{ color: DIFFICULTY[b.difficulty].color }}>{DIFFICULTY[b.difficulty].label}</span></div>
                  <p className="mt-1 text-[13px] leading-snug">{friend ? b.friendly : b.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {friend && <span className="chip bg-leaf-pale text-leaf">Class friend</span>}
                    {!open && <span className="chip bg-mist text-ink-soft"><Icon name="lock" size={12} />{REGIONS_BY_ID[b.regionId].name} is locked</span>}
                    {teacher && open && !battle && <button className="btn btn-primary !py-1.5 !text-sm" onClick={() => setSetup(b)}><Icon name="swords" size={16} />Start battle</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <SectionTitle>Past battles</SectionTitle>
          <ul className="flex flex-col gap-2">
            {past.slice(0, 8).map((b) => (
              <li key={b.id} className="paper flex items-center gap-3 p-3">
                <Px name={`boss-${b.bossId}${b.status === 'won' ? '-friend' : ''}`} className="w-12" />
                <span className="flex-1 font-bold">{BOSSES_BY_ID[b.bossId]?.name} <span className="font-normal text-ink-soft">· {b.status === 'won' ? 'became a friend' : 'went home to rest'} · {battleTotal(b)}/{b.hp} · {new Date(b.endedAt ?? b.startedAt).toLocaleDateString()}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StartBattle boss={setup} classId={classId} onClose={() => setSetup(null)} />
    </div>
  );
}

function Battle({ battle, teacher }: { battle: BossBattle; teacher: boolean }) {
  const data = useStore((s) => s.data);
  const control = useStore((s) => s.controlBattle);
  const activity = useStore((s) => s.classActivity);
  const tick = useStore((s) => s.tickAdventure);
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const def = BOSSES_BY_ID[battle.bossId];
  const total = battleTotal(battle);
  const left = battleRemaining(battle);
  const [now, setNow] = useState(Date.now());
  const [act, setAct] = useState<{ amount: number; label: string } | null>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const prev = useRef(total);
  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); tick(); }, 30_000); return () => clearInterval(t); }, [tick]);

  // every new contribution: the boss wobbles, flashes and a number floats up
  useEffect(() => {
    const gained = total - prev.current;
    prev.current = total;
    if (gained <= 0 || !sprite.current || !stage.current) return;
    if (sound) playBossHit();
    if (reducedMotion()) return;
    createTimeline()
      .add(sprite.current, { x: [0, -10, 9, -6, 4, 0], duration: 460, ease: 'out(2)' })
      .add(sprite.current, { filter: ['brightness(2.2)', 'brightness(1)'], duration: 300 }, 0);
    const n = document.createElement('span');
    n.className = 'adv-float text-3xl';
    n.textContent = `+${gained}`;
    n.style.left = `${45 + Math.random() * 10}%`;
    n.style.top = '30%';
    stage.current.appendChild(n);
    animate(n, { y: [0, -70], opacity: [1, 0], scale: [0.8, 1.3], duration: 1100, ease: 'out(3)', onComplete: () => n.remove() });
  }, [total, sound]);

  const helpers = [...contributionsByStudent(battle).entries()].sort((a, b) => b[1] - a[1]);
  const recent = [...battle.contributions].reverse().slice(0, 6);
  const paused = battle.status === 'paused';
  const pct = Math.min(1, total / battle.hp);
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="paper overflow-hidden p-0">
        <div ref={stage} className="relative">
          <Px name={`region-${def.regionId}`} className="adv-scene !rounded-none opacity-90" />
          <div className="absolute inset-0 grid place-items-center">
            <div ref={sprite} className={`w-[38%] ${paused ? 'opacity-60 grayscale' : 'idle-bob'}`}>
              <Px name={`boss-${def.id}`} alt={def.name} className="w-full drop-shadow-[0_8px_0_rgb(14_42_82/.35)]" />
            </div>
          </div>
          {paused && <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-ink/85 px-4 py-1.5 font-display font-bold text-white">Resting (paused)</span>}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[30px] font-extrabold leading-tight">{def.name}</h2>
            <span className="text-sm font-bold text-ink-soft">{paused ? 'Clock stopped' : timeLeft(battleTimeLeft(battle, now))}</span>
          </div>
          <p className="text-[15px]">{def.description}</p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-sm font-bold"><span>Friendship</span><span className="tabular-nums">{total} / {battle.hp}</span></div>
            <div className="adv-hp" role="progressbar" aria-valuemin={0} aria-valuemax={battle.hp} aria-valuenow={total} aria-label="Friendship"><i style={{ width: `${pct * 100}%`, transition: 'width .7s cubic-bezier(.3,1.4,.5,1)' }} /></div>
            <div className="mt-1 text-sm font-bold text-ink-soft">{left > 0 ? `${left} more points of good work to befriend ${def.name}` : 'Befriended!'}</div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold">When befriended, everyone gets</span><RewardLine xp={battle.reward.xp} coins={battle.reward.coins} />
          </div>
          {teacher && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-azure" onClick={() => setAct({ amount: 10, label: '' })} disabled={paused}><Icon name="people" size={18} />Class activity</button>
              {paused ? <button className="btn btn-light" onClick={() => control(battle.id, 'resume')}><Icon name="play" size={16} />Resume</button>
                : <button className="btn btn-light" onClick={() => control(battle.id, 'pause')}><Icon name="pause" size={16} />Pause</button>}
              <button className="btn btn-light" onClick={() => { if (confirm(`End the battle with ${def.name}? No one loses anything, and you can start it again later.`)) control(battle.id, 'end'); }}><Icon name="stop" size={16} />End</button>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="paper p-5">
          <h3 className="font-display text-xl font-bold">How it works</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
            <li>Every point your teacher awards adds to the class's friendship.</li>
            <li>Every approved quest adds at least 5.</li>
            <li>Nobody is ever out. When the meter is full, {def.name} becomes the class's friend.</li>
          </ul>
        </div>
        <div className="paper p-5">
          <h3 className="mb-2 font-display text-xl font-bold">Helpers</h3>
          {!helpers.length ? <p className="text-sm text-ink-soft">No points yet. The first good deed starts it off!</p> : (
            <div className="flex flex-wrap gap-2">
              {helpers.slice(0, 18).map(([id, n]) => { const st = data.students.find((s) => s.id === id); return st ? <span key={id} className="flex items-center gap-1"><StudentChip student={st} /><span className="text-xs font-bold tabular-nums text-coin">+{n}</span></span> : null; })}
            </div>
          )}
        </div>
        <div className="paper p-5">
          <h3 className="mb-2 font-display text-xl font-bold">Latest</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {recent.map((c) => { const st = c.studentId ? data.students.find((s) => s.id === c.studentId) : null; return <li key={c.id} className="flex justify-between gap-2"><span className="truncate"><b>{st ? firstName(st.name) : 'The class'}</b> · {c.label}</span><span className="font-bold tabular-nums text-coin">+{c.amount}</span></li>; })}
            {!recent.length && <li className="text-ink-soft">Nothing yet.</li>}
          </ul>
        </div>
      </div>
      <Modal open={!!act} onClose={() => setAct(null)} label="Class activity">
        {act && (
          <form className="p-6" onSubmit={(e) => { e.preventDefault(); if (activity(battle.classId, act.amount, act.label)) setAct(null); }}>
            <h2 className="font-display text-2xl font-bold">The whole class did something great</h2>
            <label className="mt-4 block text-sm font-bold">What happened
              <input className="input mt-1" value={act.label} onChange={(e) => setAct({ ...act, label: e.target.value })} placeholder="e.g. Finished the class story together" maxLength={60} autoFocus />
            </label>
            <label className="mt-3 block text-sm font-bold">Friendship points
              <input type="number" min={1} max={1000} className="input mt-1" value={act.amount} onChange={(e) => setAct({ ...act, amount: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
            <div className="mt-2 flex gap-1.5">{[5, 10, 20, 30].map((n) => <button type="button" key={n} className="chip bg-mist py-1 text-azure-800" onClick={() => setAct({ ...act, amount: n })}>{n}</button>)}</div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn btn-light" onClick={() => setAct(null)}>Cancel</button><button className="btn btn-primary">Add</button></div>
          </form>
        )}
      </Modal>
    </section>
  );
}

function StartBattle({ boss, classId, onClose }: { boss: BossDef | null; classId: string; onClose: () => void }) {
  const start = useStore((s) => s.startBattle);
  const count = useStore((s) => s.data.students.filter((x) => x.classId === classId).length);
  const [form, setForm] = useState<{ hp: number; durationMs: number; xp: number; coins: number } | null>(null);
  const [for_, setFor] = useState<string | null>(null);
  if (boss && for_ !== boss.id) { setFor(boss.id); setForm({ hp: suggestedHp(boss.difficulty, count), durationMs: boss.durationMs, xp: boss.reward.xp, coins: boss.reward.coins }); }
  return (
    <Modal open={!!boss} onClose={() => { setFor(null); onClose(); }} label="Start a boss battle">
      {boss && form && (
        <form className="p-6" onSubmit={(e) => { e.preventDefault(); if (start({ classId, bossId: boss.id, hp: form.hp, durationMs: form.durationMs, reward: { xp: form.xp, coins: form.coins } })) { setFor(null); onClose(); } }}>
          <div className="flex items-center gap-3"><Px name={`boss-${boss.id}`} className="w-20" /><div><h2 className="font-display text-2xl font-bold">Start: {boss.name}</h2><div className="text-sm text-ink-soft">{boss.theme} · {DIFFICULTY[boss.difficulty].label}</div></div></div>
          <label className="mt-4 block text-sm font-bold">Friendship points needed
            <input type="number" min={10} max={100000} className="input mt-1" value={form.hp} onChange={(e) => setForm({ ...form, hp: Math.max(10, Number(e.target.value) || 10) })} />
            <span className="mt-1 block text-xs font-normal text-ink-soft">Suggested for {count} students: {suggestedHp(boss.difficulty, count)} (about {DIFFICULTY[boss.difficulty].perStudent} points each).</span>
          </label>
          <label className="mt-3 block text-sm font-bold">How long
            <select className="input mt-1" value={form.durationMs} onChange={(e) => setForm({ ...form, durationMs: Number(e.target.value) })}>
              {DURATIONS.map((d) => <option key={d.ms} value={d.ms}>{d.label}</option>)}
              {!DURATIONS.some((d) => d.ms === form.durationMs) && <option value={form.durationMs}>{Math.round(form.durationMs / 86_400_000)} days</option>}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">Reward XP (each)<input type="number" min={0} max={100} className="input mt-1" value={form.xp} onChange={(e) => setForm({ ...form, xp: Math.max(0, Number(e.target.value) || 0) })} /></label>
            <label className="text-sm font-bold">Reward coins (each)<input type="number" min={0} max={500} className="input mt-1" value={form.coins} onChange={(e) => setForm({ ...form, coins: Math.max(0, Number(e.target.value) || 0) })} /></label>
          </div>
          <p className="mt-3 text-xs text-ink-soft">Only approved activity counts: your awards, approved quests and class activities you add. If time runs out, {boss.name} just goes home to rest. Nobody loses anything.</p>
          <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn btn-light" onClick={() => { setFor(null); onClose(); }}>Cancel</button><button className="btn btn-primary"><Icon name="swords" size={18} />Start battle</button></div>
        </form>
      )}
    </Modal>
  );
}
