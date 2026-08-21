// The wiring gate for Lok Studio Pro.
//
// verify:brushspec proves the DATA resolves. This proves the FEATURE is
// connected: it clicks the real ✦ button on the real Easel, flips the real
// engine switch, draws with real PointerEvents, and reads the resulting pixels.
//
// That distinction is the whole lesson of docs/AUDIT.md and of the stroke-less
// .lok bug: verify:strokes, verify:lok and verify:easel were all green while
// vector capture was completely inert, because every unit-level gate tested a
// piece and none started from the button a person actually presses.
//
// Run with `npm run verify:brushengine`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4191;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/pro-harness.html`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 700, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

await page.goto(`http://localhost:${PORT}/pro-harness.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__p && window.__p.done, null, { timeout: 60000 });

const res = await page.evaluate(() => ({ problems: window.__p.problems, info: window.__p.info }));
console.log(await page.evaluate(() => document.getElementById('out').textContent));

await browser.close();
stop();

if (errors.length) console.log('Page errors:', errors);
const ok = res.problems.length === 0 && errors.length === 0;
console.log(ok
  ? '\nBRUSH ENGINE OK — Pro reaches the canvas from the real button, spacing drives the walk, every tip draws, and locked users cannot paint with it.'
  : `\nBRUSH ENGINE FAILED\n  ${[...res.problems, ...errors].join('\n  ')}`);
process.exit(ok ? 0 : 1);
