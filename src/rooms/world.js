// Lok Rooms world engine — infinite canvas math, vector stroke encoding,
// and a chunk index for viewport culling. World units are abstract; the
// camera maps them to screen pixels (z = pixels per world unit).

export const CHUNK = 1024;

export const chunkKey = (x, y) => `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`;

export function chunksForBB([minx, miny, maxx, maxy]) {
  const keys = [];
  for (let cy = Math.floor(miny / CHUNK); cy <= Math.floor(maxy / CHUNK); cy++)
    for (let cx = Math.floor(minx / CHUNK); cx <= Math.floor(maxx / CHUNK); cx++)
      keys.push(`${cx},${cy}`);
  return keys;
}

export const makeCamera = () => ({ x: -200, y: -260, z: 1 }); // world coords of screen origin + zoom

export const screenToWorld = (cam, sx, sy) => [cam.x + sx / cam.z, cam.y + sy / cam.z];
export const worldToScreen = (cam, wx, wy) => [(wx - cam.x) * cam.z, (wy - cam.y) * cam.z];

// Quantize to 0.5 world units and delta-encode after the first pair.
export function encodePoints(points) {
  const q = v => Math.round(v * 2) / 2;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  const pts = [];
  let px = 0, py = 0;
  points.forEach(([x, y], i) => {
    const qx = q(x), qy = q(y);
    minx = Math.min(minx, qx); miny = Math.min(miny, qy);
    maxx = Math.max(maxx, qx); maxy = Math.max(maxy, qy);
    if (i === 0) { pts.push(qx, qy); } else { pts.push(q(qx - px), q(qy - py)); }
    px = qx; py = qy;
  });
  return { pts, bb: [minx, miny, maxx, maxy] };
}

export function decodePoints(pts) {
  const out = [];
  let x = 0, y = 0;
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) { x = pts[0]; y = pts[1]; } else { x += pts[i]; y += pts[i + 1]; }
    out.push([x, y]);
  }
  return out;
}

// Spatial index: element id -> element, plus chunk -> Set of ids.
export class ChunkIndex {
  constructor() { this.byId = new Map(); this.chunks = new Map(); }
  add(el) { // el: {id, bb, ...}
    if (this.byId.has(el.id)) this.remove(el.id);
    this.byId.set(el.id, el);
    chunksForBB(el.bb).forEach(k => {
      if (!this.chunks.has(k)) this.chunks.set(k, new Set());
      this.chunks.get(k).add(el.id);
    });
  }
  remove(id) {
    const el = this.byId.get(id);
    if (!el) return;
    chunksForBB(el.bb).forEach(k => this.chunks.get(k)?.delete(id));
    this.byId.delete(id);
  }
  // Elements intersecting the viewport, in insertion order (stable draw order).
  queryViewport(cam, w, h) {
    const [x0, y0] = screenToWorld(cam, 0, 0);
    const [x1, y1] = screenToWorld(cam, w, h);
    const ids = new Set();
    chunksForBB([x0, y0, x1, y1]).forEach(k => this.chunks.get(k)?.forEach(id => ids.add(id)));
    return [...this.byId.values()].filter(el => ids.has(el.id));
  }
  get size() { return this.byId.size; }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
export function newRoomCode() {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  const s = [...a].map(b => CODE_ALPHABET[b % 32]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export const normalizeCode = c => (c || "").toUpperCase().replace(/[^A-Z2-9]/g, "").replace(/^(.{4})(.{4})$/, "$1-$2");

let strokeCounter = 0;
export const newStrokeId = userId => `${userId.slice(0, 12)}:${Date.now().toString(36)}:${(strokeCounter++).toString(36)}:${Math.floor(Math.random() * 1296).toString(36)}`;
