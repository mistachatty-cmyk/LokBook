#!/usr/bin/env node
// Bake a LokWorld region pack from an OSM-derived PMTiles archive.
//
// WHY THIS REPLACED THE OVERPASS BAKER
// ------------------------------------
// Overpass cannot serve this, and that is not a guess. Measured from this
// machine: a query that succeeded once began returning 503 from every mirror
// within minutes of repeated use — its per-IP slot limiter doing exactly what
// the OSM Foundation's policy says it will ("large or frequent data users must
// use the download service planet.osm"). Any product that needs buildings on
// demand will hit that wall.
//
// A PMTiles archive is the sanctioned shape of the same data: one immutable
// file, read by HTTP range request, no query engine to overload. We read it
// ONCE here, offline, and commit the result. The shipped app never talks to
// this host at all — it loads a static pack from our own origin. That is what
// makes the feature production-safe rather than dependent on somebody else's
// free tier.
//
// LICENCE: output is derived from OpenStreetMap, ODbL. The pack carries the
// attribution string and the app displays it. Do not remove either.
//
// USAGE
//   node scripts/bake-pmtiles.mjs nyc-midtown          # one region
//   node scripts/bake-pmtiles.mjs --all                # every non-synthetic region
//   node scripts/bake-pmtiles.mjs nyc-midtown --zoom 15

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import Protobuf from "pbf";
import { VectorTile } from "@mapbox/vector-tile";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "public", "regions");

// The source archive. Read at BAKE TIME ONLY — never by the shipped app.
// Swap this for a self-hosted extract if you ever want to remove Protomaps
// from the bake step too; nothing else in the pipeline changes.
const PMTILES_URL = process.env.LOK_PMTILES_URL
  || "https://demo-bucket.protomaps.com/v4.pmtiles";

// ---------------------------------------------------------------------------
// Minimal PMTiles v3 reader. Only what a baker needs: header, directory
// descent, one tile. Deliberately not a dependency — the format is small and
// stable, and this way the bake pipeline has no runtime surface at all.

