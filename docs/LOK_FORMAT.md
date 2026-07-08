# The `.lok` File Format (LokFlip) — v1

## Goals
1. **Universally openable.** Any OS, any zip tool, any image viewer can extract something useful — even with zero knowledge of LokBook.
2. **Small.** Riso-style flipbooks use a tiny color palette and small frame-to-frame deltas — exploit both, hard, before falling back to generic compression.
3. **Self-describing.** A human-readable manifest; no external schema needed to know what's inside.
4. **Versioned.** The format can evolve without breaking old files — readers must check `version` and degrade gracefully.

## Why a ZIP container
`.lok` is a real ZIP archive (PK\x03\x04 local headers, STORE method, standard central directory). This is the actual mechanism behind the "opens anywhere" promise — every OS, every zip utility, every archive browser on earth already reads ZIP. We don't invent container-format compatibility; we borrow the most compatible container that exists and put our own efficient payload inside it, same approach used by OpenRaster (.ora), .docx, .usdz, and Java .jar.

## Layout
A `.lok` file contains exactly these entries:

| Entry | Required | Purpose |
|---|---|---|
| `manifest.json` | yes | Human-readable metadata (see below). Any tool can open this with a text editor. |
| `preview.png` | yes | Frame 0, full-quality standalone PNG. **Any image viewer, OS thumbnailer, or `<img>` tag can render this with zero LokFlip support.** This is the graceful-degradation guarantee. |
| `data.lokflip` | yes | The compressed animation payload (see codec below). Ignored by tools that don't understand it — they still got `preview.png`. |

All entries are stored with ZIP's STORE method (no zip-level compression) because `data.lokflip` is already compressed by our own codec — double-compressing wastes CPU for no size benefit. CRC-32 is computed correctly per entry so standard zip tools validate the archive normally.

## `manifest.json`
```json
{
  "format": "LokFlip",
  "version": 1,
  "generator": "LokBook",
  "width": 480,
  "height": 600,
  "frameCount": 14,
  "paceMs": [140, 140, 160, ...],
  "loop": true,
  "palette": [[242,237,226],[35,48,107],[255,93,162], ...],
  "bitsPerPixel": 4,
  "title": "Bounce study",
  "createdAt": "2026-07-08T00:00:00.000Z"
}
```
- `palette`: up to 256 RGB triples, the global palette for this flip (built once across all frames — see codec).
- `bitsPerPixel`: `ceil(log2(palette.length))`, clamped to {1,2,4,8}. Most riso flips land at 2–4 bits (≤16 colors), vs. PNG's implicit 24–32 bits/pixel.

## `data.lokflip` codec
Binary payload, decompressed with `DecompressionStream("deflate-raw")` before parsing:

1. **Frame 0** — full indexed bitmap, `bitsPerPixel`-packed, row-major, MSB-first.
2. **Frames 1..N** — delta against the previous frame's index array:
   - XOR-equivalent: `0` = pixel unchanged from previous frame, else the new palette index.
   - Run-length encoded as `(runLength: varint, literal: bit-packed indices)` pairs — hand-drawn flipbooks change a small fraction of pixels per frame, so runs of `0` dominate.
3. The whole byte sequence (frame 0 + all deltas) is passed through `CompressionStream("deflate-raw")` once as a final entropy-coding pass.

This beats a raw PNG-per-frame stack two ways: (a) bit-depth reduction from the shared palette (routinely 6–8× before any compression), (b) delta+RLE across frames removes almost all cost for near-static regions. Typical target: **≥10× smaller than the current base64-PNG-per-frame approach** for a normal flip.

`deflate-raw` is plain [DEFLATE](https://www.rfc-editor.org/rfc/rfc1951) with no zlib/gzip header — the same universally-implemented algorithm behind `zlib`, `.gz`, and ZIP itself. Any language's standard deflate library can decode `data.lokflip`; a JS runtime isn't required.

## Compatibility contract
- A reader that only understands ZIP: gets a valid, well-formed archive.
- A reader that understands ZIP + can view images: gets `preview.png`, a correct single-frame representation. **No JavaScript, no LokFlip support of any kind required for this tier.**
- A reader that understands ZIP + JSON: gets full metadata via `manifest.json` even without an animation player.
- A reader that implements the codec (any language with a deflate library — `data.lokflip` needs no browser-specific API): gets the full animated flip.

### Verified compatibility (not just self-consistency)
A file produced by the JS reference encoder was checked against implementations we did **not** write, each independently:

| Check | Tool | Result |
|---|---|---|
| ZIP integrity (CRC-32 of every entry) | `unzip -t` (Info-ZIP) | ✅ all entries OK |
| ZIP listing/structure | `unzip -l` / `unzip -v` | ✅ correct sizes, STORE method, valid CRCs |
| ZIP extraction | Python 3 `zipfile` (independent implementation) | ✅ `testzip()` reports no bad entries |
| ZIP extraction | Windows `Expand-Archive` (independent implementation) | ✅ extracts cleanly |
| `manifest.json` parsing | Python `json.loads` | ✅ parses, all fields present |
| `preview.png` decodability | Python Pillow/libpng (independent PNG decoder) | ✅ loads as a real 480×600 RGBA image |
| `data.lokflip` decompression | Node.js `zlib.inflateRawSync` vs. browser `DecompressionStream` | ✅ byte-identical output from two unrelated implementations |
| Cross-session decode | Fresh headless-browser context decoding a file it never encoded | ✅ correct frame count/dimensions/format |

### Known limitation
`CompressionStream`/`DecompressionStream` (used by the *browser* reference implementation for `data.lokflip`) requires a reasonably modern browser: Chrome 80+, Firefox 113+, Safari 16.4+. This has **zero effect on the universal-fallback tiers above** (ZIP/`preview.png`/`manifest.json` need no JS API at all) — it only affects JS-based decoding of the compressed animation payload in older browsers. A non-browser implementation (Node, Python, etc.) has no such constraint since it can use any standard deflate library.
- A reader that implements this spec: gets the full animated flip at a fraction of the size of naive frame storage.

## Versioning
- `manifest.version` must be checked before parsing `data.lokflip`. Version bumps are additive where possible (new optional manifest fields); breaking payload-codec changes require a version bump and readers must refuse (not guess) unknown versions.
- v1 is defined by this document and implemented in `src/engine/lokFormat.js`.

## Reference implementation
`src/engine/lokFormat.js` exports `encodeLok(frames, meta)` and `decodeLok(blob)`. See that file for the exact ZIP/CRC32/codec implementation — this document is the spec; the code is the reference implementation of it.
