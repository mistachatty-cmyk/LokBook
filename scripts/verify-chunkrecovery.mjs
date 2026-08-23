// Proves the app survives a deploy that lands while it is open.
//
// THE BUG THIS EXISTS FOR
// -----------------------
// vite.config.js uses `registerType: 'autoUpdate'`, so a new service worker
// activates immediately (skipWaiting) and wipes the previous precache
// (cleanupOutdatedCaches). The page still running was loaded from the OLD
// index.html, so its dynamic import() URLs name chunk hashes that are now gone
// from the cache AND 404 on the server. Every lazy route dies at once with
// `TypeError: Importing a module script failed.` — which is exactly what a user
// hit on a real iPhone: World dead at 11:13, the Studio canvas dead at 11:14,
// while the already-loaded feed rendered perfectly.
//
// It was also inescapable. ErrorBoundary's "Try again" only cleared React
// state, so it re-rendered, re-imported the same dead URL, and crashed again.
//
// Every gate in this repo passed throughout, because none of them ever asked
// what happens to a lazy chunk that has gone missing. This one does: it 404s a
// real lazy chunk in the real app, reached through the real nav button, and
// asserts the app RECOVERS rather than parking on Splot.
//
// Run with `npm run verify:chunkrecovery`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4177;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

const problems = [];
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
// Each phase gets its own context: the once-only guard is a sessionStorage
// stamp, so phases sharing a session would poison each other's results.
async function freshPage() {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    try { localStorage.clear(); } catch {}
    try { navigator.serviceWorker.register = () => Promise.reject(new Error('SW disabled for test')); } catch {}
  });
  return p;
}
const page = await freshPage();
// NOTE on the service worker: in production it is the CAUSE (its cache wipe is
// what strands the old chunks), but the thing under test here is the RECOVERY —
// a chunk request that 404s. With the SW installed, Shop is served from
// precache and never touches the network, so the simulated 404 would never fire
// and this gate would pass without testing anything. freshPage() disables it.

// Count real navigations. A recovery IS a reload, so this is the primary signal.
let loads = 0;
page.on('load', () => { loads++; });

// Simulate the stale-hash case: the lazy chunk this page knows about is gone.
// It 404s until the page reloads, at which point the fresh document asks for a
// chunk that exists — exactly what happens against a real new deployment.
let chunk404s = 0;
let killChunk = true;          // flipped off once the app has reloaded
await page.route('**/assets/Shop-*.js', route => {
  if (killChunk) { chunk404s++; return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }); }
  return route.continue();
});

