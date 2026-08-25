// Shared between LegacyShop.jsx and the new default Shop UI, so the Stage 1
// integrity fixes (owned-guards, parked refusal, wave-gate enforcement) live
// in ONE place and apply to both entry points rather than being copy-pasted
// and drifting apart the next time one of them is edited.
import { useState, useEffect, useRef } from "react";
import { useT } from "../../theme/theme.js";
import { RARITY } from "../../constants.jsx";
import MythicPreview from "../../MythicPreview.jsx";

// Rotation/mythic cards only showed name + price — no indication of *what
// slot* the item fills, which is what actually makes a rotation confusing to
// shop from. Maps an item's `type` to the same plain-language label the
// dedicated category tabs use.
export const TYPE_LABELS = {
  frame: "Avatar frame", effect: "Page effect", paper: "Canvas texture",
  animation_fx: "Animation FX", name_color: "Name color", lillok_skin: "LilLok skin",
  cursor: "Cursor", export: "Export format", canvas_border: "Studio canvas border",
};

// Category-level backstop, superseded item-by-item by `parked` on the row
// itself (see docs/PARKED.md) wherever the two overlap.
export const WIP_CATEGORIES = {
  postExport: "GIF and spritesheet work; webp/apng/pdf/mp4 still need real encoders.",
  musicPack: "Built-in music packs have no audio yet — add your own in Settings → Music.",
};

export function ShopItem({ owned, equipped, price, onClick, children, swatch, rarity, wip, loks }) {
  const T = useT();
  const r = rarity && RARITY[rarity];
  const needsConfirm = !owned && !wip && price > 0;
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef(null);
  useEffect(() => () => clearTimeout(confirmTimer.current), []);
  const locked = !owned && !equipped && !wip;
  // Shown BEFORE the tap, not after two of them. `loks` is optional — Legacy
  // never passes it, so this degrades to the old "find out after confirming"
  // behaviour there rather than crashing.
  const short = typeof loks === "number" && price > 0 && !owned && loks < price;
  const handleClick = () => {
    if (needsConfirm && !confirming) {
      setConfirming(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    clearTimeout(confirmTimer.current); setConfirming(false); onClick();
  };
  return (
    <button onClick={handleClick}
      aria-label={confirming ? `Confirm purchase for ${price} Loks` : short ? `Need ${price - loks} more Loks` : undefined}
      className={`lok-btn text-left rounded-2xl overflow-hidden w-full ${rarity ? `rarity-${rarity}` : ""}`}
      style={{
        border: `3px solid ${confirming ? T.accent : equipped ? T.accent : short ? "#E85D5D" : r?.color || T.ink}`,
        background: T.card,
        boxShadow: confirming ? `0 0 0 2px ${T.accent}, 4px 4px 0 ${T.shadow}` : r?.glow ? `${r.glow}, 4px 4px 0 ${T.shadow}` : `4px 4px 0 ${T.shadow}`,
        opacity: wip ? 0.55 : locked ? 0.7 : 1,
        filter: locked ? "grayscale(0.35)" : "none",
      }}>
      {swatch}
      <div className="px-2.5 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {children}
          {wip && <div className="mt-1 text-[8px] font-extrabold uppercase tracking-widest px-1 py-0.5 rounded inline-block" style={{ background: T.shadow, color: T.ink }}>Not active yet</div>}
          {short && !wip && <div className="mt-1 text-[8px] font-extrabold uppercase tracking-widest px-1 py-0.5 rounded inline-block" style={{ background: "#E85D5D22", color: "#E85D5D" }}>Need {price - loks} more</div>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {r && !equipped && <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: r.color || T.ink, color: rarity === "mythic" ? "#fff" : T.paper }}>{r.icon}</span>}
          <span className="text-xs font-extrabold whitespace-nowrap" style={{ color: wip ? T.shadow : confirming ? T.accent : equipped ? T.alt : short ? "#E85D5D" : T.accent }}>
            {wip ? "n/a" : confirming ? "Tap to confirm" : equipped ? "On ✓" : owned ? "Equip" : price === 0 ? "Free" : `${price} Loks`}
          </span>
        </div>
      </div>
    </button>
  );
}

export function MythicCard({ item, own, equipped, onBuy }) {
  const T = useT();
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef(null);
  useEffect(() => () => clearTimeout(confirmTimer.current), []);
  const handleClick = () => {
    if (!own && !confirming) {
      setConfirming(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    clearTimeout(confirmTimer.current); setConfirming(false); onBuy();
  };
  return (
    <button onClick={handleClick} aria-label={confirming ? `Confirm purchase of ${item.name} for ${item.price} Loks` : undefined}
      className="lok-btn text-left rounded-2xl overflow-hidden rarity-mythic"
      style={{ "--mythic-bg": T.card, boxShadow: confirming ? `0 0 24px ${T.accent}` : equipped ? `0 0 20px ${T.accent}` : `0 0 20px rgba(255,93,162,0.3)`, position: "relative", opacity: own ? 1 : 0.85, filter: own ? "none" : "grayscale(0.25)" }}>
      <div className="flex items-center justify-center py-3" style={{ minHeight: 100, background: `linear-gradient(135deg, ${T.paper}, ${T.card})` }}><MythicPreview itemId={item.fxId} rarity="mythic" /></div>
      <div className="px-2.5 py-2 relative">
        <div className="font-bold text-sm truncate flex items-center gap-1">{item.name}{!own && <span className="text-[8px] px-1 py-0.5 rounded-full rarity-mythic-badge">MYTHIC</span>}</div>
        <div className="text-[9px] font-extrabold uppercase tracking-wide opacity-80">{TYPE_LABELS[item.type] || item.type}</div>
        <div className="text-[10px] opacity-70 truncate">{item.desc}</div>
        <div className="mt-1 text-xs font-extrabold" style={{ color: confirming ? T.accent : equipped ? T.alt : T.accent }}>{confirming ? `Tap to confirm · ${item.price} Loks` : equipped ? "Equipped" : own ? "Equip" : `${item.price} Loks`}</div>
      </div>
    </button>
  );
}

// Hoisted to MODULE scope deliberately, in both consumers. Declared inside a
// render function it is a brand-new component TYPE on every render, so React
// unmounts and remounts every section subtree whenever anything above it
// changes — an ad rotating on its 8s timer, a toast, a bot post landing. That
// silently throws away ShopItem's `confirming` state, so an armed purchase
// can evaporate between two taps with no feedback. verify:shop caught this
// as "Element is not attached to the DOM" between the arm tap and the buy tap.
export function Section({ title, sub, id, children }) {
  return (
    <section className="mt-5" id={id}>
      <h3 className="lok-display text-base font-extrabold">{title}</h3>
      {sub && <p className="text-xs opacity-60 mb-1">{sub}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

// A parked ITEM refuses ahead of a WIP category, because a category flag is
// too coarse for a part-working list: POST_EXPORTS has two real encoders and
// four that do not exist. `parked` travels with the row, so it cannot drift
// out of sync with a hand-maintained map the way WIP_CATEGORIES did.
export function refuseParkedFactory(say) {
  return function refuseParked(item) {
    const reason = item?.parked || null;
    if (!reason) return false;
    say?.(`${item.name} isn't active yet — ${reason}`, "error");
    return true;
  };
}
