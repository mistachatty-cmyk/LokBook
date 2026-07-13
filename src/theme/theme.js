import { createContext, useContext } from "react";

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
};
export const SKIN_WAVE_GATE = 2;
export const SKIN_WAVE_3_GATE = 5;
export const SKIN_WAVE_4_GATE = 10;
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

// Theme System 2.0 — CSS custom properties layer. Every token has a fallback,
// so old saves and themes without the new optional fields (font/gradient/glow)
// are unaffected. New components can style via var(--lok-*) without prop drilling.
// Border style presets for LilLok blot containers (Shop + LilLok FAB)
export const blotBorderStyle = (id, T) => ({
  none:  { border: `3px solid ${T.ink}` },
  gilded:{ border: "3px solid #E8B14B", boxShadow: `0 0 0 2px ${T.ink}, 3px 3px 0 ${T.shadow}` },
  washi: { border: `3px dashed ${T.accent}` },
  orbit: { border: `3px dotted ${T.alt}`, outline: `2px dashed ${T.ink}`, outlineOffset: 3 },
  liquid:{ border: `3px solid ${T.accent}`, boxShadow: `0 0 0 2px ${T.ink}, 0 0 16px 3px ${T.accent}` },
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
