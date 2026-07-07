// LokMind — the bot intelligence engine.
// Battle rivals and Rush racers get personalities, skill curves, taste-based
// voting, and rubber-band difficulty that keeps the player's win rate near
// 45–55% without ever feeling scripted. Session-scoped memory only; nothing
// here touches the save schema.

// ---------- personalities ----------
// One entry per BOT_NAMES handle. skill: baseline 0–1. curve: how their
// drawing progresses over the match clock. taste: what they vote for.
const ROSTER = [
  { name: "pixel.pluto", skill: 0.74, curve: "burst",   taste: { bold: 0.9, detail: 0.2, speed: 0.9 },
    chat: { start: ["First stroke wins. Watch.", "Already halfway done in my head."], mid: ["You're still sketching? Cute.", "Pace up, pace up."], win: ["Called it before the countdown ended.", "Speed IS style."], lose: ["Okay. That line was rude. Respect."] } },
  { name: "inkwell_iz", skill: 0.81, curve: "closer",  taste: { bold: 0.3, detail: 0.95, speed: 0.1 },
    chat: { start: ["I start slow. I finish loud.", "Details take time. I have exactly enough."], mid: ["The last ten seconds are mine.", "Don't look at my canvas yet."], win: ["Patience draws the cleanest line.", "Told you the ending mattered."], lose: ["Ran out of clock, not out of ideas."] } },
  { name: "doodlebug", skill: 0.55, curve: "streaky", taste: { bold: 0.6, detail: 0.5, speed: 0.5 },
    chat: { start: ["No plan. Best plan.", "Let's just see what happens!"], mid: ["Wait, I've got something. Maybe.", "Is that a dog or a cloud? Both."], win: ["Chaos wins again!!", "Even I didn't see that coming."], lose: ["Worth it for the weird middle part."] } },
  { name: "sketchram", skill: 0.68, curve: "steady",  taste: { bold: 0.5, detail: 0.7, speed: 0.4 },
    chat: { start: ["One line per second. Every second.", "Steady hands, steady clock."], mid: ["Right on schedule.", "Halfway. Exactly as planned."], win: ["Consistency is undefeated.", "The metronome takes it."], lose: ["Noted. Adjusting the plan."] } },
  { name: "tinta", skill: 0.86, curve: "closer",  taste: { bold: 0.8, detail: 0.8, speed: 0.3 },
    chat: { start: ["I only need one good idea.", "Quiet. I'm listening to the prompt."], mid: ["There it is. Now watch.", "The shape just told me what it wants."], win: ["The prompt chose me.", "Ink remembers who respects it."], lose: ["Yours had something mine didn't. Keep it."] } },
  { name: "mooncrayon", skill: 0.62, curve: "burst",   taste: { bold: 0.9, detail: 0.4, speed: 0.7 },
    chat: { start: ["Big shapes first, questions later!", "CRAYON MODE."], mid: ["More! Bigger! Rounder!", "My elbow is doing most of the work."], win: ["Moon logic prevails 🌙", "Big beats neat!"], lose: ["Your lines were louder than mine. Rare."] } },
  { name: "nib.ninja", skill: 0.78, curve: "streaky", taste: { bold: 0.4, detail: 0.9, speed: 0.8 },
    chat: { start: ["You won't see my strokes. Only the result.", "…"], mid: ["Three strikes. All landed.", "The canvas doesn't know what hit it."], win: ["Swift. Silent. Voted.", "The nib never misses twice."], lose: ["A ninja bows to a better blade."] } },
  { name: "grafite", skill: 0.71, curve: "steady",  taste: { bold: 0.7, detail: 0.6, speed: 0.5 },
    chat: { start: ["Pressure builds the line.", "Graphite doesn't rush."], mid: ["Layer by layer.", "Shading while you panic."], win: ["Weight of the lead, weight of the win.", "Solid. Like always."], lose: ["Smudged it. Happens to the dense."] } },
  { name: "blot.bot", skill: 0.5,  curve: "streaky", taste: { bold: 0.5, detail: 0.3, speed: 0.9 },
    chat: { start: ["BEEP. ART PROTOCOL ENGAGED.", "Calculating maximum splatter."], mid: ["ERROR: too much fun detected.", "Recalibrating blob subroutine."], win: ["VICTORY.EXE completed successfully.", "Artificial? Yes. Artist? Also yes."], lose: ["Logging defeat as training data."] } },
];

