// promptArt — bots that actually attempt the prompt, instead of drawing
// unrelated nonsense. Each known prompt gets a hand-composed "recipe": a
// small scene built from shared primitives, seeded so every bot's attempt
// looks different, and parametrized by `t` (reveal progress, 0→1, so the
// thumbnail strip shows real work-in-progress) and `skill` (0→1, rougher
// wobble + fewer finishing touches at low skill, clean confident lines and
// extra flourish at high skill).
//
// The old fully-random renderDoodle() is kept as-is and exposed elsewhere
// as the "CreCre" bot type — chaotic, prompt-blind, on purpose.
import { W, H } from "../constants.jsx";
import { ART } from "../theme/theme.js";
import { paperBase, risoCircle, makeRng } from "./draw.jsx";

const TAU = Math.PI * 2;
const PALETTE = [ART.pink, ART.teal, "#E8B14B", "#7A4FBF", "#FF8C42"];

// ---------- shared primitives ----------

// hand-drawn irregular blob outline (clouds, monsters, plants, soft things)
function blob(ctx, cx, cy, rx, ry, bumps, rng, wob, fill, stroke) {
  const pts = [];
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * TAU;
    const r = 1 + (rng() - 0.5) * wob;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) { ctx.moveTo(x, y); return; }
    const [px, py] = pts[i - 1];
    ctx.quadraticCurveTo((px + x) / 2 + (rng() - 0.5) * 6, (py + y) / 2 + (rng() - 0.5) * 6, x, y);
  });
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke !== false) { ctx.strokeStyle = stroke || ART.ink; ctx.lineWidth = 5; ctx.stroke(); }
}

function face(ctx, cx, cy, r, mood, wob, rng, ink = ART.ink) {
  const jx = () => (rng() - 0.5) * wob, jy = () => (rng() - 0.5) * wob;
  const eyeR = r * 0.11;
  ctx.fillStyle = ink;
  if (mood === "smug") {
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - r * 0.32 + jx(), cy - r * 0.06); ctx.lineTo(cx - r * 0.1 + jx(), cy - r * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.1 + jx(), cy - r * 0.1); ctx.lineTo(cx + r * 0.32 + jx(), cy - r * 0.06); ctx.stroke();
  } else if (mood === "sleepy") {
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineCap = "round";
    [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(cx + d * r * 0.32 - r * 0.08, cy); ctx.quadraticCurveTo(cx + d * r * 0.32, cy - r * 0.06, cx + d * r * 0.32 + r * 0.08, cy); ctx.stroke(); });
  } else {
    [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(cx + d * r * 0.32 + jx(), cy - r * 0.04 + jy(), eyeR, 0, TAU); ctx.fill(); });
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 3.5; ctx.lineCap = "round";
  ctx.beginPath();
  if (mood === "happy" || mood === "silly") ctx.arc(cx, cy + r * 0.18, r * 0.28, 0.12 * Math.PI, 0.88 * Math.PI);
  else if (mood === "smug") ctx.moveTo(cx - r * 0.16, cy + r * 0.24), ctx.quadraticCurveTo(cx, cy + r * 0.16, cx + r * 0.2, cy + r * 0.26);
  else if (mood === "surprised") ctx.arc(cx, cy + r * 0.24, r * 0.12, 0, TAU);
  else ctx.moveTo(cx - r * 0.18, cy + r * 0.22), ctx.lineTo(cx + r * 0.18, cy + r * 0.22);
  ctx.stroke();
}

function lightning(ctx, x, y, s, rng, color = ART.ink) {
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.3, y + s * 0.5); ctx.lineTo(x - s * 0.15, y + s * 0.55 + rng() * 4); ctx.lineTo(x + s * 0.25, y + s);
  ctx.stroke();
}

function wavyLine(ctx, x0, y, w, amp, color, lw = 4) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round";
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x0 + x, y + Math.sin(x / 18) * amp);
  ctx.stroke();
}

function dashedPath(ctx, pts, color = ART.ink) {
  ctx.save(); ctx.setLineDash([7, 8]); ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); ctx.stroke();
  ctx.restore();
}

function sparkle(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
}

const jit = (rng, base, skill) => base * (1 + (rng() - 0.5) * (1.7 - skill * 1.3));

// ---------- recipes: (ctx, t, seed, skill) ----------
// each keyed by the exact prompt string it illustrates.

