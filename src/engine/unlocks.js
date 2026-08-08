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
    level: 6, id: "echo_ink", name: "Echo Ink", live: false,
    blurb: "Your old strokes haunt the page.",
    detail: "The last thing you drew stays faintly on the paper behind the thing you're drawing now — a ghost of the previous page, fading over a few minutes.",
  },
  {
    level: 8, id: "the_margin", name: "The Margin", live: false,
    blurb: "Something is drawing in the margins.",
    detail: "Small unbidden doodles start appearing in the empty edges of the feed, drawn with the same curve maths the resident artists use. They accumulate. They are not yours.",
  },
  {
    level: 10, id: "understudy", name: "The Understudy", live: false,
    blurb: "LilLok covers one of your pieces.",
    detail: "Once in a while LilLok redraws one of your own posts in its own style and files it beside the original. You can keep it, or paint over it.",
  },
  {
    level: 12, id: "gravity_well", name: "Gravity Well", live: false,
    blurb: "Loose things fall toward your cursor.",
    detail: "Particles, stickers and page effects stop drifting straight down and start leaning toward wherever your pointer is. The whole app develops a slight pull.",
  },
  {
    level: 15, id: "misprint_day", name: "Misprint Day", live: false,
    blurb: "One day a week, the press is off.",
    detail: "The second colour drum lands out of register across the entire app for one day — everything is very slightly, deliberately misprinted. It goes away on its own.",
  },
  {
    level: 20, id: "long_page", name: "The Long Page", live: false,
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
