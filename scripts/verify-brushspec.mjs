// Coverage gate for Lok Studio Pro brush specs.
//
// Every id a BrushSpec can name must resolve to something real: a tip renderer,
// a texture pattern, a dynamic-control driver, a blend mode. A preset naming a
// tip that doesn't exist is sellable, clickable, and draws nothing — which is
// precisely the docs/AUDIT.md Finding 2 failure that verify:cosmetics exists to
// stop, reappearing in a new subsystem.
//
// This is the cheap structural half. verify:brushengine drives the real canvas
// and asserts pixels actually land; neither substitutes for the other.
import { build } from "esbuild";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".brushspec-check.mjs");

const entry = `
  export { BRUSH_SPEC_PRESETS, BLENDS } from "./src/constants.jsx";
  export { DEFAULT_SPEC, DYNAMIC_CONTROLS, normalizeSpec, evalChannel, evalBipolar, SPEC_SECTIONS } from "./src/engine/brushSpec.js";
  export { TIP_KEYS, TEXTURE_PATTERNS } from "./src/engine/brushTips.js";
`;

try {
  await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "bs.jsx", loader: "jsx" },
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
      "import.meta.env.DEV": "false", "import.meta.env.PROD": "true",
    },
  });
  const M = await import(pathToFileURL(out).href);
  const { BRUSH_SPEC_PRESETS, BLENDS, DEFAULT_SPEC, DYNAMIC_CONTROLS, normalizeSpec,
          evalChannel, evalBipolar, SPEC_SECTIONS, TIP_KEYS, TEXTURE_PATTERNS } = M;

  const controls = Object.keys(DYNAMIC_CONTROLS);
  const problems = [];

  // Every channel-shaped field, wherever it lives in the spec.
  const CHANNEL_PATHS = [
    ["shapeDynamics", "sizeJitter"], ["shapeDynamics", "angleJitter"], ["shapeDynamics", "roundnessJitter"],
    ["scattering", "scatter"], ["scattering", "countJitter"],
    ["texture", "depth"],
    ["colorDynamics", "hueJitter"], ["colorDynamics", "satJitter"], ["colorDynamics", "brightJitter"],
    ["transfer", "opacityJitter"], ["transfer", "flowJitter"],
  ];

  const checkSpec = (raw, label) => {
    const s = normalizeSpec(raw);
    if (!TIP_KEYS.includes(s.tip.src)) problems.push(`${label}: tip.src "${s.tip.src}" is not a real tip renderer`);
    if (!TEXTURE_PATTERNS.includes(s.texture.pattern)) problems.push(`${label}: texture.pattern "${s.texture.pattern}" has no generator`);
    if (!TIP_KEYS.includes(s.dualBrush.tip)) problems.push(`${label}: dualBrush.tip "${s.dualBrush.tip}" is not a real tip renderer`);
    if (!BLENDS.includes(s.dualBrush.mode)) problems.push(`${label}: dualBrush.mode "${s.dualBrush.mode}" is not a real blend mode`);
    if (!(s.tip.spacing > 0)) problems.push(`${label}: tip.spacing must be > 0 (a zero-spacing walk never terminates)`);
    for (const [sec, key] of CHANNEL_PATHS) {
      const ch = s[sec]?.[key];
      if (!ch) { problems.push(`${label}: ${sec}.${key} missing after normalize`); continue; }
      if (!controls.includes(ch.control)) problems.push(`${label}: ${sec}.${key}.control "${ch.control}" is not in DYNAMIC_CONTROLS`);
      if (ch.amount < 0 || ch.amount > 1) problems.push(`${label}: ${sec}.${key}.amount ${ch.amount} out of 0..1`);
    }
  };

  checkSpec(DEFAULT_SPEC, "DEFAULT_SPEC");
  for (const p of BRUSH_SPEC_PRESETS) {
    if (!p.id || !p.name) problems.push(`preset ${JSON.stringify(p.id)} missing id/name`);
    checkSpec(p, `preset "${p.id}"`);
  }

  // Panel sections must map onto real spec sections, or a tab renders an empty
  // body — visible, clickable, and inert.
  for (const sec of SPEC_SECTIONS) {
    if (!(sec.key in DEFAULT_SPEC)) problems.push(`SPEC_SECTIONS "${sec.key}" is not a section of DEFAULT_SPEC`);
  }

  // Every driver must actually vary its output, or the "Control:" dropdown
  // offers a choice that silently does nothing.
  const state = { dabIndex: 0, fadeLength: 40, rng: (() => { let s = 5; return () => ((s = (s * 9301 + 49297) % 233280), s / 233280); })() };
  for (const name of controls) {
    if (name === "off") continue;
    const lo = evalChannel({ amount: 1, control: name, min: 0 }, { pressure: 0, tiltX: 0, tiltY: 0, twist: 0, direction: 0, velocity: 3 }, { ...state, dabIndex: 39 });
    const hi = evalChannel({ amount: 1, control: name, min: 0 }, { pressure: 1, tiltX: 90, tiltY: 0, twist: 359, direction: Math.PI * 1.99, velocity: 0 }, { ...state, dabIndex: 0 });
    if (Math.abs(hi - lo) < 0.05) problems.push(`control "${name}" produced no meaningful range (${lo.toFixed(3)} vs ${hi.toFixed(3)}) — a dead dropdown entry`);
  }

  // Property: a zero-amount channel is a no-op for EVERY driver at EVERY input.
  // Checked across the whole matrix rather than one sample, because a single
  // sample passes by luck — the first version of this check did exactly that and
  // survived a deliberate sabotage, which is why it now sweeps.
  const SAMPLES = [0, 0.25, 0.5, 0.75, 1];
  for (const name of controls) {
    for (const v of SAMPLES) {
      const input = { pressure: v, tiltX: v * 90, tiltY: 0, twist: v * 359, direction: v * Math.PI * 2, velocity: v * 3 };
      const st = { ...state, dabIndex: Math.round(v * 39) };
      const a = evalChannel({ amount: 0, control: name, min: 0 }, input, st);
      if (a !== 1) problems.push(`evalChannel amount:0 control:"${name}" input:${v} returned ${a}, expected exactly 1`);
      const b = evalBipolar({ amount: 0, control: name, min: 0 }, input, st);
      if (b !== 0) problems.push(`evalBipolar amount:0 control:"${name}" input:${v} returned ${b}, expected exactly 0`);
    }
  }

  // Property: `min` is a real floor. Photoshop's "Minimum Diameter"/"Minimum
  // Roundness" promise the value never collapses past it; a broken floor is
  // invisible in a screenshot but makes thin strokes vanish entirely.
  for (const floor of [0.25, 0.5, 0.9]) {
    const worst = evalChannel({ amount: 1, control: "pressure", min: floor }, { pressure: 0 }, state);
    if (worst < floor - 1e-9) problems.push(`min floor ${floor} not honoured: full jitter at zero pressure gave ${worst.toFixed(4)}`);
    if (worst > floor + 1e-9) problems.push(`min floor ${floor} overshot: expected to sit exactly on the floor, got ${worst.toFixed(4)}`);
  }

  // Property: full jitter at full drive returns to 1, so a pressure-bound brush
  // reaches its nominal size when you actually press hard.
  const full = evalChannel({ amount: 1, control: "pressure", min: 0.2 }, { pressure: 1 }, state);
  if (Math.abs(full - 1) > 1e-9) problems.push(`full drive should reach 1.0, got ${full.toFixed(4)}`);

  console.log(`BRUSHSPEC: ${BRUSH_SPEC_PRESETS.length} presets · ${TIP_KEYS.length} tips · ${TEXTURE_PATTERNS.length - 1} textures · ${controls.length} controls`);
  if (problems.length) {
    console.error("BRUSHSPEC BROKEN:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log("BRUSHSPEC OK — every preset resolves to a real tip, texture, control and blend mode.");
} catch (e) {
  console.error("BRUSHSPEC CHECK FAILED:", e.message);
  process.exit(1);
} finally {
  rmSync(out, { force: true });
}
