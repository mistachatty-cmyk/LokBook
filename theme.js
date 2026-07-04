import { createContext, useContext } from "react";

export const THEMES = {
  riso:    { name:"Print Shop",       desc:"Two-ink risograph. The original.",          price:0,  paper:"#F2EDE2", ink:"#23306B", accent:"#FF5DA2", alt:"#2FA9A0", shadow:"#D9D2C0", card:"#FFFDF7", onAccent:"#fff" },
  midnight:{ name:"Midnight Ink",     desc:"Light table off, lamps on.",                price:40, paper:"#161C38", ink:"#EDE8D8", accent:"#FF5DA2", alt:"#3FC1B7", shadow:"rgba(0,0,0,.5)", card:"#1F2647", onAccent:"#fff" },
  tide:    { name:"Tide Pool",        desc:"Salt, kelp, one orange fish.",              price:40, paper:"#E2EFEC", ink:"#14555B", accent:"#FF8A5C", alt:"#3D9CA8", shadow:"#C3D8D3", card:"#F4FAF8", onAccent:"#fff" },
  zine:    { name:"Tangerine Zine",   desc:"Photocopied at 2am, stapled crooked.",      price:40, paper:"#FFF1DC", ink:"#46280F", accent:"#F4541D", alt:"#8C6BC8", shadow:"#EBD7B8", card:"#FFFAF0", onAccent:"#fff" },
  bloom:   { name:"Hot Bloom",        desc:"Magenta on bone. Loud and proud.",          price:60, paper:"#FBE9EF", ink:"#3A0B2E", accent:"#E0218A", alt:"#5E8BFF", shadow:"#E9CBD8", card:"#FFF4F8", onAccent:"#fff" },
  forest:  { name:"Forest Risograph", desc:"Pine ink, mushroom paper.",                 price:60, paper:"#ECEFE0", ink:"#1F3A24", accent:"#E8662A", alt:"#5A9E5E", shadow:"#D2D7C2", card:"#F6F8EE", onAccent:"#fff" },
  neon:    { name:"Neon Arcade",      desc:"Coin-op glow. Wave 2.",     price:90,wave:2,paper:"#0E0B1E", ink:"#F0E9FF", accent:"#19F0C3", alt:"#FF2E97", shadow:"rgba(0,0,0,.6)", card:"#1A1430", onAccent:"#0E0B1E" },
  blush:   { name:"Porcelain Blush",  desc:"Soft clay, gold leaf. Wave 2.", price:90,wave:2, paper:"#F7EEE7", ink:"#5E3B2E", accent:"#D98C6A", alt:"#B79B6E", shadow:"#E6D8CC", card:"#FDF7F2", onAccent:"#fff" },
  cobalt:  { name:"Cobalt Press",     desc:"Blueprint ink, chalk lines. Wave 2.", price:90,wave:2, paper:"#0B2545", ink:"#DCE8F5", accent:"#FFC94D", alt:"#6FB1FF", shadow:"rgba(0,0,0,.5)", card:"#123257", onAccent:"#0B2545" },
};
export const SKIN_WAVE_GATE = 4;
export const ThemeCtx = createContext(THEMES.riso);
export const useT = () => useContext(ThemeCtx);
export const ART = { paper:"#F2EDE2", ink:"#23306B", pink:"#FF5DA2", teal:"#2FA9A0" };