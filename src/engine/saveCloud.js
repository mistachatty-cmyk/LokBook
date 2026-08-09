// Cross-device save sync.
//
// The save blob (getSaveBlob() in App.jsx) has always lived in the local store
// ladder — Tauri storage, then localStorage, then memory. That means a user's
// Loks, gallery, cosmetics, and level exist only on the device that earned them:
// open LokBook on an iPad after playing on a phone and you are a new user.
//
// This mirrors the blob to a Supabase row keyed by auth user, so signing in on a
// second device restores progress. It follows the shape of musicCloud.js rather
// than inventing a second pattern.
//
// Conflict handling is deliberately simple and deliberately not silent. Two
// devices editing the same save is a real possibility, and quietly picking one
// loses work the user can never get back — so a remote save that is newer than
// the local one is reported to the caller rather than applied, and the caller
// asks. Last-write-wins is only used when the user says so.

import { supabase } from "../supabaseClient.js";

const TABLE = "lok_saves";

/** Push the local blob up. Returns true on success. */
export async function pushSave(userId, blob) {
  if (!supabase || !userId || !blob) return false;
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    blob,
    device_saved_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  return !error;
}

/**
 * Fetch the remote save. Returns { blob, savedAt } or null when there is none
 * (a first sign-in on a fresh account is the common case, not an error).
 */
export async function pullSave(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from(TABLE).select("blob,device_saved_at").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return { blob: data.blob, savedAt: Date.parse(data.device_saved_at) || 0 };
}

/**
 * Decide what to do on sign-in. Pure — takes both sides, returns an intent, so
 * the decision is testable and the caller owns the UI.
 *
 *   "pull"   — no meaningful local progress; take the remote save
 *   "push"   — no remote save, or local is newer; upload
 *   "ask"    — both sides have progress and remote is newer; the user decides
 *   "none"   — nothing to do
 */
export function syncIntent({ localSavedAt = 0, localProgress = 0, remote }) {
  if (!remote) return localProgress > 0 ? "push" : "none";
  const remoteProgress = progressOf(remote.blob);
  if (localProgress === 0) return remoteProgress > 0 ? "pull" : "none";
  if (remote.savedAt > localSavedAt && remoteProgress > 0) return "ask";
  return "push";
}

/**
 * A crude "how much is there to lose" score. Used only to tell an empty save
 * from a real one — it does not need to be precise, and it must never be used
 * to rank two real saves against each other.
 */
export function progressOf(blob) {
  if (!blob) return 0;
  return (blob.totalEarned || 0) + (blob.xp || 0) * 2 + (blob.questsCompleted || 0) * 10;
}
