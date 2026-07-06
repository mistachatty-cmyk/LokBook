// Animated stamp registry — the resident painters become placeable living
// cards on the infinite canvas, alongside community-drawn mini animations.
import { drawBounce, drawBloom, drawNight, drawOrbit, drawWalk, drawRain, drawFish, drawBurst, drawWave, drawSpiral, drawPulse, drawFirework, drawMorph, drawNautilus } from "../engine/draw.jsx";
import { W, H } from "../constants.jsx";
import { ART } from "../theme/theme.js";

export const PROC_STAMPS = [
  { ref: "bounce", name: "Bounce", painter: drawBounce, loopMs: 1800 },
  { ref: "bloom", name: "Bloom", painter: drawBloom, loopMs: 2600 },
  { ref: "night", name: "Night flight", painter: drawNight, loopMs: 2600 },
  { ref: "orbit", name: "Orbit", painter: drawOrbit, loopMs: 2400 },
  { ref: "walk", name: "Walker", painter: drawWalk, loopMs: 2000 },
  { ref: "rain", name: "Rain", painter: drawRain, loopMs: 2200 },
  { ref: "fish", name: "Koi", painter: drawFish, loopMs: 2600 },
  { ref: "burst", name: "Fireworks", painter: drawBurst, loopMs: 1600 },
  { ref: "wave", name: "Harbor", painter: drawWave, loopMs: 2800 },
  { ref: "spiral", name: "Spiral", painter: drawSpiral, loopMs: 2400 },
  { ref: "pulse", name: "Pulse", painter: drawPulse, loopMs: 1400 },
  { ref: "firework", name: "Burst city", painter: drawFirework, loopMs: 1800 },
  { ref: "morph", name: "Shifter", painter: drawMorph, loopMs: 2200 },
  { ref: "nautilus", name: "Nautilus", painter: drawNautilus, loopMs: 3000 },
];

export const procByRef = ref => PROC_STAMPS.find(s => s.ref === ref);

// Stamps render as little paper cards (so painters that assume a full scene
// still look intentional — tiny living flipbook pages pinned to the canvas).
export const STAMP_W = W, STAMP_H = H;

export function drawStampCard(ctx, el, now, miniFrames) {
  const d = el.data;
  const s = d.s || 0.25;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(s, s);
  ctx.fillStyle = ART.paper;
  ctx.strokeStyle = ART.ink;
  ctx.lineWidth = 10;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, STAMP_W, STAMP_H, 28); else ctx.rect(0, 0, STAMP_W, STAMP_H);
  ctx.fill();
  ctx.clip();
  if (d.kind === "proc") {
    const p = procByRef(d.ref);
    if (p) { const t = ((now + (d.seed || 0) * 37) % p.loopMs) / p.loopMs; try { p.painter(ctx, t, t * 12); } catch {} }
  } else if (d.kind === "mini" && miniFrames?.length) {
    const idx = Math.floor(now / (d.paceMs || 140)) % miniFrames.length;
    const img = miniFrames[idx];
    if (img?.complete) ctx.drawImage(img, 0, 0, STAMP_W, STAMP_H);
  }
  ctx.restore();
  // border on top (outside clip)
  ctx.save();
  ctx.translate(d.x, d.y); ctx.scale(s, s);
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 12;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, STAMP_W, STAMP_H, 28); else ctx.rect(0, 0, STAMP_W, STAMP_H);
  ctx.stroke();
  ctx.restore();
}

export const stampBB = d => { const s = d.s || 0.25; return [d.x, d.y, d.x + STAMP_W * s, d.y + STAMP_H * s]; };
