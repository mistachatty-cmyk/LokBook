#!/usr/bin/env node
// Bake a LokWorld region pack from OpenStreetMap.
//
// OFFLINE BY DESIGN. This never runs at request time and never runs in the app.
// You run it, it writes a static file into public/regions/, you commit that
// file, and the region flips from "soon" to "live". That is the whole point:
// the OSM Foundation's policy says heavy read users must not lean on their
// shared infrastructure, so we pay the query cost once, here, instead of once
// per user per camera move.
//
// USAGE
//   node scripts/bake-region.mjs nyc-midtown              # query Overpass live
//   node scripts/bake-region.mjs nyc-midtown --from a.json # use a saved Overpass response
//   node scripts/bake-region.mjs --synthetic demo-grid     # generate a test city
//
// --from lets you bake without this machine being able to reach Overpass:
// download the query result anywhere (or use an existing extract) and point at
// the file. The query it wants is printed by --print-query.
//
// LICENCE: output is derived from OpenStreetMap and is ODbL. The pack carries
// the attribution string, and the app displays it. Do not remove either.

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "public", "regions");
const OVERPASS = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

// Region definitions live with the app so the catalog is one source of truth.
// Imported by reading the file rather than importing constants.jsx, which pulls
// in JSX and the whole app graph for what is a five-line lookup.
function loadRegions() {
  const src = readFileSync(join(root, "src", "constants.jsx"), "utf8");
  const m = src.match(/export const LOK_REGIONS = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("LOK_REGIONS not found in src/constants.jsx");
  // The literal is plain data; evaluating it is safe and avoids a JSX build.
  return eval(m[1]);
}

const overpassQuery = ([s, w, n, e]) => `[out:json][timeout:180];
way["building"](${s},${w},${n},${e});
out geom;`;

/** OSM tags -> a storey count. One place, so the client never parses tags. */
function levelsFor(tags = {}) {
  const lv = parseFloat(tags["building:levels"]);
  if (lv > 0 && lv < 200) return lv;
  const h = parseFloat(tags.height);
  if (h > 0 && h < 900) return h / 3;      // ~3m per storey
  const min = parseFloat(tags["building:min_level"]);
  if (min > 0) return min + 2;
  return 3;
}

/**
 * Drop collinear/near-duplicate vertices. OSM footprints often carry far more
 * detail than a 480px canvas can show, and every vertex is bytes on a phone's
 * connection. Ramer–Douglas–Peucker at a tolerance of ~0.5m.
 */
function simplify(points, tolDeg = 5e-6) {
  if (points.length <= 4) return points;
  const sqSegDist = (p, a, b) => {
    let x = a.lng, y = a.lat, dx = b.lng - x, dy = b.lat - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.lng - x) * dx + (p.lat - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b.lng; y = b.lat; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p.lng - x; dy = p.lat - y;
    return dx * dx + dy * dy;
  };
  const step = (pts, first, last, tol, out) => {
    let maxSq = tol, index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(pts[i], pts[first], pts[last]);
      if (sq > maxSq) { index = i; maxSq = sq; }
    }
    if (index > 0) {
      if (index - first > 1) step(pts, first, index, tol, out);
      out.push(pts[index]);
      if (last - index > 1) step(pts, index, last, tol, out);
    }
  };
  const tol = tolDeg * tolDeg;
  const out = [points[0]];
  step(points, 0, points.length - 1, tol, out);
  out.push(points[points.length - 1]);
  return out.length >= 3 ? out : points;
}

function fromOverpass(json) {
  const els = (json.elements || []).filter(e => e.type === "way" && (e.geometry || []).length >= 3);
  const out = [];
  for (const e of els) {
    let pts = e.geometry.map(g => ({ lat: g.lat, lng: g.lon }));
    // Closed ways repeat the first point; the extruder closes the shape itself.
    if (pts.length > 3) {
      const a = pts[0], b = pts[pts.length - 1];
      if (Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9) pts = pts.slice(0, -1);
    }
    pts = simplify(pts);
    if (pts.length < 3) continue;
    out.push({ wayId: e.id, levels: levelsFor(e.tags), points: pts });
  }
  return out;
}

/**
 * A procedurally generated city block grid. This exists so the region code path
 * is exercisable and gate-able without a network, and it is marked
 * `synthetic: true` in the pack so it can never be mistaken for real OSM data —
 * the app labels it, and verify:regions refuses to let a synthetic pack back a
 * region claiming to be a real place.
 */
