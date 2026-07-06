// Render smoke test: bundles the app and server-renders LokApp.
// Catches runtime crashes (TDZ, undefined identifiers, bad hooks) that
// `vite build` cannot see. Gate: npm run build && npm run smoke.
import { build } from "esbuild";
import { createRequire } from "module";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
// bundle must live inside the project so require() can resolve react from node_modules
const out = join(dirname(fileURLToPath(import.meta.url)), "..", ".smoke-bundle.cjs");

try {
  await build({
    entryPoints: ["src/App.jsx"],
    bundle: true,
    format: "cjs",
    outfile: out,
    loader: { ".js": "jsx" },
    jsx: "automatic",
    external: ["react", "react-dom"],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
      "import.meta.env.DEV": "false",
      "import.meta.env.PROD": "true",
    },
    logLevel: "silent",
  });

  const React = require("react");
  const { renderToString } = require("react-dom/server");
  const App = require(out).default;
  const html = renderToString(React.createElement(App));
  if (!html || html.length < 50) throw new Error("render produced no output");
  console.log("SMOKE OK — rendered", html.length, "chars");
} catch (e) {
  console.error("SMOKE FAILED:", e.message);
  process.exit(1);
} finally {
  rmSync(out, { force: true });
}
