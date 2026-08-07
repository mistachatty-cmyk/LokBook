# LokBook — Inert Feature Audit

**Generated:** August 2026 · post Easel migration, updated post double-sell/inert-module pass,
updated again post crash-fix/sharing/playlists pass · regenerate with `node scripts/audit-inert.mjs`

## 0a. Latest pass — skins, living backdrops, music A/V, feat_tween

- **`feat_tween` is no longer inert.** It was sold for 120 Loks and did
  nothing; it now synthesises in-between pages from the last drawn page by
  replaying it under a per-frame transform (Bounce / Shake / Fade / Wiggle).
  Each output is the source page re-drawn onto a clear W×H canvas, so
  transparency is preserved. Verified through the real UI: bought the module,
  the "auto-motion" row appeared (correctly hidden until owned), 1 page became
  9 after Bounce, and a pixel comparison of the thumbnails found 5 distinct
  images — which is exactly right for a bounce, since the arc is symmetric and
  the up/down halves share heights. Only `canvas_*` geometry remains unbuilt.

- **Skins 23 → 45.** New ones are drawn from the named wards in the world
  bible rather than invented palettes. Contrast verified programmatically
  across all 45 (ink-on-paper, ink-on-card, onAccent-on-accent): every pairing
  clears WCAG AA 4.5:1, zero flagged.
- **Five new living backdrops**, now selected by a `backdrop` field instead of
  hardcoded theme ids. Four are CSS (`wellrise`, `ashfall`, `misregister`,
  `driftpages`); `livedraw` is a canvas that generates strokes with the same
  parametric curve maths the resident artists use and draws them a few points
  per frame, then washes them out — the page is genuinely being drawn behind
  the app. Runs at 1× DPR / ~30fps / one stroke in flight, and is skipped
  entirely under reduced-motion or the "kill" pace preset.
- **Music visualiser** driven by a real Web Audio `AnalyserNode`, created
  lazily on first play and always reconnected to destination; any failure
  falls back to an idle pulse rather than risking silent playback (verified
  live that audio still plays after the rewire).
- **Video playback** — the player now uses a persistent `<video>` element
  instead of `new Audio()`, so the `.mp4`/`.webm` files the picker already
  accepted are watchable. It stays detached from the DOM for background audio
  and is only re-parented into the sheet for video tracks.
- **Volume** already existed but read as an unlabelled slider; added a
  mute/restore button and a numeric readout.
- **Five shop customizations**, each wired to a real renderer: Perspective
  guide + Isometric grid (Easel paper overlays), Riso offset frame, Ink drip
  avatar accent, Well blue / Ember name colours. Verified by buying one
  through the real UI and asserting the overlay is in the DOM — deliberately
  not another batch of decorative ids.

## 0. Earlier pass — bug fixes and new capability

- **Fixed a real Easel crash.** Pinch-zoom divided by the initial two-finger
  distance; if both touches land at ~the same point (a common way a pinch
  gesture starts on a touchscreen), that distance is ~0, producing `NaN` that
  poisoned `zoom`/`pan` state and broke the canvas transform permanently
  (no recovery without a reload). Fixed at the source (guard degenerate
  distances) plus a self-healing effect that resets zoom/pan to sane defaults
  if either ever goes non-finite, as a safety net against any other path.
  Verified via a simulated zero-distance pinch (CDP touch events) that the
  canvas survives and stays drawable afterward.
- **Fixed the sign-in button getting stuck on "Sending…" forever.** Same root
  cause as the Rooms timeout fix from earlier: `src/auth/auth.js` had no
  timeout on the Supabase auth calls, so a dropped/slow connection left the
  button spinning with no error and no way out but a reload. Added a 10s
  timeout to `signInWithEmail`/`signInWithOAuth`; verified the button now
  correctly reverts and shows an error instead of hanging.
- **Guest of the Pass — verified end-to-end at the database level**, not just
  read: minted a real code, redeemed it (got the exact save blob back),
  redeemed it again (still works — not single-use), and confirmed an unknown
  code returns null safely. This is the app's core answer to "what happens to
  my work if I never made an account" and should be treated as a primary,
  load-bearing feature, not a secondary safety net — messaging in both the
  post-publish prompt and Settings now says explicitly that redeeming returns
  "your whole gallery, Loks, and LilLok back exactly as you left them."
- **Fullscreen canvas can now fully take over the screen.** Previously capped
  at 62vh to leave room for the toolbar; added a second toggle (visible only
  in fullscreen) that collapses the toolbar so the canvas grows to ~92vh —
  for detail work where every pixel of screen matters.
- **New: Share preview for Instagram/TikTok/YouTube** (`src/SharePreview.jsx`).
  LokBook cannot post directly to those platforms — that requires a
  registered developer app and review on each platform's side, which doesn't
  exist. What this does honestly: renders a live, correctly-sized preview at
  each platform's real aspect ratio (Reel/Story/Short 9:16, Square post 1:1,
  or LokBook's native 4:5), then exports a video at that exact size and hands
  it to the OS share sheet (`navigator.share`, which lists Instagram/TikTok/
  YouTube if installed) or downloads it for manual upload.
