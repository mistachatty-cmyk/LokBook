# Rotation archive — parked, not deleted

17 of the 74 daily/weekly rotation items are **archived**: still defined in
`src/constants.jsx`, still visible in the Shop, but badged and **blocked from purchase**
instead of silently taking Loks. Nothing was deleted.

The other 57 are live — see `docs/AUDIT.md` Finding 2 for what was broken and
`src/engine/rotation.js` for the wiring. Run `npm run verify:rotation` to check the split.

## Why these are parked

They need a real engine or licensed assets, not wiring. Every category that could be
expressed as data or CSS was made live instead of archived.

| Type | Items | What it actually needs |
|---|---|---|
| `export` | 4 | Real encoders. `d_export_png_hd` / `w_export_4k` need a re-render of every frame at higher DPI through the existing export path; `d_export_svg` needs vector tracing (a genuine algorithm, not a setting); `d_export_json` is the cheapest — a documented frame-data schema plus a serializer. **Start with `d_export_json`.** |
| `avatar_accent` | 6 | Hand-drawn SVG. `FramedAvatar` draws crown/horns/antenna/drip as inline SVG paths, not from a table — each new accent is illustration work. Crescent Moon and Star Chart are the simplest (a circle mask and a dot field); Clockwork and Galactic Orbit need animated transforms. |
| `lillok_skin` | 2 | `LilLok.jsx` renderer support for a second skin channel. Phantom (translucent) is close to doable via opacity; Prism Scale needs a real pattern fill. |
| `lillok_pet` | 2 | A pet is a second animated entity with its own idle loop — the renderer currently draws one creature. |
| `lillok_gear` | 2 | Gear anchors to LilLok's head/body; needs attachment points the renderer doesn't expose yet. |
| `voice` | 1 | A tone bank. `VOICE_PACKS` styles the speech bubble; Melody Pack promises *musical tone responses*, which means actual audio synthesis through `bleepbox.js`. |

## How to bring one back

1. Build the renderer support (or ship the asset).
2. Add the item's id to the matching visual table in `src/engine/rotation.js`
   (`ROTATION_FRAMES`, `ROTATION_EFFECTS`, … — add a new table if it's a new category).
3. Add its `type` to `ROTATION_TARGET` and remove it from `ARCHIVED_ROTATION_TYPES`.
4. `npm run verify:rotation` — it fails if an item is sellable with nothing behind it.
5. `npm run build && npm run smoke`.

The verify script is the guard rail: it will not let a rotation item go back on sale
without a renderer, which is exactly how all 74 became inert in the first place.

## Ordered by effort

1. `d_export_json` — a serializer and a documented schema.
2. `d_acc_crescent`, `w_acc_stars` — static SVG accents.
3. `d_skin_phantom` — opacity channel on the existing LilLok renderer.
4. `d_export_png_hd`, `w_export_4k` — higher-DPI re-render of the export pipeline.
5. `d_acc_clock`, `d_acc_wings`, `d_acc_flame`, `w_acc_galactic` — animated SVG.
6. `d_gear_crown`, `d_gear_scarf` — needs attachment points first.
7. `d_pet_spark`, `w_pet_wisp` — second animated entity.
8. `d_voice_melody` — audio synthesis.
9. `d_export_svg` — vector tracing, the hardest of the set.
