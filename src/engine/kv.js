// A general key/value tier backed by IndexedDB.
//
// WHY
// ---
// `store` in App.jsx wrote everything to localStorage, which browsers cap at
// roughly 5 MB. Posts carry their frames inline as base64 PNGs, so a gallery
// reaches that ceiling after a modest number of flips. Past it,
// `localStorage.setItem` throws QuotaExceededError, `store.set` returns false,
// and the app said "Gallery too big" — a message that reads like a warning but
// actually means **the write failed and the drawings only exist in memory**.
// They were gone on the next reload.
//
// IndexedDB has no comparable cap (hundreds of MB, quota-managed rather than
// fixed), so it becomes the primary tier and localStorage stays as the fallback
// for browsers or modes where IndexedDB is unavailable.
//
// The open/tx shape deliberately mirrors engine/stores/localStore.js and
// engine/stickers.js — that file's header asks for one storage idiom in this
// codebase rather than several, and this is that idiom.
//
// MIGRATION IS READ-THROUGH, NOT A BATCH JOB. Existing installs have their save
// and gallery in localStorage. `get` falls back to it and copies the value
// forward on the way past, so nobody has to run anything and a half-finished
// migration cannot lose data: the localStorage copy is left exactly where it
// was until it is overwritten naturally.

const DB = "lok:kv";
const STORE = "kv";

let dbp = null;
function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("no indexedDB"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  // A rejected promise must not be cached forever: a transient failure would
  // permanently downgrade the tab to localStorage.
  dbp.catch(() => { dbp = null; });
  return dbp;
}

function tx(mode, fn) {
  return openDb().then(db => new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error("aborted"));
  }));
}

/** True when IndexedDB is actually usable here (private modes can disable it). */
export async function kvAvailable() {
  try { await openDb(); return true; } catch { return false; }
}

/** Read a value. Returns undefined when absent OR when IndexedDB is unusable —
 *  callers must treat those the same and fall back. */
export async function kvGet(key) {
  try { return await tx("readonly", s => s.get(key)); }
  catch { return undefined; }
}

/** Write a value. Returns false rather than throwing, so the caller can fall
 *  back to localStorage on quota or unavailability. */
export async function kvSet(key, value) {
  try { await tx("readwrite", s => s.put(value, key)); return true; }
  catch { return false; }
}

export async function kvDel(key) {
  try { await tx("readwrite", s => s.delete(key)); return true; }
  catch { return false; }
}
