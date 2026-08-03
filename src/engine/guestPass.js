// Guest of the Pass — a self-service recovery code for guests who never
// signed in. In-world this is framed as LilLok holding your ink in stasis
// until it's bonded somewhere safe: the code vocabulary below draws from the
// same stillness as LilLok's own stasis voice lines (LILLOK_SPEECH.stasis in
// constants.jsx) rather than inventing a separate mascot.
//
// A code is a bearer credential, like a gift-card number: knowing it is
// sufficient to redeem it. Accordingly the backend (see the guest_passes
// table + redeem_guest_pass() migration) has no public SELECT — every read
// goes through that one RPC, which only ever returns the single row whose
// code matches exactly what the caller already has in hand.
import { supabase } from "../supabaseClient.js";

const GHOST_ADJ = ["hollow", "unbound", "quiet", "dim", "faded", "still", "half-lit", "coldpress", "unwritten", "grey"];
const GHOST_NOUN = ["well", "fold", "owl", "moth", "page", "ward", "ink", "gate", "echo", "hush"];

const randInt = n => Math.floor(Math.random() * n);

/** A human, ghost/void-themed code — easy to read back over a phone, hard to guess. */
export function makeGuestPassCode() {
  const a = GHOST_ADJ[randInt(GHOST_ADJ.length)];
  const n = GHOST_NOUN[randInt(GHOST_NOUN.length)];
  const num = 1000 + randInt(9000);
  return `${a}-${n}-${num}`;
}

/** Mint a pass: stash `saveBlob` under a fresh code. Returns the code, or null on failure. */
export async function mintGuestPass(saveBlob, email) {
  if (!supabase) return null;
  const code = makeGuestPassCode();
  try {
    const { error } = await supabase.from("guest_passes").insert({ code, email: email || null, save_blob: saveBlob });
    if (error) return null;
    return code;
  } catch {
    return null;
  }
}

/** Redeem a pass: returns the stashed save blob for `code`, or null if unknown/unreachable. */
export async function redeemGuestPass(code) {
  if (!supabase) return null;
  const clean = (code || "").trim().toLowerCase();
  if (!clean) return null;
  try {
    const { data, error } = await supabase.rpc("redeem_guest_pass", { p_code: clean });
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}
