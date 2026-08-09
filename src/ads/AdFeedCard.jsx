// A sponsored card shaped like a post, spliced into the feed stream.
//
// The user's stated preference: ads that "simply pop up in feed like a post
// would, which people can scroll by". So this deliberately mirrors FeedCard's
// geometry — same 4/5 aspect, same border weight, same shadow, same scroll-snap
// behaviour — and differs only by an unmissable "Sponsored" label. It never
// blocks, never modals, and scrolls past like anything else.

import { useT } from "../theme/theme.js";
import { AD_PROVIDER } from "../ads.js";

export default function AdFeedCard({ ad, onCta }) {
  const T = useT();
  if (!ad) return null;
  return (
    <div className="px-4 flex flex-col justify-center" style={{ height: "100%", scrollSnapAlign: "start" }}>
      <div
        className="relative mx-auto rounded-2xl overflow-hidden flex flex-col"
        aria-label="Sponsored post"
        {...(AD_PROVIDER !== "placeholder" ? { "data-ad-slot": ad.slot, "data-ad-format": "feed" } : {})}
        style={{
          width: "100%", maxWidth: 360, aspectRatio: "4/5",
          border: `3px solid ${T.ink}`, background: T.card,
          boxShadow: `6px 6px 0 ${T.shadow}`, transform: "scale(.97)",
        }}
      >
        <div
          className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest"
          style={{ background: T.ink, color: T.paper }}
        >
          Sponsored
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2">
          <div className="lok-display font-extrabold text-xl leading-tight">{ad.title}</div>
          <p className="text-sm opacity-75 leading-snug">{ad.text}</p>
        </div>
        <div className="p-3">
          <button
            onClick={onCta}
            className="lok-btn w-full py-2.5 rounded-xl text-sm font-extrabold"
            style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}` }}
          >
            {ad.cta}
          </button>
        </div>
      </div>
      <div className="text-center text-xs opacity-50 mt-2">sponsored · scroll for more</div>
    </div>
  );
}
