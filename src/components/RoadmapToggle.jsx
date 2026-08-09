import { useT } from "../theme/theme.js";

export default function RoadmapToggle({ enabled = false, onChange, label = "Toggle" }) {
  const T = useT();

  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 lok-btn py-1.5 px-2 rounded-lg"
      style={{
        background: T.card,
        border: `2px solid ${T.ink}`,
        transition: "all 0.2s ease"
      }}
    >
      <span className="text-xs font-bold" style={{ color: T.ink }}>
        {label}
      </span>
      <div
        style={{
          width: 28,
          height: 16,
          borderRadius: 8,
          background: enabled ? T.accent : T.shadow,
          border: `1.5px solid ${T.ink}`,
          display: "flex",
          alignItems: "center",
          paddingLeft: enabled ? 14 : 2,
          paddingRight: enabled ? 2 : 14,
          transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: enabled ? T.paper : T.ink,
            opacity: enabled ? 1 : 0.7,
            transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
        />
      </div>
    </button>
  );
}
