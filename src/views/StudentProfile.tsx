import { useEffect, useMemo, useState } from 'react';
import { awardSound, playCoin, playCreature, playPop } from '../audio/sfx';
import { MOODS } from '../engine/mood';
import { useMood } from '../lib/useMood';
import { AwardGrid } from '../components/AwardGrid';
import { FloatingXP } from '../components/StudentCard';
import { ChocoStick } from '../components/Celebrations';
import { CoinIcon, Glyph, Icon } from '../components/Icon';
import { ElementBadge, LevelBadge, Modal, ProgressBar, RarityStars } from '../components/ui';
import { Creature, type CreatureAction } from '../creatures/Creature';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import { ACHIEVEMENTS, ITEMS, TAG_LABELS } from '../data/defaults';
import { ELEMENTS, RARITIES, STAGE_NAMES } from '../data/elements';
import { SPECIES, fieldNo, getSpecies } from '../data/species';
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
        <Habitat element={sp.element} seed={sp.id} background={student.equipped.background} className="h-[300px] border border-rule sm:h-[380px]" rounded="rounded-[12px]">
          <Creature speciesId={sp.id} stage={stage} equipped={student.equipped} celebrateKey={pulse?.n} reactKind={pulse?.kind} event={pulse} treats={(student.milestoneRewards ?? []).filter((r) => !r.given).length} mood={mood} ambient={8} interactive action={act} sound={settings.soundEnabled} className="mx-auto h-full w-[78%]" />
          <FloatingXP pulse={pulse} />
          <div className="absolute left-3 top-3 flex items-center gap-2"><LevelBadge level={prog.level} size="lg" /></div>
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 ring-1 ring-rule"><RarityStars rarity={sp.rarity} /></div>
          <div className="absolute inset-x-0 bottom-2 text-center text-[13px] font-bold text-ink-soft">Tap the creature to play!</div>
        </Habitat>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {([['jump', 'jump', 'Jump'], ['wave', 'wave', 'Wave'], ['ability', 'sparkle', sp.ability], ['happy', 'heart', 'Happy'], ['sound', 'music', 'Sing']] as const).map(([k, icon, label]) => (
            <button key={k} className="btn btn-light !py-2 !text-sm" onClick={() => doAct(k)}><Icon name={icon} size={16} />{label}</button>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[34px] font-extrabold leading-tight tracking-[-0.02em]">{student.name}</h2>
            {student.isDemo && <span className="chip bg-berry/10 text-berry ring-1 ring-berry/30">Demo</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
            <span className="tabular">{fieldNo(sp.id)}</span>
            <span className="font-display text-xl font-bold text-ink">{sp.name}{stage === 5 ? `, ${sp.legendTitle}` : ''}</span>
            <ElementBadge element={sp.element} />
            <span className="chip bg-wash text-ink ring-1 ring-rule" title={r.name}>{STAGE_NAMES[stage]}</span>
          </div>
          <p className="mt-2 text-[15px] text-ink-soft">{sp.personality}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip bg-white !py-1 !text-sm text-ink ring-1 ring-rule"><span className="h-2.5 w-2.5 rounded-full" style={{ background: MOODS[mood].color }} />Feeling {MOODS[mood].label.toLowerCase()}</span>
            <span className="chip bg-[#fdf2d6] !py-1 !text-sm text-[#7a5308] ring-1 ring-[#e7c77a]"><CoinIcon size={15} /><span className="tabular">{student.coins ?? 0}</span> coins</span>
            {(student.milestoneRewards ?? []).filter((r) => !r.given).length > 0 && (
              <span className="chip bg-[#f3e2d3] !py-1 !text-sm text-[#6b3f22] ring-1 ring-[#d9b89c]"><ChocoStick size={18} />{(student.milestoneRewards ?? []).filter((r) => !r.given).length} reward{(student.milestoneRewards ?? []).filter((r) => !r.given).length === 1 ? '' : 's'} to hand out</span>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-wash p-4 ring-1 ring-rule">
            <div className="flex items-end justify-between gap-3">
              <span className="font-display font-extrabold leading-[0.85] tracking-[-0.03em]"><span className="text-2xl">Level </span><span className="text-[84px] tabular">{prog.level}</span></span>
              <span className="text-right font-display leading-[0.85]"><span className="text-[52px] font-extrabold tracking-[-0.02em] tabular">{student.xp.toLocaleString()}</span><span className="text-xl font-bold text-ink-soft"> XP</span></span>
            </div>
            <ProgressBar pct={prog.pct} height={16} color={ELEMENTS[sp.element].color} className="mt-3" />
            <div className="mt-1.5 text-sm font-bold text-ink-soft">
              {prog.isMax ? 'Maximum level reached. Amazing!' : `${prog.toNext} XP to Level ${prog.level + 1}`}
            </div>
            <div className="mt-2 text-sm font-bold">
              {next ? <span className="flex items-center gap-1.5"><Icon name="target" size={16} className="shrink-0 text-cloth-800" /><span>Next evolution: <span className="text-cloth-800">{STAGE_NAMES[next.stage]}</span> at Level {next.level} · {next.xpNeeded} XP to go</span></span>
                : <span className="flex items-center gap-1.5"><Icon name="crown" size={16} className="shrink-0 text-cloth-800" />{sp.name} has reached its Legendary Form!</span>}
            </div>
          </div>

          {/* evolution path */}
          <div className="mt-4">
            <div className="mb-1.5 font-display text-[17px] font-bold">Evolution path</div>
            <div className="grid grid-cols-5 gap-1.5">
              {([1, 2, 3, 4, 5] as Stage[]).map((st) => {
                const reached = st <= Math.max(stage, student.bestStage);
                return (
                  <button key={st} disabled={!reached || st === 1} onClick={() => replay(student.id, st)}
                    className={`group relative rounded-xl p-1 text-center ${st === stage ? 'bg-gilt-pale ring-2 ring-gilt-deep' : 'bg-wash ring-1 ring-rule'}`}
                    title={reached && st > 1 ? `Replay the ${STAGE_NAMES[st]} evolution` : reached ? STAGE_NAMES[st] : `Unlocks at Level ${settings.evolutionLevels[st - 1]}`}>
                    <div className="aspect-square" style={reached ? undefined : { filter: 'brightness(0)', opacity: 0.22 }}>
                      <CreatureSvg species={sp} stage={st} effects={false} noShadow className="h-full w-full" />
                    </div>
                    <div className="text-[11px] font-bold leading-tight text-ink-soft">{reached ? STAGE_NAMES[st] : `Lv ${settings.evolutionLevels[st - 1]}`}</div>
                    {reached && st > 1 && <span className="absolute right-1 top-1 hidden rounded-full bg-white p-0.5 text-cloth-800 shadow group-hover:block"><Icon name="replay" size={12} strokeWidth={2.6} /></span>}
                  </button>
                );
              })}
            </div>
            {stage > 1 && <button className="btn btn-light mt-2 !py-1.5 !text-sm" onClick={() => replay(student.id, stage)}><Icon name="replay" size={16} />Replay evolution</button>}
          </div>
        </div>
      </div>

      {/* tabs side */}
      <div className="border-t border-rule p-4 sm:p-6 lg:border-l lg:border-t-0">
        <div className="mb-4 mr-12 flex gap-1 overflow-x-auto rounded-full bg-wash p-1 ring-1 ring-rule" role="tablist">
          {([['award', 'Award'], ['shop', 'Shop'], ['wardrobe', 'Wardrobe'], ['badges', 'Badges'], ['history', 'History'], ['manage', 'Manage']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 font-display font-semibold transition ${tab === k ? 'bg-cloth-800 text-white' : 'text-ink-soft hover:bg-white hover:text-ink'}`}>{l}</button>
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
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-[#fdf2d6] px-4 py-3 ring-1 ring-[#e7c77a]">
        <span className="flex items-center gap-2 font-display text-xl font-bold text-[#6b4806]"><CoinIcon size={22} /><span className="tabular">{coins}</span> coins</span>
        <span className="text-right text-[13px] text-[#6b4806]">Students earn 1 coin for every XP point.</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
        {shop.map((it) => {
          const price = it.unlock.type === 'shop' ? it.unlock.price : 0;
          const owned = student.unlockedItems.includes(it.id);
          const can = !owned && coins >= price;
          return (
            <div key={it.id} className={`flex flex-col rounded-xl p-2 text-center ring-1 ${owned ? 'bg-leaf-pale ring-leaf/30' : 'bg-wash ring-rule'}`}>
              {it.slot === 'background' ? (
                <Habitat element={v.species.element} background={it.id} className="aspect-square" rounded="rounded-xl"><span /></Habitat>
              ) : (
                <div className="aspect-square"><CreatureSvg species={v.species} stage={v.stage} equipped={{ [it.slot]: it.id }} effects={false} noShadow className="h-full w-full" /></div>
              )}
              <div className="mt-1 truncate text-xs font-extrabold">{it.name}</div>
              {owned ? (
                <button className="btn btn-light mt-1 !py-1 !text-xs" onClick={() => equip(student.id, it.slot, it.id)}><Icon name="check" size={14} strokeWidth={2.6} />Owned · Wear</button>
              ) : (
                <button className="btn btn-primary mt-1 !py-1 !text-xs" disabled={!can}
                  onClick={() => { if (buy(student.id, it.id)) { if (sound) { playCoin(); setTimeout(playPop, 120); } equip(student.id, it.slot, it.id); notify(`${student.name.split(' ')[0]} bought ${it.name}!`); } }}>
                  <CoinIcon size={14} />{price}
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
            {student.equipped[slot] && slot !== 'background' && <button className="text-[13px] font-bold text-cloth-800 underline-offset-2 hover:underline" onClick={() => equip(student.id, slot, null)}>Take off</button>}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {ITEMS.filter((i) => i.slot === slot).map((it) => {
              const owned = student.unlockedItems.includes(it.id);
              const on = student.equipped[slot] === it.id;
              return (
                <button key={it.id} disabled={!owned} onClick={() => { equip(student.id, slot, on && slot !== 'background' ? null : it.id); if (settings.soundEnabled) playPop(); }}
                  className={`relative rounded-xl p-1.5 text-center transition ${on ? 'bg-gilt-pale ring-2 ring-gilt-deep' : owned ? 'bg-wash ring-1 ring-rule hover:bg-endpaper' : 'bg-wash ring-1 ring-rule'}`}
                  title={owned ? it.description : `Locked · ${unlockText(it)}`}>
                  {slot === 'background' ? (
                    <Habitat element={v.species.element} background={it.id} className="aspect-square" rounded="rounded-xl"><span /></Habitat>
                  ) : (
                    <div className="aspect-square" style={owned ? undefined : { filter: 'grayscale(1)', opacity: 0.4 }}>
                      <CreatureSvg species={v.species} stage={v.stage} equipped={{ [slot]: it.id }} effects={false} noShadow className="h-full w-full" />
                    </div>
                  )}
                  <div className="mt-1 truncate text-[11px] font-extrabold">{it.name}</div>
                  {!owned && <div className="flex items-center justify-center gap-1 truncate text-[11px] font-bold text-ink-soft"><Icon name="lock" size={11} strokeWidth={2.4} className="shrink-0" />{unlockText(it)}</div>}
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
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl" style={{ background: got ? `color-mix(in srgb, ${a.color} 20%, white)` : 'rgb(22 36 28 / .07)' }}>{got ? a.icon : <Icon name="lock" size={18} className="text-ink-soft" />}</span>
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
                <span className="flex items-center gap-1.5"><Icon name={p.done ? 'check' : c.period === 'daily' ? 'sun' : 'calendar'} size={16} strokeWidth={2.4} className={p.done ? 'text-leaf' : 'text-sky'} />{c.title}</span>
                <span className="tabular-nums text-ink-soft">{p.value}/{c.target}</span>
              </div>
              <ProgressBar pct={p.value / c.target} color={p.done ? '#23864a' : '#1f7fbf'} height={8} className="mt-1.5" />
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
          {tags.map(([t, n]) => <span key={t} className="chip bg-wash text-ink ring-1 ring-rule">{TAG_LABELS[t as keyof typeof TAG_LABELS]} × {n}</span>)}
        </div>
      )}
      {mine.length === 0 && <p className="text-ink-soft">No activity yet. Award some points!</p>}
      <ul className="flex flex-col gap-1">
        {mine.map((e) => (
          <li key={e.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-ink/5">
            <span className={e.xp >= 0 ? 'text-leaf' : 'text-brick'} aria-hidden><Glyph icon={e.icon} size={20} /></span>
            <span className="flex-1 text-sm font-bold">{e.categoryName}<span className="block text-xs text-ink-soft">{new Date(e.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span></span>
            <span className={`font-display font-bold tabular ${e.xp >= 0 ? 'text-leaf' : 'text-brick'}`}>{e.xp >= 0 ? '+' : ''}{e.xp}</span>
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
          <button className="btn btn-light" onClick={() => { randomize(student.id); notify('New random creature!'); }}><Icon name="dice" size={18} />Random</button>
          <button className="btn btn-light" onClick={() => { setChoices(speciesChoices(classmates, 3)); setMode('choose'); }}><Icon name="choose" size={18} />Let student choose (3)</button>
          <button className="btn btn-light" onClick={() => setMode(mode === 'pick' ? 'none' : 'pick')}><Icon name="book" size={18} />Pick any creature</button>
        </div>
        {mode === 'choose' && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {choices.map((id) => { const sp = getSpecies(id); return (
              <button key={id} className="rounded-xl bg-wash p-2 text-center ring-1 ring-rule hover:bg-gilt-pale" onClick={() => { assign(student.id, id); setMode('none'); notify(`${student.name.split(' ')[0]} chose ${sp.name}!`); }}>
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
                className={`rounded-xl p-1 text-center ${sp.id === student.speciesId ? 'bg-gilt-pale ring-2 ring-gilt-deep' : 'bg-wash hover:bg-endpaper'}`} title={taken.has(sp.id) ? 'A classmate already has this creature' : sp.name}>
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

      <section className="rounded-xl border-2 border-dashed border-brick/40 p-4">
        <div className="font-bold text-brick">Remove student</div>
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
