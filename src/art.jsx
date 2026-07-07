import { useMemo } from "react";
import { ART, SMILE_VARIANTS, useT, themeVars } from "./theme/theme.js";
import { NAME_COLOR_MAP, PACE_PRESETS } from "./constants.jsx";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function FramedAvatar({ src, size = 64, frame = "none", accent = "none", ink = "#23306B", acc = "#FF5DA2", animated = false }) {
  const fs = {
    none: { border: `3px solid ${ink}` },
    double: { border: `3px solid ${ink}`, outline: `3px solid ${ink}`, outlineOffset: 3 },
    dashed: { border: `3px dashed ${ink}` },
    tape: { border: `3px solid ${ink}` },
    glow: { border: `3px solid ${acc}`, boxShadow: `0 0 0 2px ${ink}, 0 0 14px 2px ${acc}` },
    photo: { border: `3px solid ${ink}` },
    stamp: { border: `3px dotted ${ink}`, outline: `2px solid ${ink}`, outlineOffset: 2, borderRadius: 8 },
    polaroid: { border: `4px solid #FDFDF8`, boxShadow: `0 0 0 2px ${ink}, 0 ${size * 0.09}px 0 ${size * 0.06}px #FDFDF8, 0 ${size * 0.11}px 0 ${size * 0.09}px ${ink}` },
    filmstrip: { border: `3px solid ${ink}` },
    torn: { border: `3px solid ${ink}`, clipPath: "polygon(4% 0, 30% 4%, 55% 0, 78% 5%, 100% 2%, 97% 28%, 100% 52%, 95% 76%, 100% 100%, 72% 96%, 48% 100%, 24% 95%, 0 99%, 4% 72%, 0 48%, 5% 24%)", borderRadius: 0 },
  }[frame] || { border: `3px solid ${ink}` };
  return (<div className="relative" style={{ width: size, height: size }}>
    {accent === "ring" && <div className="absolute rounded-full" style={{ inset: -5, border: `3px solid ${acc}` }} />}
    {accent === "halo" && <div className="absolute rounded-full" style={{ inset: -7, border: `3px dashed ${acc}`, animation: reduceMotion ? "none" : "lokspin 9s linear infinite" }} />}
    {accent === "crown" && <div className="absolute" style={{ top: -size * 0.34, left: "50%", transform: "translateX(-50%)", lineHeight: 1 }}><svg width={size * 0.6} height={size * 0.34} viewBox="0 0 60 34"><path d="M4 32 L8 8 L20 22 L30 4 L40 22 L52 8 L56 32 Z" fill={acc} stroke={ink} strokeWidth="3" strokeLinejoin="round" /></svg></div>}
    {accent === "horns" && <div className="absolute" style={{ top: -size * 0.26, left: 0, right: 0, lineHeight: 0 }}><svg width={size} height={size * 0.3} viewBox="0 0 64 20"><path d="M12 20 C6 14 5 6 10 2 C13 8 15 12 20 16 Z" fill={acc} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" /><path d="M52 20 C58 14 59 6 54 2 C51 8 49 12 44 16 Z" fill={acc} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" /></svg></div>}
    {accent === "antenna" && <div className="absolute" style={{ top: -size * 0.36, left: "50%", transform: "translateX(-50%)", lineHeight: 0, animation: reduceMotion ? "none" : "lokbob 2.6s ease-in-out infinite" }}><svg width={size * 0.3} height={size * 0.4} viewBox="0 0 20 26"><path d="M10 26 Q8 14 10 8" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" /><circle cx="10" cy="5.5" r="4.5" fill={acc} stroke={ink} strokeWidth="2.5" /></svg></div>}
    <img src={src} alt="avatar" className="relative w-full h-full rounded-full" style={{ objectFit: "cover", ...fs, ...(animated && !reduceMotion ? { animation: "lokshimmer 2.6s ease-in-out infinite" } : {}) }} />
    {frame === "tape" && [["-6px", "-6px", "-18deg"], ["auto", "-6px", "16deg"]].map(([l, t, rot], i) => (
      <div key={i} className="absolute" style={{ left: l === "auto" ? "auto" : l, right: l === "auto" ? "-6px" : "auto", top: t, width: size * 0.34, height: 12, background: acc, opacity: 0.7, transform: `rotate(${rot})`, border: `1px solid ${ink}` }} />))}
    {frame === "photo" && [[-2, -2, "0 100%, 100% 0, 0 0"], ["auto", -2, "0 0, 100% 100%, 100% 0"], [-2, "auto", "0 0, 100% 100%, 0 100%"], ["auto", "auto", "100% 0, 0 100%, 100% 100%"]].map(([l, t, poly], i) => (
      <div key={i} className="absolute" style={{ left: l === "auto" ? "auto" : l, right: l === "auto" ? -2 : "auto", top: t === "auto" ? "auto" : t, bottom: t === "auto" ? -2 : "auto", width: size * 0.28, height: size * 0.28, background: ink, clipPath: `polygon(${poly})` }} />))}
    {frame === "filmstrip" && [["-8px"], ["auto"]].map(([t], i) => (
      <div key={i} className="absolute flex justify-around items-center" style={{ left: -2, right: -2, top: t === "auto" ? "auto" : t, bottom: t === "auto" ? "-8px" : "auto", height: 8, background: ink, borderRadius: 2 }}>{Array.from({ length: 4 }).map((_, k) => <span key={k} style={{ width: 4, height: 4, background: "#FDFDF8", borderRadius: 1, display: "block" }} />)}</div>))}
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
    case "ghost": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 3 C9 3 6 9 6 14 L6 27 L10 23 L13 27 L16 23 L19 27 L22 23 L26 27 L26 14 C26 9 23 3 16 3 Z" fill="#F2EDE2" stroke={ART.ink} strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="2.2" fill={ART.ink} /><circle cx="20" cy="13" r="2.2" fill={ART.ink} /><ellipse cx="16" cy="18" rx="2" ry="2.6" fill={ART.ink} opacity=".6" /></svg>);
    case "spiderweb": return (<svg width={size} height={size} viewBox="0 0 32 32"><g fill="none" stroke={ART.ink} strokeWidth="1.4"><path d="M16 2 L16 30 M2 16 L30 16 M6 6 L26 26 M26 6 L6 26" /><path d="M16 8 Q21 11 24 16 Q21 21 16 24 Q11 21 8 16 Q11 11 16 8" /><path d="M16 13 Q18.5 14.5 19 16 Q18.5 17.5 16 19 Q13.5 17.5 13 16 Q13.5 14.5 16 13" /></g><circle cx="22" cy="22" r="2.4" fill="#7A4FBF" stroke={ART.ink} strokeWidth="1.2" /></svg>);
    case "eyeball": return (<svg width={size} height={size} viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#F2EDE2" stroke={ART.ink} strokeWidth="1.8" /><circle cx="16" cy="16" r="6.5" fill={ART.teal} stroke={ART.ink} strokeWidth="1.4" /><circle cx="16" cy="16" r="3" fill={ART.ink} /><circle cx="14" cy="14" r="1.4" fill="#fff" /><path d="M7 9 Q10 6 13 5 M25 9 Q22 6 19 5" stroke="#D94040" strokeWidth="1.3" fill="none" /></svg>);
    case "cupcake": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M8 16 L10 28 L22 28 L24 16 Z" fill="#E8B14B" stroke={ART.ink} strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 16 L13 28 M20 16 L19 28" stroke={ART.ink} strokeWidth="1.2" /><path d="M7 16 C5 10 9 5 13 7 C14 3 20 3 21 7 C25 5 28 10 25 16 Z" fill={ART.pink} stroke={ART.ink} strokeWidth="1.8" strokeLinejoin="round" /><circle cx="16" cy="6" r="2.4" fill="#D94040" stroke={ART.ink} strokeWidth="1.4" /></svg>);
    case "icecream": return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M10 14 L16 30 L22 14 Z" fill="#E8B14B" stroke={ART.ink} strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 17 L20 15 M13 21 L19 19.5 M14.5 25 L18 24" stroke={ART.ink} strokeWidth="1" /><circle cx="16" cy="10" r="7" fill={ART.pink} stroke={ART.ink} strokeWidth="1.8" /><circle cx="13" cy="8" r="1.2" fill="#fff" opacity=".8" /></svg>);
    case "candy": return (<svg width={size} height={size} viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill={ART.pink} stroke={ART.ink} strokeWidth="1.8" /><path d="M12 10 Q16 16 12 22 M16 8.5 Q20 16 16 23.5 M20 10 Q24 16 20 22" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".85" /><path d="M8 12 L3 8 L5 14 L3 16 L8 20 Z" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6" strokeLinejoin="round" /><path d="M24 12 L29 8 L27 14 L29 16 L24 20 Z" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6" strokeLinejoin="round" /></svg>);
    case "humhah": return (<svg width={size} height={size} viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#E8B14B" strokeWidth="2"/><path d="M10 11 Q12 9,14 11 M18 11 Q20 9,22 11" stroke="#E8B14B" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M11 20 Q16 25,21 20" stroke="#E8B14B" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>);
    case "bomhogwah": return (<svg width={size} height={size} viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#7A4FBF" strokeWidth="2"/><circle cx="11" cy="13" r="2" fill="#7A4FBF"/><circle cx="21" cy="13" r="2" fill="#7A4FBF"/><path d="M11 21 Q16 25,21 21" stroke="#7A4FBF" strokeWidth="2.2" strokeLinecap="round" fill="none"/></svg>);
    default: return (<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 5 L19 12 L27 11 L21 17 L26 24 L17 21 L13 28 L12 20 L4 19 L11 14 Z" fill={ART.pink} stroke={ART.ink} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="16" cy="16" r="3" fill={ART.ink} /></svg>);
  }
}

export function SkyEffect({ sky, paper }) {
  if (sky === "clear"||!sky) return null;
  if (sky === "clouds") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{zIndex:1}}>{Array.from({length:12}).map((_,i)=>(<div key={i} className="absolute" style={{left:`${(i*31)%90+5}%`,top:`${20+i*6}%`,width:60+(i%3)*30,height:20+(i%2)*10,borderRadius:"50%",background:"rgba(200,200,200,.12)",animation:reduceMotion?"none":`lokdrift ${18+i*3}s linear infinite`,animationDelay:`-${i*4}s`}}/>))}</div>);
  if (sky === "stars") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{zIndex:1}}>{Array.from({length:50}).map((_,i)=>(<div key={i} className="absolute rounded-full" style={{left:`${(i*19)%100}%`,top:`${(i*7)%100}%`,width:2+(i%3),height:2+(i%3),background:"rgba(255,255,255,.6)",animation:reduceMotion?"none":`loktwinkle ${1.5+(i%5)*0.8}s ease-in-out infinite alternate`,animationDelay:`-${i*0.3}s`}}/>))}</div>);
  if (sky === "sunset") return (<div className="pointer-events-none fixed inset-0" style={{zIndex:1,background:`linear-gradient(180deg, #FF6B35 0%, #FF8C42 20%, #FFD700 40%, ${paper} 65%)`,opacity:0.2}}/>);
  if (sky === "aurora_sky") return (<div className="pointer-events-none fixed inset-0" style={{zIndex:1,background:`linear-gradient(180deg, rgba(0,255,170,.08), rgba(127,90,240,.05) 50%, transparent)`,animation:reduceMotion?"none":"lokaurora 12s ease-in-out infinite alternate"}}/>);
  return null;
}

export function PageEffect({ effect }) {
  if (effect === "rain") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}>{Array.from({ length: 30 }).map((_, i) => (<div key={i} className="absolute" style={{ left: `${(i * 37) % 100}%`, top: -20, width: 2, height: 60, background: "rgba(47,169,160,.4)", animation: reduceMotion ? "none" : `lokrain ${0.7 + (i % 5) * 0.12}s linear infinite`, animationDelay: `${(i % 7) * 0.1}s` }} />))}</div>);
  if (effect === "confetti") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}>{Array.from({ length: 40 }).map((_, i) => { const cs = ["#FF5DA2", "#2FA9A0", "#E8B14B", "#7A4FBF", "#5E8BFF"]; return (<div key={i} className="absolute" style={{ left: `${(i * 27) % 100}%`, top: -12, width: 7, height: 11, background: cs[i % 5], animation: reduceMotion ? "none" : `lokconf ${3.5 + (i % 5) * 0.6}s linear infinite`, animationDelay: `${(i % 8) * 0.35}s`, borderRadius: 2 }} />); })}</div>);
  if (effect === "aurora") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}><div className="absolute inset-x-0 top-0" style={{ height: "55%", background: "linear-gradient(180deg, rgba(47,169,160,.28), rgba(122,79,191,.18) 50%, transparent)", filter: "blur(28px)", animation: reduceMotion ? "none" : "lokaurora 9s ease-in-out infinite alternate", mixBlendMode: "screen" }} /></div>);
  if (effect === "embers") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}>{Array.from({ length: 24 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${(i * 41) % 100}%`, bottom: -10, width: 5, height: 5, background: i % 2 ? "#FF8A5C" : "#FF5DA2", animation: reduceMotion ? "none" : `lokember ${3 + (i % 4)}s ease-in infinite`, animationDelay: `${(i % 6) * 0.4}s` }} />))}</div>);
  if (effect === "scanlines") return (<div className="pointer-events-none fixed inset-0" style={{ zIndex: 60, background: "repeating-linear-gradient(0deg, rgba(35,48,107,.07) 0 2px, transparent 2px 4px)", animation: reduceMotion ? "none" : "lokscan 9s linear infinite" }} />);
  if (effect === "static") return (<div className="pointer-events-none fixed inset-0" style={{ zIndex: 60, opacity: 0.06, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E")`, animation: reduceMotion ? "none" : "lokstatic .45s steps(3) infinite" }} />);
  return null;
}

