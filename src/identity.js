// Starter identity — every user gets their own handle immediately so publishing,
// profiles, and feed filtering work before any signup. moss.ink & co. are seed
// artists, never the user.

const ADJ = ["inky", "doodle", "riso", "velvet", "cosmic", "mossy", "paper", "midnight", "sunny", "wobbly", "pastel", "neon", "quiet", "wild", "tiny", "golden"];
const ANIMAL = ["fox", "koi", "moth", "newt", "crow", "lynx", "otter", "gecko", "sparrow", "beetle", "rabbit", "squid", "heron", "panda", "toad", "bat"];

export const RESERVED_ARTISTS = ["moss.ink", "inkwell_iz", "tinta", "mooncrayon", "sketchram", "pixel.pluto", "doodlebug", "nib.ninja", "grafite", "blot.bot"];

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
