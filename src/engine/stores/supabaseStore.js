// Supabase world store — WRITTEN BUT NOT ENABLED.
//
// This is the switch-on path for a shared world, not a dependency. Nothing
// selects it until someone deliberately calls setBackend("supabase"), and it
// requires the dormant migrations in supabase/migrations/ to have been applied.
//
// It is written now, alongside the local adapter, for one reason: an interface
// with a single implementation is not an interface, it is indirection. Writing
// the remote one at the same time is what proves the seam is in the right place.
//
// IMPORTANT — the privacy rule differs from localStore on purpose. Here it must
// be enforced by the DATABASE, via the posts_in_bbox() RPC and RLS. Filtering in
// this file would put private coordinates on the wire and merely hide them,
// which is exactly the bug in the code this replaces
// (WorldMapViewer's client-side `.filter(p => p.location_privacy === 'everyone')`).

import { supabase } from "../../supabaseClient.js";

const noSupabase = () => !supabase;

export const supabaseStore = {
  name: "supabase",

  capabilities: () => ({
    name: "supabase",
    shared: true,
    persistsAcrossDevices: true,
    canOwnPlots: true,
    costsMoney: false,      // within the existing plan; no new spend
    ready: !noSupabase(),
  }),

  async postsInBounds(bbox, { limit = 500 } = {}) {
    if (noSupabase()) return [];
    // The RPC — not a .select() with client-side filtering. Privacy and the
    // bounding box are both resolved in SQL, so a private pin's coordinates
    // never leave the database.
    const { data, error } = await supabase.rpc("posts_in_bbox", {
      min_lat: bbox.south, min_lng: bbox.west,
      max_lat: bbox.north, max_lng: bbox.east,
      max_rows: limit,
    });
    if (error) { console.warn("posts_in_bbox failed:", error.message); return []; }
    return data || [];
  },

  async putPost(post) {
    if (noSupabase()) return false;
    const { error } = await supabase.from("lok_posts").upsert(post, { onConflict: "id" });
    if (error) { console.warn("putPost failed:", error.message); return false; }
    return true;
  },

  async buildingArt(regionId, wayIds = []) {
    if (noSupabase() || !wayIds.length) return {};
    const { data, error } = await supabase
      .from("lok_building_art")
      .select("way_id,face,image_path,user_id,created_at")
      .eq("region_id", regionId)
      .in("way_id", wayIds);
    if (error) { console.warn("buildingArt failed:", error.message); return {}; }
    const out = {};
    for (const r of data || []) out[`${r.way_id}:${r.face}`] = r;
    return out;
  },

  async putBuildingArt(wayId, face, blob, meta = {}) {
    if (noSupabase()) return false;
    const path = `${meta.regionId || "world"}/${wayId}_${face}.webp`;
    const up = await supabase.storage.from("building-art").upload(path, blob, { upsert: true });
    if (up.error) { console.warn("art upload failed:", up.error.message); return false; }
    const { error } = await supabase.from("lok_building_art").upsert({
      way_id: wayId, face, region_id: meta.regionId || null, image_path: path,
    }, { onConflict: "way_id,face" });
    if (error) { console.warn("art row failed:", error.message); return false; }
    return true;
  },

  async plotsFor(regionId) {
    if (noSupabase()) return [];
    const { data, error } = await supabase
      .from("lok_plots")
      .select("osm_way_id,region_id,owner_id,lease_expires_at")
      .eq("region_id", regionId);
    if (error) { console.warn("plotsFor failed:", error.message); return []; }
    return data || [];
  },

  async claimPlot(wayId, { regionId = null, leaseMs = null } = {}) {
    if (noSupabase()) return { ok: false, reason: "offline" };
    // SECURITY DEFINER RPC, never a direct insert. A client-side grant is
    // forgeable exactly the way votePost's raw PATCH is today, and expiry has
    // to be server time — a client epoch like doubleLoksUntil can just be
    // edited in devtools.
    const { data, error } = await supabase.rpc("claim_plot", {
      way_id: String(wayId), region_id: regionId, lease_ms: leaseMs,
    });
    if (error) return { ok: false, reason: error.message };
    return data?.ok ? { ok: true, plot: data.plot } : { ok: false, reason: data?.reason || "denied" };
  },
};
