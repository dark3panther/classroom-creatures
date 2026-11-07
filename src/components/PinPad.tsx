import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { getSpecies } from '../data/species';
import { checkPin } from '../engine/pin';
import { navigate } from '../lib/router';
import { useStore } from '../store/store';
import { Icon } from './Icon';

/** Full-screen teacher lock. Presentation mode stays available without the PIN. */
export function LockScreen() {
  const hash = useStore((s) => s.data.settings.pinHash);
  const setLocked = useStore((s) => s.setLocked);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(0);
  const [error, setError] = useState('');

  const press = async (d: string) => {
    const next = (pin + d).slice(0, 8);
    setPin(next);
    setError('');
    if (next.length >= 4 && (await checkPin(next, hash))) {
      setLocked(false);
      setPin('');
    } else if (next.length >= 8) {
      fail();
    }
  };
  const fail = () => { setShake((s) => s + 1); setPin(''); setError('That PIN is not right. Try again.'); };
  const submit = async () => { if (await checkPin(pin, hash)) { setLocked(false); setPin(''); } else fail(); };
  const keys = useRef({ press, submit, back: () => setPin((p) => p.slice(0, -1)) });
  keys.current = { press, submit, back: () => setPin((p) => p.slice(0, -1)) };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) void keys.current.press(e.key);
      else if (e.key === 'Backspace') keys.current.back();
      else if (e.key === 'Enter') void keys.current.submit();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  return (
    <div className="cloth-deep fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div key={shake} animate={shake ? { x: [0, -14, 14, -8, 8, 0] } : {}} transition={{ duration: 0.4 }} className="paper relative w-full max-w-sm p-6 text-center">
        <div className="mx-auto -mt-20 h-28 w-28"><CreatureSvg species={getSpecies('duskit')} stage={2} expression="sleepy" /></div>
        <h2 className="font-display text-2xl font-bold">Teacher controls are locked</h2>
        <p className="mt-1 text-sm text-ink-soft">Enter your PIN to manage the class.</p>
        <div className="my-4 flex justify-center gap-2" aria-live="polite">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-cloth-800' : 'bg-ink/15'}`} />
          ))}
        </div>
        {!error && pin.length >= 4 && <p className="mb-2 text-sm font-bold text-ink-soft">Press OK when you have typed the whole PIN.</p>}
        {error && <p className="mb-2 text-sm font-bold text-brick">{error}</p>}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="btn btn-light h-14 font-display text-2xl tabular" onClick={() => press(d)}>{d}</button>
          ))}
          <button className="btn btn-light h-14 text-base" onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete"><Icon name="backspace" size={22} /></button>
          <button className="btn btn-light h-14 font-display text-2xl tabular" onClick={() => press('0')}>0</button>
          <button className="btn btn-primary h-14 text-base" onClick={submit}>OK</button>
        </div>
        <button className="btn btn-ghost mt-4 w-full" onClick={() => navigate('/present')}><Icon name="present" size={18} />Open Presentation Mode</button>
        <p className="mt-3 text-xs text-ink-soft">Forgot your PIN? Clear this site’s data in your browser, then import your latest backup file in Settings → Backup. (Backups never carry the PIN.)</p>
      </motion.div>
    </div>
  );
}
