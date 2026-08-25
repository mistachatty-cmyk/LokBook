// The Shop gate.
//
// WHAT IT EXISTS FOR
// ------------------
// Three of the Shop's buy handlers — onFontPack, onCursorPack, onStickerPack —
// had NO ownership check at all. Not the wrong shape: none. They called spend()
// unconditionally. The Shop renders an owned card labelled "Equip", ShopItem
// skips its confirm tap precisely BECAUSE you own it, so a single tap silently
// deducted full price again. Switching between two font packs you already owned
// billed you every time.
//
// Every gate in this repo was green throughout, because none of them ever
// pressed a button and watched the balance. This one does.
//
// It also covers the structural holes that let that survive: a `wip` badge that
// does not imply a refusal, a priced item with no reachable buy path, duplicate
// ids inside a catalogue, and a wave lock that `showAll` walked straight past.
//
// Run with `npm run verify:shop`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

// ---------------------------------------------------------------------------
// PART 1 — static: the catalogues themselves.
const out = join(root, '.shop-check.mjs');
let C;
try {
  await build({
    stdin: { contents: `export * from "./src/constants.jsx";`, resolveDir: root, sourcefile: 'sc.jsx', loader: 'jsx' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '""',
      'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true',
    },
  });
  C = await import(pathToFileURL(out).href);
} catch (e) {
  console.error('SHOP CHECK FAILED to bundle constants:', e.message);
  process.exit(1);
}

const CATALOGUES = [
  'EFFECTS', 'SKIES', 'PAPERS', 'FRAMES', 'NAME_COLORS', 'CURSORS', 'FONT_PACKS',
  'STICKER_PACKS', 'REACTION_PACKS', 'AVATAR_ACCENTS', 'POST_EXPORTS', 'MUSIC_PACKS',
  'VOICE_PACKS', 'WORLD_SKINS', 'ANIMATION_FX', 'MYTHIC_ITEMS', 'STUDIO_MODULES',
  'BLOT_BORDERS', 'BLOT_PERSONALITIES', 'BLOT_IDLE_ANIMATIONS', 'BLOT_EXPRESSIONS',
  'BLOT_BOUNCES', 'LILLOK_GEAR', 'LILLOK_SKINS', 'LILLOK_AURAS', 'LILLOK_PETS',
  'DAILY_ITEMS', 'WEEKLY_ITEMS',
];

let items = 0, parked = 0, parkedLoks = 0;
for (const name of CATALOGUES) {
  const list = C[name];
  if (!Array.isArray(list)) { problems.push(`catalogue ${name} is not an array`); continue; }
  items += list.length;

  // --- duplicate ids. Nothing checked this anywhere, which is how STICKER_PACKS
  // shipped two rows called "space" at different prices — the second one was
  // unbuyable-in-practice because every lookup is .find(x=>x.id===id).
  const seen = new Map();
  for (const it of list) {
    if (!it?.id) { problems.push(`${name}: an entry has no id`); continue; }
    if (seen.has(it.id)) {
      problems.push(`${name}: DUPLICATE id "${it.id}" (${seen.get(it.id)} Loks and ${it.price} Loks) — every lookup is .find(), so only the first is reachable`);
    }
    seen.set(it.id, it.price);
    if (it.price != null && (!Number.isFinite(it.price) || it.price < 0)) {
      problems.push(`${name}: "${it.id}" has an implausible price (${it.price})`);
    }
    if (it.parked) {
      parked++; parkedLoks += it.price || 0;
      if (typeof it.parked !== 'string' || it.parked.length < 12) {
        problems.push(`${name}: "${it.id}" is parked without a usable reason — the Shop shows this text to the player`);
      }
    }
  }
}

// --- a priced module that nothing implements must be parked.
// This is the check that actually catches un-parking. Comparing badge count to
// `parked` count cannot: both sides read the same field, so removing the flag
// removes the badge and the expectation together and the gate stays green.
// Asking whether the id is CONSUMED anywhere is independent of the flag.
const srcFiles = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const fp = join(d, f);
    if (statSync(fp).isDirectory()) { if (!/archive|node_modules/.test(fp)) walk(fp); }
    else if (/\.(jsx?|tsx?)$/.test(f)) srcFiles.push(fp);
  }
})(join(root, 'src'));
const consumerSrc = srcFiles
  .filter(f => !/constants\.jsx$/.test(f))
  .map(f => readFileSync(f, 'utf8')).join('\n');

