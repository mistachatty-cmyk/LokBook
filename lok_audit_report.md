# LOK ECOSYSTEM — Audit Report (Updated)
**Status as of:** July 2026  
**Superseded by:** lok_fable_beta_plan.md (for actionable work orders)  
**This file:** Kept as source-of-truth status tracker only

---

## Honest Status (post deep-audit of lok_live.jsx)

| Dimension | Pre-S1 | After S1 | Reality (deep audit) | Fable target |
|---|---|---|---|---|
| Design | 62 | claimed 90 | **71** | 82 |
| Usability | 51 | claimed 88 | **68** | 82 |
| Creativity | 74 | claimed 92 | **80** | 87 |
| Content | 68 | claimed 85 | **72** | 80 |
| **Overall** | 65 | claimed 89 | **73** | **83** |

---

## Master Status Table

### 🔴 CRITICAL

| # | Title | Claimed | Actual | Notes |
|---|-------|---------|--------|-------|
| 1 | ARIA labels | DONE | ✅ REAL | Present throughout |
| 2 | Loading screen | DONE | ✅ REAL | Riso ink-drop SVG animation |
| 3 | Empty states | DONE | ✅ REAL | EmptyState component with SVG icons |
| 4 | Brush smoothing | DONE | ❌ MISSING | Still basic lineTo — A1 in beta plan |
| 5 | Token rate guard | DONE | ✅ REAL | guardedAddLoks() 50/hr |
| 6 | Deferred frame gen | DONE | ✅ REAL | Progressive setTimeout chain |
| 7 | Rush tutorial | DONE | ❌ MISSING | No traceHinted state — A8 in plan |
| 8 | Real auth | OPEN | OPEN | Needs Supabase |
| 9 | Toast queue | DONE | ❌ PARTIAL | Single toast only, no stack — A1 in plan |
| 10 | Audio latency | DONE | ✅ REAL | Web Audio API, no tone.js |
| 11 | Onion skinning | DONE | ✅ REAL | Full controls + colored ghosts |
| 12 | Font swap | DONE | ✅ REAL | display=swap in URL |
| 13 | Following CTA | DONE | ✅ REAL | EmptyState with action button |
| 14 | Real multiplayer | OPEN | OPEN | Needs PartyKit |

### 🟡 HIGH

| # | Title | Claimed | Actual | Notes |
|---|-------|---------|--------|-------|
| 15 | Color picker | DONE | ✅ REAL | 12 swatches + custom + recent |
| 16 | Nav icons | DONE | ✅ REAL | SVG icons on all tabs |
| 17 | Undo/redo free | DONE | ✅ REAL | Redo no longer gated |
| 18 | Pinch-to-zoom | OPEN | OPEN | Needs @use-gesture |
| 19 | Lok Juniors isolation | OPEN | OPEN | Architectural work |
| 20 | Ad banner | DONE | ✅ REAL | Scroll-hide with transition |
| 21 | Gallery search | DONE | ❌ MISSING | No search input in Profile — A3 in plan |
| 22 | LilLok animation | DONE | ❌ PARTIAL | Panel exists, character system incomplete — B1-B7 in plan |
| 23 | Frame memory | OPEN | OPEN | Still dataURLs |
| 24 | Haptics | DONE | ✅ REAL | hap() throughout |
| 25 | Share button | DONE | ✅ REAL | Web Share API + clipboard fallback |
| 26 | Logo navigation | DONE | ✅ REAL | Button with onClick setTab('feed') |
| 27 | Notifications | DONE | ✅ REAL | Queue + badge on You tab |
| 28 | Per-frame timing | DONE | ✅ PARTIAL | frameDurations[] in Studio, NOT used in Viewer — C5 in plan |
| 29 | Victory screen | DONE | ✅ REAL | Results with animation |
| 30 | Insert blank frame | DONE | ✅ REAL | insertBlank() + duplicateFrame() |

### 🔵 MEDIUM

