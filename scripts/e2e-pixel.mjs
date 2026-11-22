#!/usr/bin/env node
/**
 * End-to-end checks for Pixel mode (1.5.1) in a real browser against the dev server: switching it on from
 * the top bar, creatures becoming pixel sprites that breathe and blink, pixel backgrounds and type, element
 * auras and attacks, the Pixel Pals (native pixel species with their own animations), the setting surviving
 * a restart, switching back, and phone width.
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
ok(await p.locator('main .pc:not([data-pal])').count() === 0, 'creatures are painted while Pixel mode is off (only Pixel Pals are pixel art)');

// ---------- 2. switch it on from the top bar ----------
await p.getByRole('button', { name: 'Pixel mode' }).click(); await wait(2500);
ok(await p.evaluate(() => document.documentElement.classList.contains('pixel-mode')), 'the top bar switch turns Pixel mode on');
// every creature is really on screen: a box of real size with the creature drawn in it (not just a canvas)
const visible = () => p.evaluate(() => [...document.querySelectorAll('main .pc canvas.pc-frame')].map((c) => {
  const r = c.getBoundingClientRect(); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 128) n++;
  return { w: c.width, h: c.height, shown: r.width > 20 && r.height > 20, drawn: n };
}));
const sprites = await visible();
ok(sprites.length >= 16 && sprites.every((x) => x.w === 64 && x.h === 66), `every creature card shows a 64 × 66 pixel sprite (${sprites.length} sprites)`);
ok(sprites.every((x) => x.shown && x.drawn > 80), `every sprite is on screen and drawn (${sprites.filter((x) => x.shown && x.drawn > 80).length}/${sprites.length})`);
// the sprites move: sample one painted creature's canvas over two seconds and count the distinct frames it shows
const frames = await p.evaluate(async () => {
  const c = [...document.querySelectorAll('main .pc canvas.pc-frame')].find((x) => x.width === 64);
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const d = c.getContext('2d').getImageData(0, 0, 64, 66).data;
    let h = 0; for (let j = 0; j < d.length; j += 7) h = (h * 31 + d[j]) >>> 0;
    seen.add(h); await new Promise((r) => setTimeout(r, 55));
  }
  return seen.size;
});
ok(frames >= 2, `the sprites breathe and blink (${frames} distinct frames in 2 s)`);
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

// ---------- 5. the Pixel Pals: native pixel species with their own animations ----------
await go('#/pixel-lab', 2400);
ok(await p.locator('.paper', { hasText: 'Blazard' }).count() === 1 && await p.locator('.paper', { hasText: 'Cumulamb' }).count() === 1, 'the Pixel Lab shows the Pixel Pals');
const pal = await p.evaluate(() => {
  const st = window.__cc.getState();
  const kid = st.data.students[0];
  st.assignSpecies(kid.id, 'blazard');
  return kid.id;
});
await go(`#/creature/${pal}`, 2600);
const palFrames = await p.evaluate(async () => {
  const c = document.querySelector('main .pc[data-pal] canvas.pc-frame');
  if (!c) return 0;
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 0; for (let j = 0; j < d.length; j += 5) h = (h * 31 + d[j]) >>> 0;
    seen.add(h); await new Promise((r) => setTimeout(r, 60));
  }
  return seen.size;
});
ok(palFrames >= 4, `a Pixel Pal plays its idle animation on its profile (${palFrames} distinct frames in 1.8 s)`);
// the top of Blazard's head end (it faces right; its tail flame on the left reaches higher than its head),
// lowest over a second of breathing, so a one-pixel bob is not mistaken for a hat
const spriteTop = () => p.evaluate(async () => {
  let best = 0;
  for (let i = 0; i < 10; i++) {
    const c = document.querySelector('main .pc[data-pal] canvas.pc-frame');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let top = c.height;
    for (let k = 3; k < d.length; k += 4) if (d[k] > 0 && (k >> 2) % c.width >= 34) { top = Math.floor((k >> 2) / c.width); break; }
    best = Math.max(best, top); await new Promise((r) => setTimeout(r, 100));
  }
  return best;
});
const bare = await spriteTop();
await p.evaluate((id) => { const st = window.__cc.getState(); st.updateStudent(id, { equipped: { ...st.data.students.find((x) => x.id === id).equipped, hat: 'hat-wizard' } }); }, pal);
await wait(1500);
const hatted = await spriteTop();
ok(hatted <= bare - 4, `its hat is drawn on the sprite, on top of its head (top row ${bare} → ${hatted})`);
await shot(p, 'pixel-pal-profile.png');
const dex = await p.evaluate(async () => { location.hash = '#/creatures'; await new Promise((r) => setTimeout(r, 1800)); return document.querySelectorAll('main .pc canvas.pc-frame').length; });
ok(dex >= 10, `the field guide lists the Pixel Pals (${dex} pixel sprites)`);

// ---------- 5b. a computer that draws the painting late (as some Macs do) ----------
{
  // the first two draws of every creature come out empty: the sprites must still appear
  const late = await ctx.newPage(); watch(late);
  await late.addInitScript(() => { globalThis.__ccPixelFault = 2; });
  await late.goto(U); await late.waitForTimeout(6000);
  const r = await late.evaluate(() => [...document.querySelectorAll('main .pc canvas.pc-frame')].map((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 128) n++; return n; }));
  ok(r.length >= 16 && r.every((n) => n > 80), `when the first draws come out empty, every creature is still drawn (${r.filter((n) => n > 80).length}/${r.length})`);
  await late.close();
  // never drawn at all: the painted creature stands in, nothing is left empty
  const never = await ctx.newPage(); watch(never);
  await never.addInitScript(() => { globalThis.__ccPixelFault = 99; });
  await never.goto(U); await never.waitForTimeout(6000);
  const r2 = await never.evaluate(() => {
    const st = window.__cc.getState();
    const kids = st.data.students.filter((s) => s.classId === st.data.settings.currentClassId);
    const pals = new Set(['blazard', 'otterpop', 'mossling', 'boltbat', 'icicub', 'rumbadillo', 'wispurr', 'solcub', 'nebuloop', 'cumulamb']);
    const paintedKids = kids.filter((s) => !pals.has(s.speciesId)).length;
    const painted = [...document.querySelectorAll('main svg image')].filter((i) => (i.getAttribute('href') ?? '').includes('/creatures/')).length;
    const emptyBoxes = [...document.querySelectorAll('main .pc:not([data-pal])')].length;
    return { paintedKids, painted, emptyBoxes };
  });
  ok(r2.emptyBoxes === 0 && r2.painted >= r2.paintedKids, `when a sprite cannot be made, the painted creature is shown instead (${r2.painted} painted for ${r2.paintedKids}, ${r2.emptyBoxes} empty)`);
  await never.close();
}

// ---------- 6. the setting survives a restart ----------
await p.close();
p = await ctx.newPage(); watch(p);
await p.goto(U); await p.waitForTimeout(2200);
ok(await p.evaluate(() => document.documentElement.classList.contains('pixel-mode') && window.__cc.getState().data.settings.pixelMode === true), 'Pixel mode stays on after a restart');

// ---------- 7. phone width ----------
const m = await ctx.newPage(); watch(m);
await m.setViewportSize({ width: 390, height: 844 });
for (const [hash, name] of [['#/', 'pixel-m-classroom'], ['#/adventure', 'pixel-m-map'], [`#/creature/${fire}`, 'pixel-m-profile']]) {
  await m.goto(U + hash); await m.waitForTimeout(1800);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `${name}: no horizontal page scroll at 390px (${over}px)`);
  await shot(m, `${name}.png`, true);
}
await m.close();

// ---------- 8. switch back ----------
await p.getByRole('button', { name: 'Pixel mode' }).click(); await p.waitForTimeout(1500);
ok(!(await p.evaluate(() => document.documentElement.classList.contains('pixel-mode'))) && await p.locator('main .pc:not([data-pal])').count() === 0, 'switching back restores the painted look');
ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);
} catch (e) {
  console.error(e); fails++;
} finally {
  await b.close();
  stop();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
