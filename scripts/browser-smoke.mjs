// Browser smoke test: launches the built app in headless Chromium and drives
// the core flows. Fails on any page error or console error.
// Usage: node scripts/browser-smoke.mjs [url]   (default http://localhost:5173)
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5173";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

const fail = msg => { console.error("BROWSER SMOKE FAIL — " + msg); if (errors.length) console.error(errors.join("\n")); process.exit(1); };

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const loaderText = await page.textContent("body");
if (!loaderText.includes("loading your ink")) fail("loader screen missing");

// loader must resolve to the app (nav appears)
const t0 = Date.now();
await page.waitForSelector("nav", { timeout: 15000 }).catch(() => fail("app never became ready"));
const readyMs = Date.now() - t0;
if (readyMs < 3000) fail(`loader resolved too fast (${readyMs}ms — should hold ~3.5s)`);

// dismiss first-run onboarding
const skip = await page.$("text=skip");
if (skip) { await skip.click({ force: true }); await page.waitForTimeout(300); }

// visit every tab
for (const label of ["Go to Feed", "Go to You", "Go to Studio", "Go to Battle", "Go to Rush", "Go to Rooms", "Go to Shop"]) {
  const b = await page.$(`button[aria-label="${label}"]`);
  if (!b) fail(`nav button missing: ${label}`);
  await b.click();
  await page.waitForTimeout(350);
  const body = await page.textContent("body");
  if (body.trim().length < 20) fail(`white screen on ${label}`);
}

// draw a stroke and capture two pages in Studio
await page.click('button[aria-label="Go to Studio"]');
await page.waitForTimeout(400);
const canvas = await page.$("canvas");
if (!canvas) fail("no canvas in Studio");
const box = await canvas.boundingBox();
await page.mouse.move(box.x + 20, box.y + 20);
await page.mouse.down();
await page.mouse.move(box.x + 80, box.y + 80, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(200);
const cap = await page.$('button[aria-label^="Capture page"]');
if (!cap) fail("no capture button");
await cap.click(); await page.waitForTimeout(400);
await cap.click(); await page.waitForTimeout(400);

if (errors.length) fail("console/page errors detected");
console.log(`BROWSER SMOKE OK — ready in ${readyMs}ms, 7 tabs, draw+capture, 0 errors`);
await browser.close();
