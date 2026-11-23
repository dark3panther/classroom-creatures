# Third-party notices

Classroom Creatures is MIT licensed (see LICENSE). It includes or uses these open-source works, all MIT:

- **anime.js** 4.5.0 (Julian Garnier), vendored in `src/vendor/animejs/`, from the fork at github.com/dark3panther/anime.
- **pixelfx** 0.3.0, vendored in `src/vendor/pixelfx/` (see its LICENSE and NOTICE), from github.com/dark3panther/pixelfx. Pixel mode uses its fire, water, nature, lightning, ice, shadow, holy and arcane effects for the creature auras and attacks.
- **p5.brush** (Alejandro Campos), used at build time by `scripts/sky/` to paint the sky layers, from github.com/dark3panther/p5.brush.
- **claude-pxl** (pxl-pixelart 0.1.0, crsolver), vendored in `scripts/vendor/claude-pxl/` (see its LICENSE), used at build time by `scripts/pixel/` to draw the World of Adventures pixel art and the Pixel Pals, from github.com/dark3panther/claude-pxl.

- **SpriteCast** 0.16.1 (Sunghwan Baek), from github.com/dark3panther/spritecast, used at build time by `scripts/bosses-3d/` to render the animated bosses: its character pipeline (`charpipe.py render`, `finish`, with `"draw": false`) turns each rigged boss model into toon-shaded sprite strips through its bundled **three.js** (MIT, three.js authors). Only the free steps are used; nothing is sent to an image service.
- **blender-skills** (blender-skills contributors), from github.com/dark3panther/blender-skills: the creature-artist, cartoon-style, rigging, animation, lighting, rendering and export-pipeline guides shaped how the boss models and the treasure chest were built.

**Blender** (GPL, blender.org) is used as a tool at build time to model, rig, animate and render the bosses and the treasure chest (`scripts/bosses-3d/`, `scripts/blender/`). No part of Blender ships with the app; the images it made are this project's own.

The World of Adventures design document follows the game-design-document structure (overview, player fantasy, detailed rules, formulas, edge cases, dependencies, tuning knobs, acceptance criteria) of github.com/dark3panther/Claude-Code-Game-Studios.

Fonts (SIL Open Font License 1.1, bundled through Fontsource): Bricolage Grotesque and Atkinson Hyperlegible Next for the painted look; **Jersey 10** (Sarah Cadigan-Fried) and **Tiny5** (Stefan Schmidt) for Pixel mode.
