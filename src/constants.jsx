import { SUPA_URL, SUPA_KEY, supabase } from "./supabaseClient.js";
export { SUPA_URL, SUPA_KEY, supabase };

export const W = 480;
export const H = 600;

export const PROMPTS = ["A creature made of weather","Your breakfast as a hero","A plant that shouldn't exist","Night swimming","A machine with feelings","The last lighthouse","Dancing mushrooms","A very smug cat","A city in a teacup","Something soft that bites","A tiny world inside a bottle","A map of somewhere imaginary","Two things that don't belong together","The smallest storm","An animal made of shadow"];
export const weekOfYear = d => Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
export const WEEKLY_PROMPT = PROMPTS[(new Date().getFullYear() * 53 + weekOfYear(new Date())) % PROMPTS.length];

export const STRIPE_PK = "pk_test_51Tpjso3sNCWqR1Dra2piTZgwIiAfXoS0KPCc6Y1IsaKj0pY1R4sEguelT39s7cud1PqJeEM7IdOAKZ5j95RxTi2L00kIsE7nsZ";

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
  { id: "stitch", name: "Stitched Border", price: 40 },
  { id: "marble", name: "Marble Inlay", price: 75 },
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

export const NAME_COLOR_MAP = { default: null, pink: "#FF5DA2", teal: "#2FA9A0", gold: "#E8B14B", violet: "#7A4FBF", rainbow: "rainbow", fire: "fire", ice: "ice" };

export const REACTION_SETS = { base: ["splat", "heart", "drip"], stars: ["star", "sparkle", "comet"], fire: ["flame", "bolt2", "skull2"], zen: ["leaf", "wave2", "lotus"], spooky: ["ghost", "spiderweb", "eyeball"], sweet: ["cupcake", "icecream", "candy"] };

export const HUMHAH_VARIANTS = [
  { id: "hmm", label: "Hmm…", emoji: "🤔" },
  { id: "hah", label: "Hah!", emoji: "😄" },
];
export const BOMHOGWAH_VARIANTS = [
  { id: "bom", label: "Bom!", emoji: "😮" },
  { id: "hog", label: "Hog!", emoji: "🤯" },
  { id: "wah", label: "Wah…", emoji: "🥺" },
];

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
export const OFFLINE_BONUS_HOURS = 5;
export const OFFLINE_BONUS_LOKS = 50;
export const ECHO_EXPIRY_HOURS = 48;
export const ECHO_SHARE_TEXT = "sHare/dOwLNoALD bEfOre iT eCHoS aWay!!";
export const TIDE_CANDIDATE_COUNT = 3;

export const EVENTS = [
  { id:"summer_splash", name:"Summer Splash", icon:"🏖️", start:"2026-06-01", end:"2026-06-30", prompt:"A day at the beach", reward:100, cosmetic:{ type:"frame", id:"seashell", name:"Seashell Frame" } },
  { id:"spooky_ink", name:"Spooky Ink", icon:"🎃", start:"2026-10-24", end:"2026-10-31", prompt:"Something that haunts you", reward:150, cosmetic:{ type:"frame", id:"ghostlight", name:"Ghostlight Frame" } },
];
export const getActiveEvent = () => { const n=new Date().toISOString().slice(0,10); return EVENTS.find(e=>n>=e.start&&n<=e.end)||null; };

export const PX_PER_FRAME = 150;

export const BLENDS = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];

