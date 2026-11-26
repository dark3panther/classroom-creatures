import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * A height for a scene box (the 3D arena, the class world, a class game) that keeps it inside the window: as tall as
 * its width at `aspect` allows, but never past the bottom of the screen, so nothing is cut off on a laptop. When the
 * box sits low on a page, it may still start below the fold rather than shrink to a sliver (at least `min` px, and
 * the page above it counts for no more than 40 % of the window). `null` while not `enabled`: the box keeps its CSS.
 */
export function useFitHeight(ref: RefObject<HTMLElement | null>, enabled: boolean, aspect = 16 / 9, min = 340, margin = 16): number | null {
  const [h, setH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) { setH(null); return; }
    const fit = () => {
      const r = el.getBoundingClientRect();
      // the room across comes from the parent, so a box that was narrowed to fit can grow back
      const across = el.parentElement?.clientWidth || r.width;
      const top = Math.min(r.top + window.scrollY, window.innerHeight * 0.4);
      const next = Math.round(Math.max(min, Math.min(across / aspect, window.innerHeight - top - margin)));
      setH((v) => (v === next ? v : next));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [ref, enabled, aspect, min, margin]);
  return h;
}
