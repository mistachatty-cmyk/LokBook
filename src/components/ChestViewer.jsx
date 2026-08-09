import { useT } from "../theme/theme.js";

const RARITY_INFO = {
  common: { color: "#9CA3AF", emoji: "⬜" },
  uncommon: { color: "#22C55E", emoji: "🟩" },
  rare: { color: "#3B82F6", emoji: "🟦" },
  epic: { color: "#A855F7", emoji: "🟪" },
  legendary: { color: "#F59E0B", emoji: "🟨" },
  mythic: { color: "#FF5DA2", emoji: "💎" }
};

export default function ChestViewer({ chests = [], onClose }) {
  const T = useT();

  const chestsByRarity = {
    common: chests.filter(c => c.type === "common").length,
    uncommon: chests.filter(c => c.type === "uncommon").length,
    rare: chests.filter(c => c.type === "rare").length,
    epic: chests.filter(c => c.type === "epic").length,
    legendary: chests.filter(c => c.type === "legendary").length,
    mythic: chests.filter(c => c.type === "mythic").length
  };

  const total = chests.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.35)" }} onClick={onClose}>
      <div
        className="rounded-3xl p-5 w-full max-w-sm"
        style={{
          background: T.card,
          border: `3px solid ${T.ink}`,
          boxShadow: `4px 4px 0 ${T.shadow}`,
          maxHeight: "80vh",
          overflowY: "auto"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-extrabold" style={{ color: T.ink }}>🎁 Chest Inventory</div>
          <button
            onClick={onClose}
            className="lok-btn px-2 py-1 rounded-lg text-sm font-bold"
            style={{ border: `2px solid ${T.ink}`, background: T.card, color: T.ink }}
          >
            ✕
          </button>
        </div>

        <div className="text-sm font-bold mb-4 opacity-70">
          {total} chest{total !== 1 ? "s" : ""} total
        </div>

        <div className="space-y-2">
          {Object.entries(chestsByRarity).map(([rarity, count]) => (
            <div key={rarity} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: `${RARITY_INFO[rarity].color}11` }}>
              <span className="text-2xl">{RARITY_INFO[rarity].emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-sm capitalize" style={{ color: T.ink }}>
                  {rarity}
                </div>
                <div className="text-xs opacity-70">{count} chest{count !== 1 ? "s" : ""}</div>
              </div>
              <div
                className="text-lg font-extrabold px-3 py-1 rounded-lg"
                style={{
                  background: RARITY_INFO[rarity].color,
                  color: "#fff",
                  border: `2px solid ${T.ink}`
                }}
              >
                {count}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 text-xs opacity-60" style={{ borderTop: `2px dashed ${T.ink}44` }}>
          Open chests by tapping your LilLok or opening the chests tab in the profile panel.
        </div>
      </div>
    </div>
  );
}
