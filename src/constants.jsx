import { SUPA_URL, SUPA_KEY, supabase } from "./supabaseClient.js";
export { SUPA_URL, SUPA_KEY, supabase };

export const W = 480;
export const H = 600;

export const PROMPT_META = [
  // Animals (8)
  { text:"A very smug cat", category:"animals", motion:"static" },
  { text:"An animal made of shadow", category:"animals", motion:"transform" },
  { text:"A fox who stole the moon", category:"animals", motion:"loop" },
  { text:"A flock of paper cranes", category:"animals", motion:"loop" },
  { text:"The slowest turtle", category:"animals", motion:"static" },
  { text:"A snake made of rainbows", category:"animals", motion:"transform" },
  { text:"A wolf howling at neon", category:"animals", motion:"loop" },
  { text:"A jellyfish in zero gravity", category:"animals", motion:"loop" },
  // Fantasy (10)
  { text:"A creature made of weather", category:"fantasy", motion:"loop" },
  { text:"Dancing mushrooms", category:"fantasy", motion:"loop" },
  { text:"A magic tree that remembers everything", category:"fantasy", motion:"static" },
  { text:"A tiny world inside a bottle", category:"fantasy", motion:"static" },
  { text:"A dragon made of stained glass", category:"fantasy", motion:"transform" },
  { text:"A ghost that knits", category:"fantasy", motion:"loop" },
  { text:"A wizard's first spell", category:"fantasy", motion:"transform" },
  { text:"A phoenix in the rain", category:"fantasy", motion:"loop" },
  { text:"A door that leads to yesterday", category:"fantasy", motion:"static" },
  { text:"The last unicorn's dream", category:"fantasy", motion:"loop" },
  // Scenes & Places (8)
  { text:"Night swimming", category:"scenes", motion:"static" },
  { text:"The last lighthouse", category:"scenes", motion:"static" },
  { text:"A city in a teacup", category:"scenes", motion:"static" },
  { text:"A map of somewhere imaginary", category:"scenes", motion:"static" },
  { text:"An abandoned amusement park", category:"scenes", motion:"static" },
  { text:"The view from a giants shoulder", category:"scenes", motion:"loop" },
  { text:"A secret garden at midnight", category:"scenes", motion:"static" },
  { text:"A bridge between two worlds", category:"scenes", motion:"static" },
  // Abstract & Emotion (6)
  { text:"Something soft that bites", category:"abstract", motion:"transform" },
  { text:"A feeling you can't name", category:"abstract", motion:"loop" },
  { text:"The shape of a memory", category:"abstract", motion:"transform" },
  { text:"A color that doesn't exist", category:"abstract", motion:"loop" },
  { text:"The sound of a whisper", category:"abstract", motion:"loop" },
  { text:"A knot that keeps tying itself", category:"abstract", motion:"loop" },
  // Objects & Machines (6)
  { text:"A machine with feelings", category:"objects", motion:"static" },
  { text:"A plant that shouldn't exist", category:"objects", motion:"transform" },
  { text:"The smallest storm", category:"objects", motion:"loop" },
  { text:"Two things that don't belong together", category:"objects", motion:"static" },
  { text:"Your breakfast as a hero", category:"objects", motion:"transform" },
  { text:"A clock that runs backwards", category:"objects", motion:"loop" },
  // Space & Sci-fi (6)
  { text:"A spaceship powered by song", category:"space", motion:"loop" },
  { text:"The edge of a known galaxy", category:"space", motion:"static" },
  { text:"A robot learning to dream", category:"space", motion:"transform" },
  { text:"An alien flower garden", category:"space", motion:"loop" },
  { text:"A constellation that tells a story", category:"space", motion:"static" },
  { text:"A black hole with a heart", category:"space", motion:"loop" },
  // Underwater (5)
  { text:"A coral city at dawn", category:"underwater", motion:"loop" },
  { text:"A sea creature made of light", category:"underwater", motion:"loop" },
  { text:"The deepest trench", category:"underwater", motion:"static" },
  { text:"A message in a bottle", category:"underwater", motion:"static" },
  { text:"A kelp forest dance", category:"underwater", motion:"loop" },
  // Food (4)
  { text:"A bakery for dreamers", category:"food", motion:"static" },
  { text:"The last slice of infinity", category:"food", motion:"transform" },
  { text:"A tea party on mercury", category:"food", motion:"loop" },
  { text:"A recipe for courage", category:"food", motion:"static" },
  // Characters (4)
  { text:"A knight made of origami", category:"characters", motion:"transform" },
  { text:"The quietest superhero", category:"characters", motion:"static" },
  { text:"A pirate who maps feelings", category:"characters", motion:"static" },
  { text:"A shadow that left its owner", category:"characters", motion:"loop" },
  // Music & Sound (3)
  { text:"A song painted on a wall", category:"music", motion:"loop" },
  { text:"An instrument nobody plays", category:"music", motion:"static" },
  { text:"A dance that creates the world", category:"music", motion:"loop" },
];
export const PROMPTS = PROMPT_META.map(p => p.text);
export const CATEGORIES = [...new Set(PROMPT_META.map(p => p.category))];
export const MOTION_TYPES = ["static","loop","transform"];
export const CATEGORY_ICONS = { animals:"🐾", fantasy:"✨", scenes:"🏞️", abstract:"🌀", objects:"📦", space:"🚀", underwater:"🌊", food:"🍕", characters:"🎭", music:"🎵" };

export const weekOfYear = d => Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
export const WEEKLY_PROMPT = PROMPTS[(new Date().getFullYear() * 53 + weekOfYear(new Date())) % PROMPTS.length];


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
  // Ids below resolve to style objects in ROTATION_BORDERS (engine/rotation.js),
  // spread into the blot-border lookup in theme/theme.js.
  { id: "c_border_stitch", name: "Cross-stitch", price: 40 },
  { id: "c_border_halo", name: "Halo ring", price: 65 },
  { id: "c_border_glitch", name: "Glitch split", price: 55 },
];

export const BLOT_PERSONALITIES = [
  { id: "vibes", name: "Good Vibes", price: 0, emoji: "✨", desc: "Chill and positive — the default cool friend" },
  { id: "hype", name: "Hype Master", price: 60, emoji: "🔥", desc: "High-energy, always hyped, celebrates everything" },
  { id: "wisdom", name: "Wise Ink", price: 45, emoji: "🧠", desc: "Thoughtful and encouraging, gives solid advice" },
  { id: "goofy", name: "Goofy Blot", price: 35, emoji: "🤪", desc: "Silly and playful, makes jokes and puns" },
  { id: "chill", name: "Zen Master", price: 50, emoji: "🧘", desc: "Relaxed vibes, encouraging self-care and balance" },
];

export const BLOT_IDLE_ANIMATIONS = [
  { id: "float", name: "Gentle Float", price: 0, desc: "Soft up-and-down floating", giftReward: "heart" },
  { id: "sway", name: "Sway", price: 25, desc: "Side-to-side gentle swaying", giftReward: "flower" },
  { id: "pulse", name: "Pulse", price: 35, desc: "Rhythmic breathing-like pulse", giftReward: "sparkle" },
  { id: "wiggle", name: "Wiggle", price: 30, desc: "Playful wiggling motion", giftReward: "star" },
  { id: "bounce_idle", name: "Bouncy Rest", price: 40, desc: "Subtle bouncing while idle", giftReward: "treasure" },
  { id: "spin_slow", name: "Slow Spin", price: 45, desc: "Gentle rotating motion", giftReward: "crown" },
];

export const BLOT_EXPRESSIONS = [
  { id: "neutral", name: "Neutral", price: 0, desc: "Calm and centered", giftReward: "heart" },
  { id: "happy", name: "Happy", price: 20, desc: "Cheerful and bright", giftReward: "star" },
  { id: "excited", name: "Excited", price: 25, desc: "Eyes wide and energetic", giftReward: "sparkle" },
  { id: "sleepy", name: "Sleepy", price: 20, desc: "Relaxed and drowsy", giftReward: "flower" },
  { id: "thinking", name: "Thinking", price: 30, desc: "Pondering and thoughtful", giftReward: "treasure" },
  { id: "playful", name: "Playful", price: 25, desc: "Mischievous and fun", giftReward: "rainbow" },
];

export const BLOT_BOUNCES = [
  { id: "gentle", name: "Gentle Bounce", price: 0, desc: "Soft and subtle bounce", giftReward: "heart" },
  { id: "energetic", name: "Energetic Bounce", price: 30, desc: "Punchy and enthusiastic", giftReward: "sparkle" },
  { id: "bouncy", name: "Super Bouncy", price: 40, desc: "High-energy bouncing", giftReward: "crown" },
  { id: "elastic", name: "Elastic Bounce", price: 35, desc: "Stretchy springy motion", giftReward: "treasure" },
  { id: "wobbly", name: "Wobbly Bounce", price: 25, desc: "Unbalanced and jiggly", giftReward: "flower" },
];

export const CHEST_TYPES = [
  { id: "common", name: "Common Chest", rarity: "common", emoji: "📦", color: "#9CA3AF", animIntensity: 0.5, baseLoktokens: [50, 150] },
  { id: "uncommon", name: "Uncommon Chest", rarity: "uncommon", emoji: "🎁", color: "#22C55E", animIntensity: 1.0, baseLoktokens: [150, 350] },
  { id: "rare", name: "Rare Chest", rarity: "rare", emoji: "📫", color: "#3B82F6", animIntensity: 1.5, baseLoktokens: [350, 750] },
  { id: "epic", name: "Epic Chest", rarity: "epic", emoji: "🏆", color: "#A855F7", animIntensity: 2.0, baseLoktokens: [750, 1500] },
  { id: "legendary", name: "Legendary Chest", rarity: "legendary", emoji: "👑", color: "#F59E0B", animIntensity: 2.5, baseLoktokens: [1500, 3000] },
  { id: "mythic", name: "Mythic Chest", rarity: "mythic", emoji: "✨", color: "rainbow", animIntensity: 3.0, baseLoktokens: [3000, 6000] },
];

export const BLOT_GIFTS = [
  { id: "heart", name: "Heart", emoji: "❤️", rarity: "common" },
  { id: "star", name: "Star", emoji: "⭐", rarity: "common" },
  { id: "flower", name: "Flower", emoji: "🌸", rarity: "uncommon" },
  { id: "sparkle", name: "Sparkle", emoji: "✨", rarity: "uncommon" },
  { id: "treasure", name: "Treasure", emoji: "💎", rarity: "rare" },
  { id: "crown", name: "Crown", emoji: "👑", rarity: "rare" },
  { id: "rainbow", name: "Rainbow", emoji: "🌈", rarity: "epic" },
  { id: "meteor", name: "Meteor", emoji: "☄️", rarity: "epic" },
];

