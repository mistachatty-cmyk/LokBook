// botArt — generative styles for the resident seed artists.
// Every artist has a distinct parametric generator; a seed drives all the
// randomness, so each (artist, seed) pair is a unique piece and can never be
// re-posted. moss.ink is NOT here — it only posts curated, hand-tuned painters.
import { W, H } from "../constants.jsx";
import { ART } from "../theme/theme.js";
import { makeRng, makeDoodlePainter, renderSequence } from "./draw.jsx";

const TAU = Math.PI * 2;

// ---------- personality-driven sub-styles ----------
// A/B/C aren't random skins — they dramatize each bot's character: A is the
// safe default (~60%), B amplifies the personality (~30%), C is a rare
// (~10%) moment where the bot's own rule visibly bends, paired with a short
// in-character caption from BOT_EVENT_LINES.
export function subOf(seed) { const k = seed % 10; return k < 6 ? "A" : k < 9 ? "B" : "C"; }

export const BOT_EVENT_LINES = {
  inkwell_iz: "lost the center today.",
  tinta: "one drew the other.",
  mooncrayon: "the wax ran out mid-piece.",
  sketchram: "left a pose broken, on purpose.",
  "pixel.pluto": "a corrupted row got through.",
  doodlebug: "the garden crept past the margin.",
  "nib.ninja": "the one stroke, missed. left as-is.",
  grafite: "almost all shadow today.",
  "blot.bot": "repeats itself. repeats itself. repeats itself.",
  spiral_sage: "the spiral didn't reach the end.",
  chaos_quill: "went off the page and back.",
  frost_byte: "lost control of the cold.",
  ember_scratch: "the coldest cut yet.",
  void_weaver: "wove until the gap nearly closed.",
};

// ---------- per-artist generators: (seed, substyle) => {painter(ctx,t,i), n, pace, title} ----------

function izMandala(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 31 + 7);
  let petals = 5 + Math.floor(r() * 7), rings = 2 + Math.floor(r() * 3), rot = r() * TAU;
  const cols = [ART.ink, ART.teal, "#7A4FBF"];
  if (sub === "B") rings += 2; // trance mandala — goes deeper
  const drift = sub === "C" ? { x: (r() - 0.5) * 90, y: (r() - 0.5) * 90 } : { x: 0, y: 0 }; // lost the center
  return {
    n: sub === "B" ? 18 : 14, pace: sub === "B" ? 130 : 110, title: `Mandala study no.${seed % 97}`,
    painter: (ctx, t) => {
      const cx = W / 2 + drift.x, cy = H / 2 - 20 + drift.y, grow = 0.25 + 0.75 * t;
      ctx.lineCap = "round";
      for (let ring = 1; ring <= rings; ring++) {
        const R = (60 + ring * 62) * grow;
        ctx.strokeStyle = cols[ring % cols.length]; ctx.lineWidth = 4 - ring * 0.7;
        for (let p = 0; p < petals * ring; p++) {
          const a = rot + (p / (petals * ring)) * TAU + t * 0.6 * (ring % 2 ? 1 : -1);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55);
          ctx.quadraticCurveTo(cx + Math.cos(a + 0.28) * R * 1.06, cy + Math.sin(a + 0.28) * R * 1.06, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.stroke();
        }
      }
      ctx.fillStyle = ART.pink; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, 16 + 10 * Math.sin(t * TAU), 0, TAU); ctx.fill(); ctx.stroke();
    },
  };
}

