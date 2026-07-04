import { useState, useEffect, useRef } from "react";
import { useT } from "../theme/theme.js";
import { PACE_PRESETS } from "../constants.js";

export default function SettingsPanel({ show, onClose, say, isIOS, canInstall, onInstall, founder, onFounderJoin, pace, setPace, speed, setSpeed, soundLab, onUnlockSoundLab, soundQueue, setSoundQueue, focusMode, setFocusMode }) {
  const T = useT();
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const audioRef = useRef(null);
  const [slUrl, setSlUrl] = useState("");
  const [slPlaying, setSlPlaying] = useState(null);
  const [fHandle, setFHandle] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fBusy, setFBusy] = useState(false);
  const [synesthesia, setSynesthesia] = useState(false);
  const [hapticGrammar, setHapticGrammar] = useState("default");
  const [fourthWall, setFourthWall] = useState(100);

  const versionTap = () => { if (soundLab) return; tapCount.current++; clearTimeout(tapTimer.current); tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1200); if (tapCount.current >= 7) { tapCount.current = 0; onUnlockSoundLab && onUnlockSoundLab(); say("🔊 Sound Lab unlocked", "success"); } };
  const ytId = u => { const m = u.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/); return m ? m[1] : null; };
  const slAdd = () => { const u = slUrl.trim(); if (!u) return; const kind = ytId(u) ? "youtube" : /spotify\.com/.test(u) ? "spotify" : "mp3"; setSoundQueue(q => [...q.slice(-9), { id: Date.now(), url: u, kind }]); setSlUrl(""); say(kind === "spotify" ? "Queued (Spotify embed — full playback needs Premium SDK)" : "Queued"); };
  const slPlay = item => { if (item.kind === "mp3") { if (audioRef.current) { audioRef.current.pause(); } const a = new Audio(item.url); audioRef.current = a; a.play().catch(() => say("Couldn't play that URL")); } setSlPlaying(item.id); };
  const slStop = () => { if (audioRef.current) audioRef.current.pause(); setSlPlaying(null); };
  useEffect(() => () => { if (audioRef.current) audioRef.current.pause(); }, []);
  const joinFounders = async () => { if (!fHandle.trim() || fHandle.trim().length < 2) { say("Enter a handle"); return; } setFBusy(true); try { await onFounderJoin(fHandle.trim(), fEmail.trim()); say("You're a founder! Data secured on the test server 🏆", "success"); } catch { say("Couldn't reach the server — try again", "error"); } setFBusy(false); };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.35)" }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5" style={{ maxWidth: 560, background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><div className="lok-display text-lg font-extrabold">Settings</div><button onClick={onClose} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{ border: `2.5px solid ${T.ink}` }} aria-label="Close settings">✕</button></div>
        <div className="p-3 rounded-2xl mb-2" style={{ border: `3px solid ${T.ink}`, background: T.paper }}>
          <div className="lok-display font-extrabold text-sm">📱 Add Lok to your home screen</div>
          <div className="text-xs opacity-70 mt-1 leading-snug">{isIOS ? "Tap the Share button in Safari, then \u201CAdd to Home Screen\u201D. Lok opens full-screen like a native app." : "Install Lok as an app — it gets its own icon and opens full-screen, no browser bars."}</div>
          {!isIOS && <button onClick={() => onInstall && onInstall()} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{ background: canInstall ? T.accent : T.shadow, color: canInstall ? T.onAccent : T.ink, border: `3px solid ${T.ink}`, opacity: canInstall ? 1 : 0.7 }} aria-label="Install Lok as an app">{canInstall ? "Install Lok" : "Install via browser menu →"}</button>}
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{ border: `3px solid ${founder ? T.alt : T.ink}`, background: T.paper }}>
          <div className="lok-display font-extrabold text-sm">🏆 Founders' test server{founder && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: T.alt, color: "#fff" }}>FOUNDER</span>}</div>
          <div className="text-xs opacity-70 mt-1 leading-snug">{founder ? "You're in. Your gallery, Loks and LilLok are backed up long-term on LokServices." : "Join the test server and your progress gets backed up long-term — founders keep everything into beta."}</div>
          {!founder && (<>
            <input value={fHandle} onChange={e => setFHandle(e.target.value)} placeholder="Handle" aria-label="Founder handle" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.card, color: T.ink }} />
            <input value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="Email (optional — for beta invite)" aria-label="Founder email" className="mt-1.5 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.card, color: T.ink }} />
            <button onClick={joinFounders} disabled={fBusy} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}`, opacity: fBusy ? 0.6 : 1 }}>{fBusy ? "Joining…" : "Join as a founder"}</button>
          </>)}
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{ border: `2px solid ${T.shadow}`, background: T.paper }}>
          <div className="font-bold text-sm">Feed pacing</div>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">{Object.entries(PACE_PRESETS).map(([id, p]) => (
            <button key={id} onClick={() => { setPace && setPace(id); say(`${p.name} pacing`); }} aria-pressed={pace === id} title={p.desc} className="lok-btn py-1.5 rounded-xl text-[10px] font-extrabold" style={{ border: `2.5px solid ${pace === id ? T.accent : T.ink}`, background: pace === id ? T.ink : T.card, color: pace === id ? T.paper : T.ink }}>{p.name}</button>))}</div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold" style={{ color: T.ink }}>Speed {speed.toFixed(1)}×<input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e => setSpeed && setSpeed(+e.target.value)} className="flex-1" style={{ accentColor: T.accent }} aria-label="Animation speed" /></label>
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{ border: `2px solid ${T.shadow}`, background: T.paper }}>
          <div className="font-bold text-sm">Sensory & Metaphysics</div>
          <div className="mt-2 flex items-center justify-between"><label htmlFor="synesthesia-toggle" className="text-xs font-bold" style={{ color: T.ink }}>Synesthesia Mode</label><button id="synesthesia-toggle" onClick={() => setSynesthesia(s => !s)} className="lok-btn px-3 py-1 rounded-full text-xs font-bold" style={{ border: `2px solid ${synesthesia ? T.accent : T.ink}`, background: synesthesia ? T.ink : T.card, color: synesthesia ? T.paper : T.ink }}>{synesthesia ? "On" : "Off"}</button></div>
          <div className="mt-2 flex items-center justify-between"><label htmlFor="haptic-select" className="text-xs font-bold" style={{ color: T.ink }}>Haptic Grammar</label><select id="haptic-select" value={hapticGrammar} onChange={e => setHapticGrammar(e.target.value)} className="lok-btn px-2 py-1 rounded-full text-[11px] font-bold" style={{ border: `2px solid ${T.ink}`, background: T.card, color: T.ink }}><option value="default">Default</option><option value="expressive">Expressive</option><option value="quiet">Quiet</option></select></div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs font-bold" style={{ color: T.ink }}><label htmlFor="fourth-wall-slider">Fourth Wall Integrity</label><span>{fourthWall}%</span></div>
            <input id="fourth-wall-slider" type="range" min="0" max="100" step="1" value={fourthWall} onChange={e => setFourthWall(+e.target.value)} className="w-full" style={{ accentColor: T.accent }} />
          </div>
        </div>
        {soundLab && (<div className="p-3 rounded-2xl mb-2" style={{ border: `3px dashed ${T.accent}`, background: T.paper }}>
          <div className="lok-display font-extrabold text-sm" style={{ color: T.accent }}>🔊 Sound Lab</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug">Hidden sandbox. Drop an MP3, YouTube or Spotify URL — plays under the app.</div>
          <div className="mt-2 flex gap-1.5">
            <input value={slUrl} onChange={e => setSlUrl(e.target.value)} placeholder="Paste a URL…" aria-label="Sound Lab URL" className="flex-1 px-3 py-2 rounded-xl font-bold text-sm min-w-0" style={{ border: `2.5px solid ${T.ink}`, background: T.card, color: T.ink }} />
            <button onClick={slAdd} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm shrink-0" style={{ background: T.ink, color: T.paper }}>Queue</button>
          </div>
          {soundQueue.length > 0 && (<div className="mt-2 flex flex-col gap-1.5">{soundQueue.map(item => (
            <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs" style={{ border: `1.5px solid ${T.shadow}`, background: T.card }}>
              <span className="font-extrabold shrink-0" style={{ color: T.alt }}>{item.kind === "youtube" ? "▶ YT" : item.kind === "spotify" ? "♫ SP" : "♪ MP3"}</span>
              <span className="flex-1 truncate opacity-70">{item.url}</span>
              {slPlaying === item.id ? <button onClick={slStop} className="lok-btn font-bold shrink-0" style={{ color: T.accent }}>stop</button> : <button onClick={() => slPlay(item)} className="lok-btn font-bold shrink-0" style={{ color: T.ink }}>play</button>}
              <button onClick={() => { if (slPlaying === item.id) slStop(); setSoundQueue(q => q.filter(x => x.id !== item.id)); }} className="lok-btn font-bold shrink-0 opacity-60">✕</button>
            </div>))}
          </div>)}
          {soundQueue.some(i => i.kind === "youtube" && slPlaying === i.id) && (() => { const it = soundQueue.find(i => i.id === slPlaying); const id = it && (it.url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/)||[])[1]; return id ? <iframe title="soundlab-yt" width="0" height="0" style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} src={`https://www.youtube.com/embed/${id}?autoplay=1`} allow="autoplay" /> : null; })()}
          {soundQueue.some(i => i.kind === "spotify" && slPlaying === i.id) && (() => { const it = soundQueue.find(i => i.id === slPlaying); const m = it && it.url.match(/spotify\.com\/(track|album|playlist)\/([\w]+)/); return m ? <iframe title="soundlab-sp" style={{ width: "100%", height: 80, border: 0, borderRadius: 12, marginTop: 8 }} src={`https://open.spotify.com/embed/${m[1]}/${m[2]}`} allow="autoplay; encrypted-media" /> : null; })()}
        </div>)}
        <div className="p-3 rounded-2xl" style={{ border: `2px solid ${T.shadow}`, background: T.paper }}>
          <div className="font-bold text-sm">About</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug select-none" onClick={versionTap} style={{ cursor: "default" }}>LokBook + Lok N Slide · <span style={{ fontWeight: 700 }}>alpha v1.2</span> · Your gallery and LilLok save automatically on this device. Lok Juniors mode is in the Shop.</div>
        </div>
      </div>
    </div>
  );
}