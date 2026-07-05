import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ via import.meta.env (set in .env.local).
// Fallbacks keep the party build working with zero setup; the publishable key is
// safe to ship to browsers — data access is governed by RLS.
export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://jfavkudihasswkhkouxq.supabase.co";
export const SUPA_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_ipcGPahvt2-j2YwBFBbvUQ_EJo2WJID";
export const supabase = createClient(SUPA_URL, SUPA_KEY);
