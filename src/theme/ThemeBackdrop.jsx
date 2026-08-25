import { useRef, useEffect } from "react";
import { THEMES } from "./theme.js";
import { PACE_PRESETS } from "../constants.jsx";
import { GYRO_ZERO } from "../hooks/useGyroscope.js";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The page drawing itself. Strokes are generated with the same kind of
 * parametric curve maths the resident artists use in engine/botArt.js, drawn
 * progressively a few points per frame, then slowly washed out — so the
 * backdrop is genuinely *being drawn*, not a looping video or a CSS gradient.
 *
 * Kept deliberately cheap: capped DPR, ~30fps, one stroke in flight at a
 * time, and the whole thing is skipped entirely under reduced-motion or the
 * "kill" pace preset (both handled by the parent).
 */
function LiveDrawBackdrop({ ink, accent, alt, paper }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = 1; // deliberately 1 — this is decoration, not artwork
    let raf, run = true, last = 0;
    const fit = () => { cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr; };
    fit();
    window.addEventListener("resize", fit);

    const palette = [ink, accent, alt];
    const rnd = (a, b) => a + Math.random() * (b - a);

    // Build one stroke as a list of points along a randomly-chosen curve form.
    const makeStroke = () => {
      const w = cv.width, h = cv.height;
      const cx = rnd(w * 0.12, w * 0.88), cy = rnd(h * 0.12, h * 0.88);
      const scale = rnd(Math.min(w, h) * 0.06, Math.min(w, h) * 0.22);
      const form = Math.floor(rnd(0, 4));
      const rot = rnd(0, Math.PI * 2);
      const n = Math.floor(rnd(90, 190));
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        let x, y;
        if (form === 0) {            // spiral
          const a = t * Math.PI * rnd(4, 8), r = scale * t;
          x = Math.cos(a + rot) * r; y = Math.sin(a + rot) * r;
        } else if (form === 1) {     // wave / ribbon
          x = (t - 0.5) * scale * 3;
          y = Math.sin(t * Math.PI * rnd(2, 5) + rot) * scale * 0.5;
        } else if (form === 2) {     // petal / rose
          const a = t * Math.PI * 2, k = Math.floor(rnd(3, 7));
          const r = scale * Math.cos(k * a);
          x = Math.cos(a + rot) * r; y = Math.sin(a + rot) * r;
        } else {                     // loose scribble arc
          const a = rot + t * Math.PI * rnd(1, 2.5);
          const r = scale * (0.6 + Math.sin(t * Math.PI * 6) * 0.25);
          x = Math.cos(a) * r; y = Math.sin(a) * r * 0.7;
        }
        pts.push([cx + x, cy + y]);
      }
      return { pts, color: palette[Math.floor(rnd(0, palette.length))], width: rnd(1.2, 3.2) };
    };

    let stroke = makeStroke(), head = 0, idle = 0;

    const frame = now => {
      if (!run) return;
      if (now - last < 33) { raf = requestAnimationFrame(frame); return; }
      last = now;

      // Continuous slow wash so old strokes fade instead of accumulating.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.012)";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = "source-over";

      if (idle > 0) { idle--; }
      else {
        const step = 3;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = head; i < Math.min(head + step + 1, stroke.pts.length); i++) {
          const [x, y] = stroke.pts[i];
          i === head ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        head += step;
        if (head >= stroke.pts.length - 1) { stroke = makeStroke(); head = 0; idle = 45; }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { run = false; cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, [ink, accent, alt, paper]);

  return <canvas ref={ref} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.5 }} />;
}

