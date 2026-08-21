// The Studio brush engine, extracted from Easel.jsx so anything that isn't
// the Easel component — bot art generators, future tools — can paint with
// the exact same taper, texture and pressure response Studio itself uses,
// instead of a hand-rolled ctx.lineTo/ctx.arc approximation.
//
// Every export here is a pure stamp function: (ctx, x, y, params) => void.
// No closures over component state — everything the original inline
// closures in Easel.jsx read from React state or refs (color, size, the
// live pointer sample, the legacy-engine toggle, Brush Lab's custom
// params) is now an explicit field on `params`. This was a behavior-
// preserving extraction: Easel.jsx now calls these same functions with its
// own state plugged in, and verify:easel is the proof no pixel changed.
//
// `params` shape used across these functions:
//   { color, size, pressure=0.5, tiltX=0, tiltY=0, twist=0, legacy=false, customParams }
// Not every brush reads every field (e.g. only calligraphy reads `twist`,
// only spray reads `tiltX`) — pass the full object and let each brush pick
// what it needs.

// ---- Grain: a small grayscale noise tile, alpha-varied so it can serve
// directly as a "source-in" mask (tinted per-dab to the current brush
// color). Rendered once and reused — no image asset, no network dependency.
let grainTexture = null;
function getGrainTexture() {
  if (grainTexture) return grainTexture;
  const size = 64;
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d");
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const g = Math.floor(1 + Math.random() * 254);
    ctx.fillStyle = `rgba(${g},${g},${g},${0.12 + Math.random() * 0.55})`;
    ctx.beginPath(); ctx.arc(x, y, 0.4 + Math.random() * 1.1, 0, Math.PI * 2); ctx.fill();
  }
  grainTexture = cv;
  return cv;
}
const grainStampCv = typeof document !== "undefined" ? document.createElement("canvas") : null;


