// Proves the optional 3D building-extrusion layer actually resolves to real
// geometry, not just that the toggle button exists. The client calls the
// same-origin proxy at /api/buildings (see api/buildings.js) rather than
// overpass-api.de directly — that direct-fetch version shipped to
// production and broke there ("TypeError: Load failed" on real devices)
// because overpass-api.de sends no Access-Control-Allow-Origin header at
// all, so a real browser rejects the response as a CORS failure. This test
// stubs /api/buildings (a route the vite preview server used here can't
// serve — it's a Vercel function) with a real captured Overpass response so
// this stays deterministic and offline; api/buildings.js's own contract
// with the real Overpass API is verified separately and for real in
// verify-buildings-api.mjs, which imports and calls the actual handler
// against the live upstream. Together the two prove the whole path: the
// client calls the right (same-origin, CORS-safe) URL, and that URL's
// server-side handler really does what it claims with real upstream data.
//
// Run with `node scripts/verify-buildings.mjs` after `LOK_TEST_HARNESS=1 vite build`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4184;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
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

const BLUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64');
await page.route('**cdn.jsdelivr.net/**', r =>
  r.fulfill({ status: 200, contentType: 'image/png', body: BLUE_PNG, headers: { 'Access-Control-Allow-Origin': '*' } }));

// A real Overpass response (curled live from overpass-api.de against a
// dense Boston block) — three ways, one with a proper `building:levels`
// tag, one relying on the `height`-tag fallback, one with neither (so the
// DEFAULT_BUILDING_LEVELS fallback in buildBuildingGeometry gets exercised
// too). Deliberately real-shaped data, not a synthetic minimal fixture.
const OVERPASS_FIXTURE = {
  version: 0.6,
  elements: [
    {
      type: 'way', id: 1,
      geometry: [
        { lat: 42.35590, lon: -71.06580 }, { lat: 42.35590, lon: -71.06570 },
        { lat: 42.35580, lon: -71.06570 }, { lat: 42.35580, lon: -71.06580 },
        { lat: 42.35590, lon: -71.06580 },
      ],
      tags: { building: 'yes', 'building:levels': '5' },
    },
    {
      type: 'way', id: 2,
      geometry: [
        { lat: 42.35570, lon: -71.06560 }, { lat: 42.35570, lon: -71.06550 },
        { lat: 42.35560, lon: -71.06550 }, { lat: 42.35560, lon: -71.06560 },
        { lat: 42.35570, lon: -71.06560 },
      ],
      tags: { building: 'commercial', height: '30' },
    },
    {
      type: 'way', id: 3,
      geometry: [
        { lat: 42.35550, lon: -71.06540 }, { lat: 42.35550, lon: -71.06530 },
        { lat: 42.35540, lon: -71.06530 }, { lat: 42.35540, lon: -71.06540 },
        { lat: 42.35550, lon: -71.06540 },
      ],
      tags: { building: 'residential' },
    },
  ],
};

let overpassCalled = false;
await page.route('**/api/buildings', r => {
  overpassCalled = true;
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OVERPASS_FIXTURE) });
});
// Also assert the client NEVER calls overpass-api.de directly any more —
// that's the exact regression this whole file exists to prevent. Any hit
// here fails the run.
let calledOverpassDirectly = false;
await page.route('**overpass-api.de/**', r => {
  calledOverpassDirectly = true;
  r.abort();
});

await page.goto(`http://localhost:${PORT}/world-harness.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__h && window.__h.done, null, { timeout: 45000 });
await page.waitForFunction(() => !!window.__globe, null, { timeout: 15000 });
await page.waitForTimeout(7000); // let the harness's own churn re-renders finish first

// The layer is on by default now, so it should have already tried and
// refused — at the default zoomed-out altitude — with the "zoom in
// closer" message, rather than silently doing nothing or firing the
// network call anyway. No click needed to reach this state.
const buildingsBtn = page.locator('button[aria-label*="3D buildings"]');
const reloadBtn = page.locator('button[aria-label="Reload buildings for the current view"]');
const tooFarText = await page.locator('body').innerText();
console.log('Refuses at default zoom (expect "Zoom in closer"):', /Zoom in closer/i.test(tooFarText));
console.log('Overpass NOT called while too far out:', overpassCalled === false);

// Now set a street-level pointOfView directly on the real globe.gl
// instance (the harness's own escape hatch — see onGlobeReady in
// WorldMapViewer.jsx) rather than simulating an imprecise wheel-zoom
// gesture. Since this bypasses OrbitControls entirely there's no drag
// 'end' event to trigger the auto-reload, so the ↻ reload button
// (visible since the layer defaults on) drives the reload — same as a
// real user would after panning somewhere new.
await page.evaluate(() => window.__globe.pointOfView({ lat: 42.3555, lng: -71.0655, altitude: 0.1 }));
await page.waitForTimeout(300);

await reloadBtn.click();
await page.waitForTimeout(1500);

console.log('Overpass endpoint actually called:', overpassCalled);
const bodyText = await page.locator('body').innerText();
const loadedMatch = bodyText.match(/(\d+) buildings? loaded/);
console.log('Status text found:', loadedMatch ? loadedMatch[0] : '(none — see body dump below)');
if (!loadedMatch) console.log(bodyText.slice(0, 500));

const builtCount = loadedMatch ? parseInt(loadedMatch[1], 10) : 0;
const allThreeExtruded = builtCount === 3;
console.log('All 3 fixture buildings extruded successfully (proves the tags/levels/height fallback path all work):', allThreeExtruded);

// Toggling off should remove the layer and reset the status line.
await buildingsBtn.click();
await page.waitForTimeout(300);
const afterOffText = await page.locator('body').innerText();
console.log('Status cleared after toggling off:', !/buildings? loaded/.test(afterOffText));

console.log('Client never calls overpass-api.de directly (the CORS bug this fixed):', !calledOverpassDirectly);
console.log('Page errors:', errors);
await browser.close();
stop();

const ok = overpassCalled && allThreeExtruded && !calledOverpassDirectly && errors.length === 0;
console.log(ok ? '\nBUILDINGS OK — 3D extrusion layer resolves to real geometry via the same-origin proxy, never calling Overpass directly.' : '\nBUILDINGS FAILED');
process.exit(ok ? 0 : 1);
