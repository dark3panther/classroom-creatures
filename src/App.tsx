import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { playClick, setSoundEnabled, setUiSounds, setVolume } from './audio/sfx';
import { CelebrationHost } from './components/Celebrations';
import { installInteractions } from './lib/interactions';
import { riseIn } from './lib/motion';
import { BranchChooserHost } from './components/Evolve';
import { LockScreen } from './components/PinPad';
import { Toasts } from './components/Toasts';
import { TopBar } from './components/TopBar';
import { CreatureSvg } from './creatures/CreatureSvg';
import { warmPixelFx } from './creatures/PixelFx';
import { getSpecies } from './data/species';
import { useRoute } from './lib/router';
import { flushSave } from './store/storage';
import { useStore } from './store/store';
import { Icon } from './components/Icon';
import { navigate } from './lib/router';
import { Dashboard } from './views/Dashboard';
import { Onboarding } from './views/Onboarding';
import { Present } from './views/Present';

// screens away from the classroom load on first visit, so the app starts faster
const Creaturedex = lazy(() => import('./views/Creaturedex').then((m) => ({ default: m.Creaturedex })));
const Customize = lazy(() => import('./views/Customize').then((m) => ({ default: m.Customize })));
const CreatureProfile = lazy(() => import('./views/CreatureProfile').then((m) => ({ default: m.CreatureProfile })));
const Rewards = lazy(() => import('./views/Rewards').then((m) => ({ default: m.Rewards })));
const SettingsView = lazy(() => import('./views/Settings').then((m) => ({ default: m.SettingsView })));
const PixelLab = lazy(() => import('./views/PixelLab').then((m) => ({ default: m.PixelLab })));
const Adventure = lazy(() => import('./views/adventure/Adventure').then((m) => ({ default: m.Adventure })));

export default function App() {
  const ready = useStore((s) => s.ready);
  const init = useStore((s) => s.init);
  const locked = useStore((s) => s.locked);
  const onboarded = useStore((s) => s.data.settings.onboarded);
  const shopWhileLocked = useStore((s) => s.data.settings.shopWhileLocked);
  const adventureKiosk = useStore((s) => s.data.settings.adventureEnabled && s.data.settings.adventureWhileLocked);
  const tickAdventure = useStore((s) => s.tickAdventure);
  // the boss battle clock keeps running while the app is open
  useEffect(() => { const t = setInterval(tickAdventure, 60_000); return () => clearInterval(t); }, [tickAdventure]);
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const reduced = useStore((s) => s.data.settings.reducedMotion);
  const route = useRoute();

  useEffect(() => { void init(); warmPixelFx(); }, [init]);
  const volume = useStore((s) => s.data.settings.soundVolume);
  const uiSounds = useStore((s) => s.data.settings.uiSounds);
  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => setVolume(volume ?? 0.8), [volume]);
  useEffect(() => setUiSounds(!!uiSounds), [uiSounds]);
  // one soft click for any button press, when the teacher turned interface sounds on
  useEffect(() => {
    const on = (e: PointerEvent) => { if ((e.target as HTMLElement | null)?.closest('button')) playClick(); };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, [reduced]);
  // Pixel mode: the whole interface switches to its pixel-art theme (index.css, .pixel-mode)
  const pixelMode = useStore((s) => !!s.data.settings.pixelMode);
  useEffect(() => { document.documentElement.classList.toggle('pixel-mode', pixelMode); }, [pixelMode]);
  // springy buttons, hover lifts, sparks and tilting cards everywhere (anime.js)
  useEffect(() => installInteractions(), []);
  // each screen's sections rise into place when it opens, and [data-stagger] groups ripple in after them
  const mainRef = useRef<HTMLElement>(null);
  const routeKey = `${route.view}/${'id' in route ? route.id : ''}/${'tab' in route ? route.tab ?? '' : ''}/${'query' in route ? route.query.student ?? '' : ''}`;
  useEffect(() => {
    let raf = 0, tries = 0;
    const run = () => {
      const page = mainRef.current?.firstElementChild as HTMLElement | null;
      if (!page || !page.children.length) { if (tries++ < 40) raf = requestAnimationFrame(run); return; }
      riseIn(page.children, { gap: 70, distance: 22 });
      page.querySelectorAll('[data-stagger]').forEach((g) => riseIn(g.children, { gap: 26, distance: 18 }));
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [routeKey, ready, locked]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushSave(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushSave);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flushSave); };
  }, []);

  if (!ready) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-2">
          <span className="h-28 w-28 idle-hop"><CreatureSvg species={getSpecies('emberpup')} stage={1} /></span>
          <span className="font-display text-xl font-semibold text-ink-soft">Waking up the creatures…</span>
        </div>
      </div>
    );
  }

  if (route.view === 'present') {
    return (
      <>
        <Present />
        <BranchChooserHost />
        <CelebrationHost />
        <Toasts />
      </>
    );
  }

  // students may open a creature's profile and dressing room from Presentation Mode while the teacher controls are locked
  if (locked && (route.view === 'creature' || route.view === 'customize') && shopWhileLocked) {
    return (
      <div className="min-h-full">
        <header className="azure on-azure sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 sm:px-6">
          <button className="btn btn-ghost" onClick={() => navigate('/present')}><Icon name="back" size={18} />Back to Presentation Mode</button>
          <span className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-white/75"><Icon name="lock" size={15} />Teacher controls are locked</span>
        </header>
        <main ref={mainRef}><Suspense fallback={null}>{route.view === 'customize' ? <Customize studentId={route.id} /> : <CreatureProfile studentId={route.id} />}</Suspense></main>
        <BranchChooserHost />
        <CelebrationHost />
        <Toasts />
      </div>
    );
  }
  // students may also use the World of Adventures (their quests, treasure, journal) while controls are locked
  if (locked && route.view === 'adventure' && adventureKiosk) {
    return (
      <div className="min-h-full">
        <header className="azure on-azure sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 sm:px-6">
          <button className="btn btn-ghost" onClick={() => navigate('/present')}><Icon name="back" size={18} />Back to Presentation Mode</button>
          <span className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-white/75"><Icon name="lock" size={15} />Teacher controls are locked</span>
        </header>
        <main ref={mainRef}><Suspense fallback={null}><Adventure tab={route.tab} id={route.id} query={route.query} /></Suspense></main>
        <BranchChooserHost />
        <CelebrationHost />
        <Toasts />
      </div>
    );
  }
  if (locked) return <LockScreen />;

  return (
    <div className="min-h-full">
      <TopBar route={route} />
      <main ref={mainRef}><Suspense fallback={null}>
        {route.view === 'classroom' && <Dashboard />}
        {route.view === 'creatures' && <Creaturedex />}
        {route.view === 'rewards' && <Rewards />}
        {route.view === 'pixel-lab' && <PixelLab />}
        {route.view === 'adventure' && <Adventure tab={route.tab} id={route.id} query={route.query} />}
        {route.view === 'settings' && <SettingsView tab={route.tab} />}
        {route.view === 'customize' && <Customize studentId={route.id} />}
        {route.view === 'creature' && <CreatureProfile studentId={route.id} />}
      </Suspense></main>
      <AnimatePresence>{!onboarded && !locked && <Onboarding />}</AnimatePresence>
      <BranchChooserHost />
      <CelebrationHost />
      <Toasts />
    </div>
  );
}
