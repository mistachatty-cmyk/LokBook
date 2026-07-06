import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useT, ART, THEMES } from "../theme/theme.js";
import { roomsApi } from "../rooms/api.js";
import { CHUNK, ChunkIndex, makeCamera, screenToWorld, encodePoints, decodePoints, chunkKey, newRoomCode, normalizeCode, newStrokeId } from "../rooms/world.js";
import { useRoomChannel } from "../rooms/useRoomChannel.js";
import { PROC_STAMPS, drawStampCard, stampBB, STAMP_W, STAMP_H } from "../rooms/stamps.js";
import { MiniDraw, compressFrame, renderAvatar } from "../engine/draw.jsx";
import EmptyState from "../EmptyState.jsx";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SWATCHES = ["#23306B", "#FF5DA2", "#2FA9A0", "#E8B14B", "#7A4FBF", "#3E8E4B", "#D94040", "#FF8C42", "#4EBFFF", "#5A5A5A"];
const BLEEP_ICONS = ["💧", "♥", "✦", "☺", "!!"];

// ---------- live stamp preview (lobby/picker) ----------
function StampPreview({ stamp, size = 72 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf, run = true;
    const draw = now => {
      if (!run) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save(); ctx.scale(cv.width / STAMP_W, cv.height / STAMP_H);
      ctx.fillStyle = ART.paper; ctx.fillRect(0, 0, STAMP_W, STAMP_H);
      const t = (now % stamp.loopMs) / stamp.loopMs;
      try { stamp.painter(ctx, reduceMotion ? 0.5 : t, t * 12); } catch {}
      ctx.restore();
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { run = false; cancelAnimationFrame(raf); };
  }, [stamp]);
  return <canvas ref={ref} width={size} height={Math.round(size * 1.25)} className="rounded-lg" style={{ width: size, height: size * 1.25 }} />;
}

