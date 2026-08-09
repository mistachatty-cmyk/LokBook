// The Roadmap — a level track of things that change the world, not the wardrobe.
//
// Deliberately NOT a second shop. Loks buy how things look; levels grant weird
// behaviour the app didn't have before. Nothing here is sold, and nothing here
// duplicates a Shop category -- the two systems should never compete.
//
// `live: true`  -> implemented and gated on level right now.
// `live: false` -> on the roadmap, shown as Planned. Honest about not existing.

export const UNLOCK_TRACK = [
  {
    level: 1, id: "tap_to_earn", name: "Tap to Earn", live: true,
    blurb: "Your blot pays you to pet it.",
    detail: "Tap LilLok and earn Loks. Start with 0.5 Loks per tap. Build a streak by tapping within 3 seconds — the longer your streak, the more you earn, up to 3 Loks per tap.",
  },
  {
    level: 2, id: "ink_weather", name: "Ink Weather", live: true,
    blurb: "The page gets weather.",
    detail: "A drifting weather front settles over the whole app and changes on its own schedule — some days it's ash, some days pollen, some days nothing at all. You don't pick it and you can't buy it. It's just what the weather is doing today.",
  },
  {
    level: 4, id: "night_shift", name: "Night Shift", live: true,
    blurb: "The app knows what time it is.",
    detail: "After midnight local time the whole app cools and dims a few degrees, and warms back up toward morning. Drawing late looks different from drawing at noon.",
  },
  {
    level: 4, id: "gift_drops", name: "Gift Drops", live: true,
    blurb: "Your blot drops gifts when you tap it.",
    detail: "Each tap has a chance to drop a gift — hearts, stars, treasures, crowns and more. Gifts are purely delightful and have no other purpose but to make you smile.",
  },
  {
    level: 5, id: "drift_rights", name: "Drift Rights", live: false,
    blurb: "Leave a mark in any gallery you wander into.",
    detail: "Today a drift gallery lets passers-by leave one bleep, and a private room lets a code-holder leave nothing at all. This opens it up: wander into any open gallery and leave a little blot behind, no code and no account needed — rate-limited, so a gallery stays a gallery and not a wall of noise.",
  },
  {
    level: 6, id: "blot_customizer", name: "Blot Customizer", live: true,
    blurb: "Make your blot truly yours.",
    detail: "Customize your LilLok's idle animations, expressions, and bounce styles. Choose how your blot floats, sways, pulses or spins when it's at rest. Pick its mood and expression to match your vibe.",
  },
  {
    level: 7, id: "echo_ink", name: "Echo Ink", live: false,
    blurb: "Your old strokes haunt the page.",
    detail: "The last thing you drew stays faintly on the paper behind the thing you're drawing now — a ghost of the previous page, fading over a few minutes.",
  },
  {
    level: 9, id: "the_margin", name: "The Margin", live: false,
    blurb: "Something is drawing in the margins.",
    detail: "Small unbidden doodles start appearing in the empty edges of the feed, drawn with the same curve maths the resident artists use. They accumulate. They are not yours.",
  },
  {
    level: 10, id: "sticker_bench", name: "The Sticker Bench", live: false,
    blurb: "Recolor, resize, and rotate any sticker before you place it.",
    detail: "A small workbench for the stickers you place in Studio — pick one from a pack or your own uploads, then recolor it, resize it, and rotate it before it goes on the page. Built on the same tiny snapshot-canvas the Rooms mini-stamp drawer already uses, plus a recolor pass. Sharing your own uploaded stickers with other artists is a natural next step once the community stamp library has real moderation — it doesn't yet, so uploads stay yours alone for now.",
  },
  {
    level: 11, id: "understudy", name: "The Understudy", live: false,
    blurb: "LilLok covers one of your pieces.",
    detail: "Once in a while LilLok redraws one of your own posts in its own style and files it beside the original. You can keep it, or paint over it.",
  },
  {
    level: 13, id: "gravity_well", name: "Gravity Well", live: false,
    blurb: "Loose things fall toward your cursor.",
    detail: "Particles, stickers and page effects stop drifting straight down and start leaning toward wherever your pointer is. The whole app develops a slight pull.",
  },
  {
    level: 16, id: "misprint_day", name: "Misprint Day", live: false,
    blurb: "One day a week, the press is off.",
    detail: "The second colour drum lands out of register across the entire app for one day — everything is very slightly, deliberately misprinted. It goes away on its own.",
  },
  {
    level: 15, id: "cartographer", name: "The Cartographer", live: false,
    blurb: "A map of everywhere you've drawn.",
    detail: "Room canvases are already carved into chunks behind the scenes. This surfaces them: a mini-map you can jump around by chunk — the ones you've drawn in filled, the ones you've only passed through faint, and the ones nobody has touched left blank. It's also what makes a genuinely endless canvas navigable instead of a place to get lost.",
  },
  {
    level: 19, id: "patron", name: "Patron", live: false,
    blurb: "Send Loks to an artist whose room you loved.",
    detail: "Tip the owner of a canvas straight from the room. Comes out of your own balance, so it means something — capped per day, and both sides need an account so the Loks are real and not something anyone can mint by typing a different name.",
  },
  {
    level: 21, id: "long_page", name: "The Long Page", live: false,
    blurb: "The canvas stops ending.",
    detail: "The Studio canvas keeps going past its own edges in every direction. The four canvas_* geometry modules land here — this is the one that needs real coordinate-system work.",
  },
];

export const levelFor = xp => Math.max(1, Math.floor((xp || 0) / 100) + 1);
export const isUnlocked = (id, level) => {
  const u = UNLOCK_TRACK.find(x => x.id === id);
  return !!u && u.live && level >= u.level;
};
export const unlockedAt = level => UNLOCK_TRACK.filter(u => level >= u.level);
export const nextUnlock = level => UNLOCK_TRACK.find(u => level < u.level) || null;

// Ink Weather: deterministic per calendar day, so everyone sees the same sky
// and nobody can farm it. Reuses page-effect ids the renderer already knows.
const WEATHER = ["none", "soot", "petals", "snow", "embers", "none", "fireflies", "bubbles"];
export const inkWeatherToday = (d = new Date()) =>
  WEATHER[Math.floor(d.getTime() / 86400000) % WEATHER.length];

// Night Shift: 0 at midday, 1 in the small hours. Drives a cheap CSS filter.
export const nightShiftAmount = (d = new Date()) => {
  const h = d.getHours() + d.getMinutes() / 60;
  const fromMidnight = Math.min(Math.abs(h - 24), Math.abs(h - 0));
  return Math.max(0, 1 - fromMidnight / 6); // ramps over the 6h either side of midnight
};
