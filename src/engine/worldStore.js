// The LokWorld storage seam.
//
// WHY THIS EXISTS
// ---------------
// Every world feature — map markers, building paint, plots — talks to this
// interface and nothing else. No world feature imports `supabase` directly.
// That is the whole portability answer: today the world runs entirely on-device
// for free, and switching on a shared world later is a new adapter, not a
// rewrite of the components.
//
// It also closes a live privacy bug by construction. Today WorldMapViewer
// receives every post and filters `location_privacy` in JS
// (WorldMapViewer.jsx: `.filter(p => p.location_privacy === 'everyone')`), which
// means coordinates a user marked `only-me` are already in the browser and are
// merely not drawn. Filtering belongs behind this boundary — in SQL when remote,
// before the array is ever built when local — so a component can never be the
// thing standing between private data and the screen.
//
// ADAPTERS
//   local     — IndexedDB + localStorage. Ships now. Single-player, offline, £0.
//   supabase  — written, off by default. Flip the flag for a shared world.
//   http      — a plain REST contract, so a future server that is NOT Supabase
//               drops in without touching a single component.

import { localStore } from "./stores/localStore.js";
import { supabaseStore } from "./stores/supabaseStore.js";
import { httpStore } from "./stores/httpStore.js";

// The complete interface. Every adapter must implement every name here — a
// half-written adapter is exactly the kind of thing that ships looking fine and
// throws on the one code path nobody clicked, so verify:worldstore asserts this
// list against each adapter rather than trusting it.
export const WORLD_STORE_METHODS = [
  "capabilities",
  "postsInBounds",
  "putPost",
  "buildingArt",
  "putBuildingArt",
  "plotsFor",
  "claimPlot",
];

export const ADAPTERS = { local: localStore, supabase: supabaseStore, http: httpStore };

const BACKEND_KEY = "lok:worldBackend";

// Default is `local` and stays local until someone deliberately changes it.
// Nothing in the app flips this automatically — a shared world is a decision,
// not a side effect of being signed in.
export function activeBackendName() {
  try {
    const v = localStorage.getItem(BACKEND_KEY);
    if (v && ADAPTERS[v]) return v;
  } catch { /* private mode — fall through to local */ }
  return "local";
}

export function setBackend(name) {
  if (!ADAPTERS[name]) throw new Error(`unknown world backend: ${name}`);
  try { localStorage.setItem(BACKEND_KEY, name); } catch {}
}

export function worldStore() {
  return ADAPTERS[activeBackendName()] || localStore;
}

// --- The façade -------------------------------------------------------------
// Components import these, never an adapter. Each one is deliberately thin: if
// a call needs cleverness, that cleverness belongs in the adapter where it can
// differ between local and remote.

/** What can this backend actually do right now? Drives UI copy — a single-player
 *  world should say so rather than silently showing you only your own art. */
export const capabilities = () => worldStore().capabilities();

/**
 * Posts whose pins fall inside `bbox` = {south, west, north, east}.
 *
 * `viewerId` is who is asking. Privacy is resolved HERE: a post marked
 * `only-me` is returned only to its own author, and `friends` only to the
 * author (until a real friend graph exists — returning them to everyone is the
 * bug this seam exists to prevent, and quietly widening it later would be worse
 * than being strict now).
 */
export const postsInBounds = (bbox, opts = {}) => worldStore().postsInBounds(bbox, opts);

/** Persist a post so it can appear on the map. Local today; the same call
 *  becomes a real insert the day a remote adapter is switched on. */
export const putPost = (post) => worldStore().putPost(post);

/** Paint applied to building faces, keyed by OSM way id. */
export const buildingArt = (regionId, wayIds) => worldStore().buildingArt(regionId, wayIds);
export const putBuildingArt = (wayId, face, blob, meta) => worldStore().putBuildingArt(wayId, face, blob, meta);

/** Plot ownership / leases. Local adapter grants freely; a remote adapter must
 *  go through a server-authoritative RPC, because a client-side grant is
 *  forgeable exactly the way `votePost` is today. */
export const plotsFor = (regionId) => worldStore().plotsFor(regionId);
export const claimPlot = (wayId, opts) => worldStore().claimPlot(wayId, opts);

// --- Shared helpers ---------------------------------------------------------

/** Longitude-wrap-safe bbox test. A bbox spanning the antimeridian has
 *  west > east, which a naive `lng >= west && lng <= east` gets backwards —
 *  the Pacific is not an edge case worth a silent bug. */
export function inBounds(lat, lng, { south, west, north, east }) {
  if (!(lat >= south && lat <= north)) return false;
  return west <= east ? (lng >= west && lng <= east) : (lng >= west || lng <= east);
}

/** Can `viewerId` see a post pinned at this privacy level? The single
 *  definition of that rule, so adapters cannot disagree about it. */
export function canSeePin(post, viewerId) {
  const privacy = post?.location_privacy || "everyone";
  if (privacy === "everyone") return true;
  const owner = post?.user_id || post?.author_id || null;
  return !!(owner && viewerId && owner === viewerId);
}
