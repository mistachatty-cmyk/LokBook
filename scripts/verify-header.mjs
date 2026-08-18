// Proves the top header doesn't crush/overlap its own buttons at phone
// widths — the fix for "closterphobic, buttons on top of each other".
//
// The bug was arithmetic, not cosmetic: the right-hand action cluster (SAFE/
// PASS chip, 3 icon buttons, level block, Loks pill) totalled 300px+ with no
// shrink-0 protection and no overflow handling, against ~340px of usable
// width on a 375-390px phone. Flex's default shrink squashed the fixed-size
// circular buttons until they visually collided. A single-viewport "looks
// fine" screenshot check would miss this entirely, since the whole point is
// it behaves differently at different widths — so this measures real
// getBoundingClientRect() geometry across several widths and asserts:
//   1. no two header buttons overlap,
//   2. no button rendered smaller than its intended floor (nothing got
//      flex-shrunk below size),
//   3. every button is still clickable (not zero-size, not display:none),
//   4. icon buttons remain square (not squeezed on one axis into ovals).
//
// NOTE: Maximal state (verified ✦, PASS chip, 5-digit Loks) requires full
// game progression and can't be measured in a fresh headless profile. This
// gate measures the progressive state from launch onward and would catch
// layout breakage if those elements were added. The overflow-x-auto on the
// cluster + shrink-0 on every item ensures scalability; the checks below
// verify the fix actually prevents compression across different widths.
//
// Run with `npm run verify:header`.
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

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const WIDTHS = [
  { name: 'iPhone SE (375)', width: 375, height: 667, tier: 'phone' },
  { name: 'iPhone 14 (390)', width: 390, height: 844, tier: 'phone' },
  { name: 'iPhone Pro Max (430)', width: 430, height: 932, tier: 'phone' },
  { name: 'tablet (700)', width: 700, height: 900, tier: 'tablet' },
  { name: 'desktop (1200)', width: 1200, height: 900, tier: 'desktop' },
];

let allPass = true;

for (const vp of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const problems = [];
  const errors = [];
  page.on('pageerror', e => errors.push(`${e.name}: ${e.message}`));

  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
  try { await page.locator('button:has-text("Lok In")').click({ timeout: 8000 }); } catch {}
  await page.waitForTimeout(1200);
  try { await page.locator('text=skip all').first().click({ timeout: 4000 }); } catch {}
  await page.waitForTimeout(500);

  const header = page.locator('header').first();
  if (!(await header.count())) { console.log(`[${vp.name}] header not found`); allPass = false; await page.close(); continue; }

  // The right-hand cluster carries its own overflow-x-auto. If it lacks
  // min-width:0, a flex item can ignore that and grow to fit its content
  // anyway — the row would then overflow the PAGE, not scroll internally, and
  // since html/body carry overflow-x:hidden (fixed earlier this session) the
  // spillover is silently clipped: content sits off-screen, unreachable, with
  // no visible scrollbar to find it. Distinguish that from a real internal
  // scroll by checking the cluster's own scrollWidth vs the page's.
  const scrollInfo = await header.evaluate(h => {
    const cluster = [...h.children].find(c => getComputedStyle(c).overflowX === 'auto');
    if (!cluster) return null;
    return {
      clusterScrollW: cluster.scrollWidth, clusterClientW: cluster.clientWidth,
      pageScrollW: document.documentElement.scrollWidth, pageClientW: document.documentElement.clientWidth,
    };
  });
  if (scrollInfo) {
    console.log(`  cluster ${scrollInfo.clusterScrollW}w/${scrollInfo.clusterClientW}c, page ${scrollInfo.pageScrollW}w/${scrollInfo.pageClientW}c`);
    if (scrollInfo.pageScrollW > scrollInfo.pageClientW + 2) {
      problems.push(`page itself overflows horizontally (${scrollInfo.pageScrollW} > ${scrollInfo.pageClientW}) — the button cluster is growing past its flex item instead of scrolling internally, so overflow is silently clipped by overflow-x:hidden rather than reachable by scrolling`);
    }
  }

  // Every direct clickable control in the header: the logo, and every button/
  // badge inside the right-hand cluster.
  const boxes = await header.evaluate(h => {
    const els = [...h.querySelectorAll('button, [aria-label]')];
    return els.map(el => {
      const r = el.getBoundingClientRect();
      return { label: el.getAttribute('aria-label') || el.textContent?.trim()?.slice(0, 20) || '?', x: r.x, y: r.y, w: r.width, h: r.height };
    }).filter(b => b.w > 0 && b.h > 0);
  });

  console.log(`\n[${vp.name}] ${boxes.length} header controls:`);
  for (const b of boxes) console.log(`  ${b.label.padEnd(28)} ${b.w.toFixed(0)}x${b.h.toFixed(0)} @ (${b.x.toFixed(0)},${b.y.toFixed(0)})`);

  // 1. No overlap between any two DISTINCT controls (a button legitimately
  // contains its own icon/label, so only compare siblings, not nested pairs).
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const aContainsB = a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h;
      const bContainsA = b.x <= a.x && b.y <= a.y && b.x + b.w >= a.x + a.w && b.y + b.h >= a.y + a.h;
      if (overlaps(a, b) && !aContainsB && !bContainsA) {
        problems.push(`"${a.label}" overlaps "${b.label}"`);
      }
    }
  }

  // 2. Icon buttons must not be flex-shrunk below their floor. Phone tier
  // targets 40px, tablet/desktop 44px — allow a couple px of border/rounding
  // slack, but not the kind of collapse a shrink bug produces.
  const floor = vp.tier === 'phone' ? 34 : 38;
  const iconButtons = boxes.filter(b => ['Open music player', 'Free rewards', 'Mute sound', 'Enable sound'].some(l => b.label.includes(l)));
  if (iconButtons.length < 3) problems.push(`expected 3 icon buttons, found ${iconButtons.length} — one may be hidden/zero-size`);
  for (const b of iconButtons) {
    if (b.w < floor || b.h < floor) problems.push(`"${b.label}" shrunk to ${b.w.toFixed(0)}x${b.h.toFixed(0)}, floor is ${floor}px`);
    // Flexbox only shrinks along the main axis (width, in a row), never the
    // cross axis — so a button squeezed for space without shrink-0 goes oval
    // (e.g. 40x44) instead of shrinking cleanly, rather than overlapping its
    // neighbour. That distortion is what "buttons on top of each other"
    // actually was: icon glyphs no longer centred in their own circle. The
    // overlap and floor checks above both missed this on the pre-fix header.
    if (Math.abs(b.w - b.h) > 2) problems.push(`"${b.label}" is ${b.w.toFixed(0)}x${b.h.toFixed(0)} — not square, squeezed on one axis only`);
  }

  if (errors.length) problems.push(...errors.map(e => 'pageerror: ' + e));
  console.log(problems.length ? `  PROBLEMS:\n    ${problems.join('\n    ')}` : '  OK');
  if (problems.length) allPass = false;
  await page.close();
}

await browser.close();
stop();
console.log(allPass ? '\nHEADER OK — no overlap, no shrink below floor, at every tested width.' : '\nHEADER FAILED');
process.exit(allPass ? 0 : 1);
