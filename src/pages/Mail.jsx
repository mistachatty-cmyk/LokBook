import { LOKPAL_NAMES, LOKPAL_GREETINGS } from "../constants.jsx";

export function Mail({ mail = [], T, onMarkRead, onDelete }) {
  const formatReward = (reward) => {
    if (!reward) return "???";
    if (reward.type === "loks") {
      if (reward.bonus) {
        return `+${reward.amount} Loks (sorry bonus! 💝)`;
      } else if (reward.irritationLevel !== undefined) {
        const degraded = reward.irritationLevel > 0;
        if (degraded) {
          const irr = reward.irritationLevel;
          const irritText = irr <= 3 ? "slightly tired 😑" : irr <= 6 ? "annoyed 😠" : irr <= 9 ? "very frustrated 😤" : "extremely fed up 💔";
          return `+${reward.amount} Loks (was ${reward.baseAmount}, LokPal ${irritText})`;
        }
      }
      return `+${reward.amount} Loks`;
    }
    if (reward.type === "xrayVision") return `✨ X-ray Vision: ${reward.rarity}`;
    if (reward.type === "goggles") return `🔍 ${reward.rarity.charAt(0).toUpperCase()}${reward.rarity.slice(1)} Goggles`;
    if (reward.type === "cosmetic") return `🎨 ${reward.itemName}`;
    if (reward.type === "item") return `📦 ${reward.itemName}`;
    return "Surprise gift";
  };

  const unreadCount = mail.filter(m => !m.opened).length;
  const sortedMail = [...mail].reverse(); // Newest first

  return (
    <div style={{ padding: "12px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600, color: T.ink }}>
        📬 Mail {unreadCount > 0 && `(${unreadCount})`}
      </div>

      {mail.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            opacity: 0.5,
            padding: "40px 20px",
            fontSize: "13px",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🫧</div>
          <div>No mail yet. LokPals will send you gifts soon!</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sortedMail.map((m) => (
            <div
              key={m.id}
              style={{
                background: m.opened ? T.card : `${T.accent}22`,
                border: `1px solid ${m.opened ? T.ink : T.accent}`,
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "8px",
                fontSize: "12px",
                cursor: "pointer",
                opacity: m.opened ? 0.7 : 1,
                transition: "all 0.2s",
              }}
              onClick={() => !m.opened && onMarkRead?.(m.id)}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px", color: T.ink }}>
                {m.sender}
              </div>
              <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "8px", lineHeight: "1.4" }}>
                {m.message}
              </div>
              <div
                style={{
                  background: T.paper,
                  color: T.accent,
                  padding: "6px 8px",
                  borderRadius: "4px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  fontSize: "11px",
                }}
              >
                {formatReward(m.reward)}
              </div>
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead?.(m.id);
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    background: T.accent,
                    color: T.paper,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {m.opened ? "✓" : "Read"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(m.id);
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    background: "transparent",
                    color: T.ink,
                    border: `1px solid ${T.ink}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