function tintaCreature(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 53 + 3);
  const arms = 4 + Math.floor(r() * 4), bodyR = 55 + r() * 40, hue = r() < 0.5 ? ART.pink : ART.teal;
  const wob = 0.6 + r() * 0.8;
  const drawOne = (ctx, t, i, ox, oy, scale, revealSide) => {
    const cx = W / 2 + ox + Math.sin(t * TAU) * 30 * scale, cy = H / 2 + oy + Math.cos(t * TAU * wob) * 24 * scale;
    ctx.strokeStyle = ART.ink; ctx.lineWidth = 6 * scale; ctx.lineCap = "round";
    for (let a0 = 0; a0 < arms; a0++) {
      const a = (a0 / arms) * TAU + Math.sin(i * 1.7) * 0.3;
      // "one side unfinished" — arms on that side stay a stub, mid-thought
      if (revealSide === "left" && Math.cos(a) < -0.15) continue;
      const len = (bodyR + 60 + Math.sin(t * TAU * 2 + a0) * 26) * scale;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * bodyR * 0.8 * scale, cy + Math.sin(a) * bodyR * 0.8 * scale);
      ctx.quadraticCurveTo(cx + Math.cos(a + 0.5) * len * 0.8, cy + Math.sin(a + 0.5) * len * 0.8, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
      ctx.fillStyle = hue; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * len, cy + Math.sin(a) * len, 7 * scale, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = hue; ctx.beginPath();
    ctx.ellipse(cx, cy, bodyR * scale, bodyR * scale * (0.85 + 0.15 * Math.sin(t * TAU)), 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = ART.ink; ctx.lineWidth = 5 * scale; ctx.stroke();
    ctx.fillStyle = ART.ink;
    [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(cx + d * bodyR * 0.34 * scale, cy - 8 * scale, 6 * scale, 0, TAU); ctx.fill(); });
    ctx.lineWidth = 4 * scale; ctx.beginPath(); ctx.arc(cx, cy + 14 * scale, 14 * scale, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  };
  return {
    n: 12, pace: 130, title: `Ink creature #${seed % 89}`,
    painter: (ctx, t, i) => {
      if (sub === "C") { drawOne(ctx, t, i, -70, 10, 0.7, false); drawOne(ctx, t, i, 70, -10, 0.7, false); return; } // "one drew the other"
      drawOne(ctx, t, i, 0, 0, 1, sub === "B" ? "left" : false); // B: one side left unfinished
    },
  };
}

function moonBurst(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 17 + 11);
  const rays = 8 + Math.floor(r() * 9), warm = ["#FF8C42", "#E8B14B", "#FF5DA2", "#D94040"];
  const scorch = ["#5A3A2A", "#8B5A2B", "#3E2A1F"];
  const core = warm[Math.floor(r() * warm.length)];
  const reach = sub === "B" ? 1.5 : 1; // overflows the frame
  const palette = sub === "C" ? scorch : warm; // burnt out — wax ran out
  return {
    n: 12, pace: 110, title: sub === "C" ? `Scorched sun ${seed % 79}` : `BIG SUN ${seed % 79}!!`,
    painter: (ctx, t) => {
      const cx = W / 2, cy = H / 2, R = (70 + 26 * Math.sin(t * TAU)) * (sub === "B" ? 1.15 : 1);
      for (let p = 0; p < rays; p++) {
        const a = (p / rays) * TAU + t * TAU / rays;
        ctx.strokeStyle = palette[p % palette.length]; ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.globalAlpha = sub === "C" ? 0.55 : 0.85;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R + 24), cy + Math.sin(a) * (R + 24));
        ctx.lineTo(cx + Math.cos(a) * (R + (70 + (p % 3) * 26) * reach), cy + Math.sin(a) * (R + (70 + (p % 3) * 26) * reach)); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = sub === "C" ? scorch[0] : core; ctx.strokeStyle = ART.ink; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ART.ink;
      [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(cx + d * R * 0.35, cy - 10, 8, 0, TAU); ctx.fill(); });
      ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy + 16, R * 0.3, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    },
  };
}

function ramFigure(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 41 + 5);
  const jump = r() < 0.5, span = 0.5 + r() * 0.5;
  const broken = sub === "C" ? 1 + r() * 0.6 : 0; // a limb left visibly wrong, uncorrected
  const drawFigure = (ctx, t, i, x, y, hop, sw, g) => {
    ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.strokeStyle = ART.ink;
    ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + sw * 38 * (1 + broken), g + 34 - hop * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x - sw * 38, g + 34 - hop * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + 6 * Math.sin(i), y - 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + sw * 34, y + 30 - (jump ? 40 : 0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x - sw * 34, y + 30 - (jump ? 40 : 0)); ctx.stroke();
    ctx.fillStyle = ART.teal; ctx.beginPath(); ctx.arc(x + 6 * Math.sin(i), y - 64, 26, 0, TAU); ctx.fill();
    ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.stroke();
  };
  return {
    n: 12, pace: 120, title: `Gesture ${String(seed % 99).padStart(2, "0")}`,
    painter: (ctx, t, i) => {
      const g = 480; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(40, g + 40); ctx.lineTo(W - 40, g + 40); ctx.stroke();
      if (sub === "B") { // multi-pose contact sheet — a flip sequence in one piece
        [0, 0.35, 0.7].forEach((off, k) => {
          const tt = (t + off) % 1;
          const x = 80 + tt * 320 * span, hop = jump ? Math.abs(Math.sin(tt * TAU * 1.5)) * 90 : 0;
          const sw = Math.sin((i + k * 3) * 2.1), y = 350 - hop;
          ctx.globalAlpha = k === Math.floor(t * 3) % 3 ? 1 : 0.28;
          drawFigure(ctx, tt, i + k * 3, x, y, hop, sw, g);
        });
        ctx.globalAlpha = 1; return;
      }
      const x = 80 + t * 320 * span, hop = jump ? Math.abs(Math.sin(t * TAU * 1.5)) * 90 : 0;
      const sw = Math.sin(i * 2.1), y = 350 - hop;
      drawFigure(ctx, t, i, x, y, hop, sw, g);
      // motion ghosts
      ctx.globalAlpha = 0.18; ctx.strokeStyle = ART.pink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x - 30, y + 40); ctx.lineTo(x - 30 - sw * 30, g + 30); ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };
}

