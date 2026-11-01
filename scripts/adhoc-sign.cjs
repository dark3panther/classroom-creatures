/**
 * electron-builder afterPack hook. Without an Apple Developer ID, the app is signed
 * "ad hoc" so Apple Silicon Macs accept it. Skips the per-arch temp copies that are
 * merged into the universal app (they must stay byte-identical) and non-mac builds.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (process.platform !== 'darwin' || context.electronPlatformName !== 'darwin') return;
  if (context.appOutDir.includes('-temp')) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  console.log(`  • ad-hoc signed ${app}`);
};
