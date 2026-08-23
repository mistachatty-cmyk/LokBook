// Rendering budgets for the metres-scale street scene.
//
// WHY THIS IS SEPARATE FROM deviceTier.js
// ---------------------------------------
// `deviceTier.js` sizes the *brush* engine. Its numbers are about how many
// Canvas2D dabs a device can stamp per stroke; none of them mean anything to a
// WebGL scene with shadow maps and a few thousand extruded meshes. Sharing that
// table would have meant one of the two features quietly getting budgets tuned
// for the other. What IS shared is the tier *decision* — `deviceQuality()` has
// already probed this device, so we reuse its answer rather than probing twice.
//
// Same rule as everywhere else in this app: a budget is a RENDERING choice,
// never an availability one. Every tier can enter street mode, see real
// buildings, and paint on them. A low tier draws less of the city at once and
// turns the expensive ambience off by default — it is not a paywall and it is
// not a lockout.

import { deviceQuality } from "./deviceTier.js";

export const MAP_QUALITY = {
  low: {
    tier: "low",
    label: "Battery Saver",
    blurb: "Fewer buildings, no shadows. Kindest to phones.",
    drawDistance: 350,        // metres; also the far plane and fog end
    maxBuildings: 500,
    shadows: false,
    shadowMapSize: 0,
    ambientMotion: false,     // default only — the toggle still works
    maxCars: 0,
    clouds: false,
    dprCap: 1.5,
    antialias: false,
    roads: true,
  },
  mid: {
    tier: "mid",
    label: "Balanced",
    blurb: "A full block of city with soft shadows.",
    drawDistance: 700,
    maxBuildings: 1500,
    shadows: true,
    shadowMapSize: 1024,
    ambientMotion: true,
    maxCars: 18,
    clouds: true,
    dprCap: 2,
    antialias: true,
    roads: true,
  },
  high: {
    tier: "high",
    label: "Full Detail",
    blurb: "Everything on. Deep draw distance, crisp shadows.",
    drawDistance: 1400,
    maxBuildings: 4000,
    shadows: true,
    shadowMapSize: 2048,
    ambientMotion: true,
    maxCars: 48,
    clouds: true,
    dprCap: 2.5,
    antialias: true,
    roads: true,
  },
};

export const MAP_QUALITY_TIERS = ["low", "mid", "high"];
const STORAGE_KEY = "lok_map_quality";

/** The user's explicit choice, or null for "match my device". */
export function mapQualityOverride() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return MAP_QUALITY[v] ? v : null;
  } catch { return null; }
}

export function setMapQualityOverride(tier) {
  try {
    if (tier && MAP_QUALITY[tier]) localStorage.setItem(STORAGE_KEY, tier);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* private mode: the auto tier still applies */ }
}

/** The budget to actually render with. An explicit override always wins —
 *  someone on a fast phone who wants battery life is not second-guessed. */
export function mapQuality() {
  const forced = mapQualityOverride();
  if (forced) return { ...MAP_QUALITY[forced], source: "user" };
  let tier = "mid";
  try { tier = deviceQuality()?.tier || "mid"; } catch { /* probe unavailable */ }
  return { ...(MAP_QUALITY[tier] || MAP_QUALITY.mid), source: "device" };
}