function synthetic([s, w, n, e]) {
  const out = [];
  const cols = 14, rows = 14;
  const cw = (e - w) / cols, ch = (n - s) / rows;
  let id = 1;
  // Deterministic PRNG so re-baking produces a byte-identical pack.
  let seed = 12345;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() < 0.18) continue;                 // streets and plazas
      const pad = 0.18 + rnd() * 0.14;            // setback from the block edge
      const y0 = s + ch * (r + pad), y1 = s + ch * (r + 1 - pad);
      const x0 = w + cw * (c + pad), x1 = w + cw * (c + 1 - pad);
      // Taller towers toward the middle, like a real downtown core.
      const dist = Math.hypot(r / rows - 0.5, c / cols - 0.5);
      const levels = Math.max(2, Math.round((1 - dist * 1.6) * 34 * (0.5 + rnd())));
      out.push({
        wayId: 900000000 + id++,
        levels,
        points: [
          { lat: y0, lng: x0 }, { lat: y0, lng: x1 },
          { lat: y1, lng: x1 }, { lat: y1, lng: x0 },
        ],
      });
    }
  }
  return out;
}

// --- encode (mirrors src/engine/regions.js encodePack) ----------------------
const PACK_VERSION = 1;
const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
function encodePack({ id, name, bbox, buildings, syntheticFlag = false, q = 1e7 }) {
  const origin = [bbox[0], bbox[1]];
  const rows = [];
  for (const b of buildings) {
    if (!b.points || b.points.length < 3) continue;
    const row = [b.wayId, Math.round((b.levels || 3) * 10)];
    let prevLat = 0, prevLng = 0;
    for (const p of b.points) {
      const lat = Math.round((p.lat - origin[0]) * q);
      const lng = Math.round((p.lng - origin[1]) * q);
      row.push(lat - prevLat, lng - prevLng);
      prevLat = lat; prevLng = lng;
    }
    rows.push(row);
  }
  const pack = { v: PACK_VERSION, id, name, bbox, origin, q, attribution: OSM_ATTRIBUTION, buildings: rows };
  if (syntheticFlag) pack.synthetic = true;
  return pack;
}

// --- main -------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const valOf = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const regionId = args.find(a => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--from");

if (!regionId) {
  console.error("usage: node scripts/bake-region.mjs <region-id> [--from response.json] [--synthetic] [--print-query]");
  process.exit(1);
}

const regions = loadRegions();
const region = regions.find(r => r.id === regionId);
if (!region) {
  console.error(`unknown region "${regionId}". Known: ${regions.map(r => r.id).join(", ")}`);
  process.exit(1);
}

if (flag("--print-query")) {
  console.log(overpassQuery(region.bbox));
  process.exit(0);
}

let buildings, isSynthetic = false;
if (flag("--synthetic")) {
  buildings = synthetic(region.bbox);
  isSynthetic = true;
  console.log(`synthetic: generated ${buildings.length} buildings`);
} else {
  const from = valOf("--from");
  let json;
  if (from) {
    json = JSON.parse(readFileSync(from, "utf8"));
    console.log(`loaded saved Overpass response from ${from}`);
  } else {
    console.log(`querying Overpass for ${region.name} …`);
    const res = await fetch(OVERPASS, {
      method: "POST", headers: { "Content-Type": "text/plain" }, body: overpassQuery(region.bbox),
    });
    if (!res.ok) {
      console.error(`Overpass returned ${res.status}. If this machine cannot reach it, run with --print-query, fetch the result elsewhere, and re-run with --from <file>.`);
      process.exit(1);
    }
    json = await res.json();
  }
  buildings = fromOverpass(json);
  console.log(`parsed ${buildings.length} buildings from OSM`);
}

if (!buildings.length) {
  console.error("no buildings produced — refusing to write an empty pack");
  process.exit(1);
}

const pack = encodePack({ id: region.id, name: region.name, bbox: region.bbox, buildings, syntheticFlag: isSynthetic });
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `${region.id}.json`);
writeFileSync(outPath, JSON.stringify(pack));

const bytes = Buffer.byteLength(JSON.stringify(pack));
const verts = pack.buildings.reduce((n, r) => n + (r.length - 2) / 2, 0);
console.log(`wrote ${outPath}`);
console.log(`  ${pack.buildings.length} buildings · ${verts} vertices · ${(bytes / 1024).toFixed(0)} KB raw (served compressed)`);
console.log(`  set LOK_REGIONS["${region.id}"].status = "live" and commit public/regions/${region.id}.json`);
if (isSynthetic) console.log("  NOTE: synthetic pack — flagged in the file, and the app labels it as not real OSM data.");
