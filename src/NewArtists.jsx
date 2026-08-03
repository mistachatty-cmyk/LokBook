import { useState, useEffect, useCallback } from "react";
import { useT } from "./theme/theme.js";
import NameTag from "./NameTag.jsx";
import { renderAvatar } from "./engine/draw.jsx";
import { fetchNewestArtists, fetchRandomOlderArtists, BOARD_SIZE } from "./engine/profiles.js";

/**
 * Artist discovery board.
 *
 * The newest BOARD_SIZE (200) accounts are listed newest-first. Once an artist
 * is pushed past #200 they leave the board, but they aren't gone — they drop
 * into a random pull you can reshuffle, so older accounts stay discoverable
 * instead of disappearing entirely.
 */
export default function NewArtists({ onArtist, myHandle, say }) {
  const T = useT();
  const [newest, setNewest] = useState(null);
  const [pull, setPull] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setErr("");
    try {
      const rows = await fetchNewestArtists(BOARD_SIZE);
      setNewest(rows);
      if (!rows.length) setErr("No accounts yet — be the first to sign in.");
    } catch { setErr("Couldn't reach the artist directory."); setNewest([]); }
    setBusy(false);
  }, []);

  const reshuffle = useCallback(async () => {
    setBusy(true);
    try {
      const rows = await fetchRandomOlderArtists(6);
      setPull(rows);
      if (!rows.length) say && say("No one has dropped off the board yet");
    } catch { say && say("Couldn't pull older artists", "error"); }
    setBusy(false);
  }, [say]);

  useEffect(() => { load(); reshuffle(); }, [load, reshuffle]);

  const Row = ({ a }) => (
    <button onClick={() => onArtist && onArtist(a.handle)} className="lok-btn w-full text-left p-2 rounded-xl flex items-center gap-2"
      style={{ border: `2px solid ${a.handle === myHandle ? T.accent : T.ink}`, background: T.card }}>
      <img src={renderAvatar(a.avatar_seed || a.handle.length * 31)} alt="" className="w-8 h-8 rounded-full shrink-0" style={{ border: `2px solid ${T.ink}` }} />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm truncate"><NameTag name={a.display_name || a.handle} />{a.handle === myHandle && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded align-middle" style={{ background: T.accent, color: T.onAccent }}>YOU</span>}</div>
        <div className="text-[10px] opacity-60 truncate">{a.flips || 0} flips · Lv {a.level || 1}</div>
      </div>
      <span className="text-xs font-bold shrink-0" style={{ color: T.accent }}>View ▸</span>
    </button>
  );

  return (
    <div className="mt-4">
      <h2 className="lok-display text-lg font-extrabold">New artists</h2>
      <p className="text-sm opacity-70 mt-0.5">The {BOARD_SIZE} most recent accounts. Drop off the board and you fall into the random pull below.</p>

      {err && <div className="mt-3 text-xs opacity-60 py-3 text-center">{err}</div>}

      {newest === null && !err && <div className="mt-3 text-xs opacity-50 py-4 text-center">loading the directory…</div>}

      {newest && newest.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {newest.map((a, i) => (
            <div key={a.user_id} className="flex items-center gap-2">
              <span className="lok-display text-[10px] font-extrabold w-6 text-right opacity-40 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0"><Row a={a} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <h3 className="lok-display text-base font-extrabold flex-1">🎲 Random pull</h3>
        <button onClick={reshuffle} disabled={busy} className="lok-btn px-3 py-1.5 rounded-full text-xs font-extrabold"
          style={{ border: `2.5px solid ${T.ink}`, background: T.card, color: T.ink, opacity: busy ? .6 : 1 }}>Reshuffle</button>
      </div>
      <p className="text-xs opacity-60 mt-0.5">Artists who've aged past #{BOARD_SIZE}. Tap one to visit them.</p>
      {pull.length === 0
        ? <div className="mt-2 text-xs opacity-50 py-3 text-center">Nobody's aged off the board yet.</div>
        : <div className="mt-2 flex flex-col gap-1.5">{pull.map(a => <Row key={a.user_id} a={a} />)}</div>}
    </div>
  );
}
