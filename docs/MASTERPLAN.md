# LokBook Masterplan — multi-agent roadmap & coordination protocol

**Read this before starting any session, regardless of which agent you are (Claude, Gemini,
opencode, or otherwise).** This file exists because two agents working on this repo without a
shared protocol already caused one serious production regression. Section 1 is the postmortem.
Section 2 is the protocol that prevents a repeat. Section 3 is the actual roadmap.

Keep this file itself updated as work lands — it's living documentation, not a one-time plan.

---

## 1. Postmortem: the July 2026 App.jsx regression (read this first)

**What happened:** One agent session wholesale-*regenerated* `src/App.jsx` from an old cached
snapshot instead of editing it — this silently deleted six real, working, previously-shipped
features (Lok Rooms, the BadBleep cheat engine, own-identity/starter-handles, generative bot
artists, animated theme backdrops) while a typo it introduced elsewhere (`constants.jsx`) broke
`npm run build` outright. The broken, feature-stripped version was pushed straight to
`origin/master`. A *second* agent then wrote `docs/FEATURES.md` describing Rooms as "exists in
`src/pages/` but NOT imported" — treating an accidental deletion as an intentional architecture
decision, which would have led any future agent (or human) to leave it deleted or delete the files
outright as "cleanup."

**Root cause:** no shared source of truth for "what is currently live," no build gate before
push, and no convention for how to safely evolve a 1000+ line monolithic file across sessions
that don't share context.

**How it was fixed:** diffed the regression commit file-by-file, confirmed which files got
real incremental edits (safe to keep) vs. wholesale replacement (needed reverting), then manually
re-ported the six deleted features back into the current monolith as real, working code — verified
with an actual build + a server-render smoke test, not just eyeballing.

**What changes going forward (see §2):** a build+smoke gate before every commit, an explicit
task-claiming convention below, and this file as the one place status is recorded.

---

## 2. Coordination protocol — read before you touch `src/App.jsx`

### 2.1 Before you start
1. `git pull` / `git log --oneline -10` — see what landed since you last worked here.
2. `grep '^import' src/App.jsx` — get the *actual* current import list. Do not trust any doc
   (including this one) over that command if they disagree.
3. Check the task table in §3 for anything marked `IN PROGRESS` — don't start the same item.
4. Mark the item you're picking up as `IN PROGRESS` (with your agent name) before you start, if
   you're going to spend more than a few minutes on it.

### 2.2 While working
- **Never regenerate a whole file from memory/cache.** If `App.jsx` looks unfamiliar or smaller
  than you expect, that's a signal to `git show HEAD:src/App.jsx` and diff against what you're
  about to write — not to paste over it. Edit incrementally.
- **New functionality → new files where possible.** The pattern that survived the regression
  cleanly is: put real logic in a new file (`src/engine/*.js`, `src/theme/*.jsx`, `src/*.js`) and
  only add small, surgical import + wiring lines to `App.jsx`. Whole-file rewrites of `App.jsx`
  are the single highest-risk action in this repo.
- **Constants** go in `constants.jsx` — check it's not already there before adding.
- Follow the existing style conventions in `AGENTS.md` (dense one-line JSX, `useT()`, `lok-btn`/
  `lok-display` classes, riso color tokens).

### 2.3 Before every commit — the build+smoke gate
```bash
npm run build   # must succeed with zero errors
npm run smoke   # must print "SMOKE OK" — this catches runtime crashes vite build misses
```
`npm run smoke` (`scripts/smoke.mjs`) bundles `App.jsx` and actually renders it via
`react-dom/server` — it's what caught the Battle-tab crash and would have caught the App.jsx
regression immediately if it had existed at the time. **Do not skip it because the build passed.**
A file can be syntactically perfect and still throw on render (TDZ errors, undefined refs, etc.).

### 2.4 Commit & deploy
- Commit message: what changed and why, one line each. If you fixed a regression, say so plainly
  (see the recovery commits in git log for the tone/format to match).
- Push to `origin/master` only after both gates pass.
- Deploy: `npx vercel deploy --prod --yes`, then `curl` the live URL to confirm 200 and that the
  served bundle hash actually changed.