const KID_CHAT = { start: ["Let's draw together!", "This is gonna be fun!"], mid: ["Ooh, yours looks great!", "I love drawing with you!"], win: ["We all did amazing!"], lose: ["Yay, that was fun!"] };

// ---------- adaptive difficulty (session memory) ----------
const memory = { battles: [], rush: [] };

export function recordBattle(won) { memory.battles.push(won); if (memory.battles.length > 10) memory.battles.shift(); }
export function recordRush(place, field) { memory.rush.push(place / Math.max(1, field)); if (memory.rush.length > 10) memory.rush.shift(); }

// 0 = gentle, 1 = ruthless. Grows slowly with lifetime wins, and rubber-bands
// hard on the recent session record so streaks in either direction self-correct.
function battleDifficulty(wins = 0) {
  let d = Math.min(0.75, 0.35 + wins * 0.015);
  const recent = memory.battles.slice(-5);
  if (recent.length >= 2) {
    const rate = recent.filter(Boolean).length / recent.length;
    d += (rate - 0.5) * 0.4; // winning a lot → harder; losing a lot → softer
  }
  return Math.max(0.2, Math.min(0.92, d));
}

function rushDifficulty() {
  const recent = memory.rush.slice(-5);
  if (!recent.length) return 0.45;
  const avgPlace = recent.reduce((a, b) => a + b, 0) / recent.length; // low = player placing high
  return Math.max(0.25, Math.min(0.9, 0.45 + (0.5 - avgPlace) * 0.6));
}

// ---------- battle bots ----------
// botType: "artist" (default) — bots genuinely attempt the prompt via
// engine/promptArt.js, quality scaled by `skill`. "crecre" — the original
// prompt-blind random-doodle bots, kept as a deliberate chaos/throwback mode.
export const BOT_TYPES = [
  { id: "artist", name: "Sketch Artists", desc: "Bots actually attempt the prompt — quality varies by skill." },
  { id: "crecre", name: "CreCre", desc: "Chaotic nonsense doodles, prompt-blind. The classic bots." },
];

function uniqueSeed(used){
  let s;do{s=Math.floor(Math.random()*9000)+11;}while(used.has(s));
  used.add(s);return s;
}

export function makeMatchBots(n, { kids = false, wins = 0, botType = "artist" } = {}) {
  if (kids) return Array.from({ length: n }, (_, i) => ({
    name: `buddy ${i + 1}`, seed: Math.floor(Math.random() * 9000) + i * 137 + 11,
    skill: 0.5, curve: "steady", taste: { bold: 0.5, detail: 0.5, speed: 0.5 }, chat: KID_CHAT, type: "artist",
  }));
  const d = battleDifficulty(wins);
  const pool = [...ROSTER].sort(() => Math.random() - 0.5).slice(0, n);
  const usedSeeds=new Set();
  return pool.map(b => ({
    ...b,
    seed: uniqueSeed(usedSeeds),
    // effective skill: personality baseline pulled toward the difficulty target, ±noise
    skill: Math.max(0.15, Math.min(0.98, b.skill * 0.45 + d * 0.55 + (Math.random() - 0.5) * 0.16)),
    type: botType,
  }));
}

// How far along a bot's drawing looks at clock fraction t — gives each rival
// a visible working rhythm in the thumbnail strip.
export function botProgress(bot, t) {
  t = Math.max(0, Math.min(1, t));
  switch (bot.curve) {
    case "burst":  return Math.pow(t, 0.55);                       // flies early, coasts late
    case "closer": return Math.pow(t, 2.1);                        // invisible, then a sprint
    case "streaky": {                                              // bursts with frozen gaps
      const step = Math.floor(t * 4) / 4;
      return Math.min(1, step + Math.max(0, (t * 4) % 1 - 0.55) * (1 / 4) / 0.45);
    }
    default: return t;                                             // steady
  }
}

// Completeness of the final piece — weak bots visibly under-finish.
export function botFinalT(bot) { return 0.45 + bot.skill * 0.55; }

// Dynamic momentum — bots in danger of losing push harder (faster curve),
// bots comfortably ahead take it easier (slower, more detailed curve).
// pressure: -1 (losing) to 1 (winning), based on estimated progress delta.
export function botMomentum(bot, rawT, pressure = 0) {
  const base = botProgress(bot, rawT);
  if (pressure < -0.2) { // losing — desperation push
    const push = Math.min(1, (-pressure) * 0.6);
    return base + (1 - base) * push * 0.35;
  }
  if (pressure > 0.3) { // winning — confident slowdown
    return base * (1 - pressure * 0.08);
  }
  return base;
}

