#!/usr/bin/env node
/**
 * End-to-end checks for the 1.4 creature RPG flows, in a real browser against the dev server:
 * the 1.3 to 1.4 upgrade, pet/feed/play, abilities, buying and wearing an item, teacher-approved
 * evolution, the field guide, locked student mode, persistence across a restart, and phone width.
 *
 *   npm run test:e2e                 (needs Playwright: npm i -D playwright && npx playwright install chromium)
 *   E2E_SHOTS=out npm run test:e2e   (also saves screenshots into ./out)
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
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const shot = async (page, name, fullPage = false) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name), fullPage }); };
const st = (id) => p.evaluate((id) => window.__cc.getState().data.students.find((s) => s.id === id), id);
const wait = (ms) => p.waitForTimeout(ms);

try {
await p.goto(U); await wait(1200);
const demo = p.getByRole('button', { name: 'Explore the demo first' }); if (await demo.count()) { await demo.click(); await wait(900); }

// ---------- 1. 1.3 save upgrades in a real browser ----------
const before = await p.evaluate(async () => {
  const d = JSON.parse(JSON.stringify(window.__cc.getState().data));
  d.version = 2;
  for (const k of ['evolutionMode', 'soundVolume', 'uiSounds', 'disabledSpecies', 'disabledItems', 'itemPrices', 'shopWhileLocked']) delete d.settings[k];
  d.students.forEach((s) => { delete s.evolutionLog; delete s.skills; delete s.interactions; delete s.branch; });
  d.classes.forEach((c) => delete c.discovered);
  await new Promise((res, rej) => { const r = indexedDB.open('classroom-creatures'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(d, 'cc:data'); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = rej; }; r.onerror = rej; });
  return d.students.map((s) => ({ id: s.id, xp: s.xp, coins: s.coins, items: s.unlockedItems, eq: s.equipped, stage: s.bestStage, sp: s.speciesId }));
});
await p.reload(); await wait(1500);
const after = await p.evaluate(() => { const d = window.__cc.getState().data; return { v: d.version, mode: d.settings.evolutionMode, s: d.students.map((s) => ({ id: s.id, xp: s.xp, coins: s.coins, items: s.unlockedItems, eq: s.equipped, stage: s.bestStage, sp: s.speciesId, log: s.evolutionLog })) }; });
ok(after.v === 3, `1.3 save migrated to data version ${after.v}`);
ok(after.mode === 'auto', 'upgraded classes keep automatic evolution');
ok(before.every((x) => { const y = after.s.find((s) => s.id === x.id); return y && y.xp === x.xp && y.coins === x.coins && y.stage === x.stage && y.sp === x.sp && JSON.stringify(y.items) === JSON.stringify(x.items) && JSON.stringify(y.eq) === JSON.stringify(x.eq); }), `all ${before.length} students keep XP, coins, creature, stage, owned and equipped items`);
ok(after.s.every((s) => Array.isArray(s.log) && s.log.length === s.stage - 1), 'evolution history rebuilt from stages reached');
const snaps = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('classroom-creatures'); r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('cc:snapshots'); g.onsuccess = () => res((g.result ?? []).map((x) => x.reason)); }; }));
ok(snaps.some((r) => /^Before upgrading/.test(r)), `safety snapshot taken before upgrading (${snaps[0]})`);

// pick the richest student
const sid = await p.evaluate(() => window.__cc.getState().data.students.slice().sort((a, b) => b.coins - a.coins)[0].id);
const s0 = await st(sid);

// ---------- 2. creature profile + interactions ----------
await p.goto(`${U}#/creature/${sid}`); await wait(1200);
await p.getByRole('button', { name: 'Pet', exact: true }).click(); await wait(700);
await p.getByRole('button', { name: 'Feed', exact: true }).click(); await wait(400);
await p.getByText('Snacks and toys are free').locator('..').locator('button').first().click(); await wait(800);
await p.getByRole('button', { name: 'Play', exact: true }).click(); await wait(400);
await p.getByText('Snacks and toys are free').locator('..').locator('button').first().click(); await wait(800);
const s1 = await st(sid);
ok(s1.interactions.pet === 1 && s1.interactions.feed === 1 && s1.interactions.play === 1, 'pet, feed and play are counted');
ok(s1.xp === s0.xp && s1.coins === s0.coins, 'interactions never change XP or coins');
await shot(p, 'qa-profile.png', true);

// ---------- 3. abilities ----------
const awaken = p.getByRole('button', { name: /Awaken · 1 point/ }).first();
if (await awaken.count()) { await awaken.scrollIntoViewIfNeeded(); await awaken.click(); await wait(600); }
const s2 = await st(sid);
ok(Object.values(s2.skills).reduce((a, b) => a + b, 0) === 1, 'awakening spends one skill point');
ok(s2.xp === s0.xp && s2.coins === s0.coins, 'abilities never change XP or coins');

// ---------- 4. dressing room purchase ----------
await p.goto(`${U}#/creature/${sid}/customize`); await wait(1200);
await p.getByRole('button', { name: /Pom-pom Beanie/ }).click(); await wait(300);
await p.getByRole('button', { name: /Buy and wear · 25/ }).click(); await wait(800);
const s3 = await st(sid);
ok(s3.coins === s2.coins - 25, `buying costs exactly the price (${s2.coins} -> ${s3.coins})`);
ok(s3.unlockedItems.includes('hat-beanie') || s3.unlockedItems.some((i) => /beanie/.test(i)), 'item is owned');
ok(/beanie/.test(s3.equipped.hat ?? ''), 'item is worn');
ok((await p.getByRole('button', { name: /Buy and wear/ }).count()) === 0, 'owned item cannot be bought twice');
await shot(p, 'qa-dressing.png');

// ---------- 5. teacher approval evolution ----------
await p.evaluate(() => window.__cc.getState().updateSettings({ evolutionMode: 'approval' }));
const evo = await p.evaluate(() => window.__cc.getState().data.students.find((s) => s.bestStage < 4).id);
const e0 = await st(evo);
let flagged = false;
for (let i = 0; i < 120 && !flagged; i++) flagged = await p.evaluate((id) => !!window.__cc.getState().award([id], 'cat-behaviour')[0]?.readyToEvolve, evo);
ok(flagged, 'approval mode: creature is flagged ready to evolve');
await p.evaluate(() => { const g = window.__cc.getState(); g.celebrations.forEach((c) => g.dismissCelebration(c.id)); });
const e1 = await st(evo);
ok(e1.bestStage === e0.bestStage, 'approval mode: enough XP does not evolve by itself');
await p.goto(`${U}#/settings/creatures`); await wait(900);
const review = p.getByRole('button', { name: 'Review evolutions' });
ok(await review.count() > 0, 'waiting evolutions show up for the teacher');
if (await review.count()) {
  await review.click(); await wait(600);
  await shot(p, 'qa-queue.png');
  await p.getByRole('button', { name: 'Evolve', exact: true }).first().click(); await wait(1900);
  await shot(p, 'qa-evolving.png');
}
await wait(4000);
const evolvedSomeone = await p.evaluate(() => window.__cc.getState().data.students.some((s) => (s.evolutionLog ?? []).some((e) => e.at > Date.now() - 60000)));
ok(evolvedSomeone, 'teacher-approved evolution happened and was logged');
await p.evaluate(() => { const g = window.__cc.getState(); g.celebrations.forEach((c) => g.dismissCelebration(c.id)); });
await p.keyboard.press('Escape'); await wait(400);

// ---------- 6. field guide search and filters ----------
await p.goto(`${U}#/creatures`); await wait(1200);
await p.getByPlaceholder('Search').fill('ember'); await wait(400);
ok(await p.getByText('Emberpup').count() > 0 && await p.getByText('Tidepaw').count() === 0, 'field guide search narrows to matching creatures');
await p.getByPlaceholder('Search').fill('');
await p.getByLabel('Filter by discovery').selectOption('undiscovered'); await wait(400);
await shot(p, 'qa-guide-undiscovered.png');
await p.getByLabel('Filter by discovery').selectOption('all');

// ---------- 7. locked mode: students cannot touch XP or coins ----------
await p.evaluate(() => window.__cc.getState().setLocked(true)); await wait(300);
await p.goto(`${U}#/creature/${sid}`); await wait(1200);
ok(await p.getByText('Teacher controls are locked').count() > 0, 'locked: creature profile opens in student mode');
ok(await p.getByRole('button', { name: /Adjust XP|Reset/ }).count() === 0, 'locked: no XP, coin or reset controls');
ok(await p.locator('input[type=number]').count() === 0, 'locked: no number inputs for XP or coins');
await shot(p, 'qa-locked-profile.png');
await p.goto(`${U}#/settings/creatures`); await wait(900);
ok(await p.getByRole('button', { name: 'Adjust XP' }).count() === 0, 'locked: settings are not reachable');

// ---------- 8. everything persists across a restart ----------
const snapshotBefore = await st(sid);
await p.close();
const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push(e.message));
await p2.goto(`${U}#/creature/${sid}`); await p2.waitForTimeout(1600);
const r = await p2.evaluate((id) => { const g = window.__cc.getState(); return { s: g.data.students.find((s) => s.id === id), mode: g.data.settings.evolutionMode }; }, sid);
ok(r.s.coins === snapshotBefore.coins && /beanie/.test(r.s.equipped.hat ?? '') && r.s.interactions.pet === 1 && Object.values(r.s.skills).reduce((a, b) => a + b, 0) === 1, 'purchase, worn item, interactions and abilities survive a restart');
ok(r.mode === 'approval', 'teacher settings survive a restart');
ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);

// ---------- 9. phone width ----------
const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await m.goto(U); await m.waitForTimeout(1200);
const d2 = m.getByRole('button', { name: 'Explore the demo first' }); if (await d2.count()) { await d2.click(); await m.waitForTimeout(800); }
const mid = await m.evaluate(() => window.__cc.getState().data.students[0].id);
for (const [path, name] of [[`#/creature/${mid}`, 'qa-m-profile'], [`#/creature/${mid}/customize`, 'qa-m-dressing'], ['#/creatures', 'qa-m-guide'], ['#/settings/creatures', 'qa-m-teacher']]) {
  await m.goto(U + path); await m.waitForTimeout(1300);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `${name}: no horizontal page scroll at 390px (${over}px)`);
  await shot(m, '${name}.png');
}

} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