// Lok Chest reward system — weighted distribution for X-ray Vision, Goggles, items, and tokens
export function generateChestReward(chestType, ownedModules = [], ownedCosmetics = {}, ownedGoggles = {}) {
  const chest = CHEST_TYPES.find(c => c.id === chestType);
  if (!chest) return { type: "loks", amount: 100 };

  // Check for X-ray Vision drop (rarity-specific drop rate)
  const xrayDropRate = XRAY_VISION_DROP_RATES[chestType] || 0;
  if (Math.random() < xrayDropRate) {
    const xrayKey = `xrayVision${chestType.charAt(0).toUpperCase()}${chestType.slice(1)}`;
    if (!ownedCosmetics[xrayKey]) {
      return { type: "xrayVision", rarity: chestType };
    }
  }

  // Check for Goggles drop (only for uncommon and above)
  if (chestType !== "common") {
    const goggleVariant = GOGGLE_VARIANTS[chestType];
    if (goggleVariant && Math.random() < goggleVariant.dropRate) {
      return { type: "goggles", rarity: chestType, count: 1 };
    }
  }

  // 20% chance for store item
  const isFreeItem = Math.random() < 0.2;

  if (isFreeItem) {
    // Get items with no requirement and not already owned
    const itemPool = [
      ...LILLOK_GEAR.filter(g => g.price <= 150 && !g.rarity),
      ...PAPERS.filter(p => p.price <= 60),
      ...EFFECTS.filter(e => e.price <= 60),
      ...FRAMES.filter(f => f.price <= 60),
      ...SKIES.filter(s => s.price <= 60),
      ...BLOT_PERSONALITIES.slice(0, 2), // just vibes and goofy
    ].filter(item => !ownedModules.includes(item.id));

    if (itemPool.length > 0) {
      const item = itemPool[Math.floor(Math.random() * itemPool.length)];
      return { type: "item", itemId: item.id, itemName: item.name };
    }
  }

  // Fallback: Lok tokens
  const [min, max] = chest.baseLoktokens;
  const amount = Math.floor(min + Math.random() * (max - min));
  return { type: "loks", amount };
}

export function getRandomChestType() {
  // Weighted distribution: common > uncommon > rare > epic > legendary > mythic
  const weights = [40, 30, 15, 10, 4, 1];
  const rand = Math.random() * 100;
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (rand < sum) return CHEST_TYPES[i].id;
  }
  return "common";
}

// X-ray Vision drop rates per rarity tier
export const XRAY_VISION_DROP_RATES = {
  common: 0.05,
  uncommon: 0.025,
  rare: 0.015,
  epic: 0.01,
  legendary: 0.005,
  mythic: 0.001,
};

// X-ray Goggles variants by rarity
export const GOGGLE_VARIANTS = {
  uncommon: { rarity: "uncommon", dropRate: 0.05, usableOn: "uncommon+" },
  rare: { rarity: "rare", dropRate: 0.03, usableOn: "rare+" },
  epic: { rarity: "epic", dropRate: 0.02, usableOn: "epic+" },
  legendary: { rarity: "legendary", dropRate: 0.01, usableOn: "legendary+" },
  mythic: { rarity: "mythic", dropRate: 0.005, usableOn: "mythic+" },
};

// LokPal AI character names
export const LOKPAL_NAMES = [
  "Pip", "Nova", "Sage", "Ryx", "Lum", "Echo", "Iris", "Kael",
  "Zephyr", "Ember", "Finn", "Aria", "Opal", "Dash", "Vex", "Lyra",
  "Moss", "Aurora", "Blaze", "Pixel", "Wraith", "Sunny", "Storm", "Drift"
];

// LokPal greeting templates
export const LOKPAL_GREETINGS = [
  "Hi there! I found something for you!",
  "Hey! Got a surprise in store.",
  "Thought of you today — here's a gift!",
  "A little something came your way.",
  "Found this and thought you'd like it!",
  "Sending good vibes your way!"
];

// LokPal irritation message tiers (escalating tone)
export const LOKPAL_IRRITATION_MESSAGES = [
  // Level 0: Normal (same as greetings)
  ["Hi there! I found something for you!", "Hey! Got a surprise in store.", "Thought of you today — here's a gift!", "A little something came your way.", "Found this and thought you'd like it!", "Sending good vibes your way!"],
  // Level 1: Slightly sad
  ["Hey... got something if you want it", "Just... leaving this here", "Found something for you", "Thought of you, even though..."],
  // Level 2: Hint of frustration
  ["Look, I grabbed this for you", "Not trying to beg but... here", "Got a thing. You interested?", "I mean, if you care..."],
  // Level 3: Noticeably bothered
  ["Seriously though, where've you been", "I mean, I got you something, but...", "It's fine if you don't want this", "Another gift for your collection, apparently"],
  // Level 4: Sarcastic
  ["You know what, fine. More stuff for you", "Cool cool, just me over here finding things", "Whatever, here's another gift", "Because I love doing this 😒"],
  // Level 5: Fed up
  ["Is this some kind of game? Leaving you stuff", "Do you even open your mail?", "Starting to feel ignored honestly", "Can't believe I'm still doing this"],
  // Level 6: Irritated
  ["Oh great, another gift nobody wants", "I'm getting real tired of this", "Cool cool cool cool fine"],
  // Level 7: Angry
  ["You know what... I'm done being nice", "Stop ignoring me", "This is ridiculous", "Seriously?? SERIOUSLY???"],
  // Level 8: Very angry
  ["FINE. HERE'S YOUR STUFF. UNGRATEFUL", "Wow. Okay. Message received", "I see how it is now", "Thanks for NOTHING"],
  // Level 9: Furious
  ["I'm literally putting gifts on your doorstep and you're IGNORING ME", "This is insulting", "One more unread and I'm OUT", "DO YOU EVEN CARE???"],
  // Level 10: Stopped trying
  ["Not sending ANOTHER thing until you open your mail", "I'm DONE", "See you when you decide to show up", "I give up."],
  // Level 11: Resigned sadness
  ["...", "Still here. Waiting.", "(sighs)", "Is this even worth it anymore?"],
  // Level 12: Begging
  ["You're killing me here", "Please just open ONE email", "I'm begging you", "Come back... please?"],
  // Level 13: Completely broken
  ["I GIVE UP", "Consider my feelings hurt", "Not sending ANYTHING until you read", "You've broken me, truly"],
  // Level 14: Done forever
  ["............", "I'm too hurt to even send gifts anymore", "We're done until you show respect", "Goodbye."]
];

export const COMMENT_REWARD_TRIGGERS = [
  { phrase: "beautiful", regex: /beautiful/i, reward: 15 },
  { phrase: "amazing", regex: /amazing/i, reward: 15 },
  { phrase: "incredible", regex: /incredible/i, reward: 15 },
  { phrase: "love this", regex: /love\s+this/i, reward: 15 },
  { phrase: "so cool", regex: /so\s+cool/i, reward: 15 },
  { phrase: "talent", regex: /talent/i, reward: 15 },
  { phrase: "masterpiece", regex: /masterpiece/i, reward: 15 },
  { phrase: "stunning", regex: /stunning/i, reward: 15 },
  { phrase: "brilliant", regex: /brilliant/i, reward: 15 },
  { phrase: "gorgeous", regex: /gorgeous/i, reward: 15 },
];

export const FOD_WINDOW_DAYS = 7;
export const ANIMATED_AVATAR_SPEND = 5000;

// Ad inventory, typed by the surface each entry can fill. `format` must match
// what src/ads.js routes for a given viewport tier — a "rail" entry is tall and
// never appears on phone, a "banner" entry is one line and never appears in a
// desktop rail. `slot` is the id handed to the ad network.
export const ADS = [
  { format: "banner", text: "Your art could live here", cta: "Advertise", slot: "lok-banner-1" },
  { format: "banner", text: "Draw more. Earn more Loks.", cta: "Studio →", slot: "lok-banner-2" },
  { format: "banner", text: "LokPass — no ads, every theme", cta: "Get it", slot: "lok-banner-3" },
  { format: "rail", title: "Your art could live here", text: "Reach artists who actually draw.", cta: "Advertise", slot: "lok-rail-1" },
  { format: "rail", title: "LokPass", text: "No ads, every theme, PASS badge. One-time $2.99.", cta: "Get LokPass", slot: "lok-rail-2" },
  { format: "rail", title: "Studio Pro", text: "More frames, finer brushes, faster export.", cta: "See it", slot: "lok-rail-3" },
  { format: "feed", title: "Your art could live here", text: "Sponsored placements in the Lok feed.", cta: "Advertise", slot: "lok-feed-1" },
  { format: "feed", title: "Draw more. Earn more.", text: "Every flip you publish earns Loks.", cta: "Open Studio", slot: "lok-feed-2" },
  { format: "interstitial", title: "LokPass", text: "Remove ads forever. Keep every theme.", cta: "Get LokPass", slot: "lok-full-1" },
];

/** Ads matching a surface format, in rotation order. */
export const adsFor = format => ADS.filter(a => a.format === format);

export const QUEST_POOL = [
  { id: "vote3", label: "Vote on 3 pieces", goal: 3, reward: 15, track: "vote" },
  { id: "view5", label: "Slide through 5 flips", goal: 5, reward: 15, track: "view" },
  { id: "draw1", label: "Publish 1 creation", goal: 1, reward: 25, track: "publish" },
  { id: "battle1", label: "Play a battle", goal: 1, reward: 20, track: "battle" },
  { id: "front5", label: "Grab 5 prompts in Rush", goal: 5, reward: 15, track: "front" },
  { id: "feed", label: "Lok in 2 artists", goal: 2, reward: 15, track: "lok" },
];

// NAME_COLOR_MAP is derived from NAME_COLORS + the rotation colours, further
// down this file (it needs both arrays). It used to be hand-maintained here and
// had drifted: `well` and `ember` were sold in NAME_COLORS but missing from the
// map, so NameTag fell through to the default colour and both were inert.

export const REACTION_SETS = { base: ["splat", "heart", "drip"], stars: ["star", "sparkle", "comet"], fire: ["flame", "bolt2", "skull2"], zen: ["leaf", "wave2", "lotus"], spooky: ["ghost", "spiderweb", "eyeball"], sweet: ["cupcake", "icecream", "candy"] };


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
  comeback_tease: ["Go away for CincoOrSo Hours and see what happens!", "Take a real break. I'll be here when you get back.", "Five hours away. I dare you.", "You should go touch grass. for like 5 hours."],
  comeback_award: ["WELCOME BACK! You actually left!", "You took a break! I'm so proud.", "The ink missed you. Here's a gift.", "Absence makes the ink grow fonder."],
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
export const CELEBRATIONS = [
  { id:"confetti", name:"Confetti Cascade", desc:"Colorful confetti rains down across the app", fx:"confetti" },
  { id:"inkbloom", name:"Ink Bloom", desc:"Ink flowers bloom and pulse across the screen", fx:"inkbloom" },
  { id:"starburst", name:"Starburst", desc:"Stars explode outward from center", fx:"starburst" },
];



export const PX_PER_FRAME = 150;

export const RARITY = {
  common:    { name:"Common",    color:"#9CA3AF", glow:"0 0 0 transparent",         order:0, icon:"⬜" },
  uncommon:  { name:"Uncommon",  color:"#22C55E", glow:"0 0 6px rgba(34,197,94,0.3)",  order:1, icon:"🟢" },
  rare:      { name:"Rare",      color:"#3B82F6", glow:"0 0 8px rgba(59,130,246,0.35)", order:2, icon:"🔵" },
  epic:      { name:"Epic",      color:"#A855F7", glow:"0 0 10px rgba(168,85,247,0.4)", order:3, icon:"🟣" },
  legendary: { name:"Legendary", color:"#F59E0B", glow:"0 0 14px rgba(245,158,11,0.5)", order:4, icon:"🟠" },
  mythic:    { name:"Mythic",    color:"transparent", glow:"0 0 20px rgba(255,93,162,0.5)", order:5, icon:"💎" },
};

