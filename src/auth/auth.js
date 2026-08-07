import { supabase, SUPA_KEY } from "../supabaseClient.js";

let currentSession = null;
let currentUser = null;
const listeners = new Set();
let _tokenChanged = null;

export function init(onSession) {
  if (!supabase) return;
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      currentSession = session;
      currentUser = session.user;
    }
    onSession?.(session);
    listeners.forEach(fn => fn(session));
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    currentUser = session?.user ?? null;
    _tokenChanged?.(currentSession?.access_token);
    listeners.forEach(fn => fn(session));
  });
}

export function onTokenChange(fn) {
  _tokenChanged = fn;
}

export function getUserId() {
  return currentUser?.id;
}

export function getEmail() {
  return currentUser?.email;
}

export function getAccessToken() {
  return currentSession?.access_token;
}

export function getApiToken() {
  return currentSession?.access_token || SUPA_KEY;
}

// A dropped/hanging connection used to leave the sign-in button stuck on
// "Sending…" forever with no error and no way out but a reload — the
// Supabase client has no built-in request timeout. Every auth call below
// races against a hard ceiling so the caller's UI always settles.
const AUTH_TIMEOUT_MS = 10000;
function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS)),
  ]);
}

export async function signInWithEmail(email) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await withTimeout(
    supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }),
    "Sign-in timed out — check your connection and try again"
  );
  if (error) throw error;
}

export async function signInWithOAuth(provider) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await withTimeout(
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } }),
    "Sign-in timed out — check your connection and try again"
  );
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (!error) {
    currentSession = null;
    currentUser = null;
  }
}

export function onAuthStateChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function isAuthenticated() {
  return !!currentSession;
}

export { supabase };
