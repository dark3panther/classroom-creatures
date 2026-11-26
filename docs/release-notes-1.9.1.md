# Classroom Creatures 1.9.1: the paintings come alive on the 3D stage

The painted creatures now move like animated characters in the 3D scenes, with nothing redrawn: the stage bends each
painting itself. A creature's head nods and tilts, its tail wags, its legs step when it walks, its chest breathes and
its eyes blink. It wags faster when happy, drives its head forward in a lunge, flinches back with its eyes shut when
the boss strikes, and sleeps with its eyes closed. Outfits move with it. The Pixel Pals nod, wag and step too.

## How it works
- When a creature's picture is drawn for the stage (`creaturePictureRig` in `src/creatures/pixelSprite.ts`), the app
  also works out its puppet layout from the anchors it already keeps for every painting (`creatureArt.json`; for
  Pixel Pals, `pixelPals.json`): which way it faces, its head, neck, tail root, body and eyelids.
- `godot/shaders/creature.gdshader` bends the painting by that layout (soft-edged regions, each moved round its
  pivot, worked back from the output like a mesh warp) and draws the measured eyelids for a blink.
  `Creature3D.set_picture(url, rig)` hands it over; every scene passes the layout with the pictures.
- Reduce Motion keeps the movements small, as before.