export const MYTHIC_ITEMS = [
  { id:"mythic_galaxy",  name:"Galaxy Veil",       desc:"A nebula of stars follows your brush. Every stroke is a galaxy.", price:2000, rarity:"mythic", type:"effect",         fxId:"galaxy" },
  { id:"mythic_aurora",  name:"Aurora Cascade",     desc:"Living aurora pulses across the canvas as you draw.",           price:1800, rarity:"mythic", type:"effect",         fxId:"aurora" },
  { id:"mythic_void",    name:"Void Walker",         desc:"Deep space in every line — watch the void bloom.",              price:2500, rarity:"mythic", type:"frame",          fxId:"void" },
  { id:"mythic_ripple",  name:"Ripple Lord",         desc:"Every stroke sends ripples through the fabric of the page.",    price:1500, rarity:"mythic", type:"effect",         fxId:"ripple" },
  { id:"mythic_cosmic",  name:"Cosmic Crown",        desc:"Celestial geometry frames your art in orbiting brilliance.",    price:3000, rarity:"mythic", type:"frame",          fxId:"cosmic" },
  { id:"mythic_nebula",  name:"Nebula Veil",         desc:"Swirling cosmic dust drifts across your gallery.",              price:2200, rarity:"mythic", type:"paper",          fxId:"nebula" },
  { id:"mythic_storm",   name:"Stormcaller",         desc:"Summon lightning with every stroke — ink that crackles.",       price:2800, rarity:"mythic", type:"animation_fx",   fxId:"storm" },
  { id:"mythic_pixel",   name:"Prism Shard",         desc:"Light bends through your lines in a rainbow of refractions.",   price:1600, rarity:"mythic", type:"name_color",     fxId:"prism" },
  { id:"mythic_echo",    name:"Echo Bloom",          desc:"Rings of ink pulse outward from every mark you make.",           price:1900, rarity:"mythic", type:"animation_fx",   fxId:"echo" },
  { id:"mythic_bloom",   name:"Bloom of Worlds",     desc:"A cosmic flower unfurls inside every frame you create.",         price:3500, rarity:"mythic", type:"effect",         fxId:"bloom" },
  { id:"mythic_phoenix", name:"Phoenix Ascent",      desc:"Ashen wings trail every stroke — reborn in fire.",                price:2800, rarity:"mythic", type:"effect",         fxId:"phoenix" },
  { id:"mythic_timeless",name:"Timeless Gear",        desc:"Clockwork cog border orbiting in perpetual motion.",             price:3200, rarity:"mythic", type:"frame",          fxId:"timeless" },
  { id:"mythic_dreamweave",name:"Dreamweave",         desc:"Shifting silk moire texture — no two views the same.",           price:2500, rarity:"mythic", type:"paper",          fxId:"dreamweave" },
  { id:"mythic_voidsong",name:"Voidsong",              desc:"Resonant rings pulse from your art like a tuning fork.",          price:4000, rarity:"mythic", type:"animation_fx",   fxId:"voidsong" },
  { id:"mythic_starborn",name:"Starborn",              desc:"Living constellation skin — stars blink across LilLok.",          price:5000, rarity:"mythic", type:"lillok_skin",    fxId:"starborn" },
  { id:"mythic_chrono",  name:"Chrono Prism",          desc:"Rainbow-shifting name light that cycles through every hue.",     price:2200, rarity:"mythic", type:"name_color",     fxId:"chrono" },
  { id:"mythic_umbra",   name:"Umbra Gate",            desc:"Void portal border that implodes and expands rhythmically.",      price:4500, rarity:"mythic", type:"frame",          fxId:"umbra" },
  { id:"mythic_celestia",name:"Celestia Veil",         desc:"Polarized aurora sweep — curtains of light across the canvas.",  price:3500, rarity:"mythic", type:"effect",         fxId:"celestia" },
  { id:"mythic_titan",   name:"Titan's Grip",          desc:"Weighty gauntlet cursor with a shockwave on click.",              price:1800, rarity:"mythic", type:"cursor",         fxId:"titan" },
  { id:"mythic_infinity",name:"Infinity Bloom",        desc:"Endless ∞ traced in particle light that never extinguishes.",    price:5000, rarity:"mythic", type:"effect",         fxId:"infinity" },
  { id:"mythic_canvasframe",name:"Prism Frame",        desc:"An animated rainbow border frames your Studio canvas while you draw — the only mythic that lives in Studio itself, not just the feed.", price:2600, rarity:"mythic", type:"canvas_border", fxId:"canvasframe" },
];

export const DAILY_ITEMS = [
  { id:"d_frame_vintage",   name:"Vintage Film",      desc:"Old movie reel corners",     price:35,  rarity:"uncommon", type:"frame" },
  { id:"d_frame_inkburst",  name:"Ink Burst",          desc:"Splatter-edged border",      price:50,  rarity:"rare",     type:"frame" },
  { id:"d_frame_geometric", name:"Geometric Grid",     desc:"Tessellated frame pattern", price:60,  rarity:"epic",     type:"frame" },
  { id:"d_frame_sketch",    name:"Sketchy Edge",       desc:"Hand-drawn rough border",    price:30,  rarity:"common",   type:"frame" },
  { id:"d_frame_nebula",    name:"Nebula Haze",        desc:"Soft cosmic edge glow",      price:80,  rarity:"legendary",type:"frame" },
  { id:"d_eff_fireflies",   name:"Fireflies",          desc:"Floating fireflies at dusk", price:45,  rarity:"rare",     type:"effect" },
  { id:"d_eff_bubbles",     name:"Bubble Float",       desc:"Rising iridescent bubbles",  price:35,  rarity:"uncommon", type:"effect" },
  { id:"d_eff_pollen",      name:"Golden Pollen",      desc:"Drifting flecks of light",   price:55,  rarity:"epic",     type:"effect" },
  { id:"d_eff_fog",         name:"Morning Fog",        desc:"Lichen mist rolling in",      price:30,  rarity:"common",   type:"effect" },
  { id:"d_eff_stardust",    name:"Stardust",           desc:"Cosmic dust in moonbeams",    price:85,  rarity:"legendary",type:"effect" },
  { id:"d_name_ember",      name:"Ember Glow",         desc:"Warm orange flicker",        price:40,  rarity:"uncommon", type:"name_color", color:"#FF6B35" },
  { id:"d_name_mint",       name:"Mint Leaf",          desc:"Fresh cool green",           price:40,  rarity:"uncommon", type:"name_color", color:"#2ECC71" },
  { id:"d_name_coral",      name:"Coral Reef",         desc:"Ocean sunset pink",          price:50,  rarity:"rare",     type:"name_color", color:"#FF6F61" },
  { id:"d_name_lavender",   name:"Lavender Dream",     desc:"Soft twilight purple",       price:55,  rarity:"epic",     type:"name_color", color:"#9B59B6" },
  { id:"d_name_phantom",    name:"Phantom White",      desc:"Ghostly pale glow",          price:80,  rarity:"legendary",type:"name_color", color:"#ECF0F1" },
  { id:"d_sky_twilight",    name:"Twilight Glow",      desc:"Purple-orange twilight",     price:40,  rarity:"uncommon", type:"sky" },
  { id:"d_sky_thunder",     name:"Thunderhead",        desc:"Dark storm sky",              price:45,  rarity:"rare",     type:"sky" },
  { id:"d_sky_milkyway",    name:"Milky Way",          desc:"Galactic star field",         price:65,  rarity:"epic",     type:"sky" },
  { id:"d_sky_sunflare",    name:"Sun Flare",          desc:"Golden hour blaze",           price:35,  rarity:"common",   type:"sky" },
  { id:"d_acc_crescent",    name:"Crescent Moon",      desc:"Sliver of moon behind head",  price:30,  rarity:"uncommon", type:"avatar_accent" },
  { id:"d_acc_wings",       name:"Ink Wings",          desc:"Spread of ink feathers",      price:50,  rarity:"rare",     type:"avatar_accent" },
  { id:"d_acc_clock",       name:"Clockwork",          desc:"Spinning gear halo",          price:65,  rarity:"epic",     type:"avatar_accent" },
  { id:"d_acc_flame",       name:"Flame Crown",        desc:"Burning corona of fire",      price:90,  rarity:"legendary",type:"avatar_accent" },
  { id:"d_paper_vinyl",     name:"Vinyl Grain",        desc:"Warm record crackle texture", price:40,  rarity:"uncommon", type:"paper" },
  { id:"d_paper_linen",     name:"Linen Weave",        desc:"Fine woven fabric texture",   price:45,  rarity:"rare",     type:"paper" },
  { id:"d_paper_metallic",  name:"Metallic Foil",      desc:"Shiny foil reflection",       price:70,  rarity:"epic",     type:"paper" },
  { id:"d_paper_parchment", name:"Aged Parchment",     desc:"Ancient scroll texture",      price:50,  rarity:"rare",     type:"paper" },
  { id:"d_cursor_flame",    name:"Flame Tip",          desc:"Cursor leaves a fire trail",  price:35,  rarity:"uncommon", type:"cursor" },
  { id:"d_cursor_ghost",    name:"Ghost Glide",        desc:"See-through trailing cursor",price:40,  rarity:"rare",     type:"cursor" },
  { id:"d_cursor_comet",    name:"Comet Streak",       desc:"Falling star cursor trail",   price:60,  rarity:"epic",     type:"cursor" },
  { id:"d_reaction_magic",  name:"Arcane Pack",        desc:"✨🪄⚡ Mystic reaction icons", price:45,  rarity:"rare",     type:"reaction" },
  { id:"d_reaction_sea",    name:"Ocean Pack",         desc:"🌊🐚🪸 Tidal reaction icons",price:40,  rarity:"uncommon", type:"reaction" },
  { id:"d_sticker_gothic",  name:"Gothic Pack",        desc:"🦇🌹💀 Dark romantic",       price:50,  rarity:"epic",     type:"sticker" },
  { id:"d_sticker_dream",   name:"Dream Pack",         desc:"💤🌙☁️ Soft dreamy",        price:40,  rarity:"uncommon", type:"sticker" },
  { id:"d_border_chain",    name:"Chain Link",         desc:"Interlocking metal border",   price:55,  rarity:"rare",     type:"blot_border" },
  { id:"d_border_neon",     name:"Neon Razor",         desc:"Sharp glowing edge",          price:75,  rarity:"epic",     type:"blot_border" },
  { id:"d_border_bone",     name:"Bone Cage",          desc:"Barbed skeletal frame",       price:100, rarity:"legendary",type:"blot_border" },
  { id:"d_border_tribal",   name:"Tribal Ink",         desc:"Ancient pattern border",      price:45,  rarity:"uncommon", type:"blot_border" },
  { id:"d_font_script",     name:"Elegant Script",     desc:"Flowing cursive letters",     price:40,  rarity:"uncommon", type:"font", font:"'Great Vibes',cursive" },
  { id:"d_font_gothic",     name:"Gothic Black",       desc:"Old English style",           price:50,  rarity:"rare",     type:"font", font:"'UnifrakturMaguntia',cursive" },
  { id:"d_font_future",     name:"Neon Future",        desc:"Glowing cyber type",          price:65,  rarity:"epic",     type:"font", font:"'Orbitron',sans-serif" },
  { id:"d_export_png_hd",   name:"PNG HD",            desc:"Double resolution PNG export",price:60,  rarity:"rare",     type:"export" },
  { id:"d_export_json",     name:"JSON Frames",        desc:"Export frame data as JSON",   price:40,  rarity:"uncommon", type:"export" },
  { id:"d_export_svg",      name:"SVG Trace",          desc:"Vector trace of your art",    price:90,  rarity:"epic",     type:"export" },
  { id:"d_gear_crown",      name:"Tiny Crown",         desc:"Golden crown for LilLok",     price:35,  rarity:"rare",     type:"lillok_gear" },
  { id:"d_gear_scarf",      name:"Cozy Scarf",         desc:"Knitted winter scarf",        price:25,  rarity:"common",   type:"lillok_gear" },
  { id:"d_skin_phantom",    name:"Phantom",            desc:"Translucent ghost skin",      price:350, rarity:"legendary",type:"lillok_skin" },
  { id:"d_pet_spark",       name:"Spark Blob",         desc:"Mini electric blob",          price:350, rarity:"epic",     type:"lillok_pet" },
  { id:"d_voice_melody",    name:"Melody Pack",        desc:"Musical tone responses",      price:180, rarity:"rare",     type:"voice" },
];

