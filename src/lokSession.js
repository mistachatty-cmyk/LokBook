// Keep this storage contract aligned with Gsixhub/packages/lok-session.
// Supabase derives the same storage key from the shared LokServices URL, so
// the GSix login is available on every configured *.gsix.online app.
const DOMAIN = '.gsix.online';
const MAX_AGE = 7 * 24 * 60 * 60;

function onGsix() {
  const host = window.location.hostname;
  return host === 'gsix.online' || host.endsWith('.gsix.online');
}

function cookie(key, value, maxAge) {
  const attributes = [`${encodeURIComponent(key)}=${encodeURIComponent(value)}`, 'Path=/', `Max-Age=${maxAge}`, 'SameSite=Lax'];
  if (onGsix()) attributes.push(`Domain=${DOMAIN}`);
  if (window.location.protocol === 'https:') attributes.push('Secure');
  return attributes.join('; ');
}

export const lokSessionStorage = {
  getItem(key) {
    if (typeof document === 'undefined') return null;
    const prefix = `${encodeURIComponent(key)}=`;
    for (const part of document.cookie.split(';')) {
      const entry = part.trim();
      if (entry.startsWith(prefix)) return decodeURIComponent(entry.slice(prefix.length));
    }
    // The shared cookie is authoritative on GSix. A stale local session must
    // not restore a user after signing out on another subdomain.
    if (onGsix()) return null;
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem(key, value) {
    if (typeof document === 'undefined') return;
    document.cookie = cookie(key, value, MAX_AGE);
    if (onGsix()) {
      if (this.getItem(key) !== value) throw new Error('The shared GSix session cookie could not be saved.');
      return;
    }
    try { localStorage.setItem(key, value); } catch { /* storage may be unavailable */ }
  },
  removeItem(key) {
    if (typeof document === 'undefined') return;
    document.cookie = cookie(key, '', 0);
    try { localStorage.removeItem(key); } catch { /* storage may be unavailable */ }
  },
};
