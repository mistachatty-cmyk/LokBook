// The Pro brush engine: spacing-driven dab stamping.
//
// WHY THIS EXISTS
// ---------------
// The classic Easel path stamps once per pointer event. Dab density therefore
// depends on how fast your hand moves, which means jitter, scatter and texture
// can never look right — move slowly and you get a solid smear, flick and you
// get four lonely blobs. Photoshop (and Procreate, and Krita) instead lay dabs
// along the stroke PATH at `spacing% x diameter` intervals, independent of
// input rate. Everything else in Studio Pro sits on top of that one change.
//
// This engine is deliberately deterministic: seeded RNG, arc-length driven, no
// reads of wall-clock time. The same stroke replayed produces the same pixels,
// which is what makes verify:brushengine able to assert on exact dab counts
// instead of eyeballing a screenshot.

import { normalizeSpec, evalChannel, evalBipolar } from "./brushSpec.js";
import { renderTip, getTextureTile } from "./brushTips.js";

// Same LCG as engine/draw.jsx's makeRng, deliberately inlined rather than
// imported: draw.jsx transitively pulls in the Supabase client, and this module
// runs inside the pointermove hot path and inside headless verify scripts that
// have no network. A three-line generator is not worth that dependency.
const makeRng = seed => { let s = seed % 233280; return () => ((s = (s * 9301 + 49297) % 233280), s / 233280); };

/**
 * Per-stroke mutable state. One of these is created on pointerdown and lives
 * until pointerup — it carries the arc-length remainder between segments, which
 * is what keeps spacing continuous ACROSS pointer events rather than resetting
 * at every event boundary (resetting is the subtle bug that reintroduces
 * input-rate dependence while looking correct in a single-segment test).
 */
export function createStrokeState(spec, { seed = 1, quality, fadeLength = 40 } = {}) {
  return {
    spec: normalizeSpec(spec),
    quality,
    rng: makeRng(Math.max(1, Math.floor(seed)) * 7919 + 13),
    carry: 0,          // distance already "used up" toward the next dab
    dabIndex: 0,       // dabs emitted so far this stroke
    totalDabs: 0,
    fadeLength,
    lastAngle: 0,
    textureOffset: null, // fixed per stroke unless texture.eachTip
    clipped: false,    // true if the device quality ceiling truncated the stroke
  };
}

/** Diameter -> spacing distance in px. Never zero, or the walk would not terminate. */
function spacingPx(spec, size) {
  return Math.max(0.5, size * Math.max(0.01, spec.tip.spacing));
}

/**
 * Compute one dab's concrete properties from the spec + live input.
 * Pure apart from advancing the RNG, so it is directly unit-testable.
 */
export function computeDab(state, input, x, y, baseSize, baseColor) {
  const s = state.spec;
  const sd = s.shapeDynamics, sc = s.scattering, cd = s.colorDynamics, tr = s.transfer;

  // --- size -----------------------------------------------------------------
  const sizeMul = evalChannel({ ...sd.sizeJitter, min: sd.minDiameter }, input, state);
  const size = Math.max(0.5, baseSize * sizeMul);

  // --- angle ----------------------------------------------------------------
  // Base tip angle, plus jitter, plus stroke direction when the tip is bound to
  // it (that is what makes a chisel nib behave like a real nib).
  let angle = (s.tip.angle * Math.PI) / 180;
  if (sd.angleJitter.control === "direction") angle += input.direction || 0;
  angle += evalBipolar(sd.angleJitter, input, state) * Math.PI;

  // --- roundness ------------------------------------------------------------
  const roundMul = evalChannel({ ...sd.roundnessJitter, min: sd.minRoundness }, input, state);
  const roundness = Math.max(0.05, s.tip.roundness * roundMul);

  // --- scatter --------------------------------------------------------------
  // Offset perpendicular to travel (and along it, when bothAxes) by up to
  // `scatter` diameters — matching Photoshop, where scatter scales with size.
  let ox = 0, oy = 0;
  if (sc.scatter.amount) {
    const mag = evalBipolar(sc.scatter, input, state) * size * 2;
    const perp = (input.direction || 0) + Math.PI / 2;
    ox = Math.cos(perp) * mag;
    oy = Math.sin(perp) * mag;
    if (sc.bothAxes) {
      const along = evalBipolar(sc.scatter, input, state) * size * 2;
      ox += Math.cos(input.direction || 0) * along;
      oy += Math.sin(input.direction || 0) * along;
    }
  }

  // --- opacity / flow -------------------------------------------------------
  const opacity = Math.max(0, Math.min(1, tr.opacity * evalChannel(tr.opacityJitter, input, state)));
  const flow = Math.max(0, Math.min(1, tr.flow * evalChannel(tr.flowJitter, input, state)));

  // --- colour ---------------------------------------------------------------
  let color = baseColor;
  if (cd.hueJitter.amount || cd.satJitter.amount || cd.brightJitter.amount || cd.purity) {
    color = jitterColor(baseColor, {
      hue: evalBipolar(cd.hueJitter, input, state) * 180,
      sat: evalBipolar(cd.satJitter, input, state),
      bright: evalBipolar(cd.brightJitter, input, state),
      purity: cd.purity,
    });
  }

  // --- flip -----------------------------------------------------------------
  const flipX = s.tip.flipX !== (sd.flipJitter > 0 && state.rng() < sd.flipJitter);
  const flipY = s.tip.flipY !== (sd.flipJitter > 0 && state.rng() < sd.flipJitter * 0.5);

  return { x: x + ox, y: y + oy, size, angle, roundness, opacity, flow, color, flipX, flipY };
}

