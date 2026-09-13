// Regression tests for lokApi.pushSave's fail-closed behaviour on a read
// error -- the same class of bug fixed in engine/saveCloud.test.js, in the
// other place ChatGPT's review named. `lokApi.pushSave`/`fetchAuthSave` have
// no call sites anywhere in this codebase today, but they are exported public
// API and the review flagged them explicitly, so they get the same fix and
// the same regression coverage.
//
// constants.jsx is .jsx (inline SVG icons) and reads `import.meta.env`, so
// plain `node:test` can't load it directly. This bundles it with esbuild --
// the same technique scripts/smoke.mjs already uses in this repo for exactly
// this problem -- rather than adding a new test-loader dependency.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "module";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = join(root, ".constants-test-bundle.cjs");

await build({
  entryPoints: [join(root, "src/constants.jsx")],
  bundle: true,
  format: "cjs",
  outfile: bundlePath,
  loader: { ".js": "jsx" },
  jsx: "automatic",
  external: ["react", "react-dom"],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": '""',
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
  },
  logLevel: "silent",
});
const { lokApi } = require(bundlePath);

// Module-level `after` runs once this file's tests finish, whether they pass
// or fail, so the scratch bundle never lingers or gets picked up by another
// tool's file glob.
after(() => rmSync(bundlePath, { force: true }));

function withStubbedFetch(t, impl) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  t.after(() => {
    globalThis.fetch = original;
  });
}

test("lokApi.pushSave fails closed when the preservation read is non-OK — no write sent", async (t) => {
  let postSent = false;
  withStubbedFetch(t, async (url) => {
    const u = String(url);
    if (u.includes("auth_saves") && u.includes("select=save_blob")) {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    if (u.includes("auth_saves")) {
      postSent = true;
      return { ok: true, status: 201, json: async () => ({}) };
    }
    throw new Error(`unexpected fetch: ${u}`);
  });

  const ok = await lokApi.pushSave(null, { loks: 5 }, "user-123");

  assert.equal(ok, false);
  assert.equal(postSent, false, "a failed read must never reach the write");
});

test("lokApi.pushSave fails closed when the read itself throws — no write sent", async (t) => {
  let postSent = false;
  withStubbedFetch(t, async (url) => {
    const u = String(url);
    if (u.includes("auth_saves") && u.includes("select=save_blob")) {
      throw new TypeError("network error");
    }
    if (u.includes("auth_saves")) {
      postSent = true;
      return { ok: true, status: 201, json: async () => ({}) };
    }
    throw new Error(`unexpected fetch: ${u}`);
  });

  const ok = await lokApi.pushSave(null, { loks: 5 }, "user-123");

  assert.equal(ok, false);
  assert.equal(postSent, false);
});

test("lokApi.pushSave still writes, and merges, on a genuine 'no row yet' read", async (t) => {
  let sentBody = null;
  withStubbedFetch(t, async (url, init) => {
    const u = String(url);
    if (u.includes("auth_saves") && u.includes("select=save_blob")) {
      return { ok: true, status: 200, json: async () => [] };
    }
    if (u.includes("auth_saves")) {
      sentBody = JSON.parse(init.body);
      return { ok: true, status: 201, json: async () => ({}) };
    }
    throw new Error(`unexpected fetch: ${u}`);
  });

  const ok = await lokApi.pushSave(null, { loks: 5 }, "user-123");

  assert.equal(ok, true);
  assert.ok(sentBody, "the normal first-sync case must still write");
  assert.equal(sentBody.save_blob.loks, 5);
});

test("lokApi.pushSave preserves a sibling app's key when the read succeeds", async (t) => {
  let sentBody = null;
  withStubbedFetch(t, async (url, init) => {
    const u = String(url);
    if (u.includes("auth_saves") && u.includes("select=save_blob")) {
      return { ok: true, status: 200, json: async () => [{ save_blob: { "616_survivor": { runs: 42 }, loks: 1 } }] };
    }
    if (u.includes("auth_saves")) {
      sentBody = JSON.parse(init.body);
      return { ok: true, status: 201, json: async () => ({}) };
    }
    throw new Error(`unexpected fetch: ${u}`);
  });

  const ok = await lokApi.pushSave(null, { loks: 5 }, "user-123");

  assert.equal(ok, true);
  assert.deepEqual(sentBody.save_blob["616_survivor"], { runs: 42 });
  assert.equal(sentBody.save_blob.loks, 5);
});

test("lokApi.fetchAuthSave throws on a non-OK response rather than returning null", async (t) => {
  withStubbedFetch(t, async () => ({ ok: false, status: 500, json: async () => ({}) }));
  await assert.rejects(() => lokApi.fetchAuthSave("user-123"));
});

test("lokApi.fetchAuthSave returns null only for a genuine empty row", async (t) => {
  withStubbedFetch(t, async () => ({ ok: true, status: 200, json: async () => [] }));
  assert.equal(await lokApi.fetchAuthSave("user-123"), null);
});
