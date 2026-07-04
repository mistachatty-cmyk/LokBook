import { useMemo } from "react";
import { ART, useT } from "./theme/theme.js";
import { NAME_COLOR_MAP, PACE_PRESETS } from "./constants.jsx";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function FramedAvatar({ src, size = 64, frame = "none", accent = "none", ink = "#23306B", acc = "#FF5DA2", animated = false }) {
  const fs = { none: { border: `3px solid ${ink}` }, double: { border: `3px solid ${ink}`, outline: `3px solid ${ink}`, outlineOffset: 3 }, dashed: { border: `3px dashed ${ink}` }, tape: { border: `3px solid ${ink}` }, glow: { border: `3px solid ${acc}`, boxShadow: `0 0 0 2px ${ink}, 0 0 14px 2px ${acc}` } }[frame] || { border: `3px solid ${ink}` };
  return (<div className="relative" style={{ width: size, height: size }}>
    {accent === "ring" && <div className="absolute rounded-full" style={{ inset: -5, border: `3px solid ${acc}` }} />}
    {accent === "halo" && <div className="absolute rounded-full" style={{ inset: -7, border: `3px dashed ${acc}`, animation: reduceMotion ? "none" : "lokspin 9s linear infinite" }} />}
    {accent === "crown" && <div className="absolute" style={{ top: -size * 0.34, left: "50%", transform: "translateX(-50%)", fontSize: size * 0.42, lineHeight: 1 }}><svg width={size * 0.6} height={size * 0.34} viewBox="0 0 60 34"><path d="M4 32 L8 8 L20 22 L30 4 L40 22 L52 8 L56 32 Z" fill={acc} stroke={ink} strokeWidth="3" strokeLinejoin="round" /></svg></div>}
    <img src={src} alt="avatar" className="relative w-full h-full rounded-full" style={{ objectFit: "cover", ...fs, ...(animated && !reduceMotion ? { animation: "lokshimmer 2.6s ease-in-out infinite" } : {}) }} />
    {frame === "tape" && [["-6px", "-6px", "-18deg"], ["auto", "-6px", "16deg"]].map(([l, t, rot], i) => (
      <div key={i} className="absolute" style={{ left: l === "auto" ? "auto" : l, right: l === "auto" ? "-6px" : "auto", top: t, width: size * 0.34, height: 12, background: acc, opacity: 0.7, transform: `rotate(${rot})`, border: `1px solid ${ink}` }} />))}
  </div>);
}

const P = (d, fill = ART.pink, dash) => (size) => (<svg width={size} height={size} viewBox="0 0 32 32"><path d={d} fill={fill === "none" ? "none" : fill} stroke={ART.ink} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash} /></svg>);

