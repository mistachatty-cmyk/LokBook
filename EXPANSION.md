# LokBook Expansion Roadmap

> **Goal**: Transform LokBook from a demo-grade flipbook app into a full creative platform with social, competitive, and economic depth — ready for Steam and mobile distribution.

## Tier 1 — Quick Wins (High Impact, Medium Effort)

### 1. Activity Feed
- **What**: Timeline view of "X published", "Y won battle", "Z hit milestone" — chronological feed on profile
- **State**: `feedLog` array + save blob
- **UI**: Scrollable timeline in Profile tab, uses existing notifications infrastructure

### 2. Achievement Showcase
- **What**: Badge grid on profile, animated unlock popup
- **Status**: 20 badges defined in `BADGES` (constants.jsx), 24 achievements in `src/steam/achievements.json`
- **Work**: Profile badge grid component + GSAP unlock animation + wire to save blob

### 3. Ranked Battle Ladder
- **What**: Bronze → Silver → Gold → Platinum → Diamond → Mythic tiers with RP system
- **State**: `rank` + `rankPoints` (add near `wins`)
- **Logic**: Win = +RP, Loss = -RP, streak bonus, league thresholds, season resets
- **UI**: Rank badge on profile, ladder view in Battle tab

### 4. Export Suite
- **What**: Working GIF, APNG, MP4, spritesheet, PDF export
- **Status**: `POST_EXPORTS` defined in constants with 7 formats — all stubs
- **Work**: Real encoder pipelines — canvas → `Blob` per format (gif.js, ffmpeg.wasm, jsPDF)

### 5. Animation Presets
- **What**: "Bounce", "Wiggle", "Fade", "Morph", "Squash" one-click transforms
- **How**: GSAP-based frame transform presets in Studio toolbar
- **UI**: Preset picker with live preview thumbnail

---

## Tier 2 — Core Platform (Medium Impact, High Effort)

### 6. Crews/Guilds
- **What**: Artist groups with shared gallery wall, crew tag in profile, crew-vs-crew battles
- **Infrastructure**: Reuses Rooms Supabase realtime + new `guilds`/`guild_members` tables
- **UI**: Crew profile page, invite-by-code system, crew score leaderboard

### 7. Weekly Contests
- **What**: Auto-judged themed contests with Lok prize pools and rotating judge bots
- **Infrastructure**: Timer-based prompt rotation, reuses Battle engine judging
- **UI**: Contest banner on Feed, submission flow, results gallery

### 8. Battle Pass
- **What**: 30-tier seasonal reward track (free + 999 Lok premium unlock)
- **State**: `passTier` + `passXp` with daily/weekly challenge XP sources
- **Rewards**: Exclusive skins, frames, auras, mythic items, Loks
- **UI**: Pass progress bar in Settings/Shop, tier-by-tier reveal animation

### 9. Crafting System
- **What**: Combine items to create rarer ones — 3 Common → 1 Uncommon → etc. up to Mythic
- **State**: `recipes` known + `materials` inventory
- **UI**: Crafting bench in Shop tab with ingredient slots and preview

### 10. Sound Sync
- **What**: Import audio track via Web Audio API, draw animation frames aligned to beat
- **Work**: Beat detection → frame markers → export with audio overlay
- **Export**: MP4 with audio track via `MediaRecorder` or ffmpeg.wasm

---

## Tier 3 — Steam & Platform (Very High Impact, Very High Effort)

### 11. Steam Launch
- **What**: Real Steamworks SDK integration — replace current stubs
- **Sub-features**:
  - Steam Cloud Saves — overwrite `window.storage` bridge
  - Steam Achievements — 24 already defined, wired, need SDK
  - Steam Workshop — publish flips as Workshop items
  - Steam Rich Presence — "Drawing in Studio", "In Battle", etc.
  - Steam Deck optimization — controller nav, 480p UI scale
- **Blockers**: `steam_api.dll` linking, Steam App ID, Valve approval

### 12. Mobile Wrappers
- **What**: Capacitor wrappers for iOS + Android
- **Features**: Push notifications, camera/gallery import, haptic feedback, offline mode
- **Build**: `npm run build` → native project per platform

### 13. Desktop Features
- **What**: Drag-drop image import, native file dialogs, system tray icon, global shortcuts
- **Infrastructure**: Tauri plugins already scaffolded (fs, dialog, shell, process)

### 14. Localization
- **What**: i18n with 5+ languages (Japanese, Korean, Spanish, Portuguese, French)
- **Library**: `react-i18next` or custom lightweight `useL()` hook
- **Work**: Extract all UI strings to locale JSON files

### 15. Accessibility
- **What**: Screen reader support, colorblind palettes (protanopia/deuteranopia/tritanopia), reduced motion
- **Status**: `reduceMotion` detection already present, aria labels on most buttons
- **Audit**: Walk each page with axe-core or Lighthouse

---

## Tier 4 — AI & Innovation (Very High Impact, Very High Effort)

### 16. AI Prompt Engine
- **What**: "Draw a mechanical dragon in space" → generates base sketches or suggestion grids
- **Approach**: Cloudflare Workers AI (SDXL Turbo) or lightweight browser ONNX model

### 17. Smart Inbetweening
- **What**: Draw keyframes 1 and 5 → AI fills frames 2-4 automatically
- **Approach**: Canvas-based morph (optical flow) or lightweight ONNX interpolation model

### 18. Style Transfer
- **What**: Post-process any flip with "ink sketch", "risograph", "watercolor", "charcoal" filters
- **Approach**: CSS filter chains + canvas pixel manipulation (no ML needed for basic versions)

### 19. Auto-Colorize
- **What**: Greyscale sketch → AI suggests harmonious color palettes
- **Approach**: K-means clustering on reference art + swatch picker

### 20. Mood Matcher
- **What**: AI analyzes flip content (color histogram, composition) → suggests matching music, effects, theme
- **Data model**: Mood tags → recommendations mapping, extended from existing `moodTags` state

---

## Build Order

```
Phase 1 — Tier 1 items 1-5 (parallelizable)
  ├── Activity Feed          — 1-2 sessions
  ├── Achievement Showcase   — 1 session
  ├── Ranked Ladder          — 2 sessions
  ├── Export Suite           — 3-4 sessions
  └── Animation Presets      — 1-2 sessions

Phase 2 — Tier 2 items 6-10 (sequential, builds on prior)
  ├── Crews/Guilds           — 3-4 sessions
  ├── Weekly Contests        — 2-3 sessions
  ├── Battle Pass            — 3-4 sessions
  ├── Crafting System        — 2 sessions
  └── Sound Sync             — 3-4 sessions

Phase 3 — Tier 3 items 11-15 (launch-blocking)
  ├── Steam Launch           — 5+ sessions (SDK dependency)
  ├── Mobile Wrappers        — 3-4 sessions
  ├── Desktop Features       — 1-2 sessions
  ├── Localization           — 2-3 sessions
  └── Accessibility          — 2-3 sessions

Phase 4 — Tier 4 items 16-20 (innovation layer)
  ├── AI Prompt Engine       — 3-4 sessions
  ├── Smart Inbetweening     — 4-5 sessions (research-heavy)
  ├── Style Transfer         — 1-2 sessions
  ├── Auto-Colorize          — 1-2 sessions
  └── Mood Matcher           — 2-3 sessions
```

Each phase ships independently. No phase blocks another — work can overlap. Prioritize by user-facing impact per session-hour.
