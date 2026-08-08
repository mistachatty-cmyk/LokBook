# LokBook — Launch Readiness Audit

**Date:** August 2026 · **Branch:** `claude/lokbook-edits-bugs-bik0cm`
**Method:** MASTERPLAN A12/A15 — grep the constant, then grep where it is *consumed*. If the only
consumer is the Shop's own render, the item is sold but decorative.

This is the roadmap row **A12** ("audit remaining Shop categories … for sold-but-broken items"),
which was marked ⬜ not started. It is now done, and the row is updated.

Scope note: `INERT_FEATURES.md` already covers cosmetics and Studio modules well. This audit does
**not** duplicate it — it covers the parts A12 named that `INERT_FEATURES.md` does not reach
(the mythic/daily/weekly rotations), plus the state of the tooling and the quality gate.

---

## Finding 1 — The build+smoke gate was RED on `master` 🔴 *(fixed in this commit)*

`npm run smoke` failed on a clean checkout, with no local changes:

```
SMOKE FAILED: useAuth must be used within AuthProvider
```

**Why it matters more than the error itself.** MASTERPLAN §2.3 makes `npm run smoke` mandatory
before every commit, and §1's postmortem exists *because* a regression reached `origin/master`
without a gate. A permanently-failing gate means the gate is being skipped — which is the same
condition that produced the July 2026 regression. `npm run build` passing is not a substitute;
§2.3 says so explicitly.

**Root cause.** `src/main.jsx` mounts the app as `<AuthProvider><App/></AuthProvider>`. The smoke
harness rendered `App`'s default export bare, so the first `useAuth()` call threw. `App.jsx` calls
`useAuth()` in four places (lines 109, 639, 936, 1209), so this failed immediately and unconditionally
— it was not intermittent, and it masked every crash the smoke test exists to catch.

**Fix.** `scripts/smoke.mjs` now bundles a small entry that wraps `App` in `AuthProvider`, mirroring
`main.jsx`. The test now renders the app the way it is actually mounted. Gate restored:
`SMOKE OK — rendered 2024 chars`.

---

## Finding 2 — 95 rotation items are sold but inert 🔴 *(largest sold-but-broken surface in the app)*

This is the part of A12 nothing had audited. Counts from `src/constants.jsx`:

| Set | Items | Price range | Consumers outside Shop | Verdict |
|---|---|---|---|---|
| `DAILY_ITEMS` | 49 | 25–350 | **none** | ❌ fully inert |
| `WEEKLY_ITEMS` | 25 | 55–500 | **none** | ❌ fully inert |
| `MYTHIC_ITEMS` | 21 | 1500–5000 | 1 partial path | 🟡 near-inert |

### Daily and weekly (74 items) — nothing consumes them at all

`dailyOwned` and `weeklyOwned` appear at exactly four places in `src/App.jsx`, and **not one of them
renders anything**:

- `1226` — state declaration
- `1291` — load from save
- `1317` — write to save blob
- `1447` — passed into `<Shop>`

So the purchase is recorded and persisted faithfully, and then never read by anything that draws.
Buying "Nebula Haze" for 80 Loks, or "Wisp" for 500, changes nothing anywhere in the app. The items
carry `type` values (`frame`, `effect`, `sky`, `paper`, `cursor`, `avatar_accent`, `blot_border`,
`font`, `lillok_skin`, `lillok_pet`, `voice`, `export`, `sticker`, `reaction`, `name_color`) that
*look* like the wired cosmetic categories but live in a completely separate id-space that no
renderer consults.

### Mythic (21 items) — pay 5000 Loks for a label

`mythicEquipped` has exactly one real consumer, `Studio` at `App.jsx:365`, and it does two things:

1. `hasCanvasBorder = mythicItem?.type === "canvas_border"` → an animated border. **One** of the 21
   items has that type (`mythic_canvasframe`).
2. A badge chip reading "✨ {name} active" with a `MythicPreview` thumbnail (lines 403–405).

The other 20 items therefore produce a caption claiming the effect is active, and no effect. The
descriptions promise specific behavior — *"A nebula of stars follows your brush"*, *"Summon lightning
with every stroke"* — that is never rendered.

**Compounding bug:** `App.jsx:1435` branches on `legacyStudio`, which **defaults to `false`**
(line 1213). `mythicEquipped` is passed to `Studio` (the legacy UI) but **not** to `NewStudioUI`
(line 1437). So even the one working mythic and the badge are invisible in the default Studio —
they only appear if the user finds "Legacy Studio UI" in Settings and turns it on.

---

## Finding 3 — `scripts/audit-inert.mjs` reported false INERT 🟡 *(fixed in this commit)*

