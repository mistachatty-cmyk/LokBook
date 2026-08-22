// Plain-HTTP world store — the escape hatch.
//
// This exists so that "we might not want to be on Supabase forever" is a real
// option rather than a hope. It speaks an ordinary REST contract against a
// single configurable base URL, so a server you write yourself, a rented VPS, a
// different BaaS, or a Cloudflare Worker can back LokWorld without a single
// component changing.
//
// The contract, in full:
//   GET  {base}/posts?south&west&north&east&limit   -> [post]
//   POST {base}/posts                               <- post
//   GET  {base}/building-art?region&ways=1,2,3      -> { "wayId:face": rec }
//   POST {base}/building-art                        <- multipart {wayId, face, image}
//   GET  {base}/plots?region                        -> [plot]
//   POST {base}/plots/claim                         <- {wayId, regionId, leaseMs}
//
// The server is responsible for privacy filtering, exactly as the SQL is in the
// Supabase adapter. This client deliberately does not filter: a client that
// filters is a client that already received the private data.

const BASE_KEY = "lok:worldApiBase";

export function worldApiBase() {
  try { return localStorage.getItem(BASE_KEY) || ""; } catch { return ""; }
}
export function setWorldApiBase(url) {
  try { localStorage.setItem(BASE_KEY, url || ""); } catch {}
}

async function req(path, opts = {}) {
  const base = worldApiBase();
  if (!base) return null;
  try {
    const r = await fetch(`${base}${path}`, opts);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export const httpStore = {
  name: "http",

  capabilities: () => ({
    name: "http",
    shared: true,
    persistsAcrossDevices: true,
    canOwnPlots: true,
    costsMoney: false,
    ready: !!worldApiBase(),
  }),

  async postsInBounds(bbox, { limit = 500 } = {}) {
    const q = new URLSearchParams({
      south: bbox.south, west: bbox.west, north: bbox.north, east: bbox.east, limit,
    });
    return (await req(`/posts?${q}`)) || [];
  },

  async putPost(post) {
    const r = await req("/posts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(post),
    });
    return !!r;
  },

  async buildingArt(regionId, wayIds = []) {
    if (!wayIds.length) return {};
    const q = new URLSearchParams({ region: regionId || "", ways: wayIds.join(",") });
    return (await req(`/building-art?${q}`)) || {};
  },

  async putBuildingArt(wayId, face, blob, meta = {}) {
    const base = worldApiBase();
    if (!base) return false;
    const fd = new FormData();
    fd.append("wayId", String(wayId));
    fd.append("face", String(face));
    fd.append("regionId", meta.regionId || "");
    fd.append("image", blob, `${wayId}_${face}.webp`);
    try {
      const r = await fetch(`${base}/building-art`, { method: "POST", body: fd });
      return r.ok;
    } catch { return false; }
  },

  async plotsFor(regionId) {
    return (await req(`/plots?region=${encodeURIComponent(regionId || "")}`)) || [];
  },

  async claimPlot(wayId, { regionId = null, leaseMs = null } = {}) {
    const r = await req("/plots/claim", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wayId, regionId, leaseMs }),
    });
    return r || { ok: false, reason: "unreachable" };
  },
};
