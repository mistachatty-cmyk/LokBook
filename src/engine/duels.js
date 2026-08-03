// Real-account 1v1 matchmaking for Battle "Real opponent" mode.
// Async duel: two accounts get matched via lok_duels, draw independently
// against a timer, then submit a composite. Once both submissions are in,
// each client scores both by ink coverage (deterministic, no server needed).
import { supabase } from "../supabaseClient.js";

const OPEN_WINDOW_MS = 5 * 60 * 1000;

export async function findOrCreateDuel(userId, userName, prompt) {
  if (!supabase) throw new Error("Supabase not configured");
  const cutoff = new Date(Date.now() - OPEN_WINDOW_MS).toISOString();
  const { data: openDuels } = await supabase
    .from("lok_duels")
    .select("*")
    .eq("status", "waiting")
    .neq("player1_id", userId)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(5);

  for (const row of openDuels || []) {
    const { data: claimed } = await supabase
      .from("lok_duels")
      .update({ player2_id: userId, player2_name: userName, status: "active", joined_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "waiting")
      .select()
      .maybeSingle();
    if (claimed) return { duel: claimed, isPlayer1: false };
  }

  const { data: created, error } = await supabase
    .from("lok_duels")
    .insert({ prompt, status: "waiting", player1_id: userId, player1_name: userName })
    .select()
    .single();
  if (error) throw error;
  return { duel: created, isPlayer1: true };
}

export async function fetchDuel(duelId) {
  if (!supabase) return null;
  const { data } = await supabase.from("lok_duels").select("*").eq("id", duelId).single();
  return data;
}

export async function cancelWaitingDuel(duelId) {
  if (!supabase) return;
  await supabase.from("lok_duels").delete().eq("id", duelId).eq("status", "waiting");
}

export async function submitDuelArt(duelId, isPlayer1, dataUrl) {
  if (!supabase) return;
  const field = isPlayer1 ? "submission1" : "submission2";
  await supabase.from("lok_duels").update({ [field]: dataUrl }).eq("id", duelId);
}

export function coverageScore(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      try {
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let painted = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 12) painted++;
        resolve(Math.round((painted / (d.length / 4)) * 1000));
      } catch {
        resolve(0);
      }
    };
    img.onerror = () => resolve(0);
    img.src = dataUrl;
  });
}

export async function finalizeDuel(duel) {
  if (!supabase || duel.winner) return duel;
  const [s1, s2] = await Promise.all([coverageScore(duel.submission1), coverageScore(duel.submission2)]);
  const winner = s1 > s2 ? "player1" : s2 > s1 ? "player2" : "tie";
  const { data } = await supabase
    .from("lok_duels")
    .update({ score1: s1, score2: s2, winner, status: "done" })
    .eq("id", duel.id)
    .is("winner", null)
    .select()
    .maybeSingle();
  return data || { ...duel, score1: s1, score2: s2, winner, status: "done" };
}
