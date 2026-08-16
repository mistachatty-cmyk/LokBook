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

// ---- redundant-push suppression ------------------------------------------
//
// The automatic push fires from doSave(), which reruns whenever any saved
// value changes. Measured on an idle, untouched tab: a full save every 12.0s,
// with byte-identical payloads after the first — driven by LilLok's ink-decay
// interval. Each of those was a full auth_saves upsert carrying save_blob AND
// the entire gallery, and a gallery frame measures ~16.8KB as a data URL. A
// user with 20 published flips was therefore re-uploading ~2.7MB every 12
// seconds, forever, while doing nothing. That is roughly 800MB/hour per open
// tab, all of it duplicate.
//
// So the transport refuses to send a payload it has already sent. The guard
// lives here rather than at the call sites because there are four of them
// (auto-save, sign-in sync, the "Keep this device" prompt, and the manual
// backup button) and only one of them should ever be exempt.
//
// Deliberately NOT solved by dropping the gallery from the automatic push:
// cross-device gallery sync is the entire point of the feature, and an
// unchanged gallery now costs nothing anyway. What was wrong was re-sending
// data nobody changed, not sending it at all.
const MIN_GAP_MS = 60000;
let lastHash = null;
let lastPushAt = 0;
let trailing = null;   // { userId, payload, hash } waiting out the rate floor
let trailingTimer = null;

/** FNV-1a, 32-bit. Cheap, and only ever compared against itself. */
function hashOf(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  // Length is part of the identity: it makes a collision on a truncated or
  // padded payload effectively impossible without a second pass.
  return `${h.toString(16)}:${str.length}`;
}

/**
 * Push the local blob (plus gallery) up. Returns true on success.
 *
 * Skips the network entirely when the payload is unchanged since the last
 * successful push. A CHANGED payload inside the rate floor is not dropped —
 * it is held and sent when the floor expires, with any later change replacing
 * it. Dropping it would lose real progress on a device that then goes offline,
 * which is precisely the failure the sync feature exists to prevent.
 *
 * `force` bypasses both and is for user-initiated backups: when someone taps
 * "Back up now" they get a request, always.
 *
 * Returns true for a suppressed push: the remote copy already holds exactly
 * this data, so from the caller's point of view it succeeded.
 */
export async function pushSave(userId, blob, gallery, { force = false } = {}) {
  if (!supabase || !userId || !blob) return false;
  const payload = { ...blob, _gallery: gallery };
  const hash = hashOf(JSON.stringify(payload));
  const now = Date.now();

  if (!force) {
    if (hash === lastHash) return true;              // already up there
    if (now - lastPushAt < MIN_GAP_MS) {             // changed, but too soon
      trailing = { userId, payload, hash };
      if (!trailingTimer) {
        trailingTimer = setTimeout(() => {
          trailingTimer = null;
          const t = trailing; trailing = null;
          if (t) upsert(t.userId, t.payload, t.hash);
        }, MIN_GAP_MS - (now - lastPushAt));
      }
      return true;
    }
  }
  return upsert(userId, payload, hash);
}

async function upsert(userId, payload, hash) {
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    save_blob: payload,
    updated_at: new Date().toISOString(),
  });
  if (!error) { lastHash = hash; lastPushAt = Date.now(); }
  return !error;
}

/** Test seam: lets a gate assert the guard from a clean slate. */
export function __resetPushGuard() {
  lastHash = null; lastPushAt = 0; trailing = null;
  if (trailingTimer) { clearTimeout(trailingTimer); trailingTimer = null; }
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
