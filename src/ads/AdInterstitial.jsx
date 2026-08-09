// Full-screen interstitial.
//
// The user accepted full-screen ads with one hard condition: they must not ruin
// the seamlessness. Three rules enforce that, and they live in the caller as
// well as here:
//   1. Never on desktop (adPlan returns interstitial:false there — enough rail
//      inventory exists that interrupting is pointless).
//   2. Never during Studio/Battle/Rush/Rooms — canShowInterstitial() refuses on
//      those tabs, so an in-progress drawing is never covered.
//   3. At most once per INTERSTITIAL_MIN_GAP_MS, and only on a tab transition.
// Dismiss is available immediately — there is no forced countdown.

import { useEffect, useState } from "react";
import { useT } from "../theme/theme.js";
import { AD_PROVIDER } from "../ads.js";

export default function AdInterstitial({ ad, onClose, onCta }) {
  const T = useT();
  const [in_, setIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setIn(true), 10); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!ad) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-6"
      role="dialog" aria-label="Advertisement"
      style={{ background: "rgba(0,0,0,.72)", opacity: in_ ? 1 : 0, transition: "opacity .25s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-3xl p-6 flex flex-col gap-3"
        {...(AD_PROVIDER !== "placeholder" ? { "data-ad-slot": ad.slot, "data-ad-format": "interstitial" } : {})}
        style={{ maxWidth: 420, background: T.card, color: T.ink, border: `3px solid ${T.ink}`, boxShadow: `8px 8px 0 ${T.accent}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-50">Sponsored</span>
          <button
            onClick={onClose} aria-label="Close ad"
            className="lok-btn w-9 h-9 rounded-full font-bold"
            style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }}
          >✕</button>
        </div>
        <div className="lok-display font-extrabold text-2xl leading-tight">{ad.title}</div>
        <p className="text-sm opacity-80 leading-snug">{ad.text}</p>
        <button
          onClick={onCta}
          className="lok-btn mt-2 w-full py-3 rounded-xl text-sm font-extrabold"
          style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}` }}
        >{ad.cta}</button>
        <button
          onClick={onClose}
          className="text-xs underline opacity-60"
          style={{ color: T.ink, background: "transparent", border: "none" }}
        >No thanks</button>
      </div>
    </div>
  );
}
