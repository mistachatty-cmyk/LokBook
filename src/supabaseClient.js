import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ via import.meta.env (set in .env.local).
// The anon/publishable key is safe to ship to browsers — data access is governed by RLS.
// These MUST be set in .env.local for local dev; the CI smoke test stubs them.
export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPA_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY) : null;
