#!/usr/bin/env node
/**
 * End-to-end checks for 1.7's 3D art in a real browser against the dev server: the animated bosses (Blender models
 * rendered by SpriteCast) in the boss list, the region page and a wandering boss walking its lane, the setting that
 * brings back the painted bosses, and the Blender treasure chest bursting open.
 *
 *   npm run test:e2e:sprites
 *   E2E_SHOTS=out npm run test:e2e:sprites   (also saves screenshots into ./out)
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
const PORT = Number(process.env.E2E_PORT ?? 5199);
const U = `http://localhost:${PORT}/`;
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
for (let i = 0; i < 60; i++) { try { if ((await fetch(U)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const shot = async (name, el) => { if (SHOTS) await (el ?? p).screenshot({ path: join(SHOTS, name) }); };
const wait = (ms) => p.waitForTimeout(ms);
const go = async (hash, ms = 1500) => { await p.evaluate((h) => { location.hash = h; }, hash); await wait(ms); };
const until = async (fn, ms = 8000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await wait(150); } };
const drawn = (sel) => p.evaluate((q) => [...document.querySelectorAll(q)].map((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; }), sel);

try {
await p.goto(U); await wait(1200);
const demo = p.getByRole('button', { name: 'Explore the demo first' }); if (await demo.count()) { await demo.click(); await wait(900); }
await p.evaluate(() => window.__cc.getState().updateSettings({ adventureEnabled: true, stage3d: false }));   // the 2D arena and world (the 3D stage: e2e-stage.mjs)

// ---------- 1. the boss list: twelve animated bosses ----------
await go('#/adventure/boss', 2500);
ok(await p.locator('[data-boss-sprite]').count() >= 12, 'the boss list shows the animated bosses');
const list = await until(async () => { const d = await drawn('[data-boss-sprite] canvas'); return d.length >= 12 && d.every((n) => n > 200) ? d : null; });
ok(!!list, `every boss is drawn${list ? '' : ': ' + JSON.stringify(await drawn('[data-boss-sprite] canvas'))}`);
await shot('sprites-list.png');

// ---------- 2. the region: the boss breathes, a wandering boss walks ----------
await go('#/adventure/region/verdant', 2500);
ok(await p.locator('[data-boss-sprite][data-action="idle"]').count() >= 1, "the region's boss is animated");
const lanes = await p.locator('[data-wandering]').count();
if (lanes) {
  const walk = await until(async () => p.evaluate(() => document.querySelector('[data-wandering] [data-boss-sprite]')?.getAttribute('data-action')));
  ok(walk === 'walkEast' || walk === 'walkWest', `a wandering boss walks its lane (${walk})`);
  const x0 = await p.evaluate(() => document.querySelector('.boss-walker').getBoundingClientRect().left);
  await wait(1500);
  const x1 = await p.evaluate(() => document.querySelector('.boss-walker').getBoundingClientRect().left);
  ok(Math.abs(x1 - x0) > 10, `and moves along it (${Math.round(x0)} → ${Math.round(x1)})`);
  ok((await drawn('[data-wandering] canvas'))[0] > 100, 'the walking boss is drawn');
  await shot('sprites-region.png');
} else ok(false, 'Verdant Valley shows a wandering boss');

// ---------- 3. painted bosses are one setting away ----------
await p.evaluate(() => window.__cc.getState().updateSettings({ bossStyle: 'painted' }));
await go('#/adventure/boss', 1800);
ok(await p.locator('svg.boss-art').count() >= 12 && await p.locator('[data-boss-sprite]').count() === 0, 'with animated bosses off, the painted drawings come back');
await p.evaluate(() => window.__cc.getState().updateSettings({ bossStyle: 'animated' }));

// ---------- 4. the 3D chest bursts open ----------
const kid = await p.evaluate(() => {
  window.__cc.getState().updateSettings({ evolutionMode: 'approval' });   // no evolution scene over the chest
  const st = window.__cc.getState(); const cls = st.data.settings.currentClassId;
  const s = st.data.students.find((x) => x.classId === cls); const top = st.data.settings.levelXp.at(-1);
  window.__cc.setState({ data: { ...st.data, students: st.data.students.map((x) => (x.id === s.id ? { ...x, xp: top + 10 } : x)) } });
  window.__cc.setState({ celebrations: [] });
  return s.id;
});
await go(`#/adventure/treasure?student=${kid}`, 1800);
await p.evaluate(() => window.__cc.setState({ celebrations: [] })); await wait(300);
await p.locator('.paper', { hasText: "Hero's Chest" }).getByRole('button', { name: 'Open' }).click(); await wait(700);
ok(await p.locator('[data-chest3d="special"]').count() === 1 && await p.locator('[data-chest3d][data-open]').count() === 0, 'the 3D chest waits, closed');
const bgOk = await p.evaluate(() => { const el = document.querySelector('[data-chest3d]'); const im = getComputedStyle(el).backgroundImage; return im.includes('chests/special.webp'); });
ok(bgOk, 'it is the Blender chest');
await shot('sprites-chest-closed.png', p.getByRole('dialog', { name: 'Open treasure' }));
await p.getByRole('button', { name: /Open it/ }).click();
ok(await until(async () => await p.locator('[data-chest3d].chest3d-open').count() === 1, 3000), 'pressing Open plays the lid flying open');
await wait(1600);
const end = await p.evaluate(() => getComputedStyle(document.querySelector('[data-chest3d]')).backgroundPositionX);
ok(end === '100%', `and it stays open on the last frame (${end})`);
ok(await p.getByText(/Inside you found|keepsake/).count() >= 1, 'then shows what was inside');
await shot('sprites-chest-open.png', p.getByRole('dialog', { name: 'Open treasure' }));
await p.getByRole('button', { name: 'Close' }).last().click(); await wait(400);

// ---------- 5. Pixel mode keeps the pixel chest ----------
await p.evaluate(() => window.__cc.getState().updateSettings({ pixelMode: true }));
await go(`#/adventure/treasure?student=${kid}`, 1500);
ok(await p.locator('[data-chest3d]').count() === 0, 'Pixel mode keeps the pixel-art chests');
await p.evaluate(() => window.__cc.getState().updateSettings({ pixelMode: false }));

ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);
} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
