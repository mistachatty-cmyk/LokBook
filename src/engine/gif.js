/* Minimal GIF encoder — takes canvas sources, returns Blob.
   Supports: 256-color global palette, per-frame 10ms–10s delay,
   loop count, transparency. No dithering. */
export function encodeGIF(frames, { delay = 100, loop = 0 } = {}) {
  const W = frames[0]?.width || 480, H = frames[0]?.height || 600;
  const palette = buildPalette(frames);
  const idxs = frames.map(f => indexFrame(f, palette));
  const LZW_MIN = 2, LZW_MAX = 12;
  const stream = [];

  function writeByte(b) { stream.push(b & 0xFF); }
  function writeShort(n) { stream.push(n & 0xFF, (n >> 8) & 0xFF); }

  writeByte(0x47); writeByte(0x49); writeByte(0x46); writeByte(0x38); writeByte(0x39); writeByte(0x61);
  writeShort(W); writeShort(H);
  let gctSize = Math.ceil(Math.log2(palette.length / 3)) - 1;
  if (gctSize < 0) { gctSize = 0; }
  const actualGCT = 1 << (gctSize + 1);
  writeByte(0xF0 | gctSize); // 8-bit color resolution + GCT present + size
  writeByte(0); writeByte(0); // bg, aspect

  for (let i = 0; i < actualGCT * 3; i++) {
    stream.push(i < palette.length ? palette[i] : 0);
  }

  writeByte(0x21); writeByte(0xFF); writeByte(0x0B);
  writeString("NETSCAPE2.0");
  writeByte(0x03); writeByte(0x01); writeShort(loop); writeByte(0x00);

  for (let fi = 0; fi < idxs.length; fi++) {
    writeByte(0x21); writeByte(0xF9); writeByte(0x04);
    writeByte(0x00); // disposal
    writeShort(fi < frames.length ? (frames[fi].userDelay || delay) * 10 : delay * 10);
    writeByte(0x00); writeByte(0x00);

    writeByte(0x2C);
    writeShort(0); writeShort(0); writeShort(W); writeShort(H);
    writeByte(0x00);

    const data = idxs[fi];
    let codeSize = LZW_MIN;
    if (data.length > 256) codeSize = 8;
    writeByte(codeSize);

    const buf = lzwEncode(data, 1 << codeSize, LZW_MAX);
    for (let i = 0; i < buf.length; i += 255) {
      writeByte(Math.min(255, buf.length - i));
      for (let j = 0; j < 255 && i + j < buf.length; j++) writeByte(buf[i + j]);
    }
    writeByte(0x00);
  }

  writeByte(0x3B);

  function writeString(s) { for (let i = 0; i < s.length; i++) writeByte(s.charCodeAt(i)); }

  return new Blob([new Uint8Array(stream)], { type: "image/gif" });
}

function buildPalette(frames) {
  const freq = {};
  frames.forEach(c => {
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const k = quantize(d[i], d[i + 1], d[i + 2]);
      freq[k] = (freq[k] || 0) + 1;
    }
  });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const max = 256;
  const pal = [0, 0, 0]; // index 0 = black
  let count = 1;
  for (const [k] of sorted) {
    if (count >= max) break;
    const [r, g, b] = k.split(",").map(Number);
    pal.push(r, g, b);
    count++;
  }
  while (pal.length < max * 3) pal.push(0xFF, 0xFF, 0xFF);
  pal[0] = 0xFF; pal[1] = 0xFF; pal[2] = 0xFF; // bg = white
  return pal;
}

function quantize(r, g, b) {
  const bits = 5;
  const mask = 0xFF >> (8 - bits);
  return `${r & mask},${g & mask},${b & mask}`;
}

function indexFrame(c, palette) {
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const data = new Uint8Array(c.width * c.height);
  for (let i = 0; i < data.length; i++) {
    const pi = i * 4;
    if (d[pi + 3] < 128) { data[i] = 0; continue; }
    let best = 0, bestDist = Infinity;
    for (let j = 0; j < palette.length; j += 3) {
      const dr = d[pi] - palette[j], dg = d[pi + 1] - palette[j + 1], db = d[pi + 2] - palette[j + 2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) { bestDist = dist; best = j / 3; }
    }
    data[i] = best;
  }
  return data;
}

function lzwEncode(data, initCodeSize, maxBits) {
  const clearCode = 1 << (initCodeSize - 1);
  const eoiCode = clearCode + 1;
  let nextCode = eoiCode + 1;
  const dict = {};
  const out = [];
  let bits = 0, bitBuf = 0;

  function writeCode(code, nbits) {
    bitBuf |= code << bits;
    bits += nbits;
    while (bits >= 8) {
      out.push(bitBuf & 0xFF);
      bitBuf >>= 8;
      bits -= 8;
    }
  }

  writeCode(clearCode, initCodeSize);
  let s = [data[0]];
  let cs = initCodeSize;
  for (let i = 1; i < data.length; i++) {
    const k = data[i];
    const sk = [...s, k];
    const key = sk.join(",");
    if (dict[key] !== undefined) {
      s = sk;
    } else {
      const skey = s.join(",");
      if (dict[skey] !== undefined) {
        writeCode(dict[skey], cs);
      } else {
        writeCode(s[0] < clearCode ? s[0] : 0, cs);
      }
      if (nextCode < (1 << maxBits)) {
        dict[key] = nextCode++;
        if (nextCode > (1 << cs) - 1 && cs < maxBits) cs++;
      }
      s = [k];
    }
  }
  if (s.length) {
    const skey = s.join(",");
    if (dict[skey] !== undefined) writeCode(dict[skey], cs);
    else writeCode(s[0], cs);
  }
  writeCode(eoiCode, cs);
  if (bits > 0) out.push(bitBuf & 0xFF);
  return out;
}
