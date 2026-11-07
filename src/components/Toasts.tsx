import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useStore } from '../store/store';
import { Icon } from './Icon';

const UNDO_WINDOW = 10_000;

/** Bottom toast after every award with a one-tap Undo, plus general notifications. */
export function Toasts() {
  const last = useStore((s) => s.lastAward);
  const undo = useStore((s) => s.undo);
  const toast = useStore((s) => s.toast);
  const bigMoment = useStore((s) => s.celebrations[0]?.type === 'evolution' || s.celebrations[0]?.type === 'classGoal');
  const [showUndo, setShowUndo] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!last) { setShowUndo(false); return; }
    setShowUndo(true);
    const t = setTimeout(() => setShowUndo(false), UNDO_WINDOW);
    return () => clearTimeout(t);
  }, [last]);

  useEffect(() => {
    if (!toast) return;
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {showToast && toast && (
          <motion.div key={toast.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className={`pointer-events-auto rounded-full px-5 py-2.5 font-bold shadow-[var(--shadow-lift)] ring-1 ${toast.tone === 'warn' ? 'bg-brick-pale text-[#8a2f1e] ring-brick/30' : 'bg-white text-ink ring-rule'}`} role="status">
            {toast.text}
          </motion.div>
        )}
        {showUndo && last && !bigMoment && (
          <motion.div key={last.batchId} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="cloth on-cloth pointer-events-auto flex items-center gap-3 rounded-full py-2 pl-5 pr-2 shadow-[var(--shadow-lift)]" role="status">
            <span className="text-xl" aria-hidden>{last.icon}</span>
            <span className="font-bold">
              {last.label} <span className="gilt-text tabular">{last.xp === 0 ? 'reminder noted' : `${last.xp > 0 ? '+' : ''}${last.xp} XP`}</span>
              <span className="text-white/80"> · {last.count === 1 ? '1 student' : `${last.count} students`}</span>
            </span>
            <button className="btn btn-light !py-1.5 !text-sm" onClick={() => undo(last.batchId)}><Icon name="undo" size={16} strokeWidth={2.4} />Undo</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
