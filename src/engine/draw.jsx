import { forwardRef, useRef, useImperativeHandle } from "react";
import { W, H } from "../constants.jsx";
import { ART } from "../theme/theme.js";

export function paperBase(ctx, pageNum = null, framed = true) {
  ctx.fillStyle = ART.paper;
  ctx.fillRect(0, 0, W, H);
  if (framed) { ctx.strokeStyle = "rgba(35,48,107,0.25)"; ctx.lineWidth = 2; ctx.strokeRect(18, 18, W - 36, H - 36); }
  if (pageNum !== null) { ctx.fillStyle = "rgba(35,48,107,0.45)"; ctx.font = "700 20px monospace"; ctx.textAlign = "right"; ctx.fillText(String(pageNum + 1).padStart(2, "0"), W - 30, H - 30); ctx.textAlign = "left"; }
}

export function risoCircle(ctx, x, y, rx, ry, off = 5) {
  ctx.fillStyle = ART.pink;
  ctx.beginPath();
  ctx.ellipse(x + off, y + off, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ART.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawBounce(ctx, t) {
  const g = 500; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, g + 26); ctx.lineTo(W - 40, g + 26); ctx.stroke();
  const amp = (1 - 0.45 * t) * 320, h = Math.abs(Math.cos(t * Math.PI * 1.6)) * amp;
  const x = 80 + t * 320, y = g - h, sq = h < 26 ? 1.45 : 1;
  ctx.save(); ctx.strokeStyle = "rgba(47,169,160,0.55)"; ctx.lineWidth = 4; ctx.setLineDash([2, 14]); ctx.beginPath();
  for (let k = 0; k <= 24; k++) { const tt = Math.max(0, t - 0.22) + (k / 24) * Math.min(0.22, t); const hh = Math.abs(Math.cos(tt * Math.PI * 1.6)) * (1 - 0.45 * tt) * 320, xx = 80 + tt * 320; k === 0 ? ctx.moveTo(xx, g - hh) : ctx.lineTo(xx, g - hh); } ctx.stroke(); ctx.restore();
  risoCircle(ctx, x, y - 38 / sq, 38 * sq, 38 / sq);
}

export function drawBloom(ctx, t, i = 0) {
  const bx = 240, by = 520, hgt = 360 * Math.min(1, t * 1.4);
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 36 * Math.sin(t * 3), by - hgt * 0.5, bx + 10 * Math.sin(i), by - hgt); ctx.stroke();
  ctx.fillStyle = ART.teal; ctx.fillRect(bx - 64, by - 6, 128, 54); ctx.strokeRect(bx - 64, by - 6, 128, 54);
  if (t > 0.32) { const ls = Math.min(1, (t - 0.32) * 3); ctx.fillStyle = ART.teal; ctx.lineWidth = 5; [[-1, 0.62], [1, 0.5]].forEach(([d, at]) => { ctx.beginPath(); ctx.ellipse(bx + d * 44 * ls, by - hgt * at, 46 * ls, 18 * ls, d * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }); }
  if (t > 0.52) { const ps = Math.min(1, (t - 0.52) * 2.4), cx2 = bx + 10 * Math.sin(i), cy2 = by - hgt; for (let p = 0; p < 6; p++) { const a = (p / 6) * Math.PI * 2 + t; risoCircle(ctx, cx2 + Math.cos(a) * 46 * ps, cy2 + Math.sin(a) * 46 * ps, 30 * ps, 30 * ps, 4); } ctx.fillStyle = ART.teal; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx2, cy2, 26 * ps, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

export function drawNight(ctx, t, i = 0) {
  ctx.fillStyle = "rgba(35,48,107,0.93)"; ctx.fillRect(26, 26, W - 52, H - 52);
  for (let s = 0; s < 26; s++) { if (s / 26 > t + 0.15) continue; const sx = 40 + ((s * 137.5) % (W - 80)), sy = 40 + ((s * 89.3) % (H * 0.55)); ctx.fillStyle = s % 4 === 0 ? ART.pink : ART.paper; ctx.fillRect(sx, sy, 5, 5); }
  const my = 470 - 330 * t; ctx.fillStyle = ART.paper; ctx.beginPath(); ctx.arc(372, my, 56, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ART.pink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(366, my - 6, 56, 0, Math.PI * 2); ctx.stroke();
  const bx = 50 + 360 * t, by = 230 + 46 * Math.sin(t * 9), flap = Math.sin(i * 1.9) * 0.9;
  ctx.fillStyle = "#10183F"; ctx.strokeStyle = ART.pink; ctx.lineWidth = 3;
  [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + d * 48, by - 44 * flap - 12, bx + d * 86, by - 26 * flap); ctx.quadraticCurveTo(bx + d * 52, by + 8, bx, by + 12); ctx.fill(); ctx.stroke(); });
  ctx.beginPath(); ctx.ellipse(bx, by + 2, 13, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

// --- extra seed styles: geometric, character, mood, nature, energy, ocean ---
export function drawOrbit(ctx, t) {
  ctx.strokeStyle = "rgba(35,48,107,0.3)"; ctx.lineWidth = 3; ctx.setLineDash([5, 9]); ctx.beginPath(); ctx.ellipse(240, 300, 155, 96, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  for (let s = 0; s < 14; s++) { const sx = 50 + ((s * 151.7) % 380), sy = 50 + ((s * 97.3) % 500); ctx.fillStyle = s % 3 ? ART.ink : ART.pink; ctx.globalAlpha = 0.5; ctx.fillRect(sx, sy, 4, 4); ctx.globalAlpha = 1; }
  risoCircle(ctx, 240, 300, 66, 66);
  ctx.strokeStyle = ART.teal; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(240, 300, 92, 26, -0.35, 0, Math.PI * 2); ctx.stroke();
  const a = t * Math.PI * 2 - Math.PI / 2, mx = 240 + Math.cos(a) * 155, my = 300 + Math.sin(a) * 96;
  ctx.fillStyle = ART.teal; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(mx, my, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

export function drawWalk(ctx, t, i = 0) {
  const g = 470; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, g + 34); ctx.lineTo(W - 30, g + 34); ctx.stroke();
  const x = 60 + t * 350, sw = Math.sin(i * 1.9), bob = Math.abs(Math.sin(i * 1.9)) * 8, y = 330 - bob;
  ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + sw * 34, g + 30); ctx.stroke();            // legs
  ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x - sw * 34, g + 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x, y - 30); ctx.stroke();                       // body
  ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + sw * 28, y + 26); ctx.stroke();              // arms
  ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x - sw * 28, y + 26); ctx.stroke();
  risoCircle(ctx, x, y - 62, 30, 30, 3);                                                              // head
  ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.arc(x + 10, y - 66, 3.5, 0, Math.PI * 2); ctx.fill(); // eye
}

export function drawRain(ctx, t, i = 0) {
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 6; ctx.strokeRect(70, 60, 340, 420);
  ctx.strokeStyle = "rgba(35,48,107,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(240, 60); ctx.lineTo(240, 480); ctx.moveTo(70, 270); ctx.lineTo(410, 270); ctx.stroke();
  ctx.strokeStyle = ART.teal; ctx.lineWidth = 3.5; ctx.lineCap = "round";
  for (let d = 0; d < 22; d++) { const dx = 84 + ((d * 89.7) % 312); const dy = 70 + (((d * 137.3) + i * 60) % 396); ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx - 5, dy + 20); ctx.stroke(); }
  const pw = 30 + 60 * t; ctx.strokeStyle = ART.pink; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(240, 530, pw, pw * 0.24, 0, 0, Math.PI * 2); ctx.stroke();
  risoCircle(ctx, 150 + 40 * Math.sin(t * Math.PI * 2), 520, 16, 16, 3);
}

export function drawFish(ctx, t, i = 0) {
  ctx.fillStyle = "rgba(47,169,160,0.14)"; ctx.fillRect(26, 26, W - 52, H - 52);
  for (let b = 0; b < 5; b++) { const bx = 90 + b * 78, by = 520 - (((b * 120) + t * 460) % 460); ctx.strokeStyle = "rgba(35,48,107,0.4)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, 6 + (b % 3) * 3, 0, Math.PI * 2); ctx.stroke(); }
  const fx = 100 + t * 280, fy = 290 + Math.sin(t * Math.PI * 3) * 60, flap = Math.sin(i * 2.1) * 0.8;
  ctx.fillStyle = ART.pink; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(fx, fy, 58, 34, Math.sin(t * Math.PI * 3) * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx - 52, fy); ctx.quadraticCurveTo(fx - 96, fy - 36 * flap, fx - 100, fy - 44 * flap); ctx.quadraticCurveTo(fx - 88, fy + 4, fx - 52, fy); ctx.fillStyle = ART.teal; ctx.fill(); ctx.stroke();
  ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.arc(fx + 34, fy - 8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ART.teal; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx + 10, fy + 4, 16, -0.6, 0.9); ctx.stroke();
}

export function drawBurst(ctx, t) {
  ctx.fillStyle = "rgba(35,48,107,0.93)"; ctx.fillRect(26, 26, W - 52, H - 52);
  if (t < 0.4) { const ry = 520 - (t / 0.4) * 300; ctx.strokeStyle = ART.pink; ctx.lineWidth = 5; ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.moveTo(240, 540); ctx.lineTo(240, ry); ctx.stroke(); ctx.setLineDash([]); risoCircle(ctx, 240, ry, 13, 13, 2); return; }
  const k = (t - 0.4) / 0.6, R = 40 + k * 190;
  for (let p = 0; p < 12; p++) { const a = (p / 12) * Math.PI * 2; const col = [ART.pink, ART.teal, "#E8B14B"][p % 3]; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.globalAlpha = 1 - k * 0.55; ctx.beginPath(); ctx.moveTo(240 + Math.cos(a) * R * 0.45, 220 + Math.sin(a) * R * 0.45); ctx.lineTo(240 + Math.cos(a) * R, 220 + Math.sin(a) * R); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(240 + Math.cos(a) * R, 220 + Math.sin(a) * R, 7 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

export function drawWave(ctx, t, i = 0) {
  const ph = t * Math.PI * 2;
  ctx.fillStyle = "rgba(47,169,160,0.18)"; ctx.fillRect(26, 300, W - 52, 274);
  [0.35, 0.55, 0.8].forEach((depth, wi) => {
    const wy = 300 + depth * 200; ctx.strokeStyle = wi === 1 ? ART.teal : ART.ink; ctx.lineWidth = 6 - wi; ctx.beginPath();
    for (let x = 26; x <= W - 26; x += 8) ctx.lineTo(x, wy + Math.sin(x / 46 + ph + wi * 2) * (16 - wi * 3));
    ctx.stroke();
  });
  const bx = 200 + Math.sin(ph) * 60, by = 328 + Math.sin(bx / 46 + ph) * 14;
  ctx.fillStyle = ART.pink; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(bx - 44, by); ctx.lineTo(bx + 44, by); ctx.lineTo(bx + 26, by + 26); ctx.lineTo(bx - 26, by + 26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 58); ctx.stroke();
  ctx.fillStyle = ART.teal; ctx.beginPath(); ctx.moveTo(bx, by - 58); ctx.lineTo(bx + 38 + 6 * Math.sin(i * 2), by - 40); ctx.lineTo(bx, by - 24); ctx.closePath(); ctx.fill(); ctx.stroke();
  risoCircle(ctx, 380, 110, 34, 34, 4);
}

export function drawNautilus(ctx, t, i = 0) {
  const cx = 240, cy = 300, turns = 2.6, grow = 0.2 + 0.8 * t;
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath();
  for (let k = 0; k <= 120 * grow; k++) { const a = (k / 120) * Math.PI * 2 * turns; const R = 14 + k * 1.55; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.86; k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  // chamber walls appear behind the leading edge
  ctx.strokeStyle = ART.teal; ctx.lineWidth = 3.5;
  const walls = Math.floor(9 * grow);
  for (let w = 1; w <= walls; w++) { const a = (w / 9) * Math.PI * 2 * turns; const R1 = 14 + (w / 9) * 120 * 1.55; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R1 * 0.42, cy + Math.sin(a) * R1 * 0.36); ctx.lineTo(cx + Math.cos(a) * R1, cy + Math.sin(a) * R1 * 0.86); ctx.stroke(); }
  risoCircle(ctx, cx, cy, 12, 12, 3);
  // drifting bubbles
  for (let b = 0; b < 4; b++) { const by = 520 - (((b * 130) + t * 470) % 470); ctx.strokeStyle = "rgba(255,93,162,0.5)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(70 + b * 24 + Math.sin(i + b) * 8, by, 5 + b * 2, 0, Math.PI * 2); ctx.stroke(); }
}

export function drawSpiral(ctx, t, i = 0) {
  const cx = 240, cy = 300, maxR = 200, turns = 4;
  const progress = Math.min(1, t * 1.2);
  ctx.strokeStyle = ART.pink; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath();
  for (let k = 0; k <= 60 * progress; k++) {
    const a = (k / 60) * turns * Math.PI * 2 + i * 0.08;
    const r = 16 + (k / 60) * maxR;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = ART.teal; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

export function drawPulse(ctx, t, i = 0) {
  const cx = 240, cy = 300;
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 3;
  for (let r = 0; r < 5; r++) {
    const phase = (i * 0.12 + r * 0.2) % 1;
    const rad = 30 + phase * 170;
    const alpha = 0.5 * (1 - phase);
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const sz = 20 + 14 * Math.sin(i * 0.25);
  ctx.fillStyle = ART.pink; ctx.strokeStyle = ART.teal; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, sz, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

export function drawFirework(ctx, t) {
  ctx.fillStyle = "rgba(35,48,107,0.93)"; ctx.fillRect(26, 26, W - 52, H - 52);
  if (t < 0.15) return;
  const k = (t - 0.15) / 0.85;
  const cx = 240, cy = 200, R = 30 + k * 170;
  for (let p = 0; p < 16; p++) {
    const a = (p / 16) * Math.PI * 2 + k * 0.5;
    const col = [ART.pink, ART.teal, "#E8B14B"][p % 3];
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.globalAlpha = 1 - k * 0.6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  risoCircle(ctx, cx, cy, 16, 16, 3);
  if (t > 0.7) {
    const fall = (t - 0.7) / 0.3;
    ctx.fillStyle = "#E8B14B"; ctx.globalAlpha = 0.3 * (1 - fall);
    for (let s = 0; s < 8; s++) {
      const sa = s * Math.PI * 0.25;
      ctx.beginPath(); ctx.arc(cx + Math.cos(sa) * 100, cy + 40 + fall * 300, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawMorph(ctx, t, i = 0) {
  const cx = 240, cy = 300, R = 140;
  const morph = Math.min(1, t * 1.5);
  const sides = 3 + Math.floor(morph * 4);
  ctx.strokeStyle = ART.teal; ctx.lineWidth = 5; ctx.lineJoin = "round";
  ctx.beginPath();
  for (let k = 0; k <= sides; k++) {
    const a = (k / sides) * Math.PI * 2 - Math.PI / 2;
    const r = k % sides === 0 ? R : morph > 0.8 ? R * (0.6 + 0.4 * (1 - (morph - 0.8) / 0.2)) : R;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = ART.pink; ctx.lineWidth = 3;
  for (let k = 0; k < sides; k++) {
    const a = (k / sides) * Math.PI * 2 - Math.PI / 2 + morph * 0.3;
    const r = R * 0.55 + 20 * Math.sin(i * 0.3 + k);
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 12, 0, Math.PI * 2); ctx.stroke();
  }
  risoCircle(ctx, cx, cy, 18, 18, 3);
}

// Recompress a frame dataURL to JPEG on paper background — used before
// uploading to the party feed and saving the gallery (keeps payloads small).
export function compressFrame(dataUrl, q = 0.72) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { try { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.fillStyle = ART.paper; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0); res(c.toDataURL("image/webp", q)); } catch { res(dataUrl); } };
    img.onerror = () => res(dataUrl);
    img.src = dataUrl;
  });
}

export function renderSequence(painter, n) {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
  const out = []; for (let i = 0; i < n; i++) { ctx.clearRect(0, 0, W, H); paperBase(ctx, i); painter(ctx, n === 1 ? 1 : i / (n - 1), i); out.push(c.toDataURL("image/png")); } return out;
}

export function makeRng(seed) { let s = seed % 233280; return () => ((s = (s * 9301 + 49297) % 233280), s / 233280); }

export function makeDoodlePainter(seed) {
  const r = makeRng(seed * 7919 + 13), inks = [ART.ink, ART.pink, ART.teal], strokes = [], blobs = [];
  for (let b = 0; b < 2; b++) blobs.push({ x: 90 + r() * 300, y: 110 + r() * 380, rx: 30 + r() * 50, ry: 30 + r() * 50 });
  for (let s = 0; s < 15; s++) { const pts = [[60 + r() * 360, 70 + r() * 460]], segs = 4 + Math.floor(r() * 5); for (let k = 0; k < segs; k++) { const [px, py] = pts[pts.length - 1]; pts.push([Math.max(40, Math.min(W - 40, px + (r() - .5) * 170)), Math.max(40, Math.min(H - 40, py + (r() - .5) * 170))]); } strokes.push({ pts, color: inks[Math.floor(r() * 3)], width: 4 + r() * 8 }); }
  const total = blobs.length + strokes.length;
  return (ctx, t) => { const upto = Math.floor(total * Math.max(0, Math.min(1, t))); let drawn = 0; for (const b of blobs) { if (drawn >= upto) return; risoCircle(ctx, b.x, b.y, b.rx, b.ry, 4); drawn++; } ctx.lineCap = "round"; ctx.lineJoin = "round"; for (const s of strokes) { if (drawn >= upto) return; ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.beginPath(); s.pts.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); ctx.stroke(); drawn++; } };
}

export function renderDoodle(seed, t) { const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d"); paperBase(ctx, null); makeDoodlePainter(seed)(ctx, t); return c.toDataURL("image/png"); }

export function renderAvatar(seed) {
  const c = document.createElement("canvas"); c.width = 200; c.height = 200; const ctx = c.getContext("2d");
  const r = makeRng(seed + 7); ctx.fillStyle = ART.paper; ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = [ART.pink, ART.teal, "#E8B14B", "#7A4FBF"][Math.floor(r() * 4)]; ctx.beginPath(); ctx.ellipse(105, 110, 64, 70, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(100, 105, 64, 70, 0, 0, Math.PI * 2); ctx.stroke();
  const ey = 95 + r() * 10; [78, 122].forEach(ex => { ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2); ctx.fill(); });
  ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(100, ey + 22, 16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  return c.toDataURL("image/png");
}

function polyPts(cx, cy, sides, R, rot = -Math.PI / 2) { const p = []; for (let i = 0; i <= sides; i++) { const a = rot + (i / sides) * Math.PI * 2; p.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } return p; }

function starPts(cx, cy, points, R, r) { const p = []; for (let i = 0; i <= points * 2; i++) { const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2; const rad = i % 2 ? r : R; p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } return p; }

function ellipsePts(cx, cy, rx, ry, n = 60) { const p = []; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }

function linePts(a, b, n = 8) { const p = []; for (let i = 0; i <= n; i++) p.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return p; }

export function traceShape(kind) {
  const cx = W / 2, cy = H / 2; let pts = [];
  switch (kind) {
    case "star": return starPts(cx, cy, 5, 180, 78); case "triangle": return polyPts(cx, cy, 3, 175); case "square": return polyPts(cx, cy, 4, 165, -Math.PI / 4); case "hexagon": return polyPts(cx, cy, 6, 170); case "circle": return ellipsePts(cx, cy, 175, 175);
    case "heart": { for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3); const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([cx + x * 11, cy - y * 11]); } return pts; }
    case "spiral": { for (let i = 0; i <= 90; i++) { const a = i / 90 * Math.PI * 5; const rad = 24 + i * 1.9; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } return pts; }
    case "house": return [[cx - 120, cy + 120], [cx - 120, cy - 20], [cx, cy - 130], [cx + 120, cy - 20], [cx + 120, cy + 120], [cx - 120, cy + 120], ...linePts([cx - 40, cy + 120], [cx - 40, cy + 30]), ...linePts([cx - 40, cy + 30], [cx + 40, cy + 30]), ...linePts([cx + 40, cy + 30], [cx + 40, cy + 120])];
    case "wild-knot": { for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 2; pts.push([cx + Math.sin(3 * t) * 150, cy + Math.sin(2 * t) * 150]); } return pts; }
    case "char-ghost": return [[cx - 110, cy + 150], [cx - 110, cy - 30], [cx - 60, cy - 130], [cx + 60, cy - 130], [cx + 110, cy - 30], [cx + 110, cy + 150], [cx + 70, cy + 110], [cx + 35, cy + 150], [cx, cy + 110], [cx - 35, cy + 150], [cx - 70, cy + 110], [cx - 110, cy + 150], ...ellipsePts(cx - 40, cy - 40, 16, 22, 18), ...ellipsePts(cx + 40, cy - 40, 16, 22, 18)];
    case "diamond": return polyPts(cx, cy, 4, 175, Math.PI / 4); case "pentagon": return polyPts(cx, cy, 5, 175); case "octagon": return polyPts(cx, cy, 8, 175); case "decagon": return polyPts(cx, cy, 10, 175);
    case "star_4": return starPts(cx, cy, 4, 180, 70); case "star_6": return starPts(cx, cy, 6, 180, 75); case "star_8": return starPts(cx, cy, 8, 180, 72);
    case "cross": { for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const r = 170 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); pts.push([cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55]); } return pts; }
    case "arrow": return [[cx + 150, cy], [cx, cy - 100], [cx, cy - 40], [cx - 150, cy - 40], [cx - 150, cy + 40], [cx, cy + 40], [cx, cy + 100]];
    case "wave": { for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([cx - 160 + t * 320, cy + Math.sin(t * Math.PI * 4) * 80]); } return pts; }
    case "zigzag": { for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([cx - 160 + t * 320, cy + (i % 2 === 0 ? -90 : 90)]); } return pts; }
    case "crescent": { for (let i = 0; i <= 50; i++) { const a = -Math.PI / 2 + i / 50 * Math.PI; pts.push([cx + Math.cos(a) * 150, cy + Math.sin(a) * 140]); } for (let i = 50; i >= 0; i--) { const a = -Math.PI / 2 + i / 50 * Math.PI; pts.push([cx + Math.cos(a) * 100 + 40, cy + Math.sin(a) * 120]); } return pts; }
    case "teardrop": { for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([cx + Math.sin(a / 2) * 120, cy - Math.cos(a) * 140 + 40]); } return pts; }
    case "droplet": { for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const r = 80 + 60 * Math.sin(a * 0.5 + 0.5); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8 - 30]); } return pts; }
    case "leaf": { for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + i / 40 * Math.PI; pts.push([cx + Math.cos(a) * 160, cy + Math.sin(a) * 70]); } for (let i = 40; i >= 0; i--) { const a = -Math.PI / 2 + i / 40 * Math.PI; pts.push([cx - Math.cos(a) * 50, cy + Math.sin(a) * 60]); } return pts; }
    case "clover": { for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 2; const r = 60 + 60 * Math.sin(2.5 * a); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "rings": { for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; pts.push([cx + Math.cos(a) * 170, cy + Math.sin(a) * 170]); } for (let i = 0; i <= 100; i++) { const a = i / 100 * Math.PI * 2; pts.push([cx + Math.cos(a) * 90, cy + Math.sin(a) * 90]); } return pts; }
    case "target": { const c = [[cx, cy - 170], ...starPts(cx, cy, 24, 170, 170)]; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([cx + Math.cos(a) * 100, cy + Math.sin(a) * 100]); } pts.push(...linePts([cx - 170, cy], [cx - 100, cy])); pts.push(...linePts([cx + 100, cy], [cx + 170, cy])); return c; }
    case "gear": { const n = 16; for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2; const r = i % 2 === 0 ? 170 : 130; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "helix": { for (let i = 0; i <= 120; i++) { const t = i / 120 * Math.PI * 6; const r = 40 + i * 1.1; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } return pts; }
    case "infinity": { for (let i = 0; i <= 80; i++) { const t = i / 80 * Math.PI * 2; pts.push([cx + 120 * Math.cos(t) / (1 + Math.pow(Math.sin(t), 2)), cy + 100 * Math.sin(t) * Math.cos(t) / (1 + Math.pow(Math.sin(t), 2))]); } return pts; }
    case "sawtooth": { for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([cx - 160 + t * 320, cy - 80 + (i % 2 === 0 ? 0 : 160)]); } return pts; }
    case "bow_tie": return [[cx - 150, cy - 130], [cx + 150, cy + 130], [cx - 150, cy + 130], [cx + 150, cy - 130]];
    case "skull": return [[cx - 100, cy + 120], [cx - 120, cy - 40], [cx - 80, cy - 110], [cx - 30, cy - 140], [cx + 30, cy - 140], [cx + 80, cy - 110], [cx + 120, cy - 40], [cx + 100, cy + 120], [cx + 50, cy + 60], [cx + 50, cy + 40], [cx + 60, cy + 20], [cx + 80, cy + 20], [cx + 90, cy - 20], [cx + 60, cy - 50], [cx + 20, cy - 40], [cx + 30, cy + 20], [cx + 10, cy + 40], [cx + 10, cy + 60], [cx + 50, cy + 120], ...ellipsePts(cx - 30, cy - 70, 14, 20, 16), ...ellipsePts(cx + 30, cy - 70, 14, 20, 16)];
    case "dagger": return [[cx - 15, cy - 180], [cx + 15, cy - 180], [cx + 15, cy + 30], [cx + 40, cy + 40], [cx + 40, cy + 70], [cx + 15, cy + 60], [cx + 15, cy + 130], [cx + 5, cy + 150], [cx - 5, cy + 150], [cx - 15, cy + 130], [cx - 15, cy + 60], [cx - 40, cy + 70], [cx - 40, cy + 40], [cx - 15, cy + 30]];
    case "raven": return [[cx - 50, cy + 150], [cx - 130, cy + 110], [cx - 160, cy + 70], [cx - 140, cy + 50], [cx - 100, cy + 80], [cx - 50, cy + 80], [cx + 20, cy + 50], [cx + 80, cy + 20], [cx + 140, cy - 40], [cx + 160, cy - 20], [cx + 120, cy + 20], [cx + 80, cy + 50], [cx + 30, cy + 80], [cx - 10, cy + 120], [cx - 30, cy + 150], ...linePts([cx + 100, cy + 60], [cx + 140, cy + 110]), ...linePts([cx + 110, cy + 70], [cx + 160, cy + 100])];
    case "lotus": { const pet = n => { const p = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI - Math.PI / 2; p.push([Math.cos(a) * 80 * (1 - i / 20 * 0.7), Math.sin(a) * 140 * (1 - i / 20 * 0.7)]); } return p; }; for (let k = 0; k < 5; k++) { const r = k / 5 * Math.PI * 2; const petal = pet(0); const c = Math.cos(r), s = Math.sin(r); petal.forEach(p => pts.push([cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c])); } return pts; }
    case "flame": { for (let i = 0; i <= 50; i++) { const a = -Math.PI / 2 + i / 50 * Math.PI * 1.4; const r = 60 + 110 * (1 - i / 50 * 0.3) * (0.7 + 0.3 * Math.sin(i * 1.3)); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6 - 20]); } return pts; }
    case "eye": return [[cx - 160, cy], ...ellipsePts(cx, cy, 160, 100, 36), [cx + 160, cy], ...ellipsePts(cx, cy + 8, 50, 50, 24)];
    case "mandala": { for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; const r = 50 + 120 * Math.abs(Math.sin(a * 3)); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "crown": return [[cx - 140, cy + 120], [cx - 140, cy + 30], [cx - 100, cy - 20], [cx - 70, cy + 60], [cx - 30, cy - 100], [cx, cy + 20], [cx + 30, cy - 100], [cx + 70, cy + 60], [cx + 100, cy - 20], [cx + 140, cy + 30], [cx + 140, cy + 120]];
    case "sword": return [[cx - 12, cy - 190], [cx + 12, cy - 190], ...ellipsePts(cx, cy - 175, 24, 12, 12), [cx + 12, cy + 60], [cx + 35, cy + 65], [cx + 35, cy + 75], [cx + 12, cy + 72], [cx + 12, cy + 130], [cx - 12, cy + 130], [cx - 12, cy + 72], [cx - 35, cy + 75], [cx - 35, cy + 65], [cx - 12, cy + 60]];
    case "shield": return [...linePts([cx - 140, cy - 40], [cx - 100, cy - 150]), ...linePts([cx - 100, cy - 150], [cx + 100, cy - 150]), ...linePts([cx + 100, cy - 150], [cx + 140, cy - 40]), ...ellipsePts(cx, cy + 30, 130, 130, 30)];
    case "anchor": return [[cx - 100, cy + 120], [cx - 140, cy + 80], [cx - 100, cy + 140], [cx, cy + 160], [cx + 100, cy + 140], [cx + 140, cy + 80], [cx + 100, cy + 120], ...linePts([cx, cy - 170], [cx, cy + 160]), ...linePts([cx - 30, cy + 10], [cx + 30, cy + 10]), ...linePts([cx - 120, cy - 30], [cx, cy - 170]), ...linePts([cx + 120, cy - 30], [cx, cy - 170])];
    case "butterfly": { for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI; pts.push([cx + Math.sin(t) * 140, cy - Math.sin(t * 2) * 60 - 30]); } for (let i = 40; i >= 0; i--) { const t = i / 40 * Math.PI; pts.push([cx - Math.sin(t) * 140, cy - Math.sin(t * 2) * 60 - 30]); } return pts; }
    case "feather": return [[cx - 10, cy - 180], [cx + 60, cy - 80], [cx + 10, cy + 20], [cx + 40, cy + 100], [cx, cy + 160], [cx - 40, cy + 100], [cx - 10, cy + 20], [cx - 60, cy - 80]];
    case "shell": { for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 4; const r = 20 + i * 2.5; pts.push([cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r]); } return pts; }
    case "moon": { for (let i = 0; i <= 60; i++) { const a = -Math.PI / 2 + i / 60 * Math.PI * 2; const r = 140 + 20 * Math.cos(a * 2); pts.push([cx + Math.cos(a) * r * 0.5 + 30, cy + Math.sin(a) * r]); } return pts; }
    case "cloud": { const pts2 = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 2; const r = 60 + 40 * Math.abs(Math.sin((a + 0.5) * 2)); pts2.push([Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.8]); } return pts2.map(p => [cx + p[0], cy + p[1] - 20]); }
    case "mountain": return [[cx - 180, cy + 120], [cx - 120, cy - 60], [cx - 60, cy + 40], [cx, cy - 140], [cx + 60, cy - 20], [cx + 120, cy - 80], [cx + 180, cy + 120]];
    case "tree": return [[cx + 10, cy - 40], ...ellipsePts(cx, cy - 120, 90, 100, 30), [cx - 10, cy - 40], [cx - 10, cy + 120], [cx + 10, cy + 120]];
    case "fish": return [[cx - 160, cy - 10], [cx - 100, cy - 70], [cx + 80, cy - 80], [cx + 140, cy - 50], [cx + 170, cy], [cx + 140, cy + 50], [cx + 80, cy + 80], [cx - 100, cy + 70], ...linePts([cx + 140, cy - 30], [cx + 180, cy - 80]), ...linePts([cx + 140, cy + 30], [cx + 180, cy + 80])];
    case "rose": { for (let i = 0; i <= 100; i++) { const a = i / 100 * Math.PI * 2; const r = 50 + 40 * Math.sin(a * 4); pts.push([cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 1.2]); } return pts; }
    case "labyrinth": { for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 8; const r = 10 + i * 0.85; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "galaxy": { for (let i = 0; i <= 100; i++) { const t = i / 100 * Math.PI * 4; const r = 20 + i * 1.5; pts.push([cx + Math.cos(t) * r + Math.sin(t * 3) * 15, cy + Math.sin(t) * r + Math.cos(t * 3) * 15]); } return pts; }
    case "tornado": { for (let i = 0; i <= 80; i++) { const t = i / 80 * Math.PI * 6; const r = 10 + i * 2.0; pts.push([cx + Math.cos(t) * r, cy - 150 + i * 3.8]); } return pts; }
    case "lightning": return [[cx - 60, cy - 180], [cx + 20, cy - 80], [cx - 20, cy - 60], [cx + 40, cy + 40], [cx - 10, cy + 60], [cx + 30, cy + 170], [cx + 10, cy + 60], [cx + 50, cy + 40], [cx - 10, cy - 60], [cx + 30, cy - 80]];
    case "scribble": { for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 10; pts.push([cx + Math.cos(t) * 140 + Math.cos(t * 1.3) * 30, cy + Math.sin(t * 1.2) * 130 + Math.sin(t * 0.7) * 30]); } return pts; }
    case "vortex": { for (let i = 0; i <= 100; i++) { const a = i / 100 * Math.PI * 6; const r = 170 * (1 - i / 100 * 0.7); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "star_burst": { for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const r = 60 + 110 * (Math.sin(a * 5) * 0.5 + 0.5); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "web": { for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; const r = Math.sin(a * 6) * 30 + 120; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "honeycomb": { for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const r = 120 + 30 * Math.cos(a * 6); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "tentacle": { for (let i = 0; i <= 80; i++) { const t = i / 80 * Math.PI * 4; const r = 20 + i * 1.6; pts.push([cx + Math.cos(t) * r * 0.7 + 30 * Math.sin(t * 0.5), cy + Math.sin(t) * r + Math.cos(t) * 20]); } return pts; }
    case "hydra": { for (let k = 0; k < 3; k++) { const offX = Math.cos(k / 3 * Math.PI * 2) * 40, offY = Math.sin(k / 3 * Math.PI * 2) * 40; for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 3; const r = 10 + i * 2.5; pts.push([cx + offX + Math.cos(t) * r * 0.5, cy + offY + Math.sin(t) * r]); } } return pts; }
    case "nerve": { for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 6; pts.push([cx + Math.cos(t) * (100 + 30 * Math.sin(t * 0.7)), cy + Math.sin(t) * (100 + 30 * Math.cos(t * 0.5))]); } return pts; }
    case "root": { for (let k = 0; k < 4; k++) { const ang = k / 4 * Math.PI * 2; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([cx + Math.cos(ang) * t * 160 + Math.cos(t * 8 + ang) * 20, cy + Math.sin(ang) * t * 160 + Math.sin(t * 8 + ang) * 20]); } } return pts; }
    case "maze": { for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 8; const r = 30 + i * 1.2; pts.push([cx + Math.cos(a) * r + Math.sin(a * 2) * 15, cy + Math.sin(a) * r + Math.cos(a * 2) * 15]); } return pts; }
    case "tangle": { for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 6; const r = 100 + 60 * Math.sin(a * 2.7); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "chaos": { for (let i = 0; i <= 100; i++) { const t = i / 100 * Math.PI * 8; pts.push([cx + Math.sin(t) * 150 + Math.cos(t * 1.7) * 40, cy + Math.cos(t * 1.3) * 150 + Math.sin(t * 0.7) * 40]); } return pts; }
    case "ring_spiral": { for (let i = 0; i <= 140; i++) { const a = i / 140 * Math.PI * 6; const r = 30 + 130 * (i / 140); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; pts.push([cx + Math.cos(a) * 170, cy + Math.sin(a) * 170]); } return pts; }
    case "spirograph": { for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2; const R = 120, r = 40, d = 60; pts.push([cx + (R - r) * Math.cos(a) + d * Math.cos((R - r) / r * a), cy + (R - r) * Math.sin(a) - d * Math.sin((R - r) / r * a)]); } return pts; }
    case "octogram": { for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2; const r = i % 2 === 0 ? 170 : 70; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; }
    case "wave_chaos": { for (let i = 0; i <= 80; i++) { const t = i / 80 * Math.PI * 8; pts.push([cx + Math.sin(t) * 140 + Math.cos(t * 0.3) * 40, cy + Math.cos(t) * 100 + Math.sin(t * 1.7) * 30]); } return pts; }
    case "char_goblin": return [[cx - 90, cy + 140], [cx - 110, cy + 40], [cx - 100, cy - 40], [cx - 70, cy - 90], [cx - 30, cy - 120], [cx, cy - 60], [cx + 30, cy - 120], [cx + 70, cy - 90], [cx + 100, cy - 40], [cx + 110, cy + 40], [cx + 90, cy + 140], [cx + 50, cy + 100], [cx + 10, cy + 110], [cx - 10, cy + 110], [cx - 50, cy + 100], ...ellipsePts(cx - 30, cy - 30, 12, 16, 14), ...ellipsePts(cx + 30, cy - 30, 12, 16, 14), ...linePts([cx, cy + 10], [cx, cy + 60])];
    case "char_dragon": return [[cx - 130, cy + 100], [cx - 150, cy + 20], [cx - 120, cy - 60], [cx - 70, cy - 110], [cx, cy - 140], [cx + 70, cy - 110], [cx + 120, cy - 60], [cx + 150, cy + 20], [cx + 130, cy + 100], [cx + 80, cy + 60], [cx + 40, cy + 80], [cx, cy + 40], [cx - 40, cy + 80], [cx - 80, cy + 60], ...ellipsePts(cx - 40, cy - 60, 10, 14, 12), ...ellipsePts(cx + 40, cy - 60, 10, 14, 12), ...linePts([cx, cy - 20], [cx, cy + 20]), ...linePts([cx - 120, cy - 60], [cx - 180, cy - 100]), ...linePts([cx + 120, cy - 60], [cx + 180, cy - 100])];
    case "char_wyrm": return [[cx - 60, cy + 140], [cx - 100, cy + 60], [cx - 80, cy - 20], [cx - 30, cy - 80], [cx + 20, cy - 60], [cx + 60, cy - 100], [cx + 90, cy - 60], [cx + 130, cy + 20], [cx + 100, cy + 100], [cx + 60, cy + 120], [cx + 20, cy + 80], [cx, cy + 40], ...ellipsePts(cx - 20, cy + 20, 6, 8, 10)];
    case "char_bat": return [[cx, cy + 130], [cx - 60, cy + 110], [cx - 100, cy + 80], [cx - 160, cy + 50], [cx - 140, cy + 10], [cx - 100, cy - 20], [cx - 80, cy - 80], [cx - 70, cy - 130], [cx - 40, cy - 100], [cx, cy - 80], [cx + 40, cy - 100], [cx + 70, cy - 130], [cx + 80, cy - 80], [cx + 100, cy - 20], [cx + 140, cy + 10], [cx + 160, cy + 50], [cx + 100, cy + 80], [cx + 60, cy + 110], ...ellipsePts(cx - 18, cy - 10, 8, 10, 10), ...ellipsePts(cx + 18, cy - 10, 8, 10, 10)];
    case "char_owl": return [[cx - 90, cy + 120], [cx - 100, cy + 50], [cx - 90, cy - 40], [cx - 60, cy - 90], [cx, cy - 110], [cx + 60, cy - 90], [cx + 90, cy - 40], [cx + 100, cy + 50], [cx + 90, cy + 120], [cx + 50, cy + 90], [cx + 10, cy + 100], [cx - 10, cy + 100], [cx - 50, cy + 90], ...ellipsePts(cx - 30, cy - 20, 16, 22, 16), ...ellipsePts(cx + 30, cy - 20, 16, 22, 16), ...ellipsePts(cx - 30, cy - 20, 6, 8, 8), ...ellipsePts(cx + 30, cy - 20, 6, 8, 8)];
    case "char_wolf": return [[cx - 80, cy + 140], [cx - 120, cy + 60], [cx - 130, cy - 10], [cx - 110, cy - 60], [cx - 80, cy - 100], [cx - 40, cy - 120], [cx, cy - 110], [cx + 40, cy - 120], [cx + 80, cy - 100], [cx + 110, cy - 60], [cx + 130, cy - 10], [cx + 120, cy + 60], [cx + 80, cy + 140], [cx + 30, cy + 100], [cx, cy + 110], [cx - 30, cy + 100], ...ellipsePts(cx - 30, cy - 40, 10, 14, 12), ...ellipsePts(cx + 30, cy - 40, 10, 14, 12)];
    case "char_fox": return [[cx - 50, cy + 130], [cx - 110, cy + 70], [cx - 120, cy - 20], [cx - 90, cy - 80], [cx - 40, cy - 110], [cx, cy - 90], [cx + 40, cy - 110], [cx + 90, cy - 80], [cx + 120, cy - 20], [cx + 110, cy + 70], [cx + 50, cy + 130], [cx - 140, cy + 30], [cx - 100, cy + 10], [cx + 100, cy + 10], [cx + 140, cy + 30], ...ellipsePts(cx - 25, cy - 30, 8, 12, 10), ...ellipsePts(cx + 25, cy - 30, 8, 12, 10)];
    case "char_frog": return [[cx - 70, cy + 120], [cx - 100, cy + 50], [cx - 90, cy - 30], [cx - 50, cy - 80], [cx, cy - 90], [cx + 50, cy - 80], [cx + 90, cy - 30], [cx + 100, cy + 50], [cx + 70, cy + 120], [cx + 30, cy + 80], [cx, cy + 90], [cx - 30, cy + 80], ...ellipsePts(cx - 30, cy - 30, 14, 18, 14), ...ellipsePts(cx + 30, cy - 30, 14, 18, 14)];
    case "char_snake": { pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 4; pts.push([cx + Math.sin(t) * 120, cy + 130 - i * 4.5 + Math.cos(t * 1.5) * 20]); } return pts; }
    case "char_bird": return [[cx - 10, cy + 40], [cx - 90, cy + 70], [cx - 60, cy + 20], [cx - 80, cy - 40], [cx - 40, cy - 80], [cx - 10, cy - 100], [cx + 20, cy - 80], [cx + 60, cy - 100], [cx + 40, cy - 50], [cx + 80, cy - 20], [cx + 160, cy + 40], [cx + 80, cy + 10], [cx + 40, cy + 30], [cx, cy + 60], ...ellipsePts(cx - 8, cy - 50, 5, 6, 8)];
    case "char_imp": return [[cx - 70, cy + 140], [cx - 90, cy + 60], [cx - 80, cy - 40], [cx - 40, cy - 100], [cx, cy - 70], [cx + 40, cy - 100], [cx + 80, cy - 40], [cx + 90, cy + 60], [cx + 70, cy + 140], [cx, cy + 120], ...ellipsePts(cx - 25, cy - 10, 10, 14, 10), ...ellipsePts(cx + 25, cy - 10, 10, 14, 10), ...linePts([cx - 80, cy - 40], [cx - 120, cy - 80]), ...linePts([cx + 80, cy - 40], [cx + 120, cy - 80])];
    case "char_demon": return [[cx - 100, cy + 140], [cx - 130, cy + 60], [cx - 120, cy - 40], [cx - 80, cy - 100], [cx - 30, cy - 130], [cx, cy - 80], [cx + 30, cy - 130], [cx + 80, cy - 100], [cx + 120, cy - 40], [cx + 130, cy + 60], [cx + 100, cy + 140], [cx + 40, cy + 100], [cx, cy + 110], [cx - 40, cy + 100], ...ellipsePts(cx - 35, cy - 40, 12, 16, 12), ...ellipsePts(cx + 35, cy - 40, 12, 16, 12), ...linePts([cx - 120, cy - 60], [cx - 170, cy - 110]), ...linePts([cx + 120, cy - 60], [cx + 170, cy - 110]), ...linePts([cx - 50, cy - 130], [cx - 70, cy - 180]), ...linePts([cx + 50, cy - 130], [cx + 70, cy - 180])];
    case "char_angel": return [[cx - 90, cy + 140], [cx - 100, cy + 50], [cx - 80, cy - 50], [cx - 40, cy - 100], [cx, cy - 110], [cx + 40, cy - 100], [cx + 80, cy - 50], [cx + 100, cy + 50], [cx + 90, cy + 140], [cx + 40, cy + 100], [cx, cy + 110], [cx - 40, cy + 100], ...ellipsePts(cx - 30, cy - 30, 10, 14, 12), ...ellipsePts(cx + 30, cy - 30, 10, 14, 12), ...linePts([cx - 40, cy - 80], [cx - 130, cy - 150]), ...linePts([cx + 40, cy - 80], [cx + 130, cy - 150])];
    case "char_robot": return [[cx - 80, cy + 140], [cx - 90, cy + 40], [cx - 80, cy - 60], [cx - 40, cy - 100], [cx, cy - 110], [cx + 40, cy - 100], [cx + 80, cy - 60], [cx + 90, cy + 40], [cx + 80, cy + 140], [cx + 30, cy + 100], [cx - 30, cy + 100], ...polyPts(cx - 30, cy - 30, 4, 16, Math.PI / 4), ...polyPts(cx + 30, cy - 30, 4, 16, Math.PI / 4), ...linePts([cx - 50, cy - 80], [cx - 20, cy - 10]), ...linePts([cx + 50, cy - 80], [cx + 20, cy - 10])];
    case "char_alien": return [[cx - 100, cy + 130], [cx - 110, cy + 30], [cx - 90, cy - 50], [cx - 50, cy - 110], [cx, cy - 120], [cx + 50, cy - 110], [cx + 90, cy - 50], [cx + 110, cy + 30], [cx + 100, cy + 130], ...ellipsePts(cx - 40, cy - 30, 16, 22, 14), ...ellipsePts(cx + 40, cy - 30, 16, 22, 14), ...ellipsePts(cx - 40, cy - 30, 6, 8, 8), ...ellipsePts(cx + 40, cy - 30, 6, 8, 8)];
    case "char_slime": return [[cx - 100, cy + 60], ...ellipsePts(cx, cy + 60, 100, 80, 30), [cx + 100, cy + 60], [cx + 90, cy + 120], [cx + 50, cy + 90], [cx, cy + 130], [cx - 50, cy + 90], [cx - 90, cy + 120], ...ellipsePts(cx - 30, cy + 10, 10, 14, 10), ...ellipsePts(cx + 30, cy + 10, 10, 14, 10)];
    case "char_jelly": { for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const r = 100 + 40 * Math.sin(a * 3); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6 + 30]); } return pts.concat([[cx - 80, cy + 140], [cx - 100, cy + 180], [cx - 60, cy + 150], [cx - 30, cy + 180], [cx, cy + 150], [cx + 30, cy + 180], [cx + 60, cy + 150], [cx + 80, cy + 140]]); }
    case "char_dino": return [[cx - 80, cy + 130], [cx - 120, cy + 80], [cx - 110, cy - 30], [cx - 60, cy - 100], [cx, cy - 110], [cx + 50, cy - 80], [cx + 100, cy + 20], [cx + 130, cy + 10], [cx + 110, cy + 60], [cx + 60, cy + 50], [cx + 30, cy + 100], ...linePts([cx - 20, cy - 110], [cx - 30, cy - 170]), ...linePts([cx + 20, cy - 110], [cx + 30, cy - 170])];
    case "char_shadow": return [[cx - 110, cy + 120], [cx - 130, cy + 20], [cx - 110, cy - 60], [cx - 60, cy - 120], [cx, cy - 140], [cx + 60, cy - 120], [cx + 110, cy - 60], [cx + 130, cy + 20], [cx + 110, cy + 120], [cx + 60, cy + 80], [cx, cy + 100], [cx - 60, cy + 80], ...ellipsePts(cx - 30, cy - 40, 8, 20, 10), ...ellipsePts(cx + 30, cy - 40, 8, 20, 10)];
    case "char_eye": return [[cx - 80, cy - 60], [cx - 100, cy - 20], [cx - 80, cy + 60], [cx - 30, cy + 90], [cx, cy + 80], [cx + 30, cy + 90], [cx + 80, cy + 60], [cx + 100, cy - 20], [cx + 80, cy - 60], [cx + 30, cy - 90], [cx, cy - 80], [cx - 30, cy - 90], ...ellipsePts(cx, cy, 80, 100, 36), ...ellipsePts(cx, cy, 30, 50, 20)];
    case "char_cat": return [[cx - 70, cy + 130], [cx - 100, cy + 60], [cx - 110, cy - 20], [cx - 80, cy - 80], [cx - 30, cy - 110], [cx, cy - 90], [cx + 30, cy - 110], [cx + 80, cy - 80], [cx + 110, cy - 20], [cx + 100, cy + 60], [cx + 70, cy + 130], ...linePts([cx - 50, cy - 110], [cx - 70, cy - 160]), ...linePts([cx + 50, cy - 110], [cx + 70, cy - 160]), ...ellipsePts(cx - 25, cy - 30, 10, 14, 10), ...ellipsePts(cx + 25, cy - 30, 10, 14, 10)];
    case "char_rabbit": return [[cx - 60, cy + 130], [cx - 90, cy + 70], [cx - 100, cy - 20], [cx - 70, cy - 80], [cx - 20, cy - 110], [cx, cy - 80], [cx + 20, cy - 110], [cx + 70, cy - 80], [cx + 100, cy - 20], [cx + 90, cy + 70], [cx + 60, cy + 130], ...linePts([cx - 10, cy - 100], [cx - 20, cy - 170]), ...linePts([cx + 10, cy - 100], [cx + 20, cy - 170]), ...ellipsePts(cx - 25, cy - 30, 10, 14, 10), ...ellipsePts(cx + 25, cy - 30, 10, 14, 10)];
    case "char_mushroom": return [[cx - 60, cy + 130], [cx - 50, cy + 40], ...ellipsePts(cx, cy - 20, 100, 80, 30), [cx + 50, cy + 40], [cx + 60, cy + 130], [cx + 20, cy + 90], [cx, cy + 100], [cx - 20, cy + 90], ...ellipsePts(cx - 40, cy - 40, 8, 12, 8), ...ellipsePts(cx, cy - 60, 10, 14, 8), ...ellipsePts(cx + 40, cy - 40, 8, 12, 8)];
    case "char_tree": return [[cx - 30, cy + 50], ...ellipsePts(cx, cy - 60, 80, 100, 30), [cx + 30, cy + 50], [cx + 20, cy + 140], [cx - 20, cy + 140], [cx - 10, cy + 80], ...ellipsePts(cx - 40, cy - 60, 40, 30, 16), ...ellipsePts(cx + 40, cy - 60, 40, 30, 16)];
    case "char_knight": return [[cx - 70, cy + 140], [cx - 90, cy + 60], [cx - 80, cy - 30], [cx - 40, cy - 90], [cx, cy - 100], [cx + 40, cy - 90], [cx + 80, cy - 30], [cx + 90, cy + 60], [cx + 70, cy + 140], [cx + 20, cy + 100], [cx, cy + 110], [cx - 20, cy + 100], ...polyPts(cx, cy - 60, 3, 24, -Math.PI / 2), ...linePts([cx - 30, cy - 90], [cx - 40, cy - 150]), ...linePts([cx + 30, cy - 90], [cx + 40, cy - 150])];
    default: return starPts(cx, cy, 5, 180, 78);
  }
}