const RECIPES = {
  "A creature made of weather": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 230 + rng() * 40, cy = 260, wob = jit(rng, 0.22, skill);
    const col = rng() < 0.5 ? "#B8C4E8" : "#D8DEEE";
    if (t > 0.05) blob(ctx, cx, cy, 110, 85, 9, rng, wob, col);
    if (t > 0.3) { lightning(ctx, cx - 60, cy + 60, 90, rng, ART.ink); lightning(ctx, cx + 40, cy + 70, 80, rng, ART.ink); }
    if (t > 0.55) for (let i = 0; i < 5; i++) { ctx.fillStyle = ART.teal; ctx.beginPath(); ctx.arc(cx - 70 + i * 35, cy + 130, 4, 0, TAU); ctx.fill(); }
    if (t > 0.75) face(ctx, cx, cy - 10, 90, "happy", wob * 20, rng);
  },
  "Your breakfast as a hero": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 300, wob = jit(rng, 0.15, skill);
    if (t > 0.1) { ctx.fillStyle = "#5A8BFF"; ctx.beginPath(); ctx.ellipse(cx, cy + 120, 90, 40, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.stroke(); }
    if (t > 0.3) blob(ctx, cx, cy, 95, 85, 8, rng, wob, "#FFF3D6");
    if (t > 0.5) { ctx.fillStyle = "#E8B14B"; ctx.beginPath(); ctx.ellipse(cx + (rng() - 0.5) * 20, cy - 5, 32, 28, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.stroke(); }
    if (t > 0.7) face(ctx, cx, cy + 10, 90, "happy", wob * 20, rng);
    if (t > 0.85) { ctx.strokeStyle = "#D94040"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 130, cy - 40); ctx.lineTo(cx - 150, cy - 90); ctx.stroke(); }
  },
  "A plant that shouldn't exist": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 340, wob = jit(rng, 0.3, skill);
    if (t > 0.05) { ctx.strokeStyle = "#3E8E4B"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy + 100); ctx.quadraticCurveTo(cx + 30 * (rng() - .5), cy, cx, cy - 100); ctx.stroke(); }
    if (t > 0.3) { const cols = [ART.pink, ART.teal, "#7A4FBF"]; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 0.8; blob(ctx, cx + Math.cos(a) * 60, cy - 60 + Math.sin(a) * 60, 34, 24, 6, rng, wob, cols[i % 3]); } }
    if (t > 0.6) blob(ctx, cx, cy - 130, 46, 46, 7, rng, wob, "#E8B14B");
    if (t > 0.8) { ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.arc(cx - 12, cy - 135, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 118); for (let i = 0; i < 4; i++) ctx.lineTo(cx + 6 + i * 6, cy - 118 + (i % 2 ? 6 : -6)); ctx.stroke(); }
  },
  "Night swimming": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const wob = jit(rng, 0.2, skill);
    ctx.fillStyle = "#182348"; ctx.fillRect(28, 28, W - 56, H - 56);
    if (t > 0.1) { ctx.fillStyle = "#F2EDE2"; ctx.beginPath(); ctx.arc(370, 90, 34, 0, TAU); ctx.fill(); }
    if (t > 0.2) for (let i = 0; i < 12; i++) { if (rng() < 0.6) { ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.7; ctx.fillRect(50 + rng() * 380, 50 + rng() * 180, 3, 3); ctx.globalAlpha = 1; } }
    if (t > 0.4) for (let i = 0; i < 5; i++) wavyLine(ctx, 40, 340 + i * 30, 400, 6 + jit(rng, 3, skill), "#5A8BFF33", 3);
    if (t > 0.65) { const sx = 220 + (rng() - 0.5) * 60; ctx.fillStyle = "#F2EDE2"; ctx.beginPath(); ctx.ellipse(sx, 330, 34, 14, 0.2, 0, TAU); ctx.fill(); ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.stroke(); }
    if (t > 0.85) wavyLine(ctx, 60, 355, 380, 5, "#5A8BFF", 3);
  },
  "A machine with feelings": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 300, wob = jit(rng, 0.08, skill);
    if (t > 0.05) { ctx.fillStyle = "#8E93A8"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(cx - 80, cy - 90, 160, 170, 16); ctx.fill(); ctx.stroke(); }
    if (t > 0.25) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy - 90); ctx.lineTo(cx, cy - 120); ctx.stroke(); ctx.fillStyle = ART.pink; ctx.beginPath(); ctx.arc(cx, cy - 126, 8, 0, TAU); ctx.fill(); }
    if (t > 0.45) face(ctx, cx, cy - 20, 80, rng() < 0.5 ? "happy" : "surprised", wob * 20, rng, "#2F1A5E");
    if (t > 0.7) { ctx.fillStyle = ART.pink; ctx.globalAlpha = 0.85 + Math.sin(t * 10) * 0.1; ctx.beginPath(); ctx.moveTo(cx, cy + 60); ctx.bezierCurveTo(cx - 26, cy + 30, cx - 26, cy + 70, cx, cy + 90); ctx.bezierCurveTo(cx + 26, cy + 70, cx + 26, cy + 30, cx, cy + 60); ctx.fill(); ctx.globalAlpha = 1; }
  },
  "The last lighthouse": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 200, wob = jit(rng, 0.1, skill);
    ctx.fillStyle = "#1B2647"; ctx.fillRect(28, 28, W - 56, H - 56);
    if (t > 0.1) { ctx.fillStyle = "#F2EDE2"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 26, 480); ctx.lineTo(cx - 16, 220); ctx.lineTo(cx + 16, 220); ctx.lineTo(cx + 26, 480); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (t > 0.3) { ctx.fillStyle = ART.pink; ctx.fillRect(cx - 20, 195, 40, 30); ctx.strokeRect(cx - 20, 195, 40, 30); ctx.beginPath(); ctx.moveTo(cx - 24, 195); ctx.lineTo(cx, 170); ctx.lineTo(cx + 24, 195); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (t > 0.5) { ctx.fillStyle = "rgba(232,177,74,.35)"; ctx.beginPath(); ctx.moveTo(cx, 210); ctx.lineTo(cx - 140, 130); ctx.lineTo(cx - 140, 170); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, 210); ctx.lineTo(cx + 140, 130); ctx.lineTo(cx + 140, 170); ctx.closePath(); ctx.fill(); }
    if (t > 0.7) for (let i = 0; i < 6; i++) wavyLine(ctx, 40, 470 + i * 12, 400, 5, "#4A5FA8", 2);
    if (t > 0.85) for (let i = 0; i < 8; i++) { ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.6; ctx.fillRect(50 + rng() * 380, 45 + rng() * 100, 2, 2); ctx.globalAlpha = 1; }
  },
  "Dancing mushrooms": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const wob = jit(rng, 0.14, skill); const cols = [ART.pink, "#E8B14B", ART.teal];
    for (let i = 0; i < 3; i++) {
      if (t < (i + 1) * 0.3) continue;
      const cx = 140 + i * 100, cy = 320 - Math.abs(Math.sin(i * 2 + rng())) * 40, tilt = (rng() - 0.5) * 0.5;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
      ctx.fillStyle = "#F2EDE2"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.fillRect(-10, 0, 20, 50); ctx.strokeRect(-10, 0, 20, 50);
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(0, 0, 46, Math.PI, 0); ctx.fill(); ctx.stroke();
      if (t > 0.6) [-1, 0, 1].forEach(d => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(d * 20, -18, 5, 0, TAU); ctx.fill(); });
      if (t > 0.8) face(ctx, 0, 20, 40, "happy", wob * 15, rng);
      ctx.restore();
    }
  },
  "A very smug cat": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 300, wob = jit(rng, 0.1, skill);
    if (t > 0.1) { ctx.fillStyle = "#8E93A8"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 90, cy - 30); ctx.lineTo(cx - 60, cy - 100); ctx.lineTo(cx - 20, cy - 40); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + 90, cy - 30); ctx.lineTo(cx + 60, cy - 100); ctx.lineTo(cx + 20, cy - 40); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (t > 0.25) blob(ctx, cx, cy, 90, 80, 8, rng, wob * 0.6, "#8E93A8");
    if (t > 0.55) face(ctx, cx, cy, 90, "smug", wob * 12, rng);
    if (t > 0.75) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 2; [-1, 1].forEach(d => [0, 1, 2].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + d * 20, cy + 20 + k * 8); ctx.lineTo(cx + d * 70, cy + 10 + k * 10); ctx.stroke(); })); }
  },
  "A city in a teacup": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 340, wob = jit(rng, 0.06, skill);
    if (t > 0.1) { ctx.fillStyle = "#F2EDE2"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy, 110, 55, 0, 0, Math.PI); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy - 55, 110, 26, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx + 120, cy - 30, 26, 18, 0, -0.5, 2.6); ctx.stroke(); }
    if (t > 0.35) { const n = 5; const cols = PALETTE; for (let i = 0; i < n; i++) { const bh = 30 + rng() * 70, bx = cx - 90 + i * 42; ctx.fillStyle = cols[i % cols.length]; ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.fillRect(bx, cy - 60 - bh, 26, bh); ctx.strokeRect(bx, cy - 60 - bh, 26, bh); } }
    if (t > 0.7) for (let i = 0; i < 3; i++) { ctx.strokeStyle = "rgba(35,48,107,.3)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 30 + i * 30, cy - 175); ctx.quadraticCurveTo(cx - 20 + i * 30, cy - 195, cx - 30 + i * 30, cy - 215); ctx.stroke(); }
  },
  "Something soft that bites": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 290, wob = jit(rng, 0.28, skill);
    if (t > 0.1) blob(ctx, cx, cy, 100, 90, 11, rng, wob, "#F7D4FF");
    if (t > 0.4) { ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.moveTo(cx - 50, cy + 20); for (let i = 0; i < 6; i++) ctx.lineTo(cx - 50 + i * 20, cy + 20 + (i % 2 ? 26 : 0)); ctx.lineTo(cx + 60, cy + 20); ctx.closePath(); ctx.fill(); }
    if (t > 0.65) for (let d of [-1, 1]) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(cx + d * 20, cy + 22); ctx.lineTo(cx + d * 30, cy + 40); ctx.lineTo(cx + d * 10, cy + 40); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ART.ink; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (t > 0.85) face(ctx, cx, cy - 30, 90, "angry", wob * 20, rng);
  },
  "A tiny world inside a bottle": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 320, wob = jit(rng, 0.06, skill);
    if (t > 0.1) { ctx.fillStyle = "rgba(78,191,255,.18)"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 18, 190); ctx.lineTo(cx - 18, 230); ctx.quadraticCurveTo(cx - 70, 260, cx - 70, 330); ctx.lineTo(cx - 70, 430); ctx.quadraticCurveTo(cx - 70, 460, cx - 40, 460); ctx.lineTo(cx + 40, 460); ctx.quadraticCurveTo(cx + 70, 460, cx + 70, 430); ctx.lineTo(cx + 70, 330); ctx.quadraticCurveTo(cx + 70, 260, cx + 18, 230); ctx.lineTo(cx + 18, 190); ctx.fill(); ctx.stroke(); }
    if (t > 0.3) { ctx.fillStyle = "#8B5A2B"; ctx.fillRect(cx - 12, 175, 24, 20); ctx.strokeRect(cx - 12, 175, 24, 20); }
    if (t > 0.5) { ctx.fillStyle = "#3E8E4B"; ctx.beginPath(); ctx.ellipse(cx, 400, 50, 20, 0, 0, TAU); ctx.fill(); }
    if (t > 0.7) { ctx.fillStyle = "#3E8E4B"; ctx.beginPath(); ctx.arc(cx - 20, 350, 20, 0, TAU); ctx.arc(cx + 15, 360, 16, 0, TAU); ctx.fill(); ctx.strokeStyle = "#2A5C33"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 20, 370); ctx.lineTo(cx - 20, 395); ctx.stroke(); }
    if (t > 0.85) risoCircle(ctx, cx + 40, 300, 6, 6, 2);
  },
  "A map of somewhere imaginary": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const wob = jit(rng, 0.1, skill);
    ctx.fillStyle = "#F0E4C4"; ctx.fillRect(30, 30, W - 60, H - 60);
    if (t > 0.15) blob(ctx, 160 + rng() * 60, 220 + rng() * 40, 70, 50, 7, rng, 0.25, "#E8D9A8");
    if (t > 0.35) blob(ctx, 320 + rng() * 40, 350 + rng() * 40, 60, 45, 6, rng, 0.25, "#E8D9A8");
    if (t > 0.55) dashedPath(ctx, [[100, 480], [180, 380], [230, 280], [300, 340], [370, 250]], "#8B5A2B");
    if (t > 0.7) { ctx.font = "bold 26px sans-serif"; ctx.fillStyle = "#D94040"; ctx.fillText("X", 300, 330); }
    if (t > 0.85) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(410, 90, 24, 0, TAU); ctx.stroke(); ["N", "S", "E", "W"].forEach((l, i) => { ctx.font = "10px sans-serif"; ctx.fillStyle = ART.ink; const a = i * Math.PI / 2 - Math.PI / 2; ctx.fillText(l, 410 + Math.cos(a) * 30 - 4, 90 + Math.sin(a) * 30 + 4); }); }
  },
  "Two things that don't belong together": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const wob = jit(rng, 0.12, skill);
    const pairs = [["fish", "umbrella"], ["cactus", "donut"], ["shoe", "cloud"], ["fork", "planet"]];
    const [a, b] = pairs[Math.floor(rng() * pairs.length)];
    const draw = (kind, cx, cy) => {
      if (kind === "fish") { ctx.fillStyle = ART.teal; ctx.beginPath(); ctx.ellipse(cx, cy, 46, 26, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 44, cy); ctx.lineTo(cx - 66, cy - 16); ctx.lineTo(cx - 66, cy + 16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (kind === "umbrella") { ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 42, Math.PI, 0); ctx.fillStyle = ART.pink; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 50); ctx.stroke(); }
      else if (kind === "cactus") { ctx.fillStyle = "#3E8E4B"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(cx - 14, cy - 40, 28, 80, 12); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(cx - 40, cy - 10, 24, 40, 10); ctx.fill(); ctx.stroke(); }
      else if (kind === "donut") { ctx.fillStyle = "#E8B14B"; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, TAU); ctx.fill(); ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = ART.paper; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.fill(); ctx.stroke(); }
      else if (kind === "shoe") { ctx.fillStyle = "#D94040"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 40, cy + 20); ctx.lineTo(cx - 40, cy - 10); ctx.quadraticCurveTo(cx - 10, cy - 26, cx + 40, cy); ctx.lineTo(cx + 40, cy + 20); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (kind === "cloud") { blob(ctx, cx, cy, 46, 30, 8, rng, 0.2, "#D8DEEE"); }
      else if (kind === "fork") { ctx.strokeStyle = "#8E93A8"; ctx.lineWidth = 6; ctx.lineCap = "round"; [-12, 0, 12].forEach(d => { ctx.beginPath(); ctx.moveTo(cx + d, cy - 40); ctx.lineTo(cx + d, cy - 5); ctx.stroke(); }); ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 40); ctx.stroke(); }
      else if (kind === "planet") { risoCircle(ctx, cx, cy, 34, 34, 4); ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 54, 14, -0.3, 0, TAU); ctx.stroke(); }
    };
    if (t > 0.15) draw(a, 150, 300);
    if (t > 0.5) { ctx.font = "bold 30px sans-serif"; ctx.fillStyle = ART.ink; ctx.fillText("+", 225, 310); }
    if (t > 0.65) draw(b, 340, 300);
  },
  "The smallest storm": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 290, wob = jit(rng, 0.2, skill);
    if (t > 0.15) blob(ctx, cx, cy, 46, 32, 7, rng, wob, "#D8DEEE");
    if (t > 0.5) lightning(ctx, cx - 10, cy + 20, 34, rng, ART.ink);
    if (t > 0.75) for (let i = 0; i < 3; i++) { ctx.fillStyle = ART.teal; ctx.beginPath(); ctx.arc(cx - 20 + i * 16, cy + 55, 2.5, 0, TAU); ctx.fill(); }
    if (t > 0.9) { ctx.strokeStyle = "rgba(35,48,107,.25)"; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.strokeRect(cx - 70, cy - 55, 140, 130); ctx.setLineDash([]); }
  },
  "An animal made of shadow": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 300, wob = jit(rng, 0.2, skill);
    if (t > 0.1) blob(ctx, cx, cy, 90, 60, 8, rng, wob, "#141420", "#141420");
    if (t > 0.35) { ctx.fillStyle = "#141420"; [[-70, -20, 30, 30], [60, -10, 26, 34]].forEach(([dx, dy, rx, ry]) => { ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, rx, ry, 0, 0, TAU); ctx.fill(); }); }
    if (t > 0.6) { ctx.fillStyle = "#141420"; ctx.beginPath(); ctx.moveTo(cx + 90, cy + 10); ctx.quadraticCurveTo(cx + 140, cy - 10, cx + 130, cy + 30); ctx.quadraticCurveTo(cx + 110, cy + 20, cx + 90, cy + 10); ctx.fill(); }
    if (t > 0.8) { ctx.fillStyle = "#7A4FBF"; [-14, 14].forEach(d => { ctx.beginPath(); ctx.arc(cx + d, cy - 5, 4, 0, TAU); ctx.fill(); }); }
  },

  // ---- kid prompts ----
  "A happy dinosaur": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 220, cy = 320, wob = jit(rng, 0.15, skill);
    if (t > 0.1) blob(ctx, cx, cy, 100, 70, 8, rng, wob * 0.6, "#3E8E4B");
    if (t > 0.35) { ctx.fillStyle = "#3E8E4B"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + 90, cy + 20); ctx.quadraticCurveTo(cx + 160, cy + 10, cx + 150, cy - 30); ctx.quadraticCurveTo(cx + 120, cy, cx + 90, cy + 20); ctx.fill(); ctx.stroke(); }
    if (t > 0.55) [0, 1, 2].forEach(i => { ctx.fillStyle = "#E8B14B"; ctx.beginPath(); ctx.moveTo(cx - 40 + i * 30, cy - 55); ctx.lineTo(cx - 30 + i * 30, cy - 80); ctx.lineTo(cx - 20 + i * 30, cy - 55); ctx.fill(); });
    if (t > 0.75) face(ctx, cx - 70, cy - 10, 50, "happy", wob * 10, rng);
  },
  "Your favorite animal": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 300, wob = jit(rng, 0.14, skill);
    const col = PALETTE[Math.floor(rng() * PALETTE.length)];
    if (t > 0.1) blob(ctx, cx, cy, 85, 78, 8, rng, wob, col);
    if (t > 0.4) [-1, 1].forEach(d => { ctx.fillStyle = col; ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx + d * 60, cy - 55, 18, 26, d * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); });
    if (t > 0.65) face(ctx, cx, cy, 85, "happy", wob * 12, rng);
    if (t > 0.85) { ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.ellipse(cx, cy + 20, 8, 6, 0, 0, TAU); ctx.fill(); }
  },
  "A magic tree": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 340, wob = jit(rng, 0.1, skill);
    if (t > 0.1) { ctx.fillStyle = "#8B5A2B"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 16, cy + 100); ctx.quadraticCurveTo(cx + 6, cy + 20, cx - 6, cy - 30); ctx.lineTo(cx + 16, cy - 30); ctx.quadraticCurveTo(cx + 20, cy + 30, cx + 16, cy + 100); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (t > 0.35) blob(ctx, cx, cy - 90, 90, 80, 9, rng, wob * 0.6, "#7A4FBF");
    if (t > 0.6) for (let i = 0; i < 6; i++) sparkle(ctx, cx - 100 + i * 40 + (rng() - 0.5) * 20, cy - 180 + (rng() - 0.5) * 40, 6, "#E8B14B");
    if (t > 0.85) face(ctx, cx, cy - 90, 90, "happy", wob * 14, rng, "#F2EDE2");
  },
  "A friendly robot": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 310, wob = jit(rng, 0.06, skill);
    if (t > 0.1) { ctx.fillStyle = "#5A8BFF"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(cx - 75, cy - 60, 150, 140, 20); ctx.fill(); ctx.stroke(); }
    if (t > 0.3) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx, cy - 90); ctx.stroke(); ctx.fillStyle = ART.pink; ctx.beginPath(); ctx.arc(cx, cy - 96, 8, 0, TAU); ctx.fill(); }
    if (t > 0.5) face(ctx, cx, cy - 10, 75, "happy", wob * 16, rng, "#1B2647");
    if (t > 0.75) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx + 75, cy); ctx.lineTo(cx + 130, cy - 50); ctx.stroke(); }
  },
  "A rainbow fish": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 300, wob = jit(rng, 0.08, skill);
    if (t > 0.1) { ctx.fillStyle = ART.teal; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, 100, 55, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 95, cy); ctx.lineTo(cx - 140, cy - 35); ctx.lineTo(cx - 140, cy + 35); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (t > 0.4) { PALETTE.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx + 30, cy, 20 + i * 14, -0.7, 0.7); ctx.stroke(); }); }
    if (t > 0.7) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + 60, cy - 10, 10, 0, TAU); ctx.fill(); ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.arc(cx + 62, cy - 10, 4, 0, TAU); ctx.fill(); }
    if (t > 0.85) for (let i = 0; i < 3; i++) { ctx.strokeStyle = "rgba(78,191,255,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + 110 + i * 14, cy - 40 - i * 10, 4 + i, 0, TAU); ctx.stroke(); }
  },
  "A silly monster": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 300, wob = jit(rng, 0.3, skill);
    const col = PALETTE[Math.floor(rng() * PALETTE.length)];
    if (t > 0.1) blob(ctx, cx, cy, 95, 90, 8, rng, wob, col);
    if (t > 0.35) { ctx.fillStyle = col; ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(cx + d * 30, cy - 80); ctx.lineTo(cx + d * (30 + rng() * 20), cy - 80 - 30 - rng() * 20); ctx.lineTo(cx + d * 50, cy - 70); ctx.closePath(); ctx.fill(); ctx.stroke(); }); }
    if (t > 0.6) { ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.arc(cx - 30, cy - 10, 14, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 25, cy, 8, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - 27, cy - 13, 4, 0, TAU); ctx.fill(); }
    if (t > 0.8) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy + 30, 26, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(cx - 6, cy + 26, 8, 10); ctx.strokeRect(cx - 6, cy + 26, 8, 10); }
  },
  "Your dream treehouse": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 220, cy = 340, wob = jit(rng, 0.08, skill);
    if (t > 0.05) { ctx.fillStyle = "#8B5A2B"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.fillRect(cx - 16, cy - 30, 32, 150); ctx.strokeRect(cx - 16, cy - 30, 32, 150); }
    if (t > 0.25) blob(ctx, cx, cy - 100, 100, 80, 8, rng, wob * 0.6, "#3E8E4B");
    if (t > 0.5) { ctx.fillStyle = "#D9A25C"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.fillRect(cx - 30, cy - 60, 60, 55); ctx.strokeRect(cx - 30, cy - 60, 60, 55); ctx.beginPath(); ctx.moveTo(cx - 38, cy - 60); ctx.lineTo(cx, cy - 100); ctx.lineTo(cx + 38, cy - 60); ctx.closePath(); ctx.fillStyle = "#D94040"; ctx.fill(); ctx.stroke(); }
    if (t > 0.7) { ctx.fillStyle = "#5A8BFF"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 2.5; ctx.fillRect(cx - 12, cy - 40, 20, 20); ctx.strokeRect(cx - 12, cy - 40, 20, 20); }
    if (t > 0.85) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx + 20, cy + 40 + i * 12); ctx.lineTo(cx + 44, cy + 40 + i * 12); ctx.stroke(); } [cx + 20, cx + 44].forEach(x => { ctx.beginPath(); ctx.moveTo(x, cy + 40); ctx.lineTo(x, cy + 88); ctx.stroke(); }); }
  },
  "A dancing cloud": (ctx, t, seed, skill) => {
    const rng = makeRng(seed); const cx = 240, cy = 280, wob = jit(rng, 0.16, skill);
    if (t > 0.1) blob(ctx, cx, cy, 90, 60, 8, rng, wob, "#F2EDE2");
    if (t > 0.4) { ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.lineCap = "round"; [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(cx + d * 60, cy + 20); ctx.quadraticCurveTo(cx + d * 90, cy + 40, cx + d * 100, cy - 10); ctx.stroke(); }); }
    if (t > 0.6) { ctx.beginPath(); ctx.moveTo(cx - 20, cy + 55); ctx.lineTo(cx - 30, cy + 100); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + 20, cy + 55); ctx.lineTo(cx + 34, cy + 95); ctx.stroke(); }
    if (t > 0.8) face(ctx, cx, cy - 5, 90, "happy", wob * 14, rng);
    if (t > 0.9) { ctx.strokeStyle = "rgba(35,48,107,.25)"; ctx.lineWidth = 2; [1, 2].forEach(i => { ctx.beginPath(); ctx.arc(cx - 110, cy + 20 * i, 10 + i * 4, -0.6, 0.6); ctx.stroke(); }); }
  },
};

