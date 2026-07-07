# LokBook — Social Sandbox

A home for tiny hand-drawn animations. Social Sandbox for creative expression, collaborative drawing, battles, and virtual pets.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18, JSX |
| Build | Vite 6 + esbuild |
| CSS | Tailwind CSS v4 |
| Backend | Supabase (Postgres + REST + Realtime) |
| PWAs | vite-plugin-pwa (auto-update) |
| Auth | Supabase Auth (magic link, Google, GitHub) |
| Drawing | HTML5 Canvas 2D (480×600, risograph-style) |
| Animations | CSS keyframes + Web Animations API |

## Architecture

### Rendering Pipeline
```
User draws on Easel (480×600 canvas)
  → stroke data (points + color + brush + layer)
  → per-frame composite() on <canvas>
  → frames → data URLs (webp, ~72% quality)
  → post object stored in localStorage + optionally Supabase
```

### State Management
- ~65 `useState` hooks in App.jsx (monolithic, no reducer/Redux)
- `store.get/set` abstraction wrapping a `Map` + `localStorage` + optional OPFS storage
- Save key: `"lok:save:v2"` (full state), `"lok:gallery:v2"` (user posts)
- Throttled save on every state change (400ms debounce)

### Routing
No React Router — simple `tab` string state: `"feed" | "gallery" | "studio" | "battle" | "front" | "shop"`. Viewer rendered as overlay when `openIdx !== null`.

### Game Loop
- **Ink decay:** LilLok ink drains every 12 seconds (faster with low bond). 2 minutes at zero ink → stasis.
- **Daily:** Streak tracking, prompt rotation from `PROMPTS` array
- **Quest system:** Items from `QUEST_POOL` assigned daily, completion tracking, milestone bonuses at 10/25/50/100
- **Pace:** `PACE_PRESETS` (minimal/snap/sweep/cinema) control animation duration multiplier

### Economy
- **Currency:** Loks (earned: voting +5, viewing +3, battles +5/25, quests, daily streak, Rush)
- **Spend:** themes (40–250), effects (20–40), name colors (20–80), layers (40–150), Studio Pro (120), Big Battle (50), ink flask (10)
- **Anti-abuse:** `earnLog` caps at 120 Loks/hour

## File Map

