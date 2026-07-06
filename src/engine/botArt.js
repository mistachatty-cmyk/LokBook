// botArt — generative styles for the resident seed artists.
// Every artist has a distinct parametric generator; a seed drives all the
// randomness, so each (artist, seed) pair is a unique piece and can never be
// re-posted. moss.ink is NOT here — it only posts curated, hand-tuned painters.
import { W, H } from "../constants.jsx";
import { ART } from "../theme/theme.js";
import { makeRng, makeDoodlePainter, renderSequence } from "./draw.jsx";

const TAU = Math.PI * 2;

// ---------- per-artist generators: (seed) => {painter(ctx,t,i), n, pace, title} ----------

function izMandala(seed) {
  const r = makeRng(seed * 31 + 7);
  const petals = 5 + Math.floor(r() * 7), rings = 2 + Math.floor(r() * 3), rot = r() * TAU;
  const cols = [ART.ink, ART.teal, "#7A4FBF"];
  return {
    n: 14, pace: 110, title: `Mandala study no.${seed % 97}`,
    painter: (ctx, t) => {
      const cx = W / 2, cy = H / 2 - 20, grow = 0.25 + 0.75 * t;
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

function tintaCreature(seed) {
  const r = makeRng(seed * 53 + 3);
  const arms = 4 + Math.floor(r() * 4), bodyR = 55 + r() * 40, hue = r() < 0.5 ? ART.pink : ART.teal;
  const wob = 0.6 + r() * 0.8;
  return {
    n: 12, pace: 130, title: `Ink creature #${seed % 89}`,
    painter: (ctx, t, i) => {
      const cx = W / 2 + Math.sin(t * TAU) * 30, cy = H / 2 + Math.cos(t * TAU * wob) * 24;
      ctx.strokeStyle = ART.ink; ctx.lineWidth = 6; ctx.lineCap = "round";
      for (let a0 = 0; a0 < arms; a0++) {
        const a = (a0 / arms) * TAU + Math.sin(i * 1.7) * 0.3;
        const len = bodyR + 60 + Math.sin(t * TAU * 2 + a0) * 26;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * bodyR * 0.8, cy + Math.sin(a) * bodyR * 0.8);
        ctx.quadraticCurveTo(cx + Math.cos(a + 0.5) * len * 0.8, cy + Math.sin(a + 0.5) * len * 0.8, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx.stroke();
        ctx.fillStyle = hue; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * len, cy + Math.sin(a) * len, 7, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = hue; ctx.beginPath();
      ctx.ellipse(cx, cy, bodyR, bodyR * (0.85 + 0.15 * Math.sin(t * TAU)), 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = ART.ink;
      [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(cx + d * bodyR * 0.34, cy - 8, 6, 0, TAU); ctx.fill(); });
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy + 14, 14, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    },
  };
}

function moonBurst(seed) {
  const r = makeRng(seed * 17 + 11);
  const rays = 8 + Math.floor(r() * 9), warm = ["#FF8C42", "#E8B14B", "#FF5DA2", "#D94040"];
  const core = warm[Math.floor(r() * warm.length)];
  return {
    n: 12, pace: 110, title: `BIG SUN ${seed % 79}!!`,
    painter: (ctx, t) => {
      const cx = W / 2, cy = H / 2, R = 70 + 26 * Math.sin(t * TAU);
      for (let p = 0; p < rays; p++) {
        const a = (p / rays) * TAU + t * TAU / rays;
        ctx.strokeStyle = warm[p % warm.length]; ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R + 24), cy + Math.sin(a) * (R + 24));
        ctx.lineTo(cx + Math.cos(a) * (R + 70 + (p % 3) * 26), cy + Math.sin(a) * (R + 70 + (p % 3) * 26)); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = core; ctx.strokeStyle = ART.ink; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ART.ink;
      [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(cx + d * R * 0.35, cy - 10, 8, 0, TAU); ctx.fill(); });
      ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy + 16, R * 0.3, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    },
  };
}

function ramFigure(seed) {
  const r = makeRng(seed * 41 + 5);
  const jump = r() < 0.5, span = 0.5 + r() * 0.5;
  return {
    n: 12, pace: 120, title: `Gesture ${String(seed % 99).padStart(2, "0")}`,
    painter: (ctx, t, i) => {
      const g = 480; ctx.strokeStyle = ART.ink; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(40, g + 40); ctx.lineTo(W - 40, g + 40); ctx.stroke();
      const x = 80 + t * 320 * span, hop = jump ? Math.abs(Math.sin(t * TAU * 1.5)) * 90 : 0;
      const sw = Math.sin(i * 2.1), y = 350 - hop;
      ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.strokeStyle = ART.ink;
      ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + sw * 38, g + 34 - hop * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x - sw * 38, g + 34 - hop * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + 6 * Math.sin(i), y - 34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + sw * 34, y + 30 - (jump ? 40 : 0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x - sw * 34, y + 30 - (jump ? 40 : 0)); ctx.stroke();
      ctx.fillStyle = ART.teal; ctx.beginPath(); ctx.arc(x + 6 * Math.sin(i), y - 64, 26, 0, TAU); ctx.fill();
      ctx.strokeStyle = ART.ink; ctx.lineWidth = 5; ctx.stroke();
      // motion ghosts
      ctx.globalAlpha = 0.18; ctx.strokeStyle = ART.pink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x - 30, y + 40); ctx.lineTo(x - 30 - sw * 30, g + 30); ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };
}

function plutoPixels(seed) {
  const r = makeRng(seed * 29 + 13);
  const cell = 24 + Math.floor(r() * 3) * 8, density = 0.28 + r() * 0.3;
  const cols = [ART.ink, ART.pink, ART.teal, "#E8B14B"];
  const cells = [];
  for (let gy = 60; gy < H - 60; gy += cell) for (let gx = 60; gx < W - 60; gx += cell)
    if (r() < density) cells.push([gx, gy, Math.floor(r() * 4), r()]);
  return {
    n: 14, pace: 100, title: `grid.exe v${seed % 61}`,
    painter: (ctx, t) => {
      cells.forEach(([gx, gy, c, ph]) => {
        const on = (ph + t) % 1;
        if (on < 0.72) {
          ctx.fillStyle = cols[c]; ctx.globalAlpha = 0.4 + on * 0.6;
          ctx.fillRect(gx, gy + Math.floor(on * 3) * 2, cell - 6, cell - 6);
        }
      });
      ctx.globalAlpha = 1; ctx.strokeStyle = ART.ink; ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, W - 96, H - 96);
    },
  };
}

function bugGarden(seed) {
  const base = makeDoodlePainter(seed * 7 + 1);
  return { n: 12, pace: 140, title: `Doodle patch ${seed % 73}`, painter: (ctx, t) => base(ctx, t) };
}

function ninjaStrokes(seed) {
  const r = makeRng(seed * 61 + 23);
  const strokes = Array.from({ length: 3 + Math.floor(r() * 2) }, () => ({
    x1: 70 + r() * 340, y1: 90 + r() * 200, x2: 70 + r() * 340, y2: 300 + r() * 220,
    bend: (r() - 0.5) * 300, w: 8 + r() * 14,
  }));
  const dot = { x: 100 + r() * 280, y: 100 + r() * 380 };
  return {
    n: 10, pace: 150, title: `Three cuts · ${seed % 53}`,
    painter: (ctx, t) => {
      strokes.forEach((s, k) => {
        const local = Math.max(0, Math.min(1, t * strokes.length - k));
        if (local <= 0) return;
        ctx.strokeStyle = ART.ink; ctx.lineWidth = s.w; ctx.lineCap = "round";
        const mx = (s.x1 + s.x2) / 2 + s.bend, my = (s.y1 + s.y2) / 2;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1);
        ctx.quadraticCurveTo(s.x1 + (mx - s.x1) * local, s.y1 + (my - s.y1) * local, s.x1 + (s.x2 - s.x1) * local, s.y1 + (s.y2 - s.y1) * local);
        ctx.stroke();
      });
      if (t > 0.85) { ctx.fillStyle = ART.pink; ctx.beginPath(); ctx.arc(dot.x, dot.y, 11, 0, TAU); ctx.fill(); }
    },
  };
}

