import { useT } from "./theme/theme.js";
import { EMPTY_ICONS } from "./constants.jsx";

export default function EmptyState({ icon = "default", title, subtitle, action, onAction }) {
  const T = useT();
  return (<div className="flex flex-col items-center text-center py-12 px-6 mt-4 rounded-2xl" style={{ border: `2px dashed ${T.shadow}` }}>
    <div style={{ color: T.ink, opacity: 0.35, marginBottom: 12 }}>{EMPTY_ICONS[icon] || EMPTY_ICONS.default}</div>
    <div className="lok-display font-extrabold text-base mb-1" style={{ color: T.ink }}>{title}</div>
    {subtitle && <div className="text-sm opacity-60 mb-4 max-w-xs leading-snug">{subtitle}</div>}
    {action && onAction && <button onClick={onAction} className="lok-btn lok-display px-4 py-2 rounded-xl font-bold text-sm" style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}` }}>{action}</button>}
  </div>);
}

export function Empty({ text }) { return <EmptyState title={text} />; }
