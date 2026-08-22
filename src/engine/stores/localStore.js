// On-device world store. This is the adapter that ships.
//
// Everything lives in IndexedDB (blobs: building paint) and localStorage
// (small records: pins, plots), so the world works offline, costs nothing, and
// needs no account. It is single-player by design — see capabilities().shared.
//
// The IndexedDB helpers mirror engine/stickers.js deliberately: same open/tx
// shape, same swallow-and-degrade error handling, so there is one storage idiom
// in this codebase rather than two.

const DB = "lok:world";
const ART_STORE = "buildingArt";
const PINS_KEY = "lok:world:pins";
const PLOTS_KEY = "lok:world:plots";

let dbp = null;
function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("no indexedDB"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(ART_STORE)) r.result.createObjectStore(ART_STORE);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const t = db.transaction(ART_STORE, mode);
    const req = fn(t.objectStore(ART_STORE));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  });
}

const readJson = (key, fallback) => {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
};
const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

const artKey = (wayId, face) => `${wayId}:${face}`;

export const localStore = {
  name: "local",

  capabilities: () => ({
    name: "local",
    shared: false,          // your world is yours alone until a remote adapter is on
    persistsAcrossDevices: false,
    canOwnPlots: true,      // locally, freely — no server to arbitrate
    costsMoney: false,
  }),

  async postsInBounds(bbox, { viewerId = null, limit = 500 } = {}) {
    // Imported lazily to avoid a circular import at module-eval time
    // (worldStore imports this file, this file needs its helpers).
    const { inBounds, canSeePin } = await import("../worldStore.js");
    const pins = readJson(PINS_KEY, []);
    const out = [];
    for (const p of pins) {
      if (typeof p?.latitude !== "number" || typeof p?.longitude !== "number") continue;
      if (!inBounds(p.latitude, p.longitude, bbox)) continue;
      // Privacy is applied BEFORE the row joins the result, so a private pin's
      // coordinates never reach the caller at all — not "reach it and get
      // filtered", which is the shape of the bug this replaces.
      if (!canSeePin(p, viewerId)) continue;
      out.push(p);
      if (out.length >= limit) break;
    }
    return out;
  },

  async putPost(post) {
    if (!post || typeof post.latitude !== "number" || typeof post.longitude !== "number") return false;
    const pins = readJson(PINS_KEY, []);
    // Store only what a map pin needs. Frames are a ~16.8KB-per-frame base64
    // payload (see constants.jsx FRAMELESS_COLS) and would blow the
    // localStorage quota within a couple of dozen posts.
    const slim = {
      id: post.id,
      user_id: post.user_id || post.author_id || null,
      author: post.author,
      title: post.title,
      latitude: post.latitude,
      longitude: post.longitude,
      location_name: post.location_name,
      location_privacy: post.location_privacy || "everyone",
      created_at: post.created_at || new Date().toISOString(),
    };
    const next = [slim, ...pins.filter(p => p.id !== slim.id)].slice(0, 2000);
    return writeJson(PINS_KEY, next);
  },

  async buildingArt(regionId, wayIds = []) {
    const out = {};
    for (const wayId of wayIds) {
      for (let face = 0; face < 8; face++) {
        try {
          const rec = await tx("readonly", s => s.get(artKey(wayId, face)));
          if (rec) out[artKey(wayId, face)] = rec;
        } catch { /* storage unavailable — the city just renders unpainted */ }
      }
    }
    return out;
  },

  async putBuildingArt(wayId, face, blob, meta = {}) {
    try {
      await tx("readwrite", s => s.put({ wayId, face, blob, meta, ts: Date.now() }, artKey(wayId, face)));
      return true;
    } catch { return false; }
  },

  async plotsFor(regionId) {
    return readJson(PLOTS_KEY, []).filter(p => !regionId || p.regionId === regionId);
  },

  async claimPlot(wayId, { regionId = null, ownerId = "local", leaseMs = null } = {}) {
    const plots = readJson(PLOTS_KEY, []);
    const now = Date.now();
    const existing = plots.find(p => p.wayId === wayId);
    // An unexpired lease held by someone else blocks the claim even locally, so
    // the local path exercises the same rule the server will enforce.
    if (existing && existing.ownerId !== ownerId && (!existing.expiresAt || existing.expiresAt > now)) {
      return { ok: false, reason: "taken" };
    }
    const plot = { wayId, regionId, ownerId, claimedAt: now, expiresAt: leaseMs ? now + leaseMs : null };
    writeJson(PLOTS_KEY, [plot, ...plots.filter(p => p.wayId !== wayId)]);
    return { ok: true, plot };
  },
};
