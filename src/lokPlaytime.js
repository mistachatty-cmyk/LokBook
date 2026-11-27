// Reports active play time for LokBook to the GSix account so it shows in the hub's Global play time and under
// Connected Worlds. Signed in: counted on the account. Signed out: cookieless guest tally (app name and seconds only,
// Global Privacy Control / Do Not Track honoured). Idle when the hub frames the app (the hub counts that minute).
import { startPlaytimeTracker } from "./lokPlaytime.sdk.js";
import { supabase, SUPA_URL, SUPA_KEY } from "./supabaseClient.js";

export const PLAYTIME_APP_KEY = "lokbook";

let started = false;
export function startLokPlaytime() {
  if (started || !supabase || !SUPA_URL || !SUPA_KEY) return;
  started = true;
  startPlaytimeTracker({
    appKey: PLAYTIME_APP_KEY,
    supabaseUrl: SUPA_URL,
    publishableKey: SUPA_KEY,
    getAccessToken: async () => {
      try { return (await supabase.auth.getSession()).data.session?.access_token ?? null; } catch { return null; }
    },
    countGuests: true,
  });
}
