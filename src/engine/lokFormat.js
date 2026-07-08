// LokFlip (.lok) — see docs/LOK_FORMAT.md for the full spec.
// encodeLok(frames, meta) -> Blob      frames: HTMLCanvasElement[] | ImageData[]
// decodeLok(blob)         -> Promise<{ meta, frames: string[] /* data URLs */ }>

// ---------- CRC32 (standard IEEE 802.3 polynomial table) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---------- minimal ZIP writer/reader (STORE method only) ----------
function zipWrite(entries) {
  // entries: [{ name, data: Uint8Array }]
  const chunks = [];
  const central = [];
  let offset = 0;
  const enc = new TextEncoder();
  const dosTime = 0, dosDate = 0x21; // fixed placeholder date, not semantically load-bearing

  for (const { name, data } of entries) {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);       // version needed
    dv.setUint16(6, 0, true);        // flags
    dv.setUint16(8, 0, true);        // method = STORE
    dv.setUint16(10, dosTime, true);
    dv.setUint16(12, dosDate, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true); // compressed size
    dv.setUint32(22, data.length, true); // uncompressed size
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);       // extra length
    local.set(nameBytes, 30);

    chunks.push(local, data);

    const centralEntry = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(centralEntry.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, dosTime, true);
    cdv.setUint16(14, dosDate, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    centralEntry.set(nameBytes, 46);
    central.push(centralEntry);

    offset += local.length + data.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) { chunks.push(c); centralSize += c.length; }

  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, centralStart, true);
  edv.setUint16(20, 0, true);
  chunks.push(eocd);

  return new Blob(chunks, { type: "application/zip" });
}

