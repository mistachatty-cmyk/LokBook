# LokBook To-Do List

This document outlines the major features and tasks remaining to bring LokBook from its current state to a full launch, based on the existing project plans.

## Core Architecture & Backend

-   ~~**Real User Authentication**~~: Magic-link sign-in is implemented and working (`src/auth/auth.js`), including a request timeout so a dropped connection surfaces an error instead of hanging. Google OAuth is coded but unverified against a real configured provider.
-   **Offline-First Storage**: Migrate from `localStorage` to IndexedDB (e.g., using Dexie.js) to handle larger data stores and improve reliability.
-   **Frame Storage Optimization**: Convert canvas frames from base64 data URLs to WebP blobs to reduce storage size.
-   **Real-time Multiplayer**: Set up a real-time backend (e.g., PartyKit) for live battles.
-   **CI/CD Pipeline**: Create a GitHub Actions workflow for automated testing and deployment.
-   **Error Reporting**: Integrate Sentry for crash and error reporting with user consent.

## Gameplay & Feature Implementation

-   **Real Social Feed**: Replace the local-only feed with a real-time feed backed by the Supabase database.
-   **Public User Profiles**: Create shareable profile pages at a `/u/:handle` URL.
-   **Post Sharing Links**: Implement public pages for individual posts at `/p/:postId`.
-   ~~**Pinch-to-Zoom**~~: Already present in the Studio Easel and Rooms' canvas. Fixed a real crash this pass — a degenerate (zero-distance) pinch produced `NaN` and permanently broke the canvas transform; guarded at the source plus a self-healing reset.
-   ~~**GIF Export**~~: Done — `feat_gif` module now exports real animated GIFs via `engine/gif.js`.
-   **Advanced Canvas Features**: Reference layer, custom palettes, and stroke smoothing are wired (`feat_ref`/`feat_palettes`/`feat_smooth`) — see `INERT_FEATURES.md`. Still open: additional canvas sizes/shapes (`canvas_infinite`/`circular`/`panorama`/`xl`) need real Easel coordinate-system work, `feat_tween` (auto-tween animation presets) is now built — Bounce/Shake/Fade/Wiggle synthesise in-between pages from the last drawn page.
-   ~~**Social platform connectivity (tier 1)**~~: Done — `SharePreview.jsx` shows a live, correctly-sized preview per platform (Reel/Story/Short 9:16, Square 1:1, native 4:5) and hands off via the OS share sheet or download. **Direct API posting (tier 2)** is still not started — needs a registered developer app + review per platform, which requires the user's own accounts/credentials, not something buildable from here. **Read-only embed (tier 3)** also not started.

## Gaps worth naming (asked for explicitly)

Things adjacent to what was requested that are *not* done, so they don't get
assumed working:

- **Album art / cover images.** The "drop a folder of MP3s and they all inherit
  the album cover PNG" flow does not exist. The player has no artwork concept
  at all — no per-track image, no folder import (browsers hand over a flat file
  list; folder structure needs `webkitdirectory`, which is desktop-only and
  unavailable on iOS Safari, so mobile would need a different affordance).
  This is the single biggest missing piece of the music vision.
- **Streaming playback.** Spotify/YouTube/SoundCloud links are stored as
  shortcuts that open out, and that is a hard platform limit, not a shortcut —
  those services forbid raw playback outside their own SDKs. Only files you
  add yourself actually play in-app.
