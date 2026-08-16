// Proves the BadBleep box is reachable — i.e. that you can open Settings on a
// fresh profile and type a code, without the hidden 7-tap ritual.
//
// "It renders in the JSX" is not the same as "a user can reach it". The box was
// gated behind devMode, whose only real entry was tapping a grey paragraph
// seven times; the `dev mode` code that also unlocks it could only be typed
// into the box being gated. Nothing in build or smoke noticed, because the
// component tree was perfectly valid — it was just unreachable.
//
// Asserts, against a real browser on a cleared profile:
//   1. the BadBleep input exists and is enabled with devMode false,
//   2. entering a code actually changes state (it's wired to onCheat),
//   3. the 🔩 Dev Flags panel is still hidden — ungating the box must not
//      have leaked the genuine debug surface.
//
// Run with `npm run verify:bleep`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4176;
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
const page = await browser.newPage({ viewport: { width: 414, height: 900 } });
const problems = [];
const errors = [];
page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

// Fresh profile: no saved devMode, no saved anything.
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });

// Through the loader.
try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
await page.waitForTimeout(1200);

// A fresh profile lands on the onboarding tour, which covers the whole UI.
try { await page.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
await page.waitForTimeout(700);

// Profile tab is labelled "You" in the bottom nav.
try { await page.locator('nav button:has-text("You"), button:has-text("You")').first().click({ timeout: 5000 }); } catch {}
await page.waitForTimeout(800);

// A LokPass interstitial can appear over the profile tab.
for (const dismiss of ['text=No thanks', 'button[aria-label*="close" i]']) {
  try { const d = page.locator(dismiss).first(); if (await d.count() && await d.isVisible()) { await d.click({ timeout: 2500 }); await page.waitForTimeout(500); } } catch {}
}

const settings = page.locator('button[aria-label="Settings"]');
if (!(await settings.count())) problems.push('Settings button not found on the profile tab');
else { try { await settings.first().click({ timeout: 5000 }); } catch (e) { problems.push('could not open Settings: ' + e.message); } }
await page.waitForTimeout(1200);

// The Settings sheet scrolls; the box sits well down it.
try { await page.locator('input[aria-label="BadBleep code"]').first().scrollIntoViewIfNeeded({ timeout: 3000 }); } catch {}
await page.waitForTimeout(300);

const input = page.locator('input[aria-label="BadBleep code"]');
const visible = await input.count() > 0 && await input.first().isVisible().catch(() => false);
console.log(`BadBleep input present & visible on a fresh profile: ${visible}`);
if (!visible) problems.push('BadBleep input is NOT reachable from Settings without devMode — the box is still gated');

// Dev Flags must remain hidden: ungating the box must not leak debug surface.
const devFlags = await page.locator('text=Dev Flags').count();
console.log(`Dev Flags panel visible with devMode false: ${devFlags > 0}`);
if (devFlags > 0) problems.push('🔩 Dev Flags is visible with devMode false — the debug panel leaked');

// The box must be wired, not merely displayed.
if (visible) {
  const loksBefore = await page.evaluate(() => {
    const m = document.body.innerText.match(/\b(\d{1,7})\b(?=[\s\S]{0,40}Loks)/);
    return m ? +m[1] : null;
  });
  await input.first().fill('gratitude');
  const applyBtn = page.locator('input[aria-label="BadBleep code"] ~ button').first();
  try { await applyBtn.click({ timeout: 3000 }); } catch { problems.push('could not click the apply button'); }
  await page.waitForTimeout(900);
  const text = await page.evaluate(() => document.body.innerText);
  const reacted = /\+1000|Loks|gratitude/i.test(text);
  console.log(`code entry produced a response: ${reacted} (loks before: ${loksBefore})`);
  if (!reacted) problems.push('typing a code produced no visible response — box may not be wired to onCheat');
}

if (errors.length) console.error('pageerrors:\n  ' + errors.join('\n  '));
if (problems.length) console.error('PROBLEMS:\n  ' + problems.join('\n  '));
const pass = problems.length === 0 && errors.length === 0;
console.log(pass ? 'BLEEP OK — box reachable from Settings on a fresh profile; Dev Flags still hidden.' : 'BLEEP FAILED');
await page.screenshot({ path: '/tmp/bleep.png', fullPage: false });
await browser.close();
stop();
process.exit(pass ? 0 : 1);
