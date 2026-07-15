# LOK_MASTER_PLAN.md — Brush Engine, current as of this session

**Supersedes `LOK_BRUSH_ENGINE_PLAN.md`** (that doc targeted the dead `lok_live.jsx` prototype — do not use it as a status reference anymore).

**Ground truth correction (this session):** the real drawing surface is **not** `src/Easel.jsx`. That file is only imported by `src/archive/Studio.jsx` and `src/archive/Battle.jsx` — dead code, same category as `lok_live.jsx`. The component the live app actually mounts is a second, divergent `Easel` defined inline inside `src/App.jsx` (~line 216). All brush-engine work must target that inline component. `src/Easel.jsx` may still be kept in sync for consistency if the archive is ever revived, but it is not what users draw with.

---

## Division of labor (locked in, don't drift from this)

- **Antigravity Claude**: all implementation against the real repo. Has actual file access, builds, runs the CI smoke-test gate.
- **This chat's Claude**: research, specs, review of pasted-back real code. Does not write final implementations against files it hasn't verified exist in the current repo.

---

## Status

| Item | Status | Notes |
|---|---|---|
| React default-import bug | ✅ Non-issue | Vite + `@vitejs/plugin-react` automatic JSX runtime doesn't need it. Do not reintroduce. |
| Pressure/velocity dynamics + coalesced events | ✅ Built & verified | In `src/App.jsx`'s real `Easel`, wired into `down`/`move`. `getCoalescedEvents()` drains per pointermove. |
| Layer transform (move/rotate/scale/flip) | ✅ Built & verified | Drag-preview via CSS transform, baked on commit via canvas snapshot. Gated behind `ccTier` (same gate as Fill/Eyedrop). |
| Expanded sizing (1–160 slider / 1–400 exact) | ✅ Built & verified | |
| Brush Lab (live editor + demo/save-gate) | ✅ Built & verified | 5 presets + 5 sliders (flow/scatter/dabs/jitter/roundness), live sine-wave preview canvas. "Use this brush" always free; "Save preset" gated behind `ccTier` — the app's real ownership pattern, not invented. |
| Real `Easel` port | ✅ Confirmed built & mounted | Verified via headless-Chromium (Playwright) pass: drew a pen stroke, opened Brush Lab, moved sliders, watched live preview update, applied + drew with custom brush, rotated/flipped/scaled via Transform, confirmed size slider/number stay in sync. Zero console errors. `npm run build` clean. |
| Commit / push | ✅ Done | `1cef40e` on `origin/master`. |
| `perfect-freehand` integration | ✅ Built & verified | Scoped to ink/pen brush only, `symmetry==="none"` (per spec's phased order — symmetry still uses the legacy stroked-line path, matching the spec's suggested first-pass scoping). `dynMul`/`sizeMulRef` dynamics are bypassed for this path; `simulatePressure` handles touch/mouse, real `e.pressure` used for stylus. Verified in-browser: tapered polygon stroke renders, eraser still cuts correctly through it (eraser bypasses the freehand path entirely — untouched). `npm run build` clean, zero console errors. Not yet extended to symmetry or other line-based brushes (deferred per spec: "only after both check out, consider migrating other line-based brushes over"). |
| On-device feel test of dynamics constants | 🟡 BLOCKED ON YOU | The `2.4` speed-scale constant and `0.55–1.2` clamp in `dynMul` are untested guesses. Nobody but a human with a screen and stylus/finger can tune these. |
| Custom-brush persistence beyond session | ✅ Resolved | Saved presets persist to `localStorage` under `lok:customBrushes`, gated by `ccTier`. |
| Mixbox pigment mixing | ⬜ Not started | Correctly low priority — current brush set is opacity-layered, not color-mixed. |
| WebCodecs video export | ⬜ Not started | Separate initiative, not blocking. |
| MessagePack `.lok` save format | ⬜ Not started | No `.lok` binary format exists yet — premature. |

---

## Immediate next steps, in order

1. **On-device test** — draw with the new dynamics AND the new tapered ink/pen strokes on an actual phone/stylus. Report back whether the `2.4` speed-scale constant feels twitchy or flat, and whether the tapered stroke feels right.
2. **Symmetry + perfect-freehand** — once (1) is confirmed good, decide whether to extend tapered rendering to symmetry mode (N `getStroke()` calls per move — needs a real perf check on a real device first, per the spec's caution).
3. **Other line-based brushes** (marker) — only after ink/pen + symmetry are both confirmed solid.

## Hard rule going forward
No plan doc should be treated as authoritative about "what's built" until it's been confirmed against actual pasted-back code, a build check, or (preferably) an in-browser smoke test — not just a spec handoff. This session's brush-engine work is the first item to clear that bar for real: build-verified and browser-verified, not just planned.
