import { useState } from "react";
import { useT } from "./theme/theme.js";

// Waitlist capture. Ported from LokLingu's waitlist-dialog so both products ask
// the same way and land in the same two destinations (see api/waitlist.js),
// restyled to LokBook's own card language rather than shadcn's.
//
// A prompt, not a push: this only opens from an explicit tap. It never
// auto-shows, and dismissing it costs nothing — the app is fully usable
// without ever giving an email, which is the honest position while everything
// is still local.

const JOINED_KEY = "lok:waitlist:joined";

export const hasJoinedWaitlist = () => {
  try { return !!localStorage.getItem(JOINED_KEY); } catch { return false; }
};
const markJoined = email => {
  try { localStorage.setItem(JOINED_KEY, email || "1"); } catch {}
};

export default function WaitlistDialog({ source = "unknown", onClose }) {
  const T = useT();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const e = email.trim();
    if (busy || !e) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, phone: phone.trim() || undefined, source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Surface what actually went wrong. Generic "check your connection"
        // copy has actively misdirected debugging in this app before, and this
        // screen is mostly seen on a phone where the console is unreachable.
        setErr(
          data?.error === "invalid_email" ? "That email doesn't look right."
          : data?.error === "invalid_phone" ? "That phone number doesn't look right."
          : data?.error === "not_configured" ? "The waitlist isn't switched on yet — try again soon."
          : `Couldn't join right now (${res.status}). Try again shortly.`
        );
        return;
      }
      markJoined(e);
      setDone(true);
    } catch (ex) {
      setErr(`${ex.name}: ${ex.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (<div className="fixed inset-0 z-[65] flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,.6)" }} onClick={onClose}>
    <div className="w-full rounded-3xl p-5 text-center" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, background: T.card, border: `3px solid ${T.ink}`, boxShadow: `8px 8px 0 ${T.accent}` }}>

      {done ? (<>
        <div className="text-2xl mb-2">✉️</div>
        <div className="lok-display text-lg font-extrabold" style={{ color: T.accent }}>You're on the list</div>
        <p className="text-sm opacity-70 mt-1 leading-snug">
          We'll be in touch the moment LokBook goes live. Thanks for the early interest — keep drawing in the meantime, it all stays right here on your device.
        </p>
        <button onClick={onClose} className="lok-btn lok-display mt-4 w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.ink, color: T.paper, border: `2.5px solid ${T.ink}` }}>Keep drawing →</button>
      </>) : (<>
        <div className="text-2xl mb-2">🔖</div>
        <div className="lok-display text-lg font-extrabold" style={{ color: T.accent }}>Join the waitlist</div>
        <p className="text-sm opacity-70 mt-1 leading-snug">
          We're still connecting things up behind the scenes — nothing beyond this signup leaves your device yet, until everything's properly wired (or there's funding to launch it right). Leave your email to hear when that changes.
        </p>

        <div className="mt-3 text-left">
          <label htmlFor="waitlist-email" className="text-[10px] font-bold uppercase tracking-widest opacity-50">Email</label>
          <input id="waitlist-email" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} type="email" autoComplete="email" placeholder="you@example.com" aria-label="Email for the waitlist" onKeyDown={e => e.key === "Enter" && submit()}
            className="w-full mt-1 px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} />
        </div>

        <div className="mt-2.5 text-left">
          <label htmlFor="waitlist-phone" className="text-[10px] font-bold uppercase tracking-widest opacity-50">
            Phone <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(optional — for a text too)</span>
          </label>
          <input id="waitlist-phone" value={phone} onChange={e => { setPhone(e.target.value); setErr(""); }} type="tel" autoComplete="tel" placeholder="Totally up to you" aria-label="Phone for the waitlist (optional)" onKeyDown={e => e.key === "Enter" && submit()}
            className="w-full mt-1 px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} />
          <div className="text-[10px] opacity-50 mt-1 leading-snug">Completely optional. Add it only if you'd also like a text — email alone works fine.</div>
        </div>

        {err && <div className="mt-2.5 text-xs font-bold px-2.5 py-2 rounded-xl select-all text-left" style={{ border: `2px solid ${T.accent}`, color: T.accent, background: T.paper }}>{err}</div>}

        <button onClick={submit} disabled={busy || !email.trim()} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}`, opacity: busy || !email.trim() ? 0.55 : 1 }}>
          {busy ? "…" : "Join waitlist"}
        </button>

        <button onClick={onClose} className="mt-3 text-xs font-bold underline opacity-60">Not right now</button>
        <div className="text-[10px] opacity-40 mt-0.5">your art stays on this device either way</div>
      </>)}
    </div>
  </div>);
}