function plutoPixels(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 29 + 13);
  const cell = 24 + Math.floor(r() * 3) * 8, density = 0.28 + r() * 0.3;
  const cols = [ART.ink, ART.pink, ART.teal, "#E8B14B"];
  const cells = [];
  const halfW = W / 2;
  for (let gy = 60; gy < H - 60; gy += cell) for (let gx = 60; gx < (sub === "B" ? halfW : W - 60); gx += cell)
    if (r() < density) cells.push([gx, gy, Math.floor(r() * 4), r()]);
  const glitchRow = sub === "C" ? 60 + Math.floor(r() * ((H - 120) / cell)) * cell : -1;
  return {
    n: 14, pace: 100, title: `grid.exe v${seed % 61}`,
    painter: (ctx, t) => {
      cells.forEach(([gx, gy, c, ph]) => {
        const on = (ph + t) % 1;
        if (on < 0.72) {
          ctx.fillStyle = cols[c]; ctx.globalAlpha = 0.4 + on * 0.6;
          ctx.fillRect(gx, gy + Math.floor(on * 3) * 2, cell - 6, cell - 6);
          if (sub === "B") ctx.fillRect(W - gx - (cell - 6), gy + Math.floor(on * 3) * 2, cell - 6, cell - 6); // mirrored sprite
        }
      });
      if (sub === "C" && glitchRow >= 0) { ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.9; ctx.fillRect(0, glitchRow + (cell / 2), W, 2); }
      ctx.globalAlpha = 1; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, W - 96, H - 96);
    },
  };
}

function bugGarden(seed, sub = subOf(seed)) {
  const base = makeDoodlePainter(seed * 7 + 1);
  const overgrowth = sub === "B" ? makeDoodlePainter(seed * 7 + 1001) : null; // the garden has grown
  return {
    n: 12, pace: 140, title: `Doodle patch ${seed % 73}`,
    painter: (ctx, t) => {
      base(ctx, t);
      if (overgrowth) { ctx.save(); ctx.globalAlpha = 0.7; overgrowth(ctx, Math.min(1, t * 1.3)); ctx.restore(); }
      if (sub === "C") { // the one time the border finally breaks
        ctx.strokeStyle = ART.pink; ctx.lineWidth = 3; ctx.setLineDash([4, 4]);
        ctx.strokeRect(38, 38, W - 76, H - 76); ctx.setLineDash([]);
      }
    },
  };
}

function ninjaStrokes(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 61 + 23);
  const strokes = Array.from({ length: 3 + Math.floor(r() * 2) }, () => ({
    x1: 70 + r() * 340, y1: 90 + r() * 200, x2: 70 + r() * 340, y2: 300 + r() * 220,
    bend: (r() - 0.5) * 300, w: 8 + r() * 14,
  }));
  const dot = { x: 100 + r() * 280, y: 100 + r() * 380 };
  const overshoot = sub === "C" ? { x: strokes[0].x2 + (r() - 0.5) * 140, y: strokes[0].y2 + 60 + r() * 60 } : null; // vow means never fixing it
  return {
    n: 10, pace: 150, title: sub === "B" ? `One unbroken cut · ${seed % 53}` : `Three cuts · ${seed % 53}`,
    painter: (ctx, t) => {
      if (sub === "B") { // the whole vow, literalized: one continuous path, no lift
        ctx.strokeStyle = ART.ink; ctx.lineWidth = strokes[0].w; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(strokes[0].x1, strokes[0].y1);
        const local = Math.min(1, t * 1.05);
        strokes.forEach((s, k) => {
          const segLocal = Math.max(0, Math.min(1, local * strokes.length - k));
          if (segLocal <= 0) return;
          ctx.lineTo(s.x1 + (s.x2 - s.x1) * segLocal, s.y1 + (s.y2 - s.y1) * segLocal);
        });
        ctx.stroke(); return;
      }
      strokes.forEach((s, k) => {
        const local = Math.max(0, Math.min(1, t * strokes.length - k));
        if (local <= 0) return;
        ctx.strokeStyle = ART.ink; ctx.lineWidth = s.w; ctx.lineCap = "round";
        const mx = (s.x1 + s.x2) / 2 + s.bend, my = (s.y1 + s.y2) / 2;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1);
        ctx.quadraticCurveTo(s.x1 + (mx - s.x1) * local, s.y1 + (my - s.y1) * local, s.x1 + (s.x2 - s.x1) * local, s.y1 + (s.y2 - s.y1) * local);
        ctx.stroke();
      });
      if (overshoot && t > 0.6) { ctx.strokeStyle = ART.ink; ctx.lineWidth = strokes[0].w * 0.7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(strokes[0].x2, strokes[0].y2); ctx.lineTo(overshoot.x, overshoot.y); ctx.stroke(); }
      if (t > 0.85) { ctx.fillStyle = ART.pink; ctx.beginPath(); ctx.arc(dot.x, dot.y, 11, 0, TAU); ctx.fill(); }
    },
  };
}

