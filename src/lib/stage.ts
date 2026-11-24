import { BRANCHES } from '../data/branches';
import { ELEMENTS } from '../data/elements';
import { getSpecies } from '../data/species';
import { hasIllustration, illustrationUrl } from '../creatures/Illustrated';
import { creaturePicture } from '../creatures/pixelSprite';
import { displayStage } from '../engine/progression';
import { firstName } from '../engine/util';
import type { Settings, Stage, Student } from '../types';

/**
 * What the 3D stage (godot/) needs to draw a student's creature: name, element, glow colour, the painting to start
 * with (a URL of the app's own file) and, once it is drawn, `picture`: the creature in its outfit (a data URL).
 */
export interface StageCreature {
  id: string; name: string; element: string; glow: string; stage: Stage; mythic: boolean; pixel: boolean; art: string; picture?: string;
}

const abs = (path: string) => new URL(path, window.location.href).href;

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
    // Pixel Pals keep their art elsewhere: they appear when their picture (outfit included) is drawn
    art: !sp.pixelArt && hasIllustration(sp.id, stage) ? abs(illustrationUrl(sp.id, stage, mythic ? 'b' : '')) : '',
  };
}

/** The same creature with its outfit drawn in (resolves without a picture if it cannot be drawn). */
export async function withPicture(c: StageCreature, s: Student): Promise<StageCreature> {
  try {
    const picture = await creaturePicture({ species: getSpecies(s.speciesId), stage: c.stage, equipped: s.equipped, branch: s.branch });
    return { ...c, picture };
  } catch {
    return c;
  }
}

/**
 * Send a class to the stage: first everyone with their plain painting (so the scene fills at once, `send`), then, a
 * few at a time, each creature in its outfit (`pictures`: only the new pictures, so big images cross once).
 */
export function sendClass(students: Student[], settings: Settings, send: (list: StageCreature[]) => void,
  pictures: (list: { id: string; picture: string }[]) => void, opts: { stage?: (s: Student) => Stage } = {}): () => void {
  let live = true;
  const list = students.map((s) => stageCreature(s, settings, { stage: opts.stage?.(s) }));
  send(list);
  void (async () => {
    for (let i = 0; i < students.length && live; i += 4) {
      const done = await Promise.all(students.slice(i, i + 4).map((s, k) => withPicture(list[i + k], s)));
      if (!live) return;
      const got = done.filter((c) => c.picture).map((c) => ({ id: c.id, picture: c.picture! }));
      if (got.length) pictures(got);
    }
  })();
  return () => { live = false; };
}