export const STUDIO_MODULES = [
  { id: "layers_10", type: "layers", name: "Layer Pack S", desc: "Up to 10 layers", price: 0, layers: 10 },
  { id: "layers_25", type: "layers", name: "Layer Pack M", desc: "Up to 25 layers", price: 40, layers: 25 },
  { id: "layers_50", type: "layers", name: "Layer Pack L", desc: "Up to 50 layers", price: 80, layers: 50 },
  { id: "layers_100", type: "layers", name: "Layer Pack XL", desc: "Up to 100 layers", price: 150, layers: 100 },
  { id: "layers_200", type: "layers", name: "Layer Pack XXL", desc: "Up to 200 layers", price: 250, layers: 200 },
  { id: "layers_500", type: "layers", name: "Layer Pack LGD", desc: "Up to 500 layers", price: 500, layers: 500 },
  { id: "brush_ink", type: "brush", name: "Ink", desc: "Standard solid brush", price: 0 },
  { id: "brush_marker", type: "brush", name: "Marker", desc: "Translucent marker stroke", price: 30 },
  { id: "brush_chalk", type: "brush", name: "Chalk", desc: "Textured grain brush", price: 30 },
  { id: "brush_air", type: "brush", name: "Airbrush", desc: "Soft spray brush", price: 25 },
  { id: "tool_spray", type: "tool", name: "Spray Can", desc: "Scattered dot spray", price: 40 },
  { id: "tool_glow", type: "tool", name: "Glow Brush", desc: "Soft luminous stroke", price: 60 },
  { id: "tool_watercolor", type: "tool", name: "Watercolor", desc: "Wet-media bleed & bloom", price: 75 },
  { id: "tool_pattern", type: "tool", name: "Pattern Stamp", desc: "Repeating tile patterns", price: 50 },
  { id: "tool_shape", type: "tool", name: "Shape Tool", desc: "Rectangles, ellipses & polygons", price: 35 },
  { id: "tool_gradient", type: "tool", name: "Gradient Fill", desc: "Linear & radial gradients", price: 55 },
  { id: "tool_push", type: "tool", name: "Push Tool", desc: "Nudge strokes around canvas", price: 45 },
  { id: "tool_smudge", type: "tool", name: "Smudge Tool", desc: "Blur & drag wet ink", price: 50 },
  { id: "tool_clone", type: "tool", name: "Clone Stamp", desc: "Sample & paint pixels", price: 70 },
  { id: "tool_blur", type: "tool", name: "Blur / Sharpen", desc: "Gaussian blur & sharpen", price: 45 },
  { id: "tool_replace", type: "tool", name: "Color Replace", desc: "Swap one color for another", price: 35 },
  { id: "tool_rulers", type: "tool", name: "Rulers & Guides", desc: "Draggable ruler lines", price: 25 },
  { id: "feat_gif", type: "feature", name: "GIF Export", desc: "Export animation as animated GIF", price: 200 },
  { id: "feat_ref", type: "feature", name: "Reference Layer", desc: "Import image as semi-transparent reference", price: 80 },
  { id: "feat_palettes", type: "feature", name: "Palette Packs", desc: "6 curated color palettes", price: 30 },
  { id: "feat_smooth", type: "feature", name: "Stroke Smoothing", desc: "Auto-smooth bezier line fit", price: 60 },
  { id: "feat_batch", type: "feature", name: "Batch Ops", desc: "Duplicate, reverse, clear all frames", price: 40 },
  { id: "feat_tween", type: "feature", name: "Animation Presets", desc: "Auto-tween bounce, shake, fade, wiggle", price: 120 },
  { id: "feat_labels", type: "feature", name: "Frame Labels", desc: "Name each frame in the timeline", price: 25 },
  { id: "feat_blend", type: "feature", name: "Blend Modes", desc: "Multiply, screen, overlay & more blend modes", price: 60 },
  { id: "feat_symmetry", type: "feature", name: "Symmetry Tools", desc: "Mirror & radial symmetry guides", price: 50 },
  { id: "canvas_sizes", type: "canvas", name: "Canvas Sizes", desc: "Story, square & wide aspect ratios", price: 100 },
  { id: "module_uber", type: "feature", name: "Studio UBER", desc: "Ultimate module — unlocks all brushes, tools, layers, features & canvas sizes", price: 999 },
  { id: "achieve_onion", type: "achievement", name: "Onion Skinning", desc: "Multi-frame onion skin preview", price: 0, unlock: "Studio Master badge" },
  { id: "achieve_persp", type: "achievement", name: "Perspective Grid", desc: "3-point perspective grid overlay", price: 0, unlock: "3 battle streak" },
  { id: "achieve_swatch", type: "achievement", name: "Custom Swatches", desc: "Save custom color swatches", price: 0, unlock: "25 published flips" },
  { id: "achieve_echo", type: "achievement", name: "Studio Echo", desc: "Record & replay studio sessions", price: 0, unlock: "10 Echoes shared" },
  { id: "achieve_cloud", type: "achievement", name: "Cloud Studio", desc: "Sync studio settings to cloud", price: 0, unlock: "Founder badge" },
];