export function AnimFX({ fx }) {
  if (!fx || fx === "none") return null;
  if (fx === "sparkle_trail") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 61 }}>{Array.from({ length: 25 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${(i * 13 + 7) % 100}%`, top: `${(i * 23 + 11) % 100}%`, width: 4 + i % 3, height: 4 + i % 3, background: ["#FF5DA2", "#FFD700", "#E8B14B", "#fff"][i % 4], animation: reduceMotion ? "none" : `loktwinkle ${1.2 + (i % 5) * 0.4}s ease-in-out infinite alternate`, animationDelay: `${(i % 8) * 0.15}s`, opacity: 0.7 }} />))}</div>);
  if (fx === "neon_pulse") return (<div className="pointer-events-none fixed inset-0" style={{ zIndex: 61, background: "rgba(0,255,255,.035)", animation: reduceMotion ? "none" : "lokpulse 2.2s ease-in-out infinite", pointerEvents: "none" }} />);
  if (fx === "ink_splatter") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 61 }}>{Array.from({ length: 12 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${(i * 29 + 5) % 100}%`, top: `${(i * 17 + 3) % 100}%`, width: 3 + i * 2, height: 3 + i * 2, background: "rgba(35,48,107,.12)", animation: reduceMotion ? "none" : `loksplat ${4 + (i % 3)}s ease-out infinite`, animationDelay: `${i * 0.3}s`, borderRadius: "40% 60% 50% 50%" }} />))}</div>);
  if (fx === "smoke_rise") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 61 }}>{Array.from({ length: 18 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${(i * 37 + 13) % 100}%`, bottom: -8, width: 8 + (i % 4) * 4, height: 8 + (i % 4) * 4, background: "rgba(200,200,200,.15)", animation: reduceMotion ? "none" : `lokember ${5 + (i % 4)}s ease-in infinite`, animationDelay: `${(i % 6) * 0.5}s` }} />))}</div>);
  if (fx === "fire_embers") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 61 }}>{Array.from({ length: 20 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${(i * 41 + 3) % 100}%`, bottom: -4, width: 3 + i % 3, height: 3 + i % 3, background: i % 3 === 0 ? "#FF8A5C" : i % 3 === 1 ? "#FFD700" : "#FF5DA2", animation: reduceMotion ? "none" : `lokember ${2.5 + (i % 4)}s ease-in infinite`, animationDelay: `${(i % 7) * 0.3}s`, boxShadow: "0 0 4px rgba(255,138,92,.4)" }} />))}</div>);
  if (fx === "water_ripple") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 61 }}>{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${20 + (i * 10) % 60}%`, top: `${15 + (i * 13) % 70}%`, width: 20 + i * 6, height: 20 + i * 6, border: "2px solid rgba(47,169,160,.15)", animation: reduceMotion ? "none" : `lokripple ${3 + (i % 3)}s ease-out infinite`, animationDelay: `${i * 0.4}s` }} />))}</div>);
  if (fx === "galaxy_swirl") return (<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 61 }}><div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(122,79,191,.08) 0%, rgba(47,169,160,.04) 40%, transparent 70%)", animation: reduceMotion ? "none" : "lokspin 20s linear infinite" }} />{Array.from({ length: 30 }).map((_, i) => (<div key={i} className="absolute rounded-full" style={{ left: `${(i * 23 + 7) % 100}%`, top: `${(i * 19 + 11) % 100}%`, width: 1 + i % 2, height: 1 + i % 2, background: "#fff", opacity: 0.3 + (i % 5) * 0.1, animation: reduceMotion ? "none" : `loktwinkle ${2 + (i % 3)}s ease-in-out infinite alternate` }} />))}</div>);
  return null;
}

export function SmileDecoration({ variant = "smile1", size = 32, color = "#F39C12", stroke = "#4A3728" }) {
  const v = SMILE_VARIANTS.find(s => s.id === variant) || SMILE_VARIANTS[0];
  return (<svg width={size} height={size} viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill={color} stroke={stroke} strokeWidth="2" opacity=".9"/><path d={v.path} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round"/></svg>);
}

export function GlobalStyle({ T, pace = "sweep", speed = 1 }) {
  const P = PACE_PRESETS[pace] || PACE_PRESETS.sweep;
  const m = ((P.mult || 1) / Math.max(0.25, speed)).toFixed(3);
  const vars = Object.entries(themeVars(T)).map(([k, v]) => `${k}:${v}`).join(";");
  return (<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Schibsted+Grotesk:wght@400;500;700&display=swap');
  :root{${vars}}
  ::selection{background:${T.accent};color:${T.onAccent}}
  @keyframes lokdrift{from{transform:translateX(0)}to{transform:translateX(200vw)}}
  @keyframes loktwinkle{0%{opacity:0.2}100%{opacity:1}}
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
  @keyframes fireanim{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  @keyframes lokripple{from{transform:scale(0);opacity:1}to{transform:scale(3);opacity:0}}
  @keyframes loksplat{0%{transform:scale(0) rotate(0);opacity:.6}50%{opacity:.4}100%{transform:scale(1.8) rotate(30deg);opacity:0}}
  @keyframes iceanim{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  @keyframes inkfade{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
  @keyframes inkpulse{0%,100%{opacity:.4}50%{opacity:1}}
  @keyframes lokscan{from{background-position:0 0}to{background-position:0 40px}}
  @keyframes lokstatic{0%{transform:translate(0,0)}33%{transform:translate(-8px,5px)}66%{transform:translate(6px,-7px)}100%{transform:translate(0,0)}}
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
  .lok-compact .px-4{padding-left:12px!important;padding-right:12px!important}.lok-compact .gap-3{gap:8px!important}.lok-compact .p-3{padding:8px!important}.lok-compact .py-2{padding-top:6px!important;padding-bottom:6px!important}.lok-compact .px-2\\.5{padding-left:8px!important;padding-right:8px!important}.lok-compact .text-sm{font-size:12px!important}.lok-compact .text-xs{font-size:10px!important}.lok-compact .gap-2{gap:6px!important}.lok-compact .mt-3{margin-top:8px!important}.lok-compact .mt-2{margin-top:6px!important}.lok-compact .mb-2{margin-bottom:6px!important}
  @supports(-webkit-touch-callout:none){input,textarea,select{font-size:16px!important}}
  @media(prefers-reduced-motion:reduce){*,.lok-btn{animation-duration:.001ms!important;transition-duration:.05ms!important}html{scroll-behavior:auto}}
`}</style>);
}
