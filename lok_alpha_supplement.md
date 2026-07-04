# SUPPLEMENT — Lok N Slide: Phase 0 Foundations & Amendments
## Companion to `lok_alpha_master_prompt.md` — insert into execution order before Phases 1–6

Paste the relevant section below into your coding agent **before** starting the corresponding phase from the master prompt. These 7 additions fix critical gaps in the existing plan.

---

## §A — Phase 0: Offline-first architecture (insert BEFORE Phase 1)

**Local is the source of truth. Cloud is the backup.** Drawing apps lose users the second their work disappears.

- **Storage layer**: Replace localStorage with **IndexedDB via Dexie.js**. Create a `LokDB` class with tables: `flipbooks` (id, title, frames, pace, mode, timeline, syncedAt, updatedAt), `gallery` (mirror of published flips), `drafts` (unpublished WIPs). localStorage 5MB cap is too small for frames.
- **Frame storage**: Currently base64 data-URLs in React state (~2MB per 14-frame flip). Convert frames to **WebP blobs** on save (canvas.toBlob('image/webp', 0.8)) and store blobs in IndexedDB. Keep only the current frame as a data-URL in memory.
- **Sync model**: Background sync queue — when online, push unsynced changes to Supabase. Never overwrite local data without user awareness. Show an icon: ☁️ synced / ⬆️ pending / ⛔ offline. First-time login uploads local gallery as a one-shot sync.
- **Conflict resolution**: Per-flipbook fork-on-conflict. If cloud has a newer version AND local has unsaved changes, rename the local copy "[Title] (offline copy)" and keep both. Never silently overwrite.

## §B — Phase 0: Monetization-ready data model (insert BEFORE Phase 2)

Add a `tier` column to `profiles` now — it costs nothing and saves a nightmare migration later.

- `profiles.tier`: `'free' | 'supporter' | 'studio'` — default `'free'`. No payment code needed yet.
  - `free`: 10 published posts, 1 battle/day, no custom palettes, max 3 drafts
  - `supporter` ($3/mo): unlimited posts, 10 battles/day, 3 custom palette slots
  - `studio` ($10/mo): private flips, analytics dashboard, HD export, priority support
- `profiles.storage_used_bytes`: BigInt — enforce per-tier storage caps server-side via RLS
- `posts.is_public`: boolean — false for studio-tier private flips
- All limit enforcement is done via **Supabase RLS policies**, not client-side checks. The free tier limits are constants in a `config` table so they can be adjusted without deploys.

## §C — Phase 0: CI/CD + build tooling (insert BEFORE Phase 1)

- **GitHub Actions** workflow (`.github/workflows/deploy.yml`):
  ```
  on: push to main → pnpm install → pnpm lint → pnpm test:run → pnpm build
    → Deploy to Cloudflare Pages (preview branch = PR preview, main = production)
  ```
- **Bundle analysis**: Add `vite-plugin-inspect` and a CI check that warns if `dist/` total > 500KB gzip. Split by route: Feed (~80KB), Easel (~120KB), Battle (~150KB), Studio (~60KB). Lazy-load Battle and Studio with `React.lazy`.
- **Code quality**: ESLint + Prettier configs checked into the repo. `pnpm lint` runs on every PR.

## §D — Phase 1 amendment: Test the canvas, not just pure functions

Add to the test file requirements:

- **Playwright e2e smoke test** (`tests/smoke.spec.ts`):
  - Open each tab (Easel, Battle, Studio, Feed) → verify no crash
  - Run a full battle: click Battle → wait for bot drawings to finish → confirm vote buttons render → click a vote → confirm winner is shown
  - Draw a stroke on the easel → confirm canvas is non-empty → save → confirm flipbook appears in gallery
- **Pure function tests** (Vitest, as already specified): `makeRng`, `conceptFor`, `rollBotQuality`, `castVotes`, `easel.stats()` — these catch logic regressions instantly.

## §E — Phase 2 amendment: Sentry + error handling

Replace the generic "Sentry free tier" with concrete rules:

- **What to capture**: unhandled promise rejections, canvas context loss (`webglcontextlost`, `contextlost`), storage quota exceeded (`QuotaExceededError`), Supabase query failures, unknown errors in error boundaries.
- **User consent**: Show a one-time privacy notice on first launch with "Help improve Lok N Slide by sending anonymous error reports?" — opt-in, stored in localStorage. Sentry configured with `beforeSend` to strip URLs, emails, and handles.
- **Rate limiting**: Sentry free tier = 5K events/month. Sample at 50% when under 2K/month, 20% when approaching the cap. Log errors to console always; only send a subset to Sentry.
- **Graceful degradation**: If Sentry is unreachable, the app still works. Errors are logged to IndexedDB and sent on next launch.

## §F — Phase 3 amendment: Session + auth persistence

- **Anonymous sessions**: On first open, generate a `deviceId` (stored in localStorage) and create an anonymous Supabase session. This gives every user a working backend identity immediately — no sign-up barrier.
- **Session persistence**: Supabase client configured with `persistSession: true` and `storage: localStorage`. On page reload, restore session from stored refresh token.
- **Guest→Account upgrade**: When the user signs up (email magic link), merge their anonymous data (gallery, battles, follows) into the new account. The anonymous `deviceId` becomes a `profiles.legacy_device_id` reference.
- **Logout**: Clearing local storage does NOT delete cloud data. A "Delete my data" flow triggers a separate Supabase edge function.

## §G — Phase 6 amendment: Performance budget + canvas optimization

Add to the launch checklist:

- **Canvas rendering budget**: Bot drawing (`renderConceptArt`) must not block the UI for more than 50ms. If a bot takes longer, chunk the drawing into `requestAnimationFrame` steps. Future: OffscreenCanvas in a Web Worker for complex bots.
- **Frame playback budget**: Flipbook playback must hit 60fps on a mid-range 2022 phone. If lagging, reduce frame resolution during playback (paint to a 320×400 offscreen and scale up) — only render full-res on pause.
- **Memory guard**: If IndexedDB exceeds 50MB, show a warning and offer to compress old drafts. The service worker can also purge auto-saved drafts older than 30 days.
- **PWA readiness**: Service worker caches the app shell + last 20 viewed flipbooks for offline replay. Add a `beforeinstallprompt` handler. Test on 3G with DevTools throttling.

## Execution order (amended)

```
§A Offline-first + §C CI/CD   ─┐
                               ├──→ Phase 1: Split & harden
§B Monetization data model    ─┘
         ↓
Phase 2: Backend (+ §E Sentry, + §F Sessions)
         ↓
Phase 4: Migrations (add conflict resolution + sync merge from §A)
         ↓
Phase 3: Social (+ §F Guest→Account upgrade)
         ↓
Phase 6: Launch (+ §G Performance, §D Tests)
         ↓
Phase 5: Battle polish (unchanged from master prompt)
```