export function getModuleLayers(modules) {
  if (modules.includes("module_uber")) return 500;
  const layerMods = STUDIO_MODULES.filter(m => m.type === "layers" && modules.includes(m.id) && m.layers);
  return layerMods.length ? Math.max(...layerMods.map(m => m.layers)) : 10;
}
export function hasModule(modules, id) { return modules.includes(id) || modules.includes("module_uber"); }
export function getModule(id) { return STUDIO_MODULES.find(m => m.id === id); }
export function migrateLegacyModules(saved) {
  const m = new Set(["layers_10", "brush_ink"]);
  if (!saved) return [...m];
  const tierMap = { 10: "layers_10", 25: "layers_25", 50: "layers_50", 100: "layers_100" };
  if (saved.ownedTiers) saved.ownedTiers.forEach(t => { if (tierMap[t]) m.add(tierMap[t]); });
  if (saved.ccTier) { m.add("feat_blend"); m.add("feat_symmetry"); m.add("brush_marker"); m.add("brush_chalk"); m.add("brush_air"); }
  const upgradeMap = {
    sprayCan: "tool_spray", glowBrush: "tool_glow", watercolor: "tool_watercolor",
    patternStamp: "tool_pattern", shapeTool: "tool_shape", gradientFill: "tool_gradient",
    pushTool: "tool_push", smudgeTool: "tool_smudge", cloneStamp: "tool_clone",
    blurSharpen: "tool_blur", colorReplace: "tool_replace", rulers: "tool_rulers",
    gifExport: "feat_gif", refLayer: "feat_ref", palettes: "feat_palettes",
    strokeSmooth: "feat_smooth", batchOps: "feat_batch", animPresets: "feat_tween",
    frameLabels: "feat_labels", canvasSizes: "canvas_sizes"
  };
  if (saved.studioUpgrades) saved.studioUpgrades.forEach(id => { if (upgradeMap[id]) m.add(upgradeMap[id]); });
  return [...m];
}
export function getModuleTypes() {
  const order = ["layers", "brush", "tool", "feature", "canvas", "achievement"];
  const labels = { layers: "Layers", brush: "Brushes", tool: "Tools", feature: "Features", canvas: "Canvas", achievement: "Achievement" };
  return order.map(type => ({ type, label: labels[type], items: STUDIO_MODULES.filter(m => m.type === type) }));
}

export const FORMATS = [{ id: "1v1", label: "1v1 Duel", players: 2, icon: "⚔", mood: "One on one. Pure." }, { id: "1v1v1", label: "Triangle", players: 3, icon: "△", mood: "Two rivals, one you." }, { id: "ffa4", label: "4-Player FFA", players: 4, icon: "✦", mood: "Controlled chaos." }, { id: "coop", label: "Local Co-op", players: 2, coop: true, icon: "♡", mood: "Hot-seat, one device." }, { id: "ffa10", label: "Big Battle · 10", players: 10, locked: true, icon: "🔥", mood: "Absolute mayhem." }];
export const KID_PROMPTS = ["A happy dinosaur", "Your favorite animal", "A magic tree", "A friendly robot", "A rainbow fish", "A silly monster", "Your dream treehouse", "A dancing cloud"];
export const BOT_NAMES = ["pixel.pluto", "inkwell_iz", "doodlebug", "sketchram", "tinta", "mooncrayon", "nib.ninja", "grafite", "blot.bot"];
export const INTERVENTIONS = ["shake", "splat", "blot"];