The generator `INERT_FEATURES.md` tells you to regenerate from produces wrong verdicts:

```
INERT   stickerPack    0 consumer(s)
INERT   postExport     0 consumer(s)
```

Both are actually wired — `stickerPack` at `App.jsx:1434` (the `+sticker` button reads
`STICKER_PACKS.find(...)`), `postExport` at `App.jsx:464` (`hasGif`/`hasSprite`). `INERT_FEATURES.md`
§3 is correct and the script is wrong.

**Root cause:** the script only greps `cosmetics.<key>` (line 23). But the app stores these two as
*top-level state* (`const [stickerPack, setStickerPack] = useState("emoji")`, `App.jsx:1225`), not
under the `cosmetics` object. The script cannot see any category stored that way.

This matters because the doc header says "regenerate with `node scripts/audit-inert.mjs`" — doing
so would overwrite correct findings with false ones. Per MASTERPLAN §2.5, docs that lie are worse
than no docs, and this repo already has one incident caused by exactly that.

The script was also blind to all 95 rotation items in Finding 2 — it never looked at them.

**Fix.** The script now (a) counts top-level-state consumers as well as `cosmetics.<key>` ones, and
(b) audits the three rotation arrays directly, discounting save/load/Shop plumbing. It now agrees
with hand-verification on every category — `musicPack` is the only genuinely inert cosmetic, which
is what `INERT_FEATURES.md` §3 says — and it reports the rotation gap on its own:

```
WIRED   stickerPack    1 consumer(s)  [top-level state]
WIRED   postExport     1 consumer(s)  [top-level state]
INERT   musicPack      0 consumer(s)

== ROTATION ITEMS (mythic / daily / weekly) ==
PARTIAL MYTHIC_ITEMS   21 items · mythicEquipped: 3 real consumer(s) (App.jsx:363,365,1436)
INERT   DAILY_ITEMS    49 items · dailyOwned: 0 real consumer(s)
INERT   WEEKLY_ITEMS   25 items · weeklyOwned: 0 real consumer(s)
```

Regenerating `INERT_FEATURES.md` from it is now safe.

---

## Finding 4 — MASTERPLAN A12 was stale 🟡

A12 was marked ⬜ not started, but `INERT_FEATURES.md` §3 already audited cursors, fonts, music,
export and stickers. Only the rotations were genuinely unexamined. Row updated to ✅ with the
rotation findings noted.

---

## Launch blockers

Confirmed against the codebase. Ordered by severity for a **public beta**.

| # | Blocker | Roadmap row | Status |
|---|---|---|---|
| 1 | No report/block mechanism, with an open party feed and public drift-gallery rooms | C1 | ⬜ open |
| 2 | Supabase RLS permissive-alpha by design — public write access to shared tables | A14 | ⬜ open |
| 3 | Kids/Juniors mode may not exclude Rooms/drift-galleries (co-drawing with strangers) | C2 | ⬜ **unverified — must be checked, not assumed** |
| 4 | No moderation on the community stamp library (user-drawn, discoverable) | C3 | ⬜ open |
| 5 | 95 rotation items take Loks and do nothing | — | 🔴 Finding 2 |
| 6 | No WCAG contrast pass across all 55 themes | D4 | ⬜ open |
| 7 | Rooms/duels never exercised on two real devices | — | ⬜ open |

Items 1–4 are safety and data-integrity gates: they involve strangers, user-generated content, and
minors, and none of them are cosmetic. Item 5 is an economy-integrity gate — the app currently
charges for ~95 things it does not deliver.

**Not a blocker under the stated assumption** (public beta, free): Stripe checkout. Edge functions
exist under `supabase/functions/` but are unreachable from the client, and LokPass is free to
toggle. `INERT_FEATURES.md` calls payments "the single biggest blocker to viability" — true for
*revenue*, not for shipping a free beta.

---

## Recommended order

1. **Keep the gate green.** Done here. Nothing else is trustworthy while the smoke test is red.
2. **Fix the rotation economy (Finding 2).** Either wire the items to real renderers or delist them.
   Precedent exists both ways: `feat_gif` was wired, `feat_batch` and `layers_*` were delisted. 74
   items with zero consumers is a delist-or-build decision, not a wiring task — and it needs a
   product call on refunding Loks already spent.
3. **Pass `mythicEquipped` to `NewStudioUI`**, or accept that mythics are legacy-only and say so in
   the Shop. The current state — sold at up to 5000 Loks, invisible in the default UI — is the worst
   of both.
4. **Fix `audit-inert.mjs`** to check top-level state and the rotation arrays, so the doc it
   generates stops being wrong.
5. Then the safety gates (C1, C2, C3, A14).
