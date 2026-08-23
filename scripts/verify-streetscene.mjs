// The gate that would have caught the 3,440 m eye height.
//
// Street mode shipped for weeks putting the camera 0.054 units above a
// radius-100 globe and calling that "eye level". At 1 unit = 63,710 m that is
// 3.4 km up. Every existing check passed: the build was green, smoke rendered
// the shell, verify:world confirmed a canvas with pixels in it, and
// verify:buildings confirmed footprints reached the extruder. Not one of them
// ever asked HOW HIGH THE CAMERA WAS — so the answer stayed "in a small plane"
// and the bug was only found by a user saying it hovers above the street.
//
// So this gate asks in metres, from the real entry point: it drives the real
// WorldMapViewer, flies to a real baked city, clicks the same "3D City" chip a
// user taps, and reads the resulting scene's actual numbers.
//
// Run with `npm run verify:streetscene`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4176;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/street-harness.html`); if (r.ok) break; } catch {}
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
// Overpass must never be reached from a baked region. If it is, that is a
// finding, not a fallback.
let overpassCalls = 0;
await page.route('**/api/buildings', r => { overpassCalls++; r.fulfill({ status: 200, contentType: 'application/json', body: '{"elements":[]}' }); });

const problems = [];
try {
  await page.goto(`http://localhost:${PORT}/street-harness.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__h?.ready, null, { timeout: 60000 });

  // Times Square, inside the baked nyc-midtown pack.
  await page.evaluate(() => window.__goto(40.758, -73.9855));
  await page.waitForTimeout(1500);

  // The REAL entry point: the chip a user taps. Finding it by its label is
  // deliberate — if the button is renamed away or removed, this gate fails
  // rather than quietly testing an API nobody can reach.
  const chip = page.locator('button', { hasText: '3D City' }).first();
  if (!(await chip.count())) throw new Error('no "3D City" button in the drawer — street mode has no entry point');
  await chip.click();

  await page.waitForFunction(() => !!window.__lokStreetScene, null, { timeout: 30000 })
    .catch(() => { throw new Error('clicking "3D City" over Times Square never built a street scene'); });
  await page.waitForTimeout(1200);

  const st = await page.evaluate(() => window.__lokStreetScene.state());

  // --- the assertion that matters ------------------------------------------
  if (!(st.eyeHeightM >= 1.6 && st.eyeHeightM <= 1.8)) {
    problems.push(`camera is at ${st.eyeHeightM} m — a person stands at 1.6-1.8 m (the shipped bug read 3440)`);
  }
  // --- there is actually a city around you ---------------------------------
  if (st.buildingCount < 50) problems.push(`only ${st.buildingCount} buildings built in Midtown Manhattan`);
  if (!(st.nearestBuildingM < 100)) problems.push(`nearest building is ${st.nearestBuildingM.toFixed(1)} m away — you are not standing in a city`);
  if (!(st.tallestBuildingM > 20)) problems.push(`tallest building is ${st.tallestBuildingM.toFixed(1)} m — nothing is extruding`);
  if (!(st.tallestBuildingM < 900)) problems.push(`tallest building is ${st.tallestBuildingM.toFixed(1)} m — heights are exaggerated again`);
  if (!st.roadsBuilt) problems.push('no road geometry — the street in "street mode" is missing');
  if (!st.wayIds.every(id => Number.isFinite(id))) problems.push('buildings carry no OSM way id — art could not be keyed to them');
  if (overpassCalls > 0) problems.push(`called Overpass ${overpassCalls}x inside a baked region — the pack path did not run`);

  // --- you cannot look through the floor -----------------------------------
  const pitched = await page.evaluate(() => {
    window.__lokStreetScene.look(0, 10);      // slam the look all the way up
    const up = window.__lokStreetScene.state().pitch;
    window.__lokStreetScene.look(0, -20);     // and all the way down
    const down = window.__lokStreetScene.state().pitch;
    return { up, down, max: window.__lokStreetScene.state().maxPitch };
  });
  if (pitched.up > pitched.max + 1e-9) problems.push(`pitch reached ${pitched.up} above its clamp ${pitched.max}`);
  if (pitched.down < -pitched.max - 1e-9) problems.push(`pitch reached ${pitched.down} below its clamp -${pitched.max}`);
  if (Math.abs(pitched.up) >= Math.PI / 2) problems.push('pitch can reach straight up/down — the camera can pass through the floor');

  // --- dragging really turns the camera ------------------------------------
  // Inherited from the retired verify-streetview.mjs, which existed because an
  // earlier "tilt" control cycled its button label while the camera kept
  // staring straight down. Reading the real forward vector is the only way to
  // tell those apart.
  const turned = await page.evaluate(async () => {
    const s = window.__lokStreetScene;
    const THREE = window.__THREE;
    const fwd = () => { const v = new THREE.Vector3(); s.camera.getWorldDirection(v); return v.clone(); };
    // Level first. The clamp test above left the view pointed at the pavement,
    // and yawing while looking straight down barely moves the forward vector —
    // correct geometry, useless measurement.
    s.look(0, -s.state().pitch);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const before = fwd();
    s.look(1.0, 0);                       // ~57 degrees of yaw
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = fwd();
    s.look(-1.0, 0);
    return { deg: THREE.MathUtils.radToDeg(before.angleTo(after)) };
  });
  if (!(turned.deg > 45 && turned.deg < 70)) {
    problems.push(`dragging 1 radian of yaw turned the camera ${turned.deg.toFixed(1)} deg — expected about 57`);
  }

  // --- the horizon is on screen --------------------------------------------
  // Geometric, not pixel-sampled: project a ground point 500 m ahead and check
  // it lands inside the frame. A camera 3.4 km up puts the ground far below
  // the bottom edge, which is exactly what the screenshots showed.
  const horizon = await page.evaluate(async () => {
    const s = window.__lokStreetScene;
    s.look(0, -s.state().pitch);            // level the view
    // Wait for the render loop to refresh camera.matrixWorldInverse. project()
    // reads it, and reading it in the same tick as look() measures the PREVIOUS
    // frame's orientation — which the pitch-clamp test above just left pointing
    // at the pavement. Cost one confusing NDC y of 71.
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const THREE = window.__THREE;
    const g = s.geo();
    const cam = s.camera;
    const ahead = new THREE.Vector3(
      cam.position.x + Math.sin(g.heading) * 500, 0, cam.position.z - Math.cos(g.heading) * 500);
    const ndc = ahead.clone().project(cam);
    return { y: ndc.y, z: ndc.z };
  });
  if (!(horizon.y > -1 && horizon.y < 1)) {
    problems.push(`ground 500 m ahead projects to NDC y=${horizon.y.toFixed(2)} — off screen, so no horizon is visible`);
  }

  // --- walking moves you in metres, and keeps your feet on the ground -------
  const walked = await page.evaluate(() => {
    const before = window.__lokStreetScene.geo();
    window.__lokStreetScene.walk(50);
    const after = window.__lokStreetScene.state();
    return { before, afterGeo: window.__lokStreetScene.geo(), eye: after.eyeHeightM };
  });
  const moved = Math.hypot(
    (walked.afterGeo.lat - walked.before.lat) * 111132,
    (walked.afterGeo.lng - walked.before.lng) * 111320 * Math.cos(walked.before.lat * Math.PI / 180));
  if (!(moved > 40 && moved < 60)) problems.push(`walking 50 m moved you ${moved.toFixed(1)} m`);
  if (!(walked.eye >= 1.6 && walked.eye <= 1.8)) problems.push(`eye height drifted to ${walked.eye} m after walking`);

  // --- ambience is a real toggle, not a decorative switch -------------------
  const amb = await page.evaluate(() => {
    const s = window.__lokStreetScene;
    s.setAmbient(false);
    const off = s.scene.children.filter(o => o.type === 'Group' && o.children.some(c => c.userData?.kind === 'car')).map(g => g.visible);
    s.setAmbient(true);
    const on = s.scene.children.filter(o => o.type === 'Group' && o.children.some(c => c.userData?.kind === 'car')).map(g => g.visible);
    return { off, on, cars: s.state().carCount };
  });
  if (amb.cars > 0) {
    if (amb.off.some(Boolean)) problems.push('turning ambient motion off left the traffic visible');
    if (!amb.on.every(Boolean)) problems.push('turning ambient motion on did not bring the traffic back');
  }

  // --- exiting cleans up ---------------------------------------------------
  const exitBtn = page.locator('button[aria-label="Exit Street View"]');
  if (await exitBtn.count()) {
    await exitBtn.click();
    await page.waitForTimeout(600);
    const left = await page.evaluate(() => !!window.__lokStreetScene);
    if (left) problems.push('exiting street mode left the scene alive — its renderer keeps burning GPU');
  } else {
    problems.push('street mode has no exit control');
  }

  console.log(`STREET: eye ${st.eyeHeightM} m · ${st.buildingCount} buildings · nearest ${st.nearestBuildingM.toFixed(1)} m · tallest ${st.tallestBuildingM.toFixed(0)} m · ${st.carCount} cars · tier ${st.tier} · shadows ${st.shadows}`);
} catch (err) {
  problems.push(err.message);
}

const fatal = errors.filter(e => !/ResizeObserver|Failed to fetch|WebGL/i.test(e));
if (fatal.length) problems.push(`page errors: ${fatal.join(' | ')}`);

await browser.close();
stop();

if (problems.length) {
  console.error('STREET SCENE BROKEN:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('STREET SCENE OK — real buildings at real heights, seen from 1.7 m, reached through the button a user taps.');
