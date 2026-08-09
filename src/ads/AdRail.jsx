// Desktop/tablet side-rail ad box.
//
// This is inventory that only exists because of the responsive shell — before
// it, a 1440px screen showed a 560px column and ~880px of dead paper. The rail
// is styled with the app's own theme tokens (card/ink/dashed border) so it reads
// as part of LokBook rather than a pasted-in web ad.

import { useEffect, useState } from "react";
import { useT } from "../theme/theme.js";
import { adsFor } from "../constants.jsx";
import { AD_PROVIDER, ensureAdScript } from "../ads.js";

const ROTATE_MS = 20000; // slower than the banner — a rail is read, not glanced at

export default function AdRail({ side = "right", onGetLokPass }) {
  const T = useT();
  const items = adsFor("rail");
  const [i, setI] = useState(0);

  useEffect(() => { ensureAdScript(); }, []);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI(n => (n + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const ad = items[i];

  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-2"
      aria-label="Advertisement"
      {...(AD_PROVIDER !== "placeholder" ? { "data-ad-slot": ad.slot, "data-ad-format": "rail" } : {})}
      style={{ background: T.card, border: `2.5px dashed ${T.ink}`, color: T.ink, boxShadow: `4px 4px 0 ${T.shadow}` }}
    >
      <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-50">Sponsored</div>
      <div key={i} style={{ animation: "lokrise .3s ease" }}>
        <div className="lok-display font-extrabold text-sm leading-tight">{ad.title}</div>
        <p className="text-xs opacity-75 mt-1 leading-snug">{ad.text}</p>
      </div>
      <button
        onClick={onGetLokPass}
        className="lok-btn mt-auto w-full py-1.5 rounded-xl text-xs font-extrabold"
        style={{ background: T.accent, color: T.onAccent, border: `2px solid ${T.ink}` }}
      >
        {ad.cta}
      </button>
      <button
        onClick={onGetLokPass}
        className="text-[10px] underline opacity-60"
        style={{ color: T.ink, background: "transparent", border: "none" }}
      >
        Remove ads
      </button>
    </div>
  );
}
