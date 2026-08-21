# LokBook

A hand-drawn flipbook social app (React + Vite). Draw frames in Studio, play them as animation, publish to the feed.

## Commands

```
npm run dev              # vite dev server, :5173
npm run build             # production build
npm run smoke              # renders the app shell headlessly, catches import/render crashes
npm run verify:rotation    # every sellable DAILY/WEEKLY rotation item resolves to a renderer
npm run verify:cosmetics   # every sellable PERMANENT cosmetic resolves to a renderer (effects/skies/papers/frames/borders/cursors/fonts/stickers/reactions/world skins)
npm run verify:world       # builds, then drives the real WorldMapViewer in headless Chromium — asserts the globe actually renders pixels and survives re-renders without rebuilding
npm run verify:easel       # mounts the real Easel, dispatches real PointerEvents, asserts vector strokes are captured and the raster path still renders
npm run verify:strokes     # .lokvec codec round-trip: fidelity, packing efficiency, rejection of corrupt payloads
npm run verify:lok         # drives real encodeLok/decodeLok in Chromium — proves stroke data stays additive and legacy readers keep working
npm run verify:export      # drives the real app: draw → capture → click .lok → reads the downloaded file, asserts it carries decodable strokes
npm run verify:bleep       # the BadBleep code box is reachable from Settings on a fresh profile, and Dev Flags stays hidden
npm run verify:header      # measures real header button geometry at 5 widths — no overlap, no oval squeeze, overflow scrolls instead of clipping
npm run verify:quiet       # an idle signed-in tab makes no repeat local saves and no duplicate auth_saves uploads
npm run verify:payload     # stubs PostgREST: list queries must not ask for `frames`, and lazy-loaded frames must still reach the DOM
```

## Working practices

Every one of these was paid for by a real bug in this codebase. They are not general advice.

