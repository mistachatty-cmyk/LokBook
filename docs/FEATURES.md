# LokBook — Complete Feature Catalog

> 90+ features across the entire social sandbox. Generated from full source analysis.
> Last updated: July 2026

---

## 1. DRAWING ENGINE & STUDIO

### Canvas System
- **480×600 canvas** — fixed resolution, risograph 2-ink aesthetic
- **Multi-layer system** — up to 500 layers (tiered), per-layer opacity/visibility/blend modes
- **16 blend modes** — source-over, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity
- **Onion skinning** — ghosted overlays of previous frames (1-3), opacity slider, color-coded
- **Canvas sizes** — story (9:16), square (1:1), wide (16:9), infinite scroll, circular, panorama, XL double-res
- **Zoom/Pan** — scroll-wheel zoom (0.25x-4x), middle-mouse pan, pinch-to-zoom on touch

### Tools (18)
| Tool | Description | Price |
|------|-------------|-------|
| Pen | Smooth bezier interpolation with midpoint averaging | Free |
| Eraser | destination-out composite, larger size | Free |
| Fill | Flood fill entire layer | Pro |
| Eyedropper | Sample color from any visible layer | Pro |
| Airbrush | Soft spray brush | 25 |
| Spray Can | Scattered dot spray | 40 |
| Glow Brush | Soft luminous stroke | 60 |
| Watercolor | Wet-media bleed & bloom | 75 |
| Pattern Stamp | Repeating tile patterns | 50 |
| Shape Tool | Rectangles, ellipses & polygons | 35 |
| Gradient Fill | Linear & radial gradients | 55 |
| Push Tool | Nudge strokes around canvas | 45 |
| Smudge Tool | Blur & drag wet ink | 50 |
| Clone Stamp | Sample & paint pixels | 70 |
| Blur/Sharpen | Gaussian blur & sharpen | 45 |
| Color Replace | Swap one color for another | 35 |
| Rulers & Guides | Draggable ruler lines with snap-to | 25 |
| Cursor Styles | 12 cursor appearances (Ink Drop, Target, Neon Ring, etc.) | 20-60 |

### Brushes (9)
| Brush | Description | Price |
|-------|-------------|-------|
| Ink | Solid standard brush | Free |
| Marker | 55% opaque, slightly larger | Pro |
| Chalk | 50% opacity, 6 dabs with random offset | Pro |
| Calligraphy | Variable-width nib | 150 |
| Neon Tube | Glowing neon tube | 180 |
| Sparkle Tip | Every dot sparkles on contact | 200 |
| Crayon Wax | Thick textured wax crayon | 120 |
| Ink Wash | Broad semi-transparent wash | 160 |
| Galaxy Brush | Star field colors in every stroke | 500 |

### Symmetry Modes (Pro)
- Mirror X, Mirror Y, 4-Way (quad)
- Radial 4, Radial 6, Radial 8
- Visual guides (dashed mirror lines, dotted radial center)

### Color System
- 12 fixed risograph swatches
- Custom color picker (`<input type="color">`)
- Recent colors (up to 8, persisted)
- 6 curated palette packs (pastel, neon, earth, ocean, sunset)
- Size slider 2-28px with live brush preview

### Undo/Redo
- Per-layer stack (30 undo states)
- Undo/Redo buttons in toolbar

### Frame Timeline
- Capture frames from canvas
- Thumbnail strip with frame numbers
- Reorder, duplicate, insert blank, delete
- Per-frame duration editing (ms)
- Default pace slider (60-500ms)
- Frame labels (naming)
- Clear all frames
- **Batch Ops module**: duplicate/reverse/clear all

### Animation Presets (Tween)
- Bounce (5 frames), Shake (4), Fade (3), Wiggle (4)
- Pixel-level interpolation between first and last frame

### GIF Export
- `encodeGIF` — 256-color palette, LZW compression
- Configurable delay (10ms-10s), loop count
- Transparency support (alpha < 128)
- Download as `.gif` file

### Paper Textures
- Plain, Grid guide, Dot grid, Storyboard (3-panel), Graphite texture

### Studio Draft Auto-Save
- Persists frames, durations, labels, pace, title to localStorage

---

## 2. LILOK — VIRTUAL PET

