import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useT } from "../theme/theme.js";

export function AuthGate({ children }) {
  const { isAuthenticated, loading, signInWithEmail, signInWithOAuth } = useAuth();
  const T = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm opacity-50">Loading…</div>;
  }

  if (isAuthenticated()) {
    return children;
  }

  const sendMagicLink = async () => {
    const e = email.trim();
    if (!e || !e.includes("@")) return;
    setBusy(true);
    try {
      await signInWithEmail(e);
      setSent(e);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="w-full rounded-2xl p-5 text-center" style={{
        maxWidth: 400, background: T.card, border: `3px solid ${T.ink}`,
        boxShadow: `6px 6px 0 ${T.shadow}`
      }}>
        {sent ? (
          <>
            <div className="text-2xl mb-2">✉️</div>
            <div className="lok-display font-extrabold text-lg" style={{color:T.accent}}>Check your email</div>
            <p className="text-sm opacity-70 mt-2 leading-snug">We sent a magic link to <strong>{sent}</strong>. Click it to sign in — no password needed.</p>
            <button onClick={() => { setSent(""); setEmail(""); }} className="lok-btn mt-4 px-4 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,color:T.ink,background:T.card}}>Use a different email</button>
          </>
        ) : (
          <>
            <div className="text-2xl mb-2">🔐</div>
            <div className="lok-display font-extrabold text-lg" style={{color:T.accent}}>Sign in to LokBook</div>
            <p className="text-sm opacity-70 mt-1 leading-snug">Your progress backs up to the cloud and syncs across devices.</p>
            <div className="mt-4 flex gap-1.5">
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" aria-label="Email" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.paper,color:T.ink}} onKeyDown={e=>e.key==="Enter"&&sendMagicLink()}/>
              <button onClick={sendMagicLink} disabled={busy} className="lok-btn lok-display shrink-0 px-4 py-2 rounded-xl font-extrabold text-sm" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,opacity:busy?0.6:1}}>{busy?"Sending…":"Send link"}</button>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={async()=>{try{await signInWithOAuth("google");}catch{}}} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold text-sm" style={{background:T.card,color:T.ink,border:`3px solid ${T.ink}`}}>Google</button>
              <button onClick={async()=>{try{await signInWithOAuth("github");}catch{}}} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold text-sm" style={{background:T.card,color:T.ink,border:`3px solid ${T.ink}`}}>GitHub</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function RequireAuth({ children, fallback }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated()) return fallback || null;
  return children;
}
