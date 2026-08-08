// Coverage gate for rotation items: every DAILY/WEEKLY item must either be
// archived on purpose, or resolve to a real renderer entry. Fails loudly if an
// item is sellable with nothing behind it -- the bug docs/AUDIT.md Finding 2
// describes (74 items took Loks and rendered nothing).
import { build } from "esbuild";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".rotation-check.mjs");
const entry = `
  import { DAILY_ITEMS, WEEKLY_ITEMS, NAME_COLOR_MAP } from "./src/constants.jsx";
  import * as R from "./src/engine/rotation.js";
  export { DAILY_ITEMS, WEEKLY_ITEMS, NAME_COLOR_MAP, R };
`;
try {
  await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "rot.jsx", loader: "jsx" },
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
      "import.meta.env.DEV": "false", "import.meta.env.PROD": "true",
    },
  });
  const { DAILY_ITEMS, WEEKLY_ITEMS, NAME_COLOR_MAP, R } = await import(pathToFileURL(out).href);
  const tables = {
    frame: R.ROTATION_FRAMES("#000", "#fff", 64), name_color: NAME_COLOR_MAP,
    paper: R.ROTATION_PAPERS, blot_border: R.ROTATION_BORDERS("#000", "#fff"),
    reaction: R.ROTATION_REACTIONS, effect: R.ROTATION_EFFECTS, sky: R.ROTATION_SKIES,
    cursor: R.ROTATION_CURSORS, font: R.ROTATION_FONTS, sticker: R.ROTATION_STICKERS,
  };
  let live = 0, archived = 0; const missing = [];
  for (const it of [...DAILY_ITEMS, ...WEEKLY_ITEMS]) {
    if (R.isArchivedRotation(it)) { archived++; continue; }
    const t = R.rotationTarget(it);
    if (!t) { missing.push(`${it.id} — type "${it.type}" has no target`); continue; }
    const tbl = tables[it.type];
    if (!tbl || !(it.id in tbl)) missing.push(`${it.id} — type "${it.type}" has no visual`);
    else live++;
  }
  console.log(`ROTATION: ${live} live · ${archived} archived · ${DAILY_ITEMS.length + WEEKLY_ITEMS.length} total`);
  if (missing.length) { console.error("SELLABLE BUT INERT:\n  " + missing.join("\n  ")); process.exit(1); }
  console.log("ROTATION OK — every sellable rotation item resolves to a renderer.");
} catch (e) {
  console.error("ROTATION CHECK FAILED:", e.message); process.exit(1);
} finally { rmSync(out, { force: true }); }