```
/
├── index.html                    # Entry HTML (PWA, viewport, EthicalAds)
├── vite.config.js                # React + Tailwind + PWA plugins
├── package.json                  # React 18, Vite 6, Supabase, Tailwind
├── postcss.config.js
├── lok_live.jsx                  # DEPRECATED — legacy single-file app (reference only)
├── supabase/
│   ├── schema.sql                # Main tables + RLS
│   ├── schema_rooms.sql          # Rooms tables + RLS
│   └── migrations/               # DB migrations
├── public/
│   ├── favicon.svg
│   └── icon.svg
├── src/
│   ├── main.jsx                  # Entry: mounts <App /> in StrictMode
│   ├── App.jsx                   # Monolithic main app (~800 lines, all page components inline)
│   ├── constants.jsx             # All constants: PROMPTS, PACE_PRESETS, TIERS, EFFECTS, etc.
│   ├── art.jsx                   # FramedAvatar, ReactionIcon, SkyEffect, PageEffect, AnimFX, GlobalStyle
│   ├── Easel.jsx                 # Drawing canvas (layers, brushes, tools, undo/redo)
│   ├── LilLok.jsx                # Virtual pet: LilLokBubble, LilLokSprite, LilLokPanel
│   ├── EmptyState.jsx            # Reusable empty state component
│   ├── ErrorBoundary.jsx         # Class-based error boundary
│   ├── InterventionFX.jsx        # Battle effect visuals
│   ├── NameTag.jsx               # User name with gradient colors
│   ├── identity.js               # Handle generation + validation
│   ├── ads.js                    # Ad provider config
│   ├── supabaseClient.js         # Supabase singleton
│   ├── auth/
│   │   ├── auth.js               # Low-level auth (sign in/out, tokens, onAuthStateChange)
│   │   ├── AuthContext.jsx        # React auth provider + useAuth hook
│   │   └── AuthGate.jsx          # Sign-in UI (magic link, OAuth)
│   ├── engine/
│   │   ├── draw.jsx              # Drawing engine (paperBase, risoCircle, 14+ painters, MiniDraw)
│   │   ├── bots.js               # Bot AI (9 personalities, skill curves, adaptive difficulty, taste-based judging, battle recording)
│   │   ├── promptArt.js          # Bots that draw the actual prompt: 23 seeded recipes covering PROMPTS+KID_PROMPTS ("Sketch Artists" bot style)
│   │   ├── lillok.js             # LilLok AI (state machine, Blot Brain, smart dialogue)
│   │   ├── botArt.js             # Parametric resident-artist feed posts (9 seed-based painters, distinct from Battle bots)
│   │   └── gif.js                # Minimal GIF encoder (256-color, LZW)
│   ├── theme/
│   │   ├── theme.js              # 12 themes + ThemeCtx/useT hooks
│   │   └── ThemeBackdrop.jsx     # Animated CSS backdrops
│   ├── hooks/
│   │   └── useFeedback.js        # Web Audio oscillator + vibration feedback
│   ├── pages/
│   │   ├── Battle.jsx            # Battle mode (lobby/playing/results)
│   │   ├── Feed.jsx              # Social feed (discover/following tabs)
│   │   ├── Profile.jsx           # Profile page (stats, gallery, Rush, quests)
│   │   ├── Rooms.jsx             # Collaborative drawing rooms
│   │   ├── Shop.jsx              # Shop (themes, effects, cosmetics)
│   │   ├── Studio.jsx            # Drawing studio (frames, layers, tween, export)
│   │   └── Viewer.jsx            # Post viewer (frame carousel, play modes)
│   ├── rooms/
│   │   ├── api.js                # Rooms REST API client
│   │   ├── stamps.js             # 14 procedural stamps for infinite canvas
│   │   ├── useRoomChannel.js      # Supabase Realtime hook (broadcast + presence)
│   │   └── world.js              # World engine (chunks, camera, compression)
│   └── index.css                 # Tailwind import
├── docs/
│   └── LOKBOOK.md                # This file — complete codebase reference
```

## Key Design Patterns

1. **Risograph aesthetic** — 2-ink look (paper bg + ink strokes + accent). `risoCircle` dot patterns, limited palette
2. **Seeded randomness** — `makeRng(seed)` for reproducible bot art, avatar generation
3. **PWA-first** — Full-screen, beforeinstallprompt, service worker, auto-update
4. **Supabase Realtime** — Used for Rooms collaborative drawing (broadcast + presence)
5. **Stamps as art** — 14 procedural animations in paper card borders on the infinite canvas
6. **Bot skill curves** — Each personality has unique skill progression, rubber-band difficulty
7. **Imports override lok_live** — All reusable functions import from modular files; App.jsx has page components inline

## For AI Agents

When editing this codebase:
- **App.jsx is the center of the universe** — all page components are defined inline (~800 lines)
- **Local functions override imports** — components like Feed, Battle, Profile, Studio, Shop, Viewer are LOCAL to App.jsx, NOT from pages/
- **Drawing functions come from engine/draw.jsx** — these are imported, not defined locally
- **Constants come from constants.jsx** — check there first before adding new constants
- **Theme is everywhere** — components use `useT()` hook for theme-aware styling
- **Build command:** `npm run build`
- **Do NOT touch lok_live.jsx** — it's deprecated legacy reference only
- **Canvas drawing is synchronous raster** on 480×600 — no vector format

## Smarching Statment

LokBook is a **Social Sandbox** — a playground for creative expression, connection, and wild experimentation. Every feature should:
- Amplify creativity (drawing tools, prompts, stamps)
- Foster connection (following, reactions, rooms, battles)
- Surprise and delight (Easter eggs, animations, secrets)
- Be visually cohesive (risograph-inspired 2-ink aesthetic)

This document serves as the authoritative reference for all human and AI collaborators. When in doubt about architecture, conventions, or intent, consult this file first.
