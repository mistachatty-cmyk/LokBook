import { useState, useEffect, useRef, useCallback } from "react";
import { REVIVAL_MAX, LILLOK_SPEECH } from "./constants.jsx";
import { useT, ART } from "./theme/theme.js";
import { MiniDraw } from "./engine/draw.jsx";
import { getLilLokLine, lilLokPhase } from "./engine/lillok.js";

export function LilLokBubble({ text, ink = ART.ink, paper = ART.paper, voicePack = "default" }) {
  if (!text) return null;
  const voiceStyle = {
    whisper: { fontStyle: "italic", opacity: 0.75, letterSpacing: "0.02em" },
    echo: { letterSpacing: "0.06em", textShadow: `2px 2px 0 ${ink}22, 4px 4px 0 ${ink}11` },
    robot: { fontFamily: "monospace", letterSpacing: "0.03em", textTransform: "uppercase", fontSize: 10 },
  }[voicePack] || {};
  return (<div className="lok-display" style={{ position: "absolute", bottom: "104%", left: "50%", transform: "translateX(-50%)", background: paper, border: `2.5px solid ${ink}`, borderRadius: 12, padding: "5px 11px", fontSize: 11, fontWeight: 700, color: ink, boxShadow: `2px 2px 0 ${ink}`, animation: "lokrise .2s ease", maxWidth: 180, textAlign: "center", zIndex: 99, pointerEvents: "none", whiteSpace: "normal", width: "max-content", ...voiceStyle }}>
    {text}
    <div style={{ position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)", borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `9px solid ${ink}` }} />
    <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${paper}` }} />
  </div>);
}

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function LilLokSprite({ phase, ink, size = 88, custom, gear, skin, aura, pet }) {
  if (custom && custom[phase === "critical" ? "decaying" : phase]) return (<img src={custom[phase === "critical" ? "decaying" : phase]} alt="lillok" width={size} height={size} style={{ width: size, height: size, objectFit: "contain", animation: phase === "stasis" || reduceMotion ? "none" : phase === "thriving" ? "lokbob 2.4s ease-in-out infinite" : "lokbob 4s ease-in-out infinite" }} />);
  const crit = phase === "critical", grey = phase === "decaying" || crit, stone = phase === "stasis";
  const body = stone ? "#9A9286" : grey ? "#8E93A8" : skin==="gold"?"#E8B14B":skin==="galaxy"?"#4A2F7A":ART.pink;
  const outlineCol = stone ? "#9A9286" : grey ? "#6E80B0" : skin==="gold"?"#B8860B":skin==="galaxy"?"#2F1A5E":ART.ink;
  const inkFill = grey ? "#6E80B0" : skin==="gold"?"#B8860B":skin==="galaxy"?"#7A4FBF":ART.teal;
  const eyeY = grey ? 54 : 50; const inkPct = Math.max(0, Math.min(100, ink || 0)); const cid = `blotClip${size}`;
  return (<svg width={size} height={size} viewBox="0 0 100 100" style={{ animation: stone || reduceMotion ? "none" : phase === "thriving" ? "lokbob 2.4s ease-in-out infinite" : "lokbob 4s ease-in-out infinite", ...(aura==="glow"?{filter:"drop-shadow(0 0 6px rgba(47,169,160,.5))"}:{}) }}>
    <defs><clipPath id={cid}><ellipse cx={48} cy={48} rx={28} ry={30} /></clipPath>
    {skin==="galaxy"&&<radialGradient id="gal">{[0,0.3,0.6,1].map((o,i)=>[<stop key={i} offset={`${o*100}%`} stopColor={["#7A4FBF","#2FA9A0","#FF5DA2","#E8B14B"][i]}/>])}</radialGradient>}
    </defs>
    {skin==="galaxy"?<><ellipse cx={52} cy={48} rx={30} ry={32} fill="url(#gal)" opacity={0.8}/>{Array.from({length:8}).map((_,i)=>(<circle key={i} cx={30+Math.random()*40} cy={25+Math.random()*45} r={1+Math.random()*2} fill="#fff" opacity={0.5+Math.random()*0.5}/>))}</>:!stone&&<ellipse cx={52} cy={48} rx={30} ry={32} fill={body} opacity={0.9}/>}
    <ellipse cx={48} cy={48} rx={30} ry={32} fill="none" stroke={outlineCol} strokeWidth="5" />
    {stone && <ellipse cx={48} cy={48} rx={30} ry={32} fill={body} />}
    {!stone && <rect clipPath={`url(#${cid})`} x={20} y={48 + 30 * (1 - inkPct / 100)} width={58} height={62} fill={inkFill} opacity={0.3} />}
    {!stone && <><circle cx={38} cy={eyeY} r={grey ? 3.5 : 5} fill={outlineCol} /><circle cx={58} cy={eyeY} r={grey ? 3.5 : 5} fill={outlineCol} /></>}
    {phase === "thriving" && <><circle cx={40} cy={eyeY - 2} r={1.5} fill="#fff" opacity={0.85} /><circle cx={60} cy={eyeY - 2} r={1.5} fill="#fff" opacity={0.85} /></>}
    {stone && <><path d="M33 50 Q38 46 43 50" fill="none" stroke={outlineCol} strokeWidth="3" strokeLinecap="round" /><path d="M53 50 Q58 46 63 50" fill="none" stroke={outlineCol} strokeWidth="3" strokeLinecap="round" /></>}
    {phase === "thriving" && <path d="M38 62 Q48 72 60 62" fill="none" stroke={outlineCol} strokeWidth="4" strokeLinecap="round" />}
    {phase === "decaying" && <path d="M40 66 Q48 60 58 66" fill="none" stroke={outlineCol} strokeWidth="4" strokeLinecap="round" />}
    {crit && <path d="M39 66 Q48 63 59 66" fill="none" stroke={outlineCol} strokeWidth="3.5" strokeLinecap="round" />}
    {stone && <><path d="M40 64 L58 64" stroke={outlineCol} strokeWidth="4" strokeLinecap="round" />
      <text x={66} y={37} fontSize={9} fill={outlineCol} opacity={0.35} fontWeight="700">z</text>
      <text x={73} y={27} fontSize={12} fill={outlineCol} opacity={0.6} fontWeight="700">Z</text>
      <text x={81} y={16} fontSize={15} fill={outlineCol} opacity={0.85} fontWeight="700">Z</text></>}
    {phase === "thriving" && <circle cx={70} cy={30} r={5} fill={skin==="gold"?"#FFD700":skin==="galaxy"?"#E8B14B":ART.teal} stroke={outlineCol} strokeWidth="2" />}
    {gear==="hat"&&<path d="M32 42 Q33 28 48 26 Q63 28 64 42" fill={ART.pink} stroke={outlineCol} strokeWidth="3" strokeLinecap="round"/>}
    {gear==="hat"&&<ellipse cx={48} cy={42} rx={18} ry={4} fill={ART.pink} stroke={outlineCol} strokeWidth="3"/>}
    {gear==="glasses"&&<ellipse cx={38} cy={50} rx={9} ry={7} fill="none" stroke={outlineCol} strokeWidth="2.5"/>}
    {gear==="glasses"&&<ellipse cx={58} cy={50} rx={9} ry={7} fill="none" stroke={outlineCol} strokeWidth="2.5"/>}
    {gear==="glasses"&&<line x1={47} y1={49} x2={49} y2={49} stroke={outlineCol} strokeWidth="2.5"/>}
    {gear==="bowtie"&&<path d="M38 68 L48 62 L58 68 L48 74 Z" fill={ART.accent} stroke={outlineCol} strokeWidth="2.5" strokeLinejoin="round"/>}
    {pet==="mini"&&!stone&&<g style={{animation:reduceMotion?"none":"lokbob 2s ease-in-out infinite .3s"}}>
      <ellipse cx={82} cy={82} rx={11} ry={12} fill={ART.pink} stroke={ART.ink} strokeWidth="2.5"/>
      <circle cx={78} cy={80} r="1.6" fill={ART.ink}/><circle cx={86} cy={80} r="1.6" fill={ART.ink}/>
    </g>}
  </svg>);
}

export default function LilLokPanel({ lillok, phase, kids, custom, loks = 0, onFeed, onFlask, onClose, say, setLillok, onPublish, onSaveCustom, gear, skin="none", aura="none", pet="none" }) {
  const T = useT();
  const [mode, setMode] = useState("care");
  const [feeding, setFeeding] = useState(false);
  const [panelLine, setPanelLine] = useState(() => getLilLokLine(phase));
  const doFeed = (amt, viaFlask) => { if (viaFlask) { if (!onFlask || !onFlask()) return; } else { onFeed(amt); } setPanelLine(getLilLokLine("thriving")); setFeeding(true); setTimeout(() => setFeeding(false), 700); };
  const draw = useRef(null);
  const [color, setColor] = useState(ART.pink);
  const [frames, setFrames] = useState([]);
  const [paceMs, setPaceMs] = useState(180);
  const [pv, setPv] = useState(0);
  const [bName, setBName] = useState(lillok.name === "Blot" ? "" : lillok.name);
  const [emotion, setEmotion] = useState("thriving");
  const [bArt, setBArt] = useState(custom?.art || {});
  useEffect(() => { if (frames.length < 2) return; const t = setInterval(() => setPv(p => (p + 1) % frames.length), paceMs); return () => clearInterval(t); }, [frames.length, paceMs]);
  const swatches = [ART.ink, ART.pink, ART.teal, "#E8B14B", "#7A4FBF"];
  const capture = () => { if (frames.length >= REVIVAL_MAX) { say(`Max ${REVIVAL_MAX} pages`); return; } setFrames(f => [...f, draw.current.snapshot()]); draw.current.clear(); };
  const finishRevive = () => { onFeed(Math.min(80, 30 + frames.length * 6), "revival"); say(`${lillok.name} rehydrated!`, "success"); };
  const publishRevival = () => { if (frames.length < 2) { say("Draw at least 2 pages"); return; } onPublish({ id: "r" + Date.now(), title: "Revival animation", frames, paceMs, mode: "A", style: "revival", loop: true, votes: 0, voted: false, viewed: false, views: 0, reactions: { splat: 0, heart: 0, drip: 0 }, from: "revival" }); finishRevive(); setFrames([]); };
  return (<div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.35)" }} onClick={onClose}>
    <div className="w-full rounded-t-3xl p-5 overflow-y-auto" style={{ maxWidth: 560, maxHeight: "92vh", background: T.card, border: `3px solid ${(phase === "decaying" || phase === "critical") ? "#8E93A8" : T.ink}`, animation: (phase === "decaying" || phase === "critical") && !reduceMotion ? "lokwobble 9s ease-in-out infinite" : "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-2 relative" style={{ background: T.paper, border: `3px solid ${T.ink}`, transform: feeding ? "scale(1.08)" : "scale(1)", transition: "transform .15s cubic-bezier(.34,1.56,.64,1)" }}>
          <LilLokSprite phase={phase} ink={lillok.ink} size={64} custom={custom?.art} gear={gear} skin={skin} aura={aura} pet={pet}/>
          {feeding && [0, 1, 2].map(i => (<div key={i} className="absolute pointer-events-none" style={{ left: `${22 + i * 24}%`, bottom: "85%", fontSize: 15, animation: `lokfloat .65s ease-out ${i * 0.1}s forwards` }}>💧</div>))}
        </div>
        <div className="flex-1"><div className="lok-display text-xl font-extrabold">{lillok.name} <span className="text-sm font-bold opacity-60">· {phase}</span></div><div className="text-xs opacity-70">Living Ink companion</div></div>
        <button onClick={onClose} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{ border: `2.5px solid ${T.ink}` }} aria-label="Close LilLok panel">✕</button>
      </div>
      <div className="mt-3 flex gap-1.5">{[["care", "Care"], ["revive", "Revival animator"], ["build", "Make your own"]].map(([id, l]) => (
        <button key={id} onClick={() => setMode(id)} className="lok-btn flex-1 py-1.5 rounded-full text-xs font-bold" style={{ border: `2.5px solid ${T.ink}`, background: mode === id ? T.ink : T.card, color: mode === id ? T.paper : T.ink }}>{l}</button>))}</div>
      {mode === "care" && (<>
        <div className="mt-3 rounded-xl p-3" style={{ background: phase === "critical" ? "rgba(200,50,50,.08)" : phase === "decaying" ? "rgba(142,147,168,.1)" : phase === "stasis" ? "rgba(154,146,134,.12)" : "rgba(47,169,160,.09)", border: `1.5px solid ${phase === "thriving" ? T.alt : "#8E93A8"}` }}>
          <div className="font-bold text-sm">{phase === "thriving" ? `${lillok.name} is thriving` : phase === "critical" ? `${lillok.name} is about to go quiet` : phase === "decaying" ? `${lillok.name} is drying out` : `${lillok.name} is in stasis`}</div>
          <div className="text-xs opacity-70 mt-0.5">{kids ? `${lillok.name} loves drawing with you!` : phase === "thriving" ? "Interventions hit harder · keep drawing" : phase === "critical" ? "Feed ink now or matches get harder" : phase === "decaying" ? "Bond slows the drain. Draw something to nourish it." : "Bond held through stasis. Do a Revival Sketch to wake up."}</div>
        </div>
        <div className="mt-3 space-y-2">{[["Ink", lillok.ink, phase === "thriving" ? T.alt : phase === "stasis" ? "#9A9286" : "#8E93A8"], ["Bond", lillok.bond, T.accent]].map(([label, val, col]) => (
          <div key={label}><div className="flex justify-between text-xs font-bold"><span>{label}{label === "Bond" && <span className="opacity-50 font-normal"> · slows ink drain</span>}</span><span>{Math.round(val)}</span></div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: T.shadow }}><div style={{ width: `${val}%`, height: "100%", background: col, transition: "width .4s ease" }} /></div></div>))}</div>
        <div className="mt-2.5 text-sm font-bold" style={{ color: T.alt, fontStyle: "italic" }}>"{panelLine}"</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => doFeed(20, false)} className="lok-btn lok-display p-2.5 rounded-xl text-left font-extrabold" style={{ background: T.alt, color: "#fff", border: `3px solid ${T.ink}` }} aria-label="Quick ink drop">
            <div className="text-sm">Quick drop</div><div className="text-[11px] font-bold opacity-80">+20 ink · free</div>
          </button>
          <button onClick={() => doFeed(40, true)} disabled={kids || loks < 10} className="lok-btn lok-display p-2.5 rounded-xl text-left font-extrabold" style={{ background: kids || loks < 10 ? T.shadow : T.accent, color: kids || loks < 10 ? T.ink : T.onAccent, border: `3px solid ${T.ink}`, opacity: kids || loks < 10 ? 0.55 : 1 }} aria-label="Ink flask">
            <div className="text-sm">Ink flask</div><div className="text-[11px] font-bold opacity-80">+40 ink · 10 Loks</div>
          </button>
        </div>
      </>)}
      {mode === "revive" && (<>
        <p className="mt-2 text-xs opacity-70">Draw up to {REVIVAL_MAX} pages — capture each, and it becomes a looping revival animation you can publish.</p>
        <div className="mt-2 flex gap-2">{swatches.map(c => (<button key={c} onClick={() => setColor(c)} className="lok-btn w-7 h-7 rounded-full" style={{ background: c, border: `3px solid ${color === c ? T.accent : T.ink}` }} aria-label={`Color ${c}`} />))}</div>
        <div className="mt-2"><MiniDraw ref={draw} color={color} /></div>
        <div className="mt-2 flex gap-2">
          <button onClick={capture} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold" style={{ background: T.ink, color: T.paper }}>Capture page {frames.length + 1}/{REVIVAL_MAX}</button>
          {frames.length >= 2 && <button onClick={publishRevival} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}` }}>Publish + feed</button>}
        </div>
        {frames.length > 0 && (<>
          <div className="mt-2 flex items-center gap-2">
            <img src={frames[Math.min(pv, frames.length - 1)]} alt="loop" className="rounded-lg" style={{ width: 72, aspectRatio: "4/5", objectFit: "cover", border: `2.5px solid ${T.ink}` }} />
            <div className="flex-1"><div className="text-xs font-bold">Loop · {paceMs}ms</div><input type="range" min="120" max="600" step="20" value={paceMs} onChange={e => setPaceMs(+e.target.value)} className="w-full" style={{ accentColor: T.accent }} aria-label="Loop pace" /></div>
            <button onClick={() => setFrames([])} className="lok-btn text-xs font-bold px-2 py-1 rounded-lg" style={{ border: `2px solid ${T.ink}` }}>reset</button>
          </div>
          <button onClick={finishRevive} className="lok-btn lok-display mt-2 w-full py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}` }}>Just feed (no publish)</button>
        </>)}
      </>)}
      {mode === "build" && (<>
        <p className="mt-2 text-xs opacity-70">Draw your own LilLok — one face per emotion.</p>
        <div className="mt-2 flex gap-1.5">{[["thriving", "Happy"], ["decaying", "Grumpy"], ["stasis", "Asleep"]].map(([id, l]) => (
          <button key={id} onClick={() => setEmotion(id)} className="lok-btn flex-1 py-1.5 rounded-full text-xs font-bold" style={{ border: `2.5px solid ${bArt[id] ? T.alt : T.ink}`, background: emotion === id ? T.ink : T.card, color: emotion === id ? T.paper : T.ink }}>{l}{bArt[id] ? " ✓" : ""}</button>))}</div>
        <div className="mt-2 flex gap-2">{swatches.map(c => (<button key={c} onClick={() => setColor(c)} className="lok-btn w-7 h-7 rounded-full" style={{ background: c, border: `3px solid ${color === c ? T.accent : T.ink}` }} aria-label={`Color ${c}`} />))}</div>
        <div className="mt-2"><MiniDraw ref={draw} key={emotion} color={color} /></div>
        <button onClick={() => { setBArt(a => ({ ...a, [emotion]: draw.current.snapshot() })); draw.current.clear(); say(`${emotion} face saved`); }} className="lok-btn lok-display mt-2 w-full py-2 rounded-xl font-bold text-sm" style={{ background: T.ink, color: T.paper }}>Save {emotion} face</button>
        <input value={bName} onChange={e => setBName(e.target.value)} placeholder="Name your LilLok" className="mt-2 w-full px-3 py-2.5 rounded-xl font-bold" style={{ border: `3px solid ${T.ink}`, background: T.paper, color: T.ink }} aria-label="LilLok name" />
        <button onClick={() => { if (!bName.trim()) { say("Give it a name"); return; } if (!bArt.thriving || !bArt.decaying || !bArt.stasis) { say("Draw all 3 emotions first"); return; } onSaveCustom({ name: bName.trim(), art: bArt }); onClose(); }} className="lok-btn lok-display mt-2 w-full py-3 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}` }}>Submit my LilLok</button>
      </>)}
    </div>
  </div>);
}
