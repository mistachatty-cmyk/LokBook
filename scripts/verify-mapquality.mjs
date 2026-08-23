// Every map-quality tier must resolve to a real budget, and the cheaper tiers
// must actually be cheaper. A "quality" dropdown whose options all render the
// same thing is the same failure as a sellable cosmetic that renders nothing —
// the user pays attention to it and gets nothing back.
import { build } from 'esbuild';
import { rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.mapquality-check.mjs');
const problems = [];

try {
  await build({
    stdin: { contents: `export * from "./src/engine/mapQuality.js";`, resolveDir: root, sourcefile: 'mq.js' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent',
  });
  const { MAP_QUALITY, MAP_QUALITY_TIERS, mapQuality } = await import(pathToFileURL(out).href);

  const NUMERIC = ['drawDistance', 'maxBuildings', 'shadowMapSize', 'maxCars', 'dprCap'];
  const BOOL = ['shadows', 'ambientMotion', 'clouds', 'antialias', 'roads'];

  for (const tier of MAP_QUALITY_TIERS) {
    const q = MAP_QUALITY[tier];
    if (!q) { problems.push(`tier "${tier}" has no budget`); continue; }
    if (!q.label || !q.blurb) problems.push(`tier "${tier}" has no label/blurb — it cannot be offered in a menu`);
    for (const k of NUMERIC) if (!Number.isFinite(q[k])) problems.push(`tier "${tier}": ${k} is not a number`);
    for (const k of BOOL) if (typeof q[k] !== 'boolean') problems.push(`tier "${tier}": ${k} is not a boolean`);
    if (q.tier !== tier) problems.push(`tier "${tier}" reports itself as "${q.tier}"`);
  }

  // Monotonic: a higher tier must never draw less.
  const [lo, mid, hi] = MAP_QUALITY_TIERS.map(t => MAP_QUALITY[t]);
  for (const k of ['drawDistance', 'maxBuildings', 'maxCars']) {
    if (!(lo[k] < mid[k] && mid[k] < hi[k])) {
      problems.push(`${k} is not strictly increasing across tiers (${lo[k]}, ${mid[k]}, ${hi[k]}) — the tiers are decorative`);
    }
  }
  // The cheap tier must actually be cheap in the ways that cost frames.
  if (lo.shadows) problems.push('the low tier still casts shadows — the most expensive thing in the scene');
  if (lo.ambientMotion) problems.push('the low tier still animates traffic by default');
  if (lo.dprCap > 2) problems.push('the low tier does not cap device pixel ratio');
  // ...but must still be a real scene, not a lockout.
  if (!(lo.maxBuildings >= 200)) problems.push(`the low tier draws only ${lo.maxBuildings} buildings — that is a lockout, not a budget`);
  if (!lo.roads) problems.push('the low tier has no roads — street mode without a street');

  // Outside a browser there is no localStorage and no device probe; mapQuality()
  // must still answer with something usable rather than throwing.
  const q = mapQuality();
  if (!q || !Number.isFinite(q.drawDistance)) problems.push('mapQuality() did not return a usable budget with no browser present');

  console.log(`MAP QUALITY: ${MAP_QUALITY_TIERS.length} tiers · draw ${lo.drawDistance}/${mid.drawDistance}/${hi.drawDistance} m · buildings ${lo.maxBuildings}/${mid.maxBuildings}/${hi.maxBuildings} · default "${q.tier}" (${q.source})`);
} catch (err) {
  problems.push(err.message);
} finally {
  rmSync(out, { force: true });
}

if (problems.length) {
  console.error('MAP QUALITY BROKEN:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('MAP QUALITY OK — every tier is real, and the cheap ones genuinely draw less.');
