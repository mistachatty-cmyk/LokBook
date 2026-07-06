import { useEffect, useRef } from "react";
import { supabase } from "../supabaseClient.js";

// One Supabase Realtime channel per open room: broadcast for stroke events,
// presence for the member list + live cursors. The strokes table is the source
// of truth; broadcast is just low-latency sugar.
export function useRoomChannel({ roomId, userId, name, role, enabled, onProg, onCommit, onDel, onPermReq, onPermGrant, onPresence }) {
  const chRef = useRef(null);
  const cb = useRef({});
  cb.current = { onProg, onCommit, onDel, onPermReq, onPermGrant, onPresence };

  useEffect(() => {
    if (!enabled || !roomId) return;
    let ch;
    try {
      ch = supabase.channel("lokroom:" + roomId, { config: { broadcast: { self: false }, presence: { key: userId } } });
      ch.on("broadcast", { event: "s.prog" }, ({ payload }) => cb.current.onProg?.(payload));
      ch.on("broadcast", { event: "s.commit" }, ({ payload }) => cb.current.onCommit?.(payload));
      ch.on("broadcast", { event: "s.del" }, ({ payload }) => cb.current.onDel?.(payload));
      ch.on("broadcast", { event: "perm.req" }, ({ payload }) => cb.current.onPermReq?.(payload));
      ch.on("broadcast", { event: "perm.grant" }, ({ payload }) => cb.current.onPermGrant?.(payload));
      ch.on("presence", { event: "sync" }, () => cb.current.onPresence?.(ch.presenceState()));
      ch.subscribe(status => { if (status === "SUBSCRIBED") { try { ch.track({ name, role }); } catch {} } });
      chRef.current = ch;
    } catch (e) { console.warn("room channel unavailable", e); }
    return () => { try { ch?.unsubscribe(); } catch {} chRef.current = null; };
  }, [roomId, enabled, userId]);

  // keep presence role fresh after grants
  useEffect(() => { try { chRef.current?.track({ name, role }); } catch {} }, [role, name]);

  return {
    send: (event, payload) => { try { chRef.current?.send({ type: "broadcast", event, payload }); } catch {} },
    track: state => { try { chRef.current?.track(state); } catch {} },
  };
}