- Update the status table in §3.

### 2.5 If you find a stale/incorrect doc
Fix it in the same commit as your code change, or as an immediate follow-up. Docs that lie are
worse than no docs — this repo already has one incident caused by exactly that.

---

## 3. The roadmap

Status legend: ✅ done · 🔶 partial/needs polish · ⬜ not started · 🔄 IN PROGRESS (agent name)

### Track A — Trust & correctness (do these before anything visually exciting)
| # | Item | Status | Notes |
|---|---|---|---|
| A1 | Rooms/BadBleep/identity/botArt/ThemeBackdrop live in App.jsx | ✅ | Recovered; see §1 |
| A2 | Battle tab crash (undefined `reduceMotion`) | ✅ | |
| A3 | Rush tab wired to OpenFront | ✅ | |
| A4 | 14 sold-but-broken cosmetics (scanlines/static, fire/ice names, 5 frames, spooky/sweet reactions, horns/antenna) | ✅ | |
| A5 | ANIMATION_FX (7 effects) actually render while drawing | ✅ | Real-time particles in Easel's `stamp()` |
| A6 | LilLok skin/aura/pet actually rendered (not just sold) | ✅ | |
| A7 | VOICE_PACKS have a real visible effect (speech bubble styling) | ✅ | |
| A8 | Own-identity flow: starter handles, moss.ink isn't you, reserved names rejected | ✅ | |
| A9 | Onboarding asks for/confirms name at the END, not the start | ✅ | |
| A10 | App Icon picker exists, gated to dev mode | ✅ | Not general-user-facing yet — see A11 |
| A11 | Decide App Icon picker's eventual home (dev-only forever, or promote to Settings once polished) | ⬜ | Product decision, not urgent |
| A12 | Audit remaining Shop categories (cursors, fonts, music, export, stickers, mythic/daily/weekly rotations) for sold-but-broken items the same way A4-A7 covered | ⬜ | Use the same method: grep the constant, grep where it's *consumed*, if consumption is only inside Shop.jsx's own render, it's decorative-only |
| A13 | Add `npm run smoke` (and ideally `npm run build`) as a CI check (GitHub Actions) so the gate is enforced automatically, not just by convention | ✅ | `.github/workflows/ci.yml`: build + render smoke + Playwright browser smoke (`scripts/browser-smoke.mjs` — loads app, visits all 7 tabs, draws+captures, fails on any console/page error) |
| A14 | RLS audit across all Supabase tables (`lok_rooms`, `lok_room_strokes`, `lok_posts`, `lok_accounts`, plus whatever Stripe/battles/bookmarks/follows/reactions tables exist) — currently permissive-alpha by design, document what must tighten before public beta | ⬜ | |
| A15 | `engine/bots.js` (personalities, adaptive difficulty, taste-based judging) was never reconnected to Battle after the regression — bots were plain names + random seeds, votes used a simplified inline tally | ✅ | Reconnected `makeMatchBots`/`botProgress`/`botFinalT`/`judgeBattle`/`recordBattle`/`botLine`. **Lesson for A12-style audits: "does it build" isn't "is it wired" — always grep for whether an engine file is actually imported, not just present.** |
| A16 | Battle bots drew prompt-blind random doodles (`renderDoodle`) regardless of the actual match prompt | ✅ | New `engine/promptArt.js`: 23 hand-composed recipes (one per PROMPTS/KID_PROMPTS entry), seeded variation, skill-scaled quality. Old behavior kept as a selectable "CreCre" bot-style option (Battle lobby toggle) alongside the new "Sketch Artists" default. Verified with a standalone mock-canvas harness (288 calls, 0 failures) before wiring in — the render smoke test can't reach canvas code that only runs inside event handlers. |

