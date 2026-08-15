// End-to-end check of the REAL WorldMapViewer against a production build.
//
// This exists because `npm run build` and `npm run smoke` both passed happily
// while World was 100% broken on every device: the build only type-checks
// nothing and the smoke test renders the app shell, never opening World. Two
// runtime-only faults hid behind that gap —
//   1. `.autoRotate()` is not a globe.gl method (it lives on controls()), so
//      init threw TypeError on every single open, forever;
//   2. a duplicate `three` install had globe.gl's renderer calling
//      `matrixWorld.determinantAffine()` on meshes built by an older three.
// Neither is catchable without actually rendering the thing, so: render it.
//
// Run with `npm run verify:world`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4173;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', detached: false,
});
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
// Wait for the preview server to answer.
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/world-harness.html`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 414, height: 896 } });
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

// The earth texture comes from jsdelivr. Locally it's CORS-blocked (the URL is
// protocol-relative and we're on http), which would leave an untextured black
// sphere and make this test unable to tell "renders" from "doesn't". Stub it
// with a solid colour so the assertion is about our render pipeline, not the CDN.
const BLUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64');
await page.route('**cdn.jsdelivr.net/**', r =>
  r.fulfill({ status: 200, contentType: 'image/png', body: BLUE_PNG,
              headers: { 'Access-Control-Allow-Origin': '*' } }));

await page.goto('http://localhost:4173/world-harness.html', { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__h && window.__h.done, null, { timeout: 45000 })
  .catch(() => console.log('(harness did not signal done)'));

const h = await page.evaluate(() => window.__h);
const dom = await page.evaluate(() => ({
  canvas: document.querySelectorAll('canvas').length,
  text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300),
}));

// Give the textures a moment, then sample what's actually on screen.
// NOTE: do NOT drawImage() the WebGL canvas and read it back — the drawing
// buffer is not preserved after presentation, so that returns solid black even
// while the globe renders perfectly. Sample the composited screenshot instead.
await page.waitForTimeout(3000);
const shot = (await page.screenshot({ type: 'png' })).toString('base64');
const pixels = await page.evaluate(async (b64) => {
  const img = new Image();
  await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + b64; });
  const tmp = document.createElement('canvas');
  tmp.width = img.width; tmp.height = img.height;
  const c2 = tmp.getContext('2d');
  c2.drawImage(img, 0, 0);
  const d = c2.getImageData(0, 0, tmp.width, tmp.height).data;
  const seen = new Set(); let lit = 0;
  for (let i = 0; i < d.length; i += 4 * 97) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    seen.add(`${r >> 4},${g >> 4},${b >> 4}`);
    if (r + g + b > 60) lit++;
  }
  return { distinctColours: seen.size, litSamples: lit, size: `${tmp.width}x${tmp.height}` };
}, shot);

// Re-render churn test: hand the component fresh prop identities repeatedly and
// confirm the globe is NOT rebuilt. A rebuild creates a new <canvas>, so more
// than one canvas ever existing means the init effect is firing on prop
// identity — the endless "loading" cycle users saw.
await page.waitForTimeout(7000);
const churn = await page.evaluate(() => ({
  canvasesEverCreated: window.__h?.canvasesSeen?.size ?? -1,
  rendersDriven: window.__h?.renderCount?.() ?? -1,
  canvasesNow: document.querySelectorAll('canvas').length,
  stillReady: !/Loading globe|Timed out|Error/i.test(document.body.innerText),
}));
console.log('churn  :', JSON.stringify(churn));
const stable = churn.canvasesEverCreated === 1 && churn.stillReady;

const drew = pixels && pixels.distinctColours > 3 && pixels.litSamples > 20;
console.log('=== REAL COMPONENT RESULT ===');
console.log('status :', h?.status);
console.log('error  :', h?.error ?? 'none');
console.log('canvases:', dom.canvas);
console.log('pixels :', JSON.stringify(pixels));
console.log('visible text:', dom.text);
console.log('pageerrors:', errors.length ? errors.join('\n') : 'none');
const pass = h?.status === 'ready' && dom.canvas > 0 && drew && stable;
if (!stable) console.error('FAIL: globe rebuilt on prop-identity change (loading loop)');
console.log(pass ? '\nPASS ✅ globe renders and stays stable across re-renders' : '\nFAIL ❌');
await page.screenshot({ path: '/tmp/world-verified.png' });
await browser.close();
stop();
process.exit(pass ? 0 : 1);
