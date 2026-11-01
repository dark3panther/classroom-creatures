import { motion } from 'framer-motion';
import { useState } from 'react';
import { CreatureSvg } from '../creatures/CreatureSvg';
import { getSpecies } from '../data/species';
import { hashPin, isValidPin } from '../engine/pin';
import { parseNames } from '../engine/roster';
import { useStore } from '../store/store';

/** First-run welcome: explore the demo or set up a real class in one screen. */
export function Onboarding() {
  const updateSettings = useStore((s) => s.updateSettings);
  const createClass = useStore((s) => s.createClass);
  const addStudents = useStore((s) => s.addStudents);
  const clearDemo = useStore((s) => s.clearDemo);
  const notify = useStore((s) => s.notify);
  const [step, setStep] = useState<'hello' | 'setup'>('hello');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Grade 2');
  const [names, setNames] = useState('');
  const [pin, setPin] = useState('');
  const [removeDemo, setRemoveDemo] = useState(true);
  const parsed = parseNames(names);
  const pinOk = pin === '' || isValidPin(pin);

  const finish = async () => {
    if (removeDemo) await clearDemo();
    const id = createClass(name, grade);
    if (parsed.length) addStudents(id, parsed);
    updateSettings({ onboarded: true, pinHash: pin ? await hashPin(pin) : null });
    notify(parsed.length ? `${name} is ready. ${parsed.length} creatures hatched!` : `${name} is ready. Add your students next!`);
  };

  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-night-950/75 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="paper relative max-h-[94vh] w-full max-w-2xl overflow-y-auto scroll-thin on-paper" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }}>
        {step === 'hello' ? (
          <div className="p-6 text-center sm:p-10">
            <div className="flex justify-center -space-x-4">
              {['splashlet', 'emberpup', 'sproutling', 'zipzap', 'glowbun'].map((id, i) => (
                <motion.span key={id} className="h-24 w-24 sm:h-28 sm:w-28" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08, type: 'spring' }}>
                  <CreatureSvg species={getSpecies(id)} stage={(i === 2 ? 2 : 1)} />
                </motion.span>
              ))}
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Welcome to <span className="text-grape">Classroom Creatures</span>!</h1>
            <p className="mx-auto mt-3 max-w-lg text-lg text-ink-soft">
              Every student gets their own fantasy creature. Award XP for positive behaviour, and watch the creatures grow, evolve and celebrate.
            </p>
            <p className="mx-auto mt-3 max-w-lg rounded-2xl bg-berry/10 px-4 py-2 text-sm font-bold text-[#be185d]">
              A <b>demo class</b> with made-up students is loaded so you can try everything. It is clearly marked DEMO.
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">Everything stays on this computer. No accounts, no emails, no internet needed.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button className="btn btn-light px-6 text-lg" onClick={() => updateSettings({ onboarded: true })}>Explore the demo first</button>
              <button className="btn btn-primary px-6 text-lg" onClick={() => setStep('setup')}>Set up my class →</button>
            </div>
          </div>
        ) : (
          <form className="p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); if (name.trim() && pinOk) void finish(); }}>
            <h2 className="font-display text-3xl font-bold">Set up your class</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px]">
              <label className="text-sm font-bold">Class name
                <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 3A Explorers" autoFocus maxLength={40} />
              </label>
              <label className="text-sm font-bold">Grade
                <select className="input mt-1" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Other'].map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-sm font-bold">Students <span className="font-normal text-ink-soft">(one first name per line, optional, you can add them later)</span>
              <textarea className="input mt-1 h-32" value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Amira\nBen\nChloe'} />
            </label>
            <div className="text-xs font-bold text-ink-soft">{parsed.length} student{parsed.length === 1 ? '' : 's'}</div>
            <label className="mt-3 block text-sm font-bold">Teacher PIN <span className="font-normal text-ink-soft">(4 to 8 digits; recommended, so students can’t change points)</span>
              <input className="input mt-1 !w-48 tracking-[0.4em]" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••" />
            </label>
            {!pinOk && <div className="text-sm font-bold text-[#c2410c]">The PIN needs at least 4 digits.</div>}
            <label className="mt-4 flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" className="h-5 w-5 accent-[#8b5cf6]" checked={removeDemo} onChange={(e) => setRemoveDemo(e.target.checked)} />
              Remove the demo class (you can add it back in Settings)
            </label>
            <div className="mt-6 flex justify-between gap-2">
              <button type="button" className="btn btn-light" onClick={() => setStep('hello')}>← Back</button>
              <button type="submit" className="btn btn-primary px-6 text-lg" disabled={!name.trim() || !pinOk}>Create class & hatch creatures</button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
