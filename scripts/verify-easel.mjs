// Drives the REAL Easel with synthetic pointer events and asserts vector
// stroke capture works end to end: pointer input -> captured points -> codec.
//
// Exists because `npm run build` passing tells you nothing about whether a
// feature functions — the entire World outage this session hid behind a green
// build and a green smoke test. Capture is additive, so this also asserts
// composite() still renders, i.e. that recording strokes did not disturb the
// raster path Studio actually ships.
//
// Run with `npm run verify:easel`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4175;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/easel-harness.html`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

await page.goto(`http://localhost:${PORT}/easel-harness.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__e?.done, null, { timeout: 45000 })
  .catch(() => console.log('(harness did not finish)'));

const res = await page.evaluate(() => window.__e);
console.log((await page.evaluate(() => document.getElementById('out').textContent)).trim());
if (errors.length) console.error('pageerrors:\n  ' + errors.join('\n  '));

const pass = res && res.done && res.problems.length === 0 && errors.length === 0;
console.log(pass ? 'EASEL OK — strokes captured from real pointer input, raster path intact.' : 'EASEL FAILED');
await browser.close();
stop();
process.exit(pass ? 0 : 1);
