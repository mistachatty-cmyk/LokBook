// LokCloud music backup — a LokPass perk. Uploads local track/cover blobs to
// a private Supabase Storage bucket ("music"), one object per track keyed by
// `${userId}/${trackId}`, RLS-scoped so a user can only ever reach their own
// folder. This is never triggered automatically — every call here is the
// result of an explicit user tap, by design (see MusicPlayer.jsx's manual
// backupAllToCloud), so free/guest users never cause storage cost and paying
// users only pay in bytes actually backed up.
import { supabase } from "../supabaseClient.js";

const BUCKET = "music";
const coverKey = id => `${id}.cover`;

export async function uploadToCloud(userId, key, blob) {
  if (!supabase || !userId || !blob) return false;
  const { error } = await supabase.storage.from(BUCKET).upload(`${userId}/${key}`, blob, {
    upsert: true,
    contentType: blob.type || undefined,
  });
  return !error;
}

export async function downloadFromCloud(userId, key) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(`${userId}/${key}`);
  return error ? null : data;
}

export async function deleteFromCloud(userId, key) {
  if (!supabase || !userId) return false;
  const { error } = await supabase.storage.from(BUCKET).remove([`${userId}/${key}`]);
  return !error;
}

export async function listCloudKeys(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase.storage.from(BUCKET).list(userId, { limit: 1000 });
  return error ? [] : (data || []).map(o => o.name);
}

export { coverKey };
