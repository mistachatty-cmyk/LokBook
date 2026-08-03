# LokBook — Inert Feature Audit

**Generated:** August 2026 · regenerate with `node scripts/audit-inert.mjs`

"Inert" = the thing is declared, sold or toggleable in the UI, but **nothing
consumes it** — buying or flipping it changes nothing. Every entry below is
backed by a grep for the actual consumer, not by inspection.

---

## Summary

| Area | Total | Wired | Inert |
|---|---|---|---|
| Cosmetic categories | 16 | 11 | **5** |
| Studio modules | 52 | 12 | **40** |
| Equipped settings (theme/effect/sky/FX/…) | 10 | 10 | 0 |
| Shop categories surfaced | 16 | 10 | 6 (hidden in Simple mode) |

The single biggest win available is the **Easel migration** (see Priority 1).
It alone converts ~28 inert modules into working features.

---

## 1. Root cause: there are two Easels

| File | Status | Supports |
|---|---|---|
| `src/Easel.jsx` (58 KB) | **dead in the live app** — imported only by `src/archive/Studio.jsx` and `src/archive/Battle.jsx` | `modules`, palettes, reference layer, stroke smoothing, canvas sizes, brush-lab save, legacy brush pack, `paper` |
| inline `Easel` in `src/App.jsx` (~line 295) | **live** | layers, `ccTier` pro tools, symmetry, zoom, multi-touch paint |

`src/Easel.jsx` is the implementation that actually honours purchasable Studio
modules — and it never renders. That is why 40/52 modules do nothing.

Note: `src/Easel.jsx` calls `getStroke(strokePoints.current, …)` correctly, so it
does **not** carry the freehand bug that was fixed in the inline easel.

---

## 2. Studio modules — 40 of 52 inert

Honoured by the live easel (12):
`brush_marker`, `brush_chalk`, `tool_transform`, `feat_brushlab_save`,
`feat_blend`, `feat_symmetry`, `anim_fps`, `anim_playback`, `anim_onion_pro`,
`anim_export_video`, `anim_export_spritesheet`, `anim_timeline_zoom`

**Implemented only in the archived easel (28)** — these light up the moment the
Easel migration lands:
`brush_air`, `brush_calligraphy`, `brush_neon`, `brush_sparkle`, `brush_crayon`,
`brush_wash`, `brush_galaxy`, `brush_legacy_pack`, `tool_spray`, `tool_glow`,
`tool_watercolor`, `tool_pattern`, `tool_shape`, `tool_gradient`, `tool_push`,
`tool_smudge`, `tool_clone`, `tool_blur`, `tool_replace`, `tool_rulers`,
`feat_ref`, `feat_palettes`, `feat_smooth`, `canvas_sizes`

**Not implemented anywhere (12)** — these need to be built or removed from sale:
`feat_gif`, `feat_batch`, `feat_tween`, `feat_labels`, `canvas_infinite`,
`canvas_circular`, `canvas_panorama`, `canvas_xl`, `brush_cross`, `brush_ink`
(always-on baseline), and the `layers_*` family.

⚠️ The `layers_10 … layers_500` module ids duplicate the separate `TIERS` /
`ownedTiers` system that actually controls layer count. Selling both is
double-charging for the same capability — pick one.

---

## 3. Cosmetic categories — 5 of 16 inert

| Category | Status | Note |
|---|---|---|
| nameColor, frame, reactionPack, avatarAccent, blotBorder, gear, lillokSkin, lillokAura, lillokPet, voicePack | ✅ wired | |
| `paper` | ❌ inert | Only the archived easel reads `paper`. |
| `cursorPack` | ❌ inert | No CSS cursor is ever set from it. |
| `fontPack` | ❌ inert | Font family is hardcoded on the app root. |
| `stickerPack` | ❌ inert | Studio sticker UI exists but ignores the owned pack. |
| `postExport` | ❌ inert | Export is PNG-only; `POST_EXPORTS` is decorative. |
| `musicPack` | ❌ inert | No bundled audio ships. The new Settings → Music player supersedes this. |

All five are already blocked from purchase and badged **NOT ACTIVE YET** in the
Shop, so no one can spend Loks on them.

---

## 4. Verified working

- Themes (`THEMES[uiTheme]`), page effects, skies, animation FX, flair
- Haptic grammar, fourth-wall, celebration style
- Legacy Studio toggle (swaps the whole Studio component)
- Accounts, public profiles, artist search, new-artist board, duels
- Music player, post editing, trace-mode variants, LokMotion

## 5. Known-inert toggles

- **`legacyBrushes`** — persisted, passed to both Studio components and on to the
  easel as `legacyMode`, but the live inline easel does not destructure it.
  Only meaningful to the archived easel (`brush_legacy_pack`). Resolves with the
  Easel migration.

---

## 6. Not started

- **Ecosystem integration** (`Lok-EcoSystsem`): LokPass / Passport / Lifetime
  Passport entitlements and a shared credit balance across apps. The repo is an
  HMAC-signed token service (`lok-session`, `lok-grant`, `lok-spend` edge
  functions) with its own schema — a real integration, not a bolt-on.
- **Stripe checkout** — edge functions exist under `supabase/functions/` but are
  not reachable from the client; LokPass is currently free to toggle.
- **Rooms live verification** — code and RLS are correct and Supabase is now
  connected, but a real two-device session has never been exercised.
