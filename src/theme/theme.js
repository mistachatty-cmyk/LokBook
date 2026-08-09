import { createContext, useContext } from "react";
import { ROTATION_BORDERS } from "../engine/rotation.js";

export const THEMES = {
  riso:    { name:"Print Shop",       desc:"Two-ink risograph. The original.",          price:0,  paper:"#F2EDE2", ink:"#23306B", accent:"#FF5DA2", alt:"#2FA9A0", shadow:"#D9D2C0", card:"#FFFDF7", onAccent:"#000" },
  midnight:{ name:"Midnight Ink",     desc:"Light table off, lamps on.",                price:40, paper:"#161C38", ink:"#EDE8D8", accent:"#FF5DA2", alt:"#3FC1B7", shadow:"rgba(0,0,0,.5)", card:"#1F2647", onAccent:"#000" },
  tide:    { name:"Tide Pool",        desc:"Salt, kelp, one orange fish.",              price:40, paper:"#E2EFEC", ink:"#14555B", accent:"#FF8A5C", alt:"#3D9CA8", shadow:"#C3D8D3", card:"#F4FAF8", onAccent:"#000" },
  zine:    { name:"Tangerine Zine",   desc:"Photocopied at 2am, stapled crooked.",      price:40, paper:"#FFF1DC", ink:"#46280F", accent:"#F4541D", alt:"#8C6BC8", shadow:"#EBD7B8", card:"#FFFAF0", onAccent:"#fff" },
  bloom:   { name:"Hot Bloom",        desc:"Magenta on bone. Loud and proud.",          price:60, paper:"#FBE9EF", ink:"#3A0B2E", accent:"#E0218A", alt:"#5E8BFF", shadow:"#E9CBD8", card:"#FFF4F8", onAccent:"#fff" },
  forest:  { name:"Forest Risograph", desc:"Pine ink, mushroom paper.",                 price:60, paper:"#ECEFE0", ink:"#1F3A24", accent:"#E8662A", alt:"#5A9E5E", shadow:"#D2D7C2", card:"#F6F8EE", onAccent:"#fff" },
  neon:    { name:"Neon Arcade",      desc:"Coin-op glow. Wave 2.",     price:90,wave:2,paper:"#0E0B1E", ink:"#F0E9FF", accent:"#19F0C3", alt:"#FF2E97", shadow:"rgba(0,0,0,.6)", card:"#1A1430", onAccent:"#0E0B1E" },
  blush:   { name:"Porcelain Blush",  desc:"Soft clay, gold leaf. Wave 2.", price:90,wave:2, paper:"#F7EEE7", ink:"#5E3B2E", accent:"#D98C6A", alt:"#B79B6E", shadow:"#E6D8CC", card:"#FDF7F2", onAccent:"#000" },
  cobalt:  { name:"Cobalt Press",     desc:"Blueprint ink, chalk lines. Wave 2.", price:90,wave:2, paper:"#0B2545", ink:"#DCE8F5", accent:"#FFC94D", alt:"#6FB1FF", shadow:"rgba(0,0,0,.5)", card:"#123257", onAccent:"#0B2545" },
  solar:   { name:"Solar Flare",      desc:"Hot plasma, cold space. Wave 3.", price:120,wave:3,paper:"#1A1430", ink:"#FFFAF0", accent:"#FF5733", alt:"#FFC300", shadow:"rgba(0,0,0,.6)", card:"#2C2A4A", onAccent:"#fff" },
  meadow:  { name:"Meadow",           desc:"Fresh cut grass, summer day. Wave 3.", price:120,wave:3,paper:"#E8F5E9", ink:"#2E7D32", accent:"#FFEB3B", alt:"#81C784", shadow:"#C8E6C9", card:"#F1F8E9", onAccent:"#000" },
  ocean:   { name:"Ocean Depths",     desc:"Bioluminescent life, deep blue. Wave 4.", price:200,wave:4, animated:true, paper:"#001F3F", ink:"#F0F8FF", accent:"#00BFFF", alt:"#7FDBFF", shadow:"rgba(0,0,0,.7)", card:"#001a33", onAccent:"#000" },
  glitch:  { name:"Glitch",           desc:"Digital artifacting, corrupted data. Wave 4.", price:200,wave:4, animated:true, paper:"#000000", ink:"#00FF00", accent:"#FF00FF", alt:"#FFFF00", shadow:"rgba(255,255,255,.2)", card:"#111", onAccent:"#000" },
  pumpkin: { name:"Pumpkin Patch",    desc:"Orange harvest, black cat silhouette.",      price:45, paper:"#FFF3E0", ink:"#3E2723", accent:"#FF6F00", alt:"#4E342E", shadow:"#E8D5B7", card:"#FFF8E7", onAccent:"#000" },
  matcha:  { name:"Matcha Studio",    desc:"Green tea paper, bamboo ink.",               price:45, paper:"#E8F5E9", ink:"#1B5E20", accent:"#A5D6A7", alt:"#66BB6A", shadow:"#C8E6C9", card:"#F1F8E9", onAccent:"#1B5E20" },
  lavender: { name:"Lavender Haze",   desc:"Twilight fields, soft purple air.",          price:50, paper:"#F3E5F5", ink:"#4A148C", accent:"#CE93D8", alt:"#7B1FA2", shadow:"#E1BEE7", card:"#FCE4EC", onAccent:"#000" },
  retro:   { name:"Retro Terminal",   desc:"CRT glow, green phosphor, amber alerts. Wave 2.", price:85,wave:2, paper:"#0D1117", ink:"#00FF41", accent:"#FFB000", alt:"#0088FF", shadow:"rgba(0,0,0,.6)", card:"#161B22", onAccent:"#000" },
  candy:   { name:"Candy Shop",       desc:"Pastel neons, sugar-rush bright. Wave 2.",   price:80,wave:2, paper:"#FFF0F5", ink:"#C2185B", accent:"#FF4081", alt:"#B2FF59", shadow:"#F8BBD0", card:"#FFF9FB", onAccent:"#fff" },
  noir:    { name:"Film Noir",        desc:"Monochrome. Shadow, light, silhouette. Wave 3.", price:110,wave:3, paper:"#1A1A1A", ink:"#F5F5F5", accent:"#E50914", alt:"#8C8C8C", shadow:"#000", card:"#262626", onAccent:"#fff" },
  sakura:  { name:"Sakura Wind",      desc:"Cherry petals drifting across washi. Wave 3.", price:115,wave:3, paper:"#FEF6F8", ink:"#5D2E46", accent:"#FF7B9C", alt:"#B8A9C9", shadow:"#EDDDE0", card:"#FFF8F9", onAccent:"#000" },
  aurora:  { name:"Aurora Borealis",  desc:"Northern lights, crisp arctic air. Wave 4.", price:180,wave:4, animated:true, paper:"#0B0C10", ink:"#E0FBFC", accent:"#00FFAA", alt:"#7F5AF0", shadow:"rgba(0,0,0,.6)", card:"#1F2029", onAccent:"#0B0C10" },
  vapor:   { name:"Vaporwave",        desc:"Neon grids, sunset chrome, retro futures. Wave 4.", price:190,wave:4, animated:true, paper:"#07041A", ink:"#F8EFFF", accent:"#FF2E97", alt:"#00D4FF", shadow:"rgba(255,46,151,.25)", card:"#120B2B", onAccent:"#07041A" },
  smile:  { name:"Smile",            desc:"Warm sunshine, happy accidents. Wave 4.",     price:180,wave:4, paper:"#FEF9E7", ink:"#4A3728", accent:"#F39C12", alt:"#E74C3C", shadow:"#EBDCB8", card:"#FFFDF5", onAccent:"#000" },

  // ---- Ward skins ------------------------------------------------------
  // Each one is pulled from a named ward in the world bible (PRODUCT_KIT §4)
  // rather than invented as a generic palette, so the shop reads as places
  // you can visit instead of a swatch grid.
  coldpress:   { name:"Coldpress",          desc:"Heavy watercolour stock, cold to the touch.", price:45, paper:"#E8E4DA", ink:"#33454D", accent:"#2E7D8F", alt:"#8FA3A8", shadow:"#CFCABB", card:"#F5F2EA", onAccent:"#fff" },
  quickyard:   { name:"The Quickyard",      desc:"Newsprint and a red pencil. Draw fast.",      price:45, paper:"#F0EDE6", ink:"#2E2E2E", accent:"#D62828", alt:"#4C6EF5", shadow:"#DAD5CB", card:"#FAF8F3", onAccent:"#fff" },
  marginfold:  { name:"Margin Fold",        desc:"Ruled lines, red margin, doodles anyway.",    price:50, paper:"#FBFBF6", ink:"#2B3A67", accent:"#D33F55", alt:"#6C8AC4", shadow:"#E2E2D8", card:"#FFFFFC", onAccent:"#fff" },
  gridquarter: { name:"Grid Quarter",       desc:"Graph paper. Everything squares up.",         price:50, paper:"#EDF3F5", ink:"#1C3E4A", accent:"#00807F", alt:"#5B7C8D", shadow:"#D2E0E5", card:"#F7FBFC", onAccent:"#fff" },
  kilnrow:     { name:"Kiln Row",           desc:"Fired clay, ash, and a hot orange seam.",     price:55, paper:"#F2E6D8", ink:"#4A2C1A", accent:"#C2551A", alt:"#8C6239", shadow:"#DCC9B4", card:"#FBF2E7", onAccent:"#fff" },
  compass:     { name:"Compass Ward",       desc:"Chart paper and brass instruments.",          price:55, paper:"#F3E7CE", ink:"#3E2E1E", accent:"#1F6F8B", alt:"#A5791F", shadow:"#E0CFAF", card:"#FBF3E2", onAccent:"#fff" },
  duotone:     { name:"Two-Ink Duotone",    desc:"One blue drum, one red. Nothing else.",       price:60, paper:"#F5F1E8", ink:"#1B3A8C", accent:"#D62246", alt:"#3A5CB8", shadow:"#DFD9CB", card:"#FCF9F2", onAccent:"#fff" },
  silentcolumn:{ name:"The Silent Column",  desc:"Grey stone, gold leaf, no conversation.",     price:60, paper:"#E6E4E0", ink:"#33322F", accent:"#9A7639", alt:"#7A7873", shadow:"#CFCCC6", card:"#F4F3F1", onAccent:"#fff" },

  // ---- Wave 2 ----------------------------------------------------------
  thermal:     { name:"Thermal Receipt",    desc:"Printed hot, fades by morning. Wave 2.",      price:85, wave:2, paper:"#FAFAF8", ink:"#1A1A1A", accent:"#4A4A4A", alt:"#9A9A9A", shadow:"#E6E6E2", card:"#FFFFFF", onAccent:"#fff" },
  honeycomb:   { name:"Honeycomb",          desc:"Amber light, slow and warm. Wave 2.",         price:85, wave:2, paper:"#FFF6E0", ink:"#5C3D14", accent:"#B87910", alt:"#C97B30", shadow:"#F0E0BC", card:"#FFFBEF", onAccent:"#fff" },
  frostpane:   { name:"Frostpane",          desc:"Breath on cold glass. Wave 2.",               price:90, wave:2, paper:"#EDF6FA", ink:"#1E4257", accent:"#2E88AA", alt:"#9FC7DA", shadow:"#D6E7EF", card:"#F8FCFE", onAccent:"#fff" },
  carboncopy:  { name:"Carbon Copy",        desc:"Second sheet, softer impression. Wave 2.",    price:90, wave:2, paper:"#E9E7EC", ink:"#35313C", accent:"#6B5B8C", alt:"#8E88A0", shadow:"#D5D2DA", card:"#F4F3F6", onAccent:"#fff" },

  // ---- Wave 3 ----------------------------------------------------------
  nightleaf:   { name:"Nightleaf",          desc:"Moth-wing green after dark. Wave 3.",         price:115, wave:3, paper:"#0F1A14", ink:"#DCE8DC", accent:"#4FAF6B", alt:"#B08CD8", shadow:"rgba(0,0,0,.55)", card:"#16241C", onAccent:"#fff" },
  blueprint:   { name:"Blueprint",          desc:"Cyanotype and chalk lines. Wave 3.",          price:115, wave:3, paper:"#0D3B66", ink:"#E0ECF8", accent:"#FFD166", alt:"#7FB2D9", shadow:"rgba(0,0,0,.45)", card:"#124A80", onAccent:"#000" },
  lilacdusk:   { name:"Lilac Dusk",         desc:"The hour the wards go quiet. Wave 3.",        price:120, wave:3, paper:"#F0EAF5", ink:"#3F2E52", accent:"#8B4FC4", alt:"#C08AC8", shadow:"#DDD2E6", card:"#F9F5FC", onAccent:"#fff" },
  oxblood:     { name:"Oxblood Press",      desc:"Deep red leather and gilt. Wave 3.",          price:120, wave:3, paper:"#F2ECE4", ink:"#4A1520", accent:"#8C1C2B", alt:"#B08D4F", shadow:"#DED5C8", card:"#FBF7F1", onAccent:"#fff" },

  // ---- Wave 4 · living backdrops ---------------------------------------
  inkwell:     { name:"The Well",           desc:"Ink rising from the source. Wave 4.",         price:190, wave:4, animated:true, backdrop:"wellrise",   paper:"#0E1420", ink:"#D8E4F0", accent:"#3AA8DC", alt:"#7E8CA8", shadow:"rgba(0,0,0,.6)", card:"#162030", onAccent:"#fff" },
  ashward:     { name:"Ash Ward",           desc:"Warm ash, still falling. Wave 4.",            price:190, wave:4, animated:true, backdrop:"ashfall",    paper:"#1A1917", ink:"#E4DFD6", accent:"#E2551F", alt:"#8D8578", shadow:"rgba(0,0,0,.6)", card:"#232220", onAccent:"#fff" },
  misprint:    { name:"The Misprint",       desc:"Off-register on purpose. Wave 4.",            price:200, wave:4, animated:true, backdrop:"misregister",paper:"#F7F3EC", ink:"#2B2B2B", accent:"#D6215F", alt:"#0090B0", shadow:"#E0DAD0", card:"#FFFCF6", onAccent:"#fff" },
  unbound:     { name:"The Unbound",        desc:"Loose pages nobody bound. Wave 4.",           price:200, wave:4, animated:true, backdrop:"driftpages", paper:"#F7F7F9", ink:"#4A4A55", accent:"#7A66B8", alt:"#B0AAC4", shadow:"#E4E4E9", card:"#FFFFFF", onAccent:"#fff" },

  // ---- Wave 5 · the drawing hand ---------------------------------------
  // These two run the `livedraw` backdrop: real strokes, generated by the
  // same parametric engine the resident artists draw with, being drawn and
  // erased behind the whole app. Nothing else in the shop does this.
  livingink:   { name:"Living Ink",         desc:"The page draws itself behind you. Wave 5.",   price:260, wave:5, animated:true, backdrop:"livedraw", paper:"#F4EFE3", ink:"#232A3D", accent:"#C4487A", alt:"#2FA9A0", shadow:"#DFD8C8", card:"#FFFDF7", onAccent:"#fff" },
  voidhand:    { name:"The Void Hand",      desc:"Something is still drawing. Wave 5.",         price:280, wave:5, animated:true, backdrop:"livedraw", paper:"#0B0B10", ink:"#EDE9F5", accent:"#8B7BD8", alt:"#4FC3C0", shadow:"rgba(0,0,0,.65)", card:"#14141C", onAccent:"#fff" },

  // ---- Second harvest — 10 more, ungated -------------------------------
  // Same named-place voice as the ward batch above, priced like the
  // original wave-1 wards rather than slotted behind a new wave gate.
  cinderrow:      { name:"Cinder Row",          desc:"Coal smoke, a banked fire, iron light.",    price:50, paper:"#221A16", ink:"#EFE2D6", accent:"#E8622C", alt:"#B08A5E", shadow:"#16110D", card:"#2E2420", onAccent:"#000" },
  papermoon:      { name:"The Paper Moon",      desc:"A pale disc on a cold clear page.",         price:50, paper:"#EAF0F6", ink:"#233045", accent:"#3B6EA5", alt:"#8FA6BF", shadow:"#D4DEE7", card:"#F7FAFC", onAccent:"#fff" },
  verdigris:      { name:"Verdigris Hall",      desc:"Old copper roofing, gone green with age.",  price:55, paper:"#E3ECE6", ink:"#1E3A32", accent:"#2C7059", alt:"#8FAE9C", shadow:"#CBDACF", card:"#F2F7F4", onAccent:"#fff" },
  saltline:       { name:"Salt Line",           desc:"Tide-flat grey, gull cry, cold brine.",     price:50, paper:"#E7EDF0", ink:"#2C3E48", accent:"#3F7C93", alt:"#9AB4C0", shadow:"#D2DCE1", card:"#F5F9FB", onAccent:"#fff" },
  theloom:        { name:"The Loom",            desc:"Warp and weft, warm wool, slow hands.",     price:55, paper:"#EFE6D8", ink:"#4A3423", accent:"#8C4620", alt:"#8C6E4E", shadow:"#DDD0BC", card:"#FBF6EC", onAccent:"#fff" },
  ambervault:     { name:"Amber Vault",         desc:"Everything kept, nothing spent. Wave 2.",   price:90, wave:2, paper:"#1D1508", ink:"#F3E3B8", accent:"#D9971F", alt:"#8C6A2E", shadow:"rgba(0,0,0,.5)", card:"#291F0F", onAccent:"#000" },
  chalklinecourt: { name:"Chalkline Court",     desc:"Measured, swept, and drawn square.",        price:50, paper:"#F2F0EC", ink:"#3A3A38", accent:"#6E6E68", alt:"#A9A79E", shadow:"#DDDBD5", card:"#FAF9F6", onAccent:"#fff" },
  hollowpress:    { name:"The Hollow Press",    desc:"A printworks nobody runs anymore. Wave 3.", price:120, wave:3, paper:"#150F1E", ink:"#E7DCF2", accent:"#8B4FD8", alt:"#5E4A7A", shadow:"rgba(0,0,0,.55)", card:"#1E1729", onAccent:"#fff" },
  windward:       { name:"Windward Steps",      desc:"High stairs, clean air, a long view.",      price:55, paper:"#EAF4FA", ink:"#1D3E52", accent:"#2E9BD6", alt:"#8FCBE6", shadow:"#CFE3EE", card:"#F7FCFE", onAccent:"#000" },
  ferrousyard:    { name:"Ferrous Yard",        desc:"Rust and rivets, the old iron works.",      price:55, paper:"#241C18", ink:"#EDDCC9", accent:"#D98456", alt:"#7A6152", shadow:"#170F0C", card:"#302620", onAccent:"#000" },
};
export const SKIN_WAVE_GATE = 2;
export const SKIN_WAVE_3_GATE = 5;
export const SKIN_WAVE_4_GATE = 10;
export const SKIN_WAVE_5_GATE = 18;
export const ThemeCtx = createContext(THEMES.riso);
export const useT = () => useContext(ThemeCtx);
export const ART = { paper:"#F2EDE2", ink:"#23306B", pink:"#FF5DA2", teal:"#2FA9A0" };
export const SMILE_VARIANTS = [
  { id:"smile1", path:"M8 12 Q16 6 24 12 M12 20 Q16 24 20 20", label:"Gentle" },
  { id:"smile2", path:"M6 12 Q16 4 26 12 M10 20 Q16 26 22 20", label:"Big" },
  { id:"smile3", path:"M10 12 Q16 8 22 12 M12 20 Q16 22 20 20", label:"Soft" },
  { id:"smile4", path:"M8 11 Q16 3 24 11 M11 20 Q16 28 21 20", label:"Wide" },
  { id:"smile5", path:"M9 13 Q16 10 23 13 M13 20 Q16 24 19 20", label:"Tiny" },
  { id:"smile6", path:"M7 12 Q16 5 25 12 M11 20 Q16 25 21 20", label:"Bright" },
  { id:"smile7", path:"M8 14 Q16 5 24 14 M13 18 Q16 23 19 18", label:"Shy" },
  { id:"smile8", path:"M6 11 Q16 7 26 11 M10 20 Q16 27 22 20", label:"Bold" },
  { id:"smile9", path:"M8 12 Q16 9 24 12 M12 21 Q16 26 20 21", label:"Warm" },
  { id:"smile10", path:"M7 13 Q16 6 25 13 M11 19 Q16 23 21 19", label:"Cozy" },
  { id:"smile11", path:"M9 11 Q16 7 23 11 M12 19 Q16 25 20 19", label:"Sweet" },
  { id:"smile12", path:"M8 13 Q16 16 24 13 M13 21 Q16 24 19 21", label:"Silly" },
  { id:"smile13", path:"M6 12 Q16 8 26 12 M10 20 Q16 29 22 20", label:"Huge" },
  { id:"smile14", path:"M9 12 Q16 11 23 12 M12 20 Q16 22 20 20", label:"Calm" },
  { id:"smile15", path:"M7 11 Q16 4 25 11 M11 18 Q16 22 21 18", label:"Fresh" },
  { id:"smile16", path:"M8 12 Q16 6 24 12 M10 21 Q16 25 22 21", label:"Happy" },
];

