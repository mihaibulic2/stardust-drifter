// Headless smoke test: loads the REAL built game in Chromium (WebGL via
// swiftshader), drives it like a player, and fails on any console/page error.
//
// NOTE: headless Chromium throttles requestAnimationFrame hard (~4fps), so we
// gate every action on the in-page frame counter (window.__stardust.frames)
// instead of wall-clock waits. At 60fps in a real browser this all happens
// instantly.
//
// Usage: start a server first (npm run preview -- --port 4173), then:
//   node scripts/smoke.mjs
import { chromium } from 'playwright';

const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const errors = [];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => m.type() === 'error' && errors.push('console.error: ' + m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__stardust, null, { timeout: 10000 });

const snap = () => page.evaluate(() => {
  const s = window.__stardust.state;
  return { phase: s.phase, score: s.score, lives: s.lives, enemies: s.enemies.length, sector: s.sectorIndex, ult: s.ultimate, ammo: s.missileAmmo };
});
const frames = () => page.evaluate(() => window.__stardust.frames);
async function waitFrames(n) {
  const start = await frames();
  await page.waitForFunction((a) => window.__stardust.frames >= a.start + a.n, { start, n }, { timeout: 20000, polling: 25 });
}
async function tap(key) {
  await page.keyboard.press(key);
  await waitFrames(3);
}
const fail = (msg) => {
  console.log('FAILED:', msg);
  process.exitCode = 1;
};

console.log('boot phase:', (await snap()).phase);

// start + advance through the intro dialogue until we're playing
await tap('Enter');
for (let i = 0; i < 10 && (await snap()).phase !== 'playing'; i++) await tap('Enter');
let st = await snap();
console.log('reached:', st);
if (st.phase !== 'playing') fail('did not reach playing phase: ' + st.phase);

// let some enemies spawn
await waitFrames(20);
console.log('after spawn wait:', await snap());

// aim up the screen (toward the far edge where enemies enter) and fire + advance
await page.mouse.move(640, 110);
await page.keyboard.down('Space');
await page.keyboard.down('KeyW');
await waitFrames(50);
await page.mouse.click(640, 200, { button: 'right' }); // missile
await waitFrames(10);
await page.keyboard.press('KeyE'); // ultimate (fires if charged)
await waitFrames(20);
await page.keyboard.up('KeyW');
await page.keyboard.up('Space');
const mid = await snap();
console.log('after combat:', mid);
if (mid.score <= 0) fail('expected some score from combat, got ' + mid.score);
if (mid.ammo >= 5) fail('expected a missile to have been fired (ammo < 5), got ' + mid.ammo);

// pause / resume
await tap('KeyP');
const paused = (await snap()).phase;
await tap('KeyP');
const resumed = (await snap()).phase;
console.log('pause->', paused, ' resume->', resumed);
if (paused !== 'paused') fail('pause did not engage');
if (resumed !== 'playing') fail('resume did not return to playing');

await page.screenshot({ path: '/tmp/stardust-smoke.png' });
console.log('screenshot -> /tmp/stardust-smoke.png');

await browser.close();

console.log('\n=== RESULT ===');
if (errors.length) {
  console.log('FAILED with', errors.length, 'runtime error(s):');
  for (const e of errors.slice(0, 20)) console.log(' -', e);
  process.exit(1);
}
if (process.exitCode === 1) {
  console.log('FAILED one or more gameplay assertions (see above).');
  process.exit(1);
}
console.log('PASS: booted, played through intro, fought (scored + fired missile), paused/resumed — zero runtime errors.');
