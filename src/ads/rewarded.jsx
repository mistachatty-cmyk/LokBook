// Rewarded video — the one ad surface that survives LokPass.
//
// It is opt-in (nothing plays until the user taps a reward), it grants value
// rather than taking attention, and it is never routed through adPlan(). That
// is deliberate: adPlan() governs *involuntary* surfaces and turns them all off
// for paying users, but removing a voluntary reward from someone who paid would
// be a downgrade, not a perk.
//
// The player below is a placeholder implementation so the whole claim flow —
// cooldowns, server grants, the reward sheet — is testable before a network is
// contracted. Swapping in AdMob or Unity means replacing playRewardedAd() only;
// nothing else in the flow knows which network is behind it.

import { useCallback, useEffect, useState } from "react";
import { useT } from "../theme/theme.js";
import { REWARDS, cooldownLeft, formatCooldown } from "../engine/rewards.js";

const PLACEHOLDER_MS = 5000; // stand-in for a ~15-30s network spot

/**
 * Plays a rewarded spot. Resolves true when the view completed and the reward
 * should be granted, false when the user bailed out early.
 *
 * Real networks call back with a signed completion token; when one is wired up
 * that token is what the server grant should verify, not this boolean.
 */
export function playRewardedAd({ onProgress } = {}) {
  return new Promise(resolve => {
    const started = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / PLACEHOLDER_MS);
      onProgress?.(p);
      if (p >= 1) { clearInterval(tick); resolve(true); }
    }, 100);
  });
}

/** The playing-an-ad overlay. Intentionally plain — it is a stand-in. */
function RewardedPlayer({ reward, onDone, onCancel }) {
  const T = useT();
  const [p, setP] = useState(0);
  useEffect(() => {
    let live = true;
    playRewardedAd({ onProgress: v => live && setP(v) }).then(ok => { if (live) onDone(ok); });
    return () => { live = false; };
  }, []);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,.85)" }}>
      <div className="w-full text-center flex flex-col items-center gap-4" style={{ maxWidth: 380, color: "#fff" }}>
        <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">Sponsored · rewarded</div>
        <div className="text-5xl">{reward.icon}</div>
        <div className="lok-display font-extrabold text-xl">Watching for {reward.name}</div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "rgba(255,255,255,.2)" }}>
          <div style={{ width: `${p * 100}%`, height: "100%", background: T.accent, transition: "width .1s linear" }} />
        </div>
        <button
          onClick={onCancel}
          className="text-xs underline opacity-60"
          style={{ color: "#fff", background: "transparent", border: "none" }}
        >Cancel — no reward</button>
      </div>
    </div>
  );
}

/**
 * The reward sheet. `claims` maps rewardId -> last claim timestamp; `onClaim`
 * receives the reward object once a view completes.
 */
export default function RewardedSheet({ claims = {}, onClaim, onClose, lokPass = false }) {
  const T = useT();
  const [playing, setPlaying] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const finish = useCallback(ok => {
    const r = playing; setPlaying(null);
    if (ok && r) onClaim(r);
  }, [playing, onClaim]);

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: "rgba(0,0,0,.35)" }} onClick={onClose}>
        <div
          className="w-full rounded-t-3xl p-5 overflow-y-auto overscroll-contain"
          style={{ maxWidth: 560, maxHeight: "78vh", background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="lok-display font-extrabold text-xl">Free rewards</div>
            <button onClick={onClose} aria-label="Close rewards" className="lok-btn w-9 h-9 rounded-full font-bold" style={{ border: `2.5px solid ${T.ink}`, background: T.paper }}>✕</button>
          </div>
          <p className="text-xs opacity-70 leading-snug mb-3">
            Watch a short spot, take the reward. {lokPass && "LokPass keeps these — it only removes the ads you didn't ask for."}
          </p>
          <div className="flex flex-col gap-2">
            {REWARDS.map(r => {
              const left = cooldownLeft(r.id, claims, now);
              const ready = left <= 0;
              return (
                <button
                  key={r.id} disabled={!ready} onClick={() => setPlaying(r)}
                  className="lok-btn flex items-center gap-3 p-3 rounded-2xl text-left w-full"
                  style={{ border: `2.5px solid ${T.ink}`, background: ready ? T.paper : "transparent", opacity: ready ? 1 : 0.45 }}
                >
                  <span className="text-2xl shrink-0">{r.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-extrabold text-sm">{r.name}</span>
                    <span className="block text-xs opacity-70 leading-snug">{r.desc}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-extrabold" style={{ color: ready ? T.accent : T.ink }}>
                    {ready ? "Watch →" : formatCooldown(left)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {playing && <RewardedPlayer reward={playing} onDone={finish} onCancel={() => setPlaying(null)} />}
    </>
  );
}
