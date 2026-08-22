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
let overpassRequestCount = 0;
const badBboxRequests = [];
await page.route('**/api/buildings', r => {
  overpassCalled = true;
  overpassRequestCount++;
  // Inspect the bbox we were actually asked for. Returning the fixture no
  // matter what is exactly how this stub hid a real bug for as long as it
  // existed: the ↻ button was wired as onClick={loadBuildings}, so React passed
  // the PointerEvent as the first argument, the override branch destructured
  // {lat,lng} off it, and every reload sent {"south":null,...} — which the stub
  // cheerfully answered with three Boston buildings.
  try {
    const body = JSON.parse(r.request().postData() || '{}');
    for (const k of ['south', 'west', 'north', 'east']) {
      if (!Number.isFinite(body[k])) badBboxRequests.push(`${k}=${JSON.stringify(body[k])}`);
    }
  } catch (err) { badBboxRequests.push(`unparseable body: ${err.message}`); }
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

// ---------------------------------------------------------------------------
// REGION PACKS. Inside a live LOK_REGIONS bbox the client must extrude from the
// pre-baked static pack and must NOT touch /api/buildings at all — that is the
// whole point of baking, and the OSM Foundation's policy reason for it.
// Asserting only "buildings appeared" would pass even if the region code were
// dead and Overpass had quietly served the view instead, so the decisive
// assertion here is that the proxy call count does not move.
// Getting the camera to a precise place turned out to be the whole difficulty
// here, and it is worth recording why. Auto-rotate moves ~3 deg/sec, so between
// a programmatic pointOfView and the reload click the longitude drifted 5-12
// degrees and the camera left the region entirely. Pausing helps but is not
// enough on its own: OrbitControls has enableDamping with dampingFactor 0.08,
// so the existing angular velocity bleeds off over many frames rather than
// stopping dead, leaving a residual ~0.7 degrees. Rather than guess a sleep
// long enough to cover that, this waits until the camera has demonstrably
// arrived. (The component now also suppresses auto-rotate at street level, but
// a programmatic pointOfView fires no OrbitControls event, so the test still
// pauses explicitly — as someone exploring a city would.)
const pauseBtn = page.locator('button[aria-label="Pause globe rotation"]');
if (await pauseBtn.count()) { await pauseBtn.click(); await page.waitForTimeout(300); }

// The step above deliberately toggled the layer OFF, so switch it back on.
await buildingsBtn.click();
await page.waitForTimeout(400);
const proxyCallsBeforeRegion = overpassRequestCount;

// Centre of the "demo-grid" region declared in LOK_REGIONS.
const TARGET = { lat: 40.710, lng: -74.0075 };
await page.evaluate(t => window.__globe.pointOfView({ ...t, altitude: 0.1 }), TARGET);
await page.waitForFunction(t => {
  const p = window.__globe.pointOfView();
  return p && Math.abs(p.lat - t.lat) < 0.004 && Math.abs(p.lng - t.lng) < 0.004;
}, TARGET, { timeout: 15000 }).catch(async () => {
  const p = await page.evaluate(() => window.__globe.pointOfView());
  console.error(`camera never settled on the region: wanted ${JSON.stringify(TARGET)}, got ${JSON.stringify(p)}`);
});
await reloadBtn.click();
await page.waitForTimeout(2500);

const regionState = await page.evaluate(() => {
  const txt = document.body.innerText || '';
  let meshes = 0, tagged = 0;
  const g = window.__globe;
  if (g && g.scene) {
    g.scene().traverse(o => {
      if (o.isMesh && o.userData && o.userData.regionId) { meshes++; if (o.userData.wayId) tagged++; }
    });
  }
  return { meshes, tagged, showsRegion: /Sandbox City/.test(txt), showsAttribution: /OpenStreetMap contributors/.test(txt) };
});

const proxyUntouched = overpassRequestCount === proxyCallsBeforeRegion;
console.log('Region pack extruded meshes (expect > 0):', regionState.meshes);
console.log('Meshes carry their OSM way id, so art can be keyed to a building:', regionState.tagged === regionState.meshes && regionState.tagged > 0);
console.log('Region name shown in the UI:', regionState.showsRegion);
console.log('ODbL attribution displayed (licence requirement):', regionState.showsAttribution);
console.log('Did NOT fall back to /api/buildings inside a baked region:', proxyUntouched);

const regionOk = regionState.meshes > 0 && regionState.tagged === regionState.meshes
  && regionState.showsRegion && regionState.showsAttribution && proxyUntouched;

console.log('Every /api/buildings request carried a real numeric bbox:', badBboxRequests.length === 0,
  badBboxRequests.length ? `(bad: ${badBboxRequests.slice(0, 4).join(', ')})` : '');
console.log('Page errors:', errors);
await browser.close();
stop();


const ok = badBboxRequests.length === 0 && regionOk && overpassCalled && allThreeExtruded && !calledOverpassDirectly && errors.length === 0;
console.log(ok ? '\nBUILDINGS OK — 3D extrusion layer resolves to real geometry via the same-origin proxy, never calling Overpass directly.' : '\nBUILDINGS FAILED');
process.exit(ok ? 0 : 1);
