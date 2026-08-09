import { useEffect, useState, useRef } from "react";
import { CHEST_TYPES, generateChestReward } from "../constants.jsx";

export function ChestOpen({ chestType, reward, onComplete, gyroMotion = { gamma: 0, beta: 0, alpha: 0 } }) {
  const containerRef = useRef(null);
  const chest = CHEST_TYPES.find(c => c.id === chestType);

  useEffect(() => {
    if (!containerRef.current || !chest) return;

    const intensity = chest.animIntensity;

    // Create particles based on rarity
    const particleCount = Math.floor(20 * intensity);
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.style.position = "absolute";
      particle.style.left = "50%";
      particle.style.top = "50%";
      particle.style.pointerEvents = "none";

      // Random particle type based on intensity
      const types = ["💥", "✨", "⭐", "🎉", "💫"];
      if (intensity > 2) types.push("🔥", "⚡", "🌊");
      if (intensity > 2.5) types.push("🎆", "💥", "⚡");

      particle.textContent = types[Math.floor(Math.random() * types.length)];
      particle.style.fontSize = (12 + Math.random() * 20) + "px";
      particle.style.transform = `translate(-50%, -50%)`;

      containerRef.current.appendChild(particle);

      // Animate particle
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 100 + Math.random() * 150 * intensity;
      const duration = 0.8 + Math.random() * 0.4;

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      particle.animate(
        [
          { transform: `translate(calc(-50% + 0px), calc(-50% + 0px))`, opacity: 1 },
          { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, opacity: 0 },
        ],
        {
          duration: duration * 1000,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }
      );
    }

    // Confetti for uncommon+
    if (intensity >= 1.0) {
      const confettiCount = Math.floor(30 * intensity);
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement("div");
        confetti.style.position = "absolute";
        confetti.style.left = (Math.random() * 100) + "%";
        confetti.style.top = "-10px";
        confetti.style.width = "8px";
        confetti.style.height = "8px";
        confetti.style.pointerEvents = "none";
        confetti.style.borderRadius = "50%";

        const colors = ["#FFD700", "#FF69B4", "#00CED1", "#FF6347", "#98FB98"];
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];

        containerRef.current.appendChild(confetti);

        const duration = 1.5 + Math.random() * 1.0;
        const rotation = Math.random() * 360;

        confetti.animate(
          [
            { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
            { transform: `translateY(600px) rotate(${rotation}deg)`, opacity: 0 },
          ],
          {
            duration: duration * 1000,
            easing: "ease-in",
          }
        );
      }
    }

    // Waves for epic+
    if (intensity >= 2.0) {
      for (let w = 0; w < 3; w++) {
        const wave = document.createElement("div");
        wave.style.position = "absolute";
        wave.style.left = "50%";
        wave.style.top = "50%";
        wave.style.width = "20px";
        wave.style.height = "20px";
        wave.style.border = `3px solid ${chest.color}`;
        wave.style.borderRadius = "50%";
        wave.style.transform = "translate(-50%, -50%)";
        wave.style.pointerEvents = "none";

        containerRef.current.appendChild(wave);

        wave.animate(
          [
            { transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
            { transform: "translate(-50%, -50%) scale(3)", opacity: 0 },
          ],
          {
            duration: 600 + w * 200,
            easing: "ease-out",
          }
        );
      }
    }

    // Lasers for legendary+
    if (intensity >= 2.5) {
      for (let l = 0; l < 6; l++) {
        const laser = document.createElement("div");
        laser.style.position = "absolute";
        laser.style.left = "50%";
        laser.style.top = "50%";
        laser.style.width = "100%";
        laser.style.height = "2px";
        laser.style.background = `linear-gradient(90deg, transparent, ${chest.color}, transparent)`;
        laser.style.boxShadow = `0 0 10px ${chest.color}`;
        laser.style.pointerEvents = "none";
        laser.style.transformOrigin = "50% 50%";
        laser.style.transform = `translate(-50%, -50%) rotate(${(l * 60)}deg)`;

        containerRef.current.appendChild(laser);

        laser.animate(
          [
            { opacity: 1 },
            { opacity: 0 },
          ],
          {
            duration: 400 + l * 100,
            easing: "ease-out",
          }
        );
      }
    }

    // Cleanup timeout
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [chestType, chest, onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        pointerEvents: "none",
      }}
    >
      <div style={{
        fontSize: 80,
        animation: "blotBounce 0.6s ease-out",
        transform: `rotateX(${Math.max(-15,Math.min(15,gyroMotion.beta*0.15))}deg) rotateY(${Math.max(-15,Math.min(15,gyroMotion.gamma*0.15))}deg)`,
        transformStyle: "preserve-3d",
      }}>
        {chest?.emoji}
      </div>
      {reward && (
        <div style={{
          position: "absolute",
          bottom: "20%",
          textAlign: "center",
          animation: "blotTokenPop 1s ease-out forwards",
          fontSize: 24,
          fontWeight: 600,
          color: chest?.color,
        }}>
          {reward.type === "loks" ? `+${reward.amount} Loks!` : `+${reward.itemName}!`}
        </div>
      )}
    </div>
  );
}