// ---------- the infinite canvas ----------
function RoomCanvas({ room, userId, userName, say, onClose, onArtist, blip, hap }) {
  const T = useT();
  const wrapRef = useRef(null); const cvRef = useRef(null);
  const index = useRef(new ChunkIndex());
  const cam = useRef(makeCamera());
  const drawing = useRef(null); // {points:[], sid}
  const panning = useRef(null);
  const pinch = useRef(null);
  const peerLive = useRef(new Map()); // author -> {brush,color,size,points}
  const miniCache = useRef(new Map()); // stampId -> [Image]
  const myStack = useRef([]);
  const progBuf = useRef([]); const progTimer = useRef(0);
  const lastCreatedAt = useRef(null);

  const isOwner = room.owner_id === userId;
  const isGallery = room.mode === "gallery";
  const [role, setRole] = useState(isOwner ? "owner" : "reader");
  const [tool, setTool] = useState("pan"); // pan | pen | stamp | bleep
  const [color, setColor] = useState("#23306B");
  const [size, setSize] = useState(7);
  const [brush, setBrush] = useState("ink"); // ink | marker | air
  const [members, setMembers] = useState([]);
  const [presence, setPresence] = useState({});
  const [permReqs, setPermReqs] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [drawOwn, setDrawOwn] = useState(false);
  const [pendingStamp, setPendingStamp] = useState(null); // {kind,ref|stampId,paceMs}
  const [bleepDraft, setBleepDraft] = useState(null); // {x,y}
  const [journal, setJournal] = useState(null); // composer state
  const [qrUrl, setQrUrl] = useState("");
  const [communityStamps, setCommunityStamps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const miniRef = useRef(null); const [miniFrames, setMiniFrames] = useState([]);
  const canDraw = role === "owner" || role === "writer";

  // ----- hydrate strokes -----
  const addRow = useCallback(row => {
    const el = { id: row.id, kind: row.kind, author: row.author, data: row.data, bb: row.kind === "stroke" ? row.data.bb : row.kind === "stamp" ? stampBB(row.data) : [row.data.x - 40, row.data.y - 40, row.data.x + 40, row.data.y + 40] };
    index.current.add(el);
    if (row.kind === "stamp" && row.data.kind === "mini" && row.data.stampId && !miniCache.current.has(row.data.stampId)) {
      miniCache.current.set(row.data.stampId, []);
      roomsApi.fetchStamps(200).then(rows => {
        const st = rows.find(s => s.id === row.data.stampId);
        if (st?.frames) miniCache.current.set(row.data.stampId, st.frames.map(f => { const im = new Image(); im.src = f; return im; }));
      }).catch(() => {});
    }
  }, []);
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        let after = null, total = 0;
        for (let page = 0; page < 6; page++) {
          const rows = await roomsApi.fetchStrokes(room.id, after, 1000);
          if (!on) return;
          rows.forEach(addRow);
          total += rows.length;
          if (rows.length) { after = rows[rows.length - 1].created_at; lastCreatedAt.current = after; }
          if (rows.length < 1000) break;
        }
        if (total >= 5000) say("This canvas is huge — showing the freshest 5k marks", "default");
        const mem = await roomsApi.fetchMembers(room.id);
        if (!on) return;
        setMembers(mem);
        const me = mem.find(m => m.user_id === userId);
        if (me) setRole(me.role); else { await roomsApi.joinRoom(room.id, userId, userName, isOwner ? "owner" : "reader"); }
        setLoaded(true);
      } catch (e) { console.warn("room load", e); setLoaded(true); }
    })();
    roomsApi.fetchStamps(60).then(r => on && setCommunityStamps(r.filter(s => s.kind === "mini"))).catch(() => {});
    return () => { on = false; };
  }, [room.id]);

  // ----- realtime -----
  const channel = useRoomChannel({
    roomId: room.id, userId, name: userName, role, enabled: true,
    onProg: p => { peerLive.current.set(p.author, { ...p, points: (p.reset ? [] : (peerLive.current.get(p.author)?.points || [])).concat(p.pts) }); },
    onCommit: row => { peerLive.current.delete(row.author); addRow(row); },
    onDel: ({ sid }) => index.current.remove(sid),
    onPermReq: r => { if (isOwner) setPermReqs(q2 => q2.some(x => x.userId === r.userId) ? q2 : [...q2, r]); },
    onPermGrant: ({ userId: granted }) => { if (granted === userId) { setRole("writer"); say("You can draw now — go! ✏️", "success"); setTool("pen"); } },
    onPresence: setPresence,
  });

  // ----- render loop -----
  useEffect(() => {
    const cv = cvRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const ctx = cv.getContext("2d");
    let raf, run = true, last = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => { const r = wrap.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrap);
    const drawStrokePath = (s, pointsArr) => {
      ctx.strokeStyle = s.color; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = s.brush === "marker" ? s.size * 1.8 : s.size;
      ctx.globalAlpha = s.brush === "marker" ? 0.5 : 1;
      ctx.shadowBlur = s.brush === "air" ? s.size * 1.6 : 0;
      ctx.shadowColor = s.brush === "air" ? s.color : "transparent";
      ctx.beginPath();
      pointsArr.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else { const [px, py] = pointsArr[i - 1]; ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2); }
      });
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    };
    const frame = now => {
      if (!run) return;
      if (now - last < 33) { raf = requestAnimationFrame(frame); return; } // ~30fps
      last = now;
      const c = cam.current;
      const w = cv.width / dpr, h = cv.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
      // faint dot grid for spatial feel
      const grid = 128 * c.z;
      if (grid > 24) {
        ctx.fillStyle = "rgba(128,128,140,.18)";
        const ox = (-c.x * c.z) % grid, oy = (-c.y * c.z) % grid;
        for (let gy = oy; gy < h; gy += grid) for (let gx = ox; gx < w; gx += grid) ctx.fillRect(gx, gy, 2, 2);
      }
      ctx.setTransform(c.z * dpr, 0, 0, c.z * dpr, -c.x * c.z * dpr, -c.y * c.z * dpr);
      const els = index.current.queryViewport(c, w, h);
      els.forEach(el => {
        if (el.kind === "stroke") drawStrokePath(el.data, decodePoints(el.data.pts));
        else if (el.kind === "stamp") drawStampCard(ctx, el, reduceMotion ? 0 : now, el.data.kind === "mini" ? miniCache.current.get(el.data.stampId) : null);
        else if (el.kind === "bleep") {
          const d = el.data;
          ctx.save(); ctx.translate(d.x, d.y);
          const wob = reduceMotion ? 0 : Math.sin(now / 500 + d.x) * 2;
          ctx.rotate(wob * 0.02);
          ctx.fillStyle = d.color || "#FF5DA2"; ctx.strokeStyle = ART.ink; ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let p = 0; p < 10; p++) { const a = (p / 10) * Math.PI * 2; const r = p % 2 ? 10 : 20; p === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          if (d.icon) { ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(d.icon, 0, 5); }
          if (d.note) { ctx.font = "700 13px 'Schibsted Grotesk',sans-serif"; ctx.fillStyle = ART.ink; ctx.textAlign = "center"; ctx.fillText(d.note, 0, 38); }
          ctx.restore();
        }
      });
      // in-flight strokes (mine + peers)
      if (drawing.current?.points.length > 1) drawStrokePath({ color, size, brush }, drawing.current.points);
      peerLive.current.forEach(pl => { const pts = []; for (let i = 0; i < pl.points.length; i += 2) pts.push([pl.points[i], pl.points[i + 1]]); if (pts.length > 1) drawStrokePath(pl, pts); });
      // pending stamp ghost follows nothing (placed on tap)
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { run = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [T.paper, color, size, brush]);

  // ----- input -----
  const ptrs = useRef(new Map());
  const pos = e => { const r = cvRef.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const flushProg = useCallback(reset => {
    if (!progBuf.current.length && !reset) return;
    channel.send("s.prog", { author: userName, brush, color, size, pts: progBuf.current, reset });
    progBuf.current = [];
  }, [brush, color, size, userName]);

  const commitStroke = useCallback(async () => {
    const d = drawing.current; drawing.current = null;
    clearInterval(progTimer.current);
    if (!d || d.points.length < 2) { channel.send("s.prog", { author: userName, pts: [], reset: true }); return; }
    const { pts, bb } = encodePoints(d.points);
    const data = { t: "stroke", brush, color, size, pts, bb };
    const row = { id: d.sid, room_id: room.id, chunk: chunkKey(bb[0], bb[1]), author_id: userId, author: userName, kind: "stroke", data };
    addRow(row);
    myStack.current.push(d.sid);
    channel.send("s.commit", row);
    roomsApi.insertStroke(row);
  }, [brush, color, size, room.id, userId, userName, addRow, channel]);

  const down = e => {
    e.preventDefault();
    cvRef.current.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, pos(e));
    if (ptrs.current.size === 2) { // pinch begins — cancel draw
      drawing.current = null; clearInterval(progTimer.current);
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.current.z, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, camx: cam.current.x, camy: cam.current.y };
      return;
    }
    const [sx, sy] = pos(e);
    const [wx, wy] = screenToWorld(cam.current, sx, sy);
    if (tool === "stamp" && pendingStamp && canDraw) { placeStamp(wx, wy); return; }
    if (tool === "bleep" && isGallery) { setBleepDraft({ x: wx, y: wy }); return; }
    if (tool === "pen" && canDraw) {
      drawing.current = { points: [[wx, wy]], sid: newStrokeId(userId) };
      progBuf.current = [wx, wy];
      flushProg(true);
      progTimer.current = setInterval(() => flushProg(false), 90);
      return;
    }
    panning.current = { sx, sy, camx: cam.current.x, camy: cam.current.y };
  };
  const move = e => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, pos(e));
    if (pinch.current && ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const nd = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const nz = Math.max(0.1, Math.min(6, pinch.current.z * (nd / Math.max(1, pinch.current.d))));
      const c = cam.current;
      const [wx, wy] = [pinch.current.camx + pinch.current.cx / pinch.current.z, pinch.current.camy + pinch.current.cy / pinch.current.z];
      c.z = nz; c.x = wx - pinch.current.cx / nz; c.y = wy - pinch.current.cy / nz;
      return;
    }
    const [sx, sy] = pos(e);
    if (drawing.current) {
      const [wx, wy] = screenToWorld(cam.current, sx, sy);
      const pts = drawing.current.points; const [lx, ly] = pts[pts.length - 1];
      if (Math.hypot(wx - lx, wy - ly) * cam.current.z > 2.5) { pts.push([wx, wy]); progBuf.current.push(wx, wy); }
      return;
    }
    if (panning.current) {
      cam.current.x = panning.current.camx - (sx - panning.current.sx) / cam.current.z;
      cam.current.y = panning.current.camy - (sy - panning.current.sy) / cam.current.z;
    }
  };
  const up = e => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (drawing.current) commitStroke();
    panning.current = null;
  };
  const wheel = e => {
    e.preventDefault();
    const [sx, sy] = pos(e);
    const c = cam.current;
    const [wx, wy] = screenToWorld(c, sx, sy);
    c.z = Math.max(0.1, Math.min(6, c.z * (e.deltaY > 0 ? 0.88 : 1.14)));
    c.x = wx - sx / c.z; c.y = wy - sy / c.z;
  };

  const undo = () => {
    const sid = myStack.current.pop();
    if (!sid) { say("Nothing of yours to undo"); return; }
    index.current.remove(sid);
    channel.send("s.del", { sid });
    roomsApi.deleteStroke(sid, userId);
  };

  // ----- stamps -----
  const placeStamp = async (wx, wy) => {
    const d = { t: "stamp", x: wx - STAMP_W * 0.125, y: wy - STAMP_H * 0.125, s: 0.25, ...pendingStamp, seed: Math.floor(Math.random() * 999) };
    const row = { id: newStrokeId(userId), room_id: room.id, chunk: chunkKey(d.x, d.y), author_id: userId, author: userName, kind: "stamp", data: d };
    addRow(row); myStack.current.push(row.id);
    channel.send("s.commit", row);
    roomsApi.insertStroke(row);
    setPendingStamp(null); setTool("pen");
    blip && blip("D5"); hap && hap([20]);
  };
  const saveOwnStamp = async () => {
    if (!miniFrames.length) { say("Capture at least 1 frame first", "error"); return; }
    const frames = await Promise.all(miniFrames.map(f => compressFrame(f, 0.55)));
    const id = `st:${userId.slice(0, 10)}:${Date.now().toString(36)}`;
    await roomsApi.saveStamp({ id, author: userName, kind: "mini", frames, pace_ms: 160, public: true });
    miniCache.current.set(id, frames.map(f => { const im = new Image(); im.src = f; return im; }));
    setCommunityStamps(cs => [{ id, author: userName, kind: "mini", frames, pace_ms: 160 }, ...cs]);
    setPendingStamp({ kind: "mini", stampId: id, paceMs: 160 });
    setDrawOwn(false); setMiniFrames([]); setShowStamps(false); setTool("stamp");
    say("Your animation is in the library — tap the canvas to place it ✦", "success");
  };

  // ----- bleeps -----
  const bleepKey = `lok:bleep:${room.id}:${new Date().toDateString()}`;
  const sendBleep = (icon, note) => {
    if (localStorage.getItem(bleepKey)) { say("One bleep per gallery per day — come back tomorrow 🌙", "error"); setBleepDraft(null); return; }
    const d = { t: "bleep", x: bleepDraft.x, y: bleepDraft.y, icon, note: (note || "").slice(0, 40), color: color };
    const row = { id: newStrokeId(userId), room_id: room.id, chunk: chunkKey(d.x, d.y), author_id: userId, author: userName, kind: "bleep", data: d };
    addRow(row); channel.send("s.commit", row); roomsApi.insertStroke(row);
    localStorage.setItem(bleepKey, "1");
    setBleepDraft(null); say("Bleep left ✦ your mark lives here now", "success"); hap && hap([30, 20, 30]);
  };

  // ----- permissions -----
  const askToDraw = () => { channel.send("perm.req", { userId, name: userName }); roomsApi.requestWrite(room.id, userId); say("Asked the host for the pen ✋"); };
  const grant = async r => { await roomsApi.grantWrite(room.id, r.userId); channel.send("perm.grant", { userId: r.userId }); setPermReqs(q2 => q2.filter(x => x.userId !== r.userId)); say(`${r.name} can draw now`, "success"); };

  // ----- share / QR -----
  useEffect(() => {
    if (!showShare) return;
    let on = true;
    import("qrcode").then(QR => QR.toDataURL(`${location.origin}/?room=${room.code}`, { width: 220, margin: 1, color: { dark: "#23306B", light: "#F2EDE2" } })).then(u => on && setQrUrl(u)).catch(() => {});
    return () => { on = false; };
  }, [showShare, room.code]);

  // ----- journal capture -----
  const capturePage = () => {
    const cv = cvRef.current;
    const out = document.createElement("canvas"); out.width = 960; out.height = 1200;
    const octx = out.getContext("2d");
    octx.fillStyle = T.paper; octx.fillRect(0, 0, 960, 1200);
    // center-crop current viewport to 4:5
    const vw = cv.width, vh = cv.height, targetAR = 960 / 1200;
    let sw = vw, sh = vw / targetAR;
    if (sh > vh) { sh = vh; sw = vh * targetAR; }
    octx.drawImage(cv, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, 960, 1200);
    setJournal({ page: out.toDataURL("image/jpeg", 0.8), title: room.title || "Our canvas", cover: T.accent, ribbon: "#E8B14B", paper: "plain", sticker: "♥", busy: false });
  };
  const saveJournalPage = async () => {
    setJournal(j => ({ ...j, busy: true }));
    try {
      const jid = `jr:${room.id}:${userId.slice(0, 10)}`;
      let pages = [journal.page];
      try { const mine = await roomsApi.fetchMyJournals(userId); const ex = mine.find(x => x.id === jid); if (ex?.pages) pages = [...ex.pages, journal.page]; } catch {}
      await roomsApi.saveJournal({ id: jid, owner_id: userId, owner_name: userName, room_id: room.id, title: journal.title, style: { cover: journal.cover, ribbon: journal.ribbon, paper: journal.paper, sticker: journal.sticker }, pages, public: true });
      say(`Saved to your journal · page ${pages.length} 📔`, "success"); hap && hap([40, 20, 60]);
      setJournal(null);
    } catch { say("Couldn't save the journal — try again", "error"); setJournal(j => ({ ...j, busy: false })); }
  };

  const online = Object.keys(presence).length;
  const btn = (on) => ({ border: `2.5px solid ${on ? T.accent : T.ink}`, background: on ? T.ink : T.card, color: on ? T.paper : T.ink });

  return (<div className="fixed inset-0 z-40 flex flex-col" style={{ background: T.paper, color: T.ink }}>
    <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `3px solid ${T.ink}`, background: T.paper }}>
      <button onClick={onClose} aria-label="Leave room" className="lok-btn px-3 py-1 rounded-lg font-bold" style={{ border: `2.5px solid ${T.ink}`, background: T.card }}>‹</button>
      <div className="min-w-0 flex-1">
        <div className="lok-display font-extrabold text-sm leading-tight truncate">{room.title}{isGallery && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded align-middle" style={{ background: T.alt, color: "#fff" }}>GALLERY</span>}</div>
        <div className="text-[10px] opacity-60">{room.code} · {online} here · {role}</div>
      </div>
      <button onClick={() => setShowMembers(true)} aria-label="Members" className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-bold" style={btn(false)}>👥 {members.length || 1}</button>
      <button onClick={() => setShowShare(true)} aria-label="Invite" className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}` }}>Invite</button>
    </div>

    <div ref={wrapRef} className="relative flex-1 min-h-0 select-none">
      <canvas ref={cvRef} className="absolute inset-0" style={{ touchAction: "none", cursor: tool === "pen" && canDraw ? "crosshair" : tool === "stamp" && pendingStamp ? "copy" : "grab" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel} role="img" aria-label="Shared infinite canvas" />
      {!loaded && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="lok-display font-extrabold px-4 py-2 rounded-xl" style={{ background: T.card, border: `3px solid ${T.ink}` }}>unrolling the canvas…</div></div>}
      {!canDraw && !isGallery && <button onClick={askToDraw} className="lok-btn absolute left-1/2 px-4 py-2.5 rounded-2xl lok-display font-extrabold" style={{ bottom: 86, transform: "translateX(-50%)", background: T.ink, color: T.paper, border: `3px solid ${T.accent}`, boxShadow: `4px 4px 0 ${T.accent}` }}>✋ Ask to draw</button>}
      {isGallery && !canDraw && <div className="absolute left-1/2 px-3 py-1.5 rounded-full text-xs font-bold pointer-events-none" style={{ bottom: 90, transform: "translateX(-50%)", background: T.card, border: `2px solid ${T.ink}`, opacity: 0.85 }}>drifting… tap 💧 to leave one bleep</div>}
      {pendingStamp && <div className="absolute left-1/2 top-3 px-3 py-1.5 rounded-full text-xs font-bold pointer-events-none" style={{ transform: "translateX(-50%)", background: T.ink, color: T.paper }}>tap the canvas to place your animation ✦</div>}
      {permReqs.map(r => (<div key={r.userId} className="absolute left-1/2 top-3 flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ transform: "translateX(-50%)", background: T.card, border: `3px solid ${T.accent}`, boxShadow: `4px 4px 0 ${T.shadow}`, animation: "lokrise .25s ease" }}>
        <span className="text-sm font-bold">{r.name} wants to draw</span>
        <button onClick={() => grant(r)} className="lok-btn px-2.5 py-1 rounded-full text-xs font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `2px solid ${T.ink}` }}>Hand the pen</button>
        <button onClick={() => setPermReqs(q2 => q2.filter(x => x.userId !== r.userId))} className="lok-btn text-xs font-bold opacity-60">✕</button>
      </div>))}
    </div>

    <div className="px-3 py-2 flex flex-col gap-1.5" style={{ borderTop: `3px solid ${T.ink}`, background: T.paper, paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button onClick={() => setTool("pan")} aria-pressed={tool === "pan"} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold" style={btn(tool === "pan")}>🖐 Pan</button>
        {canDraw && <button onClick={() => setTool("pen")} aria-pressed={tool === "pen"} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold" style={btn(tool === "pen")}>✏️ Draw</button>}
        {canDraw && <button onClick={() => setShowStamps(true)} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold" style={btn(tool === "stamp")}>✦ Stamps</button>}
        {isGallery && <button onClick={() => setTool("bleep")} aria-pressed={tool === "bleep"} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold" style={btn(tool === "bleep")}>💧 Bleep</button>}
        {canDraw && <button onClick={undo} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold" style={btn(false)}>↩ Undo</button>}
        <button onClick={capturePage} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold" style={btn(false)}>📔 Save page</button>
        <div className="ml-auto shrink-0 flex items-center gap-1 text-[10px] font-bold opacity-60"><button onClick={() => { cam.current.z = Math.min(6, cam.current.z * 1.25); }} className="lok-btn w-6 h-6 rounded-full" style={{ border: `2px solid ${T.ink}` }}>+</button><button onClick={() => { cam.current.z = Math.max(0.1, cam.current.z * 0.8); }} className="lok-btn w-6 h-6 rounded-full" style={{ border: `2px solid ${T.ink}` }}>−</button></div>
      </div>
      {canDraw && tool === "pen" && (<div className="flex items-center gap-1.5 overflow-x-auto">
        {SWATCHES.map(hex => (<button key={hex} onClick={() => setColor(hex)} aria-label={`Color ${hex}`} className="lok-btn shrink-0 w-6 h-6 rounded-full" style={{ background: hex, border: `2.5px solid ${color === hex ? T.accent : T.ink}`, transform: color === hex ? "scale(1.15)" : "none" }} />))}
        {[["ink", "Ink"], ["marker", "Marker"], ["air", "Glow"]].map(([id, l]) => (<button key={id} onClick={() => setBrush(id)} aria-pressed={brush === id} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={btn(brush === id)}>{l}</button>))}
        <label className="shrink-0 flex items-center gap-1 text-[10px] font-bold">size<input type="range" min="2" max="26" value={size} onChange={e => setSize(+e.target.value)} style={{ accentColor: T.accent, width: 60 }} aria-label="Brush size" /></label>
      </div>)}
    </div>

    {showShare && (<div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.4)" }} onClick={() => setShowShare(false)}>
      <div className="w-full rounded-t-3xl p-5 text-center" style={{ maxWidth: 480, background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
        <div className="lok-display text-lg font-extrabold">Invite to "{room.title}"</div>
        <p className="text-xs opacity-70 mt-1">Anyone with this code can watch. You choose who gets to draw.</p>
        <div className="lok-display text-3xl font-extrabold tracking-widest mt-3 px-4 py-3 rounded-2xl inline-block" style={{ border: `3px dashed ${T.accent}`, color: T.accent }}>{room.code}</div>
        {qrUrl && <div className="mt-3 flex justify-center"><img src={qrUrl} alt={`QR code for room ${room.code}`} className="rounded-xl" style={{ border: `3px solid ${T.ink}`, width: 180 }} /></div>}
        <div className="mt-3 flex gap-2">
          <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/?room=${room.code}`); say("Link copied ✓", "success"); }} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold" style={{ background: T.ink, color: T.paper }}>Copy link</button>
          <button onClick={() => { const msg = `Draw with me on our shared canvas ✦ ${location.origin}/?room=${room.code}`; if (navigator.share) navigator.share({ title: room.title, text: msg }).catch(() => {}); else { navigator.clipboard?.writeText(msg); say("Copied ✓", "success"); } }} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}` }}>Share ↗</button>
        </div>
      </div>
    </div>)}

    {showMembers && (<div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.4)" }} onClick={() => setShowMembers(false)}>
      <div className="w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
        <div className="lok-display text-lg font-extrabold mb-2">In this room</div>
        {(members.length ? members : [{ user_id: userId, name: userName, role }]).map(m => (<div key={m.user_id} className="flex items-center gap-2.5 py-1.5">
          <img src={renderAvatar(m.name.length * 31)} alt="" className="w-9 h-9 rounded-full" style={{ border: `2px solid ${T.ink}` }} />
          <button onClick={() => { setShowMembers(false); onArtist && onArtist(m.name); }} className="font-bold text-sm flex-1 text-left underline" style={{ color: T.ink }}>{m.name}{m.user_id === userId ? " (you)" : ""}</button>
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase" style={{ background: m.role === "owner" ? T.accent : m.role === "writer" ? T.alt : T.shadow, color: m.role === "reader" ? T.ink : "#fff" }}>{m.role}</span>
          {isOwner && m.role === "reader" && <button onClick={() => grant({ userId: m.user_id, name: m.name })} className="lok-btn text-[10px] font-extrabold px-2 py-1 rounded-full" style={{ border: `2px solid ${T.ink}` }}>give pen</button>}
        </div>))}
      </div>
    </div>)}

    {showStamps && (<div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.4)" }} onClick={() => { setShowStamps(false); setDrawOwn(false); }}>
      <div className="w-full rounded-t-3xl p-4 overflow-y-auto" style={{ maxWidth: 480, maxHeight: "80dvh", background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
        {!drawOwn ? (<>
          <div className="flex items-center justify-between mb-1"><div className="lok-display text-lg font-extrabold">Living stamps</div><button onClick={() => setDrawOwn(true)} className="lok-btn px-3 py-1.5 rounded-full text-xs font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `2.5px solid ${T.ink}` }}>✏️ Draw your own</button></div>
          <p className="text-xs opacity-70 mb-2">Animated cards that live on the canvas. Pick one, then tap where it goes.</p>
          <div className="grid grid-cols-4 gap-2">{PROC_STAMPS.map(st => (<button key={st.ref} onClick={() => { setPendingStamp({ kind: "proc", ref: st.ref }); setTool("stamp"); setShowStamps(false); }} className="lok-btn rounded-xl overflow-hidden flex flex-col items-center pb-1" style={{ border: `2.5px solid ${T.ink}`, background: T.paper }}><StampPreview stamp={st} size={64} /><span className="text-[9px] font-bold mt-0.5">{st.name}</span></button>))}</div>
          {communityStamps.length > 0 && (<><div className="lok-display font-extrabold text-sm mt-3 mb-1">From the community · {communityStamps.length}</div>
            <div className="grid grid-cols-4 gap-2">{communityStamps.slice(0, 24).map(st => (<button key={st.id} onClick={() => { if (!miniCache.current.has(st.id)) miniCache.current.set(st.id, (st.frames || []).map(f => { const im = new Image(); im.src = f; return im; })); setPendingStamp({ kind: "mini", stampId: st.id, paceMs: st.pace_ms || 160 }); setTool("stamp"); setShowStamps(false); }} className="lok-btn rounded-xl overflow-hidden flex flex-col items-center pb-1" style={{ border: `2.5px solid ${T.ink}`, background: T.paper }}>{st.frames?.[0] && <img src={st.frames[0]} alt="" style={{ width: 64, height: 80, objectFit: "cover" }} />}<span className="text-[9px] font-bold mt-0.5 truncate w-full text-center px-1">{st.author}</span></button>))}</div></>)}
        </>) : (<>
          <div className="lok-display text-lg font-extrabold mb-1">Draw a living stamp</div>
          <p className="text-xs opacity-70 mb-2">Draw a frame, capture it, tweak, capture again — 2-6 frames makes it move. It joins the community library.</p>
          <MiniDraw ref={miniRef} color={color} width={10} />
          <div className="mt-2 flex gap-2 items-center">
            <button onClick={() => { if (miniFrames.length >= 6) { say("Max 6 frames"); return; } setMiniFrames(f => [...f, miniRef.current.snapshot()]); }} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold" style={{ background: T.ink, color: T.paper }}>＋ Capture frame {miniFrames.length + 1}</button>
            {miniFrames.slice(-4).map((f, i) => <img key={i} src={f} alt="" className="rounded" style={{ width: 26, aspectRatio: "4/5", objectFit: "cover", border: `1.5px solid ${T.ink}` }} />)}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => { miniRef.current.clear(); }} className="lok-btn flex-1 py-2 rounded-xl text-sm font-bold" style={{ border: `2.5px solid ${T.ink}` }}>Clear canvas</button>
            <button onClick={saveOwnStamp} disabled={!miniFrames.length} className="lok-btn lok-display flex-1 py-2 rounded-xl font-extrabold" style={{ background: miniFrames.length ? T.accent : T.shadow, color: miniFrames.length ? T.onAccent : T.ink, border: `3px solid ${T.ink}`, opacity: miniFrames.length ? 1 : 0.6 }}>Save & place ✦</button>
          </div>
        </>)}
      </div>
    </div>)}

    {bleepDraft && (<div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.4)" }} onClick={() => setBleepDraft(null)}>
      <div className="w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: T.card, border: `3px solid ${T.ink}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
        <div className="lok-display text-lg font-extrabold">Leave a bleep</div>
        <p className="text-xs opacity-70 mt-0.5">A tiny mark that says "I passed through here". One per gallery per day.</p>
        <BleepComposer onSend={sendBleep} T={T} />
      </div>
    </div>)}

    {journal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }} onClick={() => !journal.busy && setJournal(null)}>
      <div className="w-full rounded-3xl p-4 overflow-y-auto" style={{ maxWidth: 420, maxHeight: "88dvh", background: T.card, border: `3px solid ${T.ink}`, boxShadow: `8px 8px 0 ${T.accent}`, animation: "lokrise .25s ease" }} onClick={e => e.stopPropagation()}>
        <div className="lok-display text-lg font-extrabold">Save to journal 📔</div>
        <div className="mt-2 mx-auto relative" style={{ width: 190 }}>
          <div className="rounded-2xl p-2.5 pb-4" style={{ background: journal.cover, border: `3px solid ${T.ink}`, boxShadow: `5px 5px 0 ${T.shadow}` }}>
            <img src={journal.page} alt="captured page" className="rounded-lg w-full" style={{ border: `2.5px solid ${T.ink}` }} />
            <div className="absolute top-0 bottom-0" style={{ right: 22, width: 14, background: journal.ribbon, border: `2px solid ${T.ink}`, borderTop: "none", borderBottom: "none" }} />
            <div className="absolute -top-2 -left-2 text-2xl" aria-hidden="true">{journal.sticker}</div>
          </div>
        </div>
        <input value={journal.title} onChange={e => setJournal(j => ({ ...j, title: e.target.value }))} aria-label="Journal title" className="mt-3 w-full px-3 py-2 rounded-xl font-bold text-sm text-center" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} />
        <div className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-50">Cover</div>
        <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1">{[T.accent, "#FF5DA2", "#2FA9A0", "#E8B14B", "#7A4FBF", "#23306B", "#D94040", "#3E8E4B"].map(c => <button key={c} onClick={() => setJournal(j => ({ ...j, cover: c }))} aria-label={`Cover ${c}`} className="lok-btn shrink-0 w-7 h-7 rounded-lg" style={{ background: c, border: `2.5px solid ${journal.cover === c ? T.accent : T.ink}` }} />)}</div>
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest opacity-50">Ribbon</div>
        <div className="flex gap-1.5 mt-1">{["#E8B14B", "#FF5DA2", "#2FA9A0", "#F2EDE2", "#23306B"].map(c => <button key={c} onClick={() => setJournal(j => ({ ...j, ribbon: c }))} aria-label={`Ribbon ${c}`} className="lok-btn w-6 h-6 rounded" style={{ background: c, border: `2px solid ${journal.ribbon === c ? T.accent : T.ink}` }} />)}</div>
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest opacity-50">Sticker</div>
        <div className="flex gap-1.5 mt-1">{["♥", "✦", "🌙", "🐟", "🌸", "⚡", "💧"].map(s => <button key={s} onClick={() => setJournal(j => ({ ...j, sticker: s }))} aria-label={`Sticker ${s}`} className="lok-btn w-8 h-8 rounded-lg text-lg" style={{ border: `2px solid ${journal.sticker === s ? T.accent : T.ink}`, background: T.paper }}>{s}</button>)}</div>
        <button onClick={saveJournalPage} disabled={journal.busy} className="lok-btn lok-display mt-3 w-full py-3 rounded-xl text-lg font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}`, opacity: journal.busy ? 0.6 : 1 }}>{journal.busy ? "Binding…" : "Save page to journal"}</button>
      </div>
    </div>)}
  </div>);
}