async function zipRead(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(buf.buffer);
  const out = {};
  let i = 0;
  while (i < buf.length - 4) {
    if (dv.getUint32(i, true) !== 0x04034b50) { i++; continue; }
    const method = dv.getUint16(i + 8, true);
    const compSize = dv.getUint32(i + 18, true);
    const nameLen = dv.getUint16(i + 26, true);
    const extraLen = dv.getUint16(i + 28, true);
    const nameStart = i + 30;
    const name = new TextDecoder().decode(buf.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    if (method !== 0) throw new Error(`.lok: unsupported zip method ${method} for ${name}`);
    out[name] = buf.subarray(dataStart, dataStart + compSize);
    i = dataStart + compSize;
  }
  return out;
}

// ---------- deflate helpers (native browser/runtime CompressionStream) ----------
async function deflate(bytes) {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(bytes); writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}
async function inflate(bytes) {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(bytes); writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

// ---------- palette + indexing (shared logic with engine/gif.js's approach) ----------
function getImageData(src) {
  if (src instanceof ImageData) return src;
  const ctx = src.getContext("2d");
  return ctx.getImageData(0, 0, src.width, src.height);
}

// Bucket colors to BITS significant bits/channel before counting — this collapses
// anti-aliasing noise into the same bucket as the solid ink color it's blending toward,
// which both shrinks the palette (better compression) and lets indexing be an O(1)
// hashmap lookup instead of an O(paletteSize) nearest-color scan per pixel.
const BUCKET_BITS = 5;
const bucketKey = (r, g, b) => {
  const mask = 0xFF & ~((1 << (8 - BUCKET_BITS)) - 1);
  return ((r & mask) << 16) | ((g & mask) << 8) | (b & mask);
};

function buildPalette(frames, max = 256) {
  const freq = new Map();
  for (const f of frames) {
    const d = getImageData(f).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const key = bucketKey(d[i], d[i + 1], d[i + 2]);
      const entry = freq.get(key);
      if (entry) entry.count++; else freq.set(key, { count: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
    }
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, max - 1);
  const palette = [[255, 255, 255]];
  const keyToIndex = new Map([[bucketKey(255, 255, 255), 0]]);
  for (const [key, { r, g, b }] of sorted) {
    keyToIndex.set(key, palette.length);
    palette.push([r, g, b]);
  }
  return { palette, keyToIndex };
}

function nearestIndex(r, g, b, palette) {
  let best = 0, bestDist = Infinity;
  for (let j = 0; j < palette.length; j++) {
    const [pr, pg, pb] = palette[j];
    const dr = r - pr, dg = g - pg, db = b - pb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) { bestDist = dist; best = j; }
  }
  return best;
}

function indexFrame(src, palette, keyToIndex) {
  const d = getImageData(src).data;
  const n = d.length / 4;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (d[p + 3] < 8) { out[i] = 0; continue; }
    const key = bucketKey(d[p], d[p + 1], d[p + 2]);
    const hit = keyToIndex.get(key);
    out[i] = hit !== undefined ? hit : nearestIndex(d[p], d[p + 1], d[p + 2], palette); // rare fallback: >255 distinct buckets
  }
  return out;
}

// ---------- bit packing (arbitrary bits-per-pixel) ----------
function bitsFor(paletteLen) {
  const raw = Math.max(1, Math.ceil(Math.log2(Math.max(2, paletteLen))));
  return raw <= 1 ? 1 : raw <= 2 ? 2 : raw <= 4 ? 4 : 8;
}
class BitWriter {
  constructor() { this.bytes = []; this.cur = 0; this.n = 0; }
  write(val, bits) {
    this.cur |= (val & ((1 << bits) - 1)) << this.n;
    this.n += bits;
    while (this.n >= 8) { this.bytes.push(this.cur & 0xFF); this.cur >>= 8; this.n -= 8; }
  }
  writeVarint(v) { while (v > 0x7F) { this.write((v & 0x7F) | 0x80, 8); v >>>= 7; } this.write(v & 0x7F, 8); }
  finish() { if (this.n > 0) { this.bytes.push(this.cur & 0xFF); this.n = 0; } return new Uint8Array(this.bytes); }
}
class BitReader {
  constructor(bytes) { this.bytes = bytes; this.pos = 0; this.cur = 0; this.n = 0; }
  read(bits) {
    while (this.n < bits) { this.cur |= this.bytes[this.pos++] << this.n; this.n += 8; }
    const v = this.cur & ((1 << bits) - 1);
    this.cur >>= bits; this.n -= bits;
    return v;
  }
  readVarint() {
    let v = 0, shift = 0, b;
    do { b = this.read(8); v |= (b & 0x7F) << shift; shift += 7; } while (b & 0x80);
    return v >>> 0;
  }
}

// ---------- frame codec: frame0 full, frames 1..n delta+RLE ----------
function encodeFrames(indexed, bpp) {
  const w = new BitWriter();
  const n = indexed[0].length;
  for (let i = 0; i < n; i++) w.write(indexed[0][i], bpp);
  for (let f = 1; f < indexed.length; f++) {
    const prev = indexed[f - 1], cur = indexed[f];
    let i = 0;
    while (i < n) {
      let runStart = i;
      while (i < n && cur[i] === prev[i]) i++;
      w.writeVarint(i - runStart); // unchanged run length
      if (i >= n) break;
      let litStart = i;
      while (i < n && cur[i] !== prev[i]) i++;
      w.writeVarint(i - litStart);
      for (let j = litStart; j < i; j++) w.write(cur[j], bpp);
    }
  }
  return w.finish();
}
function decodeFrames(bytes, bpp, pixelCount, frameCount) {
  const r = new BitReader(bytes);
  const frames = [new Uint8Array(pixelCount)];
  for (let i = 0; i < pixelCount; i++) frames[0][i] = r.read(bpp);
  for (let f = 1; f < frameCount; f++) {
    const prev = frames[f - 1], cur = new Uint8Array(pixelCount);
    let i = 0;
    while (i < pixelCount) {
      const unchanged = r.readVarint();
      for (let k = 0; k < unchanged; k++) cur[i + k] = prev[i + k];
      i += unchanged;
      if (i >= pixelCount) break;
      const lit = r.readVarint();
      for (let k = 0; k < lit; k++) cur[i + k] = r.read(bpp);
      i += lit;
    }
    frames.push(cur);
  }
  return frames;
}

// ---------- public API ----------
export async function encodeLok(frames, meta = {}) {
  if (!frames.length) throw new Error("encodeLok: no frames");
  const w = frames[0].width, h = frames[0].height;
  const { palette, keyToIndex } = buildPalette(frames);
  const bpp = bitsFor(palette.length);
  const indexed = frames.map(f => indexFrame(f, palette, keyToIndex));
  const payload = encodeFrames(indexed, bpp);
  const compressed = await deflate(payload);

  const manifest = {
    format: "LokFlip", version: 1, generator: "LokBook",
    width: w, height: h, frameCount: frames.length,
    paceMs: meta.paceMs || frames.map(() => meta.defaultPaceMs || 140),
    loop: meta.loop !== false,
    palette, bitsPerPixel: bpp,
    title: meta.title || "", createdAt: new Date().toISOString(),
  };

  // preview.png: frame 0, full quality, standalone — the universal-compatibility fallback
  const previewCanvas = frames[0] instanceof ImageData ? imageDataToCanvas(frames[0]) : frames[0];
  const previewBlob = await new Promise(res => previewCanvas.toBlob(res, "image/png"));
  const previewBytes = new Uint8Array(await previewBlob.arrayBuffer());

  const enc = new TextEncoder();
  return zipWrite([
    { name: "manifest.json", data: enc.encode(JSON.stringify(manifest)) },
    { name: "preview.png", data: previewBytes },
    { name: "data.lokflip", data: compressed },
  ]);
}

export async function decodeLok(blob) {
  const files = await zipRead(blob);
  if (!files["manifest.json"]) throw new Error(".lok: missing manifest.json — not a valid LokFlip file");
  const meta = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  if (meta.format !== "LokFlip") throw new Error(".lok: unrecognized format " + meta.format);
  if (meta.version !== 1) throw new Error(".lok: unsupported version " + meta.version + " (this reader implements v1)");

  const payload = await inflate(files["data.lokflip"]);
  const pixelCount = meta.width * meta.height;
  const indexedFrames = decodeFrames(payload, meta.bitsPerPixel, pixelCount, meta.frameCount);

  const canvas = document.createElement("canvas");
  canvas.width = meta.width; canvas.height = meta.height;
  const ctx = canvas.getContext("2d");
  const frames = indexedFrames.map(idx => {
    const imgData = ctx.createImageData(meta.width, meta.height);
    for (let i = 0; i < idx.length; i++) {
      const [r, g, b] = meta.palette[idx[i]];
      const p = i * 4;
      imgData.data[p] = r; imgData.data[p + 1] = g; imgData.data[p + 2] = b; imgData.data[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  });

  return { meta, frames };
}

function imageDataToCanvas(imgData) {
  const c = document.createElement("canvas");
  c.width = imgData.width; c.height = imgData.height;
  c.getContext("2d").putImageData(imgData, 0, 0);
  return c;
}
