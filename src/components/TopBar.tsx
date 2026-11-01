import { useEffect, useState } from 'react';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { getSpecies } from '../data/species';
import { navigate, type Route } from '../lib/router';
import { onSaved } from '../store/storage';
import { useCurrentClass, useStore } from '../store/store';

const TABS: { view: Route['view']; label: string; path: string }[] = [
  { view: 'classroom', label: 'Classroom', path: '/' },
  { view: 'creatures', label: 'Creatures', path: '/creatures' },
  { view: 'rewards', label: 'Rewards', path: '/rewards' },
  { view: 'settings', label: 'Settings', path: '/settings' },
];

export function TopBar({ route }: { route: Route }) {
  const classes = useStore((s) => s.data.classes);
  const setCurrent = useStore((s) => s.setCurrentClass);
  const hasPin = useStore((s) => !!s.data.settings.pinHash);
  const setLocked = useStore((s) => s.setLocked);
  const cls = useCurrentClass();
  const [saved, setSaved] = useState<number | null>(null);
  useEffect(() => { const off = onSaved((t) => setSaved(t)); return () => { off(); }; }, []);
  const active = classes.filter((c) => !c.archived);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-night-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <button className="flex items-center gap-2" onClick={() => navigate('/')} aria-label="Classroom Creatures home">
          <span className="h-11 w-11"><CreatureSvg species={getSpecies('emberpup')} stage={2} noShadow effects={false} className="h-full w-full" /></span>
          <span className="hidden font-display text-xl font-bold leading-none tracking-wide sm:block">
            Classroom<br /><span className="text-sun">Creatures</span>
          </span>
        </button>

        {active.length > 0 && (
          <label className="relative">
            <span className="sr-only">Current class</span>
            <select value={cls?.id ?? ''} onChange={(e) => setCurrent(e.target.value)}
              className="appearance-none rounded-full bg-white/10 py-2 pl-4 pr-9 font-display text-base font-semibold ring-1 ring-white/15 hover:bg-white/15 focus:outline-none">
              {active.map((c) => <option key={c.id} value={c.id} className="text-ink">{c.name}{c.grade ? ` · ${c.grade}` : ''}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">▼</span>
          </label>
        )}

        <nav className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.view} onClick={() => navigate(t.path)} aria-current={route.view === t.view ? 'page' : undefined}
              className={`rounded-full px-4 py-2 font-display text-[15px] font-semibold transition ${route.view === t.view ? 'bg-white text-ink shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs font-bold text-white/60 lg:flex" title="Everything is saved on this computer automatically">
            <span className="h-2 w-2 rounded-full bg-mint" />{saved ? 'Saved' : 'Auto-save on'}
          </span>
          {hasPin && (
            <button className="btn btn-ghost !px-3" onClick={() => setLocked(true)} title="Lock teacher controls" aria-label="Lock teacher controls">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/present')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 21h8M12 16v5" /></svg>
            Present
          </button>
        </div>
      </div>
    </header>
  );
}
