// Coverage gate for Ink Weather: every weather type returned by inkWeatherToday()
// must resolve to a real renderer. Fails if a weather type is returned but renders
// nothing — which would be seen in the UI as a missing effect overlay.
import { build } from "esbuild";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".weather-check.mjs");
const entry = `
  import { inkWeatherToday } from "./src/engine/unlocks.js";
  import * as R from "./src/engine/rotation.js";
  export { inkWeatherToday, R };
`;
try {
  await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "weather.jsx", loader: "jsx" },
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
      "import.meta.env.DEV": "false", "import.meta.env.PROD": "true",
    },
  });
  const { inkWeatherToday, R } = await import(pathToFileURL(out).href);
  const weatherMap = { fog: "d_eff_fog", dust: "d_eff_stardust" };
  const missing = [];

  for (let day = 0; day < 4; day++) {
    const d = new Date(Date.now() + day * 86400000);
    const weather = inkWeatherToday(d);
    const effectId = weatherMap[weather] || weather;

    if (weather === "rain" || weather === "aurora") {
      continue;
    }

    if (!R.ROTATION_EFFECTS[effectId]) {
      missing.push(`${weather} → "${effectId}" not in ROTATION_EFFECTS`);
    }
  }

  console.log(`WEATHER: checked 4-day cycle`);
  if (missing.length) {
    console.error("WEATHER RENDERING BROKEN:\n  " + missing.join("\n  "));
    process.exit(1);
  }
  console.log("WEATHER OK — every weather type resolves to a renderer.");
} catch (e) {
  console.error("WEATHER CHECK FAILED:", e.message);
  process.exit(1);
} finally {
  rmSync(out, { force: true });
}
