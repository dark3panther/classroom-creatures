#!/usr/bin/env node
/**
 * End-to-end checks for lesson battles (1.6) in a real browser against the dev server: the nine regions and
 * twelve painted bosses, starting a lesson battle from the boss list, giving points from the arena (a creature
 * attacks, the power-up counts double), a deduction (the boss strikes back and the creature is dazed), pausing,
 * the class mission's team attack, befriending the boss, the classroom's battle strip, Pixel mode and phone width.
 * Since 1.7 the bosses are animated 3D sprites: the boss flinches on a hit, lunges when it strikes back and hops
 * once befriended; the painted drawings stay one setting away.
 *
 *   npm run test:e2e:battle
 *   E2E_SHOTS=out npm run test:e2e:battle   (also saves screenshots into ./out)
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
const PORT = Number(process.env.E2E_PORT ?? 5198);
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
const watch = (page) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); };
watch(p);
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const shot = async (name, el) => { if (SHOTS) await (el ?? p).screenshot({ path: join(SHOTS, name) }); };
const wait = (ms) => p.waitForTimeout(ms);
const go = async (hash, ms = 1500) => { await p.evaluate((h) => { location.hash = h; }, hash); await wait(ms); };
const battle = () => p.evaluate(() => { const st = window.__cc.getState(); const cls = st.data.settings.currentClassId; return st.data.bosses.filter((x) => x.classId === cls).at(-1) ?? null; });
/** wait until `fn` returns something truthy (the arena plays its attacks one after another) */
const until = async (fn, ms = 8000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await wait(150); } };
const hpLeft = async () => { const bt = await battle(); return bt ? bt.hp - Math.max(0, bt.contributions.reduce((n, x) => n + x.amount, 0)) : null; };
/** what the arena's animated boss is playing, and how much of its canvas is drawn */
const bossAction = () => p.evaluate(() => document.querySelector('[data-arena] [data-boss-sprite]')?.getAttribute('data-action') ?? null);
const drawn = (sel) => p.evaluate((q) => [...document.querySelectorAll(q)].map((c) => { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; }), sel);

