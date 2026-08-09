// Ad routing and provider configuration.
//
// This file owns every ad decision in the app. Nothing outside it should ask
// "should an ad show here" — components call adPlan() and render what it says.
// That keeps the LokPass/kids gating in exactly one place instead of being
// re-derived (and eventually mis-derived) at each call site.
//
// Provider modes:
//   "off"         — no ads at all
//   "placeholder" — built-in placeholder text (no external network, no deps)
//   "ethicalads"  — EthicalAds network (requires ETHICALADS_PUBLISHER)
//   "adsense"     — Google AdSense (requires ADSENSE_CLIENT)
//   "custom"      — inject arbitrary HTML/JS
//
// See docs/AD_NETWORKS.md for why each network is chosen for which surface.

export const AD_PROVIDER = "placeholder";

// EthicalAds publisher ID (only used when AD_PROVIDER === "ethicalads")
export const ETHICALADS_PUBLISHER = "lokbook";

// AdSense client ID, e.g. "ca-pub-0000000000000000" (AD_PROVIDER === "adsense")
export const ADSENSE_CLIENT = "";

// Custom ad snippet (only used when AD_PROVIDER === "custom")
export const CUSTOM_AD_HTML = "";

// ── Frequency caps ────────────────────────────────────────────────────────────
// Interstitials are the one surface that can break flow, so they are capped
// hard. The user's constraint was "full screen is fine but don't ruin the
// seamlessness" — that translates to: never mid-activity, and rarely.
export const INTERSTITIAL_MIN_GAP_MS = 8 * 60 * 1000; // at most once per 8 min
export const FEED_AD_EVERY = 8;                        // a sponsored card every 8 posts

// Screens where an interstitial must never fire — these are active work, and
// interrupting them loses the user's drawing.
const NEVER_INTERRUPT = ["studio", "battle", "rush", "rooms"];

/**
 * The single gating decision. Returns which ad surfaces are live for this
 * device and this user.
 *
 * Rewarded video is deliberately NOT in here: it is user-initiated, it grants
 * value rather than taking attention, and it stays available to LokPass holders.
 * See src/ads/rewarded.jsx.
 */
export function adPlan({ tier = "phone", orientation = "portrait", lokPass = false, kids = false } = {}) {
  const none = { feedNative: false, bottomBanner: false, rails: false, interstitial: false };

  // Paying users lose every involuntary surface. Kids mode loses everything,
  // full stop — that gate predates this router and must not weaken.
  if (AD_PROVIDER === "off" || kids || lokPass) return none;

  if (tier === "desktop") {
    // Two rails is enough inventory that interrupting is unnecessary — and a
    // full-screen takeover reads as broken on a large display.
    return { feedNative: true, bottomBanner: false, rails: "both", interstitial: false };
  }
  if (tier === "tablet") {
    // Portrait tablet is too narrow for a rail beside a 560px column; it falls
    // back to the phone treatment.
    return orientation === "landscape"
      ? { feedNative: true, bottomBanner: false, rails: "right", interstitial: true }
      : { feedNative: true, bottomBanner: true, rails: false, interstitial: true };
  }
  return { feedNative: true, bottomBanner: true, rails: false, interstitial: true };
}

/** True when an interstitial may fire right now. */
export function canShowInterstitial({ tab, lastShownAt = 0, now = Date.now() }) {
  if (NEVER_INTERRUPT.includes(tab)) return false;
  return now - lastShownAt >= INTERSTITIAL_MIN_GAP_MS;
}

/** Index positions in a feed list where a sponsored card should be spliced in. */
export function feedAdSlots(postCount, enabled) {
  if (!enabled || postCount < FEED_AD_EVERY) return [];
  const out = [];
  for (let i = FEED_AD_EVERY; i <= postCount; i += FEED_AD_EVERY) out.push(i);
  return out;
}

// ── Provider script loading ───────────────────────────────────────────────────
// Scripts are injected lazily and once. The EthicalAds client used to be
// hardcoded in index.html and loaded on every page view even in placeholder
// mode, where it would find no placement and log a warning on each load. Do not
// re-add any ad <script> tag to index.html directly.
let scriptLoaded = false;
export function ensureAdScript() {
  if (scriptLoaded || typeof document === "undefined") return;
  let src = "";
  if (AD_PROVIDER === "ethicalads") src = "https://media.ethicalads.io/media/client/ethicalads.min.js";
  else if (AD_PROVIDER === "adsense" && ADSENSE_CLIENT) src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  if (!src) return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.async = true; s.src = src;
  if (AD_PROVIDER === "adsense") s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}
