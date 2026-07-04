# MASTER PROMPT — Lok N Slide: Alpha Launch Engineering Plan
Paste everything below this line into your coding agent (Gemini / OpenCode / etc.), working in the folder containing `lok_live.jsx`.

---

You are the lead engineer taking **Lok N Slide** — a single-file React social app (`lok_live.jsx`, ~1100 lines) for drawing flipbook animations, battling with AI bots, and sharing creations — from prototype to a **commercially launchable alpha** with real users. Work incrementally, never rewrite the whole file at once, and verify the app still renders after every step.

## Ground rules (do not violate)
1. **Do not break what exists.** The battle-bot system (`PROMPT_CONCEPT`, `buildConceptSteps`, `renderConceptArt`, `rollBotQuality`, quality-based `castVotes`, `easel.stats()`) was just built and works — extend it, never replace it.
2. **Preserve the art style**: risograph two-tone aesthetic, `ART` palette, wobbly hand-drawn canvas rendering, Bricolage Grotesque font.
3. **Small commits**: one concern per change. After each change, confirm the file parses (no unbalanced braces — it's dense single-line code).
4. **Budget: as close to $0/month as possible** until there are paying users. Prefer generous free tiers over "cheap" paid.
5. **Never lose user data on update.** Every schema change ships with a migration (see §4).

## Phase 1 — Split & harden the codebase (local, no infra)
- Split `lok_live.jsx` into a Vite + React project: `src/engine/` (canvas painters, bots, rng), `src/components/` (Easel, Battle, Studio, Feed, TraceRush), `src/state/` (store, save/load), `src/theme/`. Keep behavior identical; test after each extraction.
- Add error boundaries around each tab so one crash doesn't kill the app.
- Add a lightweight test file for pure functions (`makeRng`, `conceptFor`, `rollBotQuality`, vote tallying) using Vitest.

## Phase 2 — Backend on free tier (choose ONE stack, recommend A)
**Option A (recommended): Supabase free tier**
- Auth: Supabase email magic-link + anonymous guest sessions (guests can draw/battle; must sign up to publish/follow).
- Postgres tables: `profiles` (id, handle, avatar_seed, name_color, created_at), `posts` (id, user_id, title, frames jsonb-or-storage-path, pace_ms, mode, from, created_at), `votes`, `reactions`, `follows`, `reports`.
- Storage bucket for frame PNGs (currently base64 data-URLs in memory — upload as compressed WebP, store paths not blobs; cap 14 frames × ~50KB).
- Row Level Security on everything: users write only their own rows; posts readable by all.
- Free tier limits: 500MB DB / 1GB storage / 50K MAU — plenty for alpha. Fallback plan when storage fills: purge unpublished drafts >30 days.

**Option B**: Cloudflare Pages + Workers + D1 + R2 (also free, more setup work).

Hosting: **Cloudflare Pages or Netlify free** for the static frontend. No servers.

## Phase 3 — Social alpha features (people post + find each other)
- Real feed backed by `posts` table (paginated, newest + most-lok'd), replacing local-only gallery. Keep local gallery as "My Studio".
- Public profile page at `/u/:handle` showing that artist's flips; follow/unfollow; a "Following" feed tab.
- Discovery: weekly-prompt page showing everyone's take on the same prompt (this is the killer discovery loop — same prompt, many artists); simple handle search.
- Share links: `/p/:postId` renders the flipbook publicly (og:image = first frame) so links posted elsewhere pull people in.
- **Safety (required for launch)**: report button on every post + profile → `reports` table; a hidden `/mod` page (allowlisted emails) to hide posts/ban handles; profanity filter on handles/titles; ToS + privacy page; age gate checkbox. Kids mode stays fully local/offline.

## Phase 4 — "Don't be lost when we update" (versioning & migrations)
- All persisted data gets a `schemaVersion`. Keep the existing keys (`lok:save:v2`, `lok:gallery:v2`) readable forever via a `migrations = {2: fn, 3: fn, ...}` chain that runs on load — never rename a key without a migration from the old one.
- Same on the server: SQL migrations in `/supabase/migrations`, additive-only during alpha (add columns, never drop/rename).
- On first login, one-time sync: upload local gallery + save to the user's account; local remains the offline cache.
- App version banner + "What's new" modal driven by a static JSON so users see what changed instead of being confused.
- Feature flags via a `flags` table (or static JSON) so risky features can be turned off without a deploy.

## Phase 5 — Battle AI polish (extend, don't replace)
- Grow `PROMPT_CONCEPT` coverage as prompts are added; add a keyword fallback (e.g. contains "cat/dog/fish" → beast variants) so unmapped prompts never fall back to a generic blob.
- Optional later (skip for alpha): async PvP — store real player drawings per prompt and use them as "ghost opponents" instead of bots. This makes battles social with zero realtime infra.
- Bot vote taste-noise and quality tiers are tuned — only adjust visuals (coordinates/sizes in `buildConceptSteps`), not the scoring math.

## Phase 6 — Launch checklist
- PWA manifest + service worker (installable, offline drawing).
- Analytics: self-hosted-free (Cloudflare Web Analytics) — no cookies, no GDPR banner needed.
- Rate limits (Supabase RLS + edge function): max posts/hour, max reports/day.
- Error reporting: Sentry free tier.
- Alpha gate: invite codes table so growth stays controllable.

## Order of execution
1 → 2 → 4 (migrations BEFORE any real users exist) → 3 → 6 → 5. Report progress after each phase with what was verified working.
