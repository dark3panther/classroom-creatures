# pixelfx (vendored)

Pixel art effects from [pixelfx](https://github.com/dark3panther/pixelfx) 0.3.0 (MIT, see `LICENSE` and `NOTICE.md`):
`core/` plus the `status`, `ui`, `pickups`, `holy`, `explosions`, `fire`, `ice`, `lightning`, `water`, `nature`, `shadow` and `arcane` categories (the element ones drive the Pixel mode auras and attacks, see `src/creatures/pixelStage.ts`). Only the effects imported by
`src/creatures/PixelFx.tsx` and `src/creatures/pixelStage.ts` end up in the app bundle.

`fx/pickups/choco-stick.js` is new for Classroom Creatures: an original chocolate-stick treat (generic striped
wrapper, no brand artwork), made with the pixelfx skill's draft → render → look → refine loop and `tools/check.mjs`.
