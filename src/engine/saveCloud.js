// Cross-device save sync.
//
// This targets the existing `auth_saves` table (user_id PK -> auth.users,
// save_blob jsonb, updated_at) — the same table the manual "Back up now" /
// "Restore" buttons in Profile already use (App.jsx cloudSyncNow/
// cloudRestoreNow). An earlier version of this file created a second,
// parallel `lok_saves` table; that was a duplicate of a feature that already
// existed and has been dropped in favour of reusing this one.
//
// The manual buttons remain as an explicit, user-triggered action. This module
// adds an automatic layer on top of the same storage: push on every local save,
// and check on sign-in whether the remote copy is newer.
//
// `save_blob` embeds the gallery under `_gallery`, matching the existing manual
// shape exactly — so a manual restore and an automatic one read identical data.
//
// Conflict handling is deliberately simple and deliberately not silent. Two
// devices editing the same save is a real possibility, and quietly picking one
// loses work the user can never get back — so a remote save that is newer than
// the local one is reported to the caller rather than applied, and the caller
// asks. Last-write-wins is only used when the user says so.

import { supabase } from "../supabaseClient.js";

const TABLE = "auth_saves";

/** Push the local blob (plus gallery) up. Returns true on success. */
export async function pushSave(userId, blob, gallery) {
  if (!supabase || !userId || !blob) return false;
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    save_blob: { ...blob, _gallery: gallery },
    updated_at: new Date().toISOString(),
  });
  return !error;
}

/**
 * Fetch the remote save. Returns { blob, gallery, savedAt } or null when there
 * is none (a first sign-in on a fresh account is the common case, not an
 * error).
 */
export async function pullSave(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from(TABLE).select("save_blob,updated_at").eq("user_id", userId).maybeSingle();
  if (error || !data?.save_blob) return null;
  const { _gallery, ...blob } = data.save_blob;
  return { blob, gallery: _gallery, savedAt: Date.parse(data.updated_at) || 0 };
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
