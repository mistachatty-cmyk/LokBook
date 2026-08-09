// Room outbox — durable retry for marks that failed to reach Supabase.
//
// Rooms used to drop failed writes on the floor (roomsApi.insertStroke ended in
// `.catch(() => false)`), so a stroke drawn on a flaky connection was gone the
// moment you reloaded — with no error and no second attempt. In production this
// left `lok_room_strokes` at 0 rows.
//
// This queues the row instead, retries with backoff, and survives a reload so
// the mark still lands when the connection comes back.

import { roomsApi } from "./api.js";

const KEY = "lok:rooms:outbox";
const MAX = 200;          // cap so a long offline stretch can't fill storage
const BACKOFF = [2000, 5000, 15000, 45000];

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = q => { try { localStorage.setItem(KEY, JSON.stringify(q.slice(-MAX))); } catch { /* storage full/blocked */ } };

let timer = 0;
let listeners = new Set();
const notify = () => { const n = read().length; listeners.forEach(f => { try { f(n); } catch { /* ignore */ } }); };

/** Subscribe to pending-count changes. Returns an unsubscribe fn. */
export function onPending(fn) { listeners.add(fn); fn(read().length); return () => listeners.delete(fn); }
export const pendingCount = () => read().length;

/** Queue a row for retry. Called when the immediate insert rejects. */
export function enqueue(row) {
  const q = read();
  if (q.some(e => e.row.id === row.id)) return;
  q.push({ row, tries: 0 });
  write(q);
  notify();
  schedule(0);
}

function schedule(delay) {
  clearTimeout(timer);
  timer = setTimeout(flush, delay);
}

/** Try to drain the queue. Safe to call often; no-ops when empty or offline. */
export async function flush() {
  const q = read();
  if (!q.length) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) { schedule(BACKOFF[1]); return; }

  const keep = [];
  let sentAny = false;
  for (const entry of q) {
    try {
      await roomsApi.insertStroke(entry.row);
      sentAny = true;
    } catch {
      entry.tries += 1;
      // Give up only after the whole backoff ladder, so a genuinely bad row
      // (e.g. a room that was deleted) can't wedge the queue forever.
      if (entry.tries <= BACKOFF.length) keep.push(entry);
    }
  }
  write(keep);
  notify();
  if (keep.length) schedule(BACKOFF[Math.min(keep[0].tries, BACKOFF.length - 1)]);
  return sentAny;
}

/**
 * Send a mark, queueing it for retry if the write fails.
 * Resolves true when it landed immediately, false when it was queued.
 * Rejects on rate limit (don't retry) or other permanent errors.
 */
export async function sendMark(row) {
  try {
    await roomsApi.insertStroke(row);
    return true;
  } catch (e) {
    // Rate limit errors should reject, not retry
    if (e.message?.includes("Rate limited")) throw e;
    enqueue(row);
    return false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => schedule(250));
  // one attempt on load so marks stranded by a previous session go out
  schedule(1500);
}