export const MODES = { shapes: { name: "Shapes", tag: "clean geometry", pool: ["star", "triangle", "square", "hexagon", "circle", "heart", "spiral"] }, stencils: { name: "Stencils", tag: "trace real objects", pool: ["house", "wild-knot", "char-ghost"] }, wild: { name: "INKSANITY", tag: "chaotic outlines", pool: ["wild-knot", "spiral", "heart"] }, chars: { name: "Characters", tag: "outline a creature", pool: ["char-ghost"] } };
export const WAGERS = [5, 10, 25, 50];
export const FRONT_NAMES = ["pixel.pluto", "inkwell_iz", "doodlebug", "sketchram", "tinta", "mooncrayon"];

export const SKIES = [
  { id: "clear", name: "Clear Sky", price: 0 },
  { id: "clouds", name: "Cloud Drift", price: 25 },
  { id: "stars", name: "Starry Night", price: 35 },
  { id: "sunset", name: "Sunset Glow", price: 30 },
  { id: "aurora_sky", name: "Aurora Sky", price: 45 },
];

export const EFFECTS = [{ id: "none", name: "Plain paper", price: 0 }, { id: "rain", name: "Ink rain", price: 20 }, { id: "confetti", name: "Confetti burst", price: 30 }, { id: "aurora", name: "Aurora veil", price: 40 }, { id: "embers", name: "Floating embers", price: 25 }, { id: "scanlines", name: "Scan Lines", price: 20 }, { id: "static", name: "Static", price: 20 }];
export const NAME_COLORS = [{ id: "default", name: "Default", price: 0, color: null }, { id: "pink", name: "Hot pink", price: 20, color: "#FF5DA2" }, { id: "teal", name: "Riso teal", price: 20, color: "#2FA9A0" }, { id: "gold", name: "Gold", price: 35, color: "#E8B14B" }, { id: "violet", name: "Violet", price: 35, color: "#7A4FBF" }, { id: "rainbow", name: "Holo ✦", price: 80, color: "rainbow" }, { id: "fire", name: "Fire", price: 60, color: "fire" }, { id: "ice", name: "Ice", price: 60, color: "ice" }];
export const FRAMES = [{ id: "none", name: "None", price: 0 }, { id: "double", name: "Double rule", price: 25 }, { id: "dashed", name: "Dashed ink", price: 25 }, { id: "tape", name: "Washi corners", price: 40 }, { id: "glow", name: "Neon glow", price: 60 }, { id: "photo", name: "Photo Corners", price: 30 }, { id: "stamp", name: "Stamp Edge", price: 35 }, { id:"polaroid", name:"Polaroid border", price:35 }, { id:"filmstrip", name:"Film strip sprockets", price:45 }, { id:"torn", name:"Torn edge", price:30 }];
export const REACTION_PACKS = [{ id: "base", name: "Ink set (splat · heart · drip)", price: 0 }, { id: "stars", name: "Stardust pack", price: 30 }, { id: "fire", name: "Hot streak pack", price: 30 }, { id: "zen", name: "Zen pack", price: 45 }, { id: "spooky", name: "Spooky Pack", price: 30 }, { id: "sweet", name: "Sweet Pack", price: 30 }];
export const PAPERS = [{ id:"plain", name:"Plain paper", price:0 }, { id:"grid", name:"Grid guide", price:25 }, { id:"dots", name:"Dot grid", price:25 }, { id:"storyboard", name:"Storyboard · 3 panels", price:40 }, { id:"graphite", name:"Graphite texture", price:50 }];
export const LILLOK_GEAR = [{ id:"none", name:"None", price:0 }, { id:"hat", name:"Tiny hat", price:25 }, { id:"glasses", name:"Round glasses", price:25 }, { id:"bowtie", name:"Bow tie", price:20 }];
export const AVATAR_ACCENTS = [{ id: "none", name: "Plain", price: 0 }, { id: "ring", name: "Accent ring", price: 20 }, { id: "halo", name: "Sketch halo", price: 35 }, { id: "crown", name: "Ink crown", price: 50 }, { id: "horns", name: "Horns", price: 40 }, { id: "antenna", name: "Antenna", price: 40 }];

