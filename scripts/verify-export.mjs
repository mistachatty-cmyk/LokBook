// Proves a .lok exported from the REAL app actually contains vector strokes.
//
// verify:strokes proves the codec round-trips. verify:lok proves the container
// stays backward-compatible. verify:easel proves Easel captures points. All
// three passed for days while the feature was completely inert: nothing called
// getStrokes(), and exportLok never passed meta.strokes, so every .lok a user
// could produce was stroke-less. That is docs/AUDIT.md Finding 2 in miniature —
// a shipped thing that resolves to nothing — and no unit-level gate can see it,
// because each piece works perfectly in isolation.
//
// So this one drives the whole path: open the app, draw with real pointer
// events, capture two pages, click the .lok button, take the actual downloaded
// file off disk, and read the bytes. The ZIP entries are STOREd, so node can
// parse the container directly and hand strokes.lokvec to the real decoder.
//
// Asserts:
//   1. the download happens at all,
//   2. manifest.json advertises strokeFormat/strokeCount,
//   3. a strokes.lokvec entry is present,
//   4. it decodes to strokes whose points sit inside the canvas,
//   5. exporting a SECOND time still yields strokes (getStrokes, not
//      takeStrokes — draining the log would empty the second file).
//
// Run with `npm run verify:export`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { decodeStrokes } from '../src/engine/strokeCodec.js';

const PORT = 4178;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

/** Minimal reader for the STOREd ZIP that zipWrite() produces. */
function readZip(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const files = {};
  let i = 0;
  while (i + 4 <= buf.length && dv.getUint32(i, true) === 0x04034b50) {
    const method = dv.getUint16(i + 8, true);
    const size = dv.getUint32(i + 18, true);
    const nameLen = dv.getUint16(i + 26, true);
    const extraLen = dv.getUint16(i + 28, true);
    const name = new TextDecoder().decode(buf.subarray(i + 30, i + 30 + nameLen));
    const start = i + 30 + nameLen + extraLen;
    if (method !== 0) throw new Error(`entry "${name}" is not STOREd (method ${method})`);
    files[name] = buf.subarray(start, start + size);
    i = start + size;
  }
  return files;
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const problems = [];
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
await page.waitForTimeout(1200);
try { await page.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
await page.waitForTimeout(600);

try { await page.locator('button[aria-label="Go to Studio"]').first().click({ timeout: 8000 }); }
catch (e) { problems.push('could not reach Studio: ' + e.message); }
await page.waitForTimeout(1500);

// Draw with real pointer events, exactly as verify:easel does — dispatching on
// the surface but measuring against wrapRef, which is what Easel's pos() uses.
const drew = await page.evaluate(() => {
  const surface = document.querySelector('[aria-label="Drawing canvas"]');
  if (!surface) return 'drawing surface not found';
  const wrap = surface.closest('.rounded-2xl');
  if (!wrap) return 'wrapRef element not found';
  const rr = wrap.getBoundingClientRect();
  // pointerId stays 1 for every stroke: synthetic PointerEvents don't register
  // a real active pointer, and setPointerCapture throws NotFoundError for any
  // id the browser hasn't seen — which aborts the handler mid-stroke.
  const pe = (type, x, y) => surface.dispatchEvent(new PointerEvent(type, {
    pointerId: 1, pointerType: 'pen', isPrimary: true, bubbles: true, cancelable: true,
    clientX: rr.left + x, clientY: rr.top + y, pressure: 0.6, buttons: type === 'pointerup' ? 0 : 1,
  }));
  for (let s = 0; s < 3; s++) {
    const y0 = 60 + s * 40;
    pe('pointerdown', 30, y0);
    for (let k = 1; k <= 40; k++) pe('pointermove', 30 + k * 4, y0 + Math.sin(k / 5) * 15);
    pe('pointerup', 30 + 40 * 4, y0);
  }
  return null;
});
if (drew) problems.push(drew);
await page.waitForTimeout(400);

// Two captures — .lok export requires 2+ pages.
for (let n = 0; n < 2; n++) {
  try { await page.locator('button[aria-label^="Capture page"]').first().click({ timeout: 6000 }); }
  catch (e) { problems.push(`capture ${n + 1} failed: ` + e.message); }
  await page.waitForTimeout(700);
}

const exportBtn = page.locator('button[aria-label^="Export as .lok"]');
async function exportOnce(label) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    exportBtn.first().click({ timeout: 8000 }),
  ]);
  const path = await download.path();
  const buf = new Uint8Array(await readFile(path));
  const files = readZip(buf);
  const names = Object.keys(files);
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json'] || new Uint8Array()));
  console.log(`[${label}] ${buf.length}B · entries: ${names.join(', ')} · strokeFormat=${manifest.strokeFormat} strokeCount=${manifest.strokeCount}`);
  return { files, manifest, names };
}

