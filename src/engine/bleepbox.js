// BadBleep Box — LokBook's cheat-code engine.
// Codes are matched by hash only; the plaintext never ships in the bundle.
// The registry of live codes is documented privately in docs/.bleepbox.md.

const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const bleepHash = s => { let x = 0; for (const c of norm(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x.toString(36); };

// hash -> effect descriptor consumed by LokApp's onCheat handler
const CODES = {
  "14gauzg": { fx: "merci" },      // gratitude bonus
  "10j8w3a": { fx: "supableep" },  // dev mode: unlock everything
  "piyk6r": { fx: "cincoorso" },   // comeback tease + activate
  "1qod2qa": { fx: "mercmerc" },   // +200 Loks
  "9axo14": { fx: "inkoverflow" }, // max ink + bond, revive
  "1p6f89b": { fx: "phoenix" },    // revive from stasis
  "1nm6zsq": { fx: "fodskip" },    // force new Flip of Day
  "1pmuvis": { fx: "pinball" },    // set random 4-digit PIN
  "lrxbia": { fx: "whisper" },     // unlock all voice packs
  "mlke63": { fx: "nightmode" },   // force dark theme
  "cvxw4z": { fx: "doubledown" },  // double current Loks
  "i5celo": { fx: "resolve" },     // complete all active quests
  "i3e195": { fx: "vibemode" },    // cycle celebration style
};

export function resolveCheat(input) {
  return CODES[bleepHash(input)] || null;
}
