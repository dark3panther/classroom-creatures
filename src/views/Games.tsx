import { useEffect, useMemo, useRef, useState } from 'react';
import { GodotStage, useStage3d, type GodotStageHandle, type StageMessage, type StageScene } from '../components/GodotStage';
import { Icon } from '../components/Icon';
import { BOSSES, BOSSES_BY_ID } from '../data/adventure';
import { getSpecies } from '../data/species';
import { hasIllustration, illustrationUrl } from '../creatures/Illustrated';
import { firstName } from '../engine/util';
import { sendClass, stageCreature, withPicture } from '../lib/stage';
import { navigate } from '../lib/router';
import { reducedMotion } from '../lib/motion';
import { playClassCelebration } from '../audio/sfx';
import { useStore } from '../store/store';
import type { Student } from '../types';

/**
 * Class games (1.8): short games for a brain break or a reward, played on the projector in the 3D stage (godot/).
 * Nobody is ranked: the relay is the whole class against a boss, the stars and the memory match are played together.
 * They change no points; they are for fun.
 */
type GameId = 'race' | 'stars' | 'memory';
const GAMES: { id: GameId; title: string; time: string; blurb: string; icon: string }[] = [
  { id: 'race', title: 'Class relay', time: 'about a minute', icon: 'runner', blurb: "Every creature runs one leg of the track, and each one's points today make its leg faster. The class races a boss as one team." },
  { id: 'stars', title: 'Catch the stars', time: 'one minute', icon: 'star', blurb: 'One creature catches falling stars. Pass the mouse (or the arrow keys) round the class. Gold stars are worth three.' },
  { id: 'memory', title: 'Memory match', time: 'two or three minutes', icon: 'puzzle', blurb: "Turn over two cards at a time to find the pairs of creatures from your class's field guide." },
];

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function Games({ game }: { game?: string }) {
  const can3d = useStage3d();
  const data = useStore((s) => s.data);
  const classId = data.settings.currentClassId;
  const students = useMemo(() => data.students.filter((s) => s.classId === classId), [data.students, classId]);
  const current = GAMES.find((g) => g.id === game);

  if (!can3d) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="font-display text-3xl font-bold">Class games</h1>
        <p className="paper mt-4 p-5">The class games play in the 3D scenes. Turn them on in <b>Settings → Classroom → 3D scenes</b>; they need a computer whose browser has WebGL 2 (nearly every computer from the last ten years).</p>
      </div>
    );
  }
  if (!current) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <h1 className="font-display text-3xl font-bold">Class games</h1>
        <p className="mt-1 text-ink-soft">Short games for a brain break or a treat. Nobody is ranked, and they change no points.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3" data-stagger>
          {GAMES.map((g) => (
            <button key={g.id} className="paper flex flex-col gap-2 p-5 text-left transition hover:bg-wash" onClick={() => navigate(`/games/${g.id}`)} data-game={g.id} data-press>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-azure-pale text-azure-700"><Icon name={g.icon} size={26} /></span>
              <span className="font-display text-2xl font-bold">{g.title}</span>
              <span className="text-sm font-bold text-ink-soft">{g.time}</span>
              <span className="text-[15px]">{g.blurb}</span>
              <span className="btn btn-primary mt-2 self-start"><Icon name="play" size={18} />Play</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return <Play game={current.id} title={current.title} students={students} key={current.id} />;
}

function Play({ game, title, students }: { game: GameId; title: string; students: Student[] }) {
  const data = useStore((s) => s.data);
  const settings = data.settings;
  const stage = useRef<GodotStageHandle>(null);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [runner, setRunner] = useState<string>(() => students[Math.floor(Math.random() * Math.max(1, students.length))]?.id ?? '');
  const today = startOfToday();
  const points = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of data.events) if (e.at >= today && e.xp > 0) m.set(e.studentId, (m.get(e.studentId) ?? 0) + e.xp);
    return m;
  }, [data.events, today]);
  // the boss to race: the last one the class befriended, else the first of the world
  const boss = useMemo(() => {
    const won = data.bosses.filter((b) => b.classId === settings.currentClassId && b.status === 'won').at(-1);
    return BOSSES_BY_ID[won?.bossId ?? ''] ?? BOSSES[0];
  }, [data.bosses, settings.currentClassId]);
  const cards = useMemo(() => {
    const cls = data.classes.find((c) => c.id === settings.currentClassId);
    const keys = new Set<string>([...(cls?.discovered ?? []), ...students.map((s) => `${s.speciesId}-1`)]);
    const out: { key: string; art: string; name: string }[] = [];
    for (const k of keys) {
      const m = k.match(/^(.*)-(\d)(b?)$/);
      if (!m) continue;
      const sp = getSpecies(m[1]);
      if (sp.pixelArt || !hasIllustration(sp.id, Number(m[2]) as 1)) continue;
      out.push({ key: k, art: new URL(illustrationUrl(sp.id, Number(m[2]) as 1, m[3]), window.location.href).href, name: sp.name });
    }
    return out.sort(() => Math.random() - 0.5).slice(0, 8);
  }, [data.classes, settings.currentClassId, students]);

  useEffect(() => {
    if (!ready) return;
    setResult(null); setStarted(false); setNote('');
    if (game === 'race') {
      // tests can ask for a short track (development only)
      const fast = import.meta.env.DEV && (window as unknown as { __ccFastGames?: boolean }).__ccFastGames;
      return sendClass(students, settings, (list) => stage.current?.send('init', { students: list.map((c) => ({ ...c, points: points.get(c.id) ?? 0 })), boss: { id: boss.id, element: boss.element }, reduced: reducedMotion(), ...(fast ? { track: 30 } : {}) }),
        (pics) => stage.current?.send('pictures', { list: pics }));
    }
    if (game === 'stars') {
      const s = students.find((x) => x.id === runner) ?? students[0];
      if (!s) return;
      const base = stageCreature(s, settings, { name: false });
      const fast = import.meta.env.DEV && (window as unknown as { __ccFastGames?: boolean }).__ccFastGames;
      stage.current?.send('init', { student: base, seconds: fast ? 8 : 60, reduced: reducedMotion() });
      void withPicture(base, s).then((c) => { if (c.picture) stage.current?.send('pictures', { list: [{ id: c.id, picture: c.picture }] }); });
    }
    if (game === 'memory') stage.current?.send('init', { cards, reduced: reducedMotion() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, round]);

  const onMessage = (m: StageMessage) => {
    if (m.type === 'leg') { const s = students.find((x) => x.id === m.studentId); if (s) setNote(`${firstName(s.name)} is running (${Number(m.index) + 1} of ${students.length})`); }
    if (m.type === 'score') setNote(`${m.stars} stars`);
    if (m.type === 'pair') setNote(`${m.found} of ${m.total} pairs`);
    if (m.type === 'result') {
      if (game === 'race') setResult(m.win ? `The class beat ${boss.name}! ${m.classTime} s against ${m.bossTime} s.` : `${boss.name} won this time (${m.bossTime} s against ${m.classTime} s). Every point today makes the class faster: race again later!`);
      if (game === 'stars') setResult(`${m.stars} stars caught!`);
      if (game === 'memory') setResult(`All the pairs found in ${m.seconds} seconds and ${m.turns} turns!`);
      if (settings.soundEnabled && (game !== 'race' || m.win)) playClassCelebration();
    }
  };
  const start = () => { setStarted(true); setResult(null); stage.current?.send('start'); };
  const again = () => { setReady(false); setRound((r) => r + 1); };
  const full = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void box.current?.requestFullscreen?.(); };
  const scene: StageScene = game;

  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn btn-light" onClick={() => navigate('/games')}><Icon name="back" size={18} />Games</button>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {game === 'stars' && (
          <label className="ml-auto flex items-center gap-2 text-sm font-bold">Catching:
            <select className="input !w-auto !py-1" value={runner} disabled={started && !result} onChange={(e) => { setRunner(e.target.value); setReady(false); setRound((r) => r + 1); }}>
              {students.map((s) => <option key={s.id} value={s.id}>{firstName(s.name)}</option>)}
            </select>
          </label>
        )}
      </div>
      <div ref={box} className="relative overflow-hidden rounded-[var(--radius-card)] bg-sky shadow-[var(--shadow-lift)]" style={{ aspectRatio: '16 / 9' }} data-game-stage={game}>
        {!failed && <GodotStage key={round} ref={stage} scene={scene} className="absolute inset-0" title={title} onReady={() => setReady(true)} onFail={() => setFailed(true)} onMessage={onMessage} />}
        {failed && <div className="absolute inset-0 grid place-items-center p-6 text-center font-bold">This computer could not start the 3D scene.</div>}
        {note && !result && <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 font-display text-xl font-bold shadow" role="status" data-game-note>{note}</div>}
        {ready && !started && (
          <div className="absolute inset-0 grid place-items-center">
            <button className="btn btn-primary px-8 py-3 text-xl shadow-lg" onClick={start} data-game-start autoFocus><Icon name="play" size={24} />{game === 'race' ? `Race ${boss.name}!` : 'Start'}</button>
          </div>
        )}
        {result && (
          <div className="absolute inset-x-0 bottom-6 mx-auto flex w-fit max-w-[90%] flex-col items-center gap-2 rounded-[var(--radius-card)] bg-white/95 px-6 py-4 text-center shadow-lg" role="status" data-game-result>
            <div className="font-display text-2xl font-bold">{result}</div>
            <button className="btn btn-primary" onClick={again}><Icon name="replay" size={18} />Play again</button>
          </div>
        )}
        <button className="btn btn-light absolute bottom-3 right-3 !px-3" onClick={full} aria-label="Full screen"><Icon name="expand" size={18} /></button>
      </div>
    </div>
  );
}
