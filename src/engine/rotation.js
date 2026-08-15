// Rotation wiring — makes DAILY_ITEMS / WEEKLY_ITEMS real.
//
// Before this file, buying a rotation item pushed its id into `dailyOwned` /
// `weeklyOwned` and nothing ever read those arrays again (see docs/AUDIT.md,
// Finding 2 — 74 items, 25-500 Loks each, zero consumers). The rotation items
// carry `type` values that mirror the real cosmetic categories, but they live
// in a separate id-space that no renderer consults.
//
// The fix is routing, not a second cosmetic system: a rotation purchase now
// lands in the SAME `owned`/`cosmetics` (or top-level) state the Shop already
// uses, and the visuals below extend the existing renderers' lookup tables.
// Nothing about the Shop's appearance changes.

// Where each rotation `type` actually lives in App state.
//   kind:"cosmetic" -> owned[key] + cosmetics[key]
//   kind:"state"    -> a dedicated owned-list + equipped value
export const ROTATION_TARGET = {
  frame:        { kind: "cosmetic", key: "frame" },
  name_color:   { kind: "cosmetic", key: "nameColor" },
  paper:        { kind: "cosmetic", key: "paper" },
  blot_border:  { kind: "cosmetic", key: "blotBorder" },
  reaction:     { kind: "cosmetic", key: "reactionPack" },
  effect:       { kind: "state", key: "effect" },
  sky:          { kind: "state", key: "sky" },
  cursor:       { kind: "state", key: "cursorPack" },
  font:         { kind: "state", key: "fontPack" },
  sticker:      { kind: "state", key: "stickerPack" },
};

// Parked, not deleted. These need real engines or licensed assets, not wiring:
// exports need actual encoders (SVG tracing, 4K/HD re-render, JSON schema), and
// the LilLok/voice items need renderer support in LilLok.jsx + a voice bank.
// Items of these types stay purchasable-blocked and badged in the Shop rather
// than silently taking Loks. See docs/ROTATION_ARCHIVE.md to pick them back up.
export const ARCHIVED_ROTATION_TYPES = new Set([
  "export", "lillok_skin", "lillok_pet", "lillok_gear", "voice",
  // avatar accents are hand-drawn SVG in FramedAvatar (crown/horns/antenna/drip),
  // not a CSS table — each new one is real illustration work, so they stay parked
  // rather than being routed to a renderer that cannot draw them.
  "avatar_accent",
]);

export const isArchivedRotation = item => ARCHIVED_ROTATION_TYPES.has(item?.type);
export const rotationTarget = item => (isArchivedRotation(item) ? null : ROTATION_TARGET[item?.type] || null);

// ---------------------------------------------------------------------------
// Visuals. Each table is merged into the matching renderer's existing lookup,
// so a rotation id resolves the same way a built-in id does.
// ---------------------------------------------------------------------------

// Avatar frames -> merged into FramedAvatar's `fs` map (src/art.jsx).
export const ROTATION_FRAMES = (ink, acc, size) => ({
  d_frame_vintage:   { border: `3px solid ${ink}`, borderRadius: 4, boxShadow: `inset 0 0 0 3px #FDFDF8, inset 0 0 0 6px ${ink}` },
  d_frame_inkburst:  { border: `3px solid ${ink}`, clipPath: "polygon(50% 0,61% 9%,75% 4%,79% 19%,94% 21%,90% 36%,100% 47%,89% 58%,96% 72%,81% 77%,78% 92%,63% 88%,50% 100%,37% 88%,22% 92%,19% 77%,4% 72%,11% 58%,0 47%,10% 36%,6% 21%,21% 19%,25% 4%,39% 9%)" },
  d_frame_geometric: { border: `3px solid ${ink}`, borderRadius: 0, outline: `2px solid ${acc}`, outlineOffset: 4, transform: "rotate(45deg) scale(.72)" },
  d_frame_sketch:    { border: `3px solid ${ink}`, borderRadius: "62% 38% 55% 45% / 48% 57% 43% 52%" },
  d_frame_nebula:    { border: `3px solid ${acc}`, boxShadow: `0 0 0 2px ${ink}, 0 0 22px 6px ${acc}66, inset 0 0 14px ${acc}44` },
  w_frame_solar:     { border: `3px solid ${acc}`, boxShadow: `0 0 0 4px ${ink}, 0 0 0 8px ${acc}88, 0 0 0 12px ${ink}44`, animation: "lokglow 3.2s ease-in-out infinite" },
  w_frame_crystal:   { border: `3px solid ${ink}`, clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)", boxShadow: `inset 0 0 12px ${acc}55` },
  w_frame_woven:     { border: `4px double ${ink}`, borderRadius: 10, boxShadow: `inset 0 0 0 2px ${acc}55` },
  // Permanent catalogue stock (sold from FRAMES in constants.jsx).
  c_frame_rope:      { border: `4px dotted ${ink}`, borderRadius: 999, boxShadow: `inset 0 0 0 3px ${acc}44, 0 0 0 2px ${ink}33` },
  c_frame_circuit:   { border: `2px solid ${acc}`, borderRadius: 3, outline: `2px dashed ${ink}`, outlineOffset: 3, boxShadow: `inset 0 0 8px ${acc}55` },
  c_frame_brush:     { border: `3px solid ${ink}`, borderRadius: "38% 62% 45% 55% / 55% 42% 58% 45%", boxShadow: `0 0 0 2px ${acc}33` },
});

