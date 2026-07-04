# LokBook Alpha v1.2 — V2-spec build pass (style preserved)

Source of truth: `lok_live.jsx` (single file, riso aesthetic untouched)
Backend: Supabase project **LokServices** (`jfavkudihasswkhkouxq`, us-east-2)

## Shipped this pass
- **Viewport (§1.1):** `100dvh` in feed + loading screen; iOS input-zoom killed via 16px rule scoped to WebKit only (no visual change elsewhere). Safe-area padding on nav already present.
- **Sound Lab (§1.2, hidden):** Settings → tap "alpha v1.2" **7 times** → Sound Lab unlocks. MP3 URL (native `<audio>`), YouTube (hidden iframe), Spotify (embed; Premium SDK stubbed). Queue persists in save (`soundQueue`, max 10).
- **Velocity engine (§2.1):** MINIMAL / SNAP / SWEEP / CINEMA presets + 0.5×–2× speed slider in Settings. Multiplies tab/button animation durations via injected CSS; MINIMAL kills motion.
- **Animated profile token (§2.2):** lifetime Lok spend ≥ 5,000 (`totalSpent`, tracked in `spend()`, flask, wagers) → shimmer liquid-border on avatar.
- **Battle featured HUD (§3.1):** dominant "✦ Featured match · 3×" card in the lobby; arming it triples win Loks (`onResult(won, mult)`).
- **Flip of the Day no-repeat (§4.1):** 7-day history window (`fodHistory` in save); highest-voted flip not featured in the window wins, fallback to top.
- **Blot Shop (§4.2):** isolated Shop tab; 5 container borders (Plain / Gilded / Washi / Orbit / Liquid glow) — purchased via existing cosmetic pipeline, applied to the LilLok FAB.
- **Founders' test server:** Settings card → handle + optional email → writes to Supabase `founder_signups` (insert-only RLS, anon key, save-blob backup: loks/wins/xp/profile/lillok/gallery size). FOUNDER badge on success, state persisted.

## Supabase
- Table `public.founder_signups` created (migration `founder_signups`), RLS ON, anon = insert-only (no read-back from clients).
- URL + publishable key embedded in the file (safe to ship — publishable by design).

## Not in this pass (needs real infra, tracked for beta)
- Live matchmaking queue (`match_queue` + Realtime RPC pairing) — bots still fill matches
- Bot cron posting to a public Battle Feed (needs GitHub Actions once repo has code)
- Avatar layer builder + Storage export; studio marketplace 10–15 item catalog
- GitHub: repo `mistachatty-cmyk/LokBook` is currently **empty** — push this file + changelog as the first commit.