export const STUDIO_UPGRADES = [
  { id:"gifExport", name:"GIF Export", price:200, desc:"Export animation as animated GIF" },
  { id:"refLayer", name:"Reference layer", price:80, desc:"Import image as semi-transparent reference" },
  { id:"palettes", name:"Palette packs", price:30, desc:"6 curated color palettes" },
  { id:"canvasSizes", name:"Canvas sizes", price:100, desc:"Story, square & wide aspect ratios" },
  { id:"strokeSmooth", name:"Stroke smoothing", price:60, desc:"Auto-smooth bezier line fit" },
  { id:"batchOps", name:"Batch ops", price:40, desc:"Duplicate, reverse, clear all frames" },
  { id:"animPresets", name:"Animation presets", price:120, desc:"Auto-tween: bounce, shake, fade, wiggle" },
  { id:"frameLabels", name:"Frame labels", price:25, desc:"Name each frame in the timeline" },
  { id:"pushTool", name:"Push tool", price:45, desc:"Nudge strokes and shapes around the canvas" },
  { id:"smudgeTool", name:"Smudge tool", price:50, desc:"Blur and drag wet ink like paint" },
  { id:"cloneStamp", name:"Clone stamp", price:70, desc:"Sample and paint pixels from one area to another" },
  { id:"shapeTool", name:"Shape tool", price:35, desc:"Snap perfect rectangles, ellipses & polygons" },
  { id:"gradientFill", name:"Gradient fill", price:55, desc:"Linear and radial gradient fills on layers" },
  { id:"sprayCan", name:"Spray can", price:40, desc:"Scattered dot spray with adjustable density" },
  { id:"glowBrush", name:"Glow brush", price:60, desc:"Soft luminous strokes with outer glow" },
  { id:"blurSharpen", name:"Blur / Sharpen", price:45, desc:"Gaussian blur and sharpen filters per layer" },
  { id:"colorReplace", name:"Color replace", price:35, desc:"Swap one color for another across the layer" },
  { id:"patternStamp", name:"Pattern stamp", price:50, desc:"Stamp repeating tile patterns onto the canvas" },
  { id:"watercolor", name:"Watercolor", price:75, desc:"Wet-media brush with bleed and bloom" },
  { id:"rulers", name:"Rulers & guides", price:25, desc:"Draggable ruler lines with snap-to alignment" },
];
export function blotBorderStyle(id, T) {
  return ({
    none: { border: `3px solid ${T.ink}` },
    gilded: { border: "3px solid #E8B14B", boxShadow: `0 0 0 2px ${T.ink}, 3px 3px 0 ${T.shadow}` },
    washi: { border: `3px dashed ${T.accent}` },
    orbit: { border: `3px dotted ${T.alt}`, outline: `2px dashed ${T.ink}`, outlineOffset: 3 },
    liquid: { border: `3px solid ${T.accent}`, boxShadow: `0 0 0 2px ${T.ink}, 0 0 16px 3px ${T.accent}` },
    stitch: { border: `3px double ${T.ink}` },
    marble: { border: `3px solid ${T.alt}`, boxShadow: `inset 0 0 0 2px ${T.paper}, 0 0 0 3px ${T.ink}` },
  }[id] || { border: `3px solid ${T.ink}` });
}

export function makeQuests() { return [...QUEST_POOL].sort(() => Math.random() - .5).slice(0, 3).map(q => ({ ...q, progress: 0, done: false })); }

export async function founderSignup(handle, email, save_blob) {
  const res = await fetch(`${SUPA_URL}/rest/v1/founder_signups`, { method: "POST", headers: { ...getHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ handle, email: email || null, source: "lok_alpha", save_blob }) });
  if (!res.ok) throw new Error("signup failed " + res.status);
  return true;
}

