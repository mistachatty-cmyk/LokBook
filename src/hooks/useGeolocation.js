import { useEffect, useState, useRef } from "react";
import { requestGeoPermission, getCurrentPosition, reverseGeocode } from "../engine/geolocation.js";

export function useGeolocation(enabled = true) {
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLocation(null);
      setPlaceName(null);
      setLoading(false);
      setError(null);
      return;
    }

    const initGeo = async () => {
      if (initRef.current) return;
      initRef.current = true;

      try {
        const granted = await requestGeoPermission();
        setPermissionGranted(granted);

        if (granted) {
          setLoading(true);
          const pos = await getCurrentPosition();
          setLocation({ lat: pos.lat, lng: pos.lng });

          // Reverse geocode to get place name
          const name = await reverseGeocode(pos.lat, pos.lng);
          setPlaceName(name);
        }
      } catch (err) {
        console.warn("Geolocation error", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initGeo();
  }, [enabled]);

  const retry = async () => {
    if (!permissionGranted) return;
    try {
      setLoading(true);
      const pos = await getCurrentPosition();
      setLocation({ lat: pos.lat, lng: pos.lng });
      const name = await reverseGeocode(pos.lat, pos.lng);
      setPlaceName(name);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    location,
    placeName,
    loading,
    error,
    permissionGranted,
    retry,
  };
}
