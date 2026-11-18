#!/usr/bin/env node
/**
 * End-to-end checks for the World of Adventures (1.5) in a real browser against the dev server:
 * the 1.4 to 1.5 upgrade, creating a quest, a student handing it in from the locked kiosk, the teacher
 * approving it, collecting the reward exactly once, a cooperative boss battle, exploring and opening a
 * treasure chest, the journal, persistence across a restart, and phone width.
 *
 *   npm run test:e2e:adventure
 *   E2E_SHOTS=out npm run test:e2e:adventure   (also saves screenshots into ./out)
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
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
let p = await ctx.newPage();
const errs = [];
const watch = (page) => { page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); };
watch(p);
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const shot = async (page, name, fullPage = false) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name), fullPage }); };
const g = (fn, arg) => p.evaluate(fn, arg);
const st = (id) => g((id) => window.__cc.getState().data.students.find((s) => s.id === id), id);
const wait = (ms) => p.waitForTimeout(ms);
const go = async (hash) => { await g((h) => { location.hash = h; }, hash); await wait(1100); };
const quiet = () => g(() => window.__cc.setState({ celebrations: [] }));

try {
await p.goto(U); await wait(1200);
const demo = p.getByRole('button', { name: 'Explore the demo first' }); if (await demo.count()) { await demo.click(); await wait(900); }

// ---------- 1. a 1.4 save upgrades without losing anything ----------
const before = await g(async () => {
  const d = JSON.parse(JSON.stringify(window.__cc.getState().data));
  d.version = 3;
  for (const k of ['quests', 'questRecords', 'bosses', 'adventureLog', 'rewardLedger']) delete d[k];
  for (const k of ['adventureEnabled', 'classWorld', 'adventureWhileLocked']) delete d.settings[k];
  d.challenges = [
    { id: 'ch-participate-3', title: 'Participate three times today', period: 'daily', metric: 'count', tag: 'participation', target: 3, active: true },
    { id: 'ch-xp-20', title: 'Earn 20 XP this week', period: 'weekly', metric: 'xp', target: 20, active: true },
  ];
  d.students.forEach((s) => delete s.adventure);
  d.classes.forEach((c) => delete c.adventure);
  await new Promise((res, rej) => { const r = indexedDB.open('classroom-creatures'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(d, 'cc:data'); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = rej; }; r.onerror = rej; });
  return d.students.map((s) => ({ id: s.id, xp: s.xp, coins: s.coins, items: s.unlockedItems.length, stage: s.bestStage }));
});
await p.reload(); await wait(1600);
const up = await g(() => { const d = window.__cc.getState().data; return { v: d.version, challenges: d.challenges.length, fromCh: d.quests.filter((q) => q.fromChallenge).length, quests: d.quests.length, on: d.settings.adventureEnabled, s: d.students.map((s) => ({ id: s.id, xp: s.xp, coins: s.coins, items: s.unlockedItems.length, stage: s.bestStage, adv: !!s.adventure })) }; });
ok(up.v === 4, `1.4 save migrated to data version ${up.v}`);
ok(up.challenges === 2 && up.fromCh === 2, 'challenges kept as they were and turned into quests');
ok(up.quests > 2 && up.on, `starting quests added (${up.quests} quests), adventure on`);
ok(before.every((x) => { const y = up.s.find((s) => s.id === x.id); return y && y.xp === x.xp && y.coins === x.coins && y.items === x.items && y.stage === x.stage && y.adv; }), `all ${before.length} students keep XP, coins, items and stage`);

const cls = await g(() => window.__cc.getState().data.settings.currentClassId);
const kid = await g((c) => window.__cc.getState().data.students.filter((s) => s.classId === c).sort((a, b) => a.name.localeCompare(b.name))[0].id, cls);
const kidName = (await st(kid)).name;

// ---------- 2. the world map ----------
await go('#/adventure');
ok(await p.getByRole('heading', { name: 'World of Adventures' }).count() === 1, 'Adventure section opens from the top bar route');
ok(await p.locator('.adv-isle').count() === 6, 'the map shows six regions');
ok(await p.locator('.adv-isle.locked').count() >= 1, 'locked regions are shown with their requirement');
await shot(p, 'woa-map.png', true);

// ---------- 3. the teacher creates a quest ----------
await go('#/adventure/quests');
await p.getByRole('tab', { name: /Special/ }).click(); await wait(300);
await p.getByRole('button', { name: 'New quest' }).click(); await wait(600);
await p.getByPlaceholder('e.g. Read a page aloud').fill('Draw a map of the classroom');
await p.getByRole('button', { name: 'Save quest' }).click(); await wait(800);
const quest = await g(() => window.__cc.getState().data.quests.find((q) => q.title === 'Draw a map of the classroom'));
ok(!!quest && quest.kind === 'custom' && quest.approval === true, 'teacher created a special quest that needs approval');
await shot(p, 'woa-questbook.png', true);

// ---------- 4. the student hands it in from the locked kiosk ----------
await g(() => { const s = window.__cc.getState(); s.updateSettings({ pinHash: 'e2e-test-pin' }); s.setLocked(true); });
await go('#/present');
await p.getByRole('button', { name: 'Adventure' }).click(); await wait(1100);
ok(await p.getByText('Teacher controls are locked').count() > 0, 'kiosk: Adventure opens while controls are locked');
ok(await p.getByRole('tab', { name: 'Control Center' }).count() === 0, 'kiosk: no Control Center');
await p.getByRole('tab', { name: 'Quests' }).click(); await wait(800);
ok(await p.getByText('Who are you? Tap your creature.').count() === 1, 'kiosk: asks who is using it');
await p.getByRole('button', { name: kidName, exact: true }).first().click(); await wait(1000);
const card = p.locator('.paper', { hasText: 'Draw a map of the classroom' });
await card.getByRole('button', { name: 'I did it!' }).click(); await wait(800);
const rec = await g((id) => window.__cc.getState().data.questRecords.find((r) => r.questId === id), quest.id);
ok(rec?.status === 'submitted', 'kiosk: the hand-in waits for the teacher');
const refused = await g((rid) => window.__cc.getState().approveQuest(rid), rec.id);
const still = await g((rid) => window.__cc.getState().data.questRecords.find((r) => r.id === rid).status, rec.id);
ok(refused === false && still === 'submitted', 'kiosk: a student cannot approve (refused by the engine)');
const startRefused = await g((c) => window.__cc.getState().startBattle({ classId: c, bossId: 'grumblethorn', hp: 10, durationMs: 3600000, reward: { xp: 1, coins: 1 } }), cls);
ok(startRefused === false, 'kiosk: a student cannot start a boss battle');
await go('#/adventure/control');
ok(await p.getByText('Quick actions').count() === 0, 'kiosk: the Control Center route shows nothing teacher-only');
await shot(p, 'woa-kiosk.png', true);

// ---------- 5. the teacher approves; the reward is collected exactly once ----------
await g(() => window.__cc.getState().setLocked(false));
await go('#/adventure/quests');
await p.locator('.paper', { hasText: 'Draw a map of the classroom' }).filter({ has: p.getByRole('button', { name: 'Approve' }) }).getByRole('button', { name: 'Approve' }).first().click(); await wait(700);
ok(await g((rid) => window.__cc.getState().data.questRecords.find((r) => r.id === rid).status, rec.id) === 'approved', 'teacher approved the quest');
await quiet();
const c0 = (await st(kid)).coins;
await go(`#/adventure/quests?student=${kid}`);
await p.locator('.paper', { hasText: 'Draw a map of the classroom' }).getByRole('button', { name: 'Collect reward' }).click(); await wait(900);
const c1 = (await st(kid)).coins;
ok(c1 - c0 === quest.reward.coins, `collecting gives exactly the reward (+${c1 - c0} coins)`);
ok(await p.locator('.paper', { hasText: 'Draw a map of the classroom' }).getByRole('button', { name: 'Collect reward' }).count() === 0, 'the Collect button is gone once collected');
await g((rid) => { window.__cc.getState().collectQuest(rid); window.__cc.getState().collectQuest(rid); }, rec.id);
ok((await st(kid)).coins === c1, 'collecting again (twice) gives nothing more');

// ---------- 6. a cooperative boss battle ----------
await quiet();
await go(`#/adventure/boss?start=grumblethorn`);
await p.locator('input[type=number]').first().fill('30'); await wait(100);
await p.getByRole('button', { name: 'Start battle' }).last().click(); await wait(900);
const battle = await g((c) => window.__cc.getState().data.bosses.find((x) => x.classId === c && x.status === 'active'), cls);
ok(!!battle && battle.hp === 30, 'teacher started a battle with Grumblethorn (30 points)');
const classIds = await g((c) => window.__cc.getState().data.students.filter((s) => s.classId === c).map((s) => s.id), cls);
const coinsBefore = await g((ids) => ids.map((id) => window.__cc.getState().data.students.find((s) => s.id === id).coins), classIds);
for (let i = 0; i < 4; i++) await g((ids) => window.__cc.getState().award(ids.slice(0, 2), 'cat-behaviour'), classIds);
await wait(500);
const won = await g((id) => window.__cc.getState().data.bosses.find((x) => x.id === id), battle.id);
ok(won.status === 'won', 'approved activity befriended the boss');
ok(await g(() => window.__cc.getState().celebrations.some((c) => c.type === 'bossWon')), 'the befriend celebration is queued');
await shot(p, 'woa-boss-friend.png');
const coinsAfter = await g((ids) => ids.map((id) => window.__cc.getState().data.students.find((s) => s.id === id).coins), classIds);
const extra = coinsAfter.map((c, i) => c - coinsBefore[i]);
ok(extra.slice(2).every((x) => x === won.reward.coins), `every student got the boss reward once (+${won.reward.coins})`);
await quiet();

// ---------- 7. explore, then open a treasure chest ----------
await go(`#/adventure/region/verdant?student=${kid}`);
await p.getByRole('button', { name: /^Explore Verdant Valley/ }).click(); await wait(800);
ok((await st(kid)).adventure.visited.some((v) => v.regionId === 'verdant'), 'the student explored Verdant Valley');
await quiet();
await go(`#/adventure/treasure?student=${kid}`);
await p.locator('.paper', { hasText: 'Glowing Acorn' }).getByRole('button', { name: 'Open' }).click(); await wait(500);
await p.getByRole('button', { name: /Open it/ }).click(); await wait(1500);
ok((await st(kid)).adventure.treasures.some((t) => t.id === 'verdant-relic'), 'the relic chest opened');
await shot(p, 'woa-chest.png');
await p.getByRole('button', { name: 'Close' }).last().click(); await wait(400);
const again = await g((id) => window.__cc.getState().openTreasure(id, 'verdant-relic'), kid);
ok(again === false, 'the same chest cannot be opened twice');

// ---------- 8. the journal ----------
await go(`#/adventure/journal?student=${kid}`);
for (const t of ['Reward collected: Draw a map of the classroom', 'Explored Verdant Valley', 'Found Glowing Acorn', 'became the class\'s friend']) {
  ok(await p.getByText(t, { exact: false }).count() > 0, `journal shows "${t}"`);
}
await p.getByRole('tab', { name: 'Treasure', exact: true }).click(); await wait(400);
ok(await p.getByText('Explored Verdant Valley').count() === 0 && await p.getByText('Found Glowing Acorn').count() > 0, 'journal filters by kind');
await shot(p, 'woa-journal.png', true);

// ---------- 9. control center ----------
await go('#/adventure/control');
ok(await p.getByText('Quick actions').count() === 1, 'teacher sees the Control Center');
await p.getByRole('radio', { name: 'Open' }).first().click(); await wait(500);
ok(await g((c) => window.__cc.getState().data.classes.find((x) => x.id === c).adventure.regions.crystal === 'open', cls), 'teacher opened Crystal Caverns early');
await shot(p, 'woa-control.png', true);

// ---------- 10. everything survives a restart ----------
await p.close();
p = await ctx.newPage(); watch(p);
await p.goto(`${U}#/adventure`); await p.waitForTimeout(1600);
const r = await g(({ rid, bid, kid }) => { const d = window.__cc.getState().data; return { rec: d.questRecords.find((x) => x.id === rid)?.status, boss: d.bosses.find((x) => x.id === bid)?.status, chest: d.students.find((s) => s.id === kid).adventure.treasures.length, ledger: Object.keys(d.rewardLedger).length }; }, { rid: rec.id, bid: battle.id, kid });
ok(r.rec === 'collected' && r.boss === 'won' && r.chest >= 1 && r.ledger >= 2, 'quest, boss, treasure and the reward ledger survive a restart');

// ---------- 11. phone width ----------
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
watch(m);
await m.goto(U); await m.waitForTimeout(1300);
for (const [path, name] of [['#/adventure', 'woa-m-map'], [`#/adventure/quests?student=${kid}`, 'woa-m-quests'], ['#/adventure/boss', 'woa-m-boss'], [`#/adventure/treasure?student=${kid}`, 'woa-m-treasure'], ['#/adventure/world', 'woa-m-world'], ['#/adventure/control', 'woa-m-control']]) {
  await m.evaluate((h) => { location.hash = h; }, path); await m.waitForTimeout(1200);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `${name}: no horizontal page scroll at 390px (${over}px)`);
  await shot(m, `${name}.png`, true);
}
ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);
} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