export const BADGES = [
  // Collection badges (5)
  { id:"first_flip",    cat:"collection", name:"First Flip",       desc:"Publish your first flip",               icon:"🎬", check:s=>s.posts>=1 },
  { id:"five_flips",    cat:"collection", name:"Five & Alive",    desc:"Publish 5 flips",                        icon:"📽", check:s=>s.posts>=5 },
  { id:"ten_flips",     cat:"collection", name:"Double Digits",   desc:"Publish 10 flips",                       icon:"📀", check:s=>s.posts>=10 },
  { id:"series_start",  cat:"collection", name:"Chapter One",     desc:"Publish a page-flip series",             icon:"📖", check:s=>s.series>=1 },
  // Social badges (5)
  { id:"first_vote",    cat:"social",     name:"Citizen",         desc:"Vote on a flip",                         icon:"🗳", check:s=>s.votes>=1 },
  { id:"ten_votes",     cat:"social",     name:"Hustings",        desc:"Vote 10 times",                          icon:"📬", check:s=>s.votes>=10 },
  { id:"fifty_votes",   cat:"social",     name:"Campaigner",      desc:"Vote 50 times",                          icon:"📯", check:s=>s.votes>=50 },
  { id:"first_lok",     cat:"social",     name:"Friend Maker",    desc:"Lok your first artist",                  icon:"🤝", check:s=>s.lokd>=1 },
  // Streak badges (5)
  { id:"streak_3",      cat:"streak",     name:"Threepeat",       desc:"3-day streak",                           icon:"🔥", check:s=>s.streak>=3 },
  { id:"streak_7",      cat:"streak",     name:"Week Warrior",    desc:"7-day streak",                           icon:"⚡", check:s=>s.streak>=7 },
  { id:"streak_30",     cat:"streak",     name:"Monthly Master",  desc:"30-day streak",                          icon:"🌙", check:s=>s.streak>=30 },
  { id:"streak_100",    cat:"streak",     name:"Century",         desc:"100-day streak",                         icon:"💫", check:s=>s.streak>=100 },
  // Creator badges (3)
  { id:"first_views",   cat:"creator",    name:"Seen",            desc:"100 views on your flips",                icon:"👁", check:s=>s.views>=100 },
  { id:"top_voted",     cat:"creator",    name:"Crowd Pleaser",   desc:"50 votes on your flips",                 icon:"🏅", check:s=>s.receivedVotes>=50 },
  { id:"revivalist",    cat:"creator",    name:"Revivalist",      desc:"Publish a revival piece",                icon:"♻", check:s=>s.revivals>=1 },
  // Special badges (2)
  { id:"offline_rider", cat:"special",    name:"Offline Rider",   desc:"Claim an offline bonus",                 icon:"🏝", check:s=>s.offlineBonuses>=1 },
  { id:"founder",       cat:"special",    name:"Founder",         desc:"Secure founder status",                  icon:"🏆", check:s=>s.founder },
];

export const BADGE_CATEGORIES = [
  { id:"collection", name:"Collection", icon:"🎨" },
  { id:"social",     name:"Social",     icon:"💬" },
  { id:"streak",     name:"Streak",     icon:"🔥" },
  { id:"creator",    name:"Creator",    icon:"✨" },
  { id:"special",    name:"Special",    icon:"⭐" },
];

// --- Lok party API — accounts + shared feed on LokServices (Supabase REST) ---
import { getApiToken } from "./auth/auth.js";

function getHeaders() {
  const token = getApiToken();
  return { "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: `Bearer ${token}` };
}

export async function hashPin(pin) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("lok:" + pin));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export const toDbPost = (p, author) => ({ id: p.id, author, title: p.title, frames: p.frames, frame_durations: p.frameDurations || null, pace_ms: p.paceMs || 160, mode: p.mode || "A", style: p.style || "bold", loop: !!p.loop, votes: p.votes || 0, views: p.views || 0, reactions: { humhah: 0, bomhogwah: 0, splat: 0, heart: 0, drip: 0, ...(p.reactions||{}) }, echoedAt: null, echoCount: 0, echoParent: null, echoExpiresAt: null, origin: p.from || "studio" });
export const fromDbPost = r => ({ id: r.id, title: r.title, author: r.author, frames: r.frames || [], frameDurations: r.frame_durations || undefined, paceMs: r.pace_ms || 160, mode: r.mode || "A", style: r.style || "bold", loop: !!r.loop, votes: r.votes || 0, views: r.views || 0, reactions: { humhah: 0, bomhogwah: 0, splat: 0, heart: 0, drip: 0, ...(r.reactions||{}) }, echoedAt: null, echoCount: 0, echoParent: null, echoExpiresAt: null, from: r.origin || "studio", createdAt: r.created_at, remote: true, voted: false, viewed: false });

