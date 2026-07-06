// roomsApi — REST helpers for Lok Rooms, mirroring the lokApi pattern.
// Access is code-gated: private rooms are only ever fetched by exact code.
import { SUPA_URL, SUPA_KEY } from "../supabaseClient.js";
import { getApiToken } from "../auth/auth.js";

const headers = () => ({ "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: `Bearer ${getApiToken()}` });
const q = encodeURIComponent;

async function get(path) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: headers() });
  if (!r.ok) throw new Error(`rooms get ${r.status}`);
  return r.json();
}
async function post(path, body, prefer = "return=representation") {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { method: "POST", headers: { ...headers(), Prefer: prefer }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`rooms post ${r.status}`);
  return prefer.includes("representation") ? r.json() : true;
}
async function patch(path, body) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { method: "PATCH", headers: headers(), body: JSON.stringify(body) });
  return r.ok;
}

export const roomsApi = {
  async createRoom({ code, ownerId, ownerName, title, mode = "private" }) {
    const rows = await post("lok_rooms", { code, owner_id: ownerId, owner_name: ownerName, title, mode });
    const room = rows[0];
    await post("lok_room_members", { room_id: room.id, user_id: ownerId, name: ownerName, role: "owner" }, "resolution=merge-duplicates").catch(() => {});
    return room;
  },
  async fetchRoomByCode(code) {
    const rows = await get(`lok_rooms?code=eq.${q(code)}&select=*`);
    return rows[0] || null;
  },
  async joinRoom(roomId, userId, name, role = "reader") {
    await post("lok_room_members", { room_id: roomId, user_id: userId, name, role }, "resolution=ignore-duplicates,return=minimal").catch(() => {});
  },
  fetchMembers: roomId => get(`lok_room_members?room_id=eq.${q(roomId)}&select=*`),
  requestWrite: (roomId, userId) => patch(`lok_room_members?room_id=eq.${q(roomId)}&user_id=eq.${q(userId)}`, { requested_write: true }),
  grantWrite: (roomId, userId) => patch(`lok_room_members?room_id=eq.${q(roomId)}&user_id=eq.${q(userId)}`, { role: "writer", requested_write: false }),
  insertStroke: row => post("lok_room_strokes", row, "resolution=ignore-duplicates,return=minimal").catch(() => false),
  async deleteStroke(id, authorId) {
    const r = await fetch(`${SUPA_URL}/rest/v1/lok_room_strokes?id=eq.${q(id)}&author_id=eq.${q(authorId)}`, { method: "DELETE", headers: headers() });
    return r.ok;
  },
  // paged fetch, oldest→newest so draw order is stable
  async fetchStrokes(roomId, afterCreatedAt = null, limit = 1000) {
    const after = afterCreatedAt ? `&created_at=gt.${q(afterCreatedAt)}` : "";
    return get(`lok_room_strokes?room_id=eq.${q(roomId)}${after}&order=created_at.asc&limit=${limit}`);
  },
  fetchGalleryRooms: (limit = 20) => get(`lok_rooms?mode=eq.gallery&order=created_at.desc&limit=${limit}&select=*`),
  updateRoom: (roomId, fields) => patch(`lok_rooms?id=eq.${q(roomId)}`, fields),
  saveJournal: j => post("lok_journals", j, "resolution=merge-duplicates,return=minimal"),
  fetchJournals: ownerName => get(`lok_journals?owner_name=eq.${q(ownerName)}&public=eq.true&order=created_at.desc&select=id,owner_name,title,style,pages,created_at`),
  fetchMyJournals: ownerId => get(`lok_journals?owner_id=eq.${q(ownerId)}&order=created_at.desc&select=*`),
  saveStamp: s => post("lok_stamps", s, "resolution=merge-duplicates,return=minimal"),
  fetchStamps: (limit = 100) => get(`lok_stamps?public=eq.true&order=created_at.desc&limit=${limit}&select=*`),
};
