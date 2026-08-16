// Backward-compatibility gate for the .lok container.
//
// Adding vector strokes must not change anything about how existing files are
// written or read. This drives the REAL encodeLok/decodeLok in a browser (they
// need canvas, Blob and CompressionStream, so they can't run in bare node) and
// asserts:
//   - a file written without strokes is byte-shaped exactly as before,
//   - adding strokes does NOT bump manifest.version (the shipped reader
//     hard-throws on anything but 1, so a bump would break old builds),
//   - the three original ZIP entries are still present and findable by a
//     reader that knows nothing about strokes,
//   - stroke geometry survives the container round-trip.
//
// Run with `npm run verify:lok`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4174;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/lok-harness.html`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

await page.goto(`http://localhost:${PORT}/lok-harness.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__lok?.done, null, { timeout: 45000 })
  .catch(() => console.log('(harness did not finish)'));

const res = await page.evaluate(() => window.__lok);
const text = await page.evaluate(() => document.getElementById('out').textContent);
console.log(text.trim());
if (errors.length) console.error('pageerrors:\n  ' + errors.join('\n  '));

const pass = res && res.done && res.problems.length === 0 && errors.length === 0;
console.log(pass ? 'LOK OK — strokes are additive; legacy readers keep working.' : 'LOK FAILED');
await browser.close();
stop();
process.exit(pass ? 0 : 1);
