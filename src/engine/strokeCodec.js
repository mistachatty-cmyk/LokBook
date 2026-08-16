// Vector stroke codec for LokBook Studio — the `.lokvec` payload.
//
// Studio has always rasterised strokes straight to WebP and thrown the point
// data away. This keeps it: a compact binary record of what was actually drawn,
// stored *alongside* the raster frames rather than replacing them, so nothing
// about display, publishing or the feed changes.
//
// Wire format (little-endian throughout):
//
//   magic        4 bytes   "LKV1"
//   width        u16       canvas width the coords were quantised against
//   height       u16       canvas height
//   toolCount    varint    number of distinct tool names
//   tools[]                per tool: varint byteLength + UTF-8 name
//   strokeCount  varint
//   strokes[]              per stroke:
//     toolIndex  varint    index into the tool table
//     r,g,b      3x u8     stroke colour
//     size       u16       brush size, 12.4 fixed point (size * 16)
//     pointCount varint
//     points[]             per point: zigzag-varint dx, zigzag-varint dy, u8 pressure
//
// Compression comes from three stacked transforms, in this order:
//   1. Quantise x/y onto a 16-bit grid across the canvas. Sub-1/65535-of-a-
//      canvas precision is meaningless for hand-drawn input, so 32-bit floats
//      are pure waste.
//   2. Delta-encode against the previous point. Consecutive samples of a real
//      stroke are a few units apart, so deltas are tiny even when absolute
//      coordinates are large.
//   3. ZigZag the signed deltas into unsigned (0,-1,1,-2 -> 0,1,2,3) and pack
//      as varints, so a typical 1-3 unit delta costs one byte instead of four.
//
// Deliberately no MessagePack/FlatBuffers dependency: this is a flat numeric
// structure, the output is already a compact ArrayBuffer, and a serialisation
// library would add weight without shrinking anything meaningful.

// Byte sequence 'L','K','V','1' in little-endian order. Was 0x314b564c,
// which serialises to "LVK1" — the constant and the documented spec
// disagreed, so anything written against the spec would have been rejected.
const MAGIC = 0x31564b4c;

// ---- varint / zigzag ------------------------------------------------------

/** ZigZag: map signed -> unsigned so small negatives stay small. */
export const zigzag = n => (n << 1) ^ (n >> 31);
export const unzigzag = n => (n >>> 1) ^ -(n & 1);

