import { createClient } from "@supabase/supabase-js";

// ---- Connection config -------------------------------------------------
// Vite exposes env vars prefixed with VITE_ via import.meta.env (.env.local).
// If they're absent we fall back to the project's PUBLISHABLE key.
//
// Why a committed fallback is safe here: `sb_publishable_*` keys are the
// modern browser-side Supabase keys. They are designed to be embedded in
// client bundles, carry no privileges of their own, are independently
// rotatable, and every table they reach is governed by RLS. (This is NOT the
// service-role key, which must never be shipped.) Without this fallback the
// CI / Cloudflare Pages build — which sets no env vars — shipped `undefined`
// for both values, silently disabling accounts, Rooms, duels and feed search
// in every deployed build.
const FALLBACK_URL = "https://jfavkudihasswkhkouxq.supabase.co";
const FALLBACK_KEY = "sb_publishable_ipcGPahvt2-j2YwBFBbvUQ_EJo2WJID";

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const SUPA_URL = envUrl || FALLBACK_URL;
export const SUPA_KEY = envKey || FALLBACK_KEY;

/** "env" = configured via .env, "fallback" = built-in public key, "off" = unusable. */
export const SUPA_SOURCE = envUrl && envKey ? "env" : (SUPA_URL && SUPA_KEY ? "fallback" : "off");

export const supabase = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY) : null;

if (typeof console !== "undefined") {
  if (SUPA_SOURCE === "off") console.error("[Lok] Supabase is NOT configured — accounts, Rooms and duels are disabled.");
  else if (SUPA_SOURCE === "fallback") console.info("[Lok] Supabase connected via built-in publishable key (no .env.local found).");
}

/** Live reachability probe, surfaced in the Settings diagnostics row. */
export async function checkSupabase() {
  if (!supabase) return { ok: false, reason: "not configured" };
  try {
    const { error } = await supabase.from("lok_posts").select("id").limit(1);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, reason: SUPA_SOURCE === "env" ? "connected (.env)" : "connected" };
  } catch (e) {
    return { ok: false, reason: e?.message || "unreachable" };
  }
}
