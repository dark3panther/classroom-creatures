/**
 * Builds the World of Adventures pixel art (scripts/pixel/*.px.js) with the vendored claude-pxl and copies
 * the PNGs into public/adventure/. Run: npm run art:adventure
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = mkdtempSync(join(tmpdir(), 'cc-pxl-'));
const dest = join(root, 'public', 'adventure');
try {
  execFileSync(process.execPath, [join(root, 'scripts/vendor/claude-pxl/bin/pxl.js'), 'build', join(here, 'adventure.px.js'), '--out', out, '--no-preview'], { stdio: 'inherit' });
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const dir of ['sprites', 'scenes']) {
    for (const f of readdirSync(join(out, dir))) {
      if (!f.endsWith('.png')) continue;
      cpSync(join(out, dir, f), join(dest, f));
      n++;
    }
  }
  console.log(`  • ${n} images → public/adventure/`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