// Clear whatever is covering the UI: the loader, the first-run tour, and the
// full-screen ad interstitial that fires on a tab transition.
async function openAppOn(p) {
  try { await p.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
  await p.waitForTimeout(1000);
  try { await p.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
  await p.waitForTimeout(600);
  await dismissAdsOn(p);
}
const openApp = () => openAppOn(page);

async function dismissAdsOn(p) {
  for (let i = 0; i < 3; i++) {
    const ad = p.locator('div[role="dialog"][aria-label="Advertisement"]');
    if (!(await ad.count()) || !(await ad.first().isVisible().catch(() => false))) return;
    try { await p.locator('button[aria-label="Close ad"]').first().click({ timeout: 2500 }); }
    catch { try { await p.keyboard.press('Escape'); } catch {} }
    await p.waitForTimeout(500);
  }
}
const dismissAds = () => dismissAdsOn(page);

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await openApp();

  const shopBtn = page.locator('nav button:has-text("Shop"), button:has-text("Shop")').first();
  if (!(await shopBtn.count())) throw new Error('no Shop nav button — cannot reach a lazy chunk from the real UI');

  const loadsBefore = loads;
  // Once the recovery reload happens, serve the chunk normally — a real new
  // deployment answers the fresh document's request with a chunk that exists.
  page.once('load', () => { killChunk = false; });
  await shopBtn.click();
  await page.waitForTimeout(1200);
  await dismissAds();
  // Give it room to fail, recover, and come back up.
  await page.waitForTimeout(6000);

  if (chunk404s === 0) {
    problems.push('the Shop chunk was never requested — this gate never reached its subject and would pass vacuously');
  }

  const body = (await page.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ');

  if (/Splot!/.test(body)) {
    problems.push('a missing chunk still parks the app on the Splot error screen — the user is stuck exactly as before');
  }
  if (/Importing a module script failed/i.test(body)) {
    problems.push('the raw module-import TypeError is still shown to the user');
  }
  if (loads <= loadsBefore) {
    problems.push(`the app never reloaded after a chunk 404 (loads ${loadsBefore} -> ${loads}) — nothing recovered it`);
  }

  // ...and having recovered, the app must actually work.
  await openApp();
  const shopAgain = page.locator('nav button:has-text("Shop"), button:has-text("Shop")').first();
  if (await shopAgain.count()) {
    await shopAgain.click();
    await page.waitForTimeout(1200);
    await dismissAds();
    await page.waitForTimeout(1500);
  }
  const after = (await page.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ');
  if (/Splot!/.test(after)) problems.push('the app crashed again after recovering — the reload did not pick up a working build');

  // The loop guard is as important as the recovery. An app that refreshes
  // forever is worse than one showing an error, because the error is at least
  // readable. Three loads = initial + one recovery + the re-entry above.
  if (loads > loadsBefore + 3) {
    problems.push(`the app reloaded ${loads - loadsBefore} times — the once-only guard is not holding, this is a refresh loop`);
  }

  console.log(`CHUNK RECOVERY: ${chunk404s} chunk 404(s) served · ${loads - loadsBefore} reload(s) · Splot shown: ${/Splot!/.test(body)}`);

  // --- Phase B: a build that is genuinely broken ---------------------------
  // The chunk never comes back. The app must give up after ONE reload and show
  // the error, because an app that refreshes forever is worse than one showing
  // an error — you cannot even read the error. The first version of this gate
  // could not see a missing guard at all, because its chunk always recovered.
  {
    const p2 = await freshPage();
    let loads2 = 0;
    p2.on('load', () => { loads2++; });
    await p2.route('**/assets/Shop-*.js', r => r.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }));
    await p2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await openAppOn(p2);
    const before2 = loads2;
    const btn2 = p2.locator('nav button:has-text("Shop"), button:has-text("Shop")').first();
    if (await btn2.count()) { await btn2.click(); await p2.waitForTimeout(1200); await dismissAdsOn(p2); }
    await p2.waitForTimeout(7000);
    // Try again, the way a person would. WITH the once-only guard this second
    // attempt is refused and the error is shown; WITHOUT it, the app reloads a
    // second time and would keep going forever. The guard is invisible unless
    // something re-requests the dead chunk, which is why the first version of
    // this phase could not detect its removal.
    await openAppOn(p2);
    const btn2b = p2.locator('nav button:has-text("Shop"), button:has-text("Shop")').first();
    if (await btn2b.count()) { await btn2b.click(); await p2.waitForTimeout(1200); await dismissAdsOn(p2); }
    await p2.waitForTimeout(7000);
    const reloads2 = loads2 - before2;
    if (reloads2 > 1) {
      problems.push(`a permanently missing chunk reloaded the app ${reloads2} times — that is a refresh loop, the once-only guard is gone`);
    }
    const body2 = (await p2.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ');
    if (!/Splot!/.test(body2) && reloads2 === 0) {
      problems.push('a permanently missing chunk neither recovered nor surfaced an error — it failed silently');
    }
    console.log(`CHUNK RECOVERY (broken build): ${reloads2} reload(s), then ${/Splot!/.test(body2) ? 'showed the error' : 'no error shown'}`);
    await p2.context().close();
  }

  // --- Phase C: the preloadError path specifically -------------------------
  // Phase A passes even with this listener deleted, because the ErrorBoundary
  // catches the crash as a second line of defence. That is good design and a
  // bad test: assert the primary path directly so it cannot rot unnoticed.
  {
    const p3 = await freshPage();
    let loads3 = 0;
    p3.on('load', () => { loads3++; });
    await p3.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
    const before3 = loads3;
    await p3.evaluate(() => window.dispatchEvent(new Event('vite:preloadError')));
    await p3.waitForTimeout(3000);
    if (loads3 <= before3) {
      problems.push("vite:preloadError did not trigger a reload — the primary recovery path is not wired");
    }
    console.log(`CHUNK RECOVERY (preloadError path): ${loads3 - before3} reload(s)`);
    await p3.context().close();
  }
} catch (err) {
  problems.push(err.message);
}

await browser.close();
stop();

if (problems.length) {
  console.error('CHUNK RECOVERY BROKEN:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('CHUNK RECOVERY OK — a chunk that vanishes mid-session reloads the app once and recovers, instead of trapping the user on Splot.');
