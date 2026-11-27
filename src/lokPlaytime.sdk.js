// VENDORED from Lok-EcoSystsem/universe-sdk/src/playtime.ts -- DO NOT EDIT HERE. Edit the SDK, then re-copy. (types stripped for this JS-only app; regenerate from the SDK)
const CLIENT_ID_KEY = "gsix.play.client.v1";
const MAX_REPORT_SECONDS = 60;
const MAX_STEP_SECONDS = 2;
const RESTORE_CAP_SECONDS = 600;
function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.random() * 16 | 0;
    return (ch === "x" ? r : r & 3 | 8).toString(16);
  });
}
function anonymousId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
function guestCountingAllowed() {
  const nav = navigator;
  const dnt = nav.doNotTrack ?? window.doNotTrack ?? nav.msDoNotTrack;
  return nav.globalPrivacyControl !== true && dnt !== "1" && dnt !== "yes";
}
const GUEST_REPORT_SECONDS = 30;
function isFramed() {
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}
function startPlaytimeTracker(options) {
  const idle = { flush: async () => {
  }, stop: () => {
  } };
  if (typeof window === "undefined" || typeof document === "undefined") return idle;
  if ((options.skipWhenFramed ?? true) && isFramed()) return idle;
  const flushEvery = Math.max(10, options.flushEverySeconds ?? 30) * 1e3;
  let carry = 0;
  let last = null;
  let token = null;
  let sending = false;
  let stopped = false;
  const refreshToken = async () => {
    try {
      token = await options.getAccessToken() ?? null;
    } catch {
      token = null;
    }
  };
  void refreshToken();
  const active = () => {
    if (document.visibilityState !== "visible" || !document.hasFocus()) return false;
    return options.isActive ? options.isActive() : true;
  };
  const tick = window.setInterval(() => {
    const now = Date.now();
    if (active()) {
      if (last !== null) carry += Math.min(Math.max(0, (now - last) / 1e3), MAX_STEP_SECONDS);
      last = now;
    } else {
      last = null;
    }
  }, 1e3);
  const currentMode = () => {
    if (token !== null) return "account";
    if (options.allowAnonymous?.()) return "anon";
    return options.countGuests && guestCountingAllowed() ? "guest" : null;
  };
  const send = async (seconds, mode) => {
    if (!mode) return true;
    const headers = { apikey: options.publishableKey, "Content-Type": "application/json" };
    let fn = "gsix_playtime_add";
    let body;
    if (mode === "guest") {
      fn = "gsix_playtime_add_guest";
      body = { p_app_key: options.appKey, p_seconds: seconds };
    } else {
      if (mode === "account" && token) headers.Authorization = `Bearer ${token}`;
      body = { p_app_key: options.appKey, p_seconds: seconds, p_client: mode === "account" ? null : anonymousId() };
    }
    try {
      const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers,
        keepalive: true,
        body: JSON.stringify(body)
      });
      return response.ok;
    } catch {
      return false;
    }
  };
  const flush = async () => {
    const mode = currentMode();
    const whole = Math.min(Math.floor(carry), mode === "guest" ? GUEST_REPORT_SECONDS : MAX_REPORT_SECONDS);
    if (whole < 1 || sending) return;
    carry -= whole;
    sending = true;
    const ok = await send(whole, mode);
    sending = false;
    if (!ok) carry = Math.min(RESTORE_CAP_SECONDS, carry + whole);
  };
  const every = window.setInterval(() => {
    void refreshToken().then(flush);
  }, flushEvery);
  const onHide = () => {
    if (document.visibilityState === "hidden") void flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  return {
    flush,
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(tick);
      window.clearInterval(every);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flush();
    }
  };
}
export {
  startPlaytimeTracker
};
