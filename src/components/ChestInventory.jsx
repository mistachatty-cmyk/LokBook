import { useState, useRef } from "react";
import { CHEST_TYPES, generateChestReward } from "../constants.jsx";

export function ChestInventory({ chests = [], onOpen, T, owned = [], cosmetics = {}, goggles = {} }) {
  const [openingId, setOpeningId] = useState(null);
  const [reward, setReward] = useState(null);

  const handleOpenChest = (chestId, index) => {
    if (openingId) return; // Already opening one

    setOpeningId(chestId);
    const chest = chests[index];
    const chestReward = generateChestReward(chest.type, owned, cosmetics, goggles);

    // Delay reward reveal for animation
    setTimeout(() => {
      setReward(chestReward);
      if (onOpen) onOpen(index, chestReward);
    }, 600);

    // Close reveal after 2s
    setTimeout(() => {
      setOpeningId(null);
      setReward(null);
    }, 2500);
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
      padding: "12px 0",
      maxHeight: 300,
      overflowY: "auto",
    }}>
      {chests.length === 0 ? (
        <div style={{ gridColumn: "1/-1", textAlign: "center", opacity: 0.5, padding: 20 }}>
          No chests yet. Tap the blot to earn chests!
        </div>
      ) : (
        chests.map((chest, idx) => {
          const chestType = CHEST_TYPES.find(c => c.id === chest.type);
          const isOpening = openingId === chest.id;

          return (
            <div
              key={idx}
              onClick={() => handleOpenChest(chest.id, idx)}
              style={{
                position: "relative",
                padding: 12,
                background: T.card,
                border: `2px solid ${chestType?.color || T.ink}`,
                borderRadius: 8,
                cursor: isOpening ? "wait" : "pointer",
                textAlign: "center",
                opacity: isOpening ? 0.7 : 1,
                transition: "all 0.2s",
                transform: isOpening ? "scale(1.1)" : "scale(1)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {isOpening ? "💫" : chestType?.emoji}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: chestType?.color }}>
                {chestType?.name}
              </div>
              {reward && isOpening && (
                <div style={{
                  fontSize: 9,
                  marginTop: 4,
                  animation: "blotTokenPop 1s ease-out",
                  color: chestType?.color,
                }}>
                  {reward.type === "loks" ? `+${reward.amount} Loks` : `+${reward.itemName}`}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
