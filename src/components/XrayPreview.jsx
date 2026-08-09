import { CHEST_TYPES } from "../constants.jsx";

export function XrayPreview({ rarity, rewards = [], T, onClose }) {
  const chest = CHEST_TYPES.find(c => c.id === rarity);
  if (!chest) return null;

  const formatReward = (reward) => {
    if (reward.type === "loks") return `${reward.amount} Loks`;
    if (reward.type === "item") return reward.itemName;
    if (reward.type === "xrayVision") return `X-ray Vision: ${reward.rarity}`;
    if (reward.type === "goggles") return `${reward.rarity} Goggles`;
    return "???";
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.card,
          border: `2px solid ${chest.color}`,
          borderRadius: "12px",
          padding: "20px",
          maxWidth: "100%",
          width: "280px",
          maxHeight: "70vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>{chest.emoji}</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: chest.color }}>
            {chest.name} Pool
          </div>
          <div style={{ fontSize: "11px", opacity: 0.6, marginTop: "4px" }}>
            What's possible inside
          </div>
        </div>

        <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
          {rewards.length > 0 ? (
            rewards.map((reward, idx) => (
              <div
                key={idx}
                style={{
                  background: T.paper,
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textAlign: "center",
                  border: `1px solid ${chest.color}`,
                  color: chest.color,
                }}
              >
                {formatReward(reward)}
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", opacity: 0.5, fontSize: "12px", padding: "20px 10px" }}>
              Scan the chest to see what might be inside...
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            background: T.accent,
            color: T.paper,
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Close preview
        </button>
      </div>
    </div>
  );
}
