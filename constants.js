export const W = 480;
export const H = 600;

export const PROMPTS = ["A creature made of weather","Your breakfast as a hero","A plant that shouldn't exist","Night swimming","A machine with feelings","The last lighthouse","Dancing mushrooms","A very smug cat","A city in a teacup","Something soft that bites","A tiny world inside a bottle","A map of somewhere imaginary","Two things that don't belong together","The smallest storm","An animal made of shadow"];
export const weekOfYear = d => Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
export const WEEKLY_PROMPT = PROMPTS[(new Date().getFullYear() * 53 + weekOfYear(new Date())) % PROMPTS.length];

export const SUPA_URL = "https://jfavkudihasswkhkouxq.supabase.co";
export const SUPA_KEY = "sb_publishable_ipcGPahvt2-j2YwBFBbvUQ_EJo2WJID";

export const PACE_PRESETS = {
  minimal: { name: "MINIMAL", desc: "Instant. Text-dense. No motion.", kill: true, mult: 1 },
  snap: { name: "SNAP", desc: "Quick springs, tight staggers.", kill: false, mult: 0.6 },
  sweep: { name: "SWEEP", desc: "Heavy easing, drifting cards.", kill: false, mult: 1 },
  cinema: { name: "CINEMA", desc: "Full transitions, slow blur.", kill: false, mult: 1.8 },
};

export const BLOT_BORDERS = [
  { id: "none", name: "Plain ink", price: 0 },
  { id: "gilded", name: "Gilded ring", price: 45 },
  { id: "washi", name: "Washi wrap", price: 35 },
  { id: "orbit", name: "Orbit dashes", price: 60 },
  { id: "liquid", name: "Liquid glow", price: 90 },
];

export const FOD_WINDOW_DAYS = 7;
export const ANIMATED_AVATAR_SPEND = 5000;

export const ADS = [{ text: "Your art could live here", cta: "Advertise", slot: "lok-feed-1" }, { text: "Draw more. Earn more Loks.", cta: "Studio →", slot: "lok-feed-2" }, { text: "LokPass — no ads, every theme", cta: "Get it", slot: "lok-feed-3" }];

export const QUEST_POOL = [
  { id: "vote3", label: "Vote on 3 pieces", goal: 3, reward: 15, track: "vote" },
  { id: "view5", label: "Slide through 5 flips", goal: 5, reward: 15, track: "view" },
  { id: "draw1", label: "Publish 1 creation", goal: 1, reward: 25, track: "publish" },
  { id: "battle1", label: "Play a battle", goal: 1, reward: 20, track: "battle" },
  { id: "front5", label: "Grab 5 prompts in Rush", goal: 5, reward: 15, track: "front" },
  { id: "feed", label: "Lok in 2 artists", goal: 2, reward: 15, track: "lok" },
];

export const NAME_COLOR_MAP = { default: null, pink: "#FF5DA2", teal: "#2FA9A0", gold: "#E8B14B", violet: "#7A4FBF", rainbow: "rainbow" };

export const REACTION_SETS = { base: ["splat", "heart", "drip"], stars: ["star", "sparkle", "comet"], fire: ["flame", "bolt2", "skull2"], zen: ["leaf", "wave2", "lotus"] };

export const LILLOK_SPEECH = {
  thriving: ["Feeling inky today", "Drawing energy: full", "I see good lines ahead", "Ready to blot the world", "Peak ink. Peak vibes.", "Full tank. Let's draw.", "Ink flowing, heart glowing"],
  decaying: ["...ink low", "Getting a little dry here", "My lines are getting thin", "Running on fumes", "One drop would change everything", "The colors are going grey"],
  critical: ["I'm fading fast...", "Please — ink, now", "Almost out. Don't leave me grey.", "This is the last of my ink"],
  stasis: ["Zzz...", "...dreaming of ink", "So... cold...", "Still here. Barely.", "The bond held. Wake me up."],
  win: ["WE WON!!!", "That's what ink looks like!", "Nobody out-draws us", "I told you we were good"],
  loss: ["Next time.", "We learned something.", "Draw more, fear less."],
  publish: ["It's out there now", "The world can flip it", "I'm proud of that one"],
  battle_start: ["Let's go. Draw fast.", "I'm watching your lines", "Make every stroke count"],
  feed_scroll: ["Good art in the feed today", "Something in here will spark you", "This is where the ideas live"],
  quest_done: ["Quest complete!", "You did what you said you would", "Keep drawing, keep earning"],
};

