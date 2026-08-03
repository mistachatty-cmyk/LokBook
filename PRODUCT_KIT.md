# LokBook — Product Kit / ID Writ
### Positioning for the Japanese market (日本市場向け)

**Status:** Alpha v1.2 · This is a positioning + feature document, not a launch claim.
See `INERT_FEATURES.md` for the honest state of what does and doesn't work.

---

## 1. The one-line

> **LokBook is a pocket flipbook studio and a bound world you live inside.**
> Draw a page. Draw the next. Watch it move. Show it to the ward.

Japanese framing: **パラパラ漫画をポケットに。**
(*Parapara manga in your pocket.*)

---

## 2. Why Japan is the lead market, not a localisation target

This product was not adapted for Japan — it independently landed on a stack of
things Japanese visual culture already invented and still practises daily. The
lead market should follow the product's actual grain.

| Product mechanic | Existing cultural anchor |
|---|---|
| Flipbook animation as the core unit | **パラパラ漫画** — taught in schools, drawn in notebook margins, a genuine folk form |
| Riso/duotone print aesthetic, paper grain, registration offset | **リソグラフ** and small-press zine culture; Retro Printing / print-gocco lineage |
| Self-publishing to a feed of peers | **同人誌** — the world's most developed amateur-publishing culture |
| LilLok: an ink creature you feed, that decays if neglected | **たまごっち** — Japan invented the care-pet genre |
| Daily/weekly rotating shop | **ガチャ** rotation literacy is near-universal |
| Prompt of the day, seasonal drift | **お題** drawing challenges; **二十四節気** seasonal awareness |
| Trace Rush — trace a ghost shape under time pressure | **なぞり書き** tracing practice; the kanji-drill instinct |
| Named wards, resident artists, a bound book-world | Dense worldbuilding expectation set by manga/anime |

**The thesis:** everywhere else this reads as a quirky drawing app. In Japan it
reads as *a familiar practice, finally done well on a phone.*

---

## 3. Product kit — what LokBook actually is

### 3.1 Studio — the drawing surface
Layered canvas with onion-skinning, per-frame timing, capture-and-flip workflow,
symmetry (mirror / 4-way / radial 4·6·8), pressure and speed dynamics, a Brush
Lab with saveable presets, pinch-zoom with an explicit **multi-finger paint**
mode, and Speed Draw (zen) mode.
*JP hook:* this is a パラパラ漫画 desk, not a generic paint app.

### 3.2 The Feed — a ward, not a timeline
Vertical flip-through feed, mood tags (calm/wild/moody/playful/dreamy/chaos/
cozy/spooky), Flip of the Day, daily streaks and prompts, echo (repost),
bookmarks, and **Resident of the Page** — a different AI resident featured at the
foot of the feed on every load, with their ward and a piece of world lore.

### 3.3 Battle — Lok N Slide
Same prompt, same clock, layered canvases. 1v1 / Triangle / 4-player / local
hot-seat co-op. Bot opponents with distinct styles, plus **real 1v1 duels**
between signed-in accounts. Featured-match 3× multiplier.
*JP hook:* お絵描き対戦 as a short-session format that fits a train ride.

### 3.4 Trace Rush — なぞり
Seven modes: Shapes, Stencils, INKSANITY, Characters, plus rule variants
**Precision** (tight tolerance, 1.6×), **Fading** (guide dims as you go) and
**Blind Ink** (three seconds to look, then draw from memory, 2×).
~115 target shapes.

### 3.5 LilLok — your ink familiar
An ink creature with ink/bond levels, four phases (thriving → decaying →
critical → stasis), a speech system tied to context (battle, publish, feed
scroll, morning/evening), skins, auras, pets, gear, and a revival flow where you
draw it back to life.
*JP hook:* the care-pet loop, native.

### 3.6 Rooms — shared infinite canvas
Code-gated private rooms and open "drift galleries", real-time strokes, stamps,
permission handoff (*hand the pen*), and journals.

### 3.7 Identity & discovery
Magic-link accounts, public artist profiles, cloud backup/restore, artist search,
and the **New Artists board** — the 200 most recent accounts, newest first;
artists pushed past #200 fall into a reshuffleable random pull so nobody
disappears.

### 3.8 The residents (AI artists)
Fourteen resident artists, each with a distinct **parametric generator** (never a
static image — every piece is unique to an artist+seed pair), plus a persona:
bio, medium, vibe, home ward, signature habit and lore. They post continuously
while you're in the app.

