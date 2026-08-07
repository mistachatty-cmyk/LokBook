# LokBook

*A home for tiny hand-drawn animations.*

## What it is

LokBook is a mobile-first drawing and social app built around one small unit
of content: the **flip** — a short, looping, hand-drawn animation, usually
2–20 frames, drawn frame-by-frame like a flipbook. You draw in **Studio**,
publish to a **Feed**, and from there the app is built around a few
tight loops: compete in **Battle**, race the clock in **Trace Rush**, draw
live with friends in **Rooms**, and raise a small living-ink companion
called a **LilLok** that grows alongside your gallery.

The visual language is deliberately riso-print: bold ink borders, hard drop
shadows, one loud accent color per theme (26 themes to choose from). The
positioning is craft-first, not engagement-first — no AI image generation
(the app's "resident" artists are procedural, not model-generated), no
infinite-scroll-optimized feed, no public follower counts as a status ladder.
The unit is a finished flip, not a scroll session.

## The core loop

1. **Draw** in Studio — pen, brush, layers, onion-skinning, a real freehand
   stroke engine (`perfect-freehand`), capture pages one at a time.
2. **Publish** to your gallery and the shared Feed.
3. **Get seen** — vote, bookmark, "Lok" (follow) other artists, discover
   through a rotating cast of procedural resident artists who post
   ambiently so the feed never feels empty.
4. **Compete** — Battle (1v1 duel, triangle, 4-player FFA, local co-op, or a
   10-player Big Battle) and Trace Rush (7 modes: shapes, stencils,
   characters, INKSANITY, plus precision/fading/blind rule variants).
5. **Raise** — a LilLok companion with its own bond/ink lifecycle, skins,
   auras, pets, and gear, fed by your activity.
6. **Draw together** — Rooms: an infinite shared canvas, either private
   (invite by code, you choose who draws) or a public "drift gallery"
   anyone can wander into and leave one small mark ("bleep") per day.

## What makes it distinct

- **A real drawing engine, not a toy.** Pressure-sensitive freehand strokes,
  layers, onion-skinning, blend modes, symmetry guides, a brush lab for
  custom presets, and a growing set of paid Studio modules (brushes, tools,
  animation features) that unlock real capability, not cosmetic-only tiers.
- **Export that leaves the app.** Animated GIF, spritesheet, WebM video, and
  a native `.lok` open animation format — your work isn't trapped here.
- **A fullscreen, distraction-free canvas.** Every drawing surface in the app
  has a one-tap fullscreen toggle that hides all app chrome and lets the
  canvas fill the screen — for when you just want to draw.
- **Guest-friendly by design, not by accident.** You can use the entire app
  without an account. If you're a guest, LokBook actively looks out for your
  work: a dismissible prompt after publishing offers sign-in or a **Guest
  Pass** — a ghost-themed recovery code (e.g. `hollow-well-4821`) that lets
  you recover your gallery from any device, no account required, and never
  expires. A second prompt watches for guest saves aging past a
  user-configurable window (default 7 days) and nudges again before local
  storage might quietly clear it.
- **A world, not just a UI.** LokBook has a light in-world vocabulary — the
  **Well** ink is drawn from, **wards** (neighborhoods) residents belong to,
  a LilLok as "ink that stayed long enough to grow an opinion." It's shallow
  by design: enough shape to feel authored, enough space for a user's own
  work to fill in the rest.
- **Procedural residents, not generated art.** The feed's ambient artists
  (inkwell_iz, tinta, mooncrayon, and a dozen others) each have a distinct
  parametric drawing style, personality-driven sub-styles, and a skill
  counter that makes their work visibly improve the longer they've been
  "active" on your device — all without an image-generation model.

## Where it stands today (alpha)

Fully working end-to-end: accounts (email magic link), public profiles,
artist search, the full Studio drawing pipeline (including GIF/video/
spritesheet export and a fullscreen canvas mode), Battle, Trace Rush, Rooms'
lobby and canvas, Guest of the Pass, the on-device music player, LilLok,
themes/effects, and display settings.

Still ahead: real payments (Stripe functions exist but aren't wired to the
client yet — LokPass is currently free), a confirmed two-device test of
Rooms' realtime drawing, a handful of Studio modules that need real
engineering rather than wiring (auto-tween presets, alternate canvas
geometries), and social platform connectivity (Instagram/TikTok) — see
`INERT_FEATURES.md` for the full, continuously-updated ledger of what's
wired versus what still needs work, and `TODO.md` for the broader roadmap.

## Where to look in the code

| Concept | Lives in |
|---|---|
| Main app shell, tabs, most page components | `src/App.jsx` |
| The drawing engine (pen, layers, tools) | `src/Easel.jsx` |
| Shop, cosmetics, modules | `src/pages/Shop.jsx`, `src/constants.jsx` |
| Rooms (shared infinite canvas) | `src/pages/Rooms.jsx`, `src/rooms/` |
| Procedural resident artists | `src/engine/botArt.js` |
| Guest of the Pass | `src/engine/guestPass.js`, `src/GuestSavePrompt.jsx` |
| Music player | `src/MusicPlayer.jsx`, `src/engine/musicStore.js` |
| Theming (26 themes, tokens) | `src/theme/theme.js` |
| World lore, go-to-market notes | `PRODUCT_KIT.md` |
| Live feature-status ledger | `INERT_FEATURES.md` |
