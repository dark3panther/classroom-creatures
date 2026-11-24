#!/usr/bin/env node
/**
 * Export the Godot stage (godot/) for the web into public/godot/, then write public/godot/config.json (the engine
 * settings the export put in its own index.html, which the app does not use: public/godot/stage.html starts it).
 *
 *   GODOT=/path/to/Godot_v4.4.1 node scripts/godot/export.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const godot = process.env.GODOT || 'godot';
const root = new URL('../..', import.meta.url).pathname;
const proj = join(root, 'godot'), out = join(root, 'public', 'godot');
const run = (args) => execFileSync(godot, args, { cwd: proj, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 << 20 });
// parse every script first: a GDScript error only shows up at run time in the web build
const imported = run(['--headless', '--import']);
const scripts = execFileSync('find', ['scripts', '-name', '*.gd'], { cwd: proj, encoding: 'utf8' }).trim().split('\n');
const bad = [];
for (const s of scripts) {
  let res = '';
  try { res = execFileSync(godot, ['--headless', '--check-only', '--script', s], { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { res = String(e.stdout) + String(e.stderr); }
  // (autoloads are not loaded when one script is checked on its own)
  const errs = res.split('\n').filter((l) => /Parse Error|SCRIPT ERROR/.test(l) && !/Identifier not found: (Bridge|Art)\b/.test(l));
  if (errs.length) bad.push(`${s}:\n  ${errs.join('\n  ')}`);
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
const log = imported + run(['--headless', '--export-release', 'Web', join(out, 'index.html')]);
const errors = log.split('\n').filter((l) => /SCRIPT ERROR|Parse Error|ERROR:/.test(l) && !/ERROR: Could not load/.test(l));
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
const html = readFileSync(join(out, 'index.html'), 'utf8');
const cfg = JSON.parse(html.match(/const GODOT_CONFIG = (\{.*?\});/)[1]);
writeFileSync(join(out, 'config.json'), JSON.stringify(cfg) + '\n');
for (const f of ['index.html', 'index.png']) rmSync(join(out, f), { force: true });
console.log(`stage exported: wasm ${(cfg.fileSizes['index.wasm'] / 1048576).toFixed(1)} MB, pck ${(cfg.fileSizes['index.pck'] / 1048576).toFixed(1)} MB`);
