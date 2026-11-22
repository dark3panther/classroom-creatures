import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { playBonk, playBossHit, playClassCelebration, playMultiAward, awardSound } from '../../audio/sfx';
import { AwardGrid } from '../../components/AwardGrid';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/ui';
import { CreatureSvg } from '../../creatures/CreatureSvg';
import { PixelFx, type PixelFxId } from '../../creatures/PixelFx';
import { BOSS_POINTS, type BossMood } from '../../creatures/bosses/BossArt';
import { BossPortrait } from '../../creatures/bosses/BossPortrait';
import { ADVENTURE_ART, BOSSES_BY_ID, LESSON, QUEST_CATEGORIES, REGIONS_BY_ID } from '../../data/adventure';
import { getSpecies } from '../../data/species';
import { battleTimeLeft, battleTotal } from '../../engine/adventure';
import { displayStage } from '../../engine/progression';
import { firstName } from '../../engine/util';
import { animate, reducedMotion } from '../../lib/motion';
import { useStore } from '../../store/store';
import type { BossBattle, BossContribution, CategoryTag, ElementType } from '../../types';
import { ArenaBackdrop } from './ArenaBackdrop';
import { timeLeft } from './common';

/**
 * The battle arena of a lesson battle, made for the projector. The class's creatures stand on the left, the
 * boss on the right. Every award the teacher gives (here, in the classroom or anywhere) is that creature's
 * attack: it hops, its element flies at the boss, the boss flinches and loses HP. A deduction makes the boss
 * strike back at that creature, which is dazed for a moment (and the boss recovers a little). Finishing the
 * class mission is the team attack. Rules: docs/adventure-design.md 3.6.
 */

