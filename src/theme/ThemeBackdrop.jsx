import { THEMES } from "./theme.js";
import { PACE_PRESETS } from "../constants.jsx";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Living backdrops for themes flagged `animated:true` (ocean, glitch, aurora,
// vapor). Pure CSS — sits at zIndex 0, under SkyEffect(1) and all content.
export default function ThemeBackdrop({ themeId, pace = "sweep" }) {
  const th = THEMES[themeId];
  if (!th?.animated || reduceMotion || PACE_PRESETS[pace]?.kill) return null;
  const wrap = { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" };

  if (themeId === "ocean") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokocean1{0%,100%{transform:translate(-8%,-4%) scale(1)}50%{transform:translate(6%,5%) scale(1.15)}}@keyframes lokocean2{0%,100%{transform:translate(5%,6%) scale(1.1)}50%{transform:translate(-6%,-5%) scale(0.95)}}@keyframes lokoceanshine{0%,100%{opacity:.16}50%{opacity:.3}}`}</style>
    <div style={{ position: "absolute", left: "-10%", top: "8%", width: "70vmax", height: "70vmax", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,191,255,.22), transparent 65%)", filter: "blur(30px)", animation: "lokocean1 34s ease-in-out infinite" }} />
    <div style={{ position: "absolute", right: "-14%", bottom: "-6%", width: "60vmax", height: "60vmax", borderRadius: "50%", background: "radial-gradient(circle, rgba(127,219,255,.16), transparent 60%)", filter: "blur(36px)", animation: "lokocean2 41s ease-in-out infinite" }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(0,191,255,.1))", animation: "lokoceanshine 12s ease-in-out infinite" }} />
    {Array.from({ length: 10 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, bottom: -12, width: 5 + (i % 3) * 2, height: 5 + (i % 3) * 2, borderRadius: "50%", border: "1.5px solid rgba(127,219,255,.4)", animation: `lokember ${9 + (i % 5) * 3}s linear infinite`, animationDelay: `-${i * 2.3}s` }} />))}
  </div>);

  if (themeId === "glitch") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokglitchbar{0%,86%,100%{opacity:0}88%{opacity:1;transform:translateX(-8px)}92%{opacity:.7;transform:translateX(10px)}95%{opacity:0}}@keyframes lokglitchhue{0%,100%{opacity:.03}50%{opacity:.06}}`}</style>
    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,255,0,.03) 0 2px, transparent 2px 5px)", animation: "lokglitchhue 4s steps(2) infinite" }} />
    {[14, 38, 61, 82].map((top, i) => (<div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${top}%`, height: 3 + (i % 2) * 5, background: i % 2 ? "rgba(255,0,255,.14)" : "rgba(0,255,0,.12)", animation: `lokglitchbar ${5 + i * 1.7}s steps(1) infinite`, animationDelay: `-${i * 2.1}s` }} />))}
  </div>);

  if (themeId === "aurora") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokauroraband{0%,100%{transform:translateX(-12%) skewX(-8deg)}50%{transform:translateX(10%) skewX(6deg)}}@keyframes lokauroraband2{0%,100%{transform:translateX(8%) skewX(5deg);opacity:.5}50%{transform:translateX(-10%) skewX(-7deg);opacity:.9}}`}</style>
    <div style={{ position: "absolute", left: "-20%", right: "-20%", top: 0, height: "55%", background: "linear-gradient(100deg, transparent, rgba(0,255,170,.2) 30%, rgba(127,90,240,.16) 60%, transparent)", filter: "blur(38px)", mixBlendMode: "screen", animation: "lokauroraband 26s ease-in-out infinite" }} />
    <div style={{ position: "absolute", left: "-20%", right: "-20%", top: "10%", height: "40%", background: "linear-gradient(80deg, transparent, rgba(127,90,240,.18) 40%, rgba(0,255,170,.1) 70%, transparent)", filter: "blur(44px)", mixBlendMode: "screen", animation: "lokauroraband2 33s ease-in-out infinite" }} />
    {Array.from({ length: 26 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 23) % 100}%`, top: `${(i * 13) % 90}%`, width: 2, height: 2, borderRadius: "50%", background: "rgba(224,251,252,.7)", animation: `loktwinkle ${1.6 + (i % 4) * 0.7}s ease-in-out infinite alternate`, animationDelay: `-${i * 0.4}s` }} />))}
  </div>);

  if (themeId === "vapor") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokvaporgrid{from{background-position:0 0}to{background-position:0 44px}}@keyframes lokvaporsun{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.05)}}`}</style>
    <div style={{ position: "absolute", left: "50%", top: "16%", width: "34vmin", height: "34vmin", transform: "translateX(-50%)", borderRadius: "50%", background: "linear-gradient(180deg, #FF2E97, #FF8C42 55%, transparent 56%)", opacity: 0.35, filter: "blur(2px)", animation: "lokvaporsun 9s ease-in-out infinite" }} />
    <div style={{ position: "absolute", left: "-30%", right: "-30%", bottom: 0, height: "42%", transform: "perspective(340px) rotateX(58deg)", transformOrigin: "bottom", backgroundImage: "repeating-linear-gradient(0deg, rgba(0,212,255,.28) 0 2px, transparent 2px 44px), repeating-linear-gradient(90deg, rgba(255,46,151,.24) 0 2px, transparent 2px 52px)", animation: "lokvaporgrid 3.6s linear infinite" }} />
  </div>);

  return null;
}
