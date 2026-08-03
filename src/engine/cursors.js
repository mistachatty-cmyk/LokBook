// Purchasable drawing cursors, as inline SVG data-URIs so no assets ship.
// Each entry returns a CSS `cursor` value with an explicit hotspot; every one
// falls back to `crosshair` so a missing/blocked cursor never leaves the canvas
// without a pointer.
const svg = body =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>${body}</svg>`
  )}") 14 14, crosshair`;

const INK = "%2323306B";

export const CURSOR_CSS = {
  default: "crosshair",
  inkdrop: svg(`<path d='M14 3 C9 10 7 13 7 17 a7 7 0 0 0 14 0 c0-4-2-7-7-14z' fill='#23306B' stroke='#fff' stroke-width='1.5'/>`),
  pencil: svg(`<path d='M4 24 L7 17 L20 4 L24 8 L11 21 Z' fill='#E8B14B' stroke='#23306B' stroke-width='1.8' stroke-linejoin='round'/><path d='M4 24 L7 17 L11 21 Z' fill='#23306B'/>`),
  brush_cross: svg(`<path d='M14 2 V26 M2 14 H26' stroke='#23306B' stroke-width='2.4' stroke-linecap='round'/><circle cx='14' cy='14' r='3.5' fill='none' stroke='#FF5DA2' stroke-width='2'/>`),
  target: svg(`<circle cx='14' cy='14' r='10' fill='none' stroke='#23306B' stroke-width='2.2'/><circle cx='14' cy='14' r='4' fill='none' stroke='#FF5DA2' stroke-width='2'/><circle cx='14' cy='14' r='1.4' fill='#23306B'/>`),
  heart_aim: svg(`<path d='M14 23 C5 16 6 9 10 8.5 C12 8.2 14 10 14 11.4 C14 10 16 8.2 18 8.5 C22 9 23 16 14 23 Z' fill='#FF5DA2' stroke='#23306B' stroke-width='1.8' stroke-linejoin='round'/>`),
  star_glow: svg(`<path d='M14 3 L17 11 L25 11.6 L19 17 L21 25 L14 20.6 L7 25 L9 17 L3 11.6 L11 11 Z' fill='#E8B14B' stroke='#23306B' stroke-width='1.6' stroke-linejoin='round'/>`),
  spray_nozzle: svg(`<rect x='10' y='9' width='8' height='13' rx='2' fill='#2FA9A0' stroke='#23306B' stroke-width='1.8'/><circle cx='7' cy='7' r='1.4' fill='#23306B'/><circle cx='12' cy='4.5' r='1.2' fill='#23306B'/><circle cx='17' cy='6' r='1' fill='#23306B'/>`),
  calligraphy: svg(`<path d='M6 23 L18 5 L22 8 L10 26 Z' fill='#23306B' stroke='#fff' stroke-width='1.2' stroke-linejoin='round'/>`),
  neon_ring: svg(`<circle cx='14' cy='14' r='9' fill='none' stroke='#FF5DA2' stroke-width='3'/><circle cx='14' cy='14' r='9' fill='none' stroke='#fff' stroke-width='1'/>`),
  ruler: svg(`<rect x='3' y='11' width='22' height='6' rx='1' fill='#F2EDE2' stroke='#23306B' stroke-width='1.8'/><path d='M8 11 V15 M13 11 V16 M18 11 V15' stroke='#23306B' stroke-width='1.4'/>`),
  laser_dot: svg(`<circle cx='14' cy='14' r='3' fill='#D94040'/><circle cx='14' cy='14' r='7' fill='none' stroke='#D94040' stroke-width='1.4' opacity='0.55'/>`),
};

export const cursorFor = id => CURSOR_CSS[id] || CURSOR_CSS.default;