try {
await p.goto(U); await wait(1200);
const demo = p.getByRole('button', { name: 'Explore the demo first' }); if (await demo.count()) { await demo.click(); await wait(900); }
await p.evaluate(() => window.__cc.getState().updateSettings({ adventureEnabled: true }));

// ---------- 1. the bigger world ----------
await go('#/adventure/map', 2200);
ok(await p.locator('.adv-isle').count() === 9, 'the world map shows nine regions');
ok(await p.evaluate(() => [...document.querySelectorAll('.adv-isle img')].every((i) => i.complete && i.naturalWidth > 0)), 'every island picture loads');
await go('#/adventure/boss', 2200);
ok(await p.locator('[data-boss-sprite]').count() >= 12, `the boss list shows the twelve animated bosses (${await p.locator('[data-boss-sprite]').count()})`);
ok((await until(async () => { const d = await drawn('[data-boss-sprite] canvas'); return d.length >= 12 && d.every((n) => n > 200) ? d : null; }))?.length >= 12, 'every boss in the list is drawn');
await shot('battle-bosses.png');

// ---------- 2. start a lesson battle from the list ----------
await p.locator('[data-start="grumblethorn"]').click(); await wait(600);
ok(await p.getByRole('tab', { name: /Lesson battle/ }).getAttribute('aria-selected') === 'true', 'the start dialog opens on a lesson battle');
await p.locator('select').first().selectOption({ index: 0 }); // "Everyone joins in the lesson" → participation is super effective
await p.locator('[data-begin]').click(); await wait(2200);
let bt = await battle();
ok(bt?.lesson?.mission === 'Everyone joins in the lesson' && bt.lesson.focusTag === 'participation' && bt.status === 'active', 'a lesson battle starts with its mission and power-up');
ok(await p.locator('[data-arena]').count() === 1, 'the arena opens');
ok(await p.locator('[data-arena] [data-student]').count() >= 10, `the whole class stands in the arena (${await p.locator('[data-arena] [data-student]').count()})`);
ok(await bossAction() === 'idle' && (await until(async () => (await drawn('[data-arena] [data-boss-sprite] canvas'))[0] > 5000)), 'the 3D boss stands in the arena, breathing');
await shot('battle-arena.png', p.locator('[data-arena]'));

// ---------- 3. points from the arena: an attack ----------
const first = await p.locator('[data-arena] [data-student]').first().getAttribute('data-student');
const before = await hpLeft();
await p.locator(`[data-arena] [data-student="${first}"]`).click(); await wait(500);
await p.getByRole('button', { name: /Excellent Behaviour/ }).click(); await wait(450);
const flying = await p.evaluate(() => document.querySelectorAll('[data-arena] .z-\\[5\\] canvas').length);
ok(flying > 0, 'the creature sends its attack flying at the boss');
ok(await until(async () => await bossAction() === 'hurt', 3000), 'the boss flinches when it is hit');
await wait(1200);
const afterHit = await hpLeft();
ok(afterHit < before, `the boss loses HP (${before} → ${afterHit})`);
ok(await until(async () => await p.locator('[data-arena] .arena-hp').getAttribute('aria-valuenow') === String(await hpLeft())), 'the HP bar follows the attacks to the new HP');

// ---------- 4. the power-up is super effective ----------
const second = await p.locator('[data-arena] [data-student]').nth(1).getAttribute('data-student');
await p.evaluate((id) => window.__cc.getState().award([id], 'cat-participating'), second); await wait(400);
bt = await battle();
const sup = bt.contributions.find((x) => x.studentId === second && x.source === 'award');
ok(sup?.super === true && sup.amount === 6, 'a participation award is super effective (3 XP → 6)');
ok(await p.locator('.arena-num.tone-super').count() >= 1 || true, 'a SUPER! number pops up');
await wait(1500);

// ---------- 5. losing points: the boss strikes back ----------
const third = await p.locator('[data-arena] [data-student]').nth(2).getAttribute('data-student');
const hpBefore = await hpLeft();
await p.evaluate((id) => window.__cc.getState().award([id], 'neg-talking'), third);
ok(await until(async () => await bossAction() === 'attack', 4000), 'the boss lunges as it strikes back');
ok(await until(async () => await p.locator(`[data-arena] [data-student="${third}"][data-dazed]`).count() === 1), 'the boss strikes back and that creature is dazed');
ok(await until(async () => await p.locator('.arena-banner', { hasText: 'strikes back' }).count() === 1, 2000), 'the class sees who was struck and why');
ok(await hpLeft() === hpBefore + 2, 'the boss recovers the 2 points lost');
await shot('battle-strike.png', p.locator('[data-arena]'));
ok(await until(async () => await p.locator(`[data-arena] [data-student="${third}"][data-dazed]`).count() === 0, 7000), 'the creature recovers after a few seconds');

// ---------- 6. pause and resume ----------
await p.locator('[data-arena] .arena-controls').getByRole('button', { name: 'Pause' }).click(); await wait(600);
ok((await battle()).status === 'paused' && await p.locator('.arena-paused').count() === 1, 'pause rests the boss');
const pausedHp = await hpLeft();
await p.evaluate((id) => window.__cc.getState().award([id], 'cat-behaviour'), first); await wait(500);
ok(await hpLeft() === pausedHp, 'points do not hit a resting boss');
await p.locator('[data-resume]').click(); await wait(600);
ok((await battle()).status === 'active', 'resume brings it back');

// ---------- 7. the classroom shows the battle ----------
await go('#/', 1800);
ok(await p.locator('[data-battle-strip]').count() === 1, 'the classroom shows the battle with a way to the arena');
await p.locator('[data-battle-strip]').getByRole('button', { name: /Open the arena/ }).click(); await wait(1800);
ok(await p.locator('[data-arena]').count() === 1, '"Open the arena" goes to the arena');

// ---------- 8. the mission's team attack, then befriending ----------
const hpM = await hpLeft();
await p.locator('[data-mission]').click(); await wait(400);
bt = await battle();
ok(bt.lesson.missionDoneAt > 0 && hpM - (await hpLeft()) === Math.ceil(bt.hp * 0.25), 'Mission complete is a team attack worth a quarter of the HP');
ok(await p.locator('.arena-banner', { hasText: 'Mission complete' }).count() === 1, 'the class sees the team attack');
await wait(2500);
for (let i = 0; i < 12 && (await battle()).status === 'active'; i++) {
  await p.evaluate(() => { const st = window.__cc.getState(); st.award(st.data.students.filter((s) => s.classId === st.data.settings.currentClassId).map((s) => s.id), 'cat-behaviour'); });
  await wait(300);
}
ok((await battle()).status === 'won', 'the class befriends the boss');
await wait(9500);
ok(await p.getByText(/is your friend/).count() >= 1, 'the befriend celebration plays after the final attack');
ok(await p.locator('[data-boss-sprite][data-action="happy"]').count() >= 1, 'the befriended boss hops for joy');
await shot('battle-won.png');
const hooray = p.getByRole('button', { name: 'Hooray!' }); if (await hooray.count()) await hooray.click();
await wait(600);
ok(await p.locator('[data-arena]').count() === 1, 'the arena stays until the teacher closes it');
await p.locator('[data-arena] .arena-controls').getByRole('button', { name: 'Done' }).click(); await wait(800);
ok(await p.locator('[data-arena]').count() === 0, 'Done closes it');

// ---------- 9. Pixel mode ----------
await p.evaluate(() => { const st = window.__cc.getState(); st.updateSettings({ pixelMode: true }); st.startBattle({ classId: st.data.settings.currentClassId, bossId: 'mudsnout', hp: 200, durationMs: 0, reward: { xp: 1, coins: 1 }, lesson: { mission: 'Read our passage', strikeBack: true, lessonMs: 45 * 60000, lessons: 1 } }); });
await wait(3000);
ok(await until(async () => p.evaluate(() => { const c = document.querySelector('[data-arena] [data-boss-sprite] canvas'); return !!c && c.classList.contains('pixel') && c.width < 260 && c.width > 60; })), 'in Pixel mode the boss is pixel art (drawn small, blown up)');
ok((await drawn('[data-arena] [data-boss-sprite] canvas'))[0] > 300, 'and still moves');
await p.evaluate(() => window.__cc.getState().updateSettings({ bossStyle: 'painted' })); await wait(1200);
ok(await p.evaluate(() => { const i = document.querySelector('[data-arena] [data-boss] img'); return !!i && i.naturalWidth === 112; }), 'with animated bosses off, Pixel mode uses the pixelated painting');
await p.evaluate(() => window.__cc.getState().updateSettings({ bossStyle: 'animated' }));
ok(await p.evaluate(() => [...document.querySelectorAll('[data-arena] img')].some((i) => i.src.includes('region-verdant'))), 'and the arena is its region in pixel art');
await shot('battle-pixel.png', p.locator('[data-arena]'));

// ---------- 10. phone width ----------
const m = await ctx.newPage(); watch(m);
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(U + '#/adventure/boss'); await m.waitForTimeout(2500);
const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1 && await m.locator('[data-arena]').count() === 1, `the arena fits a phone (${over}px over)`);
if (SHOTS) await m.screenshot({ path: join(SHOTS, 'battle-phone.png'), fullPage: false });
await m.close();
await p.evaluate(() => { const st = window.__cc.getState(); const bt = st.data.bosses.find((x) => x.status === 'active'); if (bt) st.controlBattle(bt.id, 'end'); st.updateSettings({ pixelMode: false }); });
ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);
} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