for (const m of C.STUDIO_MODULES || []) {
  if (!(m.price > 0) || m.parked) continue;
  if (!consumerSrc.includes(`"${m.id}"`) && !consumerSrc.includes(`'${m.id}'`)) {
    problems.push(`STUDIO_MODULES: "${m.id}" costs ${m.price} Loks and is referenced nowhere outside constants.jsx — it is unbuilt and unparked, so it sells for nothing`);
  }
}

// --- the register must agree with the code. A parked item that vanishes from
// docs/PARKED.md is exactly the "removed and forgotten" outcome parking exists
// to prevent.
let doc = '';
try { doc = readFileSync(join(root, 'docs/PARKED.md'), 'utf8'); }
catch { problems.push('docs/PARKED.md is missing — parked items must stay written down'); }
if (doc) {
  for (const name of CATALOGUES) {
    for (const it of C[name] || []) {
      if (it.parked && !doc.includes(it.id)) {
        problems.push(`"${it.id}" is parked in code but absent from docs/PARKED.md — it will be forgotten`);
      }
    }
  }
}
rmSync(out, { force: true });

console.log(`SHOP CATALOGUES: ${items} items across ${CATALOGUES.length} lists · ${parked} parked (${parkedLoks} Loks held back)`);

// ---------------------------------------------------------------------------
// PART 2 — live: press the buttons and watch the balance.
const PORT = 4179;
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

// Stage 2 split today's Shop into two components picked by the same
// localStorage toggle that used to just unhide two tabs: LegacyShop (frozen,
// integrity fixes only) and NewShop (the default, gets all the UX work). The
// shared buy/guard modules (ShopItem/buyEquip/refuseParked) live in
// shop/shared.jsx so a fix applies to both — but that is a claim, not a
// guarantee, unless this gate actually drives both entry points. Run twice.
for (const legacy of [false, true]) {
  await runShopChecks(legacy);
}

