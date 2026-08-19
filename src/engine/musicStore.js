// Offline audio store. Files the user "plugs in" are kept as Blobs in
// IndexedDB so an album still plays with no network — localStorage can't
// hold audio, and object URLs don't survive a reload on their own.
const DB = "lok:music";
const STORE = "tracks";
const COVERS = "covers";
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("no indexedDB"));
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
      if (!r.result.objectStoreNames.contains(COVERS)) r.result.createObjectStore(COVERS);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  });
}

export async function putTrack(id, blob) {
  try { await tx(STORE, "readwrite", s => s.put(blob, id)); return true; } catch { return false; }
}
export async function getTrack(id) {
  try { return await tx(STORE, "readonly", s => s.get(id)); } catch { return null; }
}
export async function deleteTrack(id) {
  try { await tx(STORE, "readwrite", s => s.delete(id)); return true; } catch { return false; }
}
export async function storedIds() {
  try { return (await tx(STORE, "readonly", s => s.getAllKeys())) || []; } catch { return []; }
}

/** Album/cover art, keyed by the same track id as its audio blob. */
export async function putCover(id, blob) {
  try { await tx(COVERS, "readwrite", s => s.put(blob, id)); return true; } catch { return false; }
}
export async function getCover(id) {
  try { return await tx(COVERS, "readonly", s => s.get(id)); } catch { return null; }
}
export async function deleteCover(id) {
  try { await tx(COVERS, "readwrite", s => s.delete(id)); return true; } catch { return false; }
}

/** Audio/video types a browser <audio> element can realistically decode.
 * .caf is included for Voice Memos recordings saved to Files on older iOS
 * versions — modern Voice Memos exports as .m4a, which was already covered,
 * but .caf shows up from a "Save to Files" share on some devices/OS versions. */
export const ACCEPTED = ".mp3,.m4a,.mp4,.aac,.ogg,.oga,.wav,.flac,.webm,.caf,audio/*,video/mp4";
/** Cover-art image types recognised inside a folder/multi-file import. */
export const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)$/;

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