function BleepComposer({ onSend, T }) {
  const [icon, setIcon] = useState("💧");
  const [note, setNote] = useState("");
  return (<>
    <div className="mt-2 flex gap-1.5">{BLEEP_ICONS.map(i => <button key={i} onClick={() => setIcon(i)} aria-label={`Bleep icon ${i}`} className="lok-btn w-10 h-10 rounded-xl text-lg font-extrabold" style={{ border: `2.5px solid ${icon === i ? T.accent : T.ink}`, background: icon === i ? T.ink : T.paper, color: icon === i ? T.paper : T.ink }}>{i}</button>)}</div>
    <input value={note} onChange={e => setNote(e.target.value.slice(0, 40))} placeholder="say something tiny (optional)" aria-label="Bleep note" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} />
    <button onClick={() => onSend(icon, note)} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}` }}>Leave it ✦</button>
  </>);
}

// ---------- lobby ----------
export default function Rooms({ profile, userId, myRooms = [], setMyRooms, pendingCode, onPendingCodeUsed, onArtist, say, blip, hap }) {
  const T = useT();
  const [open, setOpen] = useState(null); // room row
  const [joinCode, setJoinCode] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("private");
  const [busy, setBusy] = useState(false);
  const [galleries, setGalleries] = useState([]);

  useEffect(() => { roomsApi.fetchGalleryRooms(12).then(setGalleries).catch(() => {}); }, []);
  useEffect(() => { if (pendingCode) { joinByCode(pendingCode); onPendingCodeUsed && onPendingCodeUsed(); } }, [pendingCode]); // eslint-disable-line

  const remember = room => setMyRooms && setMyRooms(rs => { const next = [{ id: room.id, code: room.code, title: room.title, mode: room.mode, owner: room.owner_id === userId }, ...rs.filter(r => r.id !== room.id)]; return next.slice(0, 20); });

  const create = async () => {
    if (busy) return; setBusy(true);
    try {
      const room = await roomsApi.createRoom({ code: newRoomCode(), ownerId: userId, ownerName: profile.name, title: title.trim() || (mode === "gallery" ? `${profile.name}'s gallery` : "Our canvas"), mode });
      remember(room); setOpen(room); setTitle("");
      say(mode === "gallery" ? "Gallery open — the world can drift through 🌊" : "Room created — invite someone ✦", "success");
    } catch { say("Couldn't create the room — try again", "error"); }
    setBusy(false);
  };
  const joinByCode = async code => {
    const c = normalizeCode(code);
    if (c.replace("-", "").length < 8) { say("Codes look like ABCD-EFGH", "error"); return; }
    setBusy(true);
    try {
      const room = await roomsApi.fetchRoomByCode(c);
      if (!room) { say("No room with that code", "error"); setBusy(false); return; }
      await roomsApi.joinRoom(room.id, userId, profile.name, room.owner_id === userId ? "owner" : "reader");
      remember(room); setOpen(room); setJoinCode("");
    } catch { say("Couldn't reach the room — try again", "error"); }
    setBusy(false);
  };

  if (open) return <RoomCanvas room={open} userId={userId} userName={profile.name} say={say} blip={blip} hap={hap} onArtist={onArtist} onClose={() => setOpen(null)} />;

  return (<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">Lok Rooms</h2>
    <p className="text-sm opacity-70 mt-0.5">A shared infinite canvas. Journal together, draw forever, save the good pages.</p>

    <div className="mt-3 p-3.5 rounded-2xl" style={{ border: `3px solid ${T.ink}`, background: T.card, boxShadow: `5px 5px 0 ${T.shadow}` }}>
      <div className="lok-display font-extrabold">Start a canvas</div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder={mode === "gallery" ? "Name your gallery…" : "Name it — 'us', 'the void', anything"} aria-label="Room title" className="mt-2 w-full px-3 py-2.5 rounded-xl font-bold text-sm" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} />
      <div className="mt-2 flex gap-2">{[["private", "🔒 Private", "Invite by code. You choose who draws."], ["gallery", "🌊 Drift gallery", "Anyone can wander in and leave a bleep."]].map(([id, l, d]) => (<button key={id} onClick={() => setMode(id)} aria-pressed={mode === id} className="lok-btn flex-1 p-2 rounded-xl text-left" style={{ border: `2.5px solid ${mode === id ? T.accent : T.ink}`, background: mode === id ? T.ink : T.paper, color: mode === id ? T.paper : T.ink }}><div className="font-extrabold text-xs">{l}</div><div className="text-[10px] opacity-70 mt-0.5">{d}</div></button>))}</div>
      <button onClick={create} disabled={busy} className="lok-btn lok-display mt-2.5 w-full py-3 rounded-xl text-lg font-extrabold" style={{ background: T.accent, color: T.onAccent, border: `3px solid ${T.ink}`, boxShadow: `4px 4px 0 ${T.ink}`, opacity: busy ? 0.6 : 1 }}>{busy ? "Opening…" : "Open the canvas →"}</button>
    </div>

    <div className="mt-3 p-3.5 rounded-2xl" style={{ border: `3px solid ${T.ink}`, background: T.card }}>
      <div className="lok-display font-extrabold text-sm">Join with a code</div>
      <div className="mt-2 flex gap-2">
        <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABCD-EFGH" aria-label="Room code" className="flex-1 min-w-0 px-3 py-2.5 rounded-xl font-extrabold text-center tracking-widest lok-display" style={{ border: `2.5px solid ${T.ink}`, background: T.paper, color: T.ink }} onKeyDown={e => e.key === "Enter" && joinByCode(joinCode)} />
        <button onClick={() => joinByCode(joinCode)} disabled={busy} className="lok-btn lok-display px-4 rounded-xl font-extrabold" style={{ background: T.ink, color: T.paper, opacity: busy ? 0.6 : 1 }}>Join</button>
      </div>
      <p className="text-[10px] opacity-50 mt-1.5">A code lets you watch. The host hands you the pen.</p>
    </div>

    {myRooms.length > 0 && (<><div className="lok-display font-extrabold mt-4 mb-1.5">Your canvases</div>
      <div className="flex flex-col gap-2">{myRooms.map(r => (<button key={r.id} onClick={() => joinByCode(r.code)} className="lok-btn flex items-center gap-3 p-2.5 rounded-xl text-left" style={{ border: `2.5px solid ${T.ink}`, background: T.card }}>
        <span style={{ fontSize: 20 }}>{r.mode === "gallery" ? "🌊" : "📓"}</span>
        <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{r.title}</div><div className="text-[10px] opacity-60">{r.code}{r.owner ? " · yours" : ""}</div></div>
        <span className="text-xs font-extrabold" style={{ color: T.accent }}>open ▸</span>
      </button>))}</div></>)}

    <div className="lok-display font-extrabold mt-4 mb-1.5">🌊 Drift through open galleries</div>
    {galleries.length ? (<div className="flex flex-col gap-2">{galleries.map(g => (<button key={g.id} onClick={() => joinByCode(g.code)} className="lok-btn flex items-center gap-3 p-2.5 rounded-xl text-left" style={{ border: `2.5px solid ${T.ink}`, background: T.card, boxShadow: `3px 3px 0 ${T.shadow}` }}>
      <img src={renderAvatar(g.owner_name.length * 31)} alt="" className="w-9 h-9 rounded-full" style={{ border: `2px solid ${T.ink}` }} />
      <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{g.title}</div><div className="text-[10px] opacity-60">by {g.owner_name}</div></div>
      <span className="text-xs font-extrabold" style={{ color: T.alt }}>drift in ▸</span>
    </button>))}</div>) : (<EmptyState icon="feed" title="No open galleries yet" subtitle="Start a drift gallery above and passersby can leave a bleep." />)}
  </div>);
}
