import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { playCreature, playPet, playPop } from '../audio/sfx';
import { BRANCHES, type Motif } from '../data/branches';
import { getSpecies } from '../data/species';
import type { Equipped, Expression, Mood, Stage } from '../types';
import { Burst, type BurstKind } from './Burst';
import { CreatureSvg } from './CreatureSvg';
import { ElementAmbient, EmotionFx } from './EmotionFx';
import { PixelFx, type PixelFxId } from './PixelFx';
import { Trail } from './pixel';
import type { Pulse } from '../store/store';

export type CreatureAction = 'jump' | 'wave' | 'ability' | 'happy' | 'celebrate' | 'bonk';

export interface CreatureProps {
  speciesId: string;
  stage: Stage;
  equipped?: Equipped;
  /** change this number to make the creature react (e.g. after an award) */
  celebrateKey?: number;
  /** what kind of award caused celebrateKey to change */
  reactKind?: 'good' | 'bad';
  /** click to play, press-and-hold to pet, follows the pointer */
  interactive?: boolean;
  /** externally triggered action (key must change to replay) */
  action?: { type: CreatureAction; key: number } | null;
  /** how the creature feels: drives its face (classic art), idle motion and mood effects */
  mood?: Mood;
  /** drifting element particles around the creature */
  ambient?: boolean | number;
  effects?: boolean;
  compact?: boolean;
  className?: string;
  sound?: boolean;
  /** the latest award for this creature: picks the pixel effects it reacts with */
  event?: Pulse;
  /** chocolate treats earned and not handed out yet: the creature holds one */
  treats?: number;
  /** chosen final path ('b' = mythical aspect with its own look and pixel aura) */
  branch?: 'a' | 'b';
  /** play an ability's pixel animation (change `key` to cast again) */
  cast?: { key: number; fx: PixelFxId; anchor?: [number, number]; size?: number; palette?: string[]; duration?: number } | null;
}

interface FxPlay { key: string; id: PixelFxId; anchor?: [number, number]; size?: number; duration?: number; options?: Record<string, unknown>; bodyFrac?: number }

/** Positive effects for achievements, negative ones for each kind of deduction. */
function reactionFx(e: Pulse, compact?: boolean): FxPlay[] {
  const k = `${e.n}`;
  if (e.kind === 'bad') {
    const status: PixelFxId = e.categoryId === 'neg-listening' ? 'status/confused' : e.categoryId === 'neg-unfinished' ? 'status/slowed' : 'status/stunned';
    return [
      { key: `${k}-pow`, id: 'explosions/cartoon-pow', anchor: [0.5, 0.42], size: compact ? COMPACT_POW : 0.5, options: { text: 'BONK!' } },
      { key: `${k}-st`, id: status, duration: 4 },
    ];
  }
  const out: FxPlay[] = [
    { key: `${k}-burst`, id: 'pickups/collect-burst', anchor: [0.5, 0.95], size: 0.8 },
    { key: `${k}-emote`, id: 'ui/exclamation' },
  ];
  if (e.levelUp) out.push({ key: `${k}-lvl`, id: 'ui/level-up', size: 0.85 });
  if (e.achievement) out.push({ key: `${k}-star`, id: 'pickups/power-star', anchor: [0.5, 0.3], size: 0.7, duration: 1.6 });
  if (e.milestone) out.push({ key: `${k}-sun`, id: 'holy/sunburst', anchor: [0.5, 0.55], size: 0.9, duration: 2.6 });
  return out;
}

const MOOD_FX: Partial<Record<Mood, PixelFxId>> = { happy: 'status/charmed', excited: 'holy/blessing', proud: 'holy/halo', sleepy: 'status/sleep' };
const COMPACT_POW = 0.36;

/** pixel-art special effects a student can equip (magic slot) */
interface EquipFx { id: PixelFxId; anchor?: [number, number]; size?: number; palette?: string[]; shadow?: boolean; large?: { anchor?: [number, number]; size?: number; clearCentre?: boolean } }
/**
 * Pixel-art special effects a student can equip (magic slot). On large views (profile, dressing room)
 * the pixels get big, so effects that would cover the creature move aside or keep only their rim.
 */