### Status & Phases
| Phase | Ink Range | Visual |
|-------|-----------|--------|
| Thriving | 35-100 | Bouncy bob (2.4s), smile, sparkles |
| Decaying | 15-34 | Grey/purple, slow bob (4s), flat mouth |
| Critical | 1-14 | Grey palette, critical mouth |
| Stasis | 0 (extended) | Stone grey, X eyes, "ZZZ" |

### Evolution Stages (PetEvo)
| Stage | Bond | Emoji |
|-------|------|-------|
| 0 | 0-24 | 🌱 Sprout |
| 1 | 25-49 | 🌿 Leaf |
| 2 | 50-74 | 🌳 Tree |
| 3 | 75+ | 👑 Crown |

### Ink System
- **Decay**: Drains every 12s, rate = 1.4 × (1 - bond/100) × 0.5
- **Feeding**: +20 ink via Quick Drop (free), +40 via Ink Flask (10 Loks)
- **Stasis**: Enters at 0 ink + 10+ min, requires Revival Sketch to escape
- **Revival**: Draw 2-14 frames, publish to wake up (ink capped at 40)

### Bond System
| Action | Bond Gain |
|--------|-----------|
| Feed | +2 |
| Studio publish | +3 |
| Revival | +8 |
| Daily claim | +2 |
| Battle win | +2 |

### LilLok AI (Blot Brain)
- Time-aware greetings (morning 5-10am, evening after 9pm)
- Stat-aware lines referencing win count, bond, Loks, streak
- Short-term memory (last 4 lines, avoids repeats)
- 10 speech pools: thriving, decaying, critical, stasis, win, loss, publish, battle_start, feed_scroll, quest_done

### Customization
| Category | Items | Price Range |
|----------|-------|-------------|
| Skins | Galaxy, Gold Leaf | 250-300 |
| Auras | Glow | 200 |
| Pets | Mini LilLok | 400 |
| Gear | Tiny hat, Round glasses, Bow tie | 20-25 |
| Borders | Plain, Gilded, Washi, Orbit, Liquid, Stitch, Marble | 0-90 |
| Voice Packs | Whisper, Echo, Robot | 150-250 |

### Custom LilLok (Build Mode)
- Draw 3 emotion faces (thriving, decaying, stasis)
- Custom name
- Tab to custom art

### FAB (Floating Action Button)
- Bottom-right positioned
- Phase-colored border (red for critical)
- Pulse animation when critical
- Speech bubble on scroll/battle/periodic triggers
- Evolution stage emoji badge

---

## 3. SOCIAL FEATURES

