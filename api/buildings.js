/**
 * Overpass API proxy — Vercel Node serverless function.
 *
 * WorldMapViewer's 3D building extrusions used to fetch overpass-api.de
 * directly from the browser. That worked in every headless test because the
 * tests stubbed the network call before it ever reached the wire — but the
 * real overpass-api.de response carries no Access-Control-Allow-Origin
 * header at all (confirmed live: `curl -D -` shows no `access-control-*`
 * header in the response), so a real browser's fetch() rejects it as a CORS
 * failure. On iOS Safari that surfaces as the generic, unhelpful
 * "TypeError: Load failed" — a real bug in production the stubbed gate
 * could never have caught, since stubbing the fetch bypasses CORS
 * enforcement entirely rather than testing it.
 *
 * The fix is what any browser-can't-call-this-cross-origin API needs: a
 * same-origin proxy. Server-to-server requests aren't subject to CORS at
 * all (that's a browser-only enforcement mechanism), so this function calls
 * Overpass exactly as before and the client calls this endpoint instead of
 * overpass-api.de directly.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return res.status(400).json({ error: "invalid_body" });
  }

  const { south, west, north, east } = body;
  const coords = [south, west, north, east];
  if (coords.some(v => typeof v !== "number" || !Number.isFinite(v))) {
    return res.status(400).json({ error: "invalid_bbox" });
  }
  // Same cap WorldMapViewer.jsx enforces client-side before ever calling
  // this — enforced again here since this endpoint is reachable directly,
  // not just from the app's own UI.
  if (Math.abs(north - south) > 0.05 || Math.abs(east - west) > 0.05) {
    return res.status(400).json({ error: "bbox_too_large" });
  }

  const query = `[out:json][timeout:15];way["building"](${south},${west},${north},${east});out geom;`;

  // overpass-api.de is the reference instance and the one every existing
  // deploy has hit exclusively — it is also the most rate-limited under
  // real (non-test) traffic, which is exactly what a live 502 from it looks
  // like. The FOSS Overpass mirrors below run the same query language
  // against the same underlying OSM data, so a failure on one is a mirror
  // problem, not a "this bbox has no buildings" problem. Tried in order,
  // first success wins; only failing all three is reported upstream.
  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
  ];

  let lastErr = null;
  for (const url of MIRRORS) {
    try {
      // AbortController rather than relying on the platform's own function
      // timeout: a hung upstream would otherwise burn the whole serverless
      // invocation on one mirror instead of leaving time to try the next.
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 12_000);
      const upstream = await fetch(url, {
        method: "POST",
        body: query,
        headers: { "Content-Type": "text/plain" },
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (!upstream.ok) {
        lastErr = { error: "overpass_error", status: upstream.status, mirror: url };
        continue;
      }
      const data = await upstream.json();
      // Building footprints don't change minute to minute — a short shared
      // cache means two people looking at the same block don't each cost a
      // fresh Overpass query.
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(data);
    } catch (err) {
      console.error("buildings: overpass fetch failed", url, err?.name, err?.message);
      lastErr = { error: "overpass_unreachable", message: err?.message || String(err), mirror: url };
    }
  }
  return res.status(502).json(lastErr || { error: "overpass_unreachable" });
}