// Page effects -> a generic particle spec consumed by PageEffect (src/art.jsx),
// so new effects are data, not another hand-written branch each time.
export const ROTATION_EFFECTS = {
  d_eff_fireflies: { count: 18, size: 5, color: "#FFE08A", glow: true, anim: "lokfly", dur: [3.4, 0.5], round: true },
  d_eff_bubbles:   { count: 22, size: 9, color: "#8FD6E8", anim: "lokbubble", dur: [4.2, 0.4], round: true, hollow: true },
  d_eff_pollen:    { count: 26, size: 4, color: "#E8C36B", glow: true, anim: "lokfloat", dur: [5.0, 0.6], round: true },
  d_eff_fog:       { count: 7,  size: 150, color: "#B9C6C4", anim: "lokdrift", dur: [11, 1.4], round: true, blur: 26, alpha: 0.28 },
  d_eff_stardust:  { count: 30, size: 3, color: "#FFFFFF", glow: true, anim: "loktwinkle", dur: [2.6, 0.4], round: true },
  w_eff_snow:      { count: 26, size: 6, color: "#F2F7FA", anim: "loksnow", dur: [5.2, 0.7], round: true },
  w_eff_plasma:    { count: 16, size: 3, color: "#9B7BFF", glow: true, anim: "lokglitchhue", dur: [1.5, 0.25], round: true },
  w_eff_rainbow:   { count: 14, size: 8, color: "rainbow", anim: "lokshimmer", dur: [3.0, 0.4], round: true },
  // Permanent catalogue stock (sold from EFFECTS in constants.jsx, not the
  // daily/weekly rotation). Same generic spec shape — no renderer changes.
  c_eff_drizzle:   { count: 34, size: 2, color: "#6FA8C7", anim: "lokdrizzle", dur: [1.6, 0.2], round: true, alpha: 0.5 },
  c_eff_motes:     { count: 24, size: 3, color: "#E8DCC0", anim: "lokmote", dur: [9.0, 1.2], round: true, glow: true, alpha: 0.5 },
  c_eff_spores:    { count: 20, size: 5, color: "#BFE3B0", anim: "lokspore", dur: [7.5, 0.9], round: true, hollow: true },
  c_eff_emberrise: { count: 22, size: 4, color: "#FF9B54", anim: "lokemberrise", dur: [4.4, 0.6], round: true, glow: true },
  c_eff_glitchrain:{ count: 28, size: 3, color: "#9B7BFF", anim: "lokglitchdrop", dur: [2.2, 0.3], alpha: 0.6 },
};

// Full-bleed sky washes -> merged into SkyEffect (src/art.jsx).
export const ROTATION_SKIES = {
  d_sky_twilight: "linear-gradient(180deg,#3B2E5A 0%,#8E5572 55%,#E8A87C 100%)",
  d_sky_thunder:  "linear-gradient(180deg,#2B2D42 0%,#4A4E69 60%,#8D99AE 100%)",
  d_sky_milkyway: "radial-gradient(ellipse at 50% 30%,#4A4E8F 0%,#1B1B2F 60%,#0B0B14 100%)",
  d_sky_sunflare: "linear-gradient(180deg,#FFD166 0%,#F4845F 55%,#C1666B 100%)",
  w_sky_comet:    "linear-gradient(140deg,#0B132B 0%,#1C2541 55%,#3A506B 100%)",
  w_sky_borealis: "linear-gradient(180deg,#0B2447 0%,#19376D 45%,#576CBC 80%,#A5D7E8 100%)",
  // Permanent catalogue stock (sold from SKIES in constants.jsx).
  c_sky_deepocean: "linear-gradient(180deg,#01161E 0%,#124559 50%,#598392 100%)",
  c_sky_bloodmoon: "radial-gradient(ellipse at 50% 25%,#8C1C13 0%,#3A0B08 55%,#140303 100%)",
  c_sky_mintdawn:  "linear-gradient(180deg,#C7F9CC 0%,#80ED99 40%,#57CC99 75%,#38A3A5 100%)",
  c_sky_ash:       "linear-gradient(180deg,#3E3E3E 0%,#6B6B6B 50%,#9E9E9E 100%)",
};