### Feed
- **Dual modes**: Discover (all) / Following (Lok'd artists)
- **Scroll-snap**: Vertical snapping, 22% LilLok line chance per scroll
- **Mood filter bar**: 8 moods (calm, wild, moody, playful, dreamy, chaos, cozy, spooky) with emoji badges
- **FeedCard**: Auto-playing thumbnail, progress bar, vote/bookmark/Lok artist buttons, report/hide, origin badge
- **Empty states**: Different messages for empty discover vs following

### Flip of the Day
- Highest-voted post with 2+ frames, not seen in 7 days
- Golden highlight card with star icon
- History tracked in save blob, resets daily

### Viewer
- **Frame scrub mode**: Scroll to advance, vertical progress dots
- **Page-flip mode**: Full pages stacked, page number badges
- **Play/Pause**: Auto-play with per-frame durations
- **Replay**: Forward-then-reverse playback
- **Swipe navigation**: Left/right >60px threshold
- **Title inline editing**: Click to rename own posts
- **@mentions**: Highlighted in accent color
- **Vote/React/Bookmark/Share/Remix/Delete**
- **Reaction storm**: 6 extra float icons when count hits multiples of 3
- **Auto-view tracking**: Grants +3 Loks on full view

### Following ("Lok")
- Follow/unfollow artists
- Following feed shows only Lok'd artists' posts
- Lok'd in count (followers)

### Bookmarks
- Bookmark posts ("Lok in")
- View from Profile

### Content Reporting
- Hide button on FeedCard
- Reported post IDs persisted in blocklist
- Filtered from feed

### @Mentions
- Renders `@name` in accent color in Viewer
- Uses `dangerouslySetInnerHTML`

### Remix
- Copies post frames to new gallery entry
- Title prefixed: "Remix: [original title]"

### Verified Badge
- Gold star ✦ next to level in header
- Toggle in Settings

### Session PIN Lock
- 4-6 digit numeric PIN
- Full-screen lock overlay on reload
- Animated inkdrop logo
- Set/remove in Settings

---

## 4. BATTLE ("Lok N Slide")

### Game Modes
| Format | Players | Description |
|--------|---------|-------------|
| 1v1 Duel | 2 | One on one |
| Triangle | 3 | Two rivals, one you |
| 4-Player FFA | 4 | Controlled chaos |
| Local Co-op | 2 | Hot-seat, one device |
| Big Battle · 10 | 10 | Absolute mayhem (locked) |

### Gameplay Phases
1. **Lobby**: Format selection, clock (30/60/90s), featured match toggle
2. **Countdown**: 3-2-1-DRAW with animated numbers
3. **Draw**: Embedded Easel, stroke counter, timer bar, bot thumbnails, interventions
4. **Vote**: Grid of entries, vote for best (not yourself)
5. **Results**: Podium, ranked list, publish/rematch/share

### Interventions
- Random events every 7s: shake, splat, blot
- LOK BLOCK! button to deflect for bonus
- Phase-dependent (decaying = fumble, thriving = deflect)

### Bot Opponents
- 9 personalities: pixel.pluto, inkwell_iz, doodlebug, sketchram, tinta, mooncrayon, nib.ninja, grafite, blot.bot
- Unique skill curves: burst, closer, streaky, steady
- Adaptive difficulty (rubber-band: target 45-55% win rate)
- Taste-based voting system

### Rewards
| Outcome | Loks | XP |
|---------|------|----|
| Win | 25 (75 featured) | 25 |
| Loss | 5 | 8 |

### Battle Royale Hype Meter
- 5-click meter on Battle tab
- Full meter: +30 Loks, "READY!" indicator

---

## 5. TRACE RUSH (OpenFront)

### Modes
| Mode | Duration | Description |
|------|----------|-------------|
| Shapes | 12s | Trace geometric shapes |
| Stencils | 16s | Trace real objects |
| INKSANITY | 20s | Chaotic outlines |
| Characters | 22s | Outline a creature |

### Gameplay
- Dashed guide shape on overlay canvas
- Player traces on ink canvas
- Teal = on the line, pink = off the line
- Real-time coverage percentage
- Bot racers with simultaneous progress

### Wager System
- Optional Lok wager (5/10/25/50)
- Pot = wager × (field size + 1)
- Payout: 1st 60%, 2nd 30%, 3rd 10%

### Scoring
- Coverage % + speed bonus (time remaining × 2)
- Bot placements based on skill + jitter

---

## 6. SHOP & ECONOMY

### Currency
- **Loks**: Earn via voting, viewing, battles, quests, daily, Rush, gardens, Word Twister, Battle Royale
- **Rate limit**: Max 120 Loks/hour (earnLog)

### Shop Categories (15+)
| Category | Items | Description |
|----------|-------|-------------|
| Featured | LokPass, Juniors, Today's Picks | Promotional items |
| Skins (Themes) | 24 themes in 4 waves | Full UI recoloring |
| Effects | 7 page effects | Rain, confetti, aurora, embers, scanlines, static |
| FX | 8 animation FX | Sparkle Trail, Neon Pulse, Ink Splatter, etc. |
| Skies | 5 atmosphere overlays | Clear, Cloud, Starry, Sunset, Aurora |
| Cosmetics | Name colors, frames, reactions, accents | Profile customization |
| Studio | Layer tiers, modules, Studio Pro | Drawing tools |
| Paper | 5 canvas textures | Grid, dot, storyboard, graphite |
| Cursors | 12 drawing cursors | Ink Drop, Pencil, Target, etc. |
| Fonts | 10 font packs | Mono, Handwritten, Pixel, Zine, Serif, etc. |
| Stickers | 8 sticker packs | Nature, Food, Animals, Space, Retro, Magic, Music |
| Export | 7 export formats | GIF, WebP, Spritesheet, APNG, PDF, MP4 (soon) |
| Blot Shop | Borders + LilLok gear | LilLok container customization |
| LilLok+ | Skins, auras, pets, voice packs | LilLok appearance |
| Music | 8 ambient soundtracks | Lo-Fi Study, Synth Wave, Rain, Jazz, etc. |

### LokPass
- $2.99 one-time purchase
- Removes all ads
- Unlocks every UI theme
- PASS badge on profile

### Themes (24)
- Wave 1 (free): riso
- Wave 2 (40-90): midnight, tide, zine, bloom, forest, neon, blush, cobalt, retro, candy
- Wave 3 (110-120): solar, meadow, noir, sakura
- Wave 4 (180-200, animated): ocean, glitch, aurora, vapor, smile
- Others: pumpkin (45), matcha (45), lavender (50)
- Wave-gated progression (2/5/10 owned to unlock next wave)

### Studio Modules (42)
- **Layers** (6): 10/25/50/100/200/500 layers
- **Brushes** (9): ink, marker, chalk, airbrush, calligraphy, neon, sparkle, crayon, wash, galaxy
- **Tools** (13): spray, glow, watercolor, pattern, shape, gradient, push, smudge, clone, blur, replace, rulers
- **Features** (10): GIF export, reference layer, palettes, smoothing, batch ops, tween presets, labels, blend modes, symmetry, UBER
- **Canvas** (5): sizes, infinite scroll, circular, panorama, XL
- **Achievements** (5): onion skinning, perspective grid, custom swatches, echo, cloud studio
- **Studio UBER**: 999 Loks, unlocks all 37 purchasable modules

### Cosmetics
- **Name colors** (8): default, hot pink, riso teal, gold, violet, holo, fire, ice
- **Avatar frames** (10): none, double, dashed, tape, glow, photo, stamp, polaroid, filmstrip, torn
- **Avatar accents** (6): ring, halo, crown, horns, antenna
- **Reaction packs** (6): ink, stardust, fire, zen, spooky, sweet
- **Paper textures** (5): plain, grid, dots, storyboard, graphite

### Profile Upgrades
- Wave banner, Ink splash banner
- Warm/cool/dark background
- Animated avatar
- Pin a post

### Social Power
- Mass Echo (450 Loks): echo reaches full feed
- Super Boost (400): boosted post stays top 48h
- Custom Tag (350): create own profile tagline

---

## 7. PROFILE & GALLERY

### Profile Header
- FramedAvatar with frame/accent/animation
- NameTag with color cosmetics
- LokPass badge, Verified star
- Stats: flip count, wins
- Notification bell with unread count
- Edit/⚙ buttons

### Stats
- Lok'd in (followers), Lok'd (following), Bookmarks
- Level (XP/100), XP progress bar
- Quests completed, total earned Loks

### Gallery
- **Filters**: Newest, Most Lok'd, Most Viewed, Battles, Series, This week
- **Time Machine**: Slider through all posts chronologically with preview
- **Search**: Filter by title or style
- **Grid**: 2-column PostCard layout
- **Origin badges**: ⚔ battle, ▣ page, pg count

### Daily Quests
- 3 random quests from pool of 6
- Types: vote, view, publish, battle, rush (front), lok (follow)
- Per-quest Loks + XP
- Milestone bonuses at 10/25/50/100 quests completed

### Daily Streak
- Streak tracking with color tiers (3/7/30/100 days)
- Bonus Loks: 10 + min(streak,7)×5
- Weekly bonus (streak%7=0): +20
- Monthly bonus (streak%30=0): +100
- Also: +20 XP, +15 ink to LilLok

### Word Twister
- Daily anagram unscramble game
- Pool: SKETCH, INKWELL, BLOOM, RISOPRINT, LILLOK, FLIPBOOK, STENCIL, VIGNETTE
- Animated shuffled display, real-time guess matching
- +5 Loks on solve

### Ink Garden
- 6 plant slots with names (Doodle Dahlia, Riso Rose, etc.)
- Plant seeds (5-20% initial growth)
- Water all button (+5-15% per plant)
- Harvest at 100%: +8 Loks
- Visual stages: 🌱 growing → 🌻 ready → 🌸 harvested

### Activity Heatmap
- 14-day bar chart in Settings
- Visual activity tracking

### Collab Room Code
- Random 6-char room code generator
- Copy to clipboard button

### Settings
- PWA Install (platform-aware instructions)
- Founder signup (handle + email → Supabase)
- Session PIN Lock (set/remove)
- Verified Creator badge toggle
- Feed pacing (4 presets: minimal, snap, sweep, cinema)
- Animation speed (0.5x-2x slider)
- Sound Lab (hidden, 7-tap easter egg)
- Activity heatmap, Collab room code
- Version info (alpha v1.2)

### Badge System (20 badges)
| Category | Badges |
|----------|--------|
| Collection | First Flip, Five & Alive, Double Digits, Chapter One |
| Social | Citizen, Hustings, Campaigner, Friend Maker |
| Streak | Threepeat, Week Warrior, Monthly Master, Century |
| Creator | Seen, Crowd Pleaser, Revivalist |
| Special | Offline Rider, Founder |

---

## 8. DAILY & EVENT SYSTEMS

### Daily Rotation
- Daily prompt from PROMPTS (15 total)
- Weekly prompt from WEEKLY_PROMPT
- Today's picks in Shop (theme, effect, name color, paper)

### Events
| Event | Period | Reward | Cosmetic |
|-------|--------|--------|----------|
| Summer Splash 🏖️ | June 2026 | 100 Loks | Seashell Frame |
| Spooky Ink 🎃 | Oct 2026 | 150 Loks | Ghostlight Frame |

### Quest System
- Pool of 6 quests, 3 assigned daily
- Tracked with progress/goal/done
- Milestone bonuses at 10/25/50/100

### Offline Bonus
- Away 5+ hours → 50 Loks, 10 XP, 20 ink
- Max once per day
- Echo expiry: 48 hours

---

## 9. UI & THEMING

### Theme System
- 24 themes across 4 wave gates
- 5 animated themes (ocean, glitch, aurora, vapor, smile)
- Per-theme colors: paper, ink, accent, alt, shadow, card, onAccent
- CSS custom properties injected via GlobalStyle

### Animation System
- 15+ CSS keyframe animations: lokrise, lokbob, lokpop, lokpulse, lokshake, lokcount, lokfloat, loknudge, lokquake, inkdrop, inkfade, inkpulse, lokdrift, loktwinkle, loksheen, lokshimmer
- Pace presets: minimal (no motion), snap (0.6x), sweep (1x), cinema (1.8x)
- `prefers-reduced-motion` respect

### Page Effects
- Rain (teal streaks), Confetti (colored rectangles), Aurora (gradient veil), Embers (glowing orbs), Scanlines, Static (fractal noise)

### Sky/Atmosphere
- Clear, Cloud Drift, Starry Night, Sunset Glow, Aurora Sky

### Animation FX (per-flip)
- Sparkle Trail, Neon Pulse, Ink Splatter, Smoke Rise, Fire Embers, Water Ripple, Galaxy Swirl

### Typography
- Google Fonts: Bricolage Grotesque (display), Schibsted Grotesk (body)
- 10 purchasable font packs: Mono, Rounded, Handwritten, Pixel, Zine, Serif, Marker, Code, Vintage

### ThemeBackdrop
- Animated CSS-only backgrounds for animated themes
- Ocean (bubbles, gradients), Glitch (scanlines, bars), Aurora (bands, stars), Vaporwave (sun, grid)

---

## 10. NOTIFICATION SYSTEM

- Max 50 notifications in log
- Triggers: votes received, battle wins, founder status
- Bell badge on profile header with unread count
- Notification panel with inline list

---

## 11. SOUND SYSTEM

### Sound Effects (`useFeedback`)
- Web Audio API synthesized tones
- 11 notes (C4-C6), configurable type/duration/volume
- Haptic vibration patterns

### Sound Lab (Hidden Feature)
- Unlock: 7 rapid taps on version text in Settings
- URL input for MP3, YouTube, Spotify
- Queue management (play, stop, delete, up to 10 items)
- Auto-embedding: YouTube iframe + Spotify embed

### Background Music Packs
- 8 ambient packs: Lo-Fi, Synth Wave, Rain, Jazz, Nature, Retro Arcade, Piano, Forest

---

## 12. SEED DATA

- 3 seed posts: "Bounce study" (14 frames), "Bloom" (12 frames), "Night flight" (13 frames)
- Procedural painters from engine/draw.jsx
- Lazy rendered via `renderSequence` after mount
- Pre-populated votes/reactions/views

---

## 13. CORE INFRASTRUCTURE

### State Management
- ~75 `useState` hooks in App.jsx
- `store.get/set` abstraction (Map + localStorage + OPFS)
- 400ms debounced auto-save
- Save keys: `"lok:save:v2"`, `"lok:gallery:v2"`

### Supabase Integration
- Tables: `lok_accounts`, `lok_posts`, `lok_battles`, `lok_follows`, `lok_bookmarks`, `lok_reactions`, `founder_signups`, `auth_saves`
- Auth: magic link, Google OAuth, GitHub OAuth
- Realtime for Rooms (broadcast + presence)
- REST API via `lokApi` object

### PWA
- vite-plugin-pwa with service worker
- `beforeinstallprompt` capture
- Full-screen capable
- Platform-aware install instructions

### Onboarding
- 4-step carousel: Welcome → Lok → Draw → LilLok
- Grants 50 Loks + 20 XP on completion
- Skip option

### Feature Flags
- `dynamicLoader`: pointer-tracking loading screen
- `compactUi`: compact density mode
- `vibe`: theme modifier (unused)

---

## 14. EARNING REFERENCE

| Action | Loks | XP | Notes |
|--------|------|----|-------|
| Daily claim | 10-100+ | 20 | Streak + weekly/monthly bonuses |
| Vote on post | 5 | 5 | Also notifies creator |
| Full view | 3 | 3 | Reaching last frame |
| Battle win | 25 | 25 | 75 with featured match |
| Battle loss | 5 | 8 | — |
| Trace Rush 1st | pot×0.6 | varies | Pot = wager × field+1 |
| Trace Rush 2nd | pot×0.3 | varies | — |
| Trace Rush 3rd | pot×0.1 | varies | — |
| Quest | 15-25 | per quest | 3 quests daily |
| Quest milestone | mil×2 | 0 | At 10/25/50/100 |
| Word Twister | 5 | 0 | Daily puzzle |
| Garden harvest | 8 | 0 | Per plant at 100% |
| Battle Royale | 30 | 0 | Full 5-click meter |
| Onboarding | 50 | 20 | One-time |
| Creator vote | 5 | 0 | When others vote your post |
| Offline bonus | 50 | 10 | 5+ hours away |
| Revive LilLok | 0 | 0 | Costs nothing |
| Spend limit | — | — | 120 Loks/hour max |

---

## 15. MISCELLANEOUS

- **Focus mode**: Hides header, navbar, ad banner, LilLok FAB
- **Lok Juniors**: Kids safe mode (filtered prompts, simpler UI)
- **ErrorBoundary**: Catches render errors, friendly "Splot!" message
- **Ad system**: 3 rotating ad slots, hidden with LokPass/kids/focus
- **Toast system**: `say()` creates stacked toast notifications
- **Version easter egg**: 7 taps unlocks Sound Lab
- **4th Wall slider**: Metaphysics setting 0-100%
- **Haptic Grammar**: Default/Expressive/Quiet
- **Synesthesia Mode**: "Coming soon!" placeholder

---

## 16. LEGACY / STALE FEATURES (not in active App.jsx)

> ⚠️ **Correction (see `docs/MASTERPLAN.md` §1):** this section was written while Rooms was
> accidentally disconnected from App.jsx by a wholesale file regeneration. It has since been
> recovered and IS live — `import Rooms from "./pages/Rooms.jsx"` in App.jsx is real and required.
> Do not delete or "clean up" `src/pages/Rooms.jsx`, `src/rooms/*`, `src/identity.js`,
> `src/engine/botArt.js`, `src/theme/ThemeBackdrop.jsx`, or `src/engine/bleepbox.js` — all six are
> imported directly by App.jsx and load-bearing. Always `grep '^import' src/App.jsx` before
> assuming any file is dead; this list goes stale fast.

The remaining items below (Profile.jsx sub-features, Shop.jsx wave gates) are genuinely unused —
`src/pages/Profile.jsx` and `src/pages/Shop.jsx` themselves are NOT imported by App.jsx (their
functionality was rebuilt inline in the monolith); only the six files named above are exceptions.

- **Game Manual** (Profile.jsx): 20-page retro Game Boy-style manual
- **Badge Wall** (Profile.jsx): Full badge collection with category filters
- **ArtistPage** (Profile.jsx): Full-screen artist profile overlay with remote posts
- **JournalShelf** (Profile.jsx): Horizontal scrollable shelf of journal covers
- **MyStuff** (Profile.jsx): Browse equipped cosmetics by category
- **Wave gates** (Shop.jsx): "All Items" toggle, wave-locked opacity
- **Studio Modules** (full): Module type filter tabs, count display, achievement unlocks

---

> This document catalogs every feature, component, constant, and state variable in the LokBook codebase. Generated from source code analysis.