const genericFallback = (ctx, t, seed) => {
  const rng = makeRng(seed);
  if (t > 0.1) blob(ctx, 240, 300, 90 + rng() * 20, 80, 8, rng, 0.2, PALETTE[Math.floor(rng() * PALETTE.length)]);
  if (t > 0.6) face(ctx, 240, 290, 90, "happy", 8, rng);
};

// Per-bot flourish — a small signature element each bot adds to any prompt
const BOT_FLOURISH = {
  "pixel.pluto": (ctx, rng) => {
    ctx.strokeStyle = "rgba(35,48,107,0.12)"; ctx.lineWidth = 2;
    for (let x = 48; x < W - 48; x += 32) { ctx.fillRect(x, 48, 2, 2); ctx.fillRect(x, H - 52, 2, 2); }
    for (let y = 48; y < H - 48; y += 32) { ctx.fillRect(48, y, 2, 2); ctx.fillRect(W - 52, y, 2, 2); }
  },
  "inkwell_iz": (ctx, rng) => {
    const cx = W - 60, cy = 60, R = 18;
    ctx.strokeStyle = "rgba(47,169,160,0.3)"; ctx.lineWidth = 2;
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(35,48,107,0.15)"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  },
  "tinta": (ctx, rng) => {
    ctx.fillStyle = "rgba(255,93,162,0.12)";
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(60 + rng() * 40, H - 80 + rng() * 30, 4 + rng() * 6, 0, Math.PI * 2); ctx.fill(); }
  },
  "mooncrayon": (ctx, rng) => {
    ctx.fillStyle = "rgba(232,177,75,0.15)";
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(50 + rng() * 380, 50 + rng() * 500, 8 + rng() * 12, 0, Math.PI * 2); ctx.fill(); }
  },
  "sketchram": (ctx, rng) => {
    ctx.strokeStyle = "rgba(255,93,162,0.15)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    const x = 80 + rng() * 320, y = 80 + rng() * 440;
    ctx.beginPath(); ctx.moveTo(x - 16, y + 20); ctx.lineTo(x, y); ctx.lineTo(x + 16, y + 20); ctx.stroke();
  },
  "doodlebug": (ctx, rng) => {
    ctx.fillStyle = "rgba(35,48,107,0.08)";
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(40 + rng() * 400, 50 + rng() * 500, 3 + rng() * 8, 0, Math.PI * 2); ctx.fill(); }
  },
  "nib.ninja": (ctx, rng) => {
    ctx.strokeStyle = "rgba(35,48,107,.18)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(50 + rng() * 100, 40 + rng() * 80); ctx.quadraticCurveTo(W / 2 + (rng() - .5) * 150, H / 2, W - 50 - rng() * 100, H - 60 - rng() * 80); ctx.stroke();
  },
  "grafite": (ctx, rng) => {
    ctx.fillStyle = "rgba(35,48,107,0.05)"; ctx.strokeStyle = "rgba(35,48,107,0.1)"; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const x = 40 + rng() * 400, y = 40 + rng() * 500; ctx.beginPath(); ctx.arc(x, y, 20 + rng() * 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  },
  "blot.bot": (ctx, rng) => {
    ctx.fillStyle = "rgba(255,93,162,0.08)";
    for (let i = 0; i < 3; i++) { const x = 80 + rng() * 320, y = 80 + rng() * 440; ctx.beginPath(); ctx.arc(x + (rng() - .5) * 30, y + (rng() - .5) * 30, 12 + rng() * 18, 0, Math.PI * 2); ctx.fill(); }
  },
  "spiral_sage": (ctx, rng) => {
    ctx.strokeStyle = "rgba(47,169,160,0.15)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W - 50, H - 50, 14 + rng() * 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W - 50, H - 50, 6 + rng() * 4, 0, Math.PI * 2); ctx.stroke();
  },
  "chaos_quill": (ctx, rng) => {
    ctx.strokeStyle = "rgba(255,93,162,0.12)"; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(48 + rng() * 20, 48 + rng() * 80); ctx.lineTo(W - 48 - rng() * 80, H - 48 - rng() * 20); ctx.stroke(); }
  },
  "frost_byte": (ctx, rng) => {
    ctx.fillStyle = "rgba(47,169,160,0.06)";
    for (let i = 0; i < 3; i++) { const x = 50 + rng() * 380, y = 50 + rng() * 500; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill(); }
  },
  "ember_scratch": (ctx, rng) => {
    ctx.fillStyle = "rgba(232,177,75,0.1)";
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(60 + rng() * 360, 60 + rng() * 480, 2 + rng() * 4, 0, Math.PI * 2); ctx.fill(); }
  },
  "void_weaver": (ctx, rng) => {
    ctx.strokeStyle = "rgba(90,139,255,0.08)"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(100 + rng() * 280, 100 + rng() * 400, 20 + rng() * 30, 0, Math.PI * 2); ctx.stroke(); }
  },
};

export function renderPromptArt(prompt, seed, t, skill = 0.6, botName) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  paperBase(ctx, null);
  const recipe = RECIPES[prompt] || genericFallback;
  try { recipe(ctx, Math.max(0, Math.min(1, t)), seed, Math.max(0.15, Math.min(1, skill))); }
  catch { genericFallback(ctx, t, seed); }
  // apply bot-specific flourish
  if (botName && BOT_FLOURISH[botName]) {
    try { BOT_FLOURISH[botName](ctx, makeRng(seed * 97 + 7)); } catch {}
  }
  return c.toDataURL("image/png");
}

export const HAS_RECIPE = prompt => !!RECIPES[prompt];
