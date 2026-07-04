import { NAME_COLOR_MAP } from "./constants.jsx";

export default function NameTag({ name, color, className, style }) {
  const c = NAME_COLOR_MAP[color];
  if (c === "rainbow") return <span className={className} style={{ ...style, background: "linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0,#7A4FBF)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{name}</span>;
  return <span className={className} style={{ ...style, color: c || style?.color }}>{name}</span>;
}
