import { LILLOK_SPEECH } from "../constants.jsx";

export function lilLokPhase(s) { if (s.stasis) return "stasis"; if (s.ink < 15) return "critical"; if (s.ink < 35) return "decaying"; return "thriving"; }

export function getLilLokLine(phase = "thriving", ctx = "") {
  if (!ctx) { const h = new Date().getHours(); if (phase === "thriving" && h >= 5 && h < 10) return "Good morning. First lines of the day."; if (phase === "thriving" && h >= 21) return "Late-night drawing session?"; }
  const pool = (ctx && LILLOK_SPEECH[ctx]) ? LILLOK_SPEECH[ctx] : (LILLOK_SPEECH[phase] || LILLOK_SPEECH.thriving);
  return pool[Math.floor(Math.random() * pool.length)];
}