- **New: user playlists** in the on-device music player (`src/MusicPlayer.jsx`).
  Named subsets of your own added tracks — create, delete, play a playlist
  (scopes the queue to just those tracks), "back to full queue" to clear.
  Verified end-to-end. Curated/official artist playlists with cover art and
  attribution links (the "clearance box" discovery concept, per-play reward
  tokens, remixing) are intentionally **not** built — see `TODO.md`, they need
  real content/assets and product scoping first.

"Inert" = the thing is declared, sold or toggleable in the UI, but **nothing
consumes it** — buying or flipping it changes nothing. Every entry below is
backed by a grep for the actual consumer, not by inspection.

---

## Summary

| Area | Total | Wired | Inert |
|---|---|---|---|
| Cosmetic categories | 16 | 14 | **2** |
| Studio modules | 47 | 43 | **4** (`layers_*` double-sell delisted, not deleted) |
| Equipped settings (theme/effect/sky/FX/…) | 10 | 10 | 0 |
| Shop categories surfaced | 16 | 13 | 3 (hidden in Simple mode) |

**This pass fixed:** `feat_gif` (real GIF export, wired to the existing
`engine/gif.js` encoder — it was fully built and just never called),
`feat_labels` (frame labels, built from scratch), `stickerPack` (Studio's
sticker button now actually reads the equipped pack instead of a hardcoded
emoji list). **This pass also found and removed a reverse bug** — `feat_batch`
was being sold for 40 Loks for a capability (duplicate/reverse/clear frames)
that was already free and unconditional; delisted rather than built, since
building a second gated copy of an already-free feature would just be
confusing. Same treatment for the `layers_*` double-sell (see §2).

**Previous run:** 11/16 cosmetics and 12/52 modules.

---

## 1. Resolved — the two-Easel split

There used to be two easels: `src/Easel.jsx` (which honoured `modules`) was
imported only by `src/archive/*` and never rendered, while a smaller inline
easel in `App.jsx` ran the app and ignored modules entirely.

`src/Easel.jsx` is now **the live easel**; the inline copy is deleted. Fixing it
required two pre-existing bugs in it:

- **Pen drew a single dot per stroke.** `strokePoints.current` was seeded on
  pointerdown but `move` never appended, so `getStroke()` always got one point.
- **No pointer events reached the canvas.** The zoom wrapper carries a
  `transform`, making it the containing block for its `absolute inset-0`
  children, but it had auto height and all children are absolute — so it
  collapsed to 0px tall and the input overlay had no hit area.

---

## 2. Studio modules — 4 of 47 still inert

**Wired (43).** All brushes (marker, chalk, air, calligraphy, neon, sparkle,
crayon, wash, galaxy, legacy pack), all tools (spray, glow, watercolor, pattern,
shape, gradient, push, smudge, clone, blur, replace, rulers, transform), and
features (blend, symmetry, palettes, reference layer, smoothing, brush-lab save,
canvas sizes) plus the six `anim_*` modules — **plus `feat_gif`, `feat_labels`
and `feat_tween`.**

**Not built anywhere (4)** — genuinely need engineering, not just wiring:
`canvas_infinite`,
`canvas_circular`, `canvas_panorama`, `canvas_xl` (all four need changes to the
Easel's coordinate system and canvas geometry — comparable in scope to the Rooms
infinite-canvas work, not a quick wire-up).

**Removed from sale (2):** `feat_batch` (was charging for an always-free
capability, see summary) and `brush_ink` was already free/default and never
gated anything — harmless as-is, left alone rather than touched for its own sake.
Note: `brush_cross` referenced in a previous version of this doc does not
exist as a Studio module id (only as an unrelated cursor cosmetic) — that was
a documentation error, corrected here.

**Resolved — the `layers_*` double-sell.** `layers_10 … layers_500` duplicated
the separate `TIERS` / `ownedTiers` system that actually controls layer count
— the live easel always receives `maxLayers` from TIERS (Studio passes it
explicitly) and never falls back to reading the `layers_*` modules, so buying
them did nothing. Fixed by removing the "Layers" tab from the Shop's module
browser (`src/pages/Shop.jsx`) so it can no longer be purchased; the module ids
themselves are left in `constants.jsx` since existing saves may already list
them as owned and there's no harm in an inert-but-unreachable id remaining.

---

## 3. Cosmetic categories — 2 of 16 inert