class ByteWriter {
  constructor(initial = 1024) { this.buf = new Uint8Array(initial); this.len = 0; }
  _fit(extra) {
    if (this.len + extra <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < this.len + extra) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  u8(v) { this._fit(1); this.buf[this.len++] = v & 0xff; }
  u16(v) { this._fit(2); this.buf[this.len++] = v & 0xff; this.buf[this.len++] = (v >> 8) & 0xff; }
  u32(v) { this._fit(4); for (let i = 0; i < 4; i++) this.buf[this.len++] = (v >>> (i * 8)) & 0xff; }
  varint(v) {
    this._fit(5);
    let x = v >>> 0;
    while (x >= 0x80) { this.buf[this.len++] = (x & 0x7f) | 0x80; x >>>= 7; }
    this.buf[this.len++] = x;
  }
  bytes(arr) { this._fit(arr.length); this.buf.set(arr, this.len); this.len += arr.length; }
  done() { return this.buf.slice(0, this.len); }
}

class ByteReader {
  constructor(bytes) { this.b = bytes; this.i = 0; }
  // Every read is bounds-checked. Without this a truncated payload decoded
  // "successfully" into silently wrong geometry — a clipped final byte yielded
  // NaN pressure, and a cut stroke header yielded size 0.
  _need(n) { if (this.i + n > this.b.length) throw new Error("lokvec: truncated payload"); }
  u8() { this._need(1); return this.b[this.i++]; }
  u16() { this._need(2); const v = this.b[this.i] | (this.b[this.i + 1] << 8); this.i += 2; return v; }
  u32() { this._need(4); let v = 0; for (let k = 0; k < 4; k++) v |= this.b[this.i + k] << (k * 8); this.i += 4; return v >>> 0; }
  varint() {
    let shift = 0, out = 0, byte;
    do {
      if (this.i >= this.b.length) throw new Error("lokvec: truncated varint");
      byte = this.b[this.i++];
      out |= (byte & 0x7f) << shift;
      shift += 7;
      if (shift > 35) throw new Error("lokvec: varint overflow (corrupt payload)");
    } while (byte & 0x80);
    return out >>> 0;
  }
  bytes(n) { this._need(n); const s = this.b.subarray(this.i, this.i + n); this.i += n; return s; }
}

// ---- colour helpers -------------------------------------------------------

/** Accepts "#rgb", "#rrggbb" or "rgb(r,g,b)" — the shapes Easel actually uses. */
export function parseColor(c) {
  if (typeof c !== "string") return [0, 0, 0];
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  const h = c.replace("#", "");
  if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  if (h.length >= 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return [0, 0, 0];
}
const toHex = (r, g, b) => "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");

// ---- quantisation ---------------------------------------------------------

const Q_MAX = 65535;
// The grid spans 25% beyond the canvas on every side. Pointer capture keeps
// delivering events after the pointer leaves the canvas, so strokes routinely
// carry out-of-bounds coordinates; quantising over exactly 0..extent clamped
// them and a stroke sweeping off-canvas decoded as a flat run along the edge.
// Costs 1.5x precision (0.011px on a 480px axis), which is still far below
// anything a hand can express.
const Q_MARGIN = 0.25;
const qRange = extent => extent * (1 + 2 * Q_MARGIN);
const qOrigin = extent => -extent * Q_MARGIN;

export const quantize = (v, extent) =>
  Math.max(0, Math.min(Q_MAX, Math.round(((v - qOrigin(extent)) / qRange(extent)) * Q_MAX)));
export const dequantize = (q, extent) => qOrigin(extent) + (q / Q_MAX) * qRange(extent);

/** Worst-case positional error introduced by quantisation, in canvas px. */
export const quantStep = extent => qRange(extent) / Q_MAX;

// ---- encode / decode ------------------------------------------------------

/**
 * @param strokes [{tool, color, size, points:[{x,y,pressure?}]}]
 * @param opts    {width, height} canvas extents the coords live in
 */
export function encodeStrokes(strokes, { width, height }) {
  const w = new ByteWriter();
  w.u32(MAGIC);
  w.u16(width);
  w.u16(height);

  const tools = [...new Set(strokes.map(s => s.tool || "pen"))];
  const toolIndex = new Map(tools.map((t, i) => [t, i]));
  const enc = new TextEncoder();
  w.varint(tools.length);
  for (const t of tools) { const b = enc.encode(t); w.varint(b.length); w.bytes(b); }

  w.varint(strokes.length);
  for (const s of strokes) {
    w.varint(toolIndex.get(s.tool || "pen"));
    const [r, g, b] = parseColor(s.color);
    w.u8(r); w.u8(g); w.u8(b);
    w.u16(Math.max(0, Math.min(65535, Math.round((s.size || 1) * 16))));

    const pts = s.points || [];
    w.varint(pts.length);
    let px = 0, py = 0;
    for (const p of pts) {
      const qx = quantize(p.x, width), qy = quantize(p.y, height);
      w.varint(zigzag(qx - px));
      w.varint(zigzag(qy - py));
      w.u8(Math.max(0, Math.min(255, Math.round((p.pressure ?? 0.5) * 255))));
      px = qx; py = qy;
    }
  }
  return w.done();
}

export function decodeStrokes(bytes) {
  const r = new ByteReader(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  if (r.u32() !== MAGIC) throw new Error("lokvec: bad magic — not a stroke payload");
  const width = r.u16(), height = r.u16();

  const dec = new TextDecoder();
  const toolCount = r.varint();
  const tools = [];
  for (let i = 0; i < toolCount; i++) tools.push(dec.decode(r.bytes(r.varint())));

  const strokeCount = r.varint();
  const strokes = [];
  for (let i = 0; i < strokeCount; i++) {
    const tool = tools[r.varint()] ?? "pen";
    const cr = r.u8(), cg = r.u8(), cb = r.u8();
    const size = r.u16() / 16;
    const n = r.varint();
    const points = new Array(n);
    let px = 0, py = 0;
    for (let k = 0; k < n; k++) {
      px += unzigzag(r.varint());
      py += unzigzag(r.varint());
      points[k] = { x: dequantize(px, width), y: dequantize(py, height), pressure: r.u8() / 255 };
    }
    strokes.push({ tool, color: toHex(cr, cg, cb), size, points });
  }
  return { width, height, strokes };
}