const EQUIP_FX: Record<string, EquipFx> = {
  'fx-shield': { id: 'holy/divine-shield', palette: ['#0b3a66', '#1f6fa8', '#3fb6e8', '#8fe4ff', '#e6fbff', '#ffffff'], large: { clearCentre: true } },
  'fx-orbs': { id: 'pickups/xp-orb', anchor: [0.82, 0.42], size: 0.55, shadow: false },
  'fx-crystals': { id: 'pickups/crystal-shard', anchor: [0.16, 0.5], size: 0.6, shadow: false },
  'fx-gems': { id: 'pickups/gem-spin', anchor: [0.84, 0.36], size: 0.5, shadow: false },
  'fx-beam': { id: 'pickups/loot-beam', anchor: [0.5, 0.97], size: 0.9, large: { anchor: [0.86, 0.9], size: 0.42 } },
};
/** keeps a full-body effect's rim and clears the middle, where the creature's face is */
const CLEAR_CENTRE = { maskImage: 'radial-gradient(ellipse 50% 52% at 50% 56%, transparent 62%, #000 86%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 52% at 50% 56%, transparent 62%, #000 86%)' };

/**
 * The pixel particles drifting around each mythical aspect (on large views, unless a trail is worn).
 * Particles stay around the creature; full-body pixel effects scaled to a big plate covered its face.
 */
const MYTH_AURA: Partial<Record<Motif, string>> = {
  frostflame: 'trail-snow', stormtide: 'trail-bubble', voidvolt: 'trail-star', sunfrost: 'trail-snow',
  amethyst: 'trail-sparkle', dawn: 'trail-sparkle', moon: 'trail-star', nebula: 'trail-star',
};

const CYCLE: CreatureAction[] = ['jump', 'wave', 'ability', 'happy'];
const MOOD_FACE: Record<Mood, Expression> = { happy: 'happy', excited: 'excited', proud: 'happy', calm: 'happy', sad: 'sad', sleepy: 'sleepy' };

