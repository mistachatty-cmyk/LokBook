// Rewarded-ad reward catalogue.
//
// These are the payouts for watching an opt-in rewarded video. Two design rules
// shape the list:
//
//  1. Rewarded ads stay available to LokPass holders. Every other ad surface
//     goes dark when someone pays (see adPlan() in src/ads.js), but a rewarded
//     ad *gives* value in exchange for attention the user volunteered — taking
//     it away would punish the people who paid.
//  2. Prefer rewards that protect or extend progress over rewards that mint
//     currency. A 2x window or a streak shield is valuable without inflating
//     the economy the way a flat Loks grant does, so the pure-currency options
//     are deliberately the small ones.
//
// `server: true` marks a reward whose grant touches durable economy state and
// must be applied through the Supabase RPC rather than client state — a
// client-only grant is trivially farmable by replaying the callback.

export const REWARDS = [
  {
    id: "ink_refill", icon: "🩸", name: "Ink Refill",
    desc: "Top Blot's ink straight back to full.",
    detail: "LilLok's ink otherwise only regenerates on a timer.",
    cooldownMs: 30 * 60 * 1000, server: false,
  },
  {
    id: "streak_shield", icon: "🛡️", name: "Streak Shield",
    desc: "Protects your daily streak through one missed day.",
    detail: "Consumed automatically the next time you'd break a streak.",
    cooldownMs: 24 * 60 * 60 * 1000, server: true,
  },
  {
    id: "rotation_preview", icon: "🔮", name: "Preview Pass",
    desc: "Try today's rotation item free for 24 hours.",
    detail: "Equip a daily or weekly mythic before deciding to buy it.",
    cooldownMs: 24 * 60 * 60 * 1000, server: false,
  },
  {
    id: "frame_slots", icon: "🎞️", name: "Extra Frames",
    desc: "+8 frame slots on your current project.",
    detail: "Raises the frame cap for this piece only.",
    cooldownMs: 60 * 60 * 1000, server: false,
  },
  {
    id: "battle_reentry", icon: "⚔️", name: "Battle Re-entry",
    desc: "Re-enter a battle you just lost.",
    detail: "Once per day.",
    cooldownMs: 24 * 60 * 60 * 1000, server: true,
  },
  {
    id: "sticker_daypass", icon: "🎴", name: "Sticker Day-Pass",
    desc: "24 hours of access to a pack you don't own.",
    detail: "Pick any locked sticker pack.",
    cooldownMs: 24 * 60 * 60 * 1000, server: false,
  },
  {
    id: "double_loks", icon: "✨", name: "2× Loks",
    desc: "Double earnings for the next 30 minutes.",
    detail: "Stacks with nothing — the window just runs.",
    cooldownMs: 4 * 60 * 60 * 1000, server: true,
  },
  {
    id: "loks_small", icon: "🪙", name: "+40 Loks",
    desc: "A small pile of Loks, right now.",
    detail: "Deliberately modest — the timed perks are the better trade.",
    cooldownMs: 20 * 60 * 1000, server: true,
  },
];

export const rewardById = id => REWARDS.find(r => r.id === id);

/** Milliseconds until `id` can be claimed again; 0 when it is ready. */
export function cooldownLeft(id, claims = {}, now = Date.now()) {
  const r = rewardById(id);
  if (!r) return 0;
  const last = claims[id] || 0;
  return Math.max(0, r.cooldownMs - (now - last));
}

export function formatCooldown(ms) {
  if (ms <= 0) return "";
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.ceil(m / 60)}h`;
}

/** Timed rewards store an expiry; these read it back. */
export const isActive = (until, now = Date.now()) => !!until && until > now;
export const DOUBLE_LOKS_MS = 30 * 60 * 1000;
export const DAYPASS_MS = 24 * 60 * 60 * 1000;
