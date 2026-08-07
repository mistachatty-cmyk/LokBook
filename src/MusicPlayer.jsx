import { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "./theme/theme.js";
import { putTrack, getTrack, deleteTrack, ACCEPTED, kindOfUrl, titleFromUrl } from "./engine/musicStore.js";

const LIST_KEY = "lok:music:list";
const PREF_KEY = "lok:music:prefs";
const PLAYLISTS_KEY = "lok:music:playlists";

const loadList = () => { try { return JSON.parse(localStorage.getItem(LIST_KEY) || "[]"); } catch { return []; } };
const loadPrefs = () => { try { return { ticker: true, shuffle: false, loop: true, volume: 0.8, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; } catch { return { ticker: true, shuffle: false, loop: true, volume: 0.8 }; } };
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
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {} }, [list]);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} }, [prefs]);
  useEffect(() => { try { localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists)); } catch {} }, [playlists]);

  if (!audioRef.current && typeof Audio !== "undefined") audioRef.current = new Audio();

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;
  const allPlayable = list.filter(t => t.kind === "file");
  const playable = activePlaylist ? allPlayable.filter(t => activePlaylist.trackIds.includes(t.id)) : allPlayable;
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

  const playAt = useCallback(async i => {
    const a = audioRef.current;
    if (!a || !playable.length) return;
    const n = ((i % playable.length) + playable.length) % playable.length;
    const src = await srcFor(playable[n]);
    if (!src) { setErr("That track's data is missing — re-add the file."); return; }
    setErr("");
    a.src = src;
    a.volume = prefs.volume;
    try { await a.play(); setIdx(n); setPlaying(true); }
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

  const addFiles = useCallback(async files => {
    for (const f of files) {
      const id = `f${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const ok = await putTrack(id, f);
      if (!ok) { setErr("Couldn't save that file for offline play."); continue; }
      setList(l => [...l, { id, title: f.name.replace(/\.[^.]+$/, "").slice(0, 60), kind: "file", src: "idb", size: f.size }]);
    }
  }, []);

  const remove = useCallback(id => {
    setList(l => l.filter(t => t.id !== id));
    setPlaylists(pls => pls.map(p => ({ ...p, trackIds: p.trackIds.filter(x => x !== id) })));
    deleteTrack(id);
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

  return { list, setList, prefs, setPrefs, idx, playing, current, next, err, playAt, toggle, skip, addUrl, addFiles, remove, playable, allPlayable, playlists, activePlaylist, createPlaylist, renamePlaylist, deletePlaylist, toggleInPlaylist, playPlaylist, clearActivePlaylist };
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
export function MusicSheet({ music, onClose, say }) {
  const T = useT();
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);
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
          <div className="text-xs opacity-70 mt-0.5 leading-snug">Add MP3/M4A/MP4/WAV/FLAC files — they're stored on-device and keep playing offline. Streaming links are saved as shortcuts.</div>
          <button onClick={() => fileRef.current?.click()} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}` }}>＋ Add files from this device</button>
          <input ref={fileRef} type="file" accept={ACCEPTED} multiple hidden aria-hidden="true"
            onChange={async e => { const f = [...(e.target.files || [])]; e.target.value = ""; if (!f.length) return; await music.addFiles(f); say && say(`${f.length} track${f.length > 1 ? "s" : ""} added`, "success"); }} />
          <div className="mt-2 flex gap-1.5">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="…or paste an album / track link" aria-label="Music URL"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.card, color: T.ink }}
              onKeyDown={e => { if (e.key === "Enter" && url.trim()) { music.addUrl(url); setUrl(""); say && say("Link added"); } }} />
            <button onClick={() => { if (url.trim()) { music.addUrl(url); setUrl(""); say && say("Link added"); } }} className="lok-btn shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{ background: T.ink, color: T.paper }}>Add</button>
          </div>
        </div>

        {err && <div className="px-3 py-2 rounded-xl mb-2 text-xs font-bold" style={{ background: "#C23B22", color: "#fff" }}>{err}</div>}

        <div className="p-3 rounded-2xl mb-2" style={{ border: `2px solid ${T.shadow}`, background: T.paper }}>
          <div className="flex items-center gap-2">
            <button onClick={() => music.skip(-1)} disabled={!playable.length} aria-label="Previous track" className="lok-btn w-10 h-10 rounded-full font-extrabold" style={{ border: `2.5px solid ${T.ink}`, background: T.card, opacity: playable.length ? 1 : .4 }}>◀◀</button>
            <button onClick={music.toggle} disabled={!playable.length} aria-label={playing ? "Pause" : "Play"} className="lok-btn flex-1 py-2.5 rounded-xl lok-display font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}`, opacity: playable.length ? 1 : .4 }}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
            <button onClick={() => music.skip(1)} disabled={!playable.length} aria-label="Next track" className="lok-btn w-10 h-10 rounded-full font-extrabold" style={{ border: `2.5px solid ${T.ink}`, background: T.card, opacity: playable.length ? 1 : .4 }}>▶▶</button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold">Volume<input type="range" min="0" max="1" step="0.05" value={prefs.volume} onChange={e => setPrefs(p => ({ ...p, volume: +e.target.value }))} className="flex-1" style={{ accentColor: T.accent }} aria-label="Volume" /></label>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs font-bold">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={prefs.shuffle} onChange={e => setPrefs(p => ({ ...p, shuffle: e.target.checked }))} style={{ accentColor: T.accent }} />Shuffle</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={prefs.loop} onChange={e => setPrefs(p => ({ ...p, loop: e.target.checked }))} style={{ accentColor: T.accent }} />Loop queue</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={prefs.ticker} onChange={e => setPrefs(p => ({ ...p, ticker: e.target.checked }))} style={{ accentColor: T.accent }} />Now-playing bar</label>
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

        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Queue ({playable.length}{activePlaylist ? ` · ${activePlaylist.name}` : ""})</div>
        {playable.length === 0 && <div className="text-xs opacity-50 py-3 text-center">Nothing queued yet — add a file above.</div>}
        {playable.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl mb-1" style={{ border: `2px solid ${i === idx ? T.accent : T.shadow}`, background: i === idx ? T.card : "transparent" }}>
            <button onClick={() => music.playAt(i)} aria-label={`Play ${t.title}`} className="lok-btn shrink-0 w-8 h-8 rounded-full font-bold" style={{ border: `2px solid ${T.ink}`, background: T.card }}>{i === idx && playing ? "❚❚" : "▶"}</button>
            <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{t.title}</div><div className="text-[10px] opacity-50">{t.src === "idb" ? "on device · offline ready" : "link"}</div></div>
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