// Translucent variant of a brush colour.
//
// Glow, Neon, Wash and Galaxy used to build this by string-concatenating an
// alpha suffix (`color + "88"`). That silently assumes `color` is always
// 6-digit hex, and it is not: the eyedropper sets `rgb(r,g,b)` (Easel.jsx's
// eyedrop()), and a 3-digit hex is legal everywhere else in the app. Both
// produce garbage — "rgb(0,0,0)88", "#00088" — and Canvas throws a SyntaxError
// mid-stroke, killing the stroke. Use the eyedropper then pick Glow and you hit
// it every time. Caught by verify:brushengine.
export function withAlpha(color, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  const c = String(color).trim();
  const m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})`;
  if (c[0] === "#") {
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map(x => x + x).join("");
    if (h.length >= 6) {
      const n = parseInt(h.slice(0, 6), 16);
      if (!Number.isNaN(n)) return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }
  }
  // Named colours ("red") and anything exotic: fall back to the opaque colour
  // rather than emitting something Canvas will reject.
  return c;
}

const legacyDabAt = (ctx, x, y, { color, size, tool, brush }) => {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = brush === "chalk" ? 0.5 : 0.09;
  ctx.fillStyle = color;
  const dots = brush === "chalk" ? 6 : 1;
  for (let d = 0; d < dots; d++) {
    const ox = brush === "chalk" ? (Math.random() - .5) * size * 1.4 : 0, oy = brush === "chalk" ? (Math.random() - .5) * size * 1.4 : 0;
    ctx.beginPath(); ctx.arc(x + ox, y + oy, tool === "soft" ? size * 1.8 : size * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
};
const improvedDabAt = (ctx, x, y, { color, size, pressure: pr = 0.5, tool, brush }) => {
  const es = size * (0.3 + pr * 0.7);
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color;
  if (brush === "chalk") {
    const n = 8 + Math.round(pr * 7);
    for (let d = 0; d < n; d++) { ctx.globalAlpha = 0.3 + Math.random() * 0.4; const ox = (Math.random() - .5) * es * 1.6, oy = (Math.random() - .5) * es * 1.6; ctx.beginPath(); ctx.arc(x + ox, y + oy, es * (0.3 + Math.random() * 0.5), 0, Math.PI * 2); ctx.fill(); }
  } else if (tool === "soft") {
    const n = 3 + Math.round(pr * 5);
    for (let d = 0; d < n; d++) { ctx.globalAlpha = 0.05 + pr * 0.1; const a = Math.random() * Math.PI * 2, r = Math.random() * es * 1.6; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, es * 0.8, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.globalAlpha = 0.6 + pr * 0.4; const j = (1 - pr) * es * 0.15;
    ctx.beginPath(); ctx.arc(x + (Math.random() - .5) * j, y + (Math.random() - .5) * j, es * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
};
// dabAt needs `tool` and `brush` too (chalk/soft change its shape) — the
// only brush here that isn't purely (color,size,pressure)-driven.
export function dabAt(ctx, x, y, p) { return p.legacy ? legacyDabAt(ctx, x, y, p) : improvedDabAt(ctx, x, y, p); }

const legacySprayAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color;
  const n = 20 + Math.round(size * 3);
  for (let d = 0; d < n; d++) { const a = Math.random() * Math.PI * 2, r = Math.random() * size; ctx.globalAlpha = 0.12 + Math.random() * 0.15; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, size * 0.3 + Math.random() * size * 0.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
};
const improvedSprayAt = (ctx, x, y, { color, size, pressure: pr = 0.5, tiltX = 0 }) => {
  const es = size * (0.3 + pr * 0.7);
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color;
  const n = 30 + Math.round(es * 4);
  for (let d = 0; d < n; d++) {
    const a = Math.random() * Math.PI * 2; const off = tiltX / 90; const r = Math.random() * es * (1 + Math.abs(off) * 0.5);
    ctx.globalAlpha = 0.08 + Math.random() * 0.12 * pr; const dr = es * (0.2 + Math.random() * 0.5 * (1 - Math.abs(off)));
    ctx.beginPath(); ctx.arc(x + Math.cos(a + off) * r * 0.8, y + Math.sin(a + off) * r * 0.8, dr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
};
export function sprayAt(ctx, x, y, p) { return p.legacy ? legacySprayAt(ctx, x, y, p) : improvedSprayAt(ctx, x, y, p); }

const legacyGlowAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
  g.addColorStop(0, color); g.addColorStop(0.3, color); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, y, size * 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
};
const improvedGlowAt = (ctx, x, y, { color, size, pressure: pr = 0.5 }) => {
  const es = size * (0.3 + pr * 0.7); const flicker = 0.85 + Math.random() * 0.15;
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createRadialGradient(x, y, 0, x, y, es * 2.5);
  g.addColorStop(0, color); g.addColorStop(0.15, color); g.addColorStop(0.5, withAlpha(color, 0.53)); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.globalAlpha = 0.25 * flicker * pr; ctx.beginPath(); ctx.arc(x, y, es * 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.4 * flicker * pr; ctx.beginPath(); ctx.arc(x, y, es * 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
};
export function glowAt(ctx, x, y, p) { return p.legacy ? legacyGlowAt(ctx, x, y, p) : improvedGlowAt(ctx, x, y, p); }

const legacyWatercolorAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.12 + Math.random() * 0.15; ctx.fillStyle = color;
  const r = size * 0.6 + Math.random() * size * 0.8;
  ctx.beginPath(); ctx.arc(x + Math.random() * 4 - 2, y + Math.random() * 4 - 2, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
};
const improvedWatercolorAt = (ctx, x, y, { color, size, pressure: pr = 0.5 }) => {
  const es = size * (0.3 + pr * 0.7);
  ctx.globalCompositeOperation = "source-over";
  const blooms = 3 + Math.round(pr * 2);
  for (let b = 0; b < blooms; b++) {
    ctx.globalAlpha = 0.06 + Math.random() * 0.1 * pr; ctx.fillStyle = color;
    const r = es * (0.4 + Math.random() * 0.8); const ox = Math.random() * 8 - 4 + (b - 1) * 2, oy = Math.random() * 8 - 4 + (b - 1) * 2;
    ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
};
export function watercolorAt(ctx, x, y, p) { return p.legacy ? legacyWatercolorAt(ctx, x, y, p) : improvedWatercolorAt(ctx, x, y, p); }

const legacyCalligraphyAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over"; const w = size * (0.5 + Math.sin(y * 0.05) * 0.5);
  ctx.fillStyle = color; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.ellipse(x, y, w / 2, size * 0.4, Math.sin(y * 0.03) * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
};
const improvedCalligraphyAt = (ctx, x, y, { color, size, pressure: pr = 0.5, twist = 0 }) => {
  const tw = twist; const es = size * (0.3 + pr * 0.7); const twistAngle = tw * Math.PI / 180;
  ctx.globalCompositeOperation = "source-over"; const w = es * (0.4 + Math.sin(y * 0.05 + twistAngle) * 0.6);
  ctx.fillStyle = color; ctx.globalAlpha = 0.6 + pr * 0.35;
  ctx.beginPath(); ctx.ellipse(x, y, w / 2, es * 0.35, twistAngle, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
};
export function calligraphyAt(ctx, x, y, p) { return p.legacy ? legacyCalligraphyAt(ctx, x, y, p) : improvedCalligraphyAt(ctx, x, y, p); }

const legacyNeonAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
  g.addColorStop(0, color); g.addColorStop(0.2, "#fff"); g.addColorStop(0.5, color); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(x, y, size * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
};
const improvedNeonAt = (ctx, x, y, { color, size, pressure: pr = 0.5 }) => {
  const es = size * (0.3 + pr * 0.7); const pulse = 0.9 + Math.random() * 0.1;
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createRadialGradient(x, y, 0, x, y, es * 2.2);
  g.addColorStop(0, color); g.addColorStop(0.15, "#fff"); g.addColorStop(0.35, color); g.addColorStop(0.7, withAlpha(color, 0.4)); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.globalAlpha = 0.35 * pulse * pr; ctx.beginPath(); ctx.arc(x, y, es * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.6 * pulse * pr; ctx.beginPath(); ctx.arc(x, y, es * 0.5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.globalAlpha = 1;
};
export function neonAt(ctx, x, y, p) { return p.legacy ? legacyNeonAt(ctx, x, y, p) : improvedNeonAt(ctx, x, y, p); }

const legacySparkleAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color; ctx.globalAlpha = 0.9;
  const n = 5 + Math.round(Math.random() * 4);
  for (let d = 0; d < n; d++) { const a = Math.random() * Math.PI * 2, r = Math.random() * size * 0.6; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(x, y, size * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - 1, y - 1, size * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
};
const improvedSparkleAt = (ctx, x, y, { color, size, pressure: pr = 0.5 }) => {
  const es = size * (0.3 + pr * 0.7);
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color;
  const n = 10 + Math.round(pr * 10);
  for (let d = 0; d < n; d++) { ctx.globalAlpha = 0.4 + Math.random() * 0.5; const a = Math.random() * Math.PI * 2, r = Math.random() * es * 0.8; const sd = 0.5 + Math.random() * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, sd, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(x, y, es * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.9;
  for (let d = 0; d < 4; d++) { const sa = d * Math.PI / 2; ctx.beginPath(); ctx.arc(x + Math.cos(sa) * es * 0.4, y + Math.sin(sa) * es * 0.4, es * 0.08, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
};
export function sparkleAt(ctx, x, y, p) { return p.legacy ? legacySparkleAt(ctx, x, y, p) : improvedSparkleAt(ctx, x, y, p); }

export function grainAt(ctx, x, y, { color, size, pressure: pr = 0.5 }) {
  if (!grainStampCv) return;
  const es = size * (0.4 + pr * 0.8);
  const tex = getGrainTexture();
  const dim = Math.max(4, Math.round(es * 2));
  grainStampCv.width = dim; grainStampCv.height = dim;
  const sctx = grainStampCv.getContext("2d");
  sctx.clearRect(0, 0, dim, dim);
  sctx.save(); sctx.translate(dim / 2, dim / 2); sctx.rotate((Math.random() - 0.5) * 0.6);
  sctx.drawImage(tex, -dim / 2, -dim / 2, dim, dim);
  sctx.restore();
  sctx.globalCompositeOperation = "source-in"; sctx.fillStyle = color; sctx.fillRect(0, 0, dim, dim);
  sctx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.55 + pr * 0.35;
  ctx.drawImage(grainStampCv, x - dim / 2, y - dim / 2);
  ctx.globalAlpha = 1;
}

const legacyCrayonAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.7 + Math.random() * 0.25; ctx.fillStyle = color;
  const ox = (Math.random() - 0.5) * size * 0.4, oy = (Math.random() - 0.5) * size * 0.4;
  const r = size * 0.5 + Math.random() * size * 0.3;
  ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill();
  for (let d = 0; d < 3; d++) { ctx.fillStyle = color; ctx.globalAlpha = 0.15 + Math.random() * 0.2; ctx.beginPath(); ctx.arc(x + (Math.random() - 0.5) * size * 0.6, y + (Math.random() - 0.5) * size * 0.6, size * 0.2 + Math.random() * size * 0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
};
const improvedCrayonAt = (ctx, x, y, { color, size, pressure: pr = 0.5 }) => {
  const es = size * (0.3 + pr * 0.7);
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color; ctx.globalAlpha = 0.5 + pr * 0.4;
  const ox = (Math.random() - 0.5) * es * 0.35, oy = (Math.random() - 0.5) * es * 0.35;
  ctx.beginPath(); ctx.arc(x + ox, y + oy, es * 0.4 + Math.random() * es * 0.3, 0, Math.PI * 2); ctx.fill();
  const n = 4 + Math.round(pr * 4);
  for (let d = 0; d < n; d++) { ctx.fillStyle = color; ctx.globalAlpha = 0.1 + Math.random() * 0.2 * pr; ctx.beginPath(); ctx.arc(x + (Math.random() - 0.5) * es * 0.7, y + (Math.random() - 0.5) * es * 0.7, es * 0.15 + Math.random() * es * 0.25, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
};
export function crayonAt(ctx, x, y, p) { return p.legacy ? legacyCrayonAt(ctx, x, y, p) : improvedCrayonAt(ctx, x, y, p); }

const legacyWashAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.06 + Math.random() * 0.1; ctx.fillStyle = color;
  const r = size * 0.8 + Math.random() * size * 0.6;
  ctx.beginPath(); ctx.arc(x + Math.random() * 6 - 3, y + Math.random() * 6 - 3, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
};
const improvedWashAt = (ctx, x, y, { color, size, pressure: pr = 0.5 }) => {
  const es = size * (0.3 + pr * 0.7);
  ctx.globalCompositeOperation = "source-over";
  const n = 2 + Math.round(pr * 2);
  for (let w = 0; w < n; w++) { ctx.globalAlpha = 0.04 + Math.random() * 0.06 * pr; ctx.fillStyle = color; const r = es * (0.6 + Math.random() * 0.6); const ox = Math.random() * 8 - 4, oy = Math.random() * 8 - 4; ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.07 * pr; const er = es * 1.2;
  ctx.beginPath(); ctx.arc(x, y, er, 0, Math.PI * 2); ctx.fillStyle = withAlpha(color, 0.2); ctx.fill();
  ctx.globalAlpha = 1;
};
export function washAt(ctx, x, y, p) { return p.legacy ? legacyWashAt(ctx, x, y, p) : improvedWashAt(ctx, x, y, p); }

const legacyGalaxyAt = (ctx, x, y, { color, size }) => {
  ctx.globalCompositeOperation = "source-over";
  const cs = ["#7A4FBF", "#2FA9A0", "#FF5DA2", "#E8B14B", "#fff"];
  const n = 8 + Math.round(Math.random() * 6);
  for (let d = 0; d < n; d++) { const a = Math.random() * Math.PI * 2, r = Math.random() * size; ctx.fillStyle = cs[d % cs.length]; ctx.globalAlpha = 0.3 + Math.random() * 0.4; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1 + Math.random() * 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = color; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(x, y, size * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
};
const improvedGalaxyAt = (ctx, x, y, { color, size, pressure: pr = 0.5 }) => {
  const es = size * (0.3 + pr * 0.7);
  const cs = ["#7A4FBF", "#2FA9A0", "#FF5DA2", "#E8B14B", "#fff", "#4EBFFF", "#FF8C42"];
  ctx.globalCompositeOperation = "source-over";
  const n = 20 + Math.round(pr * 15);
  for (let d = 0; d < n; d++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * es; const cluster = Math.random() < 0.3 ? Math.random() * es * 0.3 : r;
    ctx.fillStyle = cs[d % cs.length]; ctx.globalAlpha = 0.2 + Math.random() * 0.4 * pr;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * cluster, y + Math.sin(a) * cluster, 0.8 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = color; ctx.globalAlpha = 0.5 * pr; ctx.beginPath(); ctx.arc(x, y, es * 0.35, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x, y, 0, x, y, es * 1.5); g.addColorStop(0, withAlpha(color, 0.53)); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(x, y, es * 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
};
export function galaxyAt(ctx, x, y, p) { return p.legacy ? legacyGalaxyAt(ctx, x, y, p) : improvedGalaxyAt(ctx, x, y, p); }

// No legacy variant — the pattern brush was added after the legacy/modern
// split existed, so it only ever had one form.
export function partialPatternAt(ctx, x, y, { color, size }) {
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color; ctx.globalAlpha = 0.15;
  const ps = [[x - size, y - size], [x, y - size], [x + size, y - size], [x - size, y], [x, y], [x + size, y], [x - size, y + size], [x, y + size], [x + size, y + size]];
  ps.forEach(([px, py]) => { ctx.fillRect(px, py, size * 0.7, size * 0.7); });
  ctx.globalAlpha = 1;
}

// Brush Lab's fully-custom brush: (flow, scatter, dabs, angleJitter,
// roundness) sliders, no legacy variant.
export function dabCustom(ctx, x, y, size, color, customParams) {
  const dots = Math.round(customParams.dabs);
  for (let d = 0; d < dots; d++) {
    const ox = (Math.random() - .5) * customParams.scatter * size * 1.6;
    const oy = (Math.random() - .5) * customParams.scatter * size * 1.6;
    ctx.globalAlpha = customParams.flow; ctx.fillStyle = color;
    ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate((Math.random() - .5) * customParams.angleJitter * Math.PI);
    ctx.scale(1, Math.max(0.2, customParams.roundness)); ctx.beginPath(); ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
export function customAt(ctx, x, y, { size, color, customParams }) { return dabCustom(ctx, x, y, size, color, customParams); }