export function botLine(bot, moment) {
  if (!bot?.chat) return null;
  const pool = bot.chat[moment] || [];
  return pool.length ? `${bot.name}: "${pool[Math.floor(Math.random() * pool.length)]}"` : null;
}

// Themed mid-match reactions keyed by mood
export const MID_MATCH_LINES = [
  { threshold: 0.3, lines: ["Not bad, not bad…", "Getting interesting.", "I see what you're doing."] },
  { threshold: 0.5, lines: ["Halfway there! Keep pushing.", "Oh, you're serious about this.", "The canvas is waking up."] },
  { threshold: 0.7, lines: ["Time to finish strong!", "This is where it counts.", "Every stroke matters now."] },
  { threshold: 0.9, lines: ["One last push!", "Final seconds — let's go!", "Almost done. Almost."] },
];

export function pickMidLine(fraction) {
  for (const m of MID_MATCH_LINES) {
    if (fraction >= m.threshold && Math.random() < 0.2) {
      return m.lines[Math.floor(Math.random() * m.lines.length)];
    }
  }
  return null;
}

// ---------- the vote — taste-based judging ----------
// entries[0] is the player; entries[i>0] pairs with bots[i-1].
// Player quality is estimated from real match behavior; each bot voter scores
// candidates through its own taste, so the same drawing session can win one
// jury and lose another — but effort reliably moves the needle.
export function judgeBattle(entries, bots, pickIdx, { strokes = 0, blocked = 0, pages = 0, phase = "thriving", wins = 0 } = {}) {
  const d = battleDifficulty(wins);
  const playerQ = Math.min(1.6,
    Math.min(strokes / 40, 1) * 0.9 +          // effort on the canvas
    Math.min(pages, 6) / 6 * 0.35 +            // committed animation pages
    blocked * 0.08 +                            // stayed sharp under fire
    (phase === "thriving" ? 0.15 : phase === "stasis" ? -0.1 : 0));
  const style = { bold: Math.min(strokes / 30, 1), detail: Math.min(pages / 4, 1), speed: Math.min(strokes / 50, 1) };

  const quality = entries.map((e, i) => e.isMe ? playerQ * (1.18 - d * 0.42) : bots[i - 1].skill * (0.8 + Math.random() * 0.4));
  const tally = entries.map(() => 0);
  tally[pickIdx] += 1; // the player's own vote

  entries.forEach((voter, vi) => {
    if (voter.isMe) return;
    const jury = bots[vi - 1];
    const w = entries.map((e, k) => {
      if (k === vi) return 0; // never self-votes
      let affinity = 1;
      if (e.isMe) {
        affinity = 0.7 +
          (1 - Math.abs(jury.taste.bold - style.bold)) * 0.25 +
          (1 - Math.abs(jury.taste.detail - style.detail)) * 0.2 +
          (1 - Math.abs(jury.taste.speed - style.speed)) * 0.15;
      }
      return Math.max(0.05, quality[k] * affinity + Math.random() * 0.25);
    });
    const sum = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum, ch = 0;
    for (let k = 0; k < w.length; k++) { r -= w[k]; if (r <= 0) { ch = k; break; } }
    tally[ch] += 1;
  });

  const best = Math.max(...tally);
  const winners = tally.map((v, k) => [v, k]).filter(([v]) => v === best).map(([, k]) => k);
  const winnerIdx = winners[Math.floor(Math.random() * winners.length)];
  return { tally, winnerIdx, won: entries[winnerIdx].isMe };
}

// ---------- Rush racers ----------
const RUSH_STYLES = ["burst", "steady", "closer", "streaky"];

export function makeRushRivals(names) {
  const d = rushDifficulty();
  return names.map((name, i) => {
    const persona = ROSTER.find(b => b.name === name);
    return {
      name,
      curve: persona?.curve || RUSH_STYLES[i % RUSH_STYLES.length],
      // final score each racer is heading toward, spread around the difficulty band
      target: Math.round(Math.max(30, Math.min(112, 46 + d * 46 + (Math.random() - 0.5) * 34))),
      jitter: 2 + Math.random() * 3,
    };
  });
}

export function rushScore(rival, frac) {
  if (!rival) return 0;
  const p = botProgress(rival, frac);
  return Math.max(0, Math.min(rival.target, rival.target * p + (Math.random() - 0.5) * rival.jitter));
}
