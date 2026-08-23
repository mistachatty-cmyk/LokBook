// How Blot actually looks and moves — the renderer registry behind the three
// Blot cosmetic catalogues.
//
// WHY THIS FILE EXISTS
// --------------------
// `BLOT_IDLE_ANIMATIONS` (6), `BLOT_EXPRESSIONS` (6) and `BLOT_BOUNCES` (5)
// were all sellable, priced 20-45 Loks, and **rendered nothing**. The only code
// outside the Shop that touched them read their `giftReward` field to pick a
// random gift (App.jsx), so the *id* never reached the sprite: the FAB
// hardcoded `blotFloat 3s` and `blotBounce 0.5s` no matter what you equipped,
// and LilLokSprite drew its face purely from health phase.
//
// `scripts/audit-inert.mjs` reported all three as WIRED, because its test is
// "does anything outside the Shop mention this id" — and reading a sibling
// field off the same catalogue row passes that test while rendering nothing.
// That blind spot is closed in the same commit as this file.
//
// Six of the idle keyframes had even been written already, in index.css, and
// were simply never referenced by anything.
//
// Same rule as every other cosmetic in this app: a new Blot look is ONE ROW
// here plus one catalogue entry in constants.jsx. Do not add an `if (id ===
// ...)` branch to the sprite.

/** Idle motion: how Blot moves while resting. `anim` must name a @keyframes
 *  declared globally (index.css or GlobalStyle in art.jsx) — a name that is not
 *  declared silently does nothing, which is exactly the bug this file fixes.
 *  verify:cosmetics enforces it. */
export const BLOT_IDLE_RENDER = {
  float:       { anim: "blotFloat",      dur: "3s",   ease: "ease-in-out" },
  sway:        { anim: "blotSway",       dur: "3.4s", ease: "ease-in-out" },
  pulse:       { anim: "blotPulse",      dur: "2.6s", ease: "ease-in-out" },
  wiggle:      { anim: "blotWiggle",     dur: "2.2s", ease: "ease-in-out" },
  bounce_idle: { anim: "blotBounceIdle", dur: "1.8s", ease: "ease-in-out" },
  spin_slow:   { anim: "blotSpinSlow",   dur: "9s",   ease: "linear" },
};

/** Tap feedback: the one-shot played when Blot is poked. */
export const BLOT_BOUNCE_RENDER = {
  gentle:    { anim: "blotBounce",          dur: "0.5s",  ease: "ease-out" },
  energetic: { anim: "blotBounceEnergetic", dur: "0.42s", ease: "cubic-bezier(.34,1.56,.64,1)" },
  bouncy:    { anim: "blotBounceBouncy",    dur: "0.7s",  ease: "cubic-bezier(.28,1.7,.5,1)" },
  elastic:   { anim: "blotBounceElastic",   dur: "0.8s",  ease: "cubic-bezier(.22,1.4,.36,1)" },
  wobbly:    { anim: "blotBounceWobbly",    dur: "0.75s", ease: "ease-in-out" },
};

/** Face. Consumed by LilLokSprite, which composes these over the health phase
 *  rather than replacing it — see `expressionFor()` for when it applies.
 *  Coordinates are in the sprite's 0-100 viewBox. */
export const BLOT_EXPRESSION_RENDER = {
  neutral:  { eyes: "round",  eyeR: 5,   mouth: null },
  happy:    { eyes: "round",  eyeR: 4.6, mouth: "M36 60 Q48 73 62 60", cheeks: true },
  excited:  { eyes: "wide",   eyeR: 6.4, mouth: "M42 60 Q48 72 56 60", sparkle: true },
  sleepy:   { eyes: "lids",   eyeR: 4,   mouth: "M42 66 Q48 70 55 66", zzz: true },
  thinking: { eyes: "squint", eyeR: 4.2, mouth: "M40 66 L56 64", brow: true },
  playful:  { eyes: "wink",   eyeR: 5,   mouth: "M38 61 Q48 71 60 61", tongue: true },
};

const FALLBACK_IDLE = BLOT_IDLE_RENDER.float;
const FALLBACK_BOUNCE = BLOT_BOUNCE_RENDER.gentle;
const FALLBACK_EXPRESSION = BLOT_EXPRESSION_RENDER.neutral;

/** A ready-to-use CSS `animation` shorthand for the equipped idle motion.
 *  Returns "none" when motion is suppressed, so callers never branch on it. */
export function idleAnimationCss(id, { reduceMotion = false, phase } = {}) {
  if (reduceMotion || phase === "stasis") return "none";
  const r = BLOT_IDLE_RENDER[id] || FALLBACK_IDLE;
  return `${r.anim} ${r.dur} ${r.ease} infinite`;
}

/** The one-shot tap animation. */
export function bounceAnimationCss(id, { reduceMotion = false } = {}) {
  if (reduceMotion) return "none";
  const r = BLOT_BOUNCE_RENDER[id] || FALLBACK_BOUNCE;
  return `${r.anim} ${r.dur} ${r.ease}`;
}

/** The face to draw.
 *
 *  Health outranks decoration: a blot that is critical or petrified keeps its
 *  phase face, because that face is the only signal telling you it needs
 *  feeding. Dressing a dying blot in "Happy" would hide the one thing the
 *  sprite exists to communicate. Thriving and decaying wear what you bought. */
export function expressionFor(id, phase) {
  if (phase === "critical" || phase === "stasis") return null;
  return BLOT_EXPRESSION_RENDER[id] || FALLBACK_EXPRESSION;
}

/** Every keyframe name this module can ask for. verify:cosmetics reads this so
 *  the check cannot drift from the tables above. */
export const BLOT_KEYFRAMES = [
  ...Object.values(BLOT_IDLE_RENDER).map(r => r.anim),
  ...Object.values(BLOT_BOUNCE_RENDER).map(r => r.anim),
];
