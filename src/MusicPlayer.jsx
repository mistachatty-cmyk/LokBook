import { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "./theme/theme.js";
import { putTrack, getTrack, deleteTrack, putCover, getCover, deleteCover, ACCEPTED, IMAGE_TYPES, kindOfUrl, titleFromUrl } from "./engine/musicStore.js";

const LIST_KEY = "lok:music:list";
const PREF_KEY = "lok:music:prefs";
const PLAYLISTS_KEY = "lok:music:playlists";

const loadList = () => { try { return JSON.parse(localStorage.getItem(LIST_KEY) || "[]"); } catch { return []; } };
const loadPrefs = () => { try { return { ticker: true, shuffle: false, loop: true, volume: 0.8, visualizerStyle: "bars", ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; } catch { return { ticker: true, shuffle: false, loop: true, volume: 0.8, visualizerStyle: "bars" }; } };
const loadPlaylists = () => { try { return JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || "[]"); } catch { return []; } };

/**
 * Background music for LokBook.
 *
 * Plays through one persistent <audio> element that lives above the tab
 * switch, so playback survives moving between Feed/Studio/Battle. Tracks are
 * either a direct media URL or a file the user plugged in, which is kept as a
 * Blob in IndexedDB so albums keep playing offline. Streaming platforms that
 * forbid raw playback (Spotify/YouTube) are stored as links and open out.
 */
export function useMusic() {
  const [list, setList] = useState(loadList);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [playlists, setPlaylists] = useState(loadPlaylists);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState("");
  const mediaRef = useRef(null);
  const urlRef = useRef(null);
  const acRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {} }, [list]);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} }, [prefs]);
  useEffect(() => { try { localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists)); } catch {} }, [playlists]);

  // One <video> element rather than `new Audio()`: a video element plays
  // audio-only files identically, but can also show a picture when the track
  // is an .mp4/.webm. It stays detached from the DOM (so playback survives tab
  // switches) and is only re-parented into the sheet when there's video to see.
  if (!mediaRef.current && typeof document !== "undefined") {
    const el = document.createElement("video");
    el.playsInline = true; el.setAttribute("playsinline", "");
    el.preload = "metadata";
    mediaRef.current = el;
  }
  const audioRef = mediaRef;

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;
  const allPlayable = list.filter(t => t.kind === "file");
  // "Global" tracks (dev-mode flagged) stay in the queue no matter which
  // playlist is active, so a small always-on ambient set can run through
  // regardless of what else is playing. Local-only — there's no backend
  // here, so this doesn't distribute to other users, just pins tracks into
  // every scope on this one device.
  const globalTracks = allPlayable.filter(t => t.global);
  const scoped = activePlaylist ? allPlayable.filter(t => activePlaylist.trackIds.includes(t.id)) : allPlayable;
  const playable = activePlaylist ? [...scoped, ...globalTracks.filter(g => !scoped.some(s => s.id === g.id))] : scoped;
  const current = idx >= 0 ? playable[idx] : null;
  const next = playable.length ? playable[(idx + 1) % playable.length] : null;

  // Resolve a track to a src the <audio> element can use.
  const srcFor = useCallback(async t => {
    if (!t) return null;
    if (t.src === "idb") {
      const blob = await getTrack(t.id);
      if (!blob) return null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      return urlRef.current;
    }
    return t.url;
  }, []);

  // Lazily route playback through a Web Audio analyser so the visualiser has
  // real amplitude data to draw. Created on first play (needs a user gesture
  // in most browsers) and always re-connected to destination — if any of this
  // fails we bail out entirely rather than risk leaving playback silent.
  const ensureAnalyser = useCallback(() => {
    if (analyserRef.current) return analyserRef.current;
    const el = mediaRef.current;
    if (!el) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ac = new AC();
      const src = ac.createMediaElementSource(el);
      const an = ac.createAnalyser();
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.8;
      src.connect(an);
      an.connect(ac.destination);
      acRef.current = ac;
      analyserRef.current = an;
      return an;
    } catch { return null; }
  }, []);

  const playAt = useCallback(async i => {
    const a = audioRef.current;
    if (!a || !playable.length) return;
    const n = ((i % playable.length) + playable.length) % playable.length;
    const src = await srcFor(playable[n]);
    if (!src) { setErr("That track's data is missing — re-add the file."); return; }
    setErr("");
    a.src = src;
    a.volume = prefs.volume;
    try {
      await a.play();
      setIdx(n); setPlaying(true);
      ensureAnalyser();
      if (acRef.current?.state === "suspended") acRef.current.resume().catch(() => {});
    }
    catch { setErr("Playback blocked — tap play once to allow audio."); setPlaying(false); }
  }, [playable, srcFor, prefs.volume]);

  const toggle = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (idx < 0) return playAt(0);
    if (a.paused) { try { await a.play(); setPlaying(true); } catch { setErr("Playback blocked."); } }
    else { a.pause(); setPlaying(false); }
  }, [idx, playAt]);

  const skip = useCallback(d => {
    if (!playable.length) return;
    if (prefs.shuffle && playable.length > 1) {
      let r = idx;
      while (r === idx) r = Math.floor(Math.random() * playable.length);
      return playAt(r);
    }
    playAt(idx + d);
  }, [idx, playable.length, playAt, prefs.shuffle]);

  // Advance when a track ends.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => { if (prefs.loop || idx < playable.length - 1) skip(1); else setPlaying(false); };
    const onErr = () => setErr("Couldn't decode that track.");
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onErr);
    return () => { a.removeEventListener("ended", onEnd); a.removeEventListener("error", onErr); };
  }, [skip, prefs.loop, idx, playable.length]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = prefs.volume; }, [prefs.volume]);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const addUrl = useCallback(raw => {
    const url = (raw || "").trim();
    if (!url) return;
    const kind = kindOfUrl(url);
    setList(l => [...l, { id: `u${Date.now()}`, title: titleFromUrl(url), url, kind, src: "url" }]);
  }, []);

  // Accepts a plain file list (button/drop) or a whole folder (webkitdirectory
  // input, desktop only). Either way: any image files in the batch are treated
  // as album art and inherited by every audio file that shares their folder —
  // "drop a folder of MP3s + one cover.jpg" makes every track in it show that
  // cover, without asking the user to tag each file individually.
  //
  // Storage durability: tracks live in IndexedDB, which the browser is
  // allowed to evict under disk pressure unless the origin has been granted
  // "persistent" storage — so every add attempts that grant (best-effort,
  // silently ignored where unsupported/denied, e.g. Safari private
  // browsing where IndexedDB may not work at all). We also check the quota
  // estimate up front so a too-big batch fails with a clear message instead
  // of partway through with a vague one. None of this helps across devices —
  // this storage is local to the one browser it was added in, with no cloud
  // backup, so switching phones or clearing site data loses it.
  const addFiles = useCallback(async files => {
    const arr = [...files];
    const dirOf = f => (f.webkitRelativePath || "").split("/").slice(0, -1).join("/");
    const images = arr.filter(f => IMAGE_TYPES.test(f.type));
    const audio = arr.filter(f => !IMAGE_TYPES.test(f.type));
    if (!audio.length && images.length) { setErr("That's just image files — add the audio tracks too."); return; }
    if (navigator.storage?.persist) { try { await navigator.storage.persist(); } catch {} }
    if (navigator.storage?.estimate) {
      try {
        const { quota, usage } = await navigator.storage.estimate();
        const totalBytes = audio.reduce((s, f) => s + f.size, 0);
        if (quota && (usage + totalBytes) > quota * 0.95) {
          setErr("Not enough device storage left for that — free up space or add fewer/smaller files.");
          return;
        }
      } catch {}
    }
    const soleCover = images.length === 1 ? images[0] : null;
    const added = [];
    for (const f of audio) {
      const id = `f${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const ok = await putTrack(id, f);
      if (!ok) { setErr("Couldn't save that file for offline play — storage may be full or unavailable in this browsing mode."); continue; }
      const cover = images.find(im => dirOf(im) === dirOf(f)) || soleCover;
      if (cover) await putCover(id, cover);
      added.push({ id, title: f.name.replace(/\.[^.]+$/, "").slice(0, 60), kind: "file", src: "idb", size: f.size, mime: f.type || "", hasCover: !!cover });
    }
    if (added.length) setList(l => [...l, ...added]);
  }, []);

  const remove = useCallback(id => {
    setList(l => l.filter(t => t.id !== id));
    setPlaylists(pls => pls.map(p => ({ ...p, trackIds: p.trackIds.filter(x => x !== id) })));
    deleteTrack(id);
    deleteCover(id);
  }, []);

  const toggleGlobal = useCallback(id => {
    setList(l => l.map(t => t.id === id ? { ...t, global: !t.global } : t));
  }, []);

  // Playlists are just named subsets of your own on-device library — no
  // separate storage for audio, just which track ids belong to which list.
  const createPlaylist = useCallback((name, trackIds = []) => {
    const id = `pl${Date.now()}`;
    setPlaylists(pls => [...pls, { id, name: (name || "New playlist").slice(0, 40), trackIds }]);
    return id;
  }, []);
  const renamePlaylist = useCallback((id, name) => setPlaylists(pls => pls.map(p => p.id === id ? { ...p, name: (name || p.name).slice(0, 40) } : p)), []);
  const deletePlaylist = useCallback(id => {
    setPlaylists(pls => pls.filter(p => p.id !== id));
    setActivePlaylistId(a => a === id ? null : a);
  }, []);
  const toggleInPlaylist = useCallback((playlistId, trackId) => {
    setPlaylists(pls => pls.map(p => p.id !== playlistId ? p : { ...p, trackIds: p.trackIds.includes(trackId) ? p.trackIds.filter(x => x !== trackId) : [...p.trackIds, trackId] }));
  }, []);
  const playPlaylist = useCallback(id => {
    setActivePlaylistId(id);
    setIdx(-1); setPlaying(false);
  }, []);
  const clearActivePlaylist = useCallback(() => { setActivePlaylistId(null); setIdx(-1); setPlaying(false); }, []);

  const currentIsVideo = !!current && /^video\//.test(current.mime || "");

  return { list, setList, prefs, setPrefs, idx, playing, current, next, err, playAt, toggle, skip, addUrl, addFiles, remove, toggleGlobal, playable, allPlayable, playlists, activePlaylist, createPlaylist, renamePlaylist, deletePlaylist, toggleInPlaylist, playPlaylist, clearActivePlaylist, mediaRef, analyserRef, ensureAnalyser, currentIsVideo };
}

export const VISUALIZER_STYLES = [
  { id: "bars", name: "Bars", desc: "Classic frequency bars" },
  { id: "wave", name: "Waveform", desc: "Oscilloscope line" },
  { id: "circle", name: "Radial", desc: "Bars ringing a center" },
  { id: "pulse", name: "Pulse", desc: "One breathing blob" },
];

/**
 * Visualiser driven by real amplitude data from the Web Audio analyser, in
 * one of a few purely cosmetic drawing styles. If the analyser couldn't be
 * created (older browser, blocked AudioContext) every style falls back to a
 * calm idle animation rather than showing nothing — so the panel never looks
 * broken.
 */
function MusicVisualizer({ music, height = 56, style = "bars" }) {
  const T = useT();
  const ref = useRef(null);
  const { analyserRef, playing } = music;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf, run = true, t = 0;
    const fit = () => { const r = cv.getBoundingClientRect(); cv.width = r.width; cv.height = height; };
    fit();
    window.addEventListener("resize", fit);
    const BARS = 32;
    const sample = () => {
      const an = analyserRef.current;
      if (an) { const data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data); return data; }
      return null;
    };
    const timeSample = () => {
      const an = analyserRef.current;
      if (an) { const data = new Uint8Array(an.fftSize); an.getByteTimeDomainData(data); return data; }
      return null;
    };
    const drawBars = data => {
      const bw = cv.width / BARS;
      for (let i = 0; i < BARS; i++) {
        let v = data ? (data[Math.floor(i * data.length / BARS)] || 0) / 255 : (playing ? 0.18 + Math.abs(Math.sin(t + i * 0.35)) * 0.22 : 0.06);
        const h = Math.max(2, v * cv.height);
        ctx.fillStyle = i % 3 === 0 ? T.accent : T.alt;
        ctx.globalAlpha = 0.55 + v * 0.45;
        ctx.fillRect(i * bw + 1, cv.height - h, bw - 2, h);
      }
      ctx.globalAlpha = 1;
    };
    const drawWave = () => {
      const data = timeSample();
      ctx.lineWidth = 2; ctx.strokeStyle = T.accent; ctx.beginPath();
      const N = data ? data.length : 64;
      for (let i = 0; i < N; i++) {
        const v = data ? data[i] / 128 - 1 : (playing ? Math.sin(t * 2 + i * 0.3) * 0.5 : Math.sin(i * 0.4) * 0.05);
        const x = (i / (N - 1)) * cv.width, y = cv.height / 2 + v * (cv.height / 2 - 3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    const drawCircle = data => {
      const cx = cv.width / 2, cy = cv.height / 2, base = Math.min(cv.width, cv.height) * 0.18;
      for (let i = 0; i < BARS; i++) {
        let v = data ? (data[Math.floor(i * data.length / BARS)] || 0) / 255 : (playing ? 0.2 + Math.abs(Math.sin(t + i * 0.4)) * 0.2 : 0.05);
        const len = base * 0.6 + v * base * 1.4;
        const a = (i / BARS) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * base, y1 = cy + Math.sin(a) * base;
        const x2 = cx + Math.cos(a) * (base + len), y2 = cy + Math.sin(a) * (base + len);
        ctx.strokeStyle = i % 3 === 0 ? T.accent : T.alt;
        ctx.globalAlpha = 0.55 + v * 0.45; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    const drawPulse = data => {
      let v = 0.15;
      if (data) { let sum = 0; for (const d of data) sum += d; v = (sum / data.length) / 255; }
      else if (playing) v = 0.25 + Math.abs(Math.sin(t)) * 0.25;
      const cx = cv.width / 2, cy = cv.height / 2, r = Math.min(cv.width, cv.height) * (0.22 + v * 0.55);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, T.accent); grad.addColorStop(1, T.alt);
      ctx.globalAlpha = 0.75; ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    const draw = () => {
      if (!run) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      t += 0.05;
      if (style === "wave") drawWave();
      else if (style === "circle") drawCircle(sample());
      else if (style === "pulse") drawPulse(sample());
      else drawBars(sample());
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { run = false; cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, [analyserRef, playing, height, style, T.accent, T.alt]);
  return <canvas ref={ref} aria-hidden="true" style={{ width: "100%", height, display: "block", borderRadius: 10 }} />;
}

/** Small lazy-loaded cover-art thumbnail for a track that has one stored. */
function CoverThumb({ trackId, size = 32, radius = 8 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let obj = null, cancelled = false;
    getCover(trackId).then(blob => {
      if (cancelled || !blob) return;
      obj = URL.createObjectURL(blob);
      setUrl(obj);
    });
    return () => { cancelled = true; if (obj) URL.revokeObjectURL(obj); };
  }, [trackId]);
  if (!url) return null;
  return <img src={url} alt="" aria-hidden="true" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }} />;
}

/** Big square cover-art stage shown for a non-video track that has art. */
function CoverStage({ music }) {
  const T = useT();
  const { current } = music;
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!current?.hasCover) { setUrl(null); return; }
    let obj = null, cancelled = false;
    getCover(current.id).then(blob => {
      if (cancelled || !blob) return;
      obj = URL.createObjectURL(blob);
      setUrl(obj);
    });
    return () => { cancelled = true; if (obj) URL.revokeObjectURL(obj); };
  }, [current?.id, current?.hasCover]);
  if (!url) return null;
  return (
    <div className="w-full rounded-xl overflow-hidden mb-2" style={{ aspectRatio: "1/1", maxHeight: 220, background: T.card, border: `2.5px solid ${T.ink}` }}>
      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

/**
 * Re-parents the persistent media element into the sheet so a video track is
 * actually visible, and puts it back on unmount so audio keeps playing after
 * the sheet closes.
 */
function VideoStage({ music }) {
  const T = useT();
  const host = useRef(null);
  const { mediaRef } = music;
  useEffect(() => {
    const el = mediaRef.current, box = host.current;
    if (!el || !box) return;
    el.style.width = "100%"; el.style.height = "100%"; el.style.objectFit = "contain";
    box.appendChild(el);
    return () => { if (el.parentNode === box) box.removeChild(el); };
  }, [mediaRef]);
  return <div ref={host} className="w-full rounded-xl overflow-hidden mb-2" style={{ aspectRatio: "16/9", background: "#000", border: `2.5px solid ${T.ink}` }} />;
}

/** Slim now-playing ticker — sits with the ad rail at the bottom of the app. */
export function MusicTicker({ music, onOpen }) {
  const T = useT();
  if (!music.prefs.ticker || !music.current) return null;
  return (
    <button onClick={onOpen} aria-label={`Now playing ${music.current.title}. Open music player.`}
      className="lok-btn w-full flex items-center gap-2 px-3 py-1 text-[11px] font-bold overflow-hidden"
      style={{ background: T.ink, color: T.paper, borderTop: `2px solid ${T.accent}` }}>
      <span aria-hidden="true" style={{ color: T.accent }}>{music.playing ? "♪" : "❚❚"}</span>
      <span className="truncate">{music.current.title}</span>
      {music.next && music.next.id !== music.current.id && (
        <span className="ml-auto shrink-0 opacity-60 truncate" style={{ maxWidth: "45%" }}>next · {music.next.title}</span>
      )}
    </button>
  );
}

/** Full player sheet: plug in files or links, queue, transport, preferences. */
export function MusicSheet({ music, onClose, say, devMode = false }) {
  const T = useT();
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const supportsFolder = typeof document !== "undefined" && "webkitdirectory" in document.createElement("input");
  const { list, prefs, setPrefs, idx, playing, playable, err, allPlayable, playlists, activePlaylist, createPlaylist, deletePlaylist, playPlaylist, clearActivePlaylist, toggleInPlaylist } = music;
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [picked, setPicked] = useState(() => new Set());

  const linkOuts = list.filter(t => t.kind !== "file");
  const startCreate = () => { setCreating(true); setNewName(""); setPicked(new Set()); };
  const finishCreate = () => {
    if (!picked.size) { say?.("Pick at least one track", "error"); return; }
    createPlaylist(newName, [...picked]);
    say?.(`Playlist "${newName || "New playlist"}" created`, "success");
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center" style={{ background: "rgba(0,0,0,.35)" }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5 overflow-y-auto overscroll-contain" style={{ maxWidth: 560, maxHeight: "85vh", background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between mb-3 pb-1 -mt-5 -mx-5 px-5 pt-5" style={{ background: T.card, zIndex: 1 }}>
          <div className="lok-display text-lg font-extrabold">🎵 Music</div>
          <button onClick={onClose} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{ border: `2.5px solid ${T.ink}` }} aria-label="Close music player">✕</button>
        </div>

        <div className="p-3 rounded-2xl mb-2" style={{ border: `3px solid ${T.ink}`, background: T.paper }}>
          <div className="lok-display font-extrabold text-sm">Plug in your music</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug">Add MP3/M4A/MP4/WAV/FLAC files — they're stored on-device and keep playing offline. Select an album's cover image alongside its tracks (or a whole folder) and every track in it picks up that cover. Streaming links are saved as shortcuts.</div>
          <div className="mt-2 flex gap-1.5">
            <button onClick={() => fileRef.current?.click()} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold text-sm" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}` }}>＋ Add files</button>
            {supportsFolder && <button onClick={() => folderRef.current?.click()} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold text-sm" style={{ background: T.card, color: T.ink, border: `3px solid ${T.ink}` }}>＋ Add a folder</button>}
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED + ",image/png,image/jpeg,image/webp,image/gif"} multiple hidden aria-hidden="true"
            onChange={async e => { const f = [...(e.target.files || [])]; e.target.value = ""; if (!f.length) return; await music.addFiles(f); say && say(`${f.length} file${f.length > 1 ? "s" : ""} added`, "success"); }} />
          {supportsFolder && <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple hidden aria-hidden="true"
            onChange={async e => { const f = [...(e.target.files || [])]; e.target.value = ""; if (!f.length) return; await music.addFiles(f); say && say(`Folder added (${f.length} file${f.length > 1 ? "s" : ""})`, "success"); }} />}
          <div className="mt-2 flex gap-1.5">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="…or paste an album / track link" aria-label="Music URL"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.card, color: T.ink }}
              onKeyDown={e => { if (e.key === "Enter" && url.trim()) { music.addUrl(url); setUrl(""); say && say("Link added"); } }} />
            <button onClick={() => { if (url.trim()) { music.addUrl(url); setUrl(""); say && say("Link added"); } }} className="lok-btn shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{ background: T.ink, color: T.paper }}>Add</button>
          </div>
        </div>

        {err && <div className="px-3 py-2 rounded-xl mb-2 text-xs font-bold" style={{ background: "#C23B22", color: "#fff" }}>{err}</div>}

        <div className="p-3 rounded-2xl mb-2" style={{ border: `2px solid ${T.shadow}`, background: T.paper }}>
          {music.currentIsVideo && <VideoStage music={music} />}
          {!music.currentIsVideo && <CoverStage music={music} />}
          {prefs.visualizer !== false && (<div className="mb-2">
            <MusicVisualizer music={music} style={prefs.visualizerStyle} />
            <div className="mt-1.5 flex gap-1.5">
              {VISUALIZER_STYLES.map(v => (
                <button key={v.id} onClick={() => setPrefs(p => ({ ...p, visualizerStyle: v.id }))} aria-pressed={prefs.visualizerStyle === v.id}
                  className="lok-btn px-2 py-1 rounded-full text-[10px] font-extrabold" title={v.desc}
                  style={{ border: `2px solid ${T.ink}`, background: prefs.visualizerStyle === v.id ? T.ink : T.card, color: prefs.visualizerStyle === v.id ? T.paper : T.ink }}>{v.name}</button>
              ))}
            </div>
            {music.current && <div className="flex items-center gap-1.5 text-[11px] font-bold truncate mt-1" style={{ color: T.ink }}>
              {music.current.hasCover && <CoverThumb trackId={music.current.id} size={18} radius={4} />}
              <span className="truncate">{music.playing ? "♪ " : "❚❚ "}{music.current.title}</span>
            </div>}
          </div>)}
          <div className="flex items-center gap-2">
            <button onClick={() => music.skip(-1)} disabled={!playable.length} aria-label="Previous track" className="lok-btn w-10 h-10 rounded-full font-extrabold" style={{ border: `2.5px solid ${T.ink}`, background: T.card, opacity: playable.length ? 1 : .4 }}>◀◀</button>
            <button onClick={music.toggle} disabled={!playable.length} aria-label={playing ? "Pause" : "Play"} className="lok-btn flex-1 py-2.5 rounded-xl lok-display font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}`, opacity: playable.length ? 1 : .4 }}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
            <button onClick={() => music.skip(1)} disabled={!playable.length} aria-label="Next track" className="lok-btn w-10 h-10 rounded-full font-extrabold" style={{ border: `2.5px solid ${T.ink}`, background: T.card, opacity: playable.length ? 1 : .4 }}>▶▶</button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold">
            <button type="button" onClick={() => setPrefs(p => ({ ...p, volume: p.volume > 0 ? 0 : 0.8 }))} aria-label={prefs.volume > 0 ? "Mute music" : "Unmute music"} className="lok-btn w-7 h-7 rounded-full shrink-0" style={{ border: `2px solid ${T.ink}`, background: T.card }}>{prefs.volume === 0 ? "🔇" : prefs.volume < 0.5 ? "🔉" : "🔊"}</button>
            <input type="range" min="0" max="1" step="0.05" value={prefs.volume} onChange={e => setPrefs(p => ({ ...p, volume: +e.target.value }))} className="flex-1" style={{ accentColor: T.accent }} aria-label="Music volume" />
            <span className="tabular-nums opacity-60 w-8 text-right">{Math.round(prefs.volume * 100)}</span>
          </label>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs font-bold">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={prefs.shuffle} onChange={e => setPrefs(p => ({ ...p, shuffle: e.target.checked }))} style={{ accentColor: T.accent }} />Shuffle</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={prefs.loop} onChange={e => setPrefs(p => ({ ...p, loop: e.target.checked }))} style={{ accentColor: T.accent }} />Loop queue</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={prefs.ticker} onChange={e => setPrefs(p => ({ ...p, ticker: e.target.checked }))} style={{ accentColor: T.accent }} />Now-playing bar</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={prefs.visualizer !== false} onChange={e => setPrefs(p => ({ ...p, visualizer: e.target.checked }))} style={{ accentColor: T.accent }} />Visualiser</label>
          </div>
        </div>

        <div className="p-3 rounded-2xl mb-2" style={{ border: `2px solid ${T.shadow}`, background: T.paper }}>
          <div className="flex items-center justify-between mb-1">
            <div className="lok-display font-extrabold text-sm">Playlists</div>
            {!creating && <button onClick={startCreate} className="lok-btn px-2.5 py-1 rounded-full text-xs font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `2px solid ${T.ink}` }}>＋ New</button>}
          </div>
          {activePlaylist && <div className="mb-1.5 flex items-center gap-2 text-xs font-bold"><span>Playing: {activePlaylist.name}</span><button onClick={clearActivePlaylist} className="lok-btn underline opacity-60">back to full queue</button></div>}
          {!creating ? (<>
            {playlists.length === 0 && <div className="text-xs opacity-50 py-1">No playlists yet — group your own tracks into one.</div>}
            {playlists.map(p => (<div key={p.id} className="flex items-center gap-2 py-1">
              <button onClick={() => playPlaylist(p.id)} aria-pressed={activePlaylist?.id === p.id} className="lok-btn flex-1 text-left px-2 py-1.5 rounded-xl text-sm font-bold" style={{ border: `2px solid ${activePlaylist?.id === p.id ? T.accent : T.ink}`, background: activePlaylist?.id === p.id ? T.ink : T.card, color: activePlaylist?.id === p.id ? T.paper : T.ink }}>▶ {p.name} <span className="opacity-60 font-normal">· {p.trackIds.length}</span></button>
              <button onClick={() => deletePlaylist(p.id)} aria-label={`Delete playlist ${p.name}`} className="lok-btn text-xs font-bold opacity-60 px-1.5">✕</button>
            </div>))}
          </>) : (<div className="mt-1">
            <input value={newName} onChange={e => setNewName(e.target.value.slice(0, 40))} placeholder="Playlist name" aria-label="New playlist name" autoFocus className="w-full px-3 py-2 rounded-xl font-bold text-sm mb-2" style={{ border: `2.5px solid ${T.ink}`, background: T.card, color: T.ink }} />
            {allPlayable.length === 0 ? <div className="text-xs opacity-50 py-1">Add some tracks first.</div> : allPlayable.map(t => (
              <label key={t.id} className="flex items-center gap-2 py-1 text-sm font-bold"><input type="checkbox" checked={picked.has(t.id)} onChange={e => setPicked(s => { const n = new Set(s); e.target.checked ? n.add(t.id) : n.delete(t.id); return n; })} style={{ accentColor: T.accent }} />{t.title}</label>
            ))}
            <div className="mt-2 flex gap-2">
              <button onClick={() => setCreating(false)} className="lok-btn flex-1 py-2 rounded-xl text-sm font-bold" style={{ border: `2.5px solid ${T.ink}` }}>Cancel</button>
              <button onClick={finishCreate} className="lok-btn flex-1 lok-display py-2 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}` }}>Create</button>
            </div>
          </div>)}
        </div>

        {devMode && (
          <div className="p-3 rounded-2xl mb-2" style={{ border: `2px dashed ${T.accent}`, background: T.paper }}>
            <div className="lok-display font-extrabold text-sm">Dev: global songs</div>
            <div className="text-[11px] opacity-70 mt-0.5 leading-snug">Mark any track below "Global" and it stays in the queue no matter which playlist is active — an always-on set that keeps running through. This is local to this device only, not shared to other users.</div>
          </div>
        )}
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Queue ({playable.length}{activePlaylist ? ` · ${activePlaylist.name}` : ""})</div>
        {playable.length === 0 && <div className="text-xs opacity-50 py-3 text-center">Nothing queued yet — add a file above.</div>}
        {playable.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl mb-1" style={{ border: `2px solid ${i === idx ? T.accent : T.shadow}`, background: i === idx ? T.card : "transparent" }}>
            <button onClick={() => music.playAt(i)} aria-label={`Play ${t.title}`} className="lok-btn shrink-0 w-8 h-8 rounded-full font-bold" style={{ border: `2px solid ${T.ink}`, background: T.card }}>{i === idx && playing ? "❚❚" : "▶"}</button>
            {t.hasCover && <CoverThumb trackId={t.id} />}
            <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{t.title}{t.global && <span className="ml-1.5 text-[9px] font-extrabold uppercase align-middle" style={{ color: T.accent }}>GLOBAL</span>}</div><div className="text-[10px] opacity-50">{t.src === "idb" ? "on device · offline ready" : "link"}</div></div>
            {devMode && <button onClick={() => music.toggleGlobal(t.id)} aria-pressed={!!t.global} aria-label={`${t.global ? "Unset" : "Set"} ${t.title} as global`} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-extrabold" style={{ border: `2px solid ${T.ink}`, background: t.global ? T.accent : T.card, color: t.global ? T.onAccent : T.ink }}>{t.global ? "★" : "☆"}</button>}
            <button onClick={() => music.remove(t.id)} aria-label={`Remove ${t.title}`} className="lok-btn shrink-0 text-xs font-bold opacity-60 px-1.5">✕</button>
          </div>
        ))}

        {linkOuts.length > 0 && (<>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-3 mb-1">Streaming links ({linkOuts.length})</div>
          <div className="text-[10px] opacity-60 mb-1.5 leading-snug">Spotify, YouTube and SoundCloud don't allow direct playback in an app like this — these open in a new tab.</div>
          {linkOuts.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl mb-1" style={{ border: `2px solid ${T.shadow}` }}>
              <span className="shrink-0 text-xs font-extrabold" style={{ color: T.alt }}>{t.kind === "youtube" ? "▶ YT" : t.kind === "spotify" ? "♫ SP" : t.kind === "soundcloud" ? "☁ SC" : "🔗"}</span>
              <a href={t.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 font-bold text-sm truncate underline" style={{ color: T.ink }}>{t.title}</a>
              <button onClick={() => music.remove(t.id)} aria-label={`Remove ${t.title}`} className="lok-btn shrink-0 text-xs font-bold opacity-60 px-1.5">✕</button>
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
}
