// Regression tests for the shared-save_blob containment fix (P-010).
//
// The bug these exist to prevent: LokBook replaced the whole shared
// `auth_saves.save_blob`, deleting 616 Survivor's data, and spread whatever it
// read back into its own local save. Every test below is a case that was
// broken before cloudBlob.js and must stay fixed until per-app `app_saves`
// rows land.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LOKBOOK_SAVE_KEYS,
  GALLERY_BLOB_KEY,
  isLokBookKey,
  foreignKeysOf,
  mergeLokBookBlob,
  extractLokBookBlob,
} from "./cloudBlob.js";

/** A realistic 616 Survivor payload, nested under its `source` key. */
const SURVIVOR_KEY = "616_survivor";
const survivorSave = {
  version: 15,
  runs: 42,
  unlockedCharacters: ["fixer", "ranger"],
  bestiary: { "spiral-moth": 12 },
};

/** A small but realistic LokBook save. */
const lokbookSave = { loks: 1200, xp: 340, profile: { name: "mel" }, questsCompleted: 7 };

test("a 616 Survivor key survives a LokBook sync", () => {
  const remote = { [SURVIVOR_KEY]: survivorSave, loks: 5, xp: 1 };

  const written = mergeLokBookBlob(remote, lokbookSave, ["drawing-1"]);

  assert.deepEqual(
    written[SURVIVOR_KEY],
    survivorSave,
    "Survivor's payload must be byte-identical after a LokBook write",
  );
});

test("LokBook's own data survives its own sync, and wins over the stale remote copy", () => {
  const remote = { [SURVIVOR_KEY]: survivorSave, loks: 5, xp: 1, questsCompleted: 0 };

  const written = mergeLokBookBlob(remote, lokbookSave, ["drawing-1"]);

  assert.equal(written.loks, 1200, "the value being written must win, not the stored one");
  assert.equal(written.xp, 340);
  assert.equal(written.questsCompleted, 7);
  assert.deepEqual(written.profile, { name: "mel" });
  assert.deepEqual(written[GALLERY_BLOB_KEY], ["drawing-1"]);
});

test("an unknown future app's key survives", () => {
  const remote = {
    [SURVIVOR_KEY]: survivorSave,
    loklingu: { streak: 9, lessons: 31 },
    "some-app-nobody-has-written-yet": { nested: { deep: true } },
    lok_motion_v2: [1, 2, 3],
  };

  const written = mergeLokBookBlob(remote, lokbookSave, undefined);

  assert.deepEqual(written.loklingu, { streak: 9, lessons: 31 });
  assert.deepEqual(written["some-app-nobody-has-written-yet"], { nested: { deep: true } });
  assert.deepEqual(written.lok_motion_v2, [1, 2, 3]);
  assert.deepEqual(written[SURVIVOR_KEY], survivorSave);
});

test("an empty / new-user save works in both directions", () => {
  // First ever push: no row yet.
  const written = mergeLokBookBlob(undefined, lokbookSave, []);
  assert.equal(written.loks, 1200);
  assert.deepEqual(written[GALLERY_BLOB_KEY], []);
  assert.equal(Object.keys(written).some((k) => !isLokBookKey(k)), false,
    "a first push must not invent foreign keys");

  // First ever pull: no row yet.
  assert.equal(extractLokBookBlob(undefined), null);
  assert.equal(extractLokBookBlob(null), null);

  // A row that exists but holds only another app's data reads as an empty save.
  const mine = extractLokBookBlob({ [SURVIVOR_KEY]: survivorSave });
  assert.deepEqual(mine, { blob: {}, gallery: undefined });
});

