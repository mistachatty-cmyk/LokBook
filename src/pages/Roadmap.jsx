import { useState } from "react";
import { useT } from "../theme/theme.js";
import { UNLOCK_TRACK, nextUnlock, inkWeatherToday } from "../engine/unlocks.js";

// The Roadmap. Levels grant behaviour; the Shop sells looks. Kept visually in
// the app's existing language (lok-btn, riso tokens, 3px ink borders) so it
// reads as part of LokBook rather than a bolted-on screen.
export default function Roadmap({ level = 1, xp = 0, onClose }) {
  const T = useT();
  const [open, setOpen] = useState(null);
  const next = nextUnlock(level);
  const toNext = next ? next.level * 100 - 100 - xp : 0;
  const weather = inkWeatherToday();

  return (<div className="px-3 pb-24 pt-2">
    <div className="flex items-center gap-2 mb-3">
      <div>
        <div className="text-xl font-extrabold" style={{ color: T.ink }}>The Roadmap</div>
        <div className="text-[11px] opacity-70">Levels don't sell you anything. They change how the world behaves.</div>
      </div>
      {onClose && <button onClick={onClose} className="ml-auto lok-btn text-xs font-bold px-3 py-1.5 rounded-xl" style={{ border: `2.5px solid ${T.ink}`, background: T.card }}>close</button>}
    </div>

    <div className="rounded-2xl p-3 mb-3" style={{ border: `3px solid ${T.ink}`, background: T.card, boxShadow: `3px 3px 0 ${T.shadow}` }}>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-extrabold" style={{ color: T.accent }}>Level {level}</span>
        <span className="text-[11px] opacity-70">{xp} XP</span>
      </div>
      {next
        ? <div className="text-[11px] mt-1 opacity-80">{toNext > 0 ? `${toNext} XP` : "Ready"} → <b>{next.name}</b> at level {next.level}</div>
        : <div className="text-[11px] mt-1 opacity-80">Every unlock on the track is yours.</div>}
      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: `${T.ink}22` }}>
        <div style={{ width: `${Math.min(100, (xp % 100))}%`, height: "100%", background: T.accent }} />
      </div>
      {level >= 2 && <div className="text-[10px] mt-2 opacity-60">Today's ink weather: <b>{weather === "none" ? "clear" : weather}</b></div>}
    </div>

    <div className="flex flex-col gap-2">
      {UNLOCK_TRACK.map(u => {
        const got = level >= u.level, isOpen = open === u.id;
        return (<button key={u.id} onClick={() => setOpen(isOpen ? null : u.id)}
          className="lok-btn text-left rounded-2xl p-3"
          style={{ border: `3px solid ${got ? T.accent : T.ink}`, background: T.card, opacity: got ? 1 : 0.62, boxShadow: got ? `3px 3px 0 ${T.shadow}` : "none" }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0" style={{ background: got ? T.accent : "transparent", color: got ? T.paper : T.ink, border: `2px solid ${got ? T.accent : T.ink}` }}>LV {u.level}</span>
            <span className="font-extrabold text-sm truncate" style={{ color: T.ink }}>{u.name}</span>
            {!u.live && <span className="text-[9px] font-extrabold uppercase tracking-wide opacity-60 ml-auto shrink-0">planned</span>}
            {u.live && got && <span className="text-[9px] font-extrabold uppercase tracking-wide ml-auto shrink-0" style={{ color: T.accent }}>active</span>}
            {u.live && !got && <span className="text-[9px] font-extrabold uppercase tracking-wide opacity-60 ml-auto shrink-0">locked</span>}
          </div>
          <div className="text-[11px] mt-1 opacity-80">{u.blurb}</div>
          {isOpen && <div className="text-[11px] mt-2 pt-2 opacity-90" style={{ borderTop: `2px dashed ${T.ink}44` }}>{u.detail}</div>}
        </button>);
      })}
    </div>

    <div className="text-[10px] opacity-55 mt-3 leading-relaxed">
      Planned items aren't built yet — they're listed so the track is honest about
      what's coming rather than padding it out. Nothing here is purchasable, and
      nothing here replaces anything in the Shop.
    </div>
  </div>);
}
