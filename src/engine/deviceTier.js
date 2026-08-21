// Device capability tiering — how much brush engine this machine can actually run.
//
// This is deliberately NOT a paywall and must never be used as one. Access to
// Lok Studio Pro is decided by subscription alone (lokPass || ccTier). This
// module only answers "how hard should we push it", so a cheap phone gets a
// working, calmer version of the same feature instead of a locked door or a
// canvas that drops to 6fps mid-stroke.
//
// viewport.js already tiers by screen SIZE; that says nothing about horsepower
// (a 2016 tablet and a 2025 tablet report the same width). So this measures
// capability directly, and caches the result — the probe costs a few ms and
// nothing about a device's silicon changes between page loads.

const CACHE_KEY = "lok:deviceTier";
const PROBE_VERSION = 1; // bump to force a re-probe after changing the benchmark

// Quality budgets per tier. Every number here is a *rendering* choice, never an
// availability one — each tier can express every BrushSpec in the catalog.
export const QUALITY = {
  low: {
    tier: "low",
    maxDabsPerStroke: 1400,   // hard ceiling so a huge scribble can't wedge the tab
    maxDabsPerSegment: 24,    // per pointer segment; the spacing walk clamps to this
    textureRes: 64,
    livePreview: "static",    // render the preview swatch once, not per slider drag
    dualBrush: false,
    maxScatterCount: 3,
  },
  mid: {
    tier: "mid",
    maxDabsPerStroke: 6000,
    maxDabsPerSegment: 80,
    textureRes: 128,
    livePreview: "throttled",
    dualBrush: false,
    maxScatterCount: 8,
  },
  high: {
    tier: "high",
    maxDabsPerStroke: 20000,
    maxDabsPerSegment: 256,
    textureRes: 256,
    livePreview: "realtime",
    dualBrush: true,
    maxScatterCount: 16,
  },
};

// A short, honest fill-rate probe: how many 64x64 composited draws land in ~8ms.
// Not a synthetic FLOPS number — it exercises the exact 2D canvas path the brush
// engine uses (drawImage + globalAlpha + a transform), so it correlates with the
// thing we actually care about.
function fillRateProbe() {
  if (typeof document === "undefined") return 0;
  try {
    const src = document.createElement("canvas");
    src.width = 64; src.height = 64;
    const sctx = src.getContext("2d");
    const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = g; sctx.fillRect(0, 0, 64, 64);

    const dst = document.createElement("canvas");
    dst.width = 256; dst.height = 256;
    const dctx = dst.getContext("2d");

    const deadline = performance.now() + 8;
    let n = 0;
    while (performance.now() < deadline) {
      for (let i = 0; i < 40; i++) {
        dctx.save();
        dctx.globalAlpha = 0.5;
        dctx.translate((n * 7) % 200, (n * 13) % 200);
        dctx.rotate(n * 0.1);
        dctx.drawImage(src, -16, -16, 32, 32);
        dctx.restore();
        n++;
      }
    }
    return n;
  } catch { return 0; }
}

function classify() {
  if (typeof navigator === "undefined") return "mid";
  const cores = navigator.hardwareConcurrency || 2;
  // deviceMemory is Chromium-only; absent on Safari/Firefox, so it can only ever
  // add confidence, never be required.
  const mem = navigator.deviceMemory || 0;
  const draws = fillRateProbe();

  // Score is deliberately dominated by the measured draw rate — reported core
  // count lies constantly (efficiency cores, throttled tabs, VMs).
  let score = 0;
  if (draws >= 2400) score += 3; else if (draws >= 900) score += 2; else if (draws >= 300) score += 1;
  if (cores >= 8) score += 2; else if (cores >= 4) score += 1;
  if (mem >= 8) score += 2; else if (mem >= 4) score += 1;

  if (score >= 5) return "high";
  if (score >= 2) return "mid";
  return "low";
}

let cached = null;

/**
 * Returns the quality budget for this device. Cached in memory and in
 * localStorage so the probe runs at most once per device per PROBE_VERSION.
 * `prefers-reduced-motion` always wins and pins to `low` — someone who asked
 * the OS for less did not ask for a denser particle field.
 */
export function deviceQuality({ force = false } = {}) {
  if (cached && !force) return cached;

  if (typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cached = QUALITY.low;
    return cached;
  }

  if (!force) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.v === PROBE_VERSION && QUALITY[saved.tier]) {
          cached = QUALITY[saved.tier];
          return cached;
        }
      }
    } catch { /* private mode / disabled storage — just re-probe */ }
  }

  const tier = classify();
  cached = QUALITY[tier];
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: PROBE_VERSION, tier })); } catch {}
  return cached;
}

/** Test/debug hook: pin the tier without touching the real probe or cache. */
export function __setDeviceQualityForTest(tier) {
  cached = QUALITY[tier] || null;
}
