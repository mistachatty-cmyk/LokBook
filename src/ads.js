// Ad provider configuration
// Change AD_PROVIDER to switch between modes with zero code changes elsewhere.
//
//   "off"         — no ads shown (banner hidden entirely)
//   "placeholder" — built-in placeholder text (no external network, no dependencies)
//   "ethicalads"  — EthicalAds network (requires ETHICALADS_PUBLISHER)
//   "custom"      — inject arbitrary HTML/JS (AdSense, Carbon, Apple Search Ads, etc.)

export const AD_PROVIDER = "placeholder";

// EthicalAds publisher ID (only used when AD_PROVIDER === "ethicalads")
export const ETHICALADS_PUBLISHER = "lokbook";

// Custom ad snippet (only used when AD_PROVIDER === "custom")
// Paste any ad network's embed code here. Must be a single provider.
export const CUSTOM_AD_HTML = "";

// The EthicalAds client script was previously hardcoded into index.html and
// loaded unconditionally on every page view, even in "placeholder" mode —
// it would scan the page for a .ethical-ad-placement div, find none, and log
// a "No ad placements found." console warning on every load. It must only
// load once AD_PROVIDER === "ethicalads" is actually wired up (Phase 0.3 ad
// consent work): inject the script tag dynamically at that point, e.g.
//   if (AD_PROVIDER === "ethicalads") { const s = document.createElement("script");
//   s.async = true; s.src = "https://media.ethicalads.io/media/client/ethicalads.min.js";
//   document.head.appendChild(s); }
// Do not re-add the <script> tag to index.html directly.
