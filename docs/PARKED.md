# Parked items

Things the Shop **shows but refuses to sell**, because they do not work yet.

This file exists because of a rule: *nothing sellable may quietly take Loks and
do nothing*, and *nothing pulled from sale may be forgotten*. Parking is the
middle path — the item stays visible so the roadmap is legible, the sale is
refused with a stated reason, and this file records what it would take to ship.

## How parking works

A parked item carries a `parked` field on its own catalogue row:

```js
{ id: "canvas_xl", type: "canvas", name: "Canvas XL", price: 350,
  parked: "Needs a resolution-independent stroke pipeline." }
```

`Shop.jsx`'s `refuseParked()` blocks the purchase and shows
`"<name> isn't active yet — <reason>"`, and `ShopItem` renders the
**Not active yet** badge. `verify:shop` fails the build if a parked item can be
bought, or if an item listed here has lost its `parked` field without being
removed from this file.

Three older mechanisms do the same job at coarser grain and are still in use:

| Mechanism | Grain | Where |
|---|---|---|
| `parked` field | **per item** | any catalogue row |
| `WIP_CATEGORIES` | per category | `src/pages/Shop.jsx:27` |
| `ARCHIVED_ROTATION_TYPES` | per rotation type | `src/engine/rotation.js:33` |

Prefer `parked`. A category flag is too coarse for a part-working list —
`POST_EXPORTS` has two real encoders and four that do not exist.

---

## Currently parked

### Studio canvas modules — 1,180 Loks

All four change the Easel's coordinate system and canvas geometry. This is
comparable in scope to the Rooms infinite-canvas work, not a wiring job.

| Item | Price | Needs |
|---|---|---|
| `canvas_infinite` — Infinite Scroll | 300 | A rebuilt Easel coordinate system; the canvas is fixed-size today |
| `canvas_xl` — Canvas XL | 350 | A resolution-independent stroke pipeline |
| `canvas_panorama` — Panorama | 280 | The Easel accepting a canvas wider than the viewport |
| `canvas_circular` — Circular Canvas | 250 | Polar canvas geometry in the Easel |

**Until this commit these were sold at full price with no warning** — the module
cards passed no `wip` prop and did not route through `buy()`.

### Layer packs — 1,020 Loks

Superseded by `TIERS`, which is the single source of layer count and is now sold
in the Shop's **Layer packs** section. These were dropped from the Shop's module
tabs but left priced in the catalogue, so the (currently unreachable)
`modTab === "all"` branch would put them straight back on sale.

| Item | Price | Needs |
|---|---|---|
| `layers_25` — Layer Pack M | 40 | Nothing. Buy the 25 tier instead |
| `layers_50` — Layer Pack L | 80 | Nothing. Buy the 50 tier instead |
| `layers_100` — Layer Pack XL | 150 | Nothing. Buy the 100 tier instead |
| `layers_200` — Layer Pack XXL | 250 | A 200 tier in `TIERS`, which stops at 100 |
| `layers_500` — Layer Pack LGD | 500 | A 500 tier in `TIERS` |

`layers_10` is the free base and stays unparked. The ids remain in the catalogue
so existing saves that reference them keep loading.

### Export formats — 420 Loks

`POST_EXPORTS` has seven entries. Two work, one is the free default, four have
no encoder anywhere in `src/`.

| Item | Price | Needs |
|---|---|---|
| `mp4` — MP4 Video | 150 | An MP4 encoder. The working exporter writes `.webm` and is already sold separately as the `anim_export_video` module |
| `pdf` — PDF Export | 120 | A PDF writer |
| `apng` — Animated PNG | 100 | An APNG encoder |
| `webp` — WebP | 50 | A WebP encoder |

Working today: `gif` (`src/engine/gif.js`), `spritesheet` (a tiled canvas
`toDataURL`), and `png` (free default).

### Whole categories — `WIP_CATEGORIES`

| Category | Reason |
|---|---|
| `postExport` | Category-level backstop; the per-item `parked` flags above are the real gate now |
| `musicPack` | 8 packs, 80–130 Loks. **No audio ships.** Needs licensed tracks, not code — which is why every code-level audit missed it |

Both tabs are additionally hidden behind the Legacy shop toggle (`DEAD_TABS`),
so neither costs anyone Loks today.

### Rotation types — `ARCHIVED_ROTATION_TYPES`

`export`, `lillok_skin`, `lillok_pet`, `lillok_gear`, `voice`, `avatar_accent`.
Blocked in both the UI and the handler. See `docs/ROTATION_ARCHIVE.md`.

---

## Not parked, but worth knowing

**`VOICE_PACKS` are not inert.** There is no audio, but whisper / echo / robot
genuinely restyle Blot's speech bubble (`src/LilLok.jsx:9-15`) — italic and
faded, letter-spaced with a shadow, and monospace uppercase respectively. They
are a **typography pack under a misleading name**. Renaming them is a product
decision, not a bug fix, so they stay sellable.

**`STICKER_PACKS` had a duplicate `space` id** at 40 and 35 Loks with different
sticker sets. The 35-Lok set is now `cosmos` — "Cosmos Pack". Nothing was
deleted and nobody lost a purchase, because the collision meant the 35-Lok pack
could never be equipped anyway.

---

## Picking something back up

1. Build the thing.
2. Delete the `parked` field from its catalogue row.
3. Delete its row from this file.
4. Run `verify:shop` — it fails if the two disagree.