test("a malformed legacy save fails safely rather than throwing", () => {
  for (const bad of [null, undefined, "a string", 42, true, [1, 2, 3], NaN]) {
    assert.doesNotThrow(() => foreignKeysOf(bad));
    assert.deepEqual(foreignKeysOf(bad), {}, `foreignKeysOf(${String(bad)}) must be empty`);

    assert.doesNotThrow(() => extractLokBookBlob(bad));
    assert.equal(extractLokBookBlob(bad), null, `extractLokBookBlob(${String(bad)}) must be null`);

    // A malformed row must never block a write: LokBook's own save still goes up.
    assert.doesNotThrow(() => mergeLokBookBlob(bad, lokbookSave, undefined));
    assert.equal(mergeLokBookBlob(bad, lokbookSave, undefined).loks, 1200);
  }

  // A malformed *outgoing* blob must not throw either.
  assert.doesNotThrow(() => mergeLokBookBlob({ [SURVIVOR_KEY]: survivorSave }, "nonsense", undefined));
  assert.deepEqual(
    mergeLokBookBlob({ [SURVIVOR_KEY]: survivorSave }, "nonsense", undefined)[SURVIVOR_KEY],
    survivorSave,
    "even a nonsense local save must not cost Survivor its data",
  );
});

test("reads never import another app's keys into LokBook's local state", () => {
  const remote = {
    ...lokbookSave,
    [GALLERY_BLOB_KEY]: ["drawing-1"],
    [SURVIVOR_KEY]: survivorSave,
    loklingu: { streak: 9 },
  };

  const { blob, gallery } = extractLokBookBlob(remote);

  assert.equal(SURVIVOR_KEY in blob, false, "Survivor's key must not reach LokBook's save");
  assert.equal("loklingu" in blob, false);
  assert.equal(GALLERY_BLOB_KEY in blob, false, "the gallery is returned separately, not inside the save");
  assert.deepEqual(gallery, ["drawing-1"]);
  assert.deepEqual(blob, lokbookSave);
});

test("the gallery is preserved when a caller has none to write", () => {
  // pushSave is called from paths that do not carry a gallery. Writing
  // `_gallery: undefined` used to drop the key and lose the user's drawings.
  const remote = { [GALLERY_BLOB_KEY]: ["kept"], loks: 1 };

  assert.deepEqual(mergeLokBookBlob(remote, lokbookSave, undefined)[GALLERY_BLOB_KEY], ["kept"]);
  assert.deepEqual(mergeLokBookBlob(remote, lokbookSave, ["new"])[GALLERY_BLOB_KEY], ["new"]);
});

test("a LokBook key missing from the list is still written, never silently dropped", () => {
  // The ownership list decides what is preserved and read back. It must never
  // be able to swallow a field LokBook is actually trying to save.
  const withNewField = { ...lokbookSave, brandNewFeatureFlag: true };

  const written = mergeLokBookBlob({ [SURVIVOR_KEY]: survivorSave }, withNewField, undefined);

  assert.equal(written.brandNewFeatureFlag, true);
  assert.deepEqual(written[SURVIVOR_KEY], survivorSave);
});

test("LOKBOOK_SAVE_KEYS has not drifted from getSaveBlob() in App.jsx", () => {
  // The whole fix rests on this list matching what LokBook actually saves. A
  // key added to getSaveBlob() but not here would be treated as another app's
  // data: preserved from the row on write, and dropped on read.
  const src = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
  const match = /const getSaveBlob=useCallback\(\(\)=>\((\{.*?\})\),\[/s.exec(src);
  assert.ok(match, "could not find getSaveBlob() in App.jsx — update this test");

  const inner = match[1].slice(1, -1);
  const keys = [];
  let depth = 0;
  let current = "";
  for (const ch of inner) {
    if ("{[(".includes(ch)) depth++;
    else if ("}])".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      keys.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  keys.push(current);

  const actual = keys.map((k) => k.split(":")[0].trim()).filter(Boolean);
  assert.ok(actual.length > 50, `expected a large save shape, parsed only ${actual.length} keys`);

  const listed = new Set(LOKBOOK_SAVE_KEYS);
  const missing = actual.filter((k) => !listed.has(k));
  assert.deepEqual(missing, [], `getSaveBlob() keys missing from LOKBOOK_SAVE_KEYS: ${missing.join(", ")}`);
});
