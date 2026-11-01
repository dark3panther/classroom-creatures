import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { setSoundEnabled } from './audio/sfx';
import { CelebrationHost } from './components/Celebrations';
import { LockScreen } from './components/PinPad';
import { Toasts } from './components/Toasts';
import { TopBar } from './components/TopBar';
import { CreatureSvg } from './creatures/CreatureSvg';
import { getSpecies } from './data/species';
import { useRoute } from './lib/router';
import { flushSave } from './store/storage';
import { useStore } from './store/store';
import { Creaturedex } from './views/Creaturedex';
import { Dashboard } from './views/Dashboard';
import { Onboarding } from './views/Onboarding';
import { Present } from './views/Present';
import { Rewards } from './views/Rewards';
import { SettingsView } from './views/Settings';

export default function App() {
  const ready = useStore((s) => s.ready);
  const init = useStore((s) => s.init);
  const locked = useStore((s) => s.locked);
  const onboarded = useStore((s) => s.data.settings.onboarded);
  const sound = useStore((s) => s.data.settings.soundEnabled);
  const reduced = useStore((s) => s.data.settings.reducedMotion);
  const route = useRoute();

  useEffect(() => { void init(); }, [init]);
  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, [reduced]);
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
          <span className="font-display text-xl font-semibold text-white/80">Waking up the creatures…</span>
        </div>
      </div>
    );
  }

  if (route.view === 'present') {
    return (
      <>
        <Present />
        <CelebrationHost />
        <Toasts />
      </>
    );
  }

  if (locked) return <LockScreen />;

  return (
    <div className="min-h-full">
      <TopBar route={route} />
      <main>
        {route.view === 'classroom' && <Dashboard />}
        {route.view === 'creatures' && <Creaturedex />}
        {route.view === 'rewards' && <Rewards />}
        {route.view === 'settings' && <SettingsView tab={route.tab} />}
      </main>
      <AnimatePresence>{!onboarded && !locked && <Onboarding />}</AnimatePresence>
      <CelebrationHost />
      <Toasts />
    </div>
  );
}
