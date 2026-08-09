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

export async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  // Check cache first
  if (GEOCODE_CACHE.has(key)) {
    return GEOCODE_CACHE.get(key);
  }

  try {
    // Use OpenStreetMap Nominatim (free, no key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { "User-Agent": "LokBook/1.0" } }
    );
    if (!response.ok) throw new Error("Geocoding failed");

    const data = await response.json();
    const placeName = data.address?.city || data.address?.town || data.address?.county ||
                      data.address?.country || `${lat.toFixed(2)},${lng.toFixed(2)}`;

    GEOCODE_CACHE.set(key, placeName);
    return placeName;
  } catch (err) {
    console.warn("Reverse geocoding failed", err);
    // Fallback to coordinates
    return `${lat.toFixed(2)},${lng.toFixed(2)}`;
  }
}

export function clearGeoCache() {
  GEOCODE_CACHE.clear();
}
