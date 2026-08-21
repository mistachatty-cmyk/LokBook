// BrushSpec — the data schema behind Lok Studio Pro.
//
// A brush is ONE JSON object, not code. This mirrors the cosmetics rule in
// CLAUDE.md: a new brush is a spec row, never a new `if (brush === "...")`
// branch. It also makes brushes shareable (.lokbrush), diffable, and
// validatable, and it is what lets one gate assert that every sellable brush
// resolves to something real.
//
// The sections map one-to-one onto Photoshop's brush panels, because that is
// the vocabulary people already have:
//
//   tip            -> Brush Tip Shape
//   shapeDynamics  -> Shape Dynamics
//   scattering     -> Scattering
//   texture        -> Texture
//   dualBrush      -> Dual Brush
//   colorDynamics  -> Color Dynamics
//   transfer       -> Transfer
//   flags          -> Noise / Wet Edges / Build-up / Smoothing / Protect Texture
//
// ---------------------------------------------------------------------------
// The one abstraction that matters: the CHANNEL.
//
// Every single "jitter" control in Photoshop is the same thing wearing a
// different label — an amount, a driver ("Control:" dropdown), and a floor.
// Size jitter, angle jitter, scatter, opacity jitter, hue jitter: identical
// machinery. So there is exactly one evaluator, and adding a new driver (stylus
// wheel, say) is a row in DYNAMIC_CONTROLS rather than edits in nine places.

/** @typedef {{amount:number, control:string, min:number}} Channel */

export const channel = (amount = 0, control = "off", min = 0) => ({ amount, control, min });

// The drivers a channel can be bound to. Each returns 0..1.
//
// `input`  : live pointer sample { pressure, tiltX, tiltY, twist, velocity, direction }
// `state`  : per-stroke state    { dabIndex, fade, rng }
export const DYNAMIC_CONTROLS = {
  // No modulation — the channel sits at full strength.
  off: () => 1,
  // Stylus pressure. Mouse/touch report a synthesised value (see Easel's dynMul).
  pressure: (input) => clamp01(input.pressure ?? 0.5),
  // How far the pen is leaned over, normalised against 90deg.
  tilt: (input) => clamp01(Math.hypot(input.tiltX || 0, input.tiltY || 0) / 90),
  // Barrel rotation, if the stylus reports it.
  twist: (input) => clamp01(((input.twist || 0) % 360) / 360),
  // Travel direction of the stroke, as a fraction of a full turn. This is what
  // makes a flat calligraphy nib behave like a real nib.
  direction: (input) => clamp01(((input.direction || 0) / (Math.PI * 2)) % 1),
  // Faster stroke -> lower value. Complements pressure on non-stylus input.
  velocity: (input) => clamp01(1 - Math.min(1, (input.velocity || 0) / 3)),
  // Ramps down over the first N dabs of the stroke (Photoshop's "Fade").
  fade: (input, state) => clamp01(1 - state.dabIndex / Math.max(1, state.fadeLength)),
  // Pure per-dab randomness.
  random: (input, state) => state.rng(),
};

const clamp01 = n => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Evaluate one channel to a 0..1 multiplier.
 *
 * `amount` is how much the driver is allowed to pull the value down from 1.
 * `min` is the floor, matching Photoshop's "Minimum Diameter"/"Minimum
 * Roundness" — the value never collapses past it. With amount 0 this returns
 * exactly 1, so an untouched channel is a guaranteed no-op (which is what makes
 * "Pro off == identical pixels" provable).
 */
export function evalChannel(ch, input, state) {
  if (!ch || !ch.amount) return 1;
  const driver = DYNAMIC_CONTROLS[ch.control] || DYNAMIC_CONTROLS.off;
  const d = clamp01(driver(input, state));
  const modulated = 1 - ch.amount * (1 - d);
  const floor = ch.min || 0;
  return floor + (1 - floor) * clamp01(modulated);
}

/**
 * A signed variant for channels that swing both ways around a centre (hue
 * shift, angle jitter, scatter offset) rather than only scaling down.
 * Returns -amount..+amount.
 */
export function evalBipolar(ch, input, state) {
  if (!ch || !ch.amount) return 0;
  const driver = DYNAMIC_CONTROLS[ch.control] || DYNAMIC_CONTROLS.off;
  // A bipolar channel bound to `off` still needs to vary, or "angle jitter 100%
  // / control: off" would be inert — which is exactly the dead-knob failure
  // mode verify:brushspec exists to catch. Unbound means random.
  const d = ch.control === "off" ? state.rng() : clamp01(driver(input, state));
  return (d * 2 - 1) * ch.amount;
}

