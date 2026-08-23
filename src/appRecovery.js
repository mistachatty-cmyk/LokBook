// Recovery from "Importing a module script failed."
//
// WHAT WENT WRONG
// ---------------
// vite.config.js registers the service worker with `registerType: 'autoUpdate'`,
// which generates a worker carrying `skipWaiting`, `clientsClaim` and
// `cleanupOutdatedCaches`. When a new deploy lands *while the app is open*:
//
//   1. the new worker installs and activates immediately (skipWaiting);
//   2. cleanupOutdatedCaches deletes the previous deploy's precache;
//   3. the page still running in the tab was loaded from the OLD index.html,
//      so its dynamic import() URLs still name the OLD chunk hashes;
//   4. those hashes are now gone from the cache AND 404 on the server, because
//      a deployment only serves its own assets.
//
// Every lazy route then dies at once — World's globe.gl import, the Studio
// canvas — with exactly `TypeError: Importing a module script failed.` The
// already-loaded shell keeps working, which is why the feed looked fine while
// two other screens were dead. Confirmed against production: a stale chunk name
// returns a real 404, every current one returns 200 application/javascript.
//
// It was also unescapable. ErrorBoundary's "Try again" only cleared React
// state, so it re-rendered, re-imported the same dead URL, and crashed again.
//
// THE FIX
// -------
// Reload once, from the new worker. Vite emits `vite:preloadError` for exactly
// this failure, so we do not have to pattern-match error strings to catch the
// common case — but we also match them, because an import inside an already
// loaded chunk (globe.gl pulling three) throws a plain TypeError with no
// preloadError event attached.
//
// Every path here is guarded by a sessionStorage stamp. A reload that does not
// fix the problem must never reload again — an app stuck in a refresh loop is
// worse than an app showing an error, because you cannot even read the error.

const RELOAD_STAMP = "lok:chunk-reload-at";
const RELOAD_COOLDOWN_MS = 30_000;

/** Does this error mean "a JS chunk failed to load"? Browsers all word it
 *  differently, and the wording is the only signal available. */
export function isChunkLoadError(err) {
  if (!err) return false;
  const msg = String(err.message || err.reason?.message || err || "");
  return (
    /Importing a module script failed/i.test(msg) ||   // Safari / iOS
    /error loading dynamically imported module/i.test(msg) || // Firefox
    /Failed to fetch dynamically imported module/i.test(msg) || // Chrome
    /ChunkLoadError/i.test(msg) ||
    /Unable to preload/i.test(msg)
  );
}

function recentlyReloaded() {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_STAMP) || 0);
    return Date.now() - at < RELOAD_COOLDOWN_MS;
  } catch {
    // No sessionStorage (private mode, blocked storage) means no way to tell
    // a first reload from a loop. Refuse to reload at all rather than risk one.
    return true;
  }
}

function stampReload() {
  try { sessionStorage.setItem(RELOAD_STAMP, String(Date.now())); } catch {}
}

/** Reload once to pick up the current build. Returns false if it declined. */
export function reloadForNewBuild(reason) {
  if (recentlyReloaded()) return false;
  stampReload();
  console.warn(`[lok] reloading to recover from a stale build (${reason})`);
  window.location.reload();
  return true;
}

/** Last resort, wired to the ErrorBoundary's escape hatch: drop the service
 *  worker and every cache, then reload. This is what someone had to do by hand
 *  (clear site data) to get the app back, so it should be a button. */
export async function resetAppShell() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map(r => r.unregister()));
  } catch {}
  try {
    const keys = await caches?.keys?.() ?? [];
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch {}
  // Deliberately bypasses the cooldown: this only runs when a human presses it.
  try { sessionStorage.removeItem(RELOAD_STAMP); } catch {}
  window.location.reload();
}

/** Install the listeners. Call once, before the app renders. */
export function installChunkRecovery() {
  if (typeof window === "undefined") return;

  // Vite's own signal for a failed dynamic import.
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault?.();
    reloadForNewBuild("vite:preloadError");
  });

  // An import that fails *inside* an already-loaded chunk surfaces as an
  // unhandled rejection with no preloadError event, so catch that shape too.
  window.addEventListener("unhandledrejection", (e) => {
    if (isChunkLoadError(e.reason)) reloadForNewBuild("unhandled chunk rejection");
  });

  // A new worker taking over mid-session is the moment the old chunks become
  // unreachable. Getting ahead of it means the user sees a reload instead of a
  // crash. Without this, the very next lazy route they open is the one that
  // dies — which is what happened: World at 11:13, Studio at 11:14.
  //
  // But ONLY when it REPLACES an existing controller. `controllerchange` also
  // fires the first time a worker claims an uncontrolled page — i.e. on every
  // brand-new visitor's first load — and reloading there is a pointless flash
  // for someone whose chunks are all perfectly valid. verify:chunkrecovery
  // caught this: the page had already reloaded once before the test did
  // anything, on a profile with no service worker at all.
  try {
    const hadController = !!navigator.serviceWorker?.controller;
    navigator.serviceWorker?.addEventListener?.("controllerchange", () => {
      if (!hadController) return;   // first claim, not a replacement
      reloadForNewBuild("service worker took over");
    });
  } catch {}
}