/** Draw one computed dab onto ctx. */
export function renderDab(ctx, dab, state, input, extra = {}) {
  const s = state.spec;
  const q = state.quality;

  ctx.save();
  ctx.globalCompositeOperation = extra.erase ? "destination-out" : "source-over";
  // Build-up: flow accumulates on overlap instead of each dab sitting flat,
  // which is what makes an airbrush darken when you hover.
  ctx.globalAlpha = s.flags.buildUp ? dab.opacity * dab.flow * 0.55 : dab.opacity * dab.flow;

  ctx.translate(dab.x, dab.y);
  ctx.rotate(dab.angle);
  ctx.scale(dab.flipX ? -1 : 1, (dab.flipY ? -1 : 1) * dab.roundness);

  const drew = renderTip(ctx, s.tip.src, dab.size / 2, {
    hardness: s.tip.hardness,
    color: dab.color,
    pressure: input.pressure ?? 0.5,
    legacy: extra.legacy,
    customParams: extra.customParams,
  });
  ctx.restore();
  if (!drew) return false;

  // --- texture --------------------------------------------------------------
  // Multiplied over the dab we just laid down, clipped to it via source-atop so
  // it only darkens actual paint, never bare paper.
  if (s.texture.pattern !== "none" && !s.flags.protectTexture) {
    const tile = getTextureTile(s.texture.pattern, q ? q.textureRes : 128);
    if (tile) {
      const depth = evalChannel({ ...s.texture.depth, min: s.texture.minDepth }, input, state);
      if (depth > 0.01) {
        if (s.texture.eachTip || !state.textureOffset) {
          state.textureOffset = { x: state.rng() * tile.width, y: state.rng() * tile.height };
        }
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = depth * 0.85;
        const pat = ctx.createPattern(tile, "repeat");
        if (pat) {
          const sc = Math.max(0.05, s.texture.scale);
          const m = typeof DOMMatrix !== "undefined" ? new DOMMatrix() : null;
          if (m && pat.setTransform) {
            pat.setTransform(m.translate(state.textureOffset.x, state.textureOffset.y).scale(sc, sc));
          }
          ctx.fillStyle = pat;
          const r = dab.size;
          ctx.fillRect(dab.x - r, dab.y - r, r * 2, r * 2);
        }
        ctx.restore();
      }
    }
  }

  // --- dual brush -----------------------------------------------------------
  // A second, smaller tip stamped through a blend mode. Gated on the device
  // quality budget rather than on entitlement — a low-end phone with a Pro
  // subscription still gets the brush, just without the second pass.
  if (s.dualBrush.enabled && (!q || q.dualBrush)) {
    ctx.save();
    ctx.globalCompositeOperation = s.dualBrush.mode || "multiply";
    ctx.globalAlpha = dab.opacity * dab.flow * 0.7;
    const n = Math.max(1, Math.round(s.dualBrush.count));
    for (let i = 0; i < n; i++) {
      const sx = (state.rng() * 2 - 1) * dab.size * s.dualBrush.scatter;
      const sy = (state.rng() * 2 - 1) * dab.size * s.dualBrush.scatter;
      ctx.save();
      ctx.translate(dab.x + sx, dab.y + sy);
      ctx.rotate(dab.angle);
      renderTip(ctx, s.dualBrush.tip, (dab.size * s.dualBrush.size) / 2, {
        hardness: s.tip.hardness, color: dab.color, pressure: input.pressure ?? 0.5,
      });
      ctx.restore();
    }
    ctx.restore();
  }

  // --- noise ----------------------------------------------------------------
  if (s.flags.noise) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.18 * dab.opacity;
    const r = dab.size / 2;
    for (let i = 0; i < 8; i++) {
      const a = state.rng() * Math.PI * 2, rr = state.rng() * r;
      ctx.fillStyle = state.rng() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(dab.x + Math.cos(a) * rr, dab.y + Math.sin(a) * rr, 1, 1);
    }
    ctx.restore();
  }

  return true;
}

