// Proves the app does not drag base64 pixel payloads across the wire to render
// a list, and that it can still put pixels on screen afterwards.
//
// `frames` is a jsonb column of base64 data URLs — a measured 16.8KB per frame
// on a real composited page. Every list query used to select it: the boot feed
// fetch named it explicitly, `lokApi.fetchPosts` used `select=*`, and search
// sent no `select` at all, so PostgREST returned every column on each debounced
// keystroke. None of those results put a frame on screen at the moment they
// arrived; the pixels were prefetched for posts the user might never reach.
//
// The backend is STUBBED rather than live. Two reasons, and the second is the
// important one:
//   - sandboxed runs cannot reach supabase.co from Chromium at all, so a gate
//     built on the real host observes nothing and passes vacuously — the exact
//     decorative-gate trap this repo has already been bitten by;
//   - a stub can answer a query literally, so "did the app ASK for frames" is
//     decidable rather than inferred, and the row count is fixed so the byte
//     ceiling means something run to run.
//
// The stub honours `select` exactly: it returns `frames` if and only if the
// query requested it. So a regression that reinstates `select=*` immediately
// shows up as frame data in a list response.
//
// Asserts:
//   1. no lok_posts LIST query (no id filter) asks for `frames`,
//   2. no list response exceeds LIST_CEILING bytes,
//   3. after scrolling, a targeted `id=in.(…)` fetch fires AND the feed then
//      renders a real <img src="data:…"> — i.e. lazy loading actually works.
//
// Assertion 3 is the one that keeps 1 and 2 honest: deleting the column is
// trivial, and a gate checking only 1 and 2 would pass just as happily on a
// feed that can never show a picture again.
//
// Run with `npm run verify:payload`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4181;
const LIST_CEILING = 250 * 1024;
const STUB_POSTS = 12;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}

// A recognisable 1x1 WebP data URL, padded so a frame is bulky enough that
// serving frames in a list would blow the ceiling — as the real ones do.
const FRAME = 'data:image/webp;base64,' + 'UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA='.repeat(400);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const problems = [];
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

const seen = [];   // every lok_posts query the app made
await page.route('**/rest/v1/lok_posts*', async route => {
  const url = new URL(route.request().url());
  const select = url.searchParams.get('select') || '*';
  const idFilter = url.searchParams.get('id') || '';
  const wantsFrames = select === '*' || /\bframes\b/.test(select);
  const targeted = /^in\.\(|^eq\./.test(idFilter);

  let ids;
  if (targeted) {
    const inner = idFilter.replace(/^in\.\(|\)$/g, '').replace(/^eq\./, '');
    ids = inner.split(',').map(s => decodeURIComponent(s.replace(/^"|"$/g, '')));
  } else {
    ids = Array.from({ length: STUB_POSTS }, (_, i) => `stub-${i}`);
  }

  const rows = ids.map((id, i) => {
    const row = {
      id, title: `Stub flip ${i}`, author: 'stub.artist', pace_ms: 160, mode: 'A',
      style: 'bold', loop: false, votes: i, views: i * 2, reactions: {},
      origin: 'studio', created_at: new Date(Date.now() - i * 60000).toISOString(),
      frame_durations: [160, 160, 160],
    };
    // The literal point of the stub: answer the query as asked.
    if (wantsFrames) row.frames = [FRAME, FRAME, FRAME];
    return row;
  });

  const body = JSON.stringify(rows);
  seen.push({ select, targeted, wantsFrames, rows: rows.length, bytes: body.length, query: url.search.slice(0, 110) });
  await route.fulfill({ status: 200, contentType: 'application/json', body });
});

await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
await page.waitForTimeout(1500);
try { await page.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
await page.waitForTimeout(1500);

// Scroll the feed first, so the visibility loader runs against a clean feed.
// (Order matters: driving search first leaves the search-results view mounted
// for long enough that the feed's observed cards are gone when the scroll
// happens, and no lazy fetch fires — which looks exactly like a broken loader.)
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(500); }
await page.waitForTimeout(2000);
const renderedAfterScroll = await page.evaluate(() =>
  [...document.querySelectorAll('img')].filter(i => (i.currentSrc || i.src || '').startsWith('data:image/webp')).length);

// Search used to send no `select` at all.
try {
  const box = page.locator('input[aria-label="Search feed"]');
  await box.fill('stub', { timeout: 6000 });
  await page.waitForTimeout(2000);
  await box.fill('', { timeout: 3000 });
} catch (e) { problems.push('could not drive search: ' + e.message); }
await page.waitForTimeout(800);

const lists = seen.filter(r => !r.targeted);
const targeted = seen.filter(r => r.targeted);

console.log(`\n${seen.length} lok_posts queries (${lists.length} list, ${targeted.length} targeted):`);
for (const r of seen) {
  console.log(`  ${(r.bytes + 'B').padEnd(10)} rows=${String(r.rows).padEnd(3)} askedForFrames=${r.wantsFrames ? 'YES' : 'no '} ${r.targeted ? '[targeted]' : '[list]    '} ?${r.query}`);
}

if (!lists.length) problems.push('no list query fired at all — the feed never asked for posts, so nothing below was measured');
for (const r of lists) {
  if (r.wantsFrames) problems.push(`a list query asked for frames (${r.rows} rows, ${r.bytes}B): ?${r.query}`);
  if (r.bytes > LIST_CEILING) problems.push(`list response is ${(r.bytes / 1024).toFixed(0)}KB, ceiling is ${(LIST_CEILING / 1024).toFixed(0)}KB`);
}

// Lazy loading must actually deliver. A targeted fetch is necessary but not
// sufficient — what matters is that a frame reaches the DOM afterwards.
if (!targeted.length) {
  problems.push('no targeted id=in.(…) frame fetch ever fired — the visibility loader is not wired, so a frameless feed can never render');
} else {
  console.log(`  feed <img> elements showing lazily-fetched frames: ${renderedAfterScroll}`);
  if (!renderedAfterScroll) problems.push('targeted frame fetches fired but no frame reached the DOM — posts load metadata and then stay blank');
}

if (errors.length) console.error('pageerrors:\n  ' + errors.join('\n  '));
if (problems.length) console.error('PROBLEMS:\n  ' + problems.join('\n  '));
const pass = problems.length === 0 && errors.length === 0;
console.log(pass ? '\nPAYLOAD OK — lists carry metadata only, frames arrive on demand and render.' : '\nPAYLOAD FAILED');
await browser.close();
stop();
process.exit(pass ? 0 : 1);
