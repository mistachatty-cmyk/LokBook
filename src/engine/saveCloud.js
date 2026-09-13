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
// The row is SHARED with the other Lok apps (auth_saves is keyed by user_id
// alone), so every read and write here goes through cloudBlob.js: LokBook
// writes only the keys it owns and preserves everything else, and reads only
// the keys it owns. See that file for why, and for the app_saves plan that
// replaces this arrangement.
//
// Conflict handling is deliberately simple and deliberately not silent. Two
// devices editing the same save is a real possibility, and quietly picking one
// loses work the user can never get back — so a remote save that is newer than
// the local one is reported to the caller rather than applied, and the caller
// asks. Last-write-wins is only used when the user says so.

import { supabase as defaultSupabase } from "../supabaseClient.js";
import { mergeLokBookBlob, extractLokBookBlob } from "./cloudBlob.js";

const TABLE = "auth_saves";

/**
 * Push the local blob (plus gallery) up. Returns true on success.
 *
 * Reads the current row first so unrelated apps' keys survive the write. That
 * read-modify-write is not atomic — two devices saving at the same moment can
 * still lose one side's update, which is what per-app `app_saves` rows with a
 * revision check will fix. Doing better here would need a JSONB-merge RPC, and
 * this containment fix deliberately changes no database schema.
 *
 * Fails closed on a read error. `.maybeSingle()` returns `{ data: null, error:
 * null }` for a genuine "no row yet" (the normal first-sync case) but
 * `{ data: null, error }` for a real failure (network, RLS, transient) — and
 * those must not be treated the same. Proceeding on a failed read would mean
 * "couldn't check what's there" silently becomes "there's nothing to
 * preserve," recreating the exact bug this module exists to fix, on every
 * blip instead of only on a genuine first sync.
 *
 * `client` defaults to the real Supabase singleton; it exists as a seam so
 * tests can drive this against a fake without touching a network or adding a
 * mocking dependency. Every existing caller passes 3 args and gets the real
 * client, unchanged.
 */
export async function pushSave(userId, blob, gallery, client = defaultSupabase) {
  if (!client || !userId || !blob) return false;

  const { data: existing, error: readError } = await client
    .from(TABLE).select("save_blob").eq("user_id", userId).maybeSingle();
  if (readError) return false;

  const { error } = await client.from(TABLE).upsert({
    user_id: userId,
    save_blob: mergeLokBookBlob(existing?.save_blob, blob, gallery),
    updated_at: new Date().toISOString(),
  });
  return !error;
}

/**
 * Fetch the remote save. Returns { blob, gallery, savedAt } or null when there
 * is none (a first sign-in on a fresh account is the common case, not an
 * error) or the read failed. Read-only, so a failure here already fails
 * closed — there is nothing to write.
 */
export async function pullSave(userId, client = defaultSupabase) {
  if (!client || !userId) return null;
  const { data, error } = await client
    .from(TABLE).select("save_blob,updated_at").eq("user_id", userId).maybeSingle();
  if (error || !data?.save_blob) return null;
  const mine = extractLokBookBlob(data.save_blob);
  if (!mine) return null;
  return { blob: mine.blob, gallery: mine.gallery, savedAt: Date.parse(data.updated_at) || 0 };
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
