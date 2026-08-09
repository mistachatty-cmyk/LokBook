// Starter identity — every user gets their own handle immediately so publishing,
// profiles, and feed filtering work before any signup. moss.ink & co. are seed
// artists, never the user.

const ADJ = ["inky", "doodle", "riso", "velvet", "cosmic", "mossy", "paper", "midnight", "sunny", "wobbly", "pastel", "neon", "quiet", "wild", "tiny", "golden"];
const ANIMAL = ["fox", "koi", "moth", "newt", "crow", "lynx", "otter", "gecko", "sparrow", "beetle", "rabbit", "squid", "heron", "panda", "toad", "bat"];

export const RESERVED_ARTISTS = ["moss.ink", "inkwell_iz", "tinta", "mooncrayon", "sketchram", "pixel.pluto", "doodlebug", "nib.ninja", "grafite", "blot.bot", "spiral_sage", "chaos_quill", "frost_byte", "ember_scratch", "void_weaver"];

export function isReservedName(name) {
  const n = (name || "").trim().toLowerCase();
  return RESERVED_ARTISTS.some(r => r.toLowerCase() === n);
}

export function starterHandle(seed = Math.floor(Math.random() * 9999)) {
  const s = Math.abs(seed | 0);
  return `${ADJ[s % ADJ.length]}-${ANIMAL[Math.floor(s / 16) % ANIMAL.length]}-${(s % 89) + 10}`;
}

// Suggest an available variant when someone picks a reserved name.
export function suggestHandle(wanted, seed = 0) {
  const base = (wanted || "").trim().replace(/\s+/g, ".").slice(0, 18) || starterHandle(seed);
  return isReservedName(base) ? `${base}.${(seed % 89) + 10}` : base;
}

// Stable device ID for anonymous guests in Rooms. Persists across browser sessions
// so rate limiting and attribution work consistently. Differs from userId which
// can be re-randomized, and from actual auth which many guests lack.
export function getDeviceId() {
  const key = "lok:device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}
