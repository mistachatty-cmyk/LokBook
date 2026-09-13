// Regression tests for pushSave's fail-closed behaviour on a read error.
//
// ChatGPT's review of the P-010 containment fix (PR #2) found that pushSave
// discarded the preservation read's error entirely: `const { data: existing }
// = await supabase...select().maybeSingle()` treated a failed read exactly
// like "no row exists yet", so a network blip, an RLS denial, or any
// transient Supabase error caused the very overwrite this module exists to
// prevent -- on every failure, not just a genuine first sync.
//
// `pushSave`/`pullSave` take an optional trailing `client` so these tests can
// drive the real functions against a fake double -- no network, no mocking
// library, no experimental Node flag (`t.mock.module` needs
// --experimental-test-module-mocks on this Node version; a DI default avoids
// that). Every production call site omits the argument and gets the real
// Supabase client, unchanged.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "module";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// saveCloud.js has no JSX of its own, but it imports supabaseClient.js, which
// reads `import.meta.env.VITE_SUPABASE_URL` -- populated by Vite, undefined
// under plain `node:test`. Bundling with esbuild and stubbing that define is
// the same technique constants.test.js and scripts/smoke.mjs already use for
// exactly this problem, so this file's imports don't have to change.
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundlePath = join(root, ".saveCloud-test-bundle.cjs");

await build({
  entryPoints: [join(root, "src/engine/saveCloud.js")],
  bundle: true,
  format: "cjs",
  outfile: bundlePath,
  define: {
    "import.meta.env.VITE_SUPABASE_URL": '""',
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
  },
  logLevel: "silent",
});
const { pushSave, pullSave } = require(bundlePath);

after(() => rmSync(bundlePath, { force: true }));

const SURVIVOR_KEY = "616_survivor";
const survivorSave = { version: 15, runs: 42 };
const lokbookSave = { loks: 1200, xp: 340 };

/**
 * A minimal fake shaped like the slice of the supabase-js query builder these
 * functions actually use: `.from(table).select(cols).eq(col, val).maybeSingle()`
 * and `.from(table).upsert(row)`. Records every upsert call so tests can
 * assert on whether a write was attempted at all.
 */
function fakeClient({ selectResult, upsertError = null } = {}) {
  const upsertCalls = [];
  return {
    upsertCalls,
    from() {
      return {
        select() {
          return { eq: () => ({ maybeSingle: async () => selectResult }) };
        },
        async upsert(row) {
          upsertCalls.push(row);
          return { error: upsertError };
        },
      };
    },
  };
}

test("pushSave fails closed when the preservation read errors — no write is attempted", async () => {
  const client = fakeClient({
    selectResult: { data: null, error: { message: "network error" } },
  });

  const ok = await pushSave("user-1", lokbookSave, undefined, client);

  assert.equal(ok, false);
  assert.equal(client.upsertCalls.length, 0, "a failed read must never reach the upsert");
});

test("pushSave still writes on a genuine 'no row yet' read (error: null) — not overcorrected", async () => {
  const client = fakeClient({ selectResult: { data: null, error: null } });

  const ok = await pushSave("user-1", lokbookSave, ["g"], client);

  assert.equal(ok, true);
  assert.equal(client.upsertCalls.length, 1, "the normal first-sync case must still write");
  assert.equal(client.upsertCalls[0].save_blob.loks, 1200);
});

test("pushSave preserves a sibling app's key end-to-end through the real client seam", async () => {
  const client = fakeClient({
    selectResult: { data: { save_blob: { [SURVIVOR_KEY]: survivorSave, loks: 1 } }, error: null },
  });

  const ok = await pushSave("user-1", lokbookSave, undefined, client);

  assert.equal(ok, true);
  assert.equal(client.upsertCalls.length, 1);
  assert.deepEqual(client.upsertCalls[0].save_blob[SURVIVOR_KEY], survivorSave);
  assert.equal(client.upsertCalls[0].save_blob.loks, 1200);
});

test("pushSave fails closed when the upsert itself errors", async () => {
  const client = fakeClient({
    selectResult: { data: null, error: null },
    upsertError: { message: "constraint violation" },
  });

  const ok = await pushSave("user-1", lokbookSave, undefined, client);

  assert.equal(ok, false);
});

test("pushSave is a no-op for a missing client, userId or blob", async () => {
  const client = fakeClient({ selectResult: { data: null, error: null } });
  assert.equal(await pushSave("user-1", lokbookSave, undefined, null), false);
  assert.equal(await pushSave(null, lokbookSave, undefined, client), false);
  assert.equal(await pushSave("user-1", null, undefined, client), false);
  assert.equal(client.upsertCalls.length, 0);
});

test("pullSave already fails closed on a read error — read-only, nothing to write", async () => {
  const client = fakeClient({
    selectResult: { data: null, error: { message: "network error" } },
  });

  assert.equal(await pullSave("user-1", client), null);
});

test("pullSave returns only LokBook's own keys from a shared row", async () => {
  const client = fakeClient({
    selectResult: {
      data: { save_blob: { [SURVIVOR_KEY]: survivorSave, ...lokbookSave, _gallery: ["g"] }, updated_at: "2026-01-01T00:00:00Z" },
      error: null,
    },
  });

  const result = await pullSave("user-1", client);

  assert.ok(result);
  assert.equal(SURVIVOR_KEY in result.blob, false);
  assert.deepEqual(result.blob, lokbookSave);
  assert.deepEqual(result.gallery, ["g"]);
});
