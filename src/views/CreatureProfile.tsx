import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { playAbility, playCreature, playFeed, playPet, playToy } from '../audio/sfx';
import { AbilityTree } from '../components/Abilities';
import { EvolveBadge } from '../components/Evolve';
import { CoinIcon, Glyph, Icon } from '../components/Icon';
import { ElementBadge, ProgressBar } from '../components/ui';
import { Creature, type CreatureAction } from '../creatures/Creature';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { Habitat } from '../creatures/Habitat';
import type { PixelFxId } from '../creatures/PixelFx';
import { PixelSprite, SPRITES } from '../creatures/pixel';
import type { AbilityDef } from '../data/abilities';
import { BRANCHES } from '../data/branches';
import { ACHIEVEMENTS, ITEMS_BY_ID, SLOTS, SLOT_ONE } from '../data/defaults';
import { ELEMENTS, RARITIES, STAGE_NAMES } from '../data/elements';
import { line, personalityOf, SNACKS, TOYS, type Snack, type Toy } from '../data/personality';
import { fieldNo, getSpecies } from '../data/species';
import { collectionStats, formsOf } from '../engine/collection';
import { firstName, timeAgo } from '../engine/util';
import { elementPalette } from '../lib/color';
import { navigate } from '../lib/router';
import { useStudentView } from '../lib/stats';
import { useMood } from '../lib/useMood';
import { MOODS } from '../engine/mood';
import { useStore } from '../store/store';
import type { Stage, Student } from '../types';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export function CreatureProfile({ studentId }: { studentId: string }) {
  const student = useStore((s) => s.data.students.find((x) => x.id === studentId));
  if (!student) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">This creature could not be found</h1>
        <p className="mt-2 text-ink-soft">The student may have been removed or moved to another computer.</p>
        <button className="btn btn-primary mt-5" onClick={() => navigate('/')}>Back to the classroom</button>
      </div>
    );
  }
  return <Profile student={student} />;
}

interface Bubble { key: number; text: string }