- **A green build and smoke test do not mean a feature works.** World was 100% broken on every device — a `TypeError` on every open — while `build` and `smoke` both passed for weeks. `smoke` only renders the app shell. If a feature has a runtime surface, drive the real component in a real browser and assert on what it produced.
- **Prove a gate can fail before trusting it.** The first `verify:strokes` was decorative: its tolerance derived from the codec's own constant, so breaking the codec loosened the tolerance too, and its size threshold still passed with delta-encoding deleted. Sabotage each new gate, confirm a non-zero exit, then revert.
- **Reproduce before theorising.** Rounds were lost to plausible-sounding theories about the globe (CDN, connection, WebGL). Ten minutes of headless reproduction produced the actual exception, which was neither.
- **Check what is actually deployed before believing a bug report.** Production has repeatedly sat several commits behind, and one screenshot predated its own fix by 90 seconds. Confirm the live commit SHA first; give the user an immutable deployment URL, never a branch alias that drifts.
- **Surface real errors in the UI.** Generic "check your connection" copy actively misdirected debugging while a plain `TypeError` sat in `console.error` — unreadable on a phone, which is where it failed. Show `err.name: err.message`, make it selectable/copyable.
- **Saved-user-data changes are additive, and readers tolerate old shapes.** `owned[cat]` was written in two incompatible shapes by two buy handlers and silently double-charged people. `.lok` deliberately did not bump its version for a purely additive payload, because the shipped reader hard-throws on unknown versions.
- **Never ship a sellable or toggleable thing without a gate proving it resolves to something real.** `docs/AUDIT.md` Finding 2: 95 items took Loks and rendered nothing. That is what `verify:rotation` and `verify:cosmetics` exist to prevent.
- **Gate the wiring, not just the parts.** `verify:strokes`, `verify:lok` and `verify:easel` were all green while vector capture was completely inert: nothing called `getStrokes()` and `exportLok` never passed `meta.strokes`, so every `.lok` a user could produce was stroke-less. Each piece worked perfectly in isolation, which is exactly why no unit-level gate could see it. If a feature has a user-facing entry point, one gate has to start from that entry point (`verify:export` does).
- **A gate that cannot reach its subject passes vacuously.** `verify:payload` first tried to measure real Supabase responses; sandboxed Chromium cannot reach `supabase.co` at all (`ERR_CONNECTION_RESET`, and passing `HTTPS_PROXY` doesn't help), so it observed zero responses and reported OK. Stubbing PostgREST via `page.route` made it deterministic, offline, and able to fail. If a gate depends on a network the CI box may not have, stub it.
- **Report honestly.** Say which claims are verified, which are unverified, and what needs hardware. Do not describe something as confirmed when only the build passed.

Run `build`, `smoke`, `verify:rotation`, `verify:cosmetics` before any commit that touches cosmetics/rotation. Run `verify:world` after touching `WorldMapViewer.jsx`, `globe.gl`, or `three`. **None of these substitute for the others** — each was added after a specific class of bug shipped silently past the others (see docs/AUDIT.md, Finding 2, for the origin story).

## Architecture

- `src/App.jsx` — most of the app lives here as one large `LokApp` component tree with inline sub-components (`Profile`, `Feed`, `Viewer`, etc). Heavier pages are extracted to `src/pages/*.jsx` (`Shop`, `Battle`, `OpenFront`) and lazy-loaded.
- `src/constants.jsx` — every catalog (cosmetics, rotation items, studio modules, themes-adjacent config). Pure data.
- `src/engine/rotation.js` — the shared renderer registries (`ROTATION_EFFECTS`, `ROTATION_SKIES`, `ROTATION_PAPERS`, `ROTATION_FRAMES`, `ROTATION_BORDERS`, `ROTATION_CURSORS`, `ROTATION_FONTS`, `ROTATION_REACTIONS`). Despite the name, these back **both** the rotating daily/weekly shop and the permanent catalogs in `constants.jsx` — anything sold under either system resolves through the same table.
- `src/theme/theme.js` — 62 themes, each exposing `{ink,paper,accent,alt,card,shadow,onAccent}`. Access via `useT()`.

## The one pattern that matters most: cosmetics are data, not code

A new page effect / sky / paper / avatar frame / blot border / cursor / sticker pack / reaction pack is **one row** in the matching `ROTATION_*` table in `engine/rotation.js`, plus **one catalog entry** in `constants.jsx`. The renderers (`art.jsx`, `Easel.jsx`, `theme.js`, `cursors.js`) all check the generic table first, before falling back to hand-written branches. Do not add a new `if (effect === "...")` branch for a new item — that's the anti-pattern this whole system replaced.

**Before adding any sellable item, run `npm run verify:cosmetics`.** It's the only thing that actually checks the item resolves to something real — `build` and `smoke` both pass happily on an item that's sellable and renders nothing (`docs/AUDIT.md` Finding 2: 95 shipped that way). It also catches two specific failure modes that are easy to reintroduce: a particle spec naming a `@keyframes` that isn't declared globally (must be in `GlobalStyle` in `art.jsx`, not inside a legacy branch's own `<style>` tag — those never render on the generic path), and a reaction pack entry that isn't a real `ReactionIcon` type (raw emoji silently fall back to a generic splat icon).

## `owned[cat]` has two historical shapes — always use the helpers

`owned[cat]` has at different times been written as plain id strings and as `{id, ts}` objects, by two different buy handlers. **Never** read it with raw `.includes()` or `.some(o=>o.id===...)`. Use `ownsCosmetic(owned, cat, id)` / `ownedIds(owned, cat)` from `constants.jsx` — they tolerate both shapes (old saves may hold either).

## World (`src/components/WorldMapViewer.jsx`)

3D globe via `globe.gl` + `three` (dynamically imported, code-split). Landmines already hit here:

