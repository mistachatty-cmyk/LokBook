// BadBleep Box — LokBook's cheat-code engine.
// Codes are matched by hash only; the plaintext never ships in the bundle.
// The registry of live codes is documented privately in docs/.bleepbox.md.

const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const bleepHash = s => { let x = 0; for (const c of norm(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x.toString(36); };

// hash -> effect descriptor consumed by LokApp's onCheat handler
const CODES = {
  "14gauzg": { fx: "merci" },      // gratitude bonus
  "10j8w3a": { fx: "supableep" },  // dev mode: unlock everything
};

export function resolveCheat(input) {
  return CODES[bleepHash(input)] || null;
}