### 3.9 Music
Plug in your own MP3/M4A/MP4/WAV/FLAC. Stored on-device via IndexedDB so it
plays offline, continues across tabs, with an optional now-playing / up-next
ticker.
*JP hook:* pairs naturally with doujin music circles and indie album drops.

### 3.10 Economy & shop
Loks earned through play, daily/weekly gacha-style rotations, mythic tier with
animated previews, LokPass subscription, Lok Juniors safe mode for classrooms.

### 3.11 Accessibility & comfort
Display size (Compact/Normal/Large), compact density, **LokMotion**
(Off/Subtle/Full), haptic grammar, reduced-motion support throughout, session
PIN lock, and a Legacy toggle for both Studio and Shop.

---

## 4. The world (世界観)

> The **Lok** is a bound book you live inside.
> Each **ward** is a signature — a folded gathering of pages.
> **Ink** is drawn from the **Well** beneath them.
> A **LilLok** is ink that stayed long enough to grow an opinion.
> When a season turns, the book turns a page, and the wards shift.

**Known wards:** Compass Ward · Margin Fold · Nightleaf · The Quickyard ·
Grid Quarter · The Silent Column · Ash Ward · The Misprint · Coldpress ·
Kiln Row · The Unbound

This is deliberately shallow-but-consistent: enough shape to feel authored,
enough space that user work fills it in. Every resident's lore reinforces one
rule of the world (the Well, the fold, the misprint, the unbound edge).

---

## 5. Naming & language notes

| Term | JP surface | Note |
|---|---|---|
| LokBook | ロクブック | Keep the Latin mark; katakana as furigana |
| Flip / page | ページ · めくり | "Flip" translates naturally |
| Lok (currency) | ロク | Distinguish currency from the world by context |
| LilLok | リルロク | |
| Lok N Slide (Battle) | 対戦 | Consider a JP-native battle name |
| Trace Rush | なぞりラッシュ | |
| Ward | 丁目 / 区 | 丁目 reads warmer and more neighbourhood-like |
| Resident of the Page | 今日の住人 | "Today's resident" is the better JP idiom |

**Voice:** quiet, tactile, craft-respecting. Not hype. The app should feel like a
well-made stationery product — closer to a Midori notebook than a game UI.

---

## 6. Go-to-market notes

- **Mobile web + PWA first.** Installable, no store gatekeeping, works offline.
- **Seasonal cadence.** Tie shop rotation and prompts to 二十四節気 rather than
  generic weekly resets. This is the single highest-leverage localisation.
- **Doujin-adjacent distribution.** Comiket/Comitia circles, riso print shops,
  art-school stationery. This audience already self-publishes.
- **Classroom angle.** Lok Juniors + parapara manga's place in art education is a
  credible institutional wedge.
- **Music tie-in.** Indie/doujin album drops via the built-in player.

### Deliberately *not* doing
- No infinite scroll optimised for dwell time. The unit is a finished flip.
- No public follower counts as a status ladder.
- No AI image generation. The residents are parametric, not generative-model
  output — a meaningful distinction to a craft audience.

---

## 7. Honest state — read before pitching

Do not represent these as working. Full evidence in `INERT_FEATURES.md`.

**Working and verified:** accounts, public profiles, artist search, new-artist
board, feed, Studio drawing, trace modes, battles vs bots, post editing, music
player, LilLok, themes/effects/skies/FX, LokMotion, display size.

**Known broken or inert:**
- **40 of 52 Studio modules do nothing** — two Easel implementations exist and
  the one that honours modules (`src/Easel.jsx`) is never rendered. 28 of those
  are already built there and unlock on migration.
- Six shop categories inert (paper, cursors, fonts, stickers, export, music
  packs) — currently blocked from purchase and badged *NOT ACTIVE YET*.
- `layers_*` modules double-sell the same capability as the `TIERS` system.
- **No payments.** Stripe edge functions exist but aren't reachable; LokPass is
  free to toggle. **There is no revenue path yet.**
- Rooms and real duels are code-correct and connected but have never been
  exercised on two real devices.
- Ecosystem integration (Passport / Lifetime / shared credits) not started.

**Before any Japanese launch:** the Easel migration, payments, a native-speaker
localisation pass (the copy above is positioning, not translation), and real
device testing on the Japanese mobile carriers' default browsers.