export const MiniDraw = forwardRef(function MiniDraw({ color = ART.pink, width = 12, bg = ART.paper }, ref) {
  const cRef = useRef(null); const drawing = useRef(false); const last = useRef(null); const strokes = useRef(0);
  useImperativeHandle(ref, () => ({ snapshot() { const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; const x = tmp.getContext("2d"); paperBase(x, null); x.drawImage(cRef.current, 0, 0); return tmp.toDataURL("image/webp", 0.72); }, clear() { cRef.current.getContext("2d").clearRect(0, 0, W, H); strokes.current = 0; }, strokes: () => strokes.current }));
  const pos = e => { const r = cRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
  const dn = e => { e.preventDefault(); cRef.current.setPointerCapture(e.pointerId); drawing.current = true; last.current = pos(e); strokes.current++; };
  const mv = e => { if (!drawing.current) return; const ctx = cRef.current.getContext("2d"); const p = pos(e); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(...(last.current || p)); ctx.lineTo(...p); ctx.stroke(); last.current = p; };
  const up = () => { drawing.current = false; last.current = null; };
  return <canvas ref={cRef} width={W} height={H} onPointerDown={dn} onPointerMove={mv} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} className="w-full rounded-xl" style={{ aspectRatio: "4/5", background: bg, touchAction: "none", cursor: "crosshair" }} />;
});