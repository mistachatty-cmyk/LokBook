# LokBook — Agent Instructions

This file guides all AI agents working on the LokBook codebase (Claude, Gemini, opencode, and
anyone else). **Read `docs/MASTERPLAN.md` before starting any session** — it has the active
roadmap, task claiming protocol, and the incident writeup for the regression that motivated it.

## Golden Rules

1. **App.jsx is the monolith, with six named exceptions that ARE real imports.** All page
   components (Feed, Battle, Profile, Studio, Viewer, Onboard, OpenFront) are defined INSIDE
   App.jsx as local functions — most of `src/pages/` is genuinely stale, do NOT import from it.
   **Exception:** `src/pages/Rooms.jsx`, `src/rooms/*`, `src/identity.js`, `src/engine/botArt.js`,
   `src/theme/ThemeBackdrop.jsx`, and `src/engine/bleepbox.js` ARE imported by App.jsx and are
   load-bearing features (Lok Rooms, own-identity/starter-handles, generative bot artists, animated
   theme backdrops, the cheat-code engine). **Before treating any file as dead, run
   `grep '^import' src/App.jsx` — do not trust a stale doc's claim that something is unused.** A
   previous session wholesale-regenerated App.jsx from an old snapshot and silently deleted all six
   of these; see MASTERPLAN.md §1 for the postmortem and how to avoid repeating it.
2. **Drawing utilities import from `engine/draw.jsx`.** Functions like `paperBase`, `risoCircle`, `makeRng`, `renderSequence` are imported, not defined locally.
3. **Constants live in `constants.jsx`.** Check before adding new ones.
4. **`lok_live.jsx` is DEPRECATED.** Never edit it. It's for reference only.
5. **Theme hook everywhere.** Components use `const T = useT()` for colors/borders.
6. **Build:** `npm run build`. Dev: `npm run dev`.
7. **No TypeScript, no tests, no linter config.** Pure JSX throughout.
8. **State is monolithic** — ~65 `useState` hooks in App.jsx. Add new state at the top block.

## Feature Implementation Pattern

New features typically need:
1. State variable(s) in App.jsx (add near other state, ~line 100)
2. Feature logic (add as hook/callback in the middle section)
3. UI components (add as local functions or JSX in the render area)
4. Save/persistence in the save blob (add to store blob builder)

## Drawing Conventions
- Canvas is 480×600
- 2-ink risograph aesthetic: `ART.paper` bg, `ART.ink` for strokes, `ART.pink`/`ART.teal` accents
- Use `lok-btn` class for buttons, `lok-display` for display text
- Animations: `animation: "lokrise .25s ease"` for entry, `lokbob` for bobbing
- Styling: `style={{border:`3px solid ${T.ink}`, background:T.card, color:T.ink}}` pattern

## State Pattern
```jsx
const[feature,setFeature]=useState(defaultValue);
```
Add near other `useState` calls. Add save in the persist blob:
```jsx
save.feature=feature;
```
Add restore in the load section:
```jsx
if(save?.feature!==undefined)setFeature(save.feature);
```

## Session Log — July 2026 Quality Sweep

