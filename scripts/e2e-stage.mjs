#!/usr/bin/env node
/**
 * End-to-end checks for the 3D stage (1.8, Godot) in a real browser against the dev server, with the desktop app's
 * content policy on the stage's own pages: the 3D arena (it starts, points hit the boss at the moment of impact, a
 * deduction makes the boss strike back, the keyboard list of creatures opens the award panel, the 2D arena comes back
 * with the setting off), the 3D class world (and its pixel-map switch), the three class games (played through on short
 * settings) and the 3D evolution behind the evolution overlay.
 *
 *   npm run test:e2e:stage              (the stage must be exported first: npm run stage)
 *   E2E_SHOTS=out npm run test:e2e:stage
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
const PORT = Number(process.env.E2E_PORT ?? 5201);
const U = `http://localhost:${PORT}/`;
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
// what electron/main.cjs sets on every response
const CSP = "default-src 'self' app:; img-src 'self' app: data: blob:; style-src 'self' app: 'unsafe-inline'; font-src 'self' app: data:; script-src 'self' app: 'wasm-unsafe-eval'; connect-src 'self' app: data:";

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
for (let i = 0; i < 60; i++) { try { if ((await fetch(U)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// software rendering in a test browser is slow (a frame or two a second for a full class): a smaller window, long waits
const ctx = await b.newContext({ viewport: { width: 1100, height: 720 } });
// the stage's pages run under the desktop app's policy (the dev page itself needs inline scripts, so it is left alone)
await ctx.route('**/godot/**', async (route) => { const r = await route.fetch(); await route.fulfill({ response: r, headers: { ...r.headers(), 'content-security-policy': CSP } }); });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' && !/WebSocket|vite|Content Security Policy.*inline/.test(t)) || /SCRIPT ERROR|Parse Error/.test(t)) errs.push(t.slice(0, 240)); });
let fails = 0; const ok = (c, msg) => { console.log(c ? 'PASS' : 'FAIL', msg); if (!c) fails++; };
const wait = (ms) => p.waitForTimeout(ms);
const go = async (hash, ms = 1500) => { await p.evaluate((h) => { location.hash = h; }, hash); await wait(ms); };
const until = async (fn, ms = 60000) => { const t0 = Date.now(); for (;;) { const v = await fn().catch(() => null); if (v || Date.now() - t0 > ms) return v; await wait(250); } };
const shot = async (name, sel) => { if (!SHOTS) return; const bb = sel ? await p.locator(sel).first().boundingBox() : null; await p.screenshot({ path: join(SHOTS, name), clip: bb ?? undefined, timeout: 90000 }); };
const st = () => p.evaluate(() => window.__cc.getState());

try {
await p.goto(U); await wait(1200);
const demo = p.getByRole('button', { name: 'Explore the demo first' }); if (await demo.count()) { await demo.click(); await wait(900); }
// a fresh dev server optimises the lazily loaded screens' dependencies on first sight and reloads the page: visit them
// once, then reload, so no reload lands in the middle of a check
for (const h of ['#/games', '#/adventure/boss', '#/adventure/world', '#/']) { await p.evaluate((x) => { location.hash = x; }, h); await wait(2500); }
await p.reload(); await wait(2500);
await p.evaluate(() => window.__cc.getState().updateSettings({ adventureEnabled: true, stage3d: true, pixelMode: false }));

// ---------- 1. the 3D arena ----------
await p.evaluate(() => { const s = window.__cc.getState(); s.startBattle({ classId: s.data.settings.currentClassId, bossId: 'glimmerjaw', hp: 240, durationMs: 0, reward: { xp: 2, coins: 5 }, lesson: { mission: 'Everyone joins in the lesson', focusTag: 'participation', strikeBack: true, lessonMs: 45 * 60000, lessons: 1 } }); });
await go('#/adventure/boss', 1000);
ok(await until(async () => await p.locator('[data-arena] [data-stage="arena"][data-stage-ready]').count() === 1), 'the 3D arena starts inside the arena');
ok(await p.locator('[data-arena] .arena-class').count() === 0 && await p.locator('[data-arena] .arena-hud').count() === 1, 'the stage draws the boss and the class; the HP and mission stay on top');
await wait(4000);
const ids = await p.evaluate(() => { const s = window.__cc.getState(); return s.data.students.filter((x) => x.classId === s.data.settings.currentClassId).map((x) => x.id); });
const hp0 = Number(await p.locator('.arena-hp').getAttribute('aria-valuenow'));
await p.evaluate((id) => window.__cc.getState().award([id], 'cat-participating'), ids[2]);
ok(await until(async () => Number(await p.locator('.arena-hp').getAttribute('aria-valuenow')) === hp0 - 6, 45000), `a point hits the boss in 3D and the HP bar follows at the impact (${hp0} → ${hp0 - 6})`);
await shot('stage-arena.png', '[data-arena]');
await wait(9000);
await p.evaluate((id) => window.__cc.getState().award([id], 'neg-talking'), ids[4]);
ok(await until(async () => await p.locator('.arena-banner', { hasText: 'strikes back' }).count() === 1, 45000), 'a deduction: the boss strikes back in 3D and the class is told');
await wait(2500);
await p.locator('[data-arena] .sr-only button').first().evaluate((el) => el.click()); await wait(600);   // as Enter on the focused button does
ok(await p.getByRole('dialog').count() >= 1, 'the creature list for keyboards opens the award panel');
await p.keyboard.press('Escape'); await wait(400);
await p.evaluate(() => window.__cc.getState().updateSettings({ stage3d: false })); await wait(1200);
ok(await p.locator('[data-arena] .arena-class').count() === 1 && await p.locator('[data-stage="arena"]').count() === 0, 'with 3D scenes off, the 2D arena is back');
await p.evaluate(() => { const s = window.__cc.getState(); const bt = s.data.bosses.find((x) => x.status === 'active'); if (bt) s.controlBattle(bt.id, 'end'); s.updateSettings({ stage3d: true }); });

// ---------- 2. the 3D class world ----------
await go('#/adventure/world', 1000);
ok(await until(async () => await p.locator('[data-world3d] [data-stage-ready]').count() === 1), 'the class world opens in 3D');
await wait(4000);
await shot('stage-world.png', '[data-world3d]');
await p.getByRole('button', { name: 'Pixel map' }).click(); await wait(800);
ok(await p.locator('[data-world3d]').count() === 0 && await p.locator('.adv-map').count() >= 1, 'the pixel map is one tap away');
await p.getByRole('button', { name: 'Walk around in 3D' }).click(); await wait(800);
ok(await p.locator('[data-world3d]').count() === 1, 'and back to 3D');

// ---------- 3. class games ----------
await p.evaluate(() => { window.__ccFastGames = true; });
await go('#/games', 1200);
ok(await until(async () => await p.locator('[data-game]').count() === 3, 15000), 'the games page offers three games');
await p.locator('[data-game="race"]').click();
ok(await until(async () => await p.locator('[data-game-start]').count() === 1), 'the class relay is ready');
await wait(2500);
await p.locator('[data-game-start]').click();
ok(await until(async () => await p.locator('[data-game-note]').count() === 1, 15000), 'the class sees whose leg it is');
const race = await until(async () => (await p.locator('[data-game-result]').count()) && p.locator('[data-game-result]').innerText(), 120000);
ok(!!race && /beat|won this time/.test(race), `the relay ends with the class result (${String(race).split('\n')[0]})`);
await shot('stage-race.png', '[data-game-stage]');
await go('#/games/stars', 800);
ok(await until(async () => await p.locator('[data-game-start]').count() === 1), 'catch the stars is ready');
await wait(1500);
await p.locator('[data-game-start]').click();
const stars = await until(async () => (await p.locator('[data-game-result]').count()) && p.locator('[data-game-result]').innerText(), 60000);
ok(!!stars && /stars caught/.test(stars), `catch the stars ends with the class's count (${String(stars).split('\n')[0]})`);
await go('#/games/memory', 800);
ok(await until(async () => await p.locator('[data-game-start]').count() === 1), 'the memory match deals its cards');
await wait(2500);
await shot('stage-memory.png', '[data-game-stage]');

// ---------- 4. the 3D evolution ----------
await go('#/', 1200);
// software rendering starts the stage slowly: give the overlay longer before it falls back to 2D
await p.evaluate(() => { window.__ccStageWait = 40000; });
await p.evaluate((id) => window.__cc.setState({ celebrations: [{ id: 'e2e-evo', type: 'evolution', studentId: id, from: 2, to: 3 }] }), ids[0]);
ok(await until(async () => await p.locator('[data-stage="evolution"][data-stage-ready]').count() === 1, 45000), 'an evolution plays in 3D behind the overlay');
ok(await until(async () => await p.getByText('Your creature evolved!').count() === 1, 30000), 'and the overlay reveals the new form on time');
await shot('stage-evolution.png');
await p.getByRole('button', { name: 'Hooray!' }).click(); await wait(500);

ok(errs.length === 0, `no page or stage script errors${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);
} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