/**
 * Walk one stroke segment and emit every dab that falls on it.
 *
 * THIS is the spacing walk — the function whose existence the whole plan turns
 * on. `state.carry` persists across calls so spacing stays continuous between
 * pointer events; without it, every event boundary would force a dab and
 * density would silently track input rate again.
 *
 * `emit(dab)` is optional and fires per dab before it is drawn — used by the
 * symmetry wrapper in Easel and by the verify gate to count dabs.
 *
 * Returns the number of dabs drawn.
 */
export function strokeTo(ctx, state, from, to, input, opts = {}) {
  const s = state.spec;
  const q = state.quality;
  const baseSize = opts.size ?? 10;
  const baseColor = opts.color ?? "#000";

  const dx = to[0] - from[0], dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist)) return 0;

  const dir = dist > 0.0001 ? Math.atan2(dy, dx) : state.lastAngle;
  state.lastAngle = dir;
  const liveInput = { ...input, direction: dir };

  const step = spacingPx(s, baseSize);
  const perSegmentCap = q ? q.maxDabsPerSegment : 256;
  let drawn = 0;

  // A zero-length segment still deserves the very first dab of a stroke,
  // otherwise a tap would draw nothing at all.
  if (dist < 0.0001) {
    if (state.dabIndex === 0) {
      drawn += emitAt(ctx, state, liveInput, to[0], to[1], baseSize, baseColor, opts);
    }
    return drawn;
  }

  let travelled = -state.carry;
  while (travelled + step <= dist) {
    travelled += step;
    if (drawn >= perSegmentCap) { state.clipped = true; break; }
    if (q && state.totalDabs >= q.maxDabsPerStroke) { state.clipped = true; break; }
    const t = travelled / dist;
    const px = from[0] + dx * t, py = from[1] + dy * t;
    drawn += emitAt(ctx, state, liveInput, px, py, baseSize, baseColor, opts);
  }
  state.carry = dist - travelled;
  return drawn;
}

// Emits the scatter `count` cluster for a single position on the path.
function emitAt(ctx, state, input, px, py, baseSize, baseColor, opts) {
  const s = state.spec;
  const q = state.quality;
  const capCount = q ? q.maxScatterCount : 16;
  const countMul = evalChannel(s.scattering.countJitter, input, state);
  const n = Math.max(1, Math.min(capCount, Math.round(s.scattering.count * countMul)));

  let drawn = 0;
  for (let i = 0; i < n; i++) {
    const dab = computeDab(state, input, px, py, baseSize, baseColor);
    // Symmetry and any other positional fan-out happens through the callback so
    // the engine never needs to know about Easel's symXY.
    const targets = opts.expand ? opts.expand(dab.x, dab.y) : [[dab.x, dab.y]];
    for (const [tx, ty] of targets) {
      if (renderDab(ctx, { ...dab, x: tx, y: ty }, state, input, opts)) drawn++;
    }
    state.dabIndex++;
    state.totalDabs++;
    opts.onDab?.(dab);
  }
  return drawn;
}

// --- colour helpers ---------------------------------------------------------

function jitterColor(hex, { hue, sat, bright, purity }) {
  const [h, s0, l0] = hexToHsl(hex);
  let h2 = (h + hue + 360) % 360;
  let s2 = clamp01(s0 + sat);
  if (purity) s2 = clamp01(purity > 0 ? s2 + (1 - s2) * purity : s2 * (1 + purity));
  const l2 = clamp01(l0 + bright * 0.5);
  return hslToHex(h2, s2, l2);
}
const clamp01 = n => (n < 0 ? 0 : n > 1 ? 1 : n);

function hexToHsl(hex) {
  let c = String(hex).trim();
  // Tolerate the rgb() strings the eyedropper produces, not just hex.
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  let r, g, b;
  if (m) { r = +m[1] / 255; g = +m[2] / 255; b = +m[3] / 255; }
  else {
    c = c.replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    if (c.length < 6) return [0, 0, 0];
    const n = parseInt(c.slice(0, 6), 16);
    r = ((n >> 16) & 255) / 255; g = ((n >> 8) & 255) / 255; b = (n & 255) / 255;
  }
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = v => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
