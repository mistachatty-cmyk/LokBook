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