- **Background/lock-screen playback.** Audio survives tab switches inside the
  app, but there's no Media Session metadata, so the OS lock screen shows
  nothing and hardware/headphone controls don't drive it. `navigator.
  mediaSession` would fix this and is small — just not done.
- **Visualiser styles.** There is one (bars). Making it a purchasable cosmetic
  category with several styles is an obvious shop fit and isn't built.
- **Per-track volume / normalisation.** One global volume only, so a quiet
  track and a loud one jump. No gain staging.

## Music (new direction, staged)

-   ~~**User playlists**~~: Done — named subsets of your own added tracks, create/delete/play, scopes the queue. `src/MusicPlayer.jsx`.
-   **Curated artist packs** (admin-only): a way for the LokBook team (not average users) to add official playlists from consenting artists — a named pack with one shared cover image and an attribution link (Instagram/website/Linktree) applied to every track in it. Needs: a Supabase table (or storage bucket) for curated tracks/cover art, RLS so only an admin/dev-gated account can write, and an admin UI — reuse the existing 7-tap `devMode` unlock pattern (`App.jsx`) as the gate rather than building new auth. Not started.
-   **"Clearance box" discovery shelf**: an animated strip of small album-cover squares (usually singles) at the bottom of the music player; hover/tap plays a random track from the box, tapping the box itself (not a cover) opens a fuller view of recommended small-catalog artists, each linking out to their preferred page. Depends on curated artist packs existing first. Not started.
-   **Per-play artist tokens/Loks**: a reward mechanic paying artists (in some LokBook-native credit) per play of their curated tracks. Explicitly flagged by the user as "deal with later, roadmap" — depends on curated packs, plus real economy/ledger design. Not started, deliberately deferred.
-   **Track remixing**: letting users remix/edit tracks they've added. Explicitly deferred by the user for a later pass. Not started.

## Five ideas worth considering (proposed, not built)

Offered as options, not decisions — each is scoped to what LokBook already
has rather than bolted on:

1. **The Well as a real place.** There's a whole world bible (wards, the Well,
   the Unbound) that currently only surfaces as flavour text in skin names and
   resident lore. A single "Wards" screen — pick a ward, see only artists and
   flips from it, with its skin previewing while you browse — would turn that
   writing into navigation. Cheap: the data (`BOT_PERSONAS[].ward`) already
   exists and is unused for anything.
2. **Flip-of-the-Day as an actual daily ritual.** Today it's a card in the
   feed. Make it a one-tap daily: one prompt, one flip, a 24h window, and a
   permanent dated archive you can flip back through like a real sketchbook.
   The streak system, daily prompt and `fodHistory` all already exist —
   they're just not tied together into a habit.
3. **Draw-along replays.** Every flip is already stored as ordered frames.
   Replaying them *as a lesson* — ghosting the artist's frames under your
   canvas while you follow — turns the whole existing gallery into tutorial
   content at zero authoring cost. The tutorial ghost pipeline
   (`tutorialGhostFrames`) is already built and only used for 4 hand-authored
   tutorials.
4. **Ink budget as a real constraint mode.** An optional mode where each flip
   gets a finite amount of ink, shown draining as you draw. It fits the world
   (ink comes from the Well), creates genuine artistic constraint, and gives
   LilLok's ink economy something to actually matter for. Purely additive —
   off by default.
5. **Two-artist relay flips.** One artist draws frames 1-3, hands off, another
   continues. Rooms already has the realtime channel, permission handoff
   ("the host hands you the pen") and shared canvas — this is mostly a new
   turn-taking rule on top of infrastructure that exists.

## Studio Pro — customizable workspace (future tier, explicitly not now)

The user's long-term vision for a paid "Studio Pro" tier: once every Studio item/module is unlocked, let a user rearrange tool panels modularly and customize their workspace layout, as a more advanced alternative to the current fixed layout. **Explicit instruction: do not build this now, and do not change the current (default/"legacy") Studio UI or layout to get there** — the current UI is intentionally being kept as-is for the average user (acknowledged as "cluttery" but not to be simplified/changed without a separate decision to do so). This entry exists purely to record the direction for whenever that work is actually scoped.

## Device compatibility

No access to real hardware in this environment, so claims here are code-review-level, not device-tested: touch/pinch handling, viewport units (`dvh` used where it matters for mobile browser chrome), and the fullscreen canvas mode should behave reasonably on phones, tablets (iPad and Android), and high-refresh-rate devices, but **none of this has been verified on real iPad/tablet hardware or high-end phones** (e.g. iPhone 17 Pro was specifically asked about) — flagging this honestly rather than claiming tested coverage that doesn't exist.

## Polish & Quality of Life

-   **UI Density Setting**: Implement the "Compact" UI density setting to reduce padding and margins for a tighter layout.
-   **"Fire" and "Ice" Name Colors**: Add the animations for the new name colors.
-   **Featured Shop Category**: Implement logic to show a rotating selection of featured items in the shop.
-   **Performance Optimization**:
    -   Ensure bot drawing does not block the UI.
    -   Optimize frame playback to maintain 60fps on mobile devices.
    -   Implement memory guards to handle large storage usage.
-   **Accessibility**: Perform a full manual pass to ensure color contrast meets WCAG standards.

---