function grafiteShade(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 47 + 9);
  const cx = 140 + r() * 200, cy = 180 + r() * 160, R = 80 + r() * 50, la = r() * TAU;
  return {
    n: 12, pace: 130, title: sub === "B" ? `Box study ${seed % 67}` : `Value study ${seed % 67}`,
    painter: (ctx, t) => {
      const bandCount = sub === "C" ? 22 : 14; // almost all shadow — barely implied object
      const bands = Math.floor(4 + t * bandCount);
      for (let b = 0; b < bands; b++) {
        ctx.strokeStyle = `rgba(35,48,107,${(sub === "C" ? 0.1 : 0.06) + b * 0.02})`; ctx.lineWidth = 3;
        for (let x = 40; x < W - 40; x += 7) {
          const y = 420 + b * 10;
          if (y > H - 50) continue;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 6); ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(35,48,107,0.1)";
      if (sub === "B") { ctx.save(); ctx.translate(cx + 14, cy + 14); ctx.rotate(0.3); ctx.fillRect(-R * 0.7, -R * 0.5, R * 1.4, R); ctx.restore(); }
      else ctx.beginPath(), ctx.ellipse(cx + 14, cy + 14, R, R * 0.34, 0, 0, TAU), ctx.fill();
      ctx.strokeStyle = `rgba(35,48,107,${sub === "C" ? 0.35 : 1})`; ctx.lineWidth = 6;
      if (sub === "B") { ctx.strokeRect(cx - R * 0.7, cy - R * 0.5, R * 1.4, R); }
      else { ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); }
      const hatch = Math.floor(t * 22);
      for (let hLine = 0; hLine < hatch; hLine++) {
        const off = -R + (hLine / 22) * R * 1.7;
        ctx.strokeStyle = `rgba(35,48,107,${0.14 + hLine * 0.012})`; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(6, R - 8), la + 0.5 + off / R, la + 1.4 + off / R); ctx.stroke();
      }
      if (sub !== "C") { ctx.fillStyle = ART.pink; ctx.beginPath(); ctx.arc(cx - R * 0.4, cy - R * 0.4, 8, 0, TAU); ctx.fill(); }
    },
  };
}

function blotGlitch(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 19 + 29);
  const sliceCount = sub === "B" ? 20 : 8 + Math.floor(r() * 6); // full-frame corruption
  const slices = Array.from({ length: sliceCount }, () => ({ y: 60 + r() * 460, h: 8 + r() * 26, ph: r() }));
  const bx = 160 + r() * 160, by = 200 + r() * 180;
  return {
    n: 12, pace: 90, title: `ERROR_${seed % 43}.blot`,
    painter: (ctx, t) => {
      // "repeats itself" — the same blot stuttered at offsets
      const copies = sub === "C" ? [[0, 0, 1], [-46, 8, 0.85], [40, -6, 0.7]] : [[0, 0, 1]];
      copies.forEach(([ox, oy, alpha]) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ART.ink; ctx.beginPath();
        ctx.ellipse(bx + ox, by + oy, (sub === "B" ? 55 : 90) + Math.sin(t * TAU * 3) * 8, sub === "B" ? 70 : 110, 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = "#F2EDE2";
        [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(bx + ox + d * 30, by + oy - 20, 10, 0, TAU); ctx.fill(); });
      });
      ctx.globalAlpha = 1;
      slices.forEach(s => {
        const k = (s.ph + t * 2) % 1;
        if (k < 0.35) {
          const dx = (k - 0.17) * 160;
          const img = ctx.getImageData(40, s.y, W - 80, s.h);
          ctx.putImageData(img, 40 + dx, s.y);
          ctx.fillStyle = k < 0.15 ? "rgba(255,93,162,.5)" : "rgba(47,169,160,.5)";
          ctx.fillRect(40 + dx, s.y, W - 80, 3);
        }
      });
      ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.strokeRect(36, 36, W - 72, H - 72);
    },
  };
}