### Track B — Product surface area (the "too much, too shallow" problem)
| # | Item | Status | Notes |
|---|---|---|---|
| B1 | Nav overload: 7 bottom tabs at the practical ceiling | ⬜ | Consider folding Rush into Battle as a mode switch |
| B2 | Shop has 15-19 sub-tabs | ⬜ | Group into 4-5 supercategories; keep "browse all" as escape hatch |
| B3 | Four competing monetization pitches (LokPass, Studio UBER, Founder, Mythic/rotation shop) | ⬜ | Needs one coherent value ladder, not four parallel asks |
| B4 | Progressive disclosure: reveal tabs/features as milestones are hit instead of showing everything on day one | ⬜ | Highest-leverage unused game-design lever in the app |
| B5 | Single "today's earn/spend" dashboard | ⬜ | Economy is sprawling enough now that a transaction log / daily summary would make it legible |
| B6 | Quest pool (6 quests) hasn't grown to cover Rooms/journals/bleeps | ⬜ | Add quest tracks for the newer systems |
| B7 | Badges (20 across 5 categories) — same gap, no Rooms/journal/social category yet | ⬜ | |

### Track C — Social & safety
| C1 | Report/block mechanism | ⬜ | Real gap for an open party feed + public drift-gallery rooms, even at alpha scale |
| C2 | Kids/Juniors mode excludes Rooms/drift-galleries (open co-drawing with strangers) | ⬜ | Verify explicitly, don't assume |
| C3 | Moderation for community stamp library (user-drawn content) | ⬜ | Needed before the library is promoted/discoverable |
| C4 | Room member list doubles as mini social directory (tap → ArtistPage) | 🔶 | Confirm still wired after the recovery |
| C5 | Notifications for room activity (join/write-request/bleep) route through the existing notification center | ⬜ | |

### Track D — Technical health
| D1 | Bundle size: main `app` chunk was 400-450KB pre-gzip after the recovery work | 🔶 | Was code-split before the regression (Rooms/Battle/Shop/Studio/Viewer/Feed lazy chunks) — re-establish lazy boundaries now that features are back, without re-forking the architecture |
| D2 | Dead code sweep: legacy constants (`STUDIO_UPGRADES` superseded by `STUDIO_MODULES`, etc.) | ⬜ | |
| D3 | `lok_live.jsx` at repo root — confirmed dead, never edit, candidate for deletion once everyone's certain nothing references it | ✅ | Deleted (plus orphaned root `SettingsPanel.jsx`) after grep-confirming zero references |
| D6 | Monolith split: adopt `src/pages/*` as canonical one component at a time (Shop → Profile → Battle → Feed → Viewer → Studio). The inline App.jsx versions are NEWER than pages/ — port inline INTO pages/, never the reverse | 🔶 | Shop done (also fixed latent `ccTier`/`say` ReferenceError in its Studio subtab). July 2026 fixes: init-effect crashes (`gap` scope, missing OFFLINE_BONUS imports, null `save` guard), ErrorBoundary wired in main.jsx, infinite bot-post effect loop. Full roadmap: `~/.claude/plans/plan-for-the-future-nested-crown.md` |
| D4 | Full WCAG contrast pass across all themes | ⬜ | |
| D5 | Localization readiness (all strings hardcoded English) | ⬜ | Not urgent, flag before non-US expansion |

### Track E — Rooms deepening (the flagship feature, now that it's stable again)
| E1 | Journal export/print quality, cover customization richness | 🔶 | Base feature works; "heavily customizable" per original ask has room to grow |
| E2 | Drift gallery discoverability — a "featured room of the week" surfacing public galleries | ⬜ | Currently only reachable if you already know it exists |
| E3 | Bleep attribution (tap a bleep → see who left it) | 🔶 | Verify current behavior |
| E4 | Co-drawn journal credits both participants on their profile, not just the owner | ⬜ | |
| E5 | Stroke-table growth cap (~5k/room + "older ink faded" notice) | 🔶 | Design was documented; confirm it actually ships, not just theoretical |

---

## 4. How to use this file across agents

- **Claude / Gemini / opencode**: same protocol, same file. Whoever picks up a task, claim it in
  §3, do the work, run the gate, update the row to ✅ or 🔶 with a one-line note, commit.
- If you disagree with a plan item or think it's wrong given something you've learned, **edit this
  file to say so** rather than silently ignoring it — that's exactly the failure mode from §1.
- If you're about to do something that touches more than ~30 lines of `App.jsx` in one pass, or
  anything that could be mistaken for "start fresh," stop and re-read §2.2.