async function range(url, start, end) {
  const r = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
  if (!r.ok && r.status !== 206) throw new Error(`range ${start}-${end}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

function readVarint(buf, i) {
  // Multiply rather than shift. A planet-scale archive's tile-data offsets run
  // well past 4 GB, and `<<` is 32-bit in JS: every large offset silently wraps
  // to a small one, the range request lands on unrelated bytes, and the tile
  // "decodes" into protobuf wire-type errors. Cost us a whole bake run.
  let result = 0, mul = 1, b;
  do { b = buf[i++]; result += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80);
  return [result, i];
}

/** PMTiles directories are four delta/run-length encoded columns. */
function parseDirectory(buf) {
  let i = 0, n;
  [n, i] = readVarint(buf, 0);
  const ids = new Array(n), runs = new Array(n), lens = new Array(n), offs = new Array(n);
  let last = 0;
  for (let k = 0; k < n; k++) { let v; [v, i] = readVarint(buf, i); last += v; ids[k] = last; }
  for (let k = 0; k < n; k++) { let v; [v, i] = readVarint(buf, i); runs[k] = v; }
  for (let k = 0; k < n; k++) { let v; [v, i] = readVarint(buf, i); lens[k] = v; }
  for (let k = 0; k < n; k++) {
    let v; [v, i] = readVarint(buf, i);
    // 0 is the "immediately follows the previous entry" shorthand.
    offs[k] = (v === 0 && k > 0) ? offs[k - 1] + lens[k - 1] : v - 1;
  }
  return { n, ids, runs, lens, offs };
}

/** Last entry whose id <= target. Binary search; taking the FIRST match instead
 *  silently descends into the wrong leaf and finds nothing. */
function findEntry(dir, tileId) {
  let lo = 0, hi = dir.n - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dir.ids[mid] <= tileId) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  if (best < 0) return null;
  return { id: dir.ids[best], run: dir.runs[best], len: dir.lens[best], off: dir.offs[best] };
}

/** z/x/y -> PMTiles v3 Hilbert tile id. */
function tileId(z, x, y) {
  let acc = 0;
  for (let t = 0; t < z; t++) acc += (1 << t) * (1 << t);
  let n = 1 << z, d = 0, xx = x, yy = y;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (xx & s) > 0 ? 1 : 0;
    const ry = (yy & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) { xx = s - 1 - xx; yy = s - 1 - yy; }
      const t = xx; xx = yy; yy = t;
    }
  }
  return acc + d;
}

const lonToX = (lon, z) => Math.floor(((lon + 180) / 360) * (1 << z));
const latToY = (lat, z) => Math.floor(((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2) * (1 << z));

async function openArchive(url) {
  const head = await range(url, 0, 16383);
  if (head.subarray(0, 7).toString() !== "PMTiles") throw new Error("not a PMTiles archive");
  const rootOff = Number(head.readBigUInt64LE(8)), rootLen = Number(head.readBigUInt64LE(16));
  const leafOff = Number(head.readBigUInt64LE(40));
  const tileOff = Number(head.readBigUInt64LE(56));
  const rootDir = parseDirectory(gunzipSync(head.subarray(rootOff, rootOff + rootLen)));
  return { url, rootDir, leafOff, tileOff };
}

async function getTile(a, z, x, y) {
  const id = tileId(z, x, y);
  let e = findEntry(a.rootDir, id);
  if (!e) return null;
  if (e.run === 0) {                       // points at a leaf directory
    const leaf = parseDirectory(gunzipSync(await range(a.url, a.leafOff + e.off, a.leafOff + e.off + e.len - 1)));
    e = findEntry(leaf, id);
    if (!e) return null;
  }
  if (e.run !== 0 && id >= e.id + e.run) return null;   // outside the run: no tile here
  const raw = await range(a.url, a.tileOff + e.off, a.tileOff + e.off + e.len - 1);
  try { return gunzipSync(raw); } catch { return raw; }
}

// ---------------------------------------------------------------------------
// OSM tags -> storeys. One place, so the client never parses tag soup.
function levelsFrom(props) {
  // Floor at 1 and cap at 200. OSM carries genuinely broken `height` values —
  // London and Paris each shipped a building tagged under 15 cm, which rounds
  // to ZERO storeys in the pack and gives the extruder a flat, invisible mesh.
  // verify:regions caught both. Clamping here keeps the client from ever
  // having to reason about it.
  const clamp = v => Math.min(200, Math.max(1, v));
  const h = parseFloat(props.height);
  if (h > 0 && h < 900) return clamp(h / 3);            // ~3 m per storey
  const min = parseFloat(props.min_height);
  if (min > 0 && min < 900) return clamp(min / 3 + 1);
  const kind = String(props.kind || "");
  if (/^(house|detached|bungalow|hut|shed|garage)$/.test(kind)) return 1;
  if (/^(apartments|residential|dormitory|hotel)$/.test(kind)) return 5;
  if (/^(commercial|office|retail)$/.test(kind)) return 4;
  return 3;
}

/** Ramer–Douglas–Peucker. OSM footprints carry far more detail than a phone
 *  needs, and every vertex is bytes on the wire. */
function simplify(pts, tol = 5e-6) {
  if (pts.length <= 4) return pts;
  const sq = (p, a, b) => {
    let x = a.lng, y = a.lat, dx = b.lng - x, dy = b.lat - y;
    if (dx || dy) {
      const t = ((p.lng - x) * dx + (p.lat - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b.lng; y = b.lat; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p.lng - x; dy = p.lat - y;
    return dx * dx + dy * dy;
  };
  const out = [pts[0]];
  (function step(first, last) {
    let maxSq = tol * tol, index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sq(pts[i], pts[first], pts[last]);
      if (d > maxSq) { index = i; maxSq = d; }
    }
    if (index > 0) { step(first, index); out.push(pts[index]); step(index, last); }
  })(0, pts.length - 1);
  out.push(pts[pts.length - 1]);
  return out.length >= 3 ? out : pts;
}

const ringArea = pts => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j].lng + pts[i].lng) * (pts[j].lat - pts[i].lat);
  }
  return Math.abs(a / 2);
};

// ---------------------------------------------------------------------------
const PACK_VERSION = 1;
const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

function encodePack({ id, name, bbox, buildings, roads = [], landmark, q = 1e7 }) {
  const origin = [bbox[0], bbox[1]];
  const enc = (pts, head) => {
    const row = head.slice();
    let pLat = 0, pLng = 0;
    for (const p of pts) {
      const la = Math.round((p.lat - origin[0]) * q), ln = Math.round((p.lng - origin[1]) * q);
      row.push(la - pLat, ln - pLng); pLat = la; pLng = ln;
    }
    return row;
  };
  const pack = {
    v: PACK_VERSION, id, name, bbox, origin, q, attribution: OSM_ATTRIBUTION,
    buildings: buildings.map(b => enc(b.points, [b.wayId, Math.round((b.levels || 3) * 10)])),
  };
  if (roads.length) pack.roads = roads.map(r => enc(r.points, [r.kind | 0]));
  if (landmark) pack.landmark = landmark;
  return pack;
}

function loadRegions() {
  const src = readFileSync(join(root, "src", "constants.jsx"), "utf8");
  const m = src.match(/export const LOK_REGIONS = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("LOK_REGIONS not found in src/constants.jsx");
  return eval(m[1]);
}

const ROAD_KINDS = { highway: 1, major_road: 2, medium_road: 3, minor_road: 4 };

async function bakeRegion(archive, region, zoom, withRoads) {
  const [s, w, n, e] = region.bbox;
  const x0 = lonToX(w, zoom), x1 = lonToX(e, zoom);
  const y0 = latToY(n, zoom), y1 = latToY(s, zoom);   // y grows southwards

  const buildings = [], roads = [];
  const seen = new Set();
  let tilesWithData = 0, tilesTried = 0;

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      tilesTried++;
      let buf;
      try { buf = await getTile(archive, zoom, x, y); }
      catch (err) { console.warn(`  tile ${zoom}/${x}/${y}: ${err.message}`); continue; }
      if (!buf) continue;

      const tile = new VectorTile(new Protobuf(buf));
      const bl = tile.layers.buildings;
      if (bl) {
        tilesWithData++;
        for (let i = 0; i < bl.length; i++) {
          const f = bl.feature(i);
          const geo = f.toGeoJSON(x, y, zoom);
          const polys = geo.geometry.type === "Polygon" ? [geo.geometry.coordinates]
                      : geo.geometry.type === "MultiPolygon" ? geo.geometry.coordinates : [];
          for (const poly of polys) {
            let pts = (poly[0] || []).map(([lng, lat]) => ({ lat, lng }));
            if (pts.length > 3) {
              const a = pts[0], b = pts[pts.length - 1];
              if (Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9) pts = pts.slice(0, -1);
            }
            if (pts.length < 3) continue;
            // Keep only what is really inside the region.
            const c = pts[0];
            if (c.lat < s || c.lat > n || c.lng < w || c.lng > e) continue;
            pts = simplify(pts);
            if (pts.length < 3) continue;
            // Vector tiles duplicate features across tile seams; dedupe on a
            // rounded centroid so a building clipped by a seam isn't extruded twice.
            const key = `${pts[0].lat.toFixed(6)},${pts[0].lng.toFixed(6)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (ringArea(pts) < 1e-10) continue;        // slivers
            buildings.push({ wayId: f.id ?? (900000000 + buildings.length), levels: levelsFrom(f.properties), points: pts });
          }
        }
      }

      if (withRoads && tile.layers.roads) {
        const rl = tile.layers.roads;
        for (let i = 0; i < rl.length; i++) {
          const f = rl.feature(i);
          const kind = ROAD_KINDS[String(f.properties.kind || "")];
          if (!kind) continue;                          // paths/ferries etc: skip
          const geo = f.toGeoJSON(x, y, zoom);
          const lines = geo.geometry.type === "LineString" ? [geo.geometry.coordinates]
                      : geo.geometry.type === "MultiLineString" ? geo.geometry.coordinates : [];
          for (const line of lines) {
            const pts = line.map(([lng, lat]) => ({ lat, lng })).filter(p => p.lat >= s && p.lat <= n && p.lng >= w && p.lng <= e);
            if (pts.length >= 2) roads.push({ kind, points: simplify(pts, 1e-5) });
          }
        }
      }
    }
  }
  return { buildings, roads, tilesTried, tilesWithData };
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const zoom = parseInt(val("--zoom", "15"), 10);
const withRoads = !flag("--no-roads");

