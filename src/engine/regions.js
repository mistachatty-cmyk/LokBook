// LokWorld regions — pre-baked OpenStreetMap building geometry, served as
// static files from our own origin.
//
// WHY NOT JUST QUERY OVERPASS
// ---------------------------
// `api/buildings.js` asks overpass-api.de for footprints every time the camera
// settles. That is fine for a handful of developers and will be blocked at any
// real usage: the OSM Foundation's policy is explicit that "large or frequent
// data users must use the download service 'planet.osm'" rather than their
// shared infrastructure. Pre-baking is the sanctioned path — and, unlike
// Google's Map Tiles terms which forbid storing tiles at all, ODbL explicitly
// permits us to store and redistribute derived geometry as long as we
// attribute. That licence difference is the whole reason this file can exist.
//
// THE PACK FORMAT (v1)
// --------------------
// A region pack is JSON, deliberately, not a hand-rolled binary. Static assets
// are served brotli/gzip-compressed, and quantised delta-encoded integers
// compress to within a small factor of a bespoke binary while staying
// inspectable — which matters a lot for data we will regenerate as OSM changes.
// The delta encoding is what does the real work: neighbouring vertices of a
// building differ by a few units, so the stream is mostly small integers.
//
//   {
//     v: 1,
//     id, name,
//     bbox: [south, west, north, east],
//     origin: [lat, lng],        // quantisation origin
//     q: 1e7,                    // quantisation factor (degrees * q -> integer)
//     attribution: "© OpenStreetMap contributors",
//     synthetic?: true,          // set ONLY by the synthetic generator
//     buildings: [
//       [wayId, levels, lat0, lng0, dLat1, dLng1, dLat2, dLng2, ...],
//       ...
//     ]
//   }
//
// All coordinates are integers relative to `origin`, scaled by `q`, and every
// vertex after the first is a delta from the previous one. `levels` is the
// storey count already normalised by the baker (OSM's `building:levels`, or
// `height` / 3, or a default) so the client never re-parses tag soup.

export const PACK_VERSION = 1;
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

/** Encode building records into a pack. Used by scripts/bake-region.mjs.
 *  `buildings` is [{ wayId, levels, points: [{lat,lng}, ...] }]. */
export function encodePack({ id, name, bbox, buildings, synthetic = false, q = 1e7 }) {
  const origin = [bbox[0], bbox[1]];
  const rows = [];
  for (const b of buildings) {
    if (!b.points || b.points.length < 3) continue;
    const row = [b.wayId, Math.round((b.levels || 3) * 10)];
    let prevLat = 0, prevLng = 0;
    for (let i = 0; i < b.points.length; i++) {
      const lat = Math.round((b.points[i].lat - origin[0]) * q);
      const lng = Math.round((b.points[i].lng - origin[1]) * q);
      row.push(lat - prevLat, lng - prevLng);
      prevLat = lat; prevLng = lng;
    }
    rows.push(row);
  }
  const pack = { v: PACK_VERSION, id, name, bbox, origin, q, attribution: OSM_ATTRIBUTION, buildings: rows };
  if (synthetic) pack.synthetic = true;
  return pack;
}

/** Decode a pack back into absolute lat/lng footprints. */
export function decodePack(pack) {
  if (!pack || pack.v !== PACK_VERSION) {
    // Deliberately loud. A silently-empty region looks exactly like "this city
    // has no buildings", which is the hardest kind of bug to notice.
    throw new Error(`unsupported region pack version: ${pack?.v}`);
  }
  const [oLat, oLng] = pack.origin;
  const q = pack.q || 1e7;
  return pack.buildings.map(row => {
    const wayId = row[0];
    const levels = row[1] / 10;
    const points = [];
    let lat = 0, lng = 0;
    for (let i = 2; i < row.length; i += 2) {
      lat += row[i]; lng += row[i + 1];
      points.push({ lat: oLat + lat / q, lng: oLng + lng / q });
    }
    return { wayId, levels, points };
  });
}

// --- Loading ----------------------------------------------------------------

const cache = new Map();
const inflight = new Map();

/** Fetch and decode a region pack, memoised. Returns null if it can't load —
 *  callers fall back to the live Overpass path for that view. */
export async function loadRegion(region) {
  if (!region?.pack) return null;
  if (cache.has(region.id)) return cache.get(region.id);
  if (inflight.has(region.id)) return inflight.get(region.id);

  const p = (async () => {
    try {
      const res = await fetch(region.pack);
      if (!res.ok) throw new Error(`pack ${res.status}`);
      const decoded = decodePack(await res.json());
      cache.set(region.id, decoded);
      return decoded;
    } catch (err) {
      console.warn(`region "${region.id}" failed to load:`, err.message);
      cache.set(region.id, null);
      return null;
    } finally {
      inflight.delete(region.id);
    }
  })();
  inflight.set(region.id, p);
  return p;
}

/** The live region containing this point, if any. */
export function regionAt(regions, lat, lng) {
  return regions.find(r =>
    r.status === "live" &&
    lat >= r.bbox[0] && lat <= r.bbox[2] &&
    lng >= r.bbox[1] && lng <= r.bbox[3]) || null;
}

/** Buildings from a pack that fall within `span` degrees of a point — the
 *  street-level working set, so we extrude a block rather than a whole city. */
export function buildingsNear(decoded, lat, lng, span = 0.004, limit = 400) {
  if (!decoded) return [];
  const out = [];
  for (const b of decoded) {
    const p = b.points[0];
    if (Math.abs(p.lat - lat) > span || Math.abs(p.lng - lng) > span) continue;
    out.push(b);
    if (out.length >= limit) break;
  }
  return out;
}