export function ReactionIcon({ type, size = 24 }) {
  switch (type) {
    case "splat": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 5 L19 12 L27 11 L21 17 L26 24 L17 21 L13 28 L12 20 L4 19 L11 14 Z" fill={ART.pink} stroke={ART.ink} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="16" cy="16" r="3" fill={ART.ink} /></svg>);
    case "heart": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 27 C4 18 5 8 11 7 C14 6.6 16 9 16 11 C16 9 18 6.6 21 7 C27 8 28 18 16 27 Z" fill="none" stroke={ART.pink} strokeWidth="2.6" strokeDasharray="3 2" strokeLinejoin="round" /></svg>);
    case "drip": return (<svg width={size} height={size} viewBox="0 0 32 32"><rect x="6" y="5" width="20" height="9" rx="2" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6" /><path d="M11 14 C11 20 9.5 21 9.5 24 a2.6 2.6 0 0 0 5.2 0 C14.7 21 13 20 13 14 Z" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6" /><path d="M21 14 C21 17.4 20 18 20 20 a1.9 1.9 0 0 0 3.8 0 C23.8 18 23 17.4 23 14 Z" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6" /></svg>);
    case "star": return P("M16 3 L20 12 L30 13 L22 20 L25 30 L16 24 L7 30 L10 20 L2 13 L12 3 Z", "#E8B14B")(size);
    case "sparkle": return P("M16 3 Q18 14 29 16 Q18 18 16 29 Q14 18 3 16 Q14 14 16 3 Z", "#E8B14B")(size);
    case "comet": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M4 28 L20 12" stroke={ART.teal} strokeWidth="3" strokeLinecap="round" /><circle cx="23" cy="9" r="6" fill="#E8B14B" stroke={ART.ink} strokeWidth="2" /></svg>);
    case "flame": return P("M16 3 C20 10 26 12 22 22 C26 18 24 28 16 30 C8 28 6 18 10 22 C8 14 14 12 13 6 C15 9 14 11 16 13 C17 10 16 6 16 3 Z", "#FF8A5C")(size);
    case "bolt2": return P("M18 2 L6 18 L14 18 L12 30 L26 12 L17 12 Z", "#E8B14B")(size);
    case "skull2": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 3 C8 3 5 9 5 14 C5 18 8 19 8 22 L24 22 C24 19 27 18 27 14 C27 9 24 3 16 3 Z" fill={ART.pink} stroke={ART.ink} strokeWidth="1.8" /><circle cx="12" cy="14" r="2.5" fill={ART.ink} /><circle cx="20" cy="14" r="2.5" fill={ART.ink} /><path d="M11 25 L11 29 M16 25 L16 29 M21 25 L21 29" stroke={ART.ink} strokeWidth="2" /></svg>);
    case "leaf": return P("M6 26 C6 12 18 6 26 6 C26 20 14 26 6 26 Z M10 22 C16 16 20 12 24 10", "#3E8E4B")(size);
    case "wave2": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M3 12 Q8 6 13 12 T23 12 T29 12 M3 20 Q8 14 13 20 T23 20 T29 20" fill="none" stroke={ART.teal} strokeWidth="2.4" strokeLinecap="round" /></svg>);
    case "lotus": return P("M16 28 C9 24 6 18 8 12 C12 16 14 18 16 24 C18 18 20 16 24 12 C26 18 23 24 16 28 Z", "#7A4FBF")(size);
    default: return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 5 L19 12 L27 11 L21 17 L26 24 L17 21 L13 28 L12 20 L4 19 L11 14 Z" fill={ART.pink} stroke={ART.ink} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="16" cy="16" r="3" fill={ART.ink} /></svg>);
  }
}

export function PageEffect({ effect }) {
  if (effect === "rain") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}>{Array.from({ length: 30 }).map((_, i) => (<div key={i} className="absolute" style={{ left: `${(i * 37) % 100}%`, top: -20, width: 2, height: 60, background: "rgba(47,169,160,.4)", animation: reduceMotion ? "none" : `lokrain ${0.7 + (i % 5) * 0.12}s linear infinite`, animationDelay: `${(i % 7) * 0.1}s` }} />))}</div>);
  if (effect === "confetti") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}>{Array.from({ length: 40 }).map((_, i) => { const cs = ["#FF5DA2", "#2FA9A0", "#E8B14B", "#7A4FBF", "#5E8BFF"]; return (<div key={i} className="absolute" style={{ left: `${(i * 27) % 100}%`, top: -12, width: 7, height: 11, background: cs[i % 5], animation: reduceMotion ? "none" : `lokconf ${3.5 + (i % 5) * 0.6}s linear infinite`, animationDelay: `${(i % 8) * 0.35}s`, borderRadius: 2 }} />); })}</div>);
  if (effect === "aurora") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}><div className="absolute inset-x-0 top-0" style={{ height: "55%", background: "linear-gradient(180deg, rgba(47,169,160,.28), rgba(122,79,191,.18) 50%, transparent)", filter: "blur(28px)", animation: reduceMotion ? "none" : "lokaurora 9s ease-in-out infinite alternate", mixBlendMode: "screen" }} /></div>);
  if (effect === "embers") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}>{Array.from({ length: 24 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${(i * 41) % 100}%`, bottom: -10, width: 5, height: 5, background: i % 2 ? "#FF8A5C" : "#FF5DA2", animation: reduceMotion ? "none" : `lokember ${3 + (i % 4)}s ease-in infinite`, animationDelay: `${(i % 6) * 0.4}s` }} />))}</div>);
  return null;
}

export function GlobalStyle({ T, pace = "sweep", speed = 1 }) {
  const P = PACE_PRESETS[pace] || PACE_PRESETS.sweep;
  const m = ((P.mult || 1) / Math.max(0.25, speed)).toFixed(3);
  return (<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Schibsted+Grotesk:wght@400;500;700&display=swap');
  @keyframes lokdrift{from{transform:translateX(0)}to{transform:translateX(200vw)}}
  @keyframes lokrain{from{transform:translateY(-20px)}to{transform:translateY(100vh)}}
  @keyframes lokember{from{transform:translateY(0) scale(1);opacity:.9}to{transform:translateY(-100vh) scale(.4);opacity:0}}
  @keyframes lokconf{0%{transform:translateY(-12px) rotate(0)}100%{transform:translateY(100vh) rotate(540deg)}}
  @keyframes lokaurora{0%{transform:translateX(-6%) skewX(-4deg);opacity:.7}100%{transform:translateX(6%) skewX(4deg);opacity:1}}
  @keyframes lokspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes lokquake{0%,88%,100%{transform:translate(0,0)}89%{transform:translate(-5px,3px) rotate(-.4deg)}91%{transform:translate(6px,-4px) rotate(.4deg)}93%{transform:translate(-6px,-3px)}95%{transform:translate(5px,4px) rotate(-.3deg)}97%{transform:translate(-3px,2px)}}
  @keyframes lokshake{0%,100%{transform:translate(0,0)}10%{transform:translate(-14px,8px) rotate(-1.6deg)}25%{transform:translate(15px,-10px) rotate(1.6deg)}40%{transform:translate(-12px,-8px) rotate(-1deg)}55%{transform:translate(13px,9px) rotate(1deg)}70%{transform:translate(-9px,5px)}85%{transform:translate(7px,-5px)}}
  @keyframes lokfxin{0%{opacity:0;transform:scale(.3) rotate(-8deg)}55%{opacity:1;transform:scale(1.12) rotate(3deg)}100%{opacity:.96;transform:scale(1) rotate(0)}}
  @keyframes lokfloat{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-110px) scale(1.5) rotate(-12deg)}}
  @keyframes lokpop{0%{transform:scale(.4) rotate(-14deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1)}}
  @keyframes lokpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
  @keyframes lokbob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
  @keyframes lokrise{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes loktab{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes loknudge{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
  @keyframes lokcount{from{opacity:0;transform:translateY(-6px) scale(1.3)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes lokwobble{0%,92%,100%{transform:translate(0,0)}93%{transform:translate(-2px,1px) rotate(-.15deg)}95%{transform:translate(1.5px,-1px) rotate(.15deg)}97%{transform:translate(-1px,.5px)}}
  @keyframes loksheen{from{background-position:200% 0}to{background-position:-50% 0}}
  @keyframes inkdrop{0%{transform:scaleY(0.2) scaleX(0.8);opacity:0}40%{transform:scaleY(1.1) scaleX(0.95);opacity:1}60%{transform:scaleY(0.9) scaleX(1.05)}100%{transform:scale(1);opacity:1}}
  @keyframes inkfade{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
  @keyframes inkpulse{0%,100%{opacity:.4}50%{opacity:1}}
  *{-webkit-tap-highlight-color:transparent}
  html{scroll-behavior:smooth}
  body{text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
  .lok-display{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em}
  .lok-btn{transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s ease,filter .14s ease;will-change:transform}
  .lok-btn:hover{filter:brightness(1.04)}
  .lok-btn:active{transform:scale(.92)}
  .lok-tabin{animation:loktab .32s cubic-bezier(.22,1,.36,1)}
  .lok-count{display:inline-block;animation:lokcount .25s ease}
  button:focus-visible,[tabindex]:focus-visible{outline:3px solid ${T.accent};outline-offset:2px;border-radius:6px}
  ::-webkit-scrollbar{width:0;height:0}
  @keyframes lokshimmer{0%,100%{box-shadow:0 0 0 2px ${T.ink}, 0 0 10px 1px ${T.accent}}50%{box-shadow:0 0 0 2px ${T.ink}, 0 0 18px 4px ${T.alt}}}
  .lok-tabin{animation-duration:calc(.32s * ${m})}
  .lok-btn{transition-duration:calc(.14s * ${m})}
  ${P.kill ? `.lok-tabin,.lok-count{animation:none!important}.lok-btn{transition:none!important}` : ``}
  @supports(-webkit-touch-callout:none){input,textarea,select{font-size:16px!important}}
  @media(prefers-reduced-motion:reduce){*,.lok-btn{animation-duration:.001ms!important;transition-duration:.05ms!important}html{scroll-behavior:auto}}
`}</style>);
}
