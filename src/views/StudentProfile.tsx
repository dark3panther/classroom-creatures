import { useEffect, useMemo, useState } from 'react';
import { awardSound, playCoin, playCreature, playPop } from '../audio/sfx';
import { MOODS } from '../engine/mood';
import { useMood } from '../lib/useMood';
import { AwardGrid } from '../components/AwardGrid';
import { FloatingXP } from '../components/StudentCard';
import { ElementBadge, LevelBadge, Modal, ProgressBar, RarityStars } from '../components/ui';
import { Creature, type CreatureAction } from '../creatures/Creature';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import { ACHIEVEMENTS, ITEMS, TAG_LABELS } from '../data/defaults';
import { RARITIES, STAGE_NAMES } from '../data/elements';
import { SPECIES, getSpecies } from '../data/species';
import { challengeProgress } from '../engine/awards';
import { speciesChoices } from '../engine/roster';
import { timeAgo } from '../engine/util';
import { useStudentView } from '../lib/stats';
import { useStore } from '../store/store';
import type { Item, ItemSlot, Stage, Student } from '../types';

type Tab = 'award' | 'shop' | 'wardrobe' | 'badges' | 'history' | 'manage';

export function StudentProfile({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const student = useStore((s) => s.data.students.find((x) => x.id === studentId));
  return (
    <Modal open={!!student} onClose={onClose} label={student ? `${student.name}'s profile` : 'Profile'} wide="xl">
      {student && <ProfileBody student={student} onClose={onClose} />}
    </Modal>
  );
}

function ProfileBody({ student, onClose }: { student: Student; onClose: () => void }) {
  const v = useStudentView(student)!;
  const settings = useStore((s) => s.data.settings);
  const pulse = useStore((s) => s.pulses[student.id]);
  const mood = useMood(student);
  const award = useStore((s) => s.award);
  const replay = useStore((s) => s.replayEvolution);
  const [tab, setTab] = useState<Tab>('award');
  const [act, setAct] = useState<{ type: CreatureAction; key: number } | null>(null);
  const { species: sp, prog, stage, next } = v;
  const r = RARITIES[sp.rarity];

  const doAct = (type: CreatureAction | 'sound') => {
    if (type === 'sound') { if (settings.soundEnabled) playCreature(sp.sound, true); setAct({ type: 'happy', key: Date.now() }); return; }
    if (settings.soundEnabled) { if (type === 'ability') playPop(); playCreature(sp.sound, type !== 'wave'); }
    setAct({ type, key: Date.now() });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* creature side */}
      <div className="p-4 sm:p-6">
        <Habitat element={sp.element} background={student.equipped.background} className="h-[300px] sm:h-[380px]" rounded="rounded-[1.5rem]">
          <Creature speciesId={sp.id} stage={stage} equipped={student.equipped} celebrateKey={pulse?.n} reactKind={pulse?.kind} event={pulse} treats={(student.milestoneRewards ?? []).filter((r) => !r.given).length} mood={mood} ambient={8} interactive action={act} sound={settings.soundEnabled} className="mx-auto h-full w-[78%]" />
          <FloatingXP pulse={pulse} />
          <div className="absolute left-3 top-3 flex items-center gap-2"><LevelBadge level={prog.level} size="lg" /></div>
          <div className="absolute right-3 top-3 rounded-full bg-white/85 px-3 py-1"><RarityStars rarity={sp.rarity} /></div>
          <div className="absolute inset-x-0 bottom-2 text-center text-xs font-bold text-ink/50">Tap the creature to play!</div>
        </Habitat>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {([['jump', '⤒ Jump'], ['wave', '👋 Wave'], ['ability', `✨ ${sp.ability}`], ['happy', '💖 Happy'], ['sound', '🎵 Sing']] as const).map(([k, label]) => (
            <button key={k} className="btn btn-light !py-2 !text-sm" onClick={() => doAct(k)}>{label}</button>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-3xl font-bold">{student.name}</h2>
            {student.isDemo && <span className="chip bg-berry text-white">DEMO</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
            <span className="font-display text-xl font-semibold text-ink">{sp.name}{stage === 5 ? `, ${sp.legendTitle}` : ''}</span>
            <ElementBadge element={sp.element} />
            <span className="chip" style={{ background: `${r.color}22`, color: r.color }}>{STAGE_NAMES[stage]}</span>
          </div>
          <p className="mt-2 text-[15px] text-ink-soft">{sp.personality}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip !py-1 !text-sm" style={{ background: `${MOODS[mood].color}22`, color: MOODS[mood].color }}>{MOODS[mood].icon} Feeling {MOODS[mood].label.toLowerCase()}</span>
            <span className="chip bg-[#fff1c2] !py-1 !text-sm text-[#8a5a00]">🪙 {student.coins ?? 0} coins</span>
            {(student.milestoneRewards ?? []).filter((r) => !r.given).length > 0 && (
              <span className="chip bg-[#f3e2d3] !py-1 !text-sm text-[#7a4b2a]">🍫 {(student.milestoneRewards ?? []).filter((r) => !r.given).length} reward{(student.milestoneRewards ?? []).filter((r) => !r.given).length === 1 ? '' : 's'} to hand out</span>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-cream p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg font-semibold">Level {prog.level}</span>
              <span className="text-sm font-bold tabular-nums text-ink-soft">{student.xp} XP total</span>
            </div>
            <ProgressBar pct={prog.pct} height={16} color={stage === 5 ? '#f2a20c' : '#8b5cf6'} className="mt-2" />
            <div className="mt-1.5 text-sm font-bold text-ink-soft">
              {prog.isMax ? 'Maximum level reached. Amazing!' : `${prog.toNext} XP to Level ${prog.level + 1}`}
            </div>
            <div className="mt-2 text-sm font-bold">
              {next ? <>🎯 Next evolution: <span className="text-grape">{STAGE_NAMES[next.stage]}</span> at Level {next.level} · {next.xpNeeded} XP to go</>
                : <>👑 {sp.name} has reached its Legendary Form!</>}
            </div>
          </div>

          {/* evolution path */}
          <div className="mt-4">
            <div className="mb-1 text-sm font-extrabold uppercase tracking-wider text-ink-soft">Evolution path</div>
            <div className="grid grid-cols-5 gap-1.5">
              {([1, 2, 3, 4, 5] as Stage[]).map((st) => {
                const reached = st <= Math.max(stage, student.bestStage);
                return (
                  <button key={st} disabled={!reached || st === 1} onClick={() => replay(student.id, st)}
                    className={`group relative rounded-2xl p-1 text-center ${st === stage ? 'bg-grape/15 ring-2 ring-grape' : 'bg-ink/5'}`}
                    title={reached && st > 1 ? `Replay the ${STAGE_NAMES[st]} evolution` : reached ? STAGE_NAMES[st] : `Unlocks at Level ${settings.evolutionLevels[st - 1]}`}>
                    <div className="aspect-square" style={reached ? undefined : { filter: 'brightness(0)', opacity: 0.22 }}>
                      <CreatureSvg species={sp} stage={st} effects={false} noShadow className="h-full w-full" />
                    </div>
                    <div className="text-[10px] font-extrabold leading-tight text-ink-soft">{reached ? STAGE_NAMES[st] : `Lv ${settings.evolutionLevels[st - 1]}`}</div>
                    {reached && st > 1 && <span className="absolute right-1 top-1 hidden rounded-full bg-white px-1.5 text-[10px] font-bold text-grape shadow group-hover:block">↻</span>}
                  </button>
                );
              })}
            </div>
            {stage > 1 && <button className="btn btn-light mt-2 !py-1.5 !text-sm" onClick={() => replay(student.id, stage)}>↻ Replay evolution</button>}
          </div>
        </div>
      </div>

      {/* tabs side */}
      <div className="border-t border-ink/10 p-4 sm:p-6 lg:border-l lg:border-t-0">
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-ink/5 p-1" role="tablist">
          {([['award', 'Award'], ['shop', 'Shop'], ['wardrobe', 'Wardrobe'], ['badges', 'Badges'], ['history', 'History'], ['manage', 'Manage']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 font-display font-semibold transition ${tab === k ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        {tab === 'award' && (
          <div>
            <p className="mb-3 text-sm font-bold text-ink-soft">Tap a behaviour to award {student.name.split(' ')[0]} instantly.</p>
            <AwardGrid onPick={(c) => { const o = award([student.id], c.id); if (o.length && settings.soundEnabled) awardSound(c.xp); }} />
          </div>
        )}
        {tab === 'shop' && <Shop student={student} />}
        {tab === 'wardrobe' && <Wardrobe student={student} />}
        {tab === 'badges' && <Badges student={student} />}
        {tab === 'history' && <History student={student} />}
        {tab === 'manage' && <Manage student={student} onClose={onClose} />}
      </div>
    </div>
  );
}

const SLOT_LABEL: Record<ItemSlot, string> = { hat: 'Hats', glasses: 'Glasses', wings: 'Wings', magic: 'Magic', background: 'Backgrounds', decoration: 'Decorations', outfit: 'Outfits' };

function unlockText(it: Item): string {
  const u = it.unlock;
  if (u.type === 'level') return `Reach Level ${u.level}`;
  if (u.type === 'achievement') return `Badge: ${ACHIEVEMENTS.find((a) => a.id === u.id)?.name ?? u.id}`;
  if (u.type === 'challenges') return `Complete ${u.count} challenges`;
  if (u.type === 'shop') return `${u.price} coins in the Shop`;
  return 'Free';
}

function Shop({ student }: { student: Student }) {
  const buy = useStore((s) => s.buy);
  const notify = useStore((s) => s.notify);
  const equip = useStore((s) => s.equip);
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const v = useStudentView(student)!;
  const shop = ITEMS.filter((i) => i.unlock.type === 'shop');
  const coins = student.coins ?? 0;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#fff1c2] px-4 py-3">
        <span className="font-display text-lg font-semibold text-[#8a5a00]">🪙 {coins} coins</span>
        <span className="text-xs font-bold text-[#8a5a00]/80">Students earn 1 coin for every XP point.</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
        {shop.map((it) => {
          const price = it.unlock.type === 'shop' ? it.unlock.price : 0;
          const owned = student.unlockedItems.includes(it.id);
          const can = !owned && coins >= price;
          return (
            <div key={it.id} className={`flex flex-col rounded-2xl p-2 text-center ${owned ? 'bg-mint/15' : 'bg-ink/5'}`}>
              {it.slot === 'background' ? (
                <Habitat element={v.species.element} background={it.id} className="aspect-square" rounded="rounded-xl"><span /></Habitat>
              ) : (
                <div className="aspect-square"><CreatureSvg species={v.species} stage={v.stage} equipped={{ [it.slot]: it.id }} effects={false} noShadow className="h-full w-full" /></div>
              )}
              <div className="mt-1 truncate text-xs font-extrabold">{it.name}</div>
              {owned ? (
                <button className="btn btn-light mt-1 !py-1 !text-xs" onClick={() => equip(student.id, it.slot, it.id)}>✓ Owned · Wear</button>
              ) : (
                <button className="btn btn-primary mt-1 !py-1 !text-xs" disabled={!can}
                  onClick={() => { if (buy(student.id, it.id)) { if (sound) { playCoin(); setTimeout(playPop, 120); } equip(student.id, it.slot, it.id); notify(`${student.name.split(' ')[0]} bought ${it.name}!`); } }}>
                  🪙 {price}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Wardrobe({ student }: { student: Student }) {
  const equip = useStore((s) => s.equip);
  const settings = useStore((s) => s.data.settings);
  const v = useStudentView(student)!;
  const slots: ItemSlot[] = ['outfit', 'hat', 'glasses', 'wings', 'magic', 'decoration', 'background'];
  return (
    <div className="flex flex-col gap-4">
      {slots.map((slot) => (
        <div key={slot}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase tracking-wider text-ink-soft">{SLOT_LABEL[slot]}</span>
            {student.equipped[slot] && slot !== 'background' && <button className="text-xs font-bold text-grape" onClick={() => equip(student.id, slot, null)}>Take off</button>}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {ITEMS.filter((i) => i.slot === slot).map((it) => {
              const owned = student.unlockedItems.includes(it.id);
              const on = student.equipped[slot] === it.id;
              return (
                <button key={it.id} disabled={!owned} onClick={() => { equip(student.id, slot, on && slot !== 'background' ? null : it.id); if (settings.soundEnabled) playPop(); }}
                  className={`relative rounded-2xl p-1.5 text-center transition ${on ? 'bg-sun/30 ring-2 ring-sun-deep' : owned ? 'bg-ink/5 hover:bg-ink/10' : 'bg-ink/5'}`}
                  title={owned ? it.description : `Locked · ${unlockText(it)}`}>
                  {slot === 'background' ? (
                    <Habitat element={v.species.element} background={it.id} className="aspect-square" rounded="rounded-xl"><span /></Habitat>
                  ) : (
                    <div className="aspect-square" style={owned ? undefined : { filter: 'grayscale(1)', opacity: 0.4 }}>
                      <CreatureSvg species={v.species} stage={v.stage} equipped={{ [slot]: it.id }} effects={false} noShadow className="h-full w-full" />
                    </div>
                  )}
                  <div className="mt-1 truncate text-[11px] font-extrabold">{it.name}</div>
                  {!owned && <div className="truncate text-[10px] font-bold text-ink-soft">🔒 {unlockText(it)}</div>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Badges({ student }: { student: Student }) {
  const challenges = useStore((s) => s.data.challenges);
  const events = useStore((s) => s.data.events);
  const have = new Map(student.achievements.map((a) => [a.id, a.at]));
  const now = Date.now();
  return (
    <div>
      <div className="mb-2 text-sm font-extrabold uppercase tracking-wider text-ink-soft">Achievements · {have.size}/{ACHIEVEMENTS.length}</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {ACHIEVEMENTS.map((a) => {
          const got = have.has(a.id);
          return (
            <div key={a.id} className={`flex items-center gap-2 rounded-2xl p-2 ${got ? '' : 'opacity-50 grayscale'}`} style={{ background: got ? `${a.color}22` : 'rgb(43 33 64 / .05)' }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl" style={{ background: got ? `${a.color}44` : 'rgb(43 33 64 / .08)' }}>{got ? a.icon : '🔒'}</span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-extrabold">{a.name}</span>
                <span className="block text-[11px] font-bold text-ink-soft">{got ? `Earned ${timeAgo(have.get(a.id)!, now)}` : a.description}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mb-2 mt-5 text-sm font-extrabold uppercase tracking-wider text-ink-soft">Challenges</div>
      <div className="flex flex-col gap-2">
        {challenges.filter((c) => c.active).map((c) => {
          const p = challengeProgress(c, student.id, events, now);
          return (
            <div key={c.id} className="rounded-2xl bg-ink/5 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-bold">
                <span>{p.done ? '✅' : c.period === 'daily' ? '☀️' : '📅'} {c.title}</span>
                <span className="tabular-nums text-ink-soft">{p.value}/{c.target}</span>
              </div>
              <ProgressBar pct={p.value / c.target} color={p.done ? '#34d399' : '#4fb6f0'} height={8} className="mt-1.5" />
            </div>
          );
        })}
        <div className="text-xs font-bold text-ink-soft">Challenges completed so far: {student.challengeCompletions.length}</div>
      </div>
    </div>
  );
}

function History({ student }: { student: Student }) {
  const events = useStore((s) => s.data.events);
  const undo = useStore((s) => s.undo);
  const mine = useMemo(() => events.filter((e) => e.studentId === student.id && !e.undone).slice(-40).reverse(), [events, student.id]);
  const tags = Object.entries(student.tagCounts).filter(([, n]) => (n ?? 0) > 0).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.map(([t, n]) => <span key={t} className="chip bg-grape/12 text-grape">{TAG_LABELS[t as keyof typeof TAG_LABELS]} × {n}</span>)}
        </div>
      )}
      {mine.length === 0 && <p className="text-ink-soft">No activity yet. Award some points!</p>}
      <ul className="flex flex-col gap-1">
        {mine.map((e) => (
          <li key={e.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-ink/5">
            <span className="text-xl" aria-hidden>{e.icon}</span>
            <span className="flex-1 text-sm font-bold">{e.categoryName}<span className="block text-xs text-ink-soft">{new Date(e.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span></span>
            <span className={`font-display font-bold ${e.xp >= 0 ? 'text-mint' : 'text-ink-soft'}`}>{e.xp >= 0 ? '+' : ''}{e.xp}</span>
            <button className="min-h-9 rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-ink/15 hover:bg-ink/10" onClick={() => undo(e.batchId)}>Undo</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Manage({ student, onClose }: { student: Student; onClose: () => void }) {
  const update = useStore((s) => s.updateStudent);
  const remove = useStore((s) => s.removeStudent);
  const randomize = useStore((s) => s.randomizeSpecies);
  const assign = useStore((s) => s.assignSpecies);
  const move = useStore((s) => s.moveStudent);
  const notify = useStore((s) => s.notify);
  const classes = useStore((s) => s.data.classes);
  const all = useStore((s) => s.data.students);
  const [name, setName] = useState(student.name);
  const [mode, setMode] = useState<'none' | 'pick' | 'choose'>('none');
  const [confirm, setConfirm] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  useEffect(() => setName(student.name), [student.name]);
  const classmates = all.filter((s) => s.classId === student.classId && s.id !== student.id);
  const taken = new Set(classmates.map((s) => s.speciesId));

  return (
    <div className="flex flex-col gap-5">
      <section>
        <label className="text-sm font-extrabold uppercase tracking-wider text-ink-soft">Name</label>
        <div className="mt-1 flex gap-2">
          <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary" disabled={!name.trim() || name === student.name} onClick={() => { update(student.id, { name: name.trim() }); notify('Name updated'); }}>Save</button>
        </div>
      </section>

      <section>
        <div className="text-sm font-extrabold uppercase tracking-wider text-ink-soft">Creature</div>
        <p className="text-sm text-ink-soft">Changing creature keeps all XP, levels, badges and items.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn btn-light" onClick={() => { randomize(student.id); notify('New random creature!'); }}>🎲 Random</button>
          <button className="btn btn-light" onClick={() => { setChoices(speciesChoices(classmates, 3)); setMode('choose'); }}>🤔 Let student choose (3)</button>
          <button className="btn btn-light" onClick={() => setMode(mode === 'pick' ? 'none' : 'pick')}>📖 Pick any creature</button>
        </div>
        {mode === 'choose' && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {choices.map((id) => { const sp = getSpecies(id); return (
              <button key={id} className="rounded-2xl bg-ink/5 p-2 text-center hover:bg-grape/15" onClick={() => { assign(student.id, id); setMode('none'); notify(`${student.name.split(' ')[0]} chose ${sp.name}!`); }}>
                <CreatureSvg species={sp} stage={1} effects={false} className="mx-auto aspect-square w-full" />
                <div className="font-display font-semibold">{sp.name}</div><div className="text-xs text-ink-soft">{sp.personality}</div>
              </button>
            ); })}
          </div>
        )}
        {mode === 'pick' && (
          <div className="mt-3 grid max-h-80 grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5 overflow-y-auto scroll-thin pr-1">
            {SPECIES.map((sp) => (
              <button key={sp.id} onClick={() => { assign(student.id, sp.id); setMode('none'); notify(`Now ${sp.name}`); }}
                className={`rounded-xl p-1 text-center ${sp.id === student.speciesId ? 'bg-sun/30 ring-2 ring-sun-deep' : 'bg-ink/5 hover:bg-ink/10'}`} title={taken.has(sp.id) ? 'A classmate already has this creature' : sp.name}>
                <CreatureSvg species={sp} stage={1} effects={false} noShadow className="aspect-square w-full" />
                <div className="truncate text-[11px] font-extrabold">{sp.name}</div>
                {taken.has(sp.id) && <div className="text-[9px] font-bold text-ink-soft">taken</div>}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <label className="text-sm font-extrabold uppercase tracking-wider text-ink-soft">Move to another class</label>
        <p className="text-sm text-ink-soft">Progress moves with the student.</p>
        <select className="input mt-1" value={student.classId} onChange={(e) => { move(student.id, e.target.value); notify('Student moved'); onClose(); }}>
          {classes.filter((c) => !c.archived || c.id === student.classId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </section>

      <section className="rounded-2xl border-2 border-dashed border-[#fca5a5] p-4">
        <div className="font-bold text-[#b91c1c]">Remove student</div>
        <p className="text-sm text-ink-soft">This permanently deletes {student.name} and their progress. A safety snapshot is saved first (Settings → Backup). Type the student’s first name to confirm.</p>
        <div className="mt-2 flex gap-2">
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={student.name.split(' ')[0]} aria-label="Type the first name to confirm" />
          <button className="btn btn-danger" disabled={confirm.trim().toLowerCase() !== student.name.split(' ')[0].toLowerCase()}
            onClick={async () => { await remove(student.id); notify(`${student.name} removed`, 'info'); onClose(); }}>Remove</button>
        </div>
      </section>
    </div>
  );
}