- `.autoRotate()` is **not** a globe.gl method — it's a property on `globe.controls()` (an `OrbitControls` instance), set *after* mounting.
- Don't add `resolve.dedupe: ['three']` to `vite.config.js` — it breaks three's subpath exports (`three/webgpu`, `three/tsl`) during esbuild pre-bundling. A single `three` instance is guaranteed instead by keeping `package.json`'s `three` range compatible with what `globe.gl` requires, so npm never installs a nested second copy. (Two copies = `matrixWorld.determinantAffine is not a function`, since meshes from one `three` get handed to a renderer from the other.)
- The globe-creation effect and the marker-data effect are **deliberately separate**. `posts.filter(...)` and inline arrow props create new identities every render; if they're in the creation effect's deps, the globe gets torn down and rebuilt continuously (the "infinite loading" bug). Memoize `posts`/`onPostClick` at the call site in `App.jsx`.
- The modal renders through `createPortal(..., document.body)`. The app root sometimes carries `filter` (Night Shift) or `animation` (quake), either of which makes it the containing block for `position: fixed` descendants and traps the modal inside the page.
- Full-screen ambience (`PageEffect`, Ink Weather) renders at `z-45`, below every modal. Modals generally sit at z-50+; World specifically is z-95 since it portals past the normal stacking context. Check `art.jsx`'s `LOK_Z_EFFECT` comment before changing either.
- Starfield: the flat canvas-generated image (`getStarfieldDataUrl`) is for the CSS backdrop **only**. The actual 3D scene uses a real `THREE.Points` starfield (`buildStarfield`) — painting the flat image onto globe.gl's background sphere magnifies it into blurry pixelated blobs, and no source resolution fixes that.

## Verification scripts (`scripts/`)

`verify-rotation.mjs` and `verify-cosmetics.mjs` esbuild-bundle a minimal entry importing just `constants.jsx`/`rotation.js` and check every sellable id resolves to a renderer table entry, string match, or explicit `WIP_CATEGORIES` disclaimer. `verify-world.mjs` builds with `LOK_TEST_HARNESS=1` (adds `world-harness.html` as a second Vite entry — never set in a normal build), spins up its own preview server, and drives the real component in Playwright/Chromium, including a churn test that re-renders it with fresh prop identities and fails if more than one `<canvas>` is ever created.

When adding a new gate like these: prove it can actually fail before trusting it (temporarily break something it should catch, confirm non-zero exit, revert).

## Lok Studio Pro (`src/engine/brushSpec.js`, `brushEngine.js`, `brushTips.js`)

A Photoshop-class brush engine behind the ✦ button at the **bottom right of the Studio canvas**.

- **Access is subscription-only** — `lokPass || ccTier`. `engine/deviceTier.js` never gates
  access; it only sizes the per-stroke dab budget, texture resolution and live-preview mode, so a
  slow phone with a subscription gets every control, just cheaper. Do not turn it into a paywall.
- **The engine is opt-in.** With the switch off, `stamp()` runs exactly as it always has — that is
  what `verify:easel` keeps proving. Never make Pro the default render path.
- **Spacing drives the walk, not pointer events.** `strokeTo()` consumes a *segment* and lays dabs
  by arc length; `state.carry` persists the remainder *between* events. Dropping that carry
  silently reintroduces input-rate-dependent density while still looking right in a single-segment
  test — `verify:brushengine` measures ink for the same line at 6 vs 90 events to catch exactly that.
- **A brush is one JSON row**, same rule as cosmetics. Every jitter control in the panel is the
  same `{amount, control, min}` channel through one `evalChannel()`. Adding a driver is a row in
  `DYNAMIC_CONTROLS`, not an `if` in nine places.
- **Never build a translucent colour by string concatenation.** `color + "88"` breaks on 3-digit
  hex and on the `rgb(r,g,b)` strings the eyedropper produces — it threw mid-stroke on Glow, Neon,
  Wash and Galaxy for anyone who used the eyedropper first. Use `withAlpha()` from `engine/brushes.js`.

Run `verify:brushspec` (data resolves) **and** `verify:brushengine` (the feature is actually wired,
driven from the real ✦ button) before any commit touching these. Neither substitutes for the other.
