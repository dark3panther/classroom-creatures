import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, reducedMotion } from '../lib/motion';
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
  // the sun-gold underline slides to the current tab
  const nav = useRef<HTMLElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const n = nav.current, b = bar.current;
    const on = n?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!n || !b) return;
    if (!on) { b.style.opacity = '0'; return; }
    const x = on.offsetLeft + 10, w = on.offsetWidth - 20;
    b.style.opacity = '1';
    if (reducedMotion() || !b.dataset.ready) { b.style.width = `${w}px`; b.style.transform = `translateX(${x}px)`; b.dataset.ready = '1'; return; }
    animate(b, { x, width: w, duration: 520, ease: 'out(4)' });
  }, [route.view]);

  return (
    <header className="glass sticky top-0 z-30 border-b border-white/70 shadow-[0_10px_30px_-18px_rgb(27_79_151/.6)]">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-1 px-4 pt-2.5 sm:px-6 md:py-2.5">
        <button className="flex items-center gap-2.5" onClick={() => navigate('/')} aria-label="Classroom Creatures home">
          <img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" className="h-11 w-11 rounded-[12px] shadow-[0_4px_10px_-4px_rgb(27_79_151/.6)] ring-2 ring-white" />
          <span className="hidden font-display text-[22px] font-extrabold leading-[0.95] tracking-[-0.01em] text-azure-800 sm:block">
            Classroom<br />Creatures
          </span>
        </button>

        {active.length > 0 && (
          <label className="relative min-w-0">
            <span className="sr-only">Current class</span>
            <select value={cls?.id ?? ''} onChange={(e) => setCurrent(e.target.value)}
              className="max-w-[calc(100vw-172px)] appearance-none truncate rounded-full bg-white py-2 pl-4 pr-9 font-display text-base font-semibold text-ink shadow-[0_2px_6px_-2px_rgb(27_79_151/.3)] ring-1 ring-rule transition hover:ring-azure-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-azure-700 sm:max-w-none">
              {active.map((c) => <option key={c.id} value={c.id} className="text-ink">{c.name}{c.grade ? ` · ${c.grade}` : ''}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" width="12" height="8" viewBox="0 0 12 8" aria-hidden><path d="M1 1.5l5 5 5-5" fill="none" stroke="#13253f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </label>
        )}

        <nav ref={nav} className="relative order-last -mx-1 flex w-full gap-0.5 overflow-x-auto [mask-image:linear-gradient(90deg,#000_88%,transparent)] md:order-none md:mx-0 md:w-auto md:gap-1 md:[mask-image:none]" aria-label="Main">
          {TABS.map((t) => {
            const on = route.view === t.view;
            return (
              <button key={t.view} onClick={() => navigate(t.path)} aria-current={on ? 'page' : undefined}
                className={`relative whitespace-nowrap px-2 py-2.5 font-display text-[16px] md:px-3 font-semibold transition-colors ${on ? 'text-azure-800' : 'text-ink-soft hover:text-ink'}`}>
                {t.label}
              </button>
            );
          })}
          <span ref={bar} className="pointer-events-none absolute bottom-0 left-0 h-[4px] rounded-full bg-gilt shadow-[0_2px_8px_rgb(217_148_0/.6)]" style={{ width: 0 }} aria-hidden />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-ink-soft lg:flex" title="Everything is saved on this computer automatically">
            <Icon name="check" size={15} strokeWidth={2.6} className="text-leaf" />{saved ? 'Saved' : 'Auto-save on'}
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
