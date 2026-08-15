---
description: Run every LokBook verification gate (build, smoke, rotation, cosmetics) and report a pass/fail summary
---

Run these in order, stopping at the first failure and showing its full output:

1. `npm run build`
2. `npm run smoke`
3. `npm run verify:rotation`
4. `npm run verify:cosmetics`

Do not run `npm run verify:world` as part of this — it's slower (spins up its own preview server and drives a real browser) and only needed when `WorldMapViewer.jsx`, `globe.gl`, or `three` changed. Mention it as an extra step if the diff touches those.

End with a one-line summary: which gates passed, and if anything failed, the exact error and which file it points to.