// Studio paper overlays -> merged into Easel's paper switch. Values are CSS
// background-image strings; `INK` is substituted with the theme ink colour.
export const ROTATION_PAPERS = {
  d_paper_vinyl:     "repeating-radial-gradient(circle at 50% 50%,INK08 0 1px,transparent 1px 4px)",
  d_paper_linen:     "repeating-linear-gradient(45deg,INK10 0 1px,transparent 1px 5px),repeating-linear-gradient(-45deg,INK10 0 1px,transparent 1px 5px)",
  d_paper_metallic:  "linear-gradient(115deg,INK00 0%,INK18 28%,INK00 42%,INK14 62%,INK00 80%)",
  d_paper_parchment: "radial-gradient(ellipse at 30% 20%,INK12 0%,transparent 55%),radial-gradient(ellipse at 75% 78%,INK10 0%,transparent 50%)",
  w_paper_onyx:      "linear-gradient(160deg,INK22 0%,INK08 45%,INK1A 100%)",
  w_paper_iridescent:"linear-gradient(105deg,INK00 0%,INK16 20%,INK00 34%,INK18 52%,INK00 68%,INK14 86%)",
  // Permanent catalogue stock (sold from PAPERS in constants.jsx). `INK<aa>` is
  // substituted with the theme ink colour + alpha by the Easel renderer.
  c_paper_hex:      "repeating-linear-gradient(60deg,INK0E 0 1px,transparent 1px 14px),repeating-linear-gradient(-60deg,INK0E 0 1px,transparent 1px 14px),repeating-linear-gradient(0deg,INK0E 0 1px,transparent 1px 14px)",
  c_paper_ledger:   "repeating-linear-gradient(0deg,INK14 0 1px,transparent 1px 26px),linear-gradient(90deg,transparent 0 46px,INK20 46px 47px,transparent 47px)",
  c_paper_weave:    "repeating-linear-gradient(0deg,INK10 0 2px,transparent 2px 6px),repeating-linear-gradient(90deg,INK10 0 2px,transparent 2px 6px)",
  c_paper_crumpled: "radial-gradient(ellipse at 18% 32%,INK14 0%,transparent 42%),radial-gradient(ellipse at 68% 22%,INK10 0%,transparent 38%),radial-gradient(ellipse at 42% 78%,INK12 0%,transparent 45%),radial-gradient(ellipse at 84% 66%,INK0E 0%,transparent 40%)",
};

// Blot borders -> merged into the blot-border lookup.
export const ROTATION_BORDERS = (ink, acc) => ({
  d_border_chain:  { border: `4px double ${ink}`, borderRadius: 14 },
  d_border_neon:   { border: `2px solid ${acc}`, borderRadius: 12, boxShadow: `0 0 10px ${acc}, inset 0 0 8px ${acc}55` },
  d_border_bone:   { border: `3px dashed ${ink}`, borderRadius: 18, boxShadow: `0 0 0 3px ${ink}22` },
  d_border_tribal: { border: `3px solid ${ink}`, borderRadius: 2, outline: `2px dotted ${ink}`, outlineOffset: 3 },
  w_border_rune:   { border: `3px double ${acc}`, borderRadius: 999, boxShadow: `inset 0 0 10px ${acc}44` },
  w_border_void:   { border: `3px solid #0B0B14`, borderRadius: 999, boxShadow: `0 0 18px #000, inset 0 0 16px #000` },
  // Permanent catalogue stock (sold from BLOT_BORDERS in constants.jsx).
  c_border_stitch: { border: `3px dashed ${ink}`, borderRadius: 12, boxShadow: `inset 0 0 0 2px ${acc}33` },
  c_border_halo:   { border: `2px solid ${acc}`, borderRadius: 999, boxShadow: `0 0 14px 3px ${acc}55, inset 0 0 6px ${acc}33` },
  c_border_glitch: { border: `3px solid ${acc}`, borderRadius: 4, boxShadow: `3px 0 0 ${ink}66, -3px 0 0 ${acc}66` },
});

