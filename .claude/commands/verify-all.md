---
description: Run every LokBook verification gate (build, smoke, rotation, cosmetics) and report a pass/fail summary
---

Fast gates — run these in order, stopping at the first failure and showing its full output:

1. `npm run build`
2. `npm run smoke`
3. `npm run verify:rotation`
4. `npm run verify:cosmetics`
5. `npm run verify:strokes`

Browser gates — slower (each builds and drives headless Chromium). Run only the ones the diff touches:

- `npm run verify:world` — if `WorldMapViewer.jsx`, `globe.gl` or `three` changed
- `npm run verify:easel` — if `Easel.jsx` or stroke capture changed
- `npm run verify:lok` — if `lokFormat.js` or `strokeCodec.js` changed

These bind port 4173/4174/4175, so kill stale servers between runs with `pkill -f "[v]ite"` — note the bracket, which stops pkill matching its own command line and killing the shell.

Say plainly which gates ran and which did not. Never describe an unrun gate as passing.

End with a one-line summary: which gates passed, and if anything failed, the exact error and which file it points to.
