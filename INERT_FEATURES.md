# LokBook — Inert Feature Audit

**Generated:** August 2026 · post Easel migration · regenerate with `node scripts/audit-inert.mjs`

"Inert" = the thing is declared, sold or toggleable in the UI, but **nothing
consumes it** — buying or flipping it changes nothing. Every entry below is
backed by a grep for the actual consumer, not by inspection.

---

## Summary

| Area | Total | Wired | Inert |
|---|---|---|---|
| Cosmetic categories | 16 | 13 | **3** |
| Studio modules | 52 | 36 | **16** (6 are `layers_*` duplicates) |
| Equipped settings (theme/effect/sky/FX/…) | 10 | 10 | 0 |
| Shop categories surfaced | 16 | 13 | 3 (hidden in Simple mode) |

**Previous run:** 11/16 cosmetics and 12/52 modules. The Easel migration and the
shop pass moved 24 modules and 3 cosmetic categories into working state.

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

## 2. Studio modules — 16 of 52 still inert

**Wired (36).** All brushes (marker, chalk, air, calligraphy, neon, sparkle,
crayon, wash, galaxy, legacy pack), all tools (spray, glow, watercolor, pattern,
shape, gradient, push, smudge, clone, blur, replace, rulers, transform), and
features (blend, symmetry, palettes, reference layer, smoothing, brush-lab save,
canvas sizes) plus the six `anim_*` modules.

**Not built anywhere (10)** — build or stop selling:
`feat_gif`, `feat_batch`, `feat_tween`, `feat_labels`, `canvas_infinite`,
`canvas_circular`, `canvas_panorama`, `canvas_xl`, `brush_cross`, `brush_ink`
(always-on baseline — should probably not be a purchasable id at all).

**Duplicated (6).** `layers_10 … layers_500` duplicate the separate `TIERS` /
`ownedTiers` system that actually controls layer count. The live easel takes
`maxLayers` from TIERS and only falls back to `getModuleLayers(modules)`.
⚠️ Selling both is double-charging for one capability — pick one system.

---

## 3. Cosmetic categories — 3 of 16 inert

| Category | Status |
|---|---|
| nameColor, frame, reactionPack, avatarAccent, blotBorder, gear, lillokSkin, lillokAura, lillokPet, voicePack | ✅ wired |
| `paper` | ✅ **now wired** — grid / dots / storyboard / graphite overlays |
| `cursorPack` | ✅ **now wired** — 11 SVG data-URI cursors (`engine/cursors.js`) |
| `fontPack` | ✅ **now wired** — sets the app root font-family |
| `stickerPack` | ❌ inert — Studio sticker UI ignores the owned pack |
| `postExport` | ❌ inert — export is PNG-only; `POST_EXPORTS` is decorative |
| `musicPack` | ❌ inert — no bundled audio ships; Settings → Music supersedes it |

The three remaining are blocked from purchase and badged **NOT ACTIVE YET**, so
no one can spend Loks on them.

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
  revenue path.**
- **Rooms / duels on real devices** — code and RLS are correct and Supabase is
  connected, but no genuine two-device session has been exercised.

---

## Priority after this pass

1. **Payments** (Stripe) — now the single biggest blocker to viability.
2. **Real-device verification** of Rooms and duels.
3. Resolve the `layers_*` double-sell.
4. Build or delist the 10 unbuilt modules; build `postExport` (GIF/MP4 is the
   most-requested) and `stickerPack`.
5. Ecosystem integration.
