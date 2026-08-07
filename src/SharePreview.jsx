import { useState, useRef, useEffect } from "react";
import { useT } from "./theme/theme.js";
import { W, H } from "./constants.jsx";
import { useBodyScrollLock } from "./hooks/useBodyScrollLock.js";

// Real, honest scope: LokBook has no registered developer app with Instagram/
// TikTok/YouTube, so it cannot post directly to those platforms' APIs — that
// requires OAuth review and (for Instagram) a Business account on the artist's
// end. What this *can* do today: show exactly what the flip will look like at
// each platform's real aspect ratio, and hand off a correctly-sized video file
// via the OS share sheet (which lists Instagram/TikTok/YouTube if installed)
// or a direct download for manual upload.
const PRESETS = [
  { id: "reel", label: "Reel / Story / Short", sub: "IG Reels · TikTok · YouTube Shorts", w: 720, h: 1280 },
  { id: "square", label: "Square post", sub: "IG feed · most platforms", w: 720, h: 720 },
  { id: "original", label: "Original", sub: "LokBook's native 4:5", w: W, h: H },
];

export default function SharePreview({ frames, frameDurations, paceMs, title, onClose, say }) {
  const T = useT();
  useBodyScrollLock(true);
  const [preset, setPreset] = useState("reel");
  const [busy, setBusy] = useState(false);
  const dims = PRESETS.find(p => p.id === preset);
  const canvasRef = useRef(null);
  const imgsRef = useRef([]);
  const [fi, setFi] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(frames.map(src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; })))
      .then(imgs => { if (!cancelled) { imgsRef.current = imgs; setLoaded(true); } });
    return () => { cancelled = true; };
  }, [frames]);

  useEffect(() => {
    if (frames.length < 2) return;
    const t = setTimeout(() => setFi(f => (f + 1) % frames.length), frameDurations[fi] || paceMs);
    return () => clearTimeout(t);
  }, [fi, frames.length, frameDurations, paceMs]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !loaded) return;
    const previewScale = 280 / Math.max(dims.w, dims.h);
    cv.width = dims.w * previewScale; cv.height = dims.h * previewScale;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = T.ink; ctx.fillRect(0, 0, cv.width, cv.height);
    const img = imgsRef.current[fi];
    if (img) {
      const scale = Math.min(cv.width / W, cv.height / H);
      const dw = W * scale, dh = H * scale;
      ctx.drawImage(img, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
    }
  }, [fi, preset, loaded, dims.w, dims.h, T.ink]);

  const exportForShare = async () => {
    if (frames.length < 2 || busy) return;
    setBusy(true); say?.("Rendering for share…");
    try {
      const c = document.createElement("canvas"); c.width = dims.w; c.height = dims.h;
      const ctx = c.getContext("2d");
      const stream = c.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
      const chunks = []; recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      const done = new Promise(res => { recorder.onstop = () => res(new Blob(chunks, { type: "video/webm" })); });
      const scale = Math.min(dims.w / W, dims.h / H);
      const dw = W * scale, dh = H * scale;
      recorder.start();
      const LOOPS = 2;
      for (let loop = 0; loop < LOOPS; loop++) {
        for (let i = 0; i < frames.length; i++) {
          ctx.fillStyle = T.ink; ctx.fillRect(0, 0, dims.w, dims.h);
          const img = imgsRef.current[i];
          if (img) ctx.drawImage(img, (dims.w - dw) / 2, (dims.h - dh) / 2, dw, dh);
          await new Promise(r => setTimeout(r, frameDurations[i] || paceMs));
        }
      }
      recorder.stop();
      const blob = await done;
      const filename = (title.trim() || "flip") + `_${preset}.webm`;
      const file = new File([blob], filename, { type: "video/webm" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: title || "My LokBook flip" }); say?.("Shared!", "success"); setBusy(false); return; }
        catch (e) { if (e?.name === "AbortError") { setBusy(false); return; } }
      }
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
      say?.("Saved — upload it to Instagram/TikTok/YouTube from your files", "success");
    } catch (e) {
      console.warn("exportForShare", e); say?.("Couldn't render that — try again", "error");
    }
    setBusy(false);
  };

  return (<div className="fixed inset-0 z-[65] flex items-end justify-center" style={{ background: "rgba(0,0,0,.6)" }} onClick={onClose}>
    <div className="w-full rounded-t-3xl p-5" style={{ maxWidth: 460, background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <div className="lok-display text-lg font-extrabold">Share preview</div>
        <button onClick={onClose} aria-label="Close share preview" className="lok-btn px-3 py-1 rounded-lg font-bold" style={{ border: `2.5px solid ${T.ink}` }}>✕</button>
      </div>
      <p className="text-xs opacity-70 mb-3 leading-snug">LokBook can't post straight to Instagram/TikTok/YouTube yet — that needs a registered developer app on each platform's side. What this does: show exactly how it'll look at each platform's real size, then hand it to your phone's share sheet (or download it) so you can post it in a couple of taps.</p>

      <div className="flex justify-center mb-3">
        <canvas ref={canvasRef} className="rounded-xl" style={{ border: `2.5px solid ${T.ink}` }} aria-label="Sized preview of your flip" />
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        {PRESETS.map(p => (<button key={p.id} onClick={() => setPreset(p.id)} aria-pressed={preset === p.id} className="lok-btn flex items-center justify-between px-3 py-2 rounded-xl text-left" style={{ border: `2.5px solid ${preset === p.id ? T.accent : T.ink}`, background: preset === p.id ? T.ink : T.card, color: preset === p.id ? T.paper : T.ink }}>
          <span><span className="font-extrabold text-sm">{p.label}</span><span className="block text-[10px] opacity-70">{p.sub} · {p.w}×{p.h}</span></span>
        </button>))}
      </div>

      <button onClick={exportForShare} disabled={busy || frames.length < 2} className="lok-btn lok-display w-full py-3 rounded-xl text-lg font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}`, opacity: busy ? 0.6 : 1 }}>{busy ? "Rendering…" : "Share / Save video →"}</button>
    </div>
  </div>);
}
