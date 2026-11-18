/**
 * electron-builder afterPack hook. Without an Apple Developer ID, the app is signed "ad hoc" so Apple
 * Silicon Macs accept it. A bundle without a sealed signature is reported by macOS as "damaged", not just
 * unverified, so every build gets one:
 *   - on a Mac, with Apple's codesign;
 *   - elsewhere (Linux, Windows), with rcodesign (apple-codesign, `cargo install apple-codesign`), found
 *     through the RCODESIGN environment variable or on PATH.
 * Skips the per-arch temp copies that are merged into a universal app (they must stay byte-identical).
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

function findRcodesign() {
  if (process.env.RCODESIGN) return process.env.RCODESIGN;
  try {
    execFileSync('rcodesign', ['--version'], { stdio: 'ignore' });
    return 'rcodesign';
  } catch {
    return null;
  }
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (context.appOutDir.includes('-temp')) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  if (process.platform === 'darwin') {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
    console.log(`  • ad-hoc signed ${app}`);
    return;
  }
  const rc = findRcodesign();
  if (!rc) {
    console.warn('  • WARNING: not signed. macOS will call this app "damaged". Install rcodesign (cargo install apple-codesign) or set RCODESIGN, then build again.');
    return;
  }
  execFileSync(rc, ['sign', app], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`  • ad-hoc signed ${app} with rcodesign`);
};