| Category | Status |
|---|---|
| nameColor, frame, reactionPack, avatarAccent, blotBorder, gear, lillokSkin, lillokAura, lillokPet, voicePack | ✅ wired |
| `paper` | ✅ wired — grid / dots / storyboard / graphite overlays |
| `cursorPack` | ✅ wired — 11 SVG data-URI cursors (`engine/cursors.js`) |
| `fontPack` | ✅ wired — sets the app root font-family |
| `stickerPack` | ✅ **now wired** — Studio's "+sticker" button reads `STICKER_PACKS.find(p=>p.id===stickerPack)` instead of a hardcoded 30-emoji list |
| `postExport` | 🟡 **partially wired** — owning the "gif" or "spritesheet" `postExport` item now also unlocks the real export buttons in Studio (`hasGif`/`hasSprite` check `owned.postExport` as an alternate path alongside the Studio-module gate). webp/apng/pdf/mp4 still have no real encoder behind them — those need actual libraries, not just wiring |
| `musicPack` | ❌ still inert — this needs bundled, licensed audio *assets* shipped with the app; there's nothing to wire without real files. Not started |

`musicPack` remains blocked from purchase and badged **NOT ACTIVE YET**. Note
this is a different system from the on-device music player (Settings → 🎵,
`MusicPlayer.jsx`) — that one lets a user plug in their own files and works
correctly (verified: add → persists across reload → plays). Its bug was pure
discoverability: the header's ♪ icon was actually the sound-effects mute
toggle, and there was no visible entry point to the real music player anywhere
outside Settings. Added a dedicated 🎵 button to the main header.

---

## 4. Verified working

Themes, page effects, skies, animation FX, flair, haptic grammar, fourth-wall,
celebration style, Legacy Studio + Legacy Shop toggles, accounts, public
profiles, artist search, new-artist board, duels, music player, post editing,
trace-mode variants, LokMotion, display size, and Studio drawing end-to-end
(pen / undo / redo / capture / layers).

**Also fixed this pass:** `store` only used the native shell's `window.storage`
with an in-memory fallback, so on the **web build nothing survived a refresh** —
gallery, Loks, LilLok, owned modules — while Settings claimed it saved to the
device. A localStorage rung was added; verified 325 Loks across a reload.

## 5. Known-inert toggles

- **`legacyBrushes`** — now reaches the live easel as `legacyMode` and gates the
  `brush_legacy_pack` toggle, so it is only meaningful once that module is owned.

---

## 6. Not started

- **Ecosystem integration** (`Lok-EcoSystsem`): LokPass / Passport / Lifetime
  Passport entitlements and a shared credit balance. That repo is an HMAC-signed
  token service (`lok-session`, `lok-grant`, `lok-spend`) with its own schema — a
  real integration, not a bolt-on.
- **Stripe checkout** — edge functions exist under `supabase/functions/` but are
  unreachable from the client. **LokPass is currently free to toggle; there is no
  revenue path.** Deliberately not touched this pass (explicitly deferred).
- **Rooms / duels on real devices** — code and RLS are still correct and
  Supabase is still connected, but a genuine two-device session has *still* not
  been exercised (this pass added a 10s request timeout to every `rooms/api.js`
  call so a dropped connection now surfaces an error instead of leaving
  "Opening…" spinning forever with no way out — but that's a robustness fix,
  not a substitute for a real multi-device test).
- **Social platform connectivity** (Instagram/TikTok): explicitly requested as a
  future direction — letting artists share their flips out to those platforms,
  or eventually embed/import a Reel. Not started, and the realistic path is
  staged: (1) short-term, a native share-sheet (`navigator.share`) pointing at
  an exported video/GIF — near-zero setup, works today's export pipeline; (2)
  medium-term, direct posting via the Instagram/TikTok Content Publishing APIs
  — both require a registered developer app, app review, and (for Instagram)
  a Business/Creator account on the artist's end; (3) embedding a Reel/TikTok
  video *inside* LokBook is a read-only oEmbed, not full integration, and
  carries no upload capability. None of this was attempted — it needs product
  scoping (which tier of the three above is worth building first) before any
  code.
- **`feat_tween`** (auto-tween animation presets) and the four `canvas_*`
  geometry modules (infinite/circular/panorama/xl) — see §2. Scoped, not
  attempted.

---

## Priority after this pass

1. **Payments** (Stripe) — still the single biggest blocker to viability.
2. **Real-device verification** of Rooms and duels — the timeout fix reduces
   how badly a bad connection fails, but doesn't confirm the realtime path
   itself works with two people.
3. ~~Resolve the `layers_*` double-sell.~~ Done this pass.
4. ~~Build or delist the (formerly) 10 unbuilt modules; build `stickerPack`.~~
   Done for `feat_gif`, `feat_labels`, `feat_batch` (delisted), `stickerPack`.
   Remaining: `feat_tween`, the four `canvas_*` modules, `musicPack` (needs
   real audio assets), and the non-GIF/spritesheet `postExport` formats
   (webp/apng/pdf/mp4 need actual encoders).
5. Ecosystem integration.
6. Social platform connectivity — scope which tier (share-sheet vs. API
   posting vs. embed) before building anything.
