import { useEffect, useState } from "react";

export function BlotSpeech({ message, ink, paper, onFade }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFade) onFade();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onFade]);

  if (!isVisible || !message) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 220,
        right: 20,
        background: paper,
        border: `2.5px solid ${ink}`,
        borderRadius: 12,
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 700,
        color: ink,
        boxShadow: `3px 3px 0 ${ink}`,
        maxWidth: 140,
        wordWrap: "break-word",
        zIndex: 39,
        animation: "blotSpeechFade 3.5s ease-out forwards",
        pointerEvents: "none",
        textAlign: "center",
        whiteSpace: "normal",
      }}
      className="lok-display"
    >
      {message}
      <div
        style={{
          position: "absolute",
          bottom: -10,
          right: 20,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: `10px solid ${ink}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -6,
          right: 21,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: `8px solid ${paper}`,
        }}
      />
    </div>
  );
}