Completed:
- **C1** Nested `useEffect` extracted to top level (ambient bot posts now generate)
- **C2** `dangerouslySetInnerHTML` replaced with React element split (XSS closed)
- **C3** `post.frames.length` crash guarded with `post?.frames?.length??0`
- **B1** Seed collision fixed via `Set` in `makeMatchBots`
- **B2** `BOT_FLOURISH` per-bot overlay; `renderPromptArt` gets `botName` param
- **B3** `botMomentum()` dynamic draw pace; `pickMidLine()` mid-match chat
- **P1+P2** `PROMPT_META` with 60+ prompts across 10 categories, each with `"static"|"loop"|"transform"` motion type; toggle-chip filters in Battle lobby
- **U1** Search bar in Feed — input, Supabase `ilike` query, results list, clear button
- **U2** Echo/repost button in FeedCard — creates post copy with ↻ prefix, +2 Loks
- **U3** Keyboard nav in Viewer — Escape closes, ArrowLeft/ArrowRight navigates
- **U4** Backdrop click closes Viewer
- **L2** `notifications` persisted in save blob
- **L3** Supabase fetch on init pulls top 6 ranked `lok_posts`, merges with local gallery
- **L4** `beforeunload` handler saves instantly on tab/window close
- **Phase 0a** Speech box cutoff — `LilLok.jsx:14` maxWidth 180→280
- **Phase 0b** Loading screen — outer IIFE `.finally(setReady)` + 10s fallback timeout (`App.jsx:884,888`)
- **Phase 0c** Settings crashes — `setPinUnlocked`, `setLoks`, `setTotalEarned` added to Profile destructure + call (`App.jsx:638,951`)
- **Phase 1** `legacyStudio` + `legacyBrushes` state, restore, persist, Settings toggle, threaded to Studio call (`App.jsx:818,867,890,953,729,951`)
- **Phase 2a** `brush_legacy_pack` + 6 anim modules added to `STUDIO_MODULES` (`constants.jsx:355-362`)
- **Phase 2b** Easel.jsx fully rewritten — all 14 improved brushes, legacy wrappers via `legacyRef`, `pointerRef` for pressure/tilt/twist, legacy pack toggle button in toolbar (`Easel.jsx`)
- **Phase 2c** `legacyBrushes` threaded Studio→Easel, `onLegacyToggle` prop wired for persistence (`App.jsx:317,354,1084`, `Easel.jsx:15,160`)
- **NewStudioUI** FPS selector, playback controls, pro onion skin, timeline zoom, video export, spritesheet export, auto-advance, reverse, copy/paste/clear frame, lightbox — dual render path at `App.jsx:1084` (`legacyStudio ? <Studio /> : <NewStudioUI />`)
- **D2** Dead code sweep — 5 stale pages files moved to `src/archive/`, 17 unused exports removed from `constants.jsx`, 4 internal helpers de-exported in `draw.jsx`
- **CI/CD** 4 GitHub Actions workflows: PR checks (`ci.yml`), Cloudflare Pages deploy (`deploy-web.yml`), Supabase migrations + edge functions deploy (`deploy-supabase.yml`), Tauri desktop release on tags (`release-tauri.yml`)
- **Security** Hardcoded Supabase anon key removed from `supabaseClient.js` — requires `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Null guards added to `auth.js` for when Supabase is unconfigured. Playwright pinned as devDep (no extraneous packages). `build:steam` script added.

Remaining (low priority):
- L1: Feed seeding — now handled by C1, bots auto-post ambient flips

**D1/D3 — phantom dead-code items, already resolved (Jul 2026):** `Onboard` and `OpenFront` have always been local functions inside `App.jsx` (lines 71, 632). No separate `src/pages/Onboard.jsx` or `OpenFront.jsx` files existed — the AGENTS.md "Remaining" entry was a stale plan artifact. The 17 unused exports in `constants.jsx` and 4 de-exported helpers in `draw.jsx` (the real D2 sweep) are done. Do not re-open dead-code sweeps for Onboard/OpenFront.

## CI/CD Pipeline

3 workflows in `.github/workflows/`:

| File | Trigger | Action |
|------|---------|--------|
| `ci.yml` | push/PR → `master` (repo's real default branch — was pointed at `main` and had zero runs until fixed, Jul 2026) | `npm ci → build → smoke` |
| `deploy-supabase.yml` | push `master` (migrations/fns only) or manual | `supabase link → db push → functions deploy` (3 edge fns) |
| `release-tauri.yml` | tag `v*` | Cross-platform Tauri build + upload .msi/.dmg/.AppImage to release |

**Web deploy is NOT a GitHub Actions workflow.** Cloudflare Pages' native
Git integration (OAuth-connected directly in the Cloudflare dashboard,
Jul 2026) builds and deploys `dist/` on every push to `master` — no repo
secrets, no workflow file. A `deploy-web.yml` wrangler-based Action existed
briefly but was deleted to avoid double-deploying against the native
integration. **Do not re-add a web deploy workflow** without first checking
whether Cloudflare's native Git connection is still active (Cloudflare
dashboard → Workers & Pages → lokbook project → Settings → Builds & deployments).

⚠️ `deploy-supabase.yml`/`release-tauri.yml` depend on repo secrets
(`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `TAURI_PRIVATE_KEY`,
`TAURI_KEY_PASSWORD`) that have **not been confirmed as configured** — they'll
fail at the deploy step if unset. Verify in GitHub Settings → Secrets before
relying on auto-deploy.

**Secrets** (set in GitHub repo Settings → Secrets and variables → Actions):
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `TAURI_PRIVATE_KEY`, `TAURI_KEY_PASSWORD`.

Supabase project ref: `jfavkudihasswkhkouxq` (LokServices). `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` are required in `.env.local` — no hardcoded fallbacks remain. The CI smoke test stubs them to empty strings (app gracefully degrades with `supabase = null`).

## About This File
This file was created by the agent in the initial overhaul session (July 2026). It captures the codebase conventions for all future AI collaborators.
