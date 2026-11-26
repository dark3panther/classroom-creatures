import { BRANCHES } from '../data/branches';
import { ELEMENTS } from '../data/elements';
import { getSpecies } from '../data/species';
import { creaturePictureRig, type PuppetRig } from '../creatures/pixelSprite';
import { displayStage } from '../engine/progression';
import { firstName } from '../engine/util';
import type { Settings, Stage, Student } from '../types';

/**
 * What the 3D stage (godot/) needs to draw a student's creature: name, element, glow colour and, once it is drawn,
 * `picture`: the creature in its outfit, as a data URL. Pictures always cross as data: the stage cannot fetch the
 * desktop app's own files (its HTTP client only speaks http and https, and the app serves app://).
 */
export interface StageCreature {
  id: string; name: string; element: string; glow: string; stage: Stage; mythic: boolean; pixel: boolean; art: string; picture?: string;
  /** where the head, tail and eyelids are in the picture, so the stage can animate the painting (1.9.1) */
  rig?: PuppetRig;
}

export function stageCreature(s: Student, settings: Settings, opts: { stage?: Stage; name?: boolean } = {}): StageCreature {
  const sp = getSpecies(s.speciesId);
  const stage = opts.stage ?? displayStage(s, settings);
  const mythic = stage === 5 && s.branch === 'b' && !!BRANCHES[sp.id];
  return {
    id: s.id,
    name: opts.name === false ? '' : firstName(s.name),
    element: sp.element,
    glow: ELEMENTS[sp.element]?.glow ?? '#ffd27a',
    stage,
    mythic,
    pixel: !!sp.pixelArt,
    // nothing to fetch: the creature appears when its picture arrives (a moment later, see sendClass)
    art: '',
  };
}

/** The same creature with its outfit drawn in (resolves without a picture if it cannot be drawn). */
export async function withPicture(c: StageCreature, s: Student): Promise<StageCreature> {
  try {
    const { url, rig } = await creaturePictureRig({ species: getSpecies(s.speciesId), stage: c.stage, equipped: s.equipped, branch: s.branch });
    return { ...c, picture: url, ...(rig ? { rig } : {}) };
  } catch {
    return c;
  }
}

/**
 * Send a class to the stage: first everyone without a picture (so the scene sets up at once, `send`), then, a few at
 * a time, each creature's picture (`pictures`: only the new pictures, so big images cross once). A creature wearing
 * nothing is its painting, trimmed (quick); an outfit is drawn in (slower), so those come last.
 */
export function sendClass(students: Student[], settings: Settings, send: (list: StageCreature[]) => void,
  pictures: (list: { id: string; picture: string; rig?: PuppetRig }[]) => void, opts: { stage?: (s: Student) => Stage } = {}): () => void {
  let live = true;
  const list = students.map((s) => stageCreature(s, settings, { stage: opts.stage?.(s) }));
  send(list);
  const dressed = (s: Student) => Object.entries(s.equipped ?? {}).some(([slot, v]) => v && slot !== 'background' && slot !== 'trail');
  const order = students.map((_, i) => i).sort((a, b) => Number(dressed(students[a])) - Number(dressed(students[b])));
  void (async () => {
    for (let i = 0; i < order.length && live; i += 4) {
      const batch = order.slice(i, i + 4);
      const done = await Promise.all(batch.map((k) => withPicture(list[k], students[k])));
      if (!live) return;
      const got = done.filter((c) => c.picture).map((c) => ({ id: c.id, picture: c.picture!, ...(c.rig ? { rig: c.rig } : {}) }));
      if (got.length) pictures(got);
    }
  })();
  return () => { live = false; };
}
