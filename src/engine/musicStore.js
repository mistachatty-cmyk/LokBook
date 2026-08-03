// Offline audio store. Files the user "plugs in" are kept as Blobs in
// IndexedDB so an album still plays with no network — localStorage can't
// hold audio, and object URLs don't survive a reload on their own.
const DB = "lok:music";
const STORE = "tracks";
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("no indexedDB"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  });
}

export async function putTrack(id, blob) {
  try { await tx("readwrite", s => s.put(blob, id)); return true; } catch { return false; }
}
export async function getTrack(id) {
  try { return await tx("readonly", s => s.get(id)); } catch { return null; }
}
export async function deleteTrack(id) {
  try { await tx("readwrite", s => s.delete(id)); return true; } catch { return false; }
}
export async function storedIds() {
  try { return (await tx("readonly", s => s.getAllKeys())) || []; } catch { return []; }
}

/** Audio/video types a browser <audio> element can realistically decode. */
export const ACCEPTED = ".mp3,.m4a,.mp4,.aac,.ogg,.oga,.wav,.flac,.webm,audio/*,video/mp4";

export function kindOfUrl(u = "") {
  const s = u.toLowerCase();
  if (/youtu\.be|youtube\.com/.test(s)) return "youtube";
  if (/spotify\.com/.test(s)) return "spotify";
  if (/soundcloud\.com/.test(s)) return "soundcloud";
  if (/bandcamp\.com/.test(s)) return "bandcamp";
  return "file";
}

/** Best-effort display name from a URL. */
export function titleFromUrl(u = "") {
  try {
    const p = new URL(u).pathname.split("/").filter(Boolean).pop() || u;
    return decodeURIComponent(p).replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ").slice(0, 60) || "track";
  } catch {
    return u.slice(0, 60) || "track";
  }
}