function grafiteShade(seed) {
  const r = makeRng(seed * 47 + 9);
  const cx = 140 + r() * 200, cy = 180 + r() * 160, R = 80 + r() * 50, la = r() * TAU;
  return {
    n: 12, pace: 130, title: `Value study ${seed % 67}`,
    painter: (ctx, t) => {
      const bands = Math.floor(4 + t * 14);
      for (let b = 0; b < bands; b++) {
        ctx.strokeStyle = `rgba(35,48,107,${0.06 + b * 0.02})`; ctx.lineWidth = 3;
        for (let x = 40; x < W - 40; x += 7) {
          const y = 420 + b * 10;
          if (y > H - 50) continue;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 6); ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(35,48,107,0.1)"; ctx.beginPath(); ctx.ellipse(cx + 14, cy + 14, R, R * 0.34, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = ART.ink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      const hatch = Math.floor(t * 22);
      for (let hLine = 0; hLine < hatch; hLine++) {
        const off = -R + (hLine / 22) * R * 1.7;
        ctx.strokeStyle = `rgba(35,48,107,${0.14 + hLine * 0.012})`; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(6, R - 8), la + 0.5 + off / R, la + 1.4 + off / R); ctx.stroke();
      }
      ctx.fillStyle = ART.pink; ctx.beginPath(); ctx.arc(cx - R * 0.4, cy - R * 0.4, 8, 0, TAU); ctx.fill();
    },
  };
}

