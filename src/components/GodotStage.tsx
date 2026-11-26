import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store/store';

/**
 * The 3D stage (1.8): a Godot project (godot/) exported for the web into public/godot/ and shown here in an iframe.
 * It only draws. Every rule, point and reward stays in the app, which tells the stage what happened as JSON messages
 * (`send`), or asks it to play something and waits for it to finish (`play`). The stage answers with "ready",
 * "tap", "hit", "done" and the like.
 *
 * If the computer cannot run it (no WebGL 2) or it does not start within `timeoutMs`, `onFail` is called and the
 * caller shows its 2D version instead.
 */
export type StageScene = 'arena' | 'world' | 'race' | 'stars' | 'memory' | 'quiz' | 'bubbles' | 'evolution' | 'test';
export interface StageMessage { type: string; [k: string]: unknown }
export interface GodotStageHandle {
  /** tell the stage something */
  send: (type: string, data?: Record<string, unknown>) => void;
  /** ask the stage to play something; resolves with its "done" answer (or after `timeoutMs`, resolving null).
   *  `onEvent` hears what it says on the way (a "hit" at the moment of impact) */
  play: (type: string, data?: Record<string, unknown>, timeoutMs?: number, onEvent?: (m: StageMessage) => void) => Promise<StageMessage | null>;
}
interface Props {
  scene: StageScene;
  onReady?: () => void;
  onMessage?: (msg: StageMessage) => void;
  onFail?: (why: string) => void;
  className?: string;
  title?: string;
  /** how long the stage may take to start before the caller gives up on it */
  timeoutMs?: number;
  /** shown over the stage until it is ready */
  loading?: ReactNode;
}

let canWebGL2: boolean | null = null;
export function stageSupported(): boolean {
  if (canWebGL2 === null) {
    try { canWebGL2 = !!document.createElement('canvas').getContext('webgl2'); } catch { canWebGL2 = false; }
  }
  return canWebGL2;
}

/** Whether the 3D stage should be used: the setting (on unless switched off) and a computer that can run it. */
export function useStage3d(): boolean {
  const on = useStore((s) => s.data.settings.stage3d ?? true);
  return on && stageSupported();
}

let nextId = 1;

export const GodotStage = forwardRef<GodotStageHandle, Props>(function GodotStage({ scene, onReady, onMessage, onFail, className = '', title = '3D scene', timeoutMs = 20000, loading }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  // Pixel mode: the stage draws its scene as pixel art (see godot/scripts/Main.gd)
  const pixel = useStore((st) => !!st.data.settings.pixelMode);
  const [progress, setProgress] = useState(0);
  const waiting = useRef(new Map<number, { done: (m: StageMessage | null) => void; on?: (m: StageMessage) => void }>());
  const cbs = useRef({ onReady, onMessage, onFail });
  cbs.current = { onReady, onMessage, onFail };

  const post = (type: string, data: Record<string, unknown> = {}) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ ...data, type, toGodot: true }), window.location.origin);
  };
  useImperativeHandle(ref, () => ({
    send: post,
    play: (type, data = {}, ms = 8000, on) => new Promise((resolve) => {
      const rid = nextId++;
      const t = setTimeout(() => { waiting.current.delete(rid); resolve(null); }, ms);
      waiting.current.set(rid, { done: (m) => { clearTimeout(t); resolve(m); }, on });
      post(type, { ...data, rid });
    }),
  }), []);

  useEffect(() => {
    let done = false;
    const fail = (why: string) => { if (!done) { done = true; cbs.current.onFail?.(why); } };
    if (!stageSupported()) { fail('webgl2'); return; }
    const timer = setTimeout(() => fail('timeout'), timeoutMs);
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      let msg: StageMessage;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (!(msg as { fromGodot?: boolean }).fromGodot) return;
      if (msg.type === 'progress') { setProgress(Number(msg.total) ? Number(msg.current) / Number(msg.total) : 0); return; }
      if (msg.type === 'error') { clearTimeout(timer); fail(String(msg.message ?? 'error')); return; }
      if (msg.type === 'ready') { clearTimeout(timer); done = true; setReady(true); cbs.current.onReady?.(); return; }
      if (typeof msg.rid === 'number' && waiting.current.has(msg.rid)) {
        const w = waiting.current.get(msg.rid)!;
        if (msg.type === 'done') { waiting.current.delete(msg.rid); w.done(msg); } else w.on?.(msg);
        return;
      }
      cbs.current.onMessage?.(msg);
    };
    window.addEventListener('message', on);
    return () => { clearTimeout(timer); window.removeEventListener('message', on); for (const w of waiting.current.values()) w.done(null); waiting.current.clear(); };
  }, [scene, timeoutMs]);

  return (
    <div className={/\b(absolute|fixed)\b/.test(className) ? className : `relative ${className}`} data-stage={scene} data-stage-ready={ready || undefined}>
      <iframe ref={frame} title={title} src={`${import.meta.env.BASE_URL}godot/stage.html?scene=${scene}${pixel ? '&pixel=1' : ''}`} className="absolute inset-0 h-full w-full border-0" allow="autoplay; fullscreen" />
      {!ready && (loading ?? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="w-40 rounded-full bg-white/70 p-1 shadow"><div className="h-2 rounded-full bg-azure transition-[width]" style={{ width: `${Math.max(6, progress * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
});