let first;
try { first = await exportOnce('export 1'); }
catch (e) { problems.push('first .lok export failed: ' + e.message); }

if (first) {
  const { files, manifest, names } = first;
  for (const need of ['manifest.json', 'preview.png', 'data.lokflip']) {
    if (!names.includes(need)) problems.push(`missing original entry ${need}`);
  }
  if (manifest.version !== 1) problems.push('manifest.version drifted to ' + manifest.version);
  if (!names.includes('strokes.lokvec')) {
    problems.push('no strokes.lokvec entry — the app exported a stroke-less .lok, so stroke capture is still inert');
  } else {
    if (manifest.strokeFormat !== 'lokvec1') problems.push('strokeFormat not advertised: ' + manifest.strokeFormat);
    if (!(manifest.strokeCount > 0)) problems.push('strokeCount is ' + manifest.strokeCount);
    try {
      const { width, height, strokes } = decodeStrokes(files['strokes.lokvec']);
      const pts = strokes.reduce((n, s) => n + s.points.length, 0);
      console.log(`  decoded ${strokes.length} strokes / ${pts} points on a ${width}x${height} canvas`);
      if (strokes.length < 3) problems.push(`drew 3 strokes, decoded ${strokes.length}`);
      if (pts < 100) problems.push(`only ${pts} points decoded — capture looks truncated`);
      // Points must land on the canvas. A quantisation or origin bug shows up
      // here as coordinates parked at an edge or far outside the frame.
      const bad = strokes.flatMap(s => s.points).filter(p =>
        !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
        p.x < -width || p.x > width * 2 || p.y < -height || p.y > height * 2);
      if (bad.length) problems.push(`${bad.length} decoded points are off-canvas/NaN, e.g. (${bad[0].x},${bad[0].y})`);
      const spread = Math.max(...strokes[0].points.map(p => p.x)) - Math.min(...strokes[0].points.map(p => p.x));
      if (spread < 50) problems.push(`stroke 0 spans only ${spread.toFixed(1)}px — geometry collapsed`);
    } catch (e) { problems.push('strokes.lokvec failed to decode: ' + e.message); }
  }
}

// Second export must still carry strokes. If exportLok ever switches to
// takeStrokes(), this is the assertion that catches it.
try {
  const second = await exportOnce('export 2');
  if (!second.names.includes('strokes.lokvec')) {
    problems.push('second export lost its strokes — exportLok is draining the log (takeStrokes) instead of reading it (getStrokes)');
  }
} catch (e) { problems.push('second .lok export failed: ' + e.message); }

if (errors.length) console.error('pageerrors:\n  ' + errors.join('\n  '));
if (problems.length) console.error('PROBLEMS:\n  ' + problems.join('\n  '));
const pass = problems.length === 0 && errors.length === 0;
console.log(pass ? 'EXPORT OK — a .lok from the real app carries decodable vector strokes.' : 'EXPORT FAILED');
await browser.close();
stop();
process.exit(pass ? 0 : 1);