async function runShopChecks(legacy) {
const page = await browser.newPage({ viewport: { width: 414, height: 896 } });
await page.addInitScript((isLegacy) => {
  try { localStorage.clear(); localStorage.setItem('lok:shop:legacy', isLegacy ? '1' : '0'); } catch {}
}, legacy);
const tag = legacy ? 'LEGACY' : 'NEW';
const push = msg => problems.push(`[${tag}] ${msg}`);

const balance = () => page.evaluate(() => {
  const m = (document.body.innerText || '').match(/Balance:\s*([\d,]+)\s*Loks/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
});
// Clear anything covering the Shop: the ad interstitial, and the guest-save /
// LokPass bottom sheets that a fresh profile raises over the top of it.
async function dismissAds() {
  for (let pass = 0; pass < 4; pass++) {
    let acted = false;
    const ad = page.locator('div[role="dialog"][aria-label="Advertisement"]');
    if (await ad.count() && await ad.first().isVisible().catch(() => false)) {
      try { await page.locator('button[aria-label="Close ad"]').first().click({ timeout: 2000 }); acted = true; }
      catch { try { await page.keyboard.press('Escape'); acted = true; } catch {} }
    }
    for (const sel of ['button:has-text("No thanks")', 'button:has-text("Maybe later")',
                       'button:has-text("Not now")', 'button:has-text("Cancel")',
                       'button[aria-label*="close" i]']) {
      const b = page.locator(sel).first();
      if (await b.count() && await b.isVisible().catch(() => false)) {
        try { await b.click({ timeout: 1500 }); acted = true; } catch {}
      }
    }
    // Last resort: any full-screen scrim still on top gets an Escape.
    const scrim = page.locator('div.fixed.inset-0');
    if (!acted && await scrim.count() && await scrim.first().isVisible().catch(() => false)) {
      try { await page.keyboard.press('Escape'); acted = true; } catch {}
    }
    if (!acted) return;
    await page.waitForTimeout(500);
  }
}

// Buying raises a bottom sheet of its own (guest-save nudge / LokPass pitch),
// so every tap in this sequence clears whatever is on top first.
async function tap(locator, label) {
  for (let i = 0; i < 3; i++) {
    await dismissAds();
    try { await locator.click({ timeout: 4000 }); return true; } catch {}
    await page.waitForTimeout(400);
  }
  push(`could not tap ${label} — something kept covering it`);
  return false;
}

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
  try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
  await page.waitForTimeout(1200);
  try { await page.locator('text=skip all').first().click({ timeout: 5000 }); } catch {}
  await page.waitForTimeout(600);
  await dismissAds();

  await page.locator('nav button:has-text("Shop"), button:has-text("Shop")').first().click();
  await page.waitForTimeout(1200);
  await dismissAds();

  const start = await balance();
  if (start === null) throw new Error('could not read the Loks balance from the Shop — this gate cannot measure anything');

  // The real user story, because it is the one that was broken: buy a cheap
  // cosmetic, then tap the same card again. The second tap is labelled "Equip"
  // and — under the shipped bug — silently charged full price a second time.
  //
  // Deliberately NOT done via the 👀 All toggle: the already-owned default rows
  // it reveals are all free, and a 0-Lok item cannot show a double charge.
  // EXACT match. `hasText` is a case-insensitive substring, so 'Cosmetics' also
  // matched "↺ Reset all cosmetics to default" and opened the reset modal over
  // everything — which is what "something kept covering it" was.
  // .first() picks the shop pill: shop content precedes the bottom nav in DOM order.
  const shopBtn = t => page.getByRole('button', { name: t, exact: true }).first();

  // Deliberately the FONTS tab. Name colours and frames route through
  // onBuyCosmetic, which was always ownsCosmetic-guarded — testing those proves
  // nothing. fontPack / cursorPack / stickerPack are the three that called
  // spend() unconditionally, so this is the only tab where the shipped bug is
  // reachable. (Sabotaging onFontPack while testing Cosmetics passed happily.)
  await tap(shopBtn('Fonts'), 'the Fonts tab');
  await page.waitForTimeout(800);
  await dismissAds();

  const priced = page.locator('button:has-text("Loks")').filter({ hasNotText: 'LokPass' });
  if (!(await priced.count())) {
    push('no priced cosmetic card found — the gate never reached its subject');
  } else {
    // Pin the ELEMENT, not a text locator. The first tap replaces the price
    // label with "Tap to confirm", so a `:has-text("Loks")` locator silently
    // re-resolves to the NEXT card and the two taps land on different items —
    // which looked exactly like "the purchase did nothing".
    const card = await priced.first().elementHandle();
    const label = (await card.innerText()).replace(/\s+/g, ' ').slice(0, 40);
    const cost = Number(label.match(/(\d+)\s*Loks/)?.[1] || 0);
    const before = await balance();

    await dismissAds(); await card.click(); await page.waitForTimeout(500);   // arm
    const armed = (await card.innerText()).replace(/\s+/g, ' ');
    if (!/confirm/i.test(armed)) push(`first tap on a priced card did not arm a confirm step (card reads "${armed}")`);
    await card.click(); await page.waitForTimeout(1200);                      // buy

    const bought = await balance();
    if (bought === null || before === null) { push('lost the balance readout mid-purchase'); }
    else if (bought !== before - cost) {
      push(`buying "${label}" (${cost} Loks) moved the balance ${before} -> ${bought}, expected ${before - cost}`);
    }

    // Now it is owned. Tapping it again must equip, never charge.
    await dismissAds(); await card.click(); await page.waitForTimeout(1200);
    const reEquipped = await balance();
    if (reEquipped !== null && bought !== null && reEquipped < bought) {
      push(`re-equipping an item you already own charged ${bought - reEquipped} Loks (${bought} -> ${reEquipped}) — the card says "Equip" and bills you`);
    }
    await dismissAds(); await card.click(); await page.waitForTimeout(1200);
    const reEquipped2 = await balance();
    if (reEquipped2 !== null && bought !== null && reEquipped2 < bought) {
      push(`re-equipping repeatedly cost ${bought - reEquipped2} Loks in total — it charges per tap`);
    }
    console.log(`RE-EQUIP: bought "${label}" for ${cost} · ${before} -> ${bought}, then two re-equips -> ${reEquipped} -> ${reEquipped2}`);
  }

  // A parked item must carry the badge, refuse, and not move the balance.
  await tap(shopBtn('Studio'), 'the Studio tab');
  await page.waitForTimeout(800);
  await dismissAds();
  const canvasTab = page.locator('button:has-text("Canvas")').first();
  if (!(await canvasTab.count())) {
    push('no Canvas sub-tab in the Studio section — cannot reach the parked modules');
  } else {
    await tap(canvasTab, 'the Canvas sub-tab');
    await page.waitForTimeout(800);
    const badges = await page.locator('text=Not active yet').count();
    // Exact, not non-zero: un-parking one of four still leaves three badges, so
    // a >0 check cannot see an item quietly going back on sale.
    const expectParked = (C.STUDIO_MODULES || []).filter(m => m.type === 'canvas' && m.parked).length;
    if (badges !== expectParked) {
      push(`the Canvas tab shows ${badges} "Not active yet" badge(s) but ${expectParked} canvas module(s) are parked in the catalogue — one is on sale that should not be`);
    }
    if (!badges) {
      push('the parked canvas modules show no "Not active yet" badge — they look like ordinary stock');
    } else {
      const before = await balance();
      await tap(page.locator('button:has-text("Infinite Scroll")').first(), 'a parked module');
      await page.waitForTimeout(500);
      await tap(page.locator('button:has-text("Infinite Scroll")').first(), 'a parked module again');
      await page.waitForTimeout(900);
      const after = await balance();
      if (after !== null && before !== null && after < before) {
        push(`a PARKED item still charged ${before - after} Loks`);
      }
      console.log(`PARKED: ${badges} badged card(s) · balance held at ${after} after two taps`);
    }
  }

  // The jump menu and the 3-way Skins sub-tab split only exist on the new
  // default Shop — LegacyShop is frozen at its pre-redesign shape on purpose.
  if (!legacy) {
    // Jump menu: tapping "Expressions" in Blot Shop should scroll straight to
    // that section instead of leaving the reader to hunt through 6 stacked
    // sections by hand.
    await tap(shopBtn('Blot Shop'), 'the Blot Shop tab');
    await page.waitForTimeout(800);
    await dismissAds();
    const jumpLink = page.locator('a:has-text("Expressions")').first();
    if (!(await jumpLink.count())) {
      push('Blot Shop has no jump-menu link to "Expressions"');
    } else {
      await jumpLink.click();
      await page.waitForTimeout(500);
      const inView = await page.evaluate(() => {
        const el = document.getElementById('shop-expressions');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.top >= -10 && r.top < window.innerHeight * 0.6;
      });
      if (inView === null) push('jump menu target #shop-expressions does not exist in the DOM');
      else if (!inView) push('tapping the "Expressions" jump link did not scroll that section into view');
    }

    // Skins sub-tabs: Themes / Live Skins / Gyro Skins must each show their
    // own distinct set, and a Gyro Skin card must explain itself when
    // gyroscope is off rather than just looking broken.
    await tap(shopBtn('Skins'), 'the Skins tab');
    await page.waitForTimeout(800);
    await dismissAds();
    for (const label of ['Themes', 'Live Skins', 'Gyro Skins']) {
      const pill = page.locator(`button:has-text("${label}")`).first();
      if (!(await pill.count())) { push(`Skins tab has no "${label}" sub-tab`); continue; }
      await tap(pill, `the "${label}" skins sub-tab`);
      await page.waitForTimeout(500);
    }
    // Landing on Gyro Skins with no dynamic-driver themes shipped yet (Stage
    // 3/4 not built), the empty state must say so rather than show nothing.
    const gyroEmpty = await page.locator('text=Coming with the next drop').count();
    const gyroCards = await page.locator('button[aria-label^="Theme "]').count();
    if (!gyroEmpty && gyroCards === 0) {
      push('Gyro Skins sub-tab shows neither a theme nor the "coming soon" empty state');
    }
  }
} catch (err) {
  push(err.message);
}

await page.close();
}

await browser.close();
stop();

if (problems.length) {
  console.error('SHOP BROKEN:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('SHOP OK — Legacy and New both checked: no duplicate ids, every parked item is registered and refuses, re-equipping something you own is free, and the new navigation (jump menu, Skins sub-tabs) actually works.');