// Cursor packs -> SVG data-URIs, same shape engine/cursors.js already returns.
const svgCursor = (body, hx = 12, hy = 12) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">${body}</svg>`)}") ${hx} ${hy}, crosshair`;
export const ROTATION_CURSORS = {
  d_cursor_flame:   svgCursor(`<path d="M14 3c3 5 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-3 0-5 0-7z" fill="#FF6B35" stroke="#7A2E12" stroke-width="1.5"/>`, 14, 14),
  d_cursor_ghost:   svgCursor(`<path d="M14 4a8 8 0 0 0-8 8v10l3-2 2.5 2 2.5-2 2.5 2 2.5-2 3 2V12a8 8 0 0 0-8-8z" fill="#E8ECF5" fill-opacity=".72" stroke="#5A6472" stroke-width="1.5"/>`, 14, 14),
  d_cursor_comet:   svgCursor(`<path d="M4 24L18 10" stroke="#FFD166" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="8" r="5" fill="#FFF3C4" stroke="#E0A526" stroke-width="1.5"/>`, 20, 8),
  w_cursor_phantom: svgCursor(`<circle cx="14" cy="14" r="7" fill="none" stroke="#B8A6E8" stroke-width="2"/><circle cx="10" cy="18" r="5" fill="none" stroke="#B8A6E8" stroke-width="1.5" stroke-opacity=".5"/>`, 14, 14),
  w_cursor_thunder: svgCursor(`<path d="M16 2L6 15h6l-3 11 13-15h-7l3-9z" fill="#FFE45E" stroke="#8A6D0B" stroke-width="1.5" stroke-linejoin="round"/>`, 12, 14),
  // Permanent catalogue stock (sold from CURSORS in constants.jsx).
  c_cursor_quill:   svgCursor(`<path d="M4 24c4-2 6-6 8-10s5-8 9-10c1 5-1 10-4 14s-8 6-13 6z" fill="#D9C9A8" stroke="#6B563A" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 24l7-7" stroke="#6B563A" stroke-width="1.5" stroke-linecap="round"/>`, 4, 24),
  c_cursor_paw:     svgCursor(`<ellipse cx="14" cy="18" rx="6" ry="5" fill="#C98BB9" stroke="#6B3A5E" stroke-width="1.5"/><circle cx="7" cy="11" r="2.6" fill="#C98BB9" stroke="#6B3A5E" stroke-width="1.3"/><circle cx="12" cy="8" r="2.6" fill="#C98BB9" stroke="#6B3A5E" stroke-width="1.3"/><circle cx="17" cy="8" r="2.6" fill="#C98BB9" stroke="#6B3A5E" stroke-width="1.3"/><circle cx="21" cy="11" r="2.6" fill="#C98BB9" stroke="#6B3A5E" stroke-width="1.3"/>`, 14, 16),
};

// Emoji sets — these two categories are pure data, so they just work.
export const ROTATION_STICKERS = {
  d_sticker_gothic: ["🦇", "🌹", "💀", "🕯️", "⚰️", "🕸️", "🥀", "🌑"],
  d_sticker_dream:  ["💤", "🌙", "☁️", "⭐", "🛏️", "🫧", "🌫️", "🪐"],
  w_sticker_cyber:  ["🤖", "💿", "🔧", "🛰️", "⚙️", "🔌", "📡", "🦾"],
  // NOTE: permanent sticker packs are NOT listed here — they carry their emoji
  // inline on the STICKER_PACKS catalogue entry, which is also what the Shop
  // preview reads. Duplicating them here would let the preview and the actual
  // equipped set drift apart, since this table wins at runtime (App.jsx:449).
};
// Rotation font packs, same shape as FONT_PACKS entries.
export const ROTATION_FONTS = {
  d_font_script: "'Great Vibes',cursive",
  d_font_gothic: "'UnifrakturMaguntia',cursive",
  d_font_future: "'Orbitron',sans-serif",
  w_font_runes:  "'Cinzel',serif",
  w_font_cyber:  "'Major Mono Display',monospace",
};

// Reaction packs are rendered by <ReactionIcon type=...> (src/art.jsx), which
// is a switch over NAMED icon types and falls through to the splat SVG for
// anything it doesn't recognise. These rows used to hold raw emoji ("✨","🌊"),
// none of which match a case — so all three packs silently rendered as three
// identical splats while still costing Loks. Values must be names ReactionIcon
// actually implements; verify:cosmetics now enforces that.
export const ROTATION_REACTIONS = {
  d_reaction_magic: ["sparkle", "star", "bolt2"],
  d_reaction_sea:   ["wave2", "drip", "lotus"],
  w_reaction_myth:  ["skull2", "flame", "bolt2"],
  // Permanent catalogue stock (sold from REACTION_PACKS in constants.jsx).
  c_reaction_weather: ["wave2", "sparkle", "comet"],
};
