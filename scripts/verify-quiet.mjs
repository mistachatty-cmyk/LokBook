// Proves an idle tab is actually idle — that it does not re-upload data
// nobody changed.
//
// This gate exists because of a measurement, not a theory. On an untouched
// tab, instrumented at localStorage.setItem, the app wrote a full save every
// 12.0 seconds with byte-identical payloads:
//
//   idle 75s -> 6 full saves
//   gaps between saves (s): 12.0, 12.0, 12.0, 12.0, 12.0
//   blob bytes: 3198, 3210, 3210, 3210, 3210, 3210
//
// LilLok's ink-decay setInterval mutated `lillok`, `lillok` was a getSaveBlob
// dependency, so doSave's identity changed, so the debounced save re-armed —
// and doSave also fires a full auth_saves upsert carrying save_blob AND the
// whole gallery. A measured gallery frame is ~16.8KB as a data URL, so a user
// with twenty published flips was re-uploading megabytes every twelve seconds
// while doing nothing at all.
//
// Two independent things had to hold to fix it, so this asserts both:
//   1. the local save loop goes quiet when nothing changes (the lillokRef fix),
//   2. no duplicate payload reaches the network even if it doesn't (the
//      content-hash guard in engine/saveCloud.js).
//
// Assertion 2 only means something if the app believes it is signed in —
// pushSave short-circuits on a null user id, so an anonymous headless run
// reports zero uploads no matter how broken the guard is. That is a gate
// asserting nothing, the exact trap the first verify:strokes fell into. So a
// fake but well-formed Supabase session is seeded into localStorage before the
// bundle loads, and window.fetch is stubbed in the same init script (before
// supabase-js captures it) so the upserts are counted and never leave the
// machine.
//
// Run with `npm run verify:quiet`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4180;
const IDLE_MS = 75000;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const problems = [];
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

await page.addInitScript(() => {
  try { localStorage.clear(); } catch {}
  window.__q = { saves: [], uploads: [] };

  // A session the app will accept. expires_at is far future so supabase-js
  // never tries to refresh it over the network.
  const uid = '00000000-0000-4000-8000-000000000001';
  const far = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  try {
    localStorage.setItem('sb-jfavkudihasswkhkouxq-auth-token', JSON.stringify({
      access_token: 'verify-quiet-fake', token_type: 'bearer', expires_in: 31536000,
      expires_at: far, refresh_token: 'verify-quiet-fake-refresh',
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'quiet@example.test' },
    }));
  } catch {}

  const realSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (k, v) => {
    if (k === 'lok:save:v2') window.__q.saves.push({ t: Date.now(), bytes: v.length });
    return realSet(k, v);
  };

  // Patched here, in the init script, so supabase-js binds THIS fetch when the
  // client is constructed. Patching after load is too late — the client keeps
  // its own reference and the uploads become invisible.
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (/auth_saves/.test(url)) {
      const body = init?.body;
      window.__q.uploads.push({ t: Date.now(), bytes: typeof body === 'string' ? body.length : 0 });
      return Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return realFetch(input, init);
  };
});
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
await page.waitForTimeout(1200);
try { await page.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
await page.waitForTimeout(1500);

// The session must have actually taken, or assertion 2 measures nothing.
const signedIn = await page.evaluate(() =>
  !!JSON.parse(localStorage.getItem('sb-jfavkudihasswkhkouxq-auth-token') || 'null')?.user?.id);
if (!signedIn) problems.push('seeded session did not survive load — the upload assertion below would be vacuous');

// Baseline: everything before this point is startup, not idle behaviour.
await page.evaluate(() => { window.__q.saves = []; window.__q.uploads = []; });

console.log(`sitting idle for ${IDLE_MS / 1000}s…`);
const t0 = Date.now();
await page.waitForTimeout(IDLE_MS);
const q = await page.evaluate(() => window.__q);
const secs = (Date.now() - t0) / 1000;

console.log(`idle ${secs.toFixed(0)}s -> ${q.saves.length} local saves, ${q.uploads.length} cloud uploads`);
if (q.saves.length > 1) {
  console.log('  save gaps (s):', q.saves.slice(1).map((s, i) => ((s.t - q.saves[i].t) / 1000).toFixed(1)).join(', '));
  console.log('  save bytes:', q.saves.map(s => s.bytes).join(', '));
}

// An idle tab is allowed one settling save shortly after load. Anything beyond
// that is the decay interval driving persistence again.
const ALLOWED_SAVES = 1;
if (q.saves.length > ALLOWED_SAVES) {
  problems.push(`${q.saves.length} local saves in ${secs.toFixed(0)}s of doing nothing (allowed ${ALLOWED_SAVES}) — a timer is re-arming the save loop again`);
}

// Duplicate payloads must never reach the network, whatever the save loop does.
const dupes = q.saves.length > 1 && new Set(q.saves.map(s => s.bytes)).size === 1;
if (dupes && q.uploads.length > 1) {
  problems.push(`${q.uploads.length} cloud uploads of identical payloads — the content-hash guard in saveCloud.js is not suppressing them`);
}
if (q.uploads.length > 1) {
  problems.push(`${q.uploads.length} auth_saves uploads while idle — expected at most 1`);
}

if (errors.length) console.error('pageerrors:\n  ' + errors.join('\n  '));
if (problems.length) console.error('PROBLEMS:\n  ' + problems.join('\n  '));
const pass = problems.length === 0 && errors.length === 0;
console.log(pass ? 'QUIET OK — an idle tab neither re-saves nor re-uploads.' : 'QUIET FAILED');
await browser.close();
stop();
process.exit(pass ? 0 : 1);