export const WEEKLY_ITEMS = [
  { id:"w_frame_solar",     name:"Solar Rings",        desc:"Concentric burning rings",      price:120, rarity:"legendary", type:"frame" },
  { id:"w_frame_crystal",   name:"Crystal Shard",      desc:"Shattered glass edge",          price:90,  rarity:"epic",     type:"frame" },
  { id:"w_frame_woven",     name:"Woven Thread",       desc:"Braided fiber border",          price:55,  rarity:"rare",     type:"frame" },
  { id:"w_eff_snow",        name:"Snow Drift",         desc:"Gentle falling snow",           price:60,  rarity:"rare",     type:"effect" },
  { id:"w_eff_plasma",      name:"Plasma Field",       desc:"Electric crackle effect",       price:100, rarity:"epic",     type:"effect" },
  { id:"w_eff_rainbow",     name:"Rainbow Sheen",      desc:"Shifting rainbow overlay",      price:130, rarity:"legendary",type:"effect" },
  { id:"w_name_abyss",      name:"Abyss Gaze",         desc:"Deep ocean blue-black",         price:70,  rarity:"epic",     type:"name_color", color:"#0B132B" },
  { id:"w_name_sunstone",   name:"Sunstone",           desc:"Warm amber radiance",           price:95,  rarity:"legendary",type:"name_color", color:"#FF7F50" },
  { id:"w_sky_comet",       name:"Comet Trail",        desc:"Streaking comet across sky",    price:70,  rarity:"rare",     type:"sky" },
  { id:"w_sky_borealis",    name:"Borealis Pulse",     desc:"Pulsing northern lights",       price:100, rarity:"epic",     type:"sky" },
  { id:"w_acc_stars",       name:"Star Chart",         desc:"Constellation map behind head", price:80,  rarity:"rare",     type:"avatar_accent" },
  { id:"w_acc_galactic",    name:"Galactic Orbit",     desc:"Rings of stars orbiting you",   price:120, rarity:"legendary",type:"avatar_accent" },
  { id:"w_paper_onyx",      name:"Onyx Slab",          desc:"Dark polished stone texture",   price:70,  rarity:"rare",     type:"paper" },
  { id:"w_paper_iridescent",name:"Iridescent",         desc:"Shifting rainbow shimmer",      price:110, rarity:"epic",     type:"paper" },
  { id:"w_cursor_phantom",  name:"Phantom Touch",      desc:"Ghostly afterimage trail",      price:65,  rarity:"rare",     type:"cursor" },
  { id:"w_cursor_thunder",  name:"Thbolt Cursor",      desc:"Lightning bolt pointer",        price:90,  rarity:"epic",     type:"cursor" },
  { id:"w_reaction_myth",   name:"Mythic Pack",        desc:"🐉🏛️⚡ Legendary reactions",    price:80,  rarity:"epic",     type:"reaction" },
  { id:"w_sticker_cyber",   name:"Cyber Pack",         desc:"🤖💿🔧 Tech dystopia",          price:65,  rarity:"rare",     type:"sticker" },
  { id:"w_border_rune",     name:"Rune Circle",        desc:"Ancient runic border",          price:90,  rarity:"epic",     type:"blot_border" },
  { id:"w_border_void",     name:"Void Ring",          desc:"Empty black hole edge",         price:140, rarity:"legendary",type:"blot_border" },
  { id:"w_font_runes",      name:"Runic Script",       desc:"Ancient rune lettering",         price:75,  rarity:"epic",     type:"font", font:"'Cinzel',serif" },
  { id:"w_font_cyber",      name:"Cyber Gothic",       desc:"Digital glitch display font",   price:85,  rarity:"epic",     type:"font", font:"'Major Mono Display',monospace" },
  { id:"w_skin_prism",      name:"Prism Scale",        desc:"Iridescent reptilian skin",     price:400, rarity:"legendary",type:"lillok_skin" },
  { id:"w_pet_wisp",        name:"Wisp",               desc:"Floating light spirit",         price:500, rarity:"legendary",type:"lillok_pet" },
  { id:"w_export_4k",       name:"4K Export",          desc:"Ultra HD frame export",         price:150, rarity:"legendary",type:"export" },
];

export function getDailyRotation() {
  const dS = Math.floor(Date.now() / 86400000);
  return DAILY_ITEMS.filter((_, i) => {
    const idx = (dS + i) % DAILY_ITEMS.length;
    return idx < 6;
  }).map((item, i) => ({ ...item, rotationSlot: `daily_${i}` }));
}
export function getWeeklyRotation() {
  const wS = Math.floor(Date.now() / 604800000);
  return WEEKLY_ITEMS.filter((_, i) => {
    const idx = (wS + i) % WEEKLY_ITEMS.length;
    return idx < 5;
  }).map((item, i) => ({ ...item, rotationSlot: `weekly_${i}` }));
}

export const BLENDS = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
export const TIERS=[{layers:10,label:"10 · Sketch",price:0},{layers:25,label:"25 · Studio",price:40},{layers:50,label:"50 · Pro",price:80},{layers:100,label:"100 · Marathon",price:150}];

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
  { id: "tool_transform", type: "tool", name: "Transform Tool", desc: "Move, rotate, flip & scale a layer", price: 55 },
  { id: "feat_brushlab_save", type: "feature", name: "Brush Lab Save", desc: "Save custom Brush Lab presets for later", price: 65 },
  { id: "feat_gif", type: "feature", name: "GIF Export", desc: "Export animation as animated GIF", price: 200 },
  { id: "feat_ref", type: "feature", name: "Reference Layer", desc: "Import image as semi-transparent reference", price: 80 },
  { id: "feat_palettes", type: "feature", name: "Palette Packs", desc: "6 curated color palettes", price: 30 },
  { id: "feat_smooth", type: "feature", name: "Stroke Smoothing", desc: "Auto-smooth bezier line fit", price: 60 },
  { id: "feat_tween", type: "feature", name: "Animation Presets", desc: "Auto-tween bounce, shake, fade, wiggle", price: 120 },
  { id: "feat_labels", type: "feature", name: "Frame Labels", desc: "Name each frame in the timeline", price: 25 },
  { id: "feat_blend", type: "feature", name: "Blend Modes", desc: "Multiply, screen, overlay & more blend modes", price: 60 },
  { id: "feat_symmetry", type: "feature", name: "Symmetry Tools", desc: "Mirror & radial symmetry guides", price: 50 },
  { id: "canvas_sizes", type: "canvas", name: "Canvas Sizes", desc: "Story, square & wide aspect ratios", price: 100 },
  { id: "module_uber", type: "feature", name: "Studio UBER", desc: "Ultimate module — unlocks all brushes, tools, layers, features & canvas sizes", price: 999 },
  { id: "brush_calligraphy", type: "brush", name: "Calligraphy", desc: "Variable-width calligraphy nib", price: 150 },
  { id: "brush_neon", type: "brush", name: "Neon Tube", desc: "Glowing neon tube stroke", price: 180 },
  { id: "brush_sparkle", type: "brush", name: "Sparkle Tip", desc: "Every dot sparkles on contact", price: 200 },
  { id: "brush_crayon", type: "brush", name: "Crayon Wax", desc: "Thick textured wax crayon", price: 120 },
  { id: "brush_wash", type: "brush", name: "Ink Wash", desc: "Broad semi-transparent wash", price: 160 },
  { id: "brush_galaxy", type: "brush", name: "Galaxy Brush", desc: "Star field colors in every stroke", price: 500 },
  { id: "canvas_infinite", type: "canvas", name: "Infinite Scroll", desc: "Vertical endless canvas", price: 300 },
  { id: "canvas_circular", type: "canvas", name: "Circular Canvas", desc: "Draw in a circular format", price: 250 },
  { id: "canvas_panorama", type: "canvas", name: "Panorama", desc: "Extra-wide cinematic ratio", price: 280 },
  { id: "canvas_xl", type: "canvas", name: "Canvas XL", desc: "Double resolution canvas", price: 350 },
  { id: "achieve_onion", type: "achievement", name: "Onion Skinning", desc: "Multi-frame onion skin preview", price: 0, unlock: "Studio Master badge" },
  { id: "achieve_persp", type: "achievement", name: "Perspective Grid", desc: "3-point perspective grid overlay", price: 0, unlock: "3 battle streak" },
  { id: "achieve_swatch", type: "achievement", name: "Custom Swatches", desc: "Save custom color swatches", price: 0, unlock: "25 published flips" },
  { id: "achieve_echo", type: "achievement", name: "Studio Echo", desc: "Record & replay studio sessions", price: 0, unlock: "10 Echoes shared" },
  { id: "achieve_cloud", type: "achievement", name: "Cloud Studio", desc: "Sync studio settings to cloud", price: 0, unlock: "Founder badge" },
  { id: "brush_legacy_pack", type: "module", name: "Legacy Brush Pack", desc: "Restore original brush behavior for all drawing tools", price: 150 },
  { id: "anim_fps", type: "feature", name: "FPS Control", desc: "Frame rate presets & scrubber playback head", price: 30 },
  { id: "anim_playback", type: "feature", name: "Advanced Playback", desc: "Loop, auto-advance, copy/paste frame & clear frame", price: 50 },
  { id: "anim_onion_pro", type: "feature", name: "Pro Onion Skin", desc: "Future frame preview, colored offsets, up to 5 frames", price: 60 },
  { id: "anim_export_video", type: "feature", name: "Video Export", desc: "Export animation as MP4/WebM video file", price: 150 },
  { id: "anim_export_spritesheet", type: "feature", name: "Sprite Sheet", desc: "Export all frames as a single grid image", price: 80 },
  { id: "anim_timeline_zoom", type: "feature", name: "Timeline Zoom", desc: "Resize timeline thumbnails from 40px to 120px", price: 40 },
  { id: "studio_pro", type: "feature", name: "Lok Studio Pro", desc: "Full brush engine — tip shape, dynamics, scattering, texture, dual brush, colour & transfer. Included with LokPass.", price: 0, unlock: "LokPass subscription" },
];