// Pick black or white text for an arbitrary theme color. Badges and pills sit
// on T.alt/T.ink/etc., which swing from near-black (forest) to near-white
// (candy's #B2FF59) across the 26 themes — a hardcoded "#fff" is unreadable on
// the light half. Uses the WCAG relative-luminance threshold; non-hex inputs
// (rgba shadows) fall back to the theme's ink.
export function onColor(bg, T) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((bg || "").trim());
  if (!m) return T?.ink || "#000";
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const lin = v => { const s = parseInt(v, 16) / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(h.slice(0, 2)) + 0.7152 * lin(h.slice(2, 4)) + 0.0722 * lin(h.slice(4, 6));
  return L > 0.179 ? "#000" : "#fff";
}

// Theme System 2.0 — CSS custom properties layer. Every token has a fallback,
// so old saves and themes without the new optional fields (font/gradient/glow)
// are unaffected. New components can style via var(--lok-*) without prop drilling.
// Border style presets for LilLok blot containers (Shop + LilLok FAB)
export const blotBorderStyle = (id, T) => ({
  ...ROTATION_BORDERS(T.ink, T.accent),
  none:  { border: `3px solid ${T.ink}` },
  gilded:{ border: "3px solid #E8B14B", boxShadow: `0 0 0 2px ${T.ink}, 3px 3px 0 ${T.shadow}` },
  washi: { border: `3px dashed ${T.accent}` },
  orbit: { border: `3px dotted ${T.alt}`, outline: `2px dashed ${T.ink}`, outlineOffset: 3 },
  liquid:{ border: `3px solid ${T.accent}`, boxShadow: `0 0 0 2px ${T.ink}, 0 0 16px 3px ${T.accent}` },
  stitch:{ border: `3px double ${T.ink}` },
  marble:{ border: `3px solid ${T.alt}`, boxShadow: `inset 0 0 0 2px ${T.paper}, 0 0 0 3px ${T.ink}` },
}[id] || { border: `3px solid ${T.ink}` });

export function themeVars(T) {
  return {
    "--lok-paper": T.paper, "--lok-ink": T.ink, "--lok-accent": T.accent,
    "--lok-alt": T.alt, "--lok-shadow": T.shadow, "--lok-card": T.card,
    "--lok-on-accent": T.onAccent,
    "--lok-font-display": T.font || "'Bricolage Grotesque', sans-serif",
    "--lok-gradient": T.gradient || `linear-gradient(135deg, ${T.accent}, ${T.alt})`,
    "--lok-glow": T.glow || "transparent",
  };
}
