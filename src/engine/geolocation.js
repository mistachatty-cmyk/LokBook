// Geolocation engine for capturing user location and reverse geocoding
// All APIs are free tier; no paid services required

const GEOCODE_CACHE = new Map(); // Cache reverse geocode results to avoid quota exhaustion

export async function requestGeoPermission() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation not supported by this browser");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (err) => {
        if (err.code === 1) resolve(false); // Permission denied
        else reject(err);
      },
      { timeout: 5000, maximumAge: 0 }
    );
  });
}

export function getCurrentPosition() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation not supported"));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
    );
  });
}

// Nominatim is a donated public service, not a product we pay for. Its usage
// policy is an absolute maximum of 1 request per second and it blocks clients
// that ignore it. The in-memory GEOCODE_CACHE alone did not honour that: it is
// emptied by every reload, so a user who refreshes re-asks for the same place
// each time, and nothing serialised concurrent lookups.
//
// So the cache is persisted, and requests are chained through a single promise
// with a 1.1s spacing. Being a little slower here is free; being blocked is not.
const GEO_STORE_KEY = "lok:geocache:v1";
let geoChain = Promise.resolve();
let lastGeoCallAt = 0;

function loadPersistedGeo() {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(GEO_STORE_KEY);
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw))) if (!GEOCODE_CACHE.has(k)) GEOCODE_CACHE.set(k, v);
  } catch {}
}
function persistGeo() {
  // Bounded: coordinates are rounded to 4dp, but a moving device still
  // generates new keys indefinitely.
  try {
    const entries = [...GEOCODE_CACHE.entries()].slice(-500);
    localStorage.setItem(GEO_STORE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}
loadPersistedGeo();

export async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (GEOCODE_CACHE.has(key)) return GEOCODE_CACHE.get(key);

  const fallback = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const run = async () => {
    // Re-check: an earlier link in the chain may have resolved this exact key.
    if (GEOCODE_CACHE.has(key)) return GEOCODE_CACHE.get(key);
    const wait = 1100 - (Date.now() - lastGeoCallAt);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastGeoCallAt = Date.now();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "LokBook/1.0" } }
      );
      if (!response.ok) throw new Error("Geocoding failed");
      const data = await response.json();
      const placeName = data.address?.city || data.address?.town || data.address?.county ||
                        data.address?.country || fallback;
      GEOCODE_CACHE.set(key, placeName);
      persistGeo();
      return placeName;
    } catch (err) {
      console.warn("Reverse geocoding failed", err);
      return fallback;
    }
  };
  // Keep the chain alive even if this link rejects.
  const result = geoChain.then(run, run);
  geoChain = result.catch(() => {});
  return result;
}

export function clearGeoCache() {
  GEOCODE_CACHE.clear();
  // Also clear the persisted copy, or the next call reloads what was cleared.
  try { localStorage.removeItem(GEO_STORE_KEY); } catch {}
}
