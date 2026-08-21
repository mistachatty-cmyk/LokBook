// Tip renderers and texture patterns for the Pro brush engine.
//
// A "tip" draws ONE dab, centred at the origin of an already-transformed
// context. The engine owns placement, rotation, roundness, opacity and colour;
// a tip only decides what the mark looks like. That split is what lets every
// existing LokBook brush inherit the full dynamics stack for free.
//
// Two families live here:
//   1. Geometric tips (round, square, ...) — Photoshop's built-ins.
//   2. Adapters over engine/brushes.js — spray, glow, watercolour, calligraphy,
//      neon, sparkle, grain, crayon, wash, galaxy. These are the brushes Studio
//      already ships; wrapping them as tips is the whole payoff of extracting
//      them out of Easel.jsx.

import * as Brushes from "./brushes.js";

// --- Geometric tips ---------------------------------------------------------
// Drawn centred on (0,0) at radius `r`, because the engine has already applied
// translate/rotate/scale for position, angle and roundness.

function roundTip(ctx, r, { hardness = 0.8, color }) {
  if (hardness >= 0.999) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    return;
  }
  // Hardness is the fraction of the radius that stays fully opaque before the
  // falloff starts — the same mental model as Photoshop's slider.
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(Math.max(0, Math.min(0.999, hardness)), color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
}

function squareTip(ctx, r, { hardness = 0.8, color }) {
  if (hardness >= 0.999) {
    ctx.fillStyle = color;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    return;
  }
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  const edge = (1 - hardness) * 0.5;
  g.addColorStop(0, "transparent");
  g.addColorStop(edge, color);
  g.addColorStop(1 - edge, color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
}

// A chisel/nib tip — flat on two sides, which is what makes calligraphic
// thick/thin transitions read correctly when bound to `direction`.
function chiselTip(ctx, r, { color }) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.35);
  ctx.lineTo(r, -r * 0.35);
  ctx.lineTo(r, r * 0.35);
  ctx.lineTo(-r, r * 0.35);
  ctx.closePath();
  ctx.fill();
}

// Adapts an engine/brushes.js stamp into a tip. Those functions take absolute
// (x, y) and read `size` as a diameter-ish value, so we hand them the origin
// and the dab's own size — the engine's transform does the rest.
const adapt = fn => (ctx, r, { color, pressure, legacy, customParams }) =>
  fn(ctx, 0, 0, { color, size: r * 2, pressure, legacy, customParams, tool: "pen", brush: "pro" });

export const TIP_RENDERERS = {
  round: roundTip,
  square: squareTip,
  chisel: chiselTip,
  spray: adapt(Brushes.sprayAt),
  glow: adapt(Brushes.glowAt),
  watercolor: adapt(Brushes.watercolorAt),
  calligraphy: adapt(Brushes.calligraphyAt),
  neon: adapt(Brushes.neonAt),
  sparkle: adapt(Brushes.sparkleAt),
  grain: adapt(Brushes.grainAt),
  crayon: adapt(Brushes.crayonAt),
  wash: adapt(Brushes.washAt),
  galaxy: adapt(Brushes.galaxyAt),
  custom: adapt(Brushes.customAt),
};

export const TIP_KEYS = Object.keys(TIP_RENDERERS);

/** Draw one dab. Returns false if the tip id doesn't resolve, so callers (and
 *  the verify gate) can tell "drew nothing" from "drew something". */
export function renderTip(ctx, src, r, params) {
  const fn = TIP_RENDERERS[src];
  if (!fn) return false;
  fn(ctx, r, params);
  return true;
}

// --- Texture patterns -------------------------------------------------------
// Generated procedurally and memoised, same pattern as brushes.js's grain tile:
// no image assets, no network, no build step.
//
// Note ROTATION_PAPERS in engine/rotation.js are CSS background-image STRINGS,
// not bitmaps — they cannot be sampled per-dab, which is why texture tiles get
// their own generator here rather than reusing that table.

const tileCache = new Map();

const PATTERN_BUILDERS = {
  canvas: (ctx, s) => {
    // Woven canvas: interleaved warp/weft bands.
    ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, s, s);
    const step = Math.max(3, Math.round(s / 16));
    for (let i = 0; i < s; i += step * 2) {
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(i, 0, step, s);
      ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(0, i, s, step);
    }
  },
  noise: (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.random() * 165;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  },
  rough: (ctx, s) => {
    // Coarse paper tooth: clustered blobs rather than per-pixel hash.
    ctx.fillStyle = "#9a9a9a"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s * 3; i++) {
      const v = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.05 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 0.6 + Math.random() * (s / 20), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  crosshatch: (ctx, s) => {
    ctx.fillStyle = "#b0b0b0"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = Math.max(1, s / 48);
    const gap = Math.max(4, s / 10);
    for (let i = -s; i < s * 2; i += gap) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + s, 0); ctx.lineTo(i, s); ctx.stroke();
    }
  },
  stipple: (ctx, s) => {
    ctx.fillStyle = "#c8c8c8"; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (let i = 0; i < s * 1.5; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 0.5 + Math.random() * (s / 64), 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

export const TEXTURE_PATTERNS = ["none", ...Object.keys(PATTERN_BUILDERS)];

/** A greyscale tile for the given pattern at the given resolution, memoised.
 *  Returns null for "none" (and for an unknown id, so the gate can catch it). */
export function getTextureTile(pattern, res = 128) {
  if (!pattern || pattern === "none") return null;
  const builder = PATTERN_BUILDERS[pattern];
  if (!builder) return null;
  const key = `${pattern}|${res}`;
  if (tileCache.has(key)) return tileCache.get(key);
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = res; cv.height = res;
  builder(cv.getContext("2d"), res);
  tileCache.set(key, cv);
  return cv;
}