function blotGlitch(seed) {
  const r = makeRng(seed * 19 + 29);
  const slices = Array.from({ length: 8 + Math.floor(r() * 6) }, () => ({ y: 60 + r() * 460, h: 8 + r() * 26, ph: r() }));
  const bx = 160 + r() * 160, by = 200 + r() * 180;
  return {
    n: 12, pace: 90, title: `ERROR_${seed % 43}.blot`,
    painter: (ctx, t) => {
      ctx.fillStyle = ART.ink; ctx.beginPath();
      ctx.ellipse(bx, by, 90 + Math.sin(t * TAU * 3) * 8, 110, 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = "#F2EDE2";
      [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(bx + d * 30, by - 20, 10, 0, TAU); ctx.fill(); });
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
};
export const BOT_ARTISTS = Object.keys(BOT_STYLES);

// deterministic small hash → generation seed
export function botSeed(bot, dayIndex, counter) {
  let h = 0;
  const s = `${bot}:${dayIndex}:${counter}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 100000) + 1;
}

export function generateBotPost(bot, seed) {
  const make = BOT_STYLES[bot];
  if (!make) return null;
  const { painter, n, pace, title } = make(seed);
  const frames = renderSequence(painter, n);
  return {
    id: `bot:${bot}:${seed}`, title, author: bot, frames, paceMs: pace,
    mode: "A", style: "bold", loop: true, from: "bot",
    votes: 2 + (seed % 9), voted: false, viewed: false, views: 20 + (seed % 140),
    reactions: { humhah: seed % 4, bomhogwah: seed % 3, splat: seed % 5, heart: seed % 7, drip: seed % 3 },
  };
}

// Pick `count` fresh (bot, seed) pairs never used before on this device.
export function pickAmbientPosts(postedSeeds = [], count = 2) {
  const used = new Set(postedSeeds);
  const dayIndex = Math.floor(Date.now() / 86400000);
  const out = [];
  let counter = 0;
  while (out.length < count && counter < 200) {
    const bot = BOT_ARTISTS[(dayIndex + counter) % BOT_ARTISTS.length];
    const seed = botSeed(bot, dayIndex, counter);
    const key = `${bot}:${seed}`;
    if (!used.has(key)) { used.add(key); out.push({ bot, seed, key }); }
    counter++;
  }
  return out;
}