// Lok Studio Pro brush presets. Data only — every id here must resolve to a real
// tip renderer / texture pattern / dynamic control, which is exactly what
// `npm run verify:brushspec` asserts. A preset naming a tip that doesn't exist
// is the docs/AUDIT.md Finding 2 failure mode wearing a new costume: sellable,
// clickable, draws nothing.
export const BRUSH_SPEC_PRESETS = [
  { id: "pro_round", name: "Round", desc: "Clean round tip, tight spacing",
    tip: { src: "round", spacing: 0.08, hardness: 0.9, roundness: 1 },
    transfer: { opacity: 1, flow: 1 } },

  { id: "pro_soft_air", name: "Soft Air", desc: "Airbrush that builds up on overlap",
    tip: { src: "round", spacing: 0.05, hardness: 0.05 },
    transfer: { opacity: 0.35, flow: 0.3, flowJitter: { amount: 0.2, control: "pressure", min: 0.2 } },
    flags: { buildUp: true, smoothing: true } },

  { id: "pro_nib", name: "Calligraphy Nib", desc: "Flat nib that thins with stroke direction",
    tip: { src: "chisel", spacing: 0.04, roundness: 0.28, angle: 45 },
    shapeDynamics: { angleJitter: { amount: 1, control: "direction", min: 0 }, minRoundness: 0.2 } },

  { id: "pro_bristle", name: "Dry Bristle", desc: "Scattered, textured, pressure-sized",
    tip: { src: "round", spacing: 0.12, hardness: 0.6 },
    shapeDynamics: { sizeJitter: { amount: 0.5, control: "pressure", min: 0.35 }, angleJitter: { amount: 0.3, control: "off", min: 0 } },
    scattering: { scatter: { amount: 0.55, control: "off", min: 0 }, bothAxes: true, count: 4,
                  countJitter: { amount: 0.4, control: "pressure", min: 0.25 } },
    texture: { pattern: "rough", scale: 0.8, depth: { amount: 1, control: "pressure", min: 0.3 } } },

  { id: "pro_speckle", name: "Speckle", desc: "Sparse scattered specks, random sizes",
    tip: { src: "round", spacing: 0.35, hardness: 1 },
    shapeDynamics: { sizeJitter: { amount: 0.85, control: "random", min: 0.15 } },
    scattering: { scatter: { amount: 1, control: "random", min: 0 }, bothAxes: true, count: 5 },
    transfer: { opacity: 0.85, flow: 1, opacityJitter: { amount: 0.5, control: "random", min: 0.3 } } },

  { id: "pro_canvas_wash", name: "Canvas Wash", desc: "Broad wash pulled through canvas weave",
    tip: { src: "wash", spacing: 0.18 },
    texture: { pattern: "canvas", scale: 1.4, depth: { amount: 0.8, control: "off", min: 0.2 } },
    transfer: { opacity: 0.5, flow: 0.55 } },

  { id: "pro_confetti", name: "Confetti", desc: "Hue-shifting scattered squares",
    tip: { src: "square", spacing: 0.4, hardness: 1 },
    shapeDynamics: { angleJitter: { amount: 1, control: "random", min: 0 }, sizeJitter: { amount: 0.6, control: "random", min: 0.3 } },
    scattering: { scatter: { amount: 1, control: "random", min: 0 }, bothAxes: true, count: 3 },
    colorDynamics: { hueJitter: { amount: 1, control: "random", min: 0 }, satJitter: { amount: 0.3, control: "random", min: 0 }, purity: 0.3 } },

  { id: "pro_ink_grit", name: "Ink Grit", desc: "Solid ink with crosshatch tooth and noise",
    tip: { src: "round", spacing: 0.06, hardness: 0.85 },
    shapeDynamics: { sizeJitter: { amount: 0.4, control: "velocity", min: 0.4 } },
    texture: { pattern: "crosshatch", scale: 0.6, depth: { amount: 0.7, control: "off", min: 0.25 }, eachTip: true },
    flags: { noise: true, smoothing: true } },
];


// LokWorld regions — where the city is actually built out.
//
// One row per region, same rule as cosmetics: unlocking a new place is a data
// edit plus a committed pack file, never a code change. `status` is the honest
// state of the data, and `verify:regions` refuses to let a region claim "live"
// without a pack that really loads and really contains buildings.
//
//   live   — a baked pack exists in public/regions/ and streets are explorable
//   soon   — bbox is defined, pack not baked yet; shown as "coming soon"
//
// bbox is [south, west, north, east]. Geometry is © OpenStreetMap contributors,
// ODbL — which, unlike Google's tile terms, is exactly what lets us pre-bake and
// serve it ourselves. The attribution is displayed in LokWorld; keep it there.
//
// To light one up:  node scripts/bake-region.mjs <id>   (see the script header
// for the offline path if the machine can't reach Overpass)
export const LOK_REGIONS = [
  { id: "demo-grid", name: "Sandbox City", status: "live", synthetic: true,
    bbox: [40.700, -74.020, 40.720, -73.995], pack: "/regions/demo-grid.json",
    blurb: "A generated test city. Not a real place — for trying the tools." },
  { id: "nyc-midtown", name: "Midtown Manhattan", status: "soon",
    bbox: [40.745, -74.000, 40.770, -73.970], pack: "/regions/nyc-midtown.json",
    blurb: "Times Square, Bryant Park, the Garment District." },
  { id: "london-city", name: "City of London", status: "soon",
    bbox: [51.505, -0.110, 51.525, -0.070], pack: "/regions/london-city.json",
    blurb: "The Square Mile." },
  { id: "paris-centre", name: "Paris Centre", status: "soon",
    bbox: [48.850, 2.320, 48.870, 2.360], pack: "/regions/paris-centre.json",
    blurb: "Île de la Cité and the Marais." },
  { id: "tokyo-shibuya", name: "Shibuya", status: "soon",
    bbox: [35.655, 139.690, 35.670, 139.710], pack: "/regions/tokyo-shibuya.json",
    blurb: "The scramble and everything around it." },
  { id: "sf-downtown", name: "Downtown San Francisco", status: "soon",
    bbox: [37.780, -122.410, 37.800, -122.390], pack: "/regions/sf-downtown.json",
    blurb: "Market Street and the Financial District." },
];

export const OSM_ATTRIBUTION = "\u00A9 OpenStreetMap contributors";

export function getModuleLayers(modules) {
  if (modules.includes("module_uber")) return 500;
  const layerMods = STUDIO_MODULES.filter(m => m.type === "layers" && modules.includes(m.id) && m.layers);
  return layerMods.length ? Math.max(...layerMods.map(m => m.layers)) : 10;
}
export function hasModule(modules, id) { return modules.includes(id) || modules.includes("module_uber"); }


export const FORMATS = [{ id: "1v1", label: "1v1 Duel", players: 2, icon: "⚔", mood: "One on one. Pure." }, { id: "1v1v1", label: "Triangle", players: 3, icon: "△", mood: "Two rivals, one you." }, { id: "ffa4", label: "4-Player FFA", players: 4, icon: "✦", mood: "Controlled chaos." }, { id: "coop", label: "Local Co-op", players: 2, coop: true, icon: "♡", mood: "Hot-seat, one device." }, { id: "ffa10", label: "Big Battle · 10", players: 10, locked: true, icon: "🔥", mood: "Absolute mayhem." }];
export const KID_PROMPTS = ["A happy dinosaur", "Your favorite animal", "A magic tree", "A friendly robot", "A rainbow fish", "A silly monster", "Your dream treehouse", "A dancing cloud"];

export const INTERVENTIONS = ["shake", "splat", "blot"];

export const MODES = {
  shapes: { name: "Shapes", tag: "clean geometry", pool: ["star", "triangle", "square", "hexagon", "circle", "heart", "spiral", "diamond", "pentagon", "octagon", "decagon", "star_4", "star_6", "star_8", "cross", "arrow", "wave", "zigzag", "crescent", "teardrop", "droplet", "leaf", "clover", "rings", "target", "gear", "helix", "infinity", "sawtooth", "bow_tie", "nonagon", "star_10", "star_12", "plus_sign", "hourglass_shape", "trapezoid", "parallelogram", "arrow_up", "arrow_down", "chevron", "lens", "yin_yang", "keyhole", "quatrefoil"] },
  stencils: { name: "Stencils", tag: "trace real objects", pool: ["house", "wild-knot", "char-ghost", "skull", "dagger", "raven", "lotus", "flame", "eye", "mandala", "crown", "sword", "shield", "anchor", "butterfly", "feather", "shell", "moon", "cloud", "mountain", "tree", "fish", "rose", "infinity", "helix", "gear", "star_6", "crescent", "diamond", "target", "umbrella", "key", "bell", "kite", "top_hat", "teapot", "boat", "bow", "ribbon", "mug", "candle", "lantern", "scissors", "envelope"] },
  wild: { name: "INKSANITY", tag: "chaotic outlines", pool: ["wild-knot", "spiral", "heart", "labyrinth", "galaxy", "tornado", "lightning", "scribble", "vortex", "star_burst", "web", "honeycomb", "tentacle", "hydra", "nerve", "root", "maze", "tangle", "chaos", "ring_spiral", "helix", "infinity", "spirograph", "octogram", "star_8", "wave_chaos", "gear", "star_6", "cross", "fractal_branch", "static_burst", "thorn_ring", "knotwork", "storm_front", "ripple_field", "crack_glass", "thread_snarl", "bramble", "corkscrew", "wormhole", "shatter"] },
  chars: { name: "Characters", tag: "outline a creature", pool: ["char-ghost", "char_goblin", "char_dragon", "char_wyrm", "char_bat", "char_owl", "char_wolf", "char_fox", "char_frog", "char_snake", "char_bird", "char_imp", "char_demon", "char_angel", "char_robot", "char_alien", "char_slime", "char_jelly", "char_dino", "char_shadow", "char_eye", "char_cat", "char_rabbit", "char_mushroom", "char_tree", "char_knight", "char_spider", "char_crab", "char_octopus", "char_bear", "char_deer", "char_lion", "char_penguin", "char_squirrel", "char_turtle", "char_witch", "char_pirate", "char_samurai", "char_astronaut", "char_mermaid"] },
  // --- rule variants -------------------------------------------------
  // `radius` = hit tolerance in canvas px (default 22)
  // `guide`  = "solid" (default) | "fade" (guide dims as the clock runs) | "blind" (guide vanishes after 3s)
  // `mult`   = score/payout multiplier
  // Each variant now has its own 40-item pool matched to its mechanic,
  // instead of borrowing a 20-item subset of the base modes.
  precision: { name: "Precision", tag: "tight tolerance · 1.6× payout", radius: 12, mult: 1.6, seconds: 16, guide: "solid",
    pool: ["star", "hexagon", "spiral", "heart", "gear", "helix", "infinity", "octagon", "star_6", "star_8", "clover", "rings", "target", "crescent", "leaf", "mandala", "lotus", "butterfly", "web", "spirograph", "nonagon", "star_10", "star_12", "decagon", "pentagon", "octogram", "honeycomb", "ring_spiral", "quatrefoil", "yin_yang", "thorn_ring", "wormhole", "corkscrew", "keyhole", "lens", "labyrinth", "shell", "rose", "diamond", "sawtooth"] },
  fading: { name: "Fading", tag: "the guide fades as you trace", radius: 24, mult: 1.35, seconds: 18, guide: "fade",
    pool: ["triangle", "square", "circle", "diamond", "cross", "arrow", "wave", "zigzag", "teardrop", "moon", "cloud", "mountain", "tree", "fish", "shell", "feather", "anchor", "crown", "flame", "eye", "trapezoid", "parallelogram", "chevron", "arrow_up", "arrow_down", "hourglass_shape", "plus_sign", "kite", "boat", "mug", "candle", "lantern", "envelope", "ribbon", "bell", "teapot", "umbrella", "key", "scissors", "bow"] },
  blind: { name: "Blind Ink", tag: "3s look, then draw from memory · 2×", radius: 30, mult: 2, seconds: 20, guide: "blind",
    pool: ["star", "triangle", "square", "heart", "circle", "crescent", "diamond", "cross", "arrow", "leaf", "moon", "cloud", "fish", "flame", "eye", "shield", "anchor", "clover", "teardrop", "bow_tie", "char-ghost", "char_cat", "char_bird", "char_fox", "char_owl", "char_rabbit", "char_penguin", "char_turtle", "char_bear", "char_deer", "char_squirrel", "char_crab", "char_spider", "top_hat", "candle", "bell", "kite", "mug", "key", "bow"] }
};
export const WAGERS = [5, 10, 25, 50];
export const FRONT_NAMES = ["pixel.pluto", "inkwell_iz", "doodlebug", "sketchram", "tinta", "mooncrayon"];

