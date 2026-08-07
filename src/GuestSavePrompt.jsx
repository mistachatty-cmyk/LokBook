import { useState } from "react";
import { useT } from "./theme/theme.js";

const REMINDER_OPTIONS = [3, 7, 14, 30];

// Nudges a signed-out guest to either sign in or mint a recovery code, right
// after they publish (reason="publish") or once their local save has aged
// past their reminder window (reason="expiry"). Dismissing never blocks —
// the whole point is guests keep working with nothing lost either way.
export default function GuestSavePrompt({ reason = "publish", guestDays = 7, onSignIn, onMint, onSetDays, onClose }) {
  const T = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [passCode, setPassCode] = useState(null);
  const [mode, setMode] = useState(null); // null | "signin" | "pass"

  const isExpiry = reason === "expiry";
  const title = isExpiry ? "Your ink might fade soon" : "Nice flip! Keep it safe?";
  const body = isExpiry
    ? `It's been ${guestDays}+ days as a guest — art like this can get cleared without a backup.`
    : "You're drawing as a guest right now — this only lives on this device.";

  const doSignIn = async () => {
    const e = email.trim();
    if (!e || !e.includes("@")) return;
    setBusy(true);
    try { await onSignIn(e); setSent(true); } catch {}
    setBusy(false);
  };
  const doMint = async () => {
    setBusy(true);
    try { const code = await onMint(email.trim() || null); if (code) setPassCode(code); } catch {}
    setBusy(false);
  };

  return (<div className="fixed inset-0 z-[65] flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,.6)" }}>
    <div className="w-full rounded-3xl p-5 text-center" style={{ maxWidth: 380, background: T.card, border: `3px solid ${T.ink}`, boxShadow: `8px 8px 0 ${T.accent}` }}>
      <div className="text-2xl mb-2">👻</div>
      <div className="lok-display text-lg font-extrabold" style={{ color: T.accent }}>{title}</div>
      <p className="text-sm opacity-70 mt-1 leading-snug">{body}</p>

      {passCode ? (
        <div className="mt-3 p-3 rounded-2xl text-center" style={{ border: `2px dashed ${T.ink}`, background: T.paper }}>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">your code — write it down</div>
          <div className="lok-display font-extrabold text-lg my-1" style={{ color: T.accent, letterSpacing: 0.5 }}>{passCode}</div>
          <div className="text-[11px] opacity-60">Doesn't expire — redeem it anytime, on any device, and you get your whole gallery, Loks, and LilLok back exactly as you left them. Full control, no account required.</div>
        </div>
      ) : sent ? (
        <div className="mt-3 text-sm leading-snug">✉️ Check <strong>{email}</strong> for your magic link.</div>
      ) : mode === "signin" ? (
        <div className="mt-3 flex gap-1.5 text-left">
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com" aria-label="Email" onKeyDown={e => e.key === "Enter" && doSignIn()} className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} />
          <button onClick={doSignIn} disabled={busy} className="lok-btn shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}`, opacity: busy ? 0.6 : 1 }}>{busy ? "…" : "Go"}</button>
        </div>
      ) : mode === "pass" ? (
        <div className="mt-3 text-left">
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email (optional)" aria-label="Email for guest pass" className="w-full px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} />
          <button onClick={doMint} disabled={busy} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.alt, color: T.onAccent, border: `2.5px solid ${T.ink}`, opacity: busy ? 0.6 : 1 }}>{busy ? "…" : "Stash my ink"}</button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <button onClick={() => setMode("signin")} className="lok-btn lok-display w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}` }}>Sign in</button>
          <button onClick={() => setMode("pass")} className="lok-btn lok-display w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.card, color: T.ink, border: `2.5px solid ${T.ink}` }}>👻 Get a Guest Pass</button>
        </div>
      )}

      {!passCode && (<>
        <button onClick={onClose} className="mt-3 text-xs font-bold underline opacity-60">Stay unbound for now</button>
        <div className="text-[10px] opacity-40 mt-0.5">art stays on this device only</div>
        <div className="mt-3 pt-3 flex items-center justify-center gap-1.5 flex-wrap text-[10px] opacity-50" style={{ borderTop: `1.5px dashed ${T.shadow}` }}>
          remind me again in
          {REMINDER_OPTIONS.map(n => (<button key={n} onClick={() => onSetDays(n)} aria-pressed={guestDays === n} className="lok-btn px-1.5 py-0.5 rounded font-bold" style={{ border: `1.5px solid ${guestDays === n ? T.accent : "transparent"}`, color: guestDays === n ? T.accent : "inherit" }}>{n}d</button>))}
        </div>
      </>)}
      {passCode && <button onClick={onClose} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.ink, color: T.paper }}>Keep drawing →</button>}
    </div>
  </div>);
}
