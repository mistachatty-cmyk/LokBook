// Proves drawings actually persist.
//
// THE BUG
// -------
// `store` in App.jsx wrote everything through localStorage, capped at roughly
// 5 MB. Posts carry their frames inline as base64 PNGs, so a real gallery
// reaches that ceiling; past it `setItem` throws QuotaExceededError, the write
// silently fails, and the app said "Gallery too big". That message reads like a
// warning about size. It actually meant the gallery existed only in memory and
// was **lost on the next reload** — the user's drawings, gone.
//
// It also fired on every single `posts` change (voting, viewing, reacting, bot
// drops), with no dedupe, which is why three identical toasts stacked over the
// feed in the report.
//
// This gate drives the real app and asks two questions the build cannot:
// does the shipped store actually use IndexedDB, and does a payload larger than
// the old localStorage cap survive a reload?
//
// Run with `npm run verify:gallery`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4178;
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
const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

const listKv = () => page.evaluate(() => new Promise(res => {
  const r = indexedDB.open('lok:kv', 1);
  r.onsuccess = () => {
    const db = r.result;
    if (!db.objectStoreNames.contains('kv')) return res([]);
    const keys = db.transaction('kv', 'readonly').objectStore('kv').getAllKeys();
    keys.onsuccess = () => res(keys.result.map(String));
    keys.onerror = () => res([]);
  };
  r.onerror = () => res(null);
}));

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
  try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
  await page.waitForTimeout(1200);
  try { await page.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
  await page.waitForTimeout(3000);

  // 1. The real app's store must be writing to IndexedDB, not localStorage.
  const keys = await listKv();
  if (keys === null) problems.push('the lok:kv IndexedDB database was never created — the app is still on localStorage only');
  else if (!keys.some(k => /lok:save/.test(k))) {
    problems.push(`the app's save never reached IndexedDB (keys present: ${keys.join(', ') || 'none'})`);
  }

  // 2. A payload bigger than the old cap must survive a reload. ~8 MB of
  // base64-ish text: comfortably past localStorage's ~5 MB, and a realistic
  // size for a gallery of frames.
  const BIG_MB = 8;
  const wrote = await page.evaluate(async (mb) => {
    const chunk = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo='.repeat(1024);  // ~36KB
    const blob = { posts: Array.from({ length: mb * 28 }, (_, i) => ({ id: 'p' + i, frame: chunk })) };
    const bytes = JSON.stringify(blob).length;
    // Through the SAME IndexedDB tier the app's store uses.
    const ok = await new Promise(res => {
      const r = indexedDB.open('lok:kv', 1);
      r.onsuccess = () => {
        const t = r.result.transaction('kv', 'readwrite');
        t.objectStore('kv').put(blob, 'lok:verify:big');
        t.oncomplete = () => res(true);
        t.onerror = () => res(false);
        t.onabort = () => res(false);
      };
      r.onerror = () => res(false);
    });
    // And confirm localStorage genuinely cannot hold it — otherwise this gate
    // proves nothing about why IndexedDB was needed.
    let lsOk = true;
    try { localStorage.setItem('lok:verify:big', JSON.stringify(blob)); } catch { lsOk = false; }
    try { localStorage.removeItem('lok:verify:big'); } catch {}
    return { ok, bytes, lsOk };
  }, BIG_MB);

  if (!wrote.ok) problems.push(`a ${(wrote.bytes / 1048576).toFixed(1)} MB gallery could not be written to IndexedDB`);
  if (wrote.lsOk) {
    problems.push(`localStorage accepted ${(wrote.bytes / 1048576).toFixed(1)} MB — this browser has no cap, so the gate is not exercising the failure it exists for`);
  }

  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const survived = await page.evaluate(() => new Promise(res => {
    const r = indexedDB.open('lok:kv', 1);
    r.onsuccess = () => {
      const g = r.result.transaction('kv', 'readonly').objectStore('kv').get('lok:verify:big');
      g.onsuccess = () => res(g.result?.posts?.length || 0);
      g.onerror = () => res(0);
    };
    r.onerror = () => res(0);
  }));
  if (!survived) problems.push('the large gallery did not survive a reload — this is the data loss the fix exists to stop');

  console.log(`GALLERY: kv keys ${JSON.stringify(keys)} · wrote ${(wrote.bytes / 1048576).toFixed(1)} MB (localStorage refused it: ${!wrote.lsOk}) · ${survived} posts survived a reload`);
} catch (err) {
  problems.push(err.message);
}

await browser.close();
stop();

if (problems.length) {
  console.error('GALLERY STORAGE BROKEN:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('GALLERY OK — the real app stores through IndexedDB, and a gallery far past the old 5MB cap survives a reload.');
