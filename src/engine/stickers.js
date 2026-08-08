// Studio stickers — placement, uploads, and the shared draw/hit-test geometry.
//
// Before this file, Studio's "+sticker" button picked a random emoji from the
// equipped pack and appended it to a flat array of strings with no position —
// it never touched the canvas or a captured frame (see docs/AUDIT.md). This
// file is what makes a sticker a real, placeable, resizeable thing: one item
// shape used by the sheet UI, one geometry used by both hit-testing (while
// editing) and drawing (both the live preview and the final composite), so
// the two can never drift out of sync with each other.

// A normalized sticker item: {id, kind:"emoji"|"image", value}
//   emoji -> value is the glyph itself
//   image -> value is an id stored in the local sticker IndexedDB (below)
export function normalizePack(packOrArray) {
  const stickers = Array.isArray(packOrArray) ? packOrArray : packOrArray?.stickers || [];
  return stickers.map(value => ({ id: value, kind: "emoji", value }));
}

// ---------------------------------------------------------------------------
// Local sticker storage — user-uploaded images. Device-local only, by design:
// docs/AUDIT.md flags an open, unresolved moderation gap (C3) on the existing
// Rooms community stamp library. Sharing uploaded stickers publicly would
// extend that same exposure; personal, local-only uploads give the user real
// custom stickers without it. A shared library is a natural follow-on once C3
// has an actual moderation answer (see the roadmap entry).
// ---------------------------------------------------------------------------
const DB = "lok:stickers";
const STORE = "stickers";
let dbp = null;

function openDb() {
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
  const db = await openDb();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  });
}

export const newStickerId = () => `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export async function putSticker(id, blob) { try { await tx("readwrite", s => s.put(blob, id)); return true; } catch { return false; } }
export async function getSticker(id) { try { return await tx("readonly", s => s.get(id)); } catch { return null; } }
export async function deleteSticker(id) { try { await tx("readwrite", s => s.delete(id)); return true; } catch { return false; } }
export async function listStickerIds() { try { return await tx("readonly", s => s.getAllKeys()); } catch { return []; } }

export const IMAGE_TYPES = /^image\/(png|jpe?g|webp)$/;

// A resize step distinct from engine/draw.jsx's compressFrame: compressFrame
// fills the whole page canvas with an opaque paper background first, which is
// correct for a full page and wrong for a sticker — it would erase the alpha
// channel and paste a paper-colored box behind every uploaded image.
export function resizeStickerImage(dataUrl, maxDim = 256) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        res(c.toDataURL("image/webp", 0.85));
      } catch { res(dataUrl); }
    };
    img.onerror = () => res(dataUrl);
    img.src = dataUrl;
  });
}

// ---------------------------------------------------------------------------
// Placement geometry — one source of truth shared by hit-testing (while
// editing, in Easel.jsx) and drawing (both the live preview overlay and the
// final bake into composite()), so a sticker is always clicked exactly where
// it visibly is.
// ---------------------------------------------------------------------------
export const STICKER_BASE = 90; // canvas units at scale = 1

export function stickerBounds(s) {
  const size = STICKER_BASE * (s.scale || 1);
  return { left: s.x - size / 2, top: s.y - size / 2, right: s.x + size / 2, bottom: s.y + size / 2, size };
}

// Topmost (most recently placed) first, so overlapping stickers pick the one
// visually on top — same convention as z-order everywhere else in the app.
export function hitSticker(stickers, [px, py], handleRadius = 14) {
  for (let i = stickers.length - 1; i >= 0; i--) {
    const s = stickers[i], b = stickerBounds(s);
    if (Math.hypot(px - b.right, py - b.bottom) <= handleRadius) return { sticker: s, handle: "resize" };
    if (px >= b.left && px <= b.right && py >= b.top && py <= b.bottom) return { sticker: s, handle: "move" };
  }
  return null;
}

// `imageCache` maps an image sticker's stored id -> a loaded HTMLImageElement.
// Missing/not-yet-loaded images are skipped rather than thrown on, since
// composite() must stay synchronous (see Easel.jsx) — a placed image sticker
// is loaded into the cache the moment it's placed, well before a capture.
export function drawStickerItem(ctx, s, { selected = false, accent = "#FF5DA2", imageCache } = {}) {
  const b = stickerBounds(s);
  ctx.save();
  if (s.item.kind === "emoji") {
    ctx.font = `${b.size * 0.82}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.item.value, s.x, s.y);
  } else if (s.item.kind === "image") {
    const img = imageCache?.get(s.item.value);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, b.left, b.top, b.size, b.size);
  }
  if (selected) {
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.strokeRect(b.left, b.top, b.size, b.size); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(b.right, b.bottom, 7, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
  }
  ctx.restore();
}
