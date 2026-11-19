#!/usr/bin/env node
/**
 * End-to-end checks for Pixel mode (1.5.1) in a real browser against the dev server: switching it on from
 * the top bar, creatures becoming pixel sprites (with a blink frame), pixel backgrounds and type, element
 * auras and attacks, the setting surviving a restart, switching back, and phone width.
 *
 *   npm run test:e2e:pixel
 *   E2E_SHOTS=out npm run test:e2e:pixel   (also saves screenshots into ./out)
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}
const PORT = Number(process.env.E2E_PORT ?? 5197);
const U = `http://localhost:${PORT}/`;
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
for (let i = 0; i < 60; i++) { try { if ((await fetch(U)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
let p = await ctx.newPage();
const errs = [];
const watch = (page) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); };
watch(p);
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const shot = async (page, name, fullPage = false) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name), fullPage }); };
const wait = (ms) => p.waitForTimeout(ms);
const go = async (hash, ms = 1400) => { await p.evaluate((h) => { location.hash = h; }, hash); await wait(ms); };
const canvases = () => p.evaluate(() => document.querySelectorAll('main canvas').length);

try {
await p.goto(U); await wait(1200);
const demo = p.getByRole('button', { name: 'Explore the demo first' }); if (await demo.count()) { await demo.click(); await wait(900); }

// ---------- 1. off by default: the painted look ----------
ok(!(await p.evaluate(() => document.documentElement.classList.contains('pixel-mode'))), 'Pixel mode is off by default');
ok(await p.locator('main .pc').count() === 0, 'creatures are painted while Pixel mode is off');

// ---------- 2. switch it on from the top bar ----------
await p.getByRole('button', { name: 'Pixel mode' }).click(); await wait(2500);
ok(await p.evaluate(() => document.documentElement.classList.contains('pixel-mode')), 'the top bar switch turns Pixel mode on');
const sprites = await p.evaluate(() => [...document.querySelectorAll('main .pc img.pc-frame')].map((i) => [i.naturalWidth, i.naturalHeight]));
ok(sprites.length >= 16 && sprites.every(([w, h]) => w === 64 && h === 66), `every creature card shows a 64 × 66 pixel sprite (${sprites.length} frames)`);
ok(await p.locator('main .pc .pc-shut').count() >= 16, 'each sprite has a blink frame');
ok(await p.evaluate(() => getComputedStyle(document.body).fontFamily.includes('Tiny5')), 'text uses the pixel typeface');
ok(await p.evaluate(() => [...document.querySelectorAll('main div[style*="adventure/region-"], main div[style*="data:image/png"]')].length >= 16), 'creature cards stand in pixel-art places');
ok(await p.evaluate(() => getComputedStyle(document.querySelector('main .btn')).borderTopLeftRadius === '0px'), 'buttons are square');
ok(await p.evaluate(() => [...document.querySelectorAll('.sky-world img')].some((i) => i.src.includes('sky-pixel/'))), 'the sky uses its pixel layers');
await shot(p, 'pixel-classroom.png');

// ---------- 3. element auras and attacks ----------
await go('#/pixel-lab', 2600);
await p.getByRole('button', { name: /Pause attacks/ }).click(); await wait(2600);
const before = await canvases();
ok(before >= 20, `element auras play around the creatures (${before} effect canvases)`);
await p.locator('.paper', { hasText: 'Emberpup' }).getByRole('button', { name: 'Attack' }).click(); await wait(700);
const during = await canvases();
ok(during > before, `Attack adds the element attacks (${before} → ${during} canvases)`);
await shot(p, 'pixel-lab.png');
await wait(4500);
ok(await canvases() <= before + 2, 'one-shot attacks clean up after themselves');

// ---------- 4. a creature profile: aura and the ability button ----------
const fire = await p.evaluate(() => { const st = window.__cc.getState(); return st.data.students.find((s) => ['emberpup', 'cinderwing'].includes(s.speciesId))?.id ?? st.data.students[0].id; });
await go(`#/creature/${fire}`, 2600);
ok(await p.locator('main .pc').count() >= 1, 'the profile shows the creature as a pixel sprite');
ok(await canvases() >= 1, 'the profile creature has its element aura');
await shot(p, 'pixel-profile.png');

// ---------- 5. the setting survives a restart ----------
await p.close();
p = await ctx.newPage(); watch(p);
await p.goto(U); await p.waitForTimeout(2200);
ok(await p.evaluate(() => document.documentElement.classList.contains('pixel-mode') && window.__cc.getState().data.settings.pixelMode === true), 'Pixel mode stays on after a restart');

// ---------- 6. phone width ----------
const m = await ctx.newPage(); watch(m);
await m.setViewportSize({ width: 390, height: 844 });
for (const [hash, name] of [['#/', 'pixel-m-classroom'], ['#/adventure', 'pixel-m-map'], [`#/creature/${fire}`, 'pixel-m-profile']]) {
  await m.goto(U + hash); await m.waitForTimeout(1800);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `${name}: no horizontal page scroll at 390px (${over}px)`);
  await shot(m, `${name}.png`, true);
}
await m.close();

// ---------- 7. switch back ----------
await p.getByRole('button', { name: 'Pixel mode' }).click(); await p.waitForTimeout(1500);
ok(!(await p.evaluate(() => document.documentElement.classList.contains('pixel-mode'))) && await p.locator('main .pc').count() === 0, 'switching back restores the painted look');
ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);
} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
