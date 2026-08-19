// Proves Street View mode actually does what it claims: the camera looks
// in a genuinely different direction as you drag, including tilting up
// toward the sky (where a building's upper storeys would be) — not just
// that the buttons render. This is the check that would have caught the
// earlier "tilt" bug: a previous version of this camera control repositioned
// the camera around the globe but always looked straight down at whatever
// was beneath it, verified only by button labels cycling, never by reading
// the actual look direction. This test reads real camera state instead.
//
// Run with `node scripts/verify-streetview.mjs` after `LOK_TEST_HARNESS=1 vite build`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4186;
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
await page.route('**/api/buildings', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"elements":[]}' }));

await page.goto(`http://localhost:${PORT}/world-harness.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__h && window.__h.done, null, { timeout: 45000 });
await page.waitForFunction(() => !!window.__globe && !!window.__THREE, null, { timeout: 15000 });
await page.waitForTimeout(7000);

const readCamera = () => page.evaluate(() => {
  const globe = window.__globe;
  const camera = globe.camera();
  const controls = globe.controls();
  const pos = camera.position;
  // Read the camera's ACTUAL current facing direction, not controls.target
  // — globe.gl's own 'change' listener resets controls.target back to
  // (0,0,0) synchronously as part of every controls.update() call (see
  // globe.gl's "Keep orbit target on center" line), which happens AFTER
  // that same update() call already used the real target to orient the
  // camera via lookAt(). So target is stale garbage moments after any
  // update() — getWorldDirection() reads the camera's real quaternion,
  // unaffected by that reset.
  const lookDir = camera.getWorldDirection(new window.__THREE.Vector3());
  const localUp = pos.clone().normalize();
  // Angle between the look direction and "straight down at your own feet"
  // (i.e. -localUp). 0deg = looking straight down (the old bug). ~90deg =
  // looking along the horizon. >90deg = looking up toward the sky.
  const angleFromStraightDown = lookDir.angleTo(localUp.clone().negate()) * 180 / Math.PI;
  return {
    controlsEnabled: controls.enabled,
    distFromCenter: pos.length(),
    angleFromStraightDown,
  };
});

console.log('window.__globe reachable:', await page.evaluate(() => !!window.__globe));

// Before Street View: normal orbit mode, controls enabled, camera far out.
const before = await readCamera();
console.log('Before Street View — controls enabled:', before.controlsEnabled, '| distance from centre:', before.distFromCenter.toFixed(1));

// Enter Street View.
const enterBtn = page.locator('button[aria-label^="Enter Street View"]');
console.log('Enter button present:', await enterBtn.count() > 0);
await enterBtn.click();
await page.waitForTimeout(300);

const entered = await readCamera();
console.log('After entering — controls disabled (expect true):', entered.controlsEnabled === false);
// Ground-level camera should sit right at the globe radius (~100), nowhere
// near the ~350 unit distance of the default orbit view.
console.log('Camera now at ground level, not orbiting from afar (expect ~100, was', before.distFromCenter.toFixed(1), '):', entered.distFromCenter < 105);
console.log('Looking level at the horizon on entry (expect ~90deg, pitch=0):', Math.abs(entered.angleFromStraightDown - 90) < 5, `(actual: ${entered.angleFromStraightDown.toFixed(1)}deg)`);

// Drag upward (negative dy) — should tilt the look direction UP, toward
// where a building's upper floors would be, i.e. angle from straight-down
// should INCREASE past 90deg. This is the exact check the earlier broken
// "tilt" feature would have failed: that feature never changed this angle
// at all, no matter what button was pressed.
const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx, cy - 220, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(200);

const lookedUp = await readCamera();
console.log('Dragging up tilts the view upward past the horizon (expect > 90deg, was', entered.angleFromStraightDown.toFixed(1), '):', lookedUp.angleFromStraightDown > entered.angleFromStraightDown + 15, `(actual: ${lookedUp.angleFromStraightDown.toFixed(1)}deg)`);
const cameraStayedPut = Math.abs(lookedUp.distFromCenter - entered.distFromCenter) < 0.01;
console.log('Camera position itself did not move while looking around (expect true — this is look-around, not fly-around):', cameraStayedPut);

// Step forward should move the camera (still at ground level) without
// touching controls.enabled.
const beforeStep = await page.evaluate(() => window.__globe.camera().position.clone());
await page.locator('button[aria-label="Step forward"]').click();
await page.waitForTimeout(200);
const afterStep = await page.evaluate(() => window.__globe.camera().position.clone());
const moved = Math.hypot(afterStep.x - beforeStep.x, afterStep.y - beforeStep.y, afterStep.z - beforeStep.z);
console.log('Step forward actually moves the camera (expect > 0):', moved > 0.01, `(moved ${moved.toFixed(3)} units)`);
const stillGroundLevel = await readCamera();
console.log('Still at ground level after stepping (expect true):', stillGroundLevel.distFromCenter < 105);

// Exit should restore normal orbit controls.
await page.locator('button[aria-label="Exit Street View"]').click();
await page.waitForTimeout(1000);
const afterExit = await readCamera();
console.log('Exiting re-enables OrbitControls (expect true):', afterExit.controlsEnabled === true);
console.log('Exiting flies back out to an orbit view (expect > 105, was ground-level ~100):', afterExit.distFromCenter > 105);

console.log('Page errors:', errors);
await browser.close();
stop();

const ok = entered.controlsEnabled === false
  && entered.distFromCenter < 105
  && Math.abs(entered.angleFromStraightDown - 90) < 5
  && lookedUp.angleFromStraightDown > entered.angleFromStraightDown + 15
  && cameraStayedPut
  && moved > 0.01
  && stillGroundLevel.distFromCenter < 105
  && afterExit.controlsEnabled === true
  && afterExit.distFromCenter > 105
  && errors.length === 0;
console.log(ok ? '\nSTREET VIEW OK — camera genuinely looks around from a fixed ground-level point, verified by reading real camera state.' : '\nSTREET VIEW FAILED');
process.exit(ok ? 0 : 1);