export const SKIES = [
  { id: "clear", name: "Clear Sky", price: 0 },
  { id: "clouds", name: "Cloud Drift", price: 25 },
  { id: "stars", name: "Starry Night", price: 35 },
  { id: "sunset", name: "Sunset Glow", price: 30 },
  { id: "aurora_sky", name: "Aurora Sky", price: 45 },
  // Ids below resolve to gradient strings in ROTATION_SKIES (engine/rotation.js);
  // SkyEffect checks that table first, so no new branch is needed.
  { id: "c_sky_deepocean", name: "Deep Ocean", price: 40 },
  { id: "c_sky_bloodmoon", name: "Blood Moon", price: 50 },
  { id: "c_sky_mintdawn", name: "Mint Dawn", price: 35 },
  { id: "c_sky_ash", name: "Ash Sky", price: 30 },
];

export const EFFECTS = [{ id: "none", name: "Plain paper", price: 0 }, { id: "rain", name: "Ink rain", price: 20 }, { id: "confetti", name: "Confetti burst", price: 30 }, { id: "aurora", name: "Aurora veil", price: 40 }, { id: "embers", name: "Floating embers", price: 25 }, { id: "scanlines", name: "Scan Lines", price: 20 }, { id: "static", name: "Static", price: 20 }, { id: "petals", name: "Sakura drift", price: 35 }, { id: "fireflies", name: "Nightleaf fireflies", price: 45 }, { id: "soot", name: "Ash Ward soot", price: 30 }, { id: "bubbles", name: "Well bubbles", price: 30 }, { id: "ripple", name: "Ink ripples", price: 40 }, { id: "snow", name: "Chalk dust", price: 25 },
  // Ids below resolve to generic particle specs in engine/rotation.js
  // (ROTATION_EFFECTS) — PageEffect checks that table first, so these need no
  // renderer branch of their own. Enforced by `npm run verify:cosmetics`.
  { id: "c_eff_drizzle", name: "Ink drizzle", price: 30 }, { id: "c_eff_motes", name: "Dust motes", price: 25 },
  { id: "c_eff_spores", name: "Spore drift", price: 35 }, { id: "c_eff_emberrise", name: "Ember rise", price: 40 },
  { id: "c_eff_glitchrain", name: "Glitch rain", price: 45 }];
export const NAME_COLORS = [{ id: "default", name: "Default", price: 0, color: null }, { id: "pink", name: "Hot pink", price: 20, color: "#FF5DA2" }, { id: "teal", name: "Riso teal", price: 20, color: "#2FA9A0" }, { id: "gold", name: "Gold", price: 35, color: "#E8B14B" }, { id: "violet", name: "Violet", price: 35, color: "#7A4FBF" }, { id: "rainbow", name: "Holo ✦", price: 80, color: "rainbow" }, { id: "fire", name: "Fire", price: 60, color: "fire" }, { id: "ice", name: "Ice", price: 60, color: "ice" }, { id: "well", name: "Well blue", price: 25, color: "#3AA8DC" }, { id: "ember", name: "Ember", price: 25, color: "#E2551F" }];

// Derived, never hand-written — every sellable name colour resolves by
// construction, including the daily/weekly rotation ones.
export const NAME_COLOR_MAP = Object.fromEntries(
  [...NAME_COLORS, ...DAILY_ITEMS, ...WEEKLY_ITEMS]
    .filter(c => c.color !== undefined || c.type === "name_color")
    .map(c => [c.id, c.color ?? null])
);
export const FRAMES = [{ id: "none", name: "None", price: 0 }, { id: "double", name: "Double rule", price: 25 }, { id: "dashed", name: "Dashed ink", price: 25 }, { id: "tape", name: "Washi corners", price: 40 }, { id: "glow", name: "Neon glow", price: 60 }, { id: "photo", name: "Photo Corners", price: 30 }, { id: "stamp", name: "Stamp Edge", price: 35 }, { id:"polaroid", name:"Polaroid border", price:35 }, { id:"filmstrip", name:"Film strip sprockets", price:45 }, { id:"torn", name:"Torn edge", price:30 }, { id:"riso", name:"Riso offset", price:50 },
  // Ids below resolve to style objects in ROTATION_FRAMES (engine/rotation.js),
  // spread into the avatar-frame lookup in art.jsx.
  { id:"c_frame_rope", name:"Rope ring", price:40 }, { id:"c_frame_circuit", name:"Circuit trace", price:55 },
  { id:"c_frame_brush", name:"Brushstroke", price:45 }];
export const REACTION_PACKS = [{ id: "base", name: "Ink set (splat · heart · drip)", price: 0, giftReward: "heart" }, { id: "stars", name: "Stardust pack", price: 30, giftReward: "star" }, { id: "fire", name: "Hot streak pack", price: 30, giftReward: "sparkle" }, { id: "zen", name: "Zen pack", price: 45, giftReward: "flower" }, { id: "spooky", name: "Spooky Pack", price: 30, giftReward: "treasure" }, { id: "sweet", name: "Sweet Pack", price: 30, giftReward: "heart" },
  // Resolves via ROTATION_REACTIONS (engine/rotation.js). Values there must be
  // icon names <ReactionIcon> implements — raw emoji fall through to a splat.
  { id: "c_reaction_weather", name: "Weather Pack", price: 35, giftReward: "sparkle" }];
export const PAPERS = [{ id:"plain", name:"Plain paper", price:0 }, { id:"grid", name:"Grid guide", price:25 }, { id:"dots", name:"Dot grid", price:25 }, { id:"storyboard", name:"Storyboard · 3 panels", price:40 }, { id:"graphite", name:"Graphite texture", price:50 }, { id:"perspective", name:"Perspective guide", price:60 }, { id:"isometric", name:"Isometric grid", price:55 },
  // Ids below resolve to CSS background strings in ROTATION_PAPERS
  // (engine/rotation.js), applied by Easel's paper overlay.
  { id:"c_paper_hex", name:"Hex grid", price:45 }, { id:"c_paper_ledger", name:"Ledger rule", price:35 },
  { id:"c_paper_weave", name:"Canvas weave", price:40 }, { id:"c_paper_crumpled", name:"Crumpled", price:50 }];
export const LILLOK_GEAR = [{ id:"none", name:"None", price:0 }, { id:"hat", name:"Tiny hat", price:25 }, { id:"glasses", name:"Round glasses", price:25 }, { id:"bowtie", name:"Bow tie", price:20 },
  { id:"crown", name:"Tiny Crown", price:60, rarity:"epic" }, { id:"scarf", name:"Cozy Scarf", price:35, rarity:"rare" },
  { id:"goggles", name:"Steam Goggles", price:50, rarity:"rare" }, { id:"monocle", name:"Monocle", price:40, rarity:"uncommon" },
  { id:"headband", name:"Ninja Headband", price:45, rarity:"rare" }, { id:"wings", name:"Ink Wings", price:80, rarity:"epic" },
  { id:"halo_ring", name:"Angel Halo", price:100, rarity:"legendary" }, { id:"mask", name:"Kabuki Mask", price:70, rarity:"epic" },
  { id:"beret", name:"Artist Beret", price:30, rarity:"uncommon" }, { id:"tophat", name:"Top Hat", price:65, rarity:"epic" },
  { id:"bandana", name:"Pirate Bandana", price:35, rarity:"rare" }, { id:"collar", name:"Spiked Collar", price:40, rarity:"rare" },
  { id:"antenna", name:"Alien Antenna", price:55, rarity:"epic" }, { id:"cape", name:"Hero Cape", price:90, rarity:"legendary" },
];
export const LILLOK_SKINS = [{ id:"none", name:"Default", price:0, giftReward: "heart" }, { id:"galaxy", name:"Galaxy skin", price:300, rarity:"epic", giftReward: "star" }, { id:"gold", name:"Gold leaf", price:250, rarity:"epic", giftReward: "crown" },
  { id:"phantom", name:"Phantom", price:350, rarity:"legendary", giftReward: "treasure" }, { id:"prism", name:"Prism Scale", price:400, rarity:"legendary", giftReward: "rainbow" },
  { id:"void", name:"Void Skin", price:500, rarity:"legendary", giftReward: "meteor" }, { id:"embers", name:"Ember Core", price:450, rarity:"legendary", giftReward: "sparkle" },
  { id:"frost", name:"Frost Heart", price:420, rarity:"legendary", giftReward: "flower" }, { id:"storm", name:"Storm Shell", price:480, rarity:"legendary", giftReward: "crown" },
];
export const LILLOK_AURAS = [{ id:"none", name:"No aura", price:0, giftReward: "heart" }, { id:"glow", name:"Aura glow", price:200, rarity:"epic", giftReward: "sparkle" },
  { id:"embers", name:"Ember Aura", price:280, rarity:"legendary", giftReward: "sparkle" }, { id:"frost", name:"Frost Aura", price:280, rarity:"legendary", giftReward: "flower" },
  { id:"storm", name:"Storm Aura", price:320, rarity:"legendary", giftReward: "crown" }, { id:"cosmic", name:"Cosmic Aura", price:400, rarity:"legendary", giftReward: "meteor" },
  { id:"rainbow", name:"Rainbow Aura", price:350, rarity:"legendary", giftReward: "rainbow" }, { id:"void", name:"Void Aura", price:450, rarity:"legendary", giftReward: "treasure" },
];
export const LILLOK_PETS = [{ id:"none", name:"No pet", price:0, giftReward: "heart" }, { id:"mini", name:"Mini LilLok", price:400, rarity:"epic", giftReward: "star" },
  { id:"inkling", name:"Inkling", price:350, rarity:"epic", giftReward: "sparkle" }, { id:"blotlet", name:"Blotlet", price:300, rarity:"rare", giftReward: "flower" },
  { id:"spark", name:"Spark Blob", price:380, rarity:"epic", giftReward: "sparkle" }, { id:"wisp", name:"Wisp", price:500, rarity:"legendary", giftReward: "rainbow" },
  { id:"gloworm", name:"Gloworm", price:280, rarity:"rare", giftReward: "star" }, { id:"shadow", name:"Shadow Pup", price:450, rarity:"legendary", giftReward: "meteor" },
  { id:"starling", name:"Starling", price:320, rarity:"epic", giftReward: "star" }, { id:"moonkit", name:"Moonkit", price:550, rarity:"legendary", giftReward: "treasure" },
];
export const VOICE_PACKS = [{ id:"default", name:"Default voice", price:0, giftReward: "heart" }, { id:"whisper", name:"Whisper pack", price:150, giftReward: "flower" }, { id:"echo", name:"Echo pack", price:200, giftReward: "sparkle" }, { id:"robot", name:"Robot pack", price:250, giftReward: "treasure" }];
export const AVATAR_ACCENTS = [{ id: "none", name: "Plain", price: 0, giftReward: "heart" }, { id: "ring", name: "Accent ring", price: 20, giftReward: "star" }, { id: "halo", name: "Sketch halo", price: 35, giftReward: "sparkle" }, { id: "crown", name: "Ink crown", price: 50, giftReward: "crown" }, { id: "horns", name: "Horns", price: 40, giftReward: "flower" }, { id: "antenna", name: "Antenna", price: 40, giftReward: "star" }, { id: "drip", name: "Ink drip", price: 45, giftReward: "treasure" }];