export const GAME_MANUAL_PAGES = [
  { title:"Welcome", icon:"📖", content:"LokBook is a living flipbook sketchbook. Draw frames, play them as animation, publish to the feed. This manual covers everything you need to get started and thrive." },
  { title:"Drawing", icon:"✏️", content:"Tap the + button to open the Easel. Each page is a frame. Draw with ink, erase with the back of the stylus (or right-click). Add frames with the + in the dock. Two or more frames make a flipbook." },
  { title:"Studio", icon:"🎨", content:"The Studio is your modular workshop. Buy modules from the Shop to unlock layers, blend modes, symmetry, markers, chalk, clone, blur, smudge, replace, and more. Mix and match your kit." },
  { title:"LilLok", icon:"🖌️", content:"LilLok is your companion blorb. Feed it ink (earned by drawing, voting, quests). Keep it above 30 ink or it enters decay. Below 10 is critical. At 0 it goes stasis and you must revive it. Tap the LilLok icon top-right to check on yours." },
  { title:"Streak & Daily", icon:"🔥", content:"Visit every day to build your streak. Each day has a prompt. Claim your daily bonus for Loks, XP, and LilLok ink. Streak milestones unlock bonus Loks every 7th and 30th day. Miss more than 7 days and your streak resets." },
  { title:"Voting", icon:"🗳️", content:"Vote on flips you love. Each vote earns you 5 Loks and 5 XP. The creator gets notified. Voting also counts toward your Vote badge progression." },
  { title:"Reactions", icon:"😄", content:"React to flips with splats, hearts, and drips. Also try HumHah (agreement/amazement) and BomHogWah (surprise/awe/sympathy). Reactions earn zero rewards — pure emotional tally." },
  { title:"Offline Bonus", icon:"🏝️", content:"Step away for 5+ hours and come back to an Offline Bonus: 50 Loks, 10 XP, and 20 ink for LilLok. It's a welcome-back gift, not a reason to stay away. Max once per day." },
  { title:"Lok & Bookmarks", icon:"🔖", content:"Lok artists you love to follow their feed. Bookmark flips to save them to your profile gallery. Bookmarked pieces are visible from your profile page." },
  { title:"Shop", icon:"🛍️", content:"The Shop is where you spend Loks on UI themes, Studio modules, reaction packs, avatar frames, name colors, paper textures, LilLok gear, and effects." },
  { title:"Themes", icon:"🎭", content:"Themes change the entire look of LokBook. 23 themes across 4 waves. Wave 1 is free, Waves 2-4 are unlocked via the Shop. Some themes are animated (aurora, ocean, glitch, vapor)." },
  { title:"Quests", icon:"📋", content:"Daily quests refresh each day. Complete them for Loks and XP. Quest milestones (10, 25, 50, 100 completed) are tracked on your profile. Each quest has a goal and reward." },
  { title:"Battles", icon:"⚔️", content:"Occasional drawing battles appear. Submit your entry and the community votes. Winners get a win tally on their profile. Battle pieces get published automatically." },
  { title:"Badges", icon:"🏆", content:"20 badges across 5 categories: Collection, Social, Streak, Creator, and Special. Unlock them by drawing, voting, streaks, and special achievements. View your Badge Wall from your profile." },
  { title:"Revivals", icon:"♻️", content:"If LilLok enters stasis (0 ink), you must revive it. The revival easel opens and you draw a 2+ frame revival animation. Success brings LilLok back with full ink." },
  { title:"Feed & Parties", icon:"🌐", content:"The feed shows published flips from all artists. Switch to Following to see only artists you've Lok'd. Flip of the Day highlights a standout piece. Remote posts appear from the party server." },
  { title:"Accounts & Cloud", icon:"☁️", content:"Create an account (handle + PIN) to sync your progress to LokServices. Log in on any device to pick up where you left off. Published flips go to the party feed." },
  { title:"LokPass", icon:"🪪", content:"LokPass is a $2.99 purchase that removes ads and unlocks every UI theme. You also get the PASS badge on your profile. One-time purchase, permanent unlock." },
  { title:"Founders", icon:"🏅", content:"Founders get their progress backed up on LokServices and a permanent Founder badge. Join from Settings to lock in your gallery, Loks, and LilLok for the beta." },
  { title:"Tips & Tricks", icon:"💡", content:"Double-tap the version number in Settings to unlock Sound Lab. Use the search in your gallery. Earn Loks by drawing, voting, and streaks. Long press in the Easel for quick actions. Frame pacing controls how fast the feed scrolls." },
];