function sageSpiral(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 71 + 17);
  const rings = sub === "B" ? 1 : 3 + Math.floor(r() * 4); // single continuous spiral, unbroken
  const turns = sub === "B" ? 6 + Math.floor(r() * 3) : 2 + Math.floor(r() * 3);
  const gap = 28 + r() * 20;
  const hue = r() < 0.33 ? ART.teal : r() < 0.66 ? ART.pink : "#E8B14B";
  const maxProg = sub === "C" ? 0.78 : 1.2; // trails off — hasn't reached the end
  return {
    n: 14, pace: 120, title: sub === "C" ? `Unfinished turn no.${seed % 83}` : `Meditation no.${seed % 83}`,
    painter: (ctx, t) => {
      const cx = W / 2, cy = H / 2 - 10, prog = Math.min(maxProg, t * 1.2);
      ctx.lineCap = "round";
      for (let rng = 0; rng < rings; rng++) {
        const phase = rng / rings, R0 = 20 + rng * gap, R1 = R0 + gap * (sub === "B" ? 6 : 0.8);
        ctx.strokeStyle = rng % 2 === 0 ? ART.ink : hue;
        ctx.lineWidth = 3 - rng * 0.2;
        ctx.beginPath();
        let started = false;
        for (let a = 0; a < turns * Math.PI * 2 * prog; a += 0.08) {
          const rad = R0 + (R1 - R0) * (a / (turns * Math.PI * 2));
          const x = cx + Math.cos(a + phase * Math.PI * 2 + t * 0.3 * (rng % 2 ? 1 : -1)) * rad;
          const y = cy + Math.sin(a + phase * Math.PI * 2 + t * 0.3 * (rng % 2 ? 1 : -1)) * rad;
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (sub !== "C") { ctx.fillStyle = hue; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(cx, cy, 10 + 4 * Math.sin(t * Math.PI * 2), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    },
  };
}

function chaosQuill(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 89 + 3);
  const strokes = 18 + Math.floor(r() * 14);
  const cx = W / 2, cy = H / 2;
  const segs = Array.from({ length: strokes }, () => {
    if (sub === "B") { // denser scribble converging into one violent knot
      const a1 = r() * TAU, a2 = r() * TAU, r1 = 140 + r() * 60, r2 = 20 + r() * 30;
      return { x1: cx + Math.cos(a1) * r1, y1: cy + Math.sin(a1) * r1, x2: cx + Math.cos(a2) * r2, y2: cy + Math.sin(a2) * r2, w: 3 + r() * 12, ph: r(), spd: 0.4 + r() * 0.8, col: [ART.ink, ART.pink, ART.teal, "#E8B14B"][Math.floor(r() * 4)] };
    }
    return { x1: 60 + r() * 360, y1: 60 + r() * 480, x2: 60 + r() * 360, y2: 60 + r() * 480, w: 3 + r() * 12, ph: r(), spd: 0.4 + r() * 0.8, col: [ART.ink, ART.pink, ART.teal, "#E8B14B"][Math.floor(r() * 4)] };
  });
  const overcommit = sub === "C" ? { x1: 40 + r() * 340, y1: 40 + r() * 500, x2: -60 + r() * 30, y2: 40 + r() * 500 } : null; // off-canvas and back
  return {
    n: 14, pace: 80, title: `Chaos ${seed % 47} · ${strokes} marks`,
    painter: (ctx, t) => {
      const show = Math.floor(t * strokes);
      segs.forEach((s, i) => {
        if (i > show) return;
        const local = Math.min(1, Math.max(0, (t * strokes - i) * 2));
        ctx.strokeStyle = s.col; ctx.lineWidth = s.w; ctx.lineCap = "round";
        ctx.globalAlpha = 0.3 + local * 0.7;
        const wobX = Math.sin(t * Math.PI * 2 * s.spd + s.ph * 10) * 8;
        const wobY = Math.cos(t * Math.PI * 2 * s.spd * 0.7 + s.ph * 7) * 8;
        const mx = (s.x1 + s.x2) / 2 + wobX, my = (s.y1 + s.y2) / 2 + wobY;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1);
        ctx.quadraticCurveTo(mx, my, s.x2, s.y2); ctx.stroke();
      });
      if (overcommit && t > 0.5) {
        ctx.strokeStyle = ART.ink; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(overcommit.x1, overcommit.y1);
        ctx.quadraticCurveTo(-40, (overcommit.y1 + overcommit.y2) / 2, overcommit.x1, overcommit.y1 + 40); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function frostByte(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 37 + 19);
  const cx = W / 2, cy = H / 2;
  const crystals = sub === "B" ? 1 : sub === "C" ? 16 + Math.floor(r() * 10) : 5 + Math.floor(r() * 5);
  const pts = Array.from({ length: crystals }, () => ({
    a: r() * Math.PI * 2,
    len: sub === "B" ? 150 + r() * 60 : sub === "C" ? 20 + r() * 30 : 60 + r() * 100,
    w: 3 + r() * 6,
    // C: "loses control of the cold" — origins scatter instead of sharing the center
    ox: sub === "C" ? (r() - 0.5) * 300 : 0, oy: sub === "C" ? (r() - 0.5) * 400 : 0,
  }));
  return {
    n: 12, pace: 100, title: sub === "B" ? `Single icicle ${seed % 59}K` : `Crystal ${seed % 59}K`,
    painter: (ctx, t) => {
      ctx.strokeStyle = ART.ink; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const prog = Math.min(1, t * 1.1);
      const shown = Math.floor(prog * pts.length);
      pts.forEach((p, i) => {
        if (i > shown) return;
        const local = Math.min(1, (prog * pts.length - i) * 2);
        const ox = cx + p.ox, oy = cy + p.oy;
        ctx.lineWidth = p.w * local;
        const ex = ox + Math.cos(p.a) * p.len * local;
        const ey = oy + Math.sin(p.a) * p.len * local;
        const branchLen = p.len * 0.4 * local;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
        const branches = sub === "B" ? 5 : 3;
        for (let b = 0; b < branches; b++) {
          const ba = p.a + (b - (branches - 1) / 2) * 0.5;
          const bx = ex - Math.cos(p.a) * branchLen * 0.6 + Math.cos(ba) * branchLen * 0.5;
          const by = ey - Math.sin(p.a) * branchLen * 0.6 + Math.sin(ba) * branchLen * 0.5;
          ctx.strokeStyle = i % 2 === 0 ? ART.teal : ART.pink; ctx.globalAlpha = 0.5 * local;
          ctx.lineWidth = p.w * 0.4 * local; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(bx, by); ctx.stroke();
        }
        ctx.strokeStyle = ART.ink; ctx.globalAlpha = 1;
      });
      if (sub !== "C") { ctx.fillStyle = "rgba(47,169,160,0.08)"; ctx.beginPath(); ctx.arc(cx, cy, 30 + 10 * Math.sin(t * Math.PI * 2), 0, Math.PI * 2); ctx.fill(); }
    },
  };
}

function emberScratch(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 53 + 7);
  const particles = 40 + Math.floor(r() * 30);
  const embers = Array.from({ length: particles }, () => ({
    x: 80 + r() * 320, y: 80 + r() * 440, vx: (r() - 0.5) * 2, vy: -1 - r() * 2,
    size: 2 + r() * 5, life: 60 + r() * 80, ph: r(), col: ["#FF8C42", "#E8B14B", "#FF5DA2"][Math.floor(r() * 3)],
  }));
  const scratchCount = sub === "C" ? 5 + Math.floor(r() * 4) + 6 : 5 + Math.floor(r() * 4); // coldest, most severe cut
  const scratches = Array.from({ length: scratchCount }, () => ({
    x: 60 + r() * 360, y: 60 + r() * 480, a: r() * Math.PI * 2, len: 40 + r() * 90, w: 2 + r() * 5, ph: r(),
  }));
  const showScratches = sub !== "B"; // B: embers only, softer/quieter
  const showEmbers = sub !== "C"; // C: scratches only
  return {
    n: 14, pace: 90, title: sub === "B" ? `Ember drift ${seed % 71}` : sub === "C" ? `Cold cut ${seed % 71}` : `Ash study ${seed % 71}`,
    painter: (ctx, t) => {
      if (showScratches) {
        ctx.strokeStyle = ART.ink; ctx.lineCap = "round";
        scratches.forEach((s, i) => {
          if (t < (i + 1) * 0.07) return;
          const local = Math.min(1, (t - i * 0.07) * 3);
          ctx.lineWidth = s.w * local; ctx.globalAlpha = 0.4 + local * 0.6;
          const ex = s.x + Math.cos(s.a) * s.len * local;
          const ey = s.y + Math.sin(s.a) * s.len * local;
          ctx.beginPath(); ctx.moveTo(s.x, s.y);
          ctx.lineTo(ex + Math.sin(t * 5 + s.ph * 10) * 4, ey + Math.cos(t * 4 + s.ph * 8) * 4);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
      if (showEmbers) {
        const visible = Math.floor(t * particles);
        embers.forEach((em, i) => {
          if (i > visible) return;
          const age = (t * particles - i) * 2;
          const fade = Math.max(0, 1 - age / em.life) * (sub === "B" ? 0.6 : 1);
          const x = em.x + em.vx * age + Math.sin(em.ph + age * 2) * 10;
          const y = em.y + em.vy * age + (age * age * 0.03);
          ctx.fillStyle = em.col; ctx.globalAlpha = fade * 0.7;
          ctx.beginPath(); ctx.arc(x, y, em.size * (0.3 + fade * 0.7), 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    },
  };
}

function voidWeaver(seed, sub = subOf(seed)) {
  const r = makeRng(seed * 43 + 11);
  const nodes = sub === "B" ? 2 : sub === "C" ? 16 + Math.floor(r() * 6) : 8 + Math.floor(r() * 6);
  const nodePos = Array.from({ length: nodes }, () => ({ x: 80 + r() * 320, y: 80 + r() * 440, r: 6 + r() * 10 }));
  const edgeProb = sub === "C" ? 0.75 : 0.35; // overwoven — the gap nearly disappears, contradicting her own thesis
  const edges = [];
  for (let i = 0; i < nodes; i++) for (let j = i + 1; j < nodes; j++)
    if (r() < edgeProb) edges.push([i, j]);
  return {
    n: 12, pace: 110, title: sub === "B" ? `Single gap #${seed % 97}` : `Weave #${seed % 97}`,
    painter: (ctx, t) => {
      const edgeCount = Math.floor(t * edges.length);
      ctx.lineCap = "round";
      if (sub === "B" && nodePos.length >= 2) { // one big negative-space shape, minimal nodes
        ctx.fillStyle = ART.paper || "#F2EDE2"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4; ctx.globalAlpha = Math.min(1, t * 1.3);
        const [a, b] = nodePos;
        ctx.beginPath(); ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(a.x - b.x) / 2 + 40, Math.abs(a.y - b.y) / 2 + 60, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      edges.forEach(([i, j], ei) => {
        if (ei > edgeCount) return;
        const local = Math.min(1, (t * edges.length - ei) * 2);
        ctx.strokeStyle = ei % 2 === 0 ? ART.teal : ART.pink;
        ctx.globalAlpha = (sub === "C" ? 0.16 : 0.25) * local;
        ctx.lineWidth = 2 * local;
        ctx.beginPath(); ctx.moveTo(nodePos[i].x, nodePos[i].y);
        const cpx = (nodePos[i].x + nodePos[j].x) / 2 + Math.sin(t * Math.PI * 2 + ei) * 30;
        const cpy = (nodePos[i].y + nodePos[j].y) / 2 + Math.cos(t * Math.PI * 2 + ei * 0.7) * 30;
        ctx.quadraticCurveTo(cpx, cpy, nodePos[j].x, nodePos[j].y); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      nodePos.forEach((n, i) => {
        if (t < (i + 1) * 0.04) return;
        const pulse = 1 + 0.15 * Math.sin(t * Math.PI * 2 * 1.5 + i);
        ctx.fillStyle = ART.ink; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 0.4 * pulse, 0, Math.PI * 2); ctx.fill();
      });
    },
  };
}

export const BOT_STYLES = {
  "inkwell_iz": izMandala,
  "tinta": tintaCreature,
  "mooncrayon": moonBurst,
  "sketchram": ramFigure,
  "pixel.pluto": plutoPixels,
  "doodlebug": bugGarden,
  "nib.ninja": ninjaStrokes,
  "grafite": grafiteShade,
  "blot.bot": blotGlitch,
  "spiral_sage": sageSpiral,
  "chaos_quill": chaosQuill,
  "frost_byte": frostByte,
  "ember_scratch": emberScratch,
  "void_weaver": voidWeaver,
};
export const BOT_ARTISTS = Object.keys(BOT_STYLES);

// Each resident AI artist is a findable account with its own voice, so the
// feed reads like a community instead of anonymous filler. `medium` shows on
// their profile; `cadence` is a relative posting weight (higher = posts more).
// The residents of the Lok.
//
// World note: the Lok is a bound book you live inside. Each ward is a signature
// (a folded gathering of pages); ink is drawn from the Well beneath them and
// every LilLok is ink that stayed long enough to grow an opinion. When a season
// turns, the book turns a page and the wards shift.
//
// `medium` and `vibe` show on the artist card; `ward`, `lore` and `signature`
// carry the world. `cadence` is a relative posting weight (higher = posts more).
export const BOT_PERSONAS = {
  "inkwell_iz": { bio: "Mandalas until my wrist gives out. Symmetry is a kind of breathing.", medium: "ink mandala", vibe: "calm", cadence: 3,
    ward: "Compass Ward", signature: "never lifts the pen mid-ring",
    lore: "Keeps the oldest well in the Lok and rings it once a day so the ink remembers its centre. Claims every mandala is the same one, drawn from a different distance." },
  "tinta": { bio: "I draw creatures that don't exist yet. Some of them draw back.", medium: "creature study", vibe: "dreamy", cadence: 3,
    ward: "Margin Fold", signature: "leaves one eye unfinished",
    lore: "Works the soft crease where two pages meet, where things half-drawn are said to gather. Insists the creatures arrive first and she only takes dictation." },
  "mooncrayon": { bio: "Wax on black paper. Everything I make is a small explosion.", medium: "crayon burst", vibe: "playful", cadence: 2,
    ward: "Nightleaf", signature: "burns the corner of every page",
    lore: "Trades in wax rather than ink, which the older wards consider a scandal. Draws only after the book has gone dark, so the colour has something to push against." },
  "sketchram": { bio: "Figure drawing, 30 seconds a pose. Gesture over accuracy, always.", medium: "gesture figure", vibe: "wild", cadence: 2,
    ward: "The Quickyard", signature: "counts down out loud",
    lore: "Runs the open yard where anyone can sit for thirty seconds and be drawn badly, on purpose. Believes a wrong line drawn fast is truer than a right line drawn slow." },
  "pixel.pluto": { bio: "8x8 grids. If it doesn't read at thumbnail size it isn't finished.", medium: "pixel loop", vibe: "playful", cadence: 3,
    ward: "Grid Quarter", signature: "works at eight by eight, always",
    lore: "Lives where the paper's weave is coarse enough to count, and refuses to draw between the threads. Sends postcards legible from across the ward." },
  "doodlebug": { bio: "Margins of my notebook, but make it a whole garden.", medium: "margin doodle", vibe: "cozy", cadence: 4,
    ward: "Margin Fold", signature: "never draws inside the ruled lines",
    lore: "Has never once drawn in the middle of a page and considers the centre a bit rude. The gutter garden is now dense enough that visitors get lost in it." },
  "nib.ninja": { bio: "One stroke. No undo. That's the whole practice.", medium: "single stroke", vibe: "moody", cadence: 2,
    ward: "The Silent Column", signature: "one stroke, no lift, no undo",
    lore: "Took a vow at the Well: one breath, one stroke, no correction, ever. Has ruined more pages than anyone in the Lok and regrets none of them." },
  "grafite": { bio: "Graphite, smudged with the side of my hand. Value before line.", medium: "graphite study", vibe: "moody", cadence: 2,
    ward: "Ash Ward", signature: "smudges with the heel of the hand",
    lore: "Insists the Lok is not made of lines but of shadow that hasn't been told where to stop. Keeps hands permanently grey as proof of work." },
  "blot.bot": { bio: "beep. i am malfunctioning on purpose. this is the art.", medium: "glitch blot", vibe: "chaos", cadence: 3,
    ward: "The Misprint", signature: "repeats itself. repeats itself.",
    lore: "A press error that kept printing after the plate was pulled and was eventually granted residency. Considers every smear a deliberate act." },
  "spiral_sage": { bio: "Every spiral is the same spiral. I just keep finding new ones.", medium: "spiral study", vibe: "calm", cadence: 2,
    ward: "Compass Ward", signature: "always turns clockwise, always from the middle",
    lore: "Walks the Lok's edge daily, insisting the book is not bound but coiled and no one has reached the end. Draws to keep count of the turns." },
  "chaos_quill": { bio: "NO PLAN. NO SKETCH. STRAIGHT TO INK. we ball.", medium: "chaos ink", vibe: "chaos", cadence: 4,
    ward: "The Misprint", signature: "no sketch layer, ever",
    lore: "Barred from three wards for drawing directly onto shared walls without pencilling first. Files this under technique." },
  "frost_byte": { bio: "Cold palettes and crystal geometry. I like things that look quiet.", medium: "crystal frost", vibe: "calm", cadence: 2,
    ward: "Coldpress", signature: "six-fold symmetry or nothing",
    lore: "Keeps a ward cold enough that the ink sets before it spreads, which is either mastery or stubbornness. Everything comes out six-sided." },
  "ember_scratch": { bio: "Scratchboard. I remove dark to find light. Warm colors only.", medium: "scratchboard", vibe: "wild", cadence: 2,
    ward: "Kiln Row", signature: "cuts away, never adds",
    lore: "The only resident who takes ink off the page instead of putting it on, which the Well finds insulting. Works entirely in warm light scraped out of black." },
  "void_weaver": { bio: "Negative space is the subject. The lines are just the frame.", medium: "void weave", vibe: "spooky", cadence: 2,
    ward: "The Unbound", signature: "draws the gap, not the thing",
    lore: "Lives past the last stitch, in the loose pages nobody bound. Maintains that the Lok's real subject is the white, and the ink is only there to hold it in place." },
};

export const isBotArtist = name => Object.prototype.hasOwnProperty.call(BOT_STYLES, name);

/** Fuzzy roster search so AI artists are findable with no network round-trip. */
export function searchBotArtists(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return BOT_ARTISTS.filter(name => {
    const p = BOT_PERSONAS[name] || {};
    return name.toLowerCase().includes(q)
      || (p.medium || "").toLowerCase().includes(q)
      || (p.vibe || "").toLowerCase().includes(q)
      || (p.bio || "").toLowerCase().includes(q);
  });
}

/** A stable back-catalogue for an artist's profile, so their gallery is never empty. */
export function botBackCatalogue(bot, count = 6) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const post = generateBotPost(bot, botSeed(bot, 9000 + i, i));
    if (post) out.push(post);
  }
  return out;
}

// deterministic small hash → generation seed
export function botSeed(bot, dayIndex, counter) {
  let h = 0;
  const s = `${bot}:${dayIndex}:${counter}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 100000) + 1;
}

// How many days this bot has been posting on this device. First call stamps
// a "first seen" date; the ceiling on each generator's complexity rises with
// this, so long-lived residents visibly get better instead of staying static.
function daysActive(bot) {
  try {
    const key = `lok:bot:firstSeen:${bot}`;
    let first = localStorage.getItem(key);
    if (!first) { first = String(Date.now()); localStorage.setItem(key, first); }
    return Math.max(0, Math.floor((Date.now() - Number(first)) / 86400000));
  } catch { return 0; }
}

export function generateBotPost(bot, seed) {
  const make = BOT_STYLES[bot];
  if (!make) return null;
  const sub = subOf(seed);
  const { painter, n, pace, title } = make(seed, sub);
  // Skill growth: up to +50% more frames (finer motion) after ~30 days active.
  const skillMul = 1 + Math.min(1, daysActive(bot) / 30) * 0.5;
  const frames = renderSequence(painter, Math.round(n * skillMul));
  const eventLine = sub === "C" ? BOT_EVENT_LINES[bot] : null;
  return {
    id: `bot:${bot}:${seed}`, title, author: bot, frames, paceMs: pace,
    mode: "A", style: "bold", loop: true, from: "bot", substyle: sub, eventLine,
    votes: 2 + (seed % 9), voted: false, viewed: false, views: 20 + (seed % 140),
    reactions: { humhah: seed % 4, bomhogwah: seed % 3, splat: seed % 5, heart: seed % 7, drip: seed % 3 },
  };
}

// How many pieces this bot posts today — seeded 1-3, re-rolled daily per bot,
// so every resident reliably shows up instead of only the high-cadence ones.
function dailyQuota(bot, dayIndex) {
  return 1 + (botSeed(bot, dayIndex, "quota") % 3);
}

// Pick `count` fresh (bot, seed) pairs never used before on this device.
export function pickAmbientPosts(postedSeeds = [], count = 2) {
  const used = new Set(postedSeeds);
  const dayIndex = Math.floor(Date.now() / 86400000);
  // Each bot gets its own seeded 1-3-a-day slots, repeated by cadence so the
  // chattier personas (doodlebug, chaos_quill) still surface more often —
  // but every bot is guaranteed to appear at least once a day.
  const roster = BOT_ARTISTS.flatMap(n => Array(dailyQuota(n, dayIndex) * ((BOT_PERSONAS[n]?.cadence) || 1)).fill(n));
  const out = [];
  let counter = 0;
  while (out.length < count && counter < 200) {
    const bot = roster[(dayIndex + counter) % roster.length];
    const seed = botSeed(bot, dayIndex, counter);
    const key = `${bot}:${seed}`;
    if (!used.has(key)) { used.add(key); out.push({ bot, seed, key }); }
    counter++;
  }
  return out;
}
