// Public artist directory. Signing in creates an auth.users row, but clients
// can't read auth.users — so without a mirrored public row an account exists
// and can never be found. lok_profiles is that public mirror.
import { supabase } from "../supabaseClient.js";

export const BOARD_SIZE = 200;

/** Create/refresh my public row. Safe to call on every sign-in. */
export async function upsertMyProfile({ userId, handle, displayName, avatarSeed, bio, flips, level }) {
  if (!supabase || !userId || !handle) return null;
  const row = {
    user_id: userId,
    handle,
    display_name: displayName || handle,
    avatar_seed: avatarSeed | 0,
    bio: bio || "",
    flips: flips | 0,
    level: level | 0,
    last_seen: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("lok_profiles").upsert(row, { onConflict: "user_id" }).select().maybeSingle();
  if (error) {
    // A handle collision shouldn't block sign-in — retry once with a suffix.
    if (String(error.message || "").includes("duplicate")) {
      row.handle = `${handle}-${String(userId).slice(0, 4)}`;
      const retry = await supabase.from("lok_profiles").upsert(row, { onConflict: "user_id" }).select().maybeSingle();
      return retry.data || null;
    }
    return null;
  }
  return data;
}

/** Newest accounts, most recent first. This is the visible board. */
export async function fetchNewestArtists(limit = BOARD_SIZE) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("lok_profiles")
    .select("user_id,handle,display_name,avatar_seed,bio,flips,level,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

/** A random handful of artists who have dropped off the newest board. */
export async function fetchRandomOlderArtists(want = 6) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("lok_random_older_artists", { board_size: BOARD_SIZE, want });
  if (error || !data) return [];
  return data;
}

/** Handle/name search across real accounts. */
export async function searchArtists(query, limit = 15) {
  if (!supabase) return [];
  const q = (query || "").trim();
  if (!q) return [];
  const esc = q.replace(/[%,()]/g, "");
  const { data } = await supabase
    .from("lok_profiles")
    .select("user_id,handle,display_name,avatar_seed,bio,flips,level,created_at")
    .or(`handle.ilike.*${esc}*,display_name.ilike.*${esc}*`)
    .limit(limit);
  return data || [];
}