// Living backdrops for themes flagged `animated:true`. Most are pure CSS and
// sit at zIndex 0, under SkyEffect(1) and all content; `livedraw` is a canvas.
// New themes select one via a `backdrop` field; the original four (ocean,
// glitch, aurora, vapor) predate that and still match on their theme id.
export default function ThemeBackdrop({ themeId, pace = "sweep", gyroMotion = GYRO_ZERO, enableGyroscope = true, winIntensity = 0 }) {
  const th = THEMES[themeId];
  if (!th?.animated || reduceMotion || PACE_PRESETS[pace]?.kill) return null;
  const wrap = { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" };
  const kind = th.backdrop || themeId;

  if (kind === "livedraw") return <LiveDrawBackdrop ink={th.ink} accent={th.accent} alt={th.alt} paper={th.paper} />;

  if (kind === "wellrise") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokwellrise{0%{transform:translateY(0) scale(1);opacity:0}12%{opacity:.55}100%{transform:translateY(-105vh) scale(1.7);opacity:0}}@keyframes lokwellglow{0%,100%{opacity:.18}50%{opacity:.34}}`}</style>
    <div style={{ position: "absolute", left: "50%", bottom: "-30%", width: "90vmax", height: "70vmax", transform: "translateX(-50%)", borderRadius: "50%", background: `radial-gradient(circle, ${th.accent}44, transparent 62%)`, filter: "blur(40px)", animation: "lokwellglow 11s ease-in-out infinite" }} />
    {Array.from({ length: 16 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 6.5 + 4) % 100}%`, bottom: "-6vh", width: 4 + (i % 4) * 3, height: 4 + (i % 4) * 3, borderRadius: "50%", background: i % 3 ? `${th.accent}66` : `${th.alt}55`, animation: `lokwellrise ${13 + (i % 6) * 4}s linear infinite`, animationDelay: `-${i * 1.7}s` }} />))}
  </div>);

  if (kind === "ashfall") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokashfall{0%{transform:translateY(-8vh) translateX(0) rotate(0deg);opacity:0}10%{opacity:.7}100%{transform:translateY(108vh) translateX(6vw) rotate(220deg);opacity:0}}@keyframes lokashheat{0%,100%{opacity:.14}50%{opacity:.28}}`}</style>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 108%, ${th.accent}55, transparent 58%)`, animation: "lokashheat 8s ease-in-out infinite" }} />
    {Array.from({ length: 22 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 4.6) % 100}%`, top: 0, width: 2 + (i % 3), height: 2 + (i % 3), borderRadius: i % 4 ? "50%" : 1, background: i % 5 === 0 ? th.accent : `${th.alt}99`, animation: `lokashfall ${11 + (i % 7) * 3}s linear infinite`, animationDelay: `-${i * 1.3}s` }} />))}
  </div>);

  if (kind === "misregister") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokmisreg1{0%,100%{transform:translate(0,0)}25%{transform:translate(3px,-2px)}60%{transform:translate(-2px,2px)}}@keyframes lokmisreg2{0%,100%{transform:translate(0,0)}30%{transform:translate(-3px,2px)}70%{transform:translate(2px,-3px)}}`}</style>
    <div style={{ position: "absolute", inset: "-6px", background: `repeating-linear-gradient(0deg, ${th.accent}14 0 3px, transparent 3px 26px)`, mixBlendMode: "multiply", animation: "lokmisreg1 7s ease-in-out infinite" }} />
    <div style={{ position: "absolute", inset: "-6px", background: `repeating-linear-gradient(90deg, ${th.alt}12 0 3px, transparent 3px 31px)`, mixBlendMode: "multiply", animation: "lokmisreg2 9s ease-in-out infinite" }} />
  </div>);

  if (kind === "driftpages") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokdriftpage{0%{transform:translate(0,110vh) rotate(-12deg);opacity:0}12%{opacity:.5}88%{opacity:.5}100%{transform:translate(14vw,-25vh) rotate(16deg);opacity:0}}`}</style>
    {Array.from({ length: 9 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 11 + 5) % 92}%`, bottom: 0, width: 26 + (i % 3) * 16, height: (26 + (i % 3) * 16) * 1.25, borderRadius: 3, background: th.card, border: `1.5px solid ${th.accent}44`, boxShadow: `2px 2px 0 ${th.shadow}`, animation: `lokdriftpage ${26 + (i % 5) * 7}s linear infinite`, animationDelay: `-${i * 3.4}s` }} />))}
  </div>);

  if (kind === "ocean") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokocean1{0%,100%{transform:translate(-8%,-4%) scale(1)}50%{transform:translate(6%,5%) scale(1.15)}}@keyframes lokocean2{0%,100%{transform:translate(5%,6%) scale(1.1)}50%{transform:translate(-6%,-5%) scale(0.95)}}@keyframes lokoceanshine{0%,100%{opacity:.16}50%{opacity:.3}}`}</style>
    <div style={{ position: "absolute", left: "-10%", top: "8%", width: "70vmax", height: "70vmax", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,191,255,.22), transparent 65%)", filter: "blur(30px)", animation: "lokocean1 34s ease-in-out infinite" }} />
    <div style={{ position: "absolute", right: "-14%", bottom: "-6%", width: "60vmax", height: "60vmax", borderRadius: "50%", background: "radial-gradient(circle, rgba(127,219,255,.16), transparent 60%)", filter: "blur(36px)", animation: "lokocean2 41s ease-in-out infinite" }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(0,191,255,.1))", animation: "lokoceanshine 12s ease-in-out infinite" }} />
    {Array.from({ length: 10 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, bottom: -12, width: 5 + (i % 3) * 2, height: 5 + (i % 3) * 2, borderRadius: "50%", border: "1.5px solid rgba(127,219,255,.4)", animation: `lokember ${9 + (i % 5) * 3}s linear infinite`, animationDelay: `-${i * 2.3}s` }} />))}
  </div>);

  if (kind === "glitch") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokglitchbar{0%,86%,100%{opacity:0}88%{opacity:1;transform:translateX(-8px)}92%{opacity:.7;transform:translateX(10px)}95%{opacity:0}}@keyframes lokglitchhue{0%,100%{opacity:.03}50%{opacity:.06}}`}</style>
    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,255,0,.03) 0 2px, transparent 2px 5px)", animation: "lokglitchhue 4s steps(2) infinite" }} />
    {[14, 38, 61, 82].map((top, i) => (<div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${top}%`, height: 3 + (i % 2) * 5, background: i % 2 ? "rgba(255,0,255,.14)" : "rgba(0,255,0,.12)", animation: `lokglitchbar ${5 + i * 1.7}s steps(1) infinite`, animationDelay: `-${i * 2.1}s` }} />))}
  </div>);

  if (kind === "aurora") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokauroraband{0%,100%{transform:translateX(-12%) skewX(-8deg)}50%{transform:translateX(10%) skewX(6deg)}}@keyframes lokauroraband2{0%,100%{transform:translateX(8%) skewX(5deg);opacity:.5}50%{transform:translateX(-10%) skewX(-7deg);opacity:.9}}`}</style>
    <div style={{ position: "absolute", left: "-20%", right: "-20%", top: 0, height: "55%", background: "linear-gradient(100deg, transparent, rgba(0,255,170,.2) 30%, rgba(127,90,240,.16) 60%, transparent)", filter: "blur(38px)", mixBlendMode: "screen", animation: "lokauroraband 26s ease-in-out infinite" }} />
    <div style={{ position: "absolute", left: "-20%", right: "-20%", top: "10%", height: "40%", background: "linear-gradient(80deg, transparent, rgba(127,90,240,.18) 40%, rgba(0,255,170,.1) 70%, transparent)", filter: "blur(44px)", mixBlendMode: "screen", animation: "lokauroraband2 33s ease-in-out infinite" }} />
    {Array.from({ length: 26 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 23) % 100}%`, top: `${(i * 13) % 90}%`, width: 2, height: 2, borderRadius: "50%", background: "rgba(224,251,252,.7)", animation: `loktwinkle ${1.6 + (i % 4) * 0.7}s ease-in-out infinite alternate`, animationDelay: `-${i * 0.4}s` }} />))}
  </div>);

  if (kind === "vapor") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokvaporgrid{from{background-position:0 0}to{background-position:0 44px}}@keyframes lokvaporsun{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.05)}}`}</style>
    <div style={{ position: "absolute", left: "50%", top: "16%", width: "34vmin", height: "34vmin", transform: "translateX(-50%)", borderRadius: "50%", background: "linear-gradient(180deg, #FF2E97, #FF8C42 55%, transparent 56%)", opacity: 0.35, filter: "blur(2px)", animation: "lokvaporsun 9s ease-in-out infinite" }} />
    <div style={{ position: "absolute", left: "-30%", right: "-30%", bottom: 0, height: "42%", transform: "perspective(340px) rotateX(58deg)", transformOrigin: "bottom", backgroundImage: "repeating-linear-gradient(0deg, rgba(0,212,255,.28) 0 2px, transparent 2px 44px), repeating-linear-gradient(90deg, rgba(255,46,151,.24) 0 2px, transparent 2px 52px)", animation: "lokvaporgrid 3.6s linear infinite" }} />
  </div>);

  // Split Press: a literal two-tone split (top/bottom) with a slowly
  // drifting seam — the seam position is the only thing that moves.
  if (kind === "splitpress") return (<div style={wrap} aria-hidden="true">
    <style>{`@keyframes lokseamdrift{0%,100%{background-position:0 38%}50%{background-position:0 62%}}`}</style>
    <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${th.accent}14, ${th.accent}14 50%, ${th.alt}14 50%, ${th.alt}14)`, backgroundSize: "100% 220%", animation: "lokseamdrift 46s ease-in-out infinite" }} />
  </div>);

  // Parallax Ink: the ink-wash layer tilts opposite the phone. Clamp+small-
  // multiply, same idiom as gyroMotion.beta*0.12 elsewhere in the app — never
  // a raw unclamped angle, and a flat 0/0 tilt (desktop, gyro off) renders the
  // same wash perfectly still, so nothing about this requires the sensor.
  if (kind === "parallaxink") {
    const gx = enableGyroscope ? Math.max(-14, Math.min(14, gyroMotion.gamma * 0.6)) : 0;
    const gy = enableGyroscope ? Math.max(-14, Math.min(14, gyroMotion.beta * 0.4)) : 0;
    return (<div style={wrap} aria-hidden="true">
      <div style={{ position: "absolute", inset: "-8%", background: `radial-gradient(60% 50% at 50% 40%, ${th.accent}33, transparent 70%), radial-gradient(50% 40% at 55% 65%, ${th.alt}2a, transparent 70%)`, transform: `translate(${-gx}px, ${-gy}px)`, transition: "transform 0.15s ease-out" }} />
    </div>);
  }

  // Compassbloom: a drawn bloom shape rotates toward the phone's compass
  // heading (alpha). Off-gyro, it simply doesn't rotate — never required.
  if (kind === "compassbloom") {
    const heading = enableGyroscope ? (gyroMotion.alpha || 0) : 0;
    return (<div style={wrap} aria-hidden="true">
      <div style={{ position: "absolute", left: "50%", top: "50%", width: "70vmin", height: "70vmin", marginLeft: "-35vmin", marginTop: "-35vmin", transform: `rotate(${heading}deg)`, transition: "transform 0.4s ease-out", opacity: 0.25 }}>
        {Array.from({ length: 8 }).map((_, i) => (<div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: "4px", height: "35vmin", background: i % 2 ? th.accent : th.alt, transformOrigin: "top", transform: `translateX(-50%) rotate(${i * 45}deg)` }} />))}
      </div>
    </div>);
  }

  // Winstreak: intensity ramps after a battle win and decays back over ~30s
  // (winIntensity is computed from that decay by the caller); reuses the
  // wellrise particle shape rather than inventing a second rising-ember look.
  if (kind === "winstreak") {
    if (winIntensity <= 0.02) return null;
    return (<div style={wrap} aria-hidden="true">
      <style>{`@keyframes lokwellrise{0%{transform:translateY(0) scale(1);opacity:0}12%{opacity:.55}100%{transform:translateY(-105vh) scale(1.7);opacity:0}}`}</style>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 100%, ${th.accent}${Math.round(winIntensity * 68).toString(16).padStart(2, "0")}, transparent 60%)`, transition: "opacity 1s linear" }} />
      {Array.from({ length: Math.round(6 + winIntensity * 14) }).map((_, i) => (<div key={i} style={{ position: "absolute", left: `${(i * 6.5 + 4) % 100}%`, bottom: "-6vh", width: 4 + (i % 4) * 3, height: 4 + (i % 4) * 3, borderRadius: "50%", background: i % 3 ? `${th.accent}66` : `${th.alt}55`, opacity: winIntensity, animation: `lokwellrise ${9 + (i % 6) * 3}s linear infinite`, animationDelay: `-${i * 1.2}s` }} />))}
    </div>);
  }

  return null;
}
