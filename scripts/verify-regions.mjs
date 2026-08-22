// Coverage gate for LokWorld regions.
//
// A region is a data row that promises "you can walk around here". This gate is
// what stops that promise being empty. Same failure mode as docs/AUDIT.md
// Finding 2 — 95 items that were sellable and rendered nothing — except a
// region that loads no buildings looks identical to a city that genuinely has
// none, which is even harder to notice by eye.
//
// It also enforces the honesty rule: a region naming a real place may not be
// backed by a synthetically generated pack. Shipping made-up buildings as
// Midtown Manhattan would be worse than shipping nothing.
import { build } from "esbuild";
import { rmSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".regions-check.mjs");

const entry = `
  export { LOK_REGIONS, OSM_ATTRIBUTION } from "./src/constants.jsx";
  export { decodePack, encodePack, PACK_VERSION, regionAt, buildingsNear } from "./src/engine/regions.js";
`;

try {
  await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "rg.jsx", loader: "jsx" },
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
      "import.meta.env.DEV": "false", "import.meta.env.PROD": "true",
    },
  });
  const { LOK_REGIONS, OSM_ATTRIBUTION, decodePack, encodePack, PACK_VERSION, regionAt, buildingsNear } =
    await import(pathToFileURL(out).href);

  const problems = [];
  const seen = new Set();
  let liveCount = 0, totalBuildings = 0;

  for (const r of LOK_REGIONS) {
    const tag = `region "${r.id}"`;
    if (!r.id || !r.name) problems.push(`${tag}: missing id or name`);
    if (seen.has(r.id)) problems.push(`${tag}: duplicate id`);
    seen.add(r.id);

    // --- bbox sanity. A transposed bbox silently selects an empty strip.
    const [s, w, n, e] = r.bbox || [];
    if (![s, w, n, e].every(Number.isFinite)) { problems.push(`${tag}: bbox is not four numbers`); continue; }
    if (s >= n) problems.push(`${tag}: bbox south (${s}) is not below north (${n})`);
    if (w >= e) problems.push(`${tag}: bbox west (${w}) is not left of east (${e})`);
    if (s < -90 || n > 90 || w < -180 || e > 180) problems.push(`${tag}: bbox outside valid lat/lng range`);

    if (r.status === "soon") continue;
    if (r.status !== "live") { problems.push(`${tag}: status "${r.status}" is neither "live" nor "soon"`); continue; }

    // --- a live region must have a pack that really exists and really loads
    liveCount++;
    const packPath = join(root, "public", r.pack || "");
    if (!r.pack || !existsSync(packPath)) {
      problems.push(`${tag}: status is "live" but ${r.pack || "(no pack)"} does not exist — bake it or set status to "soon"`);
      continue;
    }
    let raw;
    try { raw = JSON.parse(readFileSync(packPath, "utf8")); }
    catch (err) { problems.push(`${tag}: pack is not valid JSON (${err.message})`); continue; }

    if (raw.v !== PACK_VERSION) problems.push(`${tag}: pack version ${raw.v}, expected ${PACK_VERSION}`);
    if (raw.attribution !== OSM_ATTRIBUTION) problems.push(`${tag}: pack is missing the ODbL attribution string`);

    let decoded;
    try { decoded = decodePack(raw); }
    catch (err) { problems.push(`${tag}: pack failed to decode (${err.message})`); continue; }

    if (!decoded.length) {
      problems.push(`${tag}: pack decodes to ZERO buildings — the region is live and empty`);
      continue;
    }
    totalBuildings += decoded.length;

    // --- honesty: real places may not be backed by generated geometry
    if (raw.synthetic && !r.synthetic) {
      problems.push(`${tag}: backed by a SYNTHETIC pack but not declared synthetic — made-up buildings must never ship as a real place`);
    }
    if (r.synthetic && !raw.synthetic) {
      problems.push(`${tag}: declared synthetic but its pack is not flagged synthetic`);
    }

    // --- the pack must be for THIS place. A pack baked with the wrong bbox
    // loads fine, decodes fine, and puts a city in the sea.
    let outside = 0;
    for (const b of decoded) {
      const p = b.points[0];
      if (p.lat < s - 0.01 || p.lat > n + 0.01 || p.lng < w - 0.01 || p.lng > e + 0.01) outside++;
    }
    if (outside > decoded.length * 0.02) {
      problems.push(`${tag}: ${outside}/${decoded.length} buildings fall outside the region bbox — wrong pack for this region?`);
    }

    // --- geometry must be usable by the extruder
    const degenerate = decoded.filter(b => b.points.length < 3).length;
    if (degenerate) problems.push(`${tag}: ${degenerate} footprints have fewer than 3 points and cannot be extruded`);
    const badLevels = decoded.filter(b => !(b.levels > 0) || b.levels > 250).length;
    if (badLevels) problems.push(`${tag}: ${badLevels} buildings have an implausible storey count`);

    // --- the working-set helper must actually return something at the centre
    const near = buildingsNear(decoded, (s + n) / 2, (w + e) / 2, 0.02);
    if (!near.length) problems.push(`${tag}: buildingsNear() finds nothing at the region centre`);
  }

  // --- codec round-trip. Quantisation is lossy on purpose (1e-7 deg ≈ 1cm);
  // anything worse than that means the encoder is losing real shape.
  // Deliberately messy coordinates. An earlier version of this fixture used
  // round numbers that happened to sit exactly on a 1e-4 grid, so a sabotage
  // that coarsened the decoder to 1e-4 still round-tripped perfectly and the
  // check passed by luck. Real OSM vertices are never that tidy, and neither is
  // this fixture any more.
  const fixture = [{ wayId: 42, levels: 7.5, points: [
    { lat: 40.75801237, lng: -73.98553891 }, { lat: 40.75834562, lng: -73.98551074 },
    { lat: 40.75832918, lng: -73.98497436 }, { lat: 40.75799603, lng: -73.98501258 },
  ] }];
  const rt = decodePack(encodePack({ id: "t", name: "t", bbox: [40.75, -73.99, 40.76, -73.98], buildings: fixture }));
  if (rt.length !== 1) problems.push("codec lost a building on round-trip");
  else {
    const maxErr = Math.max(...fixture[0].points.map((p, i) =>
      Math.max(Math.abs(p.lat - rt[0].points[i].lat), Math.abs(p.lng - rt[0].points[i].lng))));
    if (maxErr > 1e-7) problems.push(`codec round-trip drifted ${maxErr.toExponential(2)} deg, expected <= 1e-7`);
    if (Math.abs(rt[0].levels - 7.5) > 0.05) problems.push(`codec lost storey precision: ${rt[0].levels} vs 7.5`);
    if (rt[0].wayId !== 42) problems.push("codec lost the OSM way id — building art could not be keyed to it");
  }

  // --- regionAt must only ever match a live region
  const soon = LOK_REGIONS.find(r => r.status === "soon");
  if (soon) {
    const mid = [(soon.bbox[0] + soon.bbox[2]) / 2, (soon.bbox[1] + soon.bbox[3]) / 2];
    if (regionAt(LOK_REGIONS, mid[0], mid[1])?.id === soon.id) {
      problems.push(`regionAt() returned "${soon.id}", which is only "soon" — unbaked regions must not claim coverage`);
    }
  }

  console.log(`REGIONS: ${LOK_REGIONS.length} defined · ${liveCount} live · ${LOK_REGIONS.length - liveCount} coming soon · ${totalBuildings} buildings baked`);
  if (problems.length) {
    console.error("REGIONS BROKEN:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log("REGIONS OK — every live region has a real, correctly-placed pack that decodes to usable geometry.");
} catch (e) {
  console.error("REGIONS CHECK FAILED:", e.message);
  process.exit(1);
} finally {
  rmSync(out, { force: true });
}