/** The animated creature: idle loop, feelings, reactions, particles and play. */
export function Creature({ speciesId, stage, equipped, celebrateKey, reactKind = 'good', interactive, action, mood = 'calm', ambient, effects = true, compact, className = '', sound = true, event, treats = 0, branch, cast }: CreatureProps) {
  const sp = getSpecies(speciesId);
  const myth = stage === 5 && branch === 'b' ? BRANCHES[speciesId]?.b : undefined;
  const controls = useAnimationControls();
  const [expr, setExpr] = useState<Expression | null>(null);
  const [burst, setBurst] = useState<{ kind: BurstKind | 'hearts'; key: number } | null>(null);
  const [current, setCurrent] = useState<CreatureAction | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [fx, setFx] = useState<FxPlay[]>([]);
  const lastEvent = useRef(event?.n);
  useEffect(() => {
    if (!event || event.n === lastEvent.current) return;
    lastEvent.current = event.n;
    if (effects) setFx((list) => [...list.slice(-4), ...reactionFx(event, compact)]);
  }, [event, effects]);
  useEffect(() => {
    if (!cast || !effects) return;
    setFx((list) => [...list.slice(-4), { key: `cast-${cast.key}`, id: cast.fx, anchor: cast.anchor, size: cast.size, duration: cast.duration ?? 2.6, options: cast.palette ? { palette: cast.palette } : undefined }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cast?.key]);
  const cycle = useRef(0);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const hold = useRef<ReturnType<typeof setInterval>>();
  const held = useRef(false);

  const run = async (a: CreatureAction) => {
    setCurrent(a);
    clearTimeout(timer.current);
    setExpr(a === 'bonk' ? 'sad' : a === 'ability' ? 'wow' : 'excited');
    if (a === 'ability') setBurst({ kind: sp.element, key: Date.now() });
    if (a === 'celebrate') setBurst({ kind: 'sparkle', key: Date.now() });
    switch (a) {
      case 'jump':
      case 'celebrate':
        await controls.start({ y: [0, 6, -60, 0, -18, 0], scaleX: [1, 1.12, 0.92, 1.1, 0.96, 1], scaleY: [1, 0.86, 1.1, 0.9, 1.04, 1], transition: { duration: 0.85, ease: 'easeOut' } });
        break;
      case 'bonk':
        await controls.start({ y: [0, 14, 4, 8, 6], scaleX: [1, 1.25, 0.95, 1.06, 1.03], scaleY: [1, 0.68, 1.04, 0.94, 0.97], rotate: [0, -6, 5, -3, 0], transition: { duration: 0.7, ease: 'easeOut' } });
        break;
      case 'happy':
        await controls.start({ rotate: [0, -12, 372, 360], y: [0, -20, -20, 0], transition: { duration: 0.9, ease: 'easeInOut' } });
        controls.set({ rotate: 0 });
        break;
      case 'ability':
        await controls.start({ scale: [1, 1.15, 0.95, 1.05, 1], transition: { duration: 0.8 } });
        break;
      case 'wave':
        await controls.start({ rotate: [0, -4, 4, -4, 0], transition: { duration: 1.6 } });
        break;
    }
    timer.current = setTimeout(() => {
      setExpr(null); setCurrent(null);
      if (a === 'bonk') controls.start({ y: 0, scaleX: 1, scaleY: 1, transition: { duration: 0.6 } });
    }, a === 'bonk' ? 2600 : a === 'wave' ? 300 : 500);
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (celebrateKey !== undefined) void run(reactKind === 'bad' ? 'bonk' : 'celebrate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateKey]);

  useEffect(() => {
    if (action) void run(action.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.key]);

  useEffect(() => () => { clearTimeout(timer.current); clearInterval(hold.current); }, []);

  const pet = () => {
    if (sound) playPet();
    setExpr('happy');
    setBurst({ kind: 'hearts', key: Date.now() });
  };
  const onDown = () => {
    if (!interactive) return;
    held.current = false;
    clearInterval(hold.current);
    hold.current = setInterval(() => { held.current = true; pet(); }, 550);
  };
  const onUp = () => {
    clearInterval(hold.current);
    if (held.current) { timer.current = setTimeout(() => setExpr(null), 900); }
  };
  const onClick = () => {
    if (!interactive || held.current) { held.current = false; return; }
    const a = CYCLE[cycle.current++ % CYCLE.length];
    if (sound) {
      if (a === 'ability') playPop();
      playCreature(sp.sound, a !== 'wave');
    }
    void run(a);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
  };

  const sadNow = current === 'bonk' || (!current && mood === 'sad');
  const shownMood: Mood = current === 'bonk' ? 'sad' : current ? 'excited' : mood;
  const idle = !effects ? '' : sadNow ? 'idle-sad' : mood === 'excited' ? 'idle-excited' : mood === 'sleepy' ? 'idle-breathe' : `idle-${sp.idle}`;
  const face: Expression = expr ?? MOOD_FACE[mood];
  const ambientCount = ambient === true ? 6 : typeof ambient === 'number' ? ambient : 0;

  return (
    <div className={`relative select-none ${className}`} data-action={current ?? undefined}
      onPointerMove={onMove} onPointerLeave={() => { setTilt({ x: 0, y: 0 }); onUp(); }} onPointerDown={onDown} onPointerUp={onUp}>
      {effects && equipped?.trail && <Trail id={equipped.trail} compact={compact} />}
      {effects && ambientCount > 0 && <ElementAmbient element={sp.element} count={ambientCount} />}
      <div className={`h-full w-full ${idle}`}>
        {/* large views also breathe, under whatever idle loop the species has */}
        <div className={`h-full w-full ${!compact && effects && idle !== 'idle-breathe' ? 'cc-breath' : ''}`}>
        <motion.div animate={controls} className="h-full w-full" style={{ transformOrigin: '50% 90%' }}>
          <div className="h-full w-full transition-transform duration-200 ease-out"
            style={interactive ? { transform: `perspective(600px) rotateY(${tilt.x * 10}deg) rotateX(${-tilt.y * 6}deg) translateX(${tilt.x * 3}%)` } : undefined}>
            {interactive ? (
              <button type="button" onClick={onClick} className="block h-full w-full rounded-full" aria-label={`Play with ${sp.name} (tap to play, hold to pet)`}>
                <CreatureSvg species={sp} stage={stage} equipped={equipped} expression={face} effects={effects} className="h-full w-full" branch={branch} />
              </button>
            ) : (
              <CreatureSvg species={sp} stage={stage} equipped={equipped} expression={face} effects={effects} className="h-full w-full" branch={branch} />
            )}
          </div>
        </motion.div>
        </div>
      </div>
      {effects && shownMood === 'sad' && <EmotionFx mood="sad" compact={compact} />}
      {effects && equipped?.magic && EQUIP_FX[equipped.magic] && (() => {
        const f = EQUIP_FX[equipped.magic!];
        const big = compact ? undefined : f.large;
        const options = { ...(f.palette ? { palette: f.palette } : {}), ...(f.shadow === false ? { shadow: false } : {}) };
        return <PixelFx key={`equip-${equipped.magic}`} id={f.id} anchor={big?.anchor ?? f.anchor} size={big?.size ?? f.size} options={options} fps={compact ? 16 : 24} lightOpacity={0.6} style={big?.clearCentre ? CLEAR_CENTRE : undefined} />;
      })()}
      {effects && myth && !compact && !equipped?.trail && MYTH_AURA[myth.motif] && <Trail key={`myth-${myth.motif}`} id={MYTH_AURA[myth.motif]!} />}
      {effects && !current && !myth && MOOD_FX[mood] && (compact
        ? <PixelFx key={`mood-${mood}`} id={MOOD_FX[mood]!} fps={20} />
        // large views: a smaller stand-in with its head where the creature's head is, so the pixels stay fine
        : mood === 'excited' ? <PixelFx key={`mood-${mood}`} id={MOOD_FX[mood]!} fps={30} />
        : <PixelFx key={`mood-${mood}`} id={MOOD_FX[mood]!} fps={30} bodyFrac={0.34} anchor={[0.5, 0.65]} />)}
      {effects && treats > 0 && (
        <>
          <PixelFx key="treat" id="pickups/choco-stick" anchor={compact ? [0.8, 0.98] : [0.78, 0.9]} size={compact ? 0.42 : 0.2} options={{ shadow: false }} fps={compact ? 20 : 30} />
          {treats > 1 && <span className={`absolute grid h-5 min-w-5 place-items-center rounded-full bg-[#d8242f] px-1 text-[10px] font-extrabold text-white ring-2 ring-white ${compact ? 'bottom-[4%] right-[4%]' : 'left-[81%] top-[83%]'}`}>×{treats}</span>}
        </>
      )}
      {fx.map((f) => (
        <PixelFx key={f.key} id={f.id} anchor={f.anchor} size={f.size} duration={f.duration} options={f.options} fps={compact ? 24 : 30}
          onDone={() => setFx((list) => list.filter((x) => x.key !== f.key))} />
      ))}
      {burst && burst.kind === 'hearts' && <HeartBurst key={burst.key} />}
      {burst && burst.kind !== 'hearts' && <Burst key={burst.key} kind={burst.kind} count={burst.kind === 'sparkle' ? 12 : 16} />}
    </div>
  );
}

function HeartBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <motion.span key={i} className="absolute text-2xl" initial={{ y: 0, x: 0, opacity: 1, scale: 0.4 }}
          animate={{ y: -90 - (i % 3) * 20, x: (i - 3) * 22, opacity: 0, scale: 1.2 }} transition={{ duration: 1.2, delay: i * 0.05 }}>💖</motion.span>
      ))}
    </div>
  );
}
