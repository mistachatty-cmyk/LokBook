import { NAME_COLOR_MAP } from "./constants.jsx";

const gradText = (grad, anim) => ({ background: grad, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: anim });

export default function NameTag({ name, color, className, style }) {
  const c = NAME_COLOR_MAP[color];
  if (c === "rainbow") return <span className={className} style={{ ...style, ...gradText("linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0,#7A4FBF)") }}>{name}</span>;
  if (c === "fire") return <span className={className} style={{ ...style, ...gradText("linear-gradient(90deg,#FF5733,#FFC300,#FF8A5C,#FF5733)", "fireanim 3s ease infinite") }}>{name}</span>;
  if (c === "ice") return <span className={className} style={{ ...style, ...gradText("linear-gradient(90deg,#4EBFFF,#E0FBFC,#7FDBFF,#4EBFFF)", "iceanim 4s ease infinite") }}>{name}</span>;
  return <span className={className} style={{ ...style, color: c || style?.color }}>{name}</span>;
}
