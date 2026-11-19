/** Builds the Pixel Pals (scripts/pixel/creatures.px.js) and packs their sheets. Run: npm run art:creatures */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = mkdtempSync(join(tmpdir(), 'cc-pals-'));
try {
  execFileSync(process.execPath, [join(root, 'scripts/vendor/claude-pxl/bin/pxl.js'), 'build', join(here, 'creatures.px.js'), '--out', out, '--no-preview'], { stdio: ['ignore', 'ignore', 'inherit'] });
  execFileSync('python3', [join(here, 'pack-creatures.py'), out, root], { stdio: 'inherit' });
} finally {
  rmSync(out, { recursive: true, force: true });
}
