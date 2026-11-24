#!/usr/bin/env node
// The boss models for the Godot stage: the rigged GLBs built by scripts/bosses-3d/build.py (art/bosses-3d/<id>/<id>.glb)
// copied into godot/models/bosses/ (git-ignored there; they are big and rebuilt from code).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../..', import.meta.url).pathname;
const src = join(root, 'art', 'bosses-3d'), dst = join(root, 'godot', 'models', 'bosses');
mkdirSync(dst, { recursive: true });
let n = 0;
for (const id of readdirSync(src)) { const f = join(src, id, `${id}.glb`); if (existsSync(f)) { copyFileSync(f, join(dst, `${id}.glb`)); n++; } }
console.log(`copied ${n} boss models into godot/models/bosses`);
