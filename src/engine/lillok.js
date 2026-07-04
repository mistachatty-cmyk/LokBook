import { LILLOK_SPEECH } from "../constants.jsx";

export function lilLokPhase(s) { if (s.stasis) return "stasis"; if (s.ink < 15) return "critical"; if (s.ink < 35) return "decaying"; return "thriving"; }

// --- Blot Brain ---
// Same call signature as before (phase, ctx) with an optional third `state`
// arg: { name, wins, streak, loks, ink, bond }. When state is present, Blot
// can produce personal, stat-aware lines. A short memory prevents the same
// line landing twice in a row.

const recentLines = [];
const remember = line => { recentLines.push(line); if (recentLines.length > 4) recentLines.shift(); };

// Templated lines that read the player's actual numbers. Each returns null
// when its stat isn't interesting, so pick() can skip it.
const SMART = {
  win: [
    s => s.wins >= 2 ? `Win #${s.wins}. I keep count.` : null,
    s => s.wins >= 5 ? `${s.wins} wins. They should study us.` : null,
    () => "That jury had taste.",
  ],
  loss: [
    s => s.wins >= 1 ? `We've won ${s.wins === 1 ? "before" : s.wins + " times"}. We'll win again.` : null,
    () => "I saw what you were going for. Next round they will too.",
  ],
  streak: [
    s => s.streak >= 3 ? `Day ${s.streak}. We're built different.` : null,
    s => s.streak >= 7 ? `A whole week of ink. I'm glowing.` : null,
  ],
  thriving: [
    s => s.bond >= 70 ? "Our bond is basically waterproof now." : null,
    s => s.loks >= 200 ? `${s.loks} Loks?? Buy yourself something nice.` : null,
    s => s.streak >= 3 ? `Day ${s.streak} of the streak. Don't blink.` : null,
  ],
  decaying: [
    s => s.bond >= 60 ? "The bond's holding me together. Barely. Ink please." : null,
    s => s.loks >= 10 ? "You can afford a flask, you know. Just saying." : null,
  ],
  critical: [
    s => s.name ? `${s.name} is not a name for a grey puddle. Ink. Now.` : null,
  ],
  battle_start: [
    s => s.wins >= 1 ? `They don't know about the ${s.wins} ${s.wins === 1 ? "win" : "wins"}. Show them.` : null,
  ],
};

const pick = pool => pool[Math.floor(Math.random() * pool.length)];

export function getLilLokLine(phase = "thriving", ctx = "", state = null) {
  if (!ctx) {
    const h = new Date().getHours();
    if (phase === "thriving" && h >= 5 && h < 10) ctx = "morning";
    if (phase === "thriving" && h >= 21) ctx = "evening";
  }
  const timePool = { morning: ["Good morning. First lines of the day.", "Morning ink hits different.", "Fresh paper. Fresh start."], evening: ["Late-night drawing session?", "Best lines come after dark.", "Stars and sketches."] }[ctx];

  const candidates = [];
  // stat-aware lines first — they're rarer and land harder
  if (state) {
    const smart = (SMART[ctx] || SMART[phase] || []).map(fn => fn(state)).filter(Boolean);
    if (smart.length && Math.random() < 0.45) candidates.push(...smart);
  }
  if (!candidates.length) {
    const pool = timePool || (ctx && LILLOK_SPEECH[ctx]) || LILLOK_SPEECH[phase] || LILLOK_SPEECH.thriving;
    candidates.push(...pool);
  }
  const fresh = candidates.filter(l => !recentLines.includes(l));
  const line = pick(fresh.length ? fresh : candidates);
  remember(line);
  return line;
}