export const lokApi = {
  async signup(handle, pin, blob) {
    const pin_hash = await hashPin(pin);
    const r = await fetch(`${SUPA_URL}/rest/v1/lok_accounts`, { method: "POST", headers: { ...getHeaders(), Prefer: "return=representation" }, body: JSON.stringify({ handle, pin_hash, save_blob: blob }) });
    if (r.status === 409) throw new Error("taken");
    if (!r.ok) throw new Error("signup " + r.status);
    return (await r.json())[0];
  },
  async login(handle, pin) {
    const r = await fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(handle)}&select=handle,pin_hash,save_blob`, { headers: getHeaders() });
    if (!r.ok) throw new Error("login " + r.status);
    const rows = await r.json();
    if (!rows.length) throw new Error("nouser");
    if ((await hashPin(pin)) !== rows[0].pin_hash) throw new Error("badpin");
    return rows[0];
  },
  async fetchSave(handle) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(handle)}&select=save_blob`, { headers: getHeaders() });
      if (!r.ok) return null;
      const rows = await r.json();
      return rows.length ? rows[0].save_blob : null;
    } catch { return null; }
  },
  async pushSave(handle, blob, userId) {
    if (userId) {
      try { await fetch(`${SUPA_URL}/rest/v1/auth_saves`, { method: "POST", headers: { ...getHeaders(), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: userId, save_blob: blob, updated_at: new Date().toISOString() }) }); } catch {}
    } else {
      try { await fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(handle)}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ save_blob: blob, updated_at: new Date().toISOString() }) }); } catch {}
    }
  },
  async fetchAuthSave(userId) {
    try { const r = await fetch(`${SUPA_URL}/rest/v1/auth_saves?user_id=eq.${userId}&select=save_blob`, { headers: getHeaders() }); if (!r.ok) return null; const rows = await r.json(); return rows[0]?.save_blob || null; } catch { return null; }
  },
  async publishPost(dbPost) {
    try { const r = await fetch(`${SUPA_URL}/rest/v1/lok_posts`, { method: "POST", headers: { ...getHeaders(), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(dbPost) }); return r.ok; } catch { return false; }
  },
  async fetchPosts(limit = 60, before = null, search = null, author = null) {
    let url = `${SUPA_URL}/rest/v1/lok_posts?select=*&order=created_at.desc&limit=${limit}`;
    if (before) url += `&created_at.lt.${encodeURIComponent(before)}`;
    if (search) url += `&title.ilike.*${encodeURIComponent(search)}*`;
    if (author) url += `&author.eq.${encodeURIComponent(author)}`;
    const r = await fetch(url, { headers: getHeaders() });
    if (!r.ok) return [];
    return r.json();
  },
  async fetchAuthorPosts(author) {
    return this.fetchPosts(60, null, null, author);
  },
  async votePost(id, votes) {
    try { await fetch(`${SUPA_URL}/rest/v1/lok_posts?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ votes }) }); } catch {}
  },
};