const regions = loadRegions();
const targets = flag("--all")
  ? regions.filter(r => !r.synthetic)
  : regions.filter(r => args.includes(r.id));

if (!targets.length) {
  console.error(`usage: node scripts/bake-pmtiles.mjs <region-id...> | --all  [--zoom 15] [--no-roads]`);
  console.error(`known: ${regions.map(r => r.id).join(", ")}`);
  process.exit(1);
}

console.log(`source: ${PMTILES_URL}`);
const archive = await openArchive(PMTILES_URL);
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

let failures = 0;
for (const region of targets) {
  process.stdout.write(`${region.name} … `);
  const { buildings, roads, tilesTried, tilesWithData } = await bakeRegion(archive, region, zoom, withRoads);
  if (!buildings.length) {
    console.log(`NO BUILDINGS (${tilesTried} tiles) — refusing to write an empty pack`);
    failures++;
    continue;
  }
  const pack = encodePack({
    id: region.id, name: region.name, bbox: region.bbox,
    buildings, roads, landmark: region.landmark,
  });
  const outPath = join(OUT_DIR, `${region.id}.json`);
  const json = JSON.stringify(pack);
  writeFileSync(outPath, json);
  const tall = buildings.filter(b => b.levels >= 10).length;
  console.log(`${buildings.length} buildings (${tall} 10+ storeys) · ${roads.length} roads · ${tilesWithData}/${tilesTried} tiles · ${(json.length / 1024).toFixed(0)} KB`);
}

if (failures) { console.error(`\n${failures} region(s) produced nothing.`); process.exit(1); }
console.log(`\nBaked ${targets.length} region(s) into public/regions/. Set their status to "live" in LOK_REGIONS.`);
