#!/usr/bin/env node
/**
 * Paints the sky world's layers into public/sky/*.webp: clouds, far mountains, hills, meadow and
 * floating islands, with p5.brush watercolour (scripts/sky/vendor, MIT) in headless Chromium.
 *
 *   node scripts/sky/paint.mjs            (all layers)
 *   node scripts/sky/paint.mjs cloud-1    (just some)
 *
 * Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', 'public', 'sky');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.route('http://sky.local/**', (r) => {
  const file = join(here, new URL(r.request().url()).pathname);
  r.fulfill({ body: readFileSync(file), contentType: file.endsWith('.js') ? 'text/javascript' : 'text/html' });
});
await page.goto('http://sky.local/paint.html');
await page.waitForFunction(() => window.ready);
const names = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => Object.keys(window.layers));
for (const name of names) {
  const url = await page.evaluate((n) => window.layers[n](), name);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(join(out, `${name}.webp`), buf);
  console.log(`  ${name}.webp  ${(buf.length / 1024).toFixed(0)} KB`);
}
await browser.close();
