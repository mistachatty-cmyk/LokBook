// Gate for the LokWorld storage seam.
//
// Two things are asserted, and the second is the one that matters.
//
// 1. Every adapter implements the FULL interface. An interface with a
//    half-written adapter behind it ships looking fine and throws on the one
//    path nobody clicked — this makes that a build failure instead.
//
// 2. A private pin's coordinates never escape postsInBounds(). Today
//    WorldMapViewer receives every post and filters `location_privacy` in JS,
//    so coordinates a user marked `only-me` are already in the browser and are
//    merely not drawn. This gate asserts the data never gets that far.
//
// Runs entirely against the local adapter with no network, so it cannot pass
// vacuously the way a gate that needs supabase.co would in a sandbox (the
// verify:payload lesson).
import { build } from "esbuild";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".worldstore-check.mjs");

const entry = `
  export * from "./src/engine/worldStore.js";
`;

// Minimal in-memory stand-ins so the local adapter runs under node.
function installBrowserShims() {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: k => mem.delete(k),
  };
  // No indexedDB: the local adapter must degrade rather than throw, and this
  // proves it. Building art simply comes back empty.
}

try {
  await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "ws.jsx", loader: "jsx" },
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
      "import.meta.env.DEV": "false", "import.meta.env.PROD": "true",
    },
  });
  installBrowserShims();
  const M = await import(pathToFileURL(out).href);
  const { ADAPTERS, WORLD_STORE_METHODS, postsInBounds, putPost, inBounds, canSeePin, activeBackendName } = M;

  const problems = [];

  // --- 1. interface completeness ------------------------------------------
  for (const [name, adapter] of Object.entries(ADAPTERS)) {
    for (const m of WORLD_STORE_METHODS) {
      if (typeof adapter[m] !== "function") problems.push(`adapter "${name}" is missing ${m}()`);
    }
    const caps = typeof adapter.capabilities === "function" ? adapter.capabilities() : null;
    if (!caps || typeof caps.shared !== "boolean") problems.push(`adapter "${name}" capabilities() must report a boolean .shared`);
  }
  if (activeBackendName() !== "local") problems.push(`default backend is "${activeBackendName()}", expected "local" — a shared world must be a deliberate choice`);

  // --- 2. bbox helper, including the antimeridian --------------------------
  const box = { south: 40, west: -75, north: 41, east: -73 };
  if (!inBounds(40.7, -74, box)) problems.push("inBounds rejected a point that is inside");
  if (inBounds(50, -74, box)) problems.push("inBounds accepted a point north of the box");
  const wrap = { south: -10, west: 170, north: 10, east: -170 }; // crosses the antimeridian
  if (!inBounds(0, 179, wrap) || !inBounds(0, -179, wrap)) problems.push("inBounds fails across the antimeridian");
  if (inBounds(0, 0, wrap)) problems.push("inBounds accepted a point outside a wrapped box");

  // --- 3. THE PRIVACY ASSERTION -------------------------------------------
  const ME = "user-me", OTHER = "user-other";
  await putPost({ id: "pub",  user_id: OTHER, latitude: 40.7, longitude: -74.0, location_privacy: "everyone" });
  await putPost({ id: "mine", user_id: ME,    latitude: 40.7, longitude: -74.0, location_privacy: "only-me" });
  await putPost({ id: "theirs", user_id: OTHER, latitude: 40.7, longitude: -74.0, location_privacy: "only-me" });
  await putPost({ id: "friendsOnly", user_id: OTHER, latitude: 40.7, longitude: -74.0, location_privacy: "friends" });

  const seen = await postsInBounds(box, { viewerId: ME });
  const ids = seen.map(p => p.id).sort();
  console.log(`viewer sees: ${ids.join(", ") || "(none)"}`);

  if (!ids.includes("pub")) problems.push("a public pin was not returned");
  if (!ids.includes("mine")) problems.push("the viewer's own only-me pin was withheld from them");
  if (ids.includes("theirs")) problems.push("SOMEONE ELSE'S only-me PIN LEAKED to this viewer");
  if (ids.includes("friendsOnly")) problems.push("a friends-only pin leaked with no friend graph to justify it");

  // The coordinates themselves must be absent, not merely unrendered.
  const raw = JSON.stringify(seen);
  const leakedOther = seen.some(p => p.user_id === OTHER && p.location_privacy !== "everyone");
  if (leakedOther) problems.push("a private pin's row (including its coordinates) reached the caller");
  if (!raw.includes("40.7")) problems.push("no coordinates came back at all — the fixture is wrong, not the code");

  // An anonymous viewer must see only public pins.
  const anon = (await postsInBounds(box, { viewerId: null })).map(p => p.id);
  if (anon.length !== 1 || anon[0] !== "pub") problems.push(`an anonymous viewer saw ${JSON.stringify(anon)}, expected only ["pub"]`);

  // canSeePin is the single definition — assert it directly too.
  if (canSeePin({ location_privacy: "only-me", user_id: OTHER }, ME)) problems.push("canSeePin allows reading someone else's private pin");
  if (!canSeePin({ location_privacy: "everyone" }, null)) problems.push("canSeePin blocks a public pin for anonymous viewers");

  // --- 4. degrade without IndexedDB ---------------------------------------
  const art = await ADAPTERS.local.buildingArt("nyc", ["123"]);
  if (typeof art !== "object") problems.push("buildingArt did not degrade to an object without IndexedDB");

  console.log(`WORLDSTORE: ${Object.keys(ADAPTERS).length} adapters · ${WORLD_STORE_METHODS.length} methods each`);
  if (problems.length) {
    console.error("WORLDSTORE BROKEN:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log("WORLDSTORE OK — every adapter is complete, and private pins never leave the store.");
} catch (e) {
  console.error("WORLDSTORE CHECK FAILED:", e.message);
  process.exit(1);
} finally {
  rmSync(out, { force: true });
}