function Profile({ student }: { student: Student }) {
  const data = useStore((s) => s.data);
  const settings = data.settings;
  const locked = useStore((s) => s.locked);
  const interact = useStore((s) => s.interact);
  const update = useStore((s) => s.updateStudent);
  const pulse = useStore((s) => s.pulses[student.id]);
  const v = useStudentView(student)!;
  const mood = useMood(student);
  const sp = v.species;
  const el = ELEMENTS[sp.element];
  const p = personalityOf(sp.id);
  const name = student.nickname ?? sp.name;
  const sound = settings.soundEnabled;
  const canStudent = !locked || settings.shopWhileLocked;
  const myth = v.stage === 5 && student.branch === 'b' ? BRANCHES[sp.id]?.b : undefined;
  const r = RARITIES[myth ? 'mythical' : sp.rarity];
  const cls = data.classes.find((c) => c.id === student.classId);
  const col = collectionStats(cls);

  const [act, setAct] = useState<{ type: CreatureAction; key: number } | null>(null);
  const [cast, setCast] = useState<{ key: number; fx: PixelFxId; anchor?: [number, number]; size?: number; palette?: string[] } | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [tray, setTray] = useState<'feed' | 'play' | null>(null);
  const [thrown, setThrown] = useState<{ key: number; sprite: string; kind: 'feed' | 'play' } | null>(null);
  const [naming, setNaming] = useState(false);
  const [nick, setNick] = useState(student.nickname ?? '');

  useEffect(() => { if (!bubble) return; const t = setTimeout(() => setBubble(null), 2800); return () => clearTimeout(t); }, [bubble]);
  // a reaction line when this creature earns XP while the profile is open
  useEffect(() => { if (pulse && pulse.kind === 'good') setBubble({ key: Date.now(), text: line(p.lines.award, name) }); }, [pulse?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (text: string) => setBubble({ key: Date.now(), text });
  const doPet = () => { interact(student.id, 'pet'); if (sound) playPet(); setAct({ type: 'happy', key: Date.now() }); say(line(p.lines.pet, name)); };
  const doFeed = (snack: Snack) => {
    setTray(null);
    setThrown({ key: Date.now(), sprite: snack, kind: 'feed' });
    setTimeout(() => {
      interact(student.id, 'feed');
      if (sound) playFeed();
      setAct({ type: snack === p.favSnack ? 'celebrate' : 'happy', key: Date.now() });
      say(line(snack === p.favSnack ? p.lines.fav : p.lines.feed, name));
    }, 650);
  };
  const doPlay = (toy: Toy) => {
    setTray(null);
    setThrown({ key: Date.now(), sprite: toy, kind: 'play' });
    if (sound) playToy();
    setTimeout(() => {
      interact(student.id, 'play');
      setAct({ type: toy === p.favToy ? 'celebrate' : 'jump', key: Date.now() });
      say(line(toy === p.favToy ? p.lines.fav : p.lines.play, name));
    }, 500);
  };
  const doCast = (def: AbilityDef) => {
    if (sound) playAbility(sp.element);
    setAct({ type: 'ability', key: Date.now() });
    setCast({ key: Date.now(), fx: def.fx as PixelFxId, anchor: def.anchor, size: def.size, palette: def.kind === 'ultimate' && myth ? myth.aura : elementPalette(el) });
    say(`${name} used ${def.name}!`);
  };

  const earned = new Map(student.achievements.map((a) => [a.id, a.at]));
  const reached = (st: Stage) => st <= v.stage;
  const forms = formsOf(student);

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-5 sm:px-6">
      {/* header */}
      <div className="flex flex-wrap items-start gap-3">
        <button className="btn btn-ghost !px-3" onClick={() => navigate(locked ? '/present' : '/')} aria-label="Back"><Icon name="back" size={18} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {naming ? (
              <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); update(student.id, { nickname: nick.trim() || undefined }); setNaming(false); }}>
                <input className="input !w-64 !py-1.5 font-display text-2xl font-bold" value={nick} maxLength={24} autoFocus onChange={(e) => setNick(e.target.value)} placeholder={sp.name} aria-label="Creature nickname" />
                <button className="btn btn-cloth !py-1.5" type="submit">Save</button>
                <button className="btn btn-ghost !py-1.5" type="button" onClick={() => setNaming(false)}>Cancel</button>
              </form>
            ) : (
              <>
                <h1 className="font-display text-[34px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[44px]">{name}</h1>
                {!locked && <button className="grid h-9 w-9 place-items-center rounded-full text-ink-soft ring-1 ring-rule hover:bg-wash" onClick={() => { setNick(student.nickname ?? ''); setNaming(true); }} aria-label="Give the creature a nickname"><Glyph icon="✏️" size={16} /></button>}
              </>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-ink-soft">
            <span><b className="text-ink">{firstName(student.name)}</b>’s creature</span>
            <span className="tabular">{fieldNo(sp.id)}</span>
            <b className="text-ink">{sp.name}{myth ? `, ${myth.title}` : v.stage === 5 ? `, ${sp.legendTitle}` : ''}</b>
            <ElementBadge element={sp.element} />
            <span className="chip ring-1" style={{ color: r.color, background: `color-mix(in srgb, ${r.color} 10%, white)`, ['--tw-ring-color' as string]: `color-mix(in srgb, ${r.color} 35%, white)` }}>{r.name}</span>
            <span className="chip bg-white text-ink ring-1 ring-rule">{p.label}</span>
            {student.isDemo && <span className="chip bg-berry/10 text-berry ring-1 ring-berry/30">Demo</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#fdf2d6] px-4 py-2 ring-1 ring-[#e7c77a]" aria-label={`${student.coins} coins`}>
          <CoinIcon size={22} /><span className="font-display text-2xl font-extrabold text-[#6b4806] tabular">{student.coins ?? 0}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* creature side */}
        <section className="lg:sticky lg:top-24 lg:self-start">
          <div className="paper relative p-3">
            <Habitat element={sp.element} seed={sp.id} background={student.equipped.background} className="aspect-square w-full" rounded="rounded-[12px]">
              <Creature speciesId={sp.id} stage={v.stage} branch={student.branch} equipped={student.equipped} celebrateKey={pulse?.n} reactKind={pulse?.kind} event={pulse}
                treats={(student.milestoneRewards ?? []).filter((x) => !x.given).length} mood={mood} ambient={8} interactive action={act} cast={cast} sound={sound} className="mx-auto h-full w-[78%]" />
              <AnimatePresence>
                {thrown && (
                  <motion.div key={thrown.key} className="pointer-events-none absolute left-1/2 top-1/2" initial={{ x: thrown.kind === 'feed' ? 160 : -170, y: 140, scale: 1.2, opacity: 1 }}
                    animate={thrown.kind === 'feed' ? { x: -14, y: -24, scale: 0.4, opacity: [1, 1, 0] } : { x: [-170, -40, 60, 10], y: [140, -60, 30, 90], rotate: [0, 200, 400, 520], opacity: [1, 1, 1, 0] }}
                    transition={{ duration: thrown.kind === 'feed' ? 0.7 : 1.2, ease: 'easeOut' }} onAnimationComplete={() => setThrown(null)}>
                    <PixelSprite sprite={SPRITES[thrown.sprite]} size={48} />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {bubble && (
                  <motion.div key={bubble.key} className="absolute inset-x-4 top-3 z-20 mx-auto max-w-[80%] rounded-2xl bg-white px-4 py-2 text-center font-display text-[17px] font-bold text-ink shadow-[var(--shadow-lift)] ring-1 ring-rule"
                    initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} role="status">
                    {bubble.text}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="chip bg-white/90 !py-1 !text-[13px] text-ink ring-1 ring-rule"><span className="h-2.5 w-2.5 rounded-full" style={{ background: MOODS[mood].color }} />Feeling {MOODS[mood].label.toLowerCase()}</span>
              </div>
              <EvolveBadge student={student} className="absolute bottom-3 right-3" />
            </Habitat>
            {/* interactions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn btn-light" onClick={doPet}><Icon name="heart" size={17} />Pet</button>
              <button className={`btn ${tray === 'feed' ? 'btn-cloth' : 'btn-light'}`} onClick={() => setTray(tray === 'feed' ? null : 'feed')} aria-expanded={tray === 'feed'}><PixelSprite sprite={SPRITES.berry} size={18} />Feed</button>
              <button className={`btn ${tray === 'play' ? 'btn-cloth' : 'btn-light'}`} onClick={() => setTray(tray === 'play' ? null : 'play')} aria-expanded={tray === 'play'}><PixelSprite sprite={SPRITES.ball} size={18} />Play</button>
              <button className="btn btn-light" onClick={() => { if (sound) playCreature(sp.sound, true); setAct({ type: 'wave', key: Date.now() }); }}><Icon name="music" size={17} />Sing</button>
              {canStudent && <button className="btn btn-cloth ml-auto" onClick={() => navigate(`/creature/${student.id}/customize`)}><Icon name="sparkle" size={16} />Dressing room</button>}
            </div>
            <AnimatePresence>
              {tray && (
                <motion.div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-wash p-2 ring-1 ring-rule" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  {(tray === 'feed' ? SNACKS : TOYS).map((x) => {
                    const fav = tray === 'feed' ? x.id === p.favSnack : x.id === p.favToy;
                    return (
                      <button key={x.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-bold ring-1 ring-rule hover:bg-endpaper"
                        onClick={() => (tray === 'feed' ? doFeed(x.id as Snack) : doPlay(x.id as Toy))}>
                        <PixelSprite sprite={SPRITES[x.id]} size={28} />{x.label}{fav && <span className="chip bg-gilt-pale text-gilt-ink">Favourite</span>}
                      </button>
                    );
                  })}
                  <span className="self-center text-[13px] text-ink-soft">Snacks and toys are free and just for fun.</span>
                </motion.div>
              )}
            </AnimatePresence>
            {/* equipped */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SLOTS.map(({ slot }) => {
                const id = student.equipped[slot];
                if (!id || (slot === 'background' && id === 'bg-habitat')) return null;
                return <span key={slot} className="chip bg-white !py-1 !text-[13px] text-ink ring-1 ring-rule"><span className="text-ink-soft">{SLOT_ONE[slot]}:</span> {ITEMS_BY_ID[id]?.name ?? id}</span>;
              })}
            </div>
          </div>
        </section>

        {/* information side */}
        <section className="flex flex-col gap-4">
          {/* stats + evolution */}
          <div className="panel p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <span className="font-display font-extrabold leading-[0.85] tracking-[-0.03em]"><span className="text-2xl">Level </span><span className="text-[72px] tabular">{v.level}</span></span>
              <span className="text-right font-display leading-[0.85]"><span className="text-[48px] font-extrabold tracking-[-0.02em] tabular">{student.xp.toLocaleString()}</span><span className="text-xl font-bold text-ink-soft"> XP</span></span>
            </div>
            <ProgressBar pct={v.prog.pct} height={12} color={el.color} className="mt-3" />
            <div className="mt-1 text-[13px] font-bold text-ink-soft">{v.prog.isMax ? 'Highest level reached!' : `${v.prog.toNext} XP to Level ${v.level + 1}`}</div>

            <h3 className="mt-4 font-display text-[17px] font-bold">Evolution</h3>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {([1, 2, 3, 4, 5] as Stage[]).map((st) => {
                const on = st === v.stage;
                const seen = reached(st);
                return (
                  <div key={st} className={`rounded-xl p-1 text-center ring-1 ${on ? 'bg-gilt-pale ring-2 ring-gilt-deep' : seen ? 'bg-wash ring-rule' : 'bg-white ring-rule'}`}>
                    <div className="aspect-square" style={seen ? undefined : { filter: 'brightness(0)', opacity: 0.18 }}>
                      <CreatureSvg species={sp} stage={st} branch={st === 5 ? student.branch : undefined} effects={false} noShadow className="h-full w-full" />
                    </div>
                    <div className="text-[11px] font-bold leading-tight text-ink-soft">{ROMAN[st - 1]} · {seen ? STAGE_NAMES[st] : `Lv ${settings.evolutionLevels[st - 1]}`}</div>
                  </div>
                );
              })}
            </div>
            {v.evo.next ? (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 text-[14px] font-bold">
                  <span>{v.evo.ready ? <>Ready to evolve into <span className="text-cloth-800">{STAGE_NAMES[v.evo.next]}</span>!</> : <>{v.evo.xpNeeded} XP to <span className="text-cloth-800">{STAGE_NAMES[v.evo.next]}</span> (Level {v.evo.level})</>}</span>
                  <span className="tabular text-ink-soft">{Math.round(v.evo.pct * 100)}%</span>
                </div>
                <ProgressBar pct={v.evo.pct} height={14} color={v.evo.ready ? '#f4b631' : '#1d5643'} className="mt-1.5 ring-1 ring-rule" glow={v.evo.ready} />
              </div>
            ) : (
              <p className="mt-3 text-[14px] font-bold">{name} reached its final form{myth ? `: the mythical ${myth.title}` : `: ${sp.legendTitle}`}.</p>
            )}
            {BRANCHES[sp.id] && v.stage < 5 && <p className="mt-2 text-[13px] text-ink-soft">At the final stage {sp.name} chooses between two paths: {BRANCHES[sp.id].a.title} or the mythical {BRANCHES[sp.id].b.title}.</p>}
          </div>

          {/* personality */}
          <div className="panel p-4">
            <h3 className="font-display text-[20px] font-extrabold">Personality: {p.label}</h3>
            <p className="mt-1 text-[15px]">{sp.personality} {p.trait}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
              <span className="chip bg-wash !py-1 text-ink ring-1 ring-rule"><PixelSprite sprite={SPRITES[p.favSnack]} size={16} />Loves {({ fish: 'fish', berry: 'berries', cookie: 'cookies' } as const)[p.favSnack]}</span>
              <span className="chip bg-wash !py-1 text-ink ring-1 ring-rule"><PixelSprite sprite={SPRITES[p.favToy]} size={16} />Favourite toy: {TOYS.find((t) => t.id === p.favToy)?.label.toLowerCase()}</span>
              <span className="chip bg-wash !py-1 text-ink ring-1 ring-rule"><Icon name="heart" size={13} />{(student.interactions?.pet ?? 0) + (student.interactions?.feed ?? 0) + (student.interactions?.play ?? 0)} moments together</span>
            </div>
          </div>

          {/* abilities */}
          <div className="panel p-4"><AbilityTree student={student} onCast={doCast} canEdit={canStudent} /></div>

          {/* achievements */}
          <div className="panel p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-[20px] font-extrabold">Achievements</h3>
              <span className="text-[13px] font-bold text-ink-soft tabular">{earned.size} of {ACHIEVEMENTS.length}</span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const at = earned.get(a.id);
                return (
                  <div key={a.id} className={`flex items-center gap-2.5 rounded-xl p-2 ring-1 ${at ? 'bg-white ring-rule' : 'bg-wash ring-rule/70'}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: at ? `color-mix(in srgb, ${a.color} 18%, white)` : 'rgb(22 36 28 / .06)', color: at ? `color-mix(in srgb, ${a.color} 75%, #16241c)` : '#8a958c' }}>
                      {at ? <Glyph icon={a.icon} size={20} /> : <Icon name="lock" size={16} />}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block font-bold">{a.name}</span>
                      <span className="block text-[12px] text-ink-soft">{a.description}{a.reward ? ` Reward: ${a.reward}.` : ''}</span>
                      {at && <span className="block text-[11px] font-bold text-leaf">Earned {timeAgo(at)}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* history + collection */}
          <div className="panel p-4">
            <h3 className="font-display text-[20px] font-extrabold">Field notes</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">
              <li className="flex gap-2"><Icon name="book" size={16} className="mt-0.5 shrink-0 text-cloth-800" /><span>Hatched as a baby {getSpecies((student.evolutionLog?.[0]?.speciesId) ?? sp.id).name} · {new Date(student.createdAt).toLocaleDateString()}</span></li>
              {(student.evolutionLog ?? []).map((e, i) => {
                const esp = getSpecies(e.speciesId);
                const path = e.stage === 5 && e.branch && BRANCHES[e.speciesId] ? BRANCHES[e.speciesId][e.branch] : undefined;
                return <li key={i} className="flex gap-2"><Icon name="sparkle" size={16} className="mt-0.5 shrink-0 text-gilt-deep" /><span>{esp.name} evolved to Stage {ROMAN[e.stage - 1]}, {STAGE_NAMES[e.stage]}{path ? ` (${path.id === 'b' ? 'mythical path' : 'classic path'}: ${path.title})` : ''} · {new Date(e.at).toLocaleDateString()}</span></li>;
              })}
            </ul>
            <div className="mt-3 rounded-xl bg-wash p-3 text-[14px] ring-1 ring-rule">
              {name} has revealed <b className="tabular">{forms.length}</b> form{forms.length === 1 ? '' : 's'} of the field guide. The class has discovered <b className="tabular">{col.discovered}</b> of <b className="tabular">{col.total}</b> ({Math.round(col.pct * 100)}%).
              <button className="ml-1 font-bold text-cloth-800 underline-offset-2 hover:underline" onClick={() => navigate('/creatures')}>Open the field guide</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
