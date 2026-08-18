// Proves the waitlist actually captures an email — end to end, from the entry
// point a person can reach, to a real POST carrying the address they typed.
//
// "The component renders" is not the same as "an email was captured". This
// repo has shipped that exact gap twice: the BadBleep box rendered perfectly
// while being unreachable, and vector capture worked in isolation while
// nothing ever called it. A waitlist that silently records nothing is the same
// failure with a worse consequence — you don't find out until launch day, and
// by then the signups are gone.
//
// So this drives the real app in a real browser and asserts on the request:
//   1. the Settings waitlist button is reachable on a fresh profile,
//   2. typing an email and submitting POSTs /api/waitlist,
//   3. the POST body carries that exact email (not a placeholder, not empty),
//   4. a 200 flips the dialog to its confirmed state,
//   5. a failing endpoint surfaces a real error instead of a false success —
//      the case that matters, since a silent failure looks identical to a
//      working waitlist from the outside.
//
// The endpoint is STUBBED. `vite preview` serves static files only and never
// runs api/*.js, so without a stub there is nothing to POST to and the gate
// would pass vacuously — the trap verify:payload already fell into once.
//
// Run with `npm run verify:waitlist`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4182;
const TEST_EMAIL = 'gate-probe@example.com';
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
const problems = [];
const errors = [];

// `fail` drives the second pass: same journey, endpoint returns 502.
async function run({ fail }) {
  const page = await browser.newPage({ viewport: { width: 414, height: 900 } });
  page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));
  const posts = [];

  await page.route('**/api/waitlist', async route => {
    const req = route.request();
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch {}
    posts.push({ method: req.method(), body });
    if (fail) return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'delivery_failed' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, notified: true, recorded: true }) });
  });

  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
  try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
  await page.waitForTimeout(1200);
  try { await page.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
  await page.waitForTimeout(700);
  try { await page.locator('nav button:has-text("You"), button:has-text("You")').first().click({ timeout: 5000 }); } catch {}
  await page.waitForTimeout(800);
  for (const dismiss of ['text=No thanks', 'button[aria-label*="close" i]']) {
    try { const d = page.locator(dismiss).first(); if (await d.count() && await d.isVisible()) { await d.click({ timeout: 2500 }); await page.waitForTimeout(400); } } catch {}
  }

  const settings = page.locator('button[aria-label="Settings"]');
  if (!(await settings.count())) { problems.push('Settings button not found on the profile tab'); await page.close(); return; }
  try { await settings.first().click({ timeout: 5000 }); } catch (e) { problems.push('could not open Settings: ' + e.message); }
  await page.waitForTimeout(1000);

  const join = page.locator('button:has-text("Join the waitlist")');
  try { await join.first().scrollIntoViewIfNeeded({ timeout: 4000 }); } catch {}
  const reachable = await join.count() > 0 && await join.first().isVisible().catch(() => false);
  if (!fail) console.log(`waitlist entry point reachable in Settings on a fresh profile: ${reachable}`);
  if (!reachable) { problems.push('the Settings waitlist button is NOT reachable on a fresh profile'); await page.close(); return; }
  await join.first().click();
  await page.waitForTimeout(600);

  const input = page.locator('input[aria-label="Email for the waitlist"]');
  if (!(await input.count())) { problems.push('waitlist dialog did not open (no email field)'); await page.close(); return; }
  await input.fill(TEST_EMAIL);
  await page.locator('button:has-text("Join waitlist")').first().click();
  await page.waitForTimeout(1200);

  const text = await page.evaluate(() => document.body.innerText);
  const confirmed = /You're on the list/i.test(text);
  await page.close();
  return { posts, confirmed, text };
}

// --- Pass 1: happy path -----------------------------------------------------
const ok = await run({ fail: false });
if (ok) {
  console.log(`POSTs to /api/waitlist: ${ok.posts.length}`);
  if (!ok.posts.length) {
    problems.push('submitting the form never POSTed to /api/waitlist — the dialog is not wired to the endpoint');
  } else {
    const p = ok.posts[0];
    console.log(`  method=${p.method} email=${JSON.stringify(p.body.email)} phone=${JSON.stringify(p.body.phone ?? null)} source=${JSON.stringify(p.body.source)}`);
    if (p.method !== 'POST') problems.push(`expected POST, got ${p.method}`);
    if (p.body.email !== TEST_EMAIL) problems.push(`the POST body carried ${JSON.stringify(p.body.email)}, not the typed address — the email is being dropped between the field and the request`);
    if (!p.body.source) problems.push('no `source` in the POST body — signups will not be attributable to an entry point');
  }
  console.log(`dialog reached its confirmed state on 200: ${ok.confirmed}`);
  if (!ok.confirmed) problems.push('a 200 response did not produce the confirmation state — people cannot tell whether they joined');
}

// --- Pass 2: the endpoint fails --------------------------------------------
// A waitlist that reports success while recording nothing is the failure mode
// worth catching: it is invisible until the launch email has nobody to go to.
const bad = await run({ fail: true });
if (bad) {
  const falseSuccess = bad.confirmed;
  const showsError = /Couldn't join|502|try again/i.test(bad.text);
  console.log(`on a 502 — claims success: ${falseSuccess}, shows a real error: ${showsError}`);
  if (falseSuccess) problems.push('a 502 still showed "You\'re on the list" — the app would claim to have captured an email it lost');
  if (!showsError) problems.push('a 502 surfaced no visible error — the failure is silent on the one screen where it matters');
}

if (errors.length) console.error('pageerrors:\n  ' + errors.join('\n  '));
if (problems.length) console.error('PROBLEMS:\n  ' + problems.join('\n  '));
const pass = problems.length === 0 && errors.length === 0;
console.log(pass ? '\nWAITLIST OK — reachable, POSTs the typed address, confirms on success, and fails loudly.' : '\nWAITLIST FAILED');
await browser.close();
stop();
process.exit(pass ? 0 : 1);
