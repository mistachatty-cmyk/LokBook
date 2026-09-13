// Ownership rules for the shared `auth_saves.save_blob` object.
//
// `auth_saves` has `user_id` as its primary key, so there is exactly ONE row —
// and one `save_blob` object — per user, shared by every app in the Lok
// ecosystem. The apps do not agree on how to use it:
//
//   LokBook      spreads its save across the ROOT of save_blob
//                ({ loks, xp, profile, ... , _gallery })
//   616 Survivor nests its save under a single key
//                ({ "616_survivor": { ... } })
//
// LokBook's writes used to replace `save_blob` wholesale
// (`upsert({ save_blob: { ...blob, _gallery } })`), which deleted every key it
// did not write — including `616_survivor`. Its reads used to spread whatever
// was in the row into local state, so another app's payload leaked in.
//
// This module is the containment fix: LokBook writes only the keys it owns and
// leaves everything else exactly as it found it, and reads only the keys it
// owns so a sibling app's data never enters LokBook's local save.
//
// TEMPORARY. The accepted long-term target is per-app rows in `app_saves`
// (one row per user/app/slot, with a revision for optimistic concurrency) —
// see docs/SURVIVOR_616_APP_SAVES_PLAN.md in the Lok-EcoSystsem repo. This
// module stops the data loss in the meantime; it does not fix the
// read-modify-write race that sharing one row inherently has.

/**
 * Every root key LokBook owns inside `save_blob`, mirroring the object
 * returned by `getSaveBlob()` in App.jsx.
 *
 * This list is what separates "ours" from "another app's", in both directions,
 * so it has to stay in step with `getSaveBlob()`. `cloudBlob.test.js` parses
 * App.jsx and fails if the two ever drift, which is cheaper than discovering
 * the gap as lost user data.
 *
 * A key LokBook writes but has NOT listed here is still written (see
 * mergeLokBookBlob) — the list never silences a real save. It only decides
 * what gets preserved and what gets read back.
 */
export const LOKBOOK_SAVE_KEYS = Object.freeze([
  "botPosted", "loks", "lokPass", "uiTheme", "ownedThemes", "effect",
  "ownedEffects", "ownedTiers", "ccTier", "bigBattleOwned", "wins", "profile",
  "bookmarks", "following", "kids", "customLilLok", "cosmetics", "owned",
  "onboarded", "sound", "xp", "flair", "daily", "quests", "questsCompleted",
  "totalEarned", "traceHinted", "pace", "speed", "soundLab", "soundQueue",
  "founder", "totalSpent", "fodHistory", "hapticGrammar", "fourthWall",
  "sessionPin", "moodTags", "garden", "reportedPosts", "verified", "lillok",
  "modules", "sky", "ownedSkies", "animFx", "ownedAnimFx", "fontPack",
  "cursorPack", "musicPack", "stickerPack", "postExport", "mythicOwned",
  "mythicEquipped", "dailyOwned", "weeklyOwned", "appLogo", "notifications",
  "comebackActive", "comebackStyle", "lastComebackAward", "lastOfflineBonus",
  "legacyStudio", "legacyBrushes", "tutorialProgress", "rewardClaims",
  "doubleLoksUntil",
]);

/** The drawing gallery rides alongside the save under its own root key. */
export const GALLERY_BLOB_KEY = "_gallery";

const OWNED = new Set([...LOKBOOK_SAVE_KEYS, GALLERY_BLOB_KEY]);

/** True when `key` is a root key LokBook is allowed to write or read back. */
export function isLokBookKey(key) {
  return OWNED.has(key);
}

/**
 * Plain-object check. A save_blob that is null, an array, a string or a number
 * is not something we can merge into or read from, and must never throw — a
 * hand-edited or half-written row has to degrade, not break the app.
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The keys of `remoteBlob` that belong to somebody else — another app's
 * namespace, or a key from a future app this build has never heard of.
 *
 * Returns {} for a malformed blob: nothing to preserve, and nothing to crash on.
 */
export function foreignKeysOf(remoteBlob) {
  if (!isPlainObject(remoteBlob)) return {};
  const foreign = {};
  for (const [key, value] of Object.entries(remoteBlob)) {
    if (!OWNED.has(key)) foreign[key] = value;
  }
  return foreign;
}

/**
 * Build the `save_blob` to write: LokBook's own save, with every unrelated key
 * from the existing row carried across untouched.
 *
 * Ordering matters. Preserved keys go first and anything LokBook is actually
 * writing goes second, so LokBook always wins for its own keys and can never
 * be shadowed by a stale copy of them in the row.
 *
 * A key LokBook is writing is never treated as foreign even if it is missing
 * from LOKBOOK_SAVE_KEYS — so a newly added save field is written correctly on
 * a build whose list has not caught up yet.
 *
 * `gallery === undefined` means "this caller has no gallery to write", not
 * "delete the gallery": the existing one is preserved. The old code wrote
 * `_gallery: undefined`, which JSON dropped, silently losing the gallery on
 * any push that did not supply one.
 */
export function mergeLokBookBlob(remoteBlob, lokbookBlob, gallery) {
  const outgoing = isPlainObject(lokbookBlob) ? lokbookBlob : {};
  const merged = {};

  for (const [key, value] of Object.entries(foreignKeysOf(remoteBlob))) {
    if (!(key in outgoing)) merged[key] = value;
  }
  Object.assign(merged, outgoing);

  if (gallery !== undefined) {
    merged[GALLERY_BLOB_KEY] = gallery;
  } else if (isPlainObject(remoteBlob) && GALLERY_BLOB_KEY in remoteBlob) {
    merged[GALLERY_BLOB_KEY] = remoteBlob[GALLERY_BLOB_KEY];
  }
  return merged;
}

/**
 * Read LokBook's save out of a shared row, dropping every key it does not own
 * so a sibling app's payload never reaches LokBook's local state.
 *
 * Returns null when the row holds nothing usable — callers already treat null
 * as "no remote save", which is the correct reading of a malformed row too.
 */
export function extractLokBookBlob(remoteBlob) {
  if (!isPlainObject(remoteBlob)) return null;

  const blob = {};
  let gallery;
  for (const [key, value] of Object.entries(remoteBlob)) {
    if (key === GALLERY_BLOB_KEY) gallery = value;
    else if (OWNED.has(key)) blob[key] = value;
  }
  return { blob, gallery };
}