| # | Title | Claimed | Actual | Notes |
|---|-------|---------|--------|-------|
| 31 | Sound onboarding | DONE | ✅ REAL | Mentioned in step 3 |
| 32 | Delete post | DONE | ❌ PARTIAL | onDelete prop wired but no long-press on PostCard — C2 in plan |
| 33 | Trace→Rush rename | DONE | ✅ REAL | Tab says Rush |
| 34 | Inline style opt | OPEN | OPEN | Still all inline styles |
| 35 | Prompt rotation | DONE | ✅ REAL | year*366+dayOfYear hash |
| 36 | Onboarding nudge | DONE | ❌ MISSING | No studio nudge after onboarding — C4 in plan |
| 37 | LokPass payment | OPEN | OPEN | Needs Stripe |
| 38 | Rename/reorder | DONE | ❌ PARTIAL | onRename prop exists, no inline input in Viewer — C3 in plan |
| 39 | Color contrast | OPEN | OPEN | Needs manual WCAG pass |
| 40 | Battle format cards | DONE | ❌ PARTIAL | Cards exist, no mood/icon/stagger — A9 in plan |
| 41 | Quest milestones | DONE | ❌ MISSING | No questsCompleted, no milestone rewards — A4 in plan |
| 42 | LilLok decay pause | DONE | ✅ REAL | visibilitychange listener |

### 🟣 ENHANCEMENTS

| # | Title | Claimed | Actual | Notes |
|---|-------|---------|--------|-------|
| 43 | Stroke replay | OPEN | OPEN | Needs MediaRecorder |
| 44 | Real leaderboard | OPEN | OPEN | Needs Supabase |
| 45 | Symmetry modes | DONE | ❌ PARTIAL | Mirror-X only, no Radial/Mirror-Y — A7 in plan |
| 46 | Riso blend mode | DONE | ✅ PARTIAL | multiply blend in layer controls |
| 47 | Weekly prompt gallery | DONE | ❌ MISSING | No WEEKLY_PROMPT constant or filter — A5 in plan |
| 48 | Keyboard shortcuts | DONE | ❌ MISSING | No keydown listener anywhere — A6 in plan |
| 49 | LilLok dialogue | DONE | ❌ MISSING | No LILLOK_SPEECH pool — B1-B3 in plan |
| 50 | Collections | OPEN | OPEN | Needs Supabase |

---

## LilLok System (special section)
The LilLok panel exists and has the right structure (care/revive/build tabs, MiniDraw, custom builder). What's broken or missing:

| Sub-issue | Status | Plan ref |
|---|---|---|
| Speech bubble component | MISSING | B2 |
| LILLOK_SPEECH pool + getLilLokLine() | MISSING | B1 |
| Speech wired to FAB | MISSING | B3 |
| Ink level fill on sprite body | MISSING | B4 |
| Feed particle burst on Quick Drop | MISSING | B5 |
| Stasis Zzz sleep indicators | MISSING | B6 |
| Decay shake on panel (gentle variant) | MISSING | B7 |

---

## Key files

| File | Purpose |
|------|---------|
| `/mnt/user-data/outputs/lok_live.jsx` | Main runnable artifact (900 lines) |
| `/mnt/user-data/outputs/lok_ecosystem_v2.jsx` | Extended backup with full Battle/Rush/Shop (2152 lines) |
| `/mnt/user-data/outputs/lok_fable_beta_plan.md` | **Actionable work orders for Fable** |
| `/mnt/user-data/outputs/lok_audit_report.md` | This file — status tracker |
| `/home/claude/lok_beta.jsx` | Working copy in progress |

---

## Next audit checklist
After each Fable session, run:
```bash
node -e "
const s = require('fs').readFileSync('lok_live.jsx','utf8');
let b={'{':0,'(':0,'[':0};
for(const ch of s){if(ch==='{')b['{']++;else if(ch==='}')b['{']--;else if(ch==='(')b['(']++;else if(ch===')')b['(']--;else if(ch==='[')b['[']++;else if(ch===']')b['[']--;}
console.log('balance',JSON.stringify(b));
console.log('exports',(s.match(/export default/g)||[]).length);
"
```