export const EMPTY_ICONS = {
  default: <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="24" cy="24" r="10" fill="currentColor" opacity=".12" /><path d="M20 8 C20 8 32 18 32 24 C32 30 27 34 20 34 C13 34 8 30 8 24 C8 18 20 8 20 8Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="none" /></svg>,
  feed: <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="6" y="6" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="3" fill="none" opacity=".2" /><circle cx="28" cy="12" r="7" fill="currentColor" opacity=".3" /><path d="M12 20 L28 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><path d="M6 34 L20 22 L28 28 L34 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" /></svg>,
  bookmarks: <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M10 6 H30 C31 6 32 7 32 8 V34 L20 26 L8 34 V8 C8 7 9 6 10 6Z" stroke="currentColor" strokeWidth="3" fill="none" /><path d="M15 15 H25 M15 20 H22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>,
  follow: <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="16" cy="14" r="6" stroke="currentColor" strokeWidth="3" fill="none" /><path d="M6 32 C6 24 10 20 16 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".5" /><circle cx="28" cy="26" r="6" fill="currentColor" opacity=".2" /><path d="M25 26 L27 28 L32 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>,
  search: <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="18" cy="18" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path d="M26 26 L34 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M14 18 H22 M18 14 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" /></svg>,
};

export const REVIVAL_MAX = 14;

export const PX_PER_FRAME = 150;

export const BLENDS = ["source-over", "multiply", "screen", "overlay"];

export const TIERS = [{ layers: 10, label: "10 · Sketch", price: 0 }, { layers: 25, label: "25 · Studio", price: 40 }, { layers: 50, label: "50 · Pro", price: 80 }, { layers: 100, label: "100 · Marathon", price: 150 }];

export const FORMATS = [{ id: "1v1", label: "1v1 Duel", players: 2, icon: "⚔", mood: "One on one. Pure." }, { id: "1v1v1", label: "Triangle", players: 3, icon: "△", mood: "Two rivals, one you." }, { id: "ffa4", label: "4-Player FFA", players: 4, icon: "✦", mood: "Controlled chaos." }, { id: "coop", label: "Local Co-op", players: 2, coop: true, icon: "♡", mood: "Hot-seat, one device." }, { id: "ffa10", label: "Big Battle · 10", players: 10, locked: true, icon: "🔥", mood: "Absolute mayhem." }];
export const KID_PROMPTS = ["A happy dinosaur", "Your favorite animal", "A magic tree", "A friendly robot", "A rainbow fish", "A silly monster", "Your dream treehouse", "A dancing cloud"];
export const BOT_NAMES = ["pixel.pluto", "inkwell_iz", "doodlebug", "sketchram", "tinta", "mooncrayon", "nib.ninja", "grafite", "blot.bot"];
export const INTERVENTIONS = ["shake", "splat", "blot"];

export const MODES = { shapes: { name: "Shapes", tag: "clean geometry", pool: ["star", "triangle", "square", "hexagon", "circle", "heart", "spiral"] }, stencils: { name: "Stencils", tag: "trace real objects", pool: ["house", "wild-knot", "char-ghost"] }, wild: { name: "INKSANITY", tag: "chaotic outlines", pool: ["wild-knot", "spiral", "heart"] }, chars: { name: "Characters", tag: "outline a creature", pool: ["char-ghost"] } };
export const WAGERS = [5, 10, 25, 50];
export const FRONT_NAMES = ["pixel.pluto", "inkwell_iz", "doodlebug", "sketchram", "tinta", "mooncrayon"];

export const EFFECTS = [{ id: "none", name: "Plain paper", price: 0 }, { id: "rain", name: "Ink rain", price: 20 }, { id: "confetti", name: "Confetti burst", price: 30 }, { id: "aurora", name: "Aurora veil", price: 40 }, { id: "embers", name: "Floating embers", price: 25 }];
export const NAME_COLORS = [{ id: "default", name: "Default", price: 0, color: null }, { id: "pink", name: "Hot pink", price: 20, color: "#FF5DA2" }, { id: "teal", name: "Riso teal", price: 20, color: "#2FA9A0" }, { id: "gold", name: "Gold", price: 35, color: "#E8B14B" }, { id: "violet", name: "Violet", price: 35, color: "#7A4FBF" }, { id: "rainbow", name: "Holo ✦", price: 80, color: "rainbow" }];
export const FRAMES = [{ id: "none", name: "None", price: 0 }, { id: "double", name: "Double rule", price: 25 }, { id: "dashed", name: "Dashed ink", price: 25 }, { id: "tape", name: "Washi corners", price: 40 }, { id: "glow", name: "Neon glow", price: 60 }];
export const REACTION_PACKS = [{ id: "base", name: "Ink set (splat · heart · drip)", price: 0 }, { id: "stars", name: "Stardust pack", price: 30 }, { id: "fire", name: "Hot streak pack", price: 30 }, { id: "zen", name: "Zen pack", price: 45 }];
export const AVATAR_ACCENTS = [{ id: "none", name: "Plain", price: 0 }, { id: "ring", name: "Accent ring", price: 20 }, { id: "halo", name: "Sketch halo", price: 35 }, { id: "crown", name: "Ink crown", price: 50 }];