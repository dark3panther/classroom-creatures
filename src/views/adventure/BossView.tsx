import { useEffect, useRef, useState } from 'react';
import { BOSSES, BOSSES_BY_ID, DIFFICULTY, DURATIONS, LESSON, MISSIONS, REGIONS_BY_ID, lessonHp, suggestedHp, type BossDef, type LessonLevel } from '../../data/adventure';
import { Icon } from '../../components/Icon';
import { Modal, SectionTitle } from '../../components/ui';
import { playBossHit } from '../../audio/sfx';
import { battleRemaining, battleTimeLeft, battleTotal, contributionsByStudent, currentBattle, regionStates } from '../../engine/adventure';
import { firstName } from '../../engine/util';
import { animate, createTimeline, reducedMotion } from '../../lib/motion';
import { useStore } from '../../store/store';
import type { BossBattle, CategoryTag } from '../../types';
import { Arena, tagLabel } from './Arena';
import { BossPortrait } from '../../creatures/bosses/BossPortrait';
import { EmptyNote, Px, RewardLine, StudentChip, timeLeft } from './common';

/** Cooperative boss battles: the whole class calms a grumpy boss with approved activity. */
export function BossView({ classId, teacher, preselect }: { classId: string; teacher: boolean; preselect?: string }) {
  const data = useStore((s) => s.data);
  const battle = currentBattle(data, classId);
  const [setup, setSetup] = useState<BossDef | null>(() => (preselect && teacher ? BOSSES_BY_ID[preselect] ?? null : null));
  const past = data.bosses.filter((b) => b.classId === classId && (b.status === 'won' || b.status === 'ended')).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
  const regions = regionStates(data, classId);
  // a lesson battle stays on screen when it ends (the final attack, the befriending) until the teacher closes it
  const [kept, setKept] = useState<string | null>(battle?.lesson ? battle.id : null);
  useEffect(() => { if (battle?.lesson && kept !== battle.id) setKept(battle.id); }, [battle?.id, battle?.lesson, kept]);
  const arenaBattle = battle?.lesson ? battle : kept ? data.bosses.find((b) => b.id === kept && b.lesson) : undefined;
  return (
    <div className="flex flex-col gap-6">
      {arenaBattle ? (
        <>
          <Arena battle={arenaBattle} teacher={teacher} onClose={() => setKept(null)} />
          <LessonRules battle={arenaBattle} />
        </>
      ) : battle ? <Battle battle={battle} teacher={teacher} /> : (
        <EmptyNote icon="swords" title="No boss battle right now">
          {teacher ? 'Pick a boss below to start a battle. A lesson battle fits one or two lessons: every point you give is a creature attack.' : 'When your teacher starts a battle, everyone works together to befriend the boss.'}
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
                <span className="w-24 shrink-0 self-center"><BossPortrait id={b.id} friend={friend} title={b.name} still className={open ? '' : 'grayscale'} /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-bold leading-tight">{b.name}</div>
                  <div className="text-xs font-bold text-ink-soft">{REGIONS_BY_ID[b.regionId].name} · <span style={{ color: DIFFICULTY[b.difficulty].color }}>{DIFFICULTY[b.difficulty].label}</span></div>
                  <p className="mt-1 text-[13px] leading-snug">{friend ? b.friendly : b.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {friend && <span className="chip bg-leaf-pale text-leaf">Class friend</span>}
                    {!open && <span className="chip bg-mist text-ink-soft"><Icon name="lock" size={12} />{REGIONS_BY_ID[b.regionId].name} is locked</span>}
                    {teacher && open && !battle && !arenaBattle && <button className="btn btn-primary !py-1.5 !text-sm" onClick={() => setSetup(b)} data-start={b.id}><Icon name="swords" size={16} />Start battle</button>}
                    {b.wandering && <span className="chip bg-mist text-ink-soft">Wandering boss</span>}
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
                <span className="w-12 shrink-0"><BossPortrait id={b.bossId} friend={b.status === 'won'} still /></span>
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
              <BossPortrait id={def.id} title={def.name} className="drop-shadow-[0_8px_0_rgb(14_42_82/.35)]" />
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

/** The rules of a lesson battle, in words for the class (shown under the arena). */
function LessonRules({ battle }: { battle: BossBattle }) {
  const def = BOSSES_BY_ID[battle.bossId];
  const l = battle.lesson!;
  const helpers = [...contributionsByStudent(battle).entries()].sort((a, b) => b[1] - a[1]);
  const data = useStore((s) => s.data);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="paper p-5">
        <h3 className="font-display text-xl font-bold">How the battle works</h3>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[15px]">
          <li><b>Earn points</b> and your creature attacks {def.name}.</li>
          {l.focusTag && <li><b>{tagLabel(l.focusTag)}</b> is super effective today: those points count double.</li>}
          {l.strikeBack && <li><b>Lose points</b> and {def.name} strikes back at your creature. It gets a few points back, so keep each other on track!</li>}
          <li><b>Finish the mission together</b> ("{l.mission}") for a team attack: every creature at once.</li>
          <li>Nobody is ever out. When the HP runs out, {def.name} becomes the class's friend and everyone gets {[battle.reward.xp ? `${battle.reward.xp} XP` : '', battle.reward.coins ? `${battle.reward.coins} coins` : ''].filter(Boolean).join(' and ') || 'a new friend'}.</li>
        </ul>
      </div>
      <div className="paper p-5">
        <h3 className="mb-2 font-display text-xl font-bold">Attackers</h3>
        {!helpers.length ? <p className="text-sm text-ink-soft">No attacks yet. The first points start the battle!</p> : (
          <div className="flex flex-wrap gap-2">
            {helpers.slice(0, 24).map(([id, n]) => { const st = data.students.find((x) => x.id === id); return st ? <span key={id} className="flex items-center gap-1"><StudentChip student={st} /><span className="text-xs font-bold tabular-nums text-coin">{n}</span></span> : null; })}
          </div>
        )}
      </div>
    </div>
  );
}

type Mode = 'lesson' | 'long';
interface LessonForm { mission: string; preset: number; focusTag: CategoryTag | ''; lessons: number; minutes: number; level: LessonLevel; strikeBack: boolean; hp: number; hpTouched: boolean; xp: number; coins: number }

function StartBattle({ boss, classId, onClose }: { boss: BossDef | null; classId: string; onClose: () => void }) {
  const start = useStore((s) => s.startBattle);
  const count = useStore((s) => s.data.students.filter((x) => x.classId === classId).length);
  const categories = useStore((s) => s.data.categories);
  const negatives = useStore((s) => s.data.settings.negativeEnabled);
  const positive = categories.filter((c) => c.xp > 0);
  const avgXp = positive.length ? positive.reduce((n, c) => n + c.xp, 0) / positive.length : 4;
  const tags = [...new Set(positive.map((c) => c.tag))].filter((t) => t !== 'other');
  const [mode, setMode] = useState<Mode>('lesson');
  const [form, setForm] = useState<{ hp: number; durationMs: number; xp: number; coins: number } | null>(null);
  const [lf, setLf] = useState<LessonForm | null>(null);
  const [for_, setFor] = useState<string | null>(null);
  if (boss && for_ !== boss.id) {
    setFor(boss.id);
    setForm({ hp: suggestedHp(boss.difficulty, count), durationMs: boss.durationMs, xp: boss.reward.xp, coins: boss.reward.coins });
    setLf({ mission: MISSIONS[0].text, preset: 0, focusTag: MISSIONS[0].tag ?? '', lessons: 1, minutes: LESSON.defaultMinutes, level: 'normal', strikeBack: true, hp: lessonHp(count, avgXp, 1), hpTouched: false, xp: LESSON.reward.xp, coins: LESSON.reward.coins });
  }
  const close = () => { setFor(null); onClose(); };
  // HP follows the lesson settings until the teacher types their own
  const setL = (patch: Partial<LessonForm>) => setLf((f) => {
    if (!f) return f;
    const n = { ...f, ...patch };
    if (!n.hpTouched) n.hp = lessonHp(count, avgXp, n.lessons, n.level);
    return n;
  });
  const submit = () => {
    if (!boss) return;
    const ok = mode === 'lesson' && lf
      ? start({ classId, bossId: boss.id, hp: lf.hp, durationMs: lf.minutes * 60_000 * lf.lessons, reward: { xp: lf.xp, coins: lf.coins },
        lesson: { mission: lf.mission, focusTag: lf.focusTag || undefined, strikeBack: lf.strikeBack && negatives, lessonMs: lf.minutes * 60_000, lessons: lf.lessons } })
      : form ? start({ classId, bossId: boss.id, hp: form.hp, durationMs: form.durationMs, reward: { xp: form.xp, coins: form.coins } }) : false;
    if (ok) close();
  };
  return (
    <Modal open={!!boss} onClose={close} label="Start a boss battle">
      {boss && form && lf && (
        <form className="p-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="flex items-center gap-3"><span className="w-20 shrink-0"><BossPortrait id={boss.id} still /></span><div><h2 className="font-display text-2xl font-bold">Battle {boss.name}</h2><div className="text-sm text-ink-soft">{boss.theme} · {REGIONS_BY_ID[boss.regionId].name}</div></div></div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-mist p-1" role="tablist">
            {([['lesson', 'Lesson battle', 'One or two lessons, on the projector'], ['long', 'Adventure battle', 'Days or weeks, in the background']] as const).map(([m, t, sub]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-2 text-left ${mode === m ? 'bg-white shadow-[var(--shadow-card)]' : ''}`}>
                <span className="block font-bold">{t}</span><span className="block text-xs text-ink-soft">{sub}</span>
              </button>
            ))}
          </div>

          {mode === 'lesson' ? (
            <div className="mt-4 flex flex-col gap-3">
              <label className="block text-sm font-bold">Today's class mission
                <select className="input mt-1" value={lf.preset} onChange={(e) => { const i = Number(e.target.value); setL(i < 0 ? { preset: -1 } : { preset: i, mission: MISSIONS[i].text, focusTag: MISSIONS[i].tag ?? '' }); }}>
                  {MISSIONS.map((m, i) => <option key={i} value={i}>{m.text}</option>)}
                  <option value={-1}>Write my own…</option>
                </select>
                {lf.preset < 0 && <input className="input mt-2" value={lf.mission} maxLength={80} placeholder="e.g. Finish the maths worksheet" onChange={(e) => setL({ mission: e.target.value })} autoFocus />}
                <span className="mt-1 block text-xs font-normal text-ink-soft">When the class has done it, press <b>Mission complete</b> on the arena: every creature attacks at once ({Math.round(LESSON.missionShare * 100)}% of the boss's HP).</span>
              </label>
              <label className="block text-sm font-bold">Super effective today
                <select className="input mt-1" value={lf.focusTag} onChange={(e) => setL({ focusTag: e.target.value as CategoryTag | '' })}>
                  <option value="">Nothing extra</option>
                  {tags.map((t) => <option key={t} value={t}>{tagLabel(t)} (×{LESSON.superMultiplier})</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">How long
                  <select className="input mt-1" value={lf.lessons} onChange={(e) => setL({ lessons: Number(e.target.value) })}>
                    <option value={1}>One lesson</option><option value={2}>Two lessons</option>
                  </select>
                </label>
                <label className="text-sm font-bold">A lesson is
                  <select className="input mt-1" value={lf.minutes} onChange={(e) => setL({ minutes: Number(e.target.value) })}>
                    {LESSON.minutes.map((m) => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </label>
              </div>
              <div className="text-sm font-bold">Boss strength
                <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-mist p-1">
                  {(['gentle', 'normal', 'tough'] as LessonLevel[]).map((lv) => <button key={lv} type="button" onClick={() => setL({ level: lv, hpTouched: false })} className={`rounded-lg py-1.5 capitalize ${lf.level === lv ? 'bg-white shadow-[var(--shadow-card)]' : ''}`}>{lv}</button>)}
                </div>
                <label className="mt-2 flex items-center gap-2 font-normal">HP
                  <input type="number" min={10} max={100000} className="input w-28" value={lf.hp} onChange={(e) => setLf({ ...lf, hp: Math.max(10, Number(e.target.value) || 10), hpTouched: true })} />
                  <span className="text-xs text-ink-soft">For {count} students: about {LESSON.awardsPerStudent} points awards each per lesson, plus the mission.</span>
                </label>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={lf.strikeBack && negatives} disabled={!negatives} onChange={(e) => setL({ strikeBack: e.target.checked })} />
                <span><b>The boss strikes back</b> when someone loses points: it attacks that student's creature (which is dazed for a moment) and gets back the points lost, at most {Math.round(LESSON.recoverCap * 100)}% of its HP in a battle. The student loses only the points you took.{!negatives && <span className="block text-ink-soft">Behaviour deductions are switched off in Settings, so this cannot happen.</span>}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">Reward XP (each)<input type="number" min={0} max={100} className="input mt-1" value={lf.xp} onChange={(e) => setLf({ ...lf, xp: Math.max(0, Number(e.target.value) || 0) })} /></label>
                <label className="text-sm font-bold">Reward coins (each)<input type="number" min={0} max={500} className="input mt-1" value={lf.coins} onChange={(e) => setLf({ ...lf, coins: Math.max(0, Number(e.target.value) || 0) })} /></label>
              </div>
              <p className="text-xs text-ink-soft">If time runs out, the battle waits for your next lesson with its HP kept. Ending it early costs nobody anything.</p>
            </div>
          ) : (
            <div className="mt-4">
              <label className="block text-sm font-bold">Friendship points needed
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
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn btn-light" onClick={close}>Cancel</button><button className="btn btn-primary" data-begin><Icon name="swords" size={18} />Start battle</button></div>
        </form>
      )}
    </Modal>
  );
}