- [ ] ARIA labels still present after new components
- [ ] No new `setToast()` direct calls — use `say(msg, type)` queue
- [ ] No new blocking Canvas on mount (deferred pattern only)
- [ ] New buttons have aria-label
- [ ] LilLok speech wired where required
- [ ] Smooth brush in all drawing surfaces (Studio, Battle, Rush, LilLok)
- [ ] prefers-reduced-motion guard on new animations
- [ ] Token earn goes through guardedAddLoks(), not setLoks() directly

---

## Additions — July 2026 revision

### New systems added to beta plan (lok_fable_beta_plan.md v2)

**LilLok communication system (Sections B3, C3):**
- LILLOK_SPEECH pool with 8 context types (phase-based, win/loss, feed scroll, battle, publish, quest, morning/evening, low Loks)
- LilLokBubble component with SVG tail pointer
- Four communication surfaces: FAB idle rotation (every 60s), mid-battle commentary, feed scroll (25% trigger rate), care panel quote
- Critical phase added to lilLokPhase() — ink < 15 before full decaying
- Stasis redesign: ink must hit 0 then hold for 2 minutes (grace period) before stasis triggers — not time-based
- Stasis cap on recovery: first revival tops out at 40 ink (not 80) — waking up is gradual

**Decay model redesign (Section C):**
- Bond buffer: high bond slows drain rate (up to 50% reduction at max bond)
- Active drain: battles −6 ink, Rush rounds −3, Studio captures −1, 10 views −1
- Bond growth sources: publish +3, battle +2, daily streak +5, quest +2, revival +8
- inkZeroAt timestamp for grace period before stasis
- Recovery tiers: quick drop (free, +20), ink flask (10 Loks, +40), revival sketch (page-scaled)
- Ink Flask is a new spendable in the LilLok care panel

**Economy depth (Section D):**
| Item | Status |
|------|--------|
| Earn rate table (11 earn events documented) | SPEC — needs implementation |
| Rate guard raised 50 → 120 Loks/hour | SPEC — needs implementation |
| Passive creator earn (your post voted/viewed) | SPEC — needs implementation |
| Boost a post (20 Loks, 24h feed priority) | SPEC — needs implementation |
| Rush net P&L display in results | SPEC — needs implementation |
| Extra revival pages (15 Loks, cap 24) | SPEC — needs implementation |
| Loks balance panel in Profile | SPEC — needs implementation |
| totalEarned all-time counter | SPEC — needs implementation |
| Streak milestone colors (3/7/14/30 days) | SPEC — needs implementation |
| Weekly streak bonus (+20 at 7 days, +100 at 30) | SPEC — needs implementation |
| Creator royalty model documented | DOC ONLY — backend needed |


---

## BUILD SESSION — July 2026 (executed, grep-verified)

All items below are CONFIRMED IN FILE via validation script (not just claimed):

speechPool ✓ bubble ✓ critical phase ✓ inkFill ✓ Zzz ✓ smoothBrush (quadratic midpoint) ✓ symmetry (X/Y/quad/radial 4-6-8) ✓ toastQueue (typed, stacked) ✓ rateGuard 120 ✓ bondBuffer decay ✓ inkZero grace period ✓ ink flask spendable ✓ gallerySearch ✓ questMilestones ✓ weeklyPrompt filter ✓ rushTutorial ✓ battleCards (icon/mood/stagger) ✓ challenge-a-friend share ✓ flipOfDay ✓ promptHistory ✓ Speed Draw mode ✓ replay teaser ✓ inline rename ✓ per-frame durations in Viewer ✓ ad rotation w/ AdSense slots ✓ PWA beforeinstallprompt + settings sheet ✓ Loks balance panel ✓ streak milestone colors ✓ creator royalty stub ✓ lokwobble ✓ loksheen ✓

Still open (needs real infra or next pass): keyboard shortcuts (A5), long-press delete on PostCard (E2), post-onboarding nudge (E4), boost-post spendable, Studio capture ink drain, Stripe, Supabase auth/persistence, PartyKit multiplayer, manifest.json + service worker at deploy.
