# Ad Networks — what to use where, and why

Written to answer four questions asked directly: which network pays best, which
pays *fastest*, which is best for SEO, and how to use each one without wrecking
the experience for free or paying users.

One of those questions has an uncomfortable answer, so it goes first.

---

## The SEO answer: no ad network helps SEO. Some actively hurt it.

Ad scripts are third-party JavaScript loaded on the critical path. They compete
with your own bundle for main-thread time, and Google's own ranking signals —
Core Web Vitals — measure exactly that contention:

| Metric | What ads do to it |
|---|---|
| **LCP** (largest contentful paint) | Rail/banner slots reserve space and fetch remote creative; a heavy network adds 200–800ms |
| **INP** (interaction to next paint) | Ad scripts run long tasks on the main thread; taps feel late while one is parsing |
| **CLS** (cumulative layout shift) | The classic ad sin — content jumps when a slot fills. Fixed-height containers avoid this, which is why `AdRail`/`AdFeedCard` have fixed geometry |

So "which network is best for SEO" has no good answer — the honest ranking is
*fewest ads is best for SEO*, and after that, *lightest script wins*.

**What actually fixes LokBook's discoverability** is unrelated to ads: the app is
a client-rendered SPA, so a crawler fetching any URL gets an empty `<div id="root">`
and no content. There is nothing to index. The fix is a prerendered public route
for published art (`/flip/:id`) with real OpenGraph tags — that is Phase 6 of the
plan, and it will do more for search traffic than any network choice.

Two ad-side mitigations worth doing regardless:
- Load ad scripts **lazily and once** (already implemented — `ensureAdScript()`
  in `src/ads.js` injects on demand and never in placeholder mode).
- Keep every ad container a **fixed size**, so filling it shifts nothing.

---

## The networks

### Google AdSense — the desktop rail workhorse
- **Revenue:** highest fill rate and best eCPM of the display options, typically
  $1–5 RPM depending on geography. Desktop rails earn meaningfully more than
  mobile banners, which is a large part of why Phase 1's responsive shell was
  worth building.
- **Payout speed:** NET-30 — earnings for a month are paid around the 21st of
  the following month, with a $100 minimum threshold. **Not fast.**
- **Approval:** required, and it is the real gate. Needs original content, a
  privacy policy, and enough traffic to be worth reviewing. Expect days to weeks.
- **Weight:** heavy. The worst Core Web Vitals cost of the options here.
- **Use for:** desktop/tablet rails and the phone bottom banner.

### Google AdMob — rewarded video
- The rewarded-video arm of the same account. Rewarded formats carry the highest
  eCPM in the entire ad market ($10–40 RPM is normal) because the view is
  voluntary and completed.
- Same NET-30 payout and same approval process as AdSense.
- **Use for:** `src/ads/rewarded.jsx` — replace `playRewardedAd()` with the SDK
  call and verify the completion token server-side in `claim_reward`.

### Unity Ads / AppLovin — the rewarded alternative
- Comparable or better rewarded eCPM than AdMob, and notably **easier to get
  approved for** — worth having as the rewarded provider if AdMob approval
  stalls.
- **Payout:** NET-30 to NET-60 depending on tier. Also not fast.
- **Weight:** the SDK only loads when a rewarded spot is requested, so it costs
  nothing on page load. Good property.

### EthicalAds — the fallback that works today
- **Revenue:** the lowest here, roughly $0.50–2 RPM. No behavioural targeting,
  so the ads are contextual only.
- **Payout:** NET-30, $50 threshold.
- **Approval:** trivial by comparison.
- **Weight:** by far the lightest script of any network listed — genuinely small
  Core Web Vitals impact.
- **Already scaffolded** in `src/ads.js` (`AD_PROVIDER = "ethicalads"`).
- **Use for:** everything, while AdSense approval is pending. It is the "ship
  something today" option.

### Direct / self-sold
- **Revenue:** highest margin by a wide margin — no revenue share.
- **Payout:** as fast as you invoice. This is the actual answer to "what pays
  fast": nothing else here beats billing an advertiser directly on your own
  terms.
- **Cost:** requires traffic worth buying and someone to sell it. Not realistic
  at alpha stage, but the `"custom"` provider mode exists so a hand-sold slot can
  be dropped in without code changes.
- **Weight:** whatever you make it — a static `<img>` is free.

---

## Recommendation per surface

| Surface | Platform | Network | Reasoning |
|---|---|---|---|
| Left + right rails | Desktop | **AdSense** | Best display eCPM, and desktop rails are where display actually earns |
| Right rail | Tablet landscape | **AdSense** | Same, one rail |
| Bottom banner | Phone, tablet portrait | **AdSense** | Small money, but constant impressions |
| Feed-native card | All | **AdSense native**, or direct | Highest-engagement display slot; the natural first thing to sell directly |
| Interstitial | Phone/tablet only | **AdSense** | Off on desktop by design — see below |
| Rewarded video | All, **including LokPass** | **AdMob**, or Unity if approval stalls | Rewarded eCPM dwarfs display |
| Everything, pre-approval | All | **EthicalAds** | Ships today, light, no gate |

Switching any of these is a one-line change to `AD_PROVIDER` in `src/ads.js` —
the router (`adPlan()`) decides *which surfaces exist*, and the provider decides
*who fills them*. Those two decisions were kept separate for exactly this reason.

---

## The experience rules these choices enforce

These come straight from the product constraints and are implemented in
`src/ads.js`, not left to each call site:

1. **Paying users lose every involuntary surface.** LokPass turns off rails,
   banner, feed-native, and interstitials.
2. **Rewarded video survives LokPass.** It is opt-in and it *gives* value.
   Removing it from someone who paid would be a downgrade dressed as a perk.
3. **Kids mode has no ads at all**, rewarded included.
4. **Desktop gets no interstitials.** With two rails there is enough inventory
   that interrupting is pointless, and a full-screen takeover reads as broken on
   a large display.
5. **Interstitials never fire mid-activity.** `canShowInterstitial()` refuses on
   `studio`, `battle`, `rush`, and `rooms`, so an in-progress drawing is never
   covered — and at most one fires per 8 minutes, only on a screen transition.
6. **Feed ads scroll past like posts.** Same geometry as a real `FeedCard`, no
   modal, no block.

## Realistic revenue expectations

At alpha traffic, display ads earn approximately nothing — the RPM figures above
only become real money at tens of thousands of sessions. The two things that
matter more at this stage:

- **Rewarded video** earns per completed view rather than per pageview, so it
  produces usable revenue at much lower traffic than display does.
- **LokPass** at $2.99 one-time is worth roughly 1,000–3,000 ad impressions per
  purchase. Every ad surface therefore doubles as LokPass marketing, which is why
  each one carries a "Remove ads" affordance.

## When wiring a real network

1. Set `AD_PROVIDER` and the matching credential constant in `src/ads.js`.
2. Replace the placeholder markup inside each surface with the network's tag —
   the `data-ad-slot` / `data-ad-format` attributes are already emitted for every
   surface once the provider is not `"placeholder"`.
3. For rewarded: replace `playRewardedAd()` in `src/ads/rewarded.jsx`, and verify
   the network's signed completion token inside the `claim_reward` RPC. Do not
   trust the client boolean.
4. Add a consent banner before shipping to the EU — AdSense and AdMob both
   require TCF v2.2 consent, and serving without it risks the account.
