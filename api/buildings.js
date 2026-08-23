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

  // 10s, not 15s: on Vercel's Hobby plan the function itself is killed at 10s,
  // so telling Overpass we'd wait 15 meant a slow-but-successful query died on
  // our side before it could answer.
  const query = `[out:json][timeout:10];way["building"](${south},${west},${north},${east});out geom;`;

  // Mirrors, tried in order. overpass-api.de rate-limits hard on shared
  // serverless egress IPs (every Vercel lambda shares a pool with thousands of
  // other tenants), which is the single likeliest source of the 502s seen in
  // production.
  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];

  let lastStatus = 0, lastMessage = "";
  for (const url of MIRRORS) {
    // Own timeout, below the function ceiling, so a hanging mirror costs us one
    // slot rather than the whole request.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8000);
    try {
      const upstream = await fetch(url, {
        method: "POST",
        body: query,
        headers: {
          "Content-Type": "text/plain",
          // Overpass operators block requests with an absent or generic
          // User-Agent, and Node's fetch sends none at all. This header being
          // missing is the most likely reason production has been getting 502s.
          "User-Agent": "LokBook/1.0 (+https://lok-book.vercel.app; buildings layer)",
          "Accept": "application/json",
        },
        signal: ac.signal,
      });
      if (!upstream.ok) { lastStatus = upstream.status; continue; }
      const data = await upstream.json();
      res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
      res.setHeader("X-Buildings-Source", new URL(url).host);
      return res.status(200).json(data);
    } catch (err) {
      lastMessage = err?.name === "AbortError" ? "timeout" : (err?.message || String(err));
    } finally {
      clearTimeout(timer);
    }
  }

  console.error("buildings: every Overpass mirror failed", lastStatus, lastMessage);
  return res.status(502).json({
    error: "overpass_unavailable",
    status: lastStatus || undefined,
    message: lastMessage || "all mirrors refused",
    tried: MIRRORS.length,
  });
}