export const ANIMATION_FX = [{ id:"none", name:"No FX", price:0 }, { id:"sparkle_trail", name:"Sparkle Trail", desc:"Lines leave glittering sparkles", price:200 }, { id:"neon_pulse", name:"Neon Pulse", desc:"Every stroke pulses with neon", price:250 }, { id:"ink_splatter", name:"Ink Splatter", desc:"Brush tips splatter occasionally", price:180 }, { id:"smoke_rise", name:"Smoke Rise", desc:"Drawn lines emit rising smoke", price:220 }, { id:"fire_embers", name:"Fire Embers", desc:"Strokes glow with floating embers", price:300 }, { id:"water_ripple", name:"Water Ripple", desc:"Strokes ripple outward", price:280 }, { id:"galaxy_swirl", name:"Galaxy Swirl", desc:"Lines reveal star field", price:400 },
  { id:"fx_pixel", name:"Pixel Storm", desc:"Frame breaks into pixels", price:150, rarity:"rare" },
  { id:"fx_glitch", name:"Glitch Wave", desc:"Horizontal distortion scan across canvas", price:180, rarity:"rare" },
  { id:"fx_inkbloom", name:"Ink Bloom", desc:"Ink blossoms at edges on each stroke", price:200, rarity:"epic" },
  { id:"fx_lightrays", name:"Light Rays", desc:"Volumetric god rays shine through", price:250, rarity:"epic" },
  { id:"fx_halftone", name:"Halftone Dot", desc:"Comic book dot pattern overlay", price:120, rarity:"uncommon" },
  { id:"fx_vignette", name:"Vignette Burn", desc:"Darkened edges fading inward", price:100, rarity:"uncommon" },
  { id:"fx_sketch", name:"Sketch Lines", desc:"Hand-drawn line overlay on frames", price:90, rarity:"common" },
  { id:"fx_aurora_beam", name:"Aurora Beam", desc:"Vertical light curtains sweep across", price:300, rarity:"legendary" },
  { id:"fx_starfield", name:"Star Field", desc:"Twinkling star overlay at night", price:280, rarity:"legendary" },
  { id:"fx_ripple", name:"Ripple Distort", desc:"Water ripple distortion effect", price:230, rarity:"epic" },
];
export const CURSORS = [{ id:"default", name:"Default cursor", price:0 }, { id:"inkdrop", name:"Ink Drop", price:25 }, { id:"pencil", name:"Pencil Tip", price:20 }, { id:"brush_cross", name:"Brush Cross", price:30 }, { id:"target", name:"Target Ring", price:20 }, { id:"heart_aim", name:"Heart Aim", price:35 }, { id:"star_glow", name:"Star Glow", price:40 }, { id:"spray_nozzle", name:"Spray Nozzle", price:45 }, { id:"calligraphy", name:"Calligraphy Nib", price:50 }, { id:"neon_ring", name:"Neon Ring", price:60 }, { id:"ruler", name:"Ruler Cross", price:25 }, { id:"laser_dot", name:"Laser Dot", price:30 },
  // Ids below resolve to SVG data-URI cursors in ROTATION_CURSORS
  // (engine/rotation.js), via cursorFor() in engine/cursors.js.
  { id:"c_cursor_quill", name:"Quill", price:35 }, { id:"c_cursor_paw", name:"Paw print", price:30 }];
export const FONT_PACKS = [{ id:"default", name:"System font", price:0, font:"inherit" }, { id:"mono", name:"Mono Ink", desc:"Monospace typewriter", price:25, font:"'Courier New',monospace" }, { id:"rounded", name:"Soft Round", desc:"Rounded sans-serif", price:30, font:"'Nunito',sans-serif" }, { id:"hand", name:"Handwritten", desc:"Loose pen script", price:35, font:"'Patrick Hand',cursive" }, { id:"pixel", name:"Pixel Bit", desc:"8-bit pixel font", price:45, font:"'Press Start 2P',cursive" }, { id:"zine", name:"Zine Bold", desc:"Chunky headline", price:30, font:"'Bebas Neue',sans-serif" }, { id:"serif", name:"Editorial Serif", desc:"Elegant classic", price:40, font:"'Playfair Display',serif" }, { id:"marker", name:"Marker Felt", desc:"Permanent marker look", price:35, font:"'Permanent Marker',cursive" }, { id:"code", name:"Fira Code", desc:"Developer coding font", price:20, font:"'Fira Code',monospace" }, { id:"vintage", name:"Vintage Ink", desc:"Rough-printed text", price:50, font:"'Abril Fatface',cursive" },
  { id:"caveat", name:"Caveat Note", desc:"Casual handwritten note", price:30, font:"'Caveat',cursive" },
  { id:"spacemono", name:"Space Mono", desc:"Retro monospace, wide-set", price:35, font:"'Space Mono',monospace" },
  { id:"comfortaa", name:"Comfortaa Round", desc:"Friendly geometric rounded", price:30, font:"'Comfortaa',sans-serif" },
  { id:"shrikhand", name:"Shrikhand Bold", desc:"Heavy display lettering", price:45, font:"'Shrikhand',cursive" },
  { id:"spacegrotesk", name:"Space Grotesk", desc:"Modern, slightly technical", price:35, font:"'Space Grotesk',sans-serif" },
  { id:"kalam", name:"Kalam Script", desc:"Bold everyday handwriting", price:30, font:"'Kalam',cursive" },
  { id:"vt323", name:"VT323 Terminal", desc:"Old CRT terminal type", price:40, font:"'VT323',monospace" },
  { id:"cormorant", name:"Cormorant Serif", desc:"Slim, refined display serif", price:40, font:"'Cormorant',serif" },
  { id:"amaticsc", name:"Amatic Condensed", desc:"Tall hand-drawn condensed", price:35, font:"'Amatic SC',cursive" },
  { id:"righteous", name:"Righteous", desc:"Bold rounded display face", price:40, font:"'Righteous',cursive" },
];
export const MUSIC_PACKS = [{ id:"none", name:"No music", price:0, giftReward: "heart" }, { id:"lo-fi", name:"Lo-Fi Study", price:100, giftReward: "sparkle" }, { id:"synth", name:"Synth Wave", price:120, giftReward: "star" }, { id:"rain", name:"Rain Ambience", price:80, giftReward: "flower" }, { id:"jazz", name:"Coffee Jazz", price:110, giftReward: "treasure" }, { id:"nature", name:"Forest Nature", price:90, giftReward: "flower" }, { id:"retro", name:"Retro Arcade", price:130, giftReward: "star" }, { id:"piano", name:"Piano Moods", price:95, giftReward: "sparkle" }];
export const STICKER_PACKS = [{ id:"emoji", name:"Emoji Pack", price:0, stickers:["😎","🔥","🎨","💀","👾","✨","🌈","🍕"], giftReward:"star" }, { id:"nature", name:"Nature Pack", price:30, stickers:["🌸","🌿","🦋","🍀","🌻","🐚","🍄","🌙"], giftReward:"flower" }, { id:"food", name:"Snack Pack", price:25, stickers:["🍕","🍔","🌮","🍩","🍦","🥨","🧋","🍪"], giftReward:"heart" }, { id:"animals", name:"Animal Pack", price:35, stickers:["🐱","🐶","🦊","🐸","🐼","🐧","🦉","🐝"], giftReward:"sparkle" }, { id:"space", name:"Space Pack", price:40, stickers:["🚀","🛸","🌍","⭐","🌑","☄️","👽","🪐"], giftReward:"meteor" }, { id:"retro", name:"Retro Pack", price:30, stickers:["📟","📼","🕹️","💾","📺","📻","🎮","📸"], giftReward:"star" }, { id:"magic", name:"Magic Pack", price:45, stickers:["🔮","🪄","🧙","🐉","🦄","🧚","⚡","🌟"], giftReward:"rainbow" }, { id:"music", name:"Music Pack", price:25, stickers:["🎵","🎸","🥁","🎹","🎤","🎧","🎼","🎷"], giftReward:"sparkle" },
  { id:"garden", name:"Garden Pack", price:30, stickers:["🌻","🐝","🍄","🌿","🐌","🦋","🌾","🪴"], giftReward:"flower" },
  { id:"space", name:"Space Pack", price:35, stickers:["🚀","🪐","👽","🌠","🛸","☄️","🌌","🔭"], giftReward:"star" }];
export const POST_EXPORTS = [{ id:"png", name:"PNG frames", desc:"Export frames as transparent PNGs", price:0 }, { id:"gif", name:"Animated GIF", desc:"Export as looping GIF", price:80 }, { id:"webp", name:"WebP anim", desc:"Export as animated WebP", price:50 }, { id:"spritesheet", name:"Spritesheet", desc:"All frames in one grid", price:60 }, { id:"apng", name:"APNG", desc:"Animated PNG format", price:100 }, { id:"pdf", name:"PDF flip", desc:"Export as PDF flipbook", price:120 }, { id:"mp4", name:"MP4 video", desc:"Export as MP4 (soon)", price:150, soon:true }];