// ---------------------------------------------------------------------------
// The spec itself.

/** Every field, with the values that make the engine a no-op. */
export const DEFAULT_SPEC = {
  id: "pro_default",
  name: "Pro Round",
  version: 1,

  tip: {
    src: "round",        // 'round' | 'square' | any key in brushTips.TIP_RENDERERS
    hardness: 0.8,       // 0 = fully soft falloff, 1 = hard edge
    angle: 0,            // degrees
    roundness: 1,        // 1 = circular, 0.1 = a flat nib
    spacing: 0.25,       // fraction of diameter between dabs. THE core setting.
    flipX: false,
    flipY: false,
  },

  shapeDynamics: {
    sizeJitter: channel(0, "off", 0),
    minDiameter: 0.1,
    angleJitter: channel(0, "off", 0),
    roundnessJitter: channel(0, "off", 0),
    minRoundness: 0.25,
    flipJitter: 0,       // 0..1 chance per dab of mirroring the tip
  },

  scattering: {
    scatter: channel(0, "off", 0),
    bothAxes: true,
    count: 1,
    countJitter: channel(0, "off", 0),
  },

  texture: {
    pattern: "none",     // key in brushTips.TEXTURE_PATTERNS
    scale: 1,
    depth: channel(1, "off", 0),
    minDepth: 0,
    mode: "multiply",
    invert: false,
    eachTip: false,      // re-sample the texture per dab rather than per stroke
  },

  dualBrush: {
    enabled: false,
    tip: "round",
    mode: "multiply",
    size: 0.5,           // relative to the primary tip
    spacing: 0.5,
    scatter: 0,
    count: 1,
  },

  colorDynamics: {
    hueJitter: channel(0, "off", 0),
    satJitter: channel(0, "off", 0),
    brightJitter: channel(0, "off", 0),
    purity: 0,           // -1 fully desaturated .. +1 fully saturated
    applyPerTip: true,
  },

  transfer: {
    opacityJitter: channel(0, "off", 0),
    flowJitter: channel(0, "off", 0),
    opacity: 1,
    flow: 1,
  },

  flags: {
    noise: false,
    wetEdges: false,
    buildUp: false,      // overlapping dabs accumulate rather than sitting flat
    smoothing: true,
    protectTexture: false,
  },
};

/** Deep-merge a partial spec onto the defaults. Unknown keys are preserved so a
 *  newer .lokbrush opened in an older build degrades instead of exploding. */
export function normalizeSpec(partial = {}) {
  const out = { ...DEFAULT_SPEC, ...partial };
  for (const section of ["tip", "shapeDynamics", "scattering", "texture", "dualBrush", "colorDynamics", "transfer", "flags"]) {
    out[section] = { ...DEFAULT_SPEC[section], ...(partial[section] || {}) };
  }
  return out;
}

/**
 * True when a spec asks for nothing the classic path doesn't already do. The
 * Pro render path checks this so that opening the panel and touching nothing
 * cannot change a single pixel.
 */
export function isNeutral(spec) {
  const s = normalizeSpec(spec);
  const noCh = ch => !ch || !ch.amount;
  return s.tip.src === "round"
    && noCh(s.shapeDynamics.sizeJitter) && noCh(s.shapeDynamics.angleJitter)
    && noCh(s.shapeDynamics.roundnessJitter) && !s.shapeDynamics.flipJitter
    && noCh(s.scattering.scatter) && s.scattering.count === 1
    && s.texture.pattern === "none"
    && !s.dualBrush.enabled
    && noCh(s.colorDynamics.hueJitter) && noCh(s.colorDynamics.satJitter)
    && noCh(s.colorDynamics.brightJitter) && !s.colorDynamics.purity
    && noCh(s.transfer.opacityJitter) && noCh(s.transfer.flowJitter)
    && !s.flags.noise && !s.flags.wetEdges && !s.flags.buildUp;
}

// The panel sections, as data, so StudioPro renders its accordion from this
// rather than eight hand-written blocks that can drift out of sync.
export const SPEC_SECTIONS = [
  { key: "tip",           label: "Brush Tip Shape", icon: "●" },
  { key: "shapeDynamics", label: "Shape Dynamics",  icon: "◑" },
  { key: "scattering",    label: "Scattering",      icon: "⁙" },
  { key: "texture",       label: "Texture",         icon: "░" },
  { key: "dualBrush",     label: "Dual Brush",      icon: "◎" },
  { key: "colorDynamics", label: "Color Dynamics",  icon: "◕" },
  { key: "transfer",      label: "Transfer",        icon: "◠" },
  { key: "flags",         label: "Brush Options",   icon: "⚙" },
];
