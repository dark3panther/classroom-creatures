#!/usr/bin/env node
/**
 * End-to-end checks for creature card packs (1.9) in a real browser against the dev server: the Cards tab, a pack
 * paid with coins and a free pack won from a boss, the three cards turning over (NEW and the rarity), the binder
 * filling up, the price setting and the off switch.
 *
 *   npm run test:e2e:cards
 *   E2E_SHOTS=out npm run test:e2e:cards
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
const PORT = Number(process.env.E2E_PORT ?? 5202);
const U = `http://localhost:${PORT}/`;
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
for (let i = 0; i < 60; i++) { try { if ((await fetch(U)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|vite/.test(m.text())) errs.push(m.text().slice(0, 200)); });
let fails = 0; const ok = (c, msg) => { console.log(c ? 'PASS' : 'FAIL', msg); if (!c) fails++; };
const wait = (ms) => p.waitForTimeout(ms);
const until = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { const v = await fn().catch(() => null); if (v || Date.now() - t0 > ms) return v; await wait(200); } };
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: join(SHOTS, name) }); };
const student = (id) => p.evaluate((i) => window.__cc.getState().data.students.find((s) => s.id === i), id);

try {
  await p.goto(U); await wait(1200);
  const demo = p.getByRole('button', { name: 'Explore the demo first' }); if (await demo.count()) { await demo.click(); await wait(900); }
  for (const h of ['#/cards', '#/']) { await p.evaluate((x) => { location.hash = x; }, h); await wait(2000); }
  await p.reload(); await wait(2000);
  await p.evaluate(() => window.__cc.getState().updateSettings({ cardPacks: true, packPrice: 25, soundEnabled: false, stage3d: false }));
  const id = await p.evaluate(() => { const s = window.__cc.getState(); return s.data.students.filter((x) => x.classId === s.data.settings.currentClassId)[0].id; });
  await p.evaluate((i) => { const d = window.__cc.getState().data; window.__cc.setState({ data: { ...d, students: d.students.map((s) => (s.id === i ? { ...s, coins: 60, packs: 0, cards: {} } : s)) } }); }, id);

  await p.getByRole('link', { name: 'Cards' }).first().click().catch(() => p.evaluate(() => { location.hash = '#/cards'; }));
  ok(await until(async () => await p.locator('[data-card-student]').count() > 3), 'the Cards tab lists the class to choose from');
  await p.locator(`[data-card-student="${id}"]`).click();
  ok(await until(async () => await p.locator('[data-open-pack]').count() === 1), 'a student shows their coins, an Open a pack button and their binder');
  ok(await p.locator('[data-binder] [data-card][data-locked]').count() >= 200, 'the binder shows every card there is, as silhouettes until collected');
  await shot('cards.png');

  await p.locator('[data-open-pack]').click();
  ok(await until(async () => await p.locator('[data-pack-opening] [data-card]').count() === 3), 'opening a pack turns over three cards');
  await wait(3000);
  ok(await p.locator('[data-pack-opening]').getByText('NEW!').count() >= 1, 'new cards say so');
  const nameColour = await p.locator('[data-pack-opening] [data-card] .text-ink').first().evaluate((el) => getComputedStyle(el).color);
  ok(nameColour !== 'rgb(255, 255, 255)', `the creature's name on a card is readable (${nameColour})`);
  await shot('pack.png');
  let s = await student(id);
  ok(s.coins === 60 - 25 + Object.values(s.cards).reduce((n, c) => n + (c - 1), 0) * 2 || s.coins === 35, `the pack cost 25 coins (now ${s.coins})`);
  ok(Object.keys(s.cards).length >= 1 && Object.values(s.cards).reduce((n, c) => n + c, 0) === 3, 'three cards went into the binder');
  await p.locator('[data-pack-done]').click(); await wait(400);
  ok(await p.locator('[data-binder] [data-card]:not([data-locked])').count() >= 1, 'the binder shows the new cards');

  // a free pack won from a boss comes first
  await p.evaluate((i) => { const d = window.__cc.getState().data; window.__cc.setState({ data: { ...d, students: d.students.map((x) => (x.id === i ? { ...x, packs: 1 } : x)) } }); }, id);
  ok(await until(async () => (await p.locator('[data-open-pack]').innerText()).includes('free pack')), 'a pack won from a boss is offered for free');
  const coinsBefore = (await student(id)).coins;
  await p.locator('[data-open-pack]').click(); await wait(500);
  s = await student(id);
  ok(s.packs === 0 && s.coins >= coinsBefore, 'opening it uses the pack, not coins');
  await p.locator('[data-pack-done]').click(); await wait(300);

  // not enough coins: the button waits
  await p.evaluate((i) => { const d = window.__cc.getState().data; window.__cc.setState({ data: { ...d, students: d.students.map((x) => (x.id === i ? { ...x, coins: 3, packs: 0 } : x)) } }); }, id);
  ok(await until(async () => await p.locator('[data-open-pack]').isDisabled()), 'without enough coins the button is disabled');

  // the teacher's switch
  await p.evaluate(() => window.__cc.getState().updateSettings({ cardPacks: false })); await wait(400);
  ok(await p.getByText('Card packs are switched off').count() === 1, 'switched off in Settings, the Cards tab says so');
  await p.evaluate(() => window.__cc.getState().updateSettings({ cardPacks: true }));
  ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