export function makeQuests() { return [...QUEST_POOL].sort(() => Math.random() - .5).slice(0, 3).map(q => ({ ...q, progress: 0, done: false })); }

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


// Every column fromDbPost reads EXCEPT `frames`.
//
// `frames` is a jsonb array of base64 data URLs — a measured ~16.8KB per
// frame. A `select=*` feed or search query therefore drags a full pixel
// payload per post across the wire before anything is even on screen, which
// was the single largest source of Supabase egress in the app. Every list
// query uses this instead; frames are fetched per post, once, when its card
// actually becomes visible (fetchFrames below).
//
// fromDbPost already defaults `frames` to [], and FeedCard already renders a
// "Rendering…" placeholder for a post with no frames, so a frameless row is a
// shape both sides have always handled — no reader needed changing.
export const FRAMELESS_COLS = "id,title,author,frame_durations,pace_ms,mode,style,loop,votes,views,reactions,origin,created_at,music_id,latitude,longitude,location_name,location_privacy";

export const fromDbPost = r => ({ id: r.id, title: r.title, author: r.author, frames: r.frames || [], frameDurations: r.frame_durations || undefined, paceMs: r.pace_ms || 160, mode: r.mode || "A", style: r.style || "bold", loop: !!r.loop, votes: r.votes || 0, views: r.views || 0, reactions: { humhah: 0, bomhogwah: 0, splat: 0, heart: 0, drip: 0, ...(r.reactions||{}) }, echoedAt: null, echoCount: 0, echoParent: null, echoExpiresAt: null, from: r.origin || "studio", createdAt: r.created_at, musicId: r.music_id || undefined, latitude: r.latitude || undefined, longitude: r.longitude || undefined, location_name: r.location_name || undefined, location_privacy: r.location_privacy || "everyone", remote: true, voted: false, viewed: false });

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
  { title:".lok files", icon:"📦", content:"Every flip can be saved as a .lok file — LokBook's own animation format. It's a real zip archive, so it opens anywhere (even in a plain file browser you'll see a manifest and a preview image), but it also packs your full animation at roughly a tenth the size of a normal image stack. .lok is open source — anyone can build tools that read or write it. Look for Export as .lok in a flip's menu." },
];

// Frames already pulled this session, keyed by post id. Deliberately in
// memory only: a full flip is hundreds of KB and localStorage's ~5MB budget
// is already what the gallery quota errors are about.
const FRAME_CACHE = new Map();

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
  /**
   * Frames for specific posts, fetched on demand. Results are cached for the
   * session, so scrolling a card back into view costs nothing.
   */
  async fetchFrames(ids) {
    const want = [...new Set(ids)].filter(id => id && !FRAME_CACHE.has(id));
    if (want.length) {
      try {
        const list = want.map(encodeURIComponent).join(",");
        const r = await fetch(`${SUPA_URL}/rest/v1/lok_posts?select=id,frames&id=in.(${list})`, { headers: getHeaders() });
        if (r.ok) for (const row of await r.json()) FRAME_CACHE.set(row.id, row.frames || []);
      } catch {}
      // Negative-cache misses too, or a deleted post retries forever.
      for (const id of want) if (!FRAME_CACHE.has(id)) FRAME_CACHE.set(id, []);
    }
    return ids.map(id => ({ id, frames: FRAME_CACHE.get(id) || [] }));
  },
  async fetchPosts(limit = 60, before = null, search = null, author = null) {
    let url = `${SUPA_URL}/rest/v1/lok_posts?select=${FRAMELESS_COLS}&order=created_at.desc&limit=${limit}`;
    if (before) url += `&created_at.lt.${encodeURIComponent(before)}`;
    if (search) url += `&or=(title.ilike.*${encodeURIComponent(search)}*,author.ilike.*${encodeURIComponent(search)}*)`;
    if (author) url += `&author.eq.${encodeURIComponent(author)}`;
    const r = await fetch(url, { headers: getHeaders() });
    if (!r.ok) return [];
    return r.json();
  },
  async fetchAuthorPosts(author) {
    return this.fetchPosts(60, null, null, author);
  },
  async fetchProfile(handle) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(handle)}&select=save_blob`, { headers: getHeaders() });
      if (!r.ok) return null;
      const rows = await r.json();
      return rows.length ? rows[0].save_blob?.profile || null : null;
    } catch { return null; }
  },
  async votePost(id, votes) {
    try { await fetch(`${SUPA_URL}/rest/v1/lok_posts?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ votes }) }); } catch {}
  },
  async recordBattle(data) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/lok_battles`, {
        method: "POST", headers: { ...getHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify(data),
      });
    } catch {}
  },
  async fetchLeaderboard(weekStart) {
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/lok_battles?week_start=eq.${encodeURIComponent(weekStart)}&select=author,won,score,featured&limit=500`,
        { headers: getHeaders() }
      );
      if (!res.ok) return [];
      const rows = await res.json();
      const agg = {};
      for (const r of rows) {
        if (!agg[r.author]) agg[r.author] = { author: r.author, score: 0, battles: 0, wins: 0 };
        agg[r.author].score += r.score;
        agg[r.author].battles++;
        if (r.won) agg[r.author].wins++;
      }
      return Object.values(agg).sort((a, b) => b.score - a.score).slice(0, 50);
    } catch {
      return [];
    }
  },
  async follow(follower, followee) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/lok_follows`, { method: "POST", headers: { ...getHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ follower, followee }) });
      await fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(follower)}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ following: null }) });
    } catch {}
  },
  async unfollow(follower, followee) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/lok_follows?follower=eq.${encodeURIComponent(follower)}&followee=eq.${encodeURIComponent(followee)}`, { method: "DELETE", headers: getHeaders() });
    } catch {}
  },
  async fetchFollowing(handle) {
    try { const r = await fetch(`${SUPA_URL}/rest/v1/lok_follows?follower=eq.${encodeURIComponent(handle)}&select=followee`, { headers: getHeaders() }); if (!r.ok) return []; return r.json(); } catch { return []; }
  },
  async bookmark(handle, postId) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/lok_bookmarks`, { method: "POST", headers: { ...getHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ handle, post_id: postId }) });
      await fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(handle)}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ bookmarks: null }) });
    } catch {}
  },
  async unbookmark(handle, postId) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/lok_bookmarks?handle=eq.${encodeURIComponent(handle)}&post_id=eq.${encodeURIComponent(postId)}`, { method: "DELETE", headers: getHeaders() });
    } catch {}
  },
  async fetchBookmarks(handle) {
    try { const r = await fetch(`${SUPA_URL}/rest/v1/lok_bookmarks?handle=eq.${encodeURIComponent(handle)}&select=post_id`, { headers: getHeaders() }); if (!r.ok) return []; return r.json(); } catch { return []; }
  },
  async react(handle, postId, type) {
    try {
      await fetch(`${SUPA_URL}/rest/v1/lok_reactions`, { method: "POST", headers: { ...getHeaders(), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ handle, post_id: postId, type }) });
    } catch {}
  },
  async fetchPostReactions(postId) {
    try { const r = await fetch(`${SUPA_URL}/rest/v1/lok_reactions?post_id=eq.${encodeURIComponent(postId)}&select=handle,type`, { headers: getHeaders() }); if (!r.ok) return []; return r.json(); } catch { return []; }
  },
};

// `owned[category]` has been written in two incompatible shapes: the Shop's buy
// handler pushed plain id strings, the Profile's pushed {id, ts} objects. Each
// reader understood only its own shape, so anything bought in one surface read
// as un-owned in the other — and charged the player a second time for something
// they already had. Normalise on read so existing saves (which may hold either,
// or a mix) keep working; writes are plain ids everywhere now. The `ts` field
// was never read by anything, so nothing is lost by dropping it.
export const ownedIds = (owned, cat) =>
  (owned?.[cat] || []).map(o => (typeof o === "string" ? o : o?.id)).filter(Boolean);
export const ownsCosmetic = (owned, cat, id) => ownedIds(owned, cat).includes(id);

// Globe.gl configuration for world map visualization
export const GLOBE_CONFIG = {
  tileLayer: 'USGS',
  tileLayerOptions: [
    { id: 'USGS', name: 'USGS Imagery', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'OSM', name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    { id: 'satellite', name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'terrain', name: 'Terrain', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}' },
  ],
  defaultGlobeRadius: 100,
  autoRotate: true,
  autoRotateSpeed: 0.5,
  // How far the slippy-map tile engine will keep fetching detail as you zoom.
  // 19 is the ceiling OSM/ArcGIS raster tiles actually publish to — past
  // that the server just re-serves the z19 tile scaled up, so there's no
  // point asking higher. Paired with controls.minDistance in
  // WorldMapViewer.jsx, which is what actually lets the camera get close
  // enough to reach it.
  tileMaxLevel: 19,
};

// Purchasable World globe skins. "none" (the default, free) follows the
// current app theme's own colors — see WorldMapViewer.jsx. Each paid skin
// overrides that with a fixed globe texture + atmosphere tint instead.
// textureUrl/bumpUrl point at three-globe's existing stock CDN images for
// now (no custom art pipeline available yet); swap these for bespoke
// stylized textures later without touching anything else.
//
// markerStyle/starfieldDensity/starfieldTint make each skin a genuinely
// different 3D *simulation*, not just a different texture: markerStyle picks
// which Three.js primitive represents a post/user location on the globe
// (see buildMarkerMesh in WorldMapViewer.jsx), and the starfield fields feed
// getStarfieldDataUrl() there. All three are optional — omitting them falls
// back to the 'none' skin's defaults, so nothing else needs updating.
export const WORLD_SKINS = [
  { id: 'none', name: 'Default (theme)', price: 0, desc: 'Follows your equipped theme colors.',
    markerStyle: 'beacon', starfieldDensity: 160, starfieldTint: '#ffffff' },
  { id: 'cyberpunk', name: 'Cyberpunk Globe', price: 80, desc: 'Neon night-city glow.',
    textureUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg',
    bumpUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
    atmosphereColor: '#ff2fd6', backgroundColor: '#050014',
    markerStyle: 'crystal', starfieldDensity: 240, starfieldTint: '#ff2fd6' },
  { id: 'organic', name: 'Organic Globe', price: 80, desc: 'Bioluminescent, pulsing atmosphere.',
    textureUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
    bumpUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
    atmosphereColor: '#2fffa0', backgroundColor: '#001208',
    markerStyle: 'orb', starfieldDensity: 130, starfieldTint: '#2fffa0' },
  { id: 'retro', name: 'Retro Cartography', price: 80, desc: 'Vintage map colors.',
    textureUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg',
    bumpUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
    markerStyle: 'beacon', starfieldDensity: 90, starfieldTint: '#e8b14b',
    atmosphereColor: '#e8b14b', backgroundColor: '#1a1206' },
  { id: 'frostwave', name: 'Frostwave Globe', price: 80, desc: 'Pale ice and a dense cold sky.',
    textureUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
    bumpUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
    atmosphereColor: '#8fd6ff', backgroundColor: '#02060f',
    markerStyle: 'crystal', starfieldDensity: 300, starfieldTint: '#bfe6ff' },
];