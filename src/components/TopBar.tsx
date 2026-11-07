import { useEffect, useState } from 'react';
import { navigate, type Route } from '../lib/router';
import { onSaved } from '../store/storage';
import { useCurrentClass, useStore } from '../store/store';
import { Icon } from './Icon';

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
    <header className="cloth on-cloth sticky top-0 z-30 shadow-[0_1px_0_rgb(0_0_0/.25),0_8px_20px_-14px_rgb(13_46_35/.9)]">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-1 px-4 pt-2.5 sm:px-6 md:py-2.5">
        <button className="flex items-center gap-2.5" onClick={() => navigate('/')} aria-label="Classroom Creatures home">
          <img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" className="h-11 w-11 rounded-[12px] ring-2 ring-white/20" />
          <span className="gilt-text hidden font-display text-[22px] font-bold leading-[0.95] tracking-[-0.01em] sm:block">
            Classroom<br />Creatures
          </span>
        </button>

        {active.length > 0 && (
          <label className="relative min-w-0">
            <span className="sr-only">Current class</span>
            <select value={cls?.id ?? ''} onChange={(e) => setCurrent(e.target.value)}
              className="max-w-[60vw] appearance-none truncate rounded-full bg-white/10 py-2 pl-4 pr-9 font-display text-base font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-gilt sm:max-w-none">
              {active.map((c) => <option key={c.id} value={c.id} className="text-ink">{c.name}{c.grade ? ` · ${c.grade}` : ''}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" width="12" height="8" viewBox="0 0 12 8" aria-hidden><path d="M1 1.5l5 5 5-5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </label>
        )}

        <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:mx-0 md:w-auto" aria-label="Main">
          {TABS.map((t) => {
            const on = route.view === t.view;
            return (
              <button key={t.view} onClick={() => navigate(t.path)} aria-current={on ? 'page' : undefined}
                className={`relative whitespace-nowrap px-3 py-2.5 font-display text-[16px] font-semibold transition ${on ? 'text-white' : 'text-white/75 hover:text-white'}`}>
                {t.label}
                <span className={`absolute inset-x-3 bottom-0 h-[3px] rounded-full transition ${on ? 'bg-gilt' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-white/70 lg:flex" title="Everything is saved on this computer automatically">
            <Icon name="check" size={15} strokeWidth={2.6} className="text-[#9fdcb4]" />{saved ? 'Saved' : 'Auto-save on'}
          </span>
          {hasPin && (
            <button className="btn btn-ghost !px-3" onClick={() => setLocked(true)} title="Lock teacher controls" aria-label="Lock teacher controls">
              <Icon name="lock" size={18} />
            </button>
          )}
          <button className="btn btn-primary max-sm:!px-3" onClick={() => navigate('/present')} aria-label="Present">
            <Icon name="present" size={18} />
            <span className="max-sm:hidden">Present</span>
          </button>
        </div>
      </div>
    </header>
  );
}