/** each element's shot at the boss, and what it does when it lands */
const SHOT: Record<ElementType, { fx: PixelFxId; impact: PixelFxId; palette?: string[]; size?: number; impactPalette?: string[] }> = {
  fire: { fx: 'fire/fireball', impact: 'lightning/zap-hit', impactPalette: ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#ffffff'], size: 0.8 },
  water: { fx: 'water/water-orb', impact: 'water/splash', size: 0.7 },
  nature: { fx: 'arcane/arcane-orb', impact: 'lightning/zap-hit', palette: ['#0f2a10', '#2f6b2a', '#4f9a3c', '#8fd06a', '#d6f5b0', '#ffffff'], impactPalette: ['#0f2a10', '#2f6b2a', '#4f9a3c', '#8fd06a', '#bff59a', '#e8ffd6', '#ffffff', '#ffffff'], size: 0.6 },
  electric: { fx: 'lightning/ball-lightning', impact: 'lightning/zap-hit', size: 0.7 },
  ice: { fx: 'ice/ice-lance', impact: 'lightning/zap-hit', impactPalette: ['#0b3a66', '#1f6fa8', '#3fb6e8', '#8fe4ff', '#c9f4ff', '#e6fbff', '#ffffff', '#ffffff'], size: 0.7 },
  earth: { fx: 'arcane/arcane-orb', impact: 'lightning/zap-hit', palette: ['#2b1708', '#6b3d2a', '#a8693f', '#d9a066', '#f3d19a', '#fff3d6'], impactPalette: ['#2b1708', '#6b3d2a', '#a8693f', '#d9a066', '#f3d19a', '#fff3d6', '#ffffff', '#ffffff'], size: 0.6 },
  shadow: { fx: 'shadow/void-orb', impact: 'lightning/zap-hit', impactPalette: ['#120a2e', '#3a1f7a', '#6a3fc0', '#9b6ae6', '#c9a8ff', '#e6dcff', '#ffffff', '#ffffff'], size: 0.4 },
  light: { fx: 'arcane/arcane-orb', impact: 'lightning/zap-hit', palette: ['#3a2400', '#8a5d07', '#d99400', '#ffc23d', '#fff1a8', '#ffffff'], impactPalette: ['#3a2400', '#8a5d07', '#d99400', '#ffc23d', '#ffe27a', '#fff1a8', '#ffffff', '#ffffff'], size: 0.6 },
  cosmic: { fx: 'arcane/arcane-orb', impact: 'explosions/firework-burst', palette: ['#120a2e', '#3a1f7a', '#7b4fd8', '#b79cff', '#e6dcff', '#ffffff'], size: 0.6 },
  air: { fx: 'nature/tornado', impact: 'lightning/zap-hit', impactPalette: ['#1b3a4f', '#3f6f8f', '#7fb0cf', '#bfe0f0', '#dff2ff', '#eef8ff', '#ffffff', '#ffffff'], size: 0.4 },
};
const TAG_LABEL: Partial<Record<CategoryTag, string>> = {
  participation: 'Participation', work: 'Completing work', reading: 'Reading', teamwork: 'Teamwork', helping: 'Helping others', english: 'Speaking English',
  listening: 'Good listening', behaviour: 'Excellent behaviour', creativity: 'Creativity', homework: 'Homework', effort: 'Effort',
};
export const tagLabel = (t?: CategoryTag) => (t ? TAG_LABEL[t] ?? QUEST_CATEGORIES[t as keyof typeof QUEST_CATEGORIES]?.label ?? t : '');

type Move =
  | { kind: 'attack'; studentId?: string; amount: number; super?: boolean; label: string }
  | { kind: 'team'; amount: number; label: string; ids: string[]; mission?: boolean; super?: boolean }
  | { kind: 'strike'; studentId: string; amount: number; label: string };

/** New contributions → the moves to play: a big batch (whole class) is one team attack. */
function movesFrom(list: BossContribution[], allIds: string[]): Move[] {
  const groups = new Map<string, BossContribution[]>();
  for (const c of list) { const k = `${c.source}:${c.ref ?? c.id}`; groups.set(k, [...(groups.get(k) ?? []), c]); }
  const out: Move[] = [];
  for (const g of groups.values()) {
    const c = g[0];
    if (c.source === 'mission') out.push({ kind: 'team', mission: true, amount: c.amount, label: c.label, ids: allIds });
    else if (c.source === 'setback') for (const x of g) out.push({ kind: 'strike', studentId: x.studentId!, amount: -x.amount, label: x.label });
    else if (c.source === 'class') out.push({ kind: 'team', amount: c.amount, label: c.label, ids: allIds });
    else if (g.length > 3) out.push({ kind: 'team', amount: g.reduce((n, x) => n + x.amount, 0), label: c.label, ids: g.map((x) => x.studentId!).filter(Boolean), super: g.some((x) => x.super) });
    else for (const x of g) out.push({ kind: 'attack', studentId: x.studentId, amount: x.amount, super: x.super, label: x.label });
  }
  return out;
}

interface Pt { x: number; y: number; w: number; h: number }
/** `k`: screen pixels per effect pixel */
interface Shot { key: string; fx: PixelFxId; palette?: string[]; k: number; from: Pt; to: Pt; flip?: boolean; ms: number; done: () => void }
interface Blast { key: string; fx: PixelFxId; palette?: string[]; at: Pt; k: number; flip?: boolean }
interface Num { key: string; text: string; at: Pt; tone: 'hit' | 'super' | 'heal' | 'team' }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const key = () => `a${++seq}`;

export function Arena({ battle, teacher, onClose }: { battle: BossBattle; teacher: boolean; onClose?: () => void }) {
  const data = useStore((s) => s.data);
  const award = useStore((s) => s.award);
  const control = useStore((s) => s.controlBattle);
  const mission = useStore((s) => s.completeMission);
  const tick = useStore((s) => s.tickAdventure);
  const hold = useStore((s) => s.holdCelebrations);
  const settings = data.settings;
  const sound = settings.soundEnabled;
  const pixel = !!settings.pixelMode;
  const def = BOSSES_BY_ID[battle.bossId];
  const region = REGIONS_BY_ID[def.regionId];
  const students = useMemo(() => data.students.filter((s) => s.classId === battle.classId), [data.students, battle.classId]);
  const allIds = useMemo(() => students.map((s) => s.id), [students]);
  const total = battleTotal(battle);
  const lesson = battle.lesson!;
  const paused = battle.status === 'paused';
  const over = battle.status === 'won' || battle.status === 'ended';
  const [now, setNow] = useState(Date.now());
  const left = battleTimeLeft(battle, now);
  const timeUp = paused && left <= 0;

  // what the HP bar shows: it follows the animations, then settles on the real total
  const [shown, setShown] = useState(total);
  const [mood, setMood] = useState<BossMood>(battle.status === 'won' ? 'happy' : 'grumpy');
  const [dazed, setDazed] = useState<Record<string, number>>({});
  const [shots, setShots] = useState<Shot[]>([]);
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [nums, setNums] = useState<Num[]>([]);
  const [banner, setBanner] = useState<{ key: string; text: string; sub?: string; tone: 'gold' | 'brick' | 'azure'; small?: boolean } | null>(null);
  const [awardFor, setAwardFor] = useState<string | 'class' | null>(null);
  // attacks still playing: the paused / befriended overlay waits for them
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  // effects are drawn at one pixel size for the whole arena: about 1/400 of its width per effect pixel
  const [aw, setAw] = useState(1200);
  const unit = aw / 400;

  const arena = useRef<HTMLDivElement>(null);
  const bossBox = useRef<HTMLDivElement>(null);
  const tiles = useRef(new Map<string, HTMLElement>());
  const seen = useRef(new Set(battle.contributions.map((c) => c.id)));
  const queue = useRef<Move[]>([]);
  const playing = useRef(false);
  const latest = useRef(battle);
  latest.current = battle;

  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); tick(); }, 5_000); return () => clearInterval(t); }, [tick]);
  useEffect(() => { const on = () => setFull(document.fullscreenElement === arena.current); document.addEventListener('fullscreenchange', on); return () => document.removeEventListener('fullscreenchange', on); }, []);
  useEffect(() => {
    const el = arena.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAw(el.offsetWidth || 1200));
    ro.observe(el);
    setAw(el.offsetWidth || 1200);
    return () => ro.disconnect();
  }, []);

  /** a point in arena pixels */
  const rel = (el: Element | null | undefined): Pt | null => {
    const a = arena.current?.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    if (!a || !r) return null;
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, h: r.height };
  };
  const bossPoint = (which: 'hit' | 'from' | 'head'): Pt | null => {
    const a = arena.current?.getBoundingClientRect(), r = bossBox.current?.getBoundingClientRect();
    if (!a || !r) return null;
    const [fx, fy] = BOSS_POINTS[def.id]?.[which] ?? [0.5, 0.5];
    return { x: r.left - a.left + r.width * fx, y: r.top - a.top + r.height * fy, w: r.width, h: r.height };
  };
  const tileOf = (id?: string) => (id ? tiles.current.get(id) : undefined);
  const creatureEl = (id?: string) => tileOf(id)?.querySelector<HTMLElement>('[data-creature]') ?? tileOf(id);

  const fly = (s: Omit<Shot, 'key' | 'done'>) => new Promise<void>((done) => setShots((l) => [...l, { ...s, key: key(), done }]));
  const blast = (b: Omit<Blast, 'key'>) => {
    const k = key();
    setBlasts((l) => [...l, { ...b, key: k }]);
    // impacts fade out after a moment, so smoke tails never linger over the boss's face
    setTimeout(() => setBlasts((l) => l.filter((x) => x.key !== k)), 1900);
  };
  const number = (n: Omit<Num, 'key'>) => setNums((l) => [...l, { ...n, key: key() }]);
  const shake = (el: Element | null | undefined, strong = false) => {
    if (!el || reducedMotion()) return;
    animate(el, { x: strong ? [0, -16, 14, -10, 6, 0] : [0, -9, 8, -5, 3, 0], duration: strong ? 620 : 460, ease: 'out(2)' });
  };
  const hop = (id: string, delay = 0) => {
    const el = creatureEl(id);
    if (el && !reducedMotion()) animate(el, { y: [0, -0.22 * el.offsetHeight, 0], scale: [1, 1.12, 1], duration: 520, delay, ease: 'out(3)' });
  };

  /** one creature (or the class) attacks the boss */
  const attack = async (studentId: string | undefined, amount: number, sup: boolean, fast: boolean) => {
    const st = students.find((s) => s.id === studentId);
    const sh = SHOT[st ? getSpecies(st.speciesId).element : def.element];
    const from = rel(creatureEl(studentId)) ?? { x: (arena.current?.offsetWidth ?? 800) * 0.3, y: (arena.current?.offsetHeight ?? 450) * 0.7, w: 80, h: 80 };
    const to = bossPoint('hit');
    if (studentId) hop(studentId);
    await wait(fast ? 120 : 220);
    if (to) await fly({ fx: sh.fx, palette: sh.palette, k: unit * (sh.size ?? 0.6) * 1.05 * (sup ? 1.3 : 1), from, to, ms: fast ? 380 : 520 });
    if (sound) playBossHit();
    if (to) blast({ fx: sh.impact, palette: sh.impactPalette, at: to, k: unit * 0.75 * (sup ? 1.3 : 1) });
    setMood('hurt');
    shake(bossBox.current, sup);
    if (bossBox.current && !reducedMotion()) animate(bossBox.current, { filter: ['brightness(2.4)', 'brightness(1)'], duration: 320 });
    const head = bossPoint('head');
    if (head) number({ text: sup ? `−${amount} SUPER!` : `−${amount}`, at: head, tone: sup ? 'super' : 'hit' });
    setShown((v) => Math.min(latest.current.hp, v + amount));
    await wait(fast ? 380 : 620);
    setMood('grumpy');
  };

  /** every creature attacks together */
  const team = async (m: Extract<Move, { kind: 'team' }>, fast: boolean) => {
    setBanner({ key: key(), text: m.mission ? 'Mission complete!' : 'Team attack!', sub: m.mission ? lesson.mission : m.label, tone: m.mission ? 'gold' : 'azure' });
    if (sound) (m.mission ? playClassCelebration : playMultiAward)();
    m.ids.forEach((id, i) => hop(id, (i % 12) * 45));
    await wait(450);
    const shooters = [...m.ids].sort(() => Math.random() - 0.5).slice(0, fast ? 4 : 7);
    const to = bossPoint('hit');
    await Promise.all(shooters.map(async (id, i) => {
      await wait(i * 110);
      const st = students.find((s) => s.id === id);
      const sh = SHOT[st ? getSpecies(st.speciesId).element : def.element];
      const from = rel(creatureEl(id));
      if (from && to) await fly({ fx: sh.fx, palette: sh.palette, k: unit * (sh.size ?? 0.6) * 1.05, from, to: { ...to, x: to.x + (Math.random() - 0.5) * to.w * 0.25, y: to.y + (Math.random() - 0.5) * to.h * 0.25 }, ms: 520 });
    }));
    if (to) blast({ fx: 'explosions/firework-burst', at: to, k: unit * 1.05 });
    if (to && m.mission) blast({ fx: 'ui/confetti', at: { ...to, y: to.y - to.h * 0.2 }, k: unit * 1.3 });
    if (sound) playBossHit();
    setMood('hurt');
    shake(bossBox.current, true);
    const head = bossPoint('head');
    if (head) number({ text: `−${m.amount}`, at: head, tone: 'team' });
    setShown((v) => Math.min(latest.current.hp, v + m.amount));
    await wait(900);
    setMood('grumpy');
  };

  /** the boss strikes back at one creature */
  const strike = async (m: Extract<Move, { kind: 'strike' }>, fast: boolean) => {
    const target = rel(creatureEl(m.studentId));
    const st = students.find((s) => s.id === m.studentId);
    setMood('attack');
    if (bossBox.current && !reducedMotion()) animate(bossBox.current, { x: [0, -0.12 * bossBox.current.offsetWidth, 0], scale: [1, 1.08, 1], duration: fast ? 520 : 720, ease: 'inOut(2)' });
    await wait(fast ? 200 : 300);
    const from = bossPoint('from');
    const sh = SHOT[def.element];
    if (from && target) await fly({ fx: sh.fx, palette: sh.palette, k: unit * (sh.size ?? 0.6) * 0.95, from, to: target, flip: true, ms: fast ? 360 : 480 });
    if (sound) playBonk();
    if (target) blast({ fx: def.strike.fx as PixelFxId, palette: def.strike.palette, at: { ...target, y: target.y + target.h * 0.3 }, k: unit * (def.strike.fx === 'explosions/smoke-bomb' ? 0.4 : 0.6), flip: true });
    shake(tileOf(m.studentId), true);
    setDazed((d) => ({ ...d, [m.studentId]: Date.now() + 5000 }));
    setBanner({ key: key(), text: `${def.name} strikes back!`, sub: st ? `${firstName(st.name)}'s ${getSpecies(st.speciesId).name} got ${def.strike.verb}${m.amount > 0 ? `. ${def.name} gets ${m.amount} back.` : '.'}` : undefined, tone: 'brick', small: true });
    const head = bossPoint('head');
    if (head && m.amount > 0) number({ text: `+${m.amount}`, at: head, tone: 'heal' });
    setShown((v) => Math.max(0, v - m.amount));
    await wait(fast ? 600 : 900);
    setMood('grumpy');
  };

  const play = async (m: Move, fast: boolean) => {
    if (m.kind === 'attack') return attack(m.studentId, m.amount, !!m.super, fast);
    if (m.kind === 'team') return team(m, fast);
    return strike(m, fast);
  };

  const run = async () => {
    if (playing.current) return;
    playing.current = true;
    setBusy(true);
    while (queue.current.length) {
      const fast = queue.current.length > 3;
      const m = queue.current.shift()!;
      await play(m, fast);
    }
    playing.current = false;
    setBusy(false);
    const b = latest.current;
    setShown(battleTotal(b));
    if (b.status === 'won') { setMood('happy'); setBanner({ key: key(), text: `${def.name} is your friend!`, tone: 'gold' }); }
  };

  // every change to the battle: play what is new
  useEffect(() => {
    const fresh = battle.contributions.filter((c) => !seen.current.has(c.id));
    for (const c of fresh) seen.current.add(c.id);
    const moves = movesFrom(fresh, allIds);
    if (moves.length) {
      queue.current.push(...moves);
      // pop-ups (level ups, the befriend celebration) wait until the attacks have played
      hold(Date.now() + Math.min(9000, 600 + queue.current.length * 1300));
      void run();
    } else if (!playing.current) {
      setShown(total);
      if (battle.status === 'won') setMood('happy');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle]);

  // dazed creatures recover
  useEffect(() => {
    const ids = Object.keys(dazed);
    if (!ids.length) return;
    const next = Math.min(...Object.values(dazed)) - Date.now();
    const t = setTimeout(() => setDazed((d) => Object.fromEntries(Object.entries(d).filter(([, until]) => until > Date.now()))), Math.max(50, next));
    return () => clearTimeout(t);
  }, [dazed]);
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 2600); return () => clearTimeout(t); }, [banner]);

  // the line-up: back rows a little smaller, like a crowd
  const n = students.length;
  const cols = Math.max(3, Math.min(9, Math.ceil(Math.sqrt(n * 2.1))));
  const rows: typeof students[] = [];
  for (let i = 0; i < n; i += cols) rows.push(students.slice(i, i + cols));
  const hpLeft = Math.max(0, battle.hp - shown);
  const pct = battle.hp ? hpLeft / battle.hp : 0;
  const giveAward = (ids: string[], catId: string, xp: number) => { const o = award(ids, catId); if (o.length && sound) awardSound(xp, o.length); setAwardFor(null); };
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void arena.current?.requestFullscreen?.(); };
  const pickStudent = awardFor && awardFor !== 'class' ? students.find((s) => s.id === awardFor) : undefined;

  return (
    <section className="flex flex-col gap-3">
      <div ref={arena} className={`arena ${full ? 'arena-full' : ''}`} data-arena>
        {pixel ? <img src={`${ADVENTURE_ART}region-${region.id}.png`} alt="" className="pixel absolute inset-0 h-full w-full object-cover" /> : <ArenaBackdrop regionId={region.id} />}

        {/* boss */}
        <div className="arena-boss">
          <div ref={bossBox} className={`relative ${paused || over ? '' : 'arena-breathe'}`} data-boss={def.id} data-mood={mood}>
            <BossAura element={def.element} k={unit * 0.9} box={aw * 0.34} />
            <BossPortrait id={def.id} mood={mood} title={def.name} className="drop-shadow-[0_10px_0_rgb(14_42_82/.25)]" />
          </div>
        </div>

        {/* the class */}
        <div className="arena-class" role="list" aria-label="The class">
          {rows.map((row, r) => (
            <div key={r} className="arena-row" style={{ '--row-scale': `${0.78 + 0.22 * ((r + 1) / rows.length)}`, paddingLeft: r % 2 ? `${50 / cols}%` : 0 } as CSSProperties}>
              {row.map((s) => {
                const sp = getSpecies(s.speciesId);
                const isDazed = !!dazed[s.id];
                return (
                  <button key={s.id} type="button" role="listitem" ref={(el) => { if (el) tiles.current.set(s.id, el); else tiles.current.delete(s.id); }}
                    className={`arena-tile ${teacher ? '' : 'pointer-events-none'}`} style={{ width: `${100 / cols}%` }} data-student={s.id} data-dazed={isDazed || undefined}
                    onClick={() => teacher && setAwardFor(s.id)} aria-label={`${firstName(s.name)}${isDazed ? ' (dazed)' : ''}${teacher ? ': give points' : ''}`}>
                    <span className="relative block aspect-square w-full" data-creature>
                      <CreatureSvg species={sp} stage={displayStage(s, settings)} equipped={s.equipped} branch={s.branch} expression={isDazed ? 'sad' : undefined} className="h-full w-full" />
                      {isDazed && <PixelFx id="status/stunned" anchor={[0.5, 0.86]} bodyFrac={0.55} />}
                    </span>
                    <span className="arena-name">{firstName(s.name)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* heads-up: mission (left), the boss's HP and the clock (right) */}
        <div className="arena-mission">
          <div className="text-[clamp(10px,1.1vw,13px)] font-extrabold uppercase tracking-[0.08em] text-azure-700">Today's mission</div>
          <div className="font-display text-[clamp(15px,2vw,26px)] font-extrabold leading-tight">{lesson.mission}</div>
          {lesson.focusTag && <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gilt-pale px-2.5 py-0.5 text-[clamp(10px,1.1vw,14px)] font-bold text-gilt-deep"><Icon name="sparkle" size={14} />{tagLabel(lesson.focusTag)} is super effective ×{LESSON.superMultiplier}</div>}
          {lesson.missionDoneAt ? <div className="mt-2 inline-flex items-center gap-1 font-bold text-leaf"><Icon name="check" size={16} />Mission complete!</div>
            : teacher && !over && <button className="btn btn-primary mt-2 !py-1.5 !text-[clamp(12px,1.2vw,15px)]" disabled={paused} onClick={() => mission(battle.id)} data-mission><Icon name="star" size={16} />Mission complete!</button>}
        </div>
        <div className="arena-hud">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[clamp(16px,2.2vw,30px)] font-extrabold leading-none">{def.name}</span>
            <span className="text-[clamp(11px,1.2vw,15px)] font-bold tabular-nums">{over && !busy ? (battle.status === 'won' ? 'Befriended!' : 'Ended') : timeUp ? "Time's up" : paused ? 'Paused' : over ? '' : timeLeft(left)}</span>
          </div>
          <div className="arena-hp" role="progressbar" aria-label={`${def.name}'s HP`} aria-valuemin={0} aria-valuemax={battle.hp} aria-valuenow={hpLeft}>
            <i style={{ width: `${pct * 100}%` }} className={pct < 0.25 ? 'low' : ''} />
            <span>{hpLeft} / {battle.hp} HP</span>
          </div>
        </div>

        {/* flying shots, impacts, numbers, banners */}
        {shots.map((s) => <Flight key={s.key} s={s} onEnd={() => { setShots((l) => l.filter((x) => x.key !== s.key)); s.done(); }} />)}
        {blasts.map((b) => (
          <div key={b.key} className="arena-blast pointer-events-none absolute z-[5]" style={{ left: b.at.x - 19, top: b.at.y - 19, width: 38, height: 38, transform: b.flip ? 'scaleX(-1)' : undefined }}>
            <PixelFx id={b.fx} anchor={[0.5, 0.5]} bodyFrac={1} size={b.k} options={b.palette ? { palette: b.palette } : undefined} fps={30} onDone={() => setBlasts((l) => l.filter((x) => x.key !== b.key))} />
          </div>
        ))}
        {nums.map((nb) => <FloatNum key={nb.key} n={nb} onEnd={() => setNums((l) => l.filter((x) => x.key !== nb.key))} />)}
        {banner && (
          <div key={banner.key} className={`arena-banner tone-${banner.tone} ${banner.small ? 'small' : ''}`} role="status">
            <div className="arena-banner-title font-display font-extrabold leading-none">{banner.text}</div>
            {banner.sub && <div className="arena-banner-sub mt-1 font-bold">{banner.sub}</div>}
          </div>
        )}
        {(paused || over) && !banner && !busy && (
          <div className="arena-paused">
            <div className="font-display text-[clamp(20px,3.4vw,44px)] font-extrabold">{over ? (battle.status === 'won' ? `${def.name} is your friend!` : `${def.name} went home to rest`) : timeUp ? "Time's up for today!" : 'Paused'}</div>
            {!over && <div className="text-[clamp(12px,1.5vw,18px)] font-bold">{timeUp ? `The class got ${def.name} down to ${hpLeft} HP. Carry on next lesson.` : 'Points do not hit the boss while it rests.'}</div>}
            {teacher && !over && <button className="btn btn-primary mt-3" onClick={() => control(battle.id, 'resume')} data-resume><Icon name="play" size={18} />{timeUp ? 'Start the next lesson' : 'Resume'}</button>}
          </div>
        )}

        {/* teacher controls */}
        {teacher && (
          <div className="arena-controls">
            {!over && <button className="btn btn-light !py-1.5 !text-sm" onClick={() => setAwardFor('class')}><Icon name="people" size={16} />Whole class</button>}
            {!over && !paused && <button className="btn btn-light !py-1.5 !text-sm" onClick={() => control(battle.id, 'pause')}><Icon name="pause" size={16} />Pause</button>}
            {!over && <button className="btn btn-light !py-1.5 !text-sm" onClick={() => { if (confirm(`End the battle with ${def.name}? No one loses anything.`)) control(battle.id, 'end'); }}><Icon name="stop" size={16} />End</button>}
            {over && onClose && <button className="btn btn-primary !py-1.5 !text-sm" onClick={onClose}><Icon name="check" size={16} />Done</button>}
            <button className="btn btn-light !px-2.5 !py-1.5 !text-sm" onClick={toggleFull} aria-label={full ? 'Leave full screen' : 'Full screen'}><Icon name={full ? 'close' : 'expand'} size={16} /></button>
          </div>
        )}
      </div>

      <Modal open={!!awardFor} onClose={() => setAwardFor(null)} label="Give points">
        {awardFor && (
          <div className="p-5">
            <div className="mb-3 flex items-center gap-3">
              {pickStudent && <span className="h-16 w-16 shrink-0"><CreatureSvg species={getSpecies(pickStudent.speciesId)} stage={displayStage(pickStudent, settings)} equipped={pickStudent.equipped} branch={pickStudent.branch} className="h-full w-full" effects={false} /></span>}
              <div>
                <h2 className="font-display text-2xl font-bold">{pickStudent ? firstName(pickStudent.name) : 'The whole class'}</h2>
                <p className="text-sm text-ink-soft">Points: {pickStudent ? `${getSpecies(pickStudent.speciesId).name} attacks ${def.name}` : 'a team attack'}.{lesson.strikeBack ? ` Losing points: ${def.name} strikes back.` : ''}</p>
              </div>
            </div>
            <AwardGrid compact onPick={(c) => giveAward(awardFor === 'class' ? allIds : [awardFor], c.id, c.xp)} />
          </div>
        )}
      </Modal>
    </section>
  );
}

/** A shot flying from a creature to the boss (or back). */
function Flight({ s, onEnd }: { s: Shot; onEnd: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    if (reducedMotion()) { const t = setTimeout(onEnd, 60); return () => clearTimeout(t); }
    const a = animate(node, { x: [0, s.to.x - s.from.x], y: [0, s.to.y - s.from.y], duration: s.ms, ease: 'in(1.6)', onComplete: onEnd });
    return () => { a.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // aim the shot: directional effects point along the flight (the boss's shots fly the other way)
  const angle = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x) * (180 / Math.PI);
  return (
    <div ref={el} className="pointer-events-none absolute z-[5]" style={{ left: s.from.x - 19, top: s.from.y - 19, width: 38, height: 38 }}>
      <div className="h-full w-full" style={{ transform: s.flip ? `rotate(${angle + 180}deg) scaleX(-1)` : `rotate(${angle}deg)` }}>
        <PixelFx id={s.fx} anchor={[0.5, 0.5]} bodyFrac={1} size={s.k} options={s.palette ? { palette: s.palette } : undefined} fps={30} />
      </div>
    </div>
  );
}

function FloatNum({ n, onEnd }: { n: Num; onEnd: () => void }) {
  const el = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!el.current) return;
    const a = animate(el.current, { y: [0, -70], opacity: [1, 1, 0], scale: [0.6, 1.25, 1], duration: 1300, ease: 'out(3)', onComplete: onEnd });
    return () => { a.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <span ref={el} className={`arena-num tone-${n.tone}`} style={{ left: n.at.x, top: n.at.y }}>{n.text}</span>;
}

/** The boss's element around it, softly, behind and in front. */
function BossAura({ element, k, box }: { element: ElementType; k: number; box: number }) {
  const aura: Partial<Record<ElementType, { id: PixelFxId; palette?: string[]; anchor: [number, number]; size?: number; back?: boolean }[]>> = {
    nature: [{ id: 'nature/leaf-storm', anchor: [0.5, 0.98], size: 0.85, back: true }],
    earth: [{ id: 'pickups/crystal-shard', anchor: [0.12, 0.6], size: 0.7 }, { id: 'pickups/crystal-shard', anchor: [0.9, 0.45], size: 0.6 }],
    shadow: [{ id: 'shadow/shadow-flames', anchor: [0.5, 1], size: 1.2, back: true }],
    water: [{ id: 'water/water-orb', anchor: [0.12, 0.35], size: 0.55 }],
    ice: [{ id: 'ice/ice-crystal', anchor: [0.12, 0.5], size: 0.6 }, { id: 'ice/ice-crystal', anchor: [0.88, 0.35], size: 0.5 }],
    fire: [{ id: 'fire/spirit-flame', anchor: [0.1, 0.95], size: 0.8, back: true }, { id: 'fire/spirit-flame', anchor: [0.9, 0.95], size: 0.8, back: true }],
    electric: [{ id: 'lightning/ball-lightning', anchor: [0.12, 0.3], size: 0.55 }],
    air: [{ id: 'nature/leaf-storm', anchor: [0.5, 0.98], size: 0.85, back: true, palette: ['#1b3a4f', '#3f6f8f', '#7fb0cf', '#bfe0f0', '#eef8ff', '#ffffff'] }],
    cosmic: [{ id: 'arcane/rune-circle', anchor: [0.5, 1], size: 1.4, back: true, palette: ['#120a2e', '#3a1f7a', '#7b4fd8', '#b79cff', '#e6dcff', '#ffffff'] }],
    light: [{ id: 'holy/halo', anchor: [0.48, 0.42], size: 1.1, back: true }],
  };
  return <>{(aura[element] ?? []).map((a, i) => <PixelFx key={i} id={a.id} anchor={a.anchor} bodyFrac={38 / Math.max(1, box)} size={k * (a.size ?? 1)} options={a.palette ? { palette: a.palette } : undefined} fps={24} lightOpacity={0.6} className={a.back ? '-z-10' : ''} />)}</>;
